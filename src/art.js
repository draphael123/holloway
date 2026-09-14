// art.js — top-down 3/4 (SNES RPG) art, baked once at load. Square 16×16 tiles.
import { canvas, px, rect, fillPoly, line, circle, ellipse, mulberry, shade } from './px.js';

export const TS = 16;
export const PAL = {
  outline: '#1b1626',
  grass: { base: '#4f9c3c', lite: '#66b34c', dark: '#3d8030', deep: '#2f6a27' },
  dirt: { base: '#c9a266', lite: '#dbb87c', dark: '#a8824c', edge: '#8c6a3c' },
  stone: { base: '#a8a094', lite: '#c4bcae', dark: '#7f776b', joint: '#5f584e' },
  water: { base: '#3a78c9', lite: '#5d9be0', dark: '#2a5aa8', foam: '#d6ecf8', shore: '#d9c58a' },
  plank: { base: '#a0703f', lite: '#bf8a52', dark: '#6f4a2a' },
  wood: { lite: '#a6733f', base: '#7a5230', dark: '#4f3320' },
  rock: { lite: '#b9b4a8', base: '#9a958a', dark: '#6f6a60' },
};

// ---------- ground ----------
// side mask bits: 1 = top, 2 = right, 4 = bottom, 8 = left (neighbour is "other")
function edgeDepth(rnd, u) { return 2 + Math.floor(Math.abs(Math.sin(u * 1.7 + rnd * 6)) * 2.5); }
function edgeGrass(g, mask, seed) {
  // paint an irregular grass fringe on the sides of a non-grass tile
  const rnd = mulberry(seed); const r0 = rnd() * 10;
  const G = PAL.grass;
  for (let u = 0; u < TS; u++) {
    const d = edgeDepth(r0, u);
    if (mask & 1) for (let k = 0; k < d; k++) px(g, u, k, k === d - 1 ? G.dark : G.base);
    if (mask & 4) for (let k = 0; k < d; k++) px(g, u, TS - 1 - k, k === d - 1 ? G.dark : G.base);
    if (mask & 8) for (let k = 0; k < d; k++) px(g, k, u, k === d - 1 ? G.dark : G.base);
    if (mask & 2) for (let k = 0; k < d; k++) px(g, TS - 1 - k, u, k === d - 1 ? G.dark : G.base);
  }
}

