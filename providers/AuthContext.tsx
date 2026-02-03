import React, { createContext, useContext, ReactNode } from "react";
import { useQuery } from "convex/react";
import { useAuthActions } from "@convex-dev/auth/react";
import { api } from "../convex/_generated/api";
import { Doc } from "../convex/_generated/dataModel";

interface AuthContextType {
  user: Doc<"users"> | null | undefined;
  isLoading: boolean;
  isAuthenticated: boolean;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

interface AuthProviderProps {
  children: ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const user = useQuery(api.users.queries.getCurrent);
  const { signOut } = useAuthActions();

  const isLoading = user === undefined;
  const isAuthenticated = !!user;

  const handleSignOut = async () => {
    await signOut();
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        isAuthenticated,
        signOut: handleSignOut,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}

/**
 * Hook to get the current user
 * Throws if not authenticated
 */
export function useCurrentUser() {
  const { user, isLoading, isAuthenticated } = useAuth();

  if (isLoading) {
    return { user: null, isLoading: true };
  }

  if (!isAuthenticated || !user) {
    return { user: null, isLoading: false };
  }

  return { user, isLoading: false };
}
