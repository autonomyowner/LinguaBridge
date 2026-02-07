import React from "react";
import { BrowserRouter, Routes, Route, useLocation } from "react-router-dom";

// Pages
import HomePage from "./pages/HomePage";
import SignInPage from "./pages/SignInPage";
import SignUpPage from "./pages/SignUpPage";
import ForgotPasswordPage from "./pages/ForgotPasswordPage";
import PricingPage from "./pages/PricingPage";
import DashboardPage from "./pages/DashboardPage";
import TRAVoicesPage from "./pages/TRAVoicesPage";
import SettingsPage from "./pages/SettingsPage";
import SessionHistoryPage from "./pages/SessionHistoryPage";
import AdminMapPage from "./pages/AdminMapPage";
import AdminDashboardPage from "./pages/AdminDashboardPage";
import FriendsPage from "./pages/FriendsPage";
import MessagesPage from "./pages/MessagesPage";

// Components
import FloatingChat from "./components/FloatingChat";

// Wrapper to conditionally show FloatingChat
const FloatingChatWrapper: React.FC = () => {
  const location = useLocation();
  // Don't show on messages page (already has chat), auth pages, or admin pages
  const hiddenPaths = ["/messages", "/signin", "/signup", "/forgot-password", "/admin"];
  const shouldHide = hiddenPaths.some(path => location.pathname.startsWith(path));

  if (shouldHide) return null;
  return <FloatingChat />;
};

const App: React.FC = () => {
  return (
    <BrowserRouter>
      <FloatingChatWrapper />
      <Routes>
        {/* All routes are public - no auth required */}
        <Route path="/" element={<HomePage />} />
        <Route path="/pricing" element={<PricingPage />} />
        <Route path="/signin" element={<SignInPage />} />
        <Route path="/signup" element={<SignUpPage />} />
        <Route path="/forgot-password" element={<ForgotPasswordPage />} />
        <Route path="/dashboard" element={<DashboardPage />} />
        <Route path="/translate" element={<TRAVoicesPage />} />
        <Route path="/settings" element={<SettingsPage />} />
        <Route path="/history" element={<SessionHistoryPage />} />
        <Route path="/friends" element={<FriendsPage />} />
        <Route path="/messages" element={<MessagesPage />} />
        <Route path="/admin/map" element={<AdminMapPage />} />
        <Route path="/admin" element={<AdminDashboardPage />} />

        {/* 404 - redirect to home */}
        <Route path="*" element={<HomePage />} />
      </Routes>
    </BrowserRouter>
  );
};

export default App;
