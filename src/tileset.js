// tileset.js — the painted tiles (ArMM1998 "Zelda-like tilesets and sprites", CC0). Sheets load async; until
// they are ready the game draws its own baked tiles, so nothing waits on the network.
// Coordinates are (col, row) of 16 px cells on the sheet. The 9-slice blocks are named by their top-left cell.
import { canvas } from './px.js';

const SHEETS = { over: 'tiles/overworld.png', cave: 'tiles/cave.png', objects: 'tiles/objects.png' };
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
  tree: () => prop('over', 5, 16, 3, 3, 24, 46),
  bush: () => prop('over', 2, 14, 1, 1, 8, 15),
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
};
