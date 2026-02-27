# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

TRAVoices is a real-time AI voice translation SaaS. Users join translation rooms, speak in their language, and have their voice translated and broadcast to other participants in real-time.

**Tech Stack:** React 19 + TypeScript + Vite (frontend), Convex (backend/database), Better-Auth (authentication), LiveKit (WebRTC audio), Deepgram Nova-2/3 (STT), OpenRouter/GPT-4o-mini (translation), Cartesia Sonic-2/3 (TTS)

**Subscription Tiers:** Free (60 min/month), Pro ($19/mo, 600 min), Enterprise ($99/mo, unlimited)

## Commands

```bash
npm run dev          # Start Vite dev server (port 3000)
npm run build        # Production build
npx convex dev       # Start Convex dev server (watches for changes)
npx convex deploy    # Deploy Convex functions to production
npx vercel --prod    # Deploy frontend to Vercel
```

**Convex CLI helpers:**
```bash
npx convex run debug:listAllUsers                    # List all users
npx convex run debug:deleteAllUsersExcept '{"keepEmails": ["email@example.com"]}' --prod  # Delete users except specified
```

Note: No lint or test commands configured.

## Architecture

### Provider Hierarchy (index.tsx)
```
ConvexClientProvider → AuthProvider → LanguageProvider → App
```

- **ConvexClientProvider**: Wraps app with `ConvexBetterAuthProvider` for real-time database + auth token sync
- **AuthProvider**: Manages auth state via localStorage session (cross-origin workaround)
- **LanguageProvider**: i18n with `useLanguage()` returning `t()`, `language`, `isRTL`

### Authentication (Cross-Origin Setup)

Since frontend (travoices.xyz) and backend (convex.site) are different domains, cookies don't work. Session is stored in localStorage instead.

**Key Files:**
- `lib/auth-client.ts` - Better-Auth client with `saveSession()`, `getStoredSession()`, `clearSession()`
- `providers/AuthContext.tsx` - Reads session from localStorage on mount
- `components/auth/SignInForm.tsx` / `SignUpForm.tsx` - Save session to localStorage after auth
- `convex/auth.ts` - Better-Auth server config with CORS origins

**Auth Flow:**
1. User signs up/in → `authClient.signUp.email()` or `signIn.email()`
2. On success, `saveSession()` stores user data in localStorage
3. `AuthProvider` reads localStorage on mount → sets `isAuthenticated`
4. Convex queries use `getCurrentUserOrNull(ctx)` which tries Better-Auth first

**Important:** The `user` object from `useAuth()` only has `{id, email, name}`. For subscription tier, use `subscription?.tier` from `useQuery(api.subscriptions.queries.getCurrent)`.

### Convex Backend Structure
```
convex/
├── convex.config.ts   # Registers Better-Auth component
├── auth.config.ts     # Auth configuration provider
├── auth.ts            # Better-Auth instance + helpers (getBetterAuthUser, getAuthenticatedAppUser)
├── schema.ts          # Database tables + TIER_LIMITS constant
├── http.ts            # Auth routes with CORS, health check
├── lib/utils.ts       # getCurrentUserOrNull(), tier helpers
├── users/             # queries.ts, mutations.ts (ensureUser creates app user record)
├── rooms/             # queries.ts, mutations.ts, actions.ts (LiveKit tokens)
├── sessions/          # queries.ts, mutations.ts
├── subscriptions/     # queries.ts (getCurrent returns tier + usage), mutations.ts
├── transcripts/       # queries.ts, mutations.ts
├── friends/           # queries.ts, mutations.ts (friend requests, accept/reject/unfriend)
├── messages/          # queries.ts, mutations.ts (text + voice messages between friends)
├── notifications/     # queries.ts, mutations.ts (friend requests, messages, room invites)
├── invitations/       # queries.ts, mutations.ts (room invite links)
├── leads/             # queries.ts, mutations.ts (email waitlist from homepage)
├── voices/            # actions.ts (cloneVoice, getCartesiaApiKey, getDefaultCartesiaVoiceId), mutations.ts, queries.ts
├── admin/             # queries.ts (admin dashboard stats, user management)
└── debug.ts           # ensureUserByEmail, browseAllUsers, deleteAllUsersExcept
```

**Guest Mode**: All queries/mutations handle null users - return free tier defaults, allow room creation without auth.

**Room Joining**: Always use `findOrCreate` mutation (not `create`) to ensure users joining same room name share the LiveKit room.

### Social Features

**Pages:** `/friends` (friend list + requests + discover), `/messages` (conversations + chat)

**Data Flow:**
- `FriendsPage.tsx` → `convex/friends/queries.ts` + `convex/debug.ts` (browseAllUsers for discovery)
- `MessagesPage.tsx` → `convex/messages/queries.ts` (listConversations shows friends with/without messages)
- `NotificationBell.tsx` in Header → `convex/notifications/queries.ts`

**Database Tables:** `friendships`, `messages`, `notifications`, `roomInvitations` (see `convex/schema.ts`)

