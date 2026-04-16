"use client";

/**
 * Top-level error boundary — catches React render crashes and shows them
 * visibly so we can diagnose "page couldn't load" in production.
 * Also calls sdk.actions.ready() so Farcaster doesn't hang on the splash screen.
 */

import { Component, type ReactNode, type ErrorInfo } from "react";
import sdk from "@farcaster/miniapp-sdk";

interface Props {
  children: ReactNode;
}

interface State {
  error: Error | null;
}

export class AppErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("[AppErrorBoundary] Caught crash:", error, info.componentStack);
    // Call ready() even on crash so Farcaster dismisses the splash screen
    // and shows our error UI instead of hanging forever
    try { sdk.actions.ready(); } catch (_) { /* ignore */ }
  }

  render() {
    if (this.state.error) {
      const msg = this.state.error.message || String(this.state.error);
      const stack = this.state.error.stack ?? "";
      const firstLines = stack.split("\n").slice(0, 5).join("\n");

      return (
        <div style={{
          position: "fixed", inset: 0,
          background: "#0f0820",
          display: "flex", flexDirection: "column",
          alignItems: "center", justifyContent: "center",
          padding: 24, fontFamily: "monospace",
          gap: 16,
        }}>
          <div style={{ fontSize: 32 }}>💥</div>
          <div style={{ color: "#ff6b6b", fontSize: 14, fontWeight: "bold", textAlign: "center" }}>
            App Crashed
          </div>
          <div style={{
            background: "rgba(255,100,100,0.1)",
            border: "1px solid rgba(255,100,100,0.3)",
            borderRadius: 8,
            padding: "12px 16px",
            maxWidth: 360,
            width: "100%",
          }}>
            <div style={{ color: "#ff9999", fontSize: 11, wordBreak: "break-all", lineHeight: 1.5 }}>
              {msg}
            </div>
            {firstLines && (
              <pre style={{
                color: "#555", fontSize: 9, marginTop: 8,
                whiteSpace: "pre-wrap", wordBreak: "break-all",
              }}>
                {firstLines}
              </pre>
            )}
          </div>
          <div style={{ color: "#444", fontSize: 9, textAlign: "center" }}>
            Screenshot this and share it so we can fix it
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
