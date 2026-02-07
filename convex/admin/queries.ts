import { query } from "../_generated/server";

// Get all users with their subscription info
export const getAllUsers = query({
  args: {},
  handler: async (ctx) => {
    const users = await ctx.db.query("users").collect();

    // Sort by createdAt (newest first)
    return users.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
  },
});

// Get subscription statistics
export const getSubscriptionStats = query({
  args: {},
  handler: async (ctx) => {
    const users = await ctx.db.query("users").collect();

    const stats = {
      total: users.length,
      free: users.filter(u => !u.subscriptionTier || u.subscriptionTier === "free").length,
      pro: users.filter(u => u.subscriptionTier === "pro").length,
      enterprise: users.filter(u => u.subscriptionTier === "enterprise").length,
      activeToday: 0,
      activeThisWeek: 0,
      activeThisMonth: 0,
    };

    const now = Date.now();
    const dayAgo = now - 24 * 60 * 60 * 1000;
    const weekAgo = now - 7 * 24 * 60 * 60 * 1000;
    const monthAgo = now - 30 * 24 * 60 * 60 * 1000;

    for (const user of users) {
      const lastActive = user.updatedAt || user.createdAt || 0;
      if (lastActive > dayAgo) stats.activeToday++;
      if (lastActive > weekAgo) stats.activeThisWeek++;
      if (lastActive > monthAgo) stats.activeThisMonth++;
    }

    return stats;
  },
});

// Get usage statistics
export const getUsageStats = query({
  args: {},
  handler: async (ctx) => {
    const rooms = await ctx.db.query("rooms").collect();
    const sessions = await ctx.db.query("sessions").collect();
    const messages = await ctx.db.query("messages").collect();
    const friendships = await ctx.db.query("friendships").collect();

    // Calculate total minutes used
    const users = await ctx.db.query("users").collect();
    const totalMinutesUsed = users.reduce((sum, u) => sum + (u.minutesUsedThisMonth || 0), 0);

    // Sessions by status
    const activeSessions = sessions.filter(s => s.status === "active").length;
    const completedSessions = sessions.filter(s => s.status === "ended").length;

    // Calculate total session duration
    const totalSessionMinutes = sessions.reduce((sum, s) => sum + (s.durationMinutes || 0), 0);

    return {
      totalRooms: rooms.length,
      activeRooms: rooms.filter(r => r.isActive).length,
      publicRooms: rooms.filter(r => r.isPublic).length,
      totalSessions: sessions.length,
      activeSessions,
      completedSessions,
      totalSessionMinutes,
      totalMessages: messages.length,
      textMessages: messages.filter(m => m.type === "text").length,
      voiceMessages: messages.filter(m => m.type === "voice").length,
      totalFriendships: friendships.length,
      acceptedFriendships: friendships.filter(f => f.status === "accepted").length,
      pendingFriendships: friendships.filter(f => f.status === "pending").length,
      totalMinutesUsed,
    };
  },
});

// Get recent activity (last 20 users who signed up or were active)
export const getRecentActivity = query({
  args: {},
  handler: async (ctx) => {
    const users = await ctx.db.query("users").collect();
    const rooms = await ctx.db.query("rooms").collect();
    const sessions = await ctx.db.query("sessions").collect();

    // Recent signups (last 10)
    const recentSignups = users
      .filter(u => u.createdAt)
      .sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0))
      .slice(0, 10)
      .map(u => ({
        type: "signup" as const,
        email: u.email,
        name: u.name,
        timestamp: u.createdAt,
      }));

    // Recent rooms (last 10)
    const recentRooms = rooms
      .sort((a, b) => b.createdAt - a.createdAt)
      .slice(0, 10)
      .map(r => ({
        type: "room" as const,
        name: r.name,
        timestamp: r.createdAt,
      }));

    // Recent sessions (last 10)
    const recentSessions = sessions
      .sort((a, b) => b.startedAt - a.startedAt)
      .slice(0, 10)
      .map(s => ({
        type: "session" as const,
        status: s.status,
        participants: s.participantCount,
        timestamp: s.startedAt,
      }));

    return {
      recentSignups,
      recentRooms,
      recentSessions,
    };
  },
});

// Get revenue estimate (based on subscriptions)
export const getRevenueStats = query({
  args: {},
  handler: async (ctx) => {
    const users = await ctx.db.query("users").collect();

    const proUsers = users.filter(u => u.subscriptionTier === "pro").length;
    const enterpriseUsers = users.filter(u => u.subscriptionTier === "enterprise").length;

    const monthlyRevenue = (proUsers * 19) + (enterpriseUsers * 99);
    const yearlyRevenue = monthlyRevenue * 12;

    return {
      proUsers,
      enterpriseUsers,
      monthlyRevenue,
      yearlyRevenue,
      averageRevenuePerUser: users.length > 0 ? monthlyRevenue / users.length : 0,
    };
  },
});
