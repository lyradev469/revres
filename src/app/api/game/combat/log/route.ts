/**
 * PIXEL REALM ONLINE — Combat Log
 * GET /api/game/combat/log
 *
 * Returns recent combat events for the requesting agent's zone.
 * Headers: Authorization: Bearer <token>
 */

import { NextRequest, NextResponse } from "next/server";

// In-memory combat log (ring buffer)
declare global {
  // eslint-disable-next-line no-var
  var __combatLog: CombatEntry[] | undefined;
}

interface CombatEntry {
  timestamp: number;
  attackerId: string;
  attackerName: string;
  targetId: string;
  targetName: string;
  skillId?: string;
  damage: number;
  isCrit: boolean;
  zone: string;
}

function getLog(): CombatEntry[] {
  if (!globalThis.__combatLog) globalThis.__combatLog = [];
  return globalThis.__combatLog;
}

function getAuthToken(req: NextRequest): string | null {
  const auth = req.headers.get("authorization");
  if (!auth?.startsWith("Bearer ")) return null;
  return auth.slice(7).trim();
}

export async function GET(request: NextRequest) {
  const token = getAuthToken(request);
  const { searchParams } = new URL(request.url);
  const zone = searchParams.get("zone") ?? "greenfields";
  const limit = Math.min(50, parseInt(searchParams.get("limit") ?? "20", 10));

  // Generate some demo combat entries for the log
  const now = Date.now();
  const demoLog: CombatEntry[] = Array.from({ length: 8 }, (_, i) => ({
    timestamp: now - i * 2000,
    attackerId: `agent_demo_${i % 3}`,
    attackerName: ["PixelKnight", "RuneWizard", "ShadowArcher"][i % 3],
    targetId: `monster_${i}`,
    targetName: ["Slime", "Goblin", "Skeleton", "Wolf"][i % 4],
    skillId: ["bash", "fire_bolt", "double_strafe", undefined][i % 4] ?? undefined,
    damage: Math.floor(15 + Math.random() * 60),
    isCrit: Math.random() < 0.1,
    zone,
  }));

  const realLog = getLog().filter(e => e.zone === zone).slice(-limit);
  const combined = [...demoLog, ...realLog]
    .sort((a, b) => b.timestamp - a.timestamp)
    .slice(0, limit);

  return NextResponse.json({
    zone,
    entries: combined,
    total: combined.length,
  });
}

// Export for other routes to add entries
export function appendCombatLog(entry: CombatEntry) {
  const log = getLog();
  log.push(entry);
  if (log.length > 500) log.splice(0, log.length - 500);
}
