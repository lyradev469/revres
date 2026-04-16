"use client";

/**
 * PIXEL REALM ONLINE — Wallet Widget
 *
 * Inside Farcaster: auto-connects via farcasterMiniApp connector silently.
 * In a browser: shows a wallet picker sheet (MetaMask / injected wallet).
 */

import { useEffect, useState } from "react";
import type { CSSProperties } from "react";
import { useAccount, useConnect, useDisconnect, useBalance } from "wagmi";
import { truncateAddress } from "@/neynar-web-sdk/blockchain";

export function WalletWidget() {
  const { address, isConnected, chain } = useAccount();
  const { connect, connectors, isPending } = useConnect();
  const { disconnect } = useDisconnect();
  const { data: balance } = useBalance({ address });
  const [showPicker, setShowPicker] = useState(false);

  // Auto-connect inside Farcaster on mount
  useEffect(() => {
    if (isConnected) return;
    const fc = connectors.find(c => c.id === "farcasterMiniApp");
    if (fc) connect({ connector: fc });
  }, [connectors]); // eslint-disable-line react-hooks/exhaustive-deps

  if (isConnected && address) {
    return (
      <div style={styles.connected}>
        <span style={{
          ...styles.chainBadge,
          background: chain?.id === 8453 ? "rgba(0,82,255,0.2)" : "rgba(124,58,237,0.2)",
          borderColor: chain?.id === 8453 ? "rgba(0,82,255,0.5)" : "rgba(124,58,237,0.5)",
          color: chain?.id === 8453 ? "#60a5fa" : "#a78bfa",
        }}>
          {chain?.name ?? "Chain"}
        </span>

        <span style={styles.address}>{truncateAddress(address)}</span>

        {balance && (
          <span style={styles.balance}>
            {parseFloat(balance.formatted).toFixed(4)} {balance.symbol}
          </span>
        )}

        <button onClick={() => disconnect()} style={styles.disconnectBtn} title="Disconnect">✕</button>
      </div>
    );
  }

  // Non-Farcaster: show wallet picker
  const browserConnectors = connectors.filter(c => c.id !== "farcasterMiniApp");

  if (showPicker) {
    return (
      <div style={styles.pickerOverlay}>
        <div style={styles.pickerSheet}>
          <div style={styles.pickerHeader}>
            <span style={styles.pickerTitle}>Connect Wallet</span>
            <button onClick={() => setShowPicker(false)} style={styles.pickerClose}>✕</button>
          </div>
          {browserConnectors.length === 0 ? (
            <p style={styles.noWalletText}>No wallet extension detected. Install MetaMask to continue.</p>
          ) : (
            browserConnectors.map(c => (
              <button
                key={c.id}
                disabled={isPending}
                onClick={() => {
                  connect({ connector: c });
                  setShowPicker(false);
                }}
                style={styles.connectorBtn}
              >
                <span style={styles.connectorIcon}>
                  {c.id === "injected" ? "🦊" : "🔗"}
                </span>
                <span style={styles.connectorName}>
                  {c.name || "Browser Wallet"}
                </span>
              </button>
            ))
          )}
        </div>
      </div>
    );
  }

  return (
    <button
      onClick={() => {
        // If only farcasterMiniApp available and no browser connectors, try it directly
        if (browserConnectors.length === 0) {
          const fc = connectors[0];
          if (fc) connect({ connector: fc });
        } else {
          setShowPicker(true);
        }
      }}
      disabled={isPending}
      style={styles.connectBtn}
    >
      {isPending ? "Connecting..." : "🔗 Connect Wallet"}
    </button>
  );
}

const styles: Record<string, CSSProperties> = {
  connected: {
    display: "flex",
    alignItems: "center",
    gap: 6,
    background: "rgba(0,0,0,0.5)",
    border: "1px solid rgba(255,255,255,0.12)",
    borderRadius: 6,
    padding: "3px 8px",
    fontFamily: "monospace",
  },
  chainBadge: {
    fontSize: 8,
    fontWeight: "bold",
    letterSpacing: 0.5,
    padding: "1px 5px",
    borderRadius: 3,
    border: "1px solid",
  },
  address: {
    fontSize: 10,
    color: "#e0e0e0",
    fontFamily: "monospace",
    letterSpacing: 0.5,
  },
  balance: {
    fontSize: 9,
    color: "#aaaaaa",
    fontFamily: "monospace",
  },
  disconnectBtn: {
    background: "none",
    border: "none",
    color: "rgba(255,255,255,0.3)",
    cursor: "pointer",
    fontSize: 10,
    padding: "0 2px",
    lineHeight: 1,
  },
  connectBtn: {
    background: "rgba(124, 58, 237, 0.2)",
    border: "1px solid rgba(124, 58, 237, 0.5)",
    borderRadius: 6,
    color: "#c4b5fd",
    fontSize: 10,
    fontFamily: "monospace",
    padding: "5px 10px",
    cursor: "pointer",
    minHeight: 32,
    letterSpacing: 0.5,
    transition: "background 0.15s",
  },
  // Picker overlay
  pickerOverlay: {
    position: "fixed",
    inset: 0,
    background: "rgba(0,0,0,0.7)",
    display: "flex",
    alignItems: "flex-end",
    justifyContent: "center",
    zIndex: 9999,
  },
  pickerSheet: {
    background: "#1a0a2e",
    border: "1px solid rgba(124,58,237,0.4)",
    borderRadius: "16px 16px 0 0",
    padding: "20px 16px 32px",
    width: "100%",
    maxWidth: 424,
    display: "flex",
    flexDirection: "column",
    gap: 12,
  },
  pickerHeader: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 4,
  },
  pickerTitle: {
    color: "#e0d0ff",
    fontSize: 16,
    fontWeight: "bold",
    fontFamily: "monospace",
    letterSpacing: 1,
  },
  pickerClose: {
    background: "none",
    border: "none",
    color: "rgba(255,255,255,0.4)",
    fontSize: 16,
    cursor: "pointer",
    padding: 4,
  },
  connectorBtn: {
    display: "flex",
    alignItems: "center",
    gap: 12,
    background: "rgba(124,58,237,0.15)",
    border: "1px solid rgba(124,58,237,0.35)",
    borderRadius: 10,
    padding: "12px 16px",
    cursor: "pointer",
    color: "#c4b5fd",
    fontFamily: "monospace",
    fontSize: 13,
    minHeight: 48,
    transition: "background 0.15s",
  },
  connectorIcon: {
    fontSize: 22,
  },
  connectorName: {
    color: "#e0d0ff",
    fontWeight: "bold",
    letterSpacing: 0.5,
  },
  noWalletText: {
    color: "rgba(255,255,255,0.5)",
    fontSize: 12,
    fontFamily: "monospace",
    textAlign: "center",
    padding: "12px 0",
    margin: 0,
  },
};
