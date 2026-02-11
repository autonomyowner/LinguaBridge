import { mutation, internalMutation } from "../_generated/server";
import { v } from "convex/values";
import { getCurrentUser, getCurrentUserOrNull, hasExceededMinutes, getTierLimits } from "../lib/utils";
import { canUserAccessRoom, checkRateLimit, RATE_LIMITS, RateLimitError } from "../lib/permissions";
import { internal } from "../_generated/api";

/**
 * Start a new session in a room
 * Requires authentication — guests are blocked
 */
export const start = mutation({
  args: {
    roomId: v.id("rooms"),
    recordingEnabled: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    // Require authentication — no guest access
    const user = await getCurrentUser(ctx);

    // Rate limit session starts
    const userTier = user.subscriptionTier ?? "free";
    const rateLimitConfig = RATE_LIMITS[userTier] ?? RATE_LIMITS.free;
    const rateCheck = checkRateLimit(`session:${user._id}`, rateLimitConfig);
    if (!rateCheck.allowed) {
      throw new RateLimitError(rateCheck.resetAt);
    }

    // Check if user has exceeded their minutes
    if (hasExceededMinutes(user)) {
      const limits = getTierLimits(userTier);
      throw new Error(
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

    const now = Date.now();
    for (const oldSession of existingUserSessions) {
      const durationMinutes = Math.round((now - oldSession.startedAt) / 60000);
      await ctx.db.patch(oldSession._id, {
        status: "ended",
        endedAt: now,
        durationMinutes,
      });
      // Track minutes for the ended session
      try {
        await ctx.runMutation(internal.users.mutations.addMinutesUsed, {
          userId: user._id,
          minutes: durationMinutes,
        });
      } catch (e) {
        // Ignore if user not found
      }
    }

    // Check for existing active session in this room (from another user)
    const existingRoomSession = await ctx.db
      .query("sessions")
      .withIndex("by_room_active", (q) => q.eq("roomId", args.roomId).eq("status", "active"))
      .first();

    if (existingRoomSession) {
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

    // Update analytics
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
      throw new Error("Session not found");
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

    // Update host's minutes used
    if (session.hostUserId) {
      try {
        await ctx.runMutation(internal.users.mutations.addMinutesUsed, {
          userId: session.hostUserId,
          minutes: durationMinutes,
        });
      } catch (e) {
        // Ignore if user not found
      }
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
      throw new Error("Session not found");
    }

    if (session.status !== "active") {
      throw new Error("Session is not active");
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
      throw new Error("Session not found");
    }

    if (session.status !== "paused") {
      throw new Error("Session is not paused");
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

      // Track minutes for the session host
      if (session.hostUserId) {
        try {
          await ctx.runMutation(internal.users.mutations.addMinutesUsed, {
            userId: session.hostUserId,
            minutes: durationMinutes,
          });
        } catch (e) {
          // Ignore if user not found
        }
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

      // Only update minutes if it's a real user
      if (session.hostUserId) {
        try {
          await ctx.runMutation(internal.users.mutations.addMinutesUsed, {
            userId: session.hostUserId,
            minutes: durationMinutes,
          });
        } catch (e) {
          // Ignore if user not found (guest session)
        }
      }
    }
  },
});
