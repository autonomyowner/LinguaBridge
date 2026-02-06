import React, { useState, useRef, useEffect } from "react";

interface VoiceRecorderProps {
  onSend: (blob: Blob, duration: number) => void;
  onCancel: () => void;
}

const VoiceRecorder: React.FC<VoiceRecorderProps> = ({ onSend, onCancel }) => {
  const [isRecording, setIsRecording] = useState(false);
  const [duration, setDuration] = useState(0);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const startTimeRef = useRef<number>(0);

  const MAX_DURATION = 60; // 60 seconds max

  useEffect(() => {
    return () => {
      // Cleanup
      if (timerRef.current) clearInterval(timerRef.current);
      if (audioUrl) URL.revokeObjectURL(audioUrl);
      if (mediaRecorderRef.current?.state === "recording") {
        mediaRecorderRef.current.stop();
      }
    };
  }, [audioUrl]);

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: MediaRecorder.isTypeSupported("audio/webm")
          ? "audio/webm"
          : "audio/mp4",
      });

      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          audioChunksRef.current.push(e.data);
        }
      };

      mediaRecorder.onstop = () => {
        const blob = new Blob(audioChunksRef.current, {
          type: mediaRecorder.mimeType,
        });
        setAudioBlob(blob);
        setAudioUrl(URL.createObjectURL(blob));

        // Stop all tracks
        stream.getTracks().forEach((track) => track.stop());
      };

      mediaRecorder.start(100); // Collect data every 100ms
      startTimeRef.current = Date.now();
      setIsRecording(true);
      setDuration(0);

      // Update duration timer
      timerRef.current = setInterval(() => {
        const elapsed = Math.floor((Date.now() - startTimeRef.current) / 1000);
        setDuration(elapsed);

        if (elapsed >= MAX_DURATION) {
          stopRecording();
        }
      }, 100);
    } catch (error) {
      console.error("Failed to start recording:", error);
      alert("Could not access microphone. Please grant permission.");
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current?.state === "recording") {
      mediaRecorderRef.current.stop();
    }
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    setIsRecording(false);
  };

  const handlePlayPause = () => {
    if (!audioRef.current || !audioUrl) return;

    if (isPlaying) {
      audioRef.current.pause();
    } else {
      audioRef.current.play();
    }
    setIsPlaying(!isPlaying);
  };

  const handleSend = () => {
    if (audioBlob && duration > 0) {
      onSend(audioBlob, duration);
    }
  };

  const handleReset = () => {
    setAudioBlob(null);
    if (audioUrl) {
      URL.revokeObjectURL(audioUrl);
      setAudioUrl(null);
    }
    setDuration(0);
    setIsPlaying(false);
  };

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  return (
    <div
      className="p-4 border-t"
      style={{ borderColor: "var(--border-soft)" }}
    >
      {/* Hidden audio element for playback */}
      {audioUrl && (
        <audio
          ref={audioRef}
          src={audioUrl}
          onEnded={() => setIsPlaying(false)}
        />
      )}

      <div className="flex items-center gap-3">
        {/* Cancel button */}
        <button
          onClick={onCancel}
          className="p-2 rounded-lg transition-colors hover:bg-black/5"
          title="Cancel"
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

        {/* Recording/Preview area */}
        <div
          className="flex-1 flex items-center gap-3 px-4 py-3 rounded-xl"
          style={{ background: "var(--bg-elevated)" }}
        >
          {isRecording ? (
            <>
              {/* Recording indicator */}
              <div
                className="w-3 h-3 rounded-full animate-pulse"
                style={{ background: "var(--terra-500)" }}
              />
              <div className="flex-1">
                <div className="text-sm font-medium" style={{ color: "var(--terra-500)" }}>
                  Recording...
                </div>
                <div
                  className="text-xs"
                  style={{ color: "var(--text-muted)" }}
                >
                  {formatDuration(duration)} / {formatDuration(MAX_DURATION)}
                </div>
              </div>
              {/* Waveform visualization */}
              <div className="flex items-center gap-0.5">
                {[...Array(8)].map((_, i) => (
                  <div
                    key={i}
                    className="w-1 rounded-full animate-pulse"
                    style={{
                      background: "var(--terra-500)",
                      height: `${12 + Math.random() * 16}px`,
                      animationDelay: `${i * 0.1}s`,
                    }}
                  />
                ))}
              </div>
            </>
          ) : audioBlob ? (
            <>
              {/* Play/Pause button */}
              <button
                onClick={handlePlayPause}
                className="p-2 rounded-full transition-colors"
                style={{
                  background: "var(--matcha-500)",
                  color: "white",
                }}
              >
                {isPlaying ? (
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                    <rect x="6" y="4" width="4" height="16" />
                    <rect x="14" y="4" width="4" height="16" />
                  </svg>
                ) : (
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                    <polygon points="5 3 19 12 5 21 5 3" />
                  </svg>
                )}
              </button>

              {/* Duration */}
              <div className="flex-1">
                <div
                  className="text-sm font-medium"
                  style={{ color: "var(--text-primary)" }}
                >
                  Voice message
                </div>
                <div
                  className="text-xs"
                  style={{ color: "var(--text-muted)" }}
                >
                  {formatDuration(duration)}
                </div>
              </div>

              {/* Reset button */}
              <button
                onClick={handleReset}
                className="p-2 rounded-lg transition-colors hover:bg-black/5"
                title="Re-record"
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
                  <path d="M23 4v6h-6" />
                  <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10" />
                </svg>
              </button>
            </>
          ) : (
            <div
              className="text-sm text-center flex-1"
              style={{ color: "var(--text-muted)" }}
            >
              Tap the microphone to start recording
            </div>
          )}
        </div>

        {/* Record/Send button */}
        {audioBlob ? (
          <button
            onClick={handleSend}
            className="p-3 rounded-xl transition-colors"
            style={{
              background: "var(--matcha-500)",
              color: "white",
            }}
            title="Send voice message"
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
        ) : (
          <button
            onMouseDown={startRecording}
            onMouseUp={stopRecording}
            onMouseLeave={isRecording ? stopRecording : undefined}
            onTouchStart={startRecording}
            onTouchEnd={stopRecording}
            className="p-3 rounded-xl transition-colors"
            style={{
              background: isRecording ? "var(--terra-500)" : "var(--matcha-500)",
              color: "white",
            }}
            title={isRecording ? "Release to stop" : "Hold to record"}
          >
            <svg
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" />
              <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
              <line x1="12" y1="19" x2="12" y2="23" />
              <line x1="8" y1="23" x2="16" y2="23" />
            </svg>
          </button>
        )}
      </div>
    </div>
  );
};

export default VoiceRecorder;
