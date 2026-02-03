import { query } from "../_generated/server";
import { v } from "convex/values";
import { getCurrentUser, getCurrentUserOrNull } from "../lib/utils";
import { canUserAccessRoom } from "../lib/permissions";

/**
 * Get transcript for a session
 */
export const getBySession = query({
  args: {
    sessionId: v.id("sessions"),
    limit: v.optional(v.number()),
    offset: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const session = await ctx.db.get(args.sessionId);
    if (!session) {
      return [];
    }

    const user = await getCurrentUserOrNull(ctx);
    if (user) {
      const canAccess = await canUserAccessRoom(ctx, user._id, session.roomId);
      if (!canAccess) {
        return [];
      }
    }

    const limit = args.limit ?? 100;
    const offset = args.offset ?? 0;

    const transcripts = await ctx.db
      .query("transcripts")
      .withIndex("by_session", (q) => q.eq("sessionId", args.sessionId))
      .order("asc")
      .collect();

    // Apply pagination
    return transcripts.slice(offset, offset + limit);
  },
});

/**
 * Get transcript for a room (most recent session)
 */
export const getByRoom = query({
  args: {
    roomId: v.id("rooms"),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUserOrNull(ctx);
    if (user) {
      const canAccess = await canUserAccessRoom(ctx, user._id, args.roomId);
      if (!canAccess) {
        return [];
      }
    }

    const limit = args.limit ?? 50;

    // Get most recent messages from this room
    const transcripts = await ctx.db
      .query("transcripts")
      .withIndex("by_room", (q) => q.eq("roomId", args.roomId))
      .order("desc")
      .take(limit);

    // Return in chronological order
    return transcripts.reverse();
  },
});

/**
 * Get real-time transcript updates (for subscription)
 * This uses the timestamp index for efficient real-time updates
 */
export const getRecent = query({
  args: {
    sessionId: v.id("sessions"),
    after: v.optional(v.number()), // Timestamp to get messages after
  },
  handler: async (ctx, args) => {
    const session = await ctx.db.get(args.sessionId);
    if (!session) {
      return [];
    }

    const after = args.after ?? session.startedAt;

    const transcripts = await ctx.db
      .query("transcripts")
      .withIndex("by_timestamp", (q) => q.eq("sessionId", args.sessionId).gt("timestamp", after))
      .order("asc")
      .take(50);

    return transcripts;
  },
});

/**
 * Get transcript export data
 */
export const getExport = query({
  args: {
    sessionId: v.id("sessions"),
    format: v.union(v.literal("text"), v.literal("json")),
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);

    const session = await ctx.db.get(args.sessionId);
    if (!session) {
      throw new Error("Session not found");
    }

    // Check access
    const canAccess = await canUserAccessRoom(ctx, user._id, session.roomId, "member");
    if (!canAccess) {
      throw new Error("You don't have permission to export this transcript");
    }

    const transcripts = await ctx.db
      .query("transcripts")
      .withIndex("by_session", (q) => q.eq("sessionId", args.sessionId))
      .order("asc")
      .collect();

    const room = await ctx.db.get(session.roomId);
    const host = await ctx.db.get(session.hostUserId);

    if (args.format === "json") {
      return {
        metadata: {
          sessionId: session._id,
          roomId: session.roomId,
          roomName: room?.name ?? "Unknown Room",
          hostName: host?.name ?? "Anonymous",
          startedAt: session.startedAt,
          endedAt: session.endedAt,
          durationMinutes: session.durationMinutes,
        },
        messages: transcripts.map((t) => ({
          speaker: t.speakerName,
          original: t.originalText,
          translated: t.translatedText,
          sourceLanguage: t.sourceLanguage,
          targetLanguage: t.targetLanguage,
          timestamp: t.timestamp,
          type: t.messageType,
        })),
      };
    }

    // Text format
    const lines = [
      `TRAVoices Transcript`,
      `Room: ${room?.name ?? "Unknown Room"}`,
      `Host: ${host?.name ?? "Anonymous"}`,
      `Date: ${new Date(session.startedAt).toLocaleString()}`,
      `Duration: ${session.durationMinutes ?? "ongoing"} minutes`,
      ``,
      `--- Transcript ---`,
      ``,
    ];

    for (const t of transcripts) {
      const time = new Date(t.timestamp).toLocaleTimeString();
      lines.push(`[${time}] ${t.speakerName} (${t.sourceLanguage}):`);
      lines.push(`  ${t.originalText}`);
      if (t.translatedText) {
        lines.push(`  → (${t.targetLanguage}) ${t.translatedText}`);
      }
      lines.push(``);
    }

    return { text: lines.join("\n") };
  },
});

/**
 * Search transcripts
 */
export const search = query({
  args: {
    query: v.string(),
    roomId: v.optional(v.id("rooms")),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    const limit = args.limit ?? 20;

    // Get user's rooms
    const participations = await ctx.db
      .query("participants")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .collect();

    const userRoomIds = participations.map((p) => p.roomId);

    // If specific room requested, verify access
    if (args.roomId) {
      if (!userRoomIds.includes(args.roomId)) {
        throw new Error("You don't have access to this room");
      }
    }

    const searchRoomIds = args.roomId ? [args.roomId] : userRoomIds;
    const searchLower = args.query.toLowerCase();

    // Search transcripts (simple contains search)
    // Note: For production, you'd want to use Convex's full-text search
    const results: Array<{
      transcript: any;
      roomName: string;
      sessionStartedAt: number;
    }> = [];

    for (const roomId of searchRoomIds) {
      if (results.length >= limit) break;

      const transcripts = await ctx.db
        .query("transcripts")
        .withIndex("by_room", (q) => q.eq("roomId", roomId))
        .order("desc")
        .take(100);

      for (const t of transcripts) {
        if (results.length >= limit) break;

        if (
          t.originalText.toLowerCase().includes(searchLower) ||
          t.translatedText?.toLowerCase().includes(searchLower)
        ) {
          const room = await ctx.db.get(roomId);
          const session = await ctx.db.get(t.sessionId);

          results.push({
            transcript: t,
            roomName: room?.name ?? "Unknown Room",
            sessionStartedAt: session?.startedAt ?? t.timestamp,
          });
        }
      }
    }

    return results;
  },
});
