import React, { useState, useRef, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../providers/AuthContext";

export function UserMenu() {
  const { user, isAuthenticated, signOut } = useAuth();
  const navigate = useNavigate();
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // Close menu when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleSignOut = async () => {
    await signOut();
    setIsOpen(false);
    navigate("/");
  };

  if (!isAuthenticated) {
    return (
      <div className="flex items-center gap-3">
        <Link
          to="/signin"
          className="text-sm font-medium transition-colors hover:opacity-80"
          style={{ color: "var(--text-secondary)" }}
        >
          Sign In
        </Link>
        <Link to="/signup" className="matcha-btn matcha-btn-primary py-2 px-4 text-sm">
          Get Started
        </Link>
      </div>
    );
  }

  const userInitial = user?.name?.charAt(0).toUpperCase() || user?.email?.charAt(0).toUpperCase() || "?";
  const displayName = user?.name || user?.email?.split("@")[0] || "User";

  return (
    <div className="relative" ref={menuRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 p-1.5 rounded-lg transition-colors"
        style={{ background: isOpen ? "var(--bg-elevated)" : "transparent" }}
      >
        <div
          className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold"
          style={{ background: "var(--matcha-500)", color: "var(--text-inverse)" }}
        >
          {userInitial}
        </div>
        <span className="hidden sm:block text-sm font-medium" style={{ color: "var(--text-primary)" }}>
          {displayName}
        </span>
        <svg
          className={`w-4 h-4 transition-transform ${isOpen ? "rotate-180" : ""}`}
          style={{ color: "var(--text-muted)" }}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {isOpen && (
        <div
          className="absolute right-0 mt-2 w-56 rounded-xl shadow-lg py-2 z-50 animate-fade-in"
          style={{ background: "var(--bg-card)", border: "1px solid var(--border-soft)" }}
        >
          {/* User info */}
          <div className="px-4 py-3" style={{ borderBottom: "1px solid var(--border-soft)" }}>
            <p className="text-sm font-medium truncate" style={{ color: "var(--text-primary)" }}>
              {displayName}
            </p>
            <p className="text-xs truncate" style={{ color: "var(--text-muted)" }}>
              {user?.email}
            </p>
            <div className="mt-2">
              <span
                className="text-xs px-2 py-0.5 rounded-full font-medium capitalize"
                style={{
                  background: user?.subscriptionTier === "free" ? "var(--bg-elevated)" : "var(--matcha-100)",
                  color: user?.subscriptionTier === "free" ? "var(--text-secondary)" : "var(--matcha-700)",
                }}
              >
                {user?.subscriptionTier || "free"} plan
              </span>
            </div>
          </div>

          {/* Menu items */}
          <div className="py-1">
            <Link
              to="/dashboard"
              onClick={() => setIsOpen(false)}
              className="flex items-center gap-3 px-4 py-2 text-sm transition-colors hover:bg-black/5"
              style={{ color: "var(--text-primary)" }}
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"
                />
              </svg>
              Dashboard
            </Link>

            <Link
              to="/translate"
              onClick={() => setIsOpen(false)}
              className="flex items-center gap-3 px-4 py-2 text-sm transition-colors hover:bg-black/5"
              style={{ color: "var(--text-primary)" }}
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M3 5h12M9 3v2m1.048 9.5A18.022 18.022 0 016.412 9m6.088 9h7M11 21l5-10 5 10M12.751 5C11.783 10.77 8.07 15.61 3 18.129"
                />
              </svg>
              Translation Room
            </Link>

            <Link
              to="/settings"
              onClick={() => setIsOpen(false)}
              className="flex items-center gap-3 px-4 py-2 text-sm transition-colors hover:bg-black/5"
              style={{ color: "var(--text-primary)" }}
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
                />
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                />
              </svg>
              Settings
            </Link>

            <Link
              to="/pricing"
              onClick={() => setIsOpen(false)}
              className="flex items-center gap-3 px-4 py-2 text-sm transition-colors hover:bg-black/5"
              style={{ color: "var(--text-primary)" }}
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z"
                />
              </svg>
              Upgrade Plan
            </Link>
          </div>

          {/* Sign out */}
          <div className="py-1" style={{ borderTop: "1px solid var(--border-soft)" }}>
            <button
              onClick={handleSignOut}
              className="flex items-center gap-3 w-full px-4 py-2 text-sm transition-colors hover:bg-black/5"
              style={{ color: "var(--terra-500)" }}
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"
                />
              </svg>
              Sign Out
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
