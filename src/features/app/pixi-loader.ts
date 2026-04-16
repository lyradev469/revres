/**
 * PIXEL REALM ONLINE — Procedural Pixel-Art Asset Generator
 *
 * All assets generated via Canvas 2D — no external files.
 * Ragnarok-inspired palette with deep shading and highlight passes.
 */

export interface GameAssets {
  playerSheet: HTMLCanvasElement;
  agentSheets: HTMLCanvasElement[];
  monsterSheets: {
    slime: HTMLCanvasElement;
    goblin: HTMLCanvasElement;
    skeleton: HTMLCanvasElement;
    wolf: HTMLCanvasElement;
  };
  tileset: HTMLCanvasElement;
  environment: HTMLCanvasElement;
  fxSheet: HTMLCanvasElement;
  itemSheet: HTMLCanvasElement;
  uiPanel: (w: number, h: number) => HTMLCanvasElement;
}

// ── Palette ──────────────────────────────────────────────────────────────────

const P = {
  // Skin
  skinHi:   "#fde3b8",
  skin:     "#f5c48a",
  skinShad: "#c8864a",
  // Hair
  hair:     "#5a2e18",
  hairHi:   "#8c5030",
  // Cloth
  clothB:   "#3a6ea8",
  clothBHi: "#5a9ed8",
  clothBSh: "#1e3c60",
  clothR:   "#b83030",
  clothRHi: "#e05050",
  clothG:   "#3a7a3a",
  clothGHi: "#5aaa5a",
  // Armor
  gold:     "#d4a017",
  goldHi:   "#f0c840",
  goldSh:   "#8b6000",
  silver:   "#a0a8b8",
  silverHi: "#d0d8e8",
  silverSh: "#606878",
  // Weapon
  blade:    "#c8d8f0",
  bladeHi:  "#f0f8ff",
  hilt:     "#7a5010",
  // Terrain
  grass:    "#4a8a3a",
  grassHi:  "#6ab85a",
  grassSh:  "#2a5a1a",
  grassAc:  "#8ad870",   // accent blades
  dirt:     "#8a6030",
  dirtHi:   "#b08050",
  dirtSh:   "#5a3810",
  path:     "#b09050",
  pathHi:   "#d0b870",
  pathSh:   "#706030",
  water:    "#1a5888",
  waterHi:  "#3a88c8",
  waterFoam:"#a8d8f8",
  stone:    "#6a6878",
  stoneHi:  "#9898a8",
  stoneSh:  "#3a3848",
  wall:     "#2a2838",
  wallBrick:"#3e3c50",
  wallHi:   "#5a5870",
  // Monsters
  slimeB:   "#d060a8",
  slimeHi:  "#f090d0",
  slimeSh:  "#801870",
  slimeGel: "rgba(240,160,220,0.5)",
  gobB:     "#4a8028",
  gobHi:    "#6ab040",
  gobSh:    "#284010",
  gobEye:   "#ff3300",
  skelB:    "#e8e0cc",
  skelHi:   "#ffffff",
  skelSh:   "#a09880",
  wolfB:    "#787888",
  wolfHi:   "#a8a8c0",
  wolfSh:   "#404050",
  wolfEye:  "#ffaa00",
  // FX
  hitY:     "#ffe040",
  hitW:     "#ffffff",
  critO:    "#ff6600",
  magicP:   "#cc44ff",
  // UI
  uiBg:     "#1e1408",
  uiGold:   "#d4a017",
  uiBorder: "#8b6000",
  // Misc
  outline:  "#0a0814",
  shadow:   "rgba(0,0,0,0.4)",
  hiLight:  "rgba(255,255,255,0.25)",
};

// ── Canvas helpers ────────────────────────────────────────────────────────────

function mkCanvas(w: number, h: number): HTMLCanvasElement {
  const c = document.createElement("canvas");
  c.width = w; c.height = h;
  return c;
}
function cx(canvas: HTMLCanvasElement) { return canvas.getContext("2d")!; }

function r(c: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, col: string) {
  c.fillStyle = col; c.fillRect(x, y, w, h);
}
function o(c: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, col = P.outline, lw = 1) {
  c.strokeStyle = col; c.lineWidth = lw; c.strokeRect(x + .5, y + .5, w - 1, h - 1);
}
function px(c: CanvasRenderingContext2D, x: number, y: number, col: string, s = 2) {
  c.fillStyle = col; c.fillRect(x, y, s, s);
}
function circle(c: CanvasRenderingContext2D, x: number, y: number, rad: number, col: string) {
  c.fillStyle = col; c.beginPath(); c.arc(x, y, rad, 0, Math.PI * 2); c.fill();
}

// ── Character sprites ─────────────────────────────────────────────────────────
// Layout: 8 × 32px frames (down0 down1 left0 left1 right0 right1 up0 up1)

