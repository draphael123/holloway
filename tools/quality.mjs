// tools/quality.mjs — density, measured. Props and foes per 100 walkable tiles for every area and room, side
// by side, against a target. A screen half as populated as its neighbours is not sparse, it is unfinished.
import { AREAS, parseArea, K, SOLID, CELL_W, CELL_H } from '../src/world.js';

const TARGET = { wood: 7, holloway: 6 };
const DECO_TILES = new Set([K.FLOWERS, K.MOSS, K.BUSH, K.STUMP, K.STAL, K.CRATE, K.LAMP, K.FENCE, K.BRAZIER, K.ROCK, K.MOUND]);
const DECO_ENTS = new Set(['deco', 'bones', 'sign', 'chest', 'npc']);
let low = 0;
const line = (name, walk, props, foes, target) => { const pd = walk ? (props / walk * 100) : 0, fd = walk ? (foes / walk * 100) : 0; const flag = pd < target ? '  <- under ' + target : ''; if (pd < target) low++; console.log(`  ${name.padEnd(22)} walk ${String(walk).padStart(4)}  props ${String(props).padStart(3)} (${pd.toFixed(1)}/100)  foes ${String(foes).padStart(2)} (${fd.toFixed(1)}/100)${flag}`); };
for (const id in AREAS) {
  const def = AREAS[id]; const a = parseArea(def); console.log(`\n${def.name}`);
  const t = (x, y) => a.tiles[y * a.W + x];
  const count = (x0, y0, x1, y1) => {
    let walk = 0, props = 0, foes = 0;
    for (let y = y0; y < y1; y++) for (let x = x0; x < x1; x++) { const k = t(x, y); if (!SOLID.has(k) && k !== K.PIT && k !== K.WALL) walk++; if (DECO_TILES.has(k)) props++; }
    for (const e of a.ents) { if (e.x < x0 || e.x >= x1 || e.y < y0 || e.y >= y1) continue; if (DECO_ENTS.has(e.kind)) props++; if (e.kind === 'enemy') foes++; }
    return [walk, props, foes];
  };
  if (def.kind === 'holloway') { for (const r of a.rooms) { const [w, p, f] = count(r.x, r.y, r.x + r.w, r.y + r.h); const boss = a.ents.some(e => e.kind === 'enemy' && e.id === def.boss && e.room === r.id); line(`${r.id} ${r.name}${boss ? ' (arena)' : ''}`, w, p, f, boss ? 4 : TARGET.holloway); } }
  else { const [w, p, f] = count(0, 0, a.W, a.H); line(def.name, w, p, f, TARGET.wood); }
}
console.log(`\n${low} under target`);
process.exit(low ? 1 : 0);
