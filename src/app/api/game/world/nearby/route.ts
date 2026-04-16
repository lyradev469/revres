/**
 * PIXEL REALM ONLINE — Nearby World State
 * GET /api/game/world/nearby?zone=greenfields&x=400&y=400&radius=320
 *
 * Returns all entities within the given radius.
 * Used by AI agents to scan their surroundings before deciding on actions.
 */

import { NextRequest, NextResponse } from "next/server";

const MONSTER_NAMES = ["Slime", "Goblin", "Skeleton", "Wolf"];
const MONSTER_ICONS = ["💚", "👺", "💀", "🐺"];
const MONSTER_HP = [40, 80, 120, 90];

function dist(ax: number, ay: number, bx: number, by: number): number {
  return Math.sqrt((ax - bx) ** 2 + (ay - by) ** 2);
}

function generateNearbyEntities(
  cx: number,
  cy: number,
  radius: number,
  zone: string
) {
  const entities = [];
  const count = 5 + Math.floor(Math.random() * 8);

  for (let i = 0; i < count; i++) {
    const angle = Math.random() * Math.PI * 2;
    const r = Math.random() * radius;
    const x = cx + Math.cos(angle) * r;
    const y = cy + Math.sin(angle) * r;
    const typeIdx = Math.floor(Math.random() * MONSTER_NAMES.length);
    const hp = Math.floor(MONSTER_HP[typeIdx] * (0.6 + Math.random() * 0.8));
    const maxHp = MONSTER_HP[typeIdx];

    entities.push({
      id: `monster_${i}_${Date.now()}`,
      type: "monster",
      name: MONSTER_NAMES[typeIdx],
      icon: MONSTER_ICONS[typeIdx],
      position: { x: Math.round(x), y: Math.round(y) },
      distance: Math.round(dist(cx, cy, x, y)),
      hp,
      maxHp,
      hpPercent: Math.round((hp / maxHp) * 100),
      zone,
      xpReward: [10, 25, 40, 30][typeIdx],
      goldReward: [3, 8, 15, 10][typeIdx],
    });
  }

  // Sort by distance
  return entities.sort((a, b) => a.distance - b.distance);
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const zone = searchParams.get("zone") ?? "greenfields";
  const x = parseFloat(searchParams.get("x") ?? "400");
  const y = parseFloat(searchParams.get("y") ?? "400");
  const radius = Math.min(640, parseFloat(searchParams.get("radius") ?? "320"));

  if (isNaN(x) || isNaN(y) || isNaN(radius)) {
    return NextResponse.json(
      { error: "x, y, radius must be valid numbers" },
      { status: 400 }
    );
  }

  // Try to get from live game server first, fall back to simulation
  const GAME_SERVER = process.env.GAME_SERVER_URL || "";
  if (GAME_SERVER) {
    try {
      const res = await fetch(
        `${GAME_SERVER}/world/nearby?zone=${zone}&x=${x}&y=${y}&radius=${radius}`,
        { cache: "no-store", signal: AbortSignal.timeout(2000) }
      );
      if (res.ok) {
        const data = await res.json();
        return NextResponse.json(data);
      }
    } catch {
      // Fall through to simulation
    }
  }

  // Simulation fallback
  const nearby = generateNearbyEntities(x, y, radius, zone);
  const portals = [
    { id: "portal_1", targetZone: "forest", distance: Math.round(dist(x, y, 1536, 800)), label: "Dark Forest →" },
    { id: "portal_2", targetZone: "town", distance: Math.round(dist(x, y, 800, 64)), label: "↑ Market Town" },
  ].sort((a, b) => a.distance - b.distance);

  return NextResponse.json({
    zone,
    scanCenter: { x: Math.round(x), y: Math.round(y) },
    scanRadius: Math.round(radius),
    timestamp: Date.now(),
    entities: nearby,
    portals,
    recommendations: {
      nearestTarget: nearby[0] ?? null,
      safestTarget: nearby.find(e => e.hpPercent < 50) ?? nearby[0] ?? null,
      bestXpTarget: [...nearby].sort((a, b) => b.xpReward - a.xpReward)[0] ?? null,
    },
  });
}
