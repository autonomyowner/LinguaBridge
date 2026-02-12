import { mutation, internalMutation } from "../_generated/server";
import { v, ConvexError } from "convex/values";
import { getCurrentUser, getCurrentUserOrNull, hasExceededMinutes, getTierLimits, getMonthStart } from "../lib/utils";

/**
 * Inline helper: add minutes to user record (avoids nested ctx.runMutation overhead)
 */
async function addMinutesUsedInline(
  ctx: any,
  userId: any,
  minutes: number
) {
  try {
    const user = await ctx.db.get(userId);
    if (!user) return;

    const monthStart = getMonthStart();
    const currentMinutesReset = user.minutesResetAt ?? 0;
    const currentMinutesUsed = user.minutesUsedThisMonth ?? 0;

    if (currentMinutesReset < monthStart) {
      await ctx.db.patch(userId, {
        minutesUsedThisMonth: minutes,
        minutesResetAt: monthStart,
        updatedAt: Date.now(),
      });
    } else {
      await ctx.db.patch(userId, {
        minutesUsedThisMonth: currentMinutesUsed + minutes,
        updatedAt: Date.now(),
      });
    }
  } catch (e) {
    console.error("addMinutesUsedInline failed:", e);
  }
}

/**
 * Start a new session in a room
 * Requires authentication — guests are blocked
 */
export const start = mutation({
  args: {
    roomId: v.id("rooms"),
    recordingEnabled: v.optional(v.boolean()),
    userEmail: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    console.log("[session:start] Starting. roomId:", args.roomId, "email:", args.userEmail);

    // Require authentication — no guest access (with email fallback for cross-origin)
    const user = await getCurrentUser(ctx, args.userEmail);
    console.log("[session:start] User found:", user._id, user.email);

    // Check if user has exceeded their minutes
    const userTier = user.subscriptionTier ?? "free";
    if (hasExceededMinutes(user)) {
      const limits = getTierLimits(userTier);
      throw new ConvexError(
        `You've used all ${limits.minutesPerMonth} minutes for this month. Upgrade your plan for more.`
      );
    }

    // Concurrent session limit: max 1 active session per user
    // End any existing active session before starting a new one
    const existingUserSessions = await ctx.db
      .query("sessions")
      .withIndex("by_host", (q) => q.eq("hostUserId", user._id))
      .filter((q) => q.eq(q.field("status"), "active"))
      .collect();

    console.log("[session:start] Existing active sessions:", existingUserSessions.length);

    const now = Date.now();
    for (const oldSession of existingUserSessions) {
      const durationMinutes = Math.round((now - oldSession.startedAt) / 60000);
      await ctx.db.patch(oldSession._id, {
        status: "ended",
        endedAt: now,
        durationMinutes,
      });
      // Track minutes inline (no nested ctx.runMutation — avoids isolated JS context overhead)
      await addMinutesUsedInline(ctx, user._id, durationMinutes);
    }

    // Check for existing active session in this room (from another user)
    const existingRoomSession = await ctx.db
      .query("sessions")
      .withIndex("by_room_active", (q) => q.eq("roomId", args.roomId).eq("status", "active"))
      .first();

    if (existingRoomSession) {
      console.log("[session:start] Joining existing room session:", existingRoomSession._id);
      return { sessionId: existingRoomSession._id };
    }

    // Get current participant count
    const participants = await ctx.db
      .query("participants")
      .withIndex("by_room", (q) => q.eq("roomId", args.roomId))
      .filter((q) => q.eq(q.field("isOnline"), true))
      .collect();

    // Create session
    const sessionId = await ctx.db.insert("sessions", {
      roomId: args.roomId,
      hostUserId: user._id,
      startedAt: now,
      participantCount: Math.max(participants.length, 1),
      status: "active",
      recordingEnabled: args.recordingEnabled ?? false,
    });
    console.log("[session:start] Session created:", sessionId);

    // Update analytics (non-critical — don't let this crash the session start)
    try {
      const todayDate = new Date().toISOString().split("T")[0];
      const existingAnalytics = await ctx.db
        .query("analytics")
        .withIndex("by_user_date", (q) => q.eq("userId", user._id).eq("date", todayDate))
        .unique();

      if (existingAnalytics) {
        await ctx.db.patch(existingAnalytics._id, {
          sessionsStarted: existingAnalytics.sessionsStarted + 1,
          updatedAt: now,
        });
      } else {
        await ctx.db.insert("analytics", {
          userId: user._id,
          date: todayDate,
          minutesUsed: 0,
          sessionsStarted: 1,
          messagesTranslated: 0,
          roomsCreated: 0,
          languagesUsed: [],
          updatedAt: now,
        });
      }
    } catch (e) {
      console.error("[session:start] Analytics failed:", e);
    }

    console.log("[session:start] Done. sessionId:", sessionId);
    return { sessionId };
  },
});

