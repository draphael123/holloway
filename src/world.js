// world.js — every area as ASCII, parsed into tiles + entities. Pure data: no DOM, so tools/audit.mjs can
// import it under node. A holloway is a grid of rooms, each one screen (20×11 tiles); the wood is free-scroll.
//
// LEGEND
//   #  rock wall          .  earth floor        %  soft earth (dig)   *  mound (dig, buried loot)
//   O  pit                ,  grass              :  dirt road          T  tree              W  water
//   =  plank bridge       H  house footprint    r  rock (blocks)      b  brazier (blocks)  s  bones (deco)
//   c  chest              S  sign / tablet      h  heart              K  locked door cell  ^  stairs (boss exit)
//   @  start / entry      D  warren mouth       !  falling-rock / spout spot  1-9 NPC index
//   ~  deep water (swim with THE LUNGS)   V  the culvert (the mere's mouth, on the stream bank)
//   i  bramble imp   t  rat   a  thornshot   w  warren warden   M  the Digger   B  the Old Brock
//   n  mere newt     d  the drowned   E  the Eelwife   Q  the Old Pike
//   DRESSING  f flowers   y moss   F fence   C cliff   u stump   j bush   g stalagmite   k crate   L lamp
//             m mushrooms  x roots   p puddle   l tall grass   (flat decoration, walkable)
//   Rooms and the wood are also dressed AUTOMATICALLY at parse time to a density target (see dress()).

import { mulberry } from './px.js';

export const TS = 16;
export const CELL_W = 20, CELL_H = 11;

export const K = { WALL: 1, FLOOR: 2, SOFT: 3, MOUND: 4, PIT: 5, GRASS: 6, DIRT: 7, TREE: 8, WATER: 9, PLANK: 10, HOUSE: 11, ROCK: 12, BRAZIER: 13, MOUTH: 14, STAIRS: 15, DEEP: 16, CULVERT: 17,
  FLOWERS: 18, MOSS: 19, FENCE: 20, CLIFF: 21, STUMP: 22, BUSH: 23, STAL: 24, CRATE: 25, LAMP: 26 };
export const SOLID = new Set([K.WALL, K.SOFT, K.MOUND, K.TREE, K.WATER, K.HOUSE, K.ROCK, K.BRAZIER, K.DEEP, K.FENCE, K.CLIFF, K.STUMP, K.BUSH, K.STAL, K.CRATE, K.LAMP]);
// what the ground is under a prop, for drawing
export const GRASSY = new Set([K.GRASS, K.FLOWERS, K.TREE, K.HOUSE, K.ROCK, K.MOUTH, K.FENCE, K.CLIFF, K.STUMP, K.BUSH, K.LAMP]);
export const SWIMMABLE = new Set([K.DEEP]);
export const DIGGABLE = new Set([K.SOFT, K.MOUND]);

const ENEMY_CH = { i: 'imp', t: 'rat', a: 'archer', w: 'warden', M: 'digger', B: 'brock', n: 'newt', d: 'drowned', E: 'eelwife', Q: 'pike' };

