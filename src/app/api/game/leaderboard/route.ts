import { NextResponse } from "next/server";
import { db } from "@/db";
import { playerStates } from "@/db/schema";
import { desc, sql } from "drizzle-orm";

export async function GET() {
  try {
    const rows = await db
      .select({
        fid:      playerStates.fid,
        username: playerStates.username,
        level:    playerStates.level,
        gold:     playerStates.gold,
      })
      .from(playerStates)
      .orderBy(desc(sql`${playerStates.level} * 10000 + ${playerStates.gold}`))
      .limit(20);

    const leaderboard = rows.map((r, i) => ({
      rank:     i + 1,
      username: r.username || "Adventurer",
      level:    r.level,
      gold:     r.gold,
      score:    r.level * 10000 + r.gold,
    }));

    return NextResponse.json({ leaderboard }, {
      headers: { "Cache-Control": "public, max-age=30, stale-while-revalidate=60" },
    });
  } catch (err) {
    console.error("[Leaderboard]", err);
    return NextResponse.json({ leaderboard: [] });
  }
}
