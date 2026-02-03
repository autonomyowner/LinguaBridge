import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import { ConvexClientProvider } from "./providers/ConvexClientProvider";
import { AuthProvider } from "./providers/AuthContext";
import { LanguageProvider } from "./providers/LanguageContext";
import ErrorBoundary from "./components/ErrorBoundary";

const rootElement = document.getElementById("root");
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

const root = ReactDOM.createRoot(rootElement);
root.render(
  <React.StrictMode>
    <ErrorBoundary>
      <ConvexClientProvider>
        <AuthProvider>
          <LanguageProvider>
            <App />
          </LanguageProvider>
        </AuthProvider>
      </ConvexClientProvider>
    </ErrorBoundary>
  </React.StrictMode>
);