// ---------------------------------------------------------------------------------------------
// THE WARREN — nine rooms, three by three. Row-major: A B C / D E F / G H I.
// Door cells: north/south at columns 9-10, east/west at rows 4-5. A '%' on a door position is a plug.
// ---------------------------------------------------------------------------------------------
const WARREN_ROOMS = {
  A: { name: 'THE KEY NOOK', rows: [
    '####################',
    '#..r...............#',
    '#......s.....w.....#',
    '#....c.............#',
    '#...................',
    '#.........w.........',
    '#......s...........#',
    '#..r........t..t...#',
    '#..................#',
    '#.........s........#',
    '####################',
  ] },
  B: { name: 'THE CROWD', rows: [
    '####################',
    '#.......r..........#',
    '#..t.........i.....#',
    '#.............t....#',
    '....b..........b....',
    '.........w..........',
    '#..t...............#',
    '#....i.......i.....#',
    '#.......r......s...#',
    '#..................#',
    '#########..#########',
  ] },
  C: { name: 'THE PIT GALLERY', rows: [
    '####################',
    '#.............OOOO.#',
    '#..OOOOO..a...O..c.#',
    '#..O...O......O....#',
    '.......O..OOOOOOO..#',
    '.......O..O........#',
    '#..OOOOO..O...a....#',
    '#.........O........#',
    '#..s......OOOOOO...#',
    '#..................#',
    '####################',
  ] },
  D: { name: 'THE DIGGER\'S HALL', rows: [
    '####################',
    '#%%................#',
    '#%..........s......#',
    '#...........r......#',
    '#.........M.........',
    '#...................',
    '#......r...........#',
    '#..s..........%%%..#',
    '#.............%*%..#',
    '#%%...........%%%..#',
    '####################',
  ] },
  E: { name: 'THE HUB', rows: [
    '#########..#########',
    '#....s.............#',
    '#...b..........b...#',
    '#.......r..........#',
    'K...................',
    'K..........r........',
    '#.....s.......t....#',
    '#...b..t.......b...#',
    '#..........s.......#',
    '#..................#',
    '#########..#########',
  ] },
  F: { name: 'THE ARCHERS\' VEIN', rows: [
    '####################',
    '#.......a..........#',
    '#..r.......%%%.....#',
    '#..........%*%.....#',
    '............%%.....#',
    '.......r...........#',
    '#...........a......#',
    '#..%%..............#',
    '#..%*%......a......#',
    '#..%%.......r......#',
    '#########%%#########',
  ] },
  G: { name: 'THE MOUNDS', rows: [
    '####################',
    '#%%%%%%%%%%%%%%%%%%#',
    '#%%*%%%%%%%%%%%*%%%#',
    '#%%%%%%%%%%%%%%%%%%#',
    '#%%%%%%%%%%.........',
    '#%%%*%%%%%%%.t......',
    '#%%%%%%%%%%%.......#',
    '#%%%%%%%%%%%%%%%*%%#',
    '#%%%*%%%%%%%%%%%%%%#',
    '#%%%%%%%%%%%%%%%%%%#',
    '####################',
  ] },
  H: { name: 'THE THROAT', rows: [
    '#########..#########',
    '#......s...........#',
    '#..!......!....r...#',
    '#.....r......!.....#',
    '...................#',
    '....!....r.....!...#',
    '#.......s..........#',
    '#..r.....!.....s...#',
    '#..........!.......#',
    '#.........@........#',
    '#########..#########',
  ] },
  I: { name: 'THE OLD BROCK', rows: [
    '#########..#########',
    '#..................#',
    '#..s...............#',
    '#..................#',
    '#..................#',
    '#.........B........#',
    '#..................#',
    '#..................#',
    '#.....s............#',
    '#.........^........#',
    '####################',
  ] },
};

