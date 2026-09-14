// chars.js — the hero, the sword, and every creature in the warren. Baked once; at this size a creature IS its
// silhouette, so every body is a different shape before it is a different colour.
import { canvas, px, rect, circle, ellipse, line, mulberry, shade, outline, flipX, fromGrid } from './px.js';
import { bakeCharacter } from './npc_chars.js';

export const HERO_LOOK = { hair: '#5a3a22', skin: '#f2c9a0', tunic: '#7a5a3a', pants: '#3a3a44', boots: '#2a1f18', accent: '#c9a227' };
export function bakeHero() { return bakeCharacter(HERO_LOOK); }
export { bakeCharacter };

// ---- the sword, at 16 angles. Anchor = the hand (0,0 at canvas centre). ----
export function bakeSwords() {
  const out = [];
  for (let i = 0; i < 16; i++) {
    const th = i * Math.PI / 8; const [c, g] = canvas(36, 36); const cx = 18, cy = 18;
    const ex = cx + Math.cos(th) * 15, ey = cy + Math.sin(th) * 15;
    line(g, cx, cy, ex, ey, '#d8dce6', 2); line(g, cx + Math.cos(th) * 3, cy + Math.sin(th) * 3, cx + Math.cos(th) * 13, cy + Math.sin(th) * 13, '#f7f9ff', 1);
    const px_ = -Math.sin(th), py_ = Math.cos(th);
    line(g, cx + px_ * 3 + Math.cos(th) * 2, cy + py_ * 3 + Math.sin(th) * 2, cx - px_ * 3 + Math.cos(th) * 2, cy - py_ * 3 + Math.sin(th) * 2, '#c9a227', 2);
    line(g, cx, cy, cx - Math.cos(th) * 3, cy - Math.sin(th) * 3, '#5a3a22', 2);
    outline(c, '#1b1626');
    out.push({ canvas: c, ax: 18, ay: 18 });
  }
  return out;
}
export function bakeShield() { // held in front; drawn by facing
  const [c, g] = canvas(12, 12);
  circle(g, 6, 6, 5, '#7a5230'); circle(g, 6, 6, 3.5, '#a6733f'); circle(g, 6, 6, 1.5, '#9a9aa8'); px(g, 3, 4, '#c9a56a');
  outline(c, '#1b1626');
  return c;
}
export function bakeClawHand() { // the Digger's claw on the hero's arm, when digging
  const [c, g] = canvas(12, 10);
  rect(g, 0, 3, 5, 4, '#3a2a2a');
  for (let i = 0; i < 3; i++) line(g, 5, 3 + i * 2, 11, 1 + i * 3, '#e6dcc4', 1);
  outline(c, '#1b1626');
  return c;
}

// ---- creatures -------------------------------------------------------------------------------
// bake(facing, frame) draws with feet at (cx, base). frames: 0 idle, 1 walk, 2 windup, 3 attack, 4 hurt.
function frames(w, h, draw, facings = ['down', 'up', 'side']) {
  const out = {};
  for (const f of facings) {
    out[f] = [];
    for (let fr = 0; fr < 5; fr++) {
      const [c, g] = canvas(w, h);
      draw(g, w / 2, h - 2, f, fr);
      outline(c, '#1b1626');
      out[f].push({ canvas: c, ax: w / 2, ay: h - 2 });
    }
  }
  if (out.side) { out.right = out.side; out.left = out.side.map(f => ({ ...f, canvas: flipX(f.canvas) })); delete out.side; }
  return out;
}
const lean = (fr, f) => { // windup rears back, attack lunges forward (in screen space of the facing)
  const d = fr === 2 ? -2 : fr === 3 ? 3 : 0;
  return f === 'down' ? [0, d] : f === 'up' ? [0, -d] : [d, 0];
};

