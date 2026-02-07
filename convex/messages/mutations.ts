import { mutation } from "../_generated/server";
import { v } from "convex/values";
import { getCurrentUser } from "../lib/utils";
import { createNotification } from "../notifications/mutations";

/**
 * Send a text message to a friend
 */
export const sendText = mutation({
  args: {
    friendId: v.id("users"),
    content: v.string(),
  },
  handler: async (ctx, args) => {
    const currentUser = await getCurrentUser(ctx);

    if (args.content.trim().length === 0) {
      throw new Error("Message cannot be empty");
    }

    if (args.content.length > 5000) {
      throw new Error("Message is too long (max 5000 characters)");
    }

    // Verify they are friends
    const areFriends = await checkFriendship(ctx, currentUser._id, args.friendId);
    if (!areFriends) {
      throw new Error("You can only message friends");
    }

    const now = Date.now();
    const messageId = await ctx.db.insert("messages", {
      senderId: currentUser._id,
      receiverId: args.friendId,
      type: "text",
      content: args.content,
      isRead: false,
      createdAt: now,
    });

    // Create notification for the receiver
    await createNotification(ctx, {
      userId: args.friendId,
      type: "message",
      referenceId: messageId,
      title: "New message",
      body: `${currentUser.name || "Someone"}: ${args.content.slice(0, 50)}${args.content.length > 50 ? "..." : ""}`,
    });

    return { success: true, messageId };
  },
});

/**
 * Send a voice message to a friend
 */
export const sendVoice = mutation({
  args: {
    friendId: v.id("users"),
    storageId: v.string(),
    duration: v.number(),
  },
  handler: async (ctx, args) => {
    const currentUser = await getCurrentUser(ctx);

    if (args.duration <= 0) {
      throw new Error("Invalid voice message duration");
    }

    if (args.duration > 60) {
      throw new Error("Voice message too long (max 60 seconds)");
    }

    // Verify they are friends
    const areFriends = await checkFriendship(ctx, currentUser._id, args.friendId);
    if (!areFriends) {
      throw new Error("You can only message friends");
    }

    const now = Date.now();
    const messageId = await ctx.db.insert("messages", {
      senderId: currentUser._id,
      receiverId: args.friendId,
      type: "voice",
      content: args.storageId, // Store the storage ID as content
      duration: args.duration,
      isRead: false,
      createdAt: now,
    });

    // Create notification for the receiver
    await createNotification(ctx, {
      userId: args.friendId,
      type: "message",
      referenceId: messageId,
      title: "New voice message",
      body: `${currentUser.name || "Someone"} sent a voice message (${Math.ceil(args.duration)}s)`,
    });

    return { success: true, messageId };
  },
});

/**
 * Mark all messages in a conversation as read
 */
export const markAsRead = mutation({
  args: {
    friendId: v.id("users"),
  },
  handler: async (ctx, args) => {
    const currentUser = await getCurrentUser(ctx);

    // Get all unread messages from this friend
    const unreadMessages = await ctx.db
      .query("messages")
      .withIndex("by_conversation", (q) =>
        q.eq("senderId", args.friendId).eq("receiverId", currentUser._id)
      )
      .filter((q) => q.eq(q.field("isRead"), false))
      .collect();

    // Mark all as read
    for (const message of unreadMessages) {
      await ctx.db.patch(message._id, { isRead: true });
    }

    return { success: true, count: unreadMessages.length };
  },
});

/**
 * Delete a message (only your own messages)
 */
export const deleteMessage = mutation({
  args: {
    messageId: v.id("messages"),
  },
  handler: async (ctx, args) => {
    const currentUser = await getCurrentUser(ctx);

    const message = await ctx.db.get(args.messageId);
    if (!message) {
      throw new Error("Message not found");
    }

    // Only the sender can delete
    if (message.senderId !== currentUser._id) {
      throw new Error("You can only delete your own messages");
    }

    await ctx.db.delete(args.messageId);

    return { success: true };
  },
});

/**
 * Generate upload URL for voice messages
 */
export const generateUploadUrl = mutation({
  args: {},
  handler: async (ctx) => {
    await getCurrentUser(ctx); // Ensure authenticated
    return await ctx.storage.generateUploadUrl();
  },
});

/**
 * Get storage URL for a voice message
 */
export const getVoiceUrl = mutation({
  args: {
    storageId: v.id("_storage"),
  },
  handler: async (ctx, args) => {
    await getCurrentUser(ctx); // Ensure authenticated
    return await ctx.storage.getUrl(args.storageId);
  },
});

// Helper function to check if two users are friends
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

/**
 * Toggle translation for a conversation
 */
export const setTranslationEnabled = mutation({
  args: {
    friendId: v.id("users"),
    enabled: v.boolean(),
  },
  handler: async (ctx, args) => {
    const currentUser = await getCurrentUser(ctx);

    // Check if settings exist
    const existingSettings = await ctx.db
      .query("conversationSettings")
      .withIndex("by_user_friend", (q) =>
        q.eq("userId", currentUser._id).eq("friendId", args.friendId)
      )
      .first();

    if (existingSettings) {
      // Update existing settings
      await ctx.db.patch(existingSettings._id, {
        translationEnabled: args.enabled,
      });
    } else {
      // Create new settings
      await ctx.db.insert("conversationSettings", {
        userId: currentUser._id,
        friendId: args.friendId,
        translationEnabled: args.enabled,
      });
    }

    return { success: true };
  },
});
