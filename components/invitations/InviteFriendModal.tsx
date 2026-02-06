import React, { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import { Id } from "../../convex/_generated/dataModel";

interface InviteFriendModalProps {
  roomId: Id<"rooms">;
  roomName: string;
  isOpen: boolean;
  onClose: () => void;
}

const InviteFriendModal: React.FC<InviteFriendModalProps> = ({
  roomId,
  roomName,
  isOpen,
  onClose,
}) => {
  const friends = useQuery(api.friends.queries.list);
  const sendInvite = useMutation(api.invitations.mutations.sendDirect);
  const [sendingTo, setSendingTo] = useState<string | null>(null);
  const [sentTo, setSentTo] = useState<Set<string>>(new Set());

  const handleInvite = async (friendId: Id<"users">) => {
    setSendingTo(friendId);
    try {
      await sendInvite({ friendId, roomId });
      setSentTo((prev) => new Set(prev).add(friendId));
    } catch (error) {
      console.error("Failed to send invite:", error);
      alert(error instanceof Error ? error.message : "Failed to send invite");
    } finally {
      setSendingTo(null);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50"
        onClick={onClose}
      />

      {/* Modal */}
      <div
        className="relative w-full max-w-md max-h-[80vh] flex flex-col rounded-2xl shadow-xl"
        style={{ background: "var(--bg-card)" }}
      >
        {/* Header */}
        <div
          className="px-6 py-4 border-b flex items-center justify-between"
          style={{ borderColor: "var(--border-soft)" }}
        >
          <div>
            <h2
              className="text-lg font-semibold"
              style={{ color: "var(--text-primary)" }}
            >
              Invite Friends
            </h2>
            <p
              className="text-sm"
              style={{ color: "var(--text-muted)" }}
            >
              to "{roomName}"
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg transition-colors hover:bg-black/5"
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
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        {/* Friends list */}
        <div className="flex-1 overflow-y-auto p-4">
          {friends === undefined ? (
            // Loading
            <div className="space-y-3">
              {[...Array(3)].map((_, i) => (
                <div
                  key={i}
                  className="h-16 rounded-xl animate-pulse"
                  style={{ background: "var(--bg-elevated)" }}
                />
              ))}
            </div>
          ) : friends.length === 0 ? (
            // Empty state
            <div className="text-center py-8">
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
                  <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                  <circle cx="9" cy="7" r="4" />
                  <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
                  <path d="M16 3.13a4 4 0 0 1 0 7.75" />
                </svg>
              </div>
              <p style={{ color: "var(--text-muted)" }}>No friends to invite</p>
              <a
                href="/friends?tab=discover"
                className="text-sm mt-2 inline-block hover:underline"
                style={{ color: "var(--matcha-600)" }}
              >
                Find friends to add
              </a>
            </div>
          ) : (
            // Friends list
            <div className="space-y-2">
              {friends.map((friend) => {
                const initials = friend.name
                  .split(" ")
                  .map((n) => n[0])
                  .join("")
                  .toUpperCase()
                  .slice(0, 2);

                const isSending = sendingTo === friend._id;
                const isSent = sentTo.has(friend._id);

                return (
                  <div
                    key={friend._id}
                    className="flex items-center gap-3 p-3 rounded-xl"
                    style={{ background: "var(--bg-elevated)" }}
                  >
                    {/* Avatar */}
                    {friend.imageUrl ? (
                      <img
                        src={friend.imageUrl}
                        alt={friend.name}
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

                    {/* Name */}
                    <div className="flex-1 min-w-0">
                      <p
                        className="font-medium truncate"
                        style={{ color: "var(--text-primary)" }}
                      >
                        {friend.name}
                      </p>
                      {friend.isOnline && (
                        <p
                          className="text-xs flex items-center gap-1"
                          style={{ color: "#22c55e" }}
                        >
                          <span className="w-1.5 h-1.5 rounded-full bg-current" />
                          Online
                        </p>
                      )}
                    </div>

                    {/* Invite button */}
                    <button
                      onClick={() => handleInvite(friend._id)}
                      disabled={isSending || isSent}
                      className="px-4 py-2 rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
                      style={{
                        background: isSent ? "var(--matcha-100)" : "var(--matcha-500)",
                        color: isSent ? "var(--matcha-700)" : "white",
                      }}
                    >
                      {isSending ? "Sending..." : isSent ? "Invited" : "Invite"}
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        <div
          className="px-6 py-4 border-t"
          style={{ borderColor: "var(--border-soft)" }}
        >
          <button
            onClick={onClose}
            className="w-full matcha-btn matcha-btn-secondary py-2"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};

export default InviteFriendModal;
