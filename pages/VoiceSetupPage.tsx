import React, { useState, useRef, useCallback, useEffect } from "react";
import { useAction, useMutation, useQuery } from "convex/react";
import { api } from "../convex/_generated/api";
import { useAuth } from "../providers/AuthContext";
import { useLanguage } from "../providers/LanguageContext";
import Header from "../components/Header";
import { SUPPORTED_LANGUAGES } from "../types";

type Step = "welcome" | "recording" | "processing" | "preview" | "done";

const RECORD_DURATION = 10; // seconds
const MIN_RECORD_DURATION = 3; // minimum seconds before allowing stop

const SAMPLE_PROMPTS = [
  "The quick brown fox jumps over the lazy dog. I enjoy having conversations in many different languages, and technology makes it possible to connect with people around the world.",
  "Today is a beautiful day to learn something new. Every person you meet knows something you don't, so keep your mind open and your ears ready to listen.",
  "Welcome to the future of communication. With real-time voice translation, language barriers become a thing of the past. Let's talk and understand each other.",
];

const VoiceSetupPage: React.FC = () => {
  const { user, isAuthenticated } = useAuth();
  const { t } = useLanguage();
  const cloneVoice = useAction(api.voices.actions.cloneVoice);
  const voiceClone = useQuery(api.voices.queries.getMyVoiceClone, { userEmail: user?.email || undefined });

  // Ensure user exists in app database (cross-origin auth workaround)
  const ensureUser = useMutation(api.debug.ensureUserByEmail);
  const [userEnsured, setUserEnsured] = useState(false);

  useEffect(() => {
    if (user?.email && !userEnsured) {
      ensureUser({ email: user.email, name: user.name })
        .then(() => setUserEnsured(true))
        .catch(console.error);
    }
  }, [user?.email, userEnsured, ensureUser]);

  const [step, setStep] = useState<Step>("welcome");
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [language, setLanguage] = useState("en-US");
  const [audioLevels, setAudioLevels] = useState<number[]>(new Array(12).fill(0.1));
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const animationFrameRef = useRef<number>(0);
  const streamRef = useRef<MediaStream | null>(null);

  const samplePrompt = SAMPLE_PROMPTS[Math.floor(Math.random() * SAMPLE_PROMPTS.length)];

  // If user already has a voice clone, show that info
  useEffect(() => {
    if (voiceClone) {
      setStep("done");
    }
  }, [voiceClone]);

  // Clean up on unmount
  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => t.stop());
      }
    };
  }, []);

  const updateAudioLevels = useCallback(() => {
    if (!analyserRef.current) return;

    const analyser = analyserRef.current;
    const dataArray = new Uint8Array(analyser.frequencyBinCount);
    analyser.getByteFrequencyData(dataArray);

    // Sample 12 bars from frequency data
    const barCount = 12;
    const step = Math.floor(dataArray.length / barCount);
    const levels = [];
    for (let i = 0; i < barCount; i++) {
      const value = dataArray[i * step] / 255;
      levels.push(Math.max(0.1, value));
    }
    setAudioLevels(levels);

    animationFrameRef.current = requestAnimationFrame(updateAudioLevels);
  }, []);

  const startRecording = async () => {
    setError(null);
    audioChunksRef.current = [];

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      // Set up analyser for visualization
      const audioContext = new AudioContext();
      const source = audioContext.createMediaStreamSource(stream);
      const analyser = audioContext.createAnalyser();
      analyser.fftSize = 256;
      source.connect(analyser);
      analyserRef.current = analyser;

      // Start MediaRecorder
      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: MediaRecorder.isTypeSupported("audio/webm;codecs=opus")
          ? "audio/webm;codecs=opus"
          : "audio/webm",
      });
      mediaRecorderRef.current = mediaRecorder;

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = () => {
        // Stop stream
        stream.getTracks().forEach((t) => t.stop());
        streamRef.current = null;

        if (timerRef.current) {
          clearInterval(timerRef.current);
          timerRef.current = null;
        }
        if (animationFrameRef.current) {
          cancelAnimationFrame(animationFrameRef.current);
        }

        // Create preview URL and go to preview step
        const audioBlob = new Blob(audioChunksRef.current, { type: "audio/webm" });
        const url = URL.createObjectURL(audioBlob);
        setPreviewUrl(url);
        setStep("preview");
      };

      mediaRecorder.start(500); // Collect data every 500ms
      setIsRecording(true);
      setStep("recording");
      setRecordingTime(0);

      // Start visualization
      updateAudioLevels();

      // Timer countdown
      timerRef.current = setInterval(() => {
        setRecordingTime((prev) => {
          const next = prev + 1;
          if (next >= RECORD_DURATION) {
            // Auto-stop after 10 seconds
            mediaRecorder.stop();
            setIsRecording(false);
          }
          return next;
        });
      }, 1000);
    } catch (err: any) {
      setError("Could not access microphone. Please allow microphone access and try again.");
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  };

  const processRecording = async () => {
    // Clean up preview URL
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
      setPreviewUrl(null);
    }

    setStep("processing");
    setError(null);

    try {
      if (recordingTime < MIN_RECORD_DURATION) {
        throw new Error(`Recording too short. Please record at least ${MIN_RECORD_DURATION} seconds.`);
      }

      const audioBlob = new Blob(audioChunksRef.current, { type: "audio/webm" });

      // Convert to base64
      const arrayBuffer = await audioBlob.arrayBuffer();
      const uint8Array = new Uint8Array(arrayBuffer);
      let binary = "";
      for (let i = 0; i < uint8Array.length; i++) {
        binary += String.fromCharCode(uint8Array[i]);
      }
      const audioBase64 = btoa(binary);

      // Send to Convex action (which proxies to Cartesia)
      await cloneVoice({
        audioBase64,
        language,
        userEmail: user?.email || undefined,
      });

      setStep("done");
    } catch (err: any) {
      setError(err.message || "Voice cloning failed. Please try again.");
      setStep("welcome");
    }
  };

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen" style={{ background: "var(--bg-page)" }}>
        <Header />
        <main className="relative z-10 px-6 pb-12 pt-8">
          <div className="max-w-md mx-auto">
            <div className="matcha-card p-8 text-center">
              <h2 className="text-2xl font-serif mb-2" style={{ color: "var(--text-primary)" }}>
                Sign in required
              </h2>
              <p className="text-sm mb-6" style={{ color: "var(--text-secondary)" }}>
                Please sign in to set up voice cloning.
              </p>
              <a href="/signin" className="matcha-btn matcha-btn-primary py-3 px-8 inline-block">
                Sign In
              </a>
            </div>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen" style={{ background: "var(--bg-page)" }}>
      <Header />
      <main className="relative z-10 px-6 pb-12 pt-8">
        <div className="max-w-lg mx-auto">
          {/* Page Title */}
          <div className="text-center mb-8">
            <h1 className="text-3xl font-serif text-gradient mb-2">Voice Clone Setup</h1>
            <p style={{ color: "var(--text-secondary)" }}>
              Make your translations sound like you
            </p>
          </div>

          {/* Welcome Step */}
          {step === "welcome" && (
            <div className="matcha-card p-8 animate-fade-in">
              <div className="text-center mb-6">
                <div
                  className="w-20 h-20 rounded-full mx-auto mb-4 flex items-center justify-center"
                  style={{ background: "var(--matcha-100)" }}
                >
                  <svg className="w-10 h-10" style={{ color: "var(--matcha-600)" }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
                  </svg>
                </div>
                <h2 className="text-xl font-serif mb-2" style={{ color: "var(--text-primary)" }}>
                  Personalize Your Voice
                </h2>
                <p className="text-sm" style={{ color: "var(--text-secondary)" }}>
                  Record a 10-second voice sample and your translations will sound like you instead of a generic voice.
                </p>
              </div>

              {/* How it works */}
              <div className="space-y-3 mb-6">
                {[
                  { num: "1", text: "Record a 10-second voice sample reading the prompt below" },
                  { num: "2", text: "We create a voice clone using your recording" },
                  { num: "3", text: "Your translations will use your cloned voice" },
                ].map((item, i) => (
                  <div key={i} className="flex gap-3">
                    <span
                      className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0"
                      style={{ background: "var(--matcha-500)", color: "var(--text-inverse)" }}
                    >
                      {item.num}
                    </span>
                    <p className="text-sm" style={{ color: "var(--text-secondary)" }}>
                      {item.text}
                    </p>
                  </div>
                ))}
              </div>

              {/* Language selection */}
              <div className="mb-6">
                <label className="matcha-label">Recording Language</label>
                <select
                  value={language}
                  onChange={(e) => setLanguage(e.target.value)}
                  className="matcha-select"
                >
                  {SUPPORTED_LANGUAGES.map((l) => (
                    <option key={l.code} value={l.code}>
                      {l.flag} {l.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Sample prompt */}
              <div
                className="p-4 rounded-xl mb-6"
                style={{ background: "var(--bg-elevated)", border: "1px solid var(--border-soft)" }}
              >
                <p className="text-xs font-semibold mb-2" style={{ color: "var(--text-muted)" }}>
                  Read this aloud:
                </p>
                <p className="text-sm leading-relaxed" style={{ color: "var(--text-primary)" }}>
                  "{samplePrompt}"
                </p>
              </div>

              <button onClick={startRecording} className="w-full matcha-btn matcha-btn-primary py-4 text-base font-semibold">
                Start Recording
              </button>

              <a
                href="/translate"
                className="block text-center mt-4 text-sm font-medium"
                style={{ color: "var(--text-muted)" }}
              >
                Skip for now
              </a>
            </div>
          )}

          {/* Recording Step */}
          {step === "recording" && (
            <div className="matcha-card p-8 animate-fade-in">
              <div className="text-center mb-6">
                <h2 className="text-xl font-serif mb-2" style={{ color: "var(--text-primary)" }}>
                  Recording...
                </h2>
                <p className="text-sm" style={{ color: "var(--text-secondary)" }}>
                  Read the prompt clearly
                </p>
              </div>

              {/* Timer */}
              <div className="text-center mb-6">
                <span
                  className="text-5xl font-mono font-bold"
                  style={{ color: "var(--matcha-600)" }}
                >
                  {RECORD_DURATION - recordingTime}
                </span>
                <p className="text-xs mt-1" style={{ color: "var(--text-muted)" }}>seconds remaining</p>
              </div>

              {/* Audio visualizer */}
              <div className="flex items-center justify-center gap-1 h-16 mb-6">
                {audioLevels.map((level, i) => (
                  <div
                    key={i}
                    className="w-2 rounded-full transition-all duration-75"
                    style={{
                      height: `${Math.max(8, level * 64)}px`,
                      background: "var(--matcha-500)",
                      opacity: 0.6 + level * 0.4,
                    }}
                  />
                ))}
              </div>

              {/* Progress bar */}
              <div
                className="w-full h-2 rounded-full mb-6 overflow-hidden"
                style={{ background: "var(--bg-elevated)" }}
              >
                <div
                  className="h-full rounded-full transition-all duration-1000"
                  style={{
                    width: `${(recordingTime / RECORD_DURATION) * 100}%`,
                    background: "linear-gradient(90deg, var(--matcha-400), var(--matcha-600))",
                  }}
                />
              </div>

              {/* Sample prompt reminder */}
              <div
                className="p-3 rounded-xl mb-6"
                style={{ background: "var(--bg-elevated)", border: "1px solid var(--border-soft)" }}
              >
                <p className="text-xs italic" style={{ color: "var(--text-secondary)" }}>
                  "{samplePrompt}"
                </p>
              </div>

              <button
                onClick={stopRecording}
                disabled={recordingTime < MIN_RECORD_DURATION}
                className="w-full matcha-btn matcha-btn-danger py-4 text-base font-semibold"
                style={{ opacity: recordingTime < MIN_RECORD_DURATION ? 0.5 : 1 }}
              >
                {recordingTime < MIN_RECORD_DURATION
                  ? `Wait ${MIN_RECORD_DURATION - recordingTime}s...`
                  : 'Stop Recording Early'}
              </button>
            </div>
          )}

          {/* Preview Step */}
          {step === "preview" && previewUrl && (
            <div className="matcha-card p-8 animate-fade-in">
              <div className="text-center mb-6">
                <h2 className="text-xl font-serif mb-2" style={{ color: "var(--text-primary)" }}>
                  Review Your Recording
                </h2>
                <p className="text-sm" style={{ color: "var(--text-secondary)" }}>
                  Listen back and confirm it sounds clear
                </p>
              </div>

              <div
                className="p-4 rounded-xl mb-6"
                style={{ background: "var(--bg-elevated)", border: "1px solid var(--border-soft)" }}
              >
                <audio controls src={previewUrl} className="w-full" />
              </div>

              <div className="space-y-3">
                <button
                  onClick={processRecording}
                  className="w-full matcha-btn matcha-btn-primary py-4 text-base font-semibold"
                >
                  Use This Recording
                </button>
                <button
                  onClick={() => {
                    if (previewUrl) URL.revokeObjectURL(previewUrl);
                    setPreviewUrl(null);
                    setStep("welcome");
                  }}
                  className="w-full matcha-btn matcha-btn-secondary py-3 text-sm"
                >
                  Re-record
                </button>
              </div>
            </div>
          )}

          {/* Processing Step */}
          {step === "processing" && (
            <div className="matcha-card p-8 animate-fade-in">
              <div className="text-center">
                <div className="w-16 h-16 mx-auto mb-6 relative">
                  <div
                    className="w-16 h-16 rounded-full border-4 border-t-transparent animate-spin"
                    style={{ borderColor: "var(--matcha-200)", borderTopColor: "var(--matcha-600)" }}
                  />
                </div>
                <h2 className="text-xl font-serif mb-2" style={{ color: "var(--text-primary)" }}>
                  Creating Your Voice Clone...
                </h2>
                <p className="text-sm" style={{ color: "var(--text-secondary)" }}>
                  This takes a few seconds. Your voice profile is being analyzed and cloned.
                </p>
              </div>
            </div>
          )}

          {/* Done Step */}
          {step === "done" && (
            <div className="matcha-card p-8 animate-fade-in">
              <div className="text-center mb-6">
                <div
                  className="w-20 h-20 rounded-full mx-auto mb-4 flex items-center justify-center"
                  style={{ background: "var(--matcha-100)" }}
                >
                  <svg className="w-10 h-10" style={{ color: "var(--matcha-600)" }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <h2 className="text-xl font-serif mb-2" style={{ color: "var(--text-primary)" }}>
                  Voice Clone Ready
                </h2>
                <p className="text-sm" style={{ color: "var(--text-secondary)" }}>
                  Your translations will now use your cloned voice. Other participants will hear you in their language — in your voice.
                </p>
              </div>

              {voiceClone && (
                <div
                  className="p-4 rounded-xl mb-6"
                  style={{ background: "var(--bg-elevated)", border: "1px solid var(--border-soft)" }}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium" style={{ color: "var(--text-primary)" }}>
                        {voiceClone.name}
                      </p>
                      <p className="text-xs" style={{ color: "var(--text-muted)" }}>
                        Created {new Date(voiceClone.createdAt).toLocaleDateString()}
                      </p>
                    </div>
                    <span
                      className="text-xs font-semibold px-3 py-1 rounded-full"
                      style={{ background: "var(--matcha-100)", color: "var(--matcha-700)" }}
                    >
                      Active
                    </span>
                  </div>
                </div>
              )}

              <a
                href="/translate"
                className="block w-full matcha-btn matcha-btn-primary py-4 text-base font-semibold text-center"
              >
                Go to Translation
              </a>

              <button
                onClick={() => setStep("welcome")}
                className="block w-full mt-3 text-sm font-medium text-center py-2"
                style={{ color: "var(--text-muted)" }}
              >
                Re-record Voice Sample
              </button>
            </div>
          )}

          {/* Error */}
          {error && (
            <div
              className="mt-4 p-4 rounded-xl"
              style={{ background: "rgba(224, 123, 76, 0.1)", border: "1px solid var(--terra-400)" }}
            >
              <p className="text-sm font-medium" style={{ color: "var(--terra-500)" }}>{error}</p>
            </div>
          )}
        </div>
      </main>
    </div>
  );
};

export default VoiceSetupPage;