export function bakeGrass(seed) {
  const rnd = mulberry(seed); const [c, g] = canvas(TS, TS); const G = PAL.grass;
  for (let y = 0; y < TS; y++) for (let x = 0; x < TS; x++) { const r = rnd(); px(g, x, y, r < 0.05 ? G.lite : r < 0.13 ? G.dark : G.base); }
  // a darker patch, then tufts: three blades, shadow at the root, a lit tip
  if (rnd() < 0.5) { const x = Math.floor(rnd() * 10), y = Math.floor(rnd() * 10); for (let j = 0; j < 5; j++) for (let i = 0; i < 6; i++) if (rnd() < 0.55) px(g, x + i, y + j, G.dark); }
  for (let i = 0; i < 2; i++) { const x = 2 + Math.floor(rnd() * 11), y = 4 + Math.floor(rnd() * 10); px(g, x - 1, y, G.deep); px(g, x, y, G.deep); px(g, x + 1, y, G.deep); px(g, x - 1, y - 1, G.dark); px(g, x + 1, y - 1, G.dark); px(g, x, y - 1, G.lite); px(g, x, y - 2, G.lite); px(g, x + 1, y - 2, G.dark); }
  return c;
}
export function bakeFlowers(seed) {
  const rnd = mulberry(seed); const c = bakeGrass(seed + 31); const g = c.getContext('2d');
  const cols = ['#e85b4a', '#f4d35e', '#fbf6ea', '#dd7bd8'];
  for (let i = 0; i < 4; i++) { const x = 1 + Math.floor(rnd() * 12), y = 1 + Math.floor(rnd() * 12); const col = cols[Math.floor(rnd() * cols.length)]; px(g, x, y, col); px(g, x + 1, y, col); px(g, x, y + 1, col); px(g, x + 1, y + 1, shade(col, -0.25)); px(g, x + 1, y + 2, PAL.grass.deep); }
  return c;
}
export function bakeDirt(seed, mask) {
  const rnd = mulberry(seed); const [c, g] = canvas(TS, TS); const D = PAL.dirt;
  for (let y = 0; y < TS; y++) for (let x = 0; x < TS; x++) { const r = rnd(); px(g, x, y, r < 0.08 ? D.lite : r < 0.16 ? D.dark : D.base); }
  for (let i = 0; i < 2; i++) { const x = Math.floor(rnd() * 14), y = Math.floor(rnd() * 14); px(g, x, y, D.dark); px(g, x + 1, y, D.dark); }
  edgeGrass(g, mask, seed);
  return c;
}
export function bakeStone(seed, mask) {
  const rnd = mulberry(seed); const [c, g] = canvas(TS, TS); const S = PAL.stone;
  for (let y = 0; y < TS; y++) for (let x = 0; x < TS; x++) px(g, x, y, S.joint);
  for (let j = 0; j < 2; j++) for (let i = 0; i < 2; i++) {
    const r = rnd(); const tone = r < 0.25 ? S.lite : r < 0.45 ? S.dark : S.base;
    rect(g, i * 8 + 1, j * 8 + 1, 7, 7, tone); rect(g, i * 8 + 1, j * 8 + 1, 7, 1, shade(tone, 0.18)); rect(g, i * 8 + 1, j * 8 + 7, 7, 1, shade(tone, -0.2)); px(g, i * 8 + 7, j * 8 + 1, shade(tone, -0.1));
    if (rnd() < 0.3) px(g, i * 8 + 2 + Math.floor(rnd() * 5), j * 8 + 2 + Math.floor(rnd() * 5), shade(tone, -0.15));
  }
  edgeGrass(g, mask, seed);
  return c;
}
export function bakeWater(frame, mask) {
  const [c, g] = canvas(TS, TS); const W = PAL.water; const rnd = mulberry(800 + frame);
  for (let y = 0; y < TS; y++) for (let x = 0; x < TS; x++) { const w = Math.sin((x * 0.9 + y * 0.5 + frame * 1.6) * 0.8) + Math.sin((y * 1.1 - x * 0.3 + frame * 0.9)); px(g, x, y, w > 1.25 ? W.lite : w < -1.35 ? W.dark : W.base); }
  for (let i = 0; i < 2; i++) { const x = (Math.floor(rnd() * 12) + frame * 2) % 13, y = 2 + Math.floor(rnd() * 11); px(g, x, y, W.foam); px(g, x + 1, y, W.foam); px(g, x + 2, y, W.lite); }
  for (let u = 0; u < TS; u++) {
    if (mask & 1) { px(g, u, 0, W.shore); if ((u + frame) % 4 === 0) px(g, u, 1, W.foam); }
    if (mask & 4) { px(g, u, TS - 1, W.shore); if ((u + frame) % 4 === 1) px(g, u, TS - 2, W.foam); }
    if (mask & 8) { px(g, 0, u, W.shore); if ((u + frame) % 4 === 2) px(g, 1, u, W.foam); }
    if (mask & 2) { px(g, TS - 1, u, W.shore); if ((u + frame) % 4 === 3) px(g, TS - 2, u, W.foam); }
  }
  return c;
}
export function bakePlank(seed) {
  const [c, g] = canvas(TS, TS); const P = PAL.plank; const rnd = mulberry(seed);
  for (let y = 0; y < TS; y++) for (let x = 0; x < TS; x++) px(g, x, y, rnd() < 0.05 ? P.lite : P.base);
  for (const y of [0, 5, 10, 15]) rect(g, 0, y, TS, 1, P.dark);
  for (const y of [1, 6, 11]) rect(g, 0, y, TS, 1, P.lite);
  px(g, 3 + Math.floor(rnd() * 8), 3, P.dark); px(g, 3 + Math.floor(rnd() * 8), 13, P.dark);
  return c;
}

