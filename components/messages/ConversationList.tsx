import React from "react";
import { Id } from "../../convex/_generated/dataModel";
import { useLanguage } from "../../providers/LanguageContext";

interface Conversation {
  partnerId: Id<"users">;
  partnerName: string;
  partnerEmail: string;
  partnerImageUrl?: string;
  lastMessage: {
    content: string;
    type: "text" | "voice";
    createdAt: number;
    isFromMe: boolean;
  } | null;
  unreadCount: number;
}

interface ConversationListProps {
  conversations: Conversation[];
  selectedId?: Id<"users">;
  onSelect: (partnerId: Id<"users">) => void;
  isLoading?: boolean;
}

const ConversationList: React.FC<ConversationListProps> = ({
  conversations,
  selectedId,
  onSelect,
  isLoading,
}) => {
  const { t } = useLanguage();

  const formatTime = (timestamp: number) => {
    const now = Date.now();
    const diff = now - timestamp;
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 1) return t("time.now");
    if (minutes < 60) return t("time.minutesAgo").replace("{n}", String(minutes));
    if (hours < 24) return t("time.hoursAgo").replace("{n}", String(hours));
    if (days < 7) return t("time.daysAgo").replace("{n}", String(days));
    return new Date(timestamp).toLocaleDateString();
  };

  if (isLoading) {
    return (
      <div className="space-y-2 p-3">
        {[...Array(5)].map((_, i) => (
          <div
            key={i}
            className="flex items-center gap-3 p-3 rounded-lg animate-pulse"
            style={{ background: "var(--bg-elevated)" }}
          >
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
        ))}
      </div>
    );
  }

  if (conversations.length === 0) {
    return (
      <div className="p-8 text-center">
        <div
          className="w-16 h-16 mx-auto mb-4 rounded-full flex items-center justify-center"
          style={{ background: "var(--bg-elevated)" }}
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
            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
          </svg>
        </div>
        <p style={{ color: "var(--text-muted)" }}>{t("messages.noConversations")}</p>
        <p className="text-sm mt-1" style={{ color: "var(--text-muted)" }}>
          {t("messages.messageToStart")}
        </p>
      </div>
    );
  }

  return (
    <div className="divide-y" style={{ borderColor: "var(--border-soft)" }}>
      {conversations.map((conv) => {
        const initials = conv.partnerName
          .split(" ")
          .map((n) => n[0])
          .join("")
          .toUpperCase()
          .slice(0, 2);

        const isSelected = selectedId === conv.partnerId;

        return (
          <button
            key={conv.partnerId}
            onClick={() => onSelect(conv.partnerId)}
            className="w-full flex items-center gap-3 p-3 transition-colors text-left hover:bg-black/5"
            style={{
              background: isSelected ? "var(--matcha-50)" : "transparent",
            }}
          >
            {/* Avatar */}
            <div className="relative flex-shrink-0">
              {conv.partnerImageUrl ? (
                <img
                  src={conv.partnerImageUrl}
                  alt={conv.partnerName}
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

            {/* Content */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between mb-1">
                <span
                  className="font-medium truncate"
                  style={{
                    color: conv.unreadCount > 0 ? "var(--text-primary)" : "var(--text-secondary)",
                  }}
                >
                  {conv.partnerName}
                </span>
                {conv.lastMessage && (
                  <span
                    className="text-xs flex-shrink-0 ml-2"
                    style={{ color: "var(--text-muted)" }}
                  >
                    {formatTime(conv.lastMessage.createdAt)}
                  </span>
                )}
              </div>
              <div className="flex items-center justify-between">
                <p
                  className="text-sm truncate"
                  style={{
                    color: conv.unreadCount > 0 ? "var(--text-primary)" : "var(--text-muted)",
                    fontWeight: conv.unreadCount > 0 ? 500 : 400,
                  }}
                >
                  {conv.lastMessage ? (
                    <>
                      {conv.lastMessage.isFromMe && t("messages.you") + " "}
                      {conv.lastMessage.content}
                    </>
                  ) : (
                    <span style={{ fontStyle: "italic" }}>{t("messages.noMessages")}</span>
                  )}
                </p>
                {conv.unreadCount > 0 && (
                  <span
                    className="flex-shrink-0 ml-2 min-w-[20px] h-5 px-1.5 flex items-center justify-center rounded-full text-xs font-medium"
                    style={{
                      background: "var(--matcha-500)",
                      color: "white",
                    }}
                  >
                    {conv.unreadCount}
                  </span>
                )}
              </div>
            </div>
          </button>
        );
      })}
    </div>
  );
};

export default ConversationList;
