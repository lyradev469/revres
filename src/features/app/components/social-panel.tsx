"use client";

/**
 * PIXEL REALM ONLINE — Social Panel (Party + Guild)
 *
 * Slide-up panel with two tabs:
 * - Party tab: view party members, HP bars, leave/invite
 * - Guild tab: view guild members, roles, chat, treasury
 */

import { useState, useCallback } from "react";
import type { CSSProperties } from "react";
import type { Party, Guild, EntityId, JobClass } from "../types";
import { JOB_DEFINITIONS } from "../job-system";
import {
  createParty,
  addPartyMember,
  removePartyMember,
  createGuild,
  inviteGuildMember,
  getGuildRank,
  partyStore,
  guildStore,
} from "../party-guild-system";

interface SocialPanelProps {
  localPlayerId: EntityId;
  localPlayerName: string;
  localPlayerLevel: number;
  localPlayerJob: JobClass;
  localPlayerHp: number;
  localPlayerMaxHp: number;
  onClose: () => void;
}

// ── Compact HP bar ─────────────────────────────────────────────────────────────

function MiniHPBar({ hp, maxHp }: { hp: number; maxHp: number }) {
  const pct = Math.max(0, Math.min(1, hp / maxHp));
  const color = pct > 0.5 ? "#22cc22" : pct > 0.25 ? "#ffaa00" : "#ff2222";
  return (
    <div style={{
      width: "100%",
      height: 5,
      background: "rgba(0,0,0,0.5)",
      borderRadius: 3,
      border: "1px solid #333",
      overflow: "hidden",
    }}>
      <div style={{
        width: `${pct * 100}%`,
        height: "100%",
        background: color,
        transition: "width 0.3s ease",
        borderRadius: 3,
      }} />
    </div>
  );
}

// ── Tab ──────────────────────────────────────────────────────────────────────

type Tab = "party" | "guild";

// ── Party Tab ─────────────────────────────────────────────────────────────────

