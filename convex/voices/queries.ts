import { query } from "../_generated/server";
import { v } from "convex/values";
import { getCurrentUserOrNull } from "../lib/utils";

/**
 * Get the current user's voice clone (if any)
 * Accepts optional userEmail for cross-origin auth fallback
 */
export const getMyVoiceClone = query({
  args: {
    userEmail: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUserOrNull(ctx, args.userEmail);
    if (!user) return null;

    const clone = await ctx.db
      .query("voiceClones")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .first();

    return clone;
  },
});
