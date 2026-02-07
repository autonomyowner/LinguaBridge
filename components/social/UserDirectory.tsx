import React, { useState } from "react";
import { useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import { Id } from "../../convex/_generated/dataModel";
import { useAuth } from "../../providers/AuthContext";

interface User {
  _id: Id<"users">;
  name: string;
  email?: string;
  imageUrl?: string;
  spokenLanguages: string[];
  friendshipStatus?: "pending" | "accepted" | "rejected" | null;
  friendshipId?: Id<"friendships"> | null;
}

interface UserDirectoryProps {
  users: User[];
  isLoading?: boolean;
}

const UserDirectory: React.FC<UserDirectoryProps> = ({ users, isLoading }) => {
  const { user: currentUser } = useAuth();
  const sendRequest = useMutation(api.friends.mutations.sendRequest);
  const [sendingTo, setSendingTo] = useState<string | null>(null);
  const [requestsSent, setRequestsSent] = useState<Set<string>>(new Set());
  const [autoAccepted, setAutoAccepted] = useState<Set<string>>(new Set());

  const handleSendRequest = async (userId: Id<"users">) => {
    if (!currentUser) {
      alert("Please sign in to send friend requests");
      return;
    }

    setSendingTo(userId);
    try {
      const result = await sendRequest({ userId, userEmail: currentUser?.email });
      if (result?.autoAccepted) {
        // Mutual request - auto-accepted, they're now friends
        setAutoAccepted(prev => new Set(prev).add(userId));
      } else {
        // Track that request was sent (for UI feedback)
        setRequestsSent(prev => new Set(prev).add(userId));
      }
    } catch (error) {
      console.error("Failed to send friend request:", error);
      const errorMessage = error instanceof Error ? error.message : "Failed to send request";
      // Don't show alert for "already" errors since UI will update
      if (!errorMessage.includes("already")) {
        alert(errorMessage);
      }
    } finally {
      setSendingTo(null);
    }
  };

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {[...Array(6)].map((_, i) => (
          <div
            key={i}
            className="p-4 rounded-xl animate-pulse"
            style={{ background: "var(--bg-elevated)" }}
          >
            <div className="flex items-center gap-3">
              <div
                className="w-12 h-12 rounded-full"
                style={{ background: "var(--bg-card)" }}
              />
              <div className="flex-1">
                <div
                  className="h-4 w-24 rounded mb-2"
                  style={{ background: "var(--bg-card)" }}
                />
                <div
                  className="h-3 w-32 rounded"
                  style={{ background: "var(--bg-card)" }}
                />
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (users.length === 0) {
    return (
      <div
        className="text-center py-12 rounded-xl"
        style={{ background: "var(--bg-elevated)" }}
      >
        <div
          className="w-16 h-16 mx-auto mb-4 rounded-full flex items-center justify-center"
          style={{ background: "var(--bg-card)" }}
        >
          <svg
            width="32"
            height="32"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            style={{ color: "var(--text-muted)" }}
          >
            <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
            <circle cx="9" cy="7" r="4" />
            <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
            <path d="M16 3.13a4 4 0 0 1 0 7.75" />
          </svg>
        </div>
        <p style={{ color: "var(--text-muted)" }}>No users found</p>
        <p
          className="text-sm mt-1"
          style={{ color: "var(--text-muted)" }}
        >
          Try adjusting your search or filters
        </p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      {users.map((user) => {
        const initials = user.name
          .split(" ")
          .map((n) => n[0])
          .join("")
          .toUpperCase()
          .slice(0, 2);

        const isSending = sendingTo === user._id;
        const isPending = (user.friendshipStatus === "pending" || requestsSent.has(user._id)) && !autoAccepted.has(user._id);
        const isFriend = user.friendshipStatus === "accepted" || autoAccepted.has(user._id);

        return (
          <div
            key={user._id}
            className="p-4 rounded-xl"
            style={{
              background: "var(--bg-card)",
              border: "1px solid var(--border-soft)",
            }}
          >
            <div className="flex items-center gap-3 mb-3">
              {/* Avatar */}
              {user.imageUrl ? (
                <img
                  src={user.imageUrl}
                  alt={user.name}
                  className="w-12 h-12 rounded-full object-cover flex-shrink-0"
                />
              ) : (
                <div
                  className="w-12 h-12 rounded-full flex items-center justify-center text-sm font-medium flex-shrink-0"
                  style={{
                    background: "var(--matcha-100)",
                    color: "var(--matcha-700)",
                  }}
                >
                  {initials}
                </div>
              )}

              {/* Info */}
              <div className="flex-1 min-w-0">
                <h3
                  className="font-medium truncate"
                  style={{ color: "var(--text-primary)" }}
                >
                  {user.name}
                </h3>
              </div>
            </div>

            {/* Languages */}
            {user.spokenLanguages.length > 0 && (
              <div className="flex flex-wrap gap-1 mb-3">
                {user.spokenLanguages.slice(0, 4).map((lang) => (
                  <span
                    key={lang}
                    className="text-xs px-2 py-0.5 rounded"
                    style={{
                      background: "var(--bg-elevated)",
                      color: "var(--text-muted)",
                    }}
                  >
                    {lang}
                  </span>
                ))}
              </div>
            )}

            {/* Action Button */}
            {isFriend ? (
              <button
                disabled
                className="w-full matcha-btn matcha-btn-secondary py-2 text-sm opacity-60"
              >
                Already Friends
              </button>
            ) : isPending ? (
              <button
                disabled
                className="w-full matcha-btn matcha-btn-secondary py-2 text-sm opacity-60"
              >
                Request Pending
              </button>
            ) : (
              <button
                onClick={() => handleSendRequest(user._id)}
                disabled={isSending || !currentUser}
                className="w-full matcha-btn matcha-btn-primary py-2 text-sm disabled:opacity-50"
              >
                {isSending ? "Sending..." : "Add Friend"}
              </button>
            )}
          </div>
        );
      })}
    </div>
  );
};

export default UserDirectory;
