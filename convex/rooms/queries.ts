import { query } from "../_generated/server";
import { v } from "convex/values";
import { getCurrentUser, getCurrentUserOrNull } from "../lib/utils";
import { canUserAccessRoom, getUserRoomRole } from "../lib/permissions";

/**
 * List public rooms
 */
export const listPublic = query({
  args: {
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const limit = args.limit ?? 20;

    const rooms = await ctx.db
      .query("rooms")
      .withIndex("by_public", (q) => q.eq("isPublic", true).eq("isActive", true))
      .take(limit);

    // Get participant counts for each room
    const roomsWithCounts = await Promise.all(
      rooms.map(async (room) => {
        const participants = await ctx.db
          .query("participants")
          .withIndex("by_room", (q) => q.eq("roomId", room._id))
          .collect();

        const creator = await ctx.db.get(room.creatorId);

        return {
          ...room,
          participantCount: participants.length,
          onlineCount: participants.filter((p) => p.isOnline).length,
          creatorName: creator?.name ?? "Anonymous",
        };
      })
    );

    return roomsWithCounts;
  },
});

/**
 * Get a room by ID
 */
export const getById = query({
  args: { roomId: v.id("rooms") },
  handler: async (ctx, args) => {
    const room = await ctx.db.get(args.roomId);
    if (!room || !room.isActive) {
      return null;
    }

    const user = await getCurrentUserOrNull(ctx);

    // Check access for private rooms
    if (!room.isPublic) {
      if (!user) return null;
      const canAccess = await canUserAccessRoom(ctx, user._id, args.roomId);
      if (!canAccess) return null;
    }

    // Get participants
    const participants = await ctx.db
      .query("participants")
      .withIndex("by_room", (q) => q.eq("roomId", args.roomId))
      .collect();

    // Get participant details
    const participantDetails = await Promise.all(
      participants.map(async (p) => {
        const participantUser = await ctx.db.get(p.userId);
        return {
          ...p,
          name: participantUser?.name ?? "Anonymous",
          imageUrl: participantUser?.imageUrl,
        };
      })
    );

    // Get active session
    const activeSession = await ctx.db
      .query("sessions")
      .withIndex("by_room_active", (q) => q.eq("roomId", args.roomId).eq("status", "active"))
      .first();

    // Get creator info
    const creator = await ctx.db.get(room.creatorId);

    // Get user's role if authenticated
    const userRole = user ? await getUserRoomRole(ctx, user._id, args.roomId) : null;

    return {
      ...room,
      participants: participantDetails,
      participantCount: participants.length,
      onlineCount: participants.filter((p) => p.isOnline).length,
      activeSession,
      creatorName: creator?.name ?? "Anonymous",
      userRole,
    };
  },
});

/**
 * Get room by access code
 */
export const getByAccessCode = query({
  args: { accessCode: v.string() },
  handler: async (ctx, args) => {
    const room = await ctx.db
      .query("rooms")
      .filter((q) =>
        q.and(
          q.eq(q.field("accessCode"), args.accessCode),
          q.eq(q.field("isActive"), true)
        )
      )
      .first();

    if (!room) {
      return null;
    }

    return {
      _id: room._id,
      name: room.name,
      description: room.description,
      isPublic: room.isPublic,
    };
  },
});

/**
 * Get room by LiveKit room name
 */
export const getByLivekitRoom = query({
  args: { livekitRoomName: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("rooms")
      .withIndex("by_livekit_room", (q) => q.eq("livekitRoomName", args.livekitRoomName))
      .unique();
  },
});

/**
 * Get rooms for authenticated user
 * Returns empty if not authenticated
 */
export const getMy = query({
  args: {},
  handler: async (ctx) => {
    const user = await getCurrentUserOrNull(ctx);
    if (!user) {
      return { owned: [], joined: [] };
    }

    // Get rooms created by user
    const createdRooms = await ctx.db
      .query("rooms")
      .withIndex("by_creator", (q) => q.eq("creatorId", user._id))
      .filter((q) => q.eq(q.field("isActive"), true))
      .collect();

    // Get rooms user is participating in
    const participations = await ctx.db
      .query("participants")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .collect();

    const participatingRoomIds = participations
      .filter((p) => !createdRooms.some((r) => r._id === p.roomId))
      .map((p) => p.roomId);

    const participatingRooms = await Promise.all(
      participatingRoomIds.map((id) => ctx.db.get(id))
    );

    // Combine and add metadata
    const ownedRooms = await Promise.all(
      createdRooms.map(async (room) => {
        const participants = await ctx.db
          .query("participants")
          .withIndex("by_room", (q) => q.eq("roomId", room._id))
          .collect();

        return {
          ...room,
          role: "owner" as const,
          participantCount: participants.length,
          onlineCount: participants.filter((p) => p.isOnline).length,
        };
      })
    );

    const joinedRooms = await Promise.all(
      participatingRooms
        .filter((r): r is NonNullable<typeof r> => r !== null && r.isActive)
        .map(async (room, idx) => {
          const participants = await ctx.db
            .query("participants")
            .withIndex("by_room", (q) => q.eq("roomId", room._id))
            .collect();

          const participation = participations.find((p) => p.roomId === room._id);

          return {
            ...room,
            role: participation?.role ?? ("member" as const),
            participantCount: participants.length,
            onlineCount: participants.filter((p) => p.isOnline).length,
          };
        })
    );

    return {
      owned: ownedRooms,
      joined: joinedRooms,
    };
  },
});

/**
 * Check if user can join room
 */
export const canJoin = query({
  args: { roomId: v.id("rooms") },
  handler: async (ctx, args) => {
    const user = await getCurrentUserOrNull(ctx);
    if (!user) {
      return { canJoin: false, reason: "Not authenticated" };
    }

    const room = await ctx.db.get(args.roomId);
    if (!room || !room.isActive) {
      return { canJoin: false, reason: "Room not found" };
    }

    // Check if already a participant
    const existing = await ctx.db
      .query("participants")
      .withIndex("by_room_user", (q) => q.eq("roomId", args.roomId).eq("userId", user._id))
      .unique();

    if (existing) {
      return { canJoin: true, isExisting: true };
    }

    // Check participant limit
    const participants = await ctx.db
      .query("participants")
      .withIndex("by_room", (q) => q.eq("roomId", args.roomId))
      .collect();

    if (participants.length >= room.maxParticipants) {
      return { canJoin: false, reason: "Room is full" };
    }

    return { canJoin: true, isExisting: false };
  },
});
