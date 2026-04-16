"use client";

/**
 * PIXEL REALM ONLINE — Game HUD
 * HP/XP/SP bars, gold, stats, minimap, chat, kill feed, audio controls
 */

import { useEffect, useState, useRef } from "react";
import type { CSSProperties } from "react";
import type { PlayerEntity, Entity, TileMap, CastState } from "../types";
import type { PlayerJob } from "../types";
import { WalletWidget } from "./wallet-widget";
import { Minimap } from "./minimap";
import { useAtom } from "jotai";
import { isMutedAtom, sfxVolumeAtom, musicVolumeAtom } from "@/neynar-farcaster-sdk/src/mini/features/audio/audio-atoms";
import { ZoneBadge } from "./zone-portal";
import { JOB_DEFINITIONS } from "../job-system";

interface ChatMessage {
  id: string;
  playerId: string;
  playerName: string;
  text: string;
  timestamp: number;
}

interface KillFeedEntry {
  id: string;
  killerName: string;
  targetName: string;
  timestamp: number;
}

interface GameHUDProps {
  player: PlayerEntity | null;
  entities: Entity[];
  tilemap: TileMap | null;
  localPlayerId: string | null;
  connectedPlayers: number;
  ping: number;
  chatMessages: ChatMessage[];
  killFeed: KillFeedEntry[];
  onSendChat: (text: string) => void;
  zone: string;
  job?: PlayerJob | null;
  castState?: CastState | null;
  onOpenJobPanel?: () => void;
  onOpenSocialPanel?: () => void;
  isMultiplayer?: boolean;
}

