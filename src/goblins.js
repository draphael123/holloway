// goblins.js — the goblin tribe of the holloways, one body drawn by hand, six palettes, five weapons.
// Same frame contract as chars.js: {down, up, left, right}: [idle, walk, windup, attack, hurt], feet at (w/2, h-2).
import { canvas, px, rect, circle, line, fromGrid, outline, flipX, shade } from './px.js';

// keys: g skin, G skin shade, l skin light, e eye, k mouth, r rag, R rag shade, b belt
const DOWN = [
  '......gggg......', '.....lggggg.....', 'g...lgggggggg..g', 'gg.lggggggggg.gg', 'gggggggggggggggg', '.gGggggggggggGg.',
  '..ggeggggggegG..', '..gggggggggggG..', '..GgggkkkkgggG..', '...GGggggggGG...', '.....GggggG.....', '....gggggggg....',
  '...ggGggggGgg...', '...gg.rrrr.gg...', '...gg.rrRr.gg...', '...GG.bbbb.GG...', '......rrrr......', '......RrrR......',
];
const DOWN_LEGS = [
  ['.....gg..gg.....', '.....gg..gg.....', '.....GG..GG.....', '....GGG..GGG....'],
  ['.....gg..gg.....', '.....GG..gg.....', '.........GG.....', '....GGG..GGG....'],
];
const UP = [
  '......gggg......', '.....gggggg.....', 'g...gggggggg...g', 'gg.gggggggggg.gg', 'gggggggggggggggg', '.gGggggggggggGg.',
  '..gggggggggggG..', '..gggggggggggG..', '..GgggggggggGG..', '...GGgggggGGG...', '.....GggggG.....', '....gggggggg....',
  '...ggGggggGgg...', '...gg.rrrr.gg...', '...gg.rrrr.gg...', '...GG.RRRR.GG...', '......rrrr......', '......RrrR......',
];
const SIDE = [
  '......gggg......', '.....lggggg.....', '..g.lgggggggg...', '..gggggggggggg..', '..gggggggggggg..', '...gggggggggeg..',
  '...ggggggggggggg', '...Gggggggggkkk.', '....GGgggggGG...', '......GggG......', '.....gggggg.....', '....ggrrrrgg....',
  '....gGrrrRgg....', '.....Gbbbb......', '......rrrr......', '......RrrR......',
];
const SIDE_LEGS = [
  ['.....gggg.......', '.....gg.gg......', '.....GG.GG......', '....GGG.GGG.....'],
  ['.....gggg.......', '....gg...gg.....', '...GG.....GG....', '..GGG.....GGG...'],
];

export const CUTTER = { skin: '#5a8a3a', rag: '#7a5230', weapon: 'dagger' };
export const WHELP = { skin: '#8ab04a', rag: '#8a6a3a', weapon: 'stick', small: true };
export const SLINGER = { skin: '#6a7a3a', rag: '#4a4a5a', weapon: 'sling', hood: '#3a3a4a' };
export const SHIELDBEARER = { skin: '#4a7a3a', rag: '#3a3a44', weapon: 'shield' };
export const BOG = { skin: '#3a7a6a', rag: '#2a4a3a', weapon: 'spear' };
export const DROWNED = { skin: '#8aa0a8', rag: '#3a4a5a', weapon: 'grab', weed: true };
export const SHAMAN = { skin: '#4a8a5a', rag: '#5a2a6a', weapon: 'staff', hood: '#2a1a3a', big: true, feathers: true };

const STEEL = '#d8dce6', STEEL_D = '#8a8e9a', WOOD = '#7a5230', WOOD_L = '#a6733f', REED = '#6a8a3a', BOSS = '#9a9aa8', STONE = '#8a8a90';
const lean = (fr, f) => { const d = fr === 2 ? -2 : fr === 3 ? 3 : 0; return f === 'down' ? [0, d] : f === 'up' ? [0, -d] : [d, 0]; };

