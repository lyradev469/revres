"use client";

/**
 * PIXEL REALM ONLINE — Main App Orchestrator
 *
 * Wires together:
 * - PixiJS game engine (WebGL renderer)
 * - WebSocket network client
 * - Procedural asset generation
 * - Game HUD
 * - Farcaster identity
 * - Share functionality
 */

import { useEffect, useRef, useState, useCallback, useMemo } from "react";
import type { CSSProperties } from "react";
import Script from "next/script";
import { useFarcasterUser, ShareButton } from "@/neynar-farcaster-sdk/mini";
import dynamic from "next/dynamic";
import type {
  Entity,
  PlayerEntity,
  TileMap,
  Direction,
  WorldPosition,
  EntityId,
  DamageEvent,
  DroppedItem,
} from "./types";
import type { GameAssets } from "./pixi-loader";
import { GameSimulator } from "./game-sim";
import { GameNetworkClient } from "./network";
import type { InputState } from "./network";
import { GameHUD } from "./components/game-hud";
import { WalletWidget } from "./components/wallet-widget";
import { InventoryPanel, BagButton, EMPTY_EQUIPMENT } from "./components/inventory-panel";
import type { Equipment, EquipSlot } from "./components/inventory-panel";
import { ZonePortalPrompt, ZoneTransitionScreen } from "./components/zone-portal";
import { ShopPanel } from "./components/shop-panel";
import type { ShopItem } from "./components/shop-panel";
import { LeaderboardScreen } from "./components/leaderboard";
import { getNearbyPortal, ZONE_TILEMAPS, type ZoneKey } from "./zones";
import type { PortalDefinition } from "./zones";
import { ContractDeployer } from "./components/contract-deployer";
import { useSfx, useSong, sfx } from "@/neynar-farcaster-sdk/audio";
import type { SongDefinition } from "@/neynar-farcaster-sdk/audio";
import { SkillWheel } from "./components/skill-wheel";
import { CastBar } from "./components/cast-bar";
import { SocialPanel } from "./components/social-panel";
import { JobPanel } from "./components/job-panel";
import { createDefaultJob, advanceJob, gainJobXp } from "./job-system";
import { createSkillState, startCast, interruptCast, completeCast, SKILLS } from "./skill-system";
import type { SkillState } from "./skill-system";
import type { PlayerJob, JobClass, CastState, SkillId } from "./types";
import {
  sfxHit,
  sfxCritHit,
  sfxEnemyDie,
  sfxPlayerHurt,
  sfxSwing,
  sfxStep,
  sfxLevelUp,
  sfxGold,
  sfxEnterRealm,
} from "./game-audio";

// ---- Background Music --------------------------------------------------

const GAME_MUSIC: SongDefinition = {
  tempo: 108,
  sections: {
    field: {
      melody: [
        ["G4", "4n"], ["A4", "4n"], ["B4", "4n"], ["D5", "4n"],
        ["B4", "4n"], ["A4", "4n"], ["G4", "2n"],
        ["E4", "4n"], ["G4", "4n"], ["A4", "4n"], ["B4", "4n"],
        ["A4", "4n"], ["G4", "4n"], ["E4", "2n"],
      ],
      bassLine: [
        ["G2", "2n"], ["D2", "2n"],
        ["C2", "2n"], ["D2", "2n"],
      ],
      chords: [
        [["G3", "B3", "D4"], "2n"],
        [["D3", "F#3", "A3"], "2n"],
        [["C3", "E3", "G3"], "2n"],
        [["D3", "F#3", "A3"], "2n"],
      ],
      arp: [
        ["G5", "16n"], ["B5", "16n"], ["D6", "16n"], ["B5", "16n"],
        ["G5", "16n"], ["B5", "16n"], ["D6", "16n"], ["B5", "16n"],
      ],
      drumPattern: "simple",
      config: { melody: { volume: -2, oscillator: "triangle" } },
    },
    battle: {
      melody: [
        ["D5", "8n"], ["E5", "8n"], ["F5", "8n"], ["G5", "8n"],
        ["F5", "8n"], ["E5", "8n"], ["D5", "4n"],
        ["C5", "8n"], ["D5", "8n"], ["E5", "8n"], ["F5", "8n"],
        ["E5", "8n"], ["D5", "8n"], ["C5", "4n"],
      ],
      bassLine: [
        ["D2", "4n"], ["D2", "4n"], ["A1", "4n"], ["A1", "4n"],
        ["C2", "4n"], ["C2", "4n"], ["G1", "4n"], ["G1", "4n"],
      ],
      drumPattern: "complex",
      tempo: 128,
      config: { melody: { volume: 2, oscillator: "sawtooth", envelope: { attack: 0.001, decay: 0.1, sustain: 0.6, release: 0.2 } } },
    },
  },
  structure: ["field", "field", "battle", "field"],
};

// Dynamic import for PixiJS game (client-only)
const PixiGame = dynamic(
  () => import("./pixi-game").then(m => ({ default: m.PixiGame })),
  { ssr: false }
);

// ---- Game Server Config ------------------------------------------------

const WS_URL = process.env.NEXT_PUBLIC_GAME_WS_URL || "wss://game-serb-production.up.railway.app";

// ---- Types -------------------------------------------------------------

interface ChatMessage {
  id: string;
  playerId: string;
  playerName: string;
  text: string;
  timestamp: number;
}

interface KillFeedEntry {
  id: string;
  killerName: string;
  targetName: string;
  timestamp: number;
}

// ---- Mini-App Root -----------------------------------------------------

