"use client";

/**
 * PIXEL REALM ONLINE — PixiJS WebGL Game Engine
 *
 * Uses PixiJS v7 via CDN (window.PIXI).
 * - Tilemap rendering (chunked, culled)
 * - Animated entity sprites (player, agents, monsters)
 * - Smooth interpolated camera follow
 * - Y-based depth sorting
 * - Floating damage text
 * - FX particles
 * - Drop shadow under entities
 */

import { useEffect, useRef, useCallback } from "react";
import type { MouseEvent } from "react";
import type {
  Entity,
  TileMap,
  TileType,
  Direction,
  FloatingText,
  DroppedItem,
  DamageEvent,
  WorldPosition,
  EntityId,
} from "./types";
import type { GameAssets } from "./pixi-loader";
import { ZONE_TILEMAPS } from "./zones";
import type { ZoneKey } from "./zones";

// ---- PixiJS CDN Types (window.PIXI) ------------------------------------

declare global {
  interface Window {
    PIXI: {
      Application: new (opts: object) => PIXIApp;
      Container: new () => PIXIContainer;
      Graphics: new () => PIXIGraphics;
      Text: new (text: string, style?: object) => PIXIText;
      Texture: { from: (canvas: HTMLCanvasElement) => PIXITexture; WHITE: PIXITexture };
      Sprite: new (texture?: PIXITexture) => PIXISprite;
      AnimatedSprite: new (textures: PIXITexture[]) => PIXIAnimSprite;
      RenderTexture: { create: (opts: object) => PIXIRenderTexture };
      Rectangle: new (x: number, y: number, w: number, h: number) => PIXIRectangle;
      utils: { skipHello: () => void };
      Loader: { shared: { add: (id: string, url: string) => unknown; load: (cb: () => void) => void } };
    };
  }
}

interface PIXIApp {
  view: HTMLCanvasElement;
  stage: PIXIContainer;
  renderer: { resize: (w: number, h: number) => void; render: (c: PIXIContainer) => void };
  ticker: { add: (fn: (delta: number) => void) => void; remove: (fn: (delta: number) => void) => void };
  destroy: (removeView?: boolean) => void;
  screen: { width: number; height: number };
}

interface PIXIContainer {
  addChild: (...objs: PIXIObject[]) => PIXIObject;
  removeChild: (...objs: PIXIObject[]) => PIXIObject;
  children: PIXIObject[];
  x: number;
  y: number;
  alpha: number;
  visible: boolean;
  sortChildren: () => void;
  sortableChildren: boolean;
  zIndex: number;
  destroy: (opts?: object) => void;
  interactive?: boolean;
  on?: (event: string, fn: (e: unknown) => void) => void;
}

interface PIXIObject {
  x: number;
  y: number;
  zIndex: number;
  visible: boolean;
  alpha: number;
  destroy: (opts?: object) => void;
  scale?: { set: (v: number) => void; x: number; y: number };
}

interface PIXIGraphics extends PIXIObject {
  beginFill: (color: number, alpha?: number) => PIXIGraphics;
  endFill: () => PIXIGraphics;
  drawRect: (x: number, y: number, w: number, h: number) => PIXIGraphics;
  drawCircle: (x: number, y: number, r: number) => PIXIGraphics;
  drawEllipse: (x: number, y: number, rx: number, ry: number) => PIXIGraphics;
  lineStyle: (w: number, color: number, alpha?: number) => PIXIGraphics;
  moveTo: (x: number, y: number) => PIXIGraphics;
  lineTo: (x: number, y: number) => PIXIGraphics;
  arc: (x: number, y: number, r: number, s: number, e: number) => PIXIGraphics;
  clear: () => PIXIGraphics;
  closePath: () => PIXIGraphics;
}

interface PIXITexture {
  frame?: PIXIRectangle;
  clone: () => PIXITexture;
}

interface PIXIRenderTexture extends PIXITexture {}

interface PIXIRectangle {
  x: number;
  y: number;
  width: number;
  height: number;
}

interface PIXISprite extends PIXIObject {
  texture: PIXITexture;
  width: number;
  height: number;
  anchor: { set: (x: number, y?: number) => void };
  tint: number;
}

interface PIXIAnimSprite extends PIXIObject {
  textures: PIXITexture[];
  currentFrame: number;
  gotoAndPlay: (frame: number) => void;
  gotoAndStop: (frame: number) => void;
  play: () => void;
  stop: () => void;
  animationSpeed: number;
  loop: boolean;
  onComplete: (() => void) | null;
  anchor: { set: (x: number, y?: number) => void };
  tint: number;
}

interface PIXIText extends PIXIObject {
  text: string;
  style: { fontSize: number; fill: string | number; fontWeight: string };
}

// ---- Constants ---------------------------------------------------------

const TILE_SIZE = 32;
const VIEWPORT_W = 424;
const VIEWPORT_H = 620;
const CAMERA_LERP = 0.12;
const FLOAT_TEXT_SPEED = -1.2;
const FLOAT_TEXT_LIFE = 1200; // ms
const ANIM_SPEED = 0.1;

// ---- Ambient lighting config per zone ----------------------------------

interface ZoneLighting {
  ambientAlpha: number;   // darkness overlay (0 = bright day, 1 = pitch black)
  ambientColor: number;   // tint of the darkness overlay
  vignetteAlpha: number;  // edge vignette strength
  torchColor: number;     // glow around local player
  torchRadius: number;    // pixels
}

const ZONE_LIGHTING: Record<string, ZoneLighting> = {
  greenfields: { ambientAlpha: 0.07, ambientColor: 0x061428, vignetteAlpha: 0.40, torchColor: 0xffd580, torchRadius: 200 },
  forest:      { ambientAlpha: 0.18, ambientColor: 0x030a14, vignetteAlpha: 0.48, torchColor: 0xb8e0b0, torchRadius: 180 },
  dungeon:     { ambientAlpha: 0.42, ambientColor: 0x050008, vignetteAlpha: 0.58, torchColor: 0xff8833, torchRadius: 160 },
  town:        { ambientAlpha: 0.04, ambientColor: 0x0a1428, vignetteAlpha: 0.32, torchColor: 0xffeebb, torchRadius: 220 },
};

// ---- Combat feel state -------------------------------------------------

interface ShakeState {
  x: number;     // current offset x
  y: number;     // current offset y
  mag: number;   // current magnitude (decays each tick)
  decay: number; // per-tick decay multiplier
}

