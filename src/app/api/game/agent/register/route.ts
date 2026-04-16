/**
 * PIXEL REALM ONLINE — AI Agent Registration
 * POST /api/game/agent/register
 *
 * Registers an AI agent and returns a JWT token + initial state.
 * Agents use this token for all subsequent API calls.
 *
 * Request body:
 *   { name: string, behavior: "wander"|"aggressive"|"farming", jobClass?: string }
 *
 * Response:
 *   { agentId: string, token: string, spawnPosition: { x, y }, startingStats: {...} }
 */

import { NextRequest, NextResponse } from "next/server";
import { JOB_DEFINITIONS } from "@/features/app/job-system";
import { createDefaultJob } from "@/features/app/job-system";
import type { JobClass } from "@/features/app/types";

// ── In-memory agent registry (for demo — use Redis in production) ─────────────

interface AgentRecord {
  agentId: string;
  name: string;
  token: string;
  behavior: "wander" | "aggressive" | "farming";
  jobClass: JobClass;
  registeredAt: number;
  lastActive: number;
  position: { x: number; y: number };
  hp: number;
  maxHp: number;
  level: number;
  gold: number;
  zone: string;
}

declare global {
  // eslint-disable-next-line no-var
  var __agentRegistry: Map<string, AgentRecord> | undefined;
}

function getRegistry(): Map<string, AgentRecord> {
  if (!globalThis.__agentRegistry) {
    globalThis.__agentRegistry = new Map();
  }
  return globalThis.__agentRegistry;
}

function generateToken(): string {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  let token = "pra_"; // pixel-realm-agent
  for (let i = 0; i < 32; i++) {
    token += chars[Math.floor(Math.random() * chars.length)];
  }
  return token;
}

function generateAgentId(): string {
  return `agent_${Date.now()}_${Math.floor(Math.random() * 10000)}`;
}

function getStartingStats(jobClass: JobClass, level = 1) {
  const def = JOB_DEFINITIONS[jobClass] ?? JOB_DEFINITIONS.novice;
  const scale = Math.floor(level / 10);
  return {
    hp: 150 + def.hpBonus + def.statScaling.vit * level * 2,
    maxHp: 150 + def.hpBonus + def.statScaling.vit * level * 2,
    sp: 50 + def.spBonus,
    maxSp: 50 + def.spBonus,
    attack: 30 + (def.statScaling.str + def.statScaling.dex) * scale,
    defense: 10 + def.statScaling.vit * scale,
    level,
  };
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, behavior = "farming", jobClass = "novice" } = body as {
      name?: string;
      behavior?: "wander" | "aggressive" | "farming";
      jobClass?: string;
    };

    if (!name || typeof name !== "string" || name.length < 2 || name.length > 20) {
      return NextResponse.json(
        { error: "name must be 2-20 characters" },
        { status: 400 }
      );
    }

    const validBehaviors = ["wander", "aggressive", "farming"];
    if (!validBehaviors.includes(behavior)) {
      return NextResponse.json(
        { error: `behavior must be one of: ${validBehaviors.join(", ")}` },
        { status: 400 }
      );
    }

    const validJobs = Object.keys(JOB_DEFINITIONS) as JobClass[];
    const resolvedJob: JobClass = validJobs.includes(jobClass as JobClass)
      ? (jobClass as JobClass)
      : "novice";

    const agentId = generateAgentId();
    const token = generateToken();
    const job = createDefaultJob();
    const stats = getStartingStats(resolvedJob);

    // Safe spawn in starting zone
    const spawnX = 160 + Math.random() * 800;
    const spawnY = 160 + Math.random() * 800;

    const record: AgentRecord = {
      agentId,
      name: name.trim(),
      token,
      behavior,
      jobClass: resolvedJob,
      registeredAt: Date.now(),
      lastActive: Date.now(),
      position: { x: spawnX, y: spawnY },
      hp: stats.hp,
      maxHp: stats.maxHp,
      level: 1,
      gold: 0,
      zone: "greenfields",
    };

    getRegistry().set(token, record);

    return NextResponse.json({
      success: true,
      agentId,
      token,
      name: record.name,
      jobClass: resolvedJob,
      jobName: JOB_DEFINITIONS[resolvedJob].name,
      behavior,
      spawnPosition: { x: spawnX, y: spawnY },
      zone: "greenfields",
      stats,
      job: {
        jobClass: job.jobClass,
        jobLevel: job.jobLevel,
        sp: job.sp,
        maxSp: job.maxSp,
        unlockedSkills: job.unlockedSkills,
      },
      instructions: {
        note: "Include your token in the Authorization header: Bearer <token>",
        skillBrainUrl: "/api/game/skill.md",
        nextSteps: [
          "Load /api/game/skill.md for behavior rules",
          "Poll GET /api/game/state?zone=greenfields for world state",
          "POST /api/game/action/move with direction",
          "POST /api/game/action/attack with targetId",
          "POST /api/game/action/skill with skillId and targetId",
        ],
      },
    });

  } catch (err) {
    console.error("[agent/register] Error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// Expose registry getter for other routes
export { getRegistry };
