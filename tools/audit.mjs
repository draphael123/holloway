// tools/audit.mjs — static checks on every area. Run after any map edit: `node tools/audit.mjs`.
// Rules it checks (each earned somewhere): row widths; door gaps pair with the neighbour; every creature
// stands on floor; every room is reachable in STAGES (no key, then key, then claw) along the intended route;
// the boss room holds exactly one boss; chest/mound tables match their cells; every enemy id is defined.
import { AREAS, parseArea, roomDoors, K, SOLID, CELL_W, CELL_H } from '../src/world.js';

const ENEMY_IDS = ['imp', 'rat', 'archer', 'warden', 'digger', 'burrower', 'brock', 'shaman', 'newt', 'drowned', 'eelwife', 'pike'];
let fails = 0, warns = 0;
const fail = s => { fails++; console.log('  FAIL ' + s); };
const warn = s => { warns++; console.log('  warn ' + s); };
const ok = s => console.log('  ok   ' + s);

for (const id in AREAS) {
  const def = AREAS[id]; console.log(`\n${def.name} (${id})`);
  let area; try { area = parseArea(def); ok(`${area.W}x${area.H} parsed`); } catch (e) { fail(e.message); continue; }
  const t = (x, y) => (x < 0 || y < 0 || x >= area.W || y >= area.H) ? K.WALL : area.tiles[y * area.W + x];
  const walk = k => !SOLID.has(k);
  // creatures on footing
  for (const e of area.ents) { if (e.kind === 'enemy' && !ENEMY_IDS.includes(e.id)) fail(`unknown enemy ${e.id} at ${e.x},${e.y}`); if ((e.kind === 'enemy' || e.kind === 'npc' || e.kind === 'start') && !walk(t(e.x, e.y))) fail(`${e.kind} ${e.id || ''} stands in a solid tile at ${e.x},${e.y}`); if (e.kind === 'enemy' && t(e.x, e.y) === K.PIT) fail(`enemy ${e.id} over a pit at ${e.x},${e.y}`); }
  const starts = area.ents.filter(e => e.kind === 'start'); if (starts.length !== 1) fail(`${starts.length} start markers`);
  if (def.kind !== 'holloway') {
    // free area: everything walkable must be reachable from the start
    const s = starts[0]; const seen = new Set([s.x + ',' + s.y]); const q = [[s.x, s.y]]; let n = 0;
    while (q.length) { const [x, y] = q.pop(); n++; for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const nx = x + dx, ny = y + dy, k = nx + ',' + ny; if (!seen.has(k) && walk(t(nx, ny)) && t(nx, ny) !== K.PIT) { seen.add(k); q.push([nx, ny]); } } }
    let total = 0; for (let i = 0; i < area.W * area.H; i++) if (walk(area.tiles[i]) && area.tiles[i] !== K.PIT) total++;
    (n / total < 0.9 ? warn : ok)(`${n}/${total} walkable tiles reachable from the start`);
    for (const e of area.ents) if ((e.kind === 'enemy' || e.kind === 'npc' || e.kind === 'sign' || e.kind === 'mouth') && !seen.has(e.x + ',' + e.y) && !(e.kind === 'mouth')) fail(`${e.kind} at ${e.x},${e.y} unreachable`);
    const mouth = area.ents.find(e => e.kind === 'mouth'); if (mouth && !seen.has(mouth.x + ',' + (mouth.y + 1))) fail('the warren mouth is not reachable'); else if (mouth) ok('the mouth is reachable');
    const cul = area.ents.find(e => e.kind === 'culvert'); if (cul && !seen.has(cul.x + ',' + (cul.y - 1))) fail('the culvert is not reachable from the bank above it'); else if (cul) ok('the culvert is reachable');
    continue;
  }
  // ---- holloway ----
  const rooms = area.rooms; const byId = {}; for (const r of rooms) { r.doors = roomDoors(area, r); byId[r.id] = r; }
  // door pairing
  for (const r of rooms) for (const d of r.doors) {
    const nx = d.x + (d.side === 'e' ? 1 : d.side === 'w' ? -1 : 0), ny = d.y + (d.side === 's' ? 1 : d.side === 'n' ? -1 : 0);
    const exitKey = `${r.id}:${d.side}`;
    if (nx < 0 || ny < 0 || nx >= area.W || ny >= area.H) { if (!(def.exits || {})[exitKey]) fail(`${r.id} door ${d.side} at ${d.x},${d.y} leads off the map and is not an exit`); continue; }
    if (t(nx, ny) === K.WALL) fail(`${r.id} door ${d.side} at ${d.x},${d.y} meets a wall on the other side`);
  }
  for (const r of rooms) if (r.doors.length === 0) fail(`${r.name} has no doors`);
  // bosses
  const bossEnts = area.ents.filter(e => e.kind === 'enemy' && e.id === def.boss); if (bossEnts.length !== 1) fail(`${bossEnts.length} bosses (want 1)`); else ok(`boss ${def.boss} in ${bossEnts[0].room}`);
  const miniEnts = area.ents.filter(e => e.kind === 'enemy' && e.id === def.mini); if (miniEnts.length !== 1) fail(`${miniEnts.length} minis (want 1)`); else ok(`mini ${def.mini} in ${miniEnts[0].room}`);
  // chest / mound tables
  for (const rid in def.chests || {}) { const n = area.ents.filter(e => e.kind === 'chest' && e.room === rid).length; if (n !== def.chests[rid].length) fail(`room ${rid}: ${n} chests but ${def.chests[rid].length} in the table`); }
  for (const rid in def.mounds || {}) { const n = area.ents.filter(e => e.kind === 'mound' && e.room === rid).length; if (n !== def.mounds[rid].length) warn(`room ${rid}: ${n} mounds but ${def.mounds[rid].length} in the table (extras give gold)`); }
  // staged reachability: from the entry, walking floor; locks open with a key; soft earth opens with the claw
  const start = starts[0]; const keyRoom = Object.keys(def.chests || {}).find(r => def.chests[r].includes('key'));
  const stage = (allowLock, allowVerb, allowAll) => {
    const seen = new Set([start.x + ',' + start.y]); const q = [[start.x, start.y]]; const roomsSeen = new Set();
    const isLock = (x, y) => area.ents.some(e => e.kind === 'lock' && e.x === x && e.y === y);
    const verbPass = tk => (def.verb === 'swim' ? tk === K.DEEP : (tk === K.SOFT || tk === K.MOUND));
    while (q.length) { const [x, y] = q.pop(); roomsSeen.add(def.grid[Math.floor(y / CELL_H)][Math.floor(x / CELL_W)]);
      for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const nx = x + dx, ny = y + dy, k = nx + ',' + ny; if (seen.has(k)) continue; const tk = t(nx, ny); let pass = walk(tk) && tk !== K.PIT; if (isLock(nx, ny)) pass = allowLock; if (verbPass(tk) && allowVerb) pass = true; if (allowAll && (tk === K.SOFT || tk === K.MOUND || tk === K.DEEP)) pass = true; if (pass) { seen.add(k); q.push([nx, ny]); } } }
    return { seen, roomsSeen };
  };
  // stages: nothing → the key → the key and this holloway's verb → everything any holloway teaches
  const s0 = stage(false, false, false), s1 = stage(true, false, false), s2 = stage(true, true, false), s3 = stage(true, true, true);
  const inRoom = (set, rid) => set.has(rid);
  if (keyRoom && !inRoom(s0.roomsSeen, keyRoom)) fail(`the key room ${keyRoom} needs the key to reach`); else if (keyRoom) ok(`key room ${keyRoom} reachable without the key`);
  const miniRoom = miniEnts[0] && miniEnts[0].room; if (miniRoom && inRoom(s0.roomsSeen, miniRoom)) warn(`mini room ${miniRoom} is reachable without the key`); if (miniRoom && !inRoom(s1.roomsSeen, miniRoom)) fail(`mini room ${miniRoom} unreachable even with the key`); else if (miniRoom) ok(`mini room ${miniRoom} opens with the key`);
  const bossRoom = bossEnts[0] && bossEnts[0].room; if (bossRoom && inRoom(s1.roomsSeen, bossRoom)) warn(`boss room ${bossRoom} is reachable without the verb (${def.verb})`); if (bossRoom && !inRoom(s2.roomsSeen, bossRoom)) fail(`boss room ${bossRoom} unreachable even with the verb (${def.verb})`); else if (bossRoom) ok(`boss room ${bossRoom} opens with the verb (${def.verb})`);
  for (const r of rooms) if (!s3.roomsSeen.has(r.id)) fail(`room ${r.id} ${r.name} is never reachable`); else if (!s2.roomsSeen.has(r.id)) ok(`room ${r.id} ${r.name} needs another holloway's verb (optional)`);
  // every chest reachable with everything
  for (const e of area.ents) if (e.kind === 'chest') { const adj = [[1, 0], [-1, 0], [0, 1], [0, -1]].some(([dx, dy]) => s3.seen.has((e.x + dx) + ',' + (e.y + dy))); if (!adj) fail(`chest at ${e.x},${e.y} cannot be stood next to`); }
  const stairsEnt = area.ents.find(e => e.kind === 'stairs'); if (stairsEnt && !s2.seen.has(stairsEnt.x + ',' + stairsEnt.y)) fail('the stairs out cannot be stood on with this holloway\'s own verb');
  // density: foes per room
  const counts = {}; for (const e of area.ents) if (e.kind === 'enemy') counts[e.room] = (counts[e.room] || 0) + 1;
  ok('foes per room: ' + rooms.map(r => `${r.id}=${counts[r.id] || 0}`).join(' '));
  const stairs = area.ents.find(e => e.kind === 'stairs'); if (!stairs) fail('no stairs out'); else if (stairs.room !== bossRoom) fail('the stairs are not in the boss room');
}
console.log(`\n${fails} fail, ${warns} warn`);
process.exit(fails ? 1 : 0);