interface HitFlash {
  entityId: string;
  tint: number;       // white flash tint
  alpha: number;      // 1 → fades to 0
  isCrit: boolean;
}

interface ImpactParticle {
  x: number; y: number;    // world position (screen-space)
  vx: number; vy: number;  // velocity
  life: number;            // 0–1, counts down
  color: number;
  size: number;
  isCrit: boolean;
}

interface KnockbackState {
  entityId: string;
  ox: number; oy: number;  // offset applied to container
  life: number;            // 0–1 countdown
}

// ---- Input State -------------------------------------------------------

interface InputState {
  // Keyboard keys still supported (WASD / arrows)
  up: boolean;
  down: boolean;
  left: boolean;
  right: boolean;
  // Click-to-move target in world space
  moveTarget: { x: number; y: number } | null;
  attackTarget: EntityId | null;
}

// ---- Entity Render Object ----------------------------------------------

interface EntityRenderObject {
  container: PIXIContainer;
  sprite: PIXIAnimSprite | null;
  shadow: PIXIGraphics;
  nameTag: PIXIText;
  hpBar: PIXIGraphics;
  hpBarBg: PIXIGraphics;
  lastFrame: number;
  lastDir: Direction;
  lastHpRatio: number;  // cached so we only redraw HP bar when it changes
  agentIndex: number;
}

// ---- Component Props ---------------------------------------------------

export interface PixiGameProps {
  assets: GameAssets;
  tilemap: TileMap | null;
  entities: Entity[];
  droppedItems: DroppedItem[];
  localPlayerId: string | null;
  damages: DamageEvent[];
  zoneId?: string;
  onMove: (direction: Direction | null, position: WorldPosition) => void;
  onAttack: (targetId: EntityId) => void;
  onEntityClick: (entityId: EntityId) => void;
}

// ---- Helper: Extract frames from canvas --------------------------------

function framesFromCanvas(
  PIXI: typeof window.PIXI,
  canvas: HTMLCanvasElement,
  frameW: number,
  frameH: number,
  count: number
): PIXITexture[] {
  const base = PIXI.Texture.from(canvas);
  const frames: PIXITexture[] = [];
  for (let i = 0; i < count; i++) {
    const t = base.clone();
    (t as unknown as { frame: PIXIRectangle }).frame = new PIXI.Rectangle(
      i * frameW, 0, frameW, frameH
    );
    frames.push(t);
  }
  return frames;
}

function directionFrames(
  PIXI: typeof window.PIXI,
  canvas: HTMLCanvasElement,
  dir: Direction
): PIXITexture[] {
  const offsets: Record<Direction, number> = { down: 0, left: 2, right: 4, up: 6 };
  const off = offsets[dir];
  const base = PIXI.Texture.from(canvas);
  return [0, 1].map((f) => {
    const t = base.clone();
    (t as unknown as { frame: PIXIRectangle }).frame = new PIXI.Rectangle((off + f) * 32, 0, 32, 32);
    return t;
  });
}

function monsterFrames(
  PIXI: typeof window.PIXI,
  canvas: HTMLCanvasElement
): PIXITexture[] {
  return framesFromCanvas(PIXI, canvas, 32, 32, 2);
}

// ---- Tilemap Renderer --------------------------------------------------

function buildTilemapContainer(
  PIXI: typeof window.PIXI,
  tilemap: TileMap,
  assets: GameAssets
): PIXIContainer {
  const container = new PIXI.Container();
  const tileTextures = buildTileTextures(PIXI, assets);

  for (let ty = 0; ty < tilemap.height; ty++) {
    for (let tx = 0; tx < tilemap.width; tx++) {
      const tileType = tilemap.tiles[ty]?.[tx] as TileType;
      const tex = tileTextures[tileType] || tileTextures.grass;
      const sprite = new PIXI.Sprite(tex);
      sprite.x = tx * TILE_SIZE;
      sprite.y = ty * TILE_SIZE;
      sprite.zIndex = 0;
      container.addChild(sprite);
    }
  }

  return container;
}

function buildTileTextures(
  PIXI: typeof window.PIXI,
  assets: GameAssets
): Record<TileType, PIXITexture> {
  const tileOffsets: Record<TileType, [number, number]> = {
    grass: [0, 0],
    dirt: [32, 0],
    path: [64, 0],
    water: [96, 0],
    stone: [0, 32],
    wall: [32, 32],
  };

  const base = PIXI.Texture.from(assets.tileset);
  const result: Partial<Record<TileType, PIXITexture>> = {};
  for (const [type, [ox, oy]] of Object.entries(tileOffsets) as [TileType, [number, number]][]) {
    const t = base.clone();
    (t as unknown as { frame: PIXIRectangle }).frame = new PIXI.Rectangle(ox, oy, 32, 32);
    result[type] = t;
  }
  return result as Record<TileType, PIXITexture>;
}

// ---- Environment Objects -----------------------------------------------

function addEnvironmentObjects(
  PIXI: typeof window.PIXI,
  container: PIXIContainer,
  tilemap: TileMap,
  assets: GameAssets
) {
  const envOffsets: Record<string, number> = { tree: 0, rock: 32, bush: 64, building: 96 };
  const base = PIXI.Texture.from(assets.environment);

  const envTypes = ["tree", "rock", "bush"];
  // Deterministic placement based on tile position
  for (let ty = 1; ty < tilemap.height - 1; ty++) {
    for (let tx = 1; tx < tilemap.width - 1; tx++) {
      const tile = tilemap.tiles[ty]?.[tx];
      if (tile !== "grass") continue;
      const seed = (tx * 31 + ty * 17) % 100;
      if (seed < 8) {
        const envType = envTypes[seed % envTypes.length];
        const t = base.clone();
        (t as unknown as { frame: PIXIRectangle }).frame = new PIXI.Rectangle(envOffsets[envType], 0, 32, 32);
        const sprite = new PIXI.Sprite(t);
        sprite.x = tx * TILE_SIZE;
        sprite.y = ty * TILE_SIZE;
        sprite.zIndex = ty * TILE_SIZE + 28; // depth sort
        container.addChild(sprite);
      }
    }
  }
}

// ---- Portal Renderer ---------------------------------------------------

const PORTAL_ZONE_COLORS: Record<string, number> = {
  greenfields: 0x4ade80,
  forest:      0x22c55e,
  dungeon:     0xa78bfa,
  town:        0xfbbf24,
};