export function bakeImp() { // a round bramble with legs and two red eyes
  return frames(20, 20, (g, cx, base, f, fr) => {
    const [lx, ly] = lean(fr, f); const bob = fr === 1 ? 1 : 0; cx += lx; base += ly;
    const rnd = mulberry(7);
    rect(g, cx - 4, base - 4 + bob, 2, 4, '#3a2a1a'); rect(g, cx + 2, base - 4 - bob, 2, 4, '#3a2a1a');
    const cy = base - 10 + (fr === 2 ? 1 : 0);
    circle(g, cx, cy, 6, '#3f7a2c'); circle(g, cx - 1, cy - 1, 4, '#5a9a3a');
    for (let i = 0; i < 9; i++) { const a = i / 9 * Math.PI * 2 + rnd(); const x = cx + Math.cos(a) * 6.5, y = cy + Math.sin(a) * 6.5; px(g, x, y, '#2b5a20'); px(g, x + Math.cos(a) * 1.4, y + Math.sin(a) * 1.4, '#7a4a2a'); }
    if (fr === 2 || fr === 3) for (let i = 0; i < 4; i++) { const a = i / 4 * Math.PI * 2 + 0.4; px(g, cx + Math.cos(a) * 8, cy + Math.sin(a) * 8, '#c94a2a'); }
    if (f !== 'up') { const ex = f === 'down' ? 0 : 2; px(g, cx - 2 + ex, cy, '#ff5a3a'); px(g, cx + 2 + ex, cy, '#ff5a3a'); if (fr >= 2) { px(g, cx - 2 + ex, cy - 1, '#ffb0a0'); px(g, cx + 2 + ex, cy - 1, '#ffb0a0'); } }
  });
}
export function bakeRat() { // low, long, a tail; the side view is the long one
  return frames(22, 14, (g, cx, base, f, fr) => {
    const [lx, ly] = lean(fr, f); const bob = fr === 1 ? 1 : 0; cx += lx; base += ly;
    const fur = '#6e5a4a', furL = '#8a7562', furD = '#4f4034';
    if (f === 'side') {
      ellipse(g, cx + 1, base - 4 - bob, 8, 4, fur); ellipse(g, cx + 1, base - 5 - bob, 6, 2.5, furL);
      circle(g, cx + 8, base - 5 - bob, 3, fur); px(g, cx + 10, base - 6 - bob, '#1b1626'); px(g, cx + 11, base - 4 - bob, '#e8a0a0');
      px(g, cx + 7, base - 8 - bob, furD); px(g, cx + 8, base - 9 - bob, furD);
      line(g, cx - 7, base - 4, cx - 12, base - 8 + (fr === 1 ? 2 : 0), '#d8a090', 1);
      rect(g, cx - 3, base - 1, 2, 2, furD); rect(g, cx + 4, base - 1 + (fr === 1 ? -1 : 0), 2, 2, furD);
      if (fr === 3) { px(g, cx + 12, base - 4, '#fff'); px(g, cx + 12, base - 3, '#fff'); }
    } else {
      ellipse(g, cx, base - 5 - bob, 5, 6, fur); ellipse(g, cx, base - 6 - bob, 3.5, 4, furL);
      if (f === 'down') { circle(g, cx, base - 2, 3.2, fur); px(g, cx - 2, base - 3, '#1b1626'); px(g, cx + 2, base - 3, '#1b1626'); px(g, cx, base - 1, '#e8a0a0'); px(g, cx - 4, base - 5, furD); px(g, cx + 4, base - 5, furD); if (fr === 3) { px(g, cx - 1, base, '#fff'); px(g, cx + 1, base, '#fff'); } line(g, cx, base - 10, cx + 3, base - 14, '#d8a090', 1); }
      else { circle(g, cx, base - 10, 3, fur); px(g, cx - 3, base - 12, furD); px(g, cx + 3, base - 12, furD); line(g, cx, base - 1, cx - 3, base + 1, '#d8a090', 1); }
      rect(g, cx - 4, base - 1, 2, 2, furD); rect(g, cx + 2, base - 1, 2, 2, furD);
    }
  });
}
export function bakeArcher() { // a tall twig-man with a leaf cap and a bow
  return frames(22, 26, (g, cx, base, f, fr) => {
    const [lx, ly] = lean(fr, f); const bob = fr === 1 ? 1 : 0; cx += lx; base += ly;
    const bark = '#6a4a2a', barkL = '#8a6a3a', leaf = '#4a8a3a';
    rect(g, cx - 2, base - 8, 1, 8, bark); rect(g, cx + 1, base - 8 - bob, 1, 8 + bob, bark);
    rect(g, cx - 3, base - 18, 6, 10, bark); rect(g, cx - 2, base - 17, 2, 8, barkL);
    circle(g, cx, base - 20, 3, barkL); circle(g, cx, base - 22, 3.5, leaf); px(g, cx - 3, base - 21, '#2f6a27'); px(g, cx + 2, base - 24, '#6ab04c');
    if (f !== 'up') { const ex = f === 'down' ? 0 : 1; px(g, cx - 1 + ex, base - 20, '#ffd36b'); px(g, cx + 1 + ex, base - 20, '#ffd36b'); }
    // the bow, held toward the facing; drawn back on the windup
    const bowX = f === 'side' ? cx + 5 : f === 'down' ? cx + 5 : cx - 5, bowY = base - 14;
    const draw = fr === 2 ? 3 : fr === 3 ? 0 : 1;
    for (let y = -6; y <= 6; y++) { const bx = bowX + Math.round(Math.sqrt(36 - y * y) * 0.5 * (f === 'up' ? -1 : 1)); px(g, bx, bowY + y, '#a6733f'); }
    line(g, bowX, bowY - 6, bowX - draw * (f === 'up' ? -1 : 1), bowY, '#e6dcc4'); line(g, bowX - draw * (f === 'up' ? -1 : 1), bowY, bowX, bowY + 6, '#e6dcc4');
    if (fr === 2) line(g, bowX - 3, bowY, bowX + 5, bowY, '#c9a56a');
  });
}
export function bakeWarden() { // broad, a round shield, a club; the shield is on the facing side
  return frames(26, 24, (g, cx, base, f, fr) => {
    const [lx, ly] = lean(fr, f); const bob = fr === 1 ? 1 : 0; cx += lx; base += ly;
    const fur = '#5a5a66', furL = '#7c7c8a', furD = '#3a3a44';
    rect(g, cx - 5, base - 5, 3, 5, furD); rect(g, cx + 2, base - 5 - bob, 3, 5 + bob, furD);
    ellipse(g, cx, base - 11, 8, 7, fur); ellipse(g, cx - 1, base - 12, 6, 5, furL);
    circle(g, cx, base - 18, 4.5, fur);
    if (f !== 'up') { rect(g, cx - 1, base - 22, 2, 8, '#e6dcc4'); px(g, cx - 3, base - 19, '#1b1626'); px(g, cx + 2, base - 19, '#1b1626'); }
    else rect(g, cx - 1, base - 22, 2, 6, '#e6dcc4');
    // shield
    const sx = f === 'side' ? cx + 8 : f === 'down' ? cx - 6 : cx + 6, sy = f === 'down' ? base - 9 : base - 12;
    if (f !== 'up') { circle(g, sx, sy, 5, '#7a5230'); circle(g, sx, sy, 3.5, '#a6733f'); circle(g, sx, sy, 1.5, '#9a9aa8'); }
    // club, raised on the windup
    const kx = f === 'side' ? cx - 5 : cx + 7, ky = fr === 2 ? base - 24 : fr === 3 ? base - 6 : base - 16;
    line(g, kx, ky + 6, kx + (fr === 3 ? 4 : 1), ky, '#7a5230', 2); circle(g, kx + (fr === 3 ? 4 : 1), ky, 2.5, '#5a3a22');
  });
}
export function bakeArrow() {
  const out = [];
  for (let i = 0; i < 8; i++) { const th = i * Math.PI / 4; const [c, g] = canvas(14, 14); line(g, 7 - Math.cos(th) * 6, 7 - Math.sin(th) * 6, 7 + Math.cos(th) * 6, 7 + Math.sin(th) * 6, '#a6733f', 1); px(g, 7 + Math.cos(th) * 6, 7 + Math.sin(th) * 6, '#d8dce6'); px(g, 7 - Math.cos(th) * 6, 7 - Math.sin(th) * 6, '#e6dcc4'); out.push(c); }
  return out;
}
export function bakeClod() { const [c, g] = canvas(8, 8); circle(g, 4, 4, 3, '#6e5330'); px(g, 3, 3, '#a4834f'); outline(c, '#1b1626'); return c; }

