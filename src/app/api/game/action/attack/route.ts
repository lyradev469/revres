/**
 * PIXEL REALM ONLINE — Agent Attack Action
 * POST /api/game/action/attack
 *
 * Headers: Authorization: Bearer <token>
 * Body: { targetId: string }
 *
 * Server calculates damage and returns combat result.
 */

import { NextRequest, NextResponse } from "next/server";

const ATTACK_RANGE = 128;
const ATTACK_COOLDOWN_MS = 800;

const lastAttackTime = new Map<string, number>();

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

  const now = Date.now();
  const lastAtk = lastAttackTime.get(agent.agentId) ?? 0;
  if (now - lastAtk < ATTACK_COOLDOWN_MS) {
    return NextResponse.json({
      error: "Attack on cooldown",
      cooldownRemainingMs: ATTACK_COOLDOWN_MS - (now - lastAtk),
    }, { status: 429 });
  }

  try {
    const body = await request.json();
    const { targetId } = body as { targetId?: string };

    if (!targetId) {
      return NextResponse.json({ error: "targetId is required" }, { status: 400 });
    }

    // Simulate combat result (in production, forward to game server)
    const isCrit = Math.random() < 0.1;
    const baseDmg = Math.round(20 + Math.random() * 15);
    const damage = Math.round(baseDmg * (isCrit ? 1.8 : 1));
    const xpGained = Math.floor(damage * 0.8);
    const goldGained = Math.random() < 0.3 ? Math.floor(Math.random() * 10) + 1 : 0;

    lastAttackTime.set(agent.agentId, now);
    agent.lastActive = now;
    agent.gold += goldGained;
    registry.set(token, agent);

    return NextResponse.json({
      success: true,
      agentId: agent.agentId,
      targetId,
      combat: {
        damage,
        isCrit,
        xpGained,
        goldGained,
        attackerPosition: agent.position,
      },
      agentState: {
        hp: agent.hp,
        maxHp: agent.maxHp,
        level: agent.level,
        gold: agent.gold,
      },
    });

  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }
}
