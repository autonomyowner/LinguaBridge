import { query } from "../_generated/server";
import { v } from "convex/values";
import { getCurrentUserOrNull } from "../lib/utils";
import { Doc, Id } from "../_generated/dataModel";

/**
 * Get list of accepted friends with their details
 */
export const list = query({
  args: {},
  handler: async (ctx) => {
    const user = await getCurrentUserOrNull(ctx);
    if (!user) return [];

    // Get friendships where user is requester
    const asRequester = await ctx.db
      .query("friendships")
      .withIndex("by_requester", (q) => q.eq("requesterId", user._id))
      .filter((q) => q.eq(q.field("status"), "accepted"))
      .collect();

    // Get friendships where user is addressee
    const asAddressee = await ctx.db
      .query("friendships")
      .withIndex("by_addressee", (q) => q.eq("addresseeId", user._id))
      .filter((q) => q.eq(q.field("status"), "accepted"))
      .collect();

    // Collect friend IDs
    const friendIds = [
      ...asRequester.map((f) => f.addresseeId),
      ...asAddressee.map((f) => f.requesterId),
    ];

    // Get friend details
    const friends = await Promise.all(
      friendIds.map(async (id) => {
        const friend = await ctx.db.get(id);
        if (!friend) return null;

        // Check if friend has any recent activity (simplified online status)
        const isOnline = friend.updatedAt
          ? Date.now() - friend.updatedAt < 5 * 60 * 1000 // Online if active in last 5 minutes
          : false;

        return {
          _id: friend._id,
          name: friend.name || "Anonymous",
          email: friend.email,
          imageUrl: friend.imageUrl,
          spokenLanguages: friend.spokenLanguages || [],
          isOnline,
        };
      })
    );

    return friends.filter((f): f is NonNullable<typeof f> => f !== null);
  },
});

/**
 * Get pending friend requests received by the current user
 */
export const listPending = query({
  args: {},
  handler: async (ctx) => {
    const user = await getCurrentUserOrNull(ctx);
    if (!user) return [];

    const pendingRequests = await ctx.db
      .query("friendships")
      .withIndex("by_addressee", (q) => q.eq("addresseeId", user._id))
      .filter((q) => q.eq(q.field("status"), "pending"))
      .collect();

    // Get requester details
    const requests = await Promise.all(
      pendingRequests.map(async (friendship) => {
        const requester = await ctx.db.get(friendship.requesterId);
        if (!requester) return null;

        return {
          friendshipId: friendship._id,
          requesterId: requester._id,
          name: requester.name || "Anonymous",
          email: requester.email,
          imageUrl: requester.imageUrl,
          spokenLanguages: requester.spokenLanguages || [],
          createdAt: friendship.createdAt,
        };
      })
    );

    return requests.filter((r): r is NonNullable<typeof r> => r !== null);
  },
});

/**
 * Get friend requests sent by the current user
 */
export const listSent = query({
  args: {},
  handler: async (ctx) => {
    const user = await getCurrentUserOrNull(ctx);
    if (!user) return [];

    const sentRequests = await ctx.db
      .query("friendships")
      .withIndex("by_requester", (q) => q.eq("requesterId", user._id))
      .filter((q) => q.eq(q.field("status"), "pending"))
      .collect();

    // Get addressee details
    const requests = await Promise.all(
      sentRequests.map(async (friendship) => {
        const addressee = await ctx.db.get(friendship.addresseeId);
        if (!addressee) return null;

        return {
          friendshipId: friendship._id,
          addresseeId: addressee._id,
          name: addressee.name || "Anonymous",
          email: addressee.email,
          imageUrl: addressee.imageUrl,
          spokenLanguages: addressee.spokenLanguages || [],
          createdAt: friendship.createdAt,
        };
      })
    );

    return requests.filter((r): r is NonNullable<typeof r> => r !== null);
  },
});

/**
 * Search users by name or email
 */
