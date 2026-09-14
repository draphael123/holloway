// tileset.js — the painted tiles (ArMM1998 "Zelda-like tilesets and sprites", CC0). Sheets load async; until
// they are ready the game draws its own baked tiles, so nothing waits on the network.
// Coordinates are (col, row) of 16 px cells on the sheet. The 9-slice blocks are named by their top-left cell.
import { canvas } from './px.js';

const SHEETS = { over: 'tiles/overworld.png', cave: 'tiles/cave.png', objects: 'tiles/objects.png', char: 'tiles/character.png', gb: 'tiles/gb_cave.png' };
const img = {}; const cache = new Map();
export const T = { ready: false };

export function loadTileset(onReady) {
  let left = Object.keys(SHEETS).length;
  for (const k in SHEETS) { const i = new Image(); i.onload = () => { img[k] = i; if (--left === 0) { T.ready = true; onReady && onReady(); } }; i.onerror = () => { left = -999; }; i.src = SHEETS[k]; }
}
// one cell, or a w×h block, as its own canvas (cached)
export function cell(sheet, cx, cy, w = 1, h = 1) {
  const key = `${sheet}:${cx},${cy},${w},${h}`; let c = cache.get(key); if (c) return c;
  const [cv, g] = canvas(w * 16, h * 16); if (img[sheet]) g.drawImage(img[sheet], cx * 16, cy * 16, w * 16, h * 16, 0, 0, w * 16, h * 16);
  cache.set(key, cv); return cv;
}
// a prop = a block with a feet anchor at bottom-centre
export const prop = (sheet, cx, cy, w = 1, h = 1, ax, ay) => ({ canvas: cell(sheet, cx, cy, w, h), ax: ax ?? w * 8, ay: ay ?? h * 16 - 1 });
// a prop cut out of a sheet that painted flat ground behind it: flood-erase, from every edge pixel inward, any
// colour that touches the border (the sprite's own outline stops the flood, so the canopy keeps its greens)
export function propClean(sheet, cx, cy, w = 1, h = 1, ax, ay) {
  const key = `clean:${sheet}:${cx},${cy},${w},${h}`; let c = cache.get(key);
  if (!c) {
    const src = cell(sheet, cx, cy, w, h); const [cv, g] = canvas(src.width, src.height); g.drawImage(src, 0, 0);
    const W = cv.width, H = cv.height; const id = g.getImageData(0, 0, W, H); const d = id.data;
    const border = new Set(); for (let x = 0; x < W; x++) for (const y of [0, H - 1]) { const i = (y * W + x) * 4; if (d[i + 3]) border.add((d[i] << 16) | (d[i + 1] << 8) | d[i + 2]); }
    for (let y = 0; y < H; y++) for (const x of [0, W - 1]) { const i = (y * W + x) * 4; if (d[i + 3]) border.add((d[i] << 16) | (d[i + 1] << 8) | d[i + 2]); }
    const seen = new Uint8Array(W * H); const q = [];
    for (let x = 0; x < W; x++) { q.push(x, 0, x, H - 1); } for (let y = 0; y < H; y++) { q.push(0, y, W - 1, y); }
    while (q.length) { const y = q.pop(), x = q.pop(); if (x < 0 || y < 0 || x >= W || y >= H || seen[y * W + x]) continue; seen[y * W + x] = 1; const i = (y * W + x) * 4; const col = (d[i] << 16) | (d[i + 1] << 8) | d[i + 2]; if (d[i + 3] && !border.has(col)) continue; d[i + 3] = 0; q.push(x + 1, y, x - 1, y, x, y + 1, x, y - 1); }
    g.putImageData(id, 0, 0); c = cv; cache.set(key, c);
  }
  return { canvas: c, ax: ax ?? w * 8, ay: ay ?? h * 16 - 1 };
}

// ---- 9-slice: which piece for a 4-bit "continues" mask (1 N, 2 E, 4 S, 8 W) ----
// pieces are laid out on the sheet as  TL T TR / L C R / BL B BR  from origin (ox, oy)
export function slice9(sheet, ox, oy, cont) {
  const n = cont & 1, e = cont & 2, s = cont & 4, w = cont & 8;
  let dx = 1, dy = 1;
  if (!n && !s) { dy = 1; } else if (!n) dy = 0; else if (!s) dy = 2;
  if (!w && !e) { dx = 1; } else if (!w) dx = 0; else if (!e) dx = 2;
  return cell(sheet, ox + dx, oy + dy);
}

