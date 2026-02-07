import React, { createContext, useContext, ReactNode, useState, useEffect } from "react";
import { authClient, getStoredSession, saveSession, clearSession } from "../lib/auth-client";

interface User {
  id: string;
  email: string;
  name?: string;
}

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  signOut: () => Promise<void>;
  refreshSession: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

interface AuthProviderProps {
  children: ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Check for stored session on mount
  useEffect(() => {
    const checkSession = async () => {
      try {
        // First check localStorage
        const storedSession = getStoredSession();
        if (storedSession?.user) {
          setUser(storedSession.user);
          setIsLoading(false);
          return;
        }

        // Try to fetch session from server (might work with cookies)
        const { data: session } = await authClient.getSession();
        if (session?.user) {
          const userData = {
            id: session.user.id,
            email: session.user.email,
            name: session.user.name,
          };
          setUser(userData);
          saveSession({ user: userData });
        }
      } catch (error) {
        console.error("Session check failed:", error);
      } finally {
        setIsLoading(false);
      }
    };

    checkSession();
  }, []);

  const refreshSession = () => {
    const storedSession = getStoredSession();
    if (storedSession?.user) {
      setUser(storedSession.user);
    }
  };

  const handleSignOut = async () => {
    try {
      await authClient.signOut();
    } catch (error) {
      console.error("Sign out error:", error);
    }
    clearSession();
    setUser(null);
    window.location.href = "/";
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        isAuthenticated: !!user,
        signOut: handleSignOut,
        refreshSession,
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
 * Hook to get the current user (legacy compatibility)
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
