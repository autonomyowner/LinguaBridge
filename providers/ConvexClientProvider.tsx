import React from "react";
import { ConvexProvider, ConvexReactClient } from "convex/react";

// Initialize the Convex client
const convex = new ConvexReactClient(import.meta.env.VITE_CONVEX_URL as string);

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
