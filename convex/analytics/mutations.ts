import { mutation, internalMutation } from "../_generated/server";
import { v } from "convex/values";
import { getCurrentUser, getTodayDate } from "../lib/utils";

/**
 * Track usage for the current user
 */
export const trackUsage = mutation({
  args: {
    type: v.union(
      v.literal("minutes"),
      v.literal("session"),
      v.literal("message"),
      v.literal("room")
    ),
    value: v.optional(v.number()),
    languages: v.optional(v.array(v.string())),
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    const todayDate = getTodayDate();
    const now = Date.now();

    // Find or create today's analytics
    let analytics = await ctx.db
      .query("analytics")
      .withIndex("by_user_date", (q) => q.eq("userId", user._id).eq("date", todayDate))
      .unique();

    if (!analytics) {
      const analyticsId = await ctx.db.insert("analytics", {
        userId: user._id,
        date: todayDate,
        minutesUsed: 0,
        sessionsStarted: 0,
        messagesTranslated: 0,
        roomsCreated: 0,
        languagesUsed: [],
        updatedAt: now,
      });
      analytics = await ctx.db.get(analyticsId);
    }

    if (!analytics) return;

    // Update based on type
    const updates: Partial<{
      minutesUsed: number;
      sessionsStarted: number;
      messagesTranslated: number;
      roomsCreated: number;
      languagesUsed: string[];
      updatedAt: number;
    }> = { updatedAt: now };

    switch (args.type) {
      case "minutes":
        updates.minutesUsed = analytics.minutesUsed + (args.value ?? 1);
        break;
      case "session":
        updates.sessionsStarted = analytics.sessionsStarted + 1;
        break;
      case "message":
        updates.messagesTranslated = analytics.messagesTranslated + 1;
        break;
      case "room":
        updates.roomsCreated = analytics.roomsCreated + 1;
        break;
    }

    // Update languages if provided
    if (args.languages && args.languages.length > 0) {
      const existingLangs = new Set(analytics.languagesUsed);
      args.languages.forEach((l) => existingLangs.add(l));
      updates.languagesUsed = Array.from(existingLangs);
    }

    await ctx.db.patch(analytics._id, updates);
  },
});

/**
 * Internal: Track minutes used
 */
export const trackMinutes = internalMutation({
  args: {
    userId: v.id("users"),
    minutes: v.number(),
  },
  handler: async (ctx, args) => {
    const todayDate = getTodayDate();
    const now = Date.now();

    let analytics = await ctx.db
      .query("analytics")
      .withIndex("by_user_date", (q) => q.eq("userId", args.userId).eq("date", todayDate))
      .unique();

    if (analytics) {
      await ctx.db.patch(analytics._id, {
        minutesUsed: analytics.minutesUsed + args.minutes,
        updatedAt: now,
      });
    } else {
      await ctx.db.insert("analytics", {
        userId: args.userId,
        date: todayDate,
        minutesUsed: args.minutes,
        sessionsStarted: 0,
        messagesTranslated: 0,
        roomsCreated: 0,
        languagesUsed: [],
        updatedAt: now,
      });
    }
  },
});

/**
 * Get analytics summary for dashboard
 */
export const getSummary = mutation({
  args: {
    days: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    const days = args.days ?? 30;

    // Calculate date range
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);
    const startDateStr = startDate.toISOString().split("T")[0];

    // Get analytics for the period
    const analytics = await ctx.db
      .query("analytics")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .filter((q) => q.gte(q.field("date"), startDateStr))
      .collect();

    // Aggregate
    const totals = {
      minutesUsed: 0,
      sessionsStarted: 0,
      messagesTranslated: 0,
      roomsCreated: 0,
      languagesUsed: new Set<string>(),
    };

    const dailyData: { date: string; minutes: number; sessions: number }[] = [];

    for (const day of analytics) {
      totals.minutesUsed += day.minutesUsed;
      totals.sessionsStarted += day.sessionsStarted;
      totals.messagesTranslated += day.messagesTranslated;
      totals.roomsCreated += day.roomsCreated;
      day.languagesUsed.forEach((l) => totals.languagesUsed.add(l));

      dailyData.push({
        date: day.date,
        minutes: day.minutesUsed,
        sessions: day.sessionsStarted,
      });
    }

    // Sort daily data by date
    dailyData.sort((a, b) => a.date.localeCompare(b.date));

    return {
      totals: {
        ...totals,
        languagesUsed: Array.from(totals.languagesUsed),
      },
      dailyData,
      period: { start: startDateStr, end: getTodayDate(), days },
    };
  },
});