function drawChar(
  c: CanvasRenderingContext2D,
  ox: number, oy: number,
  dir: "down" | "left" | "right" | "up",
  frame: 0 | 1,
  bodyCol: string, bodyHi: string, bodySh: string,
  hairCol: string,
) {
  c.clearRect(ox, oy, 32, 32);

  // Ground shadow
  c.fillStyle = "rgba(0,0,0,0.28)";
  c.beginPath(); c.ellipse(ox + 16, oy + 30, 9, 3.5, 0, 0, Math.PI * 2); c.fill();

  const walk = frame === 1;
  const lLeg = walk ? 3 : 0;
  const rLeg = walk ? 0 : 3;

  // ── Legs ──
  const legCol = dir === "up" ? bodySh : bodySh;
  const bootCol = "#2a1808";
  if (dir === "down" || dir === "up") {
    r(c, ox + 11, oy + 22, 5, 6 + lLeg, legCol);
    r(c, ox + 16, oy + 22, 5, 6 + rLeg, legCol);
    r(c, ox + 11, oy + 28 + lLeg, 5, 2, bootCol);
    r(c, ox + 16, oy + 28 + rLeg, 5, 2, bootCol);
  } else {
    r(c, ox + 10, oy + 22, 12, 5, legCol);
    r(c, ox + 11, oy + 27, 5, 3, bootCol);
    r(c, ox + 16, oy + 26, 5, 3, bootCol);
  }

  // ── Torso ──
  r(c, ox + 10, oy + 13, 12, 10, bodyCol);
  // Highlight strip on torso
  r(c, ox + 11, oy + 14, 4, 8, bodyHi);
  // Shading right
  r(c, ox + 19, oy + 13, 3, 10, bodySh);
  o(c, ox + 10, oy + 13, 12, 10);

  // Belt
  r(c, ox + 10, oy + 20, 12, 2, P.hilt);
  px(c, ox + 15, oy + 20, P.gold, 2);

  // ── Arms ──
  if (dir === "down") {
    // Both arms visible
    r(c, ox + 6, oy + 13, 4, 9, P.skin);
    r(c, ox + 22, oy + 13, 4, 9, P.skin);
    r(c, ox + 6, oy + 13, 2, 9, P.skinHi);
    o(c, ox + 6, oy + 13, 4, 9);
    o(c, ox + 22, oy + 13, 4, 9);
    // Sword in right hand
    r(c, ox + 24, oy + 10, 2, 14, P.blade);
    r(c, ox + 24, oy + 10, 1, 14, P.bladeHi);
    r(c, ox + 21, oy + 17, 7, 2, P.hilt);
    o(c, ox + 24, oy + 10, 2, 14);
  } else if (dir === "left") {
    r(c, ox + 6, oy + 13, 4, 9, P.skin);
    r(c, ox + 6, oy + 13, 2, 9, P.skinHi);
    o(c, ox + 6, oy + 13, 4, 9);
    // Sword held left
    r(c, ox + 2, oy + 10, 2, 14, P.blade);
    r(c, ox + 2, oy + 10, 1, 14, P.bladeHi);
    r(c, ox + 0, oy + 17, 7, 2, P.hilt);
    o(c, ox + 2, oy + 10, 2, 14);
  } else if (dir === "right") {
    r(c, ox + 22, oy + 13, 4, 9, P.skin);
    r(c, ox + 22, oy + 13, 2, 9, P.skinHi);
    o(c, ox + 22, oy + 13, 4, 9);
    // Sword right
    r(c, ox + 26, oy + 10, 2, 14, P.blade);
    r(c, ox + 26, oy + 10, 1, 14, P.bladeHi);
    r(c, ox + 24, oy + 17, 7, 2, P.hilt);
    o(c, ox + 26, oy + 10, 2, 14);
  } else {
    // up — arms at sides behind body
    r(c, ox + 6, oy + 14, 4, 8, bodySh);
    r(c, ox + 22, oy + 14, 4, 8, bodySh);
  }

  // ── Head ──
  r(c, ox + 9, oy + 5, 14, 10, P.skin);
  r(c, ox + 9, oy + 5, 5, 10, P.skinHi);    // highlight left
  r(c, ox + 20, oy + 5, 3, 10, P.skinShad); // shading right
  o(c, ox + 9, oy + 5, 14, 10);

  // Hair
  r(c, ox + 9, oy + 3, 14, 5, hairCol);
  r(c, ox + 9, oy + 3, 5, 5, P.hairHi);
  o(c, ox + 9, oy + 3, 14, 5);
  // Side hair tufts
  r(c, ox + 7, oy + 5, 3, 5, hairCol);
  r(c, ox + 22, oy + 5, 3, 5, hairCol);

  // Eyes
  if (dir !== "up") {
    px(c, ox + 12, oy + 9, P.outline, 2);
    px(c, ox + 17, oy + 9, P.outline, 2);
    px(c, ox + 12, oy + 9, "#ffffff", 1); // white eye dot
    px(c, ox + 17, oy + 9, "#ffffff", 1);
    px(c, ox + 13, oy + 9, P.outline, 1); // pupil
    px(c, ox + 18, oy + 9, P.outline, 1);
  } else {
    // Back of head — just hair
  }

  // Collar / neck
  r(c, ox + 13, oy + 13, 6, 2, P.skinShad);

  // Pauldron (shoulder pad) glint
  if (dir !== "up") {
    circle(c, ox + 22, oy + 14, 3, P.silver);
    circle(c, ox + 22, oy + 14, 1.5, P.silverHi);
  }
}

