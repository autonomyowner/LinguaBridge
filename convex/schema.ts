import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

// TRAVoices Database Schema
// Real-time AI voice translation SaaS
// Pricing: Free ($0) | Pro ($19/mo) | Enterprise ($99/mo)

export default defineSchema({
  // Auth tables removed - authentication disabled

  // ============================================
  // USERS TABLE
  // Extended user profile beyond auth
  // ============================================
  users: defineTable({
    // Auth reference (optional - set after first auth)
    tokenIdentifier: v.optional(v.string()), // Links to auth identity
    email: v.string(),

    // Profile
    name: v.optional(v.string()),
    imageUrl: v.optional(v.string()),

    // Social features
    spokenLanguages: v.optional(v.array(v.string())), // Languages user speaks
    isDiscoverable: v.optional(v.boolean()), // Show in user directory (default true)

    // Subscription (default to free)
    subscriptionTier: v.optional(v.union(
      v.literal("free"),
      v.literal("pro"),
      v.literal("enterprise")
    )),

    // Usage tracking (optional - initialized on first use)
    minutesUsedThisMonth: v.optional(v.number()),
    minutesResetAt: v.optional(v.number()), // Timestamp for monthly reset

    // Status (optional - defaults assumed)
    isActive: v.optional(v.boolean()),
    createdAt: v.optional(v.number()),
    updatedAt: v.optional(v.number()),
  })
    .index("by_token", ["tokenIdentifier"])
    .index("by_email", ["email"])
    .index("by_discoverable", ["isDiscoverable", "isActive"]),

  // ============================================
  // ROOMS TABLE
  // Translation rooms created by users
  // ============================================
  rooms: defineTable({
    // Basic info
    name: v.string(),
    description: v.optional(v.string()),

    // Creator/owner (optional for guest-created rooms)
    creatorId: v.optional(v.id("users")),

    // Room settings
    isPublic: v.boolean(),
    maxParticipants: v.number(),
    defaultSourceLanguage: v.string(), // e.g., "en"
    defaultTargetLanguage: v.string(), // e.g., "es"

    // Access control
    accessCode: v.optional(v.string()), // For private rooms

    // LiveKit integration
    livekitRoomName: v.string(), // Unique room identifier for LiveKit

    // Status
    isActive: v.boolean(),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_creator", ["creatorId"])
    .index("by_name", ["name"])
    .index("by_livekit_room", ["livekitRoomName"])
    .index("by_public", ["isPublic", "isActive"]),

  // ============================================
  // PARTICIPANTS TABLE
  // Users who are members of rooms
  // ============================================
  participants: defineTable({
    roomId: v.id("rooms"),
    userId: v.id("users"),

    // Role in room
    role: v.union(
      v.literal("owner"),
      v.literal("admin"),
      v.literal("member"),
      v.literal("viewer")
    ),

    // Participant settings
    preferredLanguage: v.string(),
    isMuted: v.boolean(),

    // Status
    isOnline: v.boolean(),
    joinedAt: v.number(),
    lastSeenAt: v.number(),
  })
    .index("by_room", ["roomId"])
    .index("by_user", ["userId"])
    .index("by_room_user", ["roomId", "userId"]),

  // ============================================
  // SESSIONS TABLE
  // Active translation sessions within rooms
  // ============================================
  sessions: defineTable({
    roomId: v.id("rooms"),

    // Session host (optional for guest sessions)
    hostUserId: v.optional(v.id("users")),

    // Timing
    startedAt: v.number(),
    endedAt: v.optional(v.number()),
    durationMinutes: v.optional(v.number()),

    // Participant count at session
    participantCount: v.number(),

    // Status
    status: v.union(
      v.literal("active"),
      v.literal("paused"),
      v.literal("ended")
    ),

    // Metadata
    recordingEnabled: v.boolean(),
  })
    .index("by_room", ["roomId"])
    .index("by_host", ["hostUserId"])
    .index("by_status", ["status"])
    .index("by_room_active", ["roomId", "status"]),

  // ============================================
  // TRANSCRIPTS TABLE
  // Translation message history
  // ============================================
  transcripts: defineTable({
    sessionId: v.id("sessions"),
    roomId: v.id("rooms"),

    // Speaker info
    speakerId: v.optional(v.id("users")), // null for system messages
    speakerName: v.string(),

    // Content
    originalText: v.string(),
    translatedText: v.optional(v.string()),
    sourceLanguage: v.string(),
    targetLanguage: v.optional(v.string()),

    // Type
    messageType: v.union(
      v.literal("speech"),
      v.literal("translation"),
      v.literal("system")
    ),

    // Timing
    timestamp: v.number(),

    // Audio reference (if stored)
    audioUrl: v.optional(v.string()),
  })
    .index("by_session", ["sessionId"])
    .index("by_room", ["roomId"])
    .index("by_speaker", ["speakerId"])
    .index("by_timestamp", ["sessionId", "timestamp"]),

  // ============================================
  // API_KEYS TABLE
  // Developer API keys (Enterprise feature)
  // ============================================
  apiKeys: defineTable({
    userId: v.id("users"),

    // Key info
    name: v.string(),
    keyHash: v.string(), // Hashed API key (never store plain)
    keyPrefix: v.string(), // First 8 chars for identification

    // Permissions
    permissions: v.array(v.string()), // ["rooms:read", "rooms:write", etc.]

    // Rate limits
    rateLimit: v.number(), // Requests per minute

    // Status
    isActive: v.boolean(),
    lastUsedAt: v.optional(v.number()),
    expiresAt: v.optional(v.number()),

    // Timestamps
    createdAt: v.number(),
  })
    .index("by_user", ["userId"])
    .index("by_key_prefix", ["keyPrefix"])
    .index("by_key_hash", ["keyHash"]),

  // ============================================
  // ANALYTICS TABLE
  // Usage tracking for billing and insights
  // ============================================
  analytics: defineTable({
    userId: v.id("users"),

    // Date (YYYY-MM-DD format)
    date: v.string(),

    // Usage metrics
    minutesUsed: v.number(),
    sessionsStarted: v.number(),
    messagesTranslated: v.number(),
    roomsCreated: v.number(),

    // Language stats
    languagesUsed: v.array(v.string()),

    // Timestamp
    updatedAt: v.number(),
  })
    .index("by_user", ["userId"])
    .index("by_date", ["date"])
    .index("by_user_date", ["userId", "date"]),

  // ============================================
  // USER_SETTINGS TABLE
  // User preferences
  // ============================================
  userSettings: defineTable({
    userId: v.id("users"),

    // Language preferences
    preferredSourceLanguage: v.string(),
    preferredTargetLanguage: v.string(),
    preferredChatLanguage: v.optional(v.string()), // "en" | "ar" for chat translation

    // Audio settings
    autoPlayTranslations: v.boolean(),
    voiceSpeed: v.number(), // 0.5 - 2.0
    voiceGender: v.union(v.literal("male"), v.literal("female"), v.literal("neutral")),

    // UI preferences
    theme: v.union(v.literal("light"), v.literal("dark"), v.literal("system")),
    fontSize: v.union(v.literal("small"), v.literal("medium"), v.literal("large")),
    showTimestamps: v.boolean(),

    // Notification preferences
    emailNotifications: v.boolean(),
    sessionReminders: v.boolean(),

    // Timestamps
    updatedAt: v.number(),
  })
    .index("by_user", ["userId"]),

  // ============================================
  // FRIENDSHIPS TABLE
  // Two-way friend relationships with request workflow
  // ============================================
  friendships: defineTable({
    requesterId: v.id("users"),
    addresseeId: v.id("users"),
    status: v.union(
      v.literal("pending"),
      v.literal("accepted"),
      v.literal("rejected")
    ),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_requester", ["requesterId"])
    .index("by_addressee", ["addresseeId"])
    .index("by_pair", ["requesterId", "addresseeId"])
    .index("by_status", ["status"]),

  // ============================================
  // MESSAGES TABLE
  // Direct messages between friends (text + voice)
  // ============================================
  messages: defineTable({
    senderId: v.id("users"),
    receiverId: v.id("users"),
    type: v.union(v.literal("text"), v.literal("voice")),
    content: v.string(), // Text content or storage ID for voice
    translatedContent: v.optional(v.string()), // Auto-translated version for receiver
    duration: v.optional(v.number()), // Duration in seconds for voice messages
    isRead: v.boolean(),
    createdAt: v.number(),
  })
    .index("by_conversation", ["senderId", "receiverId"])
    .index("by_receiver_unread", ["receiverId", "isRead"])
    .index("by_sender", ["senderId"])
    .index("by_receiver", ["receiverId"]),

  // ============================================
  // ROOM INVITATIONS TABLE
  // Direct and link-based room invites
  // ============================================
  roomInvitations: defineTable({
    inviterId: v.id("users"),
    inviteeId: v.optional(v.id("users")), // null for link-based invites
    roomId: v.id("rooms"),
    inviteCode: v.string(), // Unique code for shareable links
    status: v.union(
      v.literal("pending"),
      v.literal("accepted"),
      v.literal("expired")
    ),
    expiresAt: v.number(),
    createdAt: v.number(),
  })
    .index("by_invitee", ["inviteeId", "status"])
    .index("by_code", ["inviteCode"])
    .index("by_room", ["roomId"])
    .index("by_inviter", ["inviterId"]),

  // ============================================
  // NOTIFICATIONS TABLE
  // In-app notifications for social events
  // ============================================
  notifications: defineTable({
    userId: v.id("users"),
    type: v.union(
      v.literal("friend_request"),
      v.literal("friend_accepted"),
      v.literal("message"),
      v.literal("room_invite")
    ),
    referenceId: v.string(), // ID of the related entity (friendshipId, messageId, invitationId)
    title: v.optional(v.string()), // Optional notification title
    body: v.optional(v.string()), // Optional notification body
    isRead: v.boolean(),
    createdAt: v.number(),
  })
    .index("by_user_unread", ["userId", "isRead"])
    .index("by_user_all", ["userId", "createdAt"]),

  // ============================================
  // EMAIL LEADS TABLE
  // Waitlist signups from launch countdown
  // ============================================
  emailLeads: defineTable({
    email: v.string(),
    source: v.optional(v.string()), // e.g., "homepage", "pricing", etc.
    createdAt: v.number(),
  })
    .index("by_email", ["email"])
    .index("by_created", ["createdAt"]),

  // ============================================
  // CONVERSATION SETTINGS TABLE
  // Per-conversation settings (translation toggle, etc.)
  // ============================================
  conversationSettings: defineTable({
    userId: v.id("users"),
    friendId: v.id("users"),
    translationEnabled: v.boolean(),
  })
    .index("by_user_friend", ["userId", "friendId"]),
});

// ============================================
// SUBSCRIPTION TIER LIMITS
// ============================================
export const TIER_LIMITS = {
  free: {
    minutesPerMonth: 60,
    maxParticipants: 2,
    maxRooms: 3,
    apiAccess: false,
    prioritySupport: false,
    customBranding: false,
  },
  pro: {
    minutesPerMonth: 600,
    maxParticipants: 10,
    maxRooms: 20,
    apiAccess: false,
    prioritySupport: true,
    customBranding: false,
  },
  enterprise: {
    minutesPerMonth: Infinity,
    maxParticipants: 50,
    maxRooms: Infinity,
    apiAccess: true,
    prioritySupport: true,
    customBranding: true,
  },
} as const;

export type SubscriptionTier = keyof typeof TIER_LIMITS;
