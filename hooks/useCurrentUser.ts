import { useQuery, useMutation } from "convex/react";
import { api } from "../convex/_generated/api";
import { authClient } from "../lib/auth-client";
import { useEffect } from "react";

/**
 * Hook to get the current authenticated user with their app profile
 * Also ensures the user record exists in our users table
 */
export function useCurrentUser() {
  const { data: session, isPending } = authClient.useSession();
  const user = useQuery(api.users.queries.getCurrent);
  const ensureUser = useMutation(api.users.mutations.ensureUser);

  // Ensure user exists in our users table after authentication
  useEffect(() => {
    if (session && !isPending && user === null) {
      // User is authenticated but doesn't have an app user record yet
      ensureUser().catch(console.error);
    }
  }, [session, isPending, user, ensureUser]);

  return {
    user,
    session,
    isLoading: isPending || (session && user === undefined),
    isAuthenticated: !!session,
  };
}

/**
 * Hook for auth state (compatible with existing patterns)
 */
export function useConvexAuth() {
  const { data: session, isPending } = authClient.useSession();

  return {
    isAuthenticated: !!session,
    isLoading: isPending,
  };
}

/**
 * Hook to get just the session (for header/menu components)
 */
export function useSession() {
  return authClient.useSession();
}
