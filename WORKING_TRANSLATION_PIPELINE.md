# TRAVoices Working Translation Pipeline

## High-Level Architecture

```
┌─────────────────────────────────────────────────────────────────────────┐
│                         USER'S BROWSER                                  │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│   Microphone (48kHz)                                                    │
│        ↓                                                                │
│   AudioContext (16kHz) ─────→ ScriptProcessor                           │
│        ↓                            ↓                                   │
│   Float32 → PCM 16-bit → Base64 → GEMINI LIVE API                       │
│                                     ↓                                   │
│                          Translated audio (24kHz PCM)                   │
│                                     ↓                                   │
│   AudioContext (24kHz) ←── Decode Base64 → AudioBuffer                  │
│        ↓                                                                │
│   MediaStreamDestination ───→ LocalAudioTrack                           │
│        ↓                                                                │
│   LIVEKIT (WebRTC) ─────────→ Other participants hear you               │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## The Three Core Systems

| System | Purpose | Tech |
|--------|---------|------|
| **LiveKit** | WebRTC audio rooms | Real-time P2P streaming |
| **Gemini AI** | Speech-to-speech translation | `gemini-2.5-flash-native-audio-preview-09-2025` |
| **Convex** | Backend, tokens, transcripts | Real-time database |

---

## Detailed Flow

### 1. Room Setup

```
User enters room name → findOrCreate mutation
    ↓
Checks if room exists (by_name index)
    ↓
Returns existing OR creates new room with livekitRoomName
```

**Why findOrCreate?** Ensures users typing "GlobalLobby" all join the SAME LiveKit room instead of creating duplicates.

---

### 2. Connection Sequence (ORDER MATTERS)

```
1. Get LiveKit token from Convex action (JWT signed with API secret)
2. Connect to LiveKit room FIRST
3. THEN connect to Gemini Live session
```

**Critical:** LiveKit must be connected before Gemini to prevent race conditions.

---

### 3. Audio Capture Pipeline

```typescript
// From TRAVoicesPage.tsx
Microphone (getUserMedia)
    ↓
MediaStreamAudioSource (16kHz context)
    ↓
ScriptProcessor (4096 buffer)
    ↓
createBlob() → Float32 to PCM 16-bit → Base64
    ↓
session.sendRealtimeInput({ audio: base64 })  // To Gemini
```

**Code Location:** `src/pages/TRAVoicesPage.tsx` lines 189-198

---

### 4. AI Translation (Gemini Live API)

```
Gemini receives your audio chunks in real-time
    ↓
Returns THREE things via callbacks:
  • inputTranscription: what you said (your language)
  • translated audio: PCM data in target language
  • outputTranscription: translation text
```

**Model:** `gemini-2.5-flash-native-audio-preview-09-2025`

**System Instruction:** Dynamically set with user's source/target language pair

---

### 5. Audio Output Pipeline

```typescript
Gemini response (base64 audio)
    ↓
decode() → Uint8Array
    ↓
decodeAudioData() → AudioBuffer (24kHz)
    ↓
BufferSourceNode → plays locally
    ↓
Also connects to MediaStreamDestination
    ↓
LocalAudioTrack published to LiveKit
    ↓
All room participants hear your translated voice
```

**Code Location:** `src/pages/TRAVoicesPage.tsx` lines 203-219

**Timing:** Uses `nextStartTimeRef` to queue audio buffers without gaps/overlaps

---

### 6. Transcript Storage

```
On turnComplete event:
    ↓
