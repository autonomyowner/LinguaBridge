import { mutation } from "../_generated/server";
import { v } from "convex/values";
import { getCurrentUser } from "../lib/utils";
import { createNotification } from "../notifications/mutations";

/**
 * Generate a unique invite code
 */
function generateInviteCode(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789";
  let code = "";
  for (let i = 0; i < 8; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

/**
 * Send a direct room invitation to a friend
 */
export const sendDirect = mutation({
  args: {
    friendId: v.id("users"),
    roomId: v.id("rooms"),
  },
  handler: async (ctx, args) => {
    const currentUser = await getCurrentUser(ctx);

    // Verify the room exists and user has access
    const room = await ctx.db.get(args.roomId);
    if (!room || !room.isActive) {
      throw new Error("Room not found");
    }

    // Verify target user exists
    const targetUser = await ctx.db.get(args.friendId);
    if (!targetUser || targetUser.isActive === false) {
      throw new Error("User not found");
    }

    // Verify they are friends
    const areFriends = await checkFriendship(ctx, currentUser._id, args.friendId);
    if (!areFriends) {
      throw new Error("You can only invite friends");
    }

    // Check if there's already a pending invitation
    const existingInvite = await ctx.db
      .query("roomInvitations")
      .withIndex("by_invitee", (q) =>
        q.eq("inviteeId", args.friendId).eq("status", "pending")
      )
      .filter((q) =>
        q.and(
          q.eq(q.field("inviterId"), currentUser._id),
          q.eq(q.field("roomId"), args.roomId)
        )
      )
      .first();

    const now = Date.now();

    if (existingInvite && existingInvite.expiresAt > now) {
      throw new Error("You already sent an invitation for this room");
    }

    // Create invitation (expires in 24 hours)
    const inviteCode = generateInviteCode();
    const expiresAt = now + 24 * 60 * 60 * 1000;

    const invitationId = await ctx.db.insert("roomInvitations", {
      inviterId: currentUser._id,
      inviteeId: args.friendId,
      roomId: args.roomId,
      inviteCode,
      status: "pending",
      expiresAt,
      createdAt: now,
    });

    // Create notification
    await createNotification(ctx, {
      userId: args.friendId,
      type: "room_invite",
      referenceId: invitationId,
      title: "Room invitation",
      body: `${currentUser.name || "Someone"} invited you to join "${room.name}"`,
    });

    return { success: true, invitationId, inviteCode };
  },
});

/**
 * Create a shareable link invitation (not tied to a specific user)
 */
export const createLink = mutation({
  args: {
    roomId: v.id("rooms"),
    expiresInHours: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const currentUser = await getCurrentUser(ctx);

    // Verify the room exists
    const room = await ctx.db.get(args.roomId);
    if (!room || !room.isActive) {
      throw new Error("Room not found");
    }

    // Check if user has access to the room (creator or participant)
    const isCreator = room.creatorId === currentUser._id;
    const isParticipant = await ctx.db
      .query("participants")
      .withIndex("by_room_user", (q) =>
        q.eq("roomId", args.roomId).eq("userId", currentUser._id)
      )
      .first();

    if (!isCreator && !isParticipant) {
      throw new Error("You don't have access to this room");
    }

    const now = Date.now();
    const hours = args.expiresInHours ?? 24;
    const expiresAt = now + hours * 60 * 60 * 1000;
    const inviteCode = generateInviteCode();

    const invitationId = await ctx.db.insert("roomInvitations", {
      inviterId: currentUser._id,
      inviteeId: undefined, // Link-based invite, no specific invitee
      roomId: args.roomId,
      inviteCode,
      status: "pending",
      expiresAt,
      createdAt: now,
    });

    return {
      success: true,
      invitationId,
      inviteCode,
      expiresAt,
    };
  },
});

/**
 * Accept an invitation
 */
export const accept = mutation({
  args: { invitationId: v.id("roomInvitations") },
  handler: async (ctx, args) => {
    const currentUser = await getCurrentUser(ctx);

    const invitation = await ctx.db.get(args.invitationId);
    if (!invitation) {
      throw new Error("Invitation not found");
    }

    // Check if this is a direct invite for this user
    if (invitation.inviteeId && invitation.inviteeId !== currentUser._id) {
      throw new Error("This invitation is not for you");
    }

    if (invitation.status !== "pending") {
      throw new Error("This invitation has already been used");
    }

    const now = Date.now();
    if (invitation.expiresAt < now) {
      throw new Error("This invitation has expired");
    }

    // Verify room still exists
    const room = await ctx.db.get(invitation.roomId);
    if (!room || !room.isActive) {
      throw new Error("Room no longer exists");
    }

    // Mark invitation as accepted
    await ctx.db.patch(args.invitationId, {
      status: "accepted",
    });

    // Add user as participant if not already
    const existingParticipant = await ctx.db
      .query("participants")
      .withIndex("by_room_user", (q) =>
        q.eq("roomId", invitation.roomId).eq("userId", currentUser._id)
      )
      .first();

    if (!existingParticipant) {
      await ctx.db.insert("participants", {
        roomId: invitation.roomId,
        userId: currentUser._id,
        role: "member",
        preferredLanguage: room.defaultTargetLanguage,
        isMuted: false,
        isOnline: false,
        joinedAt: now,
        lastSeenAt: now,
      });
    }

    return {
      success: true,
      roomId: invitation.roomId,
      roomName: room.name,
    };
  },
});

/**
 * Accept an invitation by code (for link-based invites)
 */
export const acceptByCode = mutation({
  args: { code: v.string() },
  handler: async (ctx, args) => {
    const currentUser = await getCurrentUser(ctx);

    const invitation = await ctx.db
      .query("roomInvitations")
      .withIndex("by_code", (q) => q.eq("inviteCode", args.code))
      .first();

    if (!invitation) {
      throw new Error("Invitation not found");
    }

    // Check if this is a direct invite for someone else
    if (invitation.inviteeId && invitation.inviteeId !== currentUser._id) {
      throw new Error("This invitation is not for you");
    }

    if (invitation.status !== "pending") {
      throw new Error("This invitation has already been used");
    }

    const now = Date.now();
    if (invitation.expiresAt < now) {
      throw new Error("This invitation has expired");
    }

    // Verify room still exists
    const room = await ctx.db.get(invitation.roomId);
    if (!room || !room.isActive) {
      throw new Error("Room no longer exists");
    }

    // For link invites, mark as accepted but don't prevent reuse
    // Only direct invites should be single-use
    if (invitation.inviteeId) {
      await ctx.db.patch(invitation._id, {
        status: "accepted",
      });
    }

    // Add user as participant if not already
    const existingParticipant = await ctx.db
      .query("participants")
      .withIndex("by_room_user", (q) =>
        q.eq("roomId", invitation.roomId).eq("userId", currentUser._id)
      )
      .first();

    if (!existingParticipant) {
      await ctx.db.insert("participants", {
        roomId: invitation.roomId,
        userId: currentUser._id,
        role: "member",
        preferredLanguage: room.defaultTargetLanguage,
        isMuted: false,
        isOnline: false,
        joinedAt: now,
        lastSeenAt: now,
      });
    }

    return {
      success: true,
      roomId: invitation.roomId,
      roomName: room.name,
    };
  },
});

/**
 * Decline an invitation
 */
export const decline = mutation({
  args: { invitationId: v.id("roomInvitations") },
  handler: async (ctx, args) => {
    const currentUser = await getCurrentUser(ctx);

    const invitation = await ctx.db.get(args.invitationId);
    if (!invitation) {
      throw new Error("Invitation not found");
    }

    // Only the invitee can decline
    if (invitation.inviteeId !== currentUser._id) {
      throw new Error("This invitation is not for you");
    }

    if (invitation.status !== "pending") {
      throw new Error("This invitation has already been processed");
    }

    // Just delete the invitation
    await ctx.db.delete(args.invitationId);

    return { success: true };
  },
});

/**
 * Cancel an invitation (as inviter)
 */
export const cancel = mutation({
  args: { invitationId: v.id("roomInvitations") },
  handler: async (ctx, args) => {
    const currentUser = await getCurrentUser(ctx);

    const invitation = await ctx.db.get(args.invitationId);
    if (!invitation) {
      throw new Error("Invitation not found");
    }

    // Only the inviter can cancel
    if (invitation.inviterId !== currentUser._id) {
      throw new Error("You can only cancel invitations you sent");
    }

    if (invitation.status !== "pending") {
      throw new Error("This invitation has already been processed");
    }

    await ctx.db.delete(args.invitationId);

    return { success: true };
  },
});

// Helper function to check friendship
async function checkFriendship(
  ctx: { db: any },
  userId1: any,
  userId2: any
): Promise<boolean> {
  const asRequester = await ctx.db
    .query("friendships")
    .withIndex("by_pair", (q: any) =>
      q.eq("requesterId", userId1).eq("addresseeId", userId2)
    )
    .first();

  if (asRequester?.status === "accepted") return true;

  const asAddressee = await ctx.db
    .query("friendships")
    .withIndex("by_pair", (q: any) =>
      q.eq("requesterId", userId2).eq("addresseeId", userId1)
    )
    .first();

  return asAddressee?.status === "accepted";
}
