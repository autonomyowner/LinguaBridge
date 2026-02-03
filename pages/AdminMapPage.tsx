import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { useQuery } from "convex/react";
import { api } from "../convex/_generated/api";
import { useAuth } from "../providers/AuthContext";
import Header from "../components/Header";

// Middle East & Global regions data
const REGIONS = [
  { id: "uae", name: "UAE", x: 68, y: 42, users: 0, sessions: 0, growth: 0 },
  { id: "saudi", name: "Saudi Arabia", x: 62, y: 40, users: 0, sessions: 0, growth: 0 },
  { id: "egypt", name: "Egypt", x: 54, y: 38, users: 0, sessions: 0, growth: 0 },
  { id: "kuwait", name: "Kuwait", x: 64, y: 38, users: 0, sessions: 0, growth: 0 },
  { id: "qatar", name: "Qatar", x: 66, y: 40, users: 0, sessions: 0, growth: 0 },
  { id: "jordan", name: "Jordan", x: 57, y: 36, users: 0, sessions: 0, growth: 0 },
  { id: "lebanon", name: "Lebanon", x: 56, y: 34, users: 0, sessions: 0, growth: 0 },
  { id: "iraq", name: "Iraq", x: 60, y: 35, users: 0, sessions: 0, growth: 0 },
  { id: "morocco", name: "Morocco", x: 44, y: 36, users: 0, sessions: 0, growth: 0 },
  { id: "turkey", name: "Turkey", x: 55, y: 32, users: 0, sessions: 0, growth: 0 },
];

