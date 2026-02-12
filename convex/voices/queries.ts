import { query } from "../_generated/server";
import { getCurrentUserOrNull } from "../lib/utils";

/**
 * Get the current user's voice clone (if any)
 */
export const getMyVoiceClone = query({
  args: {},
  handler: async (ctx) => {
    const user = await getCurrentUserOrNull(ctx);
    if (!user) return null;

    const clone = await ctx.db
      .query("voiceClones")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .first();

    return clone;
  },
});