function genCharSheet(bodyCol: string, bodyHi: string, bodySh: string, hairCol = P.hair): HTMLCanvasElement {
  const canvas = mkCanvas(256, 32);
  const c = cx(canvas);
  const dirs: Array<"down" | "left" | "right" | "up"> = ["down", "left", "right", "up"];
  dirs.forEach((d, i) => {
    drawChar(c, i * 64,      0, d, 0, bodyCol, bodyHi, bodySh, hairCol);
    drawChar(c, i * 64 + 32, 0, d, 1, bodyCol, bodyHi, bodySh, hairCol);
  });
  return canvas;
}

// ── Monster: Slime ────────────────────────────────────────────────────────────

function genSlime(): HTMLCanvasElement {
  const canvas = mkCanvas(64, 32);
  const c = cx(canvas);

  function drawSlimeFrame(ox: number, squish: number) {
    const h = 20 - squish * 3;
    const ey = 20 - squish * 3; // top of body
    const by = 32 - h;

    // Shadow
    c.fillStyle = "rgba(0,0,0,0.25)"; c.beginPath();
    c.ellipse(ox + 16, 31, 12 + squish * 2, 2.5, 0, 0, Math.PI * 2); c.fill();

    // Body gradient (simulate with layered rects)
    r(c, ox + 4, by, 24, h, P.slimeB);
    r(c, ox + 4, by, 8, h, P.slimeSh);           // dark left
    r(c, ox + 18, by, 8, h, P.slimeHi);           // bright right
    r(c, ox + 4, by + h - 4, 24, 4, P.slimeSh);  // bottom darker

    // Gel shimmer drips
    r(c, ox + 8,  by - 3, 4, 5, P.slimeHi);
    r(c, ox + 18, by - 2, 3, 4, P.slimeB);

    // Outline
    o(c, ox + 4, by, 24, h, P.outline);

    // Eyes (cute)
    const eyeY = by + 5;
    circle(c, ox + 11, eyeY, 3.5, "#ffffff");
    circle(c, ox + 21, eyeY, 3.5, "#ffffff");
    circle(c, ox + 12, eyeY, 2, P.outline);
    circle(c, ox + 22, eyeY, 2, P.outline);
    circle(c, ox + 11, eyeY - 1, 1, "#ffffff"); // shine
    circle(c, ox + 21, eyeY - 1, 1, "#ffffff");

    // Jelly sheen overlay
    c.fillStyle = P.slimeGel;
    r(c, ox + 6, by + 2, 8, h / 2, P.slimeGel);
  }

  drawSlimeFrame(0, 0);
  drawSlimeFrame(32, 2);
  return canvas;
}

// ── Monster: Goblin ───────────────────────────────────────────────────────────

function genGoblin(): HTMLCanvasElement {
  const canvas = mkCanvas(64, 32);
  const c = cx(canvas);

  [0, 32].forEach((ox, fi) => {
    const walk = fi === 1;
    const ll = walk ? 3 : 0, rl = walk ? 0 : 3;

    // Shadow
    c.fillStyle = "rgba(0,0,0,0.25)"; c.beginPath();
    c.ellipse(ox + 16, 31, 9, 2.5, 0, 0, Math.PI * 2); c.fill();

    // Legs
    r(c, ox + 9,  24, 5, 7 + ll, P.gobSh);
    r(c, ox + 18, 24, 5, 7 + rl, P.gobSh);
    // Feet
    r(c, ox + 8,  30 + ll, 7, 2, "#1a0a00");
    r(c, ox + 17, 30 + rl, 7, 2, "#1a0a00");

    // Body
    r(c, ox + 8, 12, 16, 13, P.gobB);
    r(c, ox + 8, 12, 5, 13, P.gobSh);
    r(c, ox + 18, 12, 6, 13, P.gobHi);
    o(c, ox + 8, 12, 16, 13);

    // Ragged loincloth
    r(c, ox + 9, 21, 14, 4, P.gobSh);
    r(c, ox + 11, 21, 3, 4, "#7a5010");
    r(c, ox + 18, 21, 3, 4, "#7a5010");

    // Arms
    r(c, ox + 4, 12, 5, 10, P.gobB);
    r(c, ox + 23, 12, 5, 10, P.gobB);
    r(c, ox + 4, 12, 2, 10, P.gobSh);
    r(c, ox + 26, 12, 2, 10, P.gobHi);
    o(c, ox + 4, 12, 5, 10);
    o(c, ox + 23, 12, 5, 10);

    // Club (right hand)
    r(c, ox + 27, 10, 4, 14, "#6a3808");
    r(c, ox + 25, 8, 8, 6, P.stone);
    r(c, ox + 26, 8, 3, 6, P.stoneHi);
    o(c, ox + 27, 10, 4, 14);
    o(c, ox + 25, 8, 8, 6);

    // Head
    r(c, ox + 7, 3, 18, 12, P.gobB);
    r(c, ox + 7, 3, 5, 12, P.gobSh);
    r(c, ox + 18, 3, 7, 12, P.gobHi);
    o(c, ox + 7, 3, 18, 12);

    // Pointy ears
    c.fillStyle = P.gobB;
    c.beginPath(); c.moveTo(ox + 6, 6); c.lineTo(ox + 2, 2); c.lineTo(ox + 8, 8); c.fill();
    c.beginPath(); c.moveTo(ox + 26, 6); c.lineTo(ox + 30, 2); c.lineTo(ox + 24, 8); c.fill();
    o(c, ox + 3, 3, 5, 5, P.outline);

    // Eyes
    circle(c, ox + 13, 9, 3, "#ffeecc");
    circle(c, ox + 21, 9, 3, "#ffeecc");
    circle(c, ox + 13, 9, 2, P.gobEye);
    circle(c, ox + 21, 9, 2, P.gobEye);
    px(c, ox + 12, 8, "#ffffff", 1);
    px(c, ox + 20, 8, "#ffffff", 1);

    // Nose
    r(c, ox + 15, 11, 3, 2, P.gobSh);
  });
  return canvas;
}