// ---------- buildings (front wall + roof from above) ----------
// b: {w,d,H, wall:{lit,timber?}, roof:{lite,mid,dark}, door:{u}, windows:[{u,v,arch?,box?,shutters?}], stories, sign, awning, chimney, stone, ridge}
export function bakeBuilding(b, night = false) {
  const { w, d, H } = b; const W = w * TS, D = d * TS; const ov = 5;
  const R = b.R ?? 12;                       // ridge rise above the eaves
  const pad = 3;
  const cw = W + ov * 2 + pad * 2, chh = D + H + ov + R + pad * 2;
  const [c, g] = canvas(cw, chh);
  const OX = ov + pad;                       // local x of footprint left
  const wallBase = chh - pad;                // local y of footprint bottom
  const wallTop = wallBase - H;
  const roofBottom = wallTop, roofTop = wallTop - D;  // eave lines (front, back)
  const wall = b.wall, roof = b.roof;

  // --- wall ---
  rect(g, OX, wallTop, W, H, wall.lit);
  const dark = shade(wall.lit, -0.28);
  if (b.stone) { for (let y = wallTop + 2; y < wallBase; y += 5) { rect(g, OX, y, W, 1, dark); const off = (((y - wallTop) / 5) & 1) * 5; for (let x = OX + off; x < OX + W; x += 10) px(g, x, y + 1, dark), px(g, x, y + 2, dark), px(g, x, y + 3, dark); } }
  // plinth
  rect(g, OX, wallBase - 4, W, 4, PAL.rock.base); for (let x = OX; x < OX + W; x += 4) px(g, x, wallBase - 2, PAL.rock.dark); rect(g, OX, wallBase - 4, W, 1, PAL.rock.lite);
  // timber framing
  if (wall.timber) {
    const T = wall.timber;
    for (let x = OX; x <= OX + W - 2; x += TS) rect(g, x, wallTop, 2, H - 4, T);
    rect(g, OX + W - 2, wallTop, 2, H - 4, T);
    rect(g, OX, wallTop, W, 2, T);
    if (b.stories === 2) { rect(g, OX, wallTop + Math.floor(H / 2) - 1, W, 2, T); for (let x = OX + 8; x < OX + W - 8; x += TS) line(g, x - 6, wallTop + Math.floor(H / 2) + 1, x + 6, wallTop + H - 5, T); }
  }
  // eave shadow on the wall
  rect(g, OX, wallTop, W, 2, shade(wall.lit, -0.35));
  // --- windows ---
  for (const win of b.windows || []) {
    const x = OX + Math.round(win.u * TS), y = wallTop + (win.v ?? 8); const ww = 8, wh = win.tall ? 14 : 10;
    const frame = '#e6dcc4', pane = night ? '#f4c454' : '#2f3e70', pane2 = night ? '#ffe28a' : '#6f86c9';
    rect(g, x - 1, y - 1, ww + 2, wh + 2, PAL.wood.dark);
    if (win.arch) { rect(g, x - 1, y - 3, ww + 2, 3, PAL.wood.dark); rect(g, x, y - 2, ww, 2, frame); px(g, x, y - 2, PAL.wood.dark); px(g, x + ww - 1, y - 2, PAL.wood.dark); }
    rect(g, x, y, ww, wh, frame); rect(g, x + 1, y + 1, ww - 2, wh - 2, pane);
    if (win.arch) { rect(g, x + 1, y - 1, ww - 2, 2, pane); px(g, x + 1, y - 1, frame); px(g, x + ww - 2, y - 1, frame); }
    rect(g, x + 1, y + 1, 2, wh - 2, pane2); px(g, x + 3, y + 1, pane2);
    rect(g, x + ww / 2 - 1, y, 1, wh, frame); rect(g, x, y + wh / 2, ww, 1, frame);
    if (win.box) { rect(g, x - 2, y + wh + 1, ww + 4, 3, PAL.wood.base); rect(g, x - 2, y + wh + 1, ww + 4, 1, PAL.wood.lite); for (let k = 0; k < 5; k++) { px(g, x - 1 + k * 2, y + wh, k & 1 ? '#e85b4a' : '#f4d35e'); px(g, x + k * 2, y + wh, PAL.grass.dark); } }
    if (win.shutters) { rect(g, x - 5, y - 1, 4, wh + 2, PAL.wood.base); rect(g, x - 4, y + 1, 2, wh - 2, PAL.wood.dark); rect(g, x + ww + 1, y - 1, 4, wh + 2, PAL.wood.base); rect(g, x + ww + 2, y + 1, 2, wh - 2, PAL.wood.dark); }
  }
  // --- door ---
  if (b.door) {
    const x = OX + Math.round(b.door.u * TS), dw = 12, dh = 18, y = wallBase - dh;
    rect(g, x - 1, y - 3, dw + 2, dh + 3, PAL.wood.lite); rect(g, x, y - 2, dw, dh + 2, PAL.wood.dark);
    px(g, x, y - 2, PAL.wood.lite); px(g, x + dw - 1, y - 2, PAL.wood.lite);
    rect(g, x + dw / 2, y - 1, 1, dh, PAL.wood.base); rect(g, x + 1, y + 3, dw - 2, 1, PAL.wood.base);
    px(g, x + dw - 3, y + 8, '#e2c15a');
    rect(g, x - 2, wallBase, dw + 4, 2, PAL.rock.lite);
    if (night) { rect(g, x + 1, y - 1, dw - 2, 3, '#f4c454'); }
  }
  // --- sign ---
  if (b.sign) {
    const x = OX + Math.round(b.sign.u * TS), y = wallTop + 6;
    rect(g, x, y, 10, 1, PAL.wood.dark); rect(g, x + 1, y + 1, 1, 2, PAL.wood.dark); rect(g, x + 8, y + 1, 1, 2, PAL.wood.dark);
    rect(g, x - 1, y + 3, 12, 10, PAL.wood.lite); rect(g, x, y + 4, 10, 8, b.sign.bg);
    const cx = x + 5, cy = y + 8;
    if (b.sign.icon === 'mug') { rect(g, cx - 2, cy - 3, 4, 6, '#d9b45a'); rect(g, cx - 2, cy - 3, 4, 1, '#fff5d0'); px(g, cx + 2, cy - 1, '#d9b45a'); px(g, cx + 2, cy, '#d9b45a'); }
    if (b.sign.icon === 'coin') { circle(g, cx, cy, 2.6, '#f4d35e'); px(g, cx, cy, '#c9a227'); }
    if (b.sign.icon === 'anvil') { rect(g, cx - 3, cy - 1, 6, 2, '#4a4a55'); rect(g, cx - 1, cy + 1, 3, 2, '#4a4a55'); }
  }
  // --- awning ---
  if (b.awning) {
    const x0 = OX + Math.round(b.awning.u0 * TS), x1 = OX + Math.round(b.awning.u1 * TS), y = wallTop + 4, ah = 7;
    for (let x = x0; x < x1; x += 4) rect(g, x, y, Math.min(4, x1 - x), ah, ((x - x0) / 4) & 1 ? '#f2ede0' : b.awning.color);
    rect(g, x0, y + ah, x1 - x0, 2, shade(b.awning.color, -0.3));
    for (let x = x0; x < x1; x += 4) px(g, x + 1, y + ah + 2, ((x - x0) / 4) & 1 ? '#f2ede0' : b.awning.color);
    rect(g, x0, y + ah, 1, wallBase - y - ah, PAL.wood.dark); rect(g, x1 - 1, y + ah, 1, wallBase - y - ah, PAL.wood.dark);
  }

  // --- roof (hip, seen from above) ---
  const rx0 = OX - ov, rx1 = OX + W + ov, yb = roofBottom + ov, yt = roofTop - ov;
  const hip = Math.min(18, Math.floor(W * 0.22));
  const yr = yt + Math.round((yb - yt) * 0.36) - R + 8;   // ridge line
  const front = [[rx0, yb], [rx1, yb], [rx1 - hip, yr], [rx0 + hip, yr]];
  const back = [[rx0, yt], [rx1, yt], [rx1 - hip, yr], [rx0 + hip, yr]];
  fillPoly(g, back, roof.dark);
  fillPoly(g, [[rx0, yt], [rx0 + hip, yr], [rx0, yb]], roof.mid);
  fillPoly(g, [[rx1, yt], [rx1 - hip, yr], [rx1, yb]], roof.dark);
  fillPoly(g, front, roof.mid);
  // tile rows on the front slope (perspective: denser near the ridge)
  const rowsF = []; for (let y = yb - 1, gap = 4; y > yr + 1; y -= gap) { rowsF.push(y); if (gap > 3) gap -= 0.25; }
  for (const yy of rowsF) { const t = (yb - yy) / (yb - yr); const xa = rx0 + hip * t, xb = rx1 - hip * t; rect(g, Math.round(xa), Math.round(yy), Math.round(xb - xa), 1, roof.dark); for (let x = Math.round(xa) + (Math.round(yy) & 1) * 2; x < xb; x += 4) px(g, x, Math.round(yy) - 1, roof.lite); }
  for (let yy = yt + 2; yy < yr - 1; yy += 3) { const t = (yy - yt) / (yr - yt); const xa = rx0 + hip * t, xb = rx1 - hip * t; rect(g, Math.round(xa), yy, Math.round(xb - xa), 1, shade(roof.dark, -0.25)); }
  // hips + eaves + ridge
  line(g, rx0, yt, rx0 + hip, yr, shade(roof.dark, -0.3)); line(g, rx1, yt, rx1 - hip, yr, shade(roof.dark, -0.3));
  line(g, rx0, yb, rx0 + hip, yr, roof.lite); line(g, rx1, yb, rx1 - hip, yr, roof.dark);
  rect(g, rx0 + hip, yr - 1, rx1 - rx0 - hip * 2, 2, roof.lite); rect(g, rx0 + hip, yr + 1, rx1 - rx0 - hip * 2, 1, shade(roof.dark, -0.3));
  rect(g, rx0, yb, rx1 - rx0, 1, roof.lite); rect(g, rx0, yb + 1, rx1 - rx0, 1, roof.dark);
  rect(g, rx0, yt, rx1 - rx0, 1, shade(roof.dark, -0.3));
  // dormer / gable window on 2-storey roofs
  if (b.dormer) {
    const cx = OX + Math.round(b.dormer * TS), dy0 = yr + 6, dy1 = yb - 6;   // dormer face from dy0..dy1
    rect(g, cx - 7, dy0, 14, dy1 - dy0, wall.lit); rect(g, cx - 7, dy0, 1, dy1 - dy0, shade(wall.lit, -0.3)); rect(g, cx + 6, dy0, 1, dy1 - dy0, shade(wall.lit, -0.3));
    fillPoly(g, [[cx - 9, dy0 + 1], [cx, dy0 - 6], [cx + 9, dy0 + 1], [cx + 9, dy0 + 3], [cx, dy0 - 4], [cx - 9, dy0 + 3]], roof.dark);
    fillPoly(g, [[cx - 9, dy0 + 1], [cx, dy0 - 6], [cx + 9, dy0 + 1]], roof.lite);
    rect(g, cx - 3, dy0 + 3, 6, Math.max(4, dy1 - dy0 - 5), night ? '#f4c454' : '#2f3e70'); rect(g, cx - 3, dy0 + 3, 6, 1, '#e6dcc4'); rect(g, cx, dy0 + 3, 1, Math.max(4, dy1 - dy0 - 5), '#e6dcc4');
  }
  // chimney on the back slope
  let chimney = null;
  if (b.chimney) { const cx = OX + Math.round(W * 0.78), cy = yt + 4; rect(g, cx - 3, cy - 8, 7, 10, PAL.rock.base); rect(g, cx + 3, cy - 8, 1, 10, PAL.rock.dark); rect(g, cx - 4, cy - 10, 9, 3, PAL.rock.dark); rect(g, cx - 3, cy - 9, 7, 1, '#2a2430'); chimney = { dx: cx - OX, dy: cy - 10 - wallBase }; }
  return { canvas: c, ox: OX, oy: wallBase, chimney };
}

