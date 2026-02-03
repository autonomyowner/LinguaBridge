# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

TRAVoices is a real-time AI voice translation SaaS. Users can join translation rooms, speak in their language, and have their voice translated and broadcast to other participants in real-time.

**Tech Stack:** React 19 + TypeScript + Vite (frontend), Convex (backend/database), LiveKit (WebRTC audio), Google Gemini (AI translation)

**Subscription Tiers:** Free (60 min/month), Pro ($19/mo, 600 min), Enterprise ($99/mo, unlimited)

## Commands

```bash
npm run dev          # Start Vite dev server
npm run build        # Production build
npx convex dev       # Start Convex dev server (watches for changes)
npx convex deploy    # Deploy Convex functions to production
npx vercel --prod    # Deploy frontend to Vercel
```

## Architecture

### Provider Hierarchy (index.tsx)
```
ConvexClientProvider → AuthProvider → LanguageProvider → App
```

- **ConvexClientProvider**: Wraps app with `ConvexAuthProvider` for real-time database and auth
- **AuthProvider**: Exposes `useAuth()` hook with `user`, `isAuthenticated`, `isLoading`, `signOut`
- **LanguageProvider**: i18n support with `useLanguage()` hook returning `t()`, `language`, `isRTL`

### Routing (App.tsx)
- **Public routes:** `/`, `/pricing`
- **Auth routes (PublicOnlyRoute):** `/signin`, `/signup`, `/forgot-password` - redirect to dashboard if authenticated
- **Protected routes (ProtectedRoute):** `/dashboard`, `/translate`, `/settings`, `/history` - require authentication

### Convex Backend Structure
```
convex/
├── schema.ts          # Database tables: users, rooms, participants, sessions, transcripts, apiKeys, analytics, userSettings
├── auth.ts            # Convex Auth with Password provider (email/password only)
├── http.ts            # HTTP endpoints for webhooks
├── lib/
│   ├── utils.ts       # getCurrentUser(), getCurrentUserOrNull(), tier limits, helpers
│   └── permissions.ts # RBAC helpers
├── users/             # queries.ts, mutations.ts
├── rooms/             # queries.ts, mutations.ts, actions.ts (LiveKit token generation)
├── sessions/          # queries.ts, mutations.ts
├── transcripts/       # queries.ts, mutations.ts
├── subscriptions/     # queries.ts, mutations.ts
└── analytics/         # mutations.ts
```

### Key Convex Patterns

**User lookup** (convex/lib/utils.ts): Convex Auth stores user ID in `identity.subject` as `users|<id>`. The `getCurrentUser()` function extracts this ID directly, then falls back to `tokenIdentifier` and `email` indexes.

**Schema fields**: Most user fields are optional to allow Convex Auth's profile function to create users with minimal data.

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
- `JWT_PRIVATE_KEY` - RSA private key for auth tokens
- `LIVEKIT_URL`, `LIVEKIT_API_KEY`, `LIVEKIT_API_SECRET`
- `GEMINI_API_KEY` - Google Gemini API key for AI translation
- `SITE_URL` - Production URL (https://travoices.xyz)

## Deployment

- **Frontend:** Vercel (travoices.xyz)
- **Backend:** Convex Cloud (rosy-bullfrog-314.convex.cloud)
- **SPA routing:** `vercel.json` rewrites all paths to `/index.html`
