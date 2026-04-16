/**
 * PIXEL REALM ONLINE — Job System (Ragnarok-Style)
 *
 * Class tree:
 *   Novice →
 *     Swordsman → Knight → Lord Knight
 *     Mage      → Wizard → High Wizard
 *     Archer    → Hunter → Sniper
 */

import type {
  JobClass,
  JobDefinition,
  PlayerJob,
  SkillId,
} from "./types";

// ── Job Definitions ────────────────────────────────────────────────────────────

export const JOB_DEFINITIONS: Record<JobClass, JobDefinition> = {
  novice: {
    id: "novice",
    name: "Novice",
    tier: "novice",
    icon: "🧑",
    statScaling: { str: 1, int: 1, dex: 1, vit: 1, agi: 1 },
    skillSlots: 2,
    hpBonus: 0,
    spBonus: 0,
    advancementLevel: 10,
  },

  // ── Swordsman branch ─────────────────────────────────────────────────────────
  swordsman: {
    id: "swordsman",
    name: "Swordsman",
    tier: "first",
    icon: "⚔️",
    statScaling: { str: 3, int: 0, dex: 1, vit: 2, agi: 2 },
    skillSlots: 4,
    hpBonus: 30,
    spBonus: 10,
    advancementLevel: 40,
  },
  knight: {
    id: "knight",
    name: "Knight",
    tier: "second",
    icon: "🛡️",
    statScaling: { str: 4, int: 0, dex: 1, vit: 4, agi: 2 },
    skillSlots: 6,
    hpBonus: 80,
    spBonus: 20,
    advancementLevel: 99,
  },
  lord_knight: {
    id: "lord_knight",
    name: "Lord Knight",
    tier: "second",
    icon: "👑",
    statScaling: { str: 5, int: 0, dex: 1, vit: 5, agi: 3 },
    skillSlots: 8,
    hpBonus: 150,
    spBonus: 30,
    advancementLevel: 99,
  },

  // ── Mage branch ──────────────────────────────────────────────────────────────
  mage: {
    id: "mage",
    name: "Mage",
    tier: "first",
    icon: "🔮",
    statScaling: { str: 0, int: 4, dex: 2, vit: 0, agi: 1 },
    skillSlots: 4,
    hpBonus: 10,
    spBonus: 50,
    advancementLevel: 40,
  },
  wizard: {
    id: "wizard",
    name: "Wizard",
    tier: "second",
    icon: "🌪️",
    statScaling: { str: 0, int: 5, dex: 2, vit: 0, agi: 1 },
    skillSlots: 6,
    hpBonus: 20,
    spBonus: 100,
    advancementLevel: 99,
  },
  high_wizard: {
    id: "high_wizard",
    name: "High Wizard",
    tier: "second",
    icon: "✨",
    statScaling: { str: 0, int: 7, dex: 2, vit: 0, agi: 1 },
    skillSlots: 8,
    hpBonus: 30,
    spBonus: 200,
    advancementLevel: 99,
  },

  // ── Archer branch ────────────────────────────────────────────────────────────
  archer: {
    id: "archer",
    name: "Archer",
    tier: "first",
    icon: "🏹",
    statScaling: { str: 1, int: 0, dex: 4, vit: 1, agi: 3 },
    skillSlots: 4,
    hpBonus: 20,
    spBonus: 30,
    advancementLevel: 40,
  },
  hunter: {
    id: "hunter",
    name: "Hunter",
    tier: "second",
    icon: "🦅",
    statScaling: { str: 1, int: 0, dex: 5, vit: 1, agi: 4 },
    skillSlots: 6,
    hpBonus: 40,
    spBonus: 60,
    advancementLevel: 99,
  },
  sniper: {
    id: "sniper",
    name: "Sniper",
    tier: "second",
    icon: "🎯",
    statScaling: { str: 1, int: 0, dex: 7, vit: 1, agi: 5 },
    skillSlots: 8,
    hpBonus: 60,
    spBonus: 80,
    advancementLevel: 99,
  },
};

// ── Class Advancement Tree ─────────────────────────────────────────────────────

export const JOB_ADVANCEMENT: Partial<Record<JobClass, JobClass[]>> = {
  novice:    ["swordsman", "mage", "archer"],
  swordsman: ["knight"],
  knight:    ["lord_knight"],
  mage:      ["wizard"],
  wizard:    ["high_wizard"],
  archer:    ["hunter"],
  hunter:    ["sniper"],
};

