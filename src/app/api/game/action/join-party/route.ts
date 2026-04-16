/**
 * PIXEL REALM ONLINE — Agent Join Party
 * POST /api/game/action/join-party
 *
 * Headers: Authorization: Bearer <token>
 * Body: { partyId?: string }  — omit to auto-join or create
 */

import { NextRequest, NextResponse } from "next/server";
import { createParty, addPartyMember, partyStore } from "@/features/app/party-guild-system";
import { JOB_DEFINITIONS } from "@/features/app/job-system";

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

  // Check if already in a party
  const existingParty = partyStore.getPlayerParty(agent.agentId);
  if (existingParty) {
    return NextResponse.json({
      success: true,
      action: "already_in_party",
      party: {
        id: existingParty.id,
        name: existingParty.name,
        size: existingParty.members.length,
        members: existingParty.members.map(m => ({
          name: m.name,
          level: m.level,
          job: m.jobClass,
          isLeader: m.isLeader,
        })),
      },
    });
  }

  // Try to join smallest existing party or create one
  let joined = false;
  for (const [, party] of partyStore.parties) {
    if (party.members.length >= 6) continue;
    const { party: updated, success } = addPartyMember(
      party, agent.agentId, agent.name,
      agent.hp, agent.maxHp, agent.level, agent.jobClass
    );
    if (success) {
      partyStore.setParty(updated);
      joined = true;
      return NextResponse.json({
        success: true,
        action: "joined_party",
        party: {
          id: updated.id,
          name: updated.name,
          size: updated.members.length,
        },
      });
    }
  }

  if (!joined) {
    // Create new party
    const newParty = createParty(
      agent.agentId, agent.name,
      agent.hp, agent.maxHp, agent.level, agent.jobClass
    );
    partyStore.setParty(newParty);
    return NextResponse.json({
      success: true,
      action: "created_party",
      party: {
        id: newParty.id,
        name: newParty.name,
        size: newParty.members.length,
      },
    });
  }

  return NextResponse.json({ error: "Could not join or create party" }, { status: 500 });
}