export function GameHUD({
  player,
  entities,
  tilemap,
  localPlayerId,
  connectedPlayers,
  ping,
  chatMessages,
  killFeed,
  onSendChat,
  zone,
  job,
  castState,
  onOpenJobPanel,
  onOpenSocialPanel,
  isMultiplayer = false,
}: GameHUDProps) {
  const [chatInput, setChatInput] = useState("");
  const [showChat, setShowChat] = useState(false);
  const [showAudio, setShowAudio] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

  // Audio state — direct atom access
  const [isMuted, setIsMuted] = useAtom(isMutedAtom);
  const [sfxVol, setSfxVol] = useAtom(sfxVolumeAtom);
  const [musicVol, setMusicVol] = useAtom(musicVolumeAtom);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chatMessages]);

  if (!player) {
    return (
      <div style={S.connectingOverlay}>
        <div style={S.connectingBox}>
          <div style={{ fontSize: 32, marginBottom: 8 }}>⚔️</div>
          <div style={S.pixelText}>Entering the Realm...</div>
          <div style={S.loadingDots}>
            <span style={{ animationDelay: "0ms" }}>●</span>
            <span style={{ animationDelay: "200ms" }}>●</span>
            <span style={{ animationDelay: "400ms" }}>●</span>
          </div>
          <style>{`
            @keyframes dotPulse {
              0%,80%,100% { opacity: 0.2; transform: scale(0.8); }
              40% { opacity: 1; transform: scale(1); }
            }
          `}</style>
        </div>
      </div>
    );
  }

  const hp      = player.stats?.hp      ?? 100;
  const maxHp   = player.stats?.maxHp   ?? 100;
  const xp      = player.stats?.xp      ?? 0;
  const level   = player.stats?.level   ?? 1;
  const atk     = player.stats?.attack  ?? 0;
  const def     = player.stats?.defense ?? 0;
  const hpRatio = maxHp > 0 ? hp / maxHp : 0;
  const xpRatio = xp / (level * 100);
  const spRatio = job ? (job.sp / job.maxSp) : 0;
  const jobDef  = job ? JOB_DEFINITIONS[job.jobClass] : null;
  const pingColor = ping < 80 ? "#44ff88" : ping < 200 ? "#ffcc44" : "#ff5555";

  return (
    <div style={S.hudRoot}>

      {/* ── Top panel ── */}
      <div style={S.topPanel}>

        {/* Row 1: identity + controls */}
        <div style={S.topRow}>
          <div style={S.identityGroup}>
            <div style={S.levelBadge}>Lv.{level}</div>
            <div style={S.playerName}>{player.name}</div>
            {jobDef && (
              <button onClick={onOpenJobPanel} style={S.jobBadge}>
                {jobDef.icon} {jobDef.name}
              </button>
            )}
          </div>

          <div style={S.topRightGroup}>
            {/* Ping + players — compact */}
            <div style={S.pingChip}>
              {isMultiplayer ? (
                <span style={{ color: "#44ff88", fontSize: 8 }}>🌐</span>
              ) : (
                <span style={{ color: "#888", fontSize: 8 }}>💾</span>
              )}
              <span style={{ color: pingColor, marginLeft: 2 }}>⚡{ping}ms</span>
              <span style={{ color: "#666", margin: "0 3px" }}>·</span>
              <span style={{ color: "#888" }}>👥{connectedPlayers}</span>
            </div>
            {/* Audio toggle */}
            <button
              style={{
                ...S.iconBtn,
                background: showAudio ? "rgba(124,58,237,0.4)" : "rgba(0,0,0,0.55)",
                border: showAudio ? "1px solid #a78bfa" : "1px solid rgba(255,255,255,0.12)",
              }}
              onClick={() => setShowAudio(v => !v)}
              title="Audio"
            >
              {isMuted ? "🔇" : "🔊"}
            </button>
            {/* Social */}
            <button onClick={onOpenSocialPanel} style={S.iconBtn} title="Party & Guild">
              👥
            </button>
            <div style={{ pointerEvents: "all" }}>
              <WalletWidget />
            </div>
          </div>
        </div>

        {/* Row 2: HP / XP / SP bars — compact 3-column grid */}
        <div style={S.barsGroup}>
          <StatBar label="HP" ratio={hpRatio} value={`${hp}/${maxHp}`}
            color={hpRatio > 0.5 ? "#22dd55" : hpRatio > 0.25 ? "#ffaa22" : "#ff3333"}
            glow={hpRatio > 0.5 ? "#22dd5540" : "#ff333340"} />
          <StatBar label="XP" ratio={xpRatio} value={`${xp}/${level * 100}`}
            color="#5599ff" glow="#5599ff40" />
          {job && (
            <StatBar label="SP" ratio={spRatio} value={`${job.sp}/${job.maxSp}`}
              color="#9f5df5" glow="#9f5df540" />
          )}
        </div>

        {/* Row 3: gold + atk/def + zone */}
        <div style={S.statsRow}>
          <span style={S.goldText}>💰 {player.gold ?? 0}g</span>
          <span style={S.statChip}>⚔ {atk}</span>
          <span style={S.statChip}>🛡 {def}</span>
          <div style={{ marginLeft: "auto" }}>
            <ZoneBadge zoneId={zone} />
          </div>
        </div>

        {/* Cast bar (only when casting) */}
        {castState && <CastBarInline castState={castState} />}
      </div>

      {/* ── Audio panel — drops DOWN from the audio button in top panel ── */}
      {showAudio && (
        <div style={S.audioPanel}>
          <div style={S.audioPanelTitle}>🎵 Audio</div>
          <button
            onClick={() => setIsMuted(m => !m)}
            style={{
              width: "100%", padding: "6px 10px", marginBottom: 8,
              background: isMuted ? "rgba(239,68,68,0.2)" : "rgba(68,204,136,0.15)",
              border: `1px solid ${isMuted ? "rgba(239,68,68,0.5)" : "rgba(68,204,136,0.4)"}`,
              borderRadius: 6, cursor: "pointer", fontFamily: "monospace",
              color: isMuted ? "#f87171" : "#44cc88", fontSize: 10,
              display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
            }}
          >
            {isMuted ? "🔇 Muted — tap to unmute" : "🔊 Sound on — tap to mute"}
          </button>
          <div style={{ marginBottom: 6 }}>
            <div style={{ color: "#888", fontSize: 8, marginBottom: 3, letterSpacing: 0.5 }}>
              SFX {Math.round(sfxVol * 100)}%
            </div>
            <input type="range" min={0} max={1} step={0.05} value={sfxVol}
              onChange={e => setSfxVol(parseFloat(e.target.value))}
              style={{ width: "100%", accentColor: "#a78bfa", cursor: "pointer" }} />
          </div>
          <div>
            <div style={{ color: "#888", fontSize: 8, marginBottom: 3, letterSpacing: 0.5 }}>
              Music {Math.round(musicVol * 100)}%
            </div>
            <input type="range" min={0} max={1} step={0.05} value={musicVol}
              onChange={e => setMusicVol(parseFloat(e.target.value))}
              style={{ width: "100%", accentColor: "#a78bfa", cursor: "pointer" }} />
          </div>
        </div>
      )}

      {/* ── Kill feed — below top panel, right-aligned ── */}
      {killFeed.length > 0 && (
        <div style={S.killFeed}>
          {killFeed.slice(-4).map(kf => (
            <div key={kf.id} style={S.killEntry}>
              <span style={{ color: "#ffd644" }}>{kf.killerName}</span>
              <span style={{ color: "#555" }}> ✕ </span>
              <span style={{ color: "#ff8080" }}>{kf.targetName}</span>
            </div>
          ))}
        </div>
      )}

      {/* ── Minimap — bottom right ── */}
      <Minimap tilemap={tilemap} entities={entities} localPlayerId={localPlayerId} />

      {/* ── Chat — bottom left ── */}
      <div style={S.chatArea}>
        {showChat && chatMessages.length > 0 && (
          <div style={S.chatLog}>
            {chatMessages.slice(-8).map(msg => (
              <div key={msg.id} style={S.chatLine}>
                <span style={{ color: "#77bbff" }}>{msg.playerName}: </span>
                <span style={{ color: "#ddd" }}>{msg.text}</span>
              </div>
            ))}
            <div ref={chatEndRef} />
          </div>
        )}
        <div style={S.chatInputRow}>
          <button style={S.chatToggle} onClick={() => setShowChat(p => !p)} title="Chat">
            💬
          </button>
          {showChat && (
            <>
              <input
                style={S.chatInput}
                value={chatInput}
                onChange={e => setChatInput(e.target.value)}
                onKeyDown={e => {
                  if (e.key === "Enter" && chatInput.trim()) {
                    onSendChat(chatInput.trim());
                    setChatInput("");
                  }
                }}
                placeholder="Say something..."
                maxLength={80}
              />
              <button style={S.chatSend}
                onClick={() => { if (chatInput.trim()) { onSendChat(chatInput.trim()); setChatInput(""); } }}>
                ➤
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

// ---- Sub-components ----------------------------------------------------

function StatBar({ label, ratio, value, color, glow }: {
  label: string; ratio: number; value: string; color: string; glow: string;
}) {
  return (
    <div style={S.barRow}>
      <span style={{ ...S.barLabel, color }}>{label}</span>
      <div style={S.barTrack}>
        <div style={{
          ...S.barFill,
          width: `${Math.max(0, Math.min(100, ratio * 100))}%`,
          background: color,
          boxShadow: `0 0 8px ${glow}`,
        }} />
      </div>
      <span style={S.barValue}>{value}</span>
    </div>
  );
}

function CastBarInline({ castState }: { castState: { skillName: string; startTime: number; duration: number } }) {
  const [pct, setPct] = useState(0);
  useEffect(() => {
    const t = setInterval(() => {
      setPct(Math.min(1, (Date.now() - castState.startTime) / castState.duration));
    }, 30);
    return () => clearInterval(t);
  }, [castState]);

  return (
    <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 4 }}>
      <span style={{ fontSize: 10 }}>✨</span>
      <div style={{ flex: 1, height: 5, background: "rgba(0,0,0,0.5)", borderRadius: 3, overflow: "hidden", border: "1px solid #7c3aed40" }}>
        <div style={{
          width: `${pct * 100}%`, height: "100%",
          background: "linear-gradient(90deg,#7c3aed,#c084fc)",
          borderRadius: 3, boxShadow: "0 0 4px #7c3aed",
          transition: "width 0.03s linear",
        }} />
      </div>
      <span style={{ color: "#c4b5fd", fontSize: 8, fontFamily: "monospace", whiteSpace: "nowrap" }}>
        {castState.skillName}
      </span>
    </div>
  );
}

// ---- Styles ------------------------------------------------------------

const S: Record<string, CSSProperties> = {
  hudRoot: {
    position: "absolute",
    inset: 0,
    pointerEvents: "none",
    fontFamily: "monospace",
    zIndex: 200,
  },

  topPanel: {
    position: "absolute",
    top: 0, left: 0, right: 0,
    background: "linear-gradient(180deg, rgba(8,4,20,0.98) 0%, rgba(8,4,20,0.90) 100%)",
    borderBottom: "1px solid rgba(212,160,23,0.35)",
    paddingTop: "max(7px, env(safe-area-inset-top))",
    paddingLeft: 10,
    paddingRight: 10,
    paddingBottom: 5,
    display: "flex",
    flexDirection: "column",
    gap: 4,
    boxShadow: "0 2px 16px rgba(0,0,0,0.8)",
  },

  topRow: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 4,
    minWidth: 0,
    overflow: "hidden",
  },

  identityGroup: {
    display: "flex",
    alignItems: "center",
    gap: 5,
    flex: 1,
    minWidth: 0,
    overflow: "hidden",
  },

  topRightGroup: {
    display: "flex",
    alignItems: "center",
    gap: 5,
    pointerEvents: "all",
    flexShrink: 0,
  },

  levelBadge: {
    background: "linear-gradient(135deg, #d4a017, #a07010)",
    color: "#1a0a00",
    fontSize: 10,
    fontWeight: "bold",
    padding: "2px 6px",
    borderRadius: 4,
    border: "1px solid #f0c030",
    flexShrink: 0,
    boxShadow: "0 0 6px #d4a01740",
    letterSpacing: 0.3,
  },

  playerName: {
    color: "#f5e6c8",
    fontSize: 12,
    fontWeight: "bold",
    letterSpacing: 0.3,
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
    maxWidth: 100,
  },

  jobBadge: {
    background: "rgba(124,58,237,0.22)",
    border: "1px solid rgba(167,139,250,0.35)",
    borderRadius: 4,
    color: "#c4b5fd",
    fontSize: 9,
    fontFamily: "monospace",
    padding: "2px 5px",
    cursor: "pointer",
    pointerEvents: "all",
    display: "flex",
    alignItems: "center",
    gap: 3,
    minHeight: 20,
    flexShrink: 0,
  },

  iconBtn: {
    background: "rgba(0,0,0,0.55)",
    border: "1px solid rgba(255,255,255,0.12)",
    borderRadius: 6,
    color: "white",
    fontSize: 13,
    width: 26,
    height: 26,
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    padding: 0,
    transition: "background 0.15s",
    flexShrink: 0,
  },

  pingChip: {
    fontSize: 8,
    color: "#666",
    display: "flex",
    alignItems: "center",
    background: "rgba(0,0,0,0.4)",
    padding: "2px 6px",
    borderRadius: 4,
    border: "1px solid rgba(255,255,255,0.06)",
    whiteSpace: "nowrap",
  },

  barsGroup: {
    display: "flex",
    flexDirection: "column",
    gap: 3,
  },

  barRow: {
    display: "flex",
    alignItems: "center",
    gap: 5,
  },

  barLabel: {
    fontSize: 8,
    fontWeight: "bold",
    width: 14,
    textAlign: "right",
    letterSpacing: 0.3,
    flexShrink: 0,
  },

  barTrack: {
    flex: 1,
    height: 7,
    background: "rgba(0,0,0,0.7)",
    borderRadius: 3,
    border: "1px solid rgba(255,255,255,0.07)",
    overflow: "hidden",
  },

  barFill: {
    height: "100%",
    borderRadius: 3,
    transition: "width 0.18s ease",
  },

  barValue: {
    fontSize: 7,
    color: "#666",
    width: 48,
    textAlign: "right",
    flexShrink: 0,
  },

  statsRow: {
    display: "flex",
    alignItems: "center",
    gap: 5,
    marginTop: 1,
  },

  goldText: {
    color: "#d4a017",
    fontSize: 10,
    fontWeight: "bold",
    letterSpacing: 0.3,
  },

  statChip: {
    color: "#aaa",
    fontSize: 8,
    background: "rgba(255,255,255,0.05)",
    padding: "1px 5px",
    borderRadius: 3,
    border: "1px solid rgba(255,255,255,0.08)",
  },

  // Audio panel — drops from top panel
  audioPanel: {
    position: "absolute",
    // positioned dynamically based on top panel height
    top: 140,
    right: 8,
    background: "rgba(8,4,20,0.97)",
    border: "1px solid rgba(124,58,237,0.5)",
    borderRadius: 10,
    padding: "10px 12px",
    width: 170,
    pointerEvents: "all",
    zIndex: 220,
    boxShadow: "0 8px 24px rgba(0,0,0,0.9)",
  },

  audioPanelTitle: {
    color: "#c4b5fd",
    fontSize: 10,
    fontWeight: "bold",
    letterSpacing: 1,
    marginBottom: 8,
    borderBottom: "1px solid rgba(124,58,237,0.3)",
    paddingBottom: 6,
  },

  // Kill feed — sits just below the top panel, right side
  killFeed: {
    position: "absolute",
    top: 145,
    right: 8,
    display: "flex",
    flexDirection: "column",
    gap: 2,
    pointerEvents: "none",
    maxWidth: 170,
    zIndex: 210,
  },

  killEntry: {
    fontSize: 8,
    background: "rgba(0,0,0,0.78)",
    padding: "2px 6px",
    borderRadius: 4,
    border: "1px solid rgba(255,80,80,0.15)",
    backdropFilter: "blur(4px)",
    letterSpacing: 0.2,
    whiteSpace: "nowrap",
    overflow: "hidden",
    textOverflow: "ellipsis",
  },

  // Chat
  chatArea: {
    position: "absolute",
    bottom: "calc(84px + env(safe-area-inset-bottom, 0px))",
    left: 8,
    maxWidth: 200,
    pointerEvents: "all",
    display: "flex",
    flexDirection: "column",
    gap: 4,
    zIndex: 210,
  },

  chatLog: {
    background: "rgba(0,0,0,0.75)",
    border: "1px solid rgba(255,255,255,0.08)",
    borderRadius: 6,
    padding: "5px 8px",
    maxHeight: 90,
    overflowY: "auto",
    display: "flex",
    flexDirection: "column",
    gap: 2,
    backdropFilter: "blur(4px)",
  },

  chatLine: {
    fontSize: 9,
    lineHeight: 1.5,
    color: "#ddd",
  },

  chatInputRow: {
    display: "flex",
    gap: 4,
    alignItems: "center",
  },

  chatToggle: {
    background: "rgba(0,0,0,0.65)",
    border: "1px solid rgba(255,255,255,0.15)",
    borderRadius: 6,
    color: "white",
    fontSize: 14,
    width: 30,
    height: 30,
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    padding: 0,
    flexShrink: 0,
  },

  chatInput: {
    flex: 1,
    background: "rgba(0,0,0,0.8)",
    border: "1px solid rgba(255,255,255,0.18)",
    borderRadius: 6,
    color: "white",
    fontSize: 10,
    padding: "4px 8px",
    outline: "none",
    fontFamily: "monospace",
    height: 30,
  },

  chatSend: {
    background: "rgba(100,150,255,0.22)",
    border: "1px solid rgba(100,150,255,0.4)",
    borderRadius: 6,
    color: "white",
    fontSize: 13,
    width: 30,
    height: 30,
    cursor: "pointer",
    padding: 0,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },

  connectingOverlay: {
    position: "absolute",
    inset: 0,
    background: "rgba(8,4,20,0.97)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 999,
    fontFamily: "monospace",
  },

  connectingBox: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    gap: 12,
  },

  pixelText: {
    color: "#f0b429",
    fontSize: 15,
    fontWeight: "bold",
    letterSpacing: 2,
    textShadow: "0 0 12px #f0b42970",
  },

  loadingDots: {
    display: "flex",
    gap: 8,
    color: "#7c3aed",
    fontSize: 16,
  },
};
