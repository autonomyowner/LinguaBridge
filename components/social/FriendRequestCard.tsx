import React, { useState } from "react";
import { useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import { Id } from "../../convex/_generated/dataModel";
import { useAuth } from "../../providers/AuthContext";

interface FriendRequestCardProps {
  request: {
    friendshipId: Id<"friendships">;
    requesterId: Id<"users">;
    name: string;
    email?: string;
    imageUrl?: string;
    spokenLanguages: string[];
    createdAt: number;
  };
  type: "received" | "sent";
}

const FriendRequestCard: React.FC<FriendRequestCardProps> = ({
  request,
  type,
}) => {
  const { user } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const acceptRequest = useMutation(api.friends.mutations.acceptRequest);
  const rejectRequest = useMutation(api.friends.mutations.rejectRequest);
  const cancelRequest = useMutation(api.friends.mutations.cancelRequest);

  const handleAccept = async () => {
    setIsLoading(true);
    setError(null);
    try {
      await acceptRequest({ friendshipId: request.friendshipId, userEmail: user?.email });
    } catch (error) {
      console.error("Failed to accept request:", error);
      setError(error instanceof Error ? error.message : "Failed to accept request");
    } finally {
      setIsLoading(false);
    }
  };

  const handleReject = async () => {
    setIsLoading(true);
    setError(null);
    try {
      await rejectRequest({ friendshipId: request.friendshipId, userEmail: user?.email });
    } catch (error) {
      console.error("Failed to reject request:", error);
      setError(error instanceof Error ? error.message : "Failed to reject request");
    } finally {
      setIsLoading(false);
    }
  };

  const handleCancel = async () => {
    setIsLoading(true);
    setError(null);
    try {
      await cancelRequest({ friendshipId: request.friendshipId, userEmail: user?.email });
    } catch (error) {
      console.error("Failed to cancel request:", error);
      setError(error instanceof Error ? error.message : "Failed to cancel request");
    } finally {
      setIsLoading(false);
    }
  };

  // Get initials for avatar fallback
  const initials = request.name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  const formatTime = (timestamp: number) => {
    const now = Date.now();
    const diff = now - timestamp;
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 1) return "Just now";
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    if (days < 7) return `${days}d ago`;
    return new Date(timestamp).toLocaleDateString();
  };

  return (
    <div
      className="p-4 rounded-xl"
      style={{
        background: "var(--bg-card)",
        border: "1px solid var(--border-soft)",
      }}
    >
      <div className="flex items-center gap-4">
        {/* Avatar */}
        <div className="flex-shrink-0">
          {request.imageUrl ? (
            <img
              src={request.imageUrl}
              alt={request.name}
              className="w-12 h-12 rounded-full object-cover"
            />
          ) : (
            <div
              className="w-12 h-12 rounded-full flex items-center justify-center text-sm font-medium"
              style={{
                background: "var(--matcha-100)",
                color: "var(--matcha-700)",
              }}
            >
              {initials}
            </div>
          )}
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0">
          <h3
            className="font-medium truncate"
            style={{ color: "var(--text-primary)" }}
          >
            {request.name}
          </h3>
          <p
            className="text-sm truncate"
            style={{ color: "var(--text-secondary)" }}
          >
            {request.email}
          </p>
          <p
            className="text-xs mt-1"
            style={{ color: "var(--text-muted)" }}
          >
            {type === "received" ? "Sent you a request" : "Request sent"} {formatTime(request.createdAt)}
          </p>
        </div>
      </div>

      {/* Languages */}
      {request.spokenLanguages.length > 0 && (
        <div className="flex flex-wrap gap-1 mt-3">
          {request.spokenLanguages.map((lang) => (
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

      {/* Error */}
      {error && (
        <p className="text-sm mt-3" style={{ color: "var(--terra-500)" }}>
          {error}
        </p>
      )}

      {/* Actions */}
      <div className="flex gap-2 mt-4">
        {type === "received" ? (
          <>
            <button
              onClick={handleAccept}
              disabled={isLoading}
              className="flex-1 matcha-btn matcha-btn-primary py-2 text-sm disabled:opacity-50"
            >
              Accept
            </button>
            <button
              onClick={handleReject}
              disabled={isLoading}
              className="flex-1 matcha-btn matcha-btn-secondary py-2 text-sm disabled:opacity-50"
            >
              Decline
            </button>
          </>
        ) : (
          <button
            onClick={handleCancel}
            disabled={isLoading}
            className="flex-1 matcha-btn matcha-btn-secondary py-2 text-sm disabled:opacity-50"
          >
            Cancel Request
          </button>
        )}
      </div>
    </div>
  );
};

export default FriendRequestCard;
