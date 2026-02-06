import React, { useState, useRef, useEffect } from "react";
import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import { Id } from "../../convex/_generated/dataModel";

interface VoicePlayerProps {
  storageId: string;
  duration: number;
  isFromMe?: boolean;
}

const VoicePlayer: React.FC<VoicePlayerProps> = ({
  storageId,
  duration,
  isFromMe = false,
}) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Get the URL for the audio file
  const audioUrl = useQuery(api.messages.queries.getVoiceUrl, {
    storageId: storageId as Id<"_storage">,
  });

  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.ontimeupdate = () => {
        setCurrentTime(audioRef.current?.currentTime ?? 0);
      };
      audioRef.current.onended = () => {
        setIsPlaying(false);
        setCurrentTime(0);
      };
      audioRef.current.onwaiting = () => setIsLoading(true);
      audioRef.current.onplaying = () => setIsLoading(false);
    }
  }, [audioUrl]);

  const handlePlayPause = async () => {
    if (!audioRef.current || !audioUrl) return;

    if (isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
    } else {
      try {
        await audioRef.current.play();
        setIsPlaying(true);
      } catch (error) {
        console.error("Failed to play audio:", error);
      }
    }
  };

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  const progress = duration > 0 ? (currentTime / duration) * 100 : 0;

  return (
    <div className="flex items-center gap-3 min-w-[160px]">
      {/* Hidden audio element */}
      {audioUrl && <audio ref={audioRef} src={audioUrl} preload="metadata" />}

      {/* Play/Pause button */}
      <button
        onClick={handlePlayPause}
        disabled={!audioUrl}
        className="flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center transition-colors disabled:opacity-50"
        style={{
          background: isFromMe ? "rgba(255,255,255,0.2)" : "var(--matcha-100)",
          color: isFromMe ? "white" : "var(--matcha-700)",
        }}
      >
        {isLoading ? (
          <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
        ) : isPlaying ? (
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

      {/* Progress and duration */}
      <div className="flex-1 min-w-0">
        {/* Waveform visualization */}
        <div className="flex items-center gap-0.5 h-6 mb-1">
          {[...Array(20)].map((_, i) => {
            const barProgress = (i / 20) * 100;
            const isActive = barProgress <= progress;
            const height = 8 + Math.sin(i * 0.5) * 8 + Math.random() * 4;

            return (
              <div
                key={i}
                className="w-1 rounded-full transition-colors"
                style={{
                  height: `${height}px`,
                  background: isActive
                    ? isFromMe
                      ? "white"
                      : "var(--matcha-500)"
                    : isFromMe
                    ? "rgba(255,255,255,0.3)"
                    : "var(--matcha-200)",
                }}
              />
            );
          })}
        </div>

        {/* Duration */}
        <div
          className="text-xs"
          style={{
            color: isFromMe ? "rgba(255,255,255,0.7)" : "var(--text-muted)",
          }}
        >
          {formatDuration(isPlaying ? currentTime : duration)}
        </div>
      </div>
    </div>
  );
};

export default VoicePlayer;
