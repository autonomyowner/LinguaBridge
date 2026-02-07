import React, { useEffect, useRef } from "react";
import { Doc } from "../../convex/_generated/dataModel";
import VoicePlayer from "./VoicePlayer";
import { useLanguage } from "../../providers/LanguageContext";

interface Message extends Doc<"messages"> {
  isFromMe: boolean;
}

interface MessageThreadProps {
  messages: Message[];
  isLoading?: boolean;
}

const MessageThread: React.FC<MessageThreadProps> = ({
  messages,
  isLoading,
}) => {
  const bottomRef = useRef<HTMLDivElement>(null);
  const { t } = useLanguage();

  // Scroll to bottom when messages change
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const formatTime = (timestamp: number) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  };

  const formatDate = (timestamp: number) => {
    const date = new Date(timestamp);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    if (date.toDateString() === today.toDateString()) {
      return t("time.today");
    }
    if (date.toDateString() === yesterday.toDateString()) {
      return t("time.yesterday");
    }
    return date.toLocaleDateString([], {
      weekday: "long",
      month: "short",
      day: "numeric",
    });
  };

  // Group messages by date
  const groupedMessages: { date: string; messages: Message[] }[] = [];
  let currentDate = "";

  for (const message of messages) {
    const msgDate = formatDate(message.createdAt);
    if (msgDate !== currentDate) {
      currentDate = msgDate;
      groupedMessages.push({ date: msgDate, messages: [message] });
    } else {
      groupedMessages[groupedMessages.length - 1].messages.push(message);
    }
  }

  if (isLoading) {
    return (
      <div className="flex-1 p-4 space-y-4 overflow-y-auto">
        {[...Array(5)].map((_, i) => (
          <div
            key={i}
            className={`flex ${i % 2 === 0 ? "justify-end" : "justify-start"}`}
          >
            <div
              className="h-12 w-48 rounded-2xl animate-pulse"
              style={{ background: "var(--bg-elevated)" }}
            />
          </div>
        ))}
      </div>
    );
  }

  if (messages.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="text-center">
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
          <p style={{ color: "var(--text-muted)" }}>{t("messages.noMessagesYet")}</p>
          <p className="text-sm mt-1" style={{ color: "var(--text-muted)" }}>
            {t("messages.sendToStart")}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto p-4 space-y-4">
      {groupedMessages.map((group) => (
        <div key={group.date}>
          {/* Date separator */}
          <div className="flex items-center justify-center my-4">
            <span
              className="px-3 py-1 rounded-full text-xs"
              style={{
                background: "var(--bg-elevated)",
                color: "var(--text-muted)",
              }}
            >
              {group.date}
            </span>
          </div>

          {/* Messages */}
          <div className="space-y-2">
            {group.messages.map((message) => (
              <div
                key={message._id}
                className={`flex ${message.isFromMe ? "justify-end" : "justify-start"}`}
              >
                <div
                  className={`max-w-[75%] rounded-2xl px-4 py-2 ${
                    message.isFromMe
                      ? "rounded-br-md"
                      : "rounded-bl-md"
                  }`}
                  style={{
                    background: message.isFromMe
                      ? "var(--matcha-500)"
                      : "var(--bg-elevated)",
                    color: message.isFromMe
                      ? "white"
                      : "var(--text-primary)",
                  }}
                >
                  {message.type === "text" ? (
                    <p className="text-sm whitespace-pre-wrap break-words">
                      {message.content}
                    </p>
                  ) : (
                    <VoicePlayer
                      storageId={message.content}
                      duration={message.duration ?? 0}
                      isFromMe={message.isFromMe}
                    />
                  )}
                  <p
                    className="text-xs mt-1 text-right"
                    style={{
                      color: message.isFromMe
                        ? "rgba(255,255,255,0.7)"
                        : "var(--text-muted)",
                    }}
                  >
                    {formatTime(message.createdAt)}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}
      <div ref={bottomRef} />
    </div>
  );
};

export default MessageThread;
