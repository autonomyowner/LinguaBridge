import { mutation } from "../_generated/server";
import { v } from "convex/values";
import {
  getCurrentUserOrNull,
  canCreateRoom,
  generateRoomCode,
  generateLivekitRoomName,
  getTierLimits,
} from "../lib/utils";
import { canUserAccessRoom, isRoomOwner } from "../lib/permissions";

/**
 * Create a new room
 * Works without authentication for demo purposes
 */
export const create = mutation({
  args: {
    name: v.string(),
    description: v.optional(v.string()),
    isPublic: v.boolean(),
    defaultSourceLanguage: v.string(),
    defaultTargetLanguage: v.string(),
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUserOrNull(ctx);

    const now = Date.now();
    const livekitRoomName = generateLivekitRoomName(args.name);
    const accessCode = args.isPublic ? undefined : generateRoomCode();

    // Use free tier limits for guests, or user's tier
    const userTier = user?.subscriptionTier ?? "free";
    const limits = getTierLimits(userTier);

    // Check room limits only for authenticated users
    if (user) {
      const canCreate = await canCreateRoom(ctx, user);
      if (!canCreate) {
        throw new Error(
          `You've reached the maximum of ${limits.maxRooms} rooms for your plan. Upgrade to create more.`
        );
      }
    }

    // Create the room - use a placeholder creator ID for guests
    const roomId = await ctx.db.insert("rooms", {
      name: args.name,
      description: args.description,
      creatorId: user?._id ?? ("guest" as any), // Guest rooms have "guest" as creator
      isPublic: args.isPublic,
      maxParticipants: limits.maxParticipants,
      defaultSourceLanguage: args.defaultSourceLanguage,
      defaultTargetLanguage: args.defaultTargetLanguage,
      accessCode,
      livekitRoomName,
      isActive: true,
      createdAt: now,
      updatedAt: now,
    });

    // Add creator as owner participant (only if authenticated)
    if (user) {
      await ctx.db.insert("participants", {
        roomId,
        userId: user._id,
        role: "owner",
        preferredLanguage: args.defaultTargetLanguage,
        isMuted: false,
        isOnline: false,
        joinedAt: now,
        lastSeenAt: now,
      });

      // Update analytics
      const todayDate = new Date().toISOString().split("T")[0];
      const existingAnalytics = await ctx.db
        .query("analytics")
        .withIndex("by_user_date", (q) => q.eq("userId", user._id).eq("date", todayDate))
        .unique();

      if (existingAnalytics) {
        await ctx.db.patch(existingAnalytics._id, {
          roomsCreated: existingAnalytics.roomsCreated + 1,
          updatedAt: now,
        });
      } else {
        await ctx.db.insert("analytics", {
          userId: user._id,
          date: todayDate,
          minutesUsed: 0,
          sessionsStarted: 0,
          messagesTranslated: 0,
          roomsCreated: 1,
          languagesUsed: [],
          updatedAt: now,
        });
      }
    }

    return { roomId, accessCode, livekitRoomName };
  },
});

/**
 * Update room settings
 */
export const update = mutation({
  args: {
    roomId: v.id("rooms"),
    name: v.optional(v.string()),
    description: v.optional(v.string()),
    isPublic: v.optional(v.boolean()),
    defaultSourceLanguage: v.optional(v.string()),
    defaultTargetLanguage: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUserOrNull(ctx);
    const { roomId, ...updates } = args;

    const room = await ctx.db.get(roomId);
    if (!room) {
      throw new Error("Room not found");
    }

    // Check if user can manage room (skip for guest-created rooms)
    if (user) {
      const canAccess = await canUserAccessRoom(ctx, user._id, roomId, "admin");
      if (!canAccess) {
        throw new Error("You don't have permission to update this room");
      }
    }

    // Generate new access code if switching to private
    let accessCode = room.accessCode;
    if (updates.isPublic === false && !room.accessCode) {
      accessCode = generateRoomCode();
    } else if (updates.isPublic === true) {
      accessCode = undefined;
    }

    await ctx.db.patch(roomId, {
      ...updates,
      accessCode,
      updatedAt: Date.now(),
    });

    return { success: true, accessCode };
  },
});

/**
 * Join a room
 */
export const join = mutation({
  args: {
    roomId: v.id("rooms"),
    accessCode: v.optional(v.string()),
    preferredLanguage: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUserOrNull(ctx);

    const room = await ctx.db.get(args.roomId);
    if (!room || !room.isActive) {
      throw new Error("Room not found");
    }

    // Check access code for private rooms
    if (!room.isPublic && room.accessCode !== args.accessCode) {
      throw new Error("Invalid access code");
    }

    const now = Date.now();

    // If no user, just return success (guest mode)
    if (!user) {
      return { success: true, isNew: true, isGuest: true };
    }

    // Check if already a participant
    const existing = await ctx.db
      .query("participants")
      .withIndex("by_room_user", (q) => q.eq("roomId", args.roomId).eq("userId", user._id))
      .unique();

    if (existing) {
      // Update last seen
      await ctx.db.patch(existing._id, {
        isOnline: true,
        lastSeenAt: now,
      });
      return { success: true, isNew: false };
    }

    // Check participant limit
    const participants = await ctx.db
      .query("participants")
      .withIndex("by_room", (q) => q.eq("roomId", args.roomId))
      .collect();

    if (participants.length >= room.maxParticipants) {
      throw new Error("Room is full");
    }

    // Add as member
    await ctx.db.insert("participants", {
      roomId: args.roomId,
      userId: user._id,
      role: "member",
      preferredLanguage: args.preferredLanguage ?? room.defaultTargetLanguage,
      isMuted: false,
      isOnline: true,
      joinedAt: now,
      lastSeenAt: now,
    });

    return { success: true, isNew: true };
  },
});

