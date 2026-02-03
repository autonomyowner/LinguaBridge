import { mutation, internalMutation } from "../_generated/server";
import { v } from "convex/values";
import { getCurrentUser, hasExceededMinutes, getTierLimits } from "../lib/utils";
import { canUserAccessRoom } from "../lib/permissions";
import { internal } from "../_generated/api";

/**
 * Start a new session in a room
 */
export const start = mutation({
  args: {
    roomId: v.id("rooms"),
    recordingEnabled: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);

    // Check if user can start sessions (admin+)
    const canAccess = await canUserAccessRoom(ctx, user._id, args.roomId, "admin");
    if (!canAccess) {
      throw new Error("You don't have permission to start sessions in this room");
    }

    // Check if user has exceeded their minutes
    const userTier = user.subscriptionTier ?? "free";
    if (hasExceededMinutes(user)) {
      const limits = getTierLimits(userTier);
      throw new Error(
        `You've used all ${limits.minutesPerMonth} minutes for this month. Upgrade your plan for more.`
      );
    }

    // Check for existing active session
    const existingSession = await ctx.db
      .query("sessions")
      .withIndex("by_room_active", (q) => q.eq("roomId", args.roomId).eq("status", "active"))
      .first();

    if (existingSession) {
      throw new Error("There's already an active session in this room");
    }

    // Get current participant count
    const participants = await ctx.db
      .query("participants")
      .withIndex("by_room", (q) => q.eq("roomId", args.roomId))
      .filter((q) => q.eq(q.field("isOnline"), true))
      .collect();

    const now = Date.now();

    // Create session
    const sessionId = await ctx.db.insert("sessions", {
      roomId: args.roomId,
      hostUserId: user._id,
      startedAt: now,
      participantCount: participants.length || 1,
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
    const user = await getCurrentUser(ctx);

    const session = await ctx.db.get(args.sessionId);
    if (!session) {
      throw new Error("Session not found");
    }

    if (session.status !== "active") {
      throw new Error("Session is not active");
    }

    // Check if user can end session (admin+ or host)
    const isHost = session.hostUserId === user._id;
    const canAccess = await canUserAccessRoom(ctx, user._id, session.roomId, "admin");

    if (!isHost && !canAccess) {
      throw new Error("You don't have permission to end this session");
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
    await ctx.runMutation(internal.users.mutations.addMinutesUsed, {
      userId: session.hostUserId,
      minutes: durationMinutes,
    });

    // Update analytics with minutes
    const todayDate = new Date().toISOString().split("T")[0];
    const existingAnalytics = await ctx.db
      .query("analytics")
      .withIndex("by_user_date", (q) => q.eq("userId", session.hostUserId).eq("date", todayDate))
      .unique();

    if (existingAnalytics) {
      await ctx.db.patch(existingAnalytics._id, {
        minutesUsed: existingAnalytics.minutesUsed + durationMinutes,
        updatedAt: now,
      });
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
    const user = await getCurrentUser(ctx);

    const session = await ctx.db.get(args.sessionId);
    if (!session) {
      throw new Error("Session not found");
    }

    if (session.status !== "active") {
      throw new Error("Session is not active");
    }

    // Check permissions
    const canAccess = await canUserAccessRoom(ctx, user._id, session.roomId, "admin");
    if (!canAccess) {
      throw new Error("You don't have permission to pause this session");
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
    const user = await getCurrentUser(ctx);

    const session = await ctx.db.get(args.sessionId);
    if (!session) {
      throw new Error("Session not found");
    }

    if (session.status !== "paused") {
      throw new Error("Session is not paused");
    }

    // Check permissions
    const canAccess = await canUserAccessRoom(ctx, user._id, session.roomId, "admin");
    if (!canAccess) {
      throw new Error("You don't have permission to resume this session");
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

      // Update host's minutes
      await ctx.runMutation(internal.users.mutations.addMinutesUsed, {
        userId: session.hostUserId,
        minutes: durationMinutes,
      });
    }
  },
});
