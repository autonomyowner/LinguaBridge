import React, { useState } from "react";
import { Link } from "react-router-dom";
import { useQuery } from "convex/react";
import { api } from "../convex/_generated/api";
import Header from "../components/Header";

const SessionHistoryPage: React.FC = () => {
  const sessions = useQuery(api.sessions.queries.getHistory, { limit: 20 });
  const [expandedSession, setExpandedSession] = useState<string | null>(null);

  const formatDuration = (minutes: number | undefined) => {
    if (!minutes) return "< 1 min";
    if (minutes < 60) return `${minutes} min`;
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours}h ${mins}m`;
  };

  const formatDate = (timestamp: number) => {
    const date = new Date(timestamp);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    if (date.toDateString() === today.toDateString()) {
      return `Today at ${date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`;
    }
    if (date.toDateString() === yesterday.toDateString()) {
      return `Yesterday at ${date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`;
    }
    return date.toLocaleDateString([], {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  return (
    <div className="min-h-screen" style={{ background: "var(--bg-page)" }}>
      <Header />

      <main className="relative z-10 px-6 pb-12 pt-8">
        <div className="max-w-4xl mx-auto">
          {/* Header */}
          <div className="flex items-center justify-between mb-8">
            <div>
              <h1 className="text-3xl font-serif mb-2" style={{ color: "var(--text-primary)" }}>
                Session History
              </h1>
              <p style={{ color: "var(--text-secondary)" }}>
                View your past translation sessions and transcripts
              </p>
            </div>
            <Link to="/translate" className="matcha-btn matcha-btn-primary py-2 px-4">
              New Session
            </Link>
          </div>

          {/* Sessions List */}
          {sessions === undefined ? (
            <div className="matcha-card p-8 text-center">
              <div
                className="w-8 h-8 border-2 rounded-full animate-spin mx-auto"
                style={{ borderColor: "var(--matcha-200)", borderTopColor: "var(--matcha-600)" }}
              />
              <p className="mt-4" style={{ color: "var(--text-muted)" }}>
                Loading sessions...
              </p>
            </div>
          ) : sessions.length === 0 ? (
            <div className="matcha-card p-12 text-center">
              <div
                className="w-20 h-20 rounded-full mx-auto mb-6 flex items-center justify-center"
                style={{ background: "var(--bg-elevated)" }}
              >
                <svg
                  className="w-10 h-10"
                  style={{ color: "var(--text-muted)" }}
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={1.5}
                    d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"
                  />
                </svg>
              </div>
              <h3 className="text-lg font-semibold mb-2" style={{ color: "var(--text-primary)" }}>
                No sessions yet
              </h3>
              <p className="text-sm mb-6" style={{ color: "var(--text-muted)" }}>
                Start a translation session to see it appear here
              </p>
              <Link to="/translate" className="matcha-btn matcha-btn-primary py-2 px-6">
                Start Translating
              </Link>
            </div>
          ) : (
            <div className="space-y-4">
              {sessions.map((session) => (
                <div key={session._id} className="matcha-card overflow-hidden">
                  {/* Session Header */}
                  <div
                    className="p-5 cursor-pointer transition-colors hover:bg-black/[0.02]"
                    onClick={() =>
                      setExpandedSession(expandedSession === session._id ? null : session._id)
                    }
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div
                          className="w-12 h-12 rounded-xl flex items-center justify-center"
                          style={{
                            background:
                              session.status === "ended"
                                ? "var(--bg-elevated)"
                                : "var(--matcha-100)",
                          }}
                        >
                          {session.status === "active" ? (
                            <span
                              className="w-3 h-3 rounded-full animate-pulse"
                              style={{ background: "var(--matcha-500)" }}
                            />
                          ) : (
                            <svg
                              className="w-6 h-6"
                              style={{ color: "var(--text-muted)" }}
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M5 13l4 4L19 7"
                              />
                            </svg>
                          )}
                        </div>
                        <div>
                          <h3 className="font-semibold" style={{ color: "var(--text-primary)" }}>
                            {session.roomName}
                          </h3>
                          <p className="text-sm" style={{ color: "var(--text-muted)" }}>
                            {formatDate(session.startedAt)}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-6">
                        <div className="text-right hidden sm:block">
                          <p className="font-medium" style={{ color: "var(--text-primary)" }}>
                            {formatDuration(session.durationMinutes)}
                          </p>
                          <p className="text-sm" style={{ color: "var(--text-muted)" }}>
                            {session.participantCount} participant
                            {session.participantCount !== 1 ? "s" : ""}
                          </p>
                        </div>

                        <div className="flex items-center gap-2">
                          {session.wasHost && (
                            <span
                              className="text-xs px-2 py-1 rounded-full"
                              style={{ background: "var(--matcha-100)", color: "var(--matcha-700)" }}
                            >
                              Host
                            </span>
                          )}
                          <span
                            className={`text-xs px-2 py-1 rounded-full ${
                              session.status === "active"
                                ? "matcha-badge-success"
                                : "matcha-badge-info"
                            }`}
                          >
                            {session.status === "active" ? "Live" : "Completed"}
                          </span>
                        </div>

                        <svg
                          className={`w-5 h-5 transition-transform ${
                            expandedSession === session._id ? "rotate-180" : ""
                          }`}
                          style={{ color: "var(--text-muted)" }}
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M19 9l-7 7-7-7"
                          />
                        </svg>
                      </div>
                    </div>
                  </div>

                  {/* Expanded Details */}
                  {expandedSession === session._id && (
                    <div
                      className="px-5 pb-5"
                      style={{ borderTop: "1px solid var(--border-soft)" }}
                    >
                      <div className="pt-4 flex items-center justify-between">
                        <div className="flex items-center gap-4">
                          <div className="text-center px-4 py-2 rounded-lg" style={{ background: "var(--bg-elevated)" }}>
                            <p className="text-lg font-bold" style={{ color: "var(--text-primary)" }}>
                              {formatDuration(session.durationMinutes)}
                            </p>
                            <p className="text-xs" style={{ color: "var(--text-muted)" }}>
                              Duration
                            </p>
                          </div>
                          <div className="text-center px-4 py-2 rounded-lg" style={{ background: "var(--bg-elevated)" }}>
                            <p className="text-lg font-bold" style={{ color: "var(--text-primary)" }}>
                              {session.participantCount}
                            </p>
                            <p className="text-xs" style={{ color: "var(--text-muted)" }}>
                              Participants
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          {session.status === "active" ? (
                            <Link
                              to={`/translate?session=${session._id}`}
                              className="matcha-btn matcha-btn-primary py-2 px-4 text-sm"
                            >
                              Rejoin Session
                            </Link>
                          ) : (
                            <button
                              className="matcha-btn matcha-btn-secondary py-2 px-4 text-sm"
                              onClick={() => {
                                // Export transcript
                                console.log("Export transcript for session:", session._id);
                              }}
                            >
                              Export Transcript
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
};

export default SessionHistoryPage;
