import { query } from "../_generated/server";
import { v } from "convex/values";
import { getCurrentUserOrNull } from "../lib/utils";

/**
 * List notifications for the current user
 * Returns most recent first
 */
export const list = query({
  args: {
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUserOrNull(ctx);
    if (!user) return [];

    const limit = args.limit ?? 20;

    const notifications = await ctx.db
      .query("notifications")
      .withIndex("by_user_all", (q) => q.eq("userId", user._id))
      .order("desc")
      .take(limit);

    return notifications;
  },
});

/**
 * Get count of unread notifications
 */
export const getUnreadCount = query({
  args: {},
  handler: async (ctx) => {
    const user = await getCurrentUserOrNull(ctx);
    if (!user) return 0;

    const unreadNotifications = await ctx.db
      .query("notifications")
      .withIndex("by_user_unread", (q) =>
        q.eq("userId", user._id).eq("isRead", false)
      )
      .collect();

    return unreadNotifications.length;
  },
});

/**
 * Get notification by ID
 */
export const getById = query({
  args: { notificationId: v.id("notifications") },
  handler: async (ctx, args) => {
    const user = await getCurrentUserOrNull(ctx);
    if (!user) return null;

    const notification = await ctx.db.get(args.notificationId);
    if (!notification || notification.userId !== user._id) {
      return null;
    }

    return notification;
  },
});
