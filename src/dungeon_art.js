// dungeon_art.js — the warren's tiles and props, baked once. Top-down 3/4: a wall tile shows its top, and a
// lit face on the row that has floor south of it. Everything that hurts looks like it hurts first (rule C1).
import { canvas, px, rect, circle, ellipse, line, mulberry, shade, outline } from './px.js';
import { bakeShadow } from './art.js';

export const TS = 16;
export const D = {
  earth: { base: '#6b5237', lite: '#7d6244', dark: '#584330', deep: '#3f3023' },
  rock: { top: '#3a3140', topL: '#4a4052', face: '#5f5468', faceL: '#7a6e84', faceD: '#2b2430', crack: '#221c28' },
  soft: { base: '#8a6a3f', lite: '#a4834f', dark: '#6e5330', pebble: '#c9a56a' },
  pit: { rim: '#3a2c22', deep: '#0c0a10', mid: '#1c1620' },
  bone: '#e6dcc4', boneD: '#b9ae95', wood: '#7a5230', woodL: '#a6733f', woodD: '#4f3320', iron: '#6a6a78', ironL: '#9a9aa8',
  gold: '#f4d35e', goldD: '#c9a227', fire: ['#ffd36b', '#ff8c3a', '#e04a2a'], amber: '#ffb347',
};

