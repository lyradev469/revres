/**
 * PIXEL REALM ONLINE — Party & Guild System
 *
 * Party: up to 6 players sharing XP + loot with cooperative combat
 * Guild: persistent social org with roles, chat, treasury, guild wars
 */

import type {
  Party,
  PartyMember,
  Guild,
  GuildMember,
  GuildRole,
  LootRule,
  EntityId,
  JobClass,
} from "./types";

// ── ID generators ─────────────────────────────────────────────────────────────

let _partyId = 0;
let _guildId = 0;

function newPartyId(): string { return `party_${Date.now()}_${++_partyId}`; }
function newGuildId(): string { return `guild_${Date.now()}_${++_guildId}`; }

// ── Party System ──────────────────────────────────────────────────────────────

export const MAX_PARTY_SIZE = 6;

export function createParty(
  leaderId: EntityId,
  leaderName: string,
  leaderHp: number,
  leaderMaxHp: number,
  leaderLevel: number,
  leaderJob: JobClass
): Party {
  const leaderMember: PartyMember = {
    entityId: leaderId,
    name: leaderName,
    isLeader: true,
    hp: leaderHp,
    maxHp: leaderMaxHp,
    sp: 50,
    maxSp: 100,
    level: leaderLevel,
    jobClass: leaderJob,
  };

  return {
    id: newPartyId(),
    name: `${leaderName}'s Party`,
    members: [leaderMember],
    leaderId,
    lootRule: "free_for_all",
    xpShare: true,
    createdAt: Date.now(),
  };
}

export function addPartyMember(
  party: Party,
  memberId: EntityId,
  memberName: string,
  hp: number,
  maxHp: number,
  level: number,
  jobClass: JobClass
): { party: Party; success: boolean; reason?: string } {
  if (party.members.length >= MAX_PARTY_SIZE) {
    return { party, success: false, reason: "Party is full (max 6 members)" };
  }
  if (party.members.some(m => m.entityId === memberId)) {
    return { party, success: false, reason: "Already in party" };
  }

  const newMember: PartyMember = {
    entityId: memberId,
    name: memberName,
    isLeader: false,
    hp,
    maxHp,
    sp: 50,
    maxSp: 100,
    level,
    jobClass,
  };

  return {
    party: { ...party, members: [...party.members, newMember] },
    success: true,
  };
}

export function removePartyMember(party: Party, memberId: EntityId): Party {
  const remaining = party.members.filter(m => m.entityId !== memberId);

  // If leader left, promote next member
  if (memberId === party.leaderId && remaining.length > 0) {
    remaining[0] = { ...remaining[0], isLeader: true };
    return { ...party, members: remaining, leaderId: remaining[0].entityId };
  }

  return { ...party, members: remaining };
}

export function disbandParty(party: Party): null {
  return null; // returns null to signal party is gone
}

export function calculatePartyXpShare(
  baseXp: number,
  partySize: number,
  killerLevel: number,
  memberLevel: number
): number {
  if (partySize <= 1) return baseXp;

  // Penalty scaling: more members = less individual XP, but bonus for grouping
  const partyBonus = 1 + (partySize - 1) * 0.15; // 15% bonus per extra member
  const levelDiff = Math.abs(killerLevel - memberLevel);
  const levelPenalty = Math.max(0.5, 1 - levelDiff * 0.05);

  return Math.round((baseXp * partyBonus * levelPenalty) / partySize);
}

export function getLootWinner(party: Party, killerId: EntityId): EntityId {
  switch (party.lootRule) {
    case "leader_takes":
      return party.leaderId;
    case "round_robin": {
      // Give loot to member after the killer in rotation
      const idx = party.members.findIndex(m => m.entityId === killerId);
      const next = (idx + 1) % party.members.length;
      return party.members[next].entityId;
    }
    default:
      return killerId; // free for all = killer gets it
  }
}

export function updatePartyMemberHP(
  party: Party,
  memberId: EntityId,
  hp: number,
  maxHp: number
): Party {
  return {
    ...party,
    members: party.members.map(m =>
      m.entityId === memberId ? { ...m, hp, maxHp } : m
    ),
  };
}

// ── Guild System ──────────────────────────────────────────────────────────────

export const MAX_GUILD_MEMBERS = 50;

export function createGuild(
  leaderId: EntityId,
  leaderName: string,
  guildName: string,
  guildTag: string
): { guild: Guild; success: boolean; reason?: string } {
  const tag = guildTag.toUpperCase().slice(0, 5);
  if (tag.length < 2) {
    return { guild: {} as Guild, success: false, reason: "Tag must be 2-5 characters" };
  }
  if (guildName.length < 3) {
    return { guild: {} as Guild, success: false, reason: "Guild name must be at least 3 characters" };
  }

  const leaderMember: GuildMember = {
    entityId: leaderId,
    name: leaderName,
    role: "leader",
    joinedAt: Date.now(),
    contribution: 0,
  };

  const guild: Guild = {
    id: newGuildId(),
    name: guildName,
    tag,
    level: 1,
    xp: 0,
    members: [leaderMember],
    leaderId,
    description: `${guildName} — an adventurer's guild`,
    createdAt: Date.now(),
    treasury: 0,
    warWins: 0,
    warLosses: 0,
  };

  return { guild, success: true };
}

