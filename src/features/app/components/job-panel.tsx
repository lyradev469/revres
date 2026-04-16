"use client";

/**
 * PIXEL REALM ONLINE — Job Advancement Panel
 *
 * Ragnarok-style class selection screen.
 * Shows current job, skill tree, and advancement options.
 */

import { useState, useCallback } from "react";
import type { CSSProperties } from "react";
import type { PlayerJob, JobClass } from "../types";
import {
  JOB_DEFINITIONS,
  JOB_ADVANCEMENT,
  JOB_SKILLS,
  canAdvanceJob,
  advanceJob,
} from "../job-system";
import { SKILLS } from "../skill-system";

interface JobPanelProps {
  job: PlayerJob;
  playerLevel: number;
  onAdvance: (newJob: JobClass) => void;
  onClose: () => void;
}

export function JobPanel({ job, playerLevel, onAdvance, onClose }: JobPanelProps) {
  const [selectedTarget, setSelectedTarget] = useState<JobClass | null>(null);
  const [tab, setTab] = useState<"class" | "skills">("class");

  const currentDef = JOB_DEFINITIONS[job.jobClass];
  const advanceCandidates = JOB_ADVANCEMENT[job.jobClass] ?? [];

  const handleAdvance = useCallback(() => {
    if (!selectedTarget) return;
    const { canAdvance, reason } = canAdvanceJob(job.jobClass, playerLevel, selectedTarget);
    if (!canAdvance) {
      alert(reason ?? "Cannot advance");
      return;
    }
    onAdvance(selectedTarget);
  }, [selectedTarget, job.jobClass, playerLevel, onAdvance]);

  const jobXpPct = (job.jobXp / job.jobXpToNext) * 100;

  return (
    <div style={{
      position: "absolute",
      bottom: 0,
      left: 0,
      right: 0,
      background: "rgba(15,8,32,0.98)",
      border: "2px solid #f0b429",
      borderBottom: "none",
      borderRadius: "12px 12px 0 0",
      zIndex: 400,
      maxHeight: 440,
      display: "flex",
      flexDirection: "column",
      fontFamily: "monospace",
      boxShadow: "0 -8px 32px rgba(240,180,41,0.15)",
    }}>
      {/* Header */}
      <div style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        padding: "8px 14px 0",
        borderBottom: "1px solid #333",
      }}>
        <div style={{ display: "flex", gap: 0 }}>
          {(["class", "skills"] as const).map(t => (
            <button
              key={t}
              onClick={() => setTab(t)}
              style={{
                background: tab === t ? "rgba(240,180,41,0.15)" : "transparent",
                border: "none",
                borderBottom: tab === t ? "2px solid #f0b429" : "2px solid transparent",
                color: tab === t ? "#f0b429" : "#666",
                fontSize: 11,
                fontFamily: "monospace",
                padding: "6px 14px",
                cursor: "pointer",
                letterSpacing: 1,
                textTransform: "uppercase",
              }}
            >
              {t === "class" ? "⚔️ Class" : "✨ Skills"}
            </button>
          ))}
        </div>
        <button
          onClick={onClose}
          style={{ background: "transparent", border: "none", color: "#666", fontSize: 18, cursor: "pointer", padding: "4px 8px" }}
        >×</button>
      </div>

      <div style={{ flex: 1, overflowY: "auto", padding: 12 }}>
        {tab === "class" ? (
          <ClassTab
            job={job}
            playerLevel={playerLevel}
            currentDef={currentDef}
            advanceCandidates={advanceCandidates}
            selectedTarget={selectedTarget}
            onSelect={setSelectedTarget}
            onAdvance={handleAdvance}
            jobXpPct={jobXpPct}
          />
        ) : (
          <SkillsTab job={job} />
        )}
      </div>
    </div>
  );
}

// ── Class Tab ────────────────────────────────────────────────────────────────

