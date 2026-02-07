import React, { useState } from "react";
import { Link } from "react-router-dom";
import { authClient, saveSession } from "../../lib/auth-client";

interface SignInFormProps {
  onSuccess?: () => void;
}

export function SignInForm({ onSuccess }: SignInFormProps) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);

    // Simple validation
    if (!email.trim() || !password) {
      setError("Please enter email and password.");
      setIsSubmitting(false);
      return;
    }

    try {
      const result = await authClient.signIn.email({
        email,
        password,
      });

      if (result.error) {
        setError(result.error.message || "Invalid email or password");
        setIsSubmitting(false);
        return;
      }

      // Save session to localStorage for cross-origin persistence
      if (result.data?.user) {
        saveSession({
          user: {
            id: result.data.user.id,
            email: result.data.user.email,
            name: result.data.user.name,
          },
        });
      }

      // Redirect on success - use window.location for full page refresh
      if (onSuccess) {
        onSuccess();
      } else {
        window.location.href = "/dashboard";
      }
    } catch (err) {
      console.error("Sign in error:", err);
      setError("Invalid email or password. Please try again.");
      setIsSubmitting(false);
    }
  };

  return (
    <div className="w-full max-w-md mx-auto">
      <div className="matcha-card p-8">
        <div className="text-center mb-8">
          <h2 className="text-2xl font-serif mb-2" style={{ color: "var(--text-primary)" }}>
            Welcome Back
          </h2>
          <p className="text-sm" style={{ color: "var(--text-secondary)" }}>
            Sign in to continue to TRAVoices
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="matcha-label">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="matcha-input"
              placeholder="you@example.com"
              required
              autoComplete="email"
              disabled={isSubmitting}
            />
          </div>

          <div>
            <label className="matcha-label">Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="matcha-input"
              placeholder="Enter your password"
              required
              autoComplete="current-password"
              disabled={isSubmitting}
            />
          </div>

          {error && (
            <div
              className="p-3 rounded-lg text-sm"
              style={{ background: "rgba(224, 123, 76, 0.1)", color: "var(--terra-500)" }}
            >
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full matcha-btn matcha-btn-primary py-3 font-semibold"
          >
            {isSubmitting ? (
              <span className="flex items-center justify-center gap-2">
                <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Signing in...
              </span>
            ) : (
              "Sign In"
            )}
          </button>
        </form>

        <div className="mt-6 pt-6" style={{ borderTop: "1px solid var(--border-soft)" }}>
          <p className="text-center text-sm" style={{ color: "var(--text-secondary)" }}>
            Don't have an account?{" "}
            <Link
              to="/signup"
              className="font-semibold transition-colors hover:opacity-80"
              style={{ color: "var(--matcha-600)" }}
            >
              Sign up
            </Link>
          </p>
        </div>

        <div className="mt-4">
          <Link
            to="/forgot-password"
            className="block text-center text-sm transition-colors hover:opacity-80"
            style={{ color: "var(--text-muted)" }}
          >
            Forgot your password?
          </Link>
        </div>
      </div>
    </div>
  );
}
