import React, { useState, useRef, useCallback, useEffect } from 'react';
import { Room, RoomEvent, RemoteParticipant, RemoteTrack, LocalAudioTrack, RoomOptions, ConnectionState, Track } from 'livekit-client';
import { useAction, useMutation, useQuery } from 'convex/react';
import { api } from '../convex/_generated/api';
import { SUPPORTED_LANGUAGES, TranslationMessage, Language } from '../types';
import { decode } from '../audioUtils';
import Header from '../components/Header';
import { useAuth } from '../providers/AuthContext';
import { useLanguage } from '../providers/LanguageContext';
import { Id } from '../convex/_generated/dataModel';
import type { PipelineMode } from '../lib/pipelines/types';
import type { TranslationPipeline, TranscriptEvent, AudioOutputEvent, PipelineError } from '../lib/pipelines/types';
import { StandardPipeline } from '../lib/pipelines/standard-pipeline';
import { GeminiPipeline } from '../lib/pipelines/gemini-pipeline';

// Shared constants
const INPUT_SAMPLE_RATE = 16000;
const OUTPUT_SAMPLE_RATE = 24000;
const MAX_AUDIO_QUEUE_DEPTH = 10;
const USAGE_CHECK_INTERVAL = 60000;
const TRACK_PUBLISH_DELAY = 500;

type ConnectionStatus = 'disconnected' | 'connecting' | 'connected' | 'reconnecting';

