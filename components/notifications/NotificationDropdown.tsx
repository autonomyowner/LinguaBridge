import React from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import NotificationItem from "./NotificationItem";
import { useAuth } from "../../providers/AuthContext";
import { useLanguage } from "../../providers/LanguageContext";

interface NotificationDropdownProps {
  onClose: () => void;
}

const NotificationDropdown: React.FC<NotificationDropdownProps> = ({ onClose }) => {
  const { user } = useAuth();
  const { t } = useLanguage();
  const notifications = useQuery(api.notifications.queries.list, { limit: 10 });
  const markAllAsRead = useMutation(api.notifications.mutations.markAllAsRead);

  const handleMarkAllAsRead = async () => {
    await markAllAsRead({});
  };

  const unreadCount = notifications?.filter((n) => !n.isRead).length ?? 0;

  return (
    <div
      className="absolute right-0 top-full mt-2 w-80 max-h-96 overflow-y-auto rounded-xl shadow-lg z-50"
      style={{
        background: "var(--bg-card)",
        border: "1px solid var(--border-soft)",
      }}
    >
      {/* Header */}
      <div
        className="flex items-center justify-between px-4 py-3 border-b"
        style={{ borderColor: "var(--border-soft)" }}
      >
        <h3
          className="font-semibold"
          style={{ color: "var(--text-primary)" }}
        >
          {t("notifications.title")}
        </h3>
        {unreadCount > 0 && (
          <button
            onClick={handleMarkAllAsRead}
            className="text-sm transition-colors hover:underline"
            style={{ color: "var(--matcha-600)" }}
          >
            {t("notifications.markAllRead")}
          </button>
        )}
      </div>

      {/* Notification List */}
      <div className="divide-y" style={{ borderColor: "var(--border-soft)" }}>
        {notifications === undefined ? (
          // Loading state
          <div className="p-4 text-center">
            <div
              className="animate-pulse h-4 rounded"
              style={{ background: "var(--bg-elevated)" }}
            />
          </div>
        ) : notifications.length === 0 ? (
          // Empty state
          <div className="p-8 text-center">
            <div
              className="w-12 h-12 mx-auto mb-3 rounded-full flex items-center justify-center"
              style={{ background: "var(--bg-elevated)" }}
            >
              <svg
                width="24"
                height="24"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                style={{ color: "var(--text-muted)" }}
              >
                <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
                <path d="M13.73 21a2 2 0 0 1-3.46 0" />
              </svg>
            </div>
            <p
              className="text-sm"
              style={{ color: "var(--text-muted)" }}
            >
              {t("notifications.empty")}
            </p>
          </div>
        ) : (
          // Notifications list
          notifications.map((notification) => (
            <NotificationItem
              key={notification._id}
              notification={notification}
              onClose={onClose}
            />
          ))
        )}
      </div>

      {/* Footer */}
      {notifications && notifications.length > 0 && (
        <div
          className="px-4 py-3 border-t text-center"
          style={{ borderColor: "var(--border-soft)" }}
        >
          <a
            href="/friends"
            onClick={onClose}
            className="text-sm transition-colors hover:underline"
            style={{ color: "var(--matcha-600)" }}
          >
            {t("notifications.viewAll")}
          </a>
        </div>
      )}
    </div>
  );
};

export default NotificationDropdown;
