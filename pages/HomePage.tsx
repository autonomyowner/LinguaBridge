import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useMutation } from 'convex/react';
import { api } from '../convex/_generated/api';
import Header from '../components/Header';
import { useLanguage } from '../providers/LanguageContext';

// Launch countdown component
const LaunchCountdown: React.FC<{ isRTL: boolean }> = ({ isRTL }) => {
  const [timeLeft, setTimeLeft] = useState({ days: 0, hours: 0, minutes: 0, seconds: 0 });
  const [email, setEmail] = useState('');
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const captureLead = useMutation(api.leads.mutations.capture);

  // Calculate 12 days from now
  useEffect(() => {
    const launchDate = new Date();
    launchDate.setDate(launchDate.getDate() + 12);
    launchDate.setHours(0, 0, 0, 0);

    const timer = setInterval(() => {
      const now = new Date().getTime();
      const distance = launchDate.getTime() - now;

      if (distance > 0) {
        setTimeLeft({
          days: Math.floor(distance / (1000 * 60 * 60 * 24)),
          hours: Math.floor((distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)),
          minutes: Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60)),
          seconds: Math.floor((distance % (1000 * 60)) / 1000),
        });
      }
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (email && !isSubmitting) {
      setIsSubmitting(true);
      try {
        await captureLead({ email, source: 'homepage' });
        setIsSubmitted(true);
        setEmail('');
      } catch (error) {
        console.error('Failed to capture lead:', error);
      } finally {
        setIsSubmitting(false);
      }
    }
  };

  const TimeBlock = ({ value, label }: { value: number; label: string }) => (
    <div className="relative group">
      <div
        className="relative overflow-hidden"
        style={{
          background: 'linear-gradient(145deg, rgba(255,255,255,0.95) 0%, rgba(255,255,255,0.85) 100%)',
          borderRadius: '20px',
          padding: '20px 16px',
          minWidth: '85px',
          boxShadow: '0 8px 32px rgba(45, 58, 46, 0.12), inset 0 1px 0 rgba(255,255,255,1)',
          border: '1px solid rgba(104, 166, 125, 0.15)',
          transition: 'transform 0.3s ease, box-shadow 0.3s ease',
        }}
      >
        {/* Animated gradient accent */}
        <div
          className="absolute top-0 left-0 right-0 h-1 rounded-t-xl"
          style={{
            background: 'linear-gradient(90deg, var(--matcha-400), var(--terra-400), var(--matcha-500))',
            backgroundSize: '200% 100%',
            animation: 'gradientShift 3s ease infinite',
          }}
        />
        <span
          className="block text-4xl md:text-5xl font-bold tabular-nums"
          style={{
            fontFamily: '"DM Serif Display", Georgia, serif',
            background: 'linear-gradient(135deg, var(--matcha-600) 0%, var(--matcha-700) 100%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            backgroundClip: 'text',
          }}
        >
          {value.toString().padStart(2, '0')}
        </span>
        <span
          className="block text-xs uppercase tracking-widest mt-2 font-semibold"
          style={{ color: 'var(--text-muted)' }}
        >
          {label}
        </span>
      </div>
    </div>
  );

  return (
    <section
      id="launch"
      className="py-20 md:py-28 px-4 relative overflow-hidden"
      style={{ background: 'linear-gradient(180deg, var(--cream-100) 0%, var(--cream-200) 100%)' }}
    >
      {/* Organic background shapes */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div
          className="absolute -top-20 -right-20 w-96 h-96 opacity-40 blob-float"
          style={{
            background: 'radial-gradient(circle, var(--matcha-200) 0%, transparent 70%)',
            borderRadius: '60% 40% 70% 30% / 40% 60% 30% 70%',
          }}
        />
        <div
          className="absolute bottom-0 -left-20 w-80 h-80 opacity-30 blob-float-reverse"
          style={{
            background: 'radial-gradient(circle, var(--terra-300) 0%, transparent 70%)',
            borderRadius: '40% 60% 30% 70% / 60% 40% 70% 30%',
          }}
        />
        {/* Floating particles */}
        {[...Array(6)].map((_, i) => (
          <div
            key={i}
            className="absolute w-2 h-2 rounded-full"
            style={{
              background: i % 2 === 0 ? 'var(--matcha-300)' : 'var(--terra-300)',
              top: `${20 + i * 12}%`,
              left: `${10 + i * 15}%`,
              opacity: 0.4,
              animation: `float-slow ${6 + i}s ease-in-out infinite`,
              animationDelay: `${i * 0.5}s`,
            }}
          />
        ))}
      </div>

      <div className="max-w-4xl mx-auto relative z-10">
        {/* Section header */}
        <div className="text-center mb-12">
          <div
            className="inline-flex items-center gap-2 px-4 py-2 rounded-full mb-6"
            style={{
              background: 'linear-gradient(135deg, rgba(224, 123, 76, 0.15) 0%, rgba(104, 166, 125, 0.15) 100%)',
              border: '1px solid rgba(224, 123, 76, 0.25)',
            }}
          >
            <span
              className="w-2 h-2 rounded-full pulse-dot"
              style={{ background: 'var(--terra-400)' }}
            />
            <span className="text-sm font-semibold" style={{ color: 'var(--terra-500)' }}>
              {isRTL ? 'قريباً' : 'Coming Soon'}
            </span>
          </div>

          <h2
            className="text-3xl md:text-5xl mb-4"
            style={{
              fontFamily: isRTL ? '"Cairo", system-ui, sans-serif' : '"DM Serif Display", Georgia, serif',
              color: 'var(--text-primary)',
              lineHeight: 1.2,
            }}
          >
            {isRTL ? 'الإطلاق الرسمي' : 'Official Launch'}
            <br />
            <span className="text-gradient">{isRTL ? 'قريباً جداً' : 'Is Almost Here'}</span>
          </h2>

          <p
            className="max-w-lg mx-auto text-lg"
            style={{ color: 'var(--text-secondary)', lineHeight: 1.7 }}
          >
            {isRTL
              ? 'كن أول من يجرب الترجمة الصوتية بالذكاء الاصطناعي. احجز مكانك الآن.'
              : 'Be the first to experience AI-powered voice translation. Reserve your spot today.'}
          </p>
        </div>

        {/* Countdown timer */}
        <div
          className={`flex justify-center gap-3 md:gap-5 mb-14 ${isRTL ? 'flex-row-reverse' : ''}`}
        >
          <TimeBlock value={timeLeft.days} label={isRTL ? 'يوم' : 'Days'} />
          <div className="flex items-center text-3xl font-bold" style={{ color: 'var(--matcha-400)' }}>:</div>
          <TimeBlock value={timeLeft.hours} label={isRTL ? 'ساعة' : 'Hours'} />
          <div className="flex items-center text-3xl font-bold" style={{ color: 'var(--matcha-400)' }}>:</div>
          <TimeBlock value={timeLeft.minutes} label={isRTL ? 'دقيقة' : 'Mins'} />
          <div className="hidden sm:flex items-center text-3xl font-bold" style={{ color: 'var(--matcha-400)' }}>:</div>
          <div className="hidden sm:block">
            <TimeBlock value={timeLeft.seconds} label={isRTL ? 'ثانية' : 'Secs'} />
          </div>
        </div>

        {/* Email capture form */}
        <div className="max-w-xl mx-auto">
          {isSubmitted ? (
            <div
              className="text-center p-8 rounded-2xl animate-fade-in"
              style={{
                background: 'linear-gradient(135deg, rgba(104, 166, 125, 0.1) 0%, rgba(104, 166, 125, 0.05) 100%)',
                border: '1px solid rgba(104, 166, 125, 0.3)',
              }}
            >
              <div
                className="w-16 h-16 mx-auto mb-4 rounded-full flex items-center justify-center"
                style={{ background: 'var(--matcha-100)' }}
              >
                <svg
                  className="w-8 h-8"
                  fill="none"
                  stroke="var(--matcha-600)"
                  viewBox="0 0 24 24"
                  strokeWidth={2.5}
                >
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <h3
                className="text-xl mb-2"
                style={{
                  fontFamily: isRTL ? '"Cairo", system-ui, sans-serif' : '"DM Serif Display", Georgia, serif',
                  color: 'var(--matcha-700)',
                }}
              >
                {isRTL ? 'أنت في القائمة!' : "You're on the list!"}
              </h3>
              <p style={{ color: 'var(--text-secondary)' }}>
                {isRTL
                  ? 'سنرسل لك إشعاراً فور الإطلاق.'
                  : "We'll notify you the moment we launch."}
              </p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="relative">
              <div
                className="relative flex flex-col sm:flex-row gap-3 p-3 rounded-2xl"
                onMouseEnter={() => setIsHovered(true)}
                onMouseLeave={() => setIsHovered(false)}
                style={{
                  background: 'rgba(255, 255, 255, 0.9)',
                  backdropFilter: 'blur(20px)',
                  boxShadow: isHovered
                    ? '0 20px 60px rgba(104, 166, 125, 0.2), 0 0 0 1px rgba(104, 166, 125, 0.3)'
                    : '0 10px 40px rgba(45, 58, 46, 0.1), 0 0 0 1px rgba(104, 166, 125, 0.15)',
                  transition: 'box-shadow 0.4s ease',
                }}
              >
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder={isRTL ? 'أدخل بريدك الإلكتروني' : 'Enter your email address'}
                  required
                  className="flex-1 px-5 py-4 text-base rounded-xl border-0 outline-none"
                  style={{
                    background: 'var(--cream-50)',
                    color: 'var(--text-primary)',
                    direction: isRTL ? 'rtl' : 'ltr',
                  }}
                />
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-8 py-4 font-semibold rounded-xl transition-all duration-300 hover:scale-[1.02] active:scale-[0.98] disabled:opacity-70 disabled:cursor-not-allowed"
                  style={{
                    background: 'linear-gradient(135deg, var(--matcha-500) 0%, var(--matcha-600) 100%)',
                    color: 'white',
                    boxShadow: '0 4px 20px rgba(104, 166, 125, 0.4)',
                  }}
                >
                  {isSubmitting ? (isRTL ? 'جاري الإرسال...' : 'Sending...') : (isRTL ? 'أعلمني' : 'Notify Me')}
                </button>
              </div>

              {/* Trust indicators */}
              <div className={`flex items-center justify-center gap-6 mt-6 ${isRTL ? 'flex-row-reverse' : ''}`}>
                <div className={`flex items-center gap-2 ${isRTL ? 'flex-row-reverse' : ''}`}>
                  <svg className="w-4 h-4" fill="var(--matcha-500)" viewBox="0 0 20 20">
                    <path
                      fillRule="evenodd"
                      d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                      clipRule="evenodd"
                    />
                  </svg>
                  <span className="text-sm" style={{ color: 'var(--text-muted)' }}>
                    {isRTL ? 'مجاني للمبكرين' : 'Free for early birds'}
                  </span>
                </div>
                <div className={`flex items-center gap-2 ${isRTL ? 'flex-row-reverse' : ''}`}>
                  <svg className="w-4 h-4" fill="var(--matcha-500)" viewBox="0 0 20 20">
                    <path
                      fillRule="evenodd"
                      d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z"
                      clipRule="evenodd"
                    />
                  </svg>
                  <span className="text-sm" style={{ color: 'var(--text-muted)' }}>
                    {isRTL ? 'لا رسائل مزعجة' : 'No spam, ever'}
                  </span>
                </div>
              </div>
            </form>
          )}
        </div>
      </div>

      {/* CSS for gradient animation */}
      <style>{`
        @keyframes gradientShift {
          0%, 100% { background-position: 0% 50%; }
          50% { background-position: 100% 50%; }
        }
      `}</style>
    </section>
  );
};

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

      {/* Launch Countdown Section */}
      <LaunchCountdown isRTL={isRTL} />

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
