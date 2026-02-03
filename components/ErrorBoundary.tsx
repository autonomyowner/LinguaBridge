import React, { Component, ErrorInfo, ReactNode } from "react";

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("Uncaught error:", error, errorInfo);
  }

  public render() {
    if (this.state.hasError) {
      return (
        <div
          style={{
            minHeight: "100vh",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            background: "#faf9f7",
            padding: "20px",
          }}
        >
          <div
            style={{
              maxWidth: "500px",
              textAlign: "center",
              padding: "40px",
              background: "white",
              borderRadius: "16px",
              boxShadow: "0 4px 20px rgba(0,0,0,0.1)",
            }}
          >
            <h1 style={{ color: "#68a67d", marginBottom: "16px", fontFamily: "serif" }}>
              Something went wrong
            </h1>
            <p style={{ color: "#666", marginBottom: "24px" }}>
              We're having trouble loading the page. Please try refreshing.
            </p>
            <button
              onClick={() => window.location.reload()}
              style={{
                background: "#68a67d",
                color: "white",
                border: "none",
                padding: "12px 32px",
                borderRadius: "8px",
                cursor: "pointer",
                fontSize: "16px",
                fontWeight: "600",
              }}
            >
              Refresh Page
            </button>
            {this.state.error && (
              <details style={{ marginTop: "24px", textAlign: "left" }}>
                <summary style={{ cursor: "pointer", color: "#999" }}>
                  Technical details
                </summary>
                <pre
                  style={{
                    marginTop: "8px",
                    padding: "12px",
                    background: "#f5f5f5",
                    borderRadius: "8px",
                    fontSize: "12px",
                    overflow: "auto",
                    whiteSpace: "pre-wrap",
                    wordBreak: "break-word",
                  }}
                >
                  {this.state.error.toString()}
                </pre>
              </details>
            )}
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
