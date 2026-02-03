import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import Header from '../components/Header';
import { useLanguage } from '../providers/LanguageContext';

const HomePage: React.FC = () => {
  const [mounted, setMounted] = useState(false);
  const { t, isRTL } = useLanguage();

  useEffect(() => {
    setMounted(true);
  }, []);

  return (
    <div className="min-h-screen overflow-hidden" style={{ background: 'var(--cream-50)' }}>
      <Header />

      {/* Decorative Background Elements */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div
          className="absolute -top-32 -right-32 w-[600px] h-[600px] opacity-30 blob-float"
          style={{
            background: 'radial-gradient(circle, var(--matcha-200) 0%, transparent 70%)',
            borderRadius: '60% 40% 30% 70% / 60% 30% 70% 40%',
          }}
        />
        <div
          className="absolute top-1/3 -left-20 w-[400px] h-[400px] opacity-20 blob-float-reverse"
          style={{
            background: 'radial-gradient(circle, var(--terra-300) 0%, transparent 70%)',
            borderRadius: '30% 70% 70% 30% / 30% 30% 70% 70%',
          }}
        />
        <div
          className="absolute bottom-1/4 right-1/4 w-[200px] h-[200px] opacity-25 blob-float"
          style={{
            background: 'radial-gradient(circle, var(--matcha-300) 0%, transparent 70%)',
            borderRadius: '70% 30% 50% 50% / 50% 50% 50% 50%',
          }}
        />
      </div>

      {/* Hero Section */}
      <section className="relative pt-16 pb-24 px-4">
        <div className="max-w-5xl mx-auto">
          {/* Eyebrow */}
          <div
            className={`flex justify-center mb-8 transition-all duration-700 ${
              mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
            }`}
          >
            <span
              className="px-4 py-2 rounded-full text-sm font-medium"
              style={{
                background: 'var(--matcha-100)',
                color: 'var(--matcha-700)',
                border: '1px solid var(--matcha-200)',
              }}
            >
              {t("hero.badge")}
            </span>
          </div>

          {/* Main Headline */}
          <h1
            className={`text-center mb-6 transition-all duration-700 delay-100 ${
              mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
            }`}
            style={{
              fontFamily: isRTL ? '"Cairo", system-ui, sans-serif' : '"DM Serif Display", Georgia, serif',
              fontSize: 'clamp(2.5rem, 6vw, 4.5rem)',
              lineHeight: 1.1,
              color: 'var(--text-primary)',
            }}
          >
            {t("hero.title1")}
            <br />
            <span className="text-gradient">{t("hero.title2")}</span>
          </h1>

          {/* Subheadline */}
          <p
            className={`text-center max-w-2xl mx-auto mb-10 text-lg transition-all duration-700 delay-200 ${
              mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
            }`}
            style={{ color: 'var(--text-secondary)', lineHeight: 1.7 }}
          >
            {t("hero.subtitle")}
          </p>

          {/* CTA Buttons */}
          <div
            className={`flex flex-col sm:flex-row items-center justify-center gap-4 mb-20 transition-all duration-700 delay-300 ${
              mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
            }`}
          >
            <Link
              to="/translate"
              className="matcha-btn matcha-btn-primary text-base px-8 py-4"
            >
              {t("hero.cta.start")}
            </Link>
            <a
              href="#how-it-works"
              className="matcha-btn matcha-btn-secondary text-base px-8 py-4"
            >
              {t("hero.cta.howItWorks")}
            </a>
          </div>

          {/* Hero Visual - Voice Communication */}
          <div
            className={`relative max-w-5xl mx-auto transition-all duration-1000 delay-500 ${
              mounted ? 'opacity-100 scale-100' : 'opacity-0 scale-95'
            }`}
          >
            <div
              className="relative rounded-2xl md:rounded-3xl overflow-hidden"
              style={{
                background: 'radial-gradient(ellipse at top, #1a2332 0%, #0d1219 100%)',
                border: '1px solid rgba(104, 166, 125, 0.15)',
                boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.6), inset 0 1px 0 rgba(255, 255, 255, 0.03)',
                minHeight: '400px',
              }}
            >
              {/* Animated gradient orbs */}
              <div
                className="absolute top-1/4 left-1/4 w-64 h-64 rounded-full blur-3xl opacity-20 float-slow"
                style={{ background: 'radial-gradient(circle, var(--matcha-400) 0%, transparent 70%)' }}
              />
              <div
                className="absolute bottom-1/4 right-1/4 w-64 h-64 rounded-full blur-3xl opacity-20 float-slow-reverse"
                style={{ background: 'radial-gradient(circle, var(--terra-400) 0%, transparent 70%)' }}
              />

              {/* Main Content */}
              <div className="relative h-full min-h-[400px] flex flex-col md:flex-row items-center justify-center gap-6 md:gap-12 p-8 md:p-12">

                {/* Left Voice Orb - English */}
                <div className="relative flex flex-col items-center gap-3 z-10">
                  <div className="relative">
                    <div
                      className="w-24 h-24 md:w-32 md:h-32 rounded-full flex items-center justify-center relative"
                      style={{
                        background: 'linear-gradient(135deg, var(--matcha-400) 0%, var(--matcha-600) 100%)',
                        boxShadow: '0 0 60px rgba(104, 166, 125, 0.5), inset 0 2px 10px rgba(255, 255, 255, 0.2)',
                      }}
                    >
                      <span className="text-3xl md:text-4xl font-bold" style={{ color: 'white' }}>EN</span>
                      <div
                        className="absolute inset-3 rounded-full pulse-glow"
                        style={{ background: 'radial-gradient(circle, rgba(255,255,255,0.3) 0%, transparent 70%)' }}
                      />
                    </div>
                    {/* Pulse rings */}
                    {[0, 1, 2].map((i) => (
                      <div
                        key={i}
                        className="absolute inset-0 rounded-full border-2 pulse-ring"
                        style={{
                          borderColor: 'rgba(104, 166, 125, 0.4)',
                          animationDelay: `${i * 0.4}s`,
                        }}
                      />
                    ))}
                  </div>
                  <div
                    className="px-4 py-1.5 rounded-full backdrop-blur-sm"
                    style={{
                      background: 'rgba(104, 166, 125, 0.15)',
                      border: '1px solid rgba(104, 166, 125, 0.3)',
                    }}
                  >
                    <span className="text-xs md:text-sm font-bold tracking-wider" style={{ color: 'var(--matcha-300)' }}>
                      ENGLISH
                    </span>
                  </div>
                  {/* Audio waves */}
                  <div className="flex items-end gap-1 h-16 md:h-20">
                    {[4, 7, 5, 9, 6, 8, 5, 7].map((height, i) => (
                      <div
                        key={i}
                        className="w-1 md:w-1.5 rounded-full audio-wave"
                        style={{
                          height: `${height * 6}px`,
                          background: 'linear-gradient(to top, var(--matcha-600), var(--matcha-300))',
                          animationDelay: `${i * 0.08}s`,
                        }}
                      />
                    ))}
                  </div>
                </div>

                {/* Center - Live Translation Flow */}
                <div className="flex flex-col items-center justify-center gap-4 md:gap-6 flex-1 max-w-md">
                  <div className="relative w-full">
                    <div className="relative h-0.5 w-full rounded-full overflow-hidden">
                      <div
                        className="absolute inset-0 shimmer"
                        style={{
                          background: 'linear-gradient(90deg, transparent 0%, var(--matcha-500) 20%, var(--terra-400) 50%, var(--matcha-500) 80%, transparent 100%)',
                        }}
                      />
                    </div>
                    {[0, 1, 2].map((i) => (
                      <div
                        key={i}
                        className="absolute top-1/2 w-3 h-3 rounded-full travel-dot"
                        style={{
                          background: i % 2 === 0 ? 'var(--matcha-400)' : 'var(--terra-400)',
                          boxShadow: `0 0 15px ${i % 2 === 0 ? 'var(--matcha-400)' : 'var(--terra-400)'}`,
                          transform: 'translateY(-50%)',
                          animationDelay: `${i * 0.8}s`,
                        }}
                      />
                    ))}
                  </div>

                  <div
                    className="px-5 md:px-6 py-3 md:py-4 rounded-2xl backdrop-blur-md w-full"
                    style={{
                      background: 'rgba(15, 23, 42, 0.6)',
                      border: '1px solid rgba(104, 166, 125, 0.2)',
                      boxShadow: '0 8px 32px rgba(0, 0, 0, 0.3)',
                    }}
                  >
                    <div className="flex flex-col gap-3">
                      <div className="flex items-center justify-center gap-2">
                        <div
                          className="w-2 h-2 rounded-full pulse-dot"
                          style={{ background: '#10b981', boxShadow: '0 0 12px #10b981' }}
                        />
                        <span className="text-xs md:text-sm font-medium text-white/90">
                          {t("hero.liveTranslation")}
                        </span>
                      </div>
                      <div className="flex items-center justify-center gap-3">
                        <span className="text-sm font-mono" style={{ color: 'var(--matcha-300)' }}>EN</span>
                        <span style={{ color: 'rgba(255,255,255,0.5)' }}>→</span>
                        <span className="text-sm font-mono" style={{ color: 'var(--terra-300)' }}>ES</span>
                      </div>
                      <div className="flex flex-wrap gap-2 justify-center text-[10px] md:text-xs">
                        <span className="px-2 py-0.5 rounded" style={{ background: 'rgba(104, 166, 125, 0.2)', color: 'var(--matcha-300)', border: '1px solid rgba(104, 166, 125, 0.3)' }}>
                          {t("hero.languages")}
                        </span>
                        <span className="px-2 py-0.5 rounded" style={{ background: 'rgba(224, 123, 76, 0.2)', color: 'var(--terra-300)', border: '1px solid rgba(224, 123, 76, 0.3)' }}>
                          {t("hero.realtime")}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Right Voice Orb - Spanish */}
                <div className="relative flex flex-col items-center gap-3 z-10">
                  <div className="relative">
                    <div
                      className="w-24 h-24 md:w-32 md:h-32 rounded-full flex items-center justify-center relative"
                      style={{
                        background: 'linear-gradient(135deg, var(--terra-400) 0%, var(--terra-600) 100%)',
                        boxShadow: '0 0 60px rgba(198, 123, 94, 0.5), inset 0 2px 10px rgba(255, 255, 255, 0.2)',
                      }}
                    >
                      <span className="text-3xl md:text-4xl font-bold" style={{ color: 'white' }}>ES</span>
                      <div
                        className="absolute inset-3 rounded-full pulse-glow"
                        style={{ background: 'radial-gradient(circle, rgba(255,255,255,0.3) 0%, transparent 70%)', animationDelay: '0.3s' }}
                      />
                    </div>
                    {[0, 1, 2].map((i) => (
                      <div
                        key={i}
                        className="absolute inset-0 rounded-full border-2 pulse-ring"
                        style={{
                          borderColor: 'rgba(198, 123, 94, 0.4)',
                          animationDelay: `${i * 0.4 + 0.3}s`,
                        }}
                      />
                    ))}
                  </div>
                  <div
                    className="px-4 py-1.5 rounded-full backdrop-blur-sm"
                    style={{
                      background: 'rgba(198, 123, 94, 0.15)',
                      border: '1px solid rgba(198, 123, 94, 0.3)',
                    }}
                  >
                    <span className="text-xs md:text-sm font-bold tracking-wider" style={{ color: 'var(--terra-300)' }}>
                      SPANISH
                    </span>
                  </div>
                  <div className="flex items-end gap-1 h-16 md:h-20">
                    {[7, 5, 8, 6, 9, 5, 7, 4].map((height, i) => (
                      <div
                        key={i}
                        className="w-1 md:w-1.5 rounded-full audio-wave"
                        style={{
                          height: `${height * 6}px`,
                          background: 'linear-gradient(to top, var(--terra-600), var(--terra-300))',
                          animationDelay: `${i * 0.08 + 0.3}s`,
                        }}
                      />
                    ))}
                  </div>
                </div>
              </div>

              {/* Floating badges */}
              <div
                className={`hidden md:block absolute top-6 ${isRTL ? 'right-6' : 'left-6'} px-3 py-1.5 rounded-lg backdrop-blur-sm float-badge`}
                style={{ background: 'rgba(104, 166, 125, 0.1)', border: '1px solid rgba(104, 166, 125, 0.2)' }}
              >
                <span className="text-xs font-medium" style={{ color: 'var(--matcha-300)' }}>{t("hero.badge20")}</span>
              </div>
              <div
                className={`hidden md:block absolute top-6 ${isRTL ? 'left-6' : 'right-6'} px-3 py-1.5 rounded-lg backdrop-blur-sm float-badge`}
                style={{ background: 'rgba(198, 123, 94, 0.1)', border: '1px solid rgba(198, 123, 94, 0.2)', animationDelay: '0.5s' }}
              >
                <span className="text-xs font-medium" style={{ color: 'var(--terra-300)' }}>{t("hero.zeroLatency")}</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section id="how-it-works" className="py-24 px-4 relative z-10">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-16">
            <h2
              className="text-3xl md:text-4xl mb-4"
              style={{ fontFamily: isRTL ? '"Cairo", system-ui, sans-serif' : '"DM Serif Display", Georgia, serif', color: 'var(--text-primary)' }}
            >
              {t("howItWorks.title")}
            </h2>
            <p className="max-w-xl mx-auto" style={{ color: 'var(--text-secondary)' }}>
              {t("howItWorks.subtitle")}
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {[
              { step: '01', title: t("howItWorks.step1.title"), description: t("howItWorks.step1.desc") },
              { step: '02', title: t("howItWorks.step2.title"), description: t("howItWorks.step2.desc") },
              { step: '03', title: t("howItWorks.step3.title"), description: t("howItWorks.step3.desc") },
            ].map((item, i) => (
              <div key={i} className="matcha-card p-8 relative overflow-hidden group">
                <span
                  className={`absolute -top-4 ${isRTL ? '-left-4' : '-right-4'} text-8xl font-bold opacity-5 group-hover:opacity-10 transition-opacity`}
                  style={{ fontFamily: '"DM Serif Display", Georgia, serif', color: 'var(--matcha-600)' }}
                >
                  {item.step}
                </span>
                <div
                  className="w-12 h-12 rounded-2xl flex items-center justify-center mb-6"
                  style={{ background: 'var(--matcha-100)', color: 'var(--matcha-700)' }}
                >
                  <span className="text-lg font-semibold" style={{ fontFamily: '"DM Serif Display", Georgia, serif' }}>
                    {item.step}
                  </span>
                </div>
                <h3
                  className="text-xl mb-3"
                  style={{ fontFamily: isRTL ? '"Cairo", system-ui, sans-serif' : '"DM Serif Display", Georgia, serif', color: 'var(--text-primary)' }}
                >
                  {item.title}
                </h3>
                <p style={{ color: 'var(--text-secondary)', lineHeight: 1.7 }}>
                  {item.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-24 px-4 relative z-10" style={{ background: 'var(--cream-100)' }}>
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-16">
            <h2
              className="text-3xl md:text-4xl mb-4"
              style={{ fontFamily: isRTL ? '"Cairo", system-ui, sans-serif' : '"DM Serif Display", Georgia, serif', color: 'var(--text-primary)' }}
            >
              {t("features.title")}
            </h2>
            <p className="max-w-xl mx-auto" style={{ color: 'var(--text-secondary)' }}>
              {t("features.subtitle")}
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-8">
            {[
              { title: t("features.realtime.title"), description: t("features.realtime.desc"), color: 'var(--matcha-500)' },
              { title: t("features.multiRoom.title"), description: t("features.multiRoom.desc"), color: 'var(--terra-400)' },
              { title: t("features.languages.title"), description: t("features.languages.desc"), color: 'var(--matcha-600)' },
              { title: t("features.transcription.title"), description: t("features.transcription.desc"), color: 'var(--terra-500)' },
            ].map((feature, i) => (
              <div key={i} className={`flex gap-6 p-6 rounded-2xl transition-all duration-300 hover:bg-white/50 ${isRTL ? 'flex-row-reverse text-right' : ''}`}>
                <div className="w-1 rounded-full flex-shrink-0" style={{ background: feature.color }} />
                <div>
                  <h3
                    className="text-xl mb-2"
                    style={{ fontFamily: isRTL ? '"Cairo", system-ui, sans-serif' : '"DM Serif Display", Georgia, serif', color: 'var(--text-primary)' }}
                  >
                    {feature.title}
                  </h3>
                  <p style={{ color: 'var(--text-secondary)', lineHeight: 1.7 }}>
                    {feature.description}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-24 px-4 relative z-10">
        <div className="max-w-4xl mx-auto">
          <div
            className="rounded-3xl p-12 md:p-16 text-center relative overflow-hidden"
            style={{ background: 'linear-gradient(135deg, var(--matcha-500) 0%, var(--matcha-700) 100%)' }}
          >
            <div
              className={`absolute top-0 ${isRTL ? 'left-0' : 'right-0'} w-64 h-64 opacity-10`}
              style={{
                background: 'radial-gradient(circle, white 0%, transparent 70%)',
                borderRadius: '50%',
                transform: 'translate(30%, -30%)',
              }}
            />
            <div
              className={`absolute bottom-0 ${isRTL ? 'right-0' : 'left-0'} w-48 h-48 opacity-10`}
              style={{
                background: 'radial-gradient(circle, white 0%, transparent 70%)',
                borderRadius: '50%',
                transform: 'translate(-30%, 30%)',
              }}
            />

            <h2
              className="text-3xl md:text-4xl mb-4 relative z-10"
              style={{ fontFamily: isRTL ? '"Cairo", system-ui, sans-serif' : '"DM Serif Display", Georgia, serif', color: 'white' }}
            >
              {t("cta.title")}
            </h2>
            <p className="mb-8 max-w-xl mx-auto relative z-10" style={{ color: 'rgba(255, 255, 255, 0.9)' }}>
              {t("cta.subtitle")}
            </p>
            <Link
              to="/translate"
              className="inline-flex items-center justify-center px-8 py-4 text-base font-medium rounded-xl transition-all relative z-10"
              style={{ background: 'white', color: 'var(--matcha-700)', boxShadow: '0 4px 14px rgba(0, 0, 0, 0.15)' }}
            >
              {t("cta.button")}
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer
        className="py-12 px-4 border-t relative z-10"
        style={{ background: 'var(--cream-50)', borderColor: 'var(--border-soft)' }}
      >
        <div className="max-w-5xl mx-auto">
          <div className={`flex flex-col md:flex-row justify-between items-center gap-6 ${isRTL ? 'md:flex-row-reverse' : ''}`}>
            <div className={isRTL ? 'text-right' : ''}>
              <p
                className="text-xl font-semibold mb-1"
                style={{ fontFamily: isRTL ? '"Cairo", system-ui, sans-serif' : '"DM Serif Display", Georgia, serif', color: 'var(--matcha-600)' }}
              >
                TRAVoices
              </p>
              <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
                {t("footer.tagline")}
              </p>
            </div>
            <div className={`flex gap-8 ${isRTL ? 'flex-row-reverse' : ''}`}>
              <Link
                to="/"
                className="text-sm hover:opacity-70 transition-opacity"
                style={{ color: 'var(--text-secondary)' }}
              >
                {t("nav.home")}
              </Link>
              <Link
                to="/translate"
                className="text-sm hover:opacity-70 transition-opacity"
                style={{ color: 'var(--text-secondary)' }}
              >
                {t("nav.translate")}
              </Link>
              <a
                href="#how-it-works"
                className="text-sm hover:opacity-70 transition-opacity"
                style={{ color: 'var(--text-secondary)' }}
              >
                {t("howItWorks.title")}
              </a>
            </div>
          </div>

          <div
            className="mt-8 pt-8 border-t text-center text-sm"
            style={{ borderColor: 'var(--border-soft)', color: 'var(--text-muted)' }}
          >
            {t("footer.copyright")}
          </div>
        </div>
      </footer>
    </div>
  );
};

export default HomePage;
