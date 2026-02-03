# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

TRAVoices is a real-time AI voice translation SaaS. Users can join translation rooms, speak in their language, and have their voice translated and broadcast to other participants in real-time.

**Tech Stack:** React 19 + TypeScript + Vite (frontend), Convex (backend/database), LiveKit (WebRTC audio), Google Gemini (AI translation)

**Subscription Tiers:** Free (60 min/month), Pro ($19/mo, 600 min), Enterprise ($99/mo, unlimited)

**Current Mode:** Authentication is disabled - all pages work without login (guest mode). Convex queries/mutations use `getCurrentUserOrNull()` and return defaults for unauthenticated users.

## Commands

```bash
npm run dev          # Start Vite dev server
npm run build        # Production build
npx convex dev       # Start Convex dev server (watches for changes)
npx convex deploy    # Deploy Convex functions to production
npx vercel --prod    # Deploy frontend to Vercel
npx convex codegen   # Regenerate Convex TypeScript types
```

Note: No lint or test commands are configured.

## Architecture

### Provider Hierarchy (index.tsx)
```
ConvexClientProvider → AuthProvider → LanguageProvider → App
```

- **ConvexClientProvider**: Wraps app with Convex for real-time database
- **AuthProvider**: Currently returns `isAuthenticated: true` always (auth disabled)
- **LanguageProvider**: i18n support with `useLanguage()` hook returning `t()`, `language`, `isRTL`

### Routing (App.tsx)
All routes are public (no auth required):
- `/` - Home page
- `/pricing` - Pricing page
- `/translate` - Translation room (main feature)
- `/dashboard` - User dashboard
- `/settings` - User settings
- `/history` - Session history
- `/admin/map` - Launch roadmap (Arabic)
- `/signin`, `/signup`, `/forgot-password` - Auth pages (non-functional)

### Convex Backend Structure
```
convex/
├── schema.ts          # Database tables: users, rooms, participants, sessions, transcripts, apiKeys, analytics, userSettings
├── http.ts            # HTTP endpoints (health check)
├── lib/
│   ├── utils.ts       # getCurrentUserOrNull(), tier limits, helpers
│   └── permissions.ts # RBAC helpers
├── users/             # queries.ts, mutations.ts
├── rooms/             # queries.ts, mutations.ts, actions.ts (LiveKit token generation)
├── sessions/          # queries.ts, mutations.ts
├── transcripts/       # queries.ts, mutations.ts
├── subscriptions/     # queries.ts, mutations.ts
└── analytics/         # mutations.ts
```

### Key Convex Patterns

**Guest Mode**: All queries/mutations use `getCurrentUserOrNull()` and handle null users gracefully:
- Room creation works without auth (creatorId is optional)
- Sessions work without auth (hostUserId is optional)
- Queries return default values (free tier limits, empty arrays)

**Schema optionals**: `creatorId` in rooms and `hostUserId` in sessions are optional to support guest-created content.

**Room Joining**: Use `findOrCreate` mutation (not `create`) for public rooms. This ensures users joining the same room name (e.g., "GlobalLobby") connect to the same LiveKit room instead of creating duplicates.

### Translation Flow (pages/TRAVoicesPage.tsx)

The main `/translate` page orchestrates:
1. **Room Setup**: `findOrCreate` mutation finds existing room by name or creates new one
2. **LiveKit Token**: `generateLiveKitToken` action creates JWT for WebRTC connection
3. **Gemini AI Session**: Google Gemini Live API for real-time speech-to-speech translation
4. **Audio Pipeline**:
   - User mic → ScriptProcessor (16kHz) → Gemini AI
   - Gemini output (24kHz) → AudioBufferSource → MediaStreamDestination → LiveKit publish
5. **Transcript Storage**: Messages saved to Convex `transcripts` table

Supported languages defined in `types.ts` (`SUPPORTED_LANGUAGES` array).

### i18n (providers/LanguageContext.tsx)
- Languages: English (`en`), Arabic (`ar`)
- Use `t("key.path")` for translations
- Arabic enables RTL layout via `document.documentElement.dir = "rtl"`
- Translations stored inline in LanguageContext.tsx

### Design System
CSS variables defined in `index.html`:
- Primary: `--matcha-500` to `--matcha-700` (green)
- Accent: `--terra-400` to `--terra-600` (terracotta)
- Backgrounds: `--cream-50`, `--bg-page`, `--bg-card`, `--bg-elevated`
- Components: `.matcha-btn`, `.matcha-card`, `.matcha-input`, `.matcha-select`

## Environment Variables

**Frontend (.env.local):**
- `VITE_CONVEX_URL` - Convex deployment URL

**Convex Dashboard (Settings > Environment Variables):**
- `LIVEKIT_URL`, `LIVEKIT_API_KEY`, `LIVEKIT_API_SECRET` - Required for voice rooms
- `GEMINI_API_KEY` - Google Gemini API key for AI translation
- `SITE_URL` - Production URL (https://travoices.xyz)

## Deployment

- **Frontend:** Vercel (travoices.xyz / www.travoices.xyz)
- **Backend:** Convex Cloud (rosy-bullfrog-314.convex.cloud)
- **SPA routing:** `vercel.json` rewrites all paths to `/index.html`

Deploy workflow:
1. `npx convex deploy` - Deploy Convex functions first
2. `npx vercel --prod` - Deploy frontend to Vercel
