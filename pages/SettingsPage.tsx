import React, { useState, useEffect } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../convex/_generated/api";
import { useAuth } from "../providers/AuthContext";
import { useLanguage } from "../providers/LanguageContext";
import Header from "../components/Header";
import { SUPPORTED_LANGUAGES } from "../types";

const SettingsPage: React.FC = () => {
  const { user, signOut } = useAuth();
  const { t } = useLanguage();
  const settings = useQuery(api.users.queries.getSettings);
  const subscription = useQuery(api.subscriptions.queries.getCurrent);
  const currentUser = useQuery(api.users.queries.getCurrent);
  const userTier = subscription?.tier || "free";
  const updateProfile = useMutation(api.users.mutations.updateProfile);
  const updateSettings = useMutation(api.users.mutations.updateSettings);
  const updateSocialSettings = useMutation(api.users.mutations.updateSocialSettings);
  const setPreferredChatLanguage = useMutation(api.users.mutations.setPreferredChatLanguage);
  const downgradeToFree = useMutation(api.subscriptions.mutations.downgradeToFree);

  const [name, setName] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [activeTab, setActiveTab] = useState<"profile" | "preferences" | "social" | "subscription">("profile");
  const [spokenLanguages, setSpokenLanguages] = useState<string[]>([]);
  const [isDiscoverable, setIsDiscoverable] = useState(true);

  useEffect(() => {
    if (user?.name) {
      setName(user.name);
    }
  }, [user]);

  useEffect(() => {
    if (currentUser) {
      setSpokenLanguages(currentUser.spokenLanguages || []);
      setIsDiscoverable(currentUser.isDiscoverable !== false); // Default to true
    }
  }, [currentUser]);

  const handleSaveProfile = async () => {
    setIsSaving(true);
    try {
      await updateProfile({ name });
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (error) {
      console.error("Failed to save profile:", error);
    } finally {
      setIsSaving(false);
    }
  };

  const handleUpdateSetting = async (key: string, value: any) => {
    try {
      await updateSettings({ [key]: value });
    } catch (error) {
      console.error("Failed to update setting:", error);
    }
  };

  const handleSetChatLanguage = async (language: string) => {
    try {
      await setPreferredChatLanguage({ language });
    } catch (error) {
      console.error("Failed to set chat language:", error);
    }
  };

  const handleDowngrade = async () => {
    if (confirm(t("settings.downgradeConfirm"))) {
      try {
        await downgradeToFree();
      } catch (error) {
        console.error("Failed to downgrade:", error);
      }
    }
  };

  const handleToggleLanguage = (langCode: string) => {
    setSpokenLanguages((prev) =>
      prev.includes(langCode)
        ? prev.filter((l) => l !== langCode)
        : [...prev, langCode]
    );
  };

  const handleSaveSocialSettings = async () => {
    setIsSaving(true);
    try {
      await updateSocialSettings({ spokenLanguages, isDiscoverable });
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (error) {
      console.error("Failed to save social settings:", error);
    } finally {
      setIsSaving(false);
    }
  };

  const tabs = [
    { id: "profile", label: t("settings.tabProfile") },
    { id: "preferences", label: t("settings.tabPreferences") },
    { id: "social", label: t("settings.tabSocial") },
    { id: "subscription", label: t("settings.tabSubscription") },
  ];

  return (
    <div className="min-h-screen" style={{ background: "var(--bg-page)" }}>
      <Header />

      <main className="relative z-10 px-6 pb-12 pt-8">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-3xl font-serif mb-8" style={{ color: "var(--text-primary)" }}>
            {t("settings.title")}
          </h1>

          {/* Tabs */}
          <div className="flex gap-2 mb-8 border-b" style={{ borderColor: "var(--border-soft)" }}>
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className="px-4 py-3 text-sm font-medium transition-colors relative"
                style={{
                  color: activeTab === tab.id ? "var(--matcha-600)" : "var(--text-secondary)",
                }}
              >
                {tab.label}
                {activeTab === tab.id && (
                  <div
                    className="absolute bottom-0 left-0 right-0 h-0.5"
                    style={{ background: "var(--matcha-600)" }}
                  />
                )}
              </button>
            ))}
          </div>

          {/* Profile Tab */}
          {activeTab === "profile" && (
            <div className="matcha-card p-6 space-y-6">
              <div>
                <label className="matcha-label">{t("settings.displayName")}</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="matcha-input max-w-md"
                  placeholder={t("settings.yourName")}
                />
              </div>

              <div>
                <label className="matcha-label">{t("settings.emailLabel")}</label>
                <input
                  type="email"
                  value={user?.email || ""}
                  disabled
                  className="matcha-input max-w-md opacity-60"
                />
                <p className="text-xs mt-1" style={{ color: "var(--text-muted)" }}>
                  {t("settings.emailCannotChange")}
                </p>
              </div>

              <div className="flex items-center gap-4">
                <button
                  onClick={handleSaveProfile}
                  disabled={isSaving}
                  className="matcha-btn matcha-btn-primary py-2 px-6"
                >
                  {isSaving ? t("settings.saving") : t("settings.saveChanges")}
                </button>
                {saveSuccess && (
                  <span className="text-sm" style={{ color: "var(--matcha-600)" }}>
                    {t("settings.changesSaved")}
                  </span>
                )}
              </div>

              <div className="pt-6 mt-6" style={{ borderTop: "1px solid var(--border-soft)" }}>
                <h3 className="text-sm font-semibold mb-4" style={{ color: "var(--terra-500)" }}>
                  {t("settings.dangerZone")}
                </h3>
                <button
                  onClick={signOut}
                  className="matcha-btn matcha-btn-danger py-2 px-6"
                >
                  {t("menu.signOut")}
                </button>
              </div>
            </div>
          )}

          {/* Preferences Tab */}
          {activeTab === "preferences" && settings && (
            <div className="space-y-6">
              {/* Language Preferences */}
              <div className="matcha-card p-6">
                <h3 className="text-lg font-semibold mb-4" style={{ color: "var(--text-primary)" }}>
                  {t("settings.languagePreferences")}
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="matcha-label">{t("settings.defaultSourceLanguage")}</label>
                    <select
                      value={settings.preferredSourceLanguage}
                      onChange={(e) => handleUpdateSetting("preferredSourceLanguage", e.target.value)}
                      className="matcha-select"
                    >
                      {SUPPORTED_LANGUAGES.map((lang) => (
                        <option key={lang.code} value={lang.code}>
                          {lang.flag} {lang.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="matcha-label">{t("settings.defaultTargetLanguage")}</label>
                    <select
                      value={settings.preferredTargetLanguage}
                      onChange={(e) => handleUpdateSetting("preferredTargetLanguage", e.target.value)}
                      className="matcha-select"
                    >
                      {SUPPORTED_LANGUAGES.map((lang) => (
                        <option key={lang.code} value={lang.code}>
                          {lang.flag} {lang.name}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              {/* Audio Settings */}
              <div className="matcha-card p-6">
                <h3 className="text-lg font-semibold mb-4" style={{ color: "var(--text-primary)" }}>
                  {t("settings.audioSettings")}
                </h3>
                <div className="space-y-4">
                  <label className="flex items-center gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={settings.autoPlayTranslations}
                      onChange={(e) => handleUpdateSetting("autoPlayTranslations", e.target.checked)}
                      className="w-5 h-5 rounded"
                      style={{ accentColor: "var(--matcha-600)" }}
                    />
                    <span style={{ color: "var(--text-primary)" }}>{t("settings.autoPlayTranslations")}</span>
                  </label>

                  <div>
                    <label className="matcha-label">{t("settings.voiceSpeed")}</label>
                    <input
                      type="range"
                      min="0.5"
                      max="2"
                      step="0.1"
                      value={settings.voiceSpeed}
                      onChange={(e) => handleUpdateSetting("voiceSpeed", parseFloat(e.target.value))}
                      className="w-full max-w-xs"
                    />
                    <span className="text-sm ml-2" style={{ color: "var(--text-muted)" }}>
                      {settings.voiceSpeed}x
                    </span>
                  </div>

                  <div>
                    <label className="matcha-label">{t("settings.voiceGender")}</label>
                    <select
                      value={settings.voiceGender}
                      onChange={(e) => handleUpdateSetting("voiceGender", e.target.value)}
                      className="matcha-select max-w-xs"
                    >
                      <option value="neutral">{t("settings.neutral")}</option>
                      <option value="male">{t("settings.male")}</option>
                      <option value="female">{t("settings.female")}</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* UI Preferences */}
              <div className="matcha-card p-6">
                <h3 className="text-lg font-semibold mb-4" style={{ color: "var(--text-primary)" }}>
                  {t("settings.displaySettings")}
                </h3>
                <div className="space-y-4">
                  <div>
                    <label className="matcha-label">{t("settings.themeLabel")}</label>
                    <select
                      value={settings.theme}
                      onChange={(e) => handleUpdateSetting("theme", e.target.value)}
                      className="matcha-select max-w-xs"
                    >
                      <option value="system">{t("settings.system")}</option>
                      <option value="light">{t("settings.light")}</option>
                      <option value="dark">{t("settings.dark")}</option>
                    </select>
                  </div>

                  <div>
                    <label className="matcha-label">{t("settings.fontSize")}</label>
                    <select
                      value={settings.fontSize}
                      onChange={(e) => handleUpdateSetting("fontSize", e.target.value)}
                      className="matcha-select max-w-xs"
                    >
                      <option value="small">{t("settings.small")}</option>
                      <option value="medium">{t("settings.medium")}</option>
                      <option value="large">{t("settings.large")}</option>
                    </select>
                  </div>

                  <label className="flex items-center gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={settings.showTimestamps}
                      onChange={(e) => handleUpdateSetting("showTimestamps", e.target.checked)}
                      className="w-5 h-5 rounded"
                      style={{ accentColor: "var(--matcha-600)" }}
                    />
                    <span style={{ color: "var(--text-primary)" }}>{t("settings.showTimestamps")}</span>
                  </label>
                </div>
              </div>

              {/* Notifications */}
              <div className="matcha-card p-6">
                <h3 className="text-lg font-semibold mb-4" style={{ color: "var(--text-primary)" }}>
                  {t("notifications.title")}
                </h3>
                <div className="space-y-4">
                  <label className="flex items-center gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={settings.emailNotifications}
                      onChange={(e) => handleUpdateSetting("emailNotifications", e.target.checked)}
                      className="w-5 h-5 rounded"
                      style={{ accentColor: "var(--matcha-600)" }}
                    />
                    <span style={{ color: "var(--text-primary)" }}>{t("settings.emailNotifications")}</span>
                  </label>

                  <label className="flex items-center gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={settings.sessionReminders}
                      onChange={(e) => handleUpdateSetting("sessionReminders", e.target.checked)}
                      className="w-5 h-5 rounded"
                      style={{ accentColor: "var(--matcha-600)" }}
                    />
                    <span style={{ color: "var(--text-primary)" }}>{t("settings.sessionReminders")}</span>
                  </label>
                </div>
              </div>

              {/* Chat Translation */}
              <div className="matcha-card p-6">
                <h3 className="text-lg font-semibold mb-2" style={{ color: "var(--text-primary)" }}>
                  {t("settings.chatTranslation")}
                </h3>
                <p className="text-sm mb-4" style={{ color: "var(--text-muted)" }}>
                  {t("settings.preferredChatLanguageHelp")}
                </p>
                <div>
                  <label className="matcha-label">{t("settings.preferredChatLanguage")}</label>
                  <select
                    value={settings.preferredChatLanguage || ""}
                    onChange={(e) => handleSetChatLanguage(e.target.value)}
                    className="matcha-select max-w-xs"
                  >
                    <option value="">{t("settings.selectLanguage")}</option>
                    <option value="en">{t("settings.english")}</option>
                    <option value="ar">{t("settings.arabic")}</option>
                  </select>
                </div>
              </div>
            </div>
          )}

          {/* Social Tab */}
          {activeTab === "social" && (
            <div className="space-y-6">
              {/* Spoken Languages */}
              <div className="matcha-card p-6">
                <h3 className="text-lg font-semibold mb-2" style={{ color: "var(--text-primary)" }}>
                  {t("settings.languagesYouSpeak")}
                </h3>
                <p className="text-sm mb-4" style={{ color: "var(--text-muted)" }}>
                  {t("settings.languagesDescription")}
                </p>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                  {SUPPORTED_LANGUAGES.map((lang) => {
                    const isSelected = spokenLanguages.includes(lang.code);
                    return (
                      <button
                        key={lang.code}
                        onClick={() => handleToggleLanguage(lang.code)}
                        className="flex items-center gap-2 px-4 py-3 rounded-xl text-left transition-colors"
                        style={{
                          background: isSelected ? "var(--matcha-100)" : "var(--bg-elevated)",
                          border: isSelected ? "2px solid var(--matcha-500)" : "2px solid transparent",
                          color: isSelected ? "var(--matcha-700)" : "var(--text-secondary)",
                        }}
                      >
                        <span className="text-xl">{lang.flag}</span>
                        <span className="font-medium">{lang.name}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Discoverability */}
              <div className="matcha-card p-6">
                <h3 className="text-lg font-semibold mb-4" style={{ color: "var(--text-primary)" }}>
                  {t("settings.privacy")}
                </h3>
                <label className="flex items-start gap-4 cursor-pointer">
                  <div className="pt-0.5">
                    <input
                      type="checkbox"
                      checked={isDiscoverable}
                      onChange={(e) => setIsDiscoverable(e.target.checked)}
                      className="w-5 h-5 rounded"
                      style={{ accentColor: "var(--matcha-600)" }}
                    />
                  </div>
                  <div>
                    <span className="font-medium block" style={{ color: "var(--text-primary)" }}>
                      {t("settings.showInDirectory")}
                    </span>
                    <span className="text-sm" style={{ color: "var(--text-muted)" }}>
                      {t("settings.directoryDescription")}
                    </span>
                  </div>
                </label>
              </div>

              {/* Save Button */}
              <div className="flex items-center gap-4">
                <button
                  onClick={handleSaveSocialSettings}
                  disabled={isSaving}
                  className="matcha-btn matcha-btn-primary py-2 px-6"
                >
                  {isSaving ? t("settings.saving") : t("settings.saveChanges")}
                </button>
                {saveSuccess && (
                  <span className="text-sm" style={{ color: "var(--matcha-600)" }}>
                    {t("settings.changesSaved")}
                  </span>
                )}
              </div>
            </div>
          )}

          {/* Subscription Tab */}
          {activeTab === "subscription" && (
            <div className="space-y-6">
              <div className="matcha-card p-6">
                <h3 className="text-lg font-semibold mb-4" style={{ color: "var(--text-primary)" }}>
                  {t("settings.currentPlan")}
                </h3>
                <div
                  className="p-4 rounded-xl mb-6"
                  style={{ background: "var(--bg-elevated)" }}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <h4
                        className="text-xl font-bold capitalize"
                        style={{ color: "var(--text-primary)" }}
                      >
                        {userTier || t("pricing.free")}
                      </h4>
                      <p className="text-sm" style={{ color: "var(--text-secondary)" }}>
                        {subscription?.usage.minutesUsed ?? 0} /{" "}
                        {subscription?.limits.minutesPerMonth === Infinity
                          ? t("settings.unlimited")
                          : subscription?.limits.minutesPerMonth}{" "}
                        {t("settings.minutesUsed")}
                      </p>
                    </div>
                    <span
                      className="text-2xl font-bold"
                      style={{ color: "var(--text-primary)" }}
                    >
                      {userTier === "free"
                        ? "$0"
                        : userTier === "pro"
                        ? "$19"
                        : "$99"}
                      <span className="text-sm font-normal">{t("pricing.perMonth")}</span>
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-4">
                  {userTier !== "enterprise" && (
                    <a
                      href="/pricing"
                      className="matcha-btn matcha-btn-primary py-2 px-6 inline-block"
                    >
                      {t("menu.upgradePlan")}
                    </a>
                  )}

                  {userTier !== "free" && (
                    <button
                      onClick={handleDowngrade}
                      className="matcha-btn matcha-btn-secondary py-2 px-6"
                    >
                      {t("settings.downgradeToFree")}
                    </button>
                  )}
                </div>
              </div>

              {/* Usage Stats */}
              <div className="matcha-card p-6">
                <h3 className="text-lg font-semibold mb-4" style={{ color: "var(--text-primary)" }}>
                  {t("settings.thisMonthUsage")}
                </h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="p-4 rounded-xl" style={{ background: "var(--bg-elevated)" }}>
                    <p className="text-2xl font-bold" style={{ color: "var(--text-primary)" }}>
                      {subscription?.usage.minutesUsed ?? 0}
                    </p>
                    <p className="text-sm" style={{ color: "var(--text-muted)" }}>
                      {t("settings.minutesUsed")}
                    </p>
                  </div>
                  <div className="p-4 rounded-xl" style={{ background: "var(--bg-elevated)" }}>
                    <p className="text-2xl font-bold" style={{ color: "var(--text-primary)" }}>
                      {subscription?.usage.minutesRemaining ?? 0}
                    </p>
                    <p className="text-sm" style={{ color: "var(--text-muted)" }}>
                      {t("settings.minutesRemaining")}
                    </p>
                  </div>
                  <div className="p-4 rounded-xl" style={{ background: "var(--bg-elevated)" }}>
                    <p className="text-2xl font-bold" style={{ color: "var(--text-primary)" }}>
                      {subscription?.usage.percentUsed ?? 0}%
                    </p>
                    <p className="text-sm" style={{ color: "var(--text-muted)" }}>
                      {t("settings.quotaUsed")}
                    </p>
                  </div>
                  <div className="p-4 rounded-xl" style={{ background: "var(--bg-elevated)" }}>
                    <p className="text-2xl font-bold" style={{ color: "var(--text-primary)" }}>
                      {subscription?.limits.maxParticipants ?? 2}
                    </p>
                    <p className="text-sm" style={{ color: "var(--text-muted)" }}>
                      {t("settings.maxParticipants")}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
};

export default SettingsPage;
