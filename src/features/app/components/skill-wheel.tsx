"use client";

/**
 * PIXEL REALM ONLINE — Skill Wheel
 *
 * Radial skill selector rendered as a PixiJS-style overlay.
 * Shows up to 8 skills arranged in a ring. Tap to cast.
 * Shows cooldown arcs and SP cost.
 */

import { useState, useCallback, useEffect, useRef } from "react";
import type { SkillId, PlayerJob } from "../types";
import { SKILLS, isSkillOnCooldown, getCooldownPercent } from "../skill-system";
import type { SkillState } from "../skill-system";

interface SkillWheelProps {
  job: PlayerJob;
  skillState: SkillState;
  onCastSkill: (skillId: SkillId) => void;
  disabled?: boolean;
}

function CooldownArc({ percent }: { percent: number }) {
  if (percent <= 0) return null;
  const r = 22;
  const circ = 2 * Math.PI * r;
  const dashOffset = circ * (1 - percent);
  return (
    <svg
      style={{ position: "absolute", inset: 0, width: "100%", height: "100%", transform: "rotate(-90deg)" }}
      viewBox="0 0 52 52"
    >
      <circle
        cx="26" cy="26" r={r}
        fill="none"
        stroke="rgba(0,0,0,0.6)"
        strokeWidth="52"
      />
      <circle
        cx="26" cy="26" r={r}
        fill="none"
        stroke="rgba(100,100,255,0.4)"
        strokeWidth="52"
        strokeDasharray={circ}
        strokeDashoffset={dashOffset}
        style={{ transition: "stroke-dashoffset 0.1s linear" }}
      />
    </svg>
  );
}

export function SkillWheel({ job, skillState, onCastSkill, disabled = false }: SkillWheelProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [now, setNow] = useState(Date.now);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Update cooldown display every 100ms
  useEffect(() => {
    if (isOpen) {
      timerRef.current = setInterval(() => setNow(Date.now()), 100);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
    }
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [isOpen]);

  const slots = job.unlockedSkills.slice(0, 8);

  const handleCast = useCallback((skillId: SkillId) => {
    if (disabled) return;
    if (isSkillOnCooldown(skillState, skillId, now)) return;
    const def = SKILLS[skillId];
    if (!def) return;
    if (job.sp < def.spCost) return;
    onCastSkill(skillId);
    setIsOpen(false);
  }, [disabled, skillState, now, job.sp, onCastSkill]);

  // Radial positions for up to 8 skills
  const ANGLES = [270, 315, 0, 45, 90, 135, 180, 225];
  const RADIUS = 72;

  return (
    <div
      style={{
        position: "relative",
        zIndex: 250,
        pointerEvents: "all",
        flexShrink: 0,
      }}
    >
      {/* Skill wheel overlay — pops upward from the action bar */}
      {isOpen && (
        <div
          style={{
            position: "absolute",
            bottom: 60,
            left: "50%",
            transform: "translateX(-50%)",
            width: RADIUS * 2 + 60,
            height: RADIUS * 2 + 60,
            pointerEvents: "none",
          }}
        >
          {slots.map((skillId, i) => {
            const angle = (ANGLES[i] ?? (i * 45)) * (Math.PI / 180);
            const cx = RADIUS * Math.cos(angle);
            const cy = RADIUS * Math.sin(angle);
            const def = SKILLS[skillId];
            if (!def) return null;

            const onCd = isSkillOnCooldown(skillState, skillId, now);
            const cdPct = getCooldownPercent(skillState, skillId, now);
            const noSp = job.sp < def.spCost;

            return (
              <button
                key={skillId}
                onClick={() => handleCast(skillId)}
                title={`${def.name} — ${def.spCost} SP${def.castTime > 0 ? ` — ${(def.castTime/1000).toFixed(1)}s cast` : ""}\n${def.description}`}
                style={{
                  position: "absolute",
                  bottom: RADIUS + cy,
                  right: RADIUS + cx,
                  width: 52,
                  height: 52,
                  transform: "translate(50%, 50%)",
                  borderRadius: "50%",
                  background: onCd || noSp
                    ? "rgba(30,20,50,0.85)"
                    : "rgba(20,10,50,0.9)",
                  border: `2px solid ${onCd ? "#444" : noSp ? "#666" : "#a78bfa"}`,
                  cursor: onCd || noSp ? "not-allowed" : "pointer",
                  pointerEvents: "all",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  flexDirection: "column",
                  gap: 1,
                  overflow: "hidden",
                  opacity: onCd || noSp ? 0.55 : 1,
                  boxShadow: onCd || noSp ? "none" : "0 0 10px #a78bfa50",
                }}
              >
                {/* Cooldown arc overlay */}
                {onCd && <CooldownArc percent={cdPct} />}

                <span style={{ fontSize: 18, lineHeight: 1, position: "relative", zIndex: 1 }}>
                  {def.icon}
                </span>
                <span style={{
                  fontSize: 6,
                  color: noSp ? "#f87171" : "#c4b5fd",
                  fontFamily: "monospace",
                  lineHeight: 1,
                  position: "relative",
                  zIndex: 1,
                  whiteSpace: "nowrap",
                }}>
                  {def.spCost}SP
                </span>
              </button>
            );
          })}
        </div>
      )}

      {/* Main skill wheel toggle button */}
      <button
        onClick={() => setIsOpen(v => !v)}
        style={{
          width: 52,
          height: 52,
          borderRadius: "50%",
          background: isOpen
            ? "linear-gradient(135deg, #7c3aed, #6366f1)"
            : "rgba(30,10,60,0.85)",
          border: `2px solid ${isOpen ? "#c4b5fd" : "#7c3aed"}`,
          color: "white",
          fontSize: 20,
          cursor: "pointer",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          boxShadow: isOpen ? "0 0 20px #7c3aed60" : "0 0 8px #7c3aed30",
          transition: "all 0.15s ease",
        }}
      >
        ✨
      </button>

      {/* SP indicator below button */}
      <div style={{
        textAlign: "center",
        marginTop: 3,
        fontSize: 7,
        color: "#a78bfa",
        fontFamily: "monospace",
        whiteSpace: "nowrap",
        letterSpacing: 0.3,
      }}>
        {job.sp}/{job.maxSp} SP
      </div>
    </div>
  );
}