// ── Monster: Skeleton ─────────────────────────────────────────────────────────

function genSkeleton(): HTMLCanvasElement {
  const canvas = mkCanvas(64, 32);
  const c = cx(canvas);

  [0, 32].forEach((ox, fi) => {
    const walk = fi === 1;
    const ll = walk ? 3 : 0, rl = walk ? 0 : 3;

    // Shadow
    c.fillStyle = "rgba(0,0,0,0.2)"; c.beginPath();
    c.ellipse(ox + 16, 31, 8, 2, 0, 0, Math.PI * 2); c.fill();

    // Legs (bones)
    r(c, ox + 11, 22, 4, 9 + ll, P.skelB);
    r(c, ox + 11, 22, 2, 9 + ll, P.skelHi);
    r(c, ox + 11, 24, 4, 2, P.skelSh); // knee joint
    r(c, ox + 17, 22, 4, 9 + rl, P.skelB);
    r(c, ox + 17, 22, 2, 9 + rl, P.skelHi);
    r(c, ox + 17, 24, 4, 2, P.skelSh);
    // Feet
    r(c, ox + 9, 30 + ll, 7, 2, P.skelSh);
    r(c, ox + 15, 30 + rl, 7, 2, P.skelSh);

    // Ribcage
    r(c, ox + 10, 13, 12, 10, P.skelB);
    r(c, ox + 10, 13, 4, 10, P.skelHi);
    for (let i = 0; i < 4; i++) {
      r(c, ox + 10, 13 + i * 2, 12, 1, P.skelSh);  // ribs
    }
    o(c, ox + 10, 13, 12, 10);

    // Spine
    r(c, ox + 14, 23, 4, 2, P.skelSh);

    // Arms (long bones)
    r(c, ox + 5, 13, 5, 10, P.skelB);
    r(c, ox + 5, 13, 2, 10, P.skelHi);
    r(c, ox + 5, 17, 5, 2, P.skelSh); // elbow
    o(c, ox + 5, 13, 5, 10);
    r(c, ox + 22, 13, 5, 10, P.skelB);
    r(c, ox + 22, 13, 2, 10, P.skelHi);
    r(c, ox + 22, 17, 5, 2, P.skelSh);
    o(c, ox + 22, 13, 5, 10);

    // Rusty sword in right hand
    r(c, ox + 26, 8, 3, 16, "#9a8060");
    r(c, ox + 26, 8, 1, 16, "#c0a880");
    r(c, ox + 23, 15, 8, 2, P.hilt);
    o(c, ox + 26, 8, 3, 16);

    // Skull
    r(c, ox + 9, 3, 14, 12, P.skelB);
    r(c, ox + 9, 3, 4, 12, P.skelHi);
    r(c, ox + 20, 3, 3, 12, P.skelSh);
    o(c, ox + 9, 3, 14, 12);

    // Eye sockets (hollow)
    r(c, ox + 11, 6, 4, 4, P.outline);
    r(c, ox + 17, 6, 4, 4, P.outline);
    // Eerie glow
    circle(c, ox + 13, 8, 1.5, "#4488ff");
    circle(c, ox + 19, 8, 1.5, "#4488ff");

    // Jaw / teeth
    r(c, ox + 11, 13, 10, 2, P.skelB);
    for (let t = 0; t < 4; t++) {
      r(c, ox + 11 + t * 3, 14, 2, 2, P.skelHi);
    }

    // Neck vertebra
    r(c, ox + 14, 12, 4, 3, P.skelSh);
  });
  return canvas;
}

// ── Monster: Wolf ─────────────────────────────────────────────────────────────

