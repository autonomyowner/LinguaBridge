import { query } from "../_generated/server";
import { v } from "convex/values";
import { getCurrentUserOrNull, getUserById } from "../lib/utils";

/**
 * Get the currently authenticated user
 */
export const getCurrent = query({
  args: {},
  handler: async (ctx) => {
    return await getCurrentUserOrNull(ctx);
  },
});

/**
 * Get the current user (throws if not authenticated)
 * Note: Returns null instead of throwing for public access
 */
export const getCurrentOrThrow = query({
  args: {},
  handler: async (ctx) => {
    return await getCurrentUserOrNull(ctx);
  },
});

/**
 * Get a user by their ID
 */
export const getById = query({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    return await getUserById(ctx, args.userId);
  },
});

/**
 * Get user's subscription details
 */
export const getSubscriptionDetails = query({
  args: {},
  handler: async (ctx) => {
    const user = await getCurrentUserOrNull(ctx);

    return {
      tier: user?.subscriptionTier ?? "free",
      minutesUsed: user?.minutesUsedThisMonth ?? 0,
      minutesResetAt: user?.minutesResetAt ?? null,
    };
  },
});

/**
 * Get user's settings
 */
export const getSettings = query({
  args: {},
  handler: async (ctx) => {
    const user = await getCurrentUserOrNull(ctx);

    // Return default settings if not authenticated
    const defaultSettings = {
      preferredSourceLanguage: "en",
      preferredTargetLanguage: "ar",
      autoPlayTranslations: true,
      voiceSpeed: 1.0,
      voiceGender: "neutral" as const,
      theme: "system" as const,
      fontSize: "medium" as const,
      showTimestamps: true,
      emailNotifications: true,
      sessionReminders: true,
    };

    if (!user) {
      return defaultSettings;
    }

    const settings = await ctx.db
      .query("userSettings")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .unique();

    if (!settings) {
      return defaultSettings;
    }

    return settings;
  },
});

/**
 * Get user's usage analytics for the current month
 * Returns default stats if not authenticated
 */
export const getUsageStats = query({
  args: {},
  handler: async (ctx) => {
    const user = await getCurrentUserOrNull(ctx);
    if (!user) {
      return {
        minutesUsed: 0,
        sessionsCount: 0,
        messagesTranslated: 0,
        roomsCreated: 0,
        languagesUsed: [],
      };
    }

    // Get this month's date range
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const monthStartDate = monthStart.toISOString().split("T")[0];

    // Get analytics for this month
    const analytics = await ctx.db
      .query("analytics")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .filter((q) => q.gte(q.field("date"), monthStartDate))
      .collect();

    // Aggregate stats
    const stats = {
      minutesUsed: user.minutesUsedThisMonth,
      sessionsCount: 0,
      messagesTranslated: 0,
      roomsCreated: 0,
      languagesUsed: new Set<string>(),
    };

    for (const day of analytics) {
      stats.sessionsCount += day.sessionsStarted;
      stats.messagesTranslated += day.messagesTranslated;
      stats.roomsCreated += day.roomsCreated;
      day.languagesUsed.forEach((lang) => stats.languagesUsed.add(lang));
    }

    return {
      ...stats,
      languagesUsed: Array.from(stats.languagesUsed),
    };
  },
});

/**
 * Get user's rooms (created and participating)
 */
export const getRooms = query({
  args: {},
  handler: async (ctx) => {
    const user = await getCurrentUserOrNull(ctx);
    if (!user) {
      return [];
    }

    // Get rooms created by user
    const createdRooms = await ctx.db
      .query("rooms")
      .withIndex("by_creator", (q) => q.eq("creatorId", user._id))
      .filter((q) => q.eq(q.field("isActive"), true))
      .collect();

    // Get rooms user is participating in
    const participations = await ctx.db
      .query("participants")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .collect();

    const participatingRoomIds = participations.map((p) => p.roomId);
    const participatingRooms = await Promise.all(
      participatingRoomIds.map((id) => ctx.db.get(id))
    );

    // Merge and dedupe
    const allRooms = new Map();
    for (const room of createdRooms) {
      allRooms.set(room._id, { ...room, role: "owner" });
    }
    for (let i = 0; i < participatingRooms.length; i++) {
      const room = participatingRooms[i];
      if (room && !allRooms.has(room._id)) {
        allRooms.set(room._id, { ...room, role: participations[i].role });
      }
    }

    return Array.from(allRooms.values());
  },
});

/**
 * Get user's API keys (Enterprise only)
 */
export const getApiKeys = query({
  args: {},
  handler: async (ctx) => {
    const user = await getCurrentUserOrNull(ctx);

    if (!user || user.subscriptionTier !== "enterprise") {
      return [];
    }

    const apiKeys = await ctx.db
      .query("apiKeys")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .collect();

    // Don't return the actual key hash, just metadata
    return apiKeys.map((key) => ({
      _id: key._id,
      name: key.name,
      keyPrefix: key.keyPrefix,
      permissions: key.permissions,
      rateLimit: key.rateLimit,
      isActive: key.isActive,
      lastUsedAt: key.lastUsedAt,
      expiresAt: key.expiresAt,
      createdAt: key.createdAt,
    }));
  },
});