**Friendship States:** `pending` → `accepted` or `rejected`. Only `accepted` friends can message each other.

### Translation Pipeline (pages/TRAVoicesPage.tsx)

**3-stage pipeline replacing the old Gemini Live API:**

```
Mic (16kHz PCM) → Deepgram Nova-2 (STT) → OpenRouter/GPT-4o-mini (Translation) → Cartesia Sonic-2 (TTS)
                    ~300ms                    ~100-200ms                              ~40-90ms
```

**Flow:**
1. `findOrCreate` mutation gets/creates room
2. `generateLiveKitToken` action creates JWT for WebRTC
3. All API keys fetched in parallel: `getDeepgramApiKey`, `getOpenRouterApiKey`, `getCartesiaApiKey`
4. Mic → AudioContext (16kHz) → ScriptProcessor → `float32ToInt16Buffer()` → Deepgram WebSocket (binary PCM frames)
5. Deepgram returns `is_final` transcript → `translateAndSpeak()` → OpenRouter streaming SSE → translated text
6. Translated text → Cartesia WebSocket TTS → PCM audio chunks → AudioBufferSourceNode (24kHz) → LiveKit publish
7. Transcripts saved to Convex

**Key files:**
- `audioUtils.ts` — `float32ToInt16Buffer()` for mic PCM encoding, `decode()` for Cartesia PCM decoding
- `types.ts` — `DEEPGRAM_LANGUAGE_MAP` for BCP-47 code mapping, `SUPPORTED_LANGUAGES` array
- `convex/rooms/actions.ts` — `getDeepgramApiKey`, `getOpenRouterApiKey` (secure key delivery)
- `convex/voices/actions.ts` — `getCartesiaApiKey`, `getDefaultCartesiaVoiceId`, `cloneVoice`

**Voice cloning:** Users can clone their voice via `VoiceSetupPage.tsx` → Cartesia clone API. Cloned voice ID stored in `voiceClones` table. If no clone, falls back to Cartesia's default public voices.

**Reconnection:** Deepgram WebSocket has exponential backoff (1s→30s, max 10 attempts). Cartesia WebSocket auto-reconnects after 2s (max 10 attempts). LiveKit has 15s grace period before killing session.

**Mobile audio:** LiveKit's `room.startAudio()` must be called after connect to unlock audio playback on mobile browsers. `AudioPlaybackStatusChanged` event handler auto-retries. "Tap anywhere to enable audio" banner shown when autoplay blocked.

Languages: `SUPPORTED_LANGUAGES` array in `types.ts` (12 languages)

**Pipeline V2 Key Files:**
- `lib/pipelines/ws-manager.ts` — WebSocket lifecycle with `waitForConnected()`, keepalive, health check, reconnect backoff
- `lib/pipelines/standard-pipeline-v2.ts` — Orchestrates Deepgram→OpenRouter→Cartesia with error handling
- `lib/pipelines/queues.ts` — TranslationQueue (2 concurrent, 20s stale threshold) + TTSQueue (5s dedup)
- `lib/pipelines/audio-scheduler.ts` — PCM resampling (24kHz→48kHz), queue depth 50, silence generator, AudioContext monitor
- `lib/pipelines/types.ts` — Pipeline interfaces, TranscriptEvent (input/output/partial)
- `components/PipelineHealthIndicator.tsx` — Real-time STT/Translate/TTS status dots