export const searchUsers = query({
  args: {
    query: v.string(),
    languageFilter: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const currentUser = await getCurrentUserOrNull(ctx);
    if (!currentUser) return [];

    const searchQuery = args.query.toLowerCase();
    if (searchQuery.length < 2) return [];

    // Get all discoverable users
    const allUsers = await ctx.db
      .query("users")
      .filter((q) =>
        q.and(
          q.neq(q.field("_id"), currentUser._id),
          q.neq(q.field("isDiscoverable"), false), // Include users where isDiscoverable is undefined (default true)
          q.eq(q.field("isActive"), true)
        )
      )
      .take(100);

    // Filter by search query
    let filteredUsers = allUsers.filter((u) => {
      const nameMatch = u.name?.toLowerCase().includes(searchQuery);
      const emailMatch = u.email.toLowerCase().includes(searchQuery);
      return nameMatch || emailMatch;
    });

    // Filter by language if specified
    if (args.languageFilter) {
      filteredUsers = filteredUsers.filter((u) =>
        u.spokenLanguages?.includes(args.languageFilter!)
      );
    }

    // Get friendship status for each user
    const usersWithStatus = await Promise.all(
      filteredUsers.slice(0, 20).map(async (u) => {
        const friendship = await getFriendshipStatus(ctx, currentUser._id, u._id);
        return {
          _id: u._id,
          name: u.name || "Anonymous",
          email: u.email,
          imageUrl: u.imageUrl,
          spokenLanguages: u.spokenLanguages || [],
          friendshipStatus: friendship?.status || null,
          friendshipId: friendship?._id || null,
        };
      })
    );

    return usersWithStatus;
  },
});

/**
 * Browse user directory with optional language filter
 */
export const browseUsers = query({
  args: {
    languageFilter: v.optional(v.string()),
    cursor: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const currentUser = await getCurrentUserOrNull(ctx);
    if (!currentUser) return { users: [], nextCursor: null };

    // Get discoverable users
    let query = ctx.db
      .query("users")
      .filter((q) =>
        q.and(
          q.neq(q.field("_id"), currentUser._id),
          q.neq(q.field("isDiscoverable"), false),
          q.neq(q.field("isActive"), false)
        )
      );

    const allUsers = await query.take(100);

    // Filter by language if specified
    let filteredUsers = args.languageFilter
      ? allUsers.filter((u) =>
          u.spokenLanguages?.includes(args.languageFilter!)
        )
      : allUsers;

    // Get friendship status for each user
    const usersWithStatus = await Promise.all(
      filteredUsers.slice(0, 20).map(async (u) => {
        const friendship = await getFriendshipStatus(ctx, currentUser._id, u._id);
        return {
          _id: u._id,
          name: u.name || "Anonymous",
          email: u.email,
          imageUrl: u.imageUrl,
          spokenLanguages: u.spokenLanguages || [],
          friendshipStatus: friendship?.status || null,
          friendshipId: friendship?._id || null,
        };
      })
    );

    return {
      users: usersWithStatus,
      nextCursor: null, // Simplified pagination - can be enhanced later
    };
  },
});

/**
 * Get friendship status with another user
 */
export const getFriendship = query({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    const currentUser = await getCurrentUserOrNull(ctx);
    if (!currentUser) return null;

    return await getFriendshipStatus(ctx, currentUser._id, args.userId);
  },
});

// Helper function to get friendship status
async function getFriendshipStatus(
  ctx: { db: any },
  userId1: Id<"users">,
  userId2: Id<"users">
): Promise<Doc<"friendships"> | null> {
  // Check if userId1 sent request to userId2
  const asRequester = await ctx.db
    .query("friendships")
    .withIndex("by_pair", (q: any) =>
      q.eq("requesterId", userId1).eq("addresseeId", userId2)
    )
    .first();

  if (asRequester) return asRequester;

  // Check if userId2 sent request to userId1
  const asAddressee = await ctx.db
    .query("friendships")
    .withIndex("by_pair", (q: any) =>
      q.eq("requesterId", userId2).eq("addresseeId", userId1)
    )
    .first();

  return asAddressee;
}