Save original speech → convex/transcripts (messageType: 'speech')
Save translation → convex/transcripts (messageType: 'translation')
Update analytics (messagesTranslated, languagesUsed)
```

**Code Location:** `src/pages/TRAVoicesPage.tsx` lines 230-261

---

## Audio Contexts & Sample Rates

| Context | Sample Rate | Purpose |
|---------|-------------|---------|
| `audioContextInRef` | 16kHz | Microphone capture (Gemini input standard) |
| `audioContextOutRef` | 24kHz | Translated audio playback |
| Browser raw | 48kHz | Downsampled by AudioContext automatically |

---

## Key Files Reference

| File | Purpose |
|------|---------|
| `src/pages/TRAVoicesPage.tsx` | Main translation UI + audio orchestration (450+ lines) |
| `src/audioUtils.ts` | Base64/PCM encoding/decoding utilities |
| `src/types.ts` | TranslationMessage, Language, SUPPORTED_LANGUAGES |
| `convex/rooms/actions.ts` | LiveKit token generation (secure backend) |
| `convex/rooms/mutations.ts` | findOrCreate ensures room synchronization |
| `convex/sessions/mutations.ts` | Session lifecycle & usage tracking |
| `convex/transcripts/mutations.ts` | Message persistence & analytics |
| `convex/schema.ts` | Database structure (rooms, sessions, transcripts) |

---

## Audio Utilities (audioUtils.ts)

```typescript
decode(base64) → Uint8Array
  // atob() → binary string → byte array

encode(Uint8Array) → base64
  // byte array → binary string → btoa()

createBlob(Float32Array) → { data: base64, mimeType }
  // Float32 (normalized: -1.0 to 1.0)
  // → Int16Array (PCM: -32768 to 32767)
  // → Base64 encoded
  // Gemini understands: audio/pcm;rate=16000

decodeAudioData(Uint8Array, ctx, sampleRate, numChannels) → AudioBuffer
  // Int16 PCM data → floats (/-32768)
  // → Create AudioBuffer with proper channel layout
```

---

## LiveKit Token Generation

**Location:** `convex/rooms/actions.ts` lines 10-85

```typescript
generateLiveKitToken(roomId) → { token, url }
  1. Fetch room details with LiveKit room name
  2. Create HS256 JWT with:
     - video.room: room.livekitRoomName
     - canPublish: true
     - canSubscribe: true
     - sub: participant ID
     - name: participant name
     - exp: 6 hour expiry
  3. Sign with LIVEKIT_API_SECRET
  4. Return token + LIVEKIT_URL
```

---

## State Management (Refs)

| Ref | Purpose |
|-----|---------|
| `lkRoomRef` | LiveKit Room instance |
| `sessionRef` | Gemini Live session |
| `localStreamRef` | MediaStream from microphone |
| `sourcesRef` | Set of AudioBufferSourceNodes (prevents memory leaks) |
| `nextStartTimeRef` | Precise timing for audio playback |
| `transcriptBufferRef` | Accumulates Gemini transcriptions before saving |

---

## Cleanup Function (stopAll)

Properly tears down all resources:

1. End Convex session (database)
2. Disconnect LiveKit room
3. Close Gemini session
4. Stop microphone tracks
5. Close audio contexts
6. Stop all audio sources
7. Clear all refs

**Location:** `src/pages/TRAVoicesPage.tsx` lines 73-109

---

## Environment Variables

### Frontend (.env.local)

```
VITE_CONVEX_URL=https://your-deployment.convex.cloud
VITE_GEMINI_API_KEY=your-gemini-api-key
```

### Convex Dashboard

```
LIVEKIT_API_KEY=your-livekit-api-key
LIVEKIT_API_SECRET=your-livekit-api-secret
LIVEKIT_URL=wss://your-livekit-server.livekit.cloud
```

---

## Why This Architecture Works

1. **Low latency**: Gemini Live API streams audio chunks (no full-file uploads)
2. **Real-time sync**: `nextStartTimeRef` queues audio buffers without gaps
3. **Room sharing**: `findOrCreate` ensures "GlobalLobby" is ONE room for everyone
4. **Clean separation**: LiveKit handles WebRTC complexity, Gemini handles AI
5. **Graceful cleanup**: `stopAll()` prevents memory leaks and ensures clean reconnection

---

## Supported Languages

Defined in `src/types.ts` (`SUPPORTED_LANGUAGES` array):

- English, Arabic, Spanish, French, German, Chinese, Japanese, Korean, etc.

---

## Error Handling

- **Missing API Key**: Throws error before Gemini connection attempt
- **Authentication**: Guest mode enabled (works without login)
- **Sample Rate Mismatches**: Handled by separate AudioContexts (16kHz in, 24kHz out)
- **Audio Buffer Timing**: Queued playback prevents overlaps

---

*Last Updated: February 2026*
