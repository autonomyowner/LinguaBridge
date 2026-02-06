import React, { useState, useEffect } from "react";
import { useQuery, useMutation } from "convex/react";
import { useSearchParams } from "react-router-dom";
import { api } from "../convex/_generated/api";
import Header from "../components/Header";
import { FriendCard, FriendRequestCard, UserSearchBar, UserDirectory } from "../components/social";
import { useAuth } from "../providers/AuthContext";
import { useLanguage } from "../providers/LanguageContext";

type TabType = "friends" | "requests" | "discover";

const FriendsPage: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const initialTab = (searchParams.get("tab") as TabType) || "friends";
  const [activeTab, setActiveTab] = useState<TabType>(initialTab);
  const [searchQuery, setSearchQuery] = useState("");
  const [languageFilter, setLanguageFilter] = useState<string | undefined>();
  const { user } = useAuth();
  const { t } = useLanguage();

  // Ensure user exists in app database
  const ensureUser = useMutation(api.debug.ensureUserByEmail);
  const [userEnsured, setUserEnsured] = useState(false);

  useEffect(() => {
    if (user?.email && !userEnsured) {
      ensureUser({ email: user.email, name: user.name })
        .then(() => setUserEnsured(true))
        .catch(console.error);
    }
  }, [user?.email, userEnsured, ensureUser]);

  // Friends data
  const friends = useQuery(api.friends.queries.list);
  const pendingRequests = useQuery(api.friends.queries.listPending);
  const sentRequests = useQuery(api.friends.queries.listSent);

  // Search/browse data - use authenticated queries
  const searchResults = useQuery(
    api.friends.queries.searchUsers,
    searchQuery.length >= 2
      ? { query: searchQuery, languageFilter }
      : "skip"
  );
  const browseResults = useQuery(
    api.friends.queries.browseUsers,
    !searchQuery ? { languageFilter } : "skip"
  );

  // Fallback: use debug query that doesn't require Convex auth
  // This works when Better-Auth cookies aren't syncing properly
  const fallbackBrowse = useQuery(
    api.debug.browseAllUsers,
    !searchQuery ? { excludeEmail: user?.email } : "skip"
  );

  // Debug query (uncomment to troubleshoot auth issues)
  // const debugData = useQuery(api.debug.debugBrowse);
  // console.log("Debug browse data:", debugData);

  // Update URL when tab changes
  useEffect(() => {
    if (activeTab !== "friends") {
      setSearchParams({ tab: activeTab });
    } else {
      setSearchParams({});
    }
  }, [activeTab, setSearchParams]);

  const handleSearch = (query: string, langFilter?: string) => {
    setSearchQuery(query);
    setLanguageFilter(langFilter);
  };

  const tabs = [
    { id: "friends" as TabType, label: t("friends.tabMyFriends"), count: friends?.length },
    {
      id: "requests" as TabType,
      label: t("friends.tabRequests"),
      count: (pendingRequests?.length ?? 0) + (sentRequests?.length ?? 0),
    },
    { id: "discover" as TabType, label: t("friends.tabDiscover") },
  ];

  return (
    <div className="min-h-screen" style={{ background: "var(--bg-page)" }}>
      <Header />

      <main className="relative z-10 px-6 pb-12 pt-8">
        <div className="max-w-5xl mx-auto">
          <h1
            className="text-3xl font-serif mb-8"
            style={{ color: "var(--text-primary)" }}
          >
            {t("friends.title")}
          </h1>

          {/* Tabs */}
          <div
            className="flex gap-2 mb-8 border-b"
            style={{ borderColor: "var(--border-soft)" }}
          >
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className="px-4 py-3 text-sm font-medium transition-colors relative flex items-center gap-2"
                style={{
                  color:
                    activeTab === tab.id
                      ? "var(--matcha-600)"
                      : "var(--text-secondary)",
                }}
              >
                {tab.label}
                {tab.count !== undefined && tab.count > 0 && (
                  <span
                    className="px-2 py-0.5 rounded-full text-xs"
                    style={{
                      background:
                        activeTab === tab.id
                          ? "var(--matcha-100)"
                          : "var(--bg-elevated)",
                      color:
                        activeTab === tab.id
                          ? "var(--matcha-700)"
                          : "var(--text-muted)",
                    }}
                  >
                    {tab.count}
                  </span>
                )}
                {activeTab === tab.id && (
                  <div
                    className="absolute bottom-0 left-0 right-0 h-0.5"
                    style={{ background: "var(--matcha-600)" }}
                  />
                )}
              </button>
            ))}
          </div>

          {/* My Friends Tab */}
          {activeTab === "friends" && (
            <div className="space-y-4">
              {friends === undefined ? (
                // Loading
                <div className="space-y-4">
                  {[...Array(3)].map((_, i) => (
                    <div
                      key={i}
                      className="h-24 rounded-xl animate-pulse"
                      style={{ background: "var(--bg-elevated)" }}
                    />
                  ))}
                </div>
              ) : friends.length === 0 ? (
                // Empty state
                <div
                  className="text-center py-16 rounded-xl"
                  style={{ background: "var(--bg-elevated)" }}
                >
                  <div
                    className="w-20 h-20 mx-auto mb-4 rounded-full flex items-center justify-center"
                    style={{ background: "var(--bg-card)" }}
                  >
                    <svg
                      width="40"
                      height="40"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      style={{ color: "var(--text-muted)" }}
                    >
                      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                      <circle cx="9" cy="7" r="4" />
                      <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
                      <path d="M16 3.13a4 4 0 0 1 0 7.75" />
                    </svg>
                  </div>
                  <h3
                    className="text-lg font-medium mb-2"
                    style={{ color: "var(--text-primary)" }}
                  >
                    {t("friends.noFriends")}
                  </h3>
                  <p
                    className="mb-6"
                    style={{ color: "var(--text-muted)" }}
                  >
                    {t("friends.discoverPeople")}
                  </p>
                  <button
                    onClick={() => setActiveTab("discover")}
                    className="matcha-btn matcha-btn-primary"
                  >
                    {t("friends.findFriends")}
                  </button>
                </div>
              ) : (
                // Friends list
                friends.map((friend) => (
                  <FriendCard key={friend._id} friend={friend} />
                ))
              )}
            </div>
          )}

          {/* Requests Tab */}
          {activeTab === "requests" && (
            <div className="space-y-8">
              {/* Received Requests */}
              <section>
                <h2
                  className="text-lg font-medium mb-4 flex items-center gap-2"
                  style={{ color: "var(--text-primary)" }}
                >
                  {t("friends.received")}
                  {pendingRequests && pendingRequests.length > 0 && (
                    <span
                      className="px-2 py-0.5 rounded-full text-xs"
                      style={{
                        background: "var(--matcha-100)",
                        color: "var(--matcha-700)",
                      }}
                    >
                      {pendingRequests.length}
                    </span>
                  )}
                </h2>

                {pendingRequests === undefined ? (
                  <div
                    className="h-32 rounded-xl animate-pulse"
                    style={{ background: "var(--bg-elevated)" }}
                  />
                ) : pendingRequests.length === 0 ? (
                  <div
                    className="text-center py-8 rounded-xl"
                    style={{ background: "var(--bg-elevated)" }}
                  >
                    <p style={{ color: "var(--text-muted)" }}>
                      {t("friends.noPending")}
                    </p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {pendingRequests.map((request) => (
                      <FriendRequestCard
                        key={request.friendshipId}
                        request={request}
                        type="received"
                      />
                    ))}
                  </div>
                )}
              </section>

              {/* Sent Requests */}
              <section>
                <h2
                  className="text-lg font-medium mb-4 flex items-center gap-2"
                  style={{ color: "var(--text-primary)" }}
                >
                  {t("friends.sent")}
                  {sentRequests && sentRequests.length > 0 && (
                    <span
                      className="px-2 py-0.5 rounded-full text-xs"
                      style={{
                        background: "var(--bg-elevated)",
                        color: "var(--text-muted)",
                      }}
                    >
                      {sentRequests.length}
                    </span>
                  )}
                </h2>

                {sentRequests === undefined ? (
                  <div
                    className="h-32 rounded-xl animate-pulse"
                    style={{ background: "var(--bg-elevated)" }}
                  />
                ) : sentRequests.length === 0 ? (
                  <div
                    className="text-center py-8 rounded-xl"
                    style={{ background: "var(--bg-elevated)" }}
                  >
                    <p style={{ color: "var(--text-muted)" }}>
                      {t("friends.noPending")}
                    </p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {sentRequests.map((request) => (
                      <FriendRequestCard
                        key={request.friendshipId}
                        request={{
                          ...request,
                          requesterId: request.addresseeId,
                        }}
                        type="sent"
                      />
                    ))}
                  </div>
                )}
              </section>
            </div>
          )}

          {/* Discover Tab */}
          {activeTab === "discover" && (
            <div className="space-y-6">
              <UserSearchBar onSearch={handleSearch} />

              <UserDirectory
                users={
                  searchQuery.length >= 2
                    ? searchResults ?? []
                    : (browseResults?.users && browseResults.users.length > 0)
                      ? browseResults.users
                      : fallbackBrowse?.users ?? []
                }
                isLoading={
                  searchQuery.length >= 2
                    ? searchResults === undefined
                    : browseResults === undefined && fallbackBrowse === undefined
                }
              />
            </div>
          )}
        </div>
      </main>
    </div>
  );
};

export default FriendsPage;