// ---------------------------------------------------------------------------------------------
// THE MERE — the drowned holloway under the stream. Deep water is a wall until you have THE LUNGS.
// Same grid: A B C / D E F / G H I. The plug into the Pike's pool is water, not earth.
// ---------------------------------------------------------------------------------------------
const MERE_ROOMS = {
  A: { name: 'THE WEIR', rows: [
    '####################',
    '#..~~..............#',
    '#..~~....d.........#',
    '#..~~..c...........#',
    '#..~~~~~~~..........',
    '#......~~..n........',
    '#......~~..........#',
    '#..n...~~....d.....#',
    '#......~~..........#',
    '#......~~..........#',
    '####################',
  ] },
  B: { name: 'THE SHALLOWS', rows: [
    '####################',
    '#..................#',
    '#..n...~~~~...n....#',
    '#.....~~~~~~.......#',
    '....d.~~~~~~...d....',
    '......~~~~~~........',
    '#..n...~~~~...n....#',
    '#..................#',
    '#..s...............#',
    '#..................#',
    '#########..#########',
  ] },
  C: { name: 'THE DROWNED CHAPEL', rows: [
    '####################',
    '#..................#',
    '#....~~~~~~~~~~....#',
    '#....~........~....#',
    '.....~...c....~....#',
    '.....~........~....#',
    '#....~~~~~~~~~~....#',
    '#..a...........a...#',
    '#..................#',
    '#..................#',
    '####################',
  ] },
  D: { name: 'THE EELWIFE\'S POOL', rows: [
    '####################',
    '#~~~~..............#',
    '#~~~~..............#',
    '#~~~~..............#',
    '#~~~~.....E.........',
    '#~~~~...............',
    '#~~~~..............#',
    '#~~~~..........~~..#',
    '#~~~~..........~~..#',
    '#~~~~..........~~..#',
    '####################',
  ] },
  E: { name: 'THE CISTERN', rows: [
    '#########..#########',
    '#....s.............#',
    '#...b.....~~...b...#',
    '#.........~~.......#',
    'K.........~~........',
    'K.........~~........',
    '#..d......~~.......#',
    '#...b.....~~...b...#',
    '#..........~.......#',
    '#..................#',
    '#########..#########',
  ] },
  F: { name: 'THE SLUICE', rows: [
    '####################',
    '#.......a..........#',
    '#..r...............#',
    '#.....~~~~~~.......#',
    '......~~~~~~.......#',
    '......~~~~~~.......#',
    '#...........a......#',
    '#..................#',
    '#.........a........#',
    '#..........r.......#',
    '#########~~#########',
  ] },
  G: { name: 'THE SILT BEDS', rows: [
    '####################',
    '#%%%%%%%%%%%%%%%%%%#',
    '#%%*%%%%%%%%%%*%%%%#',
    '#%%%%%%%%~~~~%%%%%%#',
    '#%%%%%%%%~~~~.......',
    '#%%*%%%%%~~~~.d.....',
    '#%%%%%%%%~~~~......#',
    '#%%%%%%%%%%%%%%*%%%#',
    '#%%%*%%%%%%%%%%%%%%#',
    '#%%%%%%%%%%%%%%%%%%#',
    '####################',
  ] },
  H: { name: 'THE CULVERT', rows: [
    '#########..#########',
    '#......s...........#',
    '#..!...~~~!........#',
    '#......~~....!.....#',
    '....~~~~~....r.....#',
    '....!.~~~~.....!...#',
    '#......~~..........#',
    '#..r...~~!.....s...#',
    '#......~~..!.......#',
    '#......~~.@........#',
    '#########..#########',
  ] },
  I: { name: 'THE OLD PIKE', rows: [
    '#########..#########',
    '#~~~~~~~~..~~~~~~~~#',
    '#~................~#',
    '#~....~~....~~....~#',
    '#~....~~....~~....~#',
    '#~........Q.......~#',
    '#~....~~....~~....~#',
    '#~....~~....~~....~#',
    '#~................~#',
    '#~~~~~~~~^~~~~~~~~~#',
    '####################',
  ] },
};
const MERE_CHESTS = { A: ['key'], C: ['charm:eelskin'] };
const MERE_MOUNDS = { G: ['gold', 'heart', 'charm:pikescale', 'gold', 'gold'] };

// what the chests hold, in reading order per room
const WARREN_CHESTS = { A: ['key'], C: ['charm:thornband'] };
// what the mounds hold, in reading order per room (every mound gives gold as well)
const WARREN_MOUNDS = { D: ['heart'], F: ['charm:ratfoot', 'gold'], G: ['gold', 'charm:brockhide', 'heart', 'gold', 'gold'] };
const WARREN_SIGNS = {};

