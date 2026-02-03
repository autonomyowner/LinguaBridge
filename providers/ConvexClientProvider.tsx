import React from "react";
import { ConvexReactClient } from "convex/react";
import { ConvexAuthProvider } from "@convex-dev/auth/react";

// Initialize the Convex client
const convex = new ConvexReactClient(import.meta.env.VITE_CONVEX_URL as string);

interface ConvexClientProviderProps {
  children: React.ReactNode;
}

/**
 * ConvexClientProvider
 * Wraps the app with Convex Auth provider (which includes Convex provider)
 */
export function ConvexClientProvider({ children }: ConvexClientProviderProps) {
  return (
    <ConvexAuthProvider client={convex}>
      {children}
    </ConvexAuthProvider>
  );
}

export { convex };
