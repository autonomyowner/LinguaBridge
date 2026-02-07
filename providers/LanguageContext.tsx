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
  // Beta Banner
  "pricing.betaBadge": "Beta",
  "pricing.betaTitle": "We're in Beta - Everything is FREE!",
  "pricing.betaSubtitle": "Enjoy all features at no cost while we perfect the experience. No credit card required.",

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

  // Friends
  "friends.title": "Friends",
  "friends.tabMyFriends": "My Friends",
  "friends.tabRequests": "Requests",
  "friends.tabDiscover": "Discover",
  "friends.noFriends": "No friends yet",
  "friends.discoverPeople": "Discover people who speak your languages",
  "friends.findFriends": "Find Friends",
  "friends.received": "Received",
  "friends.sent": "Sent",
  "friends.noPending": "No pending requests",
  "friends.removeFriendConfirm": "Remove {name} from friends?",

  // Messages
  "messages.title": "Messages",
  "messages.selectConversation": "Select a conversation",
  "messages.chooseToStart": "Choose a friend to start messaging",
  "messages.noConversations": "No conversations yet",
  "messages.messageToStart": "Message a friend to start chatting",
  "messages.you": "You:",
  "messages.noMessages": "No messages yet",

  // Chat Translation
  "chat.translationEnabled": "Translation enabled",
  "chat.translationDisabled": "Translation disabled",
  "chat.enableTranslation": "Enable translation",
  "chat.disableTranslation": "Disable translation",
  "chat.setLanguageFirst": "Set your preferred chat language in Settings first",

  // Notifications
  "notifications.title": "Notifications",
  "notifications.markAllRead": "Mark all read",
  "notifications.empty": "No notifications yet",
  "notifications.viewAll": "View all activity",

  // Time formatting
  "time.now": "Now",
  "time.minutesAgo": "{n}m",
  "time.hoursAgo": "{n}h",
  "time.daysAgo": "{n}d",

  // Actions
  "actions.sendMessage": "Send message",
  "actions.removeFriend": "Remove friend",

  // Navigation (social)
  "nav.friends": "Friends",
  "nav.messages": "Messages",

  // User Menu
  "menu.dashboard": "Dashboard",
  "menu.translationRoom": "Translation Room",
  "menu.settings": "Settings",
  "menu.upgradePlan": "Upgrade Plan",
  "menu.signOut": "Sign Out",
  "menu.plan": "plan",

  // Settings Page
  "settings.displayName": "Display Name",
  "settings.yourName": "Your name",
  "settings.emailLabel": "Email",
  "settings.emailCannotChange": "Email cannot be changed",
  "settings.saveChanges": "Save Changes",
  "settings.saving": "Saving...",
  "settings.changesSaved": "Changes saved!",
  "settings.dangerZone": "Danger Zone",
  "settings.tabProfile": "Profile",
  "settings.tabPreferences": "Preferences",
  "settings.tabSocial": "Social",
  "settings.tabSubscription": "Subscription",
  "settings.languagePreferences": "Language Preferences",
  "settings.defaultSourceLanguage": "Default Source Language",
  "settings.defaultTargetLanguage": "Default Target Language",
  "settings.audioSettings": "Audio Settings",
  "settings.autoPlayTranslations": "Auto-play translations",
  "settings.voiceSpeed": "Voice Speed",
  "settings.voiceGender": "Voice Gender",
  "settings.neutral": "Neutral",
  "settings.male": "Male",
  "settings.female": "Female",
  "settings.displaySettings": "Display Settings",
  "settings.themeLabel": "Theme",
  "settings.system": "System",
  "settings.light": "Light",
  "settings.dark": "Dark",
  "settings.fontSize": "Font Size",
  "settings.small": "Small",
  "settings.medium": "Medium",
  "settings.large": "Large",
  "settings.showTimestamps": "Show timestamps in transcripts",
  "settings.emailNotifications": "Email notifications",
  "settings.sessionReminders": "Session reminders",
  "settings.languagesYouSpeak": "Languages You Speak",
  "settings.languagesDescription": "Select the languages you can speak or understand. This helps others find you.",
  "settings.privacy": "Privacy",
  "settings.showInDirectory": "Show me in user directory",
  "settings.directoryDescription": "When enabled, other users can find you by searching or browsing the directory. Turn this off if you only want to connect with people who know your email.",
  "settings.currentPlan": "Current Plan",
  "settings.minutesUsed": "minutes used",
  "settings.unlimited": "Unlimited",
  "settings.downgradeToFree": "Downgrade to Free",
  "settings.downgradeConfirm": "Are you sure you want to downgrade to the Free plan?",
  "settings.thisMonthUsage": "This Month's Usage",
  "settings.minutesRemaining": "Minutes remaining",
  "settings.quotaUsed": "Quota used",
  "settings.maxParticipants": "Max participants",

  // Chat Translation Settings
  "settings.chatTranslation": "Chat Translation",
  "settings.preferredChatLanguage": "Preferred Chat Language",
  "settings.preferredChatLanguageHelp": "Messages will be automatically translated to this language when translation is enabled",
  "settings.selectLanguage": "Select language",
  "settings.english": "English",
  "settings.arabic": "Arabic",
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
  // Beta Banner
  "pricing.betaBadge": "تجريبي",
  "pricing.betaTitle": "نحن في المرحلة التجريبية - كل شيء مجاني!",
  "pricing.betaSubtitle": "استمتع بجميع الميزات بدون تكلفة بينما نحسن التجربة. لا حاجة لبطاقة ائتمان.",

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

  // Friends
  "friends.title": "الأصدقاء",
  "friends.tabMyFriends": "أصدقائي",
  "friends.tabRequests": "الطلبات",
  "friends.tabDiscover": "اكتشاف",
  "friends.noFriends": "لا يوجد أصدقاء بعد",
  "friends.discoverPeople": "اكتشف أشخاصاً يتحدثون لغتك",
  "friends.findFriends": "ابحث عن أصدقاء",
  "friends.received": "مستلمة",
  "friends.sent": "مرسلة",
  "friends.noPending": "لا توجد طلبات معلقة",
  "friends.removeFriendConfirm": "إزالة {name} من الأصدقاء؟",

  // Messages
  "messages.title": "الرسائل",
  "messages.selectConversation": "اختر محادثة",
  "messages.chooseToStart": "اختر صديقاً لبدء المراسلة",
  "messages.noConversations": "لا توجد محادثات بعد",
  "messages.messageToStart": "راسل صديقاً لبدء الدردشة",
  "messages.you": "أنت:",
  "messages.noMessages": "لا توجد رسائل بعد",

  // Chat Translation
  "chat.translationEnabled": "الترجمة مفعلة",
  "chat.translationDisabled": "الترجمة معطلة",
  "chat.enableTranslation": "تفعيل الترجمة",
  "chat.disableTranslation": "تعطيل الترجمة",
  "chat.setLanguageFirst": "حدد لغة الدردشة المفضلة في الإعدادات أولاً",

  // Notifications
  "notifications.title": "الإشعارات",
  "notifications.markAllRead": "تحديد الكل كمقروء",
  "notifications.empty": "لا توجد إشعارات بعد",
  "notifications.viewAll": "عرض كل النشاط",

  // Time formatting
  "time.now": "الآن",
  "time.minutesAgo": "{n}د",
  "time.hoursAgo": "{n}س",
  "time.daysAgo": "{n}ي",

  // Actions
  "actions.sendMessage": "إرسال رسالة",
  "actions.removeFriend": "إزالة صديق",

  // Navigation (social)
  "nav.friends": "الأصدقاء",
  "nav.messages": "الرسائل",

  // User Menu
  "menu.dashboard": "لوحة التحكم",
  "menu.translationRoom": "غرفة الترجمة",
  "menu.settings": "الإعدادات",
  "menu.upgradePlan": "ترقية الخطة",
  "menu.signOut": "تسجيل الخروج",
  "menu.plan": "خطة",

  // Settings Page
  "settings.displayName": "الاسم المعروض",
  "settings.yourName": "اسمك",
  "settings.emailLabel": "البريد الإلكتروني",
  "settings.emailCannotChange": "لا يمكن تغيير البريد الإلكتروني",
  "settings.saveChanges": "حفظ التغييرات",
  "settings.saving": "جاري الحفظ...",
  "settings.changesSaved": "تم حفظ التغييرات!",
  "settings.dangerZone": "منطقة الخطر",
  "settings.tabProfile": "الملف الشخصي",
  "settings.tabPreferences": "التفضيلات",
  "settings.tabSocial": "اجتماعي",
  "settings.tabSubscription": "الاشتراك",
  "settings.languagePreferences": "تفضيلات اللغة",
  "settings.defaultSourceLanguage": "اللغة المصدر الافتراضية",
  "settings.defaultTargetLanguage": "اللغة الهدف الافتراضية",
  "settings.audioSettings": "إعدادات الصوت",
  "settings.autoPlayTranslations": "تشغيل الترجمات تلقائياً",
  "settings.voiceSpeed": "سرعة الصوت",
  "settings.voiceGender": "جنس الصوت",
  "settings.neutral": "محايد",
  "settings.male": "ذكر",
  "settings.female": "أنثى",
  "settings.displaySettings": "إعدادات العرض",
  "settings.themeLabel": "المظهر",
  "settings.system": "النظام",
  "settings.light": "فاتح",
  "settings.dark": "داكن",
  "settings.fontSize": "حجم الخط",
  "settings.small": "صغير",
  "settings.medium": "متوسط",
  "settings.large": "كبير",
  "settings.showTimestamps": "إظهار الطوابع الزمنية في النصوص",
  "settings.emailNotifications": "إشعارات البريد الإلكتروني",
  "settings.sessionReminders": "تذكيرات الجلسات",
  "settings.languagesYouSpeak": "اللغات التي تتحدثها",
  "settings.languagesDescription": "اختر اللغات التي يمكنك التحدث بها أو فهمها. هذا يساعد الآخرين في العثور عليك.",
  "settings.privacy": "الخصوصية",
  "settings.showInDirectory": "إظهاري في دليل المستخدمين",
  "settings.directoryDescription": "عند التفعيل، يمكن للمستخدمين الآخرين العثور عليك عبر البحث أو تصفح الدليل. أوقف هذا إذا كنت تريد التواصل فقط مع من يعرفون بريدك الإلكتروني.",
  "settings.currentPlan": "الخطة الحالية",
  "settings.minutesUsed": "دقائق مستخدمة",
  "settings.unlimited": "غير محدود",
  "settings.downgradeToFree": "التخفيض إلى المجاني",
  "settings.downgradeConfirm": "هل أنت متأكد من رغبتك في التخفيض إلى الخطة المجانية؟",
  "settings.thisMonthUsage": "استخدام هذا الشهر",
  "settings.minutesRemaining": "الدقائق المتبقية",
  "settings.quotaUsed": "الحصة المستخدمة",
  "settings.maxParticipants": "أقصى عدد مشاركين",

  // Chat Translation Settings
  "settings.chatTranslation": "ترجمة الدردشة",
  "settings.preferredChatLanguage": "لغة الدردشة المفضلة",
  "settings.preferredChatLanguageHelp": "سيتم ترجمة الرسائل تلقائياً إلى هذه اللغة عند تفعيل الترجمة",
  "settings.selectLanguage": "اختر اللغة",
  "settings.english": "الإنجليزية",
  "settings.arabic": "العربية",
};

const translations: Record<Language, Record<string, string>> = { en, ar };

interface LanguageProviderProps {
  children: ReactNode;
}

export function LanguageProvider({ children }: LanguageProviderProps) {
  const [language, setLanguageState] = useState<Language>("en");
  const [isInitialized, setIsInitialized] = useState(false);

  // Detect language on mount (client-side only)
  useEffect(() => {
    if (isInitialized) return;

    let detectedLang: Language = "en";

    try {
      // Check localStorage first
      const saved = localStorage.getItem("travoices-language");
      if (saved === "ar" || saved === "en") {
        detectedLang = saved;
      } else if (navigator.language?.toLowerCase().startsWith("ar")) {
        // Detect browser language
        detectedLang = "ar";
      }
    } catch (e) {
      // Ignore errors
    }

    setLanguageState(detectedLang);
    setIsInitialized(true);
  }, [isInitialized]);

  const isRTL = language === "ar";

  const setLanguage = (lang: Language) => {
    setLanguageState(lang);
    try {
      localStorage.setItem("travoices-language", lang);
    } catch (e) {
      // Ignore errors
    }
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
