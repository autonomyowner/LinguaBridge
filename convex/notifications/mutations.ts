import { mutation, internalMutation } from "../_generated/server";
import { v } from "convex/values";
import { getCurrentUser } from "../lib/utils";
import { Id } from "../_generated/dataModel";

/**
 * Mark a single notification as read
 */
export const markAsRead = mutation({
  args: {
    notificationId: v.id("notifications"),
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);

    const notification = await ctx.db.get(args.notificationId);
    if (!notification || notification.userId !== user._id) {
      throw new Error("Notification not found");
    }

    await ctx.db.patch(args.notificationId, { isRead: true });

    return { success: true };
  },
});

/**
 * Mark all notifications as read for the current user
 */
export const markAllAsRead = mutation({
  args: {},
  handler: async (ctx) => {
    const user = await getCurrentUser(ctx);

    const unreadNotifications = await ctx.db
      .query("notifications")
      .withIndex("by_user_unread", (q) =>
        q.eq("userId", user._id).eq("isRead", false)
      )
      .collect();

    for (const notification of unreadNotifications) {
      await ctx.db.patch(notification._id, { isRead: true });
    }

    return { success: true, count: unreadNotifications.length };
  },
});

/**
 * Delete a notification
 */
export const deleteNotification = mutation({
  args: {
    notificationId: v.id("notifications"),
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);

    const notification = await ctx.db.get(args.notificationId);
    if (!notification || notification.userId !== user._id) {
      throw new Error("Notification not found");
    }

    await ctx.db.delete(args.notificationId);

    return { success: true };
  },
});

/**
 * Internal: Create a notification (used by other modules)
 */
export const create = internalMutation({
  args: {
    userId: v.id("users"),
    type: v.union(
      v.literal("friend_request"),
      v.literal("friend_accepted"),
      v.literal("message"),
      v.literal("room_invite")
    ),
    referenceId: v.string(),
    title: v.optional(v.string()),
    body: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const notificationId = await ctx.db.insert("notifications", {
      userId: args.userId,
      type: args.type,
      referenceId: args.referenceId,
      title: args.title,
      body: args.body,
      isRead: false,
      createdAt: Date.now(),
    });

    return notificationId;
  },
});

/**
 * Helper to create notification from mutations
 * This is a non-internal version for direct use in other mutations
 */
export async function createNotification(
  ctx: { db: any },
  args: {
    userId: Id<"users">;
    type: "friend_request" | "friend_accepted" | "message" | "room_invite";
    referenceId: string;
    title?: string;
    body?: string;
  }
) {
  const notificationId = await ctx.db.insert("notifications", {
    userId: args.userId,
    type: args.type,
    referenceId: args.referenceId,
    title: args.title,
    body: args.body,
    isRead: false,
    createdAt: Date.now(),
  });

  return notificationId;
}
