import { query } from "../_generated/server";

// Get all email leads (for admin dashboard)
export const getAll = query({
  args: {},
  handler: async (ctx) => {
    const leads = await ctx.db
      .query("emailLeads")
      .withIndex("by_created")
      .order("desc")
      .collect();

    return leads;
  },
});

// Get lead count
export const getCount = query({
  args: {},
  handler: async (ctx) => {
    const leads = await ctx.db.query("emailLeads").collect();
    return leads.length;
  },
});

// Get leads by source
export const getBySource = query({
  args: {},
  handler: async (ctx) => {
    const leads = await ctx.db.query("emailLeads").collect();

    const bySource: Record<string, number> = {};
    for (const lead of leads) {
      const source = lead.source || "homepage";
      bySource[source] = (bySource[source] || 0) + 1;
    }

    return bySource;
  },
});
