import React from "react";
import { Link } from "react-router-dom";
import { useMutation } from "convex/react";
import { api } from "../convex/_generated/api";
import { useAuth } from "../providers/AuthContext";
import Header from "../components/Header";
import { TIER_LIMITS } from "../convex/schema";

const PricingPage: React.FC = () => {
  const { user, isAuthenticated } = useAuth();
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
      setSuccess(`Successfully upgraded to ${tier.charAt(0).toUpperCase() + tier.slice(1)}!`);
      setTimeout(() => setSuccess(null), 3000);
    } catch (error) {
      console.error("Failed to upgrade:", error);
    } finally {
      setIsLoading(null);
    }
  };

  const tiers = [
    {
      name: "Free",
      price: 0,
      tier: "free" as const,
      description: "Perfect for trying out TRAVoices",
      limits: TIER_LIMITS.free,
      features: [
        `${TIER_LIMITS.free.minutesPerMonth} minutes per month`,
        `Up to ${TIER_LIMITS.free.maxParticipants} participants per room`,
        `${TIER_LIMITS.free.maxRooms} active rooms`,
        "Real-time voice translation",
        "12 supported languages",
        "Basic transcripts",
      ],
      cta: user?.subscriptionTier === "free" ? "Current Plan" : "Get Started",
      popular: false,
    },
    {
      name: "Pro",
      price: 19,
      tier: "pro" as const,
      description: "For professionals who need more",
      limits: TIER_LIMITS.pro,
      features: [
        `${TIER_LIMITS.pro.minutesPerMonth} minutes per month`,
        `Up to ${TIER_LIMITS.pro.maxParticipants} participants per room`,
        `${TIER_LIMITS.pro.maxRooms} active rooms`,
        "Everything in Free",
        "Priority support",
        "Session recordings",
        "Transcript exports",
        "Custom voice settings",
      ],
      cta: user?.subscriptionTier === "pro" ? "Current Plan" : "Upgrade to Pro",
      popular: true,
    },
    {
      name: "Enterprise",
      price: 99,
      tier: "enterprise" as const,
      description: "For teams and businesses",
      limits: TIER_LIMITS.enterprise,
      features: [
        "Unlimited minutes",
        `Up to ${TIER_LIMITS.enterprise.maxParticipants} participants per room`,
        "Unlimited active rooms",
        "Everything in Pro",
        "API access",
        "Custom branding",
        "Dedicated support",
        "SSO integration",
        "Analytics dashboard",
      ],
      cta: user?.subscriptionTier === "enterprise" ? "Current Plan" : "Go Enterprise",
      popular: false,
    },
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

          {/* Header */}
          <div className="text-center mb-12">
            <h1 className="text-4xl md:text-5xl font-serif text-gradient mb-4">
              Simple, Transparent Pricing
            </h1>
            <p className="text-lg max-w-2xl mx-auto" style={{ color: "var(--text-secondary)" }}>
              Choose the plan that's right for you. Upgrade or downgrade anytime.
            </p>
          </div>

          {/* Pricing Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-5xl mx-auto">
            {tiers.map((tier) => (
              <div
                key={tier.name}
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
                    Most Popular
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
                    <span style={{ color: "var(--text-muted)" }}>/month</span>
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
                  user?.subscriptionTier === "free" ? (
                    <div
                      className="w-full py-3 rounded-xl text-center font-semibold"
                      style={{ background: "var(--bg-elevated)", color: "var(--text-muted)" }}
                    >
                      Current Plan
                    </div>
                  ) : (
                    <Link
                      to="/signup"
                      className="block w-full matcha-btn matcha-btn-secondary py-3 text-center"
                    >
                      {tier.cta}
                    </Link>
                  )
                ) : user?.subscriptionTier === tier.tier ? (
                  <div
                    className="w-full py-3 rounded-xl text-center font-semibold"
                    style={{ background: "var(--matcha-100)", color: "var(--matcha-700)" }}
                  >
                    Current Plan
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
                        Upgrading...
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
              Frequently Asked Questions
            </h2>

            <div className="space-y-4">
              {[
                {
                  q: "Can I change my plan anytime?",
                  a: "Yes, you can upgrade or downgrade your plan at any time from your settings.",
                },
                {
                  q: "What happens if I exceed my minutes?",
                  a: "When you reach your monthly limit, you'll be prompted to upgrade. Your ongoing sessions won't be interrupted.",
                },
                {
                  q: "Do unused minutes roll over?",
                  a: "No, minutes reset at the beginning of each month. We recommend choosing a plan that matches your regular usage.",
                },
                {
                  q: "How do I contact support?",
                  a: "Pro and Enterprise users get priority support via email. Free users can access our community forums.",
                },
              ].map((faq, i) => (
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
