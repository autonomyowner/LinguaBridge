import React from "react";
import { Link } from "react-router-dom";
import { useQuery } from "convex/react";
import { api } from "../convex/_generated/api";
import { useAuth } from "../providers/AuthContext";
import Header from "../components/Header";
import { TIER_LIMITS } from "../convex/schema";

const DashboardPage: React.FC = () => {
  const { user } = useAuth();
  const subscription = useQuery(api.subscriptions.queries.getCurrent);
  const rooms = useQuery(api.rooms.queries.getMy);
  const usageStats = useQuery(api.users.queries.getUsageStats);

  const tierLimits = user ? TIER_LIMITS[user.subscriptionTier] : TIER_LIMITS.free;

  return (
    <div className="min-h-screen" style={{ background: "var(--bg-page)" }}>
      <Header />

      <main className="relative z-10 px-6 pb-12 pt-8">
        <div className="max-w-6xl mx-auto">
          {/* Welcome Section */}
          <div className="mb-8">
            <h1 className="text-3xl md:text-4xl font-serif text-gradient mb-2">
              Welcome back{user?.name ? `, ${user.name.split(" ")[0]}` : ""}
            </h1>
            <p style={{ color: "var(--text-secondary)" }}>
              Here's what's happening with your translation activity
            </p>
          </div>

          {/* Stats Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            {/* Minutes Used */}
            <div className="matcha-card p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-semibold" style={{ color: "var(--text-secondary)" }}>
                  Minutes Used
                </h3>
                <span className="matcha-badge matcha-badge-info">This Month</span>
              </div>
              <div className="mb-2">
                <span className="text-3xl font-bold" style={{ color: "var(--text-primary)" }}>
                  {subscription?.usage.minutesUsed ?? 0}
                </span>
                <span className="text-sm ml-1" style={{ color: "var(--text-muted)" }}>
                  / {tierLimits.minutesPerMonth === Infinity ? "∞" : tierLimits.minutesPerMonth}
                </span>
              </div>
              {tierLimits.minutesPerMonth !== Infinity && (
                <div className="w-full h-2 rounded-full overflow-hidden" style={{ background: "var(--bg-elevated)" }}>
                  <div
                    className="h-full rounded-full transition-all"
                    style={{
                      width: `${Math.min(subscription?.usage.percentUsed ?? 0, 100)}%`,
                      background:
                        (subscription?.usage.percentUsed ?? 0) > 80
                          ? "var(--terra-500)"
                          : "var(--matcha-500)",
                    }}
                  />
                </div>
              )}
            </div>

            {/* Sessions */}
            <div className="matcha-card p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-semibold" style={{ color: "var(--text-secondary)" }}>
                  Sessions
                </h3>
              </div>
              <div>
                <span className="text-3xl font-bold" style={{ color: "var(--text-primary)" }}>
                  {usageStats?.sessionsCount ?? 0}
                </span>
                <span className="text-sm ml-1" style={{ color: "var(--text-muted)" }}>
                  this month
                </span>
              </div>
            </div>

            {/* Messages Translated */}
            <div className="matcha-card p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-semibold" style={{ color: "var(--text-secondary)" }}>
                  Translations
                </h3>
              </div>
              <div>
                <span className="text-3xl font-bold" style={{ color: "var(--text-primary)" }}>
                  {usageStats?.messagesTranslated ?? 0}
                </span>
                <span className="text-sm ml-1" style={{ color: "var(--text-muted)" }}>
                  messages
                </span>
              </div>
            </div>

            {/* Languages */}
            <div className="matcha-card p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-semibold" style={{ color: "var(--text-secondary)" }}>
                  Languages
                </h3>
              </div>
              <div>
                <span className="text-3xl font-bold" style={{ color: "var(--text-primary)" }}>
                  {usageStats?.languagesUsed?.length ?? 0}
                </span>
                <span className="text-sm ml-1" style={{ color: "var(--text-muted)" }}>
                  used
                </span>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Quick Actions */}
            <div className="lg:col-span-2">
              <div className="matcha-card p-6">
                <h2 className="text-lg font-semibold mb-6" style={{ color: "var(--text-primary)" }}>
                  Quick Actions
                </h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <Link
                    to="/translate"
                    className="p-5 rounded-xl transition-all hover:scale-[1.02]"
                    style={{
                      background: "linear-gradient(135deg, var(--matcha-500), var(--matcha-600))",
                    }}
                  >
                    <h3 className="text-lg font-semibold mb-1" style={{ color: "var(--text-inverse)" }}>
                      Start Translating
                    </h3>
                    <p className="text-sm opacity-80" style={{ color: "var(--text-inverse)" }}>
                      Join or create a translation room
                    </p>
                  </Link>

                  <Link
                    to="/history"
                    className="p-5 rounded-xl transition-all hover:scale-[1.02]"
                    style={{ background: "var(--bg-elevated)", border: "1px solid var(--border-soft)" }}
                  >
                    <h3 className="text-lg font-semibold mb-1" style={{ color: "var(--text-primary)" }}>
                      View History
                    </h3>
                    <p className="text-sm" style={{ color: "var(--text-secondary)" }}>
                      Browse past sessions and transcripts
                    </p>
                  </Link>

                  <Link
                    to="/settings"
                    className="p-5 rounded-xl transition-all hover:scale-[1.02]"
                    style={{ background: "var(--bg-elevated)", border: "1px solid var(--border-soft)" }}
                  >
                    <h3 className="text-lg font-semibold mb-1" style={{ color: "var(--text-primary)" }}>
                      Settings
                    </h3>
                    <p className="text-sm" style={{ color: "var(--text-secondary)" }}>
                      Customize your preferences
                    </p>
                  </Link>

                  <Link
                    to="/admin/map"
                    className="p-5 rounded-xl transition-all hover:scale-[1.02]"
                    style={{ background: "var(--bg-elevated)", border: "1px solid var(--border-soft)" }}
                  >
                    <h3 className="text-lg font-semibold mb-1" style={{ color: "var(--text-primary)" }}>
                      Admin Map
                    </h3>
                    <p className="text-sm" style={{ color: "var(--text-secondary)" }}>
                      View global activity and analytics
                    </p>
                  </Link>

                  {user?.subscriptionTier === "free" && (
                    <Link
                      to="/pricing"
                      className="p-5 rounded-xl transition-all hover:scale-[1.02]"
                      style={{ background: "var(--terra-50)", border: "1px solid var(--terra-200)" }}
                    >
                      <h3 className="text-lg font-semibold mb-1" style={{ color: "var(--terra-600)" }}>
                        Upgrade Plan
                      </h3>
                      <p className="text-sm" style={{ color: "var(--terra-500)" }}>
                        Get more minutes and features
                      </p>
                    </Link>
                  )}
                </div>
              </div>

              {/* My Rooms */}
              <div className="matcha-card p-6 mt-6">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-lg font-semibold" style={{ color: "var(--text-primary)" }}>
                    My Rooms
                  </h2>
                  <Link
                    to="/translate"
                    className="text-sm font-medium transition-colors hover:opacity-80"
                    style={{ color: "var(--matcha-600)" }}
                  >
                    Create Room
                  </Link>
                </div>

                {rooms?.owned && rooms.owned.length > 0 ? (
                  <div className="space-y-3">
                    {rooms.owned.slice(0, 5).map((room) => (
                      <div
                        key={room._id}
                        className="p-4 rounded-xl flex items-center justify-between"
                        style={{ background: "var(--bg-elevated)" }}
                      >
                        <div>
                          <h3 className="font-medium" style={{ color: "var(--text-primary)" }}>
                            {room.name}
                          </h3>
                          <p className="text-sm" style={{ color: "var(--text-muted)" }}>
                            {room.participantCount} participant{room.participantCount !== 1 ? "s" : ""}
                          </p>
                        </div>
                        <Link
                          to={`/translate?room=${room._id}`}
                          className="matcha-btn matcha-btn-secondary py-2 px-4 text-sm"
                        >
                          Join
                        </Link>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8" style={{ color: "var(--text-muted)" }}>
                    <p className="mb-2">No rooms yet</p>
                    <Link
                      to="/translate"
                      className="text-sm font-medium"
                      style={{ color: "var(--matcha-600)" }}
                    >
                      Create your first room
                    </Link>
                  </div>
                )}
              </div>
            </div>

            {/* Subscription Panel */}
            <div>
              <div className="matcha-card p-6">
                <h2 className="text-lg font-semibold mb-6" style={{ color: "var(--text-primary)" }}>
                  Your Plan
                </h2>

                <div
                  className="p-4 rounded-xl mb-6"
                  style={{
                    background:
                      user?.subscriptionTier === "enterprise"
                        ? "linear-gradient(135deg, var(--matcha-500), var(--matcha-600))"
                        : user?.subscriptionTier === "pro"
                        ? "var(--matcha-100)"
                        : "var(--bg-elevated)",
                  }}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <h3
                        className="text-xl font-bold capitalize"
                        style={{
                          color:
                            user?.subscriptionTier === "enterprise"
                              ? "var(--text-inverse)"
                              : "var(--text-primary)",
                        }}
                      >
                        {user?.subscriptionTier || "Free"}
                      </h3>
                      <p
                        className="text-sm"
                        style={{
                          color:
                            user?.subscriptionTier === "enterprise"
                              ? "rgba(255,255,255,0.8)"
                              : "var(--text-secondary)",
                        }}
                      >
                        {tierLimits.minutesPerMonth === Infinity
                          ? "Unlimited minutes"
                          : `${tierLimits.minutesPerMonth} min/month`}
                      </p>
                    </div>
                    <span
                      className="text-2xl font-bold"
                      style={{
                        color:
                          user?.subscriptionTier === "enterprise"
                            ? "var(--text-inverse)"
                            : "var(--text-primary)",
                      }}
                    >
                      {user?.subscriptionTier === "free"
                        ? "$0"
                        : user?.subscriptionTier === "pro"
                        ? "$19"
                        : "$99"}
                      <span className="text-sm font-normal">/mo</span>
                    </span>
                  </div>
                </div>

                <div className="space-y-3 mb-6">
                  <div className="flex items-center gap-2">
                    <svg
                      className="w-5 h-5"
                      style={{ color: "var(--matcha-500)" }}
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    <span className="text-sm" style={{ color: "var(--text-secondary)" }}>
                      Up to {tierLimits.maxParticipants} participants
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <svg
                      className="w-5 h-5"
                      style={{ color: "var(--matcha-500)" }}
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    <span className="text-sm" style={{ color: "var(--text-secondary)" }}>
                      {tierLimits.maxRooms === Infinity ? "Unlimited" : tierLimits.maxRooms} active rooms
                    </span>
                  </div>
                  {tierLimits.apiAccess && (
                    <div className="flex items-center gap-2">
                      <svg
                        className="w-5 h-5"
                        style={{ color: "var(--matcha-500)" }}
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                      <span className="text-sm" style={{ color: "var(--text-secondary)" }}>
                        API access
                      </span>
                    </div>
                  )}
                </div>

                {user?.subscriptionTier !== "enterprise" && (
                  <Link
                    to="/pricing"
                    className="matcha-btn matcha-btn-primary w-full py-3 text-center"
                  >
                    Upgrade Plan
                  </Link>
                )}
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default DashboardPage;
