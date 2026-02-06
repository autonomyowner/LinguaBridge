import React, { useState } from "react";
import { useMutation } from "convex/react";
import { useNavigate } from "react-router-dom";
import { api } from "../../convex/_generated/api";
import { Id } from "../../convex/_generated/dataModel";

interface RoomInviteCardProps {
  invitation: {
    _id: Id<"roomInvitations">;
    inviteCode: string;
    inviter: {
      _id: Id<"users">;
      name: string;
      email: string;
      imageUrl?: string;
    };
    room: {
      _id: Id<"rooms">;
      name: string;
      description?: string;
      defaultSourceLanguage: string;
      defaultTargetLanguage: string;
    };
    expiresAt: number;
    createdAt: number;
  };
}

const RoomInviteCard: React.FC<RoomInviteCardProps> = ({ invitation }) => {
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(false);
  const acceptInvite = useMutation(api.invitations.mutations.accept);
  const declineInvite = useMutation(api.invitations.mutations.decline);

  const handleAccept = async () => {
    setIsLoading(true);
    try {
      const result = await acceptInvite({ invitationId: invitation._id });
      navigate(`/translate?room=${result.roomId}`);
    } catch (error) {
      console.error("Failed to accept invite:", error);
      alert(error instanceof Error ? error.message : "Failed to join room");
    } finally {
      setIsLoading(false);
    }
  };

  const handleDecline = async () => {
    setIsLoading(true);
    try {
      await declineInvite({ invitationId: invitation._id });
    } catch (error) {
      console.error("Failed to decline invite:", error);
    } finally {
      setIsLoading(false);
    }
  };

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

  const formatExpiry = (timestamp: number) => {
    const now = Date.now();
    const diff = timestamp - now;
    const hours = Math.floor(diff / 3600000);
    const minutes = Math.floor((diff % 3600000) / 60000);

    if (diff <= 0) return "Expired";
    if (hours < 1) return `${minutes}m left`;
    if (hours < 24) return `${hours}h left`;
    return `${Math.floor(hours / 24)}d left`;
  };

  const initials = invitation.inviter.name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  return (
    <div
      className="p-4 rounded-xl"
      style={{
        background: "var(--bg-card)",
        border: "1px solid var(--border-soft)",
      }}
    >
      {/* Header - Inviter info */}
      <div className="flex items-center gap-3 mb-4">
        {invitation.inviter.imageUrl ? (
          <img
            src={invitation.inviter.imageUrl}
            alt={invitation.inviter.name}
            className="w-10 h-10 rounded-full object-cover flex-shrink-0"
          />
        ) : (
          <div
            className="w-10 h-10 rounded-full flex items-center justify-center text-sm font-medium flex-shrink-0"
            style={{
              background: "var(--matcha-100)",
              color: "var(--matcha-700)",
            }}
          >
            {initials}
          </div>
        )}
        <div className="flex-1 min-w-0">
          <p style={{ color: "var(--text-primary)" }}>
            <span className="font-medium">{invitation.inviter.name}</span>
            <span style={{ color: "var(--text-secondary)" }}> invited you to join</span>
          </p>
          <p
            className="text-xs"
            style={{ color: "var(--text-muted)" }}
          >
            {formatTime(invitation.createdAt)}
          </p>
        </div>
      </div>

      {/* Room info */}
      <div
        className="p-4 rounded-xl mb-4"
        style={{ background: "var(--bg-elevated)" }}
      >
        <div className="flex items-start justify-between mb-2">
          <h3
            className="font-semibold text-lg"
            style={{ color: "var(--text-primary)" }}
          >
            {invitation.room.name}
          </h3>
          <span
            className="text-xs px-2 py-1 rounded-full flex-shrink-0"
            style={{
              background: "var(--terra-100)",
              color: "var(--terra-600)",
            }}
          >
            {formatExpiry(invitation.expiresAt)}
          </span>
        </div>

        {invitation.room.description && (
          <p
            className="text-sm mb-3"
            style={{ color: "var(--text-secondary)" }}
          >
            {invitation.room.description}
          </p>
        )}

        <div className="flex items-center gap-2 text-sm">
          <span style={{ color: "var(--text-muted)" }}>Languages:</span>
          <span
            className="px-2 py-0.5 rounded"
            style={{
              background: "var(--bg-card)",
              color: "var(--text-secondary)",
            }}
          >
            {invitation.room.defaultSourceLanguage}
          </span>
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            style={{ color: "var(--text-muted)" }}
          >
            <path d="M5 12h14" />
            <path d="M12 5l7 7-7 7" />
          </svg>
          <span
            className="px-2 py-0.5 rounded"
            style={{
              background: "var(--bg-card)",
              color: "var(--text-secondary)",
            }}
          >
            {invitation.room.defaultTargetLanguage}
          </span>
        </div>
      </div>

      {/* Actions */}
      <div className="flex gap-3">
        <button
          onClick={handleAccept}
          disabled={isLoading}
          className="flex-1 matcha-btn matcha-btn-primary py-2.5 disabled:opacity-50"
        >
          {isLoading ? "Joining..." : "Join Room"}
        </button>
        <button
          onClick={handleDecline}
          disabled={isLoading}
          className="flex-1 matcha-btn matcha-btn-secondary py-2.5 disabled:opacity-50"
        >
          Decline
        </button>
      </div>
    </div>
  );
};

export default RoomInviteCard;
