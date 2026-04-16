// ============================================================
// PIXEL REALM ONLINE — Core Game Types
// ============================================================

export type Direction = "up" | "down" | "left" | "right";
export type EntityState = "idle" | "walking" | "attacking" | "dead";
export type EntityType = "player" | "agent" | "monster" | "npc";
export type TileType = "grass" | "dirt" | "path" | "water" | "wall" | "stone";
export type ZoneId = string;
export type EntityId = string;

// ---- World & Map -------------------------------------------------------

export interface WorldPosition {
  x: number;
  y: number;
}

export interface TileMap {
  zoneId: ZoneId;
  width: number;  // in tiles
  height: number; // in tiles
  tileSize?: number;
  tiles: TileType[][];
  spawnPoints: WorldPosition[];
}

// ---- Entities ----------------------------------------------------------

export interface EntityStats {
  hp: number;
  maxHp: number;
  xp: number;
  level: number;
  attack: number;
  defense: number;
  speed: number;
}

export interface Entity {
  id: EntityId;
  type: EntityType;
  name: string;
  position: WorldPosition;
  velocity: WorldPosition;
  direction: Direction;
  state: EntityState;
  stats: EntityStats;
  zoneId: ZoneId;
  lastAttackTime: number;
  targetId?: EntityId;
}

export interface PlayerEntity extends Entity {
  type: "player";
  fid?: number;
  username?: string;
  gold: number;
  inventory: Item[];
}

export interface AgentEntity extends Entity {
  type: "agent";
  behavior: AgentBehavior;
  aiState: AIState;
}

export interface MonsterEntity extends Entity {
  type: "monster";
  monsterType: MonsterType;
  lootTable: LootEntry[];
  respawnTime: number;
  respawnPosition: WorldPosition;
}

// ---- AI / Agents -------------------------------------------------------

export type AgentBehavior = "wander" | "aggressive" | "passive" | "farming";

export interface AIState {
  behavior: AgentBehavior;
  targetId?: EntityId;
  wanderTarget?: WorldPosition;
  lastActionTime: number;
  cooldown: number;
}

// ---- Combat ------------------------------------------------------------

export interface DamageEvent {
  attackerId: EntityId;
  /** Server sends this as `entityId` — keep both for compatibility */
  entityId: EntityId;
  targetId: EntityId;
  damage: number;
  timestamp: number;
  /** Server sends this as `isCrit` — keep both for compatibility */
  isCrit: boolean;
  isCritical: boolean;
}

export interface FloatingText {
  id: string;
  text: string;
  x: number;
  y: number;
  color: string;
  alpha: number;
  vy: number;
  createdAt: number;
  // pixi-game attaches the live text node here to avoid re-creating it every tick
  _node?: unknown;
}

// ---- Items & Loot ------------------------------------------------------

export type ItemType = "weapon" | "potion" | "armor" | "gold" | "material";
export type MonsterType = "slime" | "goblin" | "skeleton" | "wolf" | "boss";

export interface Item {
  id: string;
  itemType: ItemType;
  name: string;
  description: string;
  value: number;
  stats?: Partial<EntityStats>;
  quantity: number;
}

export interface LootEntry {
  itemType: ItemType;
  name: string;
  dropChance: number; // 0-1
  quantity: number;
}

export interface DroppedItem {
  id: string;
  item: Item;
  position: WorldPosition;
  zoneId: ZoneId;
  droppedAt: number;
}

// ---- Network / WebSocket Messages --------------------------------------

export type MessageType =
  | "init"
  | "move"
  | "attack"
  | "state_snapshot"
  | "player_joined"
  | "player_left"
  | "damage"
  | "entity_died"
  | "item_dropped"
  | "item_pickup"
  | "chat"
  | "error"
  | "ping"
  | "pong";

export interface BaseMessage {
  type: MessageType;
  timestamp: number;
}

export interface InitMessage extends BaseMessage {
  type: "init";
  playerId: EntityId;
  zoneId: ZoneId;
  tilemap: TileMap;
  entities: Entity[];
  playerEntity: PlayerEntity;
}

export interface MoveMessage extends BaseMessage {
  type: "move";
  playerId: EntityId;
  direction: Direction | null;
  position: WorldPosition;
}

export interface AttackMessage extends BaseMessage {
  type: "attack";
  playerId: EntityId;
  targetId: EntityId;
}

export interface StateSnapshot extends BaseMessage {
  type: "state_snapshot";
  tick: number;
  entities: Entity[];
  droppedItems: DroppedItem[];
  damages: DamageEvent[];
}

export interface DamageMessage extends BaseMessage {
  type: "damage";
  event: DamageEvent;
}

export interface EntityDiedMessage extends BaseMessage {
  type: "entity_died";
  entityId: EntityId;
  killerId: EntityId;
  droppedItems: DroppedItem[];
}

export type GameMessage =
  | InitMessage
  | MoveMessage
  | AttackMessage
  | StateSnapshot
  | DamageMessage
  | EntityDiedMessage;

// ---- Zone System -------------------------------------------------------

export interface Zone {
  id: ZoneId;
  name: string;
  tilemap: TileMap;
  entities: Map<EntityId, Entity>;
  droppedItems: Map<string, DroppedItem>;
  maxPlayers: number;
}

// ---- Job System --------------------------------------------------------

export type JobTier = "novice" | "first" | "second";

export type JobClass =
  | "novice"
  | "swordsman" | "knight" | "lord_knight"
  | "mage" | "wizard" | "high_wizard"
  | "archer" | "hunter" | "sniper";