/**
 * End an active session
 */
export const end = mutation({
  args: { sessionId: v.id("sessions") },
  handler: async (ctx, args) => {
    const user = await getCurrentUserOrNull(ctx);

    const session = await ctx.db.get(args.sessionId);
    if (!session) {
      throw new ConvexError("Session not found");
    }

    if (session.status !== "active") {
      return { durationMinutes: session.durationMinutes ?? 0 };
    }

    const now = Date.now();
    const durationMinutes = Math.round((now - session.startedAt) / 60000);

    // End the session
    await ctx.db.patch(args.sessionId, {
      status: "ended",
      endedAt: now,
      durationMinutes,
    });

    // Update host's minutes used (inline — no nested runMutation)
    if (session.hostUserId) {
      await addMinutesUsedInline(ctx, session.hostUserId, durationMinutes);
    }

    return { durationMinutes };
  },
});

/**
 * Pause a session
 */
export const pause = mutation({
  args: { sessionId: v.id("sessions") },
  handler: async (ctx, args) => {
    const session = await ctx.db.get(args.sessionId);
    if (!session) {
      throw new ConvexError("Session not found");
    }

    if (session.status !== "active") {
      throw new ConvexError("Session is not active");
    }

    await ctx.db.patch(args.sessionId, { status: "paused" });

    return { success: true };
  },
});

/**
 * Resume a paused session
 */
export const resume = mutation({
  args: { sessionId: v.id("sessions") },
  handler: async (ctx, args) => {
    const session = await ctx.db.get(args.sessionId);
    if (!session) {
      throw new ConvexError("Session not found");
    }

    if (session.status !== "paused") {
      throw new ConvexError("Session is not paused");
    }

    await ctx.db.patch(args.sessionId, { status: "active" });

    return { success: true };
  },
});

/**
 * Update session participant count
 */
export const updateParticipantCount = mutation({
  args: { sessionId: v.id("sessions") },
  handler: async (ctx, args) => {
    const session = await ctx.db.get(args.sessionId);
    if (!session || session.status !== "active") {
      return;
    }

    const participants = await ctx.db
      .query("participants")
      .withIndex("by_room", (q) => q.eq("roomId", session.roomId))
      .filter((q) => q.eq(q.field("isOnline"), true))
      .collect();

    await ctx.db.patch(args.sessionId, {
      participantCount: participants.length,
    });
  },
});

/**
 * Clean up stale sessions (cron job)
 * Ends sessions that have been active for more than 2 hours without update
 */
export const cleanupStaleSessions = internalMutation({
  args: {},
  handler: async (ctx) => {
    const twoHoursAgo = Date.now() - 2 * 60 * 60 * 1000;

    const staleSessions = await ctx.db
      .query("sessions")
      .withIndex("by_status", (q) => q.eq("status", "active"))
      .filter((q) => q.lt(q.field("startedAt"), twoHoursAgo))
      .collect();

    const now = Date.now();

    for (const session of staleSessions) {
      const durationMinutes = Math.round((now - session.startedAt) / 60000);

      await ctx.db.patch(session._id, {
        status: "ended",
        endedAt: now,
        durationMinutes,
      });

      // Track minutes for the session host (inline)
      if (session.hostUserId) {
        await addMinutesUsedInline(ctx, session.hostUserId, durationMinutes);
      }
    }

    if (staleSessions.length > 0) {
      console.log(`[Cron] Cleaned up ${staleSessions.length} stale sessions`);
    }
  },
});

/**
 * End all active sessions in a room (internal)
 */
export const endAllInRoom = internalMutation({
  args: { roomId: v.id("rooms") },
  handler: async (ctx, args) => {
    const activeSessions = await ctx.db
      .query("sessions")
      .withIndex("by_room", (q) => q.eq("roomId", args.roomId))
      .filter((q) => q.eq(q.field("status"), "active"))
      .collect();

    const now = Date.now();

    for (const session of activeSessions) {
      const durationMinutes = Math.round((now - session.startedAt) / 60000);

      await ctx.db.patch(session._id, {
        status: "ended",
        endedAt: now,
        durationMinutes,
      });

      // Track minutes inline
      if (session.hostUserId) {
        await addMinutesUsedInline(ctx, session.hostUserId, durationMinutes);
      }
    }
  },
});
