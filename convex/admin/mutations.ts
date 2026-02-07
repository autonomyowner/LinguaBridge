import { mutation } from "../_generated/server";
import { v } from "convex/values";

// Delete a user by email
export const deleteUserByEmail = mutation({
  args: { email: v.string() },
  handler: async (ctx, args) => {
    const user = await ctx.db
      .query("users")
      .withIndex("by_email", (q) => q.eq("email", args.email))
      .first();

    if (!user) {
      return { success: false, message: "User not found" };
    }

    // Delete related data
    // Delete friendships
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

    // Delete messages
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

    // Delete notifications
    const notifications = await ctx.db
      .query("notifications")
      .withIndex("by_user_all", (q) => q.eq("userId", user._id))
      .collect();

    for (const n of notifications) {
      await ctx.db.delete(n._id);
    }

    // Delete participants
    const participants = await ctx.db
      .query("participants")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .collect();

    for (const p of participants) {
      await ctx.db.delete(p._id);
    }

    // Delete rooms created by user
    const rooms = await ctx.db
      .query("rooms")
      .withIndex("by_creator", (q) => q.eq("creatorId", user._id))
      .collect();

    for (const r of rooms) {
      await ctx.db.delete(r._id);
    }

    // Delete user settings
    const settings = await ctx.db
      .query("userSettings")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .first();

    if (settings) {
      await ctx.db.delete(settings._id);
    }

    // Delete the user
    await ctx.db.delete(user._id);

    return { success: true, message: `Deleted user: ${args.email}` };
  },
});

// Delete all users except specified emails
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
