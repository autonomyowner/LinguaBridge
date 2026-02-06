import { query } from "../_generated/server";
import { v } from "convex/values";
import { getCurrentUserOrNull } from "../lib/utils";
import { Id } from "../_generated/dataModel";

/**
 * List all conversations with last message preview
 * Returns friends with recent message activity
 */
export const listConversations = query({
  args: {},
  handler: async (ctx) => {
    const user = await getCurrentUserOrNull(ctx);
    if (!user) return [];

    // Get all messages involving the current user
    const sentMessages = await ctx.db
      .query("messages")
      .withIndex("by_sender", (q) => q.eq("senderId", user._id))
      .collect();

    const receivedMessages = await ctx.db
      .query("messages")
      .withIndex("by_receiver", (q) => q.eq("receiverId", user._id))
      .collect();

    // Combine and group by conversation partner
    const conversationMap = new Map<
      string,
      {
        partnerId: Id<"users">;
        lastMessage: {
          content: string;
          type: "text" | "voice";
          createdAt: number;
          isFromMe: boolean;
        };
        unreadCount: number;
      }
    >();

    // Process sent messages
    for (const msg of sentMessages) {
      const partnerId = msg.receiverId.toString();
      const existing = conversationMap.get(partnerId);

      if (!existing || msg.createdAt > existing.lastMessage.createdAt) {
        conversationMap.set(partnerId, {
          partnerId: msg.receiverId,
          lastMessage: {
            content: msg.type === "voice" ? "Voice message" : msg.content,
            type: msg.type,
            createdAt: msg.createdAt,
            isFromMe: true,
          },
          unreadCount: existing?.unreadCount || 0,
        });
      }
    }

    // Process received messages
    for (const msg of receivedMessages) {
      const partnerId = msg.senderId.toString();
      const existing = conversationMap.get(partnerId);
      const unreadCount = (existing?.unreadCount || 0) + (msg.isRead ? 0 : 1);

      if (!existing || msg.createdAt > existing.lastMessage.createdAt) {
        conversationMap.set(partnerId, {
          partnerId: msg.senderId,
          lastMessage: {
            content: msg.type === "voice" ? "Voice message" : msg.content,
            type: msg.type,
            createdAt: msg.createdAt,
            isFromMe: false,
          },
          unreadCount,
        });
      } else if (existing) {
        existing.unreadCount = unreadCount;
      }
    }

    // Convert to array and fetch partner details
    const conversations = await Promise.all(
      Array.from(conversationMap.values())
        .sort((a, b) => b.lastMessage.createdAt - a.lastMessage.createdAt)
        .map(async (conv) => {
          const partner = await ctx.db.get(conv.partnerId);
          if (!partner) return null;

          return {
            partnerId: conv.partnerId,
            partnerName: partner.name || "Anonymous",
            partnerEmail: partner.email,
            partnerImageUrl: partner.imageUrl,
            lastMessage: conv.lastMessage,
            unreadCount: conv.unreadCount,
          };
        })
    );

    return conversations.filter((c): c is NonNullable<typeof c> => c !== null);
  },
});

/**
 * Get messages in a conversation with a specific user
 */
export const getConversation = query({
  args: {
    friendId: v.id("users"),
    cursor: v.optional(v.number()),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUserOrNull(ctx);
    if (!user) return { messages: [], nextCursor: null };

    const limit = args.limit ?? 50;

    // Get messages sent by me to friend
    const sentMessages = await ctx.db
      .query("messages")
      .withIndex("by_conversation", (q) =>
        q.eq("senderId", user._id).eq("receiverId", args.friendId)
      )
      .collect();

    // Get messages sent by friend to me
    const receivedMessages = await ctx.db
      .query("messages")
      .withIndex("by_conversation", (q) =>
        q.eq("senderId", args.friendId).eq("receiverId", user._id)
      )
      .collect();

    // Combine and sort by createdAt
    const allMessages = [...sentMessages, ...receivedMessages]
      .sort((a, b) => a.createdAt - b.createdAt)
      .slice(-limit);

    // Add isFromMe flag
    const messages = allMessages.map((msg) => ({
      ...msg,
      isFromMe: msg.senderId === user._id,
    }));

    // Get friend details
    const friend = await ctx.db.get(args.friendId);

    return {
      messages,
      friend: friend
        ? {
            _id: friend._id,
            name: friend.name || "Anonymous",
            email: friend.email,
            imageUrl: friend.imageUrl,
          }
        : null,
      nextCursor: null, // Simplified pagination
    };
  },
});

/**
 * Get total unread message count
 */
export const getUnreadCount = query({
  args: {},
  handler: async (ctx) => {
    const user = await getCurrentUserOrNull(ctx);
    if (!user) return 0;

    const unreadMessages = await ctx.db
      .query("messages")
      .withIndex("by_receiver_unread", (q) =>
        q.eq("receiverId", user._id).eq("isRead", false)
      )
      .collect();

    return unreadMessages.length;
  },
});

/**
 * Get unread count for a specific conversation
 */
export const getConversationUnreadCount = query({
  args: { friendId: v.id("users") },
  handler: async (ctx, args) => {
    const user = await getCurrentUserOrNull(ctx);
    if (!user) return 0;

    const unreadMessages = await ctx.db
      .query("messages")
      .withIndex("by_conversation", (q) =>
        q.eq("senderId", args.friendId).eq("receiverId", user._id)
      )
      .filter((q) => q.eq(q.field("isRead"), false))
      .collect();

    return unreadMessages.length;
  },
});

/**
 * Get URL for a voice message from storage
 */
export const getVoiceUrl = query({
  args: { storageId: v.id("_storage") },
  handler: async (ctx, args) => {
    const user = await getCurrentUserOrNull(ctx);
    if (!user) return null;

    return await ctx.storage.getUrl(args.storageId);
  },
});
