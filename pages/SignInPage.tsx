import React from "react";
import { Link } from "react-router-dom";
import { SignInForm } from "../components/auth/SignInForm";
import Header from "../components/Header";

const SignInPage: React.FC = () => {
  return (
    <div className="min-h-screen" style={{ background: "var(--bg-page)" }}>
      <Header />

      <main className="relative z-10 px-6 py-12">
        <div className="max-w-md mx-auto">
          {/* Back to home */}
          <Link
            to="/"
            className="inline-flex items-center gap-2 text-sm mb-8 transition-colors hover:opacity-80"
            style={{ color: "var(--text-secondary)" }}
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Back to home
          </Link>

          <SignInForm />
        </div>
      </main>
    </div>
  );
};

export default SignInPage;
