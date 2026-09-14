// font.js — a 3×5 pixel font baked per string (cached), so the 320-wide buffer can carry 64 characters a row.
// Uppercase only; lowercase is mapped up. Advance 4 px, space 3 px. `textW()` MEASURES — never len * 4.
import { canvas } from './px.js';

const G = {
  A: '010101111101101', B: '110101110101110', C: '011100100100011', D: '110101101101110', E: '111100110100111', F: '111100110100100',
  G: '011100101101011', H: '101101111101101', I: '111010010010111', J: '001001001101010', K: '101101110101101', L: '100100100100111',
  M: '1000111011101011000110001', N: '110101101101101', O: '010101101101010', P: '110101110100100', Q: '010101101111011', R: '110101110101101',
  S: '011100010001110', T: '111010010010010', U: '101101101101111', V: '101101101101010', W: '1000110001101011101110001', X: '101101010101101',
  Y: '101101010010010', Z: '111001010100111',
  0: '111101101101111', 1: '010110010010111', 2: '110001010100111', 3: '111001011001111', 4: '101101111001001', 5: '111100110001110',
  6: '011100111101111', 7: '111001010010010', 8: '111101111101111', 9: '111101111001110',
  '.': '000000000000010', ',': '000000000010100', '!': '010010010000010', '?': '110001010000010', ':': '000010000010000', '-': '000000111000000',
  '+': '000010111010000', '/': '001001010100100', '\'': '010010000000000', '(': '010100100100010', ')': '010001001001010', '%': '101001010100101',
  '>': '100010001010100', '<': '001010100010001', '=': '000111000111000', '"': '101101000000000', '&': '010101010101011', '_': '000000000000111',
  '~': '000001111100000', '*': '101010111010101', '#': '101111101111101', '[': '110100100100110', ']': '011001001001011',
};
const glyph = ch => G[ch] || (ch === ' ' ? null : G['?']);
const gw = ch => { const gl = glyph(ch); return gl ? gl.length / 5 + 1 : 3; };
export function textW(s) { let w = 0; for (const ch of String(s).toUpperCase()) w += gw(ch); return Math.max(0, w - 1); }

const cache = new Map();
export function bakeText(s, col) {
  const key = col + '|' + s;
  let c = cache.get(key);
  if (c) return c;
  const str = String(s).toUpperCase(); const w = Math.max(1, textW(str));
  const [cv, g] = canvas(w, 5); g.fillStyle = col;
  let x = 0;
  for (const ch of str) {
    if (ch === ' ') { x += 3; continue; }
    const gl = glyph(ch); const cw = gl.length / 5;
    for (let i = 0; i < gl.length; i++) if (gl[i] === '1') g.fillRect(x + (i % cw), (i / cw) | 0, 1, 1);
    x += cw + 1;
  }
  if (cache.size > 900) { const k0 = cache.keys().next().value; cache.delete(k0); }
  cache.set(key, cv);
  return cv;
}
// draw at integer x,y; scale 1 or 2; align 'l' | 'c' | 'r'
export function text(g, s, x, y, col = '#f4f0e6', scale = 1, align = 'l', shadow = null) {
  const c = bakeText(s, col); const w = c.width * scale;
  let dx = x | 0; if (align === 'c') dx = (x - w / 2) | 0; else if (align === 'r') dx = (x - w) | 0;
  if (shadow) { const sc = bakeText(s, shadow); g.drawImage(sc, dx + scale, (y | 0) + scale, sc.width * scale, 5 * scale); }
  g.drawImage(c, dx, y | 0, w, 5 * scale);
  return w;
}
// word-wrap to a pixel width
export function wrap(s, maxW) {
  const words = String(s).split(' '); const lines = []; let cur = '';
  for (const w of words) { const t = cur ? cur + ' ' + w : w; if (textW(t) > maxW && cur) { lines.push(cur); cur = w; } else cur = t; }
  if (cur) lines.push(cur);
  return lines;
}
// shorten with an ellipsis to fit
export function fitText(s, maxW) { let t = String(s); while (t.length > 1 && textW(t + '..') > maxW) t = t.slice(0, -1); return textW(s) <= maxW ? s : t + '..'; }
