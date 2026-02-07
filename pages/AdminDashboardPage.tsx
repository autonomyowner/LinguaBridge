import React, { useState, useEffect } from "react";
import { useQuery } from "convex/react";
import { api } from "../convex/_generated/api";
import { Link } from "react-router-dom";

// Admin credentials
const ADMIN_USERNAME = "admin";
const ADMIN_PASSWORD = "focus2026";

const AdminDashboardPage: React.FC = () => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [activeTab, setActiveTab] = useState<"users" | "leads" | "stats" | "activity">("users");
  const [searchQuery, setSearchQuery] = useState("");
  const [leadsSearchQuery, setLeadsSearchQuery] = useState("");

  // Check if already authenticated (session storage)
  useEffect(() => {
    const adminAuth = sessionStorage.getItem("admin_auth");
    if (adminAuth === "true") {
      setIsAuthenticated(true);
    }
  }, []);

  // Fetch data only when authenticated
  const users = useQuery(api.admin.queries.getAllUsers, isAuthenticated ? {} : "skip");
  const subscriptionStats = useQuery(api.admin.queries.getSubscriptionStats, isAuthenticated ? {} : "skip");
  const usageStats = useQuery(api.admin.queries.getUsageStats, isAuthenticated ? {} : "skip");
  const revenueStats = useQuery(api.admin.queries.getRevenueStats, isAuthenticated ? {} : "skip");
  const recentActivity = useQuery(api.admin.queries.getRecentActivity, isAuthenticated ? {} : "skip");
  const emailLeads = useQuery(api.leads.queries.getAll, isAuthenticated ? {} : "skip");

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (username === ADMIN_USERNAME && password === ADMIN_PASSWORD) {
      setIsAuthenticated(true);
      sessionStorage.setItem("admin_auth", "true");
      setError("");
    } else {
      setError("Invalid credentials");
    }
  };

  const handleLogout = () => {
    setIsAuthenticated(false);
    sessionStorage.removeItem("admin_auth");
  };

  const formatDate = (timestamp: number | undefined) => {
    if (!timestamp) return "N/A";
    return new Date(timestamp).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const formatRelativeTime = (timestamp: number | undefined) => {
    if (!timestamp) return "N/A";
    const now = Date.now();
    const diff = now - timestamp;
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 1) return "Just now";
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    return `${days}d ago`;
  };

  // Filter users based on search
  const filteredUsers = users?.filter(
    (u) =>
      u.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (u.name && u.name.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  // Filter leads based on search
  const filteredLeads = emailLeads?.filter(
    (l) => l.email.toLowerCase().includes(leadsSearchQuery.toLowerCase())
  );

  // Login Screen
  if (!isAuthenticated) {
    return (
      <div
        className="min-h-screen flex items-center justify-center"
        style={{ background: "var(--bg-page)" }}
      >
        <div className="matcha-card p-8 w-full max-w-md">
          <h1
            className="text-2xl font-bold mb-6 text-center"
            style={{ color: "var(--text-primary)" }}
          >
            Admin Dashboard
          </h1>
          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label
                className="block text-sm font-medium mb-2"
                style={{ color: "var(--text-secondary)" }}
              >
                Username
              </label>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="matcha-input w-full"
                placeholder="Enter username"
              />
            </div>
            <div>
              <label
                className="block text-sm font-medium mb-2"
                style={{ color: "var(--text-secondary)" }}
              >
                Password
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="matcha-input w-full"
                placeholder="Enter password"
              />
            </div>
            {error && (
              <p className="text-red-500 text-sm text-center">{error}</p>
            )}
            <button
              type="submit"
              className="matcha-btn matcha-btn-primary w-full"
            >
              Login
            </button>
          </form>
          <div className="mt-4 text-center">
            <Link
              to="/"
              className="text-sm hover:underline"
              style={{ color: "var(--matcha-500)" }}
            >
              Back to Home
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // Dashboard
  return (
    <div className="min-h-screen" style={{ background: "var(--bg-page)" }}>
      {/* Header */}
      <header
        className="sticky top-0 z-50 border-b"
        style={{
          background: "var(--bg-elevated)",
          borderColor: "var(--border-subtle)",
        }}
      >
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link to="/" className="text-xl font-bold" style={{ color: "var(--matcha-600)" }}>
              TRAVoices
            </Link>
            <span
              className="px-2 py-1 rounded text-xs font-medium"
              style={{ background: "var(--terra-400)", color: "white" }}
            >
              ADMIN
            </span>
          </div>
          <button
            onClick={handleLogout}
            className="text-sm px-4 py-2 rounded-lg transition-colors"
            style={{
              background: "var(--bg-muted)",
              color: "var(--text-secondary)",
            }}
          >
            Logout
          </button>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-8">
        {/* Stats Overview */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-8">
          {/* Email Leads */}
          <div className="matcha-card p-5">
            <p className="text-sm mb-1" style={{ color: "var(--text-muted)" }}>
              Waitlist Leads
            </p>
            <p
              className="text-3xl font-bold"
              style={{ color: "var(--terra-500)" }}
            >
              {emailLeads?.length || 0}
            </p>
            <p className="text-xs mt-2" style={{ color: "var(--terra-400)" }}>
              Pre-launch signups
            </p>
          </div>

          {/* Total Users */}
          <div className="matcha-card p-5">
            <p className="text-sm mb-1" style={{ color: "var(--text-muted)" }}>
              Total Users
            </p>
            <p
              className="text-3xl font-bold"
              style={{ color: "var(--text-primary)" }}
            >
              {subscriptionStats?.total || 0}
            </p>
            <p className="text-xs mt-2" style={{ color: "var(--matcha-500)" }}>
              {subscriptionStats?.activeToday || 0} active today
            </p>
          </div>

          {/* Pro Users */}
          <div className="matcha-card p-5">
            <p className="text-sm mb-1" style={{ color: "var(--text-muted)" }}>
              Pro Subscribers
            </p>
            <p
              className="text-3xl font-bold"
              style={{ color: "var(--terra-400)" }}
            >
              {subscriptionStats?.pro || 0}
            </p>
            <p className="text-xs mt-2" style={{ color: "var(--text-muted)" }}>
              $19/month each
            </p>
          </div>

          {/* Enterprise Users */}
          <div className="matcha-card p-5">
            <p className="text-sm mb-1" style={{ color: "var(--text-muted)" }}>
              Enterprise
            </p>
            <p
              className="text-3xl font-bold"
              style={{ color: "#6366f1" }}
            >
              {subscriptionStats?.enterprise || 0}
            </p>
            <p className="text-xs mt-2" style={{ color: "var(--text-muted)" }}>
              $99/month each
            </p>
          </div>

          {/* Monthly Revenue */}
          <div className="matcha-card p-5">
            <p className="text-sm mb-1" style={{ color: "var(--text-muted)" }}>
              Monthly Revenue
            </p>
            <p
              className="text-3xl font-bold"
              style={{ color: "#22c55e" }}
            >
              ${revenueStats?.monthlyRevenue || 0}
            </p>
            <p className="text-xs mt-2" style={{ color: "var(--text-muted)" }}>
              ${revenueStats?.yearlyRevenue || 0}/year projected
            </p>
          </div>
        </div>

        {/* Usage Stats */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-8">
          <div className="matcha-card p-4 text-center">
            <p className="text-2xl font-bold" style={{ color: "var(--matcha-600)" }}>
              {usageStats?.totalRooms || 0}
            </p>
            <p className="text-xs" style={{ color: "var(--text-muted)" }}>
              Total Rooms
            </p>
          </div>
          <div className="matcha-card p-4 text-center">
            <p className="text-2xl font-bold" style={{ color: "var(--matcha-600)" }}>
              {usageStats?.totalSessions || 0}
            </p>
            <p className="text-xs" style={{ color: "var(--text-muted)" }}>
              Sessions
            </p>
          </div>
          <div className="matcha-card p-4 text-center">
            <p className="text-2xl font-bold" style={{ color: "var(--matcha-600)" }}>
              {usageStats?.totalMinutesUsed || 0}
            </p>
            <p className="text-xs" style={{ color: "var(--text-muted)" }}>
              Minutes Used
            </p>
          </div>
          <div className="matcha-card p-4 text-center">
            <p className="text-2xl font-bold" style={{ color: "var(--matcha-600)" }}>
              {usageStats?.totalMessages || 0}
            </p>
            <p className="text-xs" style={{ color: "var(--text-muted)" }}>
              Messages
            </p>
          </div>
          <div className="matcha-card p-4 text-center">
            <p className="text-2xl font-bold" style={{ color: "var(--matcha-600)" }}>
              {usageStats?.acceptedFriendships || 0}
            </p>
            <p className="text-xs" style={{ color: "var(--text-muted)" }}>
              Friendships
            </p>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 mb-6">
          {(["users", "leads", "stats", "activity"] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className="px-4 py-2 rounded-lg text-sm font-medium transition-colors"
              style={{
                background: activeTab === tab ? "var(--matcha-500)" : "var(--bg-muted)",
                color: activeTab === tab ? "white" : "var(--text-secondary)",
              }}
            >
              {tab === "leads" ? `Leads (${emailLeads?.length || 0})` : tab.charAt(0).toUpperCase() + tab.slice(1)}
            </button>
          ))}
        </div>

        {/* Users Tab */}
        {activeTab === "users" && (
          <div className="matcha-card p-6">
            <div className="flex items-center justify-between mb-4">
              <h2
                className="text-xl font-bold"
                style={{ color: "var(--text-primary)" }}
              >
                All Users ({users?.length || 0})
              </h2>
              <input
                type="text"
                placeholder="Search by email or name..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="matcha-input w-64"
              />
            </div>

            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr
                    className="border-b"
                    style={{ borderColor: "var(--border-subtle)" }}
                  >
                    <th
                      className="text-left py-3 px-4 text-sm font-medium"
                      style={{ color: "var(--text-muted)" }}
                    >
                      Email
                    </th>
                    <th
                      className="text-left py-3 px-4 text-sm font-medium"
                      style={{ color: "var(--text-muted)" }}
                    >
                      Name
                    </th>
                    <th
                      className="text-left py-3 px-4 text-sm font-medium"
                      style={{ color: "var(--text-muted)" }}
                    >
                      Tier
                    </th>
                    <th
                      className="text-left py-3 px-4 text-sm font-medium"
                      style={{ color: "var(--text-muted)" }}
                    >
                      Minutes Used
                    </th>
                    <th
                      className="text-left py-3 px-4 text-sm font-medium"
                      style={{ color: "var(--text-muted)" }}
                    >
                      Registered
                    </th>
                    <th
                      className="text-left py-3 px-4 text-sm font-medium"
                      style={{ color: "var(--text-muted)" }}
                    >
                      Last Active
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {filteredUsers?.map((user) => (
                    <tr
                      key={user._id}
                      className="border-b hover:bg-opacity-50 transition-colors"
                      style={{ borderColor: "var(--border-subtle)" }}
                    >
                      <td
                        className="py-3 px-4 text-sm"
                        style={{ color: "var(--text-primary)" }}
                      >
                        {user.email}
                      </td>
                      <td
                        className="py-3 px-4 text-sm"
                        style={{ color: "var(--text-secondary)" }}
                      >
                        {user.name || "-"}
                      </td>
                      <td className="py-3 px-4">
                        <span
                          className="px-2 py-1 rounded-full text-xs font-medium"
                          style={{
                            background:
                              user.subscriptionTier === "enterprise"
                                ? "rgba(99, 102, 241, 0.1)"
                                : user.subscriptionTier === "pro"
                                ? "rgba(200, 138, 107, 0.1)"
                                : "var(--bg-muted)",
                            color:
                              user.subscriptionTier === "enterprise"
                                ? "#6366f1"
                                : user.subscriptionTier === "pro"
                                ? "var(--terra-400)"
                                : "var(--text-muted)",
                          }}
                        >
                          {user.subscriptionTier || "free"}
                        </span>
                      </td>
                      <td
                        className="py-3 px-4 text-sm"
                        style={{ color: "var(--text-secondary)" }}
                      >
                        {user.minutesUsedThisMonth || 0} min
                      </td>
                      <td
                        className="py-3 px-4 text-sm"
                        style={{ color: "var(--text-muted)" }}
                      >
                        {formatDate(user.createdAt)}
                      </td>
                      <td
                        className="py-3 px-4 text-sm"
                        style={{ color: "var(--text-muted)" }}
                      >
                        {formatRelativeTime(user.updatedAt || user.createdAt)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {filteredUsers?.length === 0 && (
                <p
                  className="text-center py-8"
                  style={{ color: "var(--text-muted)" }}
                >
                  No users found
                </p>
              )}
            </div>
          </div>
        )}

        {/* Leads Tab */}
        {activeTab === "leads" && (
          <div className="matcha-card p-6">
            <div className="flex items-center justify-between mb-4">
              <h2
                className="text-xl font-bold"
                style={{ color: "var(--text-primary)" }}
              >
                Email Leads ({emailLeads?.length || 0})
              </h2>
              <input
                type="text"
                placeholder="Search by email..."
                value={leadsSearchQuery}
                onChange={(e) => setLeadsSearchQuery(e.target.value)}
                className="matcha-input w-64"
              />
            </div>

            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr
                    className="border-b"
                    style={{ borderColor: "var(--border-subtle)" }}
                  >
                    <th
                      className="text-left py-3 px-4 text-sm font-medium"
                      style={{ color: "var(--text-muted)" }}
                    >
                      Email
                    </th>
                    <th
                      className="text-left py-3 px-4 text-sm font-medium"
                      style={{ color: "var(--text-muted)" }}
                    >
                      Source
                    </th>
                    <th
                      className="text-left py-3 px-4 text-sm font-medium"
                      style={{ color: "var(--text-muted)" }}
                    >
                      Signed Up
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {filteredLeads?.map((lead) => (
                    <tr
                      key={lead._id}
                      className="border-b hover:bg-opacity-50 transition-colors"
                      style={{ borderColor: "var(--border-subtle)" }}
                    >
                      <td
                        className="py-3 px-4 text-sm font-medium"
                        style={{ color: "var(--text-primary)" }}
                      >
                        {lead.email}
                      </td>
                      <td className="py-3 px-4">
                        <span
                          className="px-2 py-1 rounded-full text-xs font-medium"
                          style={{
                            background: "rgba(104, 166, 125, 0.1)",
                            color: "var(--matcha-600)",
                          }}
                        >
                          {lead.source || "homepage"}
                        </span>
                      </td>
                      <td
                        className="py-3 px-4 text-sm"
                        style={{ color: "var(--text-muted)" }}
                      >
                        {formatDate(lead.createdAt)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {filteredLeads?.length === 0 && (
                <p
                  className="text-center py-8"
                  style={{ color: "var(--text-muted)" }}
                >
                  No leads found
                </p>
              )}
            </div>
          </div>
        )}

        {/* Stats Tab */}
        {activeTab === "stats" && (
          <div className="space-y-6">
            {/* Subscription Breakdown */}
            <div className="matcha-card p-6">
              <h2
                className="text-xl font-bold mb-4"
                style={{ color: "var(--text-primary)" }}
              >
                Subscription Breakdown
              </h2>
              <div className="space-y-4">
                {/* Free */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span style={{ color: "var(--text-secondary)" }}>Free</span>
                    <span style={{ color: "var(--text-muted)" }}>
                      {subscriptionStats?.free || 0} users
                    </span>
                  </div>
                  <div
                    className="h-3 rounded-full overflow-hidden"
                    style={{ background: "var(--bg-muted)" }}
                  >
                    <div
                      className="h-full rounded-full"
                      style={{
                        width: `${
                          subscriptionStats?.total
                            ? ((subscriptionStats.free || 0) / subscriptionStats.total) * 100
                            : 0
                        }%`,
                        background: "var(--text-muted)",
                      }}
                    />
                  </div>
                </div>

                {/* Pro */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span style={{ color: "var(--text-secondary)" }}>Pro ($19/mo)</span>
                    <span style={{ color: "var(--terra-400)" }}>
                      {subscriptionStats?.pro || 0} users
                    </span>
                  </div>
                  <div
                    className="h-3 rounded-full overflow-hidden"
                    style={{ background: "var(--bg-muted)" }}
                  >
                    <div
                      className="h-full rounded-full"
                      style={{
                        width: `${
                          subscriptionStats?.total
                            ? ((subscriptionStats.pro || 0) / subscriptionStats.total) * 100
                            : 0
                        }%`,
                        background: "var(--terra-400)",
                      }}
                    />
                  </div>
                </div>

                {/* Enterprise */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span style={{ color: "var(--text-secondary)" }}>Enterprise ($99/mo)</span>
                    <span style={{ color: "#6366f1" }}>
                      {subscriptionStats?.enterprise || 0} users
                    </span>
                  </div>
                  <div
                    className="h-3 rounded-full overflow-hidden"
                    style={{ background: "var(--bg-muted)" }}
                  >
                    <div
                      className="h-full rounded-full"
                      style={{
                        width: `${
                          subscriptionStats?.total
                            ? ((subscriptionStats.enterprise || 0) / subscriptionStats.total) * 100
                            : 0
                        }%`,
                        background: "#6366f1",
                      }}
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Activity Stats */}
            <div className="matcha-card p-6">
              <h2
                className="text-xl font-bold mb-4"
                style={{ color: "var(--text-primary)" }}
              >
                User Activity
              </h2>
              <div className="grid grid-cols-3 gap-6">
                <div className="text-center">
                  <p
                    className="text-4xl font-bold"
                    style={{ color: "#22c55e" }}
                  >
                    {subscriptionStats?.activeToday || 0}
                  </p>
                  <p className="text-sm" style={{ color: "var(--text-muted)" }}>
                    Active Today
                  </p>
                </div>
                <div className="text-center">
                  <p
                    className="text-4xl font-bold"
                    style={{ color: "var(--matcha-500)" }}
                  >
                    {subscriptionStats?.activeThisWeek || 0}
                  </p>
                  <p className="text-sm" style={{ color: "var(--text-muted)" }}>
                    Active This Week
                  </p>
                </div>
                <div className="text-center">
                  <p
                    className="text-4xl font-bold"
                    style={{ color: "var(--terra-400)" }}
                  >
                    {subscriptionStats?.activeThisMonth || 0}
                  </p>
                  <p className="text-sm" style={{ color: "var(--text-muted)" }}>
                    Active This Month
                  </p>
                </div>
              </div>
            </div>

            {/* Platform Stats */}
            <div className="matcha-card p-6">
              <h2
                className="text-xl font-bold mb-4"
                style={{ color: "var(--text-primary)" }}
              >
                Platform Usage
              </h2>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div
                  className="p-4 rounded-xl"
                  style={{ background: "var(--bg-muted)" }}
                >
                  <p
                    className="text-2xl font-bold"
                    style={{ color: "var(--text-primary)" }}
                  >
                    {usageStats?.activeRooms || 0}
                  </p>
                  <p className="text-sm" style={{ color: "var(--text-muted)" }}>
                    Active Rooms
                  </p>
                </div>
                <div
                  className="p-4 rounded-xl"
                  style={{ background: "var(--bg-muted)" }}
                >
                  <p
                    className="text-2xl font-bold"
                    style={{ color: "var(--text-primary)" }}
                  >
                    {usageStats?.activeSessions || 0}
                  </p>
                  <p className="text-sm" style={{ color: "var(--text-muted)" }}>
                    Live Sessions
                  </p>
                </div>
                <div
                  className="p-4 rounded-xl"
                  style={{ background: "var(--bg-muted)" }}
                >
                  <p
                    className="text-2xl font-bold"
                    style={{ color: "var(--text-primary)" }}
                  >
                    {usageStats?.voiceMessages || 0}
                  </p>
                  <p className="text-sm" style={{ color: "var(--text-muted)" }}>
                    Voice Messages
                  </p>
                </div>
                <div
                  className="p-4 rounded-xl"
                  style={{ background: "var(--bg-muted)" }}
                >
                  <p
                    className="text-2xl font-bold"
                    style={{ color: "var(--text-primary)" }}
                  >
                    {usageStats?.pendingFriendships || 0}
                  </p>
                  <p className="text-sm" style={{ color: "var(--text-muted)" }}>
                    Pending Requests
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Activity Tab */}
        {activeTab === "activity" && (
          <div className="space-y-6">
            {/* Recent Signups */}
            <div className="matcha-card p-6">
              <h2
                className="text-xl font-bold mb-4"
                style={{ color: "var(--text-primary)" }}
              >
                Recent Signups
              </h2>
              <div className="space-y-3">
                {recentActivity?.recentSignups.map((signup, i) => (
                  <div
                    key={i}
                    className="flex items-center justify-between p-3 rounded-lg"
                    style={{ background: "var(--bg-muted)" }}
                  >
                    <div>
                      <p
                        className="font-medium"
                        style={{ color: "var(--text-primary)" }}
                      >
                        {signup.email}
                      </p>
                      <p className="text-sm" style={{ color: "var(--text-muted)" }}>
                        {signup.name || "No name"}
                      </p>
                    </div>
                    <span
                      className="text-sm"
                      style={{ color: "var(--text-muted)" }}
                    >
                      {formatRelativeTime(signup.timestamp)}
                    </span>
                  </div>
                ))}
                {(!recentActivity?.recentSignups || recentActivity.recentSignups.length === 0) && (
                  <p style={{ color: "var(--text-muted)" }}>No recent signups</p>
                )}
              </div>
            </div>

            {/* Recent Rooms */}
            <div className="matcha-card p-6">
              <h2
                className="text-xl font-bold mb-4"
                style={{ color: "var(--text-primary)" }}
              >
                Recent Rooms
              </h2>
              <div className="space-y-3">
                {recentActivity?.recentRooms.map((room, i) => (
                  <div
                    key={i}
                    className="flex items-center justify-between p-3 rounded-lg"
                    style={{ background: "var(--bg-muted)" }}
                  >
                    <p
                      className="font-medium"
                      style={{ color: "var(--text-primary)" }}
                    >
                      {room.name}
                    </p>
                    <span
                      className="text-sm"
                      style={{ color: "var(--text-muted)" }}
                    >
                      {formatRelativeTime(room.timestamp)}
                    </span>
                  </div>
                ))}
                {(!recentActivity?.recentRooms || recentActivity.recentRooms.length === 0) && (
                  <p style={{ color: "var(--text-muted)" }}>No recent rooms</p>
                )}
              </div>
            </div>

            {/* Recent Sessions */}
            <div className="matcha-card p-6">
              <h2
                className="text-xl font-bold mb-4"
                style={{ color: "var(--text-primary)" }}
              >
                Recent Sessions
              </h2>
              <div className="space-y-3">
                {recentActivity?.recentSessions.map((session, i) => (
                  <div
                    key={i}
                    className="flex items-center justify-between p-3 rounded-lg"
                    style={{ background: "var(--bg-muted)" }}
                  >
                    <div className="flex items-center gap-3">
                      <span
                        className="px-2 py-1 rounded text-xs font-medium"
                        style={{
                          background:
                            session.status === "active"
                              ? "rgba(34, 197, 94, 0.1)"
                              : "var(--bg-elevated)",
                          color:
                            session.status === "active"
                              ? "#22c55e"
                              : "var(--text-muted)",
                        }}
                      >
                        {session.status}
                      </span>
                      <span style={{ color: "var(--text-secondary)" }}>
                        {session.participants} participants
                      </span>
                    </div>
                    <span
                      className="text-sm"
                      style={{ color: "var(--text-muted)" }}
                    >
                      {formatRelativeTime(session.timestamp)}
                    </span>
                  </div>
                ))}
                {(!recentActivity?.recentSessions || recentActivity.recentSessions.length === 0) && (
                  <p style={{ color: "var(--text-muted)" }}>No recent sessions</p>
                )}
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
};

export default AdminDashboardPage;
