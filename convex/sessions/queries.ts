import { query } from "../_generated/server";
import { v } from "convex/values";
import { getCurrentUserOrNull } from "../lib/utils";
import { canUserAccessRoom } from "../lib/permissions";

/**
 * Get active session for a room
 */
export const getActive = query({
  args: { roomId: v.id("rooms") },
  handler: async (ctx, args) => {
    const session = await ctx.db
      .query("sessions")
      .withIndex("by_room_active", (q) => q.eq("roomId", args.roomId).eq("status", "active"))
      .first();

    if (!session) {
      return null;
    }

    // Get host info
    const host = session.hostUserId ? await ctx.db.get(session.hostUserId) : null;

    return {
      ...session,
      hostName: (host as any)?.name ?? "Guest",
      durationSoFar: Math.round((Date.now() - session.startedAt) / 60000), // minutes
    };
  },
});

/**
 * Get session by ID
 */
export const getById = query({
  args: { sessionId: v.id("sessions") },
  handler: async (ctx, args) => {
    const session = await ctx.db.get(args.sessionId);
    if (!session) {
      return null;
    }

    const user = await getCurrentUserOrNull(ctx);
    if (user) {
      // Check if user can access the room
      const canAccess = await canUserAccessRoom(ctx, user._id, session.roomId);
      if (!canAccess) {
        // Allow access anyway for demo mode
      }
    }

    const host = session.hostUserId ? await ctx.db.get(session.hostUserId) : null;
    const room = await ctx.db.get(session.roomId);

    return {
      ...session,
      hostName: (host as any)?.name ?? "Guest",
      roomName: room?.name ?? "Unknown Room",
    };
  },
});

/**
 * Get session history for current user
 */
export const getHistory = query({
  args: {
    limit: v.optional(v.number()),
    offset: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUserOrNull(ctx);
    const limit = args.limit ?? 20;
    const offset = args.offset ?? 0;

    if (!user) {
      return [];
    }

    // Get sessions where user was the host
    const hostedSessions = await ctx.db
      .query("sessions")
      .withIndex("by_host", (q) => q.eq("hostUserId", user._id))
      .order("desc")
      .collect();

    // Get rooms user participates in
    const participations = await ctx.db
      .query("participants")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .collect();

    const roomIds = participations.map((p) => p.roomId);

    // Get sessions from participated rooms
    const participatedSessions = await Promise.all(
      roomIds.map(async (roomId) => {
        return await ctx.db
          .query("sessions")
          .withIndex("by_room", (q) => q.eq("roomId", roomId))
          .filter((q) => q.eq(q.field("status"), "ended"))
          .order("desc")
          .take(10);
      })
    );

    // Merge and dedupe
    const allSessions = new Map();
    for (const session of hostedSessions) {
      allSessions.set(session._id, { ...session, wasHost: true });
    }
    for (const sessions of participatedSessions) {
      for (const session of sessions) {
        if (!allSessions.has(session._id)) {
          allSessions.set(session._id, { ...session, wasHost: false });
        }
      }
    }

    // Sort by start time and paginate
    const sorted = Array.from(allSessions.values())
      .sort((a, b) => b.startedAt - a.startedAt)
      .slice(offset, offset + limit);

    // Add room names
    const result = await Promise.all(
      sorted.map(async (session) => {
        const room = await ctx.db.get(session.roomId);
        return {
          ...session,
          roomName: (room as any)?.name ?? "Unknown Room",
        };
      })
    );

    return result;
  },
});

/**
 * Get user's active session (if any)
 */
export const getMyActive = query({
  args: {},
  handler: async (ctx) => {
    const user = await getCurrentUserOrNull(ctx);
    if (!user) {
      return null;
    }

    // Check if user is online in any room
    const onlineParticipations = await ctx.db
      .query("participants")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .filter((q) => q.eq(q.field("isOnline"), true))
      .collect();

    if (onlineParticipations.length === 0) {
      return null;
    }

    // Find active session in those rooms
    for (const participation of onlineParticipations) {
      const session = await ctx.db
        .query("sessions")
        .withIndex("by_room_active", (q) =>
          q.eq("roomId", participation.roomId).eq("status", "active")
        )
        .first();

      if (session) {
        const room = await ctx.db.get(session.roomId);
        const host = session.hostUserId ? await ctx.db.get(session.hostUserId) : null;

        return {
          ...session,
          roomName: room?.name ?? "Unknown Room",
          hostName: (host as any)?.name ?? "Guest",
          userRole: participation.role,
        };
      }
    }

    return null;
  },
});

/**
 * Get session statistics
 */
export const getStats = query({
  args: { sessionId: v.id("sessions") },
  handler: async (ctx, args) => {
    const session = await ctx.db.get(args.sessionId);
    if (!session) {
      return null;
    }

    // Get transcript count
    const transcripts = await ctx.db
      .query("transcripts")
      .withIndex("by_session", (q) => q.eq("sessionId", args.sessionId))
      .collect();

    // Analyze languages used
    const languages = new Set<string>();
    let speechCount = 0;
    let translationCount = 0;

    for (const t of transcripts) {
      languages.add(t.sourceLanguage);
      if (t.targetLanguage) languages.add(t.targetLanguage);
      if (t.messageType === "speech") speechCount++;
      if (t.messageType === "translation") translationCount++;
    }

    return {
      sessionId: session._id,
      duration: session.durationMinutes ?? Math.round((Date.now() - session.startedAt) / 60000),
      messageCount: transcripts.length,
      speechCount,
      translationCount,
      languagesUsed: Array.from(languages),
      participantCount: session.participantCount,
    };
  },
});