// a tinted silhouette of any sprite (for the tell rim and the hit flash) — pre-baked on its own canvas so the
// composite never paints the scene behind it
const silCache = new Map();
export function silhouette(c, col) {
  const key = col; let m = silCache.get(c); if (!m) { m = new Map(); silCache.set(c, m); }
  let s = m.get(key); if (s) return s;
  const [o, g] = canvas(c.width, c.height); g.drawImage(c, 0, 0); g.globalCompositeOperation = 'source-atop'; g.fillStyle = col; g.fillRect(0, 0, c.width, c.height);
  m.set(key, o); return o;
}

// ---- the mere's creatures ----
export function bakeNewt() { // a fat-tailed mere newt, orange belly, it lunges out of the water
  return frames(22, 14, (g, cx, base, f, fr) => {
    const [lx, ly] = lean(fr, f); const bob = fr === 1 ? 1 : 0; cx += lx; base += ly;
    const sk = '#3a5a3a', skL = '#5a8a4a', belly = '#e0883a';
    if (f === 'side') {
      ellipse(g, cx, base - 4 - bob, 8, 3.5, sk); ellipse(g, cx - 1, base - 5 - bob, 5, 2, skL); rect(g, cx - 5, base - 2, 10, 1, belly);
      circle(g, cx + 8, base - 5 - bob, 3, sk); px(g, cx + 9, base - 6 - bob, '#ffd36b'); px(g, cx + 11, base - 4 - bob, skL);
      line(g, cx - 7, base - 4, cx - 13, base - 6 + (fr === 1 ? 2 : 0), sk, 2);
      rect(g, cx - 4, base - 1, 2, 2, sk); rect(g, cx + 3, base - 1 + (fr === 1 ? -1 : 0), 2, 2, sk);
      if (fr === 3) { px(g, cx + 12, base - 5, '#fff'); }
    } else {
      ellipse(g, cx, base - 5 - bob, 5, 6, sk); ellipse(g, cx, base - 6 - bob, 3, 4, skL);
      if (f === 'down') { circle(g, cx, base - 2, 3.2, sk); px(g, cx - 2, base - 3, '#ffd36b'); px(g, cx + 2, base - 3, '#ffd36b'); rect(g, cx - 1, base - 1, 2, 1, belly); line(g, cx, base - 10, cx + 4, base - 14, sk, 2); }
      else { circle(g, cx, base - 10, 3, sk); line(g, cx, base - 1, cx - 4, base + 1, sk, 2); }
      rect(g, cx - 5, base - 2, 2, 2, sk); rect(g, cx + 3, base - 2, 2, 2, sk);
    }
    for (let i = 0; i < 3; i++) px(g, cx - 4 + i * 4, base - 8 - bob, '#e0883a');
  });
}
export function bakeDrowned() { // a drowned man, swollen, weed in the hair; slow, it GRABS
  return frames(24, 28, (g, cx, base, f, fr) => {
    const [lx, ly] = lean(fr, f); const bob = fr === 1 ? 1 : 0; cx += lx; base += ly;
    const sk = '#8aa0a8', skD = '#5a7078', cloth = '#3a4a5a', weed = '#2f6a27';
    rect(g, cx - 5, base - 7, 4, 7, cloth); rect(g, cx + 1, base - 7 - bob, 4, 7 + bob, cloth);
    ellipse(g, cx, base - 14, 8, 8, sk); ellipse(g, cx - 1, base - 15, 5, 5, '#9ab0b8'); rect(g, cx - 8, base - 12, 16, 4, cloth);
    circle(g, cx, base - 23, 5, sk); for (let i = -4; i <= 4; i += 2) line(g, cx + i, base - 27, cx + i + (i & 2 ? 1 : -1), base - 30, weed);
    if (f !== 'up') { px(g, cx - 2, base - 24, '#1b1626'); px(g, cx + 2, base - 24, '#1b1626'); rect(g, cx - 2, base - 21, 4, 1, skD); }
    const reach = fr === 2 ? -4 : fr === 3 ? 6 : 0;
    const ax = f === 'side' ? cx + 6 + reach : f === 'down' ? cx : cx; const ay = f === 'down' ? base - 8 + reach : base - 12;
    if (f === 'side') { rect(g, ax, ay - 2, 6, 3, sk); rect(g, ax + 5, ay - 3, 2, 5, skD); }
    else { rect(g, cx - 10 - (fr === 3 ? 2 : 0), ay, 4, 3, sk); rect(g, cx + 6 + (fr === 3 ? 2 : 0), ay, 4, 3, sk); }
  });
}
export function bakeEelwife() { // a great eel with a drowned woman's white mask. It COILS under the water.
  return frames(44, 30, (g, cx, base, f, fr) => {
    const [lx, ly] = lean(fr, f); const bob = fr === 1 ? 1 : 0; cx += lx; base += ly;
    const eel = '#2e4a44', eelL = '#4a7a68', mask = '#efe3c8';
    // the coils
    for (let i = 0; i < 3; i++) { const ox = f === 'side' ? -14 + i * 9 : -12 + i * 12, oy = f === 'side' ? 0 : (i & 1) * 3; ellipse(g, cx + ox, base - 8 - bob + oy, 8, 5, eel); ellipse(g, cx + ox - 1, base - 10 - bob + oy, 5, 2, eelL); }
    const hx = f === 'side' ? cx + 14 : cx, hy = f === 'up' ? base - 20 : base - 14 - (fr === 2 ? 3 : 0);
    ellipse(g, hx, hy, 7, 9, eel);
    if (f !== 'up') { ellipse(g, hx, hy + 1, 5, 6, mask); px(g, hx - 2, hy - 1, '#1b1626'); px(g, hx + 2, hy - 1, '#1b1626'); rect(g, hx - 1, hy + 3, 3, 1, '#8a3a3a'); if (fr >= 2) { px(g, hx - 2, hy - 1, '#ff5a3a'); px(g, hx + 2, hy - 1, '#ff5a3a'); } }
    line(g, hx - 6, hy - 8, hx - 9, hy - 2, eelL); line(g, hx + 6, hy - 8, hx + 9, hy - 2, eelL);
    if (fr === 3) for (let i = 0; i < 3; i++) px(g, hx + (f === 'side' ? 8 : -4 + i * 4), hy + (f === 'side' ? -4 + i * 4 : 8), '#d6ecf8');
  });
}
export function bakePike() { // THE OLD PIKE: long, armoured, a mouth like a trap. Fills the lane it swims in.
  return frames(64, 36, (g, cx, base, f, fr) => {
    const [lx, ly] = lean(fr, f); const bob = fr === 1 ? 1 : 0; cx += lx * 2; base += ly * 2;
    const sc = '#4a6a3a', scL = '#7a9a4a', scD = '#2a3a22', belly = '#c9c9a0', tooth = '#efe3c8';
    if (f === 'side') {
      ellipse(g, cx - 4, base - 12 - bob, 26, 8, sc); ellipse(g, cx - 4, base - 15 - bob, 20, 4, scL); ellipse(g, cx - 2, base - 8 - bob, 22, 3, belly);
      for (let i = -20; i <= 10; i += 5) rect(g, cx + i, base - 18 - bob, 2, 3, scD);
      line(g, cx - 30, base - 20, cx - 24, base - 12, sc, 3); line(g, cx - 30, base - 4, cx - 24, base - 12, sc, 3);
      ellipse(g, cx + 22, base - 12 - bob, 10, 6, sc); px(g, cx + 24, base - 15 - bob, fr >= 2 ? '#ff5a3a' : '#ffd36b');
      const gape = fr === 2 ? 5 : fr === 3 ? 7 : 1; line(g, cx + 26, base - 11, cx + 33, base - 11 - gape, sc, 2); line(g, cx + 26, base - 10, cx + 33, base - 10 + gape, sc, 2);
      for (let i = 0; i < 4; i++) { px(g, cx + 27 + i * 2, base - 11 - gape + Math.floor(i * gape / 4), tooth); px(g, cx + 27 + i * 2, base - 9 + gape - Math.floor(i * gape / 4), tooth); }
    } else {
      ellipse(g, cx, base - 14 - bob, 9, 16, sc); ellipse(g, cx - 1, base - 16 - bob, 5, 12, scL);
      for (let i = -12; i <= 8; i += 5) rect(g, cx - 1, base - 16 - bob + i, 3, 2, scD);
      const hy = f === 'up' ? base - 30 : base - 2;
      ellipse(g, cx, hy, 8, 6, sc);
      if (f === 'down') { px(g, cx - 4, hy - 3, fr >= 2 ? '#ff5a3a' : '#ffd36b'); px(g, cx + 4, hy - 3, fr >= 2 ? '#ff5a3a' : '#ffd36b'); const gape = fr === 2 ? 3 : fr === 3 ? 5 : 1; rect(g, cx - 6, hy, 12, gape, '#1b1626'); for (let i = 0; i < 5; i++) { px(g, cx - 5 + i * 2 + (i & 1), hy, tooth); px(g, cx - 5 + i * 2, hy + gape - 1, tooth); } }
      line(g, cx - 9, base - 24, cx - 13, base - 30, sc, 2); line(g, cx + 9, base - 24, cx + 13, base - 30, sc, 2);
    }
  });
}