function PartyTab({
  localPlayerId,
  localPlayerName,
  localPlayerLevel,
  localPlayerJob,
  localPlayerHp,
  localPlayerMaxHp,
}: Omit<SocialPanelProps, "onClose">) {
  const [party, setParty] = useState<Party | null>(() => partyStore.getPlayerParty(localPlayerId));
  const [inviteName, setInviteName] = useState("");

  const handleCreate = useCallback(() => {
    const newParty = createParty(
      localPlayerId, localPlayerName,
      localPlayerHp, localPlayerMaxHp,
      localPlayerLevel, localPlayerJob
    );
    partyStore.setParty(newParty);
    setParty(newParty);
  }, [localPlayerId, localPlayerName, localPlayerHp, localPlayerMaxHp, localPlayerLevel, localPlayerJob]);

  const handleLeave = useCallback(() => {
    if (!party) return;
    const updated = removePartyMember(party, localPlayerId);
    if (updated.members.length === 0) {
      partyStore.removeParty(party.id);
      setParty(null);
    } else {
      partyStore.setParty(updated);
      setParty(null);
    }
  }, [party, localPlayerId]);

  const handleInvite = useCallback(() => {
    if (!party || !inviteName.trim()) return;
    // In a real system this would send an invite via WebSocket.
    // For demo we add a mock member.
    const mockId = `mock_${Date.now()}`;
    const { party: updated, success, reason } = addPartyMember(
      party, mockId, inviteName.trim(), 100, 150, 1, "novice"
    );
    if (success) {
      partyStore.setParty(updated);
      setParty(updated);
      setInviteName("");
    } else {
      alert(reason);
    }
  }, [party, inviteName]);

  return (
    <div style={{ padding: 12, display: "flex", flexDirection: "column", gap: 8 }}>
      {!party ? (
        <div style={{ display: "flex", flexDirection: "column", gap: 8, alignItems: "center" }}>
          <div style={{ color: "#888", fontSize: 11, fontFamily: "monospace", textAlign: "center" }}>
            You are not in a party
          </div>
          <button
            onClick={handleCreate}
            style={btnStyle("#4f46e5")}
          >
            ⚔️ Create Party
          </button>
        </div>
      ) : (
        <>
          <div style={{ color: "#f0b429", fontSize: 11, fontFamily: "monospace", marginBottom: 4 }}>
            {party.name} ({party.members.length}/6)
          </div>

          {party.members.map(m => {
            const jobDef = JOB_DEFINITIONS[m.jobClass];
            return (
              <div key={m.entityId} style={{
                background: "rgba(255,255,255,0.04)",
                border: `1px solid ${m.isLeader ? "#f0b429" : "#333"}`,
                borderRadius: 6,
                padding: "6px 8px",
                display: "flex",
                flexDirection: "column",
                gap: 4,
              }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                    <span style={{ fontSize: 14 }}>{jobDef.icon}</span>
                    <span style={{ color: m.isLeader ? "#f0b429" : "#e0e0e0", fontSize: 11, fontFamily: "monospace" }}>
                      {m.isLeader ? "👑 " : ""}{m.name}
                    </span>
                  </div>
                  <span style={{ color: "#888", fontSize: 9, fontFamily: "monospace" }}>
                    Lv.{m.level} {jobDef.name}
                  </span>
                </div>
                <MiniHPBar hp={m.hp} maxHp={m.maxHp} />
                <div style={{ display: "flex", justifyContent: "flex-end" }}>
                  <span style={{ color: "#888", fontSize: 8 }}>{m.hp}/{m.maxHp} HP</span>
                </div>
              </div>
            );
          })}

          {/* Invite input */}
          <div style={{ display: "flex", gap: 6, marginTop: 4 }}>
            <input
              value={inviteName}
              onChange={e => setInviteName(e.target.value)}
              onKeyDown={e => e.key === "Enter" && handleInvite()}
              placeholder="Player name to invite..."
              style={{
                flex: 1,
                background: "rgba(0,0,0,0.5)",
                border: "1px solid #333",
                borderRadius: 4,
                color: "#e0e0e0",
                fontSize: 10,
                padding: "4px 8px",
                fontFamily: "monospace",
              }}
            />
            <button onClick={handleInvite} style={btnStyle("#4f46e5")}>Invite</button>
          </div>

          <button onClick={handleLeave} style={{ ...btnStyle("#7f1d1d"), marginTop: 4 }}>
            Leave Party
          </button>
        </>
      )}
    </div>
  );
}

// ── Guild Tab ─────────────────────────────────────────────────────────────────

function GuildTab({
  localPlayerId,
  localPlayerName,
}: Omit<SocialPanelProps, "onClose">) {
  const [guild, setGuild] = useState<Guild | null>(() => guildStore.getPlayerGuild(localPlayerId));
  const [guildName, setGuildName] = useState("");
  const [guildTag, setGuildTag] = useState("");
  const [guildChat, setGuildChat] = useState<Array<{ name: string; text: string; t: number }>>([]);
  const [chatInput, setChatInput] = useState("");

  const handleCreate = useCallback(() => {
    if (!guildName.trim() || !guildTag.trim()) return;
    const { guild: newGuild, success, reason } = createGuild(
      localPlayerId, localPlayerName, guildName.trim(), guildTag.trim()
    );
    if (success) {
      guildStore.setGuild(newGuild);
      setGuild(newGuild);
    } else {
      alert(reason);
    }
  }, [localPlayerId, localPlayerName, guildName, guildTag]);

  const handleSendChat = useCallback(() => {
    if (!chatInput.trim() || !guild) return;
    const member = guild.members.find(m => m.entityId === localPlayerId);
    setGuildChat(prev => [
      ...prev.slice(-30),
      { name: member?.name ?? "You", text: chatInput.trim(), t: Date.now() },
    ]);
    setChatInput("");
  }, [chatInput, guild, localPlayerId]);

  return (
    <div style={{ padding: 12, display: "flex", flexDirection: "column", gap: 8 }}>
      {!guild ? (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          <div style={{ color: "#888", fontSize: 11, fontFamily: "monospace", textAlign: "center" }}>
            You are not in a guild
          </div>
          <input
            value={guildName}
            onChange={e => setGuildName(e.target.value)}
            placeholder="Guild name..."
            style={inputStyle}
          />
          <input
            value={guildTag}
            onChange={e => setGuildTag(e.target.value.toUpperCase().slice(0, 5))}
            placeholder="[TAG] 2-5 chars"
            style={inputStyle}
            maxLength={5}
          />
          <button onClick={handleCreate} style={btnStyle("#7c3aed")}>
            🏰 Found Guild
          </button>
        </div>
      ) : (
        <>
          {/* Guild header */}
          <div style={{
            background: "rgba(124,58,237,0.1)",
            border: "1px solid #7c3aed",
            borderRadius: 6,
            padding: "6px 10px",
          }}>
            <div style={{ color: "#f0b429", fontSize: 13, fontFamily: "monospace", fontWeight: "bold" }}>
              [{guild.tag}] {guild.name}
            </div>
            <div style={{ color: "#888", fontSize: 9, fontFamily: "monospace", marginTop: 2 }}>
              Guild Lv.{guild.level} · {guild.members.length} members · 💰 {guild.treasury}g treasury
            </div>
          </div>

          {/* Members list */}
          <div style={{ maxHeight: 120, overflowY: "auto", display: "flex", flexDirection: "column", gap: 3 }}>
            {guild.members.map(m => (
              <div key={m.entityId} style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                background: "rgba(255,255,255,0.03)",
                borderRadius: 4,
                padding: "3px 8px",
                border: `1px solid ${m.entityId === localPlayerId ? "#7c3aed30" : "transparent"}`,
              }}>
                <span style={{ color: "#e0e0e0", fontSize: 10, fontFamily: "monospace" }}>
                  {m.entityId === localPlayerId ? "► " : ""}{m.name}
                </span>
                <span style={{ color: "#888", fontSize: 9, fontFamily: "monospace" }}>
                  {getGuildRank(m)}
                </span>
              </div>
            ))}
          </div>

          {/* Guild chat */}
          <div style={{
            background: "rgba(0,0,0,0.4)",
            border: "1px solid #333",
            borderRadius: 4,
            padding: "6px 8px",
            maxHeight: 80,
            overflowY: "auto",
            display: "flex",
            flexDirection: "column",
            gap: 2,
          }}>
            {guildChat.length === 0 ? (
              <div style={{ color: "#444", fontSize: 9, fontFamily: "monospace" }}>Guild chat...</div>
            ) : (
              guildChat.map((msg, i) => (
                <div key={i} style={{ fontSize: 9, fontFamily: "monospace" }}>
                  <span style={{ color: "#7c3aed" }}>[{guild.tag}] {msg.name}: </span>
                  <span style={{ color: "#ccc" }}>{msg.text}</span>
                </div>
              ))
            )}
          </div>

          <div style={{ display: "flex", gap: 6 }}>
            <input
              value={chatInput}
              onChange={e => setChatInput(e.target.value)}
              onKeyDown={e => e.key === "Enter" && handleSendChat()}
              placeholder="Guild chat..."
              style={inputStyle}
            />
            <button onClick={handleSendChat} style={btnStyle("#7c3aed")}>Send</button>
          </div>
        </>
      )}
    </div>
  );
}

