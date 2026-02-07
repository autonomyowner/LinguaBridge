import { createAuthClient } from "better-auth/react";
import { convexClient } from "@convex-dev/better-auth/client/plugins";

// For Vite apps (no Next.js API routes), we point directly to Convex site URL
const convexSiteUrl = import.meta.env.VITE_CONVEX_SITE_URL || "https://rosy-bullfrog-314.convex.site";

export const authClient = createAuthClient({
  baseURL: convexSiteUrl,
  plugins: [convexClient()],
  fetchOptions: {
    credentials: "include",
  },
});

// Manual session management for cross-origin scenarios
const SESSION_KEY = "travoices_session";

export function saveSession(session: { user: { id: string; email: string; name?: string } }) {
  try {
    localStorage.setItem(SESSION_KEY, JSON.stringify(session));
  } catch (e) {
    console.error("Failed to save session:", e);
  }
}

export function getStoredSession(): { user: { id: string; email: string; name?: string } } | null {
  try {
    const stored = localStorage.getItem(SESSION_KEY);
    return stored ? JSON.parse(stored) : null;
  } catch (e) {
    return null;
  }
}

export function clearSession() {
  try {
    localStorage.removeItem(SESSION_KEY);
  } catch (e) {
    console.error("Failed to clear session:", e);
  }
}

// Export types and hooks for easier usage
export const { signIn, signUp, signOut, useSession } = authClient;
