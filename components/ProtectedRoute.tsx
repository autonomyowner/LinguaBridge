import React from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "../providers/AuthContext";

interface ProtectedRouteProps {
  children: React.ReactNode;
  requireAuth?: boolean;
}

/**
 * ProtectedRoute
 * Wraps routes that require authentication
 * Redirects to signin if not authenticated
 */
export function ProtectedRoute({ children, requireAuth = true }: ProtectedRouteProps) {
  const { isAuthenticated, isLoading } = useAuth();
  const location = useLocation();

  // Show loading state while checking auth
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: "var(--bg-page)" }}>
        <div className="text-center">
          <div
            className="w-12 h-12 rounded-full mx-auto mb-4 flex items-center justify-center"
            style={{ background: "var(--matcha-100)" }}
          >
            <div
              className="w-6 h-6 border-2 rounded-full animate-spin"
              style={{ borderColor: "var(--matcha-200)", borderTopColor: "var(--matcha-600)" }}
            />
          </div>
          <p className="text-sm" style={{ color: "var(--text-secondary)" }}>
            Loading...
          </p>
        </div>
      </div>
    );
  }

  // Redirect to signin if not authenticated and auth is required
  if (requireAuth && !isAuthenticated) {
    return <Navigate to="/signin" state={{ from: location }} replace />;
  }

  // Redirect to dashboard if authenticated and on auth pages
  if (!requireAuth && isAuthenticated) {
    const from = (location.state as any)?.from?.pathname || "/dashboard";
    return <Navigate to={from} replace />;
  }

  return <>{children}</>;
}

/**
 * PublicOnlyRoute
 * For pages that should only be accessible when NOT authenticated
 * (e.g., signin, signup pages)
 */
export function PublicOnlyRoute({ children }: { children: React.ReactNode }) {
  return <ProtectedRoute requireAuth={false}>{children}</ProtectedRoute>;
}
