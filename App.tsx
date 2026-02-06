import React from "react";
import { BrowserRouter, Routes, Route } from "react-router-dom";

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
import FriendsPage from "./pages/FriendsPage";
import MessagesPage from "./pages/MessagesPage";

const App: React.FC = () => {
  return (
    <BrowserRouter>
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

        {/* 404 - redirect to home */}
        <Route path="*" element={<HomePage />} />
      </Routes>
    </BrowserRouter>
  );
};

export default App;