const TRAVoicesPage: React.FC = () => {
  const { user, isAuthenticated } = useAuth();
  const { t } = useLanguage();

  // --- UI State ---
  const [isConnecting, setIsConnecting] = useState(false);
  const [isActive, setIsActive] = useState(false);
  const [roomName, setRoomName] = useState('GlobalLobby');
  const [userName, setUserName] = useState('');
  const [myLang, setMyLang] = useState<Language>(SUPPORTED_LANGUAGES[0]);
  const [theirLang, setTheirLang] = useState<Language>(SUPPORTED_LANGUAGES[1]);
  const [transcript, setTranscript] = useState<TranslationMessage[]>([]);
  const [participants, setParticipants] = useState<RemoteParticipant[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [currentRoomId, setCurrentRoomId] = useState<Id<"rooms"> | null>(null);
  const [currentSessionId, setCurrentSessionId] = useState<Id<"sessions"> | null>(null);
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>('disconnected');
  const [usageWarning, setUsageWarning] = useState<string | null>(null);
  const [availableVoices, setAvailableVoices] = useState<Array<{ id: string; name: string; description?: string }>>([]);
  const [selectedVoiceId, setSelectedVoiceId] = useState<string | null>(null);
  const [voicesLoading, setVoicesLoading] = useState(false);
  const [pipelineMode, setPipelineMode] = useState<PipelineMode>('standard');

  // --- Convex Hooks ---
  const generateLiveKitToken = useAction(api.rooms.actions.generateLiveKitToken);
  const getDeepgramApiKey = useAction(api.rooms.actions.getDeepgramApiKey);
  const getOpenRouterApiKey = useAction(api.rooms.actions.getOpenRouterApiKey);
  const getGeminiApiKey = useAction(api.rooms.actions.getGeminiApiKey);
  const getCartesiaApiKey = useAction(api.voices.actions.getCartesiaApiKey);
  const getDefaultCartesiaVoiceId = useAction(api.voices.actions.getDefaultCartesiaVoiceId);
  const listCartesiaVoices = useAction(api.voices.actions.listVoices);
  const findOrCreateRoom = useMutation(api.rooms.mutations.findOrCreate);
  const startSession = useMutation(api.sessions.mutations.start);
  const endSession = useMutation(api.sessions.mutations.end);
  const addMessage = useMutation(api.transcripts.mutations.addMessage);
  const userSettings = useQuery(api.users.queries.getSettings, {});
  const subscription = useQuery(api.subscriptions.queries.getCurrent, {});
  const voiceClone = useQuery(api.voices.queries.getMyVoiceClone);
  const ensureUser = useMutation(api.debug.ensureUserByEmail);

  // Ensure user exists in app database
  const [userEnsured, setUserEnsured] = React.useState(false);
  React.useEffect(() => {
    if (user?.email && !userEnsured) {
      ensureUser({ email: user.email, name: user.name })
        .then(() => setUserEnsured(true))
        .catch(console.error);
    }
  }, [user?.email, userEnsured, ensureUser]);

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

  // Fetch available voices (only for standard mode, when no voice clone)
  React.useEffect(() => {
    if (!isAuthenticated || !userEnsured) return;
    if (voiceClone) return;
    setVoicesLoading(true);
    const userEmail = user?.email || undefined;
    listCartesiaVoices({ userEmail })
      .then((result) => {
        setAvailableVoices(result.voices);
        if (!selectedVoiceId && result.voices.length > 0) {
          setSelectedVoiceId(result.voices[0].id);
        }
      })
      .catch((e) => console.error('Failed to load voices:', e))
      .finally(() => setVoicesLoading(false));
  }, [isAuthenticated, userEnsured, voiceClone]);

  // --- Core References (shared infrastructure) ---
  const lkRoomRef = useRef<Room | null>(null);
  const audioContextInRef = useRef<AudioContext | null>(null);
  const audioContextOutRef = useRef<AudioContext | null>(null);
  const destNodeRef = useRef<MediaStreamAudioDestinationNode | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const nextStartTimeRef = useRef<number>(0);
  const sourcesRef = useRef<Set<AudioBufferSourceNode>>(new Set());
  const audioQueueDepthRef = useRef<number>(0);
  const audioElementsRef = useRef<Set<HTMLAudioElement>>(new Set());
  const usageTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const sessionStartTimeRef = useRef<number>(0);
  const processorNodeRef = useRef<ScriptProcessorNode | null>(null);
  const sourceNodeRef = useRef<MediaStreamAudioSourceNode | null>(null);

  // Pipeline ref
  const pipelineRef = useRef<TranslationPipeline | null>(null);

  // Shutdown guard
  const isStoppingRef = useRef<boolean>(false);
  const currentSessionIdRef = useRef<Id<"sessions"> | null>(null);
  useEffect(() => { currentSessionIdRef.current = currentSessionId; }, [currentSessionId]);

  // --- Play PCM audio (shared by both pipelines) ---
  const playPcmAudio = useCallback((pcmBase64: string, sampleRate: number = OUTPUT_SAMPLE_RATE) => {
    if (!audioContextOutRef.current || !destNodeRef.current) return;
    if (audioQueueDepthRef.current >= MAX_AUDIO_QUEUE_DEPTH) return;

    const ctx = audioContextOutRef.current;
    const pcmBytes = decode(pcmBase64);
    const dataInt16 = new Int16Array(pcmBytes.buffer);
    const frameCount = dataInt16.length;
    const buffer = ctx.createBuffer(1, frameCount, sampleRate);
    const channelData = buffer.getChannelData(0);
    for (let i = 0; i < frameCount; i++) {
      channelData[i] = dataInt16[i] / 32768.0;
    }

    const sourceNode = ctx.createBufferSource();
    sourceNode.buffer = buffer;
    sourceNode.connect(destNodeRef.current);

    nextStartTimeRef.current = Math.max(nextStartTimeRef.current, ctx.currentTime);
    sourceNode.start(nextStartTimeRef.current);
    nextStartTimeRef.current += buffer.duration;

    audioQueueDepthRef.current += 1;
    sourcesRef.current.add(sourceNode);
    sourceNode.onended = () => {
      sourcesRef.current.delete(sourceNode);
      audioQueueDepthRef.current = Math.max(0, audioQueueDepthRef.current - 1);
    };
  }, []);

  const stopAll = useCallback(async () => {
    if (isStoppingRef.current) return;
    isStoppingRef.current = true;
    sessionStartTimeRef.current = 0;

    setIsActive(false);
    setIsConnecting(false);
    setConnectionStatus('disconnected');
    setUsageWarning(null);

    if (usageTimerRef.current) {
      clearInterval(usageTimerRef.current);
      usageTimerRef.current = null;
    }

    // Disconnect pipeline (handles its own WS cleanup)
    if (pipelineRef.current) {
      pipelineRef.current.removeAllListeners();
      pipelineRef.current.disconnect();
      pipelineRef.current = null;
    }

    // Disconnect audio processor nodes
    if (processorNodeRef.current) {
      try { processorNodeRef.current.disconnect(); } catch (_) {}
      processorNodeRef.current = null;
    }
    if (sourceNodeRef.current) {
      try { sourceNodeRef.current.disconnect(); } catch (_) {}
      sourceNodeRef.current = null;
    }

    if (lkRoomRef.current) {
      try { lkRoomRef.current.disconnect(); } catch (_) {}
      lkRoomRef.current = null;
    }

    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach(t => t.stop());
      localStreamRef.current = null;
    }

    if (audioContextInRef.current) audioContextInRef.current.close().catch(() => {});
    if (audioContextOutRef.current) audioContextOutRef.current.close().catch(() => {});
    audioContextInRef.current = null;
    audioContextOutRef.current = null;

    sourcesRef.current.forEach(s => { try { s.stop(); } catch(e) {} });
    sourcesRef.current.clear();
    audioQueueDepthRef.current = 0;

    audioElementsRef.current.forEach(el => {
      el.pause();
      el.srcObject = null;
      el.remove();
    });
    audioElementsRef.current.clear();

    setParticipants([]);
    nextStartTimeRef.current = 0;

    const sid = currentSessionIdRef.current;
    if (sid) {
      try {
        await endSession({ sessionId: sid });
      } catch (e) {
        console.error('Failed to end session:', e);
      }
      setCurrentSessionId(null);
    }

    isStoppingRef.current = false;
  }, [endSession]);

  // --- Mid-session usage check ---
  const checkUsageMidSession = useCallback(() => {
    if (!subscription || !sessionStartTimeRef.current) return;

    const elapsedMinutes = Math.round((Date.now() - sessionStartTimeRef.current) / 60000);
    const totalUsed = (subscription.usage.minutesUsed ?? 0) + elapsedMinutes;
    const limit = subscription.limits.minutesPerMonth;

    if (limit === Infinity) return;

    const percentUsed = Math.round((totalUsed / limit) * 100);

    if (totalUsed >= limit) {
      setUsageWarning(null);
      setError(`You've used all ${limit} minutes for this month. Session ended.`);
      stopAll();
    } else if (percentUsed >= 95) {
      setUsageWarning(`${limit - totalUsed} minutes remaining — session will end at limit`);
    } else if (percentUsed >= 90) {
      setUsageWarning(`${limit - totalUsed} minutes remaining this month`);
    }
  }, [subscription, stopAll]);

  // Usage timer effect
  useEffect(() => {
    if (isActive && subscription) {
      usageTimerRef.current = setInterval(checkUsageMidSession, USAGE_CHECK_INTERVAL);
      return () => {
        if (usageTimerRef.current) {
          clearInterval(usageTimerRef.current);
          usageTimerRef.current = null;
        }
      };
    }
  }, [isActive, subscription, checkUsageMidSession]);

  // Keep stopAll in a ref so LiveKit event handlers always call the latest version
  const stopAllRef = useRef(stopAll);
  useEffect(() => { stopAllRef.current = stopAll; }, [stopAll]);

  // Cleanup on page unload
  useEffect(() => {
    const handleUnload = () => { stopAllRef.current(); };
    window.addEventListener('beforeunload', handleUnload);
    window.addEventListener('pagehide', handleUnload);
    return () => {
      window.removeEventListener('beforeunload', handleUnload);
      window.removeEventListener('pagehide', handleUnload);
      stopAllRef.current();
    };
  }, []);

  // --- Connect Bridge (unified for both pipelines) ---
  const connectBridge = async () => {
    if (!isAuthenticated) {
      setError(t('translate.signInToStart'));
      return;
    }

    if (isActive || isConnecting) return;
    isStoppingRef.current = false;
    setIsConnecting(true);
    setConnectionStatus('connecting');
    setError(null);

    try {
      const userEmail = user?.email || undefined;

      // Fetch API keys based on pipeline mode
      let voiceId: string | undefined;
      let apiKeys: { deepgram?: string; openRouter?: string; cartesia?: string; gemini?: string };

      if (pipelineMode === 'standard') {
        const hasClone = voiceClone && voiceClone.cartesiaVoiceId;
        const needsDefaultVoice = !hasClone && !selectedVoiceId;
        const [deepgramResult, openRouterResult, cartesiaResult, defaultVoiceResult] = await Promise.all([
          getDeepgramApiKey({ userEmail }),
          getOpenRouterApiKey({ userEmail }),
          getCartesiaApiKey({ userEmail }),
          needsDefaultVoice ? getDefaultCartesiaVoiceId({ userEmail }) : Promise.resolve({ voiceId: null }),
        ]);

        if (isStoppingRef.current) { setIsConnecting(false); setConnectionStatus('disconnected'); return; }

        apiKeys = {
          deepgram: deepgramResult.apiKey,
          openRouter: openRouterResult.apiKey,
          cartesia: cartesiaResult.apiKey,
        };

        // Configure voice: clone > user-selected preset > API default
        if (hasClone) {
          voiceId = voiceClone!.cartesiaVoiceId;
          console.log('[voice-select] Using CLONED voice:', voiceId);
        } else if (selectedVoiceId) {
          voiceId = selectedVoiceId;
          console.log('[voice-select] Using SELECTED preset voice:', voiceId);
        } else if (defaultVoiceResult.voiceId) {
          voiceId = defaultVoiceResult.voiceId;
          console.log('[voice-select] Using DEFAULT voice:', voiceId);
        } else {
          throw new Error('No voice available. Please select a voice or set up voice cloning.');
        }
      } else {
        // Gemini mode — only need Gemini API key
        const geminiResult = await getGeminiApiKey({ userEmail });
        if (isStoppingRef.current) { setIsConnecting(false); setConnectionStatus('disconnected'); return; }
        apiKeys = { gemini: geminiResult.apiKey };
      }

      // Find existing room or create new one
      const result = await findOrCreateRoom({
        name: roomName,
        description: `Translation room: ${myLang.name} to ${theirLang.name}`,
        isPublic: true,
        defaultSourceLanguage: myLang.code,
        defaultTargetLanguage: theirLang.code,
      });
      const roomId = result.roomId;
      setCurrentRoomId(roomId);
      if (isStoppingRef.current) { setIsConnecting(false); setConnectionStatus('disconnected'); return; }

      // Generate LiveKit token
      const { token, url } = await generateLiveKitToken({ roomId, userEmail });
      if (isStoppingRef.current) { setIsConnecting(false); setConnectionStatus('disconnected'); return; }

      // Start session
      const { sessionId } = await startSession({ roomId, userEmail });
      if (isStoppingRef.current) { setIsConnecting(false); setConnectionStatus('disconnected'); return; }
      setCurrentSessionId(sessionId);
      sessionStartTimeRef.current = Date.now();

      // Setup audio contexts
      audioContextInRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: INPUT_SAMPLE_RATE });
      audioContextOutRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: OUTPUT_SAMPLE_RATE });
      await audioContextInRef.current.resume();
      await audioContextOutRef.current.resume();
      if (audioContextInRef.current.state !== 'running' || audioContextOutRef.current.state !== 'running') {
        throw new Error('Audio system failed to start. Please check browser permissions and try again.');
      }
      destNodeRef.current = audioContextOutRef.current.createMediaStreamDestination();
      console.log('AudioContexts ready. In:', audioContextInRef.current.state, 'Out:', audioContextOutRef.current.state);

      // Get microphone access
      localStreamRef.current = await navigator.mediaDevices.getUserMedia({ audio: true });

      // Connect to LiveKit
      const roomOptions: RoomOptions = {
        adaptiveStream: true,
        dynacast: true,
        disconnectOnPageLeave: false,
      };
      const room = new Room(roomOptions);
      lkRoomRef.current = room;

      const syncParticipants = () => {
        if (room.state === ConnectionState.Connected) {
          setParticipants(Array.from(room.remoteParticipants.values()));
        }
      };

      room.on(RoomEvent.ParticipantConnected, syncParticipants);
      room.on(RoomEvent.ParticipantDisconnected, syncParticipants);
      room.on(RoomEvent.TrackPublished, syncParticipants);

      room.on(RoomEvent.TrackSubscribed, (track: RemoteTrack) => {
        console.log('Track subscribed:', track.kind, track.sid);
        const el = track.attach();
        el.autoplay = true;
        el.setAttribute('playsinline', 'true');
        document.body.appendChild(el);
        audioElementsRef.current.add(el as HTMLAudioElement);
        el.play().catch((e) => {
          console.warn('Autoplay blocked, will retry on next interaction:', e.message);
        });
        syncParticipants();
      });
      room.on(RoomEvent.TrackUnsubscribed, (track: RemoteTrack) => {
        const elements = track.detach();
        elements.forEach(el => {
          el.remove();
          audioElementsRef.current.delete(el as HTMLAudioElement);
        });
      });

      room.on(RoomEvent.AudioPlaybackStatusChanged, () => {
        if (!room.canPlaybackAudio) {
          console.warn('Audio playback blocked by browser, calling startAudio()');
          room.startAudio().catch((e) => console.error('startAudio failed:', e));
        }
      });

      room.on(RoomEvent.Disconnected, () => {
        console.warn('LiveKit room disconnected. isStoppingRef:', isStoppingRef.current);
        if (isStoppingRef.current) return;
        stopAllRef.current();
        setError('Session ended. Tap "Start Translation" to reconnect.');
      });
      room.on(RoomEvent.Reconnecting, () => {
        console.log('LiveKit reconnecting...');
        setConnectionStatus('reconnecting');
      });
      room.on(RoomEvent.Reconnected, () => {
        console.log('LiveKit reconnected');
        setConnectionStatus('connected');
        setError(null);
        syncParticipants();
      });

      await room.connect(url, token);
      console.log('LiveKit connected to room:', room.name, 'state:', room.state,
        'remoteParticipants:', room.remoteParticipants.size);

      if (!room.canPlaybackAudio) {
        await room.startAudio().catch((e) => console.warn('startAudio:', e));
      }

      syncParticipants();
      setTimeout(syncParticipants, 1500);
      setTimeout(syncParticipants, 5000);

      await new Promise(resolve => setTimeout(resolve, TRACK_PUBLISH_DELAY));

      if (room.state !== ConnectionState.Connected) {
        throw new Error('LiveKit room disconnected before track could be published');
      }

      // Publish translated audio track
      const translatedTrack = new LocalAudioTrack(destNodeRef.current.stream.getAudioTracks()[0]);
      try {
        await room.localParticipant.publishTrack(translatedTrack, {
          name: 'translated-audio',
          source: Track.Source.Microphone,
        });
        console.log('Track published successfully');
      } catch (pubErr: any) {
        console.error('Track publish failed, retrying after delay:', pubErr.message);
        await new Promise(resolve => setTimeout(resolve, 1000));
        if (room.state === ConnectionState.Connected) {
          await room.localParticipant.publishTrack(translatedTrack, {
            name: 'translated-audio',
            source: Track.Source.Microphone,
          });
          console.log('Track published on retry');
        } else {
          throw new Error('LiveKit room disconnected, cannot publish track');
        }
      }

      // --- Create and connect pipeline ---
      const pipeline = pipelineMode === 'standard'
        ? new StandardPipeline()
        : new GeminiPipeline();

      pipelineRef.current = pipeline;

      // Wire pipeline callbacks
      pipeline.onTranscript((event: TranscriptEvent) => {
        const msg: TranslationMessage = {
          id: Date.now().toString() + (event.type === 'output' ? 'a' : ''),
          sender: event.type === 'input' ? 'user' : 'agent',
          text: event.text,
          timestamp: new Date(),
          language: event.language,
        };
        setTranscript(prev => [msg, ...prev]);

        // Save to Convex
        const sid = currentSessionIdRef.current;
        if (sid) {
          addMessage({
            sessionId: sid,
            originalText: event.text,
            sourceLanguage: event.language,
            messageType: event.type === 'input' ? 'speech' : 'translation',
            userEmail: user?.email || undefined,
          }).catch(e => console.error('Failed to save transcript:', e));
        }
      });

      pipeline.onAudioOutput((event: AudioOutputEvent) => {
        playPcmAudio(event.pcmBase64, event.sampleRate);
      });

      pipeline.onStatusChange((status: string) => {
        if (status === 'connected') {
          setConnectionStatus('connected');
          setError(null);
        } else if (status === 'reconnecting') {
          setConnectionStatus('reconnecting');
        } else if (status === 'disconnected') {
          setConnectionStatus('disconnected');
        }
      });

      pipeline.onError((err: PipelineError) => {
        if (err.recoverable) {
          setError(err.message);
        } else {
          setError(err.message);
          stopAllRef.current();
        }
      });

      // Connect pipeline
      await pipeline.connect({
        sourceLanguage: { code: myLang.code, name: myLang.name },
        targetLanguage: { code: theirLang.code, name: theirLang.name },
        apiKeys,
        voiceId,
        geminiVoice: pipelineMode === 'gemini' ? 'Aoede' : undefined,
      });

      // Wire mic to pipeline's sendAudio via ScriptProcessor
      const source = audioContextInRef.current.createMediaStreamSource(localStreamRef.current);
      const processor = audioContextInRef.current.createScriptProcessor(4096, 1, 1);

      processor.onaudioprocess = (e) => {
        if (isStoppingRef.current || !pipelineRef.current) return;
        const inputData = e.inputBuffer.getChannelData(0);
        pipelineRef.current.sendAudio(inputData);
      };

      source.connect(processor);
      processor.connect(audioContextInRef.current.destination);
      sourceNodeRef.current = source;
      processorNodeRef.current = processor;

      setIsActive(true);
      setIsConnecting(false);
      setConnectionStatus('connected');
    } catch (err: any) {
      console.error('connectBridge error:', err);
      let msg = err?.data || err?.message || String(err);
      if (typeof msg === 'object') msg = JSON.stringify(msg);

      // Map technical errors to user-friendly messages
      if (msg.includes('NotAllowedError') || msg.includes('Permission denied')) {
        setError('Microphone access denied. Please allow microphone access in your browser settings.');
      } else if (msg.includes('NotFoundError') || msg.includes('Requested device not found')) {
        setError('No microphone found. Please connect a microphone and try again.');
      } else if (msg.includes('Authentication required') || msg.includes('Unauthenticated')) {
        setError('Session expired. Please sign in again.');
      } else if (msg.includes('API key not configured') || msg.includes('not set')) {
        setError('Translation service not configured. Please contact support.');
      } else if (msg.includes('Server Error') || msg.includes('Internal')) {
        setError('Server error starting session. Please try again in a moment.');
      } else {
        setError(msg);
      }
      setIsConnecting(false);
      setConnectionStatus('disconnected');
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
                {t('translate.signInRequired')}
              </h2>
              <p className="text-sm mb-6" style={{ color: 'var(--text-secondary)' }}>
                {t('translate.signInToAccess')}
              </p>
              <a href="/signin" className="matcha-btn matcha-btn-primary py-3 px-8 inline-block">
                {t('translate.signIn')}
              </a>
              <p className="mt-4 text-sm" style={{ color: 'var(--text-muted)' }}>
                {t('translate.noAccount')}{' '}
                <a href="/signup" className="font-semibold" style={{ color: 'var(--matcha-600)' }}>
                  {t('translate.signUpFree')}
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
            <h1 className="text-3xl md:text-4xl font-serif text-gradient mb-2">{t('translate.title')}</h1>
            <p style={{ color: 'var(--text-secondary)' }}>{t('translate.subtitle')}</p>
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
                  <h3 className="text-sm font-semibold" style={{ color: 'var(--text-secondary)' }}>{t('translate.status')}</h3>
                  <span className={`matcha-badge ${isActive ? 'matcha-badge-success' : 'matcha-badge-warning'}`}>
                    {isActive ? t('translate.live') : t('translate.offline')}
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
                      {t('translate.connecting')}
                    </span>
                  ) : isActive ? (
                    t('translate.endSession')
                  ) : (
                    t('translate.startTranslation')
                  )}
                </button>
              </div>

              {/* Pipeline Toggle */}
              <div className="matcha-card p-5">
                <label className="matcha-label mb-3 block">{t('translate.engine')}</label>
                <div
                  className="grid grid-cols-2 gap-0 rounded-xl overflow-hidden"
                  style={{ border: '1px solid var(--border-soft)' }}
                >
                  <button
                    onClick={() => !isActive && setPipelineMode('standard')}
                    disabled={isActive}
                    className="py-3 px-3 text-center transition-all"
                    style={{
                      background: pipelineMode === 'standard'
                        ? 'linear-gradient(135deg, var(--matcha-500), var(--matcha-600))'
                        : 'var(--bg-elevated)',
                      color: pipelineMode === 'standard' ? 'var(--text-inverse)' : 'var(--text-secondary)',
                      opacity: isActive ? 0.6 : 1,
                      cursor: isActive ? 'not-allowed' : 'pointer',
                    }}
                  >
                    <p className="text-sm font-semibold">{t('translate.standard')}</p>
                    <p className="text-xs mt-0.5" style={{ opacity: 0.8 }}>{t('translate.standardDesc')}</p>
                  </button>
                  <button
                    onClick={() => !isActive && setPipelineMode('gemini')}
                    disabled={isActive}
                    className="py-3 px-3 text-center transition-all"
                    style={{
                      background: pipelineMode === 'gemini'
                        ? 'linear-gradient(135deg, var(--matcha-500), var(--matcha-600))'
                        : 'var(--bg-elevated)',
                      color: pipelineMode === 'gemini' ? 'var(--text-inverse)' : 'var(--text-secondary)',
                      opacity: isActive ? 0.6 : 1,
                      cursor: isActive ? 'not-allowed' : 'pointer',
                      borderLeft: '1px solid var(--border-soft)',
                    }}
                  >
                    <p className="text-sm font-semibold">{t('translate.beta')}</p>
                    <p className="text-xs mt-0.5" style={{ opacity: 0.8 }}>{t('translate.betaDesc')}</p>
                  </button>
                </div>
                {isActive && (
                  <p className="text-xs mt-2" style={{ color: 'var(--text-muted)' }}>
                    {t('translate.cannotSwitchEngines')}
                  </p>
                )}
              </div>

              {/* Voice Clone Banner (Standard mode only) */}
              {pipelineMode === 'standard' && !voiceClone && !isActive && (
                <div
                  className="matcha-card p-4 animate-fade-in"
                  style={{ background: 'linear-gradient(135deg, var(--matcha-50), rgba(104, 166, 125, 0.15))', border: '1px solid var(--matcha-200)' }}
                >
                  <div className="flex items-start gap-3">
                    <div
                      className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0"
                      style={{ background: 'var(--matcha-100)' }}
                    >
                      <svg className="w-5 h-5" style={{ color: 'var(--matcha-600)' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
                      </svg>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold mb-1" style={{ color: 'var(--matcha-700)' }}>
                        {t('translate.voiceClone.title')}
                      </p>
                      <p className="text-xs mb-2" style={{ color: 'var(--text-secondary)' }}>
                        {t('translate.voiceClone.desc')}
                      </p>
                      <a
                        href="/voice-setup"
                        className="text-xs font-semibold"
                        style={{ color: 'var(--matcha-600)' }}
                      >
                        {t('translate.voiceClone.setupLink')}
                      </a>
                    </div>
                  </div>
                </div>
              )}

              {/* Gemini Voice Info (Gemini mode only) */}
              {pipelineMode === 'gemini' && !isActive && (
                <div
                  className="matcha-card p-4 animate-fade-in"
                  style={{ background: 'linear-gradient(135deg, var(--matcha-50), rgba(104, 166, 125, 0.15))', border: '1px solid var(--matcha-200)' }}
                >
                  <div className="flex items-start gap-3">
                    <div
                      className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0"
                      style={{ background: 'var(--matcha-100)' }}
                    >
                      <svg className="w-5 h-5" style={{ color: 'var(--matcha-600)' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                      </svg>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold mb-1" style={{ color: 'var(--matcha-700)' }}>
                        {t('translate.betaEngine.title')}
                      </p>
                      <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>
                        {t('translate.betaEngine.desc')}
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Quick Start Guide */}
              {!isActive && (
                <div className="matcha-card p-6 animate-fade-in" style={{ background: 'var(--bg-matcha-soft)' }}>
                  <h3 className="text-sm font-semibold mb-4" style={{ color: 'var(--matcha-700)' }}>{t('translate.quickStart')}</h3>
                  <div className="space-y-4">
                    {[
                      { step: '1', text: t('translate.step1') },
                      { step: '2', text: t('translate.step2') },
                      { step: '3', text: t('translate.step3') }
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
                <h3 className="text-sm font-semibold mb-5" style={{ color: 'var(--text-secondary)' }}>{t('translate.configuration')}</h3>

                <div className="space-y-5">
                  <div className="space-y-4">
                    <div>
                      <label className="matcha-label">{t('translate.roomName')}</label>
                      <input
                        type="text"
                        value={roomName}
                        onChange={e => setRoomName(e.target.value)}
                        disabled={isActive}
                        className="matcha-input"
                        placeholder={t('translate.enterRoomName')}
                      />
                    </div>
                    <div>
                      <label className="matcha-label">{t('translate.yourName')}</label>
                      <input
                        type="text"
                        value={userName}
                        onChange={e => setUserName(e.target.value)}
                        disabled={isActive}
                        className="matcha-input"
                        placeholder={t('translate.enterYourName')}
                      />
                    </div>
                  </div>

                  <div className="pt-4" style={{ borderTop: '1px solid var(--border-soft)' }}>
                    <div className="space-y-4">
                      <div>
                        <label className="matcha-label">{t('translate.iSpeak')}</label>
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
                        <label className="matcha-label">{t('translate.translateTo')}</label>
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

                  {/* Voice Selection (Standard mode only) */}
                  {pipelineMode === 'standard' && (
                    <div className="pt-4" style={{ borderTop: '1px solid var(--border-soft)' }}>
                      <label className="matcha-label">Translation Voice</label>
                      {voiceClone ? (
                        <div className="flex items-center justify-between p-3 rounded-xl" style={{ background: 'var(--bg-elevated)', border: '1px solid var(--matcha-200)' }}>
                          <div>
                            <p className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>Your Cloned Voice</p>
                            <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Created {new Date(voiceClone.createdAt).toLocaleDateString()}</p>
                          </div>
                          <span className="text-xs font-semibold px-2 py-1 rounded-full" style={{ background: 'var(--matcha-100)', color: 'var(--matcha-700)' }}>Active</span>
                        </div>
                      ) : (
                        <>
                          {voicesLoading ? (
                            <div className="flex items-center gap-2 p-3 rounded-xl" style={{ background: 'var(--bg-elevated)' }}>
                              <span className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" style={{ color: 'var(--text-muted)' }} />
                              <span className="text-sm" style={{ color: 'var(--text-muted)' }}>Loading voices...</span>
                            </div>
                          ) : availableVoices.length > 0 ? (
                            <select
                              value={selectedVoiceId || ''}
                              onChange={e => setSelectedVoiceId(e.target.value)}
                              disabled={isActive}
                              className="matcha-select"
                            >
                              {availableVoices.map(v => (
                                <option key={v.id} value={v.id}>{v.name}</option>
                              ))}
                            </select>
                          ) : (
                            <p className="text-xs" style={{ color: 'var(--text-muted)' }}>No preset voices available. Set up voice cloning instead.</p>
                          )}
                          <a
                            href="/voice-setup"
                            className="block text-xs font-semibold mt-2"
                            style={{ color: 'var(--matcha-600)' }}
                          >
                            Or clone your own voice →
                          </a>
                        </>
                      )}
                    </div>
                  )}
                </div>
              </div>

              {/* Participants Panel */}
              {isActive && (
                <div className="matcha-card p-6 animate-fade-in">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-sm font-semibold" style={{ color: 'var(--text-secondary)' }}>{t('translate.participants')}</h3>
                    <span className="matcha-badge matcha-badge-success">{participants.length + 1} {t('translate.inRoom')}</span>
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
                        <span className="text-xs font-semibold px-2 py-1 rounded-full" style={{ background: 'var(--matcha-200)', color: 'var(--matcha-700)' }}>{t('translate.you')}</span>
                      </div>
                    </div>

                    {participants.length === 0 ? (
                      <div className="py-8 text-center" style={{ color: 'var(--text-muted)' }}>
                        <p className="text-sm">{t('translate.waitingForOthers')}</p>
                        <p className="text-xs mt-1">{t('translate.shareRoom')} <span style={{ color: 'var(--matcha-600)' }}>{roomName}</span></p>
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
                                  {participantLang ? `${participantLang.flag} ${participantLang.name}` : t('translate.languageNotSet')}
                                </p>
                              </div>
                              <span className="flex items-center gap-1">
                                <span className="w-2 h-2 rounded-full animate-pulse-soft" style={{ background: 'var(--matcha-500)' }} />
                                <span className="text-xs font-medium" style={{ color: 'var(--matcha-600)' }}>{t('translate.live')}</span>
                              </span>
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>
              )}

              {/* Usage Warning */}
              {usageWarning && (
                <div
                  className="p-4 rounded-xl"
                  style={{ background: 'rgba(224, 180, 76, 0.1)', border: '1px solid #e0b44c' }}
                >
                  <p className="text-sm font-medium" style={{ color: '#b08930' }}>{usageWarning}</p>
                </div>
              )}

              {/* Connection Status */}
              {connectionStatus === 'reconnecting' && (
                <div
                  className="p-4 rounded-xl"
                  style={{ background: 'rgba(224, 180, 76, 0.1)', border: '1px solid #e0b44c' }}
                >
                  <div className="flex items-center gap-2">
                    <span className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" style={{ color: '#b08930' }} />
                    <p className="text-sm font-medium" style={{ color: '#b08930' }}>Reconnecting...</p>
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
                    <h2 className="font-semibold" style={{ color: 'var(--text-primary)' }}>{t('translate.conversation')}</h2>
                  </div>
                  <div className="flex items-center gap-4">
                    {isActive && (
                      <span className="text-xs" style={{ color: 'var(--text-muted)' }}>
                        {participants.length} {participants.length !== 1 ? t('translate.othersConnectedPlural') : t('translate.othersConnected')}
                      </span>
                    )}
                    <button
                      onClick={() => setTranscript([])}
                      className="text-xs font-medium transition-colors hover:opacity-70"
                      style={{ color: 'var(--text-muted)' }}
                    >
                      {t('translate.clear')}
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
                          {isActive ? t('translate.listeningForSpeech') : t('translate.noConversation')}
                        </p>
                        <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                          {isActive ? t('translate.speakToBegin') : t('translate.startToBegin')}
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
                                {msg.sender === 'user' ? t('translate.you') : t('translate.translation')}
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
                        {isActive ? t('translate.translationActive') : t('translate.bridgeStandby')}
                      </p>
                      <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                        {isActive ? `${t('translate.streamingTo')} "${roomName}"` : t('translate.awaitingConnection')}
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
                        {t('translate.session')}: {lkRoomRef.current.sid.slice(-6)}
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