// ── Main Social Panel ─────────────────────────────────────────────────────────

export function SocialPanel(props: SocialPanelProps) {
  const [tab, setTab] = useState<Tab>("party");

  return (
    <div style={{
      position: "absolute",
      bottom: 0,
      left: 0,
      right: 0,
      background: "rgba(15,8,32,0.97)",
      border: "2px solid #7c3aed",
      borderBottom: "none",
      borderRadius: "12px 12px 0 0",
      zIndex: 350,
      maxHeight: 380,
      display: "flex",
      flexDirection: "column",
      boxShadow: "0 -8px 32px rgba(124,58,237,0.2)",
      fontFamily: "monospace",
    }}>
      {/* Header */}
      <div style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        padding: "8px 12px 0",
        borderBottom: "1px solid #333",
      }}>
        <div style={{ display: "flex", gap: 0 }}>
          {(["party", "guild"] as Tab[]).map(t => (
            <button
              key={t}
              onClick={() => setTab(t)}
              style={{
                background: tab === t ? "rgba(124,58,237,0.3)" : "transparent",
                border: "none",
                borderBottom: tab === t ? "2px solid #7c3aed" : "2px solid transparent",
                color: tab === t ? "#c4b5fd" : "#666",
                fontSize: 11,
                fontFamily: "monospace",
                padding: "6px 14px",
                cursor: "pointer",
                letterSpacing: 1,
                textTransform: "uppercase",
              }}
            >
              {t === "party" ? "⚔️ Party" : "🏰 Guild"}
            </button>
          ))}
        </div>
        <button
          onClick={props.onClose}
          style={{
            background: "transparent",
            border: "none",
            color: "#666",
            fontSize: 18,
            cursor: "pointer",
            padding: "4px 8px",
          }}
        >×</button>
      </div>

      {/* Tab content */}
      <div style={{ flex: 1, overflowY: "auto" }}>
        {tab === "party" ? (
          <PartyTab {...props} />
        ) : (
          <GuildTab {...props} />
        )}
      </div>
    </div>
  );
}

// ── Shared Styles ─────────────────────────────────────────────────────────────

function btnStyle(bg: string): CSSProperties {
  return {
    background: bg,
    border: "none",
    borderRadius: 6,
    color: "white",
    fontSize: 10,
    fontFamily: "monospace",
    padding: "6px 12px",
    cursor: "pointer",
    letterSpacing: 0.5,
    whiteSpace: "nowrap",
    minHeight: 28,
  };
}

const inputStyle: CSSProperties = {
  flex: 1,
  background: "rgba(0,0,0,0.5)",
  border: "1px solid #333",
  borderRadius: 4,
  color: "#e0e0e0",
  fontSize: 10,
  padding: "4px 8px",
  fontFamily: "monospace",
  outline: "none",
};
