import { query, mutation } from "./_generated/server";
import { v } from "convex/values";
import { getCurrentUserOrNull } from "./lib/utils";
import { authComponent } from "./auth";

// Ensure user exists in app database (for users who exist in Better-Auth but not app DB)
export const ensureUserByEmail = mutation({
  args: {
    email: v.string(),
    name: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    // Check if user already exists
    const existingUser = await ctx.db
      .query("users")
      .withIndex("by_email", (q) => q.eq("email", args.email))
      .first();

    if (existingUser) {
      return { userId: existingUser._id, created: false };
    }

    // Create new user
    const now = Date.now();
    const userId = await ctx.db.insert("users", {
      email: args.email,
      name: args.name || args.email.split("@")[0],
      subscriptionTier: "free",
      minutesUsedThisMonth: 0,
      minutesResetAt: now,
      isActive: true,
      isDiscoverable: true,
      createdAt: now,
      updatedAt: now,
    });

    return { userId, created: true };
  },
});

// List all friendships for debugging
export const listFriendships = query({
  args: {},
  handler: async (ctx) => {
    const friendships = await ctx.db.query("friendships").collect();
    return friendships;
  },
});

// Temporary debug query - remove after debugging
export const listAllUsers = query({
  args: {},
  handler: async (ctx) => {
    const users = await ctx.db.query("users").collect();
    return users.map(u => ({
      _id: u._id,
      email: u.email,
      name: u.name,
      isActive: u.isActive,
      isDiscoverable: u.isDiscoverable,
    }));
  },
});

// Debug: Check current user and browse results
export const debugBrowse = query({
  args: {},
  handler: async (ctx) => {
    // Try to get auth user directly
    let authUser = null;
    let authError = null;
    try {
      authUser = await authComponent.getAuthUser(ctx);
    } catch (e: any) {
      authError = e?.message || "Unknown auth error";
    }

    const currentUser = await getCurrentUserOrNull(ctx);

    // Get all discoverable users regardless of auth
    const allUsers = await ctx.db
      .query("users")
      .filter((q) =>
        q.and(
          q.neq(q.field("isDiscoverable"), false),
          q.neq(q.field("isActive"), false)
        )
      )
      .take(100);

    return {
      authUser: authUser ? { id: authUser._id, email: authUser.email } : null,
      authError,
      currentUser: currentUser ? {
        _id: currentUser._id,
        email: currentUser.email,
      } : null,
      totalUsers: allUsers.length,
      users: allUsers.map(u => ({
        _id: u._id,
        email: u.email,
        name: u.name,
      })),
    };
  },
});

// Browse users without requiring auth (for testing)
// Also includes friendship status based on the current user's email
export const browseAllUsers = query({
  args: {
    excludeEmail: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    let queryBuilder = ctx.db
      .query("users")
      .filter((q) =>
        q.and(
          q.neq(q.field("isDiscoverable"), false),
          q.neq(q.field("isActive"), false)
        )
      );

    const allUsers = await queryBuilder.take(100);

    // Filter out the current user by email if provided
    const filteredUsers = args.excludeEmail
      ? allUsers.filter(u => u.email !== args.excludeEmail)
      : allUsers;

    // Get current user by email for friendship status lookup
    let currentUserId: any = null;
    if (args.excludeEmail) {
      const email = args.excludeEmail;
      const currentUser = await ctx.db
        .query("users")
        .withIndex("by_email", (q) => q.eq("email", email))
        .first();
      currentUserId = currentUser?._id;
    }

    // Get friendship status for each user
    const usersWithStatus = await Promise.all(
      filteredUsers.map(async (u) => {
        let friendshipStatus: "pending" | "accepted" | "rejected" | null = null;
        let friendshipId: any = null;

        if (currentUserId) {
          // Check if current user sent request to this user
          const asRequester = await ctx.db
            .query("friendships")
            .withIndex("by_pair", (q: any) =>
              q.eq("requesterId", currentUserId).eq("addresseeId", u._id)
            )
            .first();

          if (asRequester) {
            friendshipStatus = asRequester.status;
            friendshipId = asRequester._id;
          } else {
            // Check if this user sent request to current user
            const asAddressee = await ctx.db
              .query("friendships")
              .withIndex("by_pair", (q: any) =>
                q.eq("requesterId", u._id).eq("addresseeId", currentUserId)
              )
              .first();

            if (asAddressee) {
              friendshipStatus = asAddressee.status;
              friendshipId = asAddressee._id;
            }
          }
        }

        return {
          _id: u._id,
          name: u.name || "Anonymous",
          imageUrl: u.imageUrl,
          spokenLanguages: u.spokenLanguages || [],
          friendshipStatus,
          friendshipId,
        };
      })
    );

    return {
      users: usersWithStatus,
    };
  },
});

// Delete all users except specified emails (admin function)
export const deleteAllUsersExcept = mutation({
  args: { keepEmails: v.array(v.string()) },
  handler: async (ctx, args) => {
    const allUsers = await ctx.db.query("users").collect();
    const keepEmailsLower = args.keepEmails.map(e => e.toLowerCase());

    let deletedCount = 0;
    const deletedEmails: string[] = [];

    for (const user of allUsers) {
      if (!keepEmailsLower.includes(user.email.toLowerCase())) {
        // Delete related data first

        // Friendships
        const friendshipsAsRequester = await ctx.db
          .query("friendships")
          .withIndex("by_requester", (q) => q.eq("requesterId", user._id))
          .collect();
        const friendshipsAsAddressee = await ctx.db
          .query("friendships")
          .withIndex("by_addressee", (q) => q.eq("addresseeId", user._id))
          .collect();

        for (const f of [...friendshipsAsRequester, ...friendshipsAsAddressee]) {
          await ctx.db.delete(f._id);
        }

        // Messages
        const messagesSent = await ctx.db
          .query("messages")
          .withIndex("by_sender", (q) => q.eq("senderId", user._id))
          .collect();
        const messagesReceived = await ctx.db
          .query("messages")
          .withIndex("by_receiver", (q) => q.eq("receiverId", user._id))
          .collect();

        for (const m of [...messagesSent, ...messagesReceived]) {
          await ctx.db.delete(m._id);
        }

        // Notifications
        const notifications = await ctx.db
          .query("notifications")
          .withIndex("by_user_all", (q) => q.eq("userId", user._id))
          .collect();

        for (const n of notifications) {
          await ctx.db.delete(n._id);
        }

        // Participants
        const participants = await ctx.db
          .query("participants")
          .withIndex("by_user", (q) => q.eq("userId", user._id))
          .collect();

        for (const p of participants) {
          await ctx.db.delete(p._id);
        }

        // Rooms
        const rooms = await ctx.db
          .query("rooms")
          .withIndex("by_creator", (q) => q.eq("creatorId", user._id))
          .collect();

        for (const r of rooms) {
          await ctx.db.delete(r._id);
        }

        // User settings
        const settings = await ctx.db
          .query("userSettings")
          .withIndex("by_user", (q) => q.eq("userId", user._id))
          .first();

        if (settings) {
          await ctx.db.delete(settings._id);
        }

        // Delete user
        await ctx.db.delete(user._id);
        deletedCount++;
        deletedEmails.push(user.email);
      }
    }

    return {
      success: true,
      deletedCount,
      deletedEmails,
      keptEmails: args.keepEmails
    };
  },
});
