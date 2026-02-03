import React, { useState, useEffect } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../convex/_generated/api";
import { useAuth } from "../providers/AuthContext";
import Header from "../components/Header";
import { SUPPORTED_LANGUAGES } from "../types";

const SettingsPage: React.FC = () => {
  const { user, signOut } = useAuth();
  const settings = useQuery(api.users.queries.getSettings);
  const subscription = useQuery(api.subscriptions.queries.getCurrent);
  const updateProfile = useMutation(api.users.mutations.updateProfile);
  const updateSettings = useMutation(api.users.mutations.updateSettings);
  const downgradeToFree = useMutation(api.subscriptions.mutations.downgradeToFree);

  const [name, setName] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [activeTab, setActiveTab] = useState<"profile" | "preferences" | "subscription">("profile");

  useEffect(() => {
    if (user?.name) {
      setName(user.name);
    }
  }, [user]);

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

  const handleDowngrade = async () => {
    if (confirm("Are you sure you want to downgrade to the Free plan?")) {
      try {
        await downgradeToFree();
      } catch (error) {
        console.error("Failed to downgrade:", error);
      }
    }
  };

  const tabs = [
    { id: "profile", label: "Profile" },
    { id: "preferences", label: "Preferences" },
    { id: "subscription", label: "Subscription" },
  ];

  return (
    <div className="min-h-screen" style={{ background: "var(--bg-page)" }}>
      <Header />

      <main className="relative z-10 px-6 pb-12 pt-8">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-3xl font-serif mb-8" style={{ color: "var(--text-primary)" }}>
            Settings
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
                <label className="matcha-label">Display Name</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="matcha-input max-w-md"
                  placeholder="Your name"
                />
              </div>

              <div>
                <label className="matcha-label">Email</label>
                <input
                  type="email"
                  value={user?.email || ""}
                  disabled
                  className="matcha-input max-w-md opacity-60"
                />
                <p className="text-xs mt-1" style={{ color: "var(--text-muted)" }}>
                  Email cannot be changed
                </p>
              </div>

              <div className="flex items-center gap-4">
                <button
                  onClick={handleSaveProfile}
                  disabled={isSaving}
                  className="matcha-btn matcha-btn-primary py-2 px-6"
                >
                  {isSaving ? "Saving..." : "Save Changes"}
                </button>
                {saveSuccess && (
                  <span className="text-sm" style={{ color: "var(--matcha-600)" }}>
                    Changes saved!
                  </span>
                )}
              </div>

              <div className="pt-6 mt-6" style={{ borderTop: "1px solid var(--border-soft)" }}>
                <h3 className="text-sm font-semibold mb-4" style={{ color: "var(--terra-500)" }}>
                  Danger Zone
                </h3>
                <button
                  onClick={signOut}
                  className="matcha-btn matcha-btn-danger py-2 px-6"
                >
                  Sign Out
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
                  Language Preferences
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="matcha-label">Default Source Language</label>
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
                    <label className="matcha-label">Default Target Language</label>
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
                  Audio Settings
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
                    <span style={{ color: "var(--text-primary)" }}>Auto-play translations</span>
                  </label>

                  <div>
                    <label className="matcha-label">Voice Speed</label>
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
                    <label className="matcha-label">Voice Gender</label>
                    <select
                      value={settings.voiceGender}
                      onChange={(e) => handleUpdateSetting("voiceGender", e.target.value)}
                      className="matcha-select max-w-xs"
                    >
                      <option value="neutral">Neutral</option>
                      <option value="male">Male</option>
                      <option value="female">Female</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* UI Preferences */}
              <div className="matcha-card p-6">
                <h3 className="text-lg font-semibold mb-4" style={{ color: "var(--text-primary)" }}>
                  Display Settings
                </h3>
                <div className="space-y-4">
                  <div>
                    <label className="matcha-label">Theme</label>
                    <select
                      value={settings.theme}
                      onChange={(e) => handleUpdateSetting("theme", e.target.value)}
                      className="matcha-select max-w-xs"
                    >
                      <option value="system">System</option>
                      <option value="light">Light</option>
                      <option value="dark">Dark</option>
                    </select>
                  </div>

                  <div>
                    <label className="matcha-label">Font Size</label>
                    <select
                      value={settings.fontSize}
                      onChange={(e) => handleUpdateSetting("fontSize", e.target.value)}
                      className="matcha-select max-w-xs"
                    >
                      <option value="small">Small</option>
                      <option value="medium">Medium</option>
                      <option value="large">Large</option>
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
                    <span style={{ color: "var(--text-primary)" }}>Show timestamps in transcripts</span>
                  </label>
                </div>
              </div>

              {/* Notifications */}
              <div className="matcha-card p-6">
                <h3 className="text-lg font-semibold mb-4" style={{ color: "var(--text-primary)" }}>
                  Notifications
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
                    <span style={{ color: "var(--text-primary)" }}>Email notifications</span>
                  </label>

                  <label className="flex items-center gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={settings.sessionReminders}
                      onChange={(e) => handleUpdateSetting("sessionReminders", e.target.checked)}
                      className="w-5 h-5 rounded"
                      style={{ accentColor: "var(--matcha-600)" }}
                    />
                    <span style={{ color: "var(--text-primary)" }}>Session reminders</span>
                  </label>
                </div>
              </div>
            </div>
          )}

          {/* Subscription Tab */}
          {activeTab === "subscription" && (
            <div className="space-y-6">
              <div className="matcha-card p-6">
                <h3 className="text-lg font-semibold mb-4" style={{ color: "var(--text-primary)" }}>
                  Current Plan
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
                        {user?.subscriptionTier || "Free"}
                      </h4>
                      <p className="text-sm" style={{ color: "var(--text-secondary)" }}>
                        {subscription?.usage.minutesUsed ?? 0} /{" "}
                        {subscription?.limits.minutesPerMonth === Infinity
                          ? "Unlimited"
                          : subscription?.limits.minutesPerMonth}{" "}
                        minutes used
                      </p>
                    </div>
                    <span
                      className="text-2xl font-bold"
                      style={{ color: "var(--text-primary)" }}
                    >
                      {user?.subscriptionTier === "free"
                        ? "$0"
                        : user?.subscriptionTier === "pro"
                        ? "$19"
                        : "$99"}
                      <span className="text-sm font-normal">/mo</span>
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-4">
                  {user?.subscriptionTier !== "enterprise" && (
                    <a
                      href="/pricing"
                      className="matcha-btn matcha-btn-primary py-2 px-6 inline-block"
                    >
                      Upgrade Plan
                    </a>
                  )}

                  {user?.subscriptionTier !== "free" && (
                    <button
                      onClick={handleDowngrade}
                      className="matcha-btn matcha-btn-secondary py-2 px-6"
                    >
                      Downgrade to Free
                    </button>
                  )}
                </div>
              </div>

              {/* Usage Stats */}
              <div className="matcha-card p-6">
                <h3 className="text-lg font-semibold mb-4" style={{ color: "var(--text-primary)" }}>
                  This Month's Usage
                </h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="p-4 rounded-xl" style={{ background: "var(--bg-elevated)" }}>
                    <p className="text-2xl font-bold" style={{ color: "var(--text-primary)" }}>
                      {subscription?.usage.minutesUsed ?? 0}
                    </p>
                    <p className="text-sm" style={{ color: "var(--text-muted)" }}>
                      Minutes used
                    </p>
                  </div>
                  <div className="p-4 rounded-xl" style={{ background: "var(--bg-elevated)" }}>
                    <p className="text-2xl font-bold" style={{ color: "var(--text-primary)" }}>
                      {subscription?.usage.minutesRemaining ?? 0}
                    </p>
                    <p className="text-sm" style={{ color: "var(--text-muted)" }}>
                      Minutes remaining
                    </p>
                  </div>
                  <div className="p-4 rounded-xl" style={{ background: "var(--bg-elevated)" }}>
                    <p className="text-2xl font-bold" style={{ color: "var(--text-primary)" }}>
                      {subscription?.usage.percentUsed ?? 0}%
                    </p>
                    <p className="text-sm" style={{ color: "var(--text-muted)" }}>
                      Quota used
                    </p>
                  </div>
                  <div className="p-4 rounded-xl" style={{ background: "var(--bg-elevated)" }}>
                    <p className="text-2xl font-bold" style={{ color: "var(--text-primary)" }}>
                      {subscription?.limits.maxParticipants ?? 2}
                    </p>
                    <p className="text-sm" style={{ color: "var(--text-muted)" }}>
                      Max participants
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
