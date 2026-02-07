import React, { useState } from "react";
import { Link } from "react-router-dom";
import { authClient, saveSession } from "../../lib/auth-client";

interface SignUpFormProps {
  onSuccess?: () => void;
}

export function SignUpForm({ onSuccess }: SignUpFormProps) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // Validate passwords match
    if (password !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }

    // Validate password strength
    if (password.length < 8) {
      setError("Password must be at least 8 characters");
      return;
    }

    setIsSubmitting(true);

    try {
      const result = await authClient.signUp.email({
        email,
        password,
        name,
      });

      if (result.error) {
        setError(result.error.message || "Could not create account");
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
      console.error("Sign up error:", err);
      setError("Could not create account. Email may already be in use.");
      setIsSubmitting(false);
    }
  };

  return (
    <div className="w-full max-w-md mx-auto">
      <div className="matcha-card p-8">
        <div className="text-center mb-8">
          <h2 className="text-2xl font-serif mb-2" style={{ color: "var(--text-primary)" }}>
            Create Your Account
          </h2>
          <p className="text-sm" style={{ color: "var(--text-secondary)" }}>
            Start translating in real-time today
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="matcha-label">Full Name</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="matcha-input"
              placeholder="John Doe"
              required
              autoComplete="name"
              disabled={isSubmitting}
            />
          </div>

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
              placeholder="At least 8 characters"
              required
              autoComplete="new-password"
              minLength={8}
              disabled={isSubmitting}
            />
          </div>

          <div>
            <label className="matcha-label">Confirm Password</label>
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="matcha-input"
              placeholder="Confirm your password"
              required
              autoComplete="new-password"
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
                Creating account...
              </span>
            ) : (
              "Create Account"
            )}
          </button>
        </form>

        <div className="mt-6 pt-6" style={{ borderTop: "1px solid var(--border-soft)" }}>
          <p className="text-center text-sm" style={{ color: "var(--text-secondary)" }}>
            Already have an account?{" "}
            <Link
              to="/signin"
              className="font-semibold transition-colors hover:opacity-80"
              style={{ color: "var(--matcha-600)" }}
            >
              Sign in
            </Link>
          </p>
        </div>

        <p className="mt-4 text-center text-xs" style={{ color: "var(--text-muted)" }}>
          By creating an account, you agree to our{" "}
          <a href="#" className="underline">
            Terms of Service
          </a>{" "}
          and{" "}
          <a href="#" className="underline">
            Privacy Policy
          </a>
        </p>
      </div>
    </div>
  );
}
