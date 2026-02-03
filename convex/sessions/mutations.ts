import { mutation, internalMutation } from "../_generated/server";
import { v } from "convex/values";
import { getCurrentUserOrNull, hasExceededMinutes, getTierLimits } from "../lib/utils";
import { canUserAccessRoom } from "../lib/permissions";
import { internal } from "../_generated/api";

/**
 * Start a new session in a room
 * Works for guests in demo mode
 */
export const start = mutation({
  args: {
    roomId: v.id("rooms"),
    recordingEnabled: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUserOrNull(ctx);

    // For authenticated users, check permissions
    if (user) {
      const canAccess = await canUserAccessRoom(ctx, user._id, args.roomId, "admin");
      if (!canAccess) {
        // Allow anyway in demo mode - just warn
        console.log("User doesn't have admin access, but allowing in demo mode");
      }

      // Check if user has exceeded their minutes
      const userTier = user.subscriptionTier ?? "free";
      if (hasExceededMinutes(user)) {
        const limits = getTierLimits(userTier);
        throw new Error(
          `You've used all ${limits.minutesPerMonth} minutes for this month. Upgrade your plan for more.`
        );
      }
    }

    // Check for existing active session
    const existingSession = await ctx.db
      .query("sessions")
      .withIndex("by_room_active", (q) => q.eq("roomId", args.roomId).eq("status", "active"))
      .first();

    if (existingSession) {
      // Return existing session instead of error for demo mode
      return { sessionId: existingSession._id };
    }

    // Get current participant count
    const participants = await ctx.db
      .query("participants")
      .withIndex("by_room", (q) => q.eq("roomId", args.roomId))
      .filter((q) => q.eq(q.field("isOnline"), true))
      .collect();

    const now = Date.now();

    // Create session - use user ID if authenticated, otherwise undefined
    const sessionId = await ctx.db.insert("sessions", {
      roomId: args.roomId,
      hostUserId: user?._id,
      startedAt: now,
      participantCount: Math.max(participants.length, 1),
      status: "active",
      recordingEnabled: args.recordingEnabled ?? false,
    });

    // Update analytics only for authenticated users
    if (user) {
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

    // Update host's minutes used (only if it's a real user ID)
    if (user && session.hostUserId === user._id) {
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
