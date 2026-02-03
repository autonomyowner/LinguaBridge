import { query } from "../_generated/server";
import { v } from "convex/values";
import { getCurrentUserOrNull } from "../lib/utils";
import { TIER_LIMITS } from "../schema";

/**
 * Get current user's subscription
 * Returns default free tier if not authenticated
 */
export const getCurrent = query({
  args: {},
  handler: async (ctx) => {
    const user = await getCurrentUserOrNull(ctx);

    const userTier = user?.subscriptionTier ?? "free";
    const minutesUsed = user?.minutesUsedThisMonth ?? 0;
    const limits = TIER_LIMITS[userTier];

    return {
      tier: userTier,
      limits,
      usage: {
        minutesUsed,
        minutesRemaining: Math.max(0, limits.minutesPerMonth - minutesUsed),
        percentUsed:
          limits.minutesPerMonth === Infinity
            ? 0
            : Math.round((minutesUsed / limits.minutesPerMonth) * 100),
      },
    };
  },
});

/**
 * Get pricing tiers
 */
export const getPricingTiers = query({
  args: {},
  handler: async () => {
    return {
      free: {
        name: "Free",
        price: 0,
        ...TIER_LIMITS.free,
        features: [
          `${TIER_LIMITS.free.minutesPerMonth} minutes/month`,
          `Up to ${TIER_LIMITS.free.maxParticipants} participants`,
          `${TIER_LIMITS.free.maxRooms} active rooms`,
          "Real-time translation",
          "12 languages",
        ],
      },
      pro: {
        name: "Pro",
        price: 19,
        ...TIER_LIMITS.pro,
        features: [
          `${TIER_LIMITS.pro.minutesPerMonth} minutes/month`,
          `Up to ${TIER_LIMITS.pro.maxParticipants} participants`,
          `${TIER_LIMITS.pro.maxRooms} active rooms`,
          "Everything in Free",
          "Priority support",
          "Session recordings",
          "Transcript exports",
          "Custom voice settings",
        ],
      },
      enterprise: {
        name: "Enterprise",
        price: 99,
        ...TIER_LIMITS.enterprise,
        features: [
          "Unlimited minutes",
          `Up to ${TIER_LIMITS.enterprise.maxParticipants} participants`,
          "Unlimited rooms",
          "Everything in Pro",
          "API access",
          "Custom branding",
          "Dedicated support",
          "SSO integration",
        ],
      },
    };
  },
});

/**
 * Check if user can upgrade
 */
export const canUpgrade = query({
  args: {
    targetTier: v.union(v.literal("pro"), v.literal("enterprise")),
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUserOrNull(ctx);
    const userTier = user?.subscriptionTier ?? "free";

    if (userTier === "enterprise") {
      return { canUpgrade: false, reason: "Already on highest tier" };
    }

    if (userTier === "pro" && args.targetTier === "pro") {
      return { canUpgrade: false, reason: "Already on Pro tier" };
    }

    return { canUpgrade: true };
  },
});