function ClassTab({
  job,
  playerLevel,
  currentDef,
  advanceCandidates,
  selectedTarget,
  onSelect,
  onAdvance,
  jobXpPct,
}: {
  job: PlayerJob;
  playerLevel: number;
  currentDef: (typeof JOB_DEFINITIONS)[JobClass];
  advanceCandidates: JobClass[];
  selectedTarget: JobClass | null;
  onSelect: (j: JobClass) => void;
  onAdvance: () => void;
  jobXpPct: number;
}) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      {/* Current job */}
      <div style={{
        background: "rgba(240,180,41,0.08)",
        border: "1px solid #8b6914",
        borderRadius: 8,
        padding: "8px 12px",
        display: "flex",
        gap: 12,
        alignItems: "center",
      }}>
        <span style={{ fontSize: 28 }}>{currentDef.icon}</span>
        <div style={{ flex: 1 }}>
          <div style={{ color: "#f0b429", fontSize: 13, fontWeight: "bold" }}>
            {currentDef.name}
          </div>
          <div style={{ color: "#888", fontSize: 9, marginTop: 2 }}>
            Job Lv.{job.jobLevel} · {job.jobXp}/{job.jobXpToNext} JXP · {job.skillPoints} skill pts
          </div>
          {/* Job XP bar */}
          <div style={{
            marginTop: 4, height: 4,
            background: "rgba(0,0,0,0.5)",
            borderRadius: 2, overflow: "hidden",
          }}>
            <div style={{
              width: `${jobXpPct}%`,
              height: "100%",
              background: "#f0b429",
              borderRadius: 2,
            }} />
          </div>
        </div>
        <div style={{ textAlign: "right" }}>
          <div style={{ color: "#c4b5fd", fontSize: 9 }}>
            {job.sp}/{job.maxSp} SP
          </div>
          <div style={{ color: "#888", fontSize: 9 }}>
            Lv.{playerLevel} char
          </div>
        </div>
      </div>

      {/* Stat scaling */}
      <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
        {Object.entries(currentDef.statScaling).map(([stat, val]) => (
          <div key={stat} style={{
            background: "rgba(255,255,255,0.05)",
            border: "1px solid #333",
            borderRadius: 4,
            padding: "2px 8px",
            fontSize: 9,
            color: val > 2 ? "#22cc22" : val > 0 ? "#aaa" : "#555",
          }}>
            {stat.toUpperCase()} +{val * Math.floor(playerLevel / 10)}
          </div>
        ))}
      </div>

      {/* Advancement options */}
      {advanceCandidates.length > 0 && (
        <>
          <div style={{ color: "#888", fontSize: 10, borderTop: "1px solid #222", paddingTop: 8, marginTop: 2 }}>
            Advancement options (need Lv.{currentDef.advancementLevel}):
          </div>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            {advanceCandidates.map(jobClass => {
              const def = JOB_DEFINITIONS[jobClass];
              const { canAdvance } = canAdvanceJob(job.jobClass, playerLevel, jobClass);
              const isSelected = selectedTarget === jobClass;
              return (
                <button
                  key={jobClass}
                  onClick={() => onSelect(jobClass)}
                  style={{
                    background: isSelected ? "rgba(124,58,237,0.3)" : "rgba(255,255,255,0.04)",
                    border: `2px solid ${isSelected ? "#7c3aed" : canAdvance ? "#444" : "#222"}`,
                    borderRadius: 8,
                    padding: "8px 12px",
                    cursor: canAdvance ? "pointer" : "not-allowed",
                    opacity: canAdvance ? 1 : 0.45,
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    gap: 4,
                    minWidth: 80,
                  }}
                >
                  <span style={{ fontSize: 22 }}>{def.icon}</span>
                  <span style={{ color: "#e0e0e0", fontSize: 10, fontFamily: "monospace" }}>{def.name}</span>
                  <span style={{ color: "#888", fontSize: 8 }}>
                    +{def.hpBonus}HP +{def.spBonus}SP
                  </span>
                </button>
              );
            })}
          </div>

          {selectedTarget && (
            <button
              onClick={onAdvance}
              style={{
                background: "linear-gradient(135deg, #7c3aed, #4f46e5)",
                border: "none",
                borderRadius: 8,
                color: "white",
                fontSize: 12,
                fontFamily: "monospace",
                padding: "10px",
                cursor: "pointer",
                letterSpacing: 1,
                fontWeight: "bold",
              }}
            >
              ▶ Advance to {JOB_DEFINITIONS[selectedTarget].name}
            </button>
          )}
        </>
      )}

      {advanceCandidates.length === 0 && (
        <div style={{ color: "#555", fontSize: 10, textAlign: "center", padding: 8 }}>
          This is the final tier for this class tree.
        </div>
      )}
    </div>
  );
}

// ── Skills Tab ────────────────────────────────────────────────────────────────

function SkillsTab({ job }: { job: PlayerJob }) {
  const classSkills = JOB_SKILLS[job.jobClass] ?? [];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
      <div style={{ color: "#f0b429", fontSize: 10, marginBottom: 4 }}>
        Available skills for {JOB_DEFINITIONS[job.jobClass].name}:
      </div>
      {classSkills.map(skillId => {
        const def = SKILLS[skillId];
        const unlocked = job.unlockedSkills.includes(skillId);
        return (
          <div key={skillId} style={{
            background: unlocked ? "rgba(124,58,237,0.1)" : "rgba(255,255,255,0.03)",
            border: `1px solid ${unlocked ? "#7c3aed50" : "#222"}`,
            borderRadius: 6,
            padding: "6px 10px",
            display: "flex",
            gap: 10,
            alignItems: "flex-start",
            opacity: unlocked ? 1 : 0.5,
          }}>
            <span style={{ fontSize: 20, minWidth: 24 }}>{def.icon}</span>
            <div style={{ flex: 1 }}>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span style={{ color: "#e0e0e0", fontSize: 11 }}>{def.name}</span>
                <span style={{ color: "#7c3aed", fontSize: 9 }}>
                  {def.spCost}SP
                  {def.castTime > 0 ? ` · ${(def.castTime/1000).toFixed(1)}s` : " · instant"}
                </span>
              </div>
              <div style={{ color: "#888", fontSize: 9, marginTop: 2, lineHeight: 1.4 }}>
                {def.description}
              </div>
              <div style={{ display: "flex", gap: 6, marginTop: 4, flexWrap: "wrap" }}>
                {def.damage > 0 && (
                  <span style={tagStyle}>{Math.round(def.damage * 100)}% dmg</span>
                )}
                {def.range > 0 && (
                  <span style={tagStyle}>{def.range}px range</span>
                )}
                {def.statusEffect && (
                  <span style={{ ...tagStyle, color: "#fbbf24", borderColor: "#7a5020" }}>
                    {def.statusEffect}
                  </span>
                )}
                {def.aoeRadius && (
                  <span style={tagStyle}>AoE {def.aoeRadius}px</span>
                )}
              </div>
            </div>
            {unlocked && (
              <span style={{ color: "#22cc22", fontSize: 10 }}>✓</span>
            )}
          </div>
        );
      })}
    </div>
  );
}

const tagStyle: CSSProperties = {
  background: "rgba(255,255,255,0.05)",
  border: "1px solid #333",
  borderRadius: 3,
  padding: "1px 5px",
  fontSize: 8,
  color: "#888",
};
