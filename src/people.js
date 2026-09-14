// people.js — the hero and the villagers from Svetlana Kushnariova's 24×32 sheets (CC-BY 3.0). Each sheet has a
// 3×4 walk block at the left (cols: step, stand, step; rows: up, right, down, left) on a solid teal key.
// Frame contract matches the rest of the game: {down, up, left, right}: [4 frames {canvas, ax, ay, bob}].
import { canvas } from './px.js';

const FILES = { hero: 'tiles/people/hero.png', hesk: 'tiles/people/hesk.png', pell: 'tiles/people/pell.png', pedlar: 'tiles/people/pedlar.png' };
const img = {}; const cache = new Map();
export const PEOPLE = { ready: false };
export function loadPeople(onReady) {
  let left = Object.keys(FILES).length;
  for (const k in FILES) { const i = new Image(); i.onload = () => { img[k] = i; if (--left === 0) { PEOPLE.ready = true; onReady && onReady(); } }; i.onerror = () => { left = -999; onReady && onReady(); }; i.src = FILES[k]; }
}
const ROW = { up: 0, right: 1, down: 2, left: 3 };
function keyed(sheet) { // the whole sheet with the teal key made transparent (cached)
  let c = cache.get(sheet); if (c) return c;
  const im = img[sheet]; const [cv, g] = canvas(im.width, im.height); g.drawImage(im, 0, 0);
  const id = g.getImageData(0, 0, cv.width, cv.height); const d = id.data; const kr = d[0], kg = d[1], kb = d[2];
  for (let i = 0; i < d.length; i += 4) if (d[i] === kr && d[i + 1] === kg && d[i + 2] === kb) d[i + 3] = 0;
  g.putImageData(id, 0, 0); cache.set(sheet, cv); return cv;
}
function hsl(r, g, b) { r /= 255; g /= 255; b /= 255; const mx = Math.max(r, g, b), mn = Math.min(r, g, b); let h = 0, s = 0; const l = (mx + mn) / 2; if (mx !== mn) { const d = mx - mn; s = l > 0.5 ? d / (2 - mx - mn) : d / (mx + mn); if (mx === r) h = ((g - b) / d + (g < b ? 6 : 0)) * 60; else if (mx === g) h = ((b - r) / d + 2) * 60; else h = ((r - g) / d + 4) * 60; } return [h, s, l]; }
function toRgb(h, s, l) { const f = n => { const k = (n + h / 30) % 12; const a = s * Math.min(l, 1 - l); return Math.round(255 * (l - a * Math.max(-1, Math.min(k - 3, 9 - k, 1)))); }; return [f(0), f(8), f(4)]; }
// tint the near-grey cloth (the fighter's plain tunic) toward a colour; everything with its own colour is left alone
function tintGrey(c, hex) {
  const [tr, tg, tb] = [parseInt(hex.slice(1, 3), 16), parseInt(hex.slice(3, 5), 16), parseInt(hex.slice(5, 7), 16)]; const [th, ts] = hsl(tr, tg, tb);
  const g = c.getContext('2d'); const id = g.getImageData(0, 0, c.width, c.height); const d = id.data;
  for (let i = 0; i < d.length; i += 4) { if (!d[i + 3]) continue; const [h, s, l] = hsl(d[i], d[i + 1], d[i + 2]); if (s < 0.14 && l > 0.2 && l < 0.85) { const [r, gg, b] = toRgb(th, ts * 0.8, l * 0.9); d[i] = r; d[i + 1] = gg; d[i + 2] = b; } }
  g.putImageData(id, 0, 0); return c;
}
function feetOf(c) { const g = c.getContext('2d'); const d = g.getImageData(0, 0, c.width, c.height).data; for (let y = c.height - 1; y >= 0; y--) for (let x = 0; x < c.width; x++) if (d[(y * c.width + x) * 4 + 3]) return y + 1; return c.height; }
export function bakePerson24(sheet, tint) {
  const src = keyed(sheet); const out = {}; let feet = null;
  for (const f of ['down', 'up', 'left', 'right']) {
    const frames = [1, 0, 1, 2].map(col => { const [c, g] = canvas(24, 32); g.drawImage(src, col * 24, ROW[f] * 32, 24, 32, 0, 0, 24, 32); if (tint) tintGrey(c, tint); if (feet === null) feet = feetOf(c); return { canvas: c, ax: 12, ay: feet, bob: 0 }; });
    out[f] = frames;
  }
  return out;
}
