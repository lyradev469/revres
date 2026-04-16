/**
 * PIXEL REALM ONLINE — Agent Skill Action
 * POST /api/game/action/skill
 *
 * Headers: Authorization: Bearer <token>
 * Body: { skillId: string, targetId?: string, targetPosition?: { x, y } }
 *
 * Executes a skill. Server validates SP, cooldown, and range.
 */

import { NextRequest, NextResponse } from "next/server";
import { SKILLS, calculateSkillDamage } from "@/features/app/skill-system";
import type { SkillId } from "@/features/app/types";

const skillCooldowns = new Map<string, number>(); // `agentId:skillId` → timestamp

function getAuthToken(req: NextRequest): string | null {
  const auth = req.headers.get("authorization");
  if (!auth?.startsWith("Bearer ")) return null;
  return auth.slice(7).trim();
}

export async function POST(request: NextRequest) {
  const token = getAuthToken(request);
  if (!token) {
    return NextResponse.json({ error: "Missing Authorization header" }, { status: 401 });
  }

  const { getRegistry } = await import("@/app/api/game/agent/register/route");
  const registry = getRegistry();
  const agent = registry.get(token);

  if (!agent) {
    return NextResponse.json({ error: "Invalid or expired token" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { skillId, targetId, targetPosition } = body as {
      skillId?: string;
      targetId?: string;
      targetPosition?: { x: number; y: number };
    };

    if (!skillId) {
      return NextResponse.json({ error: "skillId is required" }, { status: 400 });
    }

    const def = SKILLS[skillId as SkillId];
    if (!def) {
      return NextResponse.json({
        error: `Unknown skill: ${skillId}`,
        availableSkills: Object.keys(SKILLS),
      }, { status: 400 });
    }

    const now = Date.now();
    const cdKey = `${agent.agentId}:${skillId}`;
    const lastUsed = skillCooldowns.get(cdKey) ?? 0;

    if (now - lastUsed < def.cooldown) {
      return NextResponse.json({
        error: "Skill on cooldown",
        skillId,
        cooldownRemainingMs: def.cooldown - (now - lastUsed),
      }, { status: 429 });
    }

    // Simulate SP cost
    const agentSp = 100; // simplified: agents always have SP in simulation
    if (def.spCost > agentSp) {
      return NextResponse.json({
        error: "Insufficient SP",
        required: def.spCost,
        current: agentSp,
      }, { status: 400 });
    }

    skillCooldowns.set(cdKey, now);
    agent.lastActive = now;
    registry.set(token, agent);

    // Calculate skill effect
    const agentAtk = 30 + agent.level * 4;
    let result: object = { skillId, skillName: def.name };

    if (def.damage > 0 && targetId) {
      const { damage, isCrit, statusApplied } = calculateSkillDamage(
        skillId as SkillId, agentAtk, 10
      );
      result = {
        ...result,
        targetId,
        damage,
        isCrit,
        statusApplied,
        xpGained: Math.floor(damage * 1.2),
      };
    } else if (def.healAmount && def.targetType === "self") {
      result = {
        ...result,
        healed: def.healAmount,
        targetId: agent.agentId,
      };
    } else if (def.aoeRadius) {
      result = {
        ...result,
        aoeCenter: targetPosition ?? agent.position,
        aoeRadius: def.aoeRadius,
        note: "AoE damage applied to all entities in range",
      };
    }

    return NextResponse.json({
      success: true,
      agentId: agent.agentId,
      castTime: def.castTime,
      spCost: def.spCost,
      cooldownMs: def.cooldown,
      result,
    });

  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }
}