// ---------- trees & props (anchor = feet/base point) ----------
export function bakeTree(seed, big = false) {
  const rnd = mulberry(seed); const S = big ? 1.25 : 1;
  const W = Math.round(36 * S), Hh = Math.round(44 * S); const [c, g] = canvas(W, Hh);
  const cx = W / 2, base = Hh - 1;
  rect(g, cx - 3, base - 10 * S, 6, 10 * S, PAL.wood.base); rect(g, cx + 1, base - 10 * S, 2, 10 * S, PAL.wood.dark); rect(g, cx - 3, base - 10 * S, 1, 10 * S, PAL.wood.lite);
  rect(g, cx - 5, base - 2, 2, 2, PAL.wood.base); rect(g, cx + 3, base - 2, 3, 2, PAL.wood.dark);
  const cy = base - 24 * S;
  const blobs = [[cx, cy, 15 * S], [cx - 9 * S, cy + 4 * S, 9 * S], [cx + 9 * S, cy + 3 * S, 9.5 * S], [cx - 3 * S, cy - 8 * S, 9 * S], [cx + 6 * S, cy - 6 * S, 8 * S]];
  const tones = ['#245e22', '#337a2d', '#4a9a3d', '#6cbd55'];
  for (let y = 0; y < Hh; y++) for (let x = 0; x < W; x++) {
    let inside = false; for (const [bx, by, r] of blobs) { const dx = x + 0.5 - bx, dy = y + 0.5 - by; if (dx * dx + dy * dy <= r * r) inside = true; }
    if (!inside) continue;
    const l = -(x - cx) / (14 * S) * 0.6 - (y - cy) / (12 * S) * 1.0 + (rnd() - 0.5) * 0.8;
    px(g, x, y, tones[l > 0.7 ? 3 : l > 0.1 ? 2 : l > -0.55 ? 1 : 0]);
  }
  // leaf clumps: little highlight arcs
  for (let i = 0; i < 6 * S; i++) { const x = cx - 12 * S + rnd() * 24 * S, y = cy - 10 * S + rnd() * 18 * S; px(g, x, y, tones[2]); px(g, x + 1, y, tones[3]); px(g, x + 1, y + 1, tones[1]); }
  return { canvas: c, ax: cx, ay: base };
}
export function bakeBush(seed) {
  const rnd = mulberry(seed); const [c, g] = canvas(20, 14);
  const blobs = [[10, 7, 6.5], [5, 9, 4.5], [15, 9, 4.5]]; const tones = ['#245e22', '#337a2d', '#4a9a3d'];
  for (let y = 0; y < 14; y++) for (let x = 0; x < 20; x++) { let ins = false; for (const [bx, by, r] of blobs) { const dx = x + 0.5 - bx, dy = y + 0.5 - by; if (dx * dx + dy * dy <= r * r) ins = true; } if (!ins) continue; const l = -(x - 10) / 8 - (y - 7) / 5 + (rnd() - 0.5); px(g, x, y, tones[l > 0.6 ? 2 : l > -0.4 ? 1 : 0]); }
  if (rnd() < 0.6) for (let i = 0; i < 3; i++) px(g, 4 + Math.floor(rnd() * 12), 4 + Math.floor(rnd() * 6), rnd() < 0.5 ? '#e85b4a' : '#fbf6ea');
  return { canvas: c, ax: 10, ay: 13 };
}
export function bakeLamp() {
  const [c, g] = canvas(12, 36);
  rect(g, 3, 32, 6, 3, '#3a3238'); rect(g, 4, 31, 4, 1, '#55505c'); rect(g, 5, 9, 2, 23, '#3a3238'); rect(g, 6, 9, 1, 23, '#25202a');
  rect(g, 2, 2, 8, 8, '#3a3238'); rect(g, 3, 3, 6, 6, '#f7d774'); rect(g, 4, 4, 2, 2, '#fff6c8'); rect(g, 1, 1, 10, 1, '#3a3238'); rect(g, 5, 0, 2, 1, '#3a3238'); rect(g, 4, 10, 4, 1, '#55505c');
  return { canvas: c, ax: 6, ay: 35 };
}
export function bakeBarrel() {
  const [c, g] = canvas(12, 15);
  for (let y = 3; y < 14; y++) { const wdt = y > 12 ? 8 : 10; const x0 = 6 - wdt / 2; rect(g, x0, y, wdt, 1, PAL.wood.base); px(g, x0, y, PAL.wood.lite); px(g, x0 + wdt - 1, y, PAL.wood.dark); }
  rect(g, 1, 5, 10, 1, '#4a4a55'); rect(g, 1, 10, 10, 1, '#4a4a55'); ellipse(g, 6, 3, 5, 2, PAL.wood.lite); ellipse(g, 6, 3, 3.5, 1.2, PAL.wood.base);
  return { canvas: c, ax: 6, ay: 14 };
}
export function bakeCrate() {
  const [c, g] = canvas(16, 16);
  rect(g, 1, 1, 14, 5, PAL.wood.lite); rect(g, 1, 6, 14, 9, PAL.wood.base); rect(g, 1, 6, 14, 1, PAL.wood.dark);
  rect(g, 1, 1, 1, 14, PAL.wood.dark); rect(g, 14, 1, 1, 14, PAL.wood.dark); rect(g, 1, 14, 14, 1, PAL.wood.dark); line(g, 2, 7, 13, 13, PAL.wood.dark); line(g, 13, 7, 2, 13, PAL.wood.dark);
  return { canvas: c, ax: 8, ay: 15 };
}
export function bakeWell() {
  const [c, g] = canvas(32, 36); const S = PAL.rock;
  ellipse(g, 16, 30, 11, 5, S.dark); ellipse(g, 16, 27, 11, 5, S.base); ellipse(g, 16, 27, 11, 5, S.base); ellipse(g, 16, 26, 7, 3, '#2a5aa8'); px(g, 14, 25, '#5d9be0'); px(g, 18, 26, '#5d9be0');
  for (let i = 0; i < 7; i++) px(g, 6 + i * 3, 29 + (i & 1), S.lite);
  rect(g, 5, 8, 2, 20, PAL.wood.base); rect(g, 25, 8, 2, 20, PAL.wood.base);
  fillPoly(g, [[2, 10], [16, 2], [30, 10], [30, 12], [16, 6], [2, 12]], '#8a3222'); fillPoly(g, [[2, 10], [16, 2], [16, 6], [2, 12]], '#b5452e');
  rect(g, 15, 10, 2, 12, '#4a4a55'); rect(g, 13, 20, 6, 4, PAL.wood.dark);
  return { canvas: c, ax: 16, ay: 33 };
}
export function bakeSignpost() {
  const [c, g] = canvas(20, 30);
  rect(g, 9, 6, 2, 24, PAL.wood.base); rect(g, 10, 6, 1, 24, PAL.wood.dark);
  fillPoly(g, [[2, 8], [16, 8], [19, 10], [16, 12], [2, 12]], PAL.wood.lite); rect(g, 4, 10, 10, 1, PAL.wood.dark);
  fillPoly(g, [[18, 14], [4, 14], [1, 16], [4, 18], [18, 18]], PAL.wood.lite); rect(g, 6, 16, 10, 1, PAL.wood.dark);
  return { canvas: c, ax: 10, ay: 29 };
}
// fence: horizontal (len tiles wide) or vertical (len tiles tall)
export function bakeFence(axis, len) {
  if (axis === 'x') {
    const W = len * TS + 4, Hh = 16; const [c, g] = canvas(W, Hh);
    rect(g, 2, 6, W - 4, 2, PAL.wood.lite); rect(g, 2, 8, W - 4, 1, PAL.wood.dark); rect(g, 2, 11, W - 4, 2, PAL.wood.lite); rect(g, 2, 13, W - 4, 1, PAL.wood.dark);
    for (let i = 0; i <= len; i++) { const x = 2 + i * TS; rect(g, x - 1, 2, 3, 13, PAL.wood.base); px(g, x - 1, 2, PAL.wood.lite); rect(g, x + 1, 3, 1, 12, PAL.wood.dark); }
    return { canvas: c, ax: 2, ay: 15 };
  }
  const W = 8, Hh = len * TS + 6; const [c, g] = canvas(W, Hh);
  rect(g, 2, 4, 2, Hh - 8, PAL.wood.lite); rect(g, 4, 4, 1, Hh - 8, PAL.wood.dark);
  for (let i = 0; i <= len; i++) { const y = 4 + i * TS; rect(g, 1, y - 10, 4, 12, PAL.wood.base); px(g, 1, y - 10, PAL.wood.lite); rect(g, 4, y - 9, 1, 11, PAL.wood.dark); }
  return { canvas: c, ax: 3, ay: 4 };
}
export function bakeStall(color) {
  const [c, g] = canvas(36, 40);
  // table front
  rect(g, 2, 26, 32, 9, PAL.wood.base); rect(g, 2, 26, 32, 1, PAL.wood.lite); rect(g, 2, 34, 32, 1, PAL.wood.dark); rect(g, 2, 35, 3, 4, PAL.wood.dark); rect(g, 31, 35, 3, 4, PAL.wood.dark);
  rect(g, 2, 22, 32, 4, PAL.wood.lite);
  const goods = ['#e85b4a', '#f4d35e', '#6cbd55', '#f0a35a', '#dd7bd8', '#fbf6ea'];
  for (let i = 0; i < 6; i++) { rect(g, 4 + i * 5, 20, 4, 4, goods[i]); px(g, 4 + i * 5, 20, shade(goods[i], 0.4)); }
  // awning from above (stripes)
  for (let x = 0; x < 36; x += 4) rect(g, x, 2, 4, 15, (x / 4) & 1 ? '#f2ede0' : color);
  rect(g, 0, 16, 36, 2, shade(color, -0.3)); for (let x = 0; x < 36; x += 4) px(g, x + 1, 18, (x / 4) & 1 ? '#f2ede0' : color);
  rect(g, 0, 1, 36, 1, shade(color, -0.35));
  rect(g, 1, 18, 1, 8, PAL.wood.dark); rect(g, 34, 18, 1, 8, PAL.wood.dark);
  return { canvas: c, ax: 2, ay: 39 };
}
export function bakeFountain(frame) {
  const [c, g] = canvas(56, 48); const S = PAL.rock;
  ellipse(g, 28, 33, 26, 12, S.dark); ellipse(g, 28, 30, 26, 12, S.base); ellipse(g, 28, 30, 26, 12, S.base);
  for (let i = 0; i < 12; i++) { const a = i / 12 * Math.PI * 2; px(g, 28 + Math.cos(a) * 25, 30 + Math.sin(a) * 11, S.lite); }
  ellipse(g, 28, 30, 21, 8.5, S.dark); ellipse(g, 28, 30, 20, 8, '#2a5aa8');
  const rnd = mulberry(40 + frame);
  for (let i = 0; i < 16; i++) { const a = rnd() * Math.PI * 2, r = rnd(); px(g, 28 + Math.cos(a) * r * 18, 30 + Math.sin(a) * r * 7, i % 3 === frame % 3 ? '#d6ecf8' : '#5d9be0'); }
  for (let i = 0; i < 10; i++) { const a = i / 10 * Math.PI * 2 + frame; px(g, 28 + Math.cos(a) * 12, 30 + Math.sin(a) * 4.5, '#d6ecf8'); }
  rect(g, 25, 12, 6, 18, S.base); rect(g, 30, 12, 1, 18, S.dark); rect(g, 25, 12, 1, 18, S.lite);
  ellipse(g, 28, 12, 8, 3.5, S.lite); ellipse(g, 28, 12, 6, 2.5, '#3a78c9'); rect(g, 27, 4, 2, 8, S.lite);
  const jet = (dx, ph) => { for (let k = 0; k < 7; k++) { const t = (k + ph) / 7; px(g, 28 + dx * t * 14, 4 + t * t * 26 - Math.sin(t * Math.PI) * 6, k < 3 ? '#e8f6ff' : '#5d9be0'); } };
  jet(-1, frame * 0.33); jet(1, frame * 0.33 + 0.5); jet(-0.5, frame * 0.33 + 0.2); jet(0.5, frame * 0.33 + 0.7);
  for (let k = 0; k < 3; k++) px(g, 27 + k, 2 - ((frame + k) % 2), '#e8f6ff');
  return { canvas: c, ax: 4, ay: 42 };
}
export function bakeSmoke() {
  return [3, 4, 5, 6].map(r => { const [c, g] = canvas(r * 2 + 2, r * 2 + 2); circle(g, r + 1, r + 1, r, '#d6d0da', '#b8b2be'); return c; });
}
export function bakeChicken(frame) {
  const rows = frame === 0 ? ['...rr...', '..wwwo..', '.wwwwww.', '.wwwwww.', '..wwww..', '...y.y..', '...y.y..'] : ['...rr...', '..wwwo..', '.wwwwww.', '.wwwwww.', '..wwww..', '..y..y..', '........'];
  const pal = { r: '#e85b4a', w: '#fbf6ea', o: '#f0a35a', y: '#f0a35a' };
  const w = 10, h = 9; const [c, g] = canvas(w, h); rows.forEach((r, y) => { for (let x = 0; x < r.length; x++) if (r[x] !== '.') px(g, x + 1, y + 1, pal[r[x]]); });
  outlineLocal(c); return { canvas: c, ax: 5, ay: 8 };
}
function outlineLocal(c) { const g = c.getContext('2d'), w = c.width, h = c.height; const d = g.getImageData(0, 0, w, h).data; const s = new Uint8Array(w * h); for (let i = 0; i < w * h; i++) s[i] = d[i * 4 + 3] > 0; g.fillStyle = PAL.outline; for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) { if (s[y * w + x]) continue; if ((x > 0 && s[y * w + x - 1]) || (x < w - 1 && s[y * w + x + 1]) || (y > 0 && s[(y - 1) * w + x]) || (y < h - 1 && s[(y + 1) * w + x])) g.fillRect(x, y, 1, 1); } }
export function bakeButterfly(frame, col) {
  const [c, g] = canvas(6, 4);
  if (frame === 0) { rect(g, 0, 0, 2, 2, col); rect(g, 4, 0, 2, 2, col); px(g, 1, 2, col); px(g, 4, 2, col); } else { rect(g, 1, 1, 1, 2, col); rect(g, 4, 1, 1, 2, col); }
  px(g, 2, 1, PAL.outline); px(g, 3, 1, PAL.outline);
  return c;
}
export function bakeShadow(rx, ry) { const [c, g] = canvas(rx * 2 + 2, ry * 2 + 2); ellipse(g, rx + 1, ry + 1, rx, ry, 'rgba(20,16,40,0.35)'); return c; }
