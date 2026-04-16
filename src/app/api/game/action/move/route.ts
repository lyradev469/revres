/**
 * PIXEL REALM ONLINE — Agent Move Action
 * POST /api/game/action/move
 *
 * Headers: Authorization: Bearer <token>
 * Body: { direction: "up"|"down"|"left"|"right" }
 *
 * Server validates the move and returns the new position.
 * All position math is server-authoritative.
 */

import { NextRequest, NextResponse } from "next/server";

const MOVE_SPEED = 80; // pixels per action call
const WORLD_MAX = 50 * 32; // 50 tiles * 32px

function clamp(v: number, min: number, max: number) {
  return Math.max(min, Math.min(max, v));
}

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

  // Lazy import to avoid circular deps with register route
  const { getRegistry } = await import("@/app/api/game/agent/register/route");
  const registry = getRegistry();
  const agent = registry.get(token);

  if (!agent) {
    return NextResponse.json({ error: "Invalid or expired token" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { direction } = body as { direction?: string };

    const validDirs = ["up", "down", "left", "right"];
    if (!direction || !validDirs.includes(direction)) {
      return NextResponse.json(
        { error: `direction must be one of: ${validDirs.join(", ")}` },
        { status: 400 }
      );
    }

    let { x, y } = agent.position;

    switch (direction) {
      case "up":    y -= MOVE_SPEED; break;
      case "down":  y += MOVE_SPEED; break;
      case "left":  x -= MOVE_SPEED; break;
      case "right": x += MOVE_SPEED; break;
    }

    x = clamp(x, 64, WORLD_MAX - 64);
    y = clamp(y, 64, WORLD_MAX - 64);

    agent.position = { x, y };
    agent.lastActive = Date.now();
    registry.set(token, agent);

    return NextResponse.json({
      success: true,
      agentId: agent.agentId,
      position: { x, y },
      zone: agent.zone,
      direction,
    });

  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }
}