// ---- hand-pixelled Brock and Digger: text grids, mirrored halves for the front and back views ----
const mir = half => half + half.split('').reverse().join('');
function gridBeast(rowsDown, rowsSide, pal, palAngry, w, h) {
  const bakeRows = (rows, p) => outline(fromGrid(rows, p, 1));
  const down = bakeRows(rowsDown, pal), downA = bakeRows(rowsDown, palAngry), side = bakeRows(rowsSide, pal), sideA = bakeRows(rowsSide, palAngry);
  const up = bakeRows(rowsDown.map(r => r.replace(/[ekpwm]/g, ch => ch === 'w' ? 'w' : ch === 'k' ? 'g' : ch === 'p' ? 'g' : ch === 'e' ? 'g' : 'g')), pal);
  const mk = (base, angry, f) => [0, 1, 2, 3, 4].map(fr => {
    const src = fr === 2 || fr === 3 ? angry : base; const [c, g] = canvas(w, h);
    const [lx, ly] = lean(fr, f); const bob = fr === 1 ? -1 : 0;
    g.drawImage(src, Math.round((w - src.width) / 2 + lx), Math.round(h - 2 - src.height + ly + bob));
    return { canvas: c, ax: w / 2, ay: h - 2 };
  });
  const out = { down: mk(down, downA, 'down'), up: mk(up, up, 'up'), right: mk(side, sideA, 'side') };
  out.left = out.right.map(f => ({ ...f, canvas: flipX(f.canvas) }));
  return out;
}
// keys: g grey fur, G dark fur, l light fur, w white, k black, p pink nose, e eye, c claw, o outline-dark
const BROCK_PAL = { g: '#5a5a66', G: '#3a3a44', l: '#7c7c8a', w: '#e6e6ea', k: '#1e1e26', p: '#e8a0a0', e: '#ffd36b', c: '#e6dcc4', o: '#2a2a30' };
const BROCK_ANGRY = { ...BROCK_PAL, e: '#ff5a3a' };
const BROCK_DOWN = [
  mir('..........GGGGGGGGGGGG'), mir('.......GGGggggggggglll'), mir('.....GGggggggllllllllw'), mir('....GGgggggglllllllwww'),
  mir('...GGggggggllllllllwww'), mir('..GGgggggggllllllllwww'), mir('..Ggggggggggllllllllww'), mir('.GGgggggggggglllllllll'),
  mir('.GGggggggggggggllllllg'), mir('.GGgggggggggggggggggg.'), mir('.GGggggggggggggggggg..'), mir('..GGggggggggggggggg...'),
  mir('..GGGgggggggggggggg...'), mir('...GGGgggggggggggg....'), mir('....GGGggggggggggg....'), mir('.....GGGGgggggwwww....'),
  mir('......GGGggggwwwwk....'), mir('.......GGgggwwwwkke...'), mir('........Ggggwwwkkkkw..'), mir('........Ggggwwwkkkkw..'),
  mir('.........gggwwwwkkww..'), mir('.........gggwwwwwwww..'), mir('..........ggwwwwwwww..'), mir('..........gggwwwwwpp..'),
  mir('...........gggwwwwpp..'), mir('....GG......gggggg....'), mir('...GGcc......GGG......'), mir('..GGccc.......G.......'),
  mir('..Gcc.c...............'), mir('..cc.cc...............'),
];
const BROCK_SIDE = [
  '..................GGGGGGGGGGG.......', '..............GGGGgggggggggggGG.....', '...........GGGggggggggggggggggggG...', '.........GGgggggggggggggggggggggGG..',
  '.......GGgggglllllllllllllllgggggGG.', '......GGggglllllllllllllllllllgggGG.', '.....GGggglllllllllllllllllllllgggG.', '....GGgggglllllllllllllllllllllgggG.',
  '...GGgggggglllllllllllllllllllggggGG', '..GGggggggggllllllllllllllllggggggwG', '..GGggggggggggggggggggggggggggggwwww', '.GGggggggggggggggggggggggggggggwwkkw',
  '.GGgggggggggggggggggggggggggggwwkkew', '.GGgggggggggggggggggggggggggggwwkkkw', '.GGgggggggggggggggggggggggggggwwwkkw', '..GGggggggggggggggggggggggggggwwwwww',
  '..GGgggggggggggggggggggggggggwwwwwpp', '...GGGgggggggggggggggggggggggwwwwwpp', '....GGGgggggggggggggggggggggggwwww..', '.....GGGGGGGGgggggggggGGGGGgggggg...',
  '......GGGG..GGGGGGGG.....GGGGGG.....', '......GGG.....GGGG........GGGG......', '.....GGcc.....GGcc.......GGcc.......', '....GGccc....GGccc......GGccc.......',
  '....Gc.cc....Gc.cc......Gc.cc.......', '....cc..c....cc..c......cc..c.......',
];
export function bakeBrock() { return gridBeast(BROCK_DOWN, BROCK_SIDE, BROCK_PAL, BROCK_ANGRY, 56, 40); }
const DIG_PAL = { g: '#2e2634', G: '#1c1720', l: '#4a3d52', w: '#c9b9a0', k: '#3a3a44', p: '#e8a0b0', e: '#ffd36b', c: '#e6dcc4', o: '#141018' };
const DIG_ANGRY = { ...DIG_PAL, e: '#ff5a3a' };
const DIGGER_DOWN = [
  mir('........GGGGGGGGGG'), mir('......GGggggggllll'), mir('....GGggggggllllll'), mir('...GGgggggggllllll'), mir('..GGggggggggglllll'),
  mir('..GGggggggggggllll'), mir('.GGggggggggggggggg'), mir('.GGggggggggggggggg'), mir('.GGggggggggggggggg'), mir('..GGgggggggggggggg'),
  mir('..GGGggggggggggggg'), mir('...GGGgggggggggggg'), mir('....GGGGgggggggggg'), mir('......GGGggggggggg'), mir('.......GGgggggggge'),
  mir('........GGgggggggg'), mir('........GGGgggggpp'), mir('.........GGGgggppp'), mir('..cc......GGGGgppp'), mir('.cccc......GGGGGG.'),
  mir('.cwwcc.....GGGG...'), mir('.cwwwcc...........'), mir('.cwwwwc...........'), mir('..cwwwc...........'), mir('...cccc...........'), mir('....cc............'),
];
const DIGGER_SIDE = [
  '.............GGGGGGGGGGG........', '..........GGGgggggggggggGG......', '........GGgggglllllllllggggG....', '......GGggggllllllllllllggggG...',
  '.....GGgggglllllllllllllllgggG..', '....GGggggglllllllllllllllgggGG.', '...GGgggggggllllllllllllllggggG.', '..GGgggggggggggggggggggggggggggG',
  '..GGggggggggggggggggggggggggggggg', '.GGgggggggggggggggggggggggggggegg', '.GGggggggggggggggggggggggggggggpp', '.GGgggggggggggggggggggggggggggppp',
  '.GGggggggggggggggggggggggggggggpp', '..GGgggggggggggggggggggggggggggg.', '..GGGgggggggggggggggggggggggggg..', '...GGGggggggggggggggggggggGGGG...',
  '....GGGGGggggggggggggGGGGGG......', '......GGGGGGGGGGGGGGGGG..........', '........GGcc.......GGcc..........', '.......GGcwwc.....GGcwwc.........',
  '.......Gcwwwwc....Gcwwwwc........', '.......cwwwwwc....cwwwwwc........', '........cwwwc......cwwwc.........', '.........ccc........ccc..........',
];
export function bakeDigger() { return gridBeast(DIGGER_DOWN, DIGGER_SIDE, DIG_PAL, DIG_ANGRY, 40, 30); }
