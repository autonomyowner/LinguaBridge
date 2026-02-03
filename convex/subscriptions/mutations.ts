import { mutation, internalMutation } from "../_generated/server";
import { v } from "convex/values";
import { getCurrentUser } from "../lib/utils";

/**
 * Upgrade user subscription (manual/admin)
 */
export const upgradeTier = mutation({
  args: {
    tier: v.union(v.literal("pro"), v.literal("enterprise")),
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);

    // Update user's subscription tier
    await ctx.db.patch(user._id, {
      subscriptionTier: args.tier,
      updatedAt: Date.now(),
    });

    return { success: true, tier: args.tier };
  },
});

/**
 * Downgrade user to free tier
 */
export const downgradeToFree = mutation({
  args: {},
  handler: async (ctx) => {
    const user = await getCurrentUser(ctx);

    await ctx.db.patch(user._id, {
      subscriptionTier: "free",
      updatedAt: Date.now(),
    });

    return { success: true };
  },
});

/**
 * Admin: Set user tier (internal)
 */
export const setUserTier = internalMutation({
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
