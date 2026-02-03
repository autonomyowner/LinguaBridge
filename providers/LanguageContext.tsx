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
  "dashboard.activitySubtitle": "Here's what's happening with your translation activity",
  "dashboard.minutesUsed": "Minutes Used",
  "dashboard.thisMonth": "This Month",
  "dashboard.sessionsThisMonth": "Sessions This Month",
  "dashboard.sessions": "Sessions",
  "dashboard.translations": "Translations",
  "dashboard.messages": "messages",
  "dashboard.languages": "Languages",
  "dashboard.used": "used",
  "dashboard.quickActions": "Quick Actions",
  "dashboard.startTranslating": "Start Translating",
  "dashboard.joinOrCreate": "Join or create a translation room",
  "dashboard.startSession": "Start New Session",
  "dashboard.viewHistory": "View History",
  "dashboard.browseHistory": "Browse past sessions and transcripts",
  "dashboard.settings": "Settings",
  "dashboard.customizePrefs": "Customize your preferences",
  "dashboard.adminMap": "Admin Map",
  "dashboard.viewAnalytics": "View global activity and analytics",
  "dashboard.upgradePlan": "Upgrade Plan",
  "dashboard.getMoreMinutes": "Get more minutes and features",
  "dashboard.myRooms": "My Rooms",
  "dashboard.createRoom": "Create Room",
  "dashboard.participant": "participant",
  "dashboard.participants": "participants",
  "dashboard.join": "Join",
  "dashboard.noRooms": "No rooms yet",
  "dashboard.createFirst": "Create your first room",
  "dashboard.yourPlan": "Your Plan",
  "dashboard.unlimitedMinutes": "Unlimited minutes",
  "dashboard.minPerMonth": "min/month",
  "dashboard.perMo": "/mo",
  "dashboard.upToParticipants": "Up to {count} participants",
  "dashboard.activeRooms": "active rooms",
  "dashboard.unlimited": "Unlimited",
  "dashboard.apiAccess": "API access",
  "dashboard.recentActivity": "Recent Activity",
  "dashboard.noActivity": "No recent activity",

  // Translate Page
  "translate.title": "Voice Translation Room",
  "translate.subtitle": "Real-time multilingual communication powered by AI",
  "translate.status": "Status",
  "translate.live": "Live",
  "translate.offline": "Offline",
  "translate.connecting": "Connecting...",
  "translate.endSession": "End Session",
  "translate.startTranslation": "Start Translation",
  "translate.quickStart": "Quick Start",
  "translate.step1": "Enter a room name to create or join a space",
  "translate.step2": "Select your language and translation target",
  "translate.step3": "Click Start Translation to begin",
  "translate.configuration": "Configuration",
  "translate.roomName": "Room Name",
  "translate.enterRoomName": "Enter room name...",
  "translate.yourName": "Your Name",
  "translate.enterYourName": "Enter your name...",
  "translate.iSpeak": "I Speak",
  "translate.translateTo": "Translate To",
  "translate.participants": "Participants",
  "translate.inRoom": "in room",
  "translate.you": "You",
  "translate.waitingForOthers": "Waiting for others to join...",
  "translate.shareRoom": "Share room:",
  "translate.languageNotSet": "Language not set",
  "translate.conversation": "Conversation",
  "translate.clear": "Clear",
  "translate.othersConnected": "other connected",
  "translate.othersConnectedPlural": "others connected",
  "translate.listeningForSpeech": "Listening for speech...",
  "translate.noConversation": "No conversation yet",
  "translate.speakToBegin": "Speak to begin translation",
  "translate.startToBegin": "Start translation to begin",
  "translate.translation": "Translation",
  "translate.translationActive": "Translation Active",
  "translate.bridgeStandby": "Bridge Standby",
  "translate.streamingTo": "Streaming to",
  "translate.awaitingConnection": "Awaiting connection",
  "translate.session": "Session",
  "translate.signInRequired": "Sign in Required",
  "translate.signInToAccess": "Please sign in to access the translation room",
  "translate.signIn": "Sign In",
  "translate.noAccount": "Don't have an account?",
  "translate.signUpFree": "Sign up free",
  "translate.signInToStart": "Please sign in to start a translation session",

  // Pricing
  "pricing.title": "Simple, Transparent Pricing",
  "pricing.subtitle": "Choose the plan that's right for you. Upgrade or downgrade anytime.",
  "pricing.free": "Free",
  "pricing.pro": "Pro",
  "pricing.enterprise": "Enterprise",
  "pricing.perMonth": "/month",
  "pricing.currentPlan": "Current Plan",
  "pricing.upgrade": "Upgrade",
  "pricing.contact": "Contact Sales",
  "pricing.mostPopular": "Most Popular",
  "pricing.upgrading": "Upgrading...",
  "pricing.getStarted": "Get Started",
  "pricing.upgradeToPro": "Upgrade to Pro",
  "pricing.goEnterprise": "Go Enterprise",
  "pricing.successUpgrade": "Successfully upgraded to",
  // Tier descriptions
  "pricing.freeDesc": "Perfect for trying out TRAVoices",
  "pricing.proDesc": "For professionals who need more",
  "pricing.enterpriseDesc": "For teams and businesses",
  // Features
  "pricing.minutesPerMonth": "minutes per month",
  "pricing.upToParticipants": "Up to {count} participants per room",
  "pricing.activeRooms": "active rooms",
  "pricing.unlimitedRooms": "Unlimited active rooms",
  "pricing.realtimeVoice": "Real-time voice translation",
  "pricing.supportedLanguages": "12 supported languages",
  "pricing.basicTranscripts": "Basic transcripts",
  "pricing.everythingInFree": "Everything in Free",
  "pricing.prioritySupport": "Priority support",
  "pricing.sessionRecordings": "Session recordings",
  "pricing.transcriptExports": "Transcript exports",
  "pricing.customVoice": "Custom voice settings",
  "pricing.unlimitedMinutes": "Unlimited minutes",
  "pricing.everythingInPro": "Everything in Pro",
  "pricing.apiAccess": "API access",
  "pricing.customBranding": "Custom branding",
  "pricing.dedicatedSupport": "Dedicated support",
  "pricing.ssoIntegration": "SSO integration",
  "pricing.analyticsDashboard": "Analytics dashboard",
  // FAQ
  "pricing.faqTitle": "Frequently Asked Questions",
  "pricing.faq1Q": "Can I change my plan anytime?",
  "pricing.faq1A": "Yes, you can upgrade or downgrade your plan at any time from your settings.",
  "pricing.faq2Q": "What happens if I exceed my minutes?",
  "pricing.faq2A": "When you reach your monthly limit, you'll be prompted to upgrade. Your ongoing sessions won't be interrupted.",
  "pricing.faq3Q": "Do unused minutes roll over?",
  "pricing.faq3A": "No, minutes reset at the beginning of each month. We recommend choosing a plan that matches your regular usage.",
  "pricing.faq4Q": "How do I contact support?",
  "pricing.faq4A": "Pro and Enterprise users get priority support via email. Free users can access our community forums.",

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
  "dashboard.activitySubtitle": "إليك ما يحدث مع نشاط الترجمة الخاص بك",
  "dashboard.minutesUsed": "الدقائق المستخدمة",
  "dashboard.thisMonth": "هذا الشهر",
  "dashboard.sessionsThisMonth": "الجلسات هذا الشهر",
  "dashboard.sessions": "الجلسات",
  "dashboard.translations": "الترجمات",
  "dashboard.messages": "رسالة",
  "dashboard.languages": "اللغات",
  "dashboard.used": "مستخدمة",
  "dashboard.quickActions": "إجراءات سريعة",
  "dashboard.startTranslating": "ابدأ الترجمة",
  "dashboard.joinOrCreate": "انضم أو أنشئ غرفة ترجمة",
  "dashboard.startSession": "بدء جلسة جديدة",
  "dashboard.viewHistory": "عرض السجل",
  "dashboard.browseHistory": "تصفح الجلسات والنصوص السابقة",
  "dashboard.settings": "الإعدادات",
  "dashboard.customizePrefs": "تخصيص تفضيلاتك",
  "dashboard.adminMap": "خريطة المدير",
  "dashboard.viewAnalytics": "عرض النشاط والتحليلات العالمية",
  "dashboard.upgradePlan": "ترقية الخطة",
  "dashboard.getMoreMinutes": "احصل على المزيد من الدقائق والميزات",
  "dashboard.myRooms": "غرفي",
  "dashboard.createRoom": "إنشاء غرفة",
  "dashboard.participant": "مشارك",
  "dashboard.participants": "مشاركين",
  "dashboard.join": "انضمام",
  "dashboard.noRooms": "لا توجد غرف بعد",
  "dashboard.createFirst": "أنشئ غرفتك الأولى",
  "dashboard.yourPlan": "خطتك",
  "dashboard.unlimitedMinutes": "دقائق غير محدودة",
  "dashboard.minPerMonth": "دقيقة/شهر",
  "dashboard.perMo": "/شهر",
  "dashboard.upToParticipants": "حتى {count} مشاركين",
  "dashboard.activeRooms": "غرف نشطة",
  "dashboard.unlimited": "غير محدود",
  "dashboard.apiAccess": "وصول API",
  "dashboard.recentActivity": "النشاط الأخير",
  "dashboard.noActivity": "لا يوجد نشاط حديث",

  // Translate Page
  "translate.title": "غرفة الترجمة الصوتية",
  "translate.subtitle": "تواصل متعدد اللغات في الوقت الفعلي مدعوم بالذكاء الاصطناعي",
  "translate.status": "الحالة",
  "translate.live": "مباشر",
  "translate.offline": "غير متصل",
  "translate.connecting": "جاري الاتصال...",
  "translate.endSession": "إنهاء الجلسة",
  "translate.startTranslation": "بدء الترجمة",
  "translate.quickStart": "بدء سريع",
  "translate.step1": "أدخل اسم الغرفة للإنشاء أو الانضمام",
  "translate.step2": "اختر لغتك ولغة الترجمة المستهدفة",
  "translate.step3": "اضغط على بدء الترجمة للبدء",
  "translate.configuration": "الإعدادات",
  "translate.roomName": "اسم الغرفة",
  "translate.enterRoomName": "أدخل اسم الغرفة...",
  "translate.yourName": "اسمك",
  "translate.enterYourName": "أدخل اسمك...",
  "translate.iSpeak": "أتحدث",
  "translate.translateTo": "ترجم إلى",
  "translate.participants": "المشاركون",
  "translate.inRoom": "في الغرفة",
  "translate.you": "أنت",
  "translate.waitingForOthers": "في انتظار انضمام آخرين...",
  "translate.shareRoom": "شارك الغرفة:",
  "translate.languageNotSet": "اللغة غير محددة",
  "translate.conversation": "المحادثة",
  "translate.clear": "مسح",
  "translate.othersConnected": "متصل آخر",
  "translate.othersConnectedPlural": "متصلين آخرين",
  "translate.listeningForSpeech": "في انتظار الكلام...",
  "translate.noConversation": "لا توجد محادثة بعد",
  "translate.speakToBegin": "تحدث لبدء الترجمة",
  "translate.startToBegin": "ابدأ الترجمة للبدء",
  "translate.translation": "الترجمة",
  "translate.translationActive": "الترجمة نشطة",
  "translate.bridgeStandby": "الجسر في وضع الانتظار",
  "translate.streamingTo": "البث إلى",
  "translate.awaitingConnection": "في انتظار الاتصال",
  "translate.session": "الجلسة",
  "translate.signInRequired": "تسجيل الدخول مطلوب",
  "translate.signInToAccess": "يرجى تسجيل الدخول للوصول إلى غرفة الترجمة",
  "translate.signIn": "تسجيل الدخول",
  "translate.noAccount": "ليس لديك حساب؟",
  "translate.signUpFree": "سجل مجاناً",
  "translate.signInToStart": "يرجى تسجيل الدخول لبدء جلسة الترجمة",

  // Pricing
  "pricing.title": "أسعار بسيطة وشفافة",
  "pricing.subtitle": "اختر الخطة المناسبة لك. يمكنك الترقية أو التخفيض في أي وقت.",
  "pricing.free": "مجاني",
  "pricing.pro": "احترافي",
  "pricing.enterprise": "مؤسسات",
  "pricing.perMonth": "/شهر",
  "pricing.currentPlan": "الخطة الحالية",
  "pricing.upgrade": "ترقية",
  "pricing.contact": "تواصل معنا",
  "pricing.mostPopular": "الأكثر شيوعاً",
  "pricing.upgrading": "جاري الترقية...",
  "pricing.getStarted": "ابدأ الآن",
  "pricing.upgradeToPro": "ترقية إلى احترافي",
  "pricing.goEnterprise": "انتقل للمؤسسات",
  "pricing.successUpgrade": "تمت الترقية بنجاح إلى",
  // Tier descriptions
  "pricing.freeDesc": "مثالي لتجربة TRAVoices",
  "pricing.proDesc": "للمحترفين الذين يحتاجون المزيد",
  "pricing.enterpriseDesc": "للفرق والشركات",
  // Features
  "pricing.minutesPerMonth": "دقيقة شهرياً",
  "pricing.upToParticipants": "حتى {count} مشاركين في الغرفة",
  "pricing.activeRooms": "غرف نشطة",
  "pricing.unlimitedRooms": "غرف نشطة غير محدودة",
  "pricing.realtimeVoice": "ترجمة صوتية فورية",
  "pricing.supportedLanguages": "12 لغة مدعومة",
  "pricing.basicTranscripts": "نصوص أساسية",
  "pricing.everythingInFree": "كل ما في المجاني",
  "pricing.prioritySupport": "دعم ذو أولوية",
  "pricing.sessionRecordings": "تسجيلات الجلسات",
  "pricing.transcriptExports": "تصدير النصوص",
  "pricing.customVoice": "إعدادات صوت مخصصة",
  "pricing.unlimitedMinutes": "دقائق غير محدودة",
  "pricing.everythingInPro": "كل ما في الاحترافي",
  "pricing.apiAccess": "وصول API",
  "pricing.customBranding": "علامة تجارية مخصصة",
  "pricing.dedicatedSupport": "دعم مخصص",
  "pricing.ssoIntegration": "تكامل SSO",
  "pricing.analyticsDashboard": "لوحة تحليلات",
  // FAQ
  "pricing.faqTitle": "الأسئلة الشائعة",
  "pricing.faq1Q": "هل يمكنني تغيير خطتي في أي وقت؟",
  "pricing.faq1A": "نعم، يمكنك ترقية أو تخفيض خطتك في أي وقت من الإعدادات.",
  "pricing.faq2Q": "ماذا يحدث إذا تجاوزت دقائقي؟",
  "pricing.faq2A": "عندما تصل إلى حدك الشهري، سيُطلب منك الترقية. لن تتم مقاطعة جلساتك الجارية.",
  "pricing.faq3Q": "هل تُرحل الدقائق غير المستخدمة؟",
  "pricing.faq3A": "لا، يتم إعادة تعيين الدقائق في بداية كل شهر. نوصي باختيار خطة تتناسب مع استخدامك المعتاد.",
  "pricing.faq4Q": "كيف أتواصل مع الدعم؟",
  "pricing.faq4A": "يحصل مستخدمو الاحترافي والمؤسسات على دعم ذو أولوية عبر البريد الإلكتروني. يمكن للمستخدمين المجانيين الوصول إلى منتديات المجتمع.",

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
    // Check localStorage for saved preference first
    const saved = localStorage.getItem("travoices-language");
    if (saved === "ar" || saved === "en") {
      return saved;
    }

    // Detect browser language
    const browserLang = navigator.language || (navigator as any).userLanguage || "en";
    // Check if browser language starts with "ar" (e.g., "ar", "ar-SA", "ar-EG")
    if (browserLang.toLowerCase().startsWith("ar")) {
      return "ar";
    }

    // Default to English for all other languages
    return "en";
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
