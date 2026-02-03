import React, { createContext, useContext, useState, useEffect, ReactNode } from "react";

type Language = "en" | "ar";

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: string) => string;
  isRTL: boolean;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

// English translations
const en: Record<string, string> = {
  // Navigation
  "nav.home": "Home",
  "nav.dashboard": "Dashboard",
  "nav.translate": "Translate",
  "nav.pricing": "Pricing",
  "nav.settings": "Settings",
  "nav.signIn": "Sign In",
  "nav.signUp": "Sign Up",
  "nav.getStarted": "Get Started",
  "nav.signOut": "Sign Out",

  // Hero Section
  "hero.badge": "Real-time AI Voice Translation",
  "hero.title1": "Break Language Barriers",
  "hero.title2": "Speak Freely",
  "hero.subtitle": "Experience seamless real-time voice translation powered by AI. Connect with anyone, anywhere, in any language.",
  "hero.cta.start": "Start Translating",
  "hero.cta.howItWorks": "See How It Works",
  "hero.liveTranslation": "Live Translation",
  "hero.languages": "12+ Languages",
  "hero.realtime": "Real-time",
  "hero.badge20": "20+ Languages",
  "hero.zeroLatency": "Zero Latency",

  // How It Works
  "howItWorks.title": "How It Works",
  "howItWorks.subtitle": "Start translating in seconds with our simple three-step process",
  "howItWorks.step1.title": "Join a Room",
  "howItWorks.step1.desc": "Create or join a translation room. Share the room name with anyone you want to communicate with.",
  "howItWorks.step2.title": "Select Languages",
  "howItWorks.step2.desc": "Choose your native language and the language you want to translate to. We support 12+ languages.",
  "howItWorks.step3.title": "Start Speaking",
  "howItWorks.step3.desc": "Press start and speak naturally. Your voice is translated in real-time and broadcast to the room.",

  // Features
  "features.title": "Why Choose TRAVoices",
  "features.subtitle": "Advanced features for seamless communication across languages",
  "features.realtime.title": "Real-time Translation",
  "features.realtime.desc": "Powered by advanced AI, your speech is translated instantly with minimal latency.",
  "features.multiRoom.title": "Multi-participant Rooms",
  "features.multiRoom.desc": "Connect multiple people in a single room for group conversations across languages.",
  "features.languages.title": "12+ Languages",
  "features.languages.desc": "Support for major world languages including English, Spanish, French, German, Chinese, and more.",
  "features.transcription.title": "Live Transcription",
  "features.transcription.desc": "See what you say and the translations in real-time with our live transcription feature.",

  // CTA Section
  "cta.title": "Ready to Break Language Barriers?",
  "cta.subtitle": "Join thousands of users who are already communicating seamlessly across languages.",
  "cta.button": "Start Translating Now",

  // Footer
  "footer.tagline": "Real-time AI Voice Translation",
  "footer.copyright": "© 2024 TRAVoices. All rights reserved.",

  // Auth
  "auth.welcomeBack": "Welcome Back",
  "auth.signInSubtitle": "Sign in to continue to TRAVoices",
  "auth.email": "Email",
  "auth.password": "Password",
  "auth.signingIn": "Signing in...",
  "auth.noAccount": "Don't have an account?",
  "auth.forgotPassword": "Forgot your password?",
  "auth.createAccount": "Create Account",
  "auth.signUpSubtitle": "Start your journey with TRAVoices",
  "auth.name": "Name",
  "auth.confirmPassword": "Confirm Password",
  "auth.signingUp": "Creating account...",
  "auth.hasAccount": "Already have an account?",
  "auth.termsAgree": "By signing up, you agree to our Terms and Privacy Policy",

  // Dashboard
  "dashboard.title": "Dashboard",
  "dashboard.welcome": "Welcome back",
  "dashboard.minutesUsed": "Minutes Used",
  "dashboard.sessionsThisMonth": "Sessions This Month",
  "dashboard.quickActions": "Quick Actions",
  "dashboard.startSession": "Start New Session",
  "dashboard.viewHistory": "View History",
  "dashboard.recentActivity": "Recent Activity",
  "dashboard.noActivity": "No recent activity",

  // Pricing
  "pricing.title": "Simple, Transparent Pricing",
  "pricing.subtitle": "Choose the plan that's right for you",
  "pricing.free": "Free",
  "pricing.pro": "Pro",
  "pricing.enterprise": "Enterprise",
  "pricing.perMonth": "/month",
  "pricing.currentPlan": "Current Plan",
  "pricing.upgrade": "Upgrade",
  "pricing.contact": "Contact Sales",

  // Settings
  "settings.title": "Settings",
  "settings.profile": "Profile",
  "settings.preferences": "Preferences",
  "settings.language": "Language",
  "settings.theme": "Theme",
  "settings.notifications": "Notifications",
  "settings.save": "Save Changes",
  "settings.saved": "Changes saved!",
};

