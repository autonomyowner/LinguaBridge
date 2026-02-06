import React, { useState, useEffect } from "react";
import { useQuery, useMutation } from "convex/react";
import { useSearchParams } from "react-router-dom";
import { api } from "../convex/_generated/api";
import { Id } from "../convex/_generated/dataModel";
import Header from "../components/Header";
import { ConversationList, MessageThread, MessageInput } from "../components/messages";

const MessagesPage: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const initialFriendId = searchParams.get("friendId") as Id<"users"> | null;
  const [selectedFriendId, setSelectedFriendId] = useState<Id<"users"> | null>(
    initialFriendId
  );

  // Data
  const conversations = useQuery(api.messages.queries.listConversations);
  const conversation = useQuery(
    api.messages.queries.getConversation,
    selectedFriendId ? { friendId: selectedFriendId } : "skip"
  );

  // Mutations
  const sendText = useMutation(api.messages.mutations.sendText);
  const sendVoice = useMutation(api.messages.mutations.sendVoice);
  const markAsRead = useMutation(api.messages.mutations.markAsRead);
  const generateUploadUrl = useMutation(api.messages.mutations.generateUploadUrl);

  // Update URL when selection changes
  useEffect(() => {
    if (selectedFriendId) {
      setSearchParams({ friendId: selectedFriendId });
    } else {
      setSearchParams({});
    }
  }, [selectedFriendId, setSearchParams]);

  // Mark messages as read when conversation opens
  useEffect(() => {
    if (selectedFriendId && conversation?.messages.some((m) => !m.isFromMe && !m.isRead)) {
      markAsRead({ friendId: selectedFriendId });
    }
  }, [selectedFriendId, conversation, markAsRead]);

  const handleSelectConversation = (partnerId: Id<"users">) => {
    setSelectedFriendId(partnerId);
  };

  const handleSendText = async (content: string) => {
    if (!selectedFriendId) return;
    await sendText({ friendId: selectedFriendId, content });
  };

  const handleSendVoice = async (blob: Blob, duration: number) => {
    if (!selectedFriendId) return;

    // Upload the audio file
    const uploadUrl = await generateUploadUrl();
    const response = await fetch(uploadUrl, {
      method: "POST",
      headers: { "Content-Type": blob.type },
      body: blob,
    });

    if (!response.ok) {
      throw new Error("Failed to upload voice message");
    }

    const { storageId } = await response.json();

    // Send the voice message
    await sendVoice({
      friendId: selectedFriendId,
      storageId,
      duration,
    });
  };

  return (
    <div className="min-h-screen flex flex-col" style={{ background: "var(--bg-page)" }}>
      <Header />

      <main className="flex-1 flex overflow-hidden">
        <div className="max-w-6xl mx-auto w-full flex">
          {/* Sidebar - Conversations */}
          <div
            className={`w-full md:w-80 flex-shrink-0 border-r flex flex-col ${
              selectedFriendId ? "hidden md:flex" : "flex"
            }`}
            style={{
              borderColor: "var(--border-soft)",
              background: "var(--bg-card)",
            }}
          >
            {/* Header */}
            <div
              className="px-4 py-4 border-b"
              style={{ borderColor: "var(--border-soft)" }}
            >
              <h1
                className="text-xl font-semibold"
                style={{ color: "var(--text-primary)" }}
              >
                Messages
              </h1>
            </div>

            {/* Conversation list */}
            <div className="flex-1 overflow-y-auto">
              <ConversationList
                conversations={conversations ?? []}
                selectedId={selectedFriendId ?? undefined}
                onSelect={handleSelectConversation}
                isLoading={conversations === undefined}
              />
            </div>
          </div>

          {/* Main - Chat area */}
          <div
            className={`flex-1 flex flex-col ${
              !selectedFriendId ? "hidden md:flex" : "flex"
            }`}
            style={{ background: "var(--bg-page)" }}
          >
            {selectedFriendId && conversation?.friend ? (
              <>
                {/* Chat header */}
                <div
                  className="px-4 py-3 border-b flex items-center gap-3"
                  style={{
                    borderColor: "var(--border-soft)",
                    background: "var(--bg-card)",
                  }}
                >
                  {/* Back button (mobile) */}
                  <button
                    onClick={() => setSelectedFriendId(null)}
                    className="md:hidden p-2 -ml-2 rounded-lg transition-colors hover:bg-black/5"
                  >
                    <svg
                      width="20"
                      height="20"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      style={{ color: "var(--text-secondary)" }}
                    >
                      <path d="M19 12H5" />
                      <path d="M12 19l-7-7 7-7" />
                    </svg>
                  </button>

                  {/* Avatar */}
                  {conversation.friend.imageUrl ? (
                    <img
                      src={conversation.friend.imageUrl}
                      alt={conversation.friend.name}
                      className="w-10 h-10 rounded-full object-cover"
                    />
                  ) : (
                    <div
                      className="w-10 h-10 rounded-full flex items-center justify-center text-sm font-medium"
                      style={{
                        background: "var(--matcha-100)",
                        color: "var(--matcha-700)",
                      }}
                    >
                      {conversation.friend.name
                        .split(" ")
                        .map((n) => n[0])
                        .join("")
                        .toUpperCase()
                        .slice(0, 2)}
                    </div>
                  )}

                  {/* Name */}
                  <div className="flex-1 min-w-0">
                    <h2
                      className="font-medium truncate"
                      style={{ color: "var(--text-primary)" }}
                    >
                      {conversation.friend.name}
                    </h2>
                    <p
                      className="text-sm truncate"
                      style={{ color: "var(--text-muted)" }}
                    >
                      {conversation.friend.email}
                    </p>
                  </div>
                </div>

                {/* Messages */}
                <MessageThread
                  messages={conversation.messages}
                  isLoading={conversation === undefined}
                />

                {/* Input */}
                <MessageInput
                  onSendText={handleSendText}
                  onSendVoice={handleSendVoice}
                />
              </>
            ) : (
              /* Empty state */
              <div className="flex-1 flex items-center justify-center p-8">
                <div className="text-center">
                  <div
                    className="w-20 h-20 mx-auto mb-4 rounded-full flex items-center justify-center"
                    style={{ background: "var(--bg-elevated)" }}
                  >
                    <svg
                      width="40"
                      height="40"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      style={{ color: "var(--text-muted)" }}
                    >
                      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                    </svg>
                  </div>
                  <h2
                    className="text-lg font-medium mb-2"
                    style={{ color: "var(--text-primary)" }}
                  >
                    Select a conversation
                  </h2>
                  <p style={{ color: "var(--text-muted)" }}>
                    Choose a friend to start messaging
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
};

export default MessagesPage;
