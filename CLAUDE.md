# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

TRAVoices is a real-time AI voice translation SaaS. Users join translation rooms, speak in their language, and have their voice translated and broadcast to other participants in real-time.

**Tech Stack:** React 19 + TypeScript + Vite (frontend), Convex (backend/database), Better-Auth (authentication), LiveKit (WebRTC audio), Google Gemini (AI translation)

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

### Translation Flow (pages/TRAVoicesPage.tsx)

1. `findOrCreate` mutation gets/creates room
2. `generateLiveKitToken` action creates JWT for WebRTC
3. Google Gemini Live API for real-time speech-to-speech translation
4. Audio: Mic → ScriptProcessor (16kHz) → Gemini → AudioBuffer (24kHz) → LiveKit publish
5. Transcripts saved to Convex

Languages: `SUPPORTED_LANGUAGES` array in `types.ts`

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
GEMINI_API_KEY
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