export const AREAS = {
  wood: {
    id: 'wood', name: 'THE WOOD\'S EDGE', kind: 'wood', music: 'wood',
    rows: [
      'TTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTT',
      'TCCCCCCCCCCCCCCCCCCCDDCCCCCCCCCCCCCCCCCT',
      'TTCCCCCCCCCCCCCCCCCC::CCCCCCCCCCCCCCCCCT',
      'TTT,,,,,,,T,,,,,,,,,::,,,,,,T,,,,,,,,TTT',
      'TT,,,,i,,,,,,,,,,,,,::,,,,,,,,,,i,,,,,TT',
      'TT,,,,,,,,,,r,,,,,,,::,,,,,,,,,,,,,,T,TT',
      'TT,,T,,,,,,,,,,,,,,,::,,,,r,,,,,,,,,,,TT',
      'TT,,,,,,,,,i,,,,,,,,::,,,,,,,,,,,,,,,,TT',
      'TWVVWWWWWWWWWWWWWWWW==WWWWWWWWWWWWWWWWWT',
      'TT,,,,,,,,,,,,,,,,,,::,,,,,,,,,,,,,,,,TT',
      'TT,,,T,,,,,,,,,,,,,,::,,,,,,,,,,,,T,,,TT',
      'TT,,,,,,,,,,,,,,,,,,::,,,,,,,,,,,,,,,,TT',
      'TT,,,,,,,,,,,,,,,,,,::,,,,,,,,,,,,,,,,TT',
      'TT,,,,,,,,,,,,,,,,,,::,,,,,,,,,,,,,,,,TT',
      'TT,,,,,T,,,,,,,,,,,,::,,,,,HHHH,,,,,,,TT',
      'TT,,,,,,,,,,,,,,,,,,::,,,,,HHHH,,FFF,,TT',
      'TT,,,,,,,,,,,,,,,,,,::,,,,,HHHH,,T,,,,TT',
      'TT,,,,,,,,,,,1,,,,,,::::::::2,fL,,,,,,TT',
      'TT,,,,,,,,,,,,,,,,,,::,,,,,,,,,,,,,,,,TT',
      'TT,,,T,,,,,,,,,,,S,,::,,,,,,,,,,,,,,,,TT',
      'TT,,,,,,,,,,,,,,,,,,@:,,,3,,,,T,,,,,,,TT',
      'TTT,,,,,,,,,,,,,,,,,::,,,,,,,,,,,,,,,TTT',
      'TTTT,,,,,,,,,,,,,,,,::,,,,,,,,,,,,,,TTTT',
      'TTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTT',
    ],
    houses: [{ x: 27, y: 14, w: 4, d: 3, H: 28, name: 'PELL\'S COTTAGE', door: { u: 1.5 }, windows: [{ u: 0.3, v: 10, box: true }, { u: 3.0, v: 10, shutters: true }], chimney: true, wallKey: 'plaster', roofKey: 'thatch' }],
    npcs: [
      { idx: 1, name: 'WARDEN HESK', look: { hair: '#3a2a1a', skin: '#d9a978', tunic: '#5f7a3a', pants: '#4a4a55', boots: '#2a2a2a', accent: '#c9a227', hat: '#6a5a3a' },
        lines: ['HESK: The Pell boy went under the roots three days back. The wood keeps what it takes.', 'HESK: The warren mouth is north, over the stream. Goblins in there, and worse under them.', 'HESK: Whatever you take from the wood, you keep. That is the only law down there.'],
        after: ['HESK: You brought him back. Nobody has done that. Nobody.', 'HESK: There is a grate on the stream bank, west, that has been shut since my grandfather. It is open now. I did not open it.'],
        after2: ['HESK: The mere too. The stream runs clearer since. I do not know what you are becoming, but keep at it.'] },
      { idx: 2, name: 'MOTHER PELL', look: { hair: '#6b3f22', skin: '#f2c9a0', tunic: '#8a4a5a', pants: '#8a4a5a', boots: '#3a2a1a', dress: true, accent: '#f7f2e6' },
        lines: ['PELL: He only went to fetch the goat. The goat came back.', 'PELL: If you find him... if you find anything of his...'],
        after: ['PELL: He is asleep. He will not say what he saw. Thank you. Thank you.'],
        after2: ['PELL: He talks now. About a pool, and a mask, and a thing with too many teeth. You went there?'] },
      { idx: 3, name: 'THE PEDLAR', shop: true, look: { hair: '#2a2a2a', skin: '#c98a5a', tunic: '#e0bb65', pants: '#4b3d5c', boots: '#2a2a2a', accent: '#f7f2e6', hat: '#7a3a1a' },
        lines: ['PEDLAR: Gold from under the roots spends the same as any. What do you need?'], after: ['PEDLAR: The one who came back from the warren. Prices are the same, but I will not haggle with you.'], after2: ['PEDLAR: You have been to the mere. I can smell it. Buy something, it helps.'] },
    ],
    signs: { S: ['ARROWS or WASD to walk. X cuts, hold X for THE HEAVY BLOW.', 'C guards. TAP C as a blow lands to PARRY. Z rolls.', 'SPACE talks and opens. TAB is your pack: skills, charms, the bestiary.'] },
    exits: { mouth: { to: 'warren', at: 'entry' }, culvert: { to: 'mere', at: 'entry' } },
    freeCamera: true,
  },
  warren: {
    id: 'warren', name: 'THE WARREN', kind: 'holloway', music: 'warren',
    grid: [['A', 'B', 'C'], ['D', 'E', 'F'], ['G', 'H', 'I']],
    rooms: WARREN_ROOMS, chests: WARREN_CHESTS, mounds: WARREN_MOUNDS, signs: WARREN_SIGNS,
    // the door out of H's south wall leads back to the wood, standing under the mouth
    exits: { 'H:s': { to: 'wood', at: 'mouth' } },
    boss: 'brock', mini: 'digger', keeping: 'THE BROCK\'S HEART', verb: 'dig', hazard: 'rock',
    won: { title: 'THE WARREN IS DONE', lines: ['The Pell boy was in the Brock\'s chamber, under a heap of what the wood had kept: lanterns, a goat bell, a warden\'s cap.', 'He would not say what he saw. You carry him up the throat and out into the light.', 'You kept THE CLAW. You kept THE BROCK\'S HEART. That is the law.'] },
    // the intended route, for the bot and the audit's staged reachability
    route: [
      { room: 'H', do: 'clear' }, { room: 'E', do: 'clear' }, { room: 'B', do: 'clear' }, { room: 'A', do: 'clear' }, { room: 'A', do: 'chest' },
      { room: 'E', do: 'clear' }, { room: 'D', do: 'clear' }, { room: 'F', do: 'clear' }, { room: 'F', do: 'dig', at: 's' }, { room: 'I', do: 'clear' }, { room: 'I', do: 'stairs' },
    ],
  },
  mere: {
    id: 'mere', name: 'THE MERE', kind: 'holloway', music: 'dark', tint: 'rgba(20,50,90,0.2)',
    grid: [['A', 'B', 'C'], ['D', 'E', 'F'], ['G', 'H', 'I']],
    rooms: MERE_ROOMS, chests: MERE_CHESTS, mounds: MERE_MOUNDS, signs: {},
    exits: { 'H:s': { to: 'wood', at: 'culvert' } },
    boss: 'pike', mini: 'eelwife', keeping: 'THE OLD PIKE\'S HEART', verb: 'swim', hazard: 'spout',
    won: { title: 'THE MERE IS DONE', lines: ['Under the Pike there was a drowned chapel, and in it, the things the stream had taken for a hundred years: a bell, a ring, a whole cart.', 'And a mask. You leave the mask.', 'You kept THE LUNGS. You kept THE OLD PIKE\'S HEART. That is the law.'] },
    route: [
      { room: 'H', do: 'clear' }, { room: 'E', do: 'clear' }, { room: 'B', do: 'clear' }, { room: 'A', do: 'clear' }, { room: 'A', do: 'chest' },
      { room: 'E', do: 'clear' }, { room: 'D', do: 'clear' }, { room: 'F', do: 'clear' }, { room: 'F', do: 'swim', at: 's' }, { room: 'I', do: 'clear' }, { room: 'I', do: 'stairs' },
    ],
  },
};

