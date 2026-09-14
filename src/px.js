// px.js — crisp pixel helpers. Everything here bakes into offscreen canvases once;
// nothing is antialiased, so the art stays 16-bit at any integer scale.

export function canvas(w, h) {
  const c = document.createElement('canvas');
  c.width = Math.max(1, w | 0); c.height = Math.max(1, h | 0);
  const g = c.getContext('2d');
  g.imageSmoothingEnabled = false;
  return [c, g];
}

export function px(g, x, y, c) { g.fillStyle = c; g.fillRect(x | 0, y | 0, 1, 1); }
export function rect(g, x, y, w, h, c) { g.fillStyle = c; g.fillRect(x | 0, y | 0, w | 0, h | 0); }

// Scanline polygon fill with pixel-centre sampling — no AA. `dither` alternates a
// second colour in a checkerboard for 16-bit shading.
export function fillPoly(g, pts, color, dither = null) {
  let minY = Infinity, maxY = -Infinity;
  for (const p of pts) { if (p[1] < minY) minY = p[1]; if (p[1] > maxY) maxY = p[1]; }
  const y0 = Math.floor(minY), y1 = Math.ceil(maxY);
  const xs = [];
  for (let y = y0; y < y1; y++) {
    const sy = y + 0.5; xs.length = 0;
    for (let i = 0; i < pts.length; i++) {
      const a = pts[i], b = pts[(i + 1) % pts.length];
      if ((a[1] <= sy) !== (b[1] <= sy)) { const t = (sy - a[1]) / (b[1] - a[1]); xs.push(a[0] + t * (b[0] - a[0])); }
    }
    xs.sort((a, b) => a - b);
    for (let i = 0; i + 1 < xs.length; i += 2) {
      const xa = Math.ceil(xs[i] - 0.5), xb = Math.ceil(xs[i + 1] - 0.5);
      if (xb <= xa) continue;
      if (!dither) { g.fillStyle = color; g.fillRect(xa, y, xb - xa, 1); }
      else for (let x = xa; x < xb; x++) { g.fillStyle = ((x + y) & 1) ? dither : color; g.fillRect(x, y, 1, 1); }
    }
  }
}

export function line(g, x0, y0, x1, y1, c, thick = 1) {
  x0 = Math.round(x0); y0 = Math.round(y0); x1 = Math.round(x1); y1 = Math.round(y1);
  const dx = Math.abs(x1 - x0), dy = -Math.abs(y1 - y0), sx = x0 < x1 ? 1 : -1, sy = y0 < y1 ? 1 : -1;
  let err = dx + dy;
  g.fillStyle = c;
  for (;;) {
    g.fillRect(x0, y0, 1, thick);
    if (x0 === x1 && y0 === y1) break;
    const e2 = 2 * err;
    if (e2 >= dy) { err += dy; x0 += sx; }
    if (e2 <= dx) { err += dx; y0 += sy; }
  }
}

export function circle(g, cx, cy, r, c, dither = null) {
  for (let y = Math.floor(cy - r); y <= Math.ceil(cy + r); y++)
    for (let x = Math.floor(cx - r); x <= Math.ceil(cx + r); x++) {
      const dx = x + 0.5 - cx, dy = y + 0.5 - cy;
      if (dx * dx + dy * dy <= r * r) { g.fillStyle = (dither && ((x + y) & 1)) ? dither : c; g.fillRect(x, y, 1, 1); }
    }
}

export function ellipse(g, cx, cy, rx, ry, c, dither = null) {
  for (let y = Math.floor(cy - ry); y <= Math.ceil(cy + ry); y++)
    for (let x = Math.floor(cx - rx); x <= Math.ceil(cx + rx); x++) {
      const dx = (x + 0.5 - cx) / rx, dy = (y + 0.5 - cy) / ry;
      if (dx * dx + dy * dy <= 1) { g.fillStyle = (dither && ((x + y) & 1)) ? dither : c; g.fillRect(x, y, 1, 1); }
    }
}

// Sprite from a text grid. '.' = transparent, other chars index `pal`.
export function fromGrid(rows, pal, margin = 1) {
  const w = Math.max(...rows.map(r => r.length)) + margin * 2, h = rows.length + margin * 2;
  const [c, g] = canvas(w, h);
  rows.forEach((r, y) => { for (let x = 0; x < r.length; x++) { const k = r[x]; if (k !== '.' && pal[k]) px(g, x + margin, y + margin, pal[k]); } });
  return c;
}

// Dark 4-neighbour outline around every opaque pixel (the SNES sprite look).
export function outline(c, color = '#1b1626') {
  const g = c.getContext('2d'), w = c.width, h = c.height;
  const img = g.getImageData(0, 0, w, h), d = img.data;
  const solid = new Uint8Array(w * h);
  for (let i = 0; i < w * h; i++) solid[i] = d[i * 4 + 3] > 0 ? 1 : 0;
  g.fillStyle = color;
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    if (solid[y * w + x]) continue;
    if ((x > 0 && solid[y * w + x - 1]) || (x < w - 1 && solid[y * w + x + 1]) || (y > 0 && solid[(y - 1) * w + x]) || (y < h - 1 && solid[(y + 1) * w + x])) g.fillRect(x, y, 1, 1);
  }
  return c;
}

export function flipX(c) {
  const [o, g] = canvas(c.width, c.height);
  g.translate(c.width, 0); g.scale(-1, 1); g.drawImage(c, 0, 0);
  return o;
}

// Colour math on '#rrggbb'.
export function hex(r, g, b) { const q = v => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, '0'); return '#' + q(r) + q(g) + q(b); }
export function rgb(h) { return [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)]; }
export function shade(h, k) { const [r, g, b] = rgb(h); return k >= 0 ? hex(r + (255 - r) * k, g + (255 - g) * k, b + (255 - b) * k) : hex(r * (1 + k), g * (1 + k), b * (1 + k)); }

export function mulberry(seed) {
  let a = seed >>> 0;
  return () => { a = (a + 0x6D2B79F5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}

// Iso constants: 2:1 diamond, 32×16 px per tile.
export const TW = 32, TH = 16, HW = 16, HH = 8;
export const inDiamond = (x, y) => Math.abs(x + 0.5 - HW) / HW + Math.abs(y + 0.5 - HH) / HH <= 1;
