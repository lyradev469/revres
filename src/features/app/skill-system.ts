/**
 * PIXEL REALM ONLINE — Skill System
 *
 * Complete skill definitions, casting logic, cooldown management,
 * status effect application, and combo chains.
 */

import type {
  SkillId,
  SkillDefinition,
  ActiveSkill,
  StatusEffect,
  EntityId,
} from "./types";

// ── Skill Definitions ─────────────────────────────────────────────────────────

export const SKILLS: Record<SkillId, SkillDefinition> = {

  // ── Universal ──────────────────────────────────────────────────────────────
  first_aid: {
    id: "first_aid",
    name: "First Aid",
    icon: "💊",
    description: "Instantly restore 50 HP. No cast time.",
    jobRequired: "novice",
    levelRequired: 1,
    spCost: 5,
    castTime: 0,
    cooldown: 8000,
    range: 0,
    damage: 0,
    targetType: "self",
    healAmount: 50,
  },
  regen: {
    id: "regen",
    name: "Regen",
    icon: "🌿",
    description: "Restore HP over time for 10 seconds.",
    jobRequired: "novice",
    levelRequired: 5,
    spCost: 10,
    castTime: 0,
    cooldown: 20000,
    range: 0,
    damage: 0,
    targetType: "self",
    healAmount: 100,
  },
  war_cry: {
    id: "war_cry",
    name: "War Cry",
    icon: "📯",
    description: "Boost ATK of all nearby allies for 15 seconds.",
    jobRequired: "lord_knight",
    levelRequired: 60,
    spCost: 40,
    castTime: 0,
    cooldown: 60000,
    range: 128,
    damage: 0,
    targetType: "aoe",
    aoeRadius: 160,
  },

  // ── Swordsman / Knight / Lord Knight ──────────────────────────────────────
  bash: {
    id: "bash",
    name: "Bash",
    icon: "💥",
    description: "A powerful melee strike that deals 170% ATK damage. 10% chance to stun.",
    jobRequired: "swordsman",
    levelRequired: 1,
    spCost: 8,
    castTime: 0,
    cooldown: 1500,
    range: 64,
    damage: 1.7,
    targetType: "single",
    statusEffect: "stun",
    statusChance: 0.10,
  },
  provoke: {
    id: "provoke",
    name: "Provoke",
    icon: "😤",
    description: "Force a monster to target you. Increases your DEF by 20% for 8 seconds.",
    jobRequired: "swordsman",
    levelRequired: 5,
    spCost: 5,
    castTime: 0,
    cooldown: 5000,
    range: 96,
    damage: 0,
    targetType: "single",
  },
  endure: {
    id: "endure",
    name: "Endure",
    icon: "🛡️",
    description: "Become temporarily immune to knockback and flinch for 3 seconds.",
    jobRequired: "swordsman",
    levelRequired: 10,
    spCost: 10,
    castTime: 0,
    cooldown: 15000,
    range: 0,
    damage: 0,
    targetType: "self",
  },
  magnum_break: {
    id: "magnum_break",
    name: "Magnum Break",
    icon: "🔥",
    description: "Melee AoE fire burst. Deals 150% ATK to all enemies in range. Burns targets.",
    jobRequired: "swordsman",
    levelRequired: 20,
    spCost: 30,
    castTime: 500,
    cooldown: 8000,
    range: 80,
    damage: 1.5,
    targetType: "aoe",
    aoeRadius: 80,
    statusEffect: "burn",
    statusChance: 0.4,
  },
  shield_bash: {
    id: "shield_bash",
    name: "Shield Bash",
    icon: "🛡️",
    description: "Slam your shield into an enemy. Stuns for 2 seconds. 250% ATK.",
    jobRequired: "knight",
    levelRequired: 40,
    spCost: 20,
    castTime: 0,
    cooldown: 12000,
    range: 64,
    damage: 2.5,
    targetType: "single",
    statusEffect: "stun",
    statusChance: 0.6,
  },
  spiral_pierce: {
    id: "spiral_pierce",
    name: "Spiral Pierce",
    icon: "🌀",
    description: "Pierce through multiple enemies in a line. 300% ATK to each target.",
    jobRequired: "knight",
    levelRequired: 50,
    spCost: 35,
    castTime: 800,
    cooldown: 15000,
    range: 192,
    damage: 3.0,
    targetType: "single",
  },

  // ── Mage / Wizard / High Wizard ───────────────────────────────────────────
  fire_bolt: {
    id: "fire_bolt",
    name: "Fire Bolt",
    icon: "🔥",
    description: "Launch a fire bolt. 120% INT damage. Burns on hit (30% chance).",
    jobRequired: "mage",
    levelRequired: 1,
    spCost: 15,
    castTime: 600,
    cooldown: 1200,
    range: 256,
    damage: 1.2,
    targetType: "single",
    statusEffect: "burn",
    statusChance: 0.3,
  },
  cold_bolt: {
    id: "cold_bolt",
    name: "Cold Bolt",
    icon: "❄️",
    description: "Ice projectile that slows target by 40% for 3 seconds. 110% INT damage.",
    jobRequired: "mage",
    levelRequired: 5,
    spCost: 15,
    castTime: 600,
    cooldown: 1200,
    range: 256,
    damage: 1.1,
    targetType: "single",
    statusEffect: "slow",
    statusChance: 0.5,
  },
  thunder_bolt: {
    id: "thunder_bolt",
    name: "Thunder Bolt",
    icon: "⚡",
    description: "Lightning strike with 20% stun chance. 130% INT damage.",
    jobRequired: "mage",
    levelRequired: 10,
    spCost: 20,
    castTime: 800,
    cooldown: 2000,
    range: 320,
    damage: 1.3,
    targetType: "single",
    statusEffect: "stun",
    statusChance: 0.2,
  },
  fire_wall: {
    id: "fire_wall",
    name: "Fire Wall",
    icon: "🧱",
    description: "Create a wall of flames that burns all who pass through. AoE zone 10 seconds.",
    jobRequired: "wizard",
    levelRequired: 40,
    spCost: 40,
    castTime: 1500,
    cooldown: 20000,
    range: 192,
    damage: 0.8,
    targetType: "ground",
    aoeRadius: 48,
    statusEffect: "burn",
    statusChance: 0.9,
  },
  storm_gust: {
    id: "storm_gust",
    name: "Storm Gust",
    icon: "🌪️",
    description: "Massive wind storm. Hits all enemies in AoE 9 times. Freezes (40%).",
    jobRequired: "wizard",
    levelRequired: 50,
    spCost: 60,
    castTime: 2000,
    cooldown: 30000,
    range: 256,
    damage: 0.6,
    targetType: "aoe",
    aoeRadius: 128,
    statusEffect: "freeze",
    statusChance: 0.4,
  },
  meteor_storm: {
    id: "meteor_storm",
    name: "Meteor Storm",
    icon: "☄️",
    description: "Rain meteors on a target area. Massive AoE damage over 5 seconds.",
    jobRequired: "high_wizard",
    levelRequired: 80,
    spCost: 100,
    castTime: 3000,
    cooldown: 60000,
    range: 320,
    damage: 2.0,
    targetType: "ground",
    aoeRadius: 160,
    statusEffect: "stun",
    statusChance: 0.15,
  },

  // ── Archer / Hunter / Sniper ──────────────────────────────────────────────
  double_strafe: {
    id: "double_strafe",
    name: "Double Strafe",
    icon: "🏹",
    description: "Fire two arrows simultaneously. 180% DEX damage total.",
    jobRequired: "archer",
    levelRequired: 1,
    spCost: 12,
    castTime: 0,
    cooldown: 1000,
    range: 288,
    damage: 1.8,
    targetType: "single",
  },
  arrow_shower: {
    id: "arrow_shower",
    name: "Arrow Shower",
    icon: "🌧️",
    description: "Unleash a volley of arrows hitting all enemies in AoE. 140% DEX each.",
    jobRequired: "archer",
    levelRequired: 15,
    spCost: 25,
    castTime: 500,
    cooldown: 8000,
    range: 256,
    damage: 1.4,
    targetType: "aoe",
    aoeRadius: 96,
  },
  ankle_snare: {
    id: "ankle_snare",
    name: "Ankle Snare",
    icon: "🕸️",
    description: "Set a trap that immobilizes the first enemy to step on it.",
    jobRequired: "hunter",
    levelRequired: 40,
    spCost: 15,
    castTime: 0,
    cooldown: 12000,
    range: 128,
    damage: 0,
    targetType: "ground",
    statusEffect: "stun",
    statusChance: 1.0,
  },
  falcon_assault: {
    id: "falcon_assault",
    name: "Falcon Assault",
    icon: "🦅",
    description: "Send your falcon to strike a target for 500% DEX damage. Ignores DEF.",
    jobRequired: "sniper",
    levelRequired: 80,
    spCost: 50,
    castTime: 0,
    cooldown: 30000,
    range: 384,
    damage: 5.0,
    targetType: "single",
  },
};