function genWolf(): HTMLCanvasElement {
  const canvas = mkCanvas(64, 32);
  const c = cx(canvas);

  [0, 32].forEach((ox, fi) => {
    const walk = fi === 1;
    const ll = walk ? 3 : 0, rl = walk ? 0 : 3;

    // Shadow
    c.fillStyle = "rgba(0,0,0,0.25)"; c.beginPath();
    c.ellipse(ox + 16, 31, 11, 2.5, 0, 0, Math.PI * 2); c.fill();

    // Tail
    c.fillStyle = P.wolfB;
    c.beginPath(); c.moveTo(ox + 4, 14); c.quadraticCurveTo(ox - 2, 6, ox + 3, 4); c.lineTo(ox + 6, 8); c.quadraticCurveTo(ox + 2, 10, ox + 6, 14); c.fill();
    r(c, ox + 3, 4, 4, 4, P.wolfHi);

    // Body
    r(c, ox + 5, 12, 20, 13, P.wolfB);
    r(c, ox + 5, 12, 7, 13, P.wolfHi);  // highlight top-left
    r(c, ox + 22, 12, 3, 13, P.wolfSh); // shadow right
    o(c, ox + 5, 12, 20, 13);

    // Legs
    r(c, ox + 7,  25, 4, 6 + ll, P.wolfSh);
    r(c, ox + 13, 25, 4, 6 + rl, P.wolfSh);
    r(c, ox + 18, 25, 4, 6 + ll, P.wolfSh);
    r(c, ox + 22, 25, 4, 6 + rl, P.wolfSh);
    // Paws
    r(c, ox + 6, 30 + ll, 6, 2, P.wolfB);
    r(c, ox + 12, 30 + rl, 6, 2, P.wolfB);
    r(c, ox + 17, 30 + ll, 6, 2, P.wolfB);
    r(c, ox + 21, 30 + rl, 6, 2, P.wolfB);

    // Head
    r(c, ox + 20, 7, 10, 10, P.wolfB);
    r(c, ox + 20, 7, 4, 10, P.wolfHi);
    o(c, ox + 20, 7, 10, 10);

    // Snout
    r(c, ox + 26, 11, 6, 6, P.wolfSh);
    r(c, ox + 26, 11, 3, 3, P.wolfB);
    o(c, ox + 26, 11, 6, 6);
    // Nose
    circle(c, ox + 30, 12, 2, P.outline);
    circle(c, ox + 30, 12, 1, "#6a4a4a");

    // Ears (pointy)
    c.fillStyle = P.wolfB;
    c.beginPath(); c.moveTo(ox + 21, 7); c.lineTo(ox + 19, 2); c.lineTo(ox + 24, 6); c.fill();
    c.beginPath(); c.moveTo(ox + 27, 7); c.lineTo(ox + 30, 2); c.lineTo(ox + 28, 7); c.fill();
    r(c, ox + 21, 4, 3, 3, P.wolfHi);

    // Eye
    circle(c, ox + 24, 12, 2.5, "#ffdd88");
    circle(c, ox + 24, 12, 1.5, P.wolfEye);
    circle(c, ox + 24, 12, 0.7, P.outline);
    px(c, ox + 23, 11, "#ffffff", 1); // shine

    // Teeth
    r(c, ox + 27, 15, 5, 2, "#eeeeee");
    r(c, ox + 28, 16, 2, 2, "#eeeeee");
    r(c, ox + 31, 16, 2, 2, "#eeeeee");
  });
  return canvas;
}

// ── Tileset ───────────────────────────────────────────────────────────────────
// 4 cols × 2 rows of 32×32 tiles