**Language-Specific Model Selection:**
- Arabic, Bengali, Tamil, Telugu, Kannada, Marathi, Tagalog (`UPGRADE_LANGUAGES` set in standard-pipeline-v2.ts) require:
  - **Deepgram Nova-3** (Nova-2 doesn't support these languages)
  - **Cartesia Sonic-3** (Sonic-2 doesn't support these languages)
- All other languages use Nova-2 + Sonic-2 (faster, cheaper)

**Audio Queue Depth:** Cartesia sends ~20-30 small PCM chunks per sentence. `MAX_QUEUE_DEPTH` must be ≥50 or chunks get silently dropped.

**TTS Deduplication:** TTSQueue tracks recently sent text for 5s to prevent duplicate speech on WebSocket reconnect flushes.

**Transcript Saving:** `addMessage` mutation is best-effort — uses `getCurrentUserOrNull()`, returns null on auth failure instead of throwing. Won't crash the pipeline.

### i18n (providers/LanguageContext.tsx)
- Languages: English (`en`), Arabic (`ar`)
- Use `t("key.path")` for translations
- Arabic enables RTL via `document.documentElement.dir = "rtl"`

### Design System (index.html CSS variables)
- Primary: `--matcha-500` to `--matcha-700` (green)
- Accent: `--terra-400` to `--terra-600` (terracotta)
- Components: `.matcha-btn`, `.matcha-card`, `.matcha-input`, `.matcha-select`

## Environment Variables

**Frontend (.env.local):**
```
VITE_CONVEX_URL=https://rosy-bullfrog-314.convex.cloud
VITE_CONVEX_SITE_URL=https://rosy-bullfrog-314.convex.site
```

**Convex Dashboard (Settings > Environment Variables):**
```
BETTER_AUTH_SECRET   # Generate: openssl rand -base64 32
SITE_URL=https://travoices.xyz
LIVEKIT_URL, LIVEKIT_API_KEY, LIVEKIT_API_SECRET
DEEPGRAM_API_KEY     # Deepgram Nova-2 STT (streaming WebSocket)
OPENROUTER_API_KEY   # OpenRouter API (GPT-4o-mini translation)
CARTESIA_API_KEY     # Cartesia Sonic-2 TTS + voice cloning
GEMINI_API_KEY       # Deprecated — kept for backwards compat
```

## Deployment

**Production URLs:**
- Frontend: travoices.xyz (Vercel)
- Backend: rosy-bullfrog-314.convex.cloud

**Deploy workflow:**
1. `npx convex deploy` - Deploy backend first
2. `npx vercel --prod` - Deploy frontend

## Common Gotchas

1. **Don't use `user?.subscriptionTier`** in frontend - auth user doesn't have it. Use `subscription?.tier` from Convex query.

2. **CORS for auth routes** - `convex/http.ts` must have the frontend origins in `allowedOrigins` array.

3. **Session persistence** - Uses localStorage, not cookies. After sign-in, `saveSession()` must be called.

4. **Google OAuth (future)** - Uncomment socialProviders in `convex/auth.ts`, add GOOGLE_CLIENT_ID/SECRET to Convex env.

5. **Ensure user exists in app DB** - Users may exist in Better-Auth but not in the `users` table. Pages like `FriendsPage` and `MessagesPage` call `ensureUserByEmail` mutation on mount to auto-create the user record if missing.

6. **Authentication uses proper auth only** - All queries/mutations use `getCurrentUser(ctx)` or `getCurrentUserOrNull(ctx)` from `convex/lib/utils.ts`. Do NOT accept email as a parameter for auth fallback (security vulnerability).

7. **Use `ConvexError` not `Error` for user-facing errors** - Convex hides `throw new Error()` messages from clients (shows generic "Server Error"). Use `throw new ConvexError("message")` from `convex/values` so the actual message reaches the browser.

8. **Don't use `ctx.runMutation()` inside mutations** - While technically available, calling `ctx.runMutation(internal....)` from within a mutation creates an isolated JS context with overhead. Instead, inline the logic directly using `ctx.db` operations. See `addMinutesUsedInline()` in `sessions/mutations.ts`.

9. **Mobile audio playback** - Mobile browsers block autoplay. After `room.connect()`, call `room.startAudio()` to unlock audio. Listen for `RoomEvent.AudioPlaybackStatusChanged` and retry. Set `autoplay` and `playsinline` on attached audio elements.

10. **LiveKit participant tracking** - `RoomEvent.ParticipantConnected` only fires for users joining AFTER you. For users already in the room, read `room.remoteParticipants` after `connect()` resolves. Use delayed syncs (1.5s, 5s) to catch late joiners.

11. **Cartesia language codes** - Cartesia expects ISO-639-1 short codes (`es`, `fr`, `de`), not BCP-47 (`es-ES`). Use `langCode.split('-')[0]`.

12. **Cartesia API response format** - The voices list API returns `{ data: [...] }`, not a bare array or `{ voices: [...] }`. Parse with `data.data || data.voices || []`.

## Admin Dashboard

Access at `/admin` with credentials: `admin` / `focus2026`

Features:
- User management (view all users, emails, subscription tiers)
- Email leads from homepage waitlist (`emailLeads` table)
- Usage stats (rooms, sessions, messages, friendships)
- Revenue tracking (Pro/Enterprise subscribers)

## Mobile Features

**FloatingChat Component** (`components/FloatingChat.tsx`):
- Floating message button (bottom-right, mobile only via `md:hidden`)
- Shows friend bubbles dropdown when clicked
- Opens mini chat window for messaging
- Hidden on `/messages`, auth pages, and admin pages

## Pipeline Diagnostics

Test page at `/test` (`pages/PipelineTestPage.tsx`) — tests each pipeline component individually:
- Microphone + AudioContext
- Deepgram API key + WebSocket connection
- OpenRouter API key + translation test (en→es)
- Cartesia API key + voice availability + WebSocket TTS
- LiveKit client library
- Full end-to-end pipeline test

Run all tests or individual tests. Shows PASS/FAIL with timing and detailed error messages.

## Voice Cloning

**Page:** `/voice-setup` (`pages/VoiceSetupPage.tsx`)

**Flow:**
1. User records audio clip in browser (WebM/Opus)
2. Audio converted to base64, sent to `convex/voices/actions.ts:cloneVoice`
3. Cartesia clone API receives multipart/form-data with audio + name + language
4. Returns a `cartesiaVoiceId` stored in `voiceClones` table
5. During translation, cloned voice ID is used for Cartesia TTS

**Fallback:** Users without a voice clone get a default Cartesia public voice via `getDefaultCartesiaVoiceId` action (fetches from Cartesia API with hardcoded fallback IDs).