// ── Skill Queue / Cooldown Manager ────────────────────────────────────────────

export interface SkillState {
  activeSkills: Map<SkillId, ActiveSkill>;
  casting: { skillId: SkillId; startTime: number; duration: number; targetId?: EntityId } | null;
}

export function createSkillState(): SkillState {
  return {
    activeSkills: new Map(),
    casting: null,
  };
}

export function isSkillOnCooldown(state: SkillState, skillId: SkillId, now: number): boolean {
  const active = state.activeSkills.get(skillId);
  if (!active) return false;
  return now < active.cooldownUntil;
}

export function getCooldownRemaining(state: SkillState, skillId: SkillId, now: number): number {
  const active = state.activeSkills.get(skillId);
  if (!active) return 0;
  return Math.max(0, active.cooldownUntil - now);
}

export function getCooldownPercent(state: SkillState, skillId: SkillId, now: number): number {
  const def = SKILLS[skillId];
  if (!def) return 0;
  const remaining = getCooldownRemaining(state, skillId, now);
  if (remaining <= 0) return 0;
  return remaining / def.cooldown;
}

export function startCast(
  state: SkillState,
  skillId: SkillId,
  now: number,
  targetId?: EntityId
): SkillState {
  const def = SKILLS[skillId];
  if (!def) return state;
  if (isSkillOnCooldown(state, skillId, now)) return state;

  if (def.castTime === 0) {
    // Instant — apply cooldown immediately
    const newActive = new Map(state.activeSkills);
    newActive.set(skillId, { skillId, cooldownUntil: now + def.cooldown });
    return { ...state, activeSkills: newActive, casting: null };
  }

  return {
    ...state,
    casting: { skillId, startTime: now, duration: def.castTime, targetId },
  };
}

