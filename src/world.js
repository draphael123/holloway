// world.js — every area as ASCII, parsed into tiles + entities. Pure data: no DOM, so tools/audit.mjs can
// import it under node. A holloway is a grid of rooms, each one screen (20×11 tiles); the wood is free-scroll.
//
// LEGEND
//   #  rock wall          .  earth floor        %  soft earth (dig)   *  mound (dig, buried loot)
//   O  pit                ,  grass              :  dirt road          T  tree              W  water
//   =  plank bridge       H  house footprint    r  rock (blocks)      b  brazier (blocks)  s  bones (deco)
//   c  chest              S  sign / tablet      h  heart              K  locked door cell  ^  stairs (boss exit)
//   @  start / entry      D  warren mouth       !  falling-rock spot  1-9 NPC index
//   i  bramble imp   t  bog rat   a  thornshot   w  warren warden   M  the Digger   B  the Old Brock

export const TS = 16;
export const CELL_W = 20, CELL_H = 11;

export const K = { WALL: 1, FLOOR: 2, SOFT: 3, MOUND: 4, PIT: 5, GRASS: 6, DIRT: 7, TREE: 8, WATER: 9, PLANK: 10, HOUSE: 11, ROCK: 12, BRAZIER: 13, MOUTH: 14, STAIRS: 15 };
export const SOLID = new Set([K.WALL, K.SOFT, K.MOUND, K.TREE, K.WATER, K.HOUSE, K.ROCK, K.BRAZIER]);
export const DIGGABLE = new Set([K.SOFT, K.MOUND]);

const ENEMY_CH = { i: 'imp', t: 'rat', a: 'archer', w: 'warden', M: 'digger', B: 'brock' };

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
      'TTTTTTTTTTTTTTTTTTTTDDTTTTTTTTTTTTTTTTTT',
      'TTTT,,,,,,,,,,,,,,,,::,,,,,,,,,,,,,,,TTT',
      'TTT,,,,,,,T,,,,,,,,,::,,,,,,T,,,,,,,,TTT',
      'TT,,,,i,,,,,,,,,,,,,::,,,,,,,,,,i,,,,,TT',
      'TT,,,,,,,,,,r,,,,,,,::,,,,,,,,,,,,,,T,TT',
      'TT,,T,,,,,,,,,,,,,,,::,,,,r,,,,,,,,,,,TT',
      'TT,,,,,,,,,i,,,,,,,,::,,,,,,,,,,,,,,,,TT',
      'TWWWWWWWWWWWWWWWWWWW==WWWWWWWWWWWWWWWWWT',
      'TT,,,,,,,,,,,,,,,,,,::,,,,,,,,,,,,,,,,TT',
      'TT,,,T,,,,,,,,,,,,,,::,,,,,,,,,,,,T,,,TT',
      'TT,,,,,,,,,,,,,,,,,,::,,,,,,,,,,,,,,,,TT',
      'TT,,,,,,,,,,,,,,,,,,::,,,,,,,,,,,,,,,,TT',
      'TT,,,,,,,,,,,,,,,,,,::,,,,,,,,,,,,,,,,TT',
      'TT,,,,,T,,,,,,,,,,,,::,,,,,HHHH,,,,,,,TT',
      'TT,,,,,,,,,,,,,,,,,,::,,,,,HHHH,,,,,,,TT',
      'TT,,,,,,,,,,,,,,,,,,::,,,,,HHHH,,T,,,,TT',
      'TT,,,,,,,,,,,1,,,,,,::::::::2,,,,,,,,,TT',
      'TT,,,,,,,,,,,,,,,,,,::,,,,,,,,,,,,,,,,TT',
      'TT,,,T,,,,,,,,,,,S,,::,,,,,,,,,,,,,,,,TT',
      'TT,,,,,,,,,,,,,,,,,,@:,,,,,,,,T,,,,,,,TT',
      'TTT,,,,,,,,,,,,,,,,,::,,,,,,,,,,,,,,,TTT',
      'TTTT,,,,,,,,,,,,,,,,::,,,,,,,,,,,,,,TTTT',
      'TTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTT',
    ],
    houses: [{ x: 27, y: 14, w: 4, d: 3, H: 28, name: 'PELL\'S COTTAGE', door: { u: 1.5 }, windows: [{ u: 0.3, v: 10, box: true }, { u: 3.0, v: 10, shutters: true }], chimney: true, wallKey: 'plaster', roofKey: 'thatch' }],
    npcs: [
      { idx: 1, name: 'WARDEN HESK', look: { hair: '#3a2a1a', skin: '#d9a978', tunic: '#5f7a3a', pants: '#4a4a55', boots: '#2a2a2a', accent: '#c9a227', hat: '#6a5a3a' },
        lines: ['HESK: The Pell boy went under the roots three days back. The wood keeps what it takes.', 'HESK: The warren mouth is north, over the stream. Rats and worse in there.', 'HESK: Whatever you take from the wood, you keep. That is the only law down there.'],
        after: ['HESK: You brought him back. Nobody has done that. Nobody.', 'HESK: There are older holloways than the warren. Deeper. When you are ready.'] },
      { idx: 2, name: 'MOTHER PELL', look: { hair: '#6b3f22', skin: '#f2c9a0', tunic: '#8a4a5a', pants: '#8a4a5a', boots: '#3a2a1a', dress: true, accent: '#f7f2e6' },
        lines: ['PELL: He only went to fetch the goat. The goat came back.', 'PELL: If you find him... if you find anything of his...'],
        after: ['PELL: He is asleep. He will not say what he saw. Thank you. Thank you.'] },
    ],
    signs: { S: ['ARROWS or WASD to walk. X cuts, hold X for THE HEAVY BLOW.', 'C guards. TAP C as a blow lands to PARRY. Z rolls.', 'SPACE talks and opens. TAB is your pack: skills, charms, the bestiary.'] },
    exits: { mouth: { to: 'warren', at: 'entry' } },
    freeCamera: true,
  },
  warren: {
    id: 'warren', name: 'THE WARREN', kind: 'holloway', music: 'warren',
    grid: [['A', 'B', 'C'], ['D', 'E', 'F'], ['G', 'H', 'I']],
    rooms: WARREN_ROOMS, chests: WARREN_CHESTS, mounds: WARREN_MOUNDS, signs: WARREN_SIGNS,
    // the door out of H's south wall leads back to the wood, standing under the mouth
    exits: { 'H:s': { to: 'wood', at: 'mouth' } },
    boss: 'brock', mini: 'digger', keeping: 'THE BROCK\'S HEART',
    // the intended route, for the bot and the audit's staged reachability
    route: [
      { room: 'H', do: 'clear' }, { room: 'E', do: 'clear' }, { room: 'B', do: 'clear' }, { room: 'A', do: 'clear' }, { room: 'A', do: 'chest' },
      { room: 'E', do: 'clear' }, { room: 'D', do: 'clear' }, { room: 'F', do: 'clear' }, { room: 'F', do: 'dig', at: 's' }, { room: 'I', do: 'clear' }, { room: 'I', do: 'stairs' },
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

const TILE_CH = { '#': K.WALL, '.': K.FLOOR, '%': K.SOFT, '*': K.MOUND, 'O': K.PIT, ',': K.GRASS, ':': K.DIRT, 'T': K.TREE, 'W': K.WATER, '=': K.PLANK, 'H': K.HOUSE, 'r': K.ROCK, 'b': K.BRAZIER, 'D': K.MOUTH, 'K': K.FLOOR, '^': K.FLOOR };

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
  return { id: a.id, def: a, W, H: Hh, tiles, ents, rooms };
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