export function MiniApp() {
  const { data: user } = useFarcasterUser();

  // Game state
  const [pixiReady, setPixiReady] = useState(false);
  const [assets, setAssets] = useState<GameAssets | null>(null);
  const [tilemap, setTilemap] = useState<TileMap | null>(null);
  const [entities, setEntities] = useState<Entity[]>([]);
  const [droppedItems, setDroppedItems] = useState<DroppedItem[]>([]);
  const [localPlayerId, setLocalPlayerId] = useState<string | null>(null);
  const [damages, setDamages] = useState<DamageEvent[]>([]);
  const [connected, setConnected] = useState(false);
  const [respawning, setRespawning] = useState(false);
  const [ping, setPing] = useState(0);
  const [connectedPlayers, setConnectedPlayers] = useState(0);
  const [zone, setZone] = useState("zone_start");
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [killFeed, setKillFeed] = useState<KillFeedEntry[]>([]);
  const [gameStarted, setGameStarted] = useState(false);
  const [showTitleScreen, setShowTitleScreen] = useState(true);
  const [showLeaderboard, setShowLeaderboard] = useState(false);

  // Inventory state (client-side, synced from snapshot)
  const [inventory, setInventory] = useState<import("./types").Item[]>([]);
  const [equipment, setEquipment] = useState<Equipment>(EMPTY_EQUIPMENT);
  const [showInventory, setShowInventory] = useState(false);

  // Job / Skill system state
  const [playerJob, setPlayerJob] = useState<PlayerJob>(createDefaultJob());
  const [skillStateData, setSkillStateData] = useState<SkillState>(createSkillState());
  const [castState, setCastState] = useState<CastState | null>(null);
  const [showJobPanel, setShowJobPanel] = useState(false);
  const [showSocialPanel, setShowSocialPanel] = useState(false);
  const [showShop, setShowShop] = useState(false);
  const skillStateRef = useRef<SkillState>(createSkillState());
  const castStateRef = useRef<CastState | null>(null);

  // ---- Persist job / class progress to localStorage -----------------

  // Restore job on mount
  useEffect(() => {
    try {
      const raw = typeof window !== "undefined" ? window.localStorage.getItem("pixelrealm_job") : null;
      if (raw) {
        const saved = JSON.parse(raw) as Partial<PlayerJob>;
        if (saved.jobClass) setPlayerJob(prev => ({ ...prev, ...saved }));
      }
    } catch { /* ignore */ }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Save job whenever it changes (throttle via debounce)
  const jobSaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    if (!gameStarted) return;
    if (jobSaveTimerRef.current) clearTimeout(jobSaveTimerRef.current);
    jobSaveTimerRef.current = setTimeout(() => {
      try {
        if (typeof window !== "undefined") {
          window.localStorage.setItem("pixelrealm_job", JSON.stringify(playerJob));
        }
      } catch { /* ignore */ }
    }, 2000);
    return () => { if (jobSaveTimerRef.current) clearTimeout(jobSaveTimerRef.current); };
  }, [playerJob, gameStarted]);

  // SP regen — regenerate 1 SP per second
  useEffect(() => {
    if (!gameStarted) return;
    const t = setInterval(() => {
      setPlayerJob(prev => {
        if (prev.sp >= prev.maxSp) return prev;
        return { ...prev, sp: Math.min(prev.maxSp, prev.sp + 1) };
      });
    }, 1000);
    return () => clearInterval(t);
  }, [gameStarted]);

  // Cast completion checker
  useEffect(() => {
    if (!castStateRef.current) return;
    const interval = setInterval(() => {
      if (!castStateRef.current) return;
      const { newState, skillId } = completeCast(skillStateRef.current, Date.now());
      if (skillId) {
        skillStateRef.current = newState;
        setSkillStateData({ ...newState });
        castStateRef.current = null;
        setCastState(null);
        // Skill fired — apply SP cost
        const def = SKILLS[skillId];
        if (def) {
          setPlayerJob(prev => ({ ...prev, sp: Math.max(0, prev.sp - def.spCost) }));
        }
      }
    }, 30);
    return () => clearInterval(interval);
  }, [castState]);

  // Zone state
  const [nearbyPortal, setNearbyPortal] = useState<(PortalDefinition & { worldX: number; worldY: number }) | null>(null);
  const [zoneTraveling, setZoneTraveling] = useState(false);
  const [travelingToZone, setTravelingToZone] = useState<string | null>(null);
  const [dismissedPortal, setDismissedPortal] = useState<string | null>(null);

  // Network — either a real WebSocket server or the in-browser sim
  const simRef    = useRef<GameSimulator | null>(null);
  const netRef    = useRef<GameNetworkClient | null>(null);
  const usingServerRef = useRef(false);
  const [usingServer, setUsingServer] = useState(false);

  // Entity name lookup
  const entityNameMap = useRef<Map<string, string>>(new Map());
  const localPlayerIdRef = useRef<string | null>(null);
  const prevLevelRef = useRef(1);
  const stepCountRef = useRef(0);
  const lastPingSentRef = useRef(0);

  // Audio
  const sfxPlayer = useSfx();
  const { play: playMusic, stop: stopMusic } = useSong();

  // ---- Generate assets when PixiJS is ready --------------------------

  useEffect(() => {
    if (!pixiReady) return;
    if (typeof window === "undefined") return;

    import("./pixi-loader").then(({ generateAssets }) => {
      const generatedAssets = generateAssets();
      setAssets(generatedAssets);
    });
  }, [pixiReady]);

  // ---- Shared message handler -----------------------------------------

  const handleSimMessage = useCallback((msg: { type: string; [key: string]: unknown }) => {
    if (msg.type === "init") {
      const m = msg as unknown as { playerId: string; tilemap: TileMap; entities: Entity[]; zoneId: string; droppedItems?: DroppedItem[] };
      setLocalPlayerId(m.playerId);
      localPlayerIdRef.current = m.playerId;
      // Use zone-specific tilemap if available, fall back to server tilemap
      const zKey = m.zoneId as ZoneKey;
      const zoneTilemap = ZONE_TILEMAPS[zKey];
      setTilemap(zoneTilemap ? (zoneTilemap as unknown as TileMap) : m.tilemap);
      setEntities(m.entities);
      setZone(m.zoneId);
      setDroppedItems(m.droppedItems || []);
      setConnected(true);
      setZoneTraveling(false);
      setTravelingToZone(null);
      setNearbyPortal(null);
      setDismissedPortal(null);
      for (const e of m.entities) entityNameMap.current.set(e.id, e.name);
    } else if (msg.type === "state_snapshot") {
      const m = msg as unknown as { entities: Entity[]; droppedItems: DroppedItem[]; damages: DamageEvent[]; timestamp?: number };
      setEntities(m.entities);
      setDroppedItems(m.droppedItems);
      // Ping: use server timestamp diff for real server, fixed 66ms for sim
      if (m.timestamp && usingServerRef.current) {
        handleServerPing(m.timestamp);
      } else {
        setPing(Math.round(1000 / 15));
      }
      setConnectedPlayers(m.entities.filter((e: Entity) => e.type === "player" || e.type === "agent").length);
      for (const e of m.entities) entityNameMap.current.set(e.id, e.name);

      // Sync inventory from player entity
      const localEFull = m.entities.find((e: Entity) => e.id === localPlayerIdRef.current) as PlayerEntity | undefined;
      if (localEFull && Array.isArray((localEFull as unknown as { inventory?: unknown[] }).inventory)) {
        setInventory((localEFull as unknown as { inventory: import("./types").Item[] }).inventory);
      }

      // Level-up SFX — detect when local player's level increases
      const localE = m.entities.find((e: Entity) => e.id === localPlayerIdRef.current) as PlayerEntity | undefined;
      if (localE) {
        const newLevel = localE.stats?.level ?? (localE as unknown as { level?: number }).level ?? 1;
        if (newLevel > prevLevelRef.current) {
          prevLevelRef.current = newLevel;
          sfxPlayer.play(sfxLevelUp);
          // Also gain job XP on level up
          setPlayerJob(prev => gainJobXp(prev, 50));
          // Save progress on level-up
          simRef.current?.saveProgress();
        }
      }

      if (m.damages.length > 0) {
        setDamages(m.damages);
        setTimeout(() => setDamages([]), 200);
      }
    } else if (msg.type === "damage") {
      const m = msg as unknown as { event: DamageEvent };
      setDamages([m.event]);
      setTimeout(() => setDamages([]), 200);
      // Play SFX: crit vs normal, player-hurt vs hit
      if (m.event) {
        if (m.event.entityId === localPlayerIdRef.current) {
          sfxPlayer.play(sfxPlayerHurt);
        } else if (m.event.isCrit) {
          sfxPlayer.play(sfxCritHit);
        } else {
          sfxPlayer.play(sfxHit);
        }
      }
    } else if (msg.type === "entity_died") {
      const m = msg as unknown as { entityId: string; killerId: string };
      const killerName = entityNameMap.current.get(m.killerId) || "World";
      const targetName = entityNameMap.current.get(m.entityId) || "Someone";
      setKillFeed(prev => [...prev.slice(-10), {
        id: `${m.entityId}-${Date.now()}`,
        killerName,
        targetName,
        timestamp: Date.now(),
      }]);
      // If local player died, show a respawn countdown overlay
      if (m.entityId === localPlayerIdRef.current) {
        setConnected(false); // triggers "Entering the Realm" → replaced with respawn screen below
        setRespawning(true);
        setTimeout(() => setRespawning(false), 3200);
      } else {
        sfxPlayer.play(sfxEnemyDie);
        // If local player killed this entity, save progress (got XP/gold)
        if (m.killerId === localPlayerIdRef.current) {
          setTimeout(() => simRef.current?.saveProgress(), 200);
        }
      }
    }
  }, []);

  // ---- Connect to game server (WS server or sim fallback) ------------

  const connect = useCallback(() => {
    if (simRef.current || netRef.current) return; // already running

    const wsUrl = process.env.NEXT_PUBLIC_GAME_WS_URL;

    if (wsUrl) {
      // ── Real WebSocket server path ──────────────────────────────────────
      console.log("[Network] Connecting to game server:", wsUrl);
      usingServerRef.current = true;
      setUsingServer(true);

      const client = new GameNetworkClient(wsUrl);
      netRef.current = client;

      // Wire all server messages through the same handleSimMessage handler
      // (it speaks the same protocol as the server)
      client.on("init", (msg) => handleSimMessage(msg as unknown as { type: string; [k: string]: unknown }));
      client.on("state_snapshot", (msg) => handleSimMessage(msg as unknown as { type: string; [k: string]: unknown }));
      client.on("damage", (msg) => handleSimMessage(msg as unknown as { type: string; [k: string]: unknown }));
      client.on("entity_died", (msg) => handleSimMessage(msg as unknown as { type: string; [k: string]: unknown }));
      client.on("chat", (msg) => {
        setChatMessages(prev => [...prev.slice(-50), {
          id: `chat-${Date.now()}`,
          playerId: msg.playerId,
          playerName: entityNameMap.current.get(msg.playerId) ?? msg.playerId.slice(0, 8),
          text: msg.text,
          timestamp: msg.timestamp,
        }]);
      });
      client.on("disconnected", () => {
        // Will auto-reconnect — show loading while re-connecting
        setConnected(false);
      });
      client.on("connected", () => {
        // Send Farcaster identity immediately on (re-)connect
        // user ref is captured via closure below — handled in useEffect
      });

      client.connect();

    } else {
      // ── In-browser sim fallback ─────────────────────────────────────────
      console.log("[Network] No WS URL — using local simulator");
      setUsingServer(false);
      const sim = new GameSimulator();
      simRef.current = sim;
      sim.on(handleSimMessage);
      sim.start();
    }
  }, [handleSimMessage]);

  // ---- Auto-save progress every 10s (sim mode only) ------------------
  // In server mode, the server persists via DATABASE_URL on the backend.

  useEffect(() => {
    if (!gameStarted || usingServerRef.current) return;
    const t = setInterval(() => {
      simRef.current?.saveProgress();
    }, 10_000);
    return () => clearInterval(t);
  }, [gameStarted]);

  // ---- Send Farcaster identity when user & net are both ready --------

  useEffect(() => {
    if (!netRef.current || !gameStarted) return;
    if (user?.username || user?.fid) {
      netRef.current.setIdentity(user.username ?? null, user.fid ?? null);
    }
  }, [user, gameStarted]);

  // ---- Real ping measurement for server mode -------------------------
  // The GameNetworkClient pings every 15s; intercept state_snapshot
  // timestamps to derive a rough RTT without needing raw WS access.
  // We use Date.now() delta against the server's snapshot timestamp.

  const handleServerPing = useCallback((serverTimestamp: number) => {
    const rtt = Math.max(5, Date.now() - serverTimestamp);
    setPing(Math.round(rtt));
  }, []);

  // ---- Disconnect on unmount -----------------------------------------

  useEffect(() => {
    return () => {
      simRef.current?.saveProgress(); // save before stopping
      simRef.current?.stop();
      simRef.current = null;
      netRef.current?.disconnect();
      netRef.current = null;
      stopMusic();
    };
  }, [stopMusic]);

  // ---- Game handlers -------------------------------------------------

  const handleMove = useCallback((direction: Direction | null, position: WorldPosition) => {
    if (netRef.current) {
      // Real server: send direction key set (server derives position from keys)
      netRef.current.sendMove(direction);
    } else {
      // Sim: send full position for click-to-move support
      simRef.current?.setPlayerMove(direction, position);
    }
    // Footstep every 6 move events
    if (direction) {
      stepCountRef.current++;
      if (stepCountRef.current % 6 === 0) {
        sfxPlayer.play(sfxStep);
      }
    }
    // Portal proximity detection (check every 4 frames to save cycles)
    if (stepCountRef.current % 4 === 0 && position) {
      const portal = getNearbyPortal(position, zone as ZoneKey);
      if (portal && portal.id !== dismissedPortal) {
        setNearbyPortal(portal);
      } else if (!portal) {
        setNearbyPortal(null);
      }
    }
  }, [sfxPlayer, zone, dismissedPortal]);

  const handleAttack = useCallback((targetId: EntityId) => {
    if (netRef.current) {
      netRef.current.sendAttack(targetId);
    } else {
      simRef.current?.setPlayerAttack(targetId);
    }
    sfxPlayer.play(sfxSwing);
  }, [sfxPlayer]);

  const handleEntityClick = useCallback((entityId: EntityId) => {
    // Could open entity info panel in future
  }, []);

  // ---- Inventory handlers -------------------------------------------

  const handleEquipItem = useCallback((item: import("./types").Item, slot: EquipSlot) => {
    setEquipment(prev => ({ ...prev, [slot]: item }));
    sfxPlayer.play(sfx.menuSelect);
  }, [sfxPlayer]);

  const handleUnequipSlot = useCallback((slot: EquipSlot) => {
    setEquipment(prev => ({ ...prev, [slot]: null }));
    sfxPlayer.play(sfx.click);
  }, [sfxPlayer]);

  const handleUseItem = useCallback((item: import("./types").Item) => {
    // Remove from inventory and apply effect (HP handled via sim)
    setInventory(prev => {
      const idx = prev.findIndex(i => i.id === item.id);
      if (idx === -1) return prev;
      const next = [...prev];
      if (next[idx].quantity > 1) {
        next[idx] = { ...next[idx], quantity: next[idx].quantity - 1 };
      } else {
        next.splice(idx, 1);
      }
      return next;
    });
    sfxPlayer.play(sfx.powerup);
  }, [sfxPlayer]);

  const handleDropItem = useCallback((item: import("./types").Item) => {
    setInventory(prev => prev.filter(i => i.id !== item.id));
    setEquipment(prev => {
      const next = { ...prev };
      for (const slot of Object.keys(next) as EquipSlot[]) {
        if (next[slot]?.id === item.id) next[slot] = null;
      }
      return next;
    });
  }, []);

  // ---- Shop handlers -------------------------------------------------

  const handleBuyItem = useCallback((shopItem: ShopItem) => {
    // Deduct gold (stored on the server entity; we mirror it locally via a
    // synthetic inventory entry so the UI stays in sync without a round-trip)
    const newItem: import("./types").Item = {
      id: `bought_${shopItem.id}_${Date.now()}`,
      itemType: shopItem.itemType,
      name: shopItem.name,
      description: shopItem.description,
      value: shopItem.buyPrice,
      stats: shopItem.stats as Partial<import("./types").EntityStats> | undefined,
      quantity: 1,
    };
    setInventory(prev => {
      // Stack potions / materials
      if (shopItem.itemType === "potion" || shopItem.itemType === "material") {
        const existing = prev.findIndex(i => i.name === shopItem.name);
        if (existing !== -1) {
          const next = [...prev];
          next[existing] = { ...next[existing], quantity: next[existing].quantity + 1 };
          return next;
        }
      }
      return [...prev, newItem];
    });
    // Deduct gold from local player mirror (sim mode only — server tracks gold authoritatively)
    if (simRef.current) {
      simRef.current.spendGold?.(shopItem.buyPrice);
    }
    sfxPlayer.play(sfx.coin);
  }, [sfxPlayer]);

  const handleSellItem = useCallback((item: import("./types").Item) => {
    const sellPrice = Math.max(1, Math.floor(item.value * 0.4));
    setInventory(prev => {
      const idx = prev.findIndex(i => i.id === item.id);
      if (idx === -1) return prev;
      const next = [...prev];
      if (next[idx].quantity > 1) {
        next[idx] = { ...next[idx], quantity: next[idx].quantity - 1 };
      } else {
        next.splice(idx, 1);
      }
      return next;
    });
    // Earn gold locally in sim mode (server tracks gold in real mode)
    if (simRef.current) {
      simRef.current.earnGold?.(sellPrice);
    }
    sfxPlayer.play(sfx.coin);
  }, [sfxPlayer]);

  // ---- Skill casting -------------------------------------------------

  const handleCastSkill = useCallback((skillId: SkillId) => {
    const def = SKILLS[skillId];
    if (!def) return;
    if (playerJob.sp < def.spCost) return;

    const now = Date.now();
    const newState = startCast(skillStateRef.current, skillId, now, localPlayerIdRef.current ?? undefined);
    skillStateRef.current = newState;
    setSkillStateData({ ...newState });

    if (def.castTime > 0) {
      const cs: CastState = {
        skillId,
        skillName: def.name,
        startTime: now,
        duration: def.castTime,
      };
      castStateRef.current = cs;
      setCastState(cs);
    } else {
      // Instant cast — consume SP immediately
      setPlayerJob(prev => ({ ...prev, sp: Math.max(0, prev.sp - def.spCost) }));
      // Award job XP for using skills
      setPlayerJob(prev => gainJobXp(prev, 5));
    }

    sfxPlayer.play(sfx.click);
  }, [playerJob.sp, sfxPlayer]);

  // ---- Job advancement -----------------------------------------------

  const handleJobAdvance = useCallback((newJobClass: JobClass) => {
    const level = (entities.find(e => e.id === localPlayerIdRef.current) as PlayerEntity | undefined)?.stats?.level ?? 1;
    setPlayerJob(prev => advanceJob(prev, newJobClass, level));
    setShowJobPanel(false);
    sfxPlayer.play(sfxLevelUp);
  }, [entities, sfxPlayer]);

  // ---- Interrupt cast on move ----------------------------------------

  const handleMoveWithCastInterrupt = useCallback((direction: import("./types").Direction | null, position: import("./types").WorldPosition) => {
    // Interrupt cast if moving
    if (direction && castStateRef.current) {
      const newState = interruptCast(skillStateRef.current);
      skillStateRef.current = newState;
      setSkillStateData({ ...newState });
      castStateRef.current = null;
      setCastState(null);
    }
    handleMove(direction, position);
  }, [handleMove]);

  const handlePickupItem = useCallback((droppedItemId: string) => {
    if (netRef.current) {
      netRef.current.sendPickup(droppedItemId);
    } else {
      simRef.current?.pickUpItem(droppedItemId);
    }
    sfxPlayer.play(sfx.coin);
  }, [sfxPlayer]);

  const handleSendChat = useCallback((text: string) => {
    if (netRef.current) {
      netRef.current.sendChat(text);
    }
    // No-op in sim mode — chat needs a real server
  }, []);

  const handleEnterZone = useCallback((targetZoneId: string) => {
    setZoneTraveling(true);
    setTravelingToZone(targetZoneId);
    setNearbyPortal(null);
    if (netRef.current) {
      netRef.current.sendChangeZone(targetZoneId);
    } else {
      simRef.current?.changeZone(targetZoneId);
    }
  }, []);

  // ---- Local player --------------------------------------------------

  const localPlayer = useMemo(
    () => entities.find(e => e.id === localPlayerId) as PlayerEntity | undefined,
    [entities, localPlayerId]
  );

  // ---- Start game ----------------------------------------------------

  const handleStartGame = useCallback(() => {
    sfxPlayer.play(sfxEnterRealm);
    setShowTitleScreen(false);
    setGameStarted(true);
    connect();
    // Start background music after a short delay (lets enter-realm SFX play first)
    setTimeout(() => playMusic(GAME_MUSIC), 1200);

    // Safety timeout: if PixiJS still hasn't loaded after 6s, force-ready
    // so the game attempts to run (will log a warning if PIXI unavailable)
    if (!pixiReady) {
      setTimeout(() => {
        setPixiReady(prev => {
          if (!prev) console.warn("[PixiJS] Load timeout — forcing ready state");
          return true;
        });
      }, 6000);
    }
  }, [connect, sfxPlayer, pixiReady]);

  // ---- Render --------------------------------------------------------

  return (
    <div
      style={{
        width: "100vw",
        maxWidth: 424,
        height: "100dvh",
        background: "#0f0820",
        overflow: "hidden",
        position: "relative",
        fontFamily: "monospace",
        margin: "0 auto",
      }}
    >
      {/* PixiJS CDN — primary loader; parallel fallbacks injected on error */}
      <Script
        src="https://cdnjs.cloudflare.com/ajax/libs/pixi.js/7.4.2/pixi.min.js"
        strategy="afterInteractive"
        onLoad={() => setPixiReady(true)}
        onError={() => {
          // Primary failed — race all fallbacks in parallel, first to load wins
          let done = false;
          const onSuccess = () => {
            if (done) return;
            done = true;
            setPixiReady(true);
          };
          const onAllFailed = (() => {
            let failures = 0;
            return () => {
              failures++;
              if (failures >= 2) {
                console.warn("[PixiJS] All CDNs failed — running without WebGL renderer");
                if (!done) { done = true; setPixiReady(true); }
              }
            };
          })();

          const s1 = document.createElement("script");
          s1.src = "https://pixijs.download/v7.4.2/pixi.min.js";
          s1.onload = onSuccess;
          s1.onerror = onAllFailed;
          document.head.appendChild(s1);

          const s2 = document.createElement("script");
          s2.src = "https://cdn.jsdelivr.net/npm/pixi.js@7.4.2/dist/pixi.min.js";
          s2.onload = onSuccess;
          s2.onerror = onAllFailed;
          document.head.appendChild(s2);
        }}
      />

      {/* Title Screen */}
      {showTitleScreen && (
        <TitleScreen
          onStart={handleStartGame}
          isPixiReady={pixiReady}
          username={user?.username}
          fid={user?.fid ?? 0}
          onShowLeaderboard={() => setShowLeaderboard(true)}
        />
      )}

      {/* Leaderboard overlay */}
      {showLeaderboard && (
        <LeaderboardScreen onClose={() => setShowLeaderboard(false)} />
      )}

      {/* Game */}
      {gameStarted && pixiReady && assets && (
        <div style={{ position: "relative", width: "100%", height: "100%" }}>
          {/* PixiJS Renderer */}
          {tilemap && (
            <PixiGame
              assets={assets}
              tilemap={tilemap}
              entities={entities}
              droppedItems={droppedItems}
              localPlayerId={localPlayerId}
              damages={damages}
              zoneId={zone}
              onMove={handleMoveWithCastInterrupt}
              onAttack={handleAttack}
              onEntityClick={handleEntityClick}
            />
          )}

          {/* HUD overlay */}
          <GameHUD
            player={localPlayer || null}
            entities={entities}
            tilemap={tilemap}
            localPlayerId={localPlayerId}
            connectedPlayers={connectedPlayers}
            ping={ping}
            chatMessages={chatMessages}
            killFeed={killFeed}
            onSendChat={handleSendChat}
            zone={zone}
            job={playerJob}
            castState={castState}
            onOpenJobPanel={() => setShowJobPanel(true)}
            onOpenSocialPanel={() => setShowSocialPanel(true)}
            isMultiplayer={usingServer}
          />

          {/* Cast bar overlay — centered, shown during skill casting */}
          <CastBar castState={castState} />

          {/* Job panel */}
          {showJobPanel && (
            <JobPanel
              job={playerJob}
              playerLevel={localPlayer?.stats?.level ?? 1}
              onAdvance={handleJobAdvance}
              onClose={() => setShowJobPanel(false)}
            />
          )}

          {/* Shop panel */}
          {showShop && (
            <ShopPanel
              gold={localPlayer?.gold ?? 0}
              inventory={inventory}
              onBuy={handleBuyItem}
              onSell={handleSellItem}
              onClose={() => setShowShop(false)}
            />
          )}

          {/* Social panel (party & guild) */}
          {showSocialPanel && (
            <SocialPanel
              localPlayerId={localPlayerId ?? ""}
              localPlayerName={localPlayer?.name ?? user?.username ?? "Adventurer"}
              localPlayerLevel={localPlayer?.stats?.level ?? 1}
              localPlayerJob={playerJob.jobClass}
              localPlayerHp={localPlayer?.stats?.hp ?? 100}
              localPlayerMaxHp={localPlayer?.stats?.maxHp ?? 100}
              onClose={() => setShowSocialPanel(false)}
            />
          )}

          {/* ── Bottom action bar ── */}
          {/* Layout: [Skill✨] [⚔ ATTACK] [🏪] [🎒] */}
          <div style={{
            position: "absolute",
            bottom: 0,
            left: 0,
            right: 0,
            background: "linear-gradient(0deg, rgba(5,2,14,0.97) 0%, rgba(5,2,14,0.88) 100%)",
            borderTop: "1px solid rgba(212,160,23,0.25)",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "0 10px",
            paddingBottom: "max(10px, env(safe-area-inset-bottom))",
            paddingTop: 10,
            gap: 8,
            pointerEvents: "all",
            zIndex: 250,
            boxShadow: "0 -4px 20px rgba(0,0,0,0.8)",
          }}>
            {/* Skill wheel (left of center) */}
            <SkillWheel
              job={playerJob}
              skillState={skillStateData}
              onCastSkill={handleCastSkill}
            />

            {/* Attack button — center, prominent */}
            <AttackButtonCentered
              onActivate={() => {
                const localPlayerNow = entities.find(en => en.id === localPlayerId);
                if (!localPlayerNow) return;
                let nearest: Entity | null = null;
                let nearestDist = 220;
                for (const entity of entities) {
                  if (entity.id === localPlayerId) continue;
                  if (entity.state === "dead") continue;
                  const dx = entity.position.x - localPlayerNow.position.x;
                  const dy = entity.position.y - localPlayerNow.position.y;
                  const d = Math.sqrt(dx * dx + dy * dy);
                  if (d < nearestDist) { nearestDist = d; nearest = entity; }
                }
                if (nearest) handleAttack(nearest.id);
              }}
            />

            {/* Right side: shop + bag */}
            <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
              <ActionBarButton
                icon="🏪"
                label="Shop"
                active={showShop}
                activeColor="#f0b429"
                onClick={() => setShowShop(v => !v)}
              />
              <ActionBarButton
                icon="🎒"
                label={inventory.length > 0 ? `${inventory.length}` : "Bag"}
                active={showInventory}
                activeColor="#a78bfa"
                onClick={() => setShowInventory(v => !v)}
              />
            </div>
          </div>

          {/* Inventory panel */}
          {showInventory && (
            <InventoryPanel
              inventory={inventory}
              equipment={equipment}
              gold={localPlayer?.gold ?? 0}
              fid={user?.fid ?? 0}
              onEquip={handleEquipItem}
              onUnequip={handleUnequipSlot}
              onUse={handleUseItem}
              onDrop={handleDropItem}
              onForged={(forgedItemId) => {
                // Remove the forged item from local inventory immediately
                setInventory(prev => prev.filter(i => i.id !== forgedItemId));
              }}
              onClose={() => setShowInventory(false)}
            />
          )}

          {/* Dropped item pickup prompt — show closest item only */}
          {droppedItems.length > 0 && (() => {
            // Find the item closest to the local player
            const lp = entities.find(e => e.id === localPlayerId);
            let closest = droppedItems[0];
            if (lp) {
              let minD = Infinity;
              for (const di of droppedItems) {
                const dx = (di.position?.x ?? di.worldX ?? 0) - lp.position.x;
                const dy = (di.position?.y ?? di.worldY ?? 0) - lp.position.y;
                const d = dx * dx + dy * dy;
                if (d < minD) { minD = d; closest = di; }
              }
              if (minD > 80 * 80) return null; // too far — don't show
            }
            return (
              <button
                key={closest.id}
                onClick={() => handlePickupItem(closest.id)}
                style={{
                  position: "absolute",
                  bottom: "calc(80px + env(safe-area-inset-bottom, 0px))",
                  left: "50%",
                  transform: "translateX(-50%)",
                  background: "rgba(212,160,23,0.18)",
                  border: "1px solid rgba(212,160,23,0.55)",
                  borderRadius: 6,
                  color: "#f0b429",
                  fontSize: 11,
                  fontFamily: "monospace",
                  padding: "5px 16px",
                  cursor: "pointer",
                  pointerEvents: "all",
                  zIndex: 250,
                  whiteSpace: "nowrap",
                  boxShadow: "0 2px 8px rgba(0,0,0,0.5)",
                  letterSpacing: 0.5,
                }}
              >
                ▲ Pick up {closest.item?.name ?? "Item"}
                {droppedItems.length > 1 && (
                  <span style={{ color: "#a07820", marginLeft: 6, fontSize: 9 }}>
                    +{droppedItems.length - 1} more
                  </span>
                )}
              </button>
            );
          })()}

          {/* Zone portal prompt */}
          {nearbyPortal && !zoneTraveling && !showInventory && (
            <ZonePortalPrompt
              portal={nearbyPortal}
              currentZone={zone}
              onEnter={handleEnterZone}
              onDismiss={() => {
                setDismissedPortal(nearbyPortal.id);
                setNearbyPortal(null);
              }}
              isLoading={zoneTraveling}
            />
          )}

          {/* Zone transition loading screen */}
          {zoneTraveling && travelingToZone && (
            <ZoneTransitionScreen targetZone={travelingToZone} />
          )}

          {/* Connection status / respawn overlay */}
          {!connected && (
            <div
              style={{
                position: "absolute",
                inset: 0,
                background: "rgba(5,2,14,0.92)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                zIndex: 500,
                fontFamily: "monospace",
              }}
            >
              {respawning ? (
                <RespawnOverlay />
              ) : (
                <div style={{ textAlign: "center" }}>
                  <div style={{ fontSize: 36, marginBottom: 12 }}>⚔️</div>
                  <div style={{ color: "#f0b429", fontSize: 14, fontWeight: "bold", letterSpacing: 2, marginBottom: 6 }}>
                    Entering the Realm...
                  </div>
                  <div style={{ color: "#555", fontSize: 10, letterSpacing: 1 }}>
                    Spawning world & entities
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Shared keyframe animations for game area */}
      <style>{`
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
      `}</style>

      {/* Loading assets */}
      {gameStarted && pixiReady && !assets && (
        <div
          style={{
            position: "absolute",
            inset: 0,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            flexDirection: "column",
            gap: 16,
            background: "#0f0820",
          }}
        >
          <div style={{ color: "#f0b429", fontSize: 16, fontWeight: "bold", letterSpacing: 2 }}>
            Generating Assets...
          </div>
          <div style={{ color: "#666", fontSize: 11 }}>
            Crafting pixel art world
          </div>
          <PixelLoadingBar />
        </div>
      )}

      {/* Waiting for PixiJS — only shown after user starts the game */}
      {gameStarted && !pixiReady && (
        <div
          style={{
            position: "absolute",
            inset: 0,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            gap: 16,
            background: "#0f0820",
          }}
        >
          <div style={{ fontSize: 40 }}>⚔️</div>
          <div style={{ color: "#f0b429", fontSize: 14, fontFamily: "monospace", letterSpacing: 2 }}>
            Loading Engine...
          </div>
          <PixelLoadingBar />
          <div style={{ color: "#444", fontSize: 10, fontFamily: "monospace" }}>
            Downloading PixiJS WebGL renderer
          </div>
        </div>
      )}
    </div>
  );
}

// ---- Title Screen ------------------------------------------------------

const STARTER_CLASSES = [
  { icon: "⚔️", name: "Swordsman", desc: "High HP & defense", color: "#ff6644" },
  { icon: "🔮", name: "Mage",      desc: "Powerful magic AoE", color: "#a855f7" },
  { icon: "🏹", name: "Archer",   desc: "Fast & ranged DPS",  color: "#44cc88" },
];

function TitleScreen({ onStart, isPixiReady, username, fid, onShowLeaderboard }: {
  onStart: () => void;
  isPixiReady: boolean;
  username?: string;
  fid: number;
  onShowLeaderboard: () => void;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rafRef = useRef<number>(0);
  const [visible, setVisible] = useState(false);
  const [btnHover, setBtnHover] = useState(false);
  const [btnPulse, setBtnPulse] = useState(false);
  const [selectedClass, setSelectedClass] = useState(0);
  const [enginePct, setEnginePct] = useState(0);

  // Stagger-in
  useEffect(() => {
    const t = setTimeout(() => setVisible(true), 60);
    return () => clearTimeout(t);
  }, []);

  // Pulse button
  useEffect(() => {
    const t = setInterval(() => {
      setBtnPulse(true);
      setTimeout(() => setBtnPulse(false), 400);
    }, 2400);
    return () => clearInterval(t);
  }, []);

  // Simulate engine load progress bar — single effect, re-runs when isPixiReady changes
  useEffect(() => {
    if (isPixiReady) {
      setEnginePct(100);
      return;
    }
    // Animate from current value up toward 90%, then wait for the real signal
    let pct = 0;
    const t = setInterval(() => {
      pct += Math.random() * 14 + 4;
      const capped = Math.min(90, pct);
      setEnginePct(capped);
      if (capped >= 90) clearInterval(t);
    }, 180);
    return () => clearInterval(t);
  }, [isPixiReady]);

  // Canvas animation loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const W = canvas.width, H = canvas.height;

    const makeStar = (layer: number) => ({
      x: Math.random() * W, y: Math.random() * H,
      r: layer === 0 ? 0.6 : layer === 1 ? 1.1 : 1.7,
      speed: layer === 0 ? 0.07 : layer === 1 ? 0.16 : 0.32,
      twinkle: Math.random() * Math.PI * 2,
      twinkleSpeed: 0.02 + Math.random() * 0.03,
    });
    const layers = [
      Array.from({ length: 60 }, () => makeStar(0)),
      Array.from({ length: 35 }, () => makeStar(1)),
      Array.from({ length: 15 }, () => makeStar(2)),
    ];
    const RUNES = ["✦", "✧", "◆", "◇", "⬡", "⬟"];
    const particles = Array.from({ length: 14 }, (_, i) => ({
      x: Math.random() * W, y: H + Math.random() * 80,
      vy: -(0.3 + Math.random() * 0.4), vx: (Math.random() - 0.5) * 0.25,
      alpha: 0, maxAlpha: 0.12 + Math.random() * 0.16,
      size: 8 + Math.random() * 9,
      rune: RUNES[i % RUNES.length],
      color: i % 3 === 0 ? "#f0b429" : i % 3 === 1 ? "#7c3aed" : "#4ecdc4",
    }));
    let t = 0;

    function draw() {
      ctx!.clearRect(0, 0, W, H);
      const bg = ctx!.createLinearGradient(0, 0, 0, H);
      bg.addColorStop(0, "#060312"); bg.addColorStop(0.5, "#0f0820"); bg.addColorStop(1, "#0a1628");
      ctx!.fillStyle = bg; ctx!.fillRect(0, 0, W, H);

      const cx = W / 2, cy = H * 0.3;
      const pulse = Math.sin(t * 0.014) * 0.1 + 1;
      const g1 = ctx!.createRadialGradient(cx, cy, 0, cx, cy, 150 * pulse);
      g1.addColorStop(0, "rgba(124,58,237,0.14)"); g1.addColorStop(1, "transparent");
      ctx!.fillStyle = g1; ctx!.beginPath(); ctx!.ellipse(cx, cy, 150 * pulse, 110 * pulse, 0, 0, Math.PI * 2); ctx!.fill();

      layers.forEach((layer, li) => layer.forEach(s => {
        s.twinkle += s.twinkleSpeed; s.y -= s.speed;
        if (s.y < -2) { s.y = H + 2; s.x = Math.random() * W; }
        const a = 0.4 + Math.sin(s.twinkle) * 0.35;
        ctx!.beginPath(); ctx!.arc(s.x, s.y, s.r, 0, Math.PI * 2);
        ctx!.fillStyle = li === 2 ? `rgba(220,200,255,${a})` : `rgba(255,255,255,${a * 0.7})`;
        ctx!.fill();
      }));

      particles.forEach(p => {
        p.x += p.vx; p.y += p.vy;
        if (p.y < -30) { p.y = H + 10; p.x = Math.random() * W; p.alpha = 0; }
        p.alpha = Math.min(p.alpha + 0.004, p.maxAlpha);
        ctx!.globalAlpha = p.alpha;
        ctx!.font = `${p.size}px monospace`; ctx!.fillStyle = p.color;
        ctx!.fillText(p.rune, p.x, p.y);
      });
      ctx!.globalAlpha = 1;
      t++;
      rafRef.current = requestAnimationFrame(draw);
    }
    draw();
    return () => cancelAnimationFrame(rafRef.current);
  }, []);

  const fadeUp = (delay: number): CSSProperties => ({
    opacity: visible ? 1 : 0,
    transform: visible ? "translateY(0)" : "translateY(16px)",
    transition: `opacity 0.55s ease ${delay}ms, transform 0.55s ease ${delay}ms`,
  });

  const cls = STARTER_CLASSES[selectedClass];

  return (
    <div style={{ position: "absolute", inset: 0, overflow: "hidden", fontFamily: "monospace" }}>
      <canvas ref={canvasRef} width={424} height={760}
        style={{ position: "absolute", inset: 0, width: "100%", height: "100%" }} />

      {/* Scrollable content */}
      <div style={{
        position: "absolute", inset: 0, overflowY: "auto",
        display: "flex", flexDirection: "column",
        alignItems: "center", padding: "28px 20px 24px",
        gap: 0,
      }}>

        {/* ── Logo + title ── */}
        <div style={{ ...fadeUp(80), textAlign: "center", marginBottom: 16 }}>
          <div style={{ position: "relative", width: 88, height: 88, margin: "0 auto 14px" }}>
            <div style={{
              position: "absolute", inset: -5, borderRadius: "50%",
              border: "1.5px solid rgba(240,180,41,0.28)",
              animation: "spin 8s linear infinite",
            }} />
            <div style={{
              position: "absolute", inset: 1, borderRadius: "50%",
              border: "1px dashed rgba(124,58,237,0.38)",
              animation: "spinReverse 13s linear infinite",
            }} />
            <div style={{
              position: "absolute", inset: 7, borderRadius: "50%",
              background: "radial-gradient(circle at 38% 38%, #a855f7 0%, #7c3aed 45%, #3b0764 100%)",
              boxShadow: "0 0 28px #7c3aed90, 0 0 56px #7c3aed40, inset 0 0 18px rgba(255,255,255,0.08)",
              display: "flex", alignItems: "center", justifyContent: "center", fontSize: 32,
            }}>⚔️</div>
          </div>
          <div style={{
            fontSize: 28, fontWeight: "bold", color: "#f0b429", letterSpacing: 4,
            textShadow: "0 0 24px #f0b42970, 0 0 48px #f0b42930",
          }}>PIXEL REALM</div>
          <div style={{ fontSize: 12, color: "#c084fc", letterSpacing: 10, marginTop: 4 }}>ONLINE</div>
          <div style={{ fontSize: 9, color: "#4ecdc490", marginTop: 6, letterSpacing: 2 }}>
            ✦ MMORPG • MULTIPLAYER • RAGNAROK-INSPIRED ✦
          </div>
        </div>

        {/* ── Adventurer card — shows Farcaster identity ── */}
        <div style={{
          ...fadeUp(180),
          width: "100%", maxWidth: 340, marginBottom: 14,
          background: "rgba(255,255,255,0.04)",
          border: "1px solid rgba(240,180,41,0.25)",
          borderRadius: 12, padding: "12px 16px",
          display: "flex", alignItems: "center", gap: 12,
        }}>
          {/* Avatar placeholder / FID badge */}
          <div style={{
            width: 52, height: 52, borderRadius: 10,
            background: "radial-gradient(circle at 38% 38%, #7c3aed, #3b0764)",
            border: "2px solid rgba(124,58,237,0.5)",
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 24, flexShrink: 0,
            boxShadow: "0 0 14px #7c3aed50",
          }}>
            {username ? username.slice(0, 1).toUpperCase() : "?"}
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            {username ? (
              <>
                <div style={{ color: "#f0f0f0", fontSize: 14, fontWeight: "bold", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  @{username}
                </div>
                <div style={{ color: "#666", fontSize: 10, marginTop: 2 }}>
                  FID #{fid} · Novice Adventurer
                </div>
                <div style={{ display: "flex", gap: 4, marginTop: 6 }}>
                  <span style={{ background: "rgba(240,180,41,0.15)", border: "1px solid rgba(240,180,41,0.3)", borderRadius: 3, color: "#f0b429", fontSize: 9, padding: "2px 7px" }}>
                    ✦ Farcaster
                  </span>
                  <span style={{ background: "rgba(68,204,136,0.12)", border: "1px solid rgba(68,204,136,0.3)", borderRadius: 3, color: "#44cc88", fontSize: 9, padding: "2px 7px" }}>
                    Ready
                  </span>
                </div>
              </>
            ) : (
              <>
                <div style={{ color: "#888", fontSize: 13 }}>Guest Adventurer</div>
                <div style={{ color: "#555", fontSize: 10, marginTop: 2 }}>Connect wallet to save progress</div>
                <div style={{ marginTop: 6, pointerEvents: "all" }}>
                  <WalletWidget />
                </div>
              </>
            )}
          </div>
          {username && (
            <div style={{ pointerEvents: "all", flexShrink: 0 }}>
              <WalletWidget />
            </div>
          )}
        </div>

        {/* ── Class selector ── */}
        <div style={{ ...fadeUp(280), width: "100%", maxWidth: 340, marginBottom: 16 }}>
          <div style={{ color: "#888", fontSize: 9, letterSpacing: 2, marginBottom: 8, textAlign: "center" }}>
            CHOOSE YOUR CLASS
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            {STARTER_CLASSES.map((c, i) => (
              <button
                key={c.name}
                onClick={() => setSelectedClass(i)}
                style={{
                  flex: 1, padding: "10px 6px",
                  background: selectedClass === i ? `${c.color}20` : "rgba(255,255,255,0.04)",
                  border: `1.5px solid ${selectedClass === i ? c.color + "80" : "rgba(255,255,255,0.1)"}`,
                  borderRadius: 10, cursor: "pointer",
                  display: "flex", flexDirection: "column", alignItems: "center", gap: 4,
                  transition: "all 0.15s ease",
                  boxShadow: selectedClass === i ? `0 0 12px ${c.color}30` : "none",
                }}
              >
                <span style={{ fontSize: 24 }}>{c.icon}</span>
                <span style={{ color: selectedClass === i ? c.color : "#aaa", fontSize: 10, fontWeight: "bold" }}>{c.name}</span>
                <span style={{ color: "#555", fontSize: 8, textAlign: "center", lineHeight: 1.3 }}>{c.desc}</span>
              </button>
            ))}
          </div>
          {/* Selected class stat preview */}
          <div style={{
            marginTop: 8, padding: "8px 12px",
            background: `${cls.color}10`,
            border: `1px solid ${cls.color}30`,
            borderRadius: 8,
            display: "flex", alignItems: "center", gap: 8,
          }}>
            <span style={{ fontSize: 18 }}>{cls.icon}</span>
            <div>
              <span style={{ color: cls.color, fontSize: 11, fontWeight: "bold" }}>{cls.name}</span>
              <span style={{ color: "#666", fontSize: 10, marginLeft: 8 }}>{cls.desc}</span>
            </div>
            <div style={{ marginLeft: "auto", color: "#444", fontSize: 9 }}>Lv.1 start</div>
          </div>
        </div>

        {/* ── Engine ready indicator ── */}
        <div style={{ ...fadeUp(340), width: "100%", maxWidth: 340, marginBottom: 16 }}>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 5 }}>
            <span style={{ color: "#555", fontSize: 9, letterSpacing: 1 }}>ENGINE STATUS</span>
            <span style={{ color: enginePct >= 100 ? "#44cc88" : "#f0b429", fontSize: 9, letterSpacing: 1 }}>
              {enginePct >= 100 ? "✓ READY" : `${Math.round(enginePct)}%`}
            </span>
          </div>
          <div style={{
            height: 4, background: "rgba(255,255,255,0.08)",
            borderRadius: 2, overflow: "hidden",
          }}>
            <div style={{
              height: "100%", width: `${enginePct}%`,
              background: enginePct >= 100
                ? "linear-gradient(90deg, #44cc88, #22aa66)"
                : "linear-gradient(90deg, #7c3aed, #f0b429)",
              borderRadius: 2,
              transition: "width 0.2s ease, background 0.5s ease",
              boxShadow: enginePct >= 100 ? "0 0 6px #44cc8860" : "0 0 6px #7c3aed60",
            }} />
          </div>
        </div>

        {/* ── Enter button ── */}
        <div style={{ ...fadeUp(400), width: "100%", maxWidth: 340, marginBottom: 14, pointerEvents: "all" }}>
          <button
            onClick={onStart}
            onMouseEnter={() => setBtnHover(true)}
            onMouseLeave={() => setBtnHover(false)}
            style={{
              position: "relative", width: "100%",
              background: btnHover
                ? "linear-gradient(135deg, #9333ea, #6366f1)"
                : "linear-gradient(135deg, #7c3aed, #4f46e5)",
              border: `2px solid ${btnHover ? "#e9d5ff" : "#a78bfa"}`,
              borderRadius: 10, color: "white",
              fontSize: 16, fontWeight: "bold", fontFamily: "monospace",
              letterSpacing: 4, padding: "15px 0",
              cursor: "pointer",
              boxShadow: btnPulse
                ? "0 0 40px #a78bfa, 0 0 80px #7c3aed60, 0 4px 20px rgba(0,0,0,0.7)"
                : btnHover
                  ? "0 0 28px #a78bfa80, 0 4px 20px rgba(0,0,0,0.7)"
                  : "0 0 18px #7c3aed60, 0 4px 16px rgba(0,0,0,0.6)",
              transform: btnHover ? "scale(1.02) translateY(-1px)" : btnPulse ? "scale(1.02)" : "scale(1)",
              transition: "all 0.15s ease", overflow: "hidden",
              minHeight: 54,
            }}
          >
            <div style={{
              position: "absolute", inset: 0,
              background: "linear-gradient(105deg, transparent 30%, rgba(255,255,255,0.07) 50%, transparent 70%)",
              animation: "shimmer 2.5s ease-in-out infinite",
              pointerEvents: "none",
            }} />
            {cls.icon} ENTER AS {cls.name.toUpperCase()}
          </button>
        </div>

        {/* ── Feature pills ── */}
        <div style={{
          ...fadeUp(460),
          display: "flex", gap: 5, flexWrap: "wrap",
          justifyContent: "center", maxWidth: 320, marginBottom: 14,
        }}>
          {[
            { icon: "⚔", label: "Combat" },
            { icon: "🧠", label: "AI Agents" },
            { icon: "🌍", label: "Multiplayer" },
            { icon: "🏪", label: "Shop" },
            { icon: "👥", label: "Parties" },
            { icon: "🏰", label: "Guilds" },
          ].map((f, i) => (
            <div key={f.label} style={{
              background: "rgba(124,58,237,0.1)",
              border: "1px solid rgba(124,58,237,0.28)",
              borderRadius: 4, padding: "3px 9px",
              fontSize: 9, color: "#c4b5fd",
              opacity: visible ? 1 : 0,
              transform: visible ? "scale(1)" : "scale(0.85)",
              transition: `opacity 0.4s ease ${500 + i * 50}ms, transform 0.4s ease ${500 + i * 50}ms`,
            }}>
              {f.icon} {f.label}
            </div>
          ))}
        </div>

        {/* ── Share + Leaderboard ── */}
        <div style={{ ...fadeUp(540), display: "flex", gap: 8, alignItems: "center", pointerEvents: "all", marginBottom: 10 }}>
          <ShareButton
            text="Come play Pixel Realm Online with me — a browser MMORPG built on Farcaster! ⚔️"
            queryParams={username ? { username } : undefined}
            variant="outline"
          >
            ⚔ Share Pixel Realm
          </ShareButton>
          <button
            onClick={onShowLeaderboard}
            style={{
              background: "rgba(240,180,41,0.1)", border: "1px solid rgba(240,180,41,0.3)",
              borderRadius: 8, color: "#f0b429", fontSize: 11, fontFamily: "monospace",
              padding: "8px 14px", cursor: "pointer", letterSpacing: 0.5,
              whiteSpace: "nowrap", minHeight: 38, transition: "all 0.15s ease",
            }}
          >
            🏆 Rankings
          </button>
        </div>

        {/* ── Admin: Contract Deployer ── */}
        <div style={{ ...fadeUp(600), width: "100%", maxWidth: 340, pointerEvents: "all" }}>
          <ContractDeployer fid={fid} />
        </div>

        <div style={{ ...fadeUp(640), color: "#2a1a4a", fontSize: 8, marginTop: 6, letterSpacing: 1 }}>
          v1.0.0 • PixiJS 7 • Ragnarok-inspired
        </div>
      </div>

      <style>{`
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        @keyframes spinReverse { from { transform: rotate(0deg); } to { transform: rotate(-360deg); } }
        @keyframes shimmer { 0% { transform: translateX(-100%); } 60%, 100% { transform: translateX(100%); } }
      `}</style>
    </div>
  );
}

// ---- Pixel Loading Bar -------------------------------------------------

function PixelLoadingBar() {
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const t = setInterval(() => {
      setProgress(p => {
        if (p >= 100) { clearInterval(t); return 100; }
        return p + Math.random() * 15;
      });
    }, 80);
    return () => clearInterval(t);
  }, []);

  return (
    <div
      style={{
        width: 200,
        height: 8,
        background: "rgba(255,255,255,0.1)",
        border: "1px solid rgba(255,255,255,0.2)",
        borderRadius: 4,
        overflow: "hidden",
      }}
    >
      <div
        style={{
          width: `${Math.min(100, progress)}%`,
          height: "100%",
          background: "linear-gradient(90deg, #7c3aed, #a78bfa)",
          borderRadius: 4,
          transition: "width 0.08s ease",
          boxShadow: "0 0 8px #7c3aed",
        }}
      />
    </div>
  );
}

// ---- Respawn overlay ---------------------------------------------------

function RespawnOverlay() {
  const [secs, setSecs] = useState(3);
  useEffect(() => {
    if (secs <= 0) return;
    const t = setTimeout(() => setSecs(s => s - 1), 1000);
    return () => clearTimeout(t);
  }, [secs]);
  return (
    <div style={{ textAlign: "center" }}>
      <div style={{ fontSize: 52, marginBottom: 12, filter: "grayscale(0.3)" }}>💀</div>
      <div style={{ color: "#ff5555", fontSize: 18, fontWeight: "bold", letterSpacing: 3, marginBottom: 8 }}>
        YOU DIED
      </div>
      <div style={{ color: "#888", fontSize: 11, letterSpacing: 1, marginBottom: 20 }}>
        Returning to the realm...
      </div>
      <div style={{
        width: 80, height: 80, borderRadius: "50%",
        border: "3px solid rgba(255,85,85,0.3)",
        borderTopColor: "#ff5555",
        margin: "0 auto 16px",
        display: "flex", alignItems: "center", justifyContent: "center",
        animation: "spin 1s linear infinite",
      }}>
        <span style={{ fontSize: 28, color: "#ff8888", fontWeight: "bold", animation: "none" }}>
          {secs > 0 ? secs : "⚔"}
        </span>
      </div>
      <div style={{ color: "#444", fontSize: 9, letterSpacing: 1 }}>
        Progress saved — your journey continues
      </div>
    </div>
  );
}

// ---- Action Bar: centered attack button --------------------------------

function AttackButtonCentered({ onActivate }: { onActivate: () => void }) {
  const [pressed, setPressed] = useState(false);
  return (
    <button
      style={{
        width: 72, height: 72,
        borderRadius: "50%",
        background: pressed
          ? "radial-gradient(circle at 40% 35%, #ff8866, #aa1100)"
          : "radial-gradient(circle at 38% 35%, #ff5544, #cc1111)",
        border: `2px solid ${pressed ? "#ffaa88" : "#ff7766"}`,
        color: "white",
        fontSize: 28,
        cursor: "pointer",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        boxShadow: pressed
          ? "0 0 8px rgba(220,38,38,0.4), 0 2px 6px rgba(0,0,0,0.7)"
          : "0 0 20px rgba(220,38,38,0.55), 0 4px 14px rgba(0,0,0,0.8), inset 0 1px 0 rgba(255,255,255,0.15)",
        transform: pressed ? "scale(0.92)" : "scale(1)",
        transition: "transform 0.07s, box-shadow 0.07s",
        userSelect: "none",
        WebkitUserSelect: "none",
        touchAction: "none",
        flexShrink: 0,
      }}
      onPointerDown={(e) => { e.currentTarget.setPointerCapture(e.pointerId); setPressed(true); onActivate(); }}
      onPointerUp={() => setPressed(false)}
      onPointerLeave={() => setPressed(false)}
      title="Attack nearest enemy"
    >
      ⚔
    </button>
  );
}

// ---- Action Bar: small utility button ----------------------------------

function ActionBarButton({ icon, label, active, activeColor, onClick }: {
  icon: string; label: string; active: boolean; activeColor: string; onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      style={{
        width: 48, height: 56,
        borderRadius: 10,
        background: active ? `${activeColor}22` : "rgba(255,255,255,0.05)",
        border: `1px solid ${active ? activeColor + "66" : "rgba(255,255,255,0.10)"}`,
        color: active ? activeColor : "#aaa",
        fontSize: 20,
        cursor: "pointer",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: 2,
        boxShadow: active ? `0 0 10px ${activeColor}30` : "none",
        transition: "all 0.12s ease",
        flexShrink: 0,
      }}
    >
      <span style={{ lineHeight: 1 }}>{icon}</span>
      <span style={{ fontSize: 8, fontFamily: "monospace", lineHeight: 1, color: active ? activeColor : "#666" }}>
        {label}
      </span>
    </button>
  );
}
