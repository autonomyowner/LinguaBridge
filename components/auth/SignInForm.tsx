import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";

interface SignInFormProps {
  onSuccess?: () => void;
}

export function SignInForm({ onSuccess }: SignInFormProps) {
  const navigate = useNavigate();
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

    // Navigate directly to dashboard (no backend auth)
    if (onSuccess) {
      onSuccess();
    } else {
      navigate("/dashboard", { replace: true });
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
