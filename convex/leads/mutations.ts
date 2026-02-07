import { mutation } from "../_generated/server";
import { v } from "convex/values";

// Capture email lead from waitlist form
export const capture = mutation({
  args: {
    email: v.string(),
    source: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    // Check if email already exists
    const existing = await ctx.db
      .query("emailLeads")
      .withIndex("by_email", (q) => q.eq("email", args.email.toLowerCase()))
      .first();

    if (existing) {
      return { success: true, alreadyExists: true };
    }

    // Insert new lead
    const leadId = await ctx.db.insert("emailLeads", {
      email: args.email.toLowerCase(),
      source: args.source || "homepage",
      createdAt: Date.now(),
    });

    return { success: true, leadId, alreadyExists: false };
  },
});

// Delete a lead (admin function)
export const deleteLead = mutation({
  args: { email: v.string() },
  handler: async (ctx, args) => {
    const lead = await ctx.db
      .query("emailLeads")
      .withIndex("by_email", (q) => q.eq("email", args.email.toLowerCase()))
      .first();

    if (!lead) {
      return { success: false, message: "Lead not found" };
    }

    await ctx.db.delete(lead._id);
    return { success: true };
  },
});
