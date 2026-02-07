import { mutation, internalMutation } from "../_generated/server";
import { v } from "convex/values";
import { getCurrentUser, getMonthStart, generateApiKey, hashApiKey } from "../lib/utils";
import { getBetterAuthUser } from "../auth";

/**
 * Ensure the current authenticated user has an app user record
 * Called after sign-up to create the user profile in our users table
 */
export const ensureUser = mutation({
  args: {},
  handler: async (ctx) => {
    // Get the authenticated user from better-auth
    const authUser = await getBetterAuthUser(ctx);
    if (!authUser || !authUser.email) {
      throw new Error("Not authenticated");
    }

    // Check if user already exists by email
    const existingUser = await ctx.db
      .query("users")
      .withIndex("by_email", (q) => q.eq("email", authUser.email))
      .first();

    if (existingUser) {
      return existingUser._id;
    }

    // Create new user
    const now = Date.now();
    const userId = await ctx.db.insert("users", {
      email: authUser.email,
      name: authUser.name || undefined,
      subscriptionTier: "free",
      minutesUsedThisMonth: 0,
      minutesResetAt: getMonthStart(),
      isActive: true,
      createdAt: now,
      updatedAt: now,
    });

    // Create default settings
    await ctx.db.insert("userSettings", {
      userId,
      preferredSourceLanguage: "en",
      preferredTargetLanguage: "es",
      autoPlayTranslations: true,
      voiceSpeed: 1.0,
      voiceGender: "neutral",
      theme: "system",
      fontSize: "medium",
      showTimestamps: true,
      emailNotifications: true,
      sessionReminders: true,
      updatedAt: now,
    });

    return userId;
  },
});

/**
 * Create or update user on sign-in
 * Called automatically by auth flow
 */
export const createOrUpdate = internalMutation({
  args: {
    tokenIdentifier: v.string(),
    email: v.string(),
    name: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    // Check if user already exists
    const existingUser = await ctx.db
      .query("users")
      .withIndex("by_token", (q) => q.eq("tokenIdentifier", args.tokenIdentifier))
      .unique();

    const now = Date.now();

    if (existingUser) {
      // Update existing user
      await ctx.db.patch(existingUser._id, {
        email: args.email,
        name: args.name ?? existingUser.name,
        updatedAt: now,
      });
      return existingUser._id;
    }

    // Create new user
    const userId = await ctx.db.insert("users", {
      tokenIdentifier: args.tokenIdentifier,
      email: args.email,
      name: args.name,
      subscriptionTier: "free",
      minutesUsedThisMonth: 0,
      minutesResetAt: getMonthStart(),
      isActive: true,
      createdAt: now,
      updatedAt: now,
    });

    // Create default settings
    await ctx.db.insert("userSettings", {
      userId,
      preferredSourceLanguage: "en",
      preferredTargetLanguage: "es",
      autoPlayTranslations: true,
      voiceSpeed: 1.0,
      voiceGender: "neutral",
      theme: "system",
      fontSize: "medium",
      showTimestamps: true,
      emailNotifications: true,
      sessionReminders: true,
      updatedAt: now,
    });

    return userId;
  },
});

/**
 * Update user profile
 */
export const updateProfile = mutation({
  args: {
    name: v.optional(v.string()),
    imageUrl: v.optional(v.string()),
    userEmail: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const { userEmail, ...profileArgs } = args;
    const user = await getCurrentUser(ctx, userEmail);

    await ctx.db.patch(user._id, {
      ...profileArgs,
      updatedAt: Date.now(),
    });

    return { success: true };
  },
});

/**
 * Update user social settings (spoken languages, discoverability)
 */
export const updateSocialSettings = mutation({
  args: {
    spokenLanguages: v.optional(v.array(v.string())),
    isDiscoverable: v.optional(v.boolean()),
    userEmail: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx, args.userEmail);

    const updates: Record<string, any> = { updatedAt: Date.now() };

    if (args.spokenLanguages !== undefined) {
      updates.spokenLanguages = args.spokenLanguages;
    }
    if (args.isDiscoverable !== undefined) {
      updates.isDiscoverable = args.isDiscoverable;
    }

    await ctx.db.patch(user._id, updates);

    return { success: true };
  },
});

/**
 * Update user settings
 */
export const updateSettings = mutation({
  args: {
    preferredSourceLanguage: v.optional(v.string()),
    preferredTargetLanguage: v.optional(v.string()),
    autoPlayTranslations: v.optional(v.boolean()),
    voiceSpeed: v.optional(v.number()),
    voiceGender: v.optional(v.union(v.literal("male"), v.literal("female"), v.literal("neutral"))),
    theme: v.optional(v.union(v.literal("light"), v.literal("dark"), v.literal("system"))),
    fontSize: v.optional(v.union(v.literal("small"), v.literal("medium"), v.literal("large"))),
    showTimestamps: v.optional(v.boolean()),
    emailNotifications: v.optional(v.boolean()),
    sessionReminders: v.optional(v.boolean()),
    userEmail: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const { userEmail, ...settingsArgs } = args;
    const user = await getCurrentUser(ctx, userEmail);

    const settings = await ctx.db
      .query("userSettings")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .first();

    const now = Date.now();

    if (settings) {
      await ctx.db.patch(settings._id, {
        ...settingsArgs,
        updatedAt: now,
      });
    } else {
      await ctx.db.insert("userSettings", {
        userId: user._id,
        preferredSourceLanguage: settingsArgs.preferredSourceLanguage ?? "en",
        preferredTargetLanguage: settingsArgs.preferredTargetLanguage ?? "es",
        autoPlayTranslations: settingsArgs.autoPlayTranslations ?? true,
        voiceSpeed: settingsArgs.voiceSpeed ?? 1.0,
        voiceGender: settingsArgs.voiceGender ?? "neutral",
        theme: settingsArgs.theme ?? "system",
        fontSize: settingsArgs.fontSize ?? "medium",
        showTimestamps: settingsArgs.showTimestamps ?? true,
        emailNotifications: settingsArgs.emailNotifications ?? true,
        sessionReminders: settingsArgs.sessionReminders ?? true,
        updatedAt: now,
      });
    }

    return { success: true };
  },
});

