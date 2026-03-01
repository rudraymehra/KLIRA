"use client";

import { Component, type ReactNode, type ErrorInfo } from "react";
import CyberButton from "./CyberButton";

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export default class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("ErrorBoundary caught:", error, errorInfo);
    import("@sentry/nextjs").then((Sentry) => {
      Sentry.captureException(error, {
        extra: { componentStack: errorInfo.componentStack },
      });
    }).catch(() => {
      // Sentry not available, that's ok
    });
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) return this.props.fallback;

      return (
        <div className="flex flex-col items-center justify-center min-h-[300px] p-8">
          <div className="bg-cyber-panel border border-neon-pink/30 rounded-sm p-8 max-w-md text-center">
            <h2 className="font-orbitron text-lg text-neon-pink mb-3">
              Something went wrong
            </h2>
            <p className="text-sm text-white/40 font-jetbrains mb-6">
              {this.state.error?.message || "An unexpected error occurred"}
            </p>
            <CyberButton
              variant="primary"
              size="md"
              onClick={() => this.setState({ hasError: false, error: null })}
            >
              Try Again
            </CyberButton>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