// ---------------------------------------------------------------------------------------------
// PARSE
// ---------------------------------------------------------------------------------------------
export function areaRows(a) {
  if (a.rows) return a.rows;
  const rows = [];
  for (const gridRow of a.grid) {
    for (let r = 0; r < CELL_H; r++) rows.push(gridRow.map(id => a.rooms[id].rows[r]).join(''));
  }
  return rows;
}

const TILE_CH = { '#': K.WALL, '.': K.FLOOR, '%': K.SOFT, '*': K.MOUND, 'O': K.PIT, ',': K.GRASS, ':': K.DIRT, 'T': K.TREE, 'W': K.WATER, '=': K.PLANK, 'H': K.HOUSE, 'r': K.ROCK, 'b': K.BRAZIER, 'D': K.MOUTH, 'K': K.FLOOR, '^': K.FLOOR, '~': K.DEEP, 'V': K.CULVERT,
  'f': K.FLOWERS, 'y': K.MOSS, 'F': K.FENCE, 'C': K.CLIFF, 'u': K.STUMP, 'j': K.BUSH, 'g': K.STAL, 'k': K.CRATE, 'L': K.LAMP };
const DECO_CH = { m: 'mushroom', x: 'roots', p: 'puddle', l: 'tallgrass' };

export function parseArea(a) {
  const rows = areaRows(a);
  const W = rows[0].length, Hh = rows.length;
  for (const r of rows) if (r.length !== W) throw new Error(`${a.id}: row width ${r.length} != ${W}: "${r}"`);
  const tiles = new Uint8Array(W * Hh);
  const ents = [];        // {kind, x, y (tile), ...}
  const rooms = [];
  const under = a.kind === 'holloway' ? K.FLOOR : K.GRASS;
  const roomOf = (x, y) => a.kind === 'holloway' ? a.grid[Math.floor(y / CELL_H)][Math.floor(x / CELL_W)] : null;
  const chestCount = {}, moundCount = {};
  for (let y = 0; y < Hh; y++) for (let x = 0; x < W; x++) {
    const ch = rows[y][x];
    let k = TILE_CH[ch];
    if (k === undefined) k = under;
    tiles[y * W + x] = k;
    const rid = roomOf(x, y);
    if (ENEMY_CH[ch]) ents.push({ kind: 'enemy', id: ENEMY_CH[ch], x, y, room: rid });
    else if (ch === 'c') { const n = (chestCount[rid] = (chestCount[rid] || 0) + 1); ents.push({ kind: 'chest', x, y, room: rid, item: ((a.chests || {})[rid] || [])[n - 1] || 'gold', key: `${a.id}:${x},${y}` }); tiles[y * W + x] = K.ROCK; }
    else if (ch === '*') { const n = (moundCount[rid] = (moundCount[rid] || 0) + 1); ents.push({ kind: 'mound', x, y, room: rid, item: ((a.mounds || {})[rid] || [])[n - 1] || 'gold', key: `${a.id}:${x},${y}` }); }
    else if (ch === 's') ents.push({ kind: 'bones', x, y, room: rid });
    else if (ch === 'S') ents.push({ kind: 'sign', x, y, room: rid, lines: (a.signs || {}).S || ['...'] });
    else if (ch === 'h') ents.push({ kind: 'heart', x, y, room: rid });
    else if (ch === 'K') ents.push({ kind: 'lock', x, y, room: rid, key: `${a.id}:${x},${y}` });
    else if (ch === '^') ents.push({ kind: 'stairs', x, y, room: rid });
    else if (ch === '@') ents.push({ kind: 'start', x, y, room: rid });
    else if (ch === '!') ents.push({ kind: 'dripspot', x, y, room: rid });
    else if (ch === 'D') ents.push({ kind: 'mouth', x, y, room: rid });
    else if (ch === 'V') ents.push({ kind: 'culvert', x, y, room: rid });
    else if (DECO_CH[ch]) ents.push({ kind: 'deco', sub: DECO_CH[ch], x, y, room: rid });
    else if (/[1-9]/.test(ch)) { const def = (a.npcs || []).find(n => n.idx === +ch); if (def) ents.push({ kind: 'npc', x, y, room: rid, def }); }
  }
  // the chest tile is a rock for collision purposes; mark it back to floor so the sprite is drawn on earth
  for (const e of ents) if (e.kind === 'chest') tiles[e.y * W + e.x] = K.FLOOR;
  if (a.kind === 'holloway') {
    for (let gy = 0; gy < a.grid.length; gy++) for (let gx = 0; gx < a.grid[gy].length; gx++) {
      const id = a.grid[gy][gx];
      rooms.push({ id, name: a.rooms[id].name, gx, gy, x: gx * CELL_W, y: gy * CELL_H, w: CELL_W, h: CELL_H });
    }
  }
  const out = { id: a.id, def: a, W, H: Hh, tiles, ents, rooms };
  dress(out); return out;
}