export function bakeEarth(seed) {
  const rnd = mulberry(seed); const [c, g] = canvas(TS, TS); const E = D.earth;
  for (let y = 0; y < TS; y++) for (let x = 0; x < TS; x++) { const r = rnd(); px(g, x, y, r < 0.07 ? E.lite : r < 0.15 ? E.dark : E.base); }
  for (let i = 0; i < 2; i++) { const x = Math.floor(rnd() * 14), y = Math.floor(rnd() * 14); px(g, x, y, E.deep); px(g, x + 1, y, E.dark); }
  if (rnd() < 0.3) { const x = 2 + Math.floor(rnd() * 10), y = 2 + Math.floor(rnd() * 10); px(g, x, y, E.lite); px(g, x + 1, y + 1, E.lite); }
  return c;
}
// mask bits: 1 floor N, 2 floor E, 4 floor S, 8 floor W  (a "floor" neighbour is anything not wall)
export function bakeWallTile(seed, mask) {
  const rnd = mulberry(seed); const [c, g] = canvas(TS, TS); const R = D.rock;
  for (let y = 0; y < TS; y++) for (let x = 0; x < TS; x++) { const r = rnd(); px(g, x, y, r < 0.1 ? R.topL : R.top); }
  // stone blocks on the top
  for (let j = 0; j < 2; j++) for (let i = 0; i < 2; i++) { const bx = i * 8 + ((j & 1) ? 4 : 0), by = j * 8; rect(g, bx + 1, by + 1, 6, 6, R.topL); rect(g, bx + 1, by + 6, 6, 1, R.crack); rect(g, bx + 6, by + 1, 1, 6, R.crack); if (rnd() < 0.4) px(g, bx + 2 + Math.floor(rnd() * 3), by + 2 + Math.floor(rnd() * 3), R.top); }
  if (mask & 4) { // the lit face: floor to the south
    rect(g, 0, 8, TS, 8, R.face);
    for (let y = 9; y < 16; y += 3) { rect(g, 0, y, TS, 1, R.faceD); const off = ((y / 3) & 1) * 4; for (let x = off; x < TS; x += 8) rect(g, x, y + 1, 1, 2, R.faceD); }
    rect(g, 0, 8, TS, 1, R.faceL); rect(g, 0, 15, TS, 1, R.faceD);
    for (let i = 0; i < 3; i++) px(g, Math.floor(rnd() * 16), 10 + Math.floor(rnd() * 5), R.faceL);
  }
  if (mask & 1) rect(g, 0, 0, TS, 1, R.faceD);
  if (mask & 8) rect(g, 0, 0, 1, TS, R.faceD);
  if (mask & 2) rect(g, TS - 1, 0, 1, TS, R.faceD);
  return c;
}
export function bakeSoft(seed) {
  const rnd = mulberry(seed); const [c, g] = canvas(TS, TS); const S = D.soft;
  for (let y = 0; y < TS; y++) for (let x = 0; x < TS; x++) { const r = rnd(); px(g, x, y, r < 0.12 ? S.lite : r < 0.24 ? S.dark : S.base); }
  for (let i = 0; i < 5; i++) { const x = 1 + Math.floor(rnd() * 13), y = 1 + Math.floor(rnd() * 13); px(g, x, y, S.pebble); px(g, x + 1, y, S.dark); }
  // a crumbly seam so it reads as diggable, not as floor
  for (let i = 0; i < 3; i++) { const x = Math.floor(rnd() * 12), y = 2 + Math.floor(rnd() * 11); line(g, x, y, x + 3, y + 1, S.dark); }
  rect(g, 0, 0, TS, 1, shade(S.base, -0.2)); rect(g, 0, 0, 1, TS, shade(S.base, -0.2));
  return c;
}
export function bakeMound() {
  const [c, g] = canvas(TS, TS); const S = D.soft;
  ellipse(g, 8, 10, 7, 5, S.base); ellipse(g, 7, 9, 5, 3, S.lite); ellipse(g, 8, 12, 6, 2, S.dark);
  px(g, 5, 8, S.pebble); px(g, 10, 9, S.pebble); px(g, 8, 6, S.pebble);
  // a glint of what is under it — the thing the wood kept
  px(g, 9, 11, D.gold); px(g, 10, 11, D.goldD);
  outline(c, D.earth.deep);
  return c;
}
export function bakePit(mask) {
  const [c, g] = canvas(TS, TS); const P = D.pit;
  for (let y = 0; y < TS; y++) for (let x = 0; x < TS; x++) px(g, x, y, P.deep);
  // rim on the sides that meet floor; the north rim is deeper (you look into it)
  if (mask & 1) { rect(g, 0, 0, TS, 3, P.rim); rect(g, 0, 3, TS, 2, P.mid); }
  if (mask & 4) rect(g, 0, TS - 2, TS, 2, P.rim);
  if (mask & 8) rect(g, 0, 0, 2, TS, P.rim);
  if (mask & 2) rect(g, TS - 2, 0, 2, TS, P.rim);
  return c;
}
export function bakeGate() { // portcullis over a sealed door cell
  const [c, g] = canvas(TS, TS);
  for (let x = 1; x < TS; x += 4) rect(g, x, 0, 2, TS, D.iron), px(g, x, 2, D.ironL), px(g, x, 9, D.ironL);
  rect(g, 0, 3, TS, 2, D.iron); rect(g, 0, 11, TS, 2, D.iron); rect(g, 0, 3, TS, 1, D.ironL);
  return c;
}
export function bakeLock() {
  const [c, g] = canvas(TS, TS);
  rect(g, 1, 0, 14, 16, D.wood); rect(g, 2, 0, 12, 16, D.woodL); rect(g, 8, 0, 1, 16, D.woodD);
  rect(g, 1, 4, 14, 2, D.iron); rect(g, 1, 11, 14, 2, D.iron);
  rect(g, 5, 6, 6, 5, D.gold); rect(g, 7, 8, 2, 2, D.woodD); px(g, 5, 6, D.goldD); px(g, 10, 10, D.goldD);
  outline(c, D.earth.deep);
  return c;
}
export function bakeChest(open) {
  const [c, g] = canvas(18, 16);
  rect(g, 2, 6, 14, 8, D.wood); rect(g, 2, 6, 14, 1, D.woodL); rect(g, 2, 13, 14, 1, D.woodD);
  rect(g, 2, 9, 14, 1, D.iron); rect(g, 4, 6, 1, 8, D.iron); rect(g, 13, 6, 1, 8, D.iron);
  if (!open) { rect(g, 2, 3, 14, 4, D.woodL); rect(g, 2, 3, 14, 1, D.woodD); rect(g, 8, 6, 2, 3, D.gold); }
  else { rect(g, 2, 1, 14, 3, D.woodD); rect(g, 2, 1, 14, 1, D.woodL); rect(g, 4, 5, 10, 2, '#1a1220'); px(g, 8, 5, D.gold); }
  outline(c, D.earth.deep);
  return { canvas: c, ax: 9, ay: 15 };
}
export function bakeBrazier(frame) {
  const [c, g] = canvas(16, 26);
  rect(g, 4, 20, 8, 3, D.iron); rect(g, 6, 16, 4, 5, D.iron); rect(g, 3, 12, 10, 5, D.iron); rect(g, 3, 12, 10, 1, D.ironL); rect(g, 2, 22, 12, 2, D.ironL);
  const rnd = mulberry(40 + frame); const F = D.fire;
  ellipse(g, 8, 11, 4, 2, F[2]);
  for (let i = 0; i < 3; i++) { const h = 4 + Math.floor(rnd() * 4), x = 5 + i * 3; rect(g, x, 12 - h, 2, h, F[2 - Math.min(2, i)]); px(g, x, 12 - h - 1 - (frame & 1), F[0]); }
  rect(g, 6, 7 + (frame & 1), 4, 3, F[1]); rect(g, 7, 9, 2, 2, F[0]);
  outline(c, D.earth.deep);
  return { canvas: c, ax: 8, ay: 24 };
}
export function bakeBones(seed) {
  const rnd = mulberry(seed); const [c, g] = canvas(16, 10);
  line(g, 2, 6, 11, 4, D.bone); px(g, 1, 5, D.bone); px(g, 1, 7, D.bone); px(g, 12, 3, D.bone); px(g, 12, 5, D.bone);
  if (rnd() < 0.6) { circle(g, 10 + Math.floor(rnd() * 3), 7, 2.2, D.bone); px(g, 10, 7, D.boneD); px(g, 12, 7, D.boneD); }
  if (rnd() < 0.5) line(g, 3, 8, 8, 9, D.boneD);
  return { canvas: c, ax: 8, ay: 9 };
}
export function bakeRock(seed) {
  const rnd = mulberry(seed); const [c, g] = canvas(18, 16); const R = D.rock;
  const w = 6 + Math.floor(rnd() * 2);
  ellipse(g, 9, 9, w, 5, R.face); ellipse(g, 8, 7, w - 1, 3.5, R.faceL); ellipse(g, 9, 12, w, 2, R.faceD);
  px(g, 5, 6, R.top); px(g, 11, 8, R.top); px(g, 7, 10, R.faceD);
  outline(c, D.earth.deep);
  return { canvas: c, ax: 9, ay: 14 };
}
export function bakeStairs() {
  const [c, g] = canvas(16, 16);
  for (let i = 0; i < 4; i++) { rect(g, 2, 2 + i * 3, 12, 3, shade(D.rock.face, -0.1 * i)); rect(g, 2, 2 + i * 3, 12, 1, D.rock.faceL); }
  rect(g, 1, 1, 14, 1, D.rock.faceD); rect(g, 1, 1, 1, 14, D.rock.faceD); rect(g, 14, 1, 1, 14, D.rock.faceD);
  return c;
}
export function bakeHeart(frame) {
  const [c, g] = canvas(9, 9);
  const col = frame ? '#ff8a7a' : '#e0433a';
  rect(g, 1, 2, 3, 2, col); rect(g, 5, 2, 3, 2, col); rect(g, 0, 3, 9, 2, col); rect(g, 1, 5, 7, 1, col); rect(g, 2, 6, 5, 1, col); rect(g, 3, 7, 3, 1, col); rect(g, 4, 8, 1, 1, col);
  px(g, 2, 3, '#ffd2cc');
  outline(c, '#3a1020');
  return c;
}
export function bakeCoin(frame) {
  const [c, g] = canvas(8, 8);
  const w = [3, 2, 1, 2][frame];
  ellipse(g, 4, 4, w, 3, D.gold); if (w > 1) px(g, 4 - (w > 2 ? 1 : 0), 3, '#fff2b0'); if (w === 3) px(g, 5, 5, D.goldD);
  outline(c, '#4a3a10');
  return c;
}
export function bakeKey() {
  const [c, g] = canvas(12, 8);
  circle(g, 3, 4, 2.4, D.gold); px(g, 3, 4, D.earth.deep); rect(g, 5, 4, 6, 1, D.gold); px(g, 8, 5, D.gold); px(g, 10, 5, D.gold); px(g, 10, 6, D.gold);
  outline(c, '#4a3a10');
  return c;
}
export function bakeCharmIcon(col) {
  const [c, g] = canvas(10, 10);
  circle(g, 5, 5, 4, col); circle(g, 5, 5, 2.2, shade(col, -0.35)); px(g, 4, 3, '#fff'); rect(g, 4, 0, 2, 2, D.iron);
  outline(c, '#1b1626');
  return c;
}
export function bakeClawIcon() {
  const [c, g] = canvas(12, 12);
  for (let i = 0; i < 3; i++) { line(g, 2 + i * 3, 10, 3 + i * 3, 3, D.bone); px(g, 3 + i * 3, 2, D.boneD); }
  rect(g, 1, 9, 10, 2, D.rock.faceD);
  outline(c, '#1b1626');
  return c;
}
export function bakeMarker(r, col) { // a ring on the floor: "it lands HERE" (rule C3)
  const [c, g] = canvas(r * 2 + 2, r + 4);
  ellipse(g, r + 1, r / 2 + 2, r, r / 2, col); ellipse(g, r + 1, r / 2 + 2, r - 2, r / 2 - 1.5, 'rgba(0,0,0,0)');
  const gg = c.getContext('2d'); gg.globalCompositeOperation = 'destination-out'; gg.fillStyle = '#000';
  for (let y = 0; y < c.height; y++) for (let x = 0; x < c.width; x++) { const dx = (x + 0.5 - r - 1) / (r - 2), dy = (y + 0.5 - r / 2 - 2) / (r / 2 - 1.5); if (dx * dx + dy * dy <= 1) gg.fillRect(x, y, 1, 1); }
  gg.globalCompositeOperation = 'source-over';
  return { canvas: c, ax: r + 1, ay: r / 2 + 2 };
}
export function bakeFallingRock() {
  const [c, g] = canvas(12, 12); const R = D.rock;
  circle(g, 6, 6, 5, R.face); circle(g, 5, 5, 3, R.faceL); px(g, 8, 8, R.faceD); px(g, 4, 8, R.faceD);
  outline(c, D.earth.deep);
  return c;
}
export function bakeMouth() { // the warren mouth: a dark hole under roots, 2 tiles wide
  const [c, g] = canvas(40, 30);
  ellipse(g, 20, 22, 17, 8, D.earth.deep); ellipse(g, 20, 21, 13, 6, '#050408');
  for (let i = 0; i < 6; i++) { const x = 4 + i * 6; line(g, x, 4, x + 3, 14, D.wood, 2); line(g, x + 3, 14, x + 1, 20, D.woodD, 2); }
  rect(g, 2, 2, 36, 4, '#2f5a27'); rect(g, 0, 0, 40, 3, '#3d7a30');
  return { canvas: c, ax: 20, ay: 30 };
}
export const shadowSmall = () => bakeShadow(6, 2);
export const shadowBig = () => bakeShadow(11, 4);

