import React, { useState, useRef } from "react";
import VoiceRecorder from "./VoiceRecorder";
import { useLanguage } from "../../providers/LanguageContext";

interface MessageInputProps {
  onSendText: (content: string) => Promise<void>;
  onSendVoice: (blob: Blob, duration: number) => Promise<void>;
  disabled?: boolean;
}

const MessageInput: React.FC<MessageInputProps> = ({
  onSendText,
  onSendVoice,
  disabled,
}) => {
  const [message, setMessage] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [showVoiceRecorder, setShowVoiceRecorder] = useState(false);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const { t } = useLanguage();

  const handleSendText = async () => {
    if (!message.trim() || isSending || disabled) return;

    setIsSending(true);
    try {
      await onSendText(message.trim());
      setMessage("");
      inputRef.current?.focus();
    } catch (error) {
      console.error("Failed to send message:", error);
    } finally {
      setIsSending(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendText();
    }
  };

  const handleVoiceSend = async (blob: Blob, duration: number) => {
    setShowVoiceRecorder(false);
    setIsSending(true);
    try {
      await onSendVoice(blob, duration);
    } catch (error) {
      console.error("Failed to send voice message:", error);
    } finally {
      setIsSending(false);
    }
  };

  if (showVoiceRecorder) {
    return (
      <VoiceRecorder
        onSend={handleVoiceSend}
        onCancel={() => setShowVoiceRecorder(false)}
      />
    );
  }

  return (
    <div
      className="p-4 border-t"
      style={{ borderColor: "var(--border-soft)" }}
    >
      <div className="flex items-end gap-2">
        {/* Voice record button */}
        <button
          onClick={() => setShowVoiceRecorder(true)}
          disabled={disabled || isSending}
          className="flex-shrink-0 p-2.5 rounded-xl transition-colors hover:bg-black/5 disabled:opacity-50"
          title={t("messages.recordVoice")}
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
            <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" />
            <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
            <line x1="12" y1="19" x2="12" y2="23" />
            <line x1="8" y1="23" x2="16" y2="23" />
          </svg>
        </button>

        {/* Text input */}
        <div className="flex-1 relative">
          <textarea
            ref={inputRef}
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={t("messages.typeMessage")}
            disabled={disabled || isSending}
            className="matcha-input w-full resize-none py-2.5 pr-12"
            style={{ minHeight: "44px", maxHeight: "120px" }}
            rows={1}
          />
        </div>

        {/* Send button */}
        <button
          onClick={handleSendText}
          disabled={!message.trim() || isSending || disabled}
          className="flex-shrink-0 p-2.5 rounded-xl transition-colors disabled:opacity-50"
          style={{
            background: message.trim() ? "var(--matcha-500)" : "var(--bg-elevated)",
            color: message.trim() ? "white" : "var(--text-muted)",
          }}
        >
          <svg
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <line x1="22" y1="2" x2="11" y2="13" />
            <polygon points="22 2 15 22 11 13 2 9 22 2" />
          </svg>
        </button>
      </div>
    </div>
  );
};

export default MessageInput;