export function bakeGoblin(v) {
  const pal = { g: v.skin, G: shade(v.skin, -0.3), l: shade(v.skin, 0.22), e: '#ff5a3a', k: '#1b1626', r: v.rag, R: shade(v.rag, -0.3), b: '#2a1f18' };
  const angry = { ...pal, e: '#ffd36b' };
  const W = 30, H = 32;
  const bodies = {};
  for (const f of ['down', 'up', 'side']) {
    const base = f === 'side' ? SIDE : f === 'up' ? UP : DOWN; const legs = f === 'side' ? SIDE_LEGS : DOWN_LEGS;
    bodies[f] = [0, 1].map(li => { const rows = base.concat(legs[li]); for (const r of rows) if (r.length !== 16) throw new Error('goblin row ' + r); return { n: fromGrid(rows, pal, 0), a: fromGrid(rows, angry, 0), h: rows.length }; });
  }
  const out = {};
  for (const f of ['down', 'up', 'side']) {
    out[f] = [0, 1, 2, 3, 4].map(fr => {
      const [c, g] = canvas(W, H); const cx = W / 2, base = H - 2;
      const [lx, ly] = lean(fr, f); const bob = fr === 1 ? -1 : 0;
      const b = bodies[f][fr === 1 ? 1 : 0]; const src = fr === 2 || fr === 3 ? b.a : b.n;
      const ox = Math.round(cx - 8 + lx), oy = base - b.h + ly + bob;
      // things behind the body first
      if (v.weapon === 'shield' && f === 'up') drawShield(g, cx - 1, base - 12, fr);
      if (v.weapon === 'spear' && f === 'up') line(g, cx + 6, base - 24, cx + 6, base - 2, REED, 1);
      g.drawImage(src, ox, oy);
      if (v.hood) { rect(g, ox + 4, oy, 8, 2, v.hood); rect(g, ox + 3, oy + 1, 10, 3, v.hood); rect(g, ox + 2, oy + 3, 12, 2, shade(v.hood, -0.3)); if (f !== 'up') { rect(g, ox + 4, oy + 5, 8, 1, shade(v.hood, -0.4)); } }
      if (v.weed) { for (let i = 0; i < 4; i++) line(g, ox + 4 + i * 3, oy + 1, ox + 3 + i * 3, oy - 3 + (i & 1), '#2f6a27'); }
      if (v.small) { /* the whelp is the same body, drawn a touch lower: it is a child */ }
      // weapons in front
      const hx = f === 'side' ? ox + 13 : f === 'down' ? ox + 12 : ox + 3, hy = oy + 13;
      if (v.feathers) { for (let i = 0; i < 3; i++) line(g, ox + 5 + i * 3, oy + 1, ox + 4 + i * 3 - (i === 0 ? 2 : 0), oy - 5 - (i & 1) * 2, i === 1 ? '#c9452e' : '#e0bb65', 1); }
      if (v.weapon === 'staff' && f !== 'up') { const sx2 = f === 'side' ? hx + 2 : ox + 14; line(g, sx2, hy + 7, sx2, hy - 10, WOOD, 2); circle(g, sx2, hy - 12, 2.5, '#e6dcc4'); px(g, sx2 - 1, hy - 12, '#1b1626'); px(g, sx2 + 1, hy - 12, '#1b1626'); if (fr === 2 || fr === 3) { circle(g, sx2, hy - 16, fr === 3 ? 3 : 2, '#6af06a'); px(g, sx2, hy - 16, '#e6ffe6'); } }
      if (v.weapon === 'staff' && f === 'up') { line(g, ox + 2, hy + 7, ox + 2, hy - 10, WOOD, 2); circle(g, ox + 2, hy - 12, 2.5, '#e6dcc4'); }
      if (v.weapon === 'dagger' && f !== 'up') { const ext = fr === 3 ? 4 : fr === 2 ? -2 : 0; if (f === 'side') { line(g, hx, hy, hx + 5 + ext, hy - 1, STEEL, 2); px(g, hx + 5 + ext, hy - 2, STEEL); rect(g, hx - 1, hy - 1, 2, 3, WOOD); } else { line(g, hx, hy, hx + 2, hy + 5 + ext, STEEL, 2); rect(g, hx - 1, hy - 2, 3, 2, WOOD); } }
      if (v.weapon === 'stick' && f !== 'up') { const ext = fr === 3 ? 4 : fr === 2 ? -2 : 0; if (f === 'side') { line(g, hx - 1, hy + 1, hx + 4 + ext, hy - 3, WOOD, 2); circle(g, hx + 4 + ext, hy - 3, 1.6, WOOD_L); } else { line(g, hx, hy - 1, hx + 1, hy + 4 + ext, WOOD, 2); circle(g, hx + 1, hy + 4 + ext, 1.6, WOOD_L); } }
      if (v.weapon === 'sling' && f !== 'up') { const sx = f === 'side' ? hx + 1 : hx; if (fr === 2) { line(g, sx, hy, sx + 5, hy - 8, WOOD_L, 1); circle(g, sx + 5, hy - 8, 1.6, STONE); } else if (fr === 3) { line(g, sx, hy, sx + 7, hy - 2, WOOD_L, 1); } else { line(g, sx, hy, sx + 2, hy + 5, WOOD_L, 1); circle(g, sx + 2, hy + 5, 1.6, STONE); } }
      if (v.weapon === 'shield' && f !== 'up') { if (f === 'side') drawShield(g, ox + 15 + (fr === 3 ? 2 : 0), base - 11, fr); else drawShield(g, ox + 3, base - 10, fr); const kx = f === 'side' ? ox + 2 : ox + 13, ky = fr === 2 ? base - 24 : fr === 3 ? base - 8 : base - 17; line(g, kx, ky + 6, kx + (fr === 3 ? 3 : 1), ky, WOOD, 2); circle(g, kx + (fr === 3 ? 3 : 1), ky, 2.2, shade(WOOD, -0.3)); }
      if (v.weapon === 'spear' && f !== 'up') { const ext = fr === 3 ? 6 : fr === 2 ? -3 : 0; if (f === 'side') { line(g, hx - 6, hy + 2, hx + 8 + ext, hy - 2, REED, 1); px(g, hx + 9 + ext, hy - 2, STEEL); px(g, hx + 9 + ext, hy - 3, STEEL_D); } else { line(g, hx, hy - 8, hx + 1, hy + 8 + ext, REED, 1); px(g, hx + 1, hy + 9 + ext, STEEL); } }
      if (v.weapon === 'grab' && fr >= 2 && f !== 'up') { const reach = fr === 3 ? 6 : 2; if (f === 'side') rect(g, ox + 12, hy - 1, reach + 3, 3, v.skin); else { rect(g, ox + 1 - (fr === 3 ? 1 : 0), hy + reach, 4, 3, v.skin); rect(g, ox + 11 + (fr === 3 ? 1 : 0), hy + reach, 4, 3, v.skin); } }
      outline(c, shade(v.skin, -0.72)); // a dark tint of its own skin, not black: it sits in the scene
      return { canvas: c, ax: cx, ay: base };
    });
  }
  if (v.big) for (const f of ['down', 'up', 'side']) out[f] = out[f].map(fr => { const [c2, g2] = canvas(fr.canvas.width * 2, fr.canvas.height * 2); g2.imageSmoothingEnabled = false; g2.drawImage(fr.canvas, 0, 0, c2.width, c2.height); return { canvas: c2, ax: fr.ax * 2, ay: fr.ay * 2 }; });
  out.right = out.side; out.left = out.side.map(f => ({ ...f, canvas: flipX(f.canvas) })); delete out.side;
  return out;
}
function drawShield(g, x, y, fr) { circle(g, x, y, 5.5, WOOD); circle(g, x, y, 4, WOOD_L); circle(g, x, y, 1.5, BOSS); px(g, x - 2, y - 3, '#c9a56a'); if (fr === 2) circle(g, x, y, 5.5, 'rgba(255,255,255,0)'); }