const AdminMapPage: React.FC = () => {
  const { user } = useAuth();
  const [selectedRegion, setSelectedRegion] = useState<string | null>(null);
  const [liveActivity, setLiveActivity] = useState<{ region: string; type: string }[]>([]);

  // Simulated real-time data (replace with actual Convex queries)
  const [stats, setStats] = useState({
    totalUsers: 0,
    activeNow: 0,
    sessionsToday: 0,
    minutesTranslated: 0,
  });

  const [regionData, setRegionData] = useState(REGIONS);

  // Simulate real-time activity updates
  useEffect(() => {
    const interval = setInterval(() => {
      const randomRegion = REGIONS[Math.floor(Math.random() * REGIONS.length)];
      const types = ["signup", "session", "translation"];
      const randomType = types[Math.floor(Math.random() * types.length)];

      setLiveActivity((prev) => [
        { region: randomRegion.name, type: randomType },
        ...prev.slice(0, 9),
      ]);

      // Update region data with random activity
      setRegionData((prev) =>
        prev.map((r) =>
          r.id === randomRegion.id
            ? {
                ...r,
                users: r.users + (randomType === "signup" ? 1 : 0),
                sessions: r.sessions + (randomType === "session" ? 1 : 0),
              }
            : r
        )
      );

      // Update global stats
      setStats((prev) => ({
        ...prev,
        totalUsers: prev.totalUsers + (randomType === "signup" ? 1 : 0),
        activeNow: Math.max(1, Math.floor(Math.random() * 15)),
        sessionsToday: prev.sessionsToday + (randomType === "session" ? 1 : 0),
        minutesTranslated: prev.minutesTranslated + Math.floor(Math.random() * 5),
      }));
    }, 3000);

    return () => clearInterval(interval);
  }, []);

  const getActivityColor = (type: string) => {
    switch (type) {
      case "signup":
        return "var(--matcha-500)";
      case "session":
        return "var(--terra-400)";
      case "translation":
        return "#6366f1";
      default:
        return "var(--text-muted)";
    }
  };

  return (
    <div className="min-h-screen" style={{ background: "var(--bg-page)" }}>
      <Header />

      <main className="relative z-10 px-6 pb-12 pt-8">
        <div className="max-w-7xl mx-auto">
          {/* Header */}
          <div className="flex items-center justify-between mb-8">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <Link
                  to="/dashboard"
                  className="text-sm transition-colors"
                  style={{ color: "var(--text-muted)" }}
                >
                  Dashboard
                </Link>
                <span style={{ color: "var(--text-muted)" }}>/</span>
                <span className="text-sm" style={{ color: "var(--text-secondary)" }}>
                  Admin Map
                </span>
              </div>
              <h1 className="text-3xl md:text-4xl font-serif text-gradient">
                Global Activity Map
              </h1>
              <p style={{ color: "var(--text-secondary)" }}>
                Real-time user activity across the Middle East and beyond
              </p>
            </div>

            {/* Live indicator */}
            <div
              className="flex items-center gap-2 px-4 py-2 rounded-full"
              style={{ background: "var(--bg-elevated)" }}
            >
              <span
                className="w-2 h-2 rounded-full pulse-dot"
                style={{ background: "#22c55e" }}
              />
              <span className="text-sm font-medium" style={{ color: "var(--text-secondary)" }}>
                Live
              </span>
            </div>
          </div>

          {/* Stats Row */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
            <div className="matcha-card p-5">
              <p className="text-sm mb-1" style={{ color: "var(--text-muted)" }}>
                Total Users
              </p>
              <p className="text-2xl font-bold" style={{ color: "var(--text-primary)" }}>
                {stats.totalUsers.toLocaleString()}
              </p>
            </div>
            <div className="matcha-card p-5">
              <p className="text-sm mb-1" style={{ color: "var(--text-muted)" }}>
                Active Now
              </p>
              <div className="flex items-center gap-2">
                <p className="text-2xl font-bold" style={{ color: "var(--matcha-600)" }}>
                  {stats.activeNow}
                </p>
                <span
                  className="w-2 h-2 rounded-full animate-pulse"
                  style={{ background: "var(--matcha-500)" }}
                />
              </div>
            </div>
            <div className="matcha-card p-5">
              <p className="text-sm mb-1" style={{ color: "var(--text-muted)" }}>
                Sessions Today
              </p>
              <p className="text-2xl font-bold" style={{ color: "var(--text-primary)" }}>
                {stats.sessionsToday}
              </p>
            </div>
            <div className="matcha-card p-5">
              <p className="text-sm mb-1" style={{ color: "var(--text-muted)" }}>
                Minutes Translated
              </p>
              <p className="text-2xl font-bold" style={{ color: "var(--text-primary)" }}>
                {stats.minutesTranslated}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Map Section */}
            <div className="lg:col-span-2">
              <div className="matcha-card p-6 overflow-hidden">
                <h2 className="text-lg font-semibold mb-4" style={{ color: "var(--text-primary)" }}>
                  Middle East Region
                </h2>

                {/* SVG Map */}
                <div
                  className="relative w-full rounded-xl overflow-hidden"
                  style={{
                    background: "linear-gradient(135deg, #1a1f2e 0%, #0f1419 100%)",
                    aspectRatio: "16/10",
                  }}
                >
                  {/* Grid overlay */}
                  <svg
                    className="absolute inset-0 w-full h-full opacity-10"
                    preserveAspectRatio="none"
                  >
                    <defs>
                      <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
                        <path
                          d="M 40 0 L 0 0 0 40"
                          fill="none"
                          stroke="var(--matcha-500)"
                          strokeWidth="0.5"
                        />
                      </pattern>
                    </defs>
                    <rect width="100%" height="100%" fill="url(#grid)" />
                  </svg>

                  {/* Region points */}
                  <svg className="absolute inset-0 w-full h-full" viewBox="0 0 100 60">
                    {/* Connection lines */}
                    {regionData.map((region, i) =>
                      regionData.slice(i + 1).map((other, j) => {
                        const distance = Math.sqrt(
                          Math.pow(region.x - other.x, 2) + Math.pow(region.y - other.y, 2)
                        );
                        if (distance < 15) {
                          return (
                            <line
                              key={`${region.id}-${other.id}`}
                              x1={region.x}
                              y1={region.y}
                              x2={other.x}
                              y2={other.y}
                              stroke="var(--matcha-500)"
                              strokeWidth="0.3"
                              opacity="0.3"
                            />
                          );
                        }
                        return null;
                      })
                    )}

                    {/* Region markers */}
                    {regionData.map((region) => {
                      const isSelected = selectedRegion === region.id;
                      const hasActivity = region.users > 0 || region.sessions > 0;

                      return (
                        <g
                          key={region.id}
                          className="cursor-pointer"
                          onClick={() => setSelectedRegion(isSelected ? null : region.id)}
                        >
                          {/* Pulse ring for active regions */}
                          {hasActivity && (
                            <circle
                              cx={region.x}
                              cy={region.y}
                              r="3"
                              fill="none"
                              stroke="var(--matcha-400)"
                              strokeWidth="0.5"
                              className="animate-pulse-ring"
                              style={{ transformOrigin: `${region.x}px ${region.y}px` }}
                            />
                          )}

                          {/* Main dot */}
                          <circle
                            cx={region.x}
                            cy={region.y}
                            r={isSelected ? 2.5 : hasActivity ? 2 : 1.5}
                            fill={
                              isSelected
                                ? "var(--terra-400)"
                                : hasActivity
                                ? "var(--matcha-400)"
                                : "var(--matcha-600)"
                            }
                            className="transition-all"
                          />

                          {/* Glow effect */}
                          {(isSelected || hasActivity) && (
                            <circle
                              cx={region.x}
                              cy={region.y}
                              r="4"
                              fill={isSelected ? "var(--terra-400)" : "var(--matcha-400)"}
                              opacity="0.2"
                              className="pulse-glow"
                            />
                          )}

                          {/* Label */}
                          <text
                            x={region.x}
                            y={region.y - 4}
                            textAnchor="middle"
                            fill="white"
                            fontSize="2.5"
                            fontWeight="500"
                            opacity={isSelected || hasActivity ? 1 : 0.6}
                          >
                            {region.name}
                          </text>
                        </g>
                      );
                    })}
                  </svg>

                  {/* Selected region info */}
                  {selectedRegion && (
                    <div
                      className="absolute bottom-4 left-4 p-4 rounded-xl animate-fade-in"
                      style={{
                        background: "rgba(0, 0, 0, 0.8)",
                        backdropFilter: "blur(8px)",
                        border: "1px solid rgba(104, 166, 125, 0.3)",
                      }}
                    >
                      <h3 className="text-white font-semibold mb-2">
                        {regionData.find((r) => r.id === selectedRegion)?.name}
                      </h3>
                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div>
                          <p className="text-gray-400">Users</p>
                          <p className="text-white font-medium">
                            {regionData.find((r) => r.id === selectedRegion)?.users || 0}
                          </p>
                        </div>
                        <div>
                          <p className="text-gray-400">Sessions</p>
                          <p className="text-white font-medium">
                            {regionData.find((r) => r.id === selectedRegion)?.sessions || 0}
                          </p>
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* Region legend */}
                <div className="mt-4 flex flex-wrap gap-4">
                  {regionData
                    .filter((r) => r.users > 0 || r.sessions > 0)
                    .slice(0, 5)
                    .map((region) => (
                      <div
                        key={region.id}
                        className="flex items-center gap-2 cursor-pointer"
                        onClick={() => setSelectedRegion(region.id)}
                      >
                        <span
                          className="w-2 h-2 rounded-full"
                          style={{ background: "var(--matcha-500)" }}
                        />
                        <span className="text-sm" style={{ color: "var(--text-secondary)" }}>
                          {region.name}: {region.users} users
                        </span>
                      </div>
                    ))}
                </div>
              </div>

              {/* Region Breakdown Table */}
              <div className="matcha-card p-6 mt-6">
                <h2 className="text-lg font-semibold mb-4" style={{ color: "var(--text-primary)" }}>
                  Regional Breakdown
                </h2>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr style={{ borderBottom: "1px solid var(--border-soft)" }}>
                        <th
                          className="text-left py-3 text-sm font-medium"
                          style={{ color: "var(--text-muted)" }}
                        >
                          Region
                        </th>
                        <th
                          className="text-right py-3 text-sm font-medium"
                          style={{ color: "var(--text-muted)" }}
                        >
                          Users
                        </th>
                        <th
                          className="text-right py-3 text-sm font-medium"
                          style={{ color: "var(--text-muted)" }}
                        >
                          Sessions
                        </th>
                        <th
                          className="text-right py-3 text-sm font-medium"
                          style={{ color: "var(--text-muted)" }}
                        >
                          Status
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {regionData.map((region) => (
                        <tr
                          key={region.id}
                          className="cursor-pointer transition-colors hover:bg-[var(--bg-elevated)]"
                          style={{ borderBottom: "1px solid var(--border-soft)" }}
                          onClick={() => setSelectedRegion(region.id)}
                        >
                          <td className="py-3">
                            <div className="flex items-center gap-2">
                              <span
                                className="w-2 h-2 rounded-full"
                                style={{
                                  background:
                                    region.users > 0 || region.sessions > 0
                                      ? "var(--matcha-500)"
                                      : "var(--text-muted)",
                                }}
                              />
                              <span style={{ color: "var(--text-primary)" }}>{region.name}</span>
                            </div>
                          </td>
                          <td
                            className="text-right py-3 font-medium"
                            style={{ color: "var(--text-primary)" }}
                          >
                            {region.users}
                          </td>
                          <td
                            className="text-right py-3 font-medium"
                            style={{ color: "var(--text-primary)" }}
                          >
                            {region.sessions}
                          </td>
                          <td className="text-right py-3">
                            {region.users > 0 || region.sessions > 0 ? (
                              <span className="matcha-badge matcha-badge-success">Active</span>
                            ) : (
                              <span
                                className="text-sm px-2 py-1 rounded-full"
                                style={{
                                  background: "var(--bg-muted)",
                                  color: "var(--text-muted)",
                                }}
                              >
                                Pending
                              </span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

            {/* Activity Feed */}
            <div>
              <div className="matcha-card p-6">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-lg font-semibold" style={{ color: "var(--text-primary)" }}>
                    Live Activity
                  </h2>
                  <span
                    className="w-2 h-2 rounded-full pulse-dot"
                    style={{ background: "#22c55e" }}
                  />
                </div>

                <div className="space-y-3 max-h-96 overflow-y-auto custom-scrollbar">
                  {liveActivity.length === 0 ? (
                    <div className="text-center py-8" style={{ color: "var(--text-muted)" }}>
                      <p>Waiting for activity...</p>
                    </div>
                  ) : (
                    liveActivity.map((activity, i) => (
                      <div
                        key={i}
                        className="p-3 rounded-lg animate-fade-in"
                        style={{
                          background: "var(--bg-elevated)",
                          opacity: 1 - i * 0.08,
                        }}
                      >
                        <div className="flex items-center gap-2 mb-1">
                          <span
                            className="w-2 h-2 rounded-full"
                            style={{ background: getActivityColor(activity.type) }}
                          />
                          <span
                            className="text-sm font-medium capitalize"
                            style={{ color: "var(--text-primary)" }}
                          >
                            {activity.type === "signup"
                              ? "New User"
                              : activity.type === "session"
                              ? "Session Started"
                              : "Translation"}
                          </span>
                        </div>
                        <p className="text-sm" style={{ color: "var(--text-muted)" }}>
                          {activity.region}
                        </p>
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* Launch Countdown */}
              <div className="matcha-card p-6 mt-6">
                <h2 className="text-lg font-semibold mb-4" style={{ color: "var(--text-primary)" }}>
                  Launch Countdown
                </h2>
                <div
                  className="text-center py-6 rounded-xl"
                  style={{
                    background: "linear-gradient(135deg, var(--matcha-500), var(--matcha-600))",
                  }}
                >
                  <p className="text-5xl font-bold text-white mb-2">10</p>
                  <p className="text-white opacity-80">Days to Launch</p>
                </div>

                <div className="mt-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm" style={{ color: "var(--text-secondary)" }}>
                      Target: Middle East
                    </span>
                    <span className="matcha-badge matcha-badge-success">Ready</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm" style={{ color: "var(--text-secondary)" }}>
                      Arabic Support
                    </span>
                    <span className="matcha-badge matcha-badge-success">Ready</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm" style={{ color: "var(--text-secondary)" }}>
                      RTL Layout
                    </span>
                    <span className="matcha-badge matcha-badge-success">Ready</span>
                  </div>
                </div>
              </div>

              {/* Quick Actions */}
              <div className="matcha-card p-6 mt-6">
                <h2 className="text-lg font-semibold mb-4" style={{ color: "var(--text-primary)" }}>
                  Admin Actions
                </h2>
                <div className="space-y-3">
                  <button className="matcha-btn matcha-btn-primary w-full text-sm">
                    Export User Data
                  </button>
                  <button className="matcha-btn matcha-btn-secondary w-full text-sm">
                    View Analytics
                  </button>
                  <button className="matcha-btn matcha-btn-secondary w-full text-sm">
                    Manage Regions
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default AdminMapPage;
