import { query, QueryCtx } from "../_generated/server";
import { v } from "convex/values";
import { getCurrentUserOrNull, getCurrentUser } from "../lib/utils";
import { Id } from "../_generated/dataModel";

/**
 * Get current user with email fallback when Convex auth token isn't synced
 */
async function getUserWithFallback(ctx: QueryCtx, email?: string) {
  const user = await getCurrentUserOrNull(ctx);
  if (user) return user;

  if (email) {
    return await ctx.db
      .query("users")
      .withIndex("by_email", (q) => q.eq("email", email))
      .first();
  }

  return null;
}

/**
 * List all conversations with last message preview
 * Also includes friends without messages (new friends)
 */
export const listConversations = query({
  args: {
    userEmail: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const user = await getUserWithFallback(ctx, args.userEmail);
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
    const conversationsWithMessages = await Promise.all(
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

    // Also get friends without messages (new friends)
    const friendshipsAsRequester = await ctx.db
      .query("friendships")
      .withIndex("by_requester", (q) => q.eq("requesterId", user._id))
      .filter((q) => q.eq(q.field("status"), "accepted"))
      .collect();

    const friendshipsAsAddressee = await ctx.db
      .query("friendships")
      .withIndex("by_addressee", (q) => q.eq("addresseeId", user._id))
      .filter((q) => q.eq(q.field("status"), "accepted"))
      .collect();

    const friendIds = [
      ...friendshipsAsRequester.map((f) => f.addresseeId),
      ...friendshipsAsAddressee.map((f) => f.requesterId),
    ];

    // Add friends without messages to the list
    const existingPartnerIds = new Set(conversationMap.keys());
    const friendsWithoutMessages = await Promise.all(
      friendIds
        .filter((id) => !existingPartnerIds.has(id.toString()))
        .map(async (friendId) => {
          const friend = await ctx.db.get(friendId);
          if (!friend) return null;

          return {
            partnerId: friendId,
            partnerName: friend.name || "Anonymous",
            partnerEmail: friend.email,
            partnerImageUrl: friend.imageUrl,
            lastMessage: null,
            unreadCount: 0,
          };
        })
    );

    const allConversations = [
      ...conversationsWithMessages.filter((c): c is NonNullable<typeof c> => c !== null),
      ...friendsWithoutMessages.filter((c): c is NonNullable<typeof c> => c !== null),
    ];

    return allConversations;
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
    userEmail: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const user = await getUserWithFallback(ctx, args.userEmail);
    if (!user) return { messages: [], friend: null, nextCursor: null };

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

    // Add isFromMe flag and pick correct content for each user
    const messages = allMessages.map((msg) => {
      const isFromMe = msg.senderId === user._id;
      return {
        ...msg,
        isFromMe,
        // Receiver sees translatedContent if available, sender always sees original
        content: !isFromMe && msg.translatedContent ? msg.translatedContent : msg.content,
      };
    });

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
  args: {
    userEmail: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const user = await getUserWithFallback(ctx, args.userEmail);
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
  args: {
    storageId: v.id("_storage"),
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUserOrNull(ctx);
    if (!user) return null;

    return await ctx.storage.getUrl(args.storageId);
  },
});

/**
 * Get conversation settings (translation enabled, etc.)
 */
export const getConversationSettings = query({
  args: {
    friendId: v.id("users"),
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUserOrNull(ctx);
    if (!user) return { translationEnabled: false };

    const settings = await ctx.db
      .query("conversationSettings")
      .withIndex("by_user_friend", (q) =>
        q.eq("userId", user._id).eq("friendId", args.friendId)
      )
      .first();

    return {
      translationEnabled: settings?.translationEnabled ?? false,
    };
  },
});

/**
 * Get recipient's preferred chat language
 */
export const getRecipientLanguage = query({
  args: {
    friendId: v.id("users"),
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUserOrNull(ctx);
    if (!user) return null;

    // Get the friend's settings
    const friendSettings = await ctx.db
      .query("userSettings")
      .withIndex("by_user", (q) => q.eq("userId", args.friendId))
      .first();

    return friendSettings?.preferredChatLanguage || null;
  },
});