// ---- what the wood uses ----
export const OVER = {
  grass: () => cell('over', 0, 0),
  grassVar: i => cell('over', 7 + (i & 1), 9 + ((i >> 1) & 1)),
  sand: cont => slice9('over', 0, 3, cont),           // the pale trodden path
  water: f => cell('over', f & 3, 1),                  // open water, 4 frames
  pool: cont => slice9('over', 2, 6, cont),            // water with a foamed grass edge
  plank: () => cell('over', 6, 7),
  cliffTop: cont => slice9('over', 4, 9, cont),        // the plateau: grass with a dark rounded edge
  cliffFace: (row, col) => cell('over', 4 + col, 12 + row),   // row 0 top of face, 1 mid, 2 base with rubble
  tree: () => propClean('over', 5, 16, 3, 3, 24, 46),
  bush: () => propClean('over', 2, 14, 1, 1, 8, 15),
  hedge: () => prop('over', 0, 16, 2, 1, 16, 15),
  stump: () => prop('over', 0, 12, 1, 1, 8, 15),
  rock: () => prop('over', 7, 5, 1, 1, 8, 15),
  pebbles: i => prop('over', i ? 9 : 6, 5, 1, 1, 8, 15),
  fence: () => prop('over', 2, 17, 1, 1, 8, 15),
  flowers: i => cell('over', i & 1, 8),               // transparent decals over grass
  house: () => prop('over', 6, 0, 5, 5, 40, 79),
  mouth: () => prop('over', 7, 11, 2, 2, 16, 31),
  log: () => prop('over', 3, 5, 3, 1, 24, 15),
};
// ---- what the holloways use ----
export const CAVE = {
  floor: i => cell('cave', 0, i & 3),
  wallTop: () => cell('cave', 2, 1),
  wallFace: () => cell('cave', 2, 4),
  wallFaceBottom: () => cell('cave', 2, 5),
  boulder: () => prop('cave', 7, 4, 1, 1, 8, 15),
  boulderBig: () => prop('cave', 6, 3, 2, 2, 16, 31),
  pool: cont => slice9('cave', 0, 7, cont),
  water: f => cell('cave', 5 + (f & 3), 7),
  // George Bailey's cave (CC-BY 4.0): a brown speckled floor, rocks, plants, mushrooms, crystals
  floorGB: i => cell('gb', 1 + (i & 1), 12 + ((i >> 1) & 1)),
  rockGB: i => propClean('gb', i % 3, 18, 1, 2, 8, 30),
  plantGB: i => propClean('gb', 4 + (i & 1), 18, 1, 2, 8, 30),
  mushroomGB: i => propClean('gb', 7 + (i & 3), 18, 1, 2, 8, 30),
  crystalGB: i => propClean('gb', 13 + (i & 3), 18, 1, 2, 8, 30),
};

// ---- the hero and the villagers: the sheet's chibi with a 4-direction walk and a 4-direction sword swing ----
// rows on character.png (16 px cells): walk down 0, right 2, up 4, left 6 (each 16×32, 4 frames at cols 0-3);
// swing down 8, up 10, left 12, right 14 (each 32×32, 4 frames at cols 0,2,4,6)
const WALK_ROW = { down: 0, right: 2, up: 4, left: 6 }, SWING_ROW = { down: 8, up: 10, left: 12, right: 14 };
function hsl(r, g, b) { r /= 255; g /= 255; b /= 255; const mx = Math.max(r, g, b), mn = Math.min(r, g, b); let h = 0, s = 0; const l = (mx + mn) / 2; if (mx !== mn) { const d = mx - mn; s = l > 0.5 ? d / (2 - mx - mn) : d / (mx + mn); if (mx === r) h = ((g - b) / d + (g < b ? 6 : 0)) * 60; else if (mx === g) h = ((b - r) / d + 2) * 60; else h = ((r - g) / d + 4) * 60; } return [h, s, l]; }
function rgbOf(hex) { return [parseInt(hex.slice(1, 3), 16), parseInt(hex.slice(3, 5), 16), parseInt(hex.slice(5, 7), 16)]; }
// recolour by material: the sheet's red tunic → `tunic`, its brown hair → `hair`; lightness of each pixel is kept
function recolour(src, look) {
  const [cv, g] = canvas(src.width, src.height); g.drawImage(src, 0, 0); const id = g.getImageData(0, 0, cv.width, cv.height); const d = id.data;
  const tun = look.tunic ? hsl(...rgbOf(look.tunic)) : null, hair = look.hair ? hsl(...rgbOf(look.hair)) : null, pants = look.pants ? hsl(...rgbOf(look.pants)) : null;
  const toRgb = (h, s, l) => { const f = n => { const k = (n + h / 30) % 12; const a = s * Math.min(l, 1 - l); return Math.round(255 * (l - a * Math.max(-1, Math.min(k - 3, 9 - k, 1)))); }; return [f(0), f(8), f(4)]; };
  for (let i = 0; i < d.length; i += 4) {
    if (!d[i + 3]) continue; const [h, s, l] = hsl(d[i], d[i + 1], d[i + 2]); let t = null;
    if (s > 0.35 && (h < 18 || h > 335) && l > 0.12 && l < 0.7) t = tun;                       // the red tunic
    else if (s > 0.2 && h >= 18 && h < 45 && l < 0.42) t = hair;                                // the brown hair
    else if (h >= 200 && h < 260 && l < 0.5) t = pants;                                          // the dark trousers
    if (t) { const [r, gg, b] = toRgb(t[0], Math.min(1, t[1] * 0.9 + 0.1), Math.max(0.08, Math.min(0.92, l + (t[2] - 0.45) * 0.6))); d[i] = r; d[i + 1] = gg; d[i + 2] = b; }
  }
  g.putImageData(id, 0, 0); return cv;
}
function feetOf(c) { const g = c.getContext('2d'); const d = g.getImageData(0, 0, c.width, c.height).data; for (let y = c.height - 1; y >= 0; y--) for (let x = 0; x < c.width; x++) if (d[(y * c.width + x) * 4 + 3]) return y + 1; return c.height; }
export function bakePerson(look) {
  const out = {}; let feet = null;
  for (const f of ['down', 'right', 'up', 'left']) {
    out[f] = [0, 1, 2, 3].map(i => { const c = recolour(cell('char', i, WALK_ROW[f], 1, 2), look); if (feet === null) feet = feetOf(c); return { canvas: c, ax: 8, ay: feet, bob: i === 1 || i === 3 ? 1 : 0 }; });
  }
  out.swing = {};
  for (const f of ['down', 'right', 'up', 'left']) out.swing[f] = [0, 1, 2, 3].map(i => { const c = recolour(cell('char', i * 2, SWING_ROW[f], 2, 2), look); return { canvas: c, ax: 16, ay: feet, bob: 0 }; });
  return out;
}
