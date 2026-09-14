// chars.js — the hero, the sword, and every creature in the warren. Baked once; at this size a creature IS its
// silhouette, so every body is a different shape before it is a different colour.
import { canvas, px, rect, circle, ellipse, line, mulberry, shade, outline, flipX } from './px.js';
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
export function bakeDigger() { // the mole reeve: dark velvet, pink snout, two pale claws bigger than its head
  return frames(40, 30, (g, cx, base, f, fr) => {
    const [lx, ly] = lean(fr, f); const bob = fr === 1 ? 1 : 0; cx += lx; base += ly;
    const vel = '#2e2634', velL = '#4a3d52', velD = '#1c1720';
    ellipse(g, cx, base - 10 - bob, 14, 9, vel); ellipse(g, cx - 2, base - 12 - bob, 10, 6, velL);
    if (f === 'up') { ellipse(g, cx, base - 18, 7, 4, vel); }
    else {
      const hx = f === 'side' ? cx + 11 : cx, hy = base - 8;
      ellipse(g, hx, hy, 7, 5, vel); circle(g, hx + (f === 'side' ? 6 : 0), hy + (f === 'side' ? 0 : 3), 2.5, '#e8a0b0');
      if (f === 'down') { px(g, hx - 3, hy - 1, '#3a3a44'); px(g, hx + 3, hy - 1, '#3a3a44'); }
    }
    const spread = fr === 2 ? 4 : fr === 3 ? -2 : 0;
    for (const s of [-1, 1]) {
      const px0 = cx + s * (11 + spread), py0 = base - 4 + (fr === 3 ? 2 : 0);
      ellipse(g, px0, py0, 5, 3, '#c9b9a0');
      for (let i = -1; i <= 1; i++) line(g, px0 + i * 3, py0 + 1, px0 + i * 3 + (fr === 3 ? s * 2 : 0), py0 + 6, '#e6dcc4', 2);
    }
    if (fr === 2) for (let i = 0; i < 5; i++) px(g, cx - 12 + i * 6, base + 1, '#8a6a3f');
    px(g, cx + (f === 'side' ? -13 : 0), base - 14, velD);
  });
}
export function bakeBrock() { // THE OLD BROCK: a badger the size of the door, striped face, claws
  return frames(56, 40, (g, cx, base, f, fr) => {
    const [lx, ly] = lean(fr, f); const bob = fr === 1 ? 1 : 0; cx += lx * 2; base += ly * 2;
    const fur = '#5a5a66', furL = '#7c7c8a', furD = '#3a3a44', white = '#e6e6ea', blk = '#1e1e26';
    rect(g, cx - 16, base - 8, 6, 8, furD); rect(g, cx + 10, base - 8 - bob, 6, 8 + bob, furD); rect(g, cx - 6, base - 6, 5, 6, furD); rect(g, cx + 2, base - 6 - bob, 5, 6 + bob, furD);
    ellipse(g, cx, base - 18 - bob, 22, 13, fur); ellipse(g, cx - 3, base - 21 - bob, 16, 8, furL);
    for (let i = 0; i < 3; i++) rect(g, cx - 18 + i * 12, base - 26 - bob, 6, 3, white);
    const hx = f === 'side' ? cx + 20 : cx, hy = f === 'up' ? base - 30 : base - 12;
    ellipse(g, hx, hy, 11, 8, fur);
    if (f !== 'up') {
      // the stripes: the badger's face is the thing you remember
      rect(g, hx - 1, hy - 8, 3, 14, white); rect(g, hx - 7, hy - 6, 3, 10, white); rect(g, hx + 5, hy - 6, 3, 10, white);
      rect(g, hx - 4, hy - 7, 3, 12, blk); rect(g, hx + 2, hy - 7, 3, 12, blk);
      px(g, hx - 3, hy - 2, fr >= 2 ? '#ff5a3a' : '#ffd36b'); px(g, hx + 3, hy - 2, fr >= 2 ? '#ff5a3a' : '#ffd36b');
      circle(g, hx, hy + 5, 2.5, blk);
      if (fr === 3) { rect(g, hx - 4, hy + 6, 8, 2, '#e8a0a0'); px(g, hx - 3, hy + 6, white); px(g, hx + 2, hy + 6, white); }
    } else { rect(g, hx - 1, hy - 8, 3, 12, white); rect(g, hx - 6, hy - 6, 2, 8, white); rect(g, hx + 5, hy - 6, 2, 8, white); }
    const spread = fr === 2 ? 5 : fr === 3 ? -3 : 0;
    for (const s of [-1, 1]) { const px0 = cx + s * (19 + spread), py0 = base - 6 + (fr === 3 ? 3 : 0); for (let i = -1; i <= 1; i++) line(g, px0 + i * 3, py0, px0 + i * 3 + (fr === 3 ? s * 3 : 0), py0 + 7, '#e6dcc4', 2); }
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
