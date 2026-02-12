import { mutation } from "../_generated/server";
import { v } from "convex/values";
import { getCurrentUser, getCurrentUserOrNull } from "../lib/utils";

/**
 * Save a voice clone record after successful Cartesia API cloning
 */
export const saveVoiceClone = mutation({
  args: {
    cartesiaVoiceId: v.string(),
    language: v.string(),
    userEmail: v.optional(v.string()), // Fallback for cross-origin auth
  },
  handler: async (ctx, args) => {
    // Try auth token first, then email fallback
    let user = await getCurrentUserOrNull(ctx);
    if (!user && args.userEmail) {
      const email = args.userEmail;
      const found = await ctx.db
        .query("users")
        .withIndex("by_email", (q) => q.eq("email", email))
        .first();
      if (found) user = found;
    }
    if (!user) {
      throw new Error("Not authenticated");
    }

    // Delete any existing voice clone for this user
    const existing = await ctx.db
      .query("voiceClones")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .first();

    if (existing) {
      await ctx.db.delete(existing._id);
    }

    // Insert new clone record
    const cloneId = await ctx.db.insert("voiceClones", {
      userId: user._id,
      cartesiaVoiceId: args.cartesiaVoiceId,
      name: "My Voice",
      language: args.language,
      createdAt: Date.now(),
    });

    // Update user's hasVoiceClone flag
    await ctx.db.patch(user._id, {
      hasVoiceClone: true,
      updatedAt: Date.now(),
    });

    return cloneId;
  },
});

/**
 * Delete the current user's voice clone
 */
export const deleteVoiceClone = mutation({
  args: {
    userEmail: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    let user = await getCurrentUserOrNull(ctx);
    if (!user && args.userEmail) {
      const email = args.userEmail;
      const found = await ctx.db
        .query("users")
        .withIndex("by_email", (q) => q.eq("email", email))
        .first();
      if (found) user = found;
    }
    if (!user) {
      throw new Error("Not authenticated");
    }

    const clone = await ctx.db
      .query("voiceClones")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .first();

    if (clone) {
      await ctx.db.delete(clone._id);
    }

    await ctx.db.patch(user._id, {
      hasVoiceClone: false,
      updatedAt: Date.now(),
    });

    return { success: true };
  },
});