export function inviteGuildMember(
  guild: Guild,
  memberId: EntityId,
  memberName: string
): { guild: Guild; success: boolean; reason?: string } {
  if (guild.members.length >= MAX_GUILD_MEMBERS) {
    return { guild, success: false, reason: "Guild is full" };
  }
  if (guild.members.some(m => m.entityId === memberId)) {
    return { guild, success: false, reason: "Already a guild member" };
  }

  const newMember: GuildMember = {
    entityId: memberId,
    name: memberName,
    role: "member",
    joinedAt: Date.now(),
    contribution: 0,
  };

  return {
    guild: { ...guild, members: [...guild.members, newMember] },
    success: true,
  };
}

export function kickGuildMember(
  guild: Guild,
  kickerId: EntityId,
  targetId: EntityId
): { guild: Guild; success: boolean; reason?: string } {
  const kicker = guild.members.find(m => m.entityId === kickerId);
  if (!kicker || (kicker.role !== "leader" && kicker.role !== "officer")) {
    return { guild, success: false, reason: "Insufficient rank to kick members" };
  }

  const target = guild.members.find(m => m.entityId === targetId);
  if (!target) {
    return { guild, success: false, reason: "Member not found" };
  }
  if (target.role === "leader") {
    return { guild, success: false, reason: "Cannot kick the leader" };
  }

  return {
    guild: { ...guild, members: guild.members.filter(m => m.entityId !== targetId) },
    success: true,
  };
}

export function promoteGuildMember(
  guild: Guild,
  leaderId: EntityId,
  targetId: EntityId,
  newRole: GuildRole
): { guild: Guild; success: boolean; reason?: string } {
  const leader = guild.members.find(m => m.entityId === leaderId);
  if (!leader || leader.role !== "leader") {
    return { guild, success: false, reason: "Only the guild leader can promote members" };
  }

  return {
    guild: {
      ...guild,
      members: guild.members.map(m =>
        m.entityId === targetId ? { ...m, role: newRole } : m
      ),
    },
    success: true,
  };
}

export function addGuildXp(guild: Guild, amount: number): Guild {
  let newXp = guild.xp + amount;
  let newLevel = guild.level;
  const xpToNext = guild.level * 5000;

  if (newXp >= xpToNext) {
    newXp -= xpToNext;
    newLevel++;
  }

  return { ...guild, xp: newXp, level: newLevel };
}

export function depositToTreasury(guild: Guild, amount: number, memberId: EntityId): Guild {
  return {
    ...guild,
    treasury: guild.treasury + amount,
    members: guild.members.map(m =>
      m.entityId === memberId ? { ...m, contribution: m.contribution + amount } : m
    ),
  };
}

export function getGuildRank(member: GuildMember): string {
  const icons: Record<GuildRole, string> = {
    leader: "👑",
    officer: "⭐",
    member: "⚔️",
  };
  return `${icons[member.role]} ${member.role.charAt(0).toUpperCase() + member.role.slice(1)}`;
}

// ── In-memory stores for client-side demo ────────────────────────────────────

export const partyStore = {
  parties: new Map<string, Party>(),
  playerPartyMap: new Map<EntityId, string>(), // playerId → partyId

  getPlayerParty(playerId: EntityId): Party | null {
    const partyId = this.playerPartyMap.get(playerId);
    if (!partyId) return null;
    return this.parties.get(partyId) ?? null;
  },

  setParty(party: Party): void {
    this.parties.set(party.id, party);
    for (const m of party.members) {
      this.playerPartyMap.set(m.entityId, party.id);
    }
  },

  removeParty(partyId: string): void {
    const party = this.parties.get(partyId);
    if (party) {
      for (const m of party.members) this.playerPartyMap.delete(m.entityId);
    }
    this.parties.delete(partyId);
  },
};

export const guildStore = {
  guilds: new Map<string, Guild>(),
  playerGuildMap: new Map<EntityId, string>(), // playerId → guildId

  getPlayerGuild(playerId: EntityId): Guild | null {
    const guildId = this.playerGuildMap.get(playerId);
    if (!guildId) return null;
    return this.guilds.get(guildId) ?? null;
  },

  setGuild(guild: Guild): void {
    this.guilds.set(guild.id, guild);
    for (const m of guild.members) {
      this.playerGuildMap.set(m.entityId, guild.id);
    }
  },
};