export function interruptCast(state: SkillState): SkillState {
  if (!state.casting) return state;
  return { ...state, casting: null };
}

export function completeCast(state: SkillState, now: number): { newState: SkillState; skillId: SkillId | null } {
  if (!state.casting) return { newState: state, skillId: null };

  const elapsed = now - state.casting.startTime;
  if (elapsed < state.casting.duration) {
    return { newState: state, skillId: null }; // not done yet
  }

  const { skillId } = state.casting;
  const def = SKILLS[skillId];
  const newActive = new Map(state.activeSkills);
  newActive.set(skillId, { skillId, cooldownUntil: now + def.cooldown });

  return {
    newState: { ...state, activeSkills: newActive, casting: null },
    skillId,
  };
}

// ── Damage calculation ────────────────────────────────────────────────────────

export interface SkillDamageResult {
  damage: number;
  isCrit: boolean;
  statusApplied?: StatusEffect;
}

export function calculateSkillDamage(
  skillId: SkillId,
  attackerAtk: number,
  defenderDef: number,
  critChance = 0.05
): SkillDamageResult {
  const def = SKILLS[skillId];
  if (!def) return { damage: 0, isCrit: false };

  const isCrit = Math.random() < critChance;
  const base = attackerAtk * def.damage * (isCrit ? 1.8 : 1);
  const reduced = Math.max(1, Math.round(base - defenderDef * 0.4));
  const damage = Math.round(reduced * (0.9 + Math.random() * 0.2)); // ±10% variance

  let statusApplied: StatusEffect | undefined;
  if (def.statusEffect && def.statusChance && Math.random() < def.statusChance) {
    statusApplied = def.statusEffect;
  }

  return { damage, isCrit, statusApplied };
}

// ── Skill combos ─────────────────────────────────────────────────────────────

export const SKILL_COMBOS: Array<{
  sequence: [SkillId, SkillId];
  bonusDamage: number;
  name: string;
}> = [
  { sequence: ["bash", "spiral_pierce"], bonusDamage: 0.5, name: "Knight's Fury" },
  { sequence: ["cold_bolt", "storm_gust"], bonusDamage: 0.8, name: "Blizzard Combo" },
  { sequence: ["fire_bolt", "fire_wall"], bonusDamage: 0.6, name: "Inferno Chain" },
  { sequence: ["double_strafe", "arrow_shower"], bonusDamage: 0.4, name: "Arrow Storm" },
];

export function checkCombo(lastSkill: SkillId | null, nextSkill: SkillId): number {
  if (!lastSkill) return 0;
  for (const combo of SKILL_COMBOS) {
    if (combo.sequence[0] === lastSkill && combo.sequence[1] === nextSkill) {
      return combo.bonusDamage;
    }
  }
  return 0;
}
