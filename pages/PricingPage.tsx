import React from "react";
import { Link } from "react-router-dom";
import { useMutation, useQuery } from "convex/react";
import { api } from "../convex/_generated/api";
import { useAuth } from "../providers/AuthContext";
import { useLanguage } from "../providers/LanguageContext";
import Header from "../components/Header";
import { TIER_LIMITS } from "../convex/schema";

const PricingPage: React.FC = () => {
  const { user, isAuthenticated } = useAuth();
  const { t } = useLanguage();
  const subscription = useQuery(api.subscriptions.queries.getCurrent);
  const userTier = subscription?.tier || "free";
  const upgradeTier = useMutation(api.subscriptions.mutations.upgradeTier);
  const [isLoading, setIsLoading] = React.useState<string | null>(null);
  const [success, setSuccess] = React.useState<string | null>(null);

  const handleUpgrade = async (tier: "pro" | "enterprise") => {
    if (!isAuthenticated) {
      window.location.href = `/signup?redirect=/pricing`;
      return;
    }

    setIsLoading(tier);
    try {
      await upgradeTier({ tier });
      const tierName = tier === "pro" ? t("pricing.pro") : t("pricing.enterprise");
      setSuccess(`${t("pricing.successUpgrade")} ${tierName}!`);
      setTimeout(() => setSuccess(null), 3000);
    } catch (error) {
      console.error("Failed to upgrade:", error);
    } finally {
      setIsLoading(null);
    }
  };

  const tiers = [
    {
      name: t("pricing.free"),
      price: 0,
      tier: "free" as const,
      description: t("pricing.freeDesc"),
      limits: TIER_LIMITS.free,
      features: [
        `${TIER_LIMITS.free.minutesPerMonth} ${t("pricing.minutesPerMonth")}`,
        t("pricing.upToParticipants").replace("{count}", String(TIER_LIMITS.free.maxParticipants)),
        `${TIER_LIMITS.free.maxRooms} ${t("pricing.activeRooms")}`,
        t("pricing.realtimeVoice"),
        t("pricing.supportedLanguages"),
        t("pricing.basicTranscripts"),
      ],
      cta: userTier === "free" ? t("pricing.currentPlan") : t("pricing.getStarted"),
      popular: false,
    },
    {
      name: t("pricing.pro"),
      price: 19,
      tier: "pro" as const,
      description: t("pricing.proDesc"),
      limits: TIER_LIMITS.pro,
      features: [
        `${TIER_LIMITS.pro.minutesPerMonth} ${t("pricing.minutesPerMonth")}`,
        t("pricing.upToParticipants").replace("{count}", String(TIER_LIMITS.pro.maxParticipants)),
        `${TIER_LIMITS.pro.maxRooms} ${t("pricing.activeRooms")}`,
        t("pricing.everythingInFree"),
        t("pricing.prioritySupport"),
        t("pricing.sessionRecordings"),
        t("pricing.transcriptExports"),
        t("pricing.customVoice"),
      ],
      cta: userTier === "pro" ? t("pricing.currentPlan") : t("pricing.upgradeToPro"),
      popular: true,
    },
    {
      name: t("pricing.enterprise"),
      price: 99,
      tier: "enterprise" as const,
      description: t("pricing.enterpriseDesc"),
      limits: TIER_LIMITS.enterprise,
      features: [
        t("pricing.unlimitedMinutes"),
        t("pricing.upToParticipants").replace("{count}", String(TIER_LIMITS.enterprise.maxParticipants)),
        t("pricing.unlimitedRooms"),
        t("pricing.everythingInPro"),
        t("pricing.apiAccess"),
        t("pricing.customBranding"),
        t("pricing.dedicatedSupport"),
        t("pricing.ssoIntegration"),
        t("pricing.analyticsDashboard"),
      ],
      cta: userTier === "enterprise" ? t("pricing.currentPlan") : t("pricing.goEnterprise"),
      popular: false,
    },
  ];

  const faqs = [
    { q: t("pricing.faq1Q"), a: t("pricing.faq1A") },
    { q: t("pricing.faq2Q"), a: t("pricing.faq2A") },
    { q: t("pricing.faq3Q"), a: t("pricing.faq3A") },
    { q: t("pricing.faq4Q"), a: t("pricing.faq4A") },
  ];

  return (
    <div className="min-h-screen" style={{ background: "var(--bg-page)" }}>
      <Header />

      <main className="relative z-10 px-6 pb-16 pt-12">
        <div className="max-w-6xl mx-auto">
          {/* Success message */}
          {success && (
            <div
              className="max-w-md mx-auto mb-8 p-4 rounded-xl text-center animate-fade-in"
              style={{ background: "var(--matcha-100)", color: "var(--matcha-700)" }}
            >
              {success}
            </div>
          )}

          {/* Beta Banner */}
          <div
            className="max-w-2xl mx-auto mb-8 p-4 rounded-xl text-center"
            style={{
              background: "linear-gradient(135deg, var(--matcha-100), var(--matcha-50))",
              border: "2px solid var(--matcha-400)"
            }}
          >
            <div className="flex items-center justify-center gap-2 mb-2">
              <span
                className="px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider"
                style={{ background: "var(--matcha-500)", color: "var(--text-inverse)" }}
              >
                {t("pricing.betaBadge")}
              </span>
            </div>
            <p className="font-semibold text-lg" style={{ color: "var(--matcha-700)" }}>
              {t("pricing.betaTitle")}
            </p>
            <p className="text-sm mt-1" style={{ color: "var(--matcha-600)" }}>
              {t("pricing.betaSubtitle")}
            </p>
          </div>

          {/* Header */}
          <div className="text-center mb-12">
            <h1 className="text-4xl md:text-5xl font-serif text-gradient mb-4">
              {t("pricing.title")}
            </h1>
            <p className="text-lg max-w-2xl mx-auto" style={{ color: "var(--text-secondary)" }}>
              {t("pricing.subtitle")}
            </p>
          </div>

          {/* Pricing Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-5xl mx-auto">
            {tiers.map((tier) => (
              <div
                key={tier.tier}
                className={`matcha-card p-8 relative ${
                  tier.popular ? "ring-2" : ""
                }`}
                style={{
                  borderColor: tier.popular ? "var(--matcha-500)" : undefined,
                  transform: tier.popular ? "scale(1.02)" : undefined,
                }}
              >
                {tier.popular && (
                  <div
                    className="absolute -top-4 left-1/2 -translate-x-1/2 px-4 py-1 rounded-full text-sm font-semibold"
                    style={{ background: "var(--matcha-500)", color: "var(--text-inverse)" }}
                  >
                    {t("pricing.mostPopular")}
                  </div>
                )}

                <div className="text-center mb-6">
                  <h2 className="text-2xl font-serif mb-2" style={{ color: "var(--text-primary)" }}>
                    {tier.name}
                  </h2>
                  <p className="text-sm mb-4" style={{ color: "var(--text-secondary)" }}>
                    {tier.description}
                  </p>
                  <div className="flex items-baseline justify-center gap-1">
                    <span className="text-4xl font-bold" style={{ color: "var(--text-primary)" }}>
                      ${tier.price}
                    </span>
                    <span style={{ color: "var(--text-muted)" }}>{t("pricing.perMonth")}</span>
                  </div>
                </div>

                <ul className="space-y-3 mb-8">
                  {tier.features.map((feature, i) => (
                    <li key={i} className="flex items-start gap-3">
                      <svg
                        className="w-5 h-5 flex-shrink-0 mt-0.5"
                        style={{ color: "var(--matcha-500)" }}
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M5 13l4 4L19 7"
                        />
                      </svg>
                      <span className="text-sm" style={{ color: "var(--text-secondary)" }}>
                        {feature}
                      </span>
                    </li>
                  ))}
                </ul>

                {tier.tier === "free" ? (
                  userTier === "free" ? (
                    <div
                      className="w-full py-3 rounded-xl text-center font-semibold"
                      style={{ background: "var(--bg-elevated)", color: "var(--text-muted)" }}
                    >
                      {t("pricing.currentPlan")}
                    </div>
                  ) : (
                    <Link
                      to="/signup"
                      className="block w-full matcha-btn matcha-btn-secondary py-3 text-center"
                    >
                      {tier.cta}
                    </Link>
                  )
                ) : userTier === tier.tier ? (
                  <div
                    className="w-full py-3 rounded-xl text-center font-semibold"
                    style={{ background: "var(--matcha-100)", color: "var(--matcha-700)" }}
                  >
                    {t("pricing.currentPlan")}
                  </div>
                ) : (
                  <button
                    onClick={() => handleUpgrade(tier.tier as "pro" | "enterprise")}
                    disabled={isLoading === tier.tier}
                    className={`w-full py-3 font-semibold ${
                      tier.popular ? "matcha-btn matcha-btn-primary" : "matcha-btn matcha-btn-secondary"
                    }`}
                  >
                    {isLoading === tier.tier ? (
                      <span className="flex items-center justify-center gap-2">
                        <span className="w-4 h-4 border-2 border-current/30 border-t-current rounded-full animate-spin" />
                        {t("pricing.upgrading")}
                      </span>
                    ) : (
                      tier.cta
                    )}
                  </button>
                )}
              </div>
            ))}
          </div>

          {/* FAQ Section */}
          <div className="max-w-3xl mx-auto mt-16">
            <h2 className="text-2xl font-serif text-center mb-8" style={{ color: "var(--text-primary)" }}>
              {t("pricing.faqTitle")}
            </h2>

            <div className="space-y-4">
              {faqs.map((faq, i) => (
                <div
                  key={i}
                  className="matcha-card p-6"
                >
                  <h3 className="font-semibold mb-2" style={{ color: "var(--text-primary)" }}>
                    {faq.q}
                  </h3>
                  <p className="text-sm" style={{ color: "var(--text-secondary)" }}>
                    {faq.a}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default PricingPage;