/**
 * Leave a room
 */
export const leave = mutation({
  args: { roomId: v.id("rooms") },
  handler: async (ctx, args) => {
    const user = await getCurrentUserOrNull(ctx);
    if (!user) {
      return { success: true }; // Guest mode
    }

    const participant = await ctx.db
      .query("participants")
      .withIndex("by_room_user", (q) => q.eq("roomId", args.roomId).eq("userId", user._id))
      .unique();

    if (!participant) {
      return { success: true }; // Already not in room
    }

    // Owner cannot leave their own room
    if (participant.role === "owner") {
      throw new Error("Owner cannot leave their own room. Delete the room instead.");
    }

    await ctx.db.delete(participant._id);

    return { success: true };
  },
});

/**
 * Delete a room (owner only)
 */
export const deleteRoom = mutation({
  args: { roomId: v.id("rooms") },
  handler: async (ctx, args) => {
    const user = await getCurrentUserOrNull(ctx);

    // Allow deletion for guest-created rooms or by owner
    if (user) {
      const isOwner = await isRoomOwner(ctx, user._id, args.roomId);
      if (!isOwner) {
        throw new Error("Only the room owner can delete the room");
      }
    }

    // Soft delete
    await ctx.db.patch(args.roomId, {
      isActive: false,
      updatedAt: Date.now(),
    });

    return { success: true };
  },
});

/**
 * Update participant status
 */
export const updateParticipant = mutation({
  args: {
    roomId: v.id("rooms"),
    isMuted: v.optional(v.boolean()),
    preferredLanguage: v.optional(v.string()),
    isOnline: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUserOrNull(ctx);
    if (!user) {
      return { success: true }; // Guest mode
    }

    const { roomId, ...updates } = args;

    const participant = await ctx.db
      .query("participants")
      .withIndex("by_room_user", (q) => q.eq("roomId", roomId).eq("userId", user._id))
      .unique();

    if (!participant) {
      return { success: true }; // Not a participant, skip
    }

    await ctx.db.patch(participant._id, {
      ...updates,
      lastSeenAt: Date.now(),
    });

    return { success: true };
  },
});

/**
 * Update another participant's role (admin+ only)
 */
export const updateParticipantRole = mutation({
  args: {
    roomId: v.id("rooms"),
    targetUserId: v.id("users"),
    role: v.union(v.literal("admin"), v.literal("member"), v.literal("viewer")),
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUserOrNull(ctx);
    if (!user) {
      throw new Error("Authentication required to change roles");
    }

    // Must be admin or owner
    const canAccess = await canUserAccessRoom(ctx, user._id, args.roomId, "admin");
    if (!canAccess) {
      throw new Error("You don't have permission to change roles");
    }

    // Find target participant
    const target = await ctx.db
      .query("participants")
      .withIndex("by_room_user", (q) => q.eq("roomId", args.roomId).eq("userId", args.targetUserId))
      .unique();

    if (!target) {
      throw new Error("Target user is not in this room");
    }

    // Cannot change owner's role
    if (target.role === "owner") {
      throw new Error("Cannot change the owner's role");
    }

    await ctx.db.patch(target._id, { role: args.role });

    return { success: true };
  },
});

/**
 * Remove a participant from room (admin+ only)
 */
export const removeParticipant = mutation({
  args: {
    roomId: v.id("rooms"),
    targetUserId: v.id("users"),
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUserOrNull(ctx);
    if (!user) {
      throw new Error("Authentication required to remove participants");
    }

    // Must be admin or owner
    const canAccess = await canUserAccessRoom(ctx, user._id, args.roomId, "admin");
    if (!canAccess) {
      throw new Error("You don't have permission to remove participants");
    }

    // Find target participant
    const target = await ctx.db
      .query("participants")
      .withIndex("by_room_user", (q) => q.eq("roomId", args.roomId).eq("userId", args.targetUserId))
      .unique();

    if (!target) {
      throw new Error("Target user is not in this room");
    }

    // Cannot remove owner
    if (target.role === "owner") {
      throw new Error("Cannot remove the room owner");
    }

    await ctx.db.delete(target._id);

    return { success: true };
  },
});

/**
 * Regenerate room access code
 */
export const regenerateAccessCode = mutation({
  args: { roomId: v.id("rooms") },
  handler: async (ctx, args) => {
    const user = await getCurrentUserOrNull(ctx);

    const room = await ctx.db.get(args.roomId);
    if (!room || room.isPublic) {
      throw new Error("Only private rooms have access codes");
    }

    // Check ownership only for authenticated users
    if (user) {
      const isOwner = await isRoomOwner(ctx, user._id, args.roomId);
      if (!isOwner) {
        throw new Error("Only the room owner can regenerate the access code");
      }
    }

    const accessCode = generateRoomCode();

    await ctx.db.patch(args.roomId, {
      accessCode,
      updatedAt: Date.now(),
    });

    return { accessCode };
  },
});
