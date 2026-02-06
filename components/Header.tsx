import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { UserMenu } from './UserMenu';
import { useAuth } from '../providers/AuthContext';
import { useLanguage } from '../providers/LanguageContext';
import NotificationBell from './notifications/NotificationBell';

const Header: React.FC = () => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const location = useLocation();
  const { isAuthenticated, isLoading } = useAuth();
  const { language, setLanguage, t, isRTL } = useLanguage();

  const isActive = (path: string) => location.pathname === path;

  const toggleLanguage = () => {
    setLanguage(language === "en" ? "ar" : "en");
  };

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
          <Link to="/" className="flex items-center gap-2">
            {/* Voice wave logo */}
            <svg width="32" height="32" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
              <rect width="32" height="32" rx="8" fill="url(#logoGradient)"/>
              <g transform="translate(6, 8)">
                <rect x="0" y="6" width="3" height="4" rx="1.5" fill="white" opacity="0.9"/>
                <rect x="5" y="3" width="3" height="10" rx="1.5" fill="white"/>
                <rect x="10" y="0" width="3" height="16" rx="1.5" fill="white"/>
                <rect x="15" y="3" width="3" height="10" rx="1.5" fill="white"/>
              </g>
              <defs>
                <linearGradient id="logoGradient" x1="0" y1="0" x2="32" y2="32" gradientUnits="userSpaceOnUse">
                  <stop stopColor="#68a67d"/>
                  <stop offset="1" stopColor="#5a9470"/>
                </linearGradient>
              </defs>
            </svg>
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
              {t("nav.home")}
            </Link>
            {isAuthenticated && (
              <Link
                to="/dashboard"
                className="text-sm font-medium transition-colors"
                style={{
                  color: isActive('/dashboard') ? 'var(--matcha-600)' : 'var(--text-secondary)',
                }}
              >
                {t("nav.dashboard")}
              </Link>
            )}
            <Link
              to="/translate"
              className="text-sm font-medium transition-colors"
              style={{
                color: isActive('/translate') ? 'var(--matcha-600)' : 'var(--text-secondary)',
              }}
            >
              {t("nav.translate")}
            </Link>
            <Link
              to="/pricing"
              className="text-sm font-medium transition-colors"
              style={{
                color: isActive('/pricing') ? 'var(--matcha-600)' : 'var(--text-secondary)',
              }}
            >
              {t("nav.pricing")}
            </Link>
            {isAuthenticated && (
              <>
                <Link
                  to="/friends"
                  className="text-sm font-medium transition-colors"
                  style={{
                    color: isActive('/friends') ? 'var(--matcha-600)' : 'var(--text-secondary)',
                  }}
                >
                  {t("nav.friends")}
                </Link>
                <Link
                  to="/messages"
                  className="text-sm font-medium transition-colors"
                  style={{
                    color: isActive('/messages') ? 'var(--matcha-600)' : 'var(--text-secondary)',
                  }}
                >
                  {t("nav.messages")}
                </Link>
              </>
            )}
          </nav>

          {/* Auth Section */}
          <div className="hidden md:flex items-center gap-4">
            {/* Language Toggle */}
            <button
              onClick={toggleLanguage}
              className="px-3 py-1.5 rounded-lg text-sm font-medium transition-all"
              style={{
                background: 'var(--bg-elevated)',
                color: 'var(--text-secondary)',
                border: '1px solid var(--border-soft)',
              }}
              title={language === "en" ? "Switch to Arabic" : "التبديل إلى الإنجليزية"}
            >
              {language === "en" ? "AR" : "EN"}
            </button>

            {isLoading ? (
              <div className="w-8 h-8 rounded-full animate-pulse" style={{ background: 'var(--bg-elevated)' }} />
            ) : (
              <>
                {isAuthenticated && <NotificationBell />}
                <UserMenu />
              </>
            )}
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
                {t("nav.home")}
              </Link>
              {isAuthenticated && (
                <Link
                  to="/dashboard"
                  className="text-sm font-medium py-2 transition-colors"
                  style={{ color: isActive('/dashboard') ? 'var(--matcha-600)' : 'var(--text-secondary)' }}
                  onClick={() => setMobileMenuOpen(false)}
                >
                  {t("nav.dashboard")}
                </Link>
              )}
              <Link
                to="/translate"
                className="text-sm font-medium py-2 transition-colors"
                style={{ color: isActive('/translate') ? 'var(--matcha-600)' : 'var(--text-secondary)' }}
                onClick={() => setMobileMenuOpen(false)}
              >
                {t("nav.translate")}
              </Link>
              <Link
                to="/pricing"
                className="text-sm font-medium py-2 transition-colors"
                style={{ color: isActive('/pricing') ? 'var(--matcha-600)' : 'var(--text-secondary)' }}
                onClick={() => setMobileMenuOpen(false)}
              >
                {t("nav.pricing")}
              </Link>
              {isAuthenticated && (
                <>
                  <Link
                    to="/friends"
                    className="text-sm font-medium py-2 transition-colors"
                    style={{ color: isActive('/friends') ? 'var(--matcha-600)' : 'var(--text-secondary)' }}
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    {t("nav.friends")}
                  </Link>
                  <Link
                    to="/messages"
                    className="text-sm font-medium py-2 transition-colors"
                    style={{ color: isActive('/messages') ? 'var(--matcha-600)' : 'var(--text-secondary)' }}
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    {t("nav.messages")}
                  </Link>
                </>
              )}

              {/* Mobile Language Toggle */}
              <button
                onClick={toggleLanguage}
                className="text-sm font-medium py-2 text-left transition-colors flex items-center gap-2"
                style={{ color: 'var(--text-secondary)' }}
              >
                {language === "en" ? "العربية (AR)" : "English (EN)"}
              </button>

              {/* Mobile Auth */}
              <div className="pt-4 mt-2" style={{ borderTop: '1px solid var(--border-soft)' }}>
                {isAuthenticated ? (
                  <Link
                    to="/settings"
                    className="text-sm font-medium py-2 block transition-colors"
                    style={{ color: 'var(--text-secondary)' }}
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    {t("nav.settings")}
                  </Link>
                ) : (
                  <div className="flex flex-col gap-3">
                    <Link
                      to="/signin"
                      className="text-sm font-medium py-2 transition-colors"
                      style={{ color: 'var(--text-secondary)' }}
                      onClick={() => setMobileMenuOpen(false)}
                    >
                      {t("nav.signIn")}
                    </Link>
                    <Link
                      to="/signup"
                      className="matcha-btn matcha-btn-primary text-sm py-3"
                      onClick={() => setMobileMenuOpen(false)}
                    >
                      {t("nav.getStarted")}
                    </Link>
                  </div>
                )}
              </div>
            </nav>
          </div>
        )}
      </div>
    </header>
  );
};

export default Header;
