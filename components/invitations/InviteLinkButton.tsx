import React, { useState } from "react";
import { useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import { Id } from "../../convex/_generated/dataModel";

interface InviteLinkButtonProps {
  roomId: Id<"rooms">;
  className?: string;
}

const InviteLinkButton: React.FC<InviteLinkButtonProps> = ({
  roomId,
  className,
}) => {
  const [isGenerating, setIsGenerating] = useState(false);
  const [inviteLink, setInviteLink] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const createLink = useMutation(api.invitations.mutations.createLink);

  const handleGenerateLink = async () => {
    setIsGenerating(true);
    try {
      const result = await createLink({ roomId, expiresInHours: 24 });
      const link = `${window.location.origin}/translate?invite=${result.inviteCode}`;
      setInviteLink(link);
    } catch (error) {
      console.error("Failed to generate invite link:", error);
      alert(error instanceof Error ? error.message : "Failed to generate link");
    } finally {
      setIsGenerating(false);
    }
  };

  const handleCopyLink = async () => {
    if (!inviteLink) return;

    try {
      await navigator.clipboard.writeText(inviteLink);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      console.error("Failed to copy:", error);
      // Fallback for older browsers
      const textArea = document.createElement("textarea");
      textArea.value = inviteLink;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand("copy");
      document.body.removeChild(textArea);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  if (inviteLink) {
    return (
      <div className={`flex items-center gap-2 ${className || ""}`}>
        <input
          type="text"
          value={inviteLink}
          readOnly
          className="matcha-input text-sm flex-1"
          onClick={(e) => (e.target as HTMLInputElement).select()}
        />
        <button
          onClick={handleCopyLink}
          className="px-4 py-2 rounded-lg text-sm font-medium transition-colors flex-shrink-0"
          style={{
            background: copied ? "var(--matcha-100)" : "var(--matcha-500)",
            color: copied ? "var(--matcha-700)" : "white",
          }}
        >
          {copied ? "Copied!" : "Copy"}
        </button>
        <button
          onClick={() => setInviteLink(null)}
          className="p-2 rounded-lg transition-colors hover:bg-black/5 flex-shrink-0"
          title="Close"
        >
          <svg
            width="18"
            height="18"
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
    );
  }

  return (
    <button
      onClick={handleGenerateLink}
      disabled={isGenerating}
      className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors disabled:opacity-50 ${className || ""}`}
      style={{
        background: "var(--bg-elevated)",
        color: "var(--text-secondary)",
        border: "1px solid var(--border-soft)",
      }}
    >
      <svg
        width="16"
        height="16"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
      >
        <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
        <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
      </svg>
      {isGenerating ? "Generating..." : "Share Link"}
    </button>
  );
};

export default InviteLinkButton;
