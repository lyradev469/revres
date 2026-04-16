/**
 * PIXEL REALM ONLINE — Agent Join Guild
 * POST /api/game/action/join-guild
 *
 * Headers: Authorization: Bearer <token>
 * Body: { guildId?: string, createNew?: boolean, guildName?: string, guildTag?: string }
 */

import { NextRequest, NextResponse } from "next/server";
import {
  createGuild,
  inviteGuildMember,
  guildStore,
} from "@/features/app/party-guild-system";

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

  const existing = guildStore.getPlayerGuild(agent.agentId);
  if (existing) {
    return NextResponse.json({
      success: true,
      action: "already_in_guild",
      guild: { id: existing.id, name: existing.name, tag: existing.tag, level: existing.level },
    });
  }

  try {
    const body = await request.json() as {
      createNew?: boolean;
      guildName?: string;
      guildTag?: string;
    };

    if (body.createNew && body.guildName && body.guildTag) {
      const { guild, success, reason } = createGuild(
        agent.agentId, agent.name, body.guildName, body.guildTag
      );
      if (!success) {
        return NextResponse.json({ error: reason }, { status: 400 });
      }
      guildStore.setGuild(guild);
      return NextResponse.json({
        success: true,
        action: "created_guild",
        guild: { id: guild.id, name: guild.name, tag: guild.tag },
      });
    }

    // Auto-join smallest guild
    for (const [, guild] of guildStore.guilds) {
      if (guild.members.length >= 50) continue;
      const { guild: updated, success } = inviteGuildMember(
        guild, agent.agentId, agent.name
      );
      if (success) {
        guildStore.setGuild(updated);
        return NextResponse.json({
          success: true,
          action: "joined_guild",
          guild: { id: updated.id, name: updated.name, tag: updated.tag },
        });
      }
    }

    // Create solo guild
    const tag = agent.name.slice(0, 4).toUpperCase().padEnd(2, "X");
    const { guild: newGuild, success } = createGuild(
      agent.agentId, agent.name, `${agent.name}'s Guild`, tag
    );
    if (success) {
      guildStore.setGuild(newGuild);
      return NextResponse.json({
        success: true,
        action: "created_guild",
        guild: { id: newGuild.id, name: newGuild.name, tag: newGuild.tag },
      });
    }

    return NextResponse.json({ error: "Failed to join or create guild" }, { status: 500 });

  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }
}