const PORTAL_ZONE_ICONS: Record<string, string> = {
  greenfields: "🌿",
  forest:      "🌲",
  dungeon:     "⛏",
  town:        "🏪",
};

function buildPortalLayer(
  PIXI: typeof window.PIXI,
  zoneId: string
): PIXIContainer {
  const container = new PIXI.Container();
  const zoneTilemap = ZONE_TILEMAPS[zoneId as ZoneKey];
  if (!zoneTilemap) return container;

  for (const portal of zoneTilemap.portals) {
    const color  = PORTAL_ZONE_COLORS[portal.targetZone] ?? 0xffffff;
    const px     = portal.worldX - TILE_SIZE / 2;
    const py     = portal.worldY - TILE_SIZE / 2;

    // Ground glow ring
    const glow = new PIXI.Graphics();
    glow.lineStyle(2, color, 0.5)
        .drawCircle(TILE_SIZE / 2, TILE_SIZE / 2, 22);
    glow.beginFill(color, 0.10)
        .drawCircle(TILE_SIZE / 2, TILE_SIZE / 2, 22)
        .endFill();
    glow.x = px;
    glow.y = py;
    glow.zIndex = 1;
    container.addChild(glow);

    // Inner bright dot
    const dot = new PIXI.Graphics();
    dot.beginFill(color, 0.85)
       .drawCircle(0, 0, 5)
       .endFill();
    dot.x = portal.worldX;
    dot.y = portal.worldY;
    dot.zIndex = 2;
    container.addChild(dot);

    // Label text
    const icon  = PORTAL_ZONE_ICONS[portal.targetZone] ?? "↗";
    const label = portal.label ?? portal.targetZone;
    const txt   = new PIXI.Text(`${icon} ${label}`, {
      fontSize:        9,
      fill:            `#${color.toString(16).padStart(6, "0")}`,
      fontWeight:      "bold",
      fontFamily:      "monospace",
      stroke:          "#000000",
      strokeThickness: 3,
    });
    txt.x = portal.worldX - txt.style.fontSize * label.length * 0.28;
    txt.y = portal.worldY - 32;
    txt.zIndex = 3;
    container.addChild(txt);
  }

  return container;
}

// ---- PixiGame Component ------------------------------------------------