function genTileset(): HTMLCanvasElement {
  const T = 32;
  const canvas = mkCanvas(T * 4, T * 2);
  const c = cx(canvas);

  // ── Grass ──
  function drawGrass(ox: number, oy: number, variant = 0) {
    r(c, ox, oy, T, T, P.grass);
    // Subtle texture pass — darker patches
    for (let i = 0; i < 6; i++) {
      const sx = ox + ((i * 13 + variant * 7 + 3) % 26);
      const sy = oy + ((i * 11 + variant * 5 + 2) % 26);
      r(c, sx, sy, 4, 3, P.grassSh);
    }
    // Light dapples
    for (let i = 0; i < 5; i++) {
      const sx = ox + ((i * 17 + variant * 9 + 5) % 27);
      const sy = oy + ((i * 7 + variant * 13 + 4) % 27);
      r(c, sx, sy, 3, 2, P.grassHi);
    }
    // Grass blades
    for (let i = 0; i < 4; i++) {
      const bx = ox + ((i * 9 + variant * 11 + 2) % 28);
      const by = oy + ((i * 13 + variant * 7 + 3) % 26);
      r(c, bx, by, 1, 3, P.grassAc);
    }
  }

  // ── Dirt ──
  function drawDirt(ox: number, oy: number) {
    r(c, ox, oy, T, T, P.dirt);
    for (let i = 0; i < 5; i++) {
      r(c, ox + (i * 11 + 2) % 27, oy + (i * 7 + 3) % 27, 5, 3, P.dirtSh);
    }
    for (let i = 0; i < 4; i++) {
      r(c, ox + (i * 8 + 5) % 26, oy + (i * 13 + 1) % 26, 3, 2, P.dirtHi);
    }
    // Pebbles
    for (let i = 0; i < 3; i++) {
      const px2 = ox + (i * 13 + 4) % 26;
      const py2 = oy + (i * 9 + 7) % 26;
      circle(c, px2, py2, 1.5, P.stoneSh);
    }
  }

  // ── Cobblestone path ──
  function drawPath(ox: number, oy: number) {
    r(c, ox, oy, T, T, P.path);
    // Stone blocks with mortar gaps
    const stones = [
      [1, 1, 14, 9], [16, 1, 15, 9],
      [1, 11, 9, 9],  [11, 11, 8, 9], [20, 11, 11, 9],
      [2, 21, 13, 9], [16, 21, 14, 9],
    ];
    stones.forEach(([sx, sy, sw, sh]) => {
      r(c, ox + sx, oy + sy, sw, sh, P.pathHi);
      r(c, ox + sx, oy + sy, sw, 2, "#e8d090"); // top highlight
      r(c, ox + sx + sw - 2, oy + sy, 2, sh, P.pathSh); // right shadow
      r(c, ox + sx, oy + sy + sh - 2, sw, 2, P.pathSh); // bottom shadow
      o(c, ox + sx, oy + sy, sw, sh, P.pathSh);
    });
  }

  // ── Animated water (static frame) ──
  function drawWater(ox: number, oy: number) {
    r(c, ox, oy, T, T, P.water);
    // Deep center
    r(c, ox + 6, oy + 6, 20, 20, "#104878");
    // Wave highlights
    for (let i = 0; i < 4; i++) {
      const wy = oy + i * 7 + 3;
      const wx = ox + (i % 2) * 6 + 2;
      r(c, wx, wy, 12, 2, P.waterHi);
      r(c, wx + 14, wy + 2, 8, 2, P.waterFoam);
    }
    // Edge foam
    r(c, ox, oy, T, 2, P.waterFoam);
    r(c, ox, oy, 2, T, P.waterFoam);
    // Shimmer dots
    for (let i = 0; i < 6; i++) {
      circle(c, ox + (i * 7 + 3) % 28 + 2, oy + (i * 5 + 5) % 28 + 2, 1, P.waterFoam);
    }
  }

  // ── Stone floor ──
  function drawStone(ox: number, oy: number) {
    r(c, ox, oy, T, T, P.stone);
    r(c, ox, oy, T, 2, P.stoneHi); // top edge light
    r(c, ox, oy, 2, T, P.stoneHi); // left edge light
    r(c, ox + T - 2, oy, 2, T, P.stoneSh);
    r(c, ox, oy + T - 2, T, 2, P.stoneSh);
    // Cracks
    c.strokeStyle = P.stoneSh; c.lineWidth = 1;
    c.beginPath(); c.moveTo(ox + 4, oy + 4); c.lineTo(ox + 12, oy + 18); c.lineTo(ox + 9, oy + 28); c.stroke();
    c.beginPath(); c.moveTo(ox + 20, oy + 6); c.lineTo(ox + 26, oy + 16); c.stroke();
    // Mossy patches
    r(c, ox + 14, oy + 20, 6, 4, "#3a5a2a");
    r(c, ox + 3, oy + 22, 4, 4, "#3a5a2a");
  }

  // ── Dungeon wall ──
  function drawWall(ox: number, oy: number) {
    r(c, ox, oy, T, T, P.wall);
    // Brick pattern
    const bricks = [
      [0, 0], [16, 0],
      [8, 8], [24, 8],
      [0, 16], [16, 16],
      [8, 24], [24, 24],
    ];
    bricks.forEach(([bx, by]) => {
      r(c, ox + bx + 1, oy + by + 1, 14, 6, P.wallBrick);
      r(c, ox + bx + 1, oy + by + 1, 14, 1, P.wallHi); // mortar top highlight
      r(c, ox + bx + 1, oy + by + 5, 14, 2, P.stoneSh);
    });
    // Wall moss
    r(c, ox + 5, oy + 20, 3, 3, "#3a5030");
    r(c, ox + 22, oy + 10, 2, 2, "#3a5030");
    // Shadow top-left vignette
    const g = c.createLinearGradient(ox, oy, ox + T, oy + T);
    g.addColorStop(0, "rgba(0,0,0,0.25)");
    g.addColorStop(1, "rgba(0,0,0,0)");
    c.fillStyle = g; c.fillRect(ox, oy, T, T);
  }

  drawGrass(0,   0, 0);
  drawDirt (T,   0);
  drawPath (T*2, 0);
  drawWater(T*3, 0);
  drawStone(0,   T);
  drawWall (T,   T);
  drawGrass(T*2, T, 1); // grass variant
  drawDirt (T*3, T);    // dirt variant

  return canvas;
}

// ── Environment objects ───────────────────────────────────────────────────────