// Arabic translations
const ar: Record<string, string> = {
  // Navigation
  "nav.home": "الرئيسية",
  "nav.dashboard": "لوحة التحكم",
  "nav.translate": "ترجمة",
  "nav.pricing": "الأسعار",
  "nav.settings": "الإعدادات",
  "nav.signIn": "تسجيل الدخول",
  "nav.signUp": "إنشاء حساب",
  "nav.getStarted": "ابدأ الآن",
  "nav.signOut": "تسجيل الخروج",

  // Hero Section
  "hero.badge": "ترجمة صوتية فورية بالذكاء الاصطناعي",
  "hero.title1": "تخطى حواجز اللغة",
  "hero.title2": "تحدث بحرية",
  "hero.subtitle": "استمتع بترجمة صوتية سلسة في الوقت الفعلي مدعومة بالذكاء الاصطناعي. تواصل مع أي شخص، في أي مكان، بأي لغة.",
  "hero.cta.start": "ابدأ الترجمة",
  "hero.cta.howItWorks": "كيف يعمل",
  "hero.liveTranslation": "ترجمة مباشرة",
  "hero.languages": "+12 لغة",
  "hero.realtime": "فوري",
  "hero.badge20": "+20 لغة",
  "hero.zeroLatency": "بدون تأخير",

  // How It Works
  "howItWorks.title": "كيف يعمل",
  "howItWorks.subtitle": "ابدأ الترجمة في ثوانٍ مع عمليتنا البسيطة المكونة من ثلاث خطوات",
  "howItWorks.step1.title": "انضم إلى غرفة",
  "howItWorks.step1.desc": "أنشئ أو انضم إلى غرفة ترجمة. شارك اسم الغرفة مع أي شخص تريد التواصل معه.",
  "howItWorks.step2.title": "اختر اللغات",
  "howItWorks.step2.desc": "اختر لغتك الأم واللغة التي تريد الترجمة إليها. ندعم أكثر من 12 لغة.",
  "howItWorks.step3.title": "ابدأ التحدث",
  "howItWorks.step3.desc": "اضغط على البدء وتحدث بشكل طبيعي. يتم ترجمة صوتك في الوقت الفعلي وبثه إلى الغرفة.",

  // Features
  "features.title": "لماذا تختار TRAVoices",
  "features.subtitle": "ميزات متقدمة للتواصل السلس عبر اللغات",
  "features.realtime.title": "ترجمة فورية",
  "features.realtime.desc": "مدعومة بالذكاء الاصطناعي المتقدم، يتم ترجمة كلامك فوراً مع الحد الأدنى من التأخير.",
  "features.multiRoom.title": "غرف متعددة المشاركين",
  "features.multiRoom.desc": "اربط عدة أشخاص في غرفة واحدة للمحادثات الجماعية عبر اللغات.",
  "features.languages.title": "+12 لغة",
  "features.languages.desc": "دعم للغات العالمية الرئيسية بما في ذلك الإنجليزية والإسبانية والفرنسية والألمانية والصينية والمزيد.",
  "features.transcription.title": "نسخ مباشر",
  "features.transcription.desc": "شاهد ما تقوله والترجمات في الوقت الفعلي مع ميزة النسخ المباشر.",

  // CTA Section
  "cta.title": "مستعد لتخطي حواجز اللغة؟",
  "cta.subtitle": "انضم إلى الآلاف من المستخدمين الذين يتواصلون بسلاسة عبر اللغات.",
  "cta.button": "ابدأ الترجمة الآن",

  // Footer
  "footer.tagline": "ترجمة صوتية فورية بالذكاء الاصطناعي",
  "footer.copyright": "© 2024 TRAVoices. جميع الحقوق محفوظة.",

  // Auth
  "auth.welcomeBack": "مرحباً بعودتك",
  "auth.signInSubtitle": "سجل الدخول للمتابعة إلى TRAVoices",
  "auth.email": "البريد الإلكتروني",
  "auth.password": "كلمة المرور",
  "auth.signingIn": "جاري تسجيل الدخول...",
  "auth.noAccount": "ليس لديك حساب؟",
  "auth.forgotPassword": "نسيت كلمة المرور؟",
  "auth.createAccount": "إنشاء حساب",
  "auth.signUpSubtitle": "ابدأ رحلتك مع TRAVoices",
  "auth.name": "الاسم",
  "auth.confirmPassword": "تأكيد كلمة المرور",
  "auth.signingUp": "جاري إنشاء الحساب...",
  "auth.hasAccount": "لديك حساب بالفعل؟",
  "auth.termsAgree": "بالتسجيل، أنت توافق على الشروط وسياسة الخصوصية",

  // Dashboard
  "dashboard.title": "لوحة التحكم",
  "dashboard.welcome": "مرحباً بعودتك",
  "dashboard.minutesUsed": "الدقائق المستخدمة",
  "dashboard.sessionsThisMonth": "الجلسات هذا الشهر",
  "dashboard.quickActions": "إجراءات سريعة",
  "dashboard.startSession": "بدء جلسة جديدة",
  "dashboard.viewHistory": "عرض السجل",
  "dashboard.recentActivity": "النشاط الأخير",
  "dashboard.noActivity": "لا يوجد نشاط حديث",

  // Pricing
  "pricing.title": "أسعار بسيطة وشفافة",
  "pricing.subtitle": "اختر الخطة المناسبة لك",
  "pricing.free": "مجاني",
  "pricing.pro": "احترافي",
  "pricing.enterprise": "مؤسسات",
  "pricing.perMonth": "/شهر",
  "pricing.currentPlan": "الخطة الحالية",
  "pricing.upgrade": "ترقية",
  "pricing.contact": "تواصل معنا",

  // Settings
  "settings.title": "الإعدادات",
  "settings.profile": "الملف الشخصي",
  "settings.preferences": "التفضيلات",
  "settings.language": "اللغة",
  "settings.theme": "المظهر",
  "settings.notifications": "الإشعارات",
  "settings.save": "حفظ التغييرات",
  "settings.saved": "تم الحفظ!",
};

const translations: Record<Language, Record<string, string>> = { en, ar };

interface LanguageProviderProps {
  children: ReactNode;
}

export function LanguageProvider({ children }: LanguageProviderProps) {
  const [language, setLanguageState] = useState<Language>(() => {
    // Check localStorage for saved preference
    const saved = localStorage.getItem("travoices-language");
    return (saved === "ar" || saved === "en") ? saved : "en";
  });

  const isRTL = language === "ar";

  const setLanguage = (lang: Language) => {
    setLanguageState(lang);
    localStorage.setItem("travoices-language", lang);
  };

  const t = (key: string): string => {
    return translations[language][key] || key;
  };

  // Apply RTL direction to document
  useEffect(() => {
    document.documentElement.dir = isRTL ? "rtl" : "ltr";
    document.documentElement.lang = language;

    // Add RTL-specific styles
    if (isRTL) {
      document.body.style.fontFamily = '"Cairo", "DM Sans", system-ui, sans-serif';
    } else {
      document.body.style.fontFamily = '"DM Sans", system-ui, sans-serif';
    }
  }, [isRTL, language]);

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t, isRTL }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (context === undefined) {
    throw new Error("useLanguage must be used within a LanguageProvider");
  }
  return context;
}