export const JOB_PARENT: Partial<Record<JobClass, JobClass>> = {
  swordsman: "novice",
  mage:      "novice",
  archer:    "novice",
  knight:    "swordsman",
  lord_knight: "knight",
  wizard:    "mage",
  high_wizard: "wizard",
  hunter:    "archer",
  sniper:    "hunter",
};

// ── Skill availability per job ─────────────────────────────────────────────────

export const JOB_SKILLS: Partial<Record<JobClass, SkillId[]>> = {
  novice:      ["first_aid"],
  swordsman:   ["bash", "provoke", "endure", "magnum_break"],
  knight:      ["bash", "provoke", "endure", "magnum_break", "shield_bash", "spiral_pierce"],
  lord_knight: ["bash", "provoke", "endure", "magnum_break", "shield_bash", "spiral_pierce", "war_cry"],
  mage:        ["fire_bolt", "cold_bolt", "thunder_bolt"],
  wizard:      ["fire_bolt", "cold_bolt", "thunder_bolt", "fire_wall", "storm_gust"],
  high_wizard: ["fire_bolt", "cold_bolt", "thunder_bolt", "fire_wall", "storm_gust", "meteor_storm"],
  archer:      ["double_strafe", "arrow_shower"],
  hunter:      ["double_strafe", "arrow_shower", "ankle_snare"],
  sniper:      ["double_strafe", "arrow_shower", "ankle_snare", "falcon_assault"],
};

// ── Default starting job ───────────────────────────────────────────────────────

export function createDefaultJob(): PlayerJob {
  return {
    jobClass: "novice",
    jobLevel: 1,
    jobXp: 0,
    jobXpToNext: 100,
    unlockedSkills: ["first_aid"],
    skillPoints: 0,
    sp: 50,
    maxSp: 50,
  };
}

// ── Check if player can advance ────────────────────────────────────────────────

export function canAdvanceJob(
  currentJob: JobClass,
  playerLevel: number,
  targetJob: JobClass
): { canAdvance: boolean; reason?: string } {
  const def = JOB_DEFINITIONS[currentJob];
  const validTargets = JOB_ADVANCEMENT[currentJob] ?? [];

  if (!validTargets.includes(targetJob)) {
    return { canAdvance: false, reason: `${targetJob} is not a valid advancement from ${currentJob}` };
  }
  if (playerLevel < def.advancementLevel) {
    return {
      canAdvance: false,
      reason: `Need level ${def.advancementLevel} to advance (you are level ${playerLevel})`,
    };
  }
  return { canAdvance: true };
}

// ── Advance job class ──────────────────────────────────────────────────────────

export function advanceJob(job: PlayerJob, targetJob: JobClass, playerLevel: number): PlayerJob {
  const { canAdvance } = canAdvanceJob(job.jobClass, playerLevel, targetJob);
  if (!canAdvance) return job;

  const newDef = JOB_DEFINITIONS[targetJob];
  const newSkills = JOB_SKILLS[targetJob] ?? [];

  return {
    ...job,
    jobClass: targetJob,
    jobLevel: 1,
    jobXp: 0,
    jobXpToNext: 200,
    unlockedSkills: newSkills,
    skillPoints: job.skillPoints + 3, // bonus SP on advancement
    maxSp: 50 + newDef.spBonus,
    sp: 50 + newDef.spBonus,
  };
}

// ── Apply stat bonuses from job ────────────────────────────────────────────────

export function getJobStatBonus(jobClass: JobClass, level: number): {
  atkBonus: number;
  defBonus: number;
  hpBonus: number;
  spBonus: number;
} {
  const def = JOB_DEFINITIONS[jobClass];
  const scale = Math.floor(level / 10);
  return {
    atkBonus: (def.statScaling.str + def.statScaling.dex) * scale,
    defBonus: (def.statScaling.vit) * scale,
    hpBonus:  def.hpBonus + def.statScaling.vit * level * 2,
    spBonus:  def.spBonus + def.statScaling.int * level * 3,
  };
}

// ── Job XP gain ───────────────────────────────────────────────────────────────

export function gainJobXp(job: PlayerJob, amount: number): PlayerJob {
  let newXp = job.jobXp + amount;
  let newJobLevel = job.jobLevel;
  let newJobXpToNext = job.jobXpToNext;
  let newSkillPoints = job.skillPoints;

  while (newXp >= newJobXpToNext) {
    newXp -= newJobXpToNext;
    newJobLevel++;
    newJobXpToNext = Math.round(newJobXpToNext * 1.3);
    newSkillPoints++; // gain 1 skill point per job level
  }

  return {
    ...job,
    jobXp: newXp,
    jobLevel: newJobLevel,
    jobXpToNext: newJobXpToNext,
    skillPoints: newSkillPoints,
  };
}