/**
 * Create a new API key (Enterprise only)
 */
export const createApiKey = mutation({
  args: {
    name: v.string(),
    permissions: v.array(v.string()),
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);

    if (user.subscriptionTier !== "enterprise") {
      throw new Error("API keys are only available for Enterprise users");
    }

    // Generate a new API key
    const { key, prefix } = generateApiKey();
    const keyHash = await hashApiKey(key);

    await ctx.db.insert("apiKeys", {
      userId: user._id,
      name: args.name,
      keyHash,
      keyPrefix: prefix,
      permissions: args.permissions,
      rateLimit: 60, // 60 requests per minute
      isActive: true,
      createdAt: Date.now(),
    });

    // Return the plain key (only shown once!)
    return { key };
  },
});

/**
 * Revoke an API key
 */
export const revokeApiKey = mutation({
  args: { keyId: v.id("apiKeys") },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);

    const apiKey = await ctx.db.get(args.keyId);
    if (!apiKey || apiKey.userId !== user._id) {
      throw new Error("API key not found");
    }

    await ctx.db.patch(args.keyId, { isActive: false });

    return { success: true };
  },
});

/**
 * Delete user account
 */
export const deleteAccount = mutation({
  args: {},
  handler: async (ctx) => {
    const user = await getCurrentUser(ctx);

    // Soft delete - mark as inactive
    await ctx.db.patch(user._id, {
      isActive: false,
      updatedAt: Date.now(),
    });

    // Deactivate all rooms
    const rooms = await ctx.db
      .query("rooms")
      .withIndex("by_creator", (q) => q.eq("creatorId", user._id))
      .collect();

    for (const room of rooms) {
      await ctx.db.patch(room._id, { isActive: false, updatedAt: Date.now() });
    }

    // Deactivate all API keys
    const apiKeys = await ctx.db
      .query("apiKeys")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .collect();

    for (const key of apiKeys) {
      await ctx.db.patch(key._id, { isActive: false });
    }

    return { success: true };
  },
});

/**
 * Update user's minutes used (internal)
 */
export const addMinutesUsed = internalMutation({
  args: {
    userId: v.id("users"),
    minutes: v.number(),
  },
  handler: async (ctx, args) => {
    const user = await ctx.db.get(args.userId);
    if (!user) return;

    const monthStart = getMonthStart();
    const currentMinutesReset = user.minutesResetAt ?? 0;
    const currentMinutesUsed = user.minutesUsedThisMonth ?? 0;

    // Reset if new month
    if (currentMinutesReset < monthStart) {
      await ctx.db.patch(args.userId, {
        minutesUsedThisMonth: args.minutes,
        minutesResetAt: monthStart,
        updatedAt: Date.now(),
      });
    } else {
      await ctx.db.patch(args.userId, {
        minutesUsedThisMonth: currentMinutesUsed + args.minutes,
        updatedAt: Date.now(),
      });
    }
  },
});

/**
 * Update subscription tier (internal - called by Stripe webhooks)
 */
export const updateSubscriptionTier = internalMutation({
  args: {
    userId: v.id("users"),
    tier: v.union(v.literal("free"), v.literal("pro"), v.literal("enterprise")),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.userId, {
      subscriptionTier: args.tier,
      updatedAt: Date.now(),
    });
  },
});

/**
 * Set preferred chat language for message translation
 */
export const setPreferredChatLanguage = mutation({
  args: {
    language: v.string(), // "en" or "ar"
    userEmail: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx, args.userEmail);

    // Validate language
    if (!["en", "ar"].includes(args.language)) {
      throw new Error("Invalid language. Must be 'en' or 'ar'");
    }

    const settings = await ctx.db
      .query("userSettings")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .first();

    const now = Date.now();

    if (settings) {
      await ctx.db.patch(settings._id, {
        preferredChatLanguage: args.language,
        updatedAt: now,
      });
    } else {
      // Create settings if they don't exist
      await ctx.db.insert("userSettings", {
        userId: user._id,
        preferredSourceLanguage: "en",
        preferredTargetLanguage: "ar",
        preferredChatLanguage: args.language,
        autoPlayTranslations: true,
        voiceSpeed: 1.0,
        voiceGender: "neutral",
        theme: "system",
        fontSize: "medium",
        showTimestamps: true,
        emailNotifications: true,
        sessionReminders: true,
        updatedAt: now,
      });
    }

    return { success: true };
  },
});