function genEnvironment(): HTMLCanvasElement {
  const canvas = mkCanvas(128, 32);
  const c = cx(canvas);

  // ── Tree ──
  // Trunk
  r(c, 13, 22, 6, 10, "#7a4010");
  r(c, 13, 22, 2, 10, "#a06030");
  r(c, 17, 22, 2, 10, "#502a08");
  o(c, 13, 22, 6, 10);
  // Roots
  r(c, 11, 30, 4, 2, "#7a4010");
  r(c, 17, 30, 4, 2, "#7a4010");
  // Canopy (3 layers for depth)
  r(c, 5, 14, 22, 12, "#2a6020");
  r(c, 3, 8,  26, 12, "#388030");
  r(c, 6, 3,  20, 10, "#4a9840");
  r(c, 8, 3,  8,  8,  "#60b050"); // highlight
  // Canopy outlines
  o(c, 5, 14, 22, 12, "#1a3a10");
  o(c, 3, 8,  26, 12, "#1a3a10");
  o(c, 6, 3,  20, 10, "#1a3a10");
  // Fruit dots
  circle(c, 10, 10, 2, "#dd3322");
  circle(c, 20, 12, 2, "#dd3322");
  circle(c, 15, 6,  2, "#ee5533");

  // ── Rock ──
  const ro = 32;
  r(c, ro+5,  16, 22, 14, P.stone);
  r(c, ro+3,  20, 26, 10, P.stone);
  r(c, ro+5,  16, 10, 5,  P.stoneHi); // top highlight
  r(c, ro+22, 20, 6,  10, P.stoneSh); // right shadow
  r(c, ro+3,  27, 26, 3,  P.stoneSh); // bottom shadow
  o(c, ro+3,  16, 26, 16, P.outline);
  // Vein
  c.strokeStyle = P.stoneSh; c.lineWidth = 1;
  c.beginPath(); c.moveTo(ro+8, 18); c.lineTo(ro+14, 26); c.stroke();
  // Moss
  r(c, ro+6, 25, 5, 3, "#3a5a2a");

  // ── Bush ──
  const bo = 64;
  r(c, bo+2,  18, 28, 12, "#2a6a20");
  r(c, bo+4,  14, 24, 10, "#3a8030");
  r(c, bo+8,  10, 16, 8,  "#4a9a3a");
  r(c, bo+10, 10, 6,  6,  "#66bb50"); // highlight
  o(c, bo+2,  14, 28, 16, "#1a3a10");
  // Flowers / berries
  circle(c, bo+10, 20, 2.5, "#ff4488");
  circle(c, bo+18, 17, 2.5, "#ff4488");
  circle(c, bo+24, 22, 2,   "#ffaa00");
  circle(c, bo+10, 20, 1.2, "#ffddee");
  circle(c, bo+18, 17, 1.2, "#ffddee");

  // ── Well / Shrine ──
  const wo = 96;
  // Base
  r(c, wo+6,  22, 20, 10, P.stone);
  r(c, wo+6,  22, 7,  10, P.stoneHi);
  o(c, wo+6,  22, 20, 10);
  // Rim
  r(c, wo+4,  18, 24, 5, P.stoneHi);
  o(c, wo+4,  18, 24, 5);
  // Posts
  r(c, wo+8,  6,  3,  16, "#8a6020");
  r(c, wo+21, 6,  3,  16, "#8a6020");
  r(c, wo+8,  6,  1,  16, "#c09030");
  // Roof beam
  r(c, wo+6,  4,  20, 4, "#7a5010");
  r(c, wo+6,  4,  20, 2, "#a07020");
  o(c, wo+6,  4,  20, 4);
  // Bucket rope
  c.strokeStyle = "#a09060"; c.lineWidth = 1;
  c.beginPath(); c.moveTo(wo+16, 8); c.lineTo(wo+14, 18); c.stroke();
  // Bucket
  r(c, wo+11, 16, 6, 6, "#5a4010");
  r(c, wo+11, 16, 6, 2, "#8a6020");
  o(c, wo+11, 16, 6, 6);

  return canvas;
}

// ── FX sheet ──────────────────────────────────────────────────────────────────

function genFX(): HTMLCanvasElement {
  const canvas = mkCanvas(96, 32);
  const c = cx(canvas);

  // Hit spark
  for (let i = 0; i < 10; i++) {
    const a = (i / 10) * Math.PI * 2;
    const r1 = 5, r2 = 14;
    c.strokeStyle = i % 2 === 0 ? P.hitY : P.hitW;
    c.lineWidth = i % 2 === 0 ? 2 : 1;
    c.beginPath();
    c.moveTo(16 + Math.cos(a) * r1, 16 + Math.sin(a) * r1);
    c.lineTo(16 + Math.cos(a) * r2, 16 + Math.sin(a) * r2);
    c.stroke();
  }
  circle(c, 16, 16, 4, P.hitW);
  circle(c, 16, 16, 2, P.hitY);

  // Slash arc
  c.strokeStyle = P.hitW; c.lineWidth = 4;
  c.beginPath(); c.arc(48, 16, 13, -Math.PI * 0.5, Math.PI * 0.1); c.stroke();
  c.strokeStyle = P.hitY; c.lineWidth = 2;
  c.beginPath(); c.arc(48, 16, 11, -Math.PI * 0.5, Math.PI * 0.1); c.stroke();
  c.strokeStyle = "rgba(255,255,255,0.4)"; c.lineWidth = 6;
  c.beginPath(); c.arc(48, 16, 13, -Math.PI * 0.5, Math.PI * 0.1); c.stroke();

  // Crit burst
  circle(c, 80, 16, 14, "rgba(255,100,0,0.3)");
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2;
    const rr = i % 2 === 0 ? 13 : 7;
    circle(c, 80 + Math.cos(a) * rr, 16 + Math.sin(a) * rr, i % 2 === 0 ? 2 : 1.5, P.critO);
  }
  circle(c, 80, 16, 5, P.hitY);
  circle(c, 80, 16, 3, "#ffffff");

  return canvas;
}

// ── Item sheet ────────────────────────────────────────────────────────────────

function genItems(): HTMLCanvasElement {
  const canvas = mkCanvas(96, 32);
  const c = cx(canvas);

  // Sword
  r(c, 15, 1, 2, 20, P.blade);
  r(c, 15, 1, 1, 20, P.bladeHi);
  r(c, 9, 14, 14, 3, P.hilt);
  r(c, 9, 14, 5, 3, "#d4b040");
  r(c, 14, 20, 4, 8, "#6a4010");
  circle(c, 16, 28, 2, P.gold);
  o(c, 15, 1, 2, 20); o(c, 9, 14, 14, 3);

  // Potion
  r(c, 44, 14, 14, 14, "#2255bb");
  r(c, 44, 14, 5,  14, "#3377dd");
  r(c, 44, 20, 14, 5,  "#1133aa"); // liquid level
  r(c, 47, 10, 8,  5,  P.stone);
  r(c, 49, 6,  6,  6,  "#99bbff");
  r(c, 50, 4,  4,  4,  P.silverHi);
  o(c, 44, 10, 14, 18); o(c, 47, 10, 8, 5);
  // Cork
  r(c, 48, 8, 5, 3, "#9a6820");
  // Bubbles
  circle(c, 48, 22, 1.5, "#5599ff");
  circle(c, 53, 18, 1,   "#5599ff");

  // Gold coin
  circle(c, 80, 16, 12, P.gold);
  circle(c, 80, 16, 12, P.gold);
  c.strokeStyle = P.outline; c.lineWidth = 1.5; c.beginPath(); c.arc(80, 16, 12, 0, Math.PI * 2); c.stroke();
  circle(c, 80, 16, 9, P.goldSh);
  circle(c, 80, 16, 7, "#c09010");
  c.fillStyle = P.goldHi; c.font = "bold 9px monospace"; c.textAlign = "center"; c.textBaseline = "middle";
  c.fillText("G", 80, 17);
  circle(c, 76, 13, 2, "rgba(255,255,200,0.4)"); // shine

  return canvas;
}

