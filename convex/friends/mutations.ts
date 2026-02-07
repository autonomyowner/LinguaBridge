import { mutation } from "../_generated/server";
import { v } from "convex/values";
import { getCurrentUser } from "../lib/utils";
import { createNotification } from "../notifications/mutations";

/**
 * Send a friend request to another user
 */
export const sendRequest = mutation({
  args: {
    userId: v.id("users"),
    userEmail: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const currentUser = await getCurrentUser(ctx, args.userEmail);

    // Can't friend yourself
    if (args.userId === currentUser._id) {
      throw new Error("You cannot send a friend request to yourself");
    }

    // Check if target user exists
    const targetUser = await ctx.db.get(args.userId);
    if (!targetUser || targetUser.isActive === false) {
      throw new Error("User not found");
    }

    // Check if friendship already exists (in either direction)
    const existingAsRequester = await ctx.db
      .query("friendships")
      .withIndex("by_pair", (q) =>
        q.eq("requesterId", currentUser._id).eq("addresseeId", args.userId)
      )
      .first();

    if (existingAsRequester) {
      if (existingAsRequester.status === "pending") {
        throw new Error("Friend request already sent");
      }
      if (existingAsRequester.status === "accepted") {
        throw new Error("You are already friends");
      }
      // If rejected, allow re-sending by updating the existing friendship
      const now = Date.now();
      await ctx.db.patch(existingAsRequester._id, {
        status: "pending",
        updatedAt: now,
      });

      // Create notification for the target user
      await createNotification(ctx, {
        userId: args.userId,
        type: "friend_request",
        referenceId: existingAsRequester._id as string,
        title: "New friend request",
        body: `${currentUser.name || "Someone"} wants to be your friend`,
      });

      return { success: true, friendshipId: existingAsRequester._id };
    }

    const existingAsAddressee = await ctx.db
      .query("friendships")
      .withIndex("by_pair", (q) =>
        q.eq("requesterId", args.userId).eq("addresseeId", currentUser._id)
      )
      .first();

    if (existingAsAddressee) {
      if (existingAsAddressee.status === "pending") {
        // They already sent us a request - auto-accept it
        const now = Date.now();
        await ctx.db.patch(existingAsAddressee._id, {
          status: "accepted",
          updatedAt: now,
        });

        // Notify the original requester that we accepted
        await createNotification(ctx, {
          userId: args.userId,
          type: "friend_accepted",
          referenceId: existingAsAddressee._id as string,
          title: "Friend request accepted",
          body: `${currentUser.name || "Someone"} accepted your friend request`,
        });

        return { success: true, friendshipId: existingAsAddressee._id, autoAccepted: true };
      }
      if (existingAsAddressee.status === "accepted") {
        throw new Error("You are already friends");
      }
      // If rejected, delete old record and create a new one with correct direction
      if (existingAsAddressee.status === "rejected") {
        await ctx.db.delete(existingAsAddressee._id);

        const now = Date.now();
        const friendshipId = await ctx.db.insert("friendships", {
          requesterId: currentUser._id,
          addresseeId: args.userId,
          status: "pending",
          createdAt: now,
          updatedAt: now,
        });

        await createNotification(ctx, {
          userId: args.userId,
          type: "friend_request",
          referenceId: friendshipId as string,
          title: "New friend request",
          body: `${currentUser.name || "Someone"} wants to be your friend`,
        });

        return { success: true, friendshipId };
      }
    }

    // Create new friendship request
    const now = Date.now();
    const friendshipId = await ctx.db.insert("friendships", {
      requesterId: currentUser._id,
      addresseeId: args.userId,
      status: "pending",
      createdAt: now,
      updatedAt: now,
    });

    // Create notification for the target user
    await createNotification(ctx, {
      userId: args.userId,
      type: "friend_request",
      referenceId: friendshipId as string,
      title: "New friend request",
      body: `${currentUser.name || "Someone"} wants to be your friend`,
    });

    return { success: true, friendshipId };
  },
});

/**
 * Accept a friend request
 */
export const acceptRequest = mutation({
  args: {
    friendshipId: v.id("friendships"),
    userEmail: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const currentUser = await getCurrentUser(ctx, args.userEmail);

    const friendship = await ctx.db.get(args.friendshipId);
    if (!friendship) {
      throw new Error("Friend request not found");
    }

    // Only the addressee can accept
    if (friendship.addresseeId !== currentUser._id) {
      throw new Error("You can only accept requests sent to you");
    }

    if (friendship.status !== "pending") {
      throw new Error("This request has already been processed");
    }

    const now = Date.now();
    await ctx.db.patch(args.friendshipId, {
      status: "accepted",
      updatedAt: now,
    });

    // Notify the requester
    await createNotification(ctx, {
      userId: friendship.requesterId,
      type: "friend_accepted",
      referenceId: args.friendshipId as string,
      title: "Friend request accepted",
      body: `${currentUser.name || "Someone"} accepted your friend request`,
    });

    return { success: true };
  },
});

/**
 * Reject a friend request
 */
export const rejectRequest = mutation({
  args: {
    friendshipId: v.id("friendships"),
    userEmail: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const currentUser = await getCurrentUser(ctx, args.userEmail);

    const friendship = await ctx.db.get(args.friendshipId);
    if (!friendship) {
      throw new Error("Friend request not found");
    }

    // Only the addressee can reject
    if (friendship.addresseeId !== currentUser._id) {
      throw new Error("You can only reject requests sent to you");
    }

    if (friendship.status !== "pending") {
      throw new Error("This request has already been processed");
    }

    const now = Date.now();
    await ctx.db.patch(args.friendshipId, {
      status: "rejected",
      updatedAt: now,
    });

    // No notification for rejection (silent)

    return { success: true };
  },
});

/**
 * Cancel a sent friend request
 */
export const cancelRequest = mutation({
  args: {
    friendshipId: v.id("friendships"),
    userEmail: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const currentUser = await getCurrentUser(ctx, args.userEmail);

    const friendship = await ctx.db.get(args.friendshipId);
    if (!friendship) {
      throw new Error("Friend request not found");
    }

    // Only the requester can cancel
    if (friendship.requesterId !== currentUser._id) {
      throw new Error("You can only cancel requests you sent");
    }

    if (friendship.status !== "pending") {
      throw new Error("This request has already been processed");
    }

    // Delete the friendship
    await ctx.db.delete(args.friendshipId);

    return { success: true };
  },
});

/**
 * Unfriend a user
 */
export const unfriend = mutation({
  args: {
    userId: v.id("users"),
    userEmail: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const currentUser = await getCurrentUser(ctx, args.userEmail);

    // Find the friendship in either direction
    const asRequester = await ctx.db
      .query("friendships")
      .withIndex("by_pair", (q) =>
        q.eq("requesterId", currentUser._id).eq("addresseeId", args.userId)
      )
      .first();

    const asAddressee = await ctx.db
      .query("friendships")
      .withIndex("by_pair", (q) =>
        q.eq("requesterId", args.userId).eq("addresseeId", currentUser._id)
      )
      .first();

    const friendship = asRequester || asAddressee;

    if (!friendship || friendship.status !== "accepted") {
      throw new Error("You are not friends with this user");
    }

    // Delete the friendship
    await ctx.db.delete(friendship._id);

    // No notification for unfriend (silent)

    return { success: true };
  },
});
