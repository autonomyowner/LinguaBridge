import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';

const Header: React.FC = () => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const location = useLocation();

  const isActive = (path: string) => location.pathname === path;

  return (
    <header
      className="sticky top-0 z-50 backdrop-blur-md"
      style={{
        background: 'rgba(254, 253, 251, 0.9)',
        borderBottom: '1px solid var(--border-soft)',
      }}
    >
      <div className="max-w-6xl mx-auto px-6 py-4">
        <div className="flex items-center justify-between">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-3">
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center"
              style={{
                background: 'linear-gradient(135deg, var(--matcha-500), var(--matcha-600))',
                boxShadow: 'var(--shadow-md)',
              }}
            >
              <span className="text-lg font-bold" style={{ color: 'var(--text-inverse)' }}>T</span>
            </div>
            <span
              className="text-xl font-semibold font-serif"
              style={{ color: 'var(--matcha-600)' }}
            >
              TRAVoices
            </span>
          </Link>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center gap-8">
            <Link
              to="/"
              className="text-sm font-medium transition-colors"
              style={{
                color: isActive('/') ? 'var(--matcha-600)' : 'var(--text-secondary)',
              }}
            >
              Home
            </Link>
            <Link
              to="/translate"
              className="text-sm font-medium transition-colors"
              style={{
                color: isActive('/translate') ? 'var(--matcha-600)' : 'var(--text-secondary)',
              }}
            >
              Translate
            </Link>
            <a
              href="#how-it-works"
              className="text-sm font-medium transition-colors"
              style={{ color: 'var(--text-secondary)' }}
            >
              How It Works
            </a>
            <a
              href="#features"
              className="text-sm font-medium transition-colors"
              style={{ color: 'var(--text-secondary)' }}
            >
              Features
            </a>
          </nav>

          {/* CTA Button */}
          <div className="hidden md:flex items-center gap-4">
            <Link
              to="/translate"
              className="matcha-btn matcha-btn-primary text-sm px-6 py-2.5"
            >
              Start Translating
            </Link>
          </div>

          {/* Mobile Menu Button */}
          <button
            className="md:hidden p-2 rounded-lg transition-colors"
            style={{ background: 'var(--bg-elevated)' }}
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          >
            <div className="w-5 h-4 flex flex-col justify-between">
              <span
                className={`block h-0.5 rounded-full transition-all ${mobileMenuOpen ? 'rotate-45 translate-y-1.5' : ''}`}
                style={{ background: 'var(--text-primary)' }}
              />
              <span
                className={`block h-0.5 rounded-full transition-all ${mobileMenuOpen ? 'opacity-0' : ''}`}
                style={{ background: 'var(--text-primary)' }}
              />
              <span
                className={`block h-0.5 rounded-full transition-all ${mobileMenuOpen ? '-rotate-45 -translate-y-1.5' : ''}`}
                style={{ background: 'var(--text-primary)' }}
              />
            </div>
          </button>
        </div>

        {/* Mobile Menu */}
        {mobileMenuOpen && (
          <div className="md:hidden pt-4 pb-2 animate-fade-in">
            <nav className="flex flex-col gap-4">
              <Link
                to="/"
                className="text-sm font-medium py-2 transition-colors"
                style={{ color: isActive('/') ? 'var(--matcha-600)' : 'var(--text-secondary)' }}
                onClick={() => setMobileMenuOpen(false)}
              >
                Home
              </Link>
              <Link
                to="/translate"
                className="text-sm font-medium py-2 transition-colors"
                style={{ color: isActive('/translate') ? 'var(--matcha-600)' : 'var(--text-secondary)' }}
                onClick={() => setMobileMenuOpen(false)}
              >
                Translate
              </Link>
              <a
                href="#how-it-works"
                className="text-sm font-medium py-2 transition-colors"
                style={{ color: 'var(--text-secondary)' }}
                onClick={() => setMobileMenuOpen(false)}
              >
                How It Works
              </a>
              <a
                href="#features"
                className="text-sm font-medium py-2 transition-colors"
                style={{ color: 'var(--text-secondary)' }}
                onClick={() => setMobileMenuOpen(false)}
              >
                Features
              </a>
              <Link
                to="/translate"
                className="matcha-btn matcha-btn-primary text-sm py-3 mt-2"
                onClick={() => setMobileMenuOpen(false)}
              >
                Start Translating
              </Link>
            </nav>
          </div>
        )}
      </div>
    </header>
  );
};

export default Header;