export function PixiGame({
  assets,
  tilemap,
  entities,
  droppedItems,
  localPlayerId,
  damages,
  zoneId = "greenfields",
  onMove,
  onAttack,
  onEntityClick,
}: PixiGameProps) {
  const canvasRef = useRef<HTMLDivElement>(null);
  const appRef = useRef<PIXIApp | null>(null);
  const worldRef = useRef<PIXIContainer | null>(null);
  const entityLayerRef = useRef<PIXIContainer | null>(null);
  const fxLayerRef = useRef<PIXIContainer | null>(null);
  // Lighting layer refs (screen-space, above world)
  const lightingLayerRef = useRef<PIXIContainer | null>(null);
  const ambientOverlayRef = useRef<PIXIGraphics | null>(null);
  const torchGlowRef = useRef<PIXIGraphics | null>(null);
  const vignetteRef = useRef<PIXIGraphics | null>(null);
  const floatingTextsRef = useRef<FloatingText[]>([]);
  // Combat feel refs
  const shakeRef = useRef<ShakeState>({ x: 0, y: 0, mag: 0, decay: 0.72 });
  const hitFlashesRef = useRef<HitFlash[]>([]);
  const impactParticlesRef = useRef<ImpactParticle[]>([]);
  const knockbacksRef = useRef<KnockbackState[]>([]);
  const critFlashRef = useRef<{ alpha: number } | null>(null);
  const critFlashGraphicsRef = useRef<PIXIGraphics | null>(null);
  // Track which damage events we've already processed (by a hash)
  const processedDamageIdsRef = useRef<Set<string>>(new Set());
  const renderObjectsRef = useRef<Map<string, EntityRenderObject>>(new Map());
  const cameraRef = useRef({ x: 0, y: 0 });
  const inputRef = useRef<InputState>({
    up: false, down: false, left: false, right: false,
    moveTarget: null, attackTarget: null,
  });
  // Click ripple for visual feedback
  const clickRippleRef = useRef<{ x: number; y: number; ts: number } | null>(null);
  const lastMoveRef = useRef<{ direction: Direction | null; ts: number }>({ direction: null, ts: Date.now() });
  const animTickRef = useRef(0);
  // null until we receive the first real player position from entities
  const lastKnownPosRef = useRef<{ x: number; y: number } | null>(null);
  const assetsRef = useRef(assets);
  assetsRef.current = assets;

  // Keep latest entities/damages/callbacks in refs so the tick closure
  // always sees current values without needing to re-create the PIXI app.
  const entitiesRef = useRef(entities);
  entitiesRef.current = entities;
  const damagesRef = useRef(damages);
  damagesRef.current = damages;
  const localPlayerIdRef = useRef(localPlayerId);
  localPlayerIdRef.current = localPlayerId;
  const onMoveRef = useRef(onMove);
  onMoveRef.current = onMove;
  const onAttackRef = useRef(onAttack);
  onAttackRef.current = onAttack;
  const onEntityClickRef = useRef(onEntityClick);
  onEntityClickRef.current = onEntityClick;

  // ---- Main useEffect: Init PixiJS (runs once per tilemap/zone) --------

  useEffect(() => {
    if (!canvasRef.current || !tilemap) return;
    if (typeof window === "undefined") return;

    let app: PIXIApp | null = null;
    let pollTimer: ReturnType<typeof setInterval> | null = null;
    let cleanupFn: (() => void) | null = null;

    const startPixi = () => {
      if (!window.PIXI || !canvasRef.current) return;

      const PIXI = window.PIXI;
      PIXI.utils.skipHello();

      app = new PIXI.Application({
        width: VIEWPORT_W,
        height: VIEWPORT_H,
        backgroundColor: 0x0f0820,
        resolution: window.devicePixelRatio || 1,
        autoDensity: true,
        antialias: false,
      });

      canvasRef.current.appendChild(app.view as HTMLCanvasElement);
      appRef.current = app;

      // Enable z-sorting on stage so lighting layer renders after world
      (app.stage as PIXIContainer).sortableChildren = true;

      // World container (zIndex 0 — rendered before lighting overlay)
      const world = new PIXI.Container();
      world.sortableChildren = true;
      world.zIndex = 0;
      app.stage.addChild(world);
      worldRef.current = world;

      // Tilemap
      const tilemapContainer = buildTilemapContainer(PIXI, tilemap, assetsRef.current);
      tilemapContainer.zIndex = 0;
      world.addChild(tilemapContainer);

      // Environment objects
      const envContainer = new PIXI.Container();
      envContainer.sortableChildren = true;
      envContainer.zIndex = 1;
      addEnvironmentObjects(PIXI, envContainer, tilemap, assetsRef.current);
      world.addChild(envContainer);

      // Portal markers
      const portalLayer = buildPortalLayer(PIXI, zoneId);
      portalLayer.zIndex = 1;
      world.addChild(portalLayer);

      // Entity layer
      const entityLayer = new PIXI.Container();
      entityLayer.sortableChildren = true;
      entityLayer.zIndex = 2;
      world.addChild(entityLayer);
      entityLayerRef.current = entityLayer;

      // FX layer
      const fxLayer = new PIXI.Container();
      fxLayer.sortableChildren = true;
      fxLayer.zIndex = 10;
      world.addChild(fxLayer);
      fxLayerRef.current = fxLayer;

      // ---- Screen-space lighting layer (above world container) ---
      // This layer is a direct child of app.stage, NOT world, so it
      // doesn't move with the camera and always covers the full viewport.

      const lighting = new PIXI.Container();
      lighting.zIndex = 50;
      app.stage.addChild(lighting);
      lightingLayerRef.current = lighting;

      const zoneLit: ZoneLighting = ZONE_LIGHTING[zoneId] ?? ZONE_LIGHTING.greenfields;

      // Ambient overlay ref (not drawn as static rect — torch glow handles ambient)
      ambientOverlayRef.current = null;

      // Torch glow — approximated radial gradient using concentric circles.
      // Strategy: draw darkness from the OUTSIDE of the viewport toward the player,
      // getting lighter (more transparent) as we approach the player.
      // This creates a natural "island of light" without needing blend modes.
      const torchGlow = new PIXI.Graphics();
      lighting.addChild(torchGlow);
      torchGlowRef.current = torchGlow;

      // Vignette — static dark gradient baked around viewport edges (doesn't move)
      const vignette = new PIXI.Graphics();
      const cx = VIEWPORT_W / 2;
      const cy = VIEWPORT_H / 2;
      // Draw layers from the viewport edges inward, decreasing alpha toward center
      const vigSteps = 14;
      for (let i = 0; i < vigSteps; i++) {
        const t = i / (vigSteps - 1); // 0 = outermost, 1 = innermost
        const rx = cx * (1.4 - t * 0.55);
        const ry = cy * (1.35 - t * 0.5);
        const a  = zoneLit.vignetteAlpha * (1 - t) * (1 - t * 0.5);
        vignette
          .beginFill(0x000000, a)
          .drawEllipse(cx, cy, rx, ry)
          .endFill();
      }
      lighting.addChild(vignette);
      vignetteRef.current = vignette;

      // Crit flash overlay — full-screen red flash on crits (starts invisible)
      const critFlashGraphics = new PIXI.Graphics();
      critFlashGraphics
        .beginFill(0xff2200, 1)
        .drawRect(0, 0, VIEWPORT_W, VIEWPORT_H)
        .endFill();
      critFlashGraphics.alpha = 0;
      lighting.addChild(critFlashGraphics);
      critFlashGraphicsRef.current = critFlashGraphics;

      // ---- Keyboard input ---

      const onKeyDown = (e: KeyboardEvent) => {
        switch (e.key) {
          case "ArrowUp": case "w": case "W": inputRef.current.up = true; break;
          case "ArrowDown": case "s": case "S": inputRef.current.down = true; break;
          case "ArrowLeft": case "a": case "A": inputRef.current.left = true; break;
          case "ArrowRight": case "d": case "D": inputRef.current.right = true; break;
        }
      };
      const onKeyUp = (e: KeyboardEvent) => {
        switch (e.key) {
          case "ArrowUp": case "w": case "W": inputRef.current.up = false; break;
          case "ArrowDown": case "s": case "S": inputRef.current.down = false; break;
          case "ArrowLeft": case "a": case "A": inputRef.current.left = false; break;
          case "ArrowRight": case "d": case "D": inputRef.current.right = false; break;
        }
      };
      window.addEventListener("keydown", onKeyDown);
      window.addEventListener("keyup", onKeyUp);

      // ---- Helper: create entity render object ---

      const createEntityRO = (entity: Entity, agentIndex: number): EntityRenderObject => {
        const container = new PIXI.Container();
        container.sortableChildren = true;

        // Shadow
        const shadow = new PIXI.Graphics();
        shadow.beginFill(0x000000, 0.3).drawEllipse(16, 26, 10, 4).endFill();
        shadow.zIndex = 0;
        container.addChild(shadow);

        // Sprite
        let sprite: PIXIAnimSprite | null = null;
        const a = assetsRef.current;

        let sheetCanvas: HTMLCanvasElement | null = null;
        if (entity.type === "player") {
          sheetCanvas = a.playerSheet;
        } else if (entity.type === "agent") {
          sheetCanvas = a.agentSheets[agentIndex % a.agentSheets.length];
        } else if (entity.type === "monster") {
          const mt = (entity as { monsterType?: string }).monsterType;
          sheetCanvas = a.monsterSheets[mt as keyof typeof a.monsterSheets] || a.monsterSheets.slime;
        }

        if (sheetCanvas) {
          const isCharacter = entity.type === "player" || entity.type === "agent";
          const frames = isCharacter
            ? directionFrames(PIXI, sheetCanvas, entity.direction || "down")
            : monsterFrames(PIXI, sheetCanvas);

          sprite = new PIXI.AnimatedSprite(frames);
          sprite.animationSpeed = ANIM_SPEED;
          sprite.loop = true;
          sprite.anchor.set(0.5, 0.75);
          sprite.x = 16;
          sprite.y = 16;
          sprite.zIndex = 1;
          if (entity.state === "idle") sprite.gotoAndStop(0);
          else sprite.play();
          container.addChild(sprite);
        }

        // HP bar background
        const hpBarBg = new PIXI.Graphics();
        hpBarBg.beginFill(0x330000, 0.85).drawRect(-14, -28, 28, 4).endFill();
        hpBarBg.lineStyle(1, 0x000000, 0.5).drawRect(-14, -28, 28, 4);
        hpBarBg.x = 16;
        hpBarBg.y = 16;
        hpBarBg.zIndex = 5;
        container.addChild(hpBarBg);

        // HP bar fill
        const hpBar = new PIXI.Graphics();
        hpBar.x = 16;
        hpBar.y = 16;
        hpBar.zIndex = 6;
        container.addChild(hpBar);

        // Name tag
        const nameTag = new PIXI.Text(entity.name, {
          fontSize: 9,
          fill: entity.type === "monster" ? "#ff8888" : entity.type === "agent" ? "#88ddff" : "#ffffff",
          fontWeight: "bold",
          stroke: "#000000",
          strokeThickness: 2,
          fontFamily: "monospace",
        });
        nameTag.x = 16 - (entity.name.length * 2.8);
        nameTag.y = -6;
        nameTag.zIndex = 7;
        container.addChild(nameTag);

        return { container, sprite, shadow, nameTag, hpBar, hpBarBg, lastFrame: 0, lastDir: "down" as Direction, lastHpRatio: -1, agentIndex };
      };

      // ---- Helper: update HP bar (only redraws when ratio changes) ---

      const updateHPBar = (ro: EntityRenderObject, entity: Entity) => {
        const hp    = entity.stats?.hp    ?? (entity as { hp?: number }).hp    ?? 100;
        const maxHp = entity.stats?.maxHp ?? (entity as { maxHp?: number }).maxHp ?? 100;
        const ratio = maxHp > 0 ? Math.max(0, Math.round((hp / maxHp) * 100) / 100) : 0;
        if (Math.abs(ratio - ro.lastHpRatio) < 0.01) return; // skip if unchanged
        ro.lastHpRatio = ratio;
        ro.hpBar.clear();
        const color = ratio > 0.5 ? 0x22cc22 : ratio > 0.25 ? 0xffaa00 : 0xff2222;
        ro.hpBar.beginFill(color, 0.9).drawRect(-14, -28, 28 * ratio, 4).endFill();
      };

      // ---- Direction frame cache (per-canvas, per-direction) ---
      // Avoids re-creating texture slices every tick — huge perf win.
      const dirFrameCache = new Map<HTMLCanvasElement, Map<Direction, PIXITexture[]>>();
      const getCachedDirFrames = (canvas: HTMLCanvasElement, dir: Direction): PIXITexture[] => {
        let byDir = dirFrameCache.get(canvas);
        if (!byDir) { byDir = new Map(); dirFrameCache.set(canvas, byDir); }
        let frames = byDir.get(dir);
        if (!frames) { frames = directionFrames(PIXI, canvas, dir); byDir.set(dir, frames); }
        return frames;
      };

      // ---- Helper: update entity sprite ---

      const updateEntitySprite = (ro: EntityRenderObject, entity: Entity, animTick: number) => {
        if (!ro.sprite) return;

        const isCharacter = entity.type === "player" || entity.type === "agent";
        if (!isCharacter) {
          const frame = entity.state === "walking" ? (Math.floor(animTick / 8) % 2) : 0;
          if (frame !== ro.lastFrame) {
            ro.sprite.gotoAndStop(frame);
            ro.lastFrame = frame;
          }
          return;
        }

        const a = assetsRef.current;
        const sheetCanvas: HTMLCanvasElement = entity.type === "player"
          ? a.playerSheet
          : a.agentSheets[ro.agentIndex % a.agentSheets.length];

        const dir = entity.direction || "down";
        const frame = entity.state === "walking" ? (Math.floor(animTick / 6) % 2) : 0;

        // Only swap texture frames when direction changes
        if (dir !== ro.lastDir) {
          ro.sprite.textures = getCachedDirFrames(sheetCanvas, dir);
          ro.lastDir = dir;
        }
        if (frame !== ro.lastFrame) {
          ro.sprite.gotoAndStop(frame);
          ro.lastFrame = frame;
        }

        // Tint is managed by the hit flash system — only set it here if no flash is active
        const hasFlash = hitFlashesRef.current.some(f => f.entityId === entity.id);
        if (!hasFlash) {
          ro.sprite.tint = entity.state === "attacking" ? 0xffddaa : 0xffffff;
        }

        if (entity.state === "dead") {
          ro.container.alpha = Math.max(0, ro.container.alpha - 0.05);
        } else if (ro.container.alpha < 1) {
          ro.container.alpha = 1;
        }
      };

      // ---- Main game loop ---

      let agentColorCounter = 0;

      const tick = (_delta: number) => {
        const now = Date.now();
        const currentEntities = entitiesRef.current;
        const currentDamages  = damagesRef.current;
        const currentLocalId  = localPlayerIdRef.current;
        animTickRef.current++;

        // Spawn/update entity render objects
        const currentIds = new Set<string>();
        for (const entity of currentEntities) {
          currentIds.add(entity.id);
          let ro = renderObjectsRef.current.get(entity.id);
          if (!ro) {
            const idx = entity.type === "agent" ? agentColorCounter++ : 0;
            ro = createEntityRO(entity, idx);
            renderObjectsRef.current.set(entity.id, ro);
            entityLayerRef.current?.addChild(ro.container);
          }

          // Base position — knockback system may override this below
          ro.container.x = entity.position.x;
          ro.container.y = entity.position.y;
          ro.container.zIndex = entity.position.y;

          // Attack lunge: push attacker forward in their facing direction
          if (entity.state === "attacking") {
            const lungeOffsets: Record<Direction, [number, number]> = {
              down: [0, 5], up: [0, -5], left: [-5, 0], right: [5, 0],
            };
            const [lx, ly] = lungeOffsets[entity.direction || "down"];
            const lungeT = 0.5 + 0.5 * Math.sin(animTickRef.current * 0.5);
            ro.container.x += lx * lungeT;
            ro.container.y += ly * lungeT;
          }

          updateEntitySprite(ro, entity, animTickRef.current);
          updateHPBar(ro, entity);

          if (entity.state === "dead") {
            ro.container.alpha = Math.max(0, ro.container.alpha - 0.02);
            if (ro.container.alpha <= 0) ro.container.visible = false;
          } else {
            ro.container.visible = true;
          }
        }

        // Remove gone entities
        for (const [id, ro] of renderObjectsRef.current) {
          if (!currentIds.has(id)) {
            entityLayerRef.current?.removeChild(ro.container);
            ro.container.destroy({ children: true });
            renderObjectsRef.current.delete(id);
          }
        }

        // Sort entities by Y
        entityLayerRef.current?.sortChildren();

        // Camera follow
        const localPlayer = currentEntities.find(e => e.id === currentLocalId);
        // Always update last known position when we have the player
        if (localPlayer) {
          lastKnownPosRef.current = { x: localPlayer.position.x, y: localPlayer.position.y };
        }
        const cam = cameraRef.current;
        if (localPlayer && world) {
          const targetX = VIEWPORT_W / 2 - localPlayer.position.x;
          const targetY = VIEWPORT_H / 2 - localPlayer.position.y;
          cam.x += (targetX - cam.x) * CAMERA_LERP;
          cam.y += (targetY - cam.y) * CAMERA_LERP;

          const worldW = tilemap.width * TILE_SIZE;
          const worldH = tilemap.height * TILE_SIZE;
          cam.x = Math.min(0, Math.max(VIEWPORT_W - worldW, cam.x));
          cam.y = Math.min(0, Math.max(VIEWPORT_H - worldH, cam.y));

          world.x = cam.x;
          world.y = cam.y;
        }

        // Process incoming damages — spawn one text node per damage event (not per tick)
        const fxLayerNow = fxLayerRef.current;
        for (const dmg of currentDamages) {
          // Deduplicate: build a stable key from damage fields so we don't
          // re-process the same event if the damages array ref stays equal.
          const dmgKey = `${dmg.targetId}-${dmg.damage}-${dmg.attackerId ?? ""}-${(dmg as {ts?:number}).ts ?? now}`;
          if (processedDamageIdsRef.current.has(dmgKey)) continue;
          processedDamageIdsRef.current.add(dmgKey);
          // Prevent unbounded growth
          if (processedDamageIdsRef.current.size > 500) {
            processedDamageIdsRef.current.clear();
          }

          const target = currentEntities.find(e => e.id === dmg.targetId);
          if (!target || !fxLayerNow) continue;

          const isCrit = dmg.isCritical || (dmg as {isCrit?:boolean}).isCrit;

          // ---- Screen shake ----
          const shake = shakeRef.current;
          if (isCrit) {
            shake.mag = Math.max(shake.mag, 9);
            shake.decay = 0.68;
          } else {
            shake.mag = Math.max(shake.mag, 3.5);
            shake.decay = 0.72;
          }

          // ---- Crit flash overlay ----
          if (isCrit) {
            critFlashRef.current = { alpha: 0.30 };
          }

          // ---- Hit flash on target sprite ----
          hitFlashesRef.current.push({
            entityId: target.id,
            tint: isCrit ? 0xff4400 : 0xffffff,
            alpha: 1,
            isCrit,
          });

          // ---- Knockback ----
          // Push the target away from the attacker (or random dir if no attacker)
          const attacker = dmg.attackerId ? currentEntities.find(e => e.id === dmg.attackerId) : null;
          let kbx = 0; let kby = 0;
          if (attacker) {
            const dx = target.position.x - attacker.position.x;
            const dy = target.position.y - attacker.position.y;
            const d = Math.sqrt(dx * dx + dy * dy) || 1;
            const kb = isCrit ? 10 : 5;
            kbx = (dx / d) * kb;
            kby = (dy / d) * kb;
          } else {
            const angle = Math.random() * Math.PI * 2;
            kbx = Math.cos(angle) * (isCrit ? 8 : 4);
            kby = Math.sin(angle) * (isCrit ? 8 : 4);
          }
          knockbacksRef.current.push({ entityId: target.id, ox: kbx, oy: kby, life: 1 });

          // ---- Impact particles ----
          const sx = target.position.x + cam.x + 16;
          const sy = target.position.y + cam.y + 16;
          const particleCount = isCrit ? 12 : 6;
          for (let p = 0; p < particleCount; p++) {
            const angle = (p / particleCount) * Math.PI * 2 + Math.random() * 0.4;
            const speed = isCrit ? 3.5 + Math.random() * 3 : 1.8 + Math.random() * 2;
            impactParticlesRef.current.push({
              x: sx, y: sy,
              vx: Math.cos(angle) * speed,
              vy: Math.sin(angle) * speed - (isCrit ? 1.5 : 0.8),
              life: 1,
              color: isCrit
                ? (p % 2 === 0 ? 0xff6600 : 0xffdd00)
                : (p % 2 === 0 ? 0xffffff : 0xffdd44),
              size: isCrit ? 3 + Math.random() * 2 : 1.5 + Math.random() * 1.5,
              isCrit,
            });
          }

          // ---- Floating damage text ----
          const label = isCrit ? `${dmg.damage}!` : `${dmg.damage}`;
          const textNode = new PIXI.Text(label, {
            fontSize: isCrit ? 18 : 12,
            fill: isCrit ? "#ff6600" : "#ffee44",
            fontWeight: "bold",
            stroke: "#000000",
            strokeThickness: isCrit ? 4 : 3,
            fontFamily: "monospace",
          });
          // Crits burst upward from center; normals drift slightly sideways
          const xOff = isCrit ? (Math.random() * 16 - 8) : (Math.random() * 24 - 12);
          textNode.x = target.position.x + cam.x + xOff;
          textNode.y = target.position.y + cam.y - 16;
          textNode.alpha = 1;
          // Crits start bigger and scale to normal
          if (isCrit && textNode.scale) textNode.scale.set(1.5);
          textNode.zIndex = 999;
          fxLayerNow.addChild(textNode);

          floatingTextsRef.current.push({
            id: dmgKey,
            text: label,
            x: textNode.x,
            y: textNode.y,
            color: isCrit ? "#ff6600" : "#ffee44",
            alpha: 1,
            vy: isCrit ? -2.2 : FLOAT_TEXT_SPEED,
            createdAt: now,
            _node: textNode,
          });
        }

        // Update existing floating texts — just move/fade, no new allocations
        const newFTs: FloatingText[] = [];
        for (const ft of floatingTextsRef.current) {
          const age = now - ft.createdAt;
          if (age >= FLOAT_TEXT_LIFE) {
            // Expired — remove node from scene
            if (ft._node && fxLayerNow) {
              try {
                fxLayerNow.removeChild(ft._node as PIXIObject);
                (ft._node as PIXIObject).destroy();
              } catch (_) {}
            }
            continue;
          }
          ft.y += ft.vy;
          ft.alpha = 1 - age / FLOAT_TEXT_LIFE;
          newFTs.push(ft);
          // Update existing node position/alpha in-place
          if (ft._node) {
            const node = ft._node as PIXIText;
            node.x = ft.x;
            node.y = ft.y;
            node.alpha = ft.alpha;
          }
        }
        floatingTextsRef.current = newFTs;

        // ---- Update floating text nodes: scale-in crits, normal drift ----
        for (const ft of floatingTextsRef.current) {
          if (!ft._node) continue;
          const node = ft._node as PIXIText;
          const age = now - ft.createdAt;
          const isCritText = ft.vy < -1.8; // crits have faster upward velocity
          if (isCritText && node.scale) {
            // Scale from 1.5 → 1.0 during first 150ms, then stay at 1
            const scaleT = Math.max(0, 1 - age / 150);
            node.scale.set(1 + scaleT * 0.5);
          }
          // Normal hits: slight horizontal drift outward
          if (!isCritText) {
            const drift = ft.x > VIEWPORT_W / 2 ? 0.25 : -0.25;
            node.x += drift;
            ft.x += drift;
          }
        }

        // ---- Screen shake ----
        const shake = shakeRef.current;
        if (shake.mag > 0.2) {
          const angle = Math.random() * Math.PI * 2;
          shake.x = Math.cos(angle) * shake.mag;
          shake.y = Math.sin(angle) * shake.mag;
          shake.mag *= shake.decay;
          if (world) {
            world.x = cam.x + shake.x;
            world.y = cam.y + shake.y;
          }
        } else {
          shake.mag = 0; shake.x = 0; shake.y = 0;
        }

        // ---- Hit flash: tint entity sprites white/orange ----
        const newFlashes: HitFlash[] = [];
        for (const flash of hitFlashesRef.current) {
          flash.alpha -= 0.12;
          if (flash.alpha <= 0) continue;
          newFlashes.push(flash);
          const ro = renderObjectsRef.current.get(flash.entityId);
          if (ro?.sprite) {
            // Blend white flash into sprite tint based on alpha
            const t = flash.alpha;
            const r = Math.round(((flash.tint >> 16) & 0xff) * t + 0xff * (1 - t));
            const g = Math.round(((flash.tint >> 8)  & 0xff) * t + 0xff * (1 - t));
            const b = Math.round(( flash.tint        & 0xff) * t + 0xff * (1 - t));
            ro.sprite.tint = (r << 16) | (g << 8) | b;
          }
        }
        // Reset tint to white for flashes that ended
        for (const oldFlash of hitFlashesRef.current) {
          if (newFlashes.indexOf(oldFlash) === -1) {
            const ro = renderObjectsRef.current.get(oldFlash.entityId);
            if (ro?.sprite) ro.sprite.tint = 0xffffff;
          }
        }
        hitFlashesRef.current = newFlashes;

        // ---- Knockback: push entity containers briefly ----
        const newKnockbacks: KnockbackState[] = [];
        for (const kb of knockbacksRef.current) {
          kb.life -= 0.15;
          if (kb.life <= 0) {
            // Reset container position offset
            const ro = renderObjectsRef.current.get(kb.entityId);
            if (ro) { ro.container.x -= kb.ox * kb.life; ro.container.y -= kb.oy * kb.life; }
            continue;
          }
          newKnockbacks.push(kb);
          const ro = renderObjectsRef.current.get(kb.entityId);
          if (ro) {
            const entity = currentEntities.find(e => e.id === kb.entityId);
            if (entity) {
              const decay = kb.life * kb.life; // ease out
              ro.container.x = entity.position.x + kb.ox * decay;
              ro.container.y = entity.position.y + kb.oy * decay;
            }
          }
        }
        knockbacksRef.current = newKnockbacks;

        // ---- Impact particles ----
        if (fxLayerNow) {
          const newParticles: ImpactParticle[] = [];
          for (const p of impactParticlesRef.current) {
            p.life -= 0.07;
            if (p.life <= 0) continue;
            p.x += p.vx;
            p.y += p.vy;
            p.vy += 0.18; // gravity
            newParticles.push(p);
            // Draw each particle as a tiny rect (created fresh each tick — small count, acceptable)
            const g = new PIXI.Graphics();
            const alpha = p.life * (p.isCrit ? 0.95 : 0.8);
            const size = p.size * p.life;
            g.beginFill(p.color, alpha).drawRect(p.x - size / 2, p.y - size / 2, size, size).endFill();
            g.zIndex = 998;
            fxLayerNow.addChild(g);
            setTimeout(() => { try { fxLayerNow.removeChild(g); g.destroy(); } catch (_) {} }, 16);
          }
          impactParticlesRef.current = newParticles;
        }

        // ---- Crit screen flash ----
        const critState = critFlashRef.current;
        const critFG = critFlashGraphicsRef.current;
        if (critState && critFG) {
          critFG.alpha = critState.alpha;
          critState.alpha -= 0.025;
          if (critState.alpha <= 0) {
            critFG.alpha = 0;
            critFlashRef.current = null;
          }
        }

        // ---- Derive movement direction ----
        // Priority: keyboard keys > click-to-move target
        const inp = inputRef.current;
        let dir: Direction | null = null;

        const keyHeld = inp.up || inp.down || inp.left || inp.right;
        if (keyHeld) {
          // Keyboard overrides click target
          if (inp.up)         dir = "up";
          else if (inp.down)  dir = "down";
          else if (inp.left)  dir = "left";
          else if (inp.right) dir = "right";
          inp.moveTarget = null; // cancel click-move when keyboard is used
        } else if (inp.moveTarget && lastKnownPosRef.current) {
          // Use last-known player position — only available after first snapshot
          const refPos = lastKnownPosRef.current;
          const dx = inp.moveTarget.x - refPos.x;
          const dy = inp.moveTarget.y - refPos.y;
          const d = Math.sqrt(dx * dx + dy * dy);
          if (d < 20) {
            // Arrived — stop
            inp.moveTarget = null;
            dir = null;
          } else {
            // Cardinal direction toward target
            dir = Math.abs(dx) >= Math.abs(dy)
              ? (dx > 0 ? "right" : "left")
              : (dy > 0 ? "down" : "up");
          }
        }

        // Send when direction changes. While actively moving also re-send every 66ms
        // to keep the sim fed at its 15fps tick rate (avoid missed inputs).
        const activelyMoving = dir !== null;
        const shouldSend = dir !== lastMoveRef.current.direction
          || (activelyMoving && now - lastMoveRef.current.ts > 66);
        if (shouldSend && lastKnownPosRef.current) {
          onMoveRef.current(dir, lastKnownPosRef.current);
          lastMoveRef.current = { direction: dir, ts: now };
        }

        // ---- Animate torch/ambient lighting around local player ----
        const torchGlowNow = torchGlowRef.current;
        if (torchGlowNow) {
          const lit = ZONE_LIGHTING[zoneId] ?? ZONE_LIGHTING.greenfields;
          torchGlowNow.clear();

          if (localPlayer) {
            // Screen-space center of the player sprite
            const sx = localPlayer.position.x + cam.x + 16;
            const sy = localPlayer.position.y + cam.y + 16;

            // Flicker — two sine waves at incommensurable frequencies (organic, non-repeating)
            const t60 = animTickRef.current;
            const flicker = Math.sin(t60 * 0.11) * 0.55 + Math.sin(t60 * 0.29) * 0.45;
            const baseR = lit.torchRadius + flicker * 6;

            // Darkness falloff: draw concentric rings from the torch radius down to 0.
            // At radius=baseR the ring is at full ambient alpha (dark).
            // At radius=0 (center) the ring is transparent (lit).
            // This is a radial gradient approximation with no blend-mode tricks.
            const steps = 16;
            for (let i = steps; i >= 0; i--) {
              const frac = i / steps;             // 1 = outer edge, 0 = center
              const circR = baseR * frac;
              // Quadratic falloff: dark at edge, light at center
              const darkAlpha = lit.ambientAlpha * (frac * frac) * 0.95;
              if (darkAlpha < 0.005) continue;
              torchGlowNow
                .beginFill(lit.ambientColor, darkAlpha)
                .drawCircle(sx, sy, circR + baseR * 0.08)
                .endFill();
            }

            // Warm inner color glow: soft ring of torch color to sell the firelight feel
            const warmR = baseR * 0.30 + flicker * 2;
            const warmAlpha = (0.10 + Math.abs(flicker) * 0.04) * (lit.ambientAlpha > 0.3 ? 1.6 : 1.0);
            for (let j = 5; j >= 1; j--) {
              const t = j / 5;
              torchGlowNow
                .beginFill(lit.torchColor, warmAlpha * (1 - t * 0.7))
                .drawCircle(sx, sy, warmR * t)
                .endFill();
            }
          } else {
            // No local player in frame yet — just clear (vignette still applies)
            // Don't fill the screen black or it covers the world before player spawns
          }
        }

        // ---- Draw click ripple indicator ----
        const ripple = clickRippleRef.current;
        if (ripple && fxLayerNow) {
          const age = now - ripple.ts;
          if (age < 500) {
            const r = new PIXI.Graphics();
            const alpha = 1 - age / 500;
            const radius = 6 + age / 30;
            r.lineStyle(1.5, 0xffffff, alpha * 0.7);
            r.drawCircle(ripple.x, ripple.y, radius);
            r.zIndex = 1000;
            fxLayerNow.addChild(r);
            // Remove on next tick
            setTimeout(() => { try { fxLayerNow?.removeChild(r); r.destroy(); } catch (_) {} }, 16);
          } else {
            clickRippleRef.current = null;
          }
        }
      };

      app.ticker.add(tick);

      cleanupFn = () => {
        window.removeEventListener("keydown", onKeyDown);
        window.removeEventListener("keyup", onKeyUp);
        if (app) {
          app.ticker.remove(tick);
          renderObjectsRef.current.forEach(ro => {
            try { ro.container.destroy({ children: true }); } catch (_) {}
          });
          renderObjectsRef.current.clear();
          if (canvasRef.current && app.view) {
            try { canvasRef.current.removeChild(app.view as HTMLCanvasElement); } catch (_) {}
          }
          try { app.destroy(true); } catch (_) {}
          app = null;
          appRef.current = null;
        }
        worldRef.current = null;
        entityLayerRef.current = null;
        fxLayerRef.current = null;
        lightingLayerRef.current = null;
        ambientOverlayRef.current = null;
        torchGlowRef.current = null;
        vignetteRef.current = null;
        critFlashGraphicsRef.current = null;
        critFlashRef.current = null;
        hitFlashesRef.current = [];
        impactParticlesRef.current = [];
        knockbacksRef.current = [];
        processedDamageIdsRef.current.clear();
      };
    };

    // Either start immediately if PIXI is ready, or poll until it is
    if (window.PIXI) {
      startPixi();
    } else {
      pollTimer = setInterval(() => {
        if (window.PIXI) {
          clearInterval(pollTimer!);
          pollTimer = null;
          startPixi();
        }
      }, 100);
    }

    return () => {
      if (pollTimer) {
        clearInterval(pollTimer);
        pollTimer = null;
      }
      if (cleanupFn) {
        cleanupFn();
        cleanupFn = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tilemap, zoneId]);


  // ---- Canvas click: attack nearby enemy or click-to-move -----------

  const handleCanvasClick = useCallback((e: MouseEvent<HTMLDivElement>) => {
    if (!worldRef.current) return;
    const rect = (e.currentTarget as HTMLDivElement).getBoundingClientRect();
    // World-space coords (accounting for camera offset)
    const worldX = e.clientX - rect.left - worldRef.current.x;
    const worldY = e.clientY - rect.top  - worldRef.current.y;

    const currentEntities = entitiesRef.current;
    const currentLocalId  = localPlayerIdRef.current;

    // Check if click lands near an enemy (attack radius 52px)
    let nearest: Entity | null = null;
    let nearestDist = 52;
    for (const entity of currentEntities) {
      if (entity.id === currentLocalId) continue;
      if (entity.state === "dead") continue;
      const dx = entity.position.x - worldX;
      const dy = entity.position.y - worldY;
      const d = Math.sqrt(dx * dx + dy * dy);
      if (d < nearestDist) { nearestDist = d; nearest = entity; }
    }

    if (nearest) {
      // Attack
      onAttackRef.current(nearest.id);
      onEntityClickRef.current(nearest.id);
      // Move toward enemy too
      inputRef.current.moveTarget = { x: nearest.position.x, y: nearest.position.y };
    } else {
      // Click-to-move: walk toward clicked world position
      inputRef.current.moveTarget = { x: worldX, y: worldY };
      // Ripple effect at world position (will be drawn in tick)
      clickRippleRef.current = { x: worldX, y: worldY, ts: Date.now() };
    }
  }, []);

  return (
    <div style={{ position: "absolute", inset: 0, overflow: "hidden" }}>
      {/* PixiJS canvas — click to move / tap enemy to attack */}
      <div
        ref={canvasRef}
        onClick={handleCanvasClick}
        style={{ position: "absolute", inset: 0, cursor: "pointer" }}
      />
    </div>
  );
}