// ── UI panel ──────────────────────────────────────────────────────────────────

function genUIPanel(w: number, h: number): HTMLCanvasElement {
  const canvas = mkCanvas(w, h);
  const c = cx(canvas);

  // BG
  c.fillStyle = "rgba(18,10,4,0.95)"; c.fillRect(0, 0, w, h);

  // Inner fill gradient
  const g = c.createLinearGradient(0, 0, 0, h);
  g.addColorStop(0, "rgba(60,40,10,0.3)");
  g.addColorStop(1, "rgba(0,0,0,0)");
  c.fillStyle = g; c.fillRect(0, 0, w, h);

  // Outer border (gold)
  c.strokeStyle = P.uiGold; c.lineWidth = 2;
  c.strokeRect(2, 2, w - 4, h - 4);
  // Inner border (dark gold)
  c.strokeStyle = P.uiBorder; c.lineWidth = 1;
  c.strokeRect(5, 5, w - 10, h - 10);

  // Corner ornaments
  [[2, 2], [w - 12, 2], [2, h - 12], [w - 12, h - 12]].forEach(([cx2, cy2]) => {
    r(c, cx2, cy2, 10, 10, P.uiGold);
    r(c, cx2 + 2, cy2 + 2, 6, 6, "#8b6000");
    r(c, cx2 + 4, cy2 + 4, 2, 2, P.goldHi);
  });

  return canvas;
}

// ── Agent colour table ────────────────────────────────────────────────────────

const AGENT_DEFS = [
  { body: P.clothB,  hi: P.clothBHi, sh: P.clothBSh, hair: P.hair    },
  { body: P.clothR,  hi: P.clothRHi, sh: "#7a1010",  hair: "#2a1a0a" },
  { body: P.clothG,  hi: P.clothGHi, sh: "#1a4a1a",  hair: "#3a2010" },
  { body: "#7a40a0", hi: "#aa60d0",  sh: "#3a1060",  hair: "#1a0a2a" },
  { body: "#a05820", hi: "#d07840",  sh: "#602808",  hair: "#2a1408" },
  { body: "#208870", hi: "#40b898",  sh: "#0a4838",  hair: "#0a2818" },
  { body: "#a03060", hi: "#d05080",  sh: "#601030",  hair: "#300818" },
  { body: "#608020", hi: "#88b030",  sh: "#304008",  hair: "#182008" },
];

// ── Main export ───────────────────────────────────────────────────────────────

export function generateAssets(): GameAssets {
  return {
    playerSheet: genCharSheet(P.clothB, P.clothBHi, P.clothBSh, P.hair),
    agentSheets: AGENT_DEFS.map(d => genCharSheet(d.body, d.hi, d.sh, d.hair)),
    monsterSheets: {
      slime:    genSlime(),
      goblin:   genGoblin(),
      skeleton: genSkeleton(),
      wolf:     genWolf(),
    },
    tileset:     genTileset(),
    environment: genEnvironment(),
    fxSheet:     genFX(),
    itemSheet:   genItems(),
    uiPanel:     genUIPanel,
  };
}

export const SPRITE_META = {
  character:   { frameWidth: 32, frameHeight: 32, frames: { down_0:{x:0,y:0},down_1:{x:32,y:0},left_0:{x:64,y:0},left_1:{x:96,y:0},right_0:{x:128,y:0},right_1:{x:160,y:0},up_0:{x:192,y:0},up_1:{x:224,y:0} } },
  monster:     { frameWidth: 32, frameHeight: 32, frames: { idle:{x:0,y:0},walk:{x:32,y:0} } },
  tile:        { frameWidth: 32, frameHeight: 32, frames: { grass:{x:0,y:0},dirt:{x:32,y:0},path:{x:64,y:0},water:{x:96,y:0},stone:{x:0,y:32},wall:{x:32,y:32} } },
  environment: { frameWidth: 32, frameHeight: 32, frames: { tree:{x:0,y:0},rock:{x:32,y:0},bush:{x:64,y:0},building:{x:96,y:0} } },
  fx:          { frameWidth: 32, frameHeight: 32, frames: { hit:{x:0,y:0},slash:{x:32,y:0},crit:{x:64,y:0} } },
  items:       { frameWidth: 32, frameHeight: 32, frames: { sword:{x:0,y:0},potion:{x:32,y:0},gold:{x:64,y:0} } },
};
