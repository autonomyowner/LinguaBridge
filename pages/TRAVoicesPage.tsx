import React, { useState, useRef, useCallback } from 'react';
import { GoogleGenAI, Modality, LiveServerMessage } from '@google/genai';
import { Room, RoomEvent, RemoteParticipant, LocalAudioTrack } from 'livekit-client';
import { useAction, useMutation, useQuery } from 'convex/react';
import { api } from '../convex/_generated/api';
import { SUPPORTED_LANGUAGES, TranslationMessage, Language } from '../types';
import { decode, decodeAudioData, createBlob } from '../audioUtils';
import Header from '../components/Header';
import { useAuth } from '../providers/AuthContext';
import { Id } from '../convex/_generated/dataModel';

// Gemini Model Config
const MODEL_NAME = 'gemini-2.5-flash-native-audio-preview-09-2025';
const INPUT_SAMPLE_RATE = 16000;
const OUTPUT_SAMPLE_RATE = 24000;

const TRAVoicesPage: React.FC = () => {
  const { user, isAuthenticated } = useAuth();

  // --- UI State ---
  const [isConnecting, setIsConnecting] = useState(false);
  const [isActive, setIsActive] = useState(false);
  const [roomName, setRoomName] = useState('GlobalLobby');
  const [userName, setUserName] = useState('');
  const [myLang, setMyLang] = useState<Language>(SUPPORTED_LANGUAGES[0]); // English
  const [theirLang, setTheirLang] = useState<Language>(SUPPORTED_LANGUAGES[1]); // Spanish
  const [transcript, setTranscript] = useState<TranslationMessage[]>([]);
  const [participants, setParticipants] = useState<RemoteParticipant[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [currentRoomId, setCurrentRoomId] = useState<Id<"rooms"> | null>(null);
  const [currentSessionId, setCurrentSessionId] = useState<Id<"sessions"> | null>(null);

  // --- Convex Hooks ---
  const generateLiveKitToken = useAction(api.rooms.actions.generateLiveKitToken);
  const createRoom = useMutation(api.rooms.mutations.create);
  const startSession = useMutation(api.sessions.mutations.start);
  const endSession = useMutation(api.sessions.mutations.end);
  const addMessage = useMutation(api.transcripts.mutations.addMessage);
  const userSettings = useQuery(api.users.queries.getSettings);

  // Set default name from user
  React.useEffect(() => {
    if (user?.name) {
      setUserName(user.name);
    } else if (user?.email) {
      setUserName(user.email.split('@')[0]);
    }
  }, [user]);

  // Set default languages from settings
  React.useEffect(() => {
    if (userSettings) {
      const sourceLang = SUPPORTED_LANGUAGES.find(l => l.code === userSettings.preferredSourceLanguage);
      const targetLang = SUPPORTED_LANGUAGES.find(l => l.code === userSettings.preferredTargetLanguage);
      if (sourceLang) setMyLang(sourceLang);
      if (targetLang) setTheirLang(targetLang);
    }
  }, [userSettings]);

  // --- Core References ---
  const lkRoomRef = useRef<Room | null>(null);
  const audioContextInRef = useRef<AudioContext | null>(null);
  const audioContextOutRef = useRef<AudioContext | null>(null);
  const destNodeRef = useRef<MediaStreamAudioDestinationNode | null>(null);
  const sessionRef = useRef<any>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const nextStartTimeRef = useRef<number>(0);
  const sourcesRef = useRef<Set<AudioBufferSourceNode>>(new Set());
  const transcriptBufferRef = useRef({ input: '', output: '' });

  const stopAll = useCallback(async () => {
    setIsActive(false);
    setIsConnecting(false);

    // End session in database
    if (currentSessionId) {
      try {
        await endSession({ sessionId: currentSessionId });
      } catch (e) {
        console.error('Failed to end session:', e);
      }
      setCurrentSessionId(null);
    }

    if (lkRoomRef.current) {
      lkRoomRef.current.disconnect();
      lkRoomRef.current = null;
    }

    if (sessionRef.current) {
      sessionRef.current.close();
      sessionRef.current = null;
    }

    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach(t => t.stop());
      localStreamRef.current = null;
    }

    if (audioContextInRef.current) audioContextInRef.current.close().catch(() => {});
    if (audioContextOutRef.current) audioContextOutRef.current.close().catch(() => {});

    sourcesRef.current.forEach(s => { try { s.stop(); } catch(e) {} });
    sourcesRef.current.clear();
    setParticipants([]);
    nextStartTimeRef.current = 0;
  }, [currentSessionId, endSession]);

  const connectBridge = async () => {
    if (!isAuthenticated) {
      setError('Please sign in to start a translation session');
      return;
    }

    if (isActive || isConnecting) return;
    setIsConnecting(true);
    setError(null);

    try {
      // Create or get room
      let roomId = currentRoomId;
      if (!roomId) {
        const result = await createRoom({
          name: roomName,
          description: `Translation room: ${myLang.name} to ${theirLang.name}`,
          isPublic: true,
          defaultSourceLanguage: myLang.code,
          defaultTargetLanguage: theirLang.code,
        });
        roomId = result.roomId;
        setCurrentRoomId(roomId);
      }

      // Generate LiveKit token from backend (SECURE - no credentials exposed)
      const { token, url } = await generateLiveKitToken({ roomId });

      // Start session
      const { sessionId } = await startSession({ roomId });
      setCurrentSessionId(sessionId);

      const ai = new GoogleGenAI({ apiKey: import.meta.env.VITE_GEMINI_API_KEY || '' });

      audioContextInRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: INPUT_SAMPLE_RATE });
      audioContextOutRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: OUTPUT_SAMPLE_RATE });

      destNodeRef.current = audioContextOutRef.current.createMediaStreamDestination();

      const systemInstruction = `
        You are a high-fidelity real-time translator.
        Your user speaks ${myLang.name}. You must translate their speech into ${theirLang.name}.
        The translated audio will be broadcast to a global room.
        Translate precisely and maintain the original tone.
        Only output the translated speech as audio.
      `;

      const sessionPromise = ai.live.connect({
        model: MODEL_NAME,
        callbacks: {
          onopen: async () => {
            localStreamRef.current = await navigator.mediaDevices.getUserMedia({ audio: true });
            const source = audioContextInRef.current!.createMediaStreamSource(localStreamRef.current);
            const processor = audioContextInRef.current!.createScriptProcessor(4096, 1, 1);

            processor.onaudioprocess = (e) => {
              const inputData = e.inputBuffer.getChannelData(0);
              sessionPromise.then(session => session.sendRealtimeInput({ media: createBlob(inputData) }));
            };
            source.connect(processor);
            processor.connect(audioContextInRef.current!.destination);

            const room = new Room();
            lkRoomRef.current = room;

            room.on(RoomEvent.ParticipantConnected, () => setParticipants(Array.from(room.remoteParticipants.values())));
            room.on(RoomEvent.ParticipantDisconnected, () => setParticipants(Array.from(room.remoteParticipants.values())));
            room.on(RoomEvent.TrackSubscribed, (track) => {
              const el = track.attach();
              document.body.appendChild(el);
            });

            await room.connect(url, token);

            const translatedTrack = new LocalAudioTrack(destNodeRef.current!.stream.getAudioTracks()[0]);
            await room.localParticipant.publishTrack(translatedTrack);

            setIsActive(true);
            setIsConnecting(false);
          },
          onmessage: async (message: LiveServerMessage) => {
            const base64Audio = message.serverContent?.modelTurn?.parts[0]?.inlineData?.data;
            if (base64Audio && audioContextOutRef.current && destNodeRef.current) {
              const ctx = audioContextOutRef.current;
              const audioBuffer = await decodeAudioData(decode(base64Audio), ctx, OUTPUT_SAMPLE_RATE, 1);

              const sourceNode = ctx.createBufferSource();
              sourceNode.buffer = audioBuffer;
              sourceNode.connect(destNodeRef.current);

              nextStartTimeRef.current = Math.max(nextStartTimeRef.current, ctx.currentTime);
              sourceNode.start(nextStartTimeRef.current);
              nextStartTimeRef.current += audioBuffer.duration;

              sourcesRef.current.add(sourceNode);
              sourceNode.onended = () => sourcesRef.current.delete(sourceNode);
            }

            if (message.serverContent?.inputTranscription) transcriptBufferRef.current.input += message.serverContent.inputTranscription.text;
            if (message.serverContent?.outputTranscription) transcriptBufferRef.current.output += message.serverContent.outputTranscription.text;

            if (message.serverContent?.turnComplete) {
              const { input, output } = transcriptBufferRef.current;
              if (input.trim()) {
                const inputMsg: TranslationMessage = { id: Date.now().toString(), sender: 'user', text: input, timestamp: new Date(), language: myLang.code };
                setTranscript(prev => [inputMsg, ...prev]);

                // Save to database
                if (currentSessionId) {
                  try {
                    await addMessage({
                      sessionId: currentSessionId,
                      originalText: input,
                      sourceLanguage: myLang.code,
                      messageType: 'speech',
                    });
                  } catch (e) {
                    console.error('Failed to save transcript:', e);
                  }
                }
              }
              if (output.trim()) {
                const outputMsg: TranslationMessage = { id: Date.now().toString() + 'a', sender: 'agent', text: output, timestamp: new Date(), language: theirLang.code };
                setTranscript(prev => [outputMsg, ...prev]);

                // Save translation to database
                if (currentSessionId) {
                  try {
                    await addMessage({
                      sessionId: currentSessionId,
                      originalText: output,
                      sourceLanguage: theirLang.code,
                      messageType: 'translation',
                    });
                  } catch (e) {
                    console.error('Failed to save translation:', e);
                  }
                }
              }
              transcriptBufferRef.current = { input: '', output: '' };
            }

            if (message.serverContent?.interrupted) {
              sourcesRef.current.forEach(s => { try { s.stop(); } catch(e) {} });
              sourcesRef.current.clear();
              nextStartTimeRef.current = 0;
            }
          },
          onerror: (e) => {
            setError('Bridge Error: ' + (e as any).message);
            stopAll();
          },
          onclose: () => stopAll(),
        },
        config: {
          responseModalities: [Modality.AUDIO],
          speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Kore' } } },
          systemInstruction,
          inputAudioTranscription: {},
          outputAudioTranscription: {}
        }
      });
      sessionRef.current = await sessionPromise;
    } catch (err: any) {
      setError(err.message);
      setIsConnecting(false);
      stopAll();
    }
  };

  // Show sign-in prompt if not authenticated
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen" style={{ background: 'var(--bg-page)' }}>
        <Header />
        <main className="relative z-10 px-6 pb-12 pt-8">
          <div className="max-w-md mx-auto">
            <div className="matcha-card p-8 text-center">
              <div
                className="w-20 h-20 rounded-full mx-auto mb-6 flex items-center justify-center"
                style={{ background: 'var(--matcha-100)' }}
              >
                <svg
                  className="w-10 h-10"
                  style={{ color: 'var(--matcha-600)' }}
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={1.5}
                    d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
                  />
                </svg>
              </div>
              <h2 className="text-2xl font-serif mb-2" style={{ color: 'var(--text-primary)' }}>
                Sign in Required
              </h2>
              <p className="text-sm mb-6" style={{ color: 'var(--text-secondary)' }}>
                Please sign in to access the translation room
              </p>
              <a href="/signin" className="matcha-btn matcha-btn-primary py-3 px-8 inline-block">
                Sign In
              </a>
              <p className="mt-4 text-sm" style={{ color: 'var(--text-muted)' }}>
                Don't have an account?{' '}
                <a href="/signup" className="font-semibold" style={{ color: 'var(--matcha-600)' }}>
                  Sign up free
                </a>
              </p>
            </div>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen" style={{ background: 'var(--bg-page)' }}>
      <Header />

      {/* Main Content */}
      <main className="relative z-10 px-6 pb-12 pt-8">
        <div className="max-w-6xl mx-auto">
          {/* Page Title */}
          <div className="text-center mb-8">
            <h1 className="text-3xl md:text-4xl font-serif text-gradient mb-2">Voice Translation Room</h1>
            <p style={{ color: 'var(--text-secondary)' }}>Real-time multilingual communication powered by AI</p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            {/* Left Column - Settings */}
            <div className="lg:col-span-4 space-y-6">

              {/* Status Card */}
              <div
                className="matcha-card p-6"
                style={{ background: isActive ? 'linear-gradient(135deg, var(--matcha-50), var(--matcha-100))' : 'var(--bg-card)' }}
              >
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-sm font-semibold" style={{ color: 'var(--text-secondary)' }}>Status</h3>
                  <span className={`matcha-badge ${isActive ? 'matcha-badge-success' : 'matcha-badge-warning'}`}>
                    {isActive ? 'Live' : 'Offline'}
                  </span>
                </div>
                <button
                  onClick={isActive ? stopAll : connectBridge}
                  disabled={isConnecting}
                  className={`w-full matcha-btn ${isActive ? 'matcha-btn-danger' : 'matcha-btn-primary'} py-4 text-base font-semibold`}
                >
                  {isConnecting ? (
                    <span className="flex items-center justify-center gap-2">
                      <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      Connecting...
                    </span>
                  ) : isActive ? (
                    'End Session'
                  ) : (
                    'Start Translation'
                  )}
                </button>
              </div>

              {/* Quick Start Guide - Only show when not active */}
              {!isActive && (
                <div className="matcha-card p-6 animate-fade-in" style={{ background: 'var(--bg-matcha-soft)' }}>
                  <h3 className="text-sm font-semibold mb-4" style={{ color: 'var(--matcha-700)' }}>Quick Start</h3>
                  <div className="space-y-4">
                    {[
                      { step: '1', text: 'Enter a room name to create or join a space' },
                      { step: '2', text: 'Select your language and translation target' },
                      { step: '3', text: 'Click Start Translation to begin' }
                    ].map((item, i) => (
                      <div key={i} className="flex gap-3">
                        <span
                          className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0"
                          style={{ background: 'var(--matcha-500)', color: 'var(--text-inverse)' }}
                        >
                          {item.step}
                        </span>
                        <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>{item.text}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Configuration Panel */}
              <div className="matcha-card p-6">
                <h3 className="text-sm font-semibold mb-5" style={{ color: 'var(--text-secondary)' }}>Configuration</h3>

                <div className="space-y-5">
                  <div className="space-y-4">
                    <div>
                      <label className="matcha-label">Room Name</label>
                      <input
                        type="text"
                        value={roomName}
                        onChange={e => setRoomName(e.target.value)}
                        disabled={isActive}
                        className="matcha-input"
                        placeholder="Enter room name..."
                      />
                    </div>
                    <div>
                      <label className="matcha-label">Your Name</label>
                      <input
                        type="text"
                        value={userName}
                        onChange={e => setUserName(e.target.value)}
                        disabled={isActive}
                        className="matcha-input"
                        placeholder="Enter your name..."
                      />
                    </div>
                  </div>

                  <div className="pt-4" style={{ borderTop: '1px solid var(--border-soft)' }}>
                    <div className="space-y-4">
                      <div>
                        <label className="matcha-label">I Speak</label>
                        <select
                          value={myLang.code}
                          onChange={e => setMyLang(SUPPORTED_LANGUAGES.find(l => l.code === e.target.value)!)}
                          disabled={isActive}
                          className="matcha-select"
                        >
                          {SUPPORTED_LANGUAGES.map(l => (
                            <option key={l.code} value={l.code}>{l.flag} {l.name}</option>
                          ))}
                        </select>
                      </div>

                      <div className="flex justify-center py-1">
                        <div
                          className="w-8 h-8 rounded-full flex items-center justify-center"
                          style={{ background: 'var(--bg-elevated)' }}
                        >
                          <span style={{ color: 'var(--text-muted)' }}>↓</span>
                        </div>
                      </div>

                      <div>
                        <label className="matcha-label">Translate To</label>
                        <select
                          value={theirLang.code}
                          onChange={e => setTheirLang(SUPPORTED_LANGUAGES.find(l => l.code === e.target.value)!)}
                          disabled={isActive}
                          className="matcha-select"
                        >
                          {SUPPORTED_LANGUAGES.map(l => (
                            <option key={l.code} value={l.code}>{l.flag} {l.name}</option>
                          ))}
                        </select>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Participants Panel */}
              {isActive && (
                <div className="matcha-card p-6 animate-fade-in">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-sm font-semibold" style={{ color: 'var(--text-secondary)' }}>Participants</h3>
                    <span className="matcha-badge matcha-badge-success">{participants.length + 1} in room</span>
                  </div>

                  <div className="space-y-3">
                    <div
                      className="p-4 rounded-xl"
                      style={{ background: 'linear-gradient(135deg, var(--matcha-50), var(--matcha-100))', border: '1px solid var(--matcha-200)' }}
                    >
                      <div className="flex items-center gap-3">
                        <div
                          className="w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm"
                          style={{ background: 'var(--matcha-500)', color: 'var(--text-inverse)' }}
                        >
                          {userName.charAt(0).toUpperCase()}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium truncate" style={{ color: 'var(--text-primary)' }}>{userName}</p>
                          <p className="text-xs" style={{ color: 'var(--matcha-600)' }}>{myLang.flag} {myLang.name} → {theirLang.flag} {theirLang.name}</p>
                        </div>
                        <span className="text-xs font-semibold px-2 py-1 rounded-full" style={{ background: 'var(--matcha-200)', color: 'var(--matcha-700)' }}>You</span>
                      </div>
                    </div>

                    {participants.length === 0 ? (
                      <div className="py-8 text-center" style={{ color: 'var(--text-muted)' }}>
                        <p className="text-sm">Waiting for others to join...</p>
                        <p className="text-xs mt-1">Share room: <span style={{ color: 'var(--matcha-600)' }}>{roomName}</span></p>
                      </div>
                    ) : (
                      participants.map((participant) => {
                        const metadata = participant.metadata ? JSON.parse(participant.metadata) : {};
                        const langCode = metadata.lang || 'unknown';
                        const participantLang = SUPPORTED_LANGUAGES.find(l => l.code === langCode);
                        return (
                          <div
                            key={participant.identity}
                            className="p-4 rounded-xl transition-all"
                            style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border-soft)' }}
                          >
                            <div className="flex items-center gap-3">
                              <div
                                className="w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm"
                                style={{ background: 'var(--terra-400)', color: 'var(--text-inverse)' }}
                              >
                                {participant.name?.charAt(0).toUpperCase() || '?'}
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="font-medium truncate" style={{ color: 'var(--text-primary)' }}>{participant.name || participant.identity}</p>
                                <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                                  {participantLang ? `${participantLang.flag} ${participantLang.name}` : 'Language not set'}
                                </p>
                              </div>
                              <span className="flex items-center gap-1">
                                <span className="w-2 h-2 rounded-full animate-pulse-soft" style={{ background: 'var(--matcha-500)' }} />
                                <span className="text-xs font-medium" style={{ color: 'var(--matcha-600)' }}>Live</span>
                              </span>
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>
              )}

              {/* Error Alert */}
              {error && (
                <div
                  className="p-4 rounded-xl animate-shake"
                  style={{ background: 'rgba(224, 123, 76, 0.1)', border: '1px solid var(--terra-400)' }}
                >
                  <p className="text-sm font-medium" style={{ color: 'var(--terra-500)' }}>{error}</p>
                </div>
              )}
            </div>

            {/* Right Column - Conversation */}
            <div className="lg:col-span-8">
              <div className="matcha-card overflow-hidden flex flex-col" style={{ minHeight: '600px' }}>
                {/* Header */}
                <div
                  className="px-6 py-4 flex items-center justify-between"
                  style={{ borderBottom: '1px solid var(--border-soft)', background: 'var(--bg-elevated)' }}
                >
                  <div className="flex items-center gap-3">
                    <div
                      className={`w-3 h-3 rounded-full ${isActive ? 'animate-pulse-ring' : ''}`}
                      style={{ background: isActive ? 'var(--matcha-500)' : 'var(--text-muted)' }}
                    />
                    <h2 className="font-semibold" style={{ color: 'var(--text-primary)' }}>Conversation</h2>
                  </div>
                  <div className="flex items-center gap-4">
                    {isActive && (
                      <span className="text-xs" style={{ color: 'var(--text-muted)' }}>
                        {participants.length} other{participants.length !== 1 ? 's' : ''} connected
                      </span>
                    )}
                    <button
                      onClick={() => setTranscript([])}
                      className="text-xs font-medium transition-colors hover:opacity-70"
                      style={{ color: 'var(--text-muted)' }}
                    >
                      Clear
                    </button>
                  </div>
                </div>

                {/* Messages */}
                <div className="flex-1 p-6 overflow-y-auto custom-scrollbar flex flex-col-reverse" style={{ maxHeight: '500px' }}>
                  <div className="flex flex-col gap-4">
                    {transcript.length === 0 ? (
                      <div className="flex-1 flex flex-col items-center justify-center py-20 text-center">
                        <div
                          className="w-24 h-24 rounded-full flex items-center justify-center mb-6"
                          style={{ background: 'var(--bg-elevated)' }}
                        >
                          <div className="relative">
                            <div
                              className="w-16 h-16 rounded-full"
                              style={{ background: 'linear-gradient(135deg, var(--matcha-200), var(--matcha-300))' }}
                            />
                            {isActive && (
                              <div
                                className="absolute inset-0 rounded-full animate-pulse-ring"
                                style={{ background: 'var(--matcha-400)', opacity: 0.5 }}
                              />
                            )}
                          </div>
                        </div>
                        <p className="text-sm font-medium mb-2" style={{ color: 'var(--text-secondary)' }}>
                          {isActive ? 'Listening for speech...' : 'No conversation yet'}
                        </p>
                        <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                          {isActive ? 'Speak to begin translation' : 'Start translation to begin'}
                        </p>
                      </div>
                    ) : (
                      transcript.map((msg) => (
                        <div
                          key={msg.id}
                          className={`flex flex-col ${msg.sender === 'user' ? 'items-start' : 'items-end'}`}
                        >
                          <div
                            className="max-w-[85%] p-4 rounded-2xl transition-all"
                            style={{
                              background: msg.sender === 'user' ? 'var(--bg-elevated)' : 'linear-gradient(135deg, var(--matcha-500), var(--matcha-600))',
                              color: msg.sender === 'user' ? 'var(--text-primary)' : 'var(--text-inverse)',
                              borderBottomLeftRadius: msg.sender === 'user' ? '4px' : '16px',
                              borderBottomRightRadius: msg.sender === 'user' ? '16px' : '4px',
                              boxShadow: msg.sender === 'agent' ? '0 4px 14px rgba(104, 166, 125, 0.25)' : 'none'
                            }}
                          >
                            <div className="flex items-center gap-2 mb-2 text-xs" style={{ opacity: 0.7 }}>
                              <span className="font-medium">
                                {msg.sender === 'user' ? 'You' : 'Translation'}
                              </span>
                              <span>·</span>
                              <span>{msg.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                            </div>
                            <p className="text-sm leading-relaxed">{msg.text}</p>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>

                {/* Activity Bar */}
                <div
                  className="px-6 py-4 flex items-center justify-between"
                  style={{ borderTop: '1px solid var(--border-soft)', background: 'var(--bg-card)' }}
                >
                  <div className="flex items-center gap-4">
                    <div className="flex items-center gap-1 h-6">
                      {[...Array(8)].map((_, i) => (
                        <div
                          key={i}
                          className={`w-1 rounded-full transition-all ${isActive ? 'wave-bar' : ''}`}
                          style={{
                            height: isActive ? '100%' : '30%',
                            background: isActive ? 'var(--matcha-500)' : 'var(--text-muted)',
                            opacity: isActive ? 1 : 0.3
                          }}
                        />
                      ))}
                    </div>
                    <div>
                      <p className="text-xs font-medium" style={{ color: isActive ? 'var(--matcha-600)' : 'var(--text-muted)' }}>
                        {isActive ? 'Translation Active' : 'Bridge Standby'}
                      </p>
                      <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                        {isActive ? `Streaming to "${roomName}"` : 'Awaiting connection'}
                      </p>
                    </div>
                  </div>

                  {isActive && lkRoomRef.current?.sid && (
                    <div
                      className="flex items-center gap-2 px-3 py-1.5 rounded-full"
                      style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border-soft)' }}
                    >
                      <span className="w-1.5 h-1.5 rounded-full animate-pulse-soft" style={{ background: 'var(--matcha-500)' }} />
                      <span className="text-xs" style={{ color: 'var(--text-muted)' }}>
                        Session: {lkRoomRef.current.sid.slice(-6)}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default TRAVoicesPage;
