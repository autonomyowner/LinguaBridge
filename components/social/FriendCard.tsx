import React from "react";
import { useMutation } from "convex/react";
import { useNavigate } from "react-router-dom";
import { api } from "../../convex/_generated/api";
import { Id } from "../../convex/_generated/dataModel";

interface FriendCardProps {
  friend: {
    _id: Id<"users">;
    name: string;
    email: string;
    imageUrl?: string;
    spokenLanguages: string[];
    isOnline?: boolean;
  };
  showMessage?: boolean;
  showUnfriend?: boolean;
}

const FriendCard: React.FC<FriendCardProps> = ({
  friend,
  showMessage = true,
  showUnfriend = true,
}) => {
  const navigate = useNavigate();
  const unfriend = useMutation(api.friends.mutations.unfriend);
  const [isUnfriending, setIsUnfriending] = React.useState(false);

  const handleUnfriend = async () => {
    if (!confirm(`Remove ${friend.name} from friends?`)) return;

    setIsUnfriending(true);
    try {
      await unfriend({ userId: friend._id });
    } catch (error) {
      console.error("Failed to unfriend:", error);
    } finally {
      setIsUnfriending(false);
    }
  };

  const handleMessage = () => {
    navigate(`/messages?friendId=${friend._id}`);
  };

  // Get initials for avatar fallback
  const initials = friend.name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  return (
    <div
      className="p-4 rounded-xl flex items-center gap-4"
      style={{
        background: "var(--bg-card)",
        border: "1px solid var(--border-soft)",
      }}
    >
      {/* Avatar */}
      <div className="relative flex-shrink-0">
        {friend.imageUrl ? (
          <img
            src={friend.imageUrl}
            alt={friend.name}
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
        {/* Online indicator */}
        {friend.isOnline && (
          <div
            className="absolute bottom-0 right-0 w-3 h-3 rounded-full border-2"
            style={{
              background: "#22c55e",
              borderColor: "var(--bg-card)",
            }}
          />
        )}
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <h3
          className="font-medium truncate"
          style={{ color: "var(--text-primary)" }}
        >
          {friend.name}
        </h3>
        <p
          className="text-sm truncate"
          style={{ color: "var(--text-secondary)" }}
        >
          {friend.email}
        </p>
        {friend.spokenLanguages.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-1">
            {friend.spokenLanguages.slice(0, 3).map((lang) => (
              <span
                key={lang}
                className="text-xs px-1.5 py-0.5 rounded"
                style={{
                  background: "var(--bg-elevated)",
                  color: "var(--text-muted)",
                }}
              >
                {lang}
              </span>
            ))}
            {friend.spokenLanguages.length > 3 && (
              <span
                className="text-xs"
                style={{ color: "var(--text-muted)" }}
              >
                +{friend.spokenLanguages.length - 3}
              </span>
            )}
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="flex items-center gap-2 flex-shrink-0">
        {showMessage && (
          <button
            onClick={handleMessage}
            className="p-2 rounded-lg transition-colors hover:bg-black/5"
            title="Send message"
          >
            <svg
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              style={{ color: "var(--matcha-600)" }}
            >
              <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
            </svg>
          </button>
        )}
        {showUnfriend && (
          <button
            onClick={handleUnfriend}
            disabled={isUnfriending}
            className="p-2 rounded-lg transition-colors hover:bg-black/5 disabled:opacity-50"
            title="Remove friend"
          >
            <svg
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              style={{ color: "var(--terra-500)" }}
            >
              <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
              <circle cx="8.5" cy="7" r="4" />
              <line x1="18" y1="8" x2="23" y2="13" />
              <line x1="23" y1="8" x2="18" y2="13" />
            </svg>
          </button>
        )}
      </div>
    </div>
  );
};

export default FriendCard;