// ---- the mere ----
export function bakeDeep(waterTile, frame) { // deep water: the stream's tile, drowned in shadow, with a slow gleam
  const [c, g] = canvas(TS, TS); g.drawImage(waterTile, 0, 0);
  g.fillStyle = 'rgba(6,10,40,0.55)'; g.fillRect(0, 0, TS, TS);
  const rnd = mulberry(900 + frame); for (let i = 0; i < 2; i++) { const x = (Math.floor(rnd() * 12) + frame * 3) % 14, y = 2 + Math.floor(rnd() * 11); px(g, x, y, '#5d9be0'); px(g, x + 1, y, '#3a78c9'); }
  return c;
}
export function bakeRipple(frame) { const r = 9 + frame * 2; const [c, g] = canvas(r * 2 + 2, r + 2); ellipse(g, r + 1, r / 2 + 1, r, r / 2, 'rgba(214,236,248,0.55)'); ellipse(g, r + 1, r / 2 + 1, r - 1.5, r / 2 - 1, 'rgba(0,0,0,0)'); const gg = c.getContext('2d'); gg.globalCompositeOperation = 'destination-out'; gg.fillStyle = '#000'; for (let y = 0; y < c.height; y++) for (let x = 0; x < c.width; x++) { const dx = (x + 0.5 - r - 1) / (r - 1.5), dy = (y + 0.5 - r / 2 - 1) / (r / 2 - 1); if (dx * dx + dy * dy <= 1) gg.fillRect(x, y, 1, 1); } gg.globalCompositeOperation = 'source-over'; return { canvas: c, ax: r + 1, ay: r / 2 + 1 }; }
export function bakeSpout(frame) { // a column of water thrown up from below
  const h = 28 + frame * 6; const [c, g] = canvas(14, h); const rnd = mulberry(70 + frame);
  for (let y = 0; y < h; y++) { const w = 3 + Math.round(Math.sin(y * 0.4 + frame) * 1.5) + (y < 4 ? 3 : 0); rect(g, 7 - w, y, w * 2, 1, y % 3 === 0 ? '#d6ecf8' : '#5d9be0'); }
  for (let i = 0; i < 6; i++) px(g, Math.floor(rnd() * 14), Math.floor(rnd() * 6), '#d6ecf8');
  return { canvas: c, ax: 7, ay: h };
}
export function bakeCulvert(open) { // a stone arch in the stream bank with an iron grate; open = the grate is up
  const [c, g] = canvas(34, 26);
  rect(g, 0, 8, 34, 18, D.rock.face); for (let y = 10; y < 26; y += 4) { rect(g, 0, y, 34, 1, D.rock.faceD); for (let x = ((y / 4) & 1) * 4; x < 34; x += 8) rect(g, x, y + 1, 1, 3, D.rock.faceD); }
  for (let y = 0; y < 8; y++) { const w = Math.round(Math.sqrt(64 - (8 - y) * (8 - y)) * 1.6); rect(g, 17 - w, y + 2, w * 2, 1, D.rock.faceL); }
  ellipse(g, 17, 16, 10, 8, '#050408');
  if (!open) for (let x = 9; x <= 25; x += 4) rect(g, x, 8, 2, 16, D.iron); else { rect(g, 7, 6, 20, 3, D.iron); for (let x = 9; x <= 25; x += 4) rect(g, x, 6, 2, 3, D.ironL); }
  rect(g, 0, 8, 34, 1, D.rock.faceL); rect(g, 0, 0, 34, 2, '#3d7a30'); rect(g, 0, 2, 34, 1, '#2f5a27');
  return { canvas: c, ax: 17, ay: 26 };
}
