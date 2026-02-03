import React from "react";
import { ConvexProvider, ConvexReactClient } from "convex/react";

// Initialize the Convex client with fallback
const convexUrl = import.meta.env.VITE_CONVEX_URL || "https://rosy-bullfrog-314.convex.cloud";
const convex = new ConvexReactClient(convexUrl);

interface ConvexClientProviderProps {
  children: React.ReactNode;
}

/**
 * ConvexClientProvider
 * Wraps the app with Convex provider (auth removed)
 */
export function ConvexClientProvider({ children }: ConvexClientProviderProps) {
  return (
    <ConvexProvider client={convex}>
      {children}
    </ConvexProvider>
  );
}

export { convex };
