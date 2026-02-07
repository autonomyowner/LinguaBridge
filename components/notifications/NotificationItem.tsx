import React from "react";
import { useMutation } from "convex/react";
import { useNavigate } from "react-router-dom";
import { api } from "../../convex/_generated/api";
import { Doc } from "../../convex/_generated/dataModel";
import { useAuth } from "../../providers/AuthContext";

interface NotificationItemProps {
  notification: Doc<"notifications">;
  onClose: () => void;
}

const NotificationItem: React.FC<NotificationItemProps> = ({
  notification,
  onClose,
}) => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const markAsRead = useMutation(api.notifications.mutations.markAsRead);

  const handleClick = async () => {
    // Mark as read
    if (!notification.isRead) {
      await markAsRead({ notificationId: notification._id, userEmail: user?.email });
    }

    // Navigate based on type
    switch (notification.type) {
      case "friend_request":
      case "friend_accepted":
        navigate("/friends");
        break;
      case "message":
        navigate("/messages");
        break;
      case "room_invite":
        navigate("/friends?tab=invites");
        break;
    }

    onClose();
  };

  const getTypeStyles = () => {
    switch (notification.type) {
      case "friend_request":
        return { bg: "var(--matcha-100)", color: "var(--matcha-600)" };
      case "friend_accepted":
        return { bg: "var(--matcha-100)", color: "var(--matcha-600)" };
      case "message":
        return { bg: "#e0f2fe", color: "#0284c7" };
      case "room_invite":
        return { bg: "var(--terra-100)", color: "var(--terra-600)" };
      default:
        return { bg: "var(--bg-elevated)", color: "var(--text-secondary)" };
    }
  };

  const getTypeIcon = () => {
    switch (notification.type) {
      case "friend_request":
        return (
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
            <circle cx="8.5" cy="7" r="4" />
            <line x1="20" y1="8" x2="20" y2="14" />
            <line x1="23" y1="11" x2="17" y2="11" />
          </svg>
        );
      case "friend_accepted":
        return (
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
            <circle cx="8.5" cy="7" r="4" />
            <polyline points="17 11 19 13 23 9" />
          </svg>
        );
      case "message":
        return (
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
          </svg>
        );
      case "room_invite":
        return (
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
            <circle cx="9" cy="7" r="4" />
            <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
            <path d="M16 3.13a4 4 0 0 1 0 7.75" />
          </svg>
        );
      default:
        return null;
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

  const styles = getTypeStyles();

  return (
    <button
      onClick={handleClick}
      className="w-full px-4 py-3 flex items-start gap-3 text-left transition-colors hover:bg-black/5"
      style={{
        background: notification.isRead ? "transparent" : "var(--bg-elevated)",
      }}
    >
      {/* Icon */}
      <div
        className="flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center"
        style={{ background: styles.bg, color: styles.color }}
      >
        {getTypeIcon()}
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        {notification.title && (
          <p
            className="text-sm font-medium truncate"
            style={{ color: "var(--text-primary)" }}
          >
            {notification.title}
          </p>
        )}
        {notification.body && (
          <p
            className="text-sm truncate"
            style={{ color: "var(--text-secondary)" }}
          >
            {notification.body}
          </p>
        )}
        <p
          className="text-xs mt-1"
          style={{ color: "var(--text-muted)" }}
        >
          {formatTime(notification.createdAt)}
        </p>
      </div>

      {/* Unread indicator */}
      {!notification.isRead && (
        <div
          className="flex-shrink-0 w-2 h-2 rounded-full mt-2"
          style={{ background: "var(--matcha-500)" }}
        />
      )}
    </button>
  );
};

export default NotificationItem;