// ---------------------------------------------------------------------------------------------
// DRESS — every screen gets furniture to a measured density, deterministically, without ever blocking a route:
// flat decoration anywhere on open ground away from doors; solid props only where all four neighbours are open
// and nothing authored is within a tile. Targets are per 100 walkable tiles (tools/quality.mjs prints the result).
// ---------------------------------------------------------------------------------------------
function dress(area) {
  const a = area.def; const rnd = mulberry(a.id.length * 131 + 7);
  const t = (x, y) => (x < 0 || y < 0 || x >= area.W || y >= area.H) ? K.WALL : area.tiles[y * area.W + x];
  const holl = a.kind === 'holloway';
  const taken = new Set(); for (const e of area.ents) { taken.add(e.x + ',' + e.y); for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) taken.add((e.x + dx) + ',' + (e.y + dy)); }
  const isDoorish = (x, y) => { if (!holl) return false; const lx = x % CELL_W, ly = y % CELL_H; return lx <= 1 || lx >= CELL_W - 2 || ly <= 1 || ly >= CELL_H - 2; };
  const open = (x, y) => { const k = t(x, y); return holl ? k === K.FLOOR : (k === K.GRASS || k === K.FLOWERS); };
  const regions = holl ? area.rooms.map(r => ({ x0: r.x + 1, y0: r.y + 1, x1: r.x + r.w - 1, y1: r.y + r.h - 1, id: r.id })) : [{ x0: 2, y0: 2, x1: area.W - 2, y1: area.H - 2, id: 'wood' }];
  for (const R of regions) {
    let walk = 0, have = 0; for (let y = R.y0; y < R.y1; y++) for (let x = R.x0; x < R.x1; x++) { const k = t(x, y); if (!SOLID.has(k) && k !== K.PIT) walk++; }
    for (const e of area.ents) if (e.kind !== 'enemy' && e.kind !== 'start' && e.kind !== 'dripspot' && e.x >= R.x0 && e.x < R.x1 && e.y >= R.y0 && e.y < R.y1) have++;
    const want = Math.max(0, Math.round(walk * (holl ? 0.07 : 0.09)) - have);
    let placed = 0, tries = 0;
    while (placed < want && tries++ < 4000) {
      const x = R.x0 + Math.floor(rnd() * (R.x1 - R.x0)), y = R.y0 + Math.floor(rnd() * (R.y1 - R.y0)); const key = x + ',' + y;
      if (!open(x, y) || taken.has(key) || isDoorish(x, y)) continue;
      const solidOk = !holl || placed % 3 === 2; // in a room every third piece may be solid; the wood is looser
      const r = rnd();
      if (holl) {
        if (solidOk && r < 0.25 && [[1, 0], [-1, 0], [0, 1], [0, -1]].every(([dx, dy]) => open(x + dx, y + dy) && !taken.has((x + dx) + ',' + (y + dy)))) area.tiles[y * area.W + x] = r < 0.15 ? K.STAL : K.CRATE;
        else if (r < 0.5) area.tiles[y * area.W + x] = K.MOSS;
        else area.ents.push({ kind: 'deco', sub: r < 0.75 ? 'mushroom' : r < 0.9 ? 'roots' : 'puddle', x, y, room: R.id });
      } else {
        if (r < 0.22 && [[1, 0], [-1, 0], [0, 1], [0, -1]].every(([dx, dy]) => open(x + dx, y + dy) && !taken.has((x + dx) + ',' + (y + dy)))) area.tiles[y * area.W + x] = r < 0.16 ? K.BUSH : K.STUMP;
        else if (r < 0.55) area.tiles[y * area.W + x] = K.FLOWERS;
        else area.ents.push({ kind: 'deco', sub: r < 0.85 ? 'tallgrass' : 'mushroom', x, y, room: null });
      }
      taken.add(key); placed++;
    }
  }
}

// door cells of a room: positions on its wall ring that are not wall
export function roomDoors(area, room) {
  const out = [];
  const { tiles, W } = area;
  const isDoor = (x, y) => tiles[y * W + x] !== K.WALL;
  for (let x = room.x + 1; x < room.x + room.w - 1; x++) { if (isDoor(x, room.y)) out.push({ x, y: room.y, side: 'n' }); if (isDoor(x, room.y + room.h - 1)) out.push({ x, y: room.y + room.h - 1, side: 's' }); }
  for (let y = room.y + 1; y < room.y + room.h - 1; y++) { if (isDoor(room.x, y)) out.push({ x: room.x, y, side: 'w' }); if (isDoor(room.x + room.w - 1, y)) out.push({ x: room.x + room.w - 1, y, side: 'e' }); }
  return out;
}
