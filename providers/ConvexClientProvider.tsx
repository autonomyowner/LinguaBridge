import React, { useEffect, useState } from "react";
import { ConvexReactClient } from "convex/react";
import { ConvexBetterAuthProvider } from "@convex-dev/better-auth/react";
import { authClient, getStoredSession } from "../lib/auth-client";

// Initialize the Convex client with fallback
const convexUrl = import.meta.env.VITE_CONVEX_URL || "https://rosy-bullfrog-314.convex.cloud";
const convex = new ConvexReactClient(convexUrl);

interface ConvexClientProviderProps {
  children: React.ReactNode;
}

/**
 * ConvexClientProvider
 * Wraps the app with Convex + Better-Auth provider
 *
 * Note: Due to cross-origin cookie limitations, we use a dual-auth approach:
 * 1. ConvexBetterAuthProvider for Convex-level auth (when cookies work)
 * 2. localStorage session for frontend auth state (always works)
 *
 * Some queries use fallback approaches when Convex auth isn't available.
 */
export function ConvexClientProvider({ children }: ConvexClientProviderProps) {
  const [isReady, setIsReady] = useState(false);

  // Try to refresh the Better-Auth session on mount
  // This helps when cookies are available but session state is stale
  useEffect(() => {
    const initAuth = async () => {
      try {
        // Check if we have a stored session
        const storedSession = getStoredSession();
        if (storedSession?.user) {
          // Try to fetch a fresh session from Better-Auth
          // This may update cookies/tokens if they're valid
          await authClient.getSession();
        }
      } catch (error) {
        // Session fetch failed - this is expected for cross-origin
        console.debug("Better-Auth session sync skipped:", error);
      } finally {
        setIsReady(true);
      }
    };

    initAuth();
  }, []);

  // Show nothing until auth is initialized (prevents flash)
  if (!isReady) {
    return null;
  }

  return (
    <ConvexBetterAuthProvider client={convex} authClient={authClient}>
      {children}
    </ConvexBetterAuthProvider>
  );
}

export { convex };