export interface JobDefinition {
  id: JobClass;
  name: string;
  tier: JobTier;
  icon: string;
  statScaling: { str: number; int: number; dex: number; vit: number; agi: number };
  skillSlots: number;
  hpBonus: number;
  spBonus: number;
  advancementLevel: number; // level required to advance to next class
}

export interface PlayerJob {
  jobClass: JobClass;
  jobLevel: number;
  jobXp: number;
  jobXpToNext: number;
  unlockedSkills: SkillId[];
  skillPoints: number; // SP pool available to spend on skills
  sp: number;         // current Skill Points (mana)
  maxSp: number;      // max Skill Points
}

// ---- Skill System -------------------------------------------------------

export type SkillId =
  // Swordsman / Knight
  | "bash" | "provoke" | "endure" | "magnum_break" | "shield_bash" | "spiral_pierce"
  // Mage / Wizard
  | "fire_bolt" | "cold_bolt" | "thunder_bolt" | "fire_wall" | "storm_gust" | "meteor_storm"
  // Archer / Hunter
  | "double_strafe" | "arrow_shower" | "ankle_snare" | "falcon_assault"
  // Universal
  | "first_aid" | "regen" | "war_cry";

export type SkillTargetType = "single" | "aoe" | "self" | "ground";
export type StatusEffect = "burn" | "freeze" | "stun" | "poison" | "slow";

export interface SkillDefinition {
  id: SkillId;
  name: string;
  icon: string;
  description: string;
  jobRequired: JobClass;
  levelRequired: number;
  spCost: number;
  castTime: number;   // ms, 0 = instant
  cooldown: number;   // ms
  range: number;      // pixels, 0 = melee
  damage: number;     // base damage multiplier (1.0 = 100% atk)
  targetType: SkillTargetType;
  aoeRadius?: number;
  statusEffect?: StatusEffect;
  statusChance?: number;  // 0-1
  healAmount?: number;    // for healing skills
}

export interface ActiveSkill {
  skillId: SkillId;
  cooldownUntil: number;   // timestamp
  castingUntil?: number;   // timestamp (while casting)
  castingTargetId?: EntityId;
}

// ---- Party System -------------------------------------------------------

export type LootRule = "free_for_all" | "round_robin" | "leader_takes";

export interface PartyMember {
  entityId: EntityId;
  name: string;
  isLeader: boolean;
  hp: number;
  maxHp: number;
  sp: number;
  maxSp: number;
  level: number;
  jobClass: JobClass;
}

export interface Party {
  id: string;
  name: string;
  members: PartyMember[];
  leaderId: EntityId;
  lootRule: LootRule;
  xpShare: boolean;     // true = split XP among members
  createdAt: number;
}

// ---- Guild System -------------------------------------------------------

export type GuildRole = "leader" | "officer" | "member";

export interface GuildMember {
  entityId: EntityId;
  name: string;
  role: GuildRole;
  joinedAt: number;
  contribution: number; // guild contribution points
}

export interface Guild {
  id: string;
  name: string;
  tag: string;        // [TAG] 3-5 chars
  level: number;
  xp: number;
  members: GuildMember[];
  leaderId: EntityId;
  description: string;
  createdAt: number;
  treasury: number;   // guild gold
  warWins: number;
  warLosses: number;
}

// ---- Equipment System (extended) ----------------------------------------

export type EquipSlotType = "weapon" | "armor" | "helmet" | "boots" | "accessory";
export type ItemRarity = "common" | "uncommon" | "rare" | "epic" | "legendary";

export interface ExtendedItem extends Item {
  rarity: ItemRarity;
  refineLevel: number;   // 0-10, each +1 adds 5% stats
  requiredLevel: number;
  requiredJob?: JobClass;
  slot?: EquipSlotType;
}

// ---- Cast State (for HUD cast bar) ---------------------------------------

export interface CastState {
  skillId: SkillId;
  skillName: string;
  startTime: number;
  duration: number;   // ms
  targetId?: EntityId;
}

// ---- Game Config -------------------------------------------------------

export const GAME_CONFIG = {
  TILE_SIZE: 32,
  WORLD_WIDTH: 50,  // tiles
  WORLD_HEIGHT: 50, // tiles
  TICK_RATE: 15,    // server ticks/sec
  VIEWPORT_WIDTH: 424,
  VIEWPORT_HEIGHT: 680,
  MAX_PLAYERS_PER_ZONE: 100,
  ATTACK_RANGE: 64,   // pixels
  ATTACK_COOLDOWN: 800, // ms
  MONSTER_AGGRO_RANGE: 128, // pixels
  RESPAWN_TIME: 10000, // ms
  CAMERA_LERP: 0.1,
  MOVE_SPEED: 3,      // tiles/sec
  AGENT_THINK_INTERVAL: 1000, // ms
} as const;

export const TILE_COLORS: Record<TileType, number> = {
  grass: 0x4a7c59,
  dirt: 0x8b6914,
  path: 0xc4a35a,
  water: 0x1a6b9a,
  wall: 0x4a4a4a,
  stone: 0x7a7a7a,
};

export const MONSTER_STATS: Record<MonsterType, Partial<EntityStats>> = {
  slime: { maxHp: 30, hp: 30, attack: 5, defense: 0, speed: 1, xp: 10, level: 1 },
  goblin: { maxHp: 50, hp: 50, attack: 10, defense: 2, speed: 2, xp: 20, level: 2 },
  skeleton: { maxHp: 70, hp: 70, attack: 15, defense: 5, speed: 2, xp: 35, level: 4 },
  wolf: { maxHp: 60, hp: 60, attack: 18, defense: 3, speed: 4, xp: 30, level: 3 },
  boss: { maxHp: 500, hp: 500, attack: 40, defense: 15, speed: 2, xp: 200, level: 10 },
};
