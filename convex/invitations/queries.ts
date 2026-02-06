import { query } from "../_generated/server";
import { v } from "convex/values";
import { getCurrentUserOrNull } from "../lib/utils";

/**
 * List pending room invitations received by the current user
 */
export const listReceived = query({
  args: {},
  handler: async (ctx) => {
    const user = await getCurrentUserOrNull(ctx);
    if (!user) return [];

    const now = Date.now();

    const invitations = await ctx.db
      .query("roomInvitations")
      .withIndex("by_invitee", (q) =>
        q.eq("inviteeId", user._id).eq("status", "pending")
      )
      .collect();

    // Filter out expired invitations and get details
    const validInvitations = await Promise.all(
      invitations
        .filter((inv) => inv.expiresAt > now)
        .map(async (inv) => {
          const [inviter, room] = await Promise.all([
            ctx.db.get(inv.inviterId),
            ctx.db.get(inv.roomId),
          ]);

          if (!inviter || !room) return null;

          return {
            _id: inv._id,
            inviteCode: inv.inviteCode,
            inviter: {
              _id: inviter._id,
              name: inviter.name || "Anonymous",
              email: inviter.email,
              imageUrl: inviter.imageUrl,
            },
            room: {
              _id: room._id,
              name: room.name,
              description: room.description,
              defaultSourceLanguage: room.defaultSourceLanguage,
              defaultTargetLanguage: room.defaultTargetLanguage,
            },
            expiresAt: inv.expiresAt,
            createdAt: inv.createdAt,
          };
        })
    );

    return validInvitations.filter((inv): inv is NonNullable<typeof inv> => inv !== null);
  },
});

/**
 * Get invitation details by invite code (for link-based invites)
 */
export const getByCode = query({
  args: { code: v.string() },
  handler: async (ctx, args) => {
    const invitation = await ctx.db
      .query("roomInvitations")
      .withIndex("by_code", (q) => q.eq("inviteCode", args.code))
      .first();

    if (!invitation) {
      return { valid: false, error: "Invitation not found" };
    }

    const now = Date.now();

    if (invitation.status !== "pending") {
      return { valid: false, error: "Invitation has already been used" };
    }

    if (invitation.expiresAt < now) {
      return { valid: false, error: "Invitation has expired" };
    }

    const [inviter, room] = await Promise.all([
      ctx.db.get(invitation.inviterId),
      ctx.db.get(invitation.roomId),
    ]);

    if (!inviter || !room) {
      return { valid: false, error: "Room or inviter no longer exists" };
    }

    if (!room.isActive) {
      return { valid: false, error: "Room is no longer active" };
    }

    return {
      valid: true,
      invitation: {
        _id: invitation._id,
        inviteCode: invitation.inviteCode,
        inviter: {
          _id: inviter._id,
          name: inviter.name || "Anonymous",
          email: inviter.email,
          imageUrl: inviter.imageUrl,
        },
        room: {
          _id: room._id,
          name: room.name,
          description: room.description,
          defaultSourceLanguage: room.defaultSourceLanguage,
          defaultTargetLanguage: room.defaultTargetLanguage,
        },
        expiresAt: invitation.expiresAt,
        createdAt: invitation.createdAt,
      },
    };
  },
});

/**
 * List invitations sent by the current user
 */
export const listSent = query({
  args: {},
  handler: async (ctx) => {
    const user = await getCurrentUserOrNull(ctx);
    if (!user) return [];

    const invitations = await ctx.db
      .query("roomInvitations")
      .withIndex("by_inviter", (q) => q.eq("inviterId", user._id))
      .order("desc")
      .take(50);

    const now = Date.now();

    // Get details
    const invitationsWithDetails = await Promise.all(
      invitations.map(async (inv) => {
        const [invitee, room] = await Promise.all([
          inv.inviteeId ? ctx.db.get(inv.inviteeId) : null,
          ctx.db.get(inv.roomId),
        ]);

        if (!room) return null;

        return {
          _id: inv._id,
          inviteCode: inv.inviteCode,
          invitee: invitee
            ? {
                _id: invitee._id,
                name: invitee.name || "Anonymous",
                email: invitee.email,
              }
            : null, // null means it's a link-based invite
          room: {
            _id: room._id,
            name: room.name,
          },
          status: inv.expiresAt < now && inv.status === "pending" ? "expired" : inv.status,
          expiresAt: inv.expiresAt,
          createdAt: inv.createdAt,
        };
      })
    );

    return invitationsWithDetails.filter((inv): inv is NonNullable<typeof inv> => inv !== null);
  },
});

/**
 * Get pending invite count for notifications badge
 */
export const getPendingCount = query({
  args: {},
  handler: async (ctx) => {
    const user = await getCurrentUserOrNull(ctx);
    if (!user) return 0;

    const now = Date.now();

    const invitations = await ctx.db
      .query("roomInvitations")
      .withIndex("by_invitee", (q) =>
        q.eq("inviteeId", user._id).eq("status", "pending")
      )
      .collect();

    // Count only non-expired invitations
    return invitations.filter((inv) => inv.expiresAt > now).length;
  },
});
