import React, { useState } from "react";
import { Link } from "react-router-dom";

export function ForgotPasswordForm() {
  const [email, setEmail] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    try {
      // Note: Convex Auth handles password reset via email
      // The actual implementation depends on your email setup
      // For now, we'll show a success message

      // Simulate API call
      await new Promise((resolve) => setTimeout(resolve, 1000));

      setIsSubmitted(true);
    } catch (err: any) {
      setError(err.message || "Failed to send reset email. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  if (isSubmitted) {
    return (
      <div className="w-full max-w-md mx-auto">
        <div className="matcha-card p-8">
          <div className="text-center">
            <div
              className="w-16 h-16 rounded-full mx-auto mb-6 flex items-center justify-center"
              style={{ background: "var(--matcha-100)" }}
            >
              <svg
                className="w-8 h-8"
                style={{ color: "var(--matcha-600)" }}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
                />
              </svg>
            </div>
            <h2 className="text-2xl font-serif mb-2" style={{ color: "var(--text-primary)" }}>
              Check Your Email
            </h2>
            <p className="text-sm mb-6" style={{ color: "var(--text-secondary)" }}>
              We've sent password reset instructions to <strong>{email}</strong>
            </p>
            <Link
              to="/signin"
              className="matcha-btn matcha-btn-secondary py-2 px-6 inline-block"
            >
              Back to Sign In
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full max-w-md mx-auto">
      <div className="matcha-card p-8">
        <div className="text-center mb-8">
          <h2 className="text-2xl font-serif mb-2" style={{ color: "var(--text-primary)" }}>
            Reset Password
          </h2>
          <p className="text-sm" style={{ color: "var(--text-secondary)" }}>
            Enter your email and we'll send you reset instructions
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
            disabled={isLoading}
            className="w-full matcha-btn matcha-btn-primary py-3 font-semibold"
          >
            {isLoading ? (
              <span className="flex items-center justify-center gap-2">
                <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Sending...
              </span>
            ) : (
              "Send Reset Link"
            )}
          </button>
        </form>

        <div className="mt-6 pt-6" style={{ borderTop: "1px solid var(--border-soft)" }}>
          <p className="text-center text-sm" style={{ color: "var(--text-secondary)" }}>
            Remember your password?{" "}
            <Link
              to="/signin"
              className="font-semibold transition-colors hover:opacity-80"
              style={{ color: "var(--matcha-600)" }}
            >
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
