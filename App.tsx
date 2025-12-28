
import React, { useState, useRef, useEffect, useCallback } from 'react';
import { GoogleGenAI, Modality, LiveServerMessage } from '@google/genai';
import { Room, RoomEvent, RemoteTrack, RemoteParticipant, Track, LocalAudioTrack } from 'livekit-client';
import * as jose from 'jose';
import { SUPPORTED_LANGUAGES, TranslationMessage, Language } from './types';
import { decode, encode, decodeAudioData, createBlob } from './audioUtils';

// LiveKit Credentials (provided by user)
const LIVEKIT_URL = 'wss://linguabridge-8fllsg2x.livekit.cloud';
const LIVEKIT_API_KEY = 'APIGBybjgG6368N';
const LIVEKIT_API_SECRET = 'ZL2VsewXQfWb7TZVZOQPM3UnlVvKZTAT21b6oTef4LiD';

// Gemini Model Config
const MODEL_NAME = 'gemini-2.5-flash-native-audio-preview-09-2025';
const INPUT_SAMPLE_RATE = 16000;
const OUTPUT_SAMPLE_RATE = 24000;

const App: React.FC = () => {
  // --- UI State ---
  const [isConnecting, setIsConnecting] = useState(false);
  const [isActive, setIsActive] = useState(false);
  const [roomName, setRoomName] = useState('GlobalLobby');
  const [userName, setUserName] = useState(`User_${Math.floor(Math.random() * 1000)}`);
  const [myLang, setMyLang] = useState<Language>(SUPPORTED_LANGUAGES[0]); // English
  const [theirLang, setTheirLang] = useState<Language>(SUPPORTED_LANGUAGES[1]); // Spanish
  const [transcript, setTranscript] = useState<TranslationMessage[]>([]);
  const [participants, setParticipants] = useState<RemoteParticipant[]>([]);
  const [error, setError] = useState<string | null>(null);

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

  /**
   * Generates a LiveKit Access Token client-side.
   * Note: In a production environment, this should be done on a secure backend.
   */
  const generateToken = async () => {
    const secret = new TextEncoder().encode(LIVEKIT_API_SECRET);
    const identity = userName || `User_${Date.now()}`;
    const payload = {
      sub: identity,
      iss: LIVEKIT_API_KEY,
      video: {
        room: roomName,
        roomJoin: true,
        canPublish: true,
        canSubscribe: true
      },
      name: identity,
      metadata: JSON.stringify({ lang: myLang.code }),
    };
    return await new jose.SignJWT(payload)
      .setProtectedHeader({ alg: 'HS256' })
      .setIssuedAt()
      .setExpirationTime('2h')
      .sign(secret);
  };

  const stopAll = useCallback(() => {
    setIsActive(false);
    setIsConnecting(false);

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
  }, []);

  const connectBridge = async () => {
    if (isActive || isConnecting) return;
    setIsConnecting(true);
    setError(null);

    try {
      const token = await generateToken();
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY || '' });

      // Initialize Audio Contexts
      audioContextInRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: INPUT_SAMPLE_RATE });
      audioContextOutRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: OUTPUT_SAMPLE_RATE });

      // Create a destination node to capture the translated output
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
            // Capture Local Mic for Gemini Input
            localStreamRef.current = await navigator.mediaDevices.getUserMedia({ audio: true });
            const source = audioContextInRef.current!.createMediaStreamSource(localStreamRef.current);
            const processor = audioContextInRef.current!.createScriptProcessor(4096, 1, 1);

            processor.onaudioprocess = (e) => {
              const inputData = e.inputBuffer.getChannelData(0);
              sessionPromise.then(session => session.sendRealtimeInput({ media: createBlob(inputData) }));
            };
            source.connect(processor);
            processor.connect(audioContextInRef.current!.destination);

            // Setup LiveKit Room
            const room = new Room();
            lkRoomRef.current = room;

            room.on(RoomEvent.ParticipantConnected, () => setParticipants(Array.from(room.remoteParticipants.values())));
            room.on(RoomEvent.ParticipantDisconnected, () => setParticipants(Array.from(room.remoteParticipants.values())));
            room.on(RoomEvent.TrackSubscribed, (track, publication, participant) => {
              // Only play audio from OTHER participants, never your own
              if (participant.identity === room.localParticipant.identity) {
                return; // Skip our own tracks
              }
              const el = track.attach();
              el.id = `audio-${participant.identity}`;
              document.body.appendChild(el);
            });

            await room.connect(LIVEKIT_URL, token);

            // Create a LocalAudioTrack from the Gemini translation destination
            const translatedTrack = new LocalAudioTrack(destNodeRef.current!.stream.getAudioTracks()[0]);
            await room.localParticipant.publishTrack(translatedTrack);

            setIsActive(true);
            setIsConnecting(false);
          },
          onmessage: async (message: LiveServerMessage) => {
            // Process Gemini Response (The Translation)
            const base64Audio = message.serverContent?.modelTurn?.parts[0]?.inlineData?.data;
            if (base64Audio && audioContextOutRef.current && destNodeRef.current) {
              const ctx = audioContextOutRef.current;
              const audioBuffer = await decodeAudioData(decode(base64Audio), ctx, OUTPUT_SAMPLE_RATE, 1);

              const sourceNode = ctx.createBufferSource();
              sourceNode.buffer = audioBuffer;

              // Only send to LiveKit - don't play locally (you don't hear your own translation)
              sourceNode.connect(destNodeRef.current);

              nextStartTimeRef.current = Math.max(nextStartTimeRef.current, ctx.currentTime);
              sourceNode.start(nextStartTimeRef.current);
              nextStartTimeRef.current += audioBuffer.duration;

              sourcesRef.current.add(sourceNode);
              sourceNode.onended = () => sourcesRef.current.delete(sourceNode);
            }

            // Handle Transcripts
            if (message.serverContent?.inputTranscription) transcriptBufferRef.current.input += message.serverContent.inputTranscription.text;
            if (message.serverContent?.outputTranscription) transcriptBufferRef.current.output += message.serverContent.outputTranscription.text;

            if (message.serverContent?.turnComplete) {
              const { input, output } = transcriptBufferRef.current;
              if (input.trim()) setTranscript(prev => [{ id: Date.now().toString(), sender: 'user', text: input, timestamp: new Date(), language: myLang.code }, ...prev]);
              if (output.trim()) setTranscript(prev => [{ id: Date.now().toString() + 'a', sender: 'agent', text: output, timestamp: new Date(), language: theirLang.code }, ...prev]);
              transcriptBufferRef.current = { input: '', output: '' };
            }

            // Handle Interruption
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

  return (
    <div className="min-h-screen flex flex-col items-center bg-[#020617] text-slate-200">
      <div className="absolute inset-0 bg-gradient-to-b from-indigo-900/10 to-transparent pointer-events-none"></div>

      <header className="w-full max-w-6xl px-6 py-8 flex justify-between items-center relative z-10">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-indigo-600 rounded-2xl flex items-center justify-center shadow-2xl shadow-indigo-500/40">
            <i className="fa-solid fa-microphone-lines text-white text-2xl"></i>
          </div>
          <div>
            <h1 className="text-2xl font-black text-white tracking-tight italic uppercase">Lingua<span className="text-indigo-500">Bridge</span></h1>
            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest flex items-center gap-2">
               <span className={`w-1.5 h-1.5 rounded-full ${isActive ? 'bg-green-500 animate-pulse' : 'bg-slate-700'}`}></span>
               {isActive ? 'Middleman Online' : 'Agent Ready'}
            </p>
          </div>
        </div>

        <button
          onClick={isActive ? stopAll : connectBridge}
          disabled={isConnecting}
          className={`px-8 py-3 rounded-2xl font-black uppercase tracking-widest text-xs flex items-center gap-3 transition-all ${
            isActive
              ? 'bg-rose-500 text-white hover:bg-rose-600 shadow-xl shadow-rose-500/20'
              : 'bg-indigo-600 text-white hover:bg-indigo-500 shadow-xl shadow-indigo-500/20'
          }`}
        >
          {isConnecting ? <i className="fa-solid fa-spinner fa-spin"></i> : <i className={`fa-solid ${isActive ? 'fa-phone-slash' : 'fa-rocket'}`}></i>}
          {isActive ? 'Stop Stream' : isConnecting ? 'Bridging...' : 'Go Live Now'}
        </button>
      </header>

      <main className="w-full max-w-6xl px-6 grid grid-cols-1 lg:grid-cols-12 gap-8 relative z-10 flex-grow pb-12">
        {/* Settings Column */}
        <div className="lg:col-span-4 flex flex-col gap-6">
          {!isActive && (
            <section className="bg-indigo-600/5 border border-indigo-500/10 rounded-[2rem] p-8 space-y-4">
               <h4 className="text-xs font-black text-indigo-400 uppercase tracking-[0.2em] mb-4">Quick Start Guide</h4>
               <div className="space-y-4">
                 {[
                   { step: '01', text: 'Set a unique Room Name for your conversation partner to join.' },
                   { step: '02', text: 'Select your native language and the translation target.' },
                   { step: '03', text: 'Click "Go Live". The agent will now bridge your audio globally.' }
                 ].map((s, i) => (
                   <div key={i} className="flex gap-4">
                      <span className="text-[10px] font-black text-indigo-500/40">{s.step}</span>
                      <p className="text-xs text-slate-400 font-medium leading-relaxed">{s.text}</p>
                   </div>
                 ))}
               </div>
            </section>
          )}

          <section className="glass rounded-[2rem] p-8 space-y-6">
            <h3 className="text-xs font-black text-slate-500 uppercase tracking-widest flex items-center gap-2">
              <i className="fa-solid fa-sliders text-indigo-500"></i> Local Configuration
            </h3>
            <div className="space-y-5">
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-600 ml-1 uppercase">Global Room Identity</label>
                <div className="flex gap-2">
                  <input type="text" value={roomName} onChange={e => setRoomName(e.target.value)} disabled={isActive} className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-sm font-medium outline-none focus:border-indigo-500/50 transition-colors" placeholder="e.g. SecretBridge"/>
                  <input type="text" value={userName} onChange={e => setUserName(e.target.value)} disabled={isActive} className="w-24 bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-sm outline-none" placeholder="User"/>
                </div>
              </div>
              <div className="space-y-4 pt-4 border-t border-slate-800/50">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-600 ml-1 uppercase">Native Input</label>
                  <select value={myLang.code} onChange={e => setMyLang(SUPPORTED_LANGUAGES.find(l => l.code === e.target.value)!)} disabled={isActive} className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-sm outline-none appearance-none hover:border-slate-700 transition-colors">
                    {SUPPORTED_LANGUAGES.map(l => <option key={l.code} value={l.code}>{l.flag} {l.name}</option>)}
                  </select>
                </div>
                <div className="flex justify-center -my-2 opacity-20"><i className="fa-solid fa-arrows-up-down text-slate-500"></i></div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-600 ml-1 uppercase">Global Output</label>
                  <select value={theirLang.code} onChange={e => setTheirLang(SUPPORTED_LANGUAGES.find(l => l.code === e.target.value)!)} disabled={isActive} className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-sm outline-none appearance-none hover:border-slate-700 transition-colors">
                    {SUPPORTED_LANGUAGES.map(l => <option key={l.code} value={l.code}>{l.flag} {l.name}</option>)}
                  </select>
                </div>
              </div>
            </div>
          </section>

          {/* Participants Bar */}
          {isActive && (
            <section className="glass rounded-[2rem] p-6 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-black text-slate-500 uppercase tracking-widest flex items-center gap-2">
                  <i className="fa-solid fa-users text-indigo-500"></i> Room Participants
                </h3>
                <span className="text-[10px] font-black text-indigo-400 bg-indigo-500/10 px-2 py-1 rounded-full">
                  {participants.length + 1} in room
                </span>
              </div>

              <div className="space-y-2">
                {/* Current User (You) */}
                <div className="flex items-center gap-3 p-3 bg-indigo-600/20 border border-indigo-500/30 rounded-xl">
                  <div className="w-8 h-8 bg-indigo-600 rounded-full flex items-center justify-center">
                    <span className="text-xs font-black text-white">{userName.charAt(0).toUpperCase()}</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold text-white truncate">{userName}</p>
                    <p className="text-[10px] text-indigo-300 font-medium">{myLang.flag} {myLang.name} → {theirLang.flag} {theirLang.name}</p>
                  </div>
                  <span className="text-[9px] font-black text-indigo-400 bg-indigo-500/20 px-2 py-1 rounded-full">YOU</span>
                </div>

                {/* Remote Participants */}
                {participants.length === 0 ? (
                  <div className="flex items-center justify-center py-6 text-slate-600">
                    <div className="text-center">
                      <i className="fa-solid fa-user-clock text-2xl mb-2 opacity-30"></i>
                      <p className="text-[10px] font-bold uppercase tracking-wider">Waiting for others to join...</p>
                      <p className="text-[9px] text-slate-700 mt-1">Share room name: <span className="text-indigo-400">{roomName}</span></p>
                    </div>
                  </div>
                ) : (
                  participants.map((participant) => {
                    const metadata = participant.metadata ? JSON.parse(participant.metadata) : {};
                    const langCode = metadata.lang || 'unknown';
                    const participantLang = SUPPORTED_LANGUAGES.find(l => l.code === langCode);
                    return (
                      <div key={participant.identity} className="flex items-center gap-3 p-3 bg-slate-900/50 border border-slate-800 rounded-xl hover:border-slate-700 transition-colors">
                        <div className="w-8 h-8 bg-emerald-600 rounded-full flex items-center justify-center">
                          <span className="text-xs font-black text-white">{participant.name?.charAt(0).toUpperCase() || '?'}</span>
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-bold text-slate-200 truncate">{participant.name || participant.identity}</p>
                          <p className="text-[10px] text-slate-500 font-medium">
                            {participantLang ? `${participantLang.flag} ${participantLang.name}` : 'Language not set'}
                          </p>
                        </div>
                        <span className="flex items-center gap-1">
                          <span className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></span>
                          <span className="text-[9px] font-bold text-emerald-400">LIVE</span>
                        </span>
                      </div>
                    );
                  })
                )}
              </div>
            </section>
          )}

          {error && (
            <div className="bg-rose-500/10 border border-rose-500/20 rounded-2xl p-5 text-rose-500 text-xs font-bold flex gap-3 animate-shake">
              <i className="fa-solid fa-circle-exclamation mt-0.5"></i>
              <p>{error}</p>
            </div>
          )}
        </div>

        {/* Conversation Feed */}
        <div className="lg:col-span-8 flex flex-col glass rounded-[2rem] overflow-hidden border-slate-800 border relative shadow-2xl">
          <div className="px-8 py-6 border-b border-slate-800 bg-slate-900/40 flex justify-between items-center">
             <div className="flex items-center gap-3">
                <div className={`w-3 h-3 rounded-full ${isActive ? 'bg-indigo-500 animate-ping' : 'bg-slate-800'}`}></div>
                <h2 className="text-sm font-black text-slate-200 uppercase tracking-[0.2em]">Bridge Activity Log</h2>
             </div>
             <div className="flex items-center gap-4">
                {isActive && <span className="text-[10px] font-black text-indigo-400 uppercase tracking-widest">{participants.length} Others Connected</span>}
                <button onClick={() => setTranscript([])} className="text-[10px] font-black text-slate-600 hover:text-white transition-colors">WIPE LOG</button>
             </div>
          </div>

          <div className="flex-grow p-8 overflow-y-auto space-y-6 max-h-[650px] custom-scrollbar flex flex-col-reverse">
            <div className="flex flex-col gap-6">
              {transcript.length === 0 ? (
                <div className="flex-grow flex flex-col items-center justify-center text-slate-800 py-32 text-center gap-8">
                  <div className="relative">
                    <i className="fa-solid fa-earth-americas text-9xl opacity-10"></i>
                    {isActive && <i className="fa-solid fa-signal text-3xl text-indigo-500 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 animate-pulse"></i>}
                  </div>
                  <p className="text-xs font-black uppercase tracking-[0.4em] max-w-xs leading-loose">
                    {isActive ? 'Listening for voice input...' : 'Waiting for bridge activation...'}
                  </p>
                </div>
              ) : (
                transcript.map((msg) => (
                  <div key={msg.id} className={`flex flex-col ${msg.sender === 'user' ? 'items-start' : 'items-end'}`}>
                    <div className={`max-w-[85%] group relative transition-all duration-300 hover:scale-[1.01] ${
                      msg.sender === 'user'
                        ? 'bg-slate-900 border border-slate-800 rounded-3xl rounded-tl-none'
                        : 'bg-indigo-600 text-white rounded-3xl rounded-tr-none shadow-lg shadow-indigo-500/20'
                    } p-6`}>
                      <div className={`flex items-center gap-3 mb-3 ${msg.sender === 'user' ? 'text-slate-500' : 'text-indigo-200'} font-black text-[9px] uppercase tracking-[0.15em]`}>
                        {msg.sender === 'user' ? <i className="fa-solid fa-microphone text-[8px]"></i> : <i className="fa-solid fa-bolt text-[8px]"></i>}
                        {msg.sender === 'user' ? `Native Input` : `AI Bridge Output`}
                        <span className="opacity-40 ml-auto">{msg.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                      </div>
                      <p className="text-sm md:text-base leading-relaxed font-medium">{msg.text}</p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Activity Bar */}
          <div className="p-6 bg-slate-900/60 border-t border-slate-800 flex items-center justify-between backdrop-blur-md">
             <div className="flex items-center gap-6">
                <div className="flex items-center gap-1.5 h-6">
                  {[...Array(8)].map((_, i) => (
                    <div key={i} className={`w-1 bg-indigo-500 rounded-full transition-all duration-150 ${isActive ? 'animate-bounce' : 'opacity-10'}`}
                      style={{
                        height: isActive ? `${30 + Math.random() * 70}%` : '20%',
                        animationDelay: `${i * 0.1}s`,
                        animationDuration: '0.8s'
                      }}></div>
                  ))}
                </div>
                <div className="flex flex-col">
                  <span className="text-[9px] font-black uppercase text-indigo-400 tracking-[0.2em]">
                    {isActive ? 'Encryption Active' : 'Bridge Standby'}
                  </span>
                  <span className="text-[10px] text-slate-600 font-bold">
                    {isActive ? `Streaming translated voice to "${roomName}"` : 'Awaiting manual activation'}
                  </span>
                </div>
             </div>

             {isActive && (
                <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-indigo-500/10 border border-indigo-500/20">
                   <span className="w-1.5 h-1.5 bg-indigo-500 rounded-full animate-pulse"></span>
                   <span className="text-[9px] font-black text-indigo-300 uppercase tracking-tighter">Live Session ID: {lkRoomRef.current?.sid?.slice(-6) || '------'}</span>
                </div>
             )}
          </div>
        </div>
      </main>

      <footer className="py-8 text-center text-slate-700 text-[9px] font-black uppercase tracking-[0.3em] relative z-10">
         LinguaBridge Infrastructure &copy; 2024 &bull; Global Real-Time Translation Bridge
      </footer>

      <style>{`
        .custom-scrollbar::-webkit-scrollbar { width: 4px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #1e293b; border-radius: 10px; }
        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          25% { transform: translateX(-4px); }
          75% { transform: translateX(4px); }
        }
        .animate-shake { animation: shake 0.4s ease-in-out; }
      `}</style>
    </div>
  );
};

export default App;
