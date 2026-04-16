"use client";

/**
 * PIXEL REALM ONLINE — Cast Bar
 *
 * Shown while a skill is being cast. Appears centered above the player.
 * Interrupted by movement or damage.
 */

import { useEffect, useState } from "react";
import type { CastState } from "../types";
import { SKILLS } from "../skill-system";

interface CastBarProps {
  castState: CastState | null;
}

export function CastBar({ castState }: CastBarProps) {
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    if (!castState) {
      setProgress(0);
      return;
    }

    const update = () => {
      const elapsed = Date.now() - castState.startTime;
      const pct = Math.min(1, elapsed / castState.duration);
      setProgress(pct);
    };

    const interval = setInterval(update, 30);
    update();
    return () => clearInterval(interval);
  }, [castState]);

  if (!castState) return null;

  const def = SKILLS[castState.skillId];
  const remaining = Math.max(0, (castState.duration - (Date.now() - castState.startTime)) / 1000);

  return (
    <div
      style={{
        position: "absolute",
        top: "38%",
        left: "50%",
        transform: "translate(-50%, -50%)",
        zIndex: 400,
        pointerEvents: "none",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: 6,
      }}
    >
      {/* Skill name + icon */}
      <div style={{
        background: "rgba(15, 8, 32, 0.92)",
        border: "1px solid #7c3aed",
        borderRadius: 6,
        padding: "4px 12px",
        display: "flex",
        alignItems: "center",
        gap: 8,
        boxShadow: "0 0 16px #7c3aed40",
      }}>
        <span style={{ fontSize: 20 }}>{def?.icon ?? "✨"}</span>
        <div>
          <div style={{
            color: "#f0b429",
            fontSize: 12,
            fontFamily: "monospace",
            fontWeight: "bold",
            letterSpacing: 1,
          }}>
            {castState.skillName}
          </div>
          <div style={{
            color: "#888",
            fontSize: 9,
            fontFamily: "monospace",
          }}>
            Casting... {remaining.toFixed(1)}s
          </div>
        </div>
      </div>

      {/* Cast progress bar */}
      <div style={{
        width: 200,
        height: 8,
        background: "rgba(0,0,0,0.7)",
        borderRadius: 4,
        border: "1px solid #4a2a7a",
        overflow: "hidden",
        boxShadow: "0 0 8px #7c3aed30",
      }}>
        <div style={{
          width: `${progress * 100}%`,
          height: "100%",
          background: "linear-gradient(90deg, #7c3aed, #c084fc)",
          borderRadius: 4,
          boxShadow: "0 0 6px #a78bfa",
          transition: "width 0.03s linear",
        }} />
      </div>

      {/* Interrupt hint */}
      <div style={{
        color: "rgba(255,100,100,0.6)",
        fontSize: 8,
        fontFamily: "monospace",
        letterSpacing: 0.5,
      }}>
        Move or take damage to interrupt
      </div>
    </div>
  );
}
