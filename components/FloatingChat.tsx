import React, { useState, useEffect, useRef } from "react";
import { useQuery, useMutation, useAction } from "convex/react";
import { api } from "../convex/_generated/api";
import { Id } from "../convex/_generated/dataModel";
import { useAuth } from "../providers/AuthContext";
import { useLanguage } from "../providers/LanguageContext";
import { MessageThread, MessageInput } from "./messages";

const FloatingChat: React.FC = () => {
  const { user, isAuthenticated } = useAuth();
  const { t } = useLanguage();
  const [isOpen, setIsOpen] = useState(false);
  const [selectedFriendId, setSelectedFriendId] = useState<Id<"users"> | null>(null);
  const [selectedFriendName, setSelectedFriendName] = useState<string>("");
  const containerRef = useRef<HTMLDivElement>(null);

  // Data - pass email as fallback when Convex auth token isn't synced
  const conversations = useQuery(
    api.messages.queries.listConversations,
    isAuthenticated ? { userEmail: user?.email } : "skip"
  );
  const conversation = useQuery(
    api.messages.queries.getConversation,
    selectedFriendId ? { friendId: selectedFriendId, userEmail: user?.email } : "skip"
  );
  const unreadCount = useQuery(
    api.messages.queries.getUnreadCount,
    isAuthenticated ? { userEmail: user?.email } : "skip"
  );

  // Mutations & Actions
  const sendTextWithTranslation = useAction(api.messages.actions.sendTextWithTranslation);
  const sendVoice = useMutation(api.messages.mutations.sendVoice);
  const markAsRead = useMutation(api.messages.mutations.markAsRead);
  const generateUploadUrl = useMutation(api.messages.mutations.generateUploadUrl);

  // Mark as read when chat opens
  useEffect(() => {
    if (selectedFriendId && conversation?.messages.some((m) => !m.isFromMe && !m.isRead)) {
      markAsRead({ friendId: selectedFriendId });
    }
  }, [selectedFriendId, conversation, markAsRead]);

  // Close on click outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        if (isOpen && !selectedFriendId) {
          setIsOpen(false);
        }
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isOpen, selectedFriendId]);

  // Don't show if not authenticated or no conversations
  if (!isAuthenticated || !user) return null;

  const handleSelectFriend = (friendId: Id<"users">, friendName: string) => {
    setSelectedFriendId(friendId);
    setSelectedFriendName(friendName);
  };

  const handleBack = () => {
    setSelectedFriendId(null);
    setSelectedFriendName("");
  };

  const handleClose = () => {
    setIsOpen(false);
    setSelectedFriendId(null);
    setSelectedFriendName("");
  };

  const handleSendText = async (content: string) => {
    if (!selectedFriendId) return;
    await sendTextWithTranslation({ friendId: selectedFriendId, content });
  };

  const handleSendVoice = async (blob: Blob, duration: number) => {
    if (!selectedFriendId) return;

    const uploadUrl = await generateUploadUrl({});
    const response = await fetch(uploadUrl, {
      method: "POST",
      headers: { "Content-Type": blob.type },
      body: blob,
    });

    if (!response.ok) throw new Error("Failed to upload");

    const { storageId } = await response.json();
    await sendVoice({ friendId: selectedFriendId, storageId, duration });
  };

  const totalUnread = unreadCount ?? 0;

  return (
    <div
      ref={containerRef}
      className="fixed bottom-6 right-6 z-50 md:hidden"
    >
      {/* Chat Window */}
      {selectedFriendId && (
        <div
          className="absolute bottom-20 right-0 w-[calc(100vw-48px)] max-w-[360px] rounded-2xl overflow-hidden shadow-2xl"
          style={{
            background: "var(--bg-card)",
            border: "1px solid var(--border-soft)",
            height: "70vh",
            maxHeight: "500px",
          }}
        >
          {/* Chat Header */}
          <div
            className="flex items-center gap-3 p-4 border-b"
            style={{
              background: "var(--matcha-500)",
              borderColor: "var(--matcha-600)",
            }}
          >
            <button
              onClick={handleBack}
              className="p-1.5 rounded-lg hover:bg-white/20 transition-colors"
            >
              <svg
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                stroke="white"
                strokeWidth="2"
              >
                <path d="M19 12H5M12 19l-7-7 7-7" />
              </svg>
            </button>
            <div className="flex-1 min-w-0">
              <p className="font-medium text-white truncate">{selectedFriendName}</p>
            </div>
            <button
              onClick={handleClose}
              className="p-1.5 rounded-lg hover:bg-white/20 transition-colors"
            >
              <svg
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                stroke="white"
                strokeWidth="2"
              >
                <path d="M18 6L6 18M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Messages */}
          <div className="flex flex-col" style={{ height: "calc(100% - 60px)" }}>
            <MessageThread
              messages={conversation?.messages ?? []}
              isLoading={!conversation}
            />
            <MessageInput
              onSendText={handleSendText}
              onSendVoice={handleSendVoice}
            />
          </div>
        </div>
      )}

      {/* Friend Bubbles Dropdown */}
      {isOpen && !selectedFriendId && (
        <div
          className="absolute bottom-20 right-0 p-3 rounded-2xl shadow-xl"
          style={{
            background: "var(--bg-card)",
            border: "1px solid var(--border-soft)",
            minWidth: "200px",
            maxHeight: "300px",
            overflowY: "auto",
          }}
        >
          {/* Header */}
          <div className="flex items-center justify-between mb-3 px-1">
            <span
              className="text-sm font-medium"
              style={{ color: "var(--text-primary)" }}
            >
              {t("messages.title")}
            </span>
            <button
              onClick={() => setIsOpen(false)}
              className="p-1 rounded-lg hover:bg-black/5 transition-colors"
            >
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                style={{ color: "var(--text-muted)" }}
              >
                <path d="M18 6L6 18M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Friend Bubbles */}
          {conversations && conversations.length > 0 ? (
            <div className="space-y-2">
              {conversations.map((conv) => {
                const initials = conv.partnerName
                  .split(" ")
                  .map((n) => n[0])
                  .join("")
                  .toUpperCase()
                  .slice(0, 2);

                return (
                  <button
                    key={conv.partnerId}
                    onClick={() => handleSelectFriend(conv.partnerId, conv.partnerName)}
                    className="w-full flex items-center gap-3 p-2 rounded-xl transition-colors hover:bg-black/5"
                  >
                    {/* Avatar */}
                    <div className="relative flex-shrink-0">
                      {conv.partnerImageUrl ? (
                        <img
                          src={conv.partnerImageUrl}
                          alt={conv.partnerName}
                          className="w-10 h-10 rounded-full object-cover"
                        />
                      ) : (
                        <div
                          className="w-10 h-10 rounded-full flex items-center justify-center text-xs font-medium"
                          style={{
                            background: "var(--matcha-100)",
                            color: "var(--matcha-700)",
                          }}
                        >
                          {initials}
                        </div>
                      )}
                      {/* Unread badge */}
                      {conv.unreadCount > 0 && (
                        <span
                          className="absolute -top-1 -right-1 min-w-[18px] h-[18px] flex items-center justify-center rounded-full text-[10px] font-bold"
                          style={{
                            background: "var(--terra-500)",
                            color: "white",
                          }}
                        >
                          {conv.unreadCount}
                        </span>
                      )}
                    </div>

                    {/* Name & Preview */}
                    <div className="flex-1 min-w-0 text-left">
                      <p
                        className="text-sm font-medium truncate"
                        style={{
                          color: conv.unreadCount > 0 ? "var(--text-primary)" : "var(--text-secondary)",
                        }}
                      >
                        {conv.partnerName}
                      </p>
                      {conv.lastMessage && (
                        <p
                          className="text-xs truncate"
                          style={{ color: "var(--text-muted)" }}
                        >
                          {conv.lastMessage.type === "voice" ? t("messages.voiceMessage") : conv.lastMessage.content}
                        </p>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          ) : (
            <div className="text-center py-4">
              <p className="text-sm" style={{ color: "var(--text-muted)" }}>
                {t("messages.noConversations")}
              </p>
            </div>
          )}
        </div>
      )}

      {/* Floating Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-14 h-14 rounded-full flex items-center justify-center shadow-lg transition-transform active:scale-95"
        style={{
          background: "linear-gradient(135deg, var(--matcha-500) 0%, var(--matcha-600) 100%)",
          boxShadow: "0 4px 20px rgba(104, 166, 125, 0.4)",
        }}
      >
        {isOpen ? (
          <svg
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="white"
            strokeWidth="2"
          >
            <path d="M18 6L6 18M6 6l12 12" />
          </svg>
        ) : (
          <svg
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="white"
            strokeWidth="2"
          >
            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
          </svg>
        )}

        {/* Unread Badge */}
        {totalUnread > 0 && !isOpen && (
          <span
            className="absolute -top-1 -right-1 min-w-[22px] h-[22px] flex items-center justify-center rounded-full text-xs font-bold"
            style={{
              background: "var(--terra-500)",
              color: "white",
              border: "2px solid white",
            }}
          >
            {totalUnread > 99 ? "99+" : totalUnread}
          </span>
        )}
      </button>
    </div>
  );
};

export default FloatingChat;
