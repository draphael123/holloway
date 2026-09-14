// HOLLOWAY — a 16-bit top-down action RPG. One hero, no classes: what you take from the wood, you keep.
import { canvas, mulberry, outline, fromGrid } from './px.js';
import * as ART from './art.js';
import * as DA from './dungeon_art.js';
import * as CH from './chars.js';
import * as GB from './goblins.js';
import { T as TSET, OVER, CAVE, loadTileset, bakePerson } from './tileset.js';
import { text, textW, wrap, fitText } from './font.js';
import { AREAS, parseArea, roomDoors, K, SOLID, DIGGABLE, SWIMMABLE, GRASSY, CELL_W, CELL_H } from './world.js';
import { boot as audioBoot, sfx, settings as AUD, apply as audioApply, playMusic, stopMusic } from './audio.js';

const BW = 320, BH = 180, TS = 16;
const TAU = Math.PI * 2;
const clamp = (v, a, b) => v < a ? a : v > b ? b : v;
const lerp = (a, b, t) => a + (b - a) * t;
const dist = (ax, ay, bx, by) => Math.hypot(bx - ax, by - ay);
const angDiff = (a, b) => { let d = (b - a) % TAU; if (d > Math.PI) d -= TAU; if (d < -Math.PI) d += TAU; return d; };
const FACE_ANG = { right: 0, down: Math.PI / 2, left: Math.PI, up: -Math.PI / 2 };
const faceOf = (dx, dy) => Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 'right' : 'left') : (dy > 0 ? 'down' : 'up');
const faceOfAng = a => faceOf(Math.cos(a), Math.sin(a));
// on a diagonal keep the facing you already have while that key is still down; otherwise sideways wins (the CT rule)
function pickFacing(mx, my, cur) {
  if ((cur === 'left' && mx < 0) || (cur === 'right' && mx > 0) || (cur === 'up' && my < 0) || (cur === 'down' && my > 0)) return cur;
  if (Math.abs(mx) >= Math.abs(my) && mx !== 0) return mx > 0 ? 'right' : 'left';
  return my > 0 ? 'down' : my < 0 ? 'up' : cur;
}

// ---------------------------------------------------------------------------------------------
// DISPLAY — DPR-correct integer scaling of a 320×180 buffer
// ---------------------------------------------------------------------------------------------
const disp = document.getElementById('c'); const dg = disp.getContext('2d');
const [buf, g] = canvas(BW, BH);
let SC = 3, offX = 0, offY = 0, DPR = 1;
function resize() {
  DPR = Math.min(3, window.devicePixelRatio || 1);
  disp.width = Math.floor(innerWidth * DPR); disp.height = Math.floor(innerHeight * DPR);
  SC = Math.max(1, Math.floor(Math.min(disp.width / BW, disp.height / BH)));
  offX = Math.floor((disp.width - BW * SC) / 2); offY = Math.floor((disp.height - BH * SC) / 2);
  dg.imageSmoothingEnabled = false;
}
addEventListener('resize', resize); resize();

// ---------------------------------------------------------------------------------------------
// INPUT — menus take only Z / ENTER / SPACE / X. Never a direction.
// ---------------------------------------------------------------------------------------------
const keys = new Set(); let pressed = new Set();
const KEYS = {
  up: ['ArrowUp', 'KeyW', 'PadUp'], down: ['ArrowDown', 'KeyS', 'PadDown'], left: ['ArrowLeft', 'KeyA', 'PadLeft'], right: ['ArrowRight', 'KeyD', 'PadRight'],
  attack: ['KeyX', 'KeyJ', 'PadX'], guard: ['KeyC', 'KeyL', 'ShiftLeft', 'ShiftRight', 'PadB', 'PadRB', 'PadLB'], roll: ['KeyZ', 'KeyK', 'PadA'], interact: ['Space', 'Enter', 'KeyE', 'PadY'],
  menu: ['Tab', 'KeyI', 'PadSelect'], pause: ['Escape', 'KeyP', 'PadStart'], take: ['KeyZ', 'Enter', 'Space', 'KeyX', 'PadA', 'PadX'], back: ['Escape', 'KeyC', 'Backspace', 'PadB'],
};
// a gamepad is read every tick and turned into the same virtual codes (A roll / take, X cut, B guard / back, Y talk)
const PAD_BTN = { 0: 'PadA', 1: 'PadB', 2: 'PadX', 3: 'PadY', 4: 'PadLB', 5: 'PadRB', 8: 'PadSelect', 9: 'PadStart', 12: 'PadUp', 13: 'PadDown', 14: 'PadLeft', 15: 'PadRight' };
const padDown = new Set(); let padSeen = false;
function pollPad() {
  const pads = navigator.getGamepads ? navigator.getGamepads() : []; let pad = null; for (const p of pads) if (p && p.connected) { pad = p; break; }
  if (!pad) { if (padDown.size) { for (const c of padDown) keys.delete(c); padDown.clear(); } return; }
  const now = new Set();
  for (const i in PAD_BTN) { const b = pad.buttons[i]; if (b && (b.pressed || b.value > 0.5)) now.add(PAD_BTN[i]); }
  const ax = pad.axes[0] || 0, ay = pad.axes[1] || 0;
  if (ax < -0.45) now.add('PadLeft'); if (ax > 0.45) now.add('PadRight'); if (ay < -0.45) now.add('PadUp'); if (ay > 0.45) now.add('PadDown');
  for (const c of now) if (!padDown.has(c)) { keys.add(c); pressed.add(c); if (!padSeen) { padSeen = true; audioBoot(); playMusic(musicUrl(), musicName()); toast('PAD: A STEPS  X CUTS  B GUARDS  Y TALKS', 3, '#9ad0ff'); } }
  for (const c of padDown) if (!now.has(c)) keys.delete(c);
  padDown.clear(); for (const c of now) padDown.add(c);
}
const MUSIC = { theme: 'audio/theme.ogg', dark: 'audio/descent.ogg', drowned: 'audio/drowned.ogg' };
const musicName = () => (area && MUSIC[area.def.music]) ? area.def.music : 'theme';
const musicUrl = () => MUSIC[musicName()];
const held = k => KEYS[k].some(c => keys.has(c));
const press = k => KEYS[k].some(c => pressed.has(c));
addEventListener('keydown', e => {
  if (e.repeat) return; keys.add(e.code); pressed.add(e.code); audioBoot(); playMusic(musicUrl(), musicName());
  if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space', 'Tab'].includes(e.code)) e.preventDefault();
});
addEventListener('keyup', e => keys.delete(e.code));
addEventListener('blur', () => keys.clear());
addEventListener('pointerdown', () => { audioBoot(); playMusic(musicUrl(), musicName()); });

// ---------------------------------------------------------------------------------------------
// DATA — creatures, skills, charms
// ---------------------------------------------------------------------------------------------
const ENEMIES = {
  imp: { name: 'GOBLIN CUTTER', hp: 24, spd: 46, r: 6, xp: 6, gold: [1, 3], dmg: 8, aggro: 96, mat: 'flesh', tn: { LUNGE: 'STAB' },
    blurb: 'The common goblin of the holloways, with a knife and no patience. It winds up and stabs. Roll through it, or parry the stab.', tells: ['STAB'],
    drops: [{ item: 'heart', rate: 0.12 }, { item: 'charm:thornband', rate: 0.03 }] },
  rat: { name: 'GOBLIN WHELP', hp: 14, spd: 70, r: 5, xp: 4, gold: [0, 2], dmg: 5, aggro: 110, mat: 'flesh', tn: { BITE: 'NIP' },
    blurb: 'A goblin child, and they come in litters. The nip is nothing; six of them is something.', tells: ['NIP'],
    drops: [{ item: 'heart', rate: 0.1 }, { item: 'charm:ratfoot', rate: 0.03 }] },
  archer: { name: 'GOBLIN SLINGER', hp: 20, spd: 40, r: 6, xp: 8, gold: [2, 4], dmg: 9, aggro: 150, mat: 'flesh', tn: { DRAW: 'SLING' },
    blurb: 'A hooded goblin with a sling. It keeps its distance and it is not a bad shot. Close it, or guard the stone.', tells: ['SLING'],
    drops: [{ item: 'heart', rate: 0.12 }, { item: 'charm:thornband', rate: 0.04 }] },
  warden: { name: 'GOBLIN SHIELDBEARER', hp: 44, spd: 34, r: 8, xp: 14, gold: [3, 6], dmg: 9, aggro: 100, mat: 'flesh',
    blurb: 'The tribe\'s doorkeeper, behind a round shield. The shield turns a sword. It does not turn THE HEAVY BLOW.', tells: ['SHOVE'],
    drops: [{ item: 'heart', rate: 0.15 }, { item: 'charm:brockhide', rate: 0.04 }] },
  digger: { name: 'THE DIGGER', hp: 170, spd: 44, r: 12, xp: 60, gold: [12, 20], dmg: 12, aggro: 400, mat: 'flesh', big: true, mini: true,
    blurb: 'The mole reeve of the warren. It goes under and comes up where you stand: watch the ring in the dirt. Its claws are the way to the Brock.', tells: ['BURROW', 'SWIPE', 'THROW'],
    drops: [{ item: 'claw', rate: 1 }] },
  brock: { name: 'THE OLD BROCK', hp: 440, spd: 40, r: 18, xp: 200, gold: [30, 50], dmg: 16, aggro: 400, mat: 'flesh', big: true, boss: true,
    blurb: 'The badger the warren was dug for. It charges the length of the room and stuns itself on the wall: that is your window. It shakes the roof down. It goes under.', tells: ['CHARGE', 'SWIPE', 'QUAKE', 'DIG'],
    drops: [{ item: 'keeping', rate: 1 }] },
  newt: { name: 'BOG GOBLIN', hp: 18, spd: 74, r: 6, xp: 7, gold: [1, 3], dmg: 7, aggro: 110, mat: 'flesh', swims: true, ai: 'imp', tn: { LUNGE: 'LEAP' },
    blurb: 'A goblin of the drowned tribe, with a reed spear. It swims, and it leaps at you out of the water. You cannot follow it in with a sword.', tells: ['LEAP'],
    drops: [{ item: 'heart', rate: 0.12 }, { item: 'charm:eelskin', rate: 0.03 }] },
  drowned: { name: 'DROWNED GOBLIN', hp: 52, spd: 26, r: 8, xp: 16, gold: [3, 7], dmg: 12, aggro: 90, mat: 'flesh', ai: 'drowned',
    blurb: 'A goblin the stream took and gave back wrong. Slow, swollen, and it does not mind the sword much. The grab holds you: roll before the hands close.', tells: ['GRAB'],
    drops: [{ item: 'heart', rate: 0.18 }, { item: 'charm:mothsilk', rate: 0.04 }] },
  eelwife: { name: 'THE EELWIFE', hp: 200, spd: 48, r: 12, xp: 80, gold: [15, 25], dmg: 13, aggro: 400, mat: 'flesh', big: true, mini: true, swims: true, ai: 'digger', tn: { BURROW: 'COIL', SWIPE: 'LASH', THROW: 'SPIT' },
    blurb: 'A great eel wearing a drowned woman\'s mask. It coils under the water and comes up where you stand. Its lungs are the way into the Pike\'s pool.', tells: ['COIL', 'LASH', 'SPIT'],
    drops: [{ item: 'lungs', rate: 1 }] },
  pike: { name: 'THE OLD PIKE', hp: 460, spd: 46, r: 20, xp: 260, gold: [40, 60], dmg: 18, aggro: 400, mat: 'flesh', big: true, boss: true, swims: true, ai: 'brock', spray: true, spawn: 'newt', tn: { CHARGE: 'SURGE', SWIPE: 'SNAP', QUAKE: 'SPRAY', DIG: 'SUBMERGE' },
    blurb: 'The pike the mere was dug for. It surges the length of its pool and beaches itself on the wall: that is your window. It sprays. It goes under. Fight it from the land, it cannot be cut from the water.', tells: ['SURGE', 'SNAP', 'SPRAY', 'SUBMERGE'],
    drops: [{ item: 'keeping', rate: 1 }] },
};
const tn = (e, kind) => (e.def.tn && e.def.tn[kind]) || kind;
const whoOf = e => e.def.swims ? 'swimmer' : 'enemy';
const SKILLS = [
  { id: 'blade1', branch: 0, tier: 0, name: 'LONG SWING', desc: 'The sword reaches six more.' },
  { id: 'blade2', branch: 0, tier: 1, name: 'THE THIRD CUT', desc: 'The thrust does double and carries you.' },
  { id: 'blade3', branch: 0, tier: 2, name: 'CLEAVE', desc: 'Every cut is a wide one.' },
  { id: 'guard1', branch: 1, tier: 0, name: 'WIDE WINDOW', desc: 'The parry window is half again as long.' },
  { id: 'guard2', branch: 1, tier: 1, name: 'RIPOSTE', desc: 'After a parry the next blow does double.' },
  { id: 'guard3', branch: 1, tier: 2, name: 'STONEWALL', desc: 'The guard costs half and takes almost nothing.' },
  { id: 'foot1', branch: 2, tier: 0, name: 'QUICK FEET', desc: 'Walk a tenth faster.' },
  { id: 'foot2', branch: 2, tier: 1, name: 'LONG STEP', desc: 'The step goes a third further.' },
  { id: 'foot3', branch: 2, tier: 2, name: 'SECOND WIND', desc: 'Stamina comes back half again as fast.' },
];
const BRANCH = ['BLADE', 'GUARD', 'FOOT'];
const CHARMS = {
  thornband: { name: 'THORNBAND', col: '#5a9a3a', desc: 'A ring of bramble. Every blow does a little more.' },
  ratfoot: { name: 'RATFOOT', col: '#8a7562', desc: 'Dried and strung. The step is cheap and quick.' },
  brockhide: { name: 'BROCKHIDE', col: '#7c7c8a', desc: 'A strip of striped hide. You take a fifth less.' },
  mothsilk: { name: 'MOTHSILK', col: '#e6dcc4', desc: 'Spun by something in the wood. Stamina comes back a third faster.' },
  eelskin: { name: 'EELSKIN', col: '#4a7a68', desc: 'Slick and cold. You swim a third faster and the dive is nearly free.' },
  pikescale: { name: 'PIKESCALE', col: '#7a9a4a', desc: 'One armoured scale. THE HEAVY BLOW does a quarter more.' },
};
// the pedlar's table; `once` items sell one time per save
const SHOP = [
  { id: 'cap', name: 'RED CAP', price: 12, desc: 'A mushroom. Eat it now: +30 heart.' },
  { id: 'bottle', name: 'A BOTTLED HEART', price: 60, desc: '+10 heart, for keeps.', once: true },
  { id: 'charm:mothsilk', name: 'MOTHSILK', price: 45, desc: 'A charm. Stamina comes back a third faster.', once: true },
  { id: 'charm:pikescale', name: 'PIKESCALE', price: 80, desc: 'A charm. The heavy blow does a quarter more.', once: true, after: 'mere' },
];
const has = id => !!P.skills[id];
const wearing = id => P.equipped.includes(id);

// ---------------------------------------------------------------------------------------------
// SPRITES — everything baked once
// ---------------------------------------------------------------------------------------------
const SPR = {};
function bakeAll() {
  SPR.hero = CH.bakeHero(); SPR.swords = CH.bakeSwords(); SPR.shield = CH.bakeShield(); SPR.claw = CH.bakeClawHand();
  SPR.creature = { imp: GB.bakeGoblin(GB.CUTTER), rat: GB.bakeGoblin(GB.WHELP), archer: GB.bakeGoblin(GB.SLINGER), warden: GB.bakeGoblin(GB.SHIELDBEARER), digger: CH.bakeDigger(), brock: CH.bakeBrock(), newt: GB.bakeGoblin(GB.BOG), drowned: GB.bakeGoblin(GB.DROWNED), eelwife: CH.bakeEelwife(), pike: CH.bakePike() };
  SPR.ripple = [0, 1, 2].map(f => DA.bakeRipple(f)); SPR.spout = [0, 1, 2].map(f => DA.bakeSpout(f)); SPR.culvert = [DA.bakeCulvert(false), DA.bakeCulvert(true)];
  SPR.arrow = CH.bakeArrow(); SPR.clod = CH.bakeClod();
  SPR.earth = [0, 1, 2, 3].map(i => DA.bakeEarth(11 + i));
  SPR.wall = Array.from({ length: 16 }, (_, m) => [0, 1].map(i => DA.bakeWallTile(50 + i + m * 3, m)));
  SPR.soft = [0, 1, 2].map(i => DA.bakeSoft(90 + i)); SPR.mound = DA.bakeMound();
  SPR.pit = Array.from({ length: 16 }, (_, m) => DA.bakePit(m));
  SPR.gate = DA.bakeGate(); SPR.lock = DA.bakeLock(); SPR.chest = [DA.bakeChest(false), DA.bakeChest(true)];
  SPR.brazier = [0, 1, 2].map(f => DA.bakeBrazier(f)); SPR.bones = [0, 1, 2].map(i => DA.bakeBones(30 + i)); SPR.rock = [0, 1, 2].map(i => DA.bakeRock(60 + i));
  SPR.stairs = DA.bakeStairs(); SPR.heart = [DA.bakeHeart(0), DA.bakeHeart(1)]; SPR.coin = [0, 1, 2, 3].map(f => DA.bakeCoin(f)); SPR.key = DA.bakeKey();
  SPR.charm = {}; for (const id in CHARMS) SPR.charm[id] = DA.bakeCharmIcon(CHARMS[id].col);
  SPR.clawIcon = DA.bakeClawIcon(); SPR.marker = DA.bakeMarker(12, '#ffb347'); SPR.markerBig = DA.bakeMarker(18, '#ff6a3a'); SPR.fallRock = DA.bakeFallingRock();
  SPR.mouth = DA.bakeMouth(); SPR.shadow = DA.shadowSmall(); SPR.shadowBig = DA.shadowBig();
  SPR.grass = [0, 1, 2, 3].map(i => ART.bakeGrass(100 + i)); SPR.flowers = [0, 1].map(i => ART.bakeFlowers(300 + i));
  SPR.dirt = Array.from({ length: 16 }, (_, m) => [0, 1].map(i => ART.bakeDirt(400 + i + m * 5, m)));
  SPR.water = Array.from({ length: 16 }, (_, m) => [0, 1, 2, 3].map(f => ART.bakeWater(f, m))); SPR.plank = ART.bakePlank(500);
  SPR.deep = SPR.water.map(frames => frames.map((w, f) => DA.bakeDeep(w, f)));
  SPR.lungsIcon = (() => { const [c, g] = canvas(12, 12); g.fillStyle = '#4a7a68'; g.fillRect(1, 3, 4, 8); g.fillRect(7, 3, 4, 8); g.fillStyle = '#7ab6a0'; g.fillRect(2, 4, 2, 3); g.fillRect(8, 4, 2, 3); g.fillStyle = '#e6dcc4'; g.fillRect(5, 1, 2, 6); return outline(c, '#1b1626'); })();
  SPR.trees = [0, 1, 2, 3, 4, 5].map(i => ART.bakeTree(700 + i, i >= 4)); SPR.bush = [0, 1, 2].map(i => ART.bakeBush(800 + i));
  SPR.signpost = ART.bakeSignpost(); SPR.stall = ART.bakeStall('#c9452e'); SPR.lamp = ART.bakeLamp(); SPR.crate = ART.bakeCrate();
  SPR.moss = [0, 1, 2].map(i => DA.bakeMoss(SPR.earth[i], 500 + i)); SPR.mossDecal = [0, 1, 2].map(i => { const [c, gg] = canvas(16, 16); const rnd = mulberry(700 + i); for (let n = 0; n < 28; n++) { const x = Math.floor(rnd() * 16), y = Math.floor(rnd() * 16); gg.fillStyle = rnd() < 0.3 ? '#4a7a3a' : '#3a6a34'; gg.fillRect(x, y, 1, 1); if (rnd() < 0.4) { gg.fillStyle = '#5a8a44'; gg.fillRect(x + 1, y, 1, 1); } } return c; }); SPR.mushrooms = [0, 1, 2].map(i => DA.bakeMushrooms(520 + i)); SPR.roots = [0, 1].map(i => DA.bakeRoots(540 + i)); SPR.puddle = [0, 1, 2].map(f => DA.bakePuddle(f)); SPR.tallgrass = [0, 1, 2].map(i => DA.bakeTallGrass(560 + i)); SPR.stump = [0, 1].map(i => DA.bakeStump(580 + i)); SPR.stal = [0, 1, 2].map(i => DA.bakeStalagmite(600 + i)); SPR.cliffTop = [0, 1].map(i => DA.bakeCliffTop(620 + i)); SPR.cliffFace = [0, 1].map(i => DA.bakeCliffFace(640 + i)); SPR.fenceTile = DA.bakeFenceTile(); SPR.butterfly = [['#f4d35e', 0], ['#f4d35e', 1], ['#fbf6ea', 0], ['#fbf6ea', 1]].map(([c, f]) => ART.bakeButterfly(f, c));
  SPR.bubble = outline(fromGrid(['.wwwww.', 'wwwwwww', 'ww.w.ww', 'wwwwwww', '.wwwww.', '..ww...', '..w....'], { w: '#fff8e8' }, 1));
  SPR.house = ART.bakeBuilding({ w: 4, d: 3, H: 28, wall: { lit: '#efe3c8', timber: '#6e4a2e' }, roof: { lite: '#e6c46e', mid: '#c49a3f', dark: '#8a6a2a' }, chimney: true, door: { u: 1.5 }, windows: [{ u: 0.3, v: 10, box: true }, { u: 3.0, v: 10, shutters: true }] });
}

// ---------------------------------------------------------------------------------------------
// SAVE
// ---------------------------------------------------------------------------------------------
const SAVE_KEY = 'holloway.save.v1';
function progDefaults() {
  return { lvl: 1, xp: 0, pts: 0, maxHp: 60, hp: 60, maxSt: 100, might: 0, gold: 0, keys: 0, skills: {}, charms: [], equipped: [null, null], abilities: {}, keepings: 0,
    cleared: {}, opened: {}, dug: {}, unlocked: {}, dead: {}, seen: {}, kills: {}, quest: {}, checkpoint: { area: 'wood', at: 'start' }, tutorial: false, settings: { sfx: 0.8, music: 0.5, shake: true, help: true } };
}
let PROG = progDefaults();
function save() { try { PROG.hp = P.hp; PROG.maxHp = P.maxHp; PROG.maxSt = P.maxSt; PROG.lvl = P.lvl; PROG.xp = P.xp; PROG.pts = P.pts; PROG.might = P.might; PROG.gold = P.gold; PROG.keys = P.keys; PROG.skills = P.skills; PROG.charms = P.charms; PROG.equipped = P.equipped; PROG.abilities = P.abilities; PROG.keepings = P.keepings; localStorage.setItem(SAVE_KEY, JSON.stringify(PROG)); } catch (e) {} }
function loadSave() { try { const s = localStorage.getItem(SAVE_KEY); if (s) { PROG = Object.assign(progDefaults(), JSON.parse(s)); PROG.settings = Object.assign(progDefaults().settings, PROG.settings || {}); return true; } } catch (e) {} return false; }
function hasSave() { try { return !!localStorage.getItem(SAVE_KEY); } catch (e) { return false; } }
function applySettings() { AUD.sfx = PROG.settings.sfx; AUD.music = PROG.settings.music; audioApply(); }

// ---------------------------------------------------------------------------------------------
// WORLD STATE
// ---------------------------------------------------------------------------------------------
let area = null;              // parsed area + runtime lists
let enemies = [], props = [], pickups = [], projectiles = [], rocks = [], fx = [], floaters = [], npcs = [], chests = [], mounds = [], signs = [], locks = [], drips = [], stairsAt = null, mouthAt = null, culvertAt = null;
let rooms = [], roomById = {}, curRoom = null, sealed = false, roomBanner = { t: 0, name: '' };
const cam = { x: 0, y: 0, tx: 0, ty: 0, slide: 0, fx: 0, fy: 0 };
let time = 0, hitstop = 0, shake = 0, slowT = 0;
let toasts = []; let lastTellT = 0;
let state = 'title'; let menu = { i: 0, tab: 0, sel: 0, sub: 0 };
let talk = null, deadT = 0, wonT = 0, introT = 0, tut = null;
let god = false;

const P = { x: 0, y: 0, facing: 'down', moving: false, walk: 0, hp: 60, maxHp: 60, st: 100, maxSt: 100, stDelay: 0,
  atk: 0, atkDur: 0, combo: 0, atkHit: null, swingEndT: -9, abuf: 0, hold: 0, charging: false, heavy: false, thrust: false,
  guard: false, parryT: 0, cT: 0, riposte: 0, roll: 0, rollDur: 0.18, rdx: 0, rdy: 0, inv: 0, stagger: 0, flash: 0, dead: false,
  dig: 0, digTile: null, lvl: 1, xp: 0, pts: 0, might: 0, gold: 0, keys: 0, skills: {}, charms: [], equipped: [null, null], abilities: {}, keepings: 0,
  lastSafe: { x: 0, y: 0 }, push: { x: 0, y: 0 }, lastHurtBy: '', idleT: 0, stepT: 0, softHint: 0 };

function applyProg() { for (const k of ['hp', 'maxHp', 'maxSt', 'lvl', 'xp', 'pts', 'might', 'gold', 'keys', 'skills', 'charms', 'equipped', 'abilities', 'keepings']) P[k] = PROG[k]; P.st = P.maxSt; }

const tileAt = (tx, ty) => (tx < 0 || ty < 0 || tx >= area.W || ty >= area.H) ? K.WALL : area.tiles[ty * area.W + tx];
const setTile = (tx, ty, k) => { area.tiles[ty * area.W + tx] = k; };
function roomAt(px_, py_) { if (area.def.kind !== 'holloway') return null; const gx = Math.floor(px_ / TS / CELL_W), gy = Math.floor(py_ / TS / CELL_H); return roomById[(area.def.grid[gy] || [])[gx]] || null; }
function doorSealedAt(tx, ty) { if (!sealed || !curRoom) return false; return curRoom.doors.some(d => d.x === tx && d.y === ty); }
function lockAt(tx, ty) { return locks.find(l => l.x === tx && l.y === ty && !l.open); }
// solid for the player: walls, props, sealed doors, locks (unlocked on touch if you have a key)
function solidFor(tx, ty, who) {
  const k = tileAt(tx, ty);
  if (SWIMMABLE.has(k)) return who === 'swimmer' ? false : who === 'enemy' ? true : !P.abilities.lungs;
  if (k === K.CULVERT) return who !== 'player' || !PROG.quest.warren;
  if (SOLID.has(k)) return true;
  if (who === 'enemy' && (k === K.PIT || k === K.MOUTH)) return true;
  if (who === 'swimmer' && (k === K.PIT || k === K.MOUTH)) return true;
  if (who === 'enemy' && chests.some(c => c.x === tx && c.y === ty)) return true;
  if (doorSealedAt(tx, ty)) return true;
  if (lockAt(tx, ty)) return true;
  if (who !== 'enemy' && chests.some(c => c.x === tx && c.y === ty)) return true;
  return false;
}
// `cur` = the tiles the box stands in NOW: a sealed door or a lock you are already inside must never trap you
function boxFree(x, y, hw, hh, who, cur) {
  const x0 = Math.floor((x - hw) / TS), x1 = Math.floor((x + hw - 0.01) / TS), y0 = Math.floor((y - hh) / TS), y1 = Math.floor((y - 0.01) / TS);
  for (let ty = y0; ty <= y1; ty++) for (let tx = x0; tx <= x1; tx++) {
    if (!solidFor(tx, ty, who)) continue;
    if (cur && cur.has(tx + ',' + ty) && !SOLID.has(tileAt(tx, ty))) continue;
    return false;
  }
  return true;
}
function curTiles(e, hw, hh) { const s = new Set(); const x0 = Math.floor((e.x - hw) / TS), x1 = Math.floor((e.x + hw - 0.01) / TS), y0 = Math.floor((e.y - hh) / TS), y1 = Math.floor((e.y - 0.01) / TS); for (let ty = y0; ty <= y1; ty++) for (let tx = x0; tx <= x1; tx++) s.add(tx + ',' + ty); return s; }
function moveBox(e, dx, dy, hw, hh, who) {
  let moved = false; const cur = curTiles(e, hw, hh);
  if (dx) { if (boxFree(e.x + dx, e.y, hw, hh, who, cur)) { e.x += dx; moved = true; } else { const s = Math.sign(dx); let k = 0; while (k < Math.abs(dx) && boxFree(e.x + s, e.y, hw, hh, who, cur)) { e.x += s; k++; moved = true; } } }
  if (dy) { if (boxFree(e.x, e.y + dy, hw, hh, who, cur)) { e.y += dy; moved = true; } else { const s = Math.sign(dy); let k = 0; while (k < Math.abs(dy) && boxFree(e.x, e.y + s, hw, hh, who, cur)) { e.y += s; k++; moved = true; } } }
  return moved;
}

// ---------------------------------------------------------------------------------------------
// LOAD AN AREA
// ---------------------------------------------------------------------------------------------
function load(areaId, at = 'start') {
  const def = AREAS[areaId]; area = parseArea(def);
  enemies = []; props = []; pickups = []; projectiles = []; rocks = []; fx = []; floaters = []; npcs = []; chests = []; mounds = []; signs = []; locks = []; drips = []; stairsAt = null; mouthAt = null; culvertAt = null;
  rooms = area.rooms; roomById = {}; for (const r of rooms) { r.doors = roomDoors(area, r); roomById[r.id] = r; }
  const rnd = mulberry(77);
  let start = null;
  for (const e of area.ents) {
    const cx = e.x * TS + 8, cy = e.y * TS + 16;
    switch (e.kind) {
      case 'enemy': { const dkey = `${areaId}:${e.x},${e.y}`; if (PROG.dead[dkey]) break; if (def.kind === 'holloway' && PROG.cleared[`${areaId}:${e.room}`]) break; enemies.push(spawnEnemy(e.id, cx, cy - 4, e.room, dkey)); break; }
      case 'chest': chests.push({ x: e.x, y: e.y, room: e.room, item: e.item, key: e.key, open: !!PROG.opened[e.key] }); break;
      case 'mound': { if (PROG.dug[e.key]) { setTile(e.x, e.y, K.FLOOR); break; } mounds.push({ x: e.x, y: e.y, room: e.room, item: e.item, key: e.key }); break; }
      case 'bones': props.push({ kind: 'bones', x: cx, y: cy - 2, spr: SPR.bones[Math.floor(rnd() * 3)], flat: true }); break;
      case 'sign': signs.push({ x: e.x, y: e.y, lines: e.lines }); props.push({ kind: 'sign', x: cx, y: cy, spr: { canvas: SPR.signpost.canvas, ax: SPR.signpost.ax, ay: SPR.signpost.ay } }); break;
      case 'heart': pickups.push({ kind: 'heart', x: cx, y: cy - 6, t: 0 }); break;
      case 'lock': locks.push({ x: e.x, y: e.y, key: e.key, open: !!PROG.unlocked[e.key] }); break;
      case 'stairs': stairsAt = { x: e.x, y: e.y, room: e.room }; break;
      case 'start': if (at === 'start' || at === 'entry') start = { x: cx, y: cy - 4 }; break;
      case 'dripspot': drips.push({ x: cx, y: cy - 8, room: e.room }); break;
      case 'mouth': mouthAt = { x: e.x, y: e.y }; if (at === 'mouth' && !start) start = { x: e.x * TS + 16, y: (e.y + 2) * TS + 4 }; break;
      case 'culvert': if (!culvertAt) { culvertAt = { x: e.x, y: e.y }; if (at === 'culvert' && !start) start = { x: e.x * TS + 16, y: e.y * TS - 4 }; } break;
      case 'deco': { const sx = (e.x * 7 + e.y * 3); let spr = e.sub === 'mushroom' ? SPR.mushrooms[sx % 3] : e.sub === 'roots' ? SPR.roots[sx % 2] : e.sub === 'tallgrass' ? SPR.tallgrass[sx % 3] : null; let sub = e.sub; if (TSET.ready && def.kind === 'holloway' && e.sub === 'roots') { sub = sx % 3 === 0 ? 'crystal' : 'plant'; spr = sub === 'crystal' ? SPR.crystalGB[sx % 4] : SPR.plantGB[sx % 2]; } props.push({ kind: sub, x: cx, y: cy - 2, spr, flat: sub === 'puddle', anim: sub === 'puddle' }); break; }
      case 'npc': npcs.push({ x: cx, y: cy - 2, def: e.def, frames: TSET.ready ? bakePerson(e.def.look) : CH.bakeCharacter(e.def.look), facing: 'down', walk: 0, moving: false, homeX: cx, homeY: cy - 2, wait: 1 + rnd() * 2, tx: cx, ty: cy - 2 }); break;
    }
  }
  // tile-anchored props
  for (let ty = 0; ty < area.H; ty++) for (let tx = 0; tx < area.W; tx++) {
    const k = tileAt(tx, ty); const cx = tx * TS + 8, cy = ty * TS + 16;
    if (k === K.ROCK) props.push({ kind: 'rock', x: cx, y: cy - 1, spr: TSET.ready ? (def.kind === 'holloway' ? SPR.rockCave : SPR.rockWood) : SPR.rock[(tx * 3 + ty) % 3] });
    else if (k === K.BRAZIER) props.push({ kind: 'brazier', x: cx, y: cy - 1, anim: true });
    else if (k === K.TREE) { const big = ((tx * 7 + ty * 13) % 5) === 0; props.push({ kind: 'tree', x: cx + ((tx * 5) % 3) - 1, y: cy + ((ty * 3) % 3) - 1, spr: SPR.trees[big ? 4 + (tx % 2) : (tx + ty) % 4], big: true }); }
    else if (k === K.BUSH) props.push({ kind: 'bush', x: cx, y: cy - 1, spr: SPR.bush[(tx + ty) % 3] });
    else if (k === K.STUMP) props.push({ kind: 'stump', x: cx, y: cy - 1, spr: SPR.stump[(tx * 3 + ty) % 2] });
    else if (k === K.STAL) props.push({ kind: 'stal', x: cx, y: cy - 1, spr: SPR.stal[(tx + ty * 5) % 3] });
    else if (k === K.CRATE) props.push({ kind: 'crate', x: cx, y: cy - 1, spr: SPR.crate });
    else if (k === K.LAMP) props.push({ kind: 'lamp', x: cx, y: cy - 1, spr: SPR.lamp });
    else if (k === K.FENCE) props.push({ kind: 'fence', x: cx, y: cy - 1, spr: SPR.fenceTile });
  }
  for (const h of (def.houses || [])) props.push({ kind: 'house', x: h.x * TS, y: (h.y + h.d) * TS, spr: SPR.house, house: h, tile: true });
  if (mouthAt) props.push({ kind: 'mouth', x: mouthAt.x * TS + 16, y: (mouthAt.y + 1) * TS + 2, get spr() { return TSET.ready ? SPR.mouthTile : SPR.mouth; }, flat: true });
  if (culvertAt) props.push({ kind: 'culvert', x: culvertAt.x * TS + 16, y: (culvertAt.y + 1) * TS + 2, get spr() { return SPR.culvert[PROG.quest.warren ? 1 : 0]; }, flat: true });
  for (const n of npcs) if (n.def.shop) props.push({ kind: 'stall', x: n.x, y: n.y - 14, spr: SPR.stall });
  if (!start) start = { x: 8 * TS, y: 8 * TS };
  P.x = start.x; P.y = start.y; P.lastSafe = { x: P.x, y: P.y }; P.facing = def.kind === 'holloway' ? 'up' : 'up';
  P.atk = 0; P.roll = 0; P.guard = false; P.charging = false; P.hold = 0; P.dig = 0; P.stagger = 0; P.inv = 0.5; P.push.x = P.push.y = 0;
  curRoom = roomAt(P.x, P.y); sealed = false;
  if (curRoom) { roomBanner = { t: 2.6, name: curRoom.name }; } else roomBanner = { t: 3, name: def.name };
  snapCamera();
  if (def.kind === 'holloway') { PROG.checkpoint = { area: areaId, at: 'entry' }; } else PROG.checkpoint = { area: areaId, at };
  save();
  playMusic(musicUrl(), musicName());
}
function spawnEnemy(id, x, y, room, dkey) {
  const d = ENEMIES[id]; const hp = Math.round(d.hp * (1 + 0.06 * (P.keepings || 0)));
  return { id, def: d, x, y, hp, maxHp: hp, r: d.r, facing: 'down', walk: 0, moving: false, state: 'idle', t: 0, cd: { a: 1 + Math.random(), b: 3, c: 6, d: 4 }, room, dkey,
    home: { x, y }, flash: 0, tellT: 0, tellDur: 0, tellName: '', lockAng: 0, hitDone: false, push: { x: 0, y: 0 }, frame: 0, aggroed: false, phase: 1, alive: true, deadT: 0, wanderT: Math.random() * 2, wx: 0, wy: 0, mark: null, under: 0, spawnedRats: false, stunMul: 1 };
}

// ---------------------------------------------------------------------------------------------
// CAMERA — locked per room in a holloway (and slides between them), free in the wood
// ---------------------------------------------------------------------------------------------
function camTarget() {
  if (curRoom) return { x: curRoom.x * TS, y: curRoom.y * TS - 2 };
  return { x: clamp(P.x - BW / 2, 0, area.W * TS - BW), y: clamp(P.y - BH / 2 - 8, 0, area.H * TS - BH) };
}
function snapCamera() { const t = camTarget(); cam.x = cam.tx = t.x; cam.y = cam.ty = t.y; cam.slide = 0; if (state === 'slide') state = 'play'; }
function updateCamera(dt) {
  const t = camTarget();
  if (curRoom) {
    if (cam.slide > 0) { cam.slide = Math.max(0, cam.slide - dt); const k = 1 - cam.slide / 0.4; const e = k < 0.5 ? 2 * k * k : -1 + (4 - 2 * k) * k; cam.x = lerp(cam.fx, cam.tx, e); cam.y = lerp(cam.fy, cam.ty, e); if (cam.slide === 0) { cam.x = cam.tx; cam.y = cam.ty; if (state === 'slide') state = 'play'; } }
    else { cam.x = t.x; cam.y = t.y; }
  } else { cam.x = t.x; cam.y = t.y; } // hard-locked to the hero, as the SNES did it: no lag, no jitter between hero and ground
}
function enterRoom(r) {
  const prev = curRoom; curRoom = r;
  if (prev && r && prev !== r) { cam.fx = cam.x; cam.fy = cam.y; const t = camTarget(); cam.tx = t.x; cam.ty = t.y; cam.slide = 0.28; state = 'slide'; roomBanner = { t: 2.2, name: r.name }; projectiles = []; rocks = []; P.abuf = 0; }
  if (r) { const b = enemies.find(e => e.def.boss && e.alive && e.room === r.id); if (b) { toast(`${b.def.name}`, 3, '#ff6a3a'); sfx.roar(); shake = 6; } const m = enemies.find(e => e.def.mini && e.alive && e.room === r.id); if (m) { toast(`${m.def.name}`, 2.5, '#ffb347'); sfx.tellBig(); } }
}

// ---------------------------------------------------------------------------------------------
// TOASTS, FX, FLOATERS
// ---------------------------------------------------------------------------------------------
function toast(s, t = 2.2, col = '#f4f0e6') { toasts.push({ s, t, col, max: t }); if (toasts.length > 3) toasts.shift(); }
function puff(x, y, n = 4, col = '#a4834f', spd = 30) { for (let i = 0; i < n; i++) { const a = Math.random() * TAU, s = spd * (0.4 + Math.random()); fx.push({ kind: 'dot', x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s - 10, t: 0.4 + Math.random() * 0.3, col, r: 1 + Math.random() * 1.5 }); } }
function spark(x, y, col = '#fff') { for (let i = 0; i < 5; i++) { const a = Math.random() * TAU; fx.push({ kind: 'spark', x, y, vx: Math.cos(a) * 70, vy: Math.sin(a) * 70, t: 0.18, col }); } }
function floater(x, y, s, col = '#f4f0e6') { floaters.push({ x, y, s, col, t: 0.9 }); }
function ring(x, y, r, col, t = 0.3) { fx.push({ kind: 'ring', x, y, r, col, t, max: t }); }

// ---------------------------------------------------------------------------------------------
// PLAYER
// ---------------------------------------------------------------------------------------------
const P_HW = 5, P_HH = 6;
const speedMul = () => (has('foot1') ? 1.1 : 1);
const reach = () => 22 + (has('blade1') ? 6 : 0);
const arcHalf = () => (has('blade3') ? 1.5 : 1.05);
const parryWin = () => (has('guard1') ? 0.28 : 0.18);
const rollDist = () => 30 * (has('foot2') ? 1.35 : 1);
const rollCost = () => (wearing('ratfoot') ? 14 : 22);
function baseDmg() { return 10 * (1 + 0.07 * (P.lvl - 1) + 0.04 * P.might) * (wearing('thornband') ? 1.12 : 1); }
function spend(n) { if (god) return true; if (P.st < n) return false; P.st -= n; P.stDelay = 0.7; return true; }
function canAct() { return P.atk <= 0 && P.roll <= 0 && P.stagger <= 0 && P.dig <= 0 && !P.charging && !P.dead; }

function updatePlayer(dt) {
  if (P.dead) return;
  // timers
  P.inv = Math.max(0, P.inv - dt); P.flash = Math.max(0, P.flash - dt); P.stagger = Math.max(0, P.stagger - dt); P.riposte = Math.max(0, P.riposte - dt); P.softHint = Math.max(0, P.softHint - dt);
  P.stDelay = Math.max(0, P.stDelay - dt); if (P.stDelay === 0 && !P.guard) P.st = Math.min(P.maxSt, P.st + dt * 30 * (has('foot3') ? 1.5 : 1) * (wearing('mothsilk') ? 1.35 : 1));
  P.swim = SWIMMABLE.has(tileAt(Math.floor(P.x / TS), Math.floor((P.y - 2) / TS)));
  if (P.swim) { P.charging = false; P.guard = false; P.parryT = 0; if (P.atk > 0) P.atk = 0; }
  if (P.abuf > 0) P.abuf -= dt;
  // movement input
  let mx = 0, my = 0;
  if (held('up')) my -= 1; if (held('down')) my += 1; if (held('left')) mx -= 1; if (held('right')) mx += 1;
  const len = Math.hypot(mx, my); if (len) { mx /= len; my /= len; }
  // ---- roll ----
  if (P.roll > 0) {
    P.roll -= dt; const sp = rollDist() / P.rollDur;
    moveBox(P, P.rdx * sp * dt, P.rdy * sp * dt, P_HW, P_HH, 'player');
    if (P.roll <= 0) { puff(P.x, P.y, 3, P.swim ? '#d6ecf8' : '#c9b9a0', 18); P.inv = Math.max(P.inv, 0.05); }
    P.moving = false;
  } else if (P.dig > 0) {
    P.dig -= dt; if (Math.random() < 0.6) puff(P.digTile.x * TS + 8, P.digTile.y * TS + 10, 2, '#8a6a3f', 40);
    if (P.dig <= 0) finishDig();
  } else if (P.stagger > 0) { /* no control */ }
  else {
    // ---- attack input: buffer it, fire when free (never from the water) ----
    if (press('attack') && !P.swim) P.abuf = 0.18;
    if (P.swim) P.hold = -1;
    // the hold counts from the press: a cut that you keep holding becomes THE HEAVY BLOW as soon as the cut ends
    if (held('attack') && !P.charging && P.hold >= 0) { P.hold += dt; if (P.hold > 0.3 && P.atk <= 0 && P.st >= 20) { P.charging = true; P.chargeT = 0; sfx.charge(); } }
    if (!held('attack')) { if (P.charging) { releaseHeavy(); } P.hold = 0; }
    if (P.charging) { P.chargeT += dt; if (P.chargeT > 1.2) releaseHeavy(); P.moving = false; }
    else if (P.atk > 0) {
      P.atk -= dt; const k = 1 - P.atk / P.atkDur; const ang = FACE_ANG[P.facing];
      const lungeSp = P.thrust ? (has('blade2') ? 120 : 70) : P.heavy ? 40 : 30;
      if (k > 0.1 && k < 0.6) moveBox(P, Math.cos(ang) * lungeSp * dt, Math.sin(ang) * lungeSp * dt, P_HW, P_HH, 'player');
      if (k >= 0.22 && k <= 0.62) swingHits();
      if (P.atk <= 0) { P.swingEndT = time; P.heavy = false; P.thrust = false; }
      P.moving = false;
    } else {
      if (P.abuf > 0 && !held('guard') && !P.swim) { const dug = tryDig(); if (!dug) startSwing(); P.abuf = 0; }
      // ---- guard / parry ----
      const gHeld = held('guard') && !P.swim;
      if (press('guard')) { P.parryT = parryWin(); P.cT = 0; }
      if (gHeld) { P.cT += dt; P.guard = P.cT > 0.12 && P.st > 0; } else P.guard = false;
      P.parryT = Math.max(0, P.parryT - dt);
      if (P.guard) { P.stDelay = Math.max(P.stDelay, 0.2); }
      // ---- roll ----
      if (press('roll') && P.st >= rollCost() * (god ? 0 : 1)) {
        if (spend(P.swim && wearing('eelskin') ? 6 : rollCost())) { P.roll = P.rollDur; const a = len ? Math.atan2(my, mx) : FACE_ANG[P.facing] + Math.PI; P.rdx = Math.cos(a); P.rdy = Math.sin(a); P.guard = false; P.parryT = 0; sfx.roll(); puff(P.x, P.y, 5, '#c9b9a0', 30); }
      } else if (len) {
        const sp = 72 * speedMul() * (P.guard ? 0.5 : 1) * (P.swim ? (wearing('eelskin') ? 0.75 : 0.55) : 1);
        const bx = P.x, by = P.y; moveBox(P, mx * sp * dt, my * sp * dt, P_HW, P_HH, 'player');
        P.facing = pickFacing(mx, my, P.facing);
        // the stride is measured in ground covered, not time, so the feet never slide
        const moved = Math.hypot(P.x - bx, P.y - by); P.moving = true; P.walk += moved / 22; P.stepT -= dt; if (P.stepT <= 0) { P.stepT = 0.26; if (P.swim) { sfx.roll(); puff(P.x - mx * 4, P.y - 2, 2, '#d6ecf8', 12); } else { sfx.step(); puff(P.x - mx * 4, P.y, 1, area.def.kind === 'holloway' ? '#8a6a3f' : '#a4c47a', 8); } }
      } else P.moving = false;
      // ---- interact ----
      if (press('interact')) interact();
    }
  }
  // knockback
  if (P.push.x || P.push.y) { moveBox(P, P.push.x * dt, P.push.y * dt, P_HW, P_HH, 'player'); P.push.x *= Math.pow(0.001, dt); P.push.y *= Math.pow(0.001, dt); if (Math.abs(P.push.x) < 2) P.push.x = 0; if (Math.abs(P.push.y) < 2) P.push.y = 0; }
  // pits, locks, exits
  const tx = Math.floor(P.x / TS), ty = Math.floor((P.y - 2) / TS); const k = tileAt(tx, ty);
  if (k === K.PIT && P.roll <= 0) { fallInPit(); }
  else if (!SOLID.has(k) && k !== K.PIT) { P.lastSafe.x = P.x; P.lastSafe.y = P.y; }
  // a lock opens on touch if you carry a key
  for (const side of [[0, -1], [0, 1], [-1, 0], [1, 0]]) { const l = lockAt(tx + side[0], ty + side[1]); if (l && P.keys > 0 && dist(P.x, P.y - 4, (l.x + 0.5) * TS, (l.y + 0.5) * TS) < 14) { P.keys--; l.open = true; PROG.unlocked[l.key] = true; sfx.unlock(); toast('THE LOCK TURNS', 1.6, '#f4d35e'); puff((l.x + 0.5) * TS, (l.y + 0.5) * TS, 6, '#a6733f'); save(); } }
  if (k === K.MOUTH) { changeArea('warren', 'entry'); return; }
  if (k === K.CULVERT) { changeArea('mere', 'entry'); return; }
  { const fa = FACE_ANG[P.facing]; const ftx = Math.floor((P.x + Math.cos(fa) * 10) / TS), fty = Math.floor((P.y - 4 + Math.sin(fa) * 10) / TS); const fk = tileAt(ftx, fty);
    if (fk === K.CULVERT && !PROG.quest.warren && P.softHint <= 0 && P.moving) { toast('THE GRATE IS SHUT. WHATEVER IS UNDER THE WARREN COMES FIRST', 2.5, '#c9b9a0'); P.softHint = 4; }
    if (SWIMMABLE.has(fk) && !P.abilities.lungs && P.softHint <= 0 && P.moving) { toast('DEEP WATER. SOMETHING WITH LUNGS COULD CROSS THIS', 2.5, '#c9b9a0'); P.softHint = 4; } }
  if (stairsAt && tx === stairsAt.x && ty === stairsAt.y && PROG.cleared[`${area.id}:${stairsAt.room}`]) { finishHolloway(); return; }
  if (area.def.kind === 'holloway' && curRoom && curRoom.id === 'H' && ty >= curRoom.y + curRoom.h - 1 && P.y > (curRoom.y + curRoom.h) * TS - 4) { changeArea('wood', area.id === 'mere' ? 'culvert' : 'mouth'); return; }
  // room change
  const r = roomAt(P.x, P.y); if (r && r !== curRoom) enterRoom(r);
  P.idleT = P.moving ? 0 : P.idleT + dt;
}
function startSwing() {
  const chain = time - P.swingEndT < 0.45 && P.combo < 2;
  P.combo = chain ? P.combo + 1 : 0; P.thrust = P.combo === 2; P.heavy = false;
  P.atkDur = P.thrust ? 0.34 : 0.26; P.atk = P.atkDur; P.atkHit = new Set(); P.guard = false; P.parryT = 0;
  sfx.slash(P.combo);
  const ang = FACE_ANG[P.facing];
  fx.push({ kind: 'slash', x: P.x, y: P.y - 6, ang, t: 0.16, max: 0.16, dir: P.combo === 1 ? -1 : 1, thrust: P.thrust, r: reach() });
}
function releaseHeavy() {
  P.charging = false; if (!spend(20)) { P.hold = -1; return; }
  P.heavy = true; P.thrust = false; P.combo = 0; P.atkDur = 0.42; P.atk = P.atkDur; P.atkHit = new Set(); sfx.heavy(); shake = Math.max(shake, 2);
  fx.push({ kind: 'slash', x: P.x, y: P.y - 6, ang: FACE_ANG[P.facing], t: 0.22, max: 0.22, dir: 1, heavy: true, r: reach() + 6 });
  P.hold = -1;
}
function inSector(ox, oy, ang, r, half, tx, ty, tr) {
  const d = dist(ox, oy, tx, ty); if (d > r + tr) return false; if (d < tr + 2) return true;
  return Math.abs(angDiff(ang, Math.atan2(ty - oy, tx - ox))) < half + Math.atan2(tr, Math.max(1, d));
}
function swingHits() {
  const ang = FACE_ANG[P.facing]; const ox = P.x, oy = P.y - 6; const r = reach() + (P.heavy ? 6 : 0) + (P.thrust ? 6 : 0); const half = P.thrust ? 0.5 : arcHalf();
  for (const e of enemies) {
    if (!e.alive || e.state === 'under' || P.atkHit.has(e) || e.room !== (curRoom ? curRoom.id : null)) continue;
    if (!inSector(ox, oy, ang, r, half, e.x, e.y - e.r * 0.6, e.r)) continue;
    P.atkHit.add(e);
    // the warden's shield turns a sword from the front, not the heavy blow
    if (e.id === 'warden' && !P.heavy && e.state !== 'stagger' && e.state !== 'stunned') {
      const toP = Math.atan2(P.y - e.y, P.x - e.x); if (Math.abs(angDiff(FACE_ANG[e.facing], toP)) < 1.3) { sfx.hit('wood'); spark(e.x + Math.cos(toP) * 8, e.y - 8, '#c9a56a'); floater(e.x, e.y - 22, 'TURNED', '#c9b9a0'); hitstop = 0.03; continue; }
    }
    let dmg = baseDmg() * (P.thrust ? (has('blade2') ? 2 : 1.6) : 1) * (P.heavy ? 2.4 * (wearing('pikescale') ? 1.25 : 1) : 1) * (P.riposte > 0 ? 2 : 1);
    if (e.state === 'stunned' || e.state === 'recover') dmg *= e.stunMul;
    if (P.riposte > 0) { P.riposte = 0; floater(P.x, P.y - 30, 'RIPOSTE', '#ffd36b'); }
    hurtEnemy(e, Math.round(dmg), ang, P.heavy);
  }
}
function hurtEnemy(e, dmg, ang, heavy) {
  e.hp -= dmg; e.flash = 0.12; hitstop = heavy ? 0.07 : 0.045; P.st = Math.min(P.maxSt, P.st + 3);
  const pushN = (heavy ? 180 : 90) * (e.def.big ? 0.15 : 1); e.push.x += Math.cos(ang) * pushN; e.push.y += Math.sin(ang) * pushN;
  sfx.hit(e.def.mat); spark(e.x, e.y - e.r, '#fff'); floater(e.x + (Math.random() - 0.5) * 8, e.y - e.r * 2 - 6, String(dmg), heavy ? '#ffd36b' : '#f4f0e6');
  if (e.def.mat === 'wood') puff(e.x, e.y - e.r, 3, '#5a9a3a', 40); else puff(e.x, e.y - e.r, 3, '#8a3a3a', 40);
  if (heavy && !e.def.big && e.state !== 'stunned') { e.state = 'stagger'; e.t = 1.0; e.tellT = 0; }
  else if (!e.def.big && (e.state === 'idle' || e.state === 'chase') && Math.random() < 0.5) { e.state = 'stagger'; e.t = 0.25; }
  if (e.hp <= 0) killEnemy(e);
}
function killEnemy(e) {
  e.alive = false; e.state = 'dead'; e.deadT = 0.6; e.hp = 0;
  PROG.dead[e.dkey] = true; PROG.kills[e.id] = (PROG.kills[e.id] || 0) + 1;
  sfx.die(e.def.big); if (e.def.big) { shake = 8; slowT = 0.5; } puff(e.x, e.y - e.r, e.def.big ? 18 : 6, e.def.mat === 'wood' ? '#5a9a3a' : '#8a3a3a', 60);
  gainXp(e.def.xp);
  const gn = e.def.gold[0] + Math.floor(Math.random() * (e.def.gold[1] - e.def.gold[0] + 1));
  for (let i = 0; i < gn; i++) pickups.push({ kind: 'coin', x: e.x, y: e.y - 4, vx: (Math.random() - 0.5) * 60, vy: -40 - Math.random() * 30, z: 0, t: 0 });
  for (const d of e.def.drops) if (Math.random() < d.rate) {
    if (d.item === 'claw' || d.item === 'lungs') { giveItem(d.item); }
    else if (d.item === 'keeping') { giveItem('keeping', e.x, e.y); }
    else pickups.push({ kind: d.item.startsWith('charm:') ? 'charm' : d.item, id: d.item.split(':')[1], x: e.x, y: e.y - 6, vx: (Math.random() - 0.5) * 40, vy: -40, z: 0, t: 0 });
  }
}
function gainXp(n) {
  P.xp += n; floater(P.x, P.y - 30, `+${n} XP`, '#9ad0ff');
  while (P.xp >= xpNeed(P.lvl)) { P.xp -= xpNeed(P.lvl); P.lvl++; P.maxHp += 6; P.maxSt += 4; P.might++; P.pts++; P.hp = Math.min(P.maxHp, P.hp + Math.round(P.maxHp * 0.3)); sfx.levelup(); toast(`LEVEL ${P.lvl}. A POINT TO SPEND (TAB)`, 3, '#9ad0ff'); ring(P.x, P.y - 6, 20, '#9ad0ff', 0.5); }
  save();
}
const xpNeed = l => Math.round(30 * Math.pow(l, 1.5));
function giveItem(item, atX = P.x, atY = P.y) {
  if (item === 'gold') { const n = 15 + Math.floor(Math.random() * 15); P.gold += n; sfx.coin(); floater(atX, atY - 20, `+${n} GOLD`, '#f4d35e'); }
  else if (item === 'key') { P.keys++; sfx.key(); toast('A SMALL KEY', 2, '#f4d35e'); }
  else if (item === 'heart') { P.hp = Math.min(P.maxHp, P.hp + 20); sfx.heart(); floater(atX, atY - 20, '+20', '#ff8a7a'); }
  else if (item === 'claw') { P.abilities.claw = true; sfx.claw(); toast('THE CLAW. HOLD X AT SOFT EARTH TO DIG', 4, '#e6dcc4'); ring(P.x, P.y - 6, 26, '#e6dcc4', 0.6); slowT = 0.8; }
  else if (item === 'lungs') { P.abilities.lungs = true; sfx.keeping(); toast('THE LUNGS. DEEP WATER IS A ROAD NOW. YOU CANNOT CUT FROM IT', 4.5, '#7ab6a0'); ring(P.x, P.y - 6, 26, '#7ab6a0', 0.6); slowT = 0.8; }
  else if (item === 'keeping') { P.keepings++; P.maxHp += 20; P.hp = P.maxHp; sfx.keeping(); toast(`A KEEPING: ${area.def.keeping || 'A PIECE OF THE WOOD'}. +20 HEART`, 4, '#ff8a7a'); ring(P.x, P.y - 6, 30, '#ff8a7a', 0.8); }
  else if (item.startsWith('charm:')) { const id = item.split(':')[1]; if (!P.charms.includes(id)) { P.charms.push(id); toast(`${CHARMS[id].name}. A CHARM. WEAR IT FROM YOUR PACK (TAB)`, 3.5, CHARMS[id].col); } else { P.gold += 20; floater(atX, atY - 20, 'AGAIN. +20 GOLD', '#f4d35e'); } sfx.chest(); }
  save();
}
function interact() {
  const fx_ = P.x + Math.cos(FACE_ANG[P.facing]) * 10, fy_ = P.y - 4 + Math.sin(FACE_ANG[P.facing]) * 10;
  for (const n of npcs) if (dist(fx_, fy_, n.x, n.y - 6) < 16 || dist(P.x, P.y, n.x, n.y) < 18) { if (n.def.shop) { openShop(n); return; } openTalk(PROG.quest.mere ? (n.def.after2 || n.def.after) : PROG.quest.warren ? n.def.after : n.def.lines, n); return; }
  for (const s of signs) if (dist(P.x, P.y - 4, s.x * TS + 8, s.y * TS + 8) < 20) { openTalk(s.lines, null); return; }
  for (const c of chests) if (!c.open && dist(fx_, fy_, c.x * TS + 8, c.y * TS + 8) < 14) { c.open = true; PROG.opened[c.key] = true; giveItem(c.item, c.x * TS + 8, c.y * TS); puff(c.x * TS + 8, c.y * TS + 4, 6, '#f4d35e', 30); return; }
}
function tryDig() {
  const a = FACE_ANG[P.facing]; const tx = Math.floor((P.x + Math.cos(a) * 11) / TS), ty = Math.floor((P.y - 4 + Math.sin(a) * 11) / TS);
  const k = tileAt(tx, ty); if (!DIGGABLE.has(k)) return false;
  if (!P.abilities.claw) { if (P.softHint <= 0) { toast('SOFT EARTH. SOMETHING WITH CLAWS COULD DIG THIS', 2.5, '#c9b9a0'); P.softHint = 4; } return true; }
  P.dig = 0.45; P.digTile = { x: tx, y: ty }; sfx.dig(); return true;
}
function finishDig() {
  const { x, y } = P.digTile; const k = tileAt(x, y); setTile(x, y, K.FLOOR); puff(x * TS + 8, y * TS + 8, 10, '#8a6a3f', 50); shake = Math.max(shake, 1.5);
  const mi = mounds.findIndex(m => m.x === x && m.y === y); if (mi >= 0) { const m = mounds[mi]; mounds.splice(mi, 1); PROG.dug[m.key] = true; giveItem(m.item, x * TS + 8, y * TS + 8); if (m.item !== 'gold') giveItem('gold', x * TS + 8, y * TS + 8); }
  else if (k === K.SOFT && Math.random() < 0.15) pickups.push({ kind: 'coin', x: x * TS + 8, y: y * TS + 8, vx: 0, vy: -30, z: 0, t: 0 });
  save();
}
function fallInPit() { sfx.fall(); hurtPlayerRaw(6, 'THE PIT'); P.x = P.lastSafe.x; P.y = P.lastSafe.y; P.inv = 0.8; P.push.x = P.push.y = 0; puff(P.x, P.y, 6, '#c9b9a0', 30); }
// every enemy attack comes through here: roll, parry, guard, then damage
function hitPlayer(src, dmg, fromX, fromY, pushN = 120, kind = 'melee') {
  if (P.dead) return false;
  if (P.roll > 0) { floater(P.x, P.y - 26, 'STEPPED', '#c9b9a0'); return false; }
  if (P.inv > 0) return false;
  const toSrc = Math.atan2(fromY - (P.y - 4), fromX - P.x); const frontal = Math.abs(angDiff(FACE_ANG[P.facing], toSrc)) < 1.6;
  if (P.parryT > 0 && frontal) {
    P.parryT = 0; P.st = Math.min(P.maxSt, P.st + 25); if (has('guard2')) P.riposte = 2.5; if (tut) tut.parried = true;
    sfx.parry(); hitstop = 0.09; shake = Math.max(shake, 2); spark(P.x + Math.cos(toSrc) * 10, P.y - 8, '#ffd36b'); ring(P.x, P.y - 6, 14, '#ffd36b', 0.25); floater(P.x, P.y - 28, 'PARRY', '#ffd36b');
    if (src && src.alive && !src.def.big) { src.state = 'stagger'; src.t = 1.2; src.tellT = 0; src.push.x += Math.cos(toSrc) * 80; src.push.y += Math.sin(toSrc) * 80; }
    else if (src && src.alive) { src.push.x += Math.cos(toSrc) * 30; src.push.y += Math.sin(toSrc) * 30; }
    P.inv = 0.3; return false;
  }
  if (P.guard && frontal) {
    const cost = 15 * (has('guard3') ? 0.5 : 1);
    if (P.st >= cost) { P.st -= cost; P.stDelay = 0.7; sfx.guard(); spark(P.x + Math.cos(toSrc) * 9, P.y - 8, '#c9a56a'); const d = Math.max(1, Math.round(dmg * (has('guard3') ? 0.12 : 0.25))); hurtPlayerRaw(d, src ? src.def.name : kind, true); P.push.x += Math.cos(toSrc + Math.PI) * pushN * 0.4; P.push.y += Math.sin(toSrc + Math.PI) * pushN * 0.4; P.inv = 0.15; return true; }
    P.st = 0; P.guard = false; P.stagger = 0.8; sfx.guardBreak(); floater(P.x, P.y - 28, 'GUARD BROKEN', '#ff6a3a');
  }
  hurtPlayerRaw(dmg, src ? src.def.name : kind); P.push.x += Math.cos(toSrc + Math.PI) * pushN; P.push.y += Math.sin(toSrc + Math.PI) * pushN; P.inv = 0.7; P.charging = false; P.hold = -1;
  if (P.atk > 0 && !P.heavy) P.atk = 0;
  return true;
}
function hurtPlayerRaw(dmg, by, soft = false) {
  if (god) return;
  const d = Math.max(1, Math.round(dmg * (wearing('brockhide') ? 0.8 : 1)));
  P.hp -= d; P.flash = 0.15; P.lastHurtBy = by; if (!soft) { sfx.hurt(); hitstop = 0.05; shake = Math.max(shake, 3); }
  floater(P.x, P.y - 24, String(d), soft ? '#c9b9a0' : '#ff6a3a');
  if (P.hp <= 0) { P.hp = 0; P.dead = true; deadT = 0; state = 'dead'; sfx.death(); puff(P.x, P.y - 6, 10, '#8a3a3a', 50); }
}
function respawn() {
  P.dead = false; P.hp = P.maxHp; P.st = P.maxSt; PROG.hp = P.maxHp; save();
  load(PROG.checkpoint.area, PROG.checkpoint.at); state = 'play';
}
function changeArea(id, at) { load(id, at); state = 'play'; }
function finishHolloway() { PROG.quest[area.id] = true; PROG.cleared[`${area.id}:done`] = true; save(); wonT = 0; state = 'won'; sfx.keeping(); }

// ---------------------------------------------------------------------------------------------
// ENEMIES — every attack is told. The signature is at the TOP of a chain.
// ---------------------------------------------------------------------------------------------
function tell(e, name, dur, kind = 0) { e.state = 'tell'; e.t = dur; e.tellDur = dur; e.tellT = dur; e.tellKind = name; e.tellName = tn(e, name); e.hitDone = false; e.lockAng = Math.atan2(P.y - 4 - e.y, P.x - e.x); e.facing = faceOfAng(e.lockAng); if (e.def.big) { sfx.tellBig(); if (Math.random() < 0.35) sfx.voice('boss'); } else { sfx.tell(kind); if (Math.random() < 0.5) sfx.voice('goblin'); } lastTellT = time; }
function stepToward(e, tx, ty, sp, dt) {
  const dx = tx - e.x, dy = ty - e.y, d = Math.hypot(dx, dy); if (d < 1) return;
  const mx = dx / d * sp * dt, my = dy / d * sp * dt; const ox = e.x, oy = e.y;
  moveBox(e, mx, my, e.r * 0.8, e.r * 0.6, whoOf(e));
  if (Math.abs(e.x - ox) + Math.abs(e.y - oy) < 0.2) { moveBox(e, -my, mx, e.r * 0.8, e.r * 0.6, whoOf(e)); }
  e.moving = true; e.walk += dt * 6; e.facing = faceOf(dx, dy);
}
function separate(e) { for (const o of enemies) { if (o === e || !o.alive || o.state === 'under' || o.room !== e.room) continue; const d = dist(e.x, e.y, o.x, o.y), min = e.r + o.r; if (d < min && d > 0.01) { const k = (min - d) / d * 0.5; e.x += (e.x - o.x) * k; e.y += (e.y - o.y) * k; } } }
function updateEnemies(dt) {
  const rid = curRoom ? curRoom.id : null;
  for (const e of enemies) {
    if (!e.alive) { e.deadT -= dt; continue; }
    if (rid !== null && e.room !== rid) continue;
    if (rid === null && dist(e.x, e.y, P.x, P.y) > 260) continue;
    e.flash = Math.max(0, e.flash - dt); e.moving = false;
    if (e.push.x || e.push.y) { moveBox(e, e.push.x * dt, e.push.y * dt, e.r * 0.8, e.r * 0.6, whoOf(e)); e.push.x *= Math.pow(0.0005, dt); e.push.y *= Math.pow(0.0005, dt); if (Math.abs(e.push.x) < 2) e.push.x = 0; if (Math.abs(e.push.y) < 2) e.push.y = 0; }
    for (const c in e.cd) e.cd[c] = Math.max(0, e.cd[c] - dt);
    const d = dist(e.x, e.y, P.x, P.y - 4);
    if (!e.aggroed && (d < e.def.aggro || rid !== null)) { e.aggroed = true; if (!PROG.seen[e.id]) { PROG.seen[e.id] = true; toast(`${e.def.name}: SEEN. IT IS IN THE BESTIARY`, 2.2, '#c9b9a0'); } }
    if (e.state === 'stagger' || e.state === 'stunned' || e.state === 'recover') { e.t -= dt; if (e.t <= 0) { e.state = 'chase'; e.stunMul = 1; } if (e.state === 'stunned' && Math.random() < 0.3) fx.push({ kind: 'star', x: e.x + (Math.random() - 0.5) * 20, y: e.y - e.r * 2 - 6, t: 0.5 }); continue; }
    if (e.state === 'tell') { e.t -= dt; e.tellT = e.t; if (e.t <= 0) { e.state = 'attack'; e.t = 0; startAttack(e); } continue; }
    if (e.state === 'attack') { e.t += dt; runAttack(e, dt); continue; }
    if (e.state === 'under') { runUnder(e, dt); continue; }
    if (e.state === 'mark') { e.t -= dt; if (e.t <= 0) erupt(e); continue; }
    if (e.state === 'charge') { runCharge(e, dt); continue; }
    if (!e.aggroed) { // wander near home
      e.wanderT -= dt; if (e.wanderT <= 0) { e.wanderT = 1 + Math.random() * 2; const a = Math.random() * TAU; e.wx = e.home.x + Math.cos(a) * 24; e.wy = e.home.y + Math.sin(a) * 16; }
      if (dist(e.x, e.y, e.wx, e.wy) > 3) stepToward(e, e.wx, e.wy, e.def.spd * 0.4, dt);
      continue;
    }
    // ---- chase & decide ----
    const canTell = time - lastTellT > (e.def.big ? 0 : 0.55);
    switch (e.def.ai || e.id) {
      case 'imp': if (d < 40 && e.cd.a <= 0 && canTell) tell(e, 'LUNGE', 0.4, 0); else if (d > 14) stepToward(e, P.x, P.y - 4, e.def.spd, dt); break;
      case 'drowned': if (d < 24 && e.cd.a <= 0 && canTell) tell(e, 'GRAB', 0.6, 3); else if (d > 14) stepToward(e, P.x, P.y - 4, e.def.spd, dt); else e.facing = faceOf(P.x - e.x, P.y - 4 - e.y); break;
      case 'rat': if (d < 18 && e.cd.a <= 0 && canTell) tell(e, 'BITE', 0.3, 1); else { const ang = Math.atan2(P.y - 4 - e.y, P.x - e.x) + Math.sin(time * 3 + e.home.x) * 0.8; stepToward(e, e.x + Math.cos(ang) * 20, e.y + Math.sin(ang) * 20, e.def.spd, dt); } break;
      case 'archer': if (d < 60) { const ang = Math.atan2(e.y - (P.y - 4), e.x - P.x); stepToward(e, e.x + Math.cos(ang) * 20, e.y + Math.sin(ang) * 20, e.def.spd, dt); } else if (d < 150 && e.cd.a <= 0 && canTell) tell(e, 'DRAW', 0.6, 2); else if (d >= 150) stepToward(e, P.x, P.y - 4, e.def.spd, dt); else e.facing = faceOf(P.x - e.x, P.y - 4 - e.y); break;
      case 'warden': if (d < 26 && e.cd.a <= 0 && canTell) tell(e, 'SHOVE', 0.45, 3); else if (d > 16) stepToward(e, P.x, P.y - 4, e.def.spd, dt); else e.facing = faceOf(P.x - e.x, P.y - 4 - e.y); break;
      case 'digger': // signature first: BURROW
        if (e.cd.a <= 0) { e.cd.a = 6; burrow(e, 1.4); }
        else if (d < 34 && e.cd.b <= 0) { e.cd.b = 2.2; tell(e, 'SWIPE', 0.45, 0); }
        else if (d > 50 && e.cd.c <= 0) { e.cd.c = 4; tell(e, 'THROW', 0.5, 2); }
        else if (d > 24) stepToward(e, P.x, P.y - 4, e.def.spd, dt); else e.facing = faceOf(P.x - e.x, P.y - 4 - e.y);
        break;
      case 'brock': { // signature first: CHARGE
        if (e.hp <= e.maxHp * 0.5 && e.phase === 1) { e.phase = 2; sfx.roar(); shake = 6; toast(`${e.def.name} IS ANGRY`, 2, '#ff6a3a'); if (!e.spawnedRats) { e.spawnedRats = true; for (let i = 0; i < 2; i++) { const r = spawnEnemy(e.def.spawn || 'rat', e.x + (i ? 30 : -30), e.y, e.room, `spawned:${time}:${i}`); r.aggroed = true; enemies.push(r); } } }
        const q = e.phase === 2 ? 0.8 : 1;
        if (d > 60 && e.cd.a <= 0) { e.cd.a = 5; tell(e, 'CHARGE', 0.6 * q, 0); }
        else if (e.cd.c <= 0 && e.hp < e.maxHp * 0.85) { e.cd.c = 8; tell(e, 'QUAKE', 0.7 * q, 3); }
        else if (d < 40 && e.cd.b <= 0) { e.cd.b = 2 * q; tell(e, 'SWIPE', 0.4 * q, 0); }
        else if (e.cd.d <= 0 && d > 40) { e.cd.d = 7; tell(e, 'DIG', 0.5 * q, 1); }
        else if (d > 30) stepToward(e, P.x, P.y - 4, e.def.spd * (e.phase === 2 ? 1.3 : 1), dt); else e.facing = faceOf(P.x - e.x, P.y - 4 - e.y);
        break;
      }
    }
    separate(e);
  }
  enemies = enemies.filter(e => e.alive || e.deadT > 0);
}
function startAttack(e) {
  const n = e.tellKind;
  if (n === 'LUNGE' || n === 'BITE' || n === 'SHOVE' || n === 'GRAB') fx.push({ kind: 'slash', x: e.x, y: e.y - 6, ang: e.lockAng, t: 0.16, max: 0.16, dir: 1, r: n === 'SHOVE' ? 20 : 14, col: n === 'GRAB' ? '#8aa0a8' : '#d8dce6' });
  if (n === 'LUNGE') { e.cd.a = 1.6; sfx.lunge(); }
  else if (n === 'BITE') { e.cd.a = 1.0; sfx.bite(); }
  else if (n === 'DRAW') { e.cd.a = 2.2; sfx.arrow(); projectiles.push({ kind: 'stone', x: e.x, y: e.y - 10, vx: Math.cos(e.lockAng) * 150, vy: Math.sin(e.lockAng) * 150, dmg: e.def.dmg, life: 2, ang: e.lockAng, src: e }); e.state = 'recover'; e.t = 0.4; }
  else if (n === 'SHOVE') { e.cd.a = 2.2; sfx.shove(); }
  else if (n === 'GRAB') { e.cd.a = 2.6; sfx.burrow(); }
  else if (n === 'SWIPE') { sfx.heavy(); }
  else if (n === 'THROW') { sfx.lunge(); for (let i = -1; i <= 1; i++) { const a = e.lockAng + i * 0.35; projectiles.push({ kind: 'clod', x: e.x, y: e.y - 8, vx: Math.cos(a) * 120, vy: Math.sin(a) * 120, dmg: 6, life: 1.6, ang: a, src: e }); } e.state = 'recover'; e.t = 0.6; }
  else if (n === 'CHARGE') { e.state = 'charge'; e.t = 0; sfx.chargeRun(); }
  else if (n === 'QUAKE' && e.def.spray) { sfx.erupt(); for (let i = -2; i <= 2; i++) { const a = e.lockAng + i * 0.28; projectiles.push({ kind: 'spit', x: e.x, y: e.y - 8, vx: Math.cos(a) * 140, vy: Math.sin(a) * 140, dmg: 8, life: 1.8, ang: a, src: e }); } e.state = 'recover'; e.t = 0.7; e.stunMul = 1; }
  else if (n === 'QUAKE') { sfx.quake(); shake = 7; const r = curRoom; const spots = [];
    const n2 = e.phase === 2 ? 8 : 5;
    for (let i = 0; i < n2; i++) { const tx = r.x + 1 + Math.floor(Math.random() * (r.w - 2)), ty = r.y + 1 + Math.floor(Math.random() * (r.h - 2)); if (tileAt(tx, ty) === K.FLOOR) spots.push({ x: tx * TS + 8, y: ty * TS + 8 }); }
    spots.push({ x: P.x, y: P.y - 2 });
    for (const s of spots) rocks.push({ x: s.x, y: s.y, t: 0, mark: 0.85, dmg: 10, r: 12 });
    e.state = 'recover'; e.t = 0.8; e.stunMul = 1; }
  else if (n === 'DIG') { burrow(e, 1.8); }
}
function runAttack(e, dt) {
  const n = e.tellKind;
  if (n === 'GRAB') { moveBox(e, Math.cos(e.lockAng) * 70 * dt, Math.sin(e.lockAng) * 70 * dt, e.r * 0.8, e.r * 0.6, whoOf(e)); if (!e.hitDone && dist(e.x, e.y, P.x, P.y - 4) < e.r + 9) { e.hitDone = true; if (hitPlayer(e, e.def.dmg, e.x, e.y, 30)) { P.stagger = Math.max(P.stagger, 0.5); floater(P.x, P.y - 34, 'HELD', '#ff6a3a'); } } if (e.t > 0.3) { e.state = 'recover'; e.t = 0.7; } }
  else if (n === 'LUNGE') { moveBox(e, Math.cos(e.lockAng) * 150 * dt, Math.sin(e.lockAng) * 150 * dt, e.r * 0.8, e.r * 0.6, whoOf(e)); if (!e.hitDone && dist(e.x, e.y, P.x, P.y - 4) < e.r + 7) { e.hitDone = true; hitPlayer(e, e.def.dmg, e.x, e.y); } if (e.t > 0.25) { e.state = 'recover'; e.t = 0.35; } }
  else if (n === 'BITE') { moveBox(e, Math.cos(e.lockAng) * 90 * dt, Math.sin(e.lockAng) * 90 * dt, e.r * 0.8, e.r * 0.6, whoOf(e)); if (!e.hitDone && dist(e.x, e.y, P.x, P.y - 4) < e.r + 6) { e.hitDone = true; hitPlayer(e, e.def.dmg, e.x, e.y, 60); } if (e.t > 0.18) { e.state = 'recover'; e.t = 0.3; } }
  else if (n === 'SHOVE') { if (!e.hitDone && e.t > 0.05 && inSector(e.x, e.y, e.lockAng, 26, 0.9, P.x, P.y - 4, 5)) { e.hitDone = true; hitPlayer(e, e.def.dmg, e.x, e.y, 200); } if (e.t > 0.22) { e.state = 'recover'; e.t = 0.5; } }
  else if (n === 'SWIPE') { const r = e.def.boss ? 38 : 30; if (!e.hitDone && e.t > 0.06 && inSector(e.x, e.y, e.lockAng, r, 1.2, P.x, P.y - 4, 5)) { e.hitDone = true; hitPlayer(e, e.def.dmg, e.x, e.y, 180); } if (e.t > 0.24) { e.state = 'recover'; e.t = 0.5; } }
  else { e.state = 'recover'; e.t = 0.3; }
}
const dirtOf = e => e.def.swims ? '#5d9be0' : '#8a6a3f';
function burrow(e, dur) { e.state = 'under'; e.t = dur; e.under = dur; sfx.burrow(); puff(e.x, e.y, 12, dirtOf(e), 50); }
function runUnder(e, dt) {
  e.t -= dt; stepToward(e, P.x, P.y - 4, e.def.spd * 1.6, dt); e.moving = false;
  if (Math.random() < 0.5) puff(e.x, e.y, 1, dirtOf(e), 20);
  if (e.t <= 0) { e.state = 'mark'; e.t = 0.6; e.mark = { x: P.x, y: P.y - 2 }; e.x = e.mark.x; e.y = e.mark.y + 2; }
}
function erupt(e) {
  sfx.erupt(); shake = Math.max(shake, 4); puff(e.x, e.y, 16, dirtOf(e), 70);
  if (dist(e.x, e.y, P.x, P.y - 4) < (e.def.boss ? 22 : 16) + 5) hitPlayer(e, 14, e.x, e.y, 160);
  e.state = 'recover'; e.t = e.def.boss ? 0.9 : 1.1; e.stunMul = 1.5; e.mark = null; e.facing = faceOf(P.x - e.x, P.y - 4 - e.y);
}
function runCharge(e, dt) {
  e.t += dt; const sp = 230; const ox = e.x, oy = e.y;
  moveBox(e, Math.cos(e.lockAng) * sp * dt, Math.sin(e.lockAng) * sp * dt, e.r * 0.8, e.r * 0.6, whoOf(e));
  e.moving = true; e.walk += dt * 10; if (Math.random() < 0.7) puff(e.x - Math.cos(e.lockAng) * 10, e.y, 1, dirtOf(e), 20);
  if (!e.hitDone && dist(e.x, e.y, P.x, P.y - 4) < e.r + 8) { e.hitDone = true; hitPlayer(e, 18, e.x, e.y, 260); }
  const moved = Math.abs(e.x - ox) + Math.abs(e.y - oy);
  if (moved < sp * dt * 0.3 || e.t > 2.5) { // the wall: stunned, and OPEN
    e.state = 'stunned'; e.t = 1.7; e.stunMul = 2; sfx.wallHit(); shake = 6; puff(e.x + Math.cos(e.lockAng) * 14, e.y, 12, '#5f5468', 60); floater(e.x, e.y - 40, 'STUNNED', '#ffd36b');
    if (!e.def.swims) for (let i = 0; i < 2; i++) rocks.push({ x: e.x + (Math.random() - 0.5) * 60, y: e.y + (Math.random() - 0.5) * 40, t: 0, mark: 0.7, dmg: 8, r: 10 });
  }
}
function updateProjectiles(dt) {
  for (const p of projectiles) {
    p.life -= dt; p.x += p.vx * dt; p.y += p.vy * dt;
    const tx = Math.floor(p.x / TS), ty = Math.floor(p.y / TS); const pk = tileAt(tx, ty); if (SOLID.has(pk) && !SWIMMABLE.has(pk)) { p.life = 0; puff(p.x, p.y, 3, p.kind === 'arrow' ? '#a6733f' : p.kind === 'spit' ? '#7ab6a0' : p.kind === 'stone' ? '#8a8a90' : '#6e5330', 30); }
    if (p.life > 0 && dist(p.x, p.y, P.x, P.y - 6) < 8) { const took = hitPlayer(p.src, p.dmg, p.x - p.vx * 0.1, p.y - p.vy * 0.1, 90, p.kind); p.life = 0; if (!took) puff(p.x, p.y, 3, '#c9b9a0', 30); }
  }
  projectiles = projectiles.filter(p => p.life > 0);
  for (const r of rocks) {
    r.t += dt;
    if (r.t >= r.mark && !r.done) { r.done = true; const spout = area.def.hazard === 'spout'; if (spout) sfx.erupt(); else sfx.rock(); shake = Math.max(shake, 2); puff(r.x, r.y, 6, spout ? '#d6ecf8' : '#5f5468', 50); if (dist(r.x, r.y, P.x, P.y - 4) < r.r + 5) hitPlayer(null, r.dmg, r.x, r.y - 10, 100, 'FALLING ROCK'); r.t = r.mark; r.gone = 0.3; }
    if (r.done) { r.gone -= dt; }
  }
  rocks = rocks.filter(r => !(r.done && r.gone <= 0));
  // the throat drips rocks while you are in it
  if (curRoom && drips.some(d => d.room === curRoom.id) && !PROG.cleared[`${area.id}:${curRoom.id}:drips`]) {
    dripT -= dt; if (dripT <= 0) { dripT = 1.6 + Math.random() * 0.8; const spots = drips.filter(d => d.room === curRoom.id); const s = spots[Math.floor(Math.random() * spots.length)]; rocks.push({ x: s.x, y: s.y, t: 0, mark: 0.9, dmg: 8, r: 11 }); if (Math.random() < 0.35) rocks.push({ x: P.x, y: P.y - 2, t: 0, mark: 0.9, dmg: 8, r: 11 }); }
  }
}
let dripT = 1;
function updatePickups(dt) {
  for (const p of pickups) {
    p.t += dt;
    if (p.vx !== undefined) { p.x += p.vx * dt; p.y += p.vy * dt; p.vy += 160 * dt; p.vx *= Math.pow(0.05, dt); if (p.t > 0.35) { p.vx = 0; p.vy = 0; } const pk = tileAt(Math.floor(p.x / TS), Math.floor(p.y / TS)); if (SOLID.has(pk) && !SWIMMABLE.has(pk)) { p.x -= p.vx * dt * 2; p.y -= p.vy * dt * 2; p.vx = p.vy = 0; } }
    const d = dist(p.x, p.y, P.x, P.y - 4);
    if (p.t > 0.3 && d < 26 && !P.dead) { const k = 1 - Math.pow(0.001, dt); p.x += (P.x - p.x) * k * 1.5; p.y += (P.y - 4 - p.y) * k * 1.5; }
    if (p.t > 0.3 && d < 8 && !P.dead) { p.gone = true;
      if (p.kind === 'coin') { P.gold++; sfx.coin(); floater(P.x, P.y - 22, `${P.gold}`, '#f4d35e'); }
      else if (p.kind === 'heart') giveItem('heart'); else if (p.kind === 'charm') giveItem('charm:' + p.id); else if (p.kind === 'keeping') giveItem('keeping'); }
    if (p.vx !== undefined && SWIMMABLE.has(tileAt(Math.floor(p.x / TS), Math.floor(p.y / TS))) && p.t > 0.4 && !P.abilities.lungs) { p.x += (P.x - p.x) * dt * 2; p.y += (P.y - 4 - p.y) * dt * 2; }
  }
  pickups = pickups.filter(p => !p.gone);
}
function updateRooms() {
  if (!curRoom) { sealed = false; return; }
  const live = enemies.some(e => e.alive && e.room === curRoom.id);
  const key = `${area.id}:${curRoom.id}`;
  if (live && !sealed) { sealed = true; sfx.seal(); shake = Math.max(shake, 2);
    const cx = (curRoom.x + curRoom.w / 2) * TS, cy = (curRoom.y + curRoom.h / 2) * TS; const a = Math.atan2(cy - P.y, cx - P.x); P.push.x += Math.cos(a) * 60; P.push.y += Math.sin(a) * 60; }
  else if (!live && sealed) { sealed = false; sfx.open(); if (!PROG.cleared[key]) { PROG.cleared[key] = true; toast(`${curRoom.name}: CLEAR`, 2, '#9ad0ff'); if (curRoom.id === 'H') PROG.cleared[key + ':drips'] = true; if (enemies.length === 0 || true) PROG.checkpoint = { area: area.id, at: 'entry' }; save(); } }
  else if (!live && !PROG.cleared[key] && !enemies.some(e => e.room === curRoom.id)) { PROG.cleared[key] = true; if (curRoom.id === 'H') PROG.cleared[key + ':drips'] = true; save(); }
}
function updateNpcs(dt) {
  for (const n of npcs) {
    n.moving = false; if (talk && talk.npc === n) { n.facing = faceOf(P.x - n.x, P.y - n.y); continue; }
    n.wait -= dt; if (n.wait <= 0) { n.wait = 2 + Math.random() * 3; n.tx = n.homeX + (Math.random() - 0.5) * 40; n.ty = n.homeY + (Math.random() - 0.5) * 24; }
    const d = dist(n.x, n.y, n.tx, n.ty); if (d > 2) { const sp = 22 * dt; const ox = n.x, oy = n.y; moveBox(n, (n.tx - n.x) / d * sp, (n.ty - n.y) / d * sp, 4, 4, 'enemy'); if (Math.abs(n.x - ox) + Math.abs(n.y - oy) < 0.1) { n.tx = n.x; n.ty = n.y; } else { n.moving = true; n.walk += dt * 3; n.facing = faceOf(n.tx - n.x, n.ty - n.y); } }
  }
}
let ambT = 0;
function updateAmbient(dt) {
  ambT -= dt; if (ambT > 0) return; ambT = 0.12;
  if (area.def.kind === 'holloway') { for (const p of props) if (p.kind === 'brazier' && curRoom && Math.abs(p.x - (curRoom.x + curRoom.w / 2) * TS) < 200 && Math.abs(p.y - (curRoom.y + curRoom.h / 2) * TS) < 120 && Math.random() < 0.5) fx.push({ kind: 'dot', x: p.x + (Math.random() - 0.5) * 6, y: p.y - 16, vx: (Math.random() - 0.5) * 8, vy: -14 - Math.random() * 10, t: 0.9 + Math.random() * 0.5, col: Math.random() < 0.5 ? '#ffd36b' : '#ff8c3a', r: 1, ember: true }); }
  else { for (const p of props) if (p.kind === 'house' && Math.random() < 0.6) { const h = p.spr; fx.push({ kind: 'smoke', x: p.x + h.chimney.dx, y: p.y + h.chimney.dy, vx: (Math.random() - 0.5) * 4 + 3, vy: -9, t: 2.4, max: 2.4 }); } }
}
function updateFx(dt) {
  updateAmbient(dt);
  for (const f of fx) { f.t -= dt; if (f.kind === 'dot' || f.kind === 'spark' || f.kind === 'smoke') { f.x += f.vx * dt; f.y += f.vy * dt; if (f.kind === 'dot' && !f.ember) f.vy += 60 * dt; if (f.ember) f.vx += Math.sin(time * 7 + f.y) * 6 * dt; } if (f.kind === 'star') f.y -= 10 * dt; }
  fx = fx.filter(f => f.t > 0);
  for (const f of floaters) { f.t -= dt; f.y -= 14 * dt; } floaters = floaters.filter(f => f.t > 0);
  for (const t of toasts) t.t -= dt; toasts = toasts.filter(t => t.t > 0);
  roomBanner.t = Math.max(0, roomBanner.t - dt); shake = Math.max(0, shake - dt * 14);
}

// ---------------------------------------------------------------------------------------------
// TALK
// ---------------------------------------------------------------------------------------------
function openShop(npc) { npc.facing = faceOf(P.x - npc.x, P.y - npc.y); const line = PROG.quest.mere ? npc.def.after2[0] : PROG.quest.warren ? npc.def.after[0] : npc.def.lines[0]; talk = { lines: [line], i: 0, shown: 0, npc, thenShop: true }; state = 'talk'; }
const shopItems = () => SHOP.filter(it => !it.after || PROG.quest[it.after]);
function updateShop() {
  const items = shopItems();
  if (press('back') || press('pause') || press('menu')) { sfx.back(); state = 'play'; return; }
  if (press('up')) { menu.sel = (menu.sel + items.length - 1) % items.length; sfx.menu(); }
  if (press('down')) { menu.sel = (menu.sel + 1) % items.length; sfx.menu(); }
  if (press('take')) {
    const it = items[menu.sel]; const sold = it.once && PROG.bought && PROG.bought[it.id];
    if (sold) { sfx.back(); return; }
    if (P.gold < it.price) { sfx.back(); toast('NOT ENOUGH GOLD', 1.5, '#ff6a3a'); return; }
    if (it.id === 'charm:mothsilk' && P.charms.includes('mothsilk')) { sfx.back(); toast('YOU HAVE ONE', 1.5, '#c9b9a0'); return; }
    if (it.id === 'charm:pikescale' && P.charms.includes('pikescale')) { sfx.back(); toast('YOU HAVE ONE', 1.5, '#c9b9a0'); return; }
    P.gold -= it.price; PROG.bought = PROG.bought || {}; if (it.once) PROG.bought[it.id] = true; sfx.coin();
    if (it.id === 'cap') { P.hp = Math.min(P.maxHp, P.hp + 30); sfx.heart(); floater(P.x, P.y - 22, '+30', '#ff8a7a'); }
    else if (it.id === 'bottle') { P.maxHp += 10; P.hp = Math.min(P.maxHp, P.hp + 10); sfx.keeping(); toast('+10 HEART, FOR KEEPS', 2, '#ff8a7a'); }
    else if (it.id.startsWith('charm:')) giveItem(it.id);
    save();
  }
}
function drawShop() {
  const items = shopItems(); const w = 220, h = 30 + items.length * 20; const x = BW / 2 - w / 2, y = 20;
  plate(x, y, w, h, 'rgba(10,8,20,0.92)'); text(g, 'THE PEDLAR', x + 8, y + 5, '#ffd36b'); text(g, `${P.gold} GOLD`, x + w - 8, y + 5, '#f4d35e', 1, 'r');
  items.forEach((it, i) => { const sel = i === menu.sel; const sold = it.once && PROG.bought && PROG.bought[it.id]; const yy = y + 16 + i * 20; plate(x + 4, yy, w - 8, 18, sel ? 'rgba(60,50,90,0.9)' : 'rgba(20,14,30,0.6)'); text(g, it.name, x + 10, yy + 3, sold ? '#5a4a6a' : P.gold >= it.price ? '#f4f0e6' : '#8a7a9a'); text(g, sold ? 'SOLD' : `${it.price}`, x + w - 12, yy + 3, sold ? '#5a4a6a' : '#f4d35e', 1, 'r'); text(g, fitText(it.desc, w - 24), x + 10, yy + 11, '#c9b9a0'); });
  text(g, 'Z BUYS   ESC LEAVES', BW / 2, y + h + 4, '#5a4a6a', 1, 'c');
}
function openTalk(lines, npc) { talk = { lines, i: 0, shown: 0, npc }; state = 'talk'; if (tut && npc) tut.talked = true; if (npc) npc.facing = faceOf(P.x - npc.x, P.y - npc.y); P.moving = false; }
function updateTalk(dt) { talk.shown = Math.min(talk.lines[talk.i].length, talk.shown + dt * 45); if (press('take')) { if (talk.shown < talk.lines[talk.i].length) talk.shown = 999; else { talk.i++; talk.shown = 0; if (talk.i >= talk.lines.length) { const shop = talk.thenShop; talk = null; state = shop ? 'shop' : 'play'; if (shop) menu.sel = 0; } } } }

// ---------------------------------------------------------------------------------------------
// UPDATE
// ---------------------------------------------------------------------------------------------
function update(rawDt) {
  time += rawDt;
  let dt = rawDt; if (hitstop > 0) { hitstop -= rawDt; dt = rawDt * 0.12; } if (slowT > 0) { slowT -= rawDt; dt *= 0.45; }
  switch (state) {
    case 'title': updateTitle(); break;
    case 'intro': updateIntro(rawDt); break;
    case 'play':
      updatePlayer(dt); updateEnemies(dt); updateProjectiles(dt); updatePickups(dt); updateRooms(); updateNpcs(dt); updateFx(dt); updateCamera(dt); updateTutorial(rawDt);
      if (press('menu') || press('pause')) { state = 'pause'; menu = { tab: press('menu') ? 1 : 0, sel: 0, sub: 0 }; sfx.menu(); }
      break;
    case 'slide': updatePlayer(dt); updateCamera(rawDt); updateFx(dt); break; // you keep walking while the room slides; the room waits
    case 'talk': updateTalk(rawDt); updateFx(dt); updateNpcs(dt); break;
    case 'pause': updatePause(); updateFx(dt); break;
    case 'shop': updateShop(); updateFx(dt); updateNpcs(dt); break;
    case 'dead': deadT += rawDt; updateFx(dt); if (deadT > 1.2 && press('take')) respawn(); break;
    case 'won': wonT += rawDt; updateFx(dt); if (wonT > 2 && press('take')) { changeArea('wood', area.id === 'mere' ? 'culvert' : 'mouth'); } break;
  }
  pressed = new Set();
}
// ---- title ----
let title = { sel: 0, t: 0 };
function titleItems() { return [hasSave() ? 'CONTINUE' : null, 'NEW GAME', 'SETTINGS'].filter(Boolean); }
function updateTitle() {
  const items = titleItems(); title.t += 1 / 60;
  if (press('up')) { title.sel = (title.sel + items.length - 1) % items.length; sfx.menu(); }
  if (press('down')) { title.sel = (title.sel + 1) % items.length; sfx.menu(); }
  if (press('take')) {
    const it = items[title.sel]; sfx.take();
    if (it === 'CONTINUE') { loadSave(); applySettings(); applyProg(); P.hp = Math.max(P.hp, Math.round(P.maxHp * 0.5)); load(PROG.checkpoint.area, PROG.checkpoint.at); state = 'play'; }
    else if (it === 'NEW GAME') { PROG = progDefaults(); applySettings(); applyProg(); introT = 0; intro.i = 0; intro.shown = 0; state = 'intro'; }
    else if (it === 'SETTINGS') { menu = { tab: 4, sel: 0, sub: 0, from: 'title' }; state = 'pause'; }
  }
}
// ---- intro ----
const INTRO = [
  'THE WOOD KEEPS WHAT IT TAKES.',
  'A goat, a lantern, a boy who went to fetch the goat. Under the roots there are older roads than any in Waymeet, and the wood walks them at night, carrying.',
  'Nobody goes down after what the wood has taken. The wardens say the roads are holloways: worn so deep by so many feet that the sky is a slot above you.',
  'And there is one law down there, older than the wardens. WHAT YOU TAKE FROM THE WOOD, YOU KEEP.',
  'The Pell boy has been under three days.',
];
const intro = { i: 0, shown: 0 };
function updateIntro(dt) {
  introT += dt; intro.shown = Math.min(INTRO[intro.i].length, intro.shown + dt * 40);
  if (press('take')) { if (intro.shown < INTRO[intro.i].length) intro.shown = 999; else { intro.i++; intro.shown = 0; if (intro.i >= INTRO.length) startNewGame(); } }
  if (press('back')) startNewGame();
}
function startNewGame() { load('wood', 'start'); state = 'play'; if (PROG.settings.help !== false) startTutorial(); }
// ---- tutorial: guided, in the wood, one thing at a time ----
const TUT = [
  { id: 'walk', text: 'WALK with the ARROWS or WASD.', done: () => P.moving && P.walk > 2 },
  { id: 'cut', text: 'Press X to CUT. Three presses is a run: the third is a thrust.', done: () => P.combo === 2 && P.atk > 0 },
  { id: 'heavy', text: 'HOLD X and let go for THE HEAVY BLOW. It breaks a shield.', done: () => P.heavy && P.atk > 0 },
  { id: 'guard', text: 'HOLD C to GUARD. Front only. It costs stamina, the green bar.', done: () => P.guard && P.cT > 0.3 },
  { id: 'parry', text: 'TAP C as a blow lands to PARRY it. Try it on a goblin.', done: () => tut.parried },
  { id: 'roll', text: 'Press Z to STEP: a quick hop, backwards if you stand still. Nothing can touch you during it.', done: () => P.roll > 0 },
  { id: 'talk', text: 'Talk to WARDEN HESK with SPACE. Then go north to the warren.', done: () => tut.talked },
];
function startTutorial() { tut = { i: 0, t: 0, parried: false, talked: false, hold: 0 }; }
function updateTutorial(dt) {
  if (!tut) return; tut.t += dt; const step = TUT[tut.i]; if (!step) { tut = null; PROG.tutorial = true; save(); return; }
  if (step.done()) { tut.hold += dt; if (tut.hold > 0.3) { sfx.skill(); tut.i++; tut.hold = 0; tut.t = 0; if (!TUT[tut.i]) { toast('THAT IS EVERYTHING. THE REST IS DOWN THERE', 3, '#9ad0ff'); tut = null; PROG.tutorial = true; save(); } } }
}
// ---- pause menu: STATUS | SKILLS | CHARMS | BESTIARY | SETTINGS ----
const TABS = ['STATUS', 'SKILLS', 'CHARMS', 'BESTIARY', 'SETTINGS'];
function updatePause() {
  const fromTitle = menu.from === 'title';
  if (press('back') || press('pause') || (press('menu') && !fromTitle)) { sfx.back(); state = fromTitle ? 'title' : 'play'; if (!fromTitle) save(); return; }
  if (!fromTitle) { if (press('left')) { menu.tab = (menu.tab + 4) % 5; menu.sel = 0; sfx.menu(); } if (press('right')) { menu.tab = (menu.tab + 1) % 5; menu.sel = 0; sfx.menu(); } }
  const tab = TABS[menu.tab];
  if (tab === 'SKILLS') {
    if (press('up')) { menu.sel = (menu.sel + 8) % 9; sfx.menu(); } if (press('down')) { menu.sel = (menu.sel + 1) % 9; sfx.menu(); }
    if (press('take')) { const s = SKILLS[menu.sel]; const prevOk = s.tier === 0 || has(SKILLS.find(x => x.branch === s.branch && x.tier === s.tier - 1).id); if (!has(s.id) && P.pts > 0 && prevOk) { P.skills[s.id] = 1; P.pts--; sfx.skill(); save(); } else sfx.back(); }
  } else if (tab === 'CHARMS') {
    const n = P.charms.length; if (n) { if (press('up')) { menu.sel = (menu.sel + n - 1) % n; sfx.menu(); } if (press('down')) { menu.sel = (menu.sel + 1) % n; sfx.menu(); } }
    if (press('take') && n) { const id = P.charms[menu.sel]; const i = P.equipped.indexOf(id); if (i >= 0) P.equipped[i] = null; else { const slot = P.equipped.indexOf(null); if (slot >= 0) P.equipped[slot] = id; else P.equipped[0] = id; } sfx.take(); save(); }
  } else if (tab === 'BESTIARY') {
    const ids = Object.keys(ENEMIES); if (press('up')) { menu.sel = (menu.sel + ids.length - 1) % ids.length; sfx.menu(); } if (press('down')) { menu.sel = (menu.sel + 1) % ids.length; sfx.menu(); }
  } else if (tab === 'SETTINGS') {
    const rows = 5; if (press('up')) { menu.sel = (menu.sel + rows - 1) % rows; sfx.menu(); } if (press('down')) { menu.sel = (menu.sel + 1) % rows; sfx.menu(); }
    const S = PROG.settings; const step = (press('left') ? -1 : 0) + (press('right') ? 1 : 0);
    if (menu.sel === 0 && step) { S.sfx = clamp(Math.round((S.sfx + step * 0.1) * 10) / 10, 0, 1); applySettings(); sfx.menu(); }
    if (menu.sel === 1 && step) { S.music = clamp(Math.round((S.music + step * 0.1) * 10) / 10, 0, 1); applySettings(); }
    if (menu.sel === 2 && (step || press('take'))) { S.shake = !S.shake; sfx.menu(); }
    if (menu.sel === 3 && (step || press('take'))) { S.help = S.help === false ? true : false; sfx.menu(); }
    if (menu.sel === 4 && press('take')) { if (menu.confirm) { try { localStorage.removeItem(SAVE_KEY); } catch (e) {} PROG = progDefaults(); menu.confirm = false; sfx.guardBreak(); toast('THE SAVE IS GONE', 2, '#ff6a3a'); state = 'title'; title.sel = 0; } else { menu.confirm = true; sfx.back(); } }
    else if (menu.sel !== 4) menu.confirm = false;
    save();
  }
}

// ---------------------------------------------------------------------------------------------
// RENDER
// ---------------------------------------------------------------------------------------------
function drawSprite(fr, x, y, flipTint = null) { g.drawImage(fr.canvas, Math.round(x - fr.ax), Math.round(y - fr.ay)); }
const sandCache = new Map();
function sandPath(cont, v) { // cont = where the path continues; the other sides get grass creeping in
  const key = cont + ':' + v; let c = sandCache.get(key); if (c) return c;
  const [cv, g] = canvas(TS, TS); g.drawImage(OVER.sand(15), 0, 0); g.globalCompositeOperation = 'multiply'; g.fillStyle = 'rgb(214,190,150)'; g.fillRect(0, 0, TS, TS); g.globalCompositeOperation = 'source-over';
  const gt = OVER.grass().getContext('2d').getImageData(0, 0, 16, 16).data; const pick = i => `rgb(${gt[i * 4]},${gt[i * 4 + 1]},${gt[i * 4 + 2]})`;
  const base = pick(5), dark = pick(37); const rnd = mulberry(900 + cont * 7 + v);
  const depth = () => 1 + Math.floor(rnd() * 3);
  for (let u = 0; u < TS; u++) {
    if (!(cont & 1)) { const d = depth(); for (let k = 0; k < d; k++) { g.fillStyle = k === d - 1 ? dark : base; g.fillRect(u, k, 1, 1); } }
    if (!(cont & 4)) { const d = depth(); for (let k = 0; k < d; k++) { g.fillStyle = k === d - 1 ? dark : base; g.fillRect(u, TS - 1 - k, 1, 1); } }
    if (!(cont & 8)) { const d = depth(); for (let k = 0; k < d; k++) { g.fillStyle = k === d - 1 ? dark : base; g.fillRect(k, u, 1, 1); } }
    if (!(cont & 2)) { const d = depth(); for (let k = 0; k < d; k++) { g.fillStyle = k === d - 1 ? dark : base; g.fillRect(TS - 1 - k, u, 1, 1); } }
  }
  sandCache.set(key, cv); return cv;
}
function drawTiles(ox, oy) {
  const wf = Math.floor(time * 5) % 4;
  const x0 = Math.max(0, Math.floor(-ox / TS)), y0 = Math.max(0, Math.floor(-oy / TS)), x1 = Math.min(area.W - 1, Math.ceil((-ox + BW) / TS)), y1 = Math.min(area.H - 1, Math.ceil((-oy + BH) / TS));
  const holl = area.def.kind === 'holloway';
  const wallMask = (x, y) => { let m = 0; if (tileAt(x, y - 1) !== K.WALL) m |= 1; if (tileAt(x + 1, y) !== K.WALL) m |= 2; if (tileAt(x, y + 1) !== K.WALL) m |= 4; if (tileAt(x - 1, y) !== K.WALL) m |= 8; return m; };
  const pitMask = (x, y) => { let m = 0; if (tileAt(x, y - 1) !== K.PIT) m |= 1; if (tileAt(x + 1, y) !== K.PIT) m |= 2; if (tileAt(x, y + 1) !== K.PIT) m |= 4; if (tileAt(x - 1, y) !== K.PIT) m |= 8; return m; };
  const grassy = k => GRASSY.has(k);
  const dirtMask = (x, y) => { let m = 0; if (grassy(tileAt(x, y - 1))) m |= 1; if (grassy(tileAt(x + 1, y))) m |= 2; if (grassy(tileAt(x, y + 1))) m |= 4; if (grassy(tileAt(x - 1, y))) m |= 8; return m; };
  const waterMask = (x, y) => { let m = 0; const w = k => k === K.WATER || k === K.PLANK || k === K.DEEP || k === K.CULVERT; if (!w(tileAt(x, y - 1))) m |= 1; if (!w(tileAt(x + 1, y))) m |= 2; if (!w(tileAt(x, y + 1))) m |= 4; if (!w(tileAt(x - 1, y))) m |= 8; return m; };
  const cont4 = (x, y, same) => { let m = 0; if (same(tileAt(x, y - 1))) m |= 1; if (same(tileAt(x + 1, y))) m |= 2; if (same(tileAt(x, y + 1))) m |= 4; if (same(tileAt(x - 1, y))) m |= 8; return m; };
  const isDirt = k => k === K.DIRT || k === K.PLANK; const isWaterish = k => k === K.WATER || k === K.PLANK || k === K.CULVERT || k === K.DEEP; const isCliff = k => k === K.CLIFF || k === K.MOUTH; const isWallish = k => k === K.WALL;
  for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) {
    const k = tileAt(x, y); const sx = ox + x * TS, sy = oy + y * TS; const v = (x * 7 + y * 13) & 1;
    let spr = null;
    if (TSET.ready) {
      const hash = (x * 73 + y * 151) % 11;
      if (holl) {
        const floorTile = CAVE.floorGB(hash);
        switch (k) {
          case K.WALL: { const openS = !isWallish(tileAt(x, y + 1)); spr = openS ? (isWallish(tileAt(x, y - 1)) ? CAVE.wallFace() : CAVE.wallFaceBottom()) : CAVE.wallTop(); break; }
          case K.FLOOR: case K.ROCK: case K.BRAZIER: case K.STAL: case K.CRATE: spr = floorTile; break;
          case K.MOSS: g.drawImage(floorTile, sx, sy); spr = SPR.mossDecal ? SPR.mossDecal[(x + y) % 3] : null; break;
          case K.DEEP: { const c = cont4(x, y, kk => kk === K.DEEP); spr = c === 15 ? CAVE.water(wf) : CAVE.pool(c); break; }
          case K.SOFT: spr = SPR.soft[(x + y) % 3]; break;
          case K.MOUND: g.drawImage(SPR.soft[(x + y) % 3], sx, sy); spr = SPR.mound; break;
          case K.PIT: spr = SPR.pit[pitMask(x, y)]; break;
        }
      } else {
        const grassTile = hash < 7 ? OVER.grass() : OVER.grassVar(hash);
        switch (k) {
          case K.GRASS: case K.TREE: case K.HOUSE: case K.ROCK: case K.BUSH: case K.STUMP: case K.LAMP: case K.FENCE: spr = grassTile; break;
          case K.FLOWERS: g.drawImage(grassTile, sx, sy); spr = OVER.flowers(v); break;
          case K.DIRT: spr = sandPath(cont4(x, y, isDirt), (x * 5 + y * 3) % 4); break;
          case K.PLANK: spr = OVER.plank(); break;
          case K.WATER: case K.CULVERT: spr = OVER.water(wf); break;
          case K.CLIFF: case K.MOUTH: { const c = cont4(x, y, isCliff); if (c & 4) spr = OVER.cliffTop(c); else spr = OVER.cliffFace(2, !(c & 8) ? 0 : !(c & 2) ? 2 : 1); break; }
        }
      }
    }
    if (!spr)
    switch (k) {
      case K.WALL: spr = holl ? SPR.wall[wallMask(x, y)][v] : SPR.grass[0]; break;
      case K.FLOOR: case K.ROCK: case K.BRAZIER: case K.STAL: case K.CRATE: spr = holl ? SPR.earth[(x * 3 + y * 5) & 3] : SPR.grass[(x * 3 + y * 5) & 3]; break;
      case K.MOSS: spr = SPR.moss[(x + y) % 3]; break;
      case K.FLOWERS: spr = SPR.flowers[v]; break;
      case K.BUSH: case K.STUMP: case K.LAMP: case K.FENCE: spr = SPR.grass[(x * 3 + y * 5) & 3]; break;
      case K.CLIFF: spr = tileAt(x, y + 1) === K.CLIFF ? SPR.cliffTop[v] : SPR.cliffFace[v]; break;
      case K.SOFT: spr = SPR.soft[(x + y) % 3]; break;
      case K.MOUND: g.drawImage(SPR.soft[(x + y) % 3], sx, sy); spr = SPR.mound; break;
      case K.PIT: spr = SPR.pit[pitMask(x, y)]; break;
      case K.GRASS: case K.TREE: case K.HOUSE: case K.MOUTH: spr = ((x * 11 + y * 7) % 17 === 0) ? SPR.flowers[v] : SPR.grass[(x * 3 + y * 5) & 3]; break;
      case K.DIRT: spr = SPR.dirt[dirtMask(x, y)][v]; break;
      case K.WATER: case K.CULVERT: spr = SPR.water[waterMask(x, y)][wf]; break;
      case K.DEEP: spr = SPR.deep[waterMask(x, y)][wf]; break;
      case K.PLANK: spr = SPR.plank; break;
    }
    if (spr) g.drawImage(spr, sx, sy);
    if (TSET.ready && !holl && (k === K.WATER || k === K.CULVERT)) { const c = cont4(x, y, isWaterish); if (!(c & 1)) { g.fillStyle = '#d6ecf8'; g.fillRect(sx, sy, TS, 1); g.fillStyle = '#5d9be0'; for (let i = ((x * 3 + wf) % 4); i < TS; i += 4) g.fillRect(sx + i, sy + 1, 2, 1); } if (!(c & 4)) { g.fillStyle = '#d6ecf8'; g.fillRect(sx, sy + TS - 1, TS, 1); } }
    if (holl && k !== K.WALL && tileAt(x, y - 1) === K.WALL) { g.fillStyle = 'rgba(8,6,16,0.32)'; g.fillRect(sx, sy, TS, 4); g.fillStyle = 'rgba(8,6,16,0.14)'; g.fillRect(sx, sy + 4, TS, 3);
      const hh = (x * 31 + y * 17) % 7; if (hh < 3) { g.fillStyle = '#5f5468'; g.fillRect(sx + 2 + hh * 4, sy + 1, 3, 2); g.fillRect(sx + 9 - hh, sy + 2, 2, 2); g.fillStyle = '#3a3140'; g.fillRect(sx + 3 + hh * 4, sy + 2, 1, 1); } }
    if (holl && k === K.WALL && tileAt(x, y + 1) !== K.WALL) { const hh = (x * 13 + y * 29) % 5; if (hh < 2) { const sxx = sx + 3 + hh * 7; g.fillStyle = '#2b2430'; g.fillRect(sxx, sy, 3, 6 + hh); g.fillRect(sxx + 1, sy + 6 + hh, 1, 3); g.fillStyle = '#4a4052'; g.fillRect(sxx, sy, 1, 5); } }
    if (holl && k !== K.WALL && tileAt(x - 1, y) === K.WALL) { g.fillStyle = 'rgba(8,6,16,0.16)'; g.fillRect(sx, sy, 3, TS); }
    if (stairsAt && stairsAt.x === x && stairsAt.y === y && PROG.cleared[`${area.id}:${stairsAt.room}`]) g.drawImage(SPR.stairs, sx, sy);
  }
  // locks and sealed gates sit on the door cells
  for (const l of locks) if (!l.open) g.drawImage(SPR.lock, ox + l.x * TS, oy + l.y * TS);
  if (sealed && curRoom) for (const d of curRoom.doors) g.drawImage(SPR.gate, ox + d.x * TS, oy + d.y * TS);
}
function drawTellRim(c, x, y, alpha) { const s = CH.silhouette(c, '#ffb347'); g.globalAlpha = alpha; for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) g.drawImage(s, x + dx, y + dy); g.globalAlpha = 1; }
function drawEnemy(e, ox, oy) {
  const set = SPR.creature[e.id]; const frames = set[e.facing] || set.down;
  let fi = 0; if (e.state === 'tell') fi = 2; else if (e.state === 'attack' || e.state === 'charge') fi = 3; else if (e.flash > 0 || e.state === 'stagger' || e.state === 'stunned') fi = 4; else if (e.moving) fi = Math.floor(e.walk) % 2;
  const fr = frames[fi]; const sx = ox + Math.round(e.x), sy = oy + Math.round(e.y);
  if (!e.alive) { g.globalAlpha = Math.max(0, e.deadT / 0.6); g.save(); g.translate(sx, sy); g.rotate((1 - e.deadT / 0.6) * Math.PI / 2 * (e.facing === 'left' ? -1 : 1)); g.drawImage(fr.canvas, -fr.ax, -fr.ay); g.restore(); g.globalAlpha = 1; return; }
  if (e.state === 'under') return;
  const inWater = e.def.swims && SWIMMABLE.has(tileAt(Math.floor(e.x / TS), Math.floor((e.y - 2) / TS)));
  if (inWater) { const rp = SPR.ripple[(Math.floor(time * 4) + (e.def.big ? 2 : 0)) % 3]; g.drawImage(rp.canvas, sx - rp.ax, sy - rp.ay - 1); if (e.def.big) g.drawImage(rp.canvas, sx - rp.ax - 8, sy - rp.ay + 1); } else g.drawImage(e.def.big ? SPR.shadowBig : SPR.shadow, sx - (e.def.big ? 12 : 7), sy - 3);
  const bob = (e.moving && fi === 1) ? -1 : 0;
  if (e.state === 'tell') { const p = 0.35 + 0.45 * Math.abs(Math.sin(time * 18)); drawTellRim(fr.canvas, sx - fr.ax, sy - fr.ay + bob, p); }
  g.drawImage(fr.canvas, sx - fr.ax, sy - fr.ay + bob);
  if (e.flash > 0) { g.globalAlpha = Math.min(1, e.flash / 0.12); g.drawImage(CH.silhouette(fr.canvas, '#ffffff'), sx - fr.ax, sy - fr.ay + bob); g.globalAlpha = 1; }
  if (e.def.big && e.hp < e.maxHp) { /* the boss bar carries it */ }
  else if (e.hp < e.maxHp && e.aggroed) { const w = 14; g.fillStyle = '#1b1626'; g.fillRect(sx - w / 2 - 1, sy - fr.canvas.height - 3, w + 2, 3); g.fillStyle = '#e0433a'; g.fillRect(sx - w / 2, sy - fr.canvas.height - 2, Math.round(w * e.hp / e.maxHp), 1); }
}
function drawHero(ox, oy) {
  const set = SPR.hero[P.facing]; const phase = Math.floor(P.walk * 2) % 4; let fr = P.moving ? set[phase] : set[0];
  const swingSet = SPR.hero.swing && SPR.hero.swing[P.facing];
  if (swingSet && (P.atk > 0 || P.charging)) { const k = P.atk > 0 ? 1 - P.atk / P.atkDur : 0; fr = swingSet[P.charging ? 0 : P.thrust ? 3 : Math.min(3, Math.floor(k * 4))]; }
  const sx = ox + Math.round(P.x), sy = oy + Math.round(P.y);
  if (P.swim) { const rp = SPR.ripple[Math.floor(time * 4) % 3]; g.drawImage(rp.canvas, sx - rp.ax, sy - rp.ay - 1); } else g.drawImage(SPR.shadow, sx - 7, sy - 3);
  if (P.inv > 0 && !P.dead && Math.floor(time * 24) % 2 === 0 && P.roll <= 0) g.globalAlpha = 0.45;
  if (P.swim && !P.dead && P.roll <= 0) { const bob = Math.round(Math.sin(time * 5)); const cut = 9; g.drawImage(fr.canvas, 0, 0, fr.canvas.width, fr.canvas.height - cut, sx - fr.ax, sy - fr.ay + bob + 4, fr.canvas.width, fr.canvas.height - cut); g.globalAlpha = 1; return; }
  const ang = FACE_ANG[P.facing];
  const behind = P.facing === 'up';
  const drawSword = () => {
    if (swingSet && (P.atk > 0 || P.charging)) { if (P.charging && P.chargeT > 0.6 && Math.floor(time * 20) % 2) { g.globalAlpha = 0.5; g.drawImage(CH.silhouette(fr.canvas, '#ffd36b'), sx - fr.ax, sy - fr.ay + 1); g.globalAlpha = 1; } return; }
    if (P.atk > 0) {
      const k = 1 - P.atk / P.atkDur; let a;
      if (P.thrust) a = ang; else if (P.heavy) a = ang + (k < 0.3 ? -1.4 : (k - 0.3) / 0.7 * 2.8 - 1.4); else { const dir = P.combo === 1 ? -1 : 1; a = ang + dir * (-1.3 + Math.min(1, k / 0.6) * 2.6); }
      const i = ((Math.round(a / (Math.PI / 8)) % 16) + 16) % 16; const s = SPR.swords[i];
      const ex = P.thrust ? Math.cos(ang) * (2 + k * 8) : 0, ey = P.thrust ? Math.sin(ang) * (2 + k * 8) : 0;
      g.drawImage(s.canvas, Math.round(sx + Math.cos(a) * 3 + ex - s.ax), Math.round(sy - 10 + Math.sin(a) * 3 + ey - s.ay));
    } else if (P.charging) { const a = ang - 2.2; const i = ((Math.round(a / (Math.PI / 8)) % 16) + 16) % 16; const s = SPR.swords[i]; const sh = Math.sin(time * 40) * (P.chargeT > 0.6 ? 1 : 0); g.drawImage(s.canvas, Math.round(sx + Math.cos(a) * 3 - s.ax + sh), Math.round(sy - 10 + Math.sin(a) * 3 - s.ay)); if (P.chargeT > 0.6 && Math.floor(time * 20) % 2) { g.globalAlpha = 0.6; g.drawImage(CH.silhouette(s.canvas, '#ffd36b'), Math.round(sx + Math.cos(a) * 3 - s.ax + sh), Math.round(sy - 10 + Math.sin(a) * 3 - s.ay)); g.globalAlpha = 1; } }
    else if (P.dig > 0) { g.drawImage(SPR.claw, Math.round(sx + Math.cos(ang) * 8 - 6), Math.round(sy - 12 + Math.sin(ang) * 4 + Math.sin(time * 30) * 2)); }
  };
  if (behind) drawSword();
  if (P.roll > 0) { const k = 1 - P.roll / P.rollDur; const hop = Math.round(Math.sin(k * Math.PI) * 5); g.drawImage(fr.canvas, sx - fr.ax, sy - fr.ay + 1 - hop); }
  else if (P.dead) { g.save(); g.translate(sx, sy); g.rotate(Math.min(1, deadT) * Math.PI / 2); g.drawImage(fr.canvas, -fr.ax, -fr.ay); g.restore(); }
  else {
    g.drawImage(fr.canvas, sx - fr.ax, sy - fr.ay - (P.moving && fr.bob ? 1 : 0) + 1);
    if (P.flash > 0) { g.globalAlpha = Math.min(1, P.flash / 0.15) * 0.9; g.drawImage(CH.silhouette(fr.canvas, '#ff8a7a'), sx - fr.ax, sy - fr.ay + 1); g.globalAlpha = 1; }
    if (P.stagger > 0) fx.push({ kind: 'star', x: sx - ox + (Math.random() - 0.5) * 12, y: sy - oy - 28, t: 0.01 });
  }
  if (!behind) drawSword();
  if ((P.guard || P.parryT > 0) && P.roll <= 0) { const s = SPR.shield; g.drawImage(s, Math.round(sx + Math.cos(ang) * 7 - 6), Math.round(sy - 12 + Math.sin(ang) * 5 - 6)); if (P.parryT > 0) { g.globalAlpha = 0.7; g.drawImage(CH.silhouette(s, '#ffd36b'), Math.round(sx + Math.cos(ang) * 7 - 6), Math.round(sy - 12 + Math.sin(ang) * 5 - 6)); g.globalAlpha = 1; } }
  g.globalAlpha = 1;
}
function render() {
  const sh = (PROG.settings.shake !== false && shake > 0) ? shake : 0;
  const ox = -Math.round(cam.x + (sh ? (Math.random() - 0.5) * sh : 0)), oy = -Math.round(cam.y + (sh ? (Math.random() - 0.5) * sh : 0));
  g.fillStyle = area && area.def.kind === 'holloway' ? '#1a1420' : '#22421f'; g.fillRect(0, 0, BW, BH);
  if (state === 'title' || state === 'intro' || (state === 'pause' && menu.from === 'title')) { drawTitle(); present(); return; }
  drawTiles(ox, oy);
  const rid = curRoom ? curRoom.id : null;
  // ambient life: butterflies over the wood
  if (area.def.kind === 'wood') {
    for (let i = 0; i < 12; i++) { const t = time + i * 2.3; const bx = ((i * 97) % (area.W * TS)), by = ((i * 61) % (area.H * TS)); const x = ox + bx + Math.sin(t * 0.7) * 10, y = oy + by + Math.cos(t * 0.5) * 8 - 10 - Math.abs(Math.sin(t * 3)) * 3; if (x < -8 || y < -8 || x > BW + 8 || y > BH + 8) continue; g.drawImage(SPR.butterfly[(i % 2) * 2 + (Math.floor(t * 10) % 2)], Math.round(x), Math.round(y)); }
  }
  // flat things first
  for (const p of props) if (p.flat) { const s = p.kind === 'puddle' ? SPR.puddle[Math.floor(time * 3) % 3] : p.spr; if (s) g.drawImage(s.canvas, ox + Math.round(p.x - s.ax), oy + Math.round(p.y - s.ay)); }
  for (const e of enemies) if (e.state === 'mark' && e.mark) { const m = SPR.markerBig; g.globalAlpha = 0.5 + 0.5 * Math.abs(Math.sin(time * 20)); g.drawImage(m.canvas, ox + m.ax * 0 + Math.round(e.mark.x - m.ax), oy + Math.round(e.mark.y - m.ay)); g.globalAlpha = 1; }
  for (const r of rocks) if (!r.done) { const m = SPR.marker; g.globalAlpha = 0.4 + 0.6 * (r.t / r.mark); g.drawImage(m.canvas, ox + Math.round(r.x - m.ax), oy + Math.round(r.y - m.ay)); g.globalAlpha = 1; }
  // y-sorted
  const objs = [];
  for (const p of props) { if (p.flat) continue; if (p.y + oy < -40 || p.y + oy > BH + 60 || p.x + ox < -50 || p.x + ox > BW + 50) continue; objs.push({ y: p.y, x: p.x, draw: () => { if (p.kind === 'brazier') { const s = SPR.brazier[Math.floor(time * 8) % 3]; g.drawImage(s.canvas, ox + Math.round(p.x - s.ax), oy + Math.round(p.y - s.ay)); } else if (p.kind === 'house') { if (TSET.ready) { const s = SPR.houseTile; g.drawImage(s.canvas, ox + Math.round(p.x + p.house.w * TS / 2 - s.ax), oy + Math.round(p.y - s.ay)); } else { const s = p.spr; g.drawImage(s.canvas, ox + Math.round(p.x - s.ox), oy + Math.round(p.y - s.oy)); } } else { if (p.big) g.drawImage(SPR.shadowBig, ox + Math.round(p.x) - 12, oy + Math.round(p.y) - 4); g.drawImage(p.spr.canvas, ox + Math.round(p.x - p.spr.ax), oy + Math.round(p.y - p.spr.ay)); } } }); }
  for (const c of chests) objs.push({ y: c.y * TS + 15, x: c.x * TS + 8, draw: () => { const s = SPR.chest[c.open ? 1 : 0]; g.drawImage(s.canvas, ox + c.x * TS + 8 - s.ax, oy + c.y * TS + 15 - s.ay); } });
  for (const n of npcs) objs.push({ y: n.y, x: n.x, draw: () => { const set = n.frames[n.facing]; const fr = n.moving ? set[Math.floor(n.walk * 2) % 4] : set[0]; g.drawImage(SPR.shadow, ox + Math.round(n.x) - 7, oy + Math.round(n.y) - 3); g.drawImage(fr.canvas, ox + Math.round(n.x - fr.ax), oy + Math.round(n.y - fr.ay) + 1); if (state === 'play' && dist(n.x, n.y, P.x, P.y) < 22) g.drawImage(SPR.bubble, ox + Math.round(n.x) - 4, oy + Math.round(n.y) - 40 + Math.round(Math.sin(time * 4))); } });
  for (const e of enemies) if (rid === null ? dist(e.x, e.y, P.x, P.y) < 300 : e.room === rid) objs.push({ y: e.y + (e.state === 'under' ? -1000 : 0), x: e.x, draw: () => drawEnemy(e, ox, oy) });
  objs.push({ y: P.y, x: P.x, draw: () => drawHero(ox, oy) });
  for (const p of pickups) objs.push({ y: p.y, x: p.x, draw: () => { const bob = Math.round(Math.sin(time * 5 + p.x) * 1.5); let s; if (p.kind === 'coin') s = SPR.coin[Math.floor(time * 8 + p.x) % 4]; else if (p.kind === 'heart') s = SPR.heart[Math.floor(time * 4) % 2]; else if (p.kind === 'charm') s = SPR.charm[p.id]; else if (p.kind === 'keeping') s = SPR.heart[1]; if (!s) return; g.drawImage(SPR.shadow, ox + Math.round(p.x) - 7, oy + Math.round(p.y) - 1); if (p.kind === 'keeping') { g.globalAlpha = 0.5 + 0.5 * Math.abs(Math.sin(time * 6)); g.drawImage(CH.silhouette(s, '#fff'), ox + Math.round(p.x) - 6, oy + Math.round(p.y) - 12 + bob - 1); g.globalAlpha = 1; g.drawImage(s, ox + Math.round(p.x) - 6, oy + Math.round(p.y) - 12 + bob, 12, 12); } else g.drawImage(s, ox + Math.round(p.x - s.width / 2), oy + Math.round(p.y - s.height - 2 + bob)); } });
  objs.sort((a, b) => a.y - b.y || a.x - b.x);
  for (const o of objs) o.draw();
  // projectiles, rocks, fx
  for (const p of projectiles) { if (p.kind === 'stone') { g.fillStyle = '#8a8a90'; g.fillRect(ox + Math.round(p.x) - 2, oy + Math.round(p.y) - 2, 4, 4); g.fillStyle = '#c9c9d0'; g.fillRect(ox + Math.round(p.x) - 2, oy + Math.round(p.y) - 2, 2, 1); g.fillStyle = '#1b1626'; g.fillRect(ox + Math.round(p.x) + 1, oy + Math.round(p.y) + 1, 1, 1); } else if (p.kind === 'arrow') { const i = ((Math.round(p.ang / (Math.PI / 4)) % 8) + 8) % 8; g.drawImage(SPR.arrow[i], ox + Math.round(p.x) - 7, oy + Math.round(p.y) - 7); } else if (p.kind === 'spit') { g.fillStyle = '#7ab6a0'; g.fillRect(ox + Math.round(p.x) - 2, oy + Math.round(p.y) - 2, 4, 4); g.fillStyle = '#d6ecf8'; g.fillRect(ox + Math.round(p.x) - 1, oy + Math.round(p.y) - 1, 1, 1); } else g.drawImage(SPR.clod, ox + Math.round(p.x) - 4, oy + Math.round(p.y) - 4); }
  for (const r of rocks) { if (area.def.hazard === 'spout') { if (r.done) { const s = SPR.spout[Math.floor(time * 12) % 3]; g.globalAlpha = Math.max(0, r.gone / 0.3); g.drawImage(s.canvas, ox + Math.round(r.x - s.ax), oy + Math.round(r.y - s.ay)); g.globalAlpha = 1; } } else if (!r.done) { const h = (1 - r.t / r.mark) * 90; g.drawImage(SPR.fallRock, ox + Math.round(r.x) - 6, oy + Math.round(r.y - h) - 12); } }
  for (const f of fx) {
    if (f.kind === 'dot') { g.fillStyle = f.col; g.fillRect(ox + Math.round(f.x), oy + Math.round(f.y), Math.round(f.r), Math.round(f.r)); }
    else if (f.kind === 'spark') { g.fillStyle = f.col; g.fillRect(ox + Math.round(f.x), oy + Math.round(f.y), 2, 2); }
    else if (f.kind === 'smoke') { const k = 1 - f.t / f.max; g.globalAlpha = 0.5 * (1 - k); g.fillStyle = '#d8d3c8'; const r = 1 + Math.round(k * 4); g.fillRect(ox + Math.round(f.x) - r / 2, oy + Math.round(f.y) - r / 2, r, r); g.globalAlpha = 1; }
    else if (f.kind === 'star') { g.fillStyle = '#ffd36b'; g.fillRect(ox + Math.round(f.x), oy + Math.round(f.y), 2, 2); g.fillRect(ox + Math.round(f.x) - 1, oy + Math.round(f.y) + 1, 4, 1); }
    else if (f.kind === 'ring') { const k = 1 - f.t / f.max; g.strokeStyle = f.col; g.globalAlpha = 1 - k; g.lineWidth = 1; g.beginPath(); g.ellipse(ox + f.x, oy + f.y, f.r * k + 2, (f.r * k + 2) * 0.6, 0, 0, TAU); g.stroke(); g.globalAlpha = 1; }
    else if (f.kind === 'slash') { const k = 1 - f.t / f.max; g.strokeStyle = f.col || (f.heavy ? '#ffd36b' : '#f4f0e6'); g.globalAlpha = 0.85 * (1 - k); g.lineWidth = f.heavy ? 3 : 2; g.beginPath(); if (f.thrust) { g.moveTo(ox + f.x + Math.cos(f.ang) * 8, oy + f.y + Math.sin(f.ang) * 8); g.lineTo(ox + f.x + Math.cos(f.ang) * (f.r + 6), oy + f.y + Math.sin(f.ang) * (f.r + 6)); } else { const a0 = f.ang - 1.2 * f.dir, a1 = f.ang - 1.2 * f.dir + 2.4 * f.dir * Math.min(1, k * 1.6); g.ellipse(ox + f.x, oy + f.y, f.r, f.r * 0.75, 0, Math.min(a0, a1), Math.max(a0, a1)); } g.stroke(); g.globalAlpha = 1; }
  }
  // darkness and firelight in a holloway
  if (area.def.kind === 'holloway') {
    g.fillStyle = area.def.tint || 'rgba(8,6,16,0.28)'; g.fillRect(0, 0, BW, BH); if (area.def.tint) { g.fillStyle = 'rgba(8,6,16,0.16)'; g.fillRect(0, 0, BW, BH); }
    g.globalCompositeOperation = 'lighter';
    for (const p of props) if (p.kind === 'crystal') { const cx = ox + p.x, cy = oy + p.y - 8; const r = 22 + Math.sin(time * 3 + p.x) * 3; const gr = g.createRadialGradient(cx, cy, 1, cx, cy, r); gr.addColorStop(0, 'rgba(120,220,255,0.28)'); gr.addColorStop(1, 'rgba(0,0,0,0)'); g.fillStyle = gr; g.fillRect(cx - r, cy - r, r * 2, r * 2); }
    for (const p of props) if (p.kind === 'brazier') { const cx = ox + p.x, cy = oy + p.y - 14; const r = 40 + Math.sin(time * 9 + p.x) * 3; const gr = g.createRadialGradient(cx, cy, 2, cx, cy, r); gr.addColorStop(0, 'rgba(255,170,70,0.35)'); gr.addColorStop(1, 'rgba(0,0,0,0)'); g.fillStyle = gr; g.fillRect(cx - r, cy - r, r * 2, r * 2); }
    g.globalCompositeOperation = 'source-over';
  }
  // floaters (world text)
  g.__world = true; for (const f of floaters) { g.globalAlpha = Math.min(1, f.t / 0.3); text(g, f.s, ox + f.x, oy + f.y, f.col, 1, 'c', '#1b1626'); } g.globalAlpha = 1; g.__world = false;
  drawHud();
  if (state === 'talk') drawTalk();
  if (state === 'pause') drawPause();
  if (state === 'shop') drawShop();
  if (state === 'dead') drawDead();
  if (state === 'won') drawWon();
  present();
}
function present() { dg.fillStyle = '#0b1410'; dg.fillRect(0, 0, disp.width, disp.height); dg.imageSmoothingEnabled = false; dg.drawImage(buf, offX, offY, BW * SC, BH * SC); }
function plate(x, y, w, h, col = 'rgba(20,14,30,0.75)') { g.fillStyle = col; g.fillRect(x, y, w, h); g.fillStyle = '#5a4a6a'; g.fillRect(x, y, w, 1); g.fillRect(x, y + h - 1, w, 1); g.fillRect(x, y, 1, h); g.fillRect(x + w - 1, y, 1, h); }
function bar(x, y, w, h, k, col, back = '#1b1626') { g.fillStyle = back; g.fillRect(x - 1, y - 1, w + 2, h + 2); g.fillStyle = col; g.fillRect(x, y, Math.round(w * clamp(k, 0, 1)), h); g.fillStyle = 'rgba(255,255,255,0.18)'; g.fillRect(x, y, Math.round(w * clamp(k, 0, 1)), 1); }
function drawHud() {
  if (!area) return;
  // heart + stamina
  plate(4, 4, 96, 24);
  text(g, 'HEART', 8, 7, '#ff8a7a'); bar(34, 7, 60, 5, P.hp / P.maxHp, P.hp / P.maxHp < 0.3 && Math.floor(time * 6) % 2 ? '#ff3a2a' : '#e0433a'); text(g, `${Math.ceil(P.hp)}`, 96, 7, '#f4f0e6', 1, 'r');
  text(g, 'STAM', 8, 17, '#9ad06a'); bar(34, 17, 60, 4, P.st / P.maxSt, P.st < rollCost() ? '#c9a227' : '#7ab648'); text(g, `LV${P.lvl}`, 96, 17, '#9ad0ff', 1, 'r');
  // xp
  bar(4, 30, 96, 2, P.xp / xpNeed(P.lvl), '#9ad0ff', 'rgba(0,0,0,0.5)');
  // gold / keys / claw
  plate(BW - 64, 4, 60, 12); g.drawImage(SPR.coin[0], BW - 61, 6); text(g, `${P.gold}`, BW - 51, 8, '#f4d35e');
  if (P.keys) { g.drawImage(SPR.key, BW - 34, 6); text(g, `${P.keys}`, BW - 21, 8, '#f4d35e'); }
  if (P.abilities.claw) { g.drawImage(SPR.clawIcon, BW - 16, 6); }
  if (P.abilities.lungs) { g.drawImage(SPR.lungsIcon, BW - 16, 20); }
  if (P.pts > 0 && Math.floor(time * 2) % 2) text(g, `${P.pts} POINT${P.pts > 1 ? 'S' : ''} (TAB)`, BW - 4, 20, '#9ad0ff', 1, 'r', '#1b1626');
  for (let i = 0; i < 2; i++) { const id = P.equipped[i]; if (id) g.drawImage(SPR.charm[id], 4 + i * 12, 36); }
  // room / area banner
  if (roomBanner.t > 0) { const a = Math.min(1, roomBanner.t / 0.5); g.globalAlpha = a; const w = textW(roomBanner.name) * 2 + 20; plate(BW / 2 - w / 2, 40, w, 18, 'rgba(20,14,30,0.8)'); text(g, roomBanner.name, BW / 2, 44, '#f4f0e6', 2, 'c', '#1b1626'); g.globalAlpha = 1; }
  // boss / mini bar
  const big = enemies.find(e => e.def.big && e.alive && curRoom && e.room === curRoom.id && e.aggroed);
  if (big) { const w = 180; plate(BW / 2 - w / 2 - 4, BH - 22, w + 8, 16); text(g, big.def.name, BW / 2, BH - 20, '#ff8a7a', 1, 'c'); bar(BW / 2 - w / 2, BH - 12, w, 4, big.hp / big.maxHp, big.def.boss ? '#e0433a' : '#ffb347'); if (big.state === 'tell') text(g, big.tellName, BW / 2 + w / 2 + 2, BH - 20, '#ffb347', 1, 'l', '#1b1626'); }
  // toasts
  let ty = BH - 34; for (let i = toasts.length - 1; i >= 0; i--) { const t = toasts[i]; g.globalAlpha = Math.min(1, t.t / 0.4); const w = textW(t.s) + 12; plate(BW / 2 - w / 2, ty, w, 11); text(g, t.s, BW / 2, ty + 3, t.col, 1, 'c'); ty -= 13; } g.globalAlpha = 1;
  // tutorial card
  if (tut && TUT[tut.i] && state === 'play') { const s = TUT[tut.i].text; const lines = wrap(s, 200); const h = lines.length * 7 + 12; plate(BW / 2 - 106, BH - 48 - h, 212, h, 'rgba(14,20,50,0.85)'); text(g, `${tut.i + 1}/${TUT.length}`, BW / 2 - 100, BH - 48 - h + 4, '#9ad0ff'); lines.forEach((l, i) => text(g, l, BW / 2, BH - 48 - h + 4 + i * 7, '#f4f0e6', 1, 'c')); if (TUT[tut.i].done()) text(g, 'GOOD', BW / 2 + 100, BH - 48 - h + 4, '#9ad06a', 1, 'r'); }
  // soft-earth prompt
  if (state === 'play' && P.abilities.claw) { const a = FACE_ANG[P.facing]; const tx = Math.floor((P.x + Math.cos(a) * 11) / TS), ty2 = Math.floor((P.y - 4 + Math.sin(a) * 11) / TS); if (DIGGABLE.has(tileAt(tx, ty2))) text(g, 'X: DIG', BW / 2, BH - 30, '#e6dcc4', 1, 'c', '#1b1626'); }
  if (god) text(g, 'GOD', BW - 4, BH - 8, '#ff6a3a', 1, 'r');
}
function drawTalk() {
  const x = 8, w = BW - 16, h = 44, y = BH - h - 6; g.fillStyle = '#f4f0e6'; g.fillRect(x, y, w, h); g.fillStyle = '#1b1626'; g.fillRect(x + 1, y + 1, w - 2, h - 2);
  const gr = g.createLinearGradient(0, y, 0, y + h); gr.addColorStop(0, '#2c3d9c'); gr.addColorStop(1, '#0f1650'); g.fillStyle = gr; g.fillRect(x + 2, y + 2, w - 4, h - 4);
  const full = talk.lines[talk.i]; const shown = full.slice(0, Math.floor(talk.shown)); const ci = full.indexOf(':');
  let body = shown, name = null; if (ci > 0 && ci < 16) { name = full.slice(0, ci); body = shown.slice(ci + 1).trim(); }
  let yy = y + 6; if (name) { text(g, name, x + 8, yy, '#f4d35e'); yy += 8; }
  for (const l of wrap(body, w - 20).slice(0, 4)) { text(g, l, x + 8, yy, '#fff8e8'); yy += 7; }
  if (talk.shown >= full.length && Math.floor(time * 3) % 2 === 0) text(g, '>', x + w - 10, y + h - 9, '#f4d35e');
}
function drawTitle() {
  // a slow forest with the mouth of the warren
  const rnd = mulberry(5); g.fillStyle = '#16301a'; g.fillRect(0, 0, BW, BH);
  for (let i = 0; i < 40; i++) { const x = rnd() * BW, y = 40 + rnd() * 140; const s = SPR.trees[Math.floor(rnd() * 6)]; const sh = Math.sin(time * 0.6 + i) * 0.5; g.drawImage(s.canvas, Math.round(x - s.ax + sh), Math.round(y - s.ay)); }
  g.fillStyle = 'rgba(8,6,16,0.45)'; g.fillRect(0, 0, BW, BH);
  const m = SPR.mouth; g.drawImage(m.canvas, BW / 2 - m.ax, BH - 6 - m.ay);
  // fireflies
  for (let i = 0; i < 18; i++) { const t = time * 0.5 + i * 1.7; const x = (i * 53 + Math.sin(t) * 18 + 30) % BW, y = 60 + ((i * 37) % 100) + Math.cos(t * 1.3) * 8; const a = 0.4 + 0.6 * Math.abs(Math.sin(t * 2.1 + i)); g.globalAlpha = a; g.fillStyle = '#ffe98a'; g.fillRect(Math.round(x), Math.round(y), 1, 1); g.globalAlpha = a * 0.35; g.fillRect(Math.round(x) - 1, Math.round(y) - 1, 3, 3); }
  g.globalAlpha = 1;
  if (state === 'intro') {
    plate(20, 40, BW - 40, 100, 'rgba(10,8,20,0.9)');
    const full = INTRO[intro.i]; const shown = full.slice(0, Math.floor(intro.shown)); let yy = 50;
    for (const l of wrap(shown, BW - 64)) { text(g, l, BW / 2, yy, intro.i === 0 || intro.i === 3 ? '#ffd36b' : '#f4f0e6', 1, 'c'); yy += 8; }
    if (intro.shown >= full.length && Math.floor(time * 3) % 2 === 0) text(g, 'Z / SPACE', BW / 2, 128, '#9ad0ff', 1, 'c');
    text(g, 'ESC SKIPS', BW - 24, BH - 10, '#5a4a6a', 1, 'r');
    return;
  }
  if (state === 'pause') { drawPause(); return; }
  text(g, 'HOLLOWAY', BW / 2, 26 + Math.round(Math.sin(time) * 1), '#f4f0e6', 3, 'c', '#1b1626');
  text(g, 'WHAT YOU TAKE FROM THE WOOD, YOU KEEP', BW / 2, 50, '#c9b9a0', 1, 'c');
  const items = titleItems(); items.forEach((it, i) => { const sel = i === title.sel; text(g, (sel ? '> ' : '') + it + (sel ? ' <' : ''), BW / 2, 84 + i * 12, sel ? '#ffd36b' : '#c9b9a0', 1, 'c', '#1b1626'); });
  text(g, 'A HOLLOWAY IS A ROAD WORN SO DEEP THE SKY IS A SLOT', BW / 2, 130, '#5a4a6a', 1, 'c');
  text(g, 'ARROWS  Z/ENTER TAKES', BW / 2, BH - 12, '#5a4a6a', 1, 'c');
}
function drawPause() {
  plate(10, 10, BW - 20, BH - 20, 'rgba(10,8,20,0.92)');
  const fromTitle = menu.from === 'title';
  if (!fromTitle) { let x = 18; TABS.forEach((t, i) => { const sel = i === menu.tab; text(g, t, x, 14, sel ? '#ffd36b' : '#7a6a8a'); if (sel) { g.fillStyle = '#ffd36b'; g.fillRect(x, 20, textW(t), 1); } x += textW(t) + 12; }); text(g, '< >', BW - 18, 14, '#5a4a6a', 1, 'r'); }
  else text(g, 'SETTINGS', 18, 14, '#ffd36b');
  const tab = TABS[menu.tab]; const y0 = 28;
  if (tab === 'STATUS') {
    const rows = [['LEVEL', P.lvl], ['HEART', `${Math.ceil(P.hp)} / ${P.maxHp}`], ['STAMINA', P.maxSt], ['MIGHT', P.might], ['XP', `${P.xp} / ${xpNeed(P.lvl)}`], ['GOLD', P.gold], ['KEYS', P.keys], ['KEEPINGS', P.keepings], ['POINTS', P.pts]];
    rows.forEach(([k, v], i) => { text(g, k, 22, y0 + i * 9, '#c9b9a0'); text(g, String(v), 100, y0 + i * 9, '#f4f0e6'); });
    text(g, 'ABILITIES', 160, y0, '#c9b9a0'); let yy = y0 + 9; if (P.abilities.claw) { g.drawImage(SPR.clawIcon, 160, yy); text(g, 'THE CLAW: HOLD X AT SOFT EARTH', 174, yy + 3, '#f4f0e6'); yy += 12; } if (P.abilities.lungs) { g.drawImage(SPR.lungsIcon, 160, yy); text(g, 'THE LUNGS: WALK INTO DEEP WATER', 174, yy + 3, '#f4f0e6'); yy += 12; } if (!P.abilities.claw && !P.abilities.lungs) text(g, 'NONE YET. THE WOOD HAS THEM', 160, yy, '#5a4a6a');
    text(g, 'THE WOOD KEEPS WHAT IT TAKES.', 160, BH - 40, '#5a4a6a'); text(g, 'WHAT YOU TAKE FROM THE WOOD, YOU KEEP.', 160, BH - 33, '#5a4a6a');
  } else if (tab === 'SKILLS') {
    text(g, `${P.pts} POINT${P.pts === 1 ? '' : 'S'} TO SPEND`, BW - 18, y0 - 2, '#9ad0ff', 1, 'r');
    BRANCH.forEach((b, bi) => { const x = 22 + bi * 96; text(g, b, x, y0, '#ffd36b'); for (let t = 0; t < 3; t++) { const s = SKILLS[bi * 3 + t]; const i = bi * 3 + t; const own = has(s.id); const prevOk = t === 0 || has(SKILLS[bi * 3 + t - 1].id); const sel = menu.sel === i; const col = own ? '#9ad06a' : prevOk ? '#f4f0e6' : '#5a4a6a'; plate(x - 2, y0 + 10 + t * 16, 88, 14, sel ? 'rgba(60,50,90,0.9)' : 'rgba(20,14,30,0.6)'); text(g, (own ? '* ' : '') + fitText(s.name, 80), x + 1, y0 + 14 + t * 16, col); } });
    const s = SKILLS[menu.sel]; const lines = wrap(s.desc, BW - 60); lines.forEach((l, i) => text(g, l, BW / 2, y0 + 62 + i * 8, '#c9b9a0', 1, 'c')); text(g, has(s.id) ? 'TAKEN' : P.pts > 0 ? 'Z TAKES IT' : 'NO POINTS. LEVEL UP', BW / 2, BH - 32, '#5a4a6a', 1, 'c');
  } else if (tab === 'CHARMS') {
    text(g, 'TWO SLOTS. Z WEARS OR TAKES OFF', 22, y0, '#c9b9a0');
    if (!P.charms.length) text(g, 'NONE YET. CREATURES DROP THEM. THE BESTIARY SAYS HOW OFTEN', 22, y0 + 12, '#5a4a6a');
    P.charms.forEach((id, i) => { const c = CHARMS[id]; const sel = menu.sel === i; const on = wearing(id); plate(20, y0 + 10 + i * 20, BW - 60, 18, sel ? 'rgba(60,50,90,0.9)' : 'rgba(20,14,30,0.6)'); g.drawImage(SPR.charm[id], 24, y0 + 14 + i * 20); text(g, c.name + (on ? '  (WORN)' : ''), 38, y0 + 13 + i * 20, on ? '#9ad06a' : '#f4f0e6'); text(g, fitText(c.desc, BW - 100), 38, y0 + 21 + i * 20, '#c9b9a0'); });
  } else if (tab === 'BESTIARY') {
    const ids = Object.keys(ENEMIES); ids.forEach((id, i) => { const d = ENEMIES[id]; const seen = PROG.seen[id]; const sel = menu.sel === i; text(g, (sel ? '> ' : '  ') + (seen ? d.name : '?????'), 18, y0 + i * 9, sel ? '#ffd36b' : seen ? '#f4f0e6' : '#5a4a6a'); if (seen) text(g, `x${PROG.kills[id] || 0}`, 118, y0 + i * 9, '#c9b9a0', 1, 'r'); });
    const id = ids[menu.sel]; const d = ENEMIES[id]; const seen = PROG.seen[id];
    if (seen) { const fr = SPR.creature[id].down[0]; const sc = fr.canvas.width > 40 ? 0.75 : 1; g.drawImage(fr.canvas, Math.round(150 - fr.ax * sc), Math.round(y0 + 44 - fr.ay * sc), Math.round(fr.canvas.width * sc), Math.round(fr.canvas.height * sc)); text(g, d.name, 186, y0, '#ffd36b'); const lines = wrap(d.blurb, BW - 200); lines.slice(0, 7).forEach((l, i) => text(g, l, 186, y0 + 9 + i * 7, '#c9b9a0')); text(g, `HEART ${d.hp}`, 186, y0 + 60, '#f4f0e6'); text(g, fitText('TELLS: ' + d.tells.join(', '), BW - 200), 186, y0 + 67, '#ffb347'); text(g, 'KEEPS:', 186, y0 + 77, '#9ad06a'); d.drops.forEach((dr, i) => { const nm = dr.item.startsWith('charm:') ? CHARMS[dr.item.split(':')[1]].name : dr.item.toUpperCase(); text(g, `${nm}  ${dr.rate >= 1 ? 'ALWAYS' : Math.round(dr.rate * 100) + '%'}`, 186, y0 + 85 + i * 7, '#c9b9a0'); }); }
    else text(g, 'NOT YET SEEN', 190, y0, '#5a4a6a');
  } else if (tab === 'SETTINGS') {
    const S = PROG.settings; const rows = [['SOUND', `${Math.round(S.sfx * 10)}`], ['MUSIC', `${Math.round(S.music * 10)}`], ['SCREEN SHAKE', S.shake === false ? 'OFF' : 'ON'], ['GUIDED START', S.help === false ? 'OFF' : 'ON'], ['ERASE THE SAVE', menu.confirm ? 'Z AGAIN TO ERASE' : '']];
    rows.forEach(([k, v], i) => { const sel = menu.sel === i; text(g, (sel ? '> ' : '  ') + k, 22, y0 + i * 12, sel ? '#ffd36b' : '#f4f0e6'); text(g, v, 160, y0 + i * 12, i === 4 ? '#ff6a3a' : '#c9b9a0'); if (sel && i < 2) text(g, '< >', 200, y0 + i * 12, '#5a4a6a'); });
    text(g, 'TILES: ARMM1998 (CC0), GEORGE BAILEY (CC-BY 4.0)', 22, BH - 38, '#5a4a6a');
    text(g, 'ESC CLOSES', 22, BH - 30, '#5a4a6a');
    text(g, 'X CUT  HOLD X HEAVY  C GUARD  TAP C PARRY  Z STEP  SPACE TALK', 22, BH - 22, '#5a4a6a');
  }
}
function drawDead() { g.fillStyle = `rgba(20,4,8,${Math.min(0.7, deadT * 0.6)})`; g.fillRect(0, 0, BW, BH); if (deadT > 0.6) { text(g, 'THE WOOD KEEPS YOU', BW / 2, 70, '#ff6a3a', 2, 'c', '#1b1626'); text(g, `TAKEN BY ${P.lastHurtBy}`, BW / 2, 92, '#c9b9a0', 1, 'c'); if (deadT > 1.2 && Math.floor(time * 3) % 2 === 0) text(g, 'Z: BACK TO THE LAST SAFE PLACE', BW / 2, 112, '#f4f0e6', 1, 'c'); } }
function drawWon() { g.fillStyle = `rgba(4,8,20,${Math.min(0.8, wonT * 0.6)})`; g.fillRect(0, 0, BW, BH); if (wonT > 0.5) { const wc = area.def.won || { title: 'IT IS DONE', lines: [] }; text(g, wc.title, BW / 2, 50, '#ffd36b', 2, 'c', '#1b1626'); const lines = wc.lines; let yy = 72; for (const l of lines) for (const w of wrap(l, BW - 60)) { text(g, w, BW / 2, yy, '#f4f0e6', 1, 'c'); yy += 8; } if (wonT > 2 && Math.floor(time * 3) % 2 === 0) text(g, 'Z: UP INTO THE WOOD', BW / 2, BH - 20, '#9ad0ff', 1, 'c'); } }

// ---------------------------------------------------------------------------------------------
// LOOP — RAF plus a watchdog, so a hidden pane still paints
// ---------------------------------------------------------------------------------------------
let last = performance.now(), lastTick = 0, rafQueued = false;
function tick(now) { lastTick = now; const dt = Math.max(0, Math.min(1 / 30, (now - last) / 1000)); last = now; pollPad(); update(dt); render(); }
function frame(now) { rafQueued = false; tick(now); if (!rafQueued) { rafQueued = true; requestAnimationFrame(frame); } }

bakeAll();
let booted = false;
function bootGame() {
  if (booted) return; booted = true;
  if (TSET.ready) {
    SPR.trees = [0, 1, 2, 3, 4, 5].map(() => OVER.tree()); SPR.bush = [0, 1, 2].map(() => OVER.bush()); SPR.stump = [0, 1].map(() => OVER.stump());
    SPR.rockWood = OVER.rock(); SPR.rockCave = CAVE.rockGB(0); SPR.fenceTile = OVER.fence(); SPR.houseTile = OVER.house(); SPR.mouthTile = OVER.mouth();
    SPR.stal = [0, 1, 2].map(i => CAVE.rockGB(i)); SPR.mushrooms = [0, 1, 2].map(i => CAVE.mushroomGB(i)); SPR.plantGB = [0, 1].map(i => CAVE.plantGB(i)); SPR.crystalGB = [0, 1, 2, 3].map(i => CAVE.crystalGB(i));
    SPR.hero = bakePerson(CH.HERO_LOOK);
  }
  if (loadSave()) applySettings();
  rafQueued = true; requestAnimationFrame(frame);
  setInterval(() => { if (performance.now() - lastTick > 250) tick(performance.now()); }, 125);
  const b = document.getElementById('boot'); if (b) b.remove();
}
loadTileset(bootGame); setTimeout(bootGame, 4000);

// debug / harness API
window.HW = {
  P, get area() { return area; }, get enemies() { return enemies; }, get state() { return state; }, set state(v) { state = v; }, get room() { return curRoom; }, get sealed() { return sealed; },
  get PROG() { return PROG; }, get cam() { return cam; }, buf, keys, pressed: () => pressed, ENEMIES, SKILLS, CHARMS, TUT, get tut() { return tut; }, set tut(v) { tut = v; },
  load(id, at) { load(id, at || 'start'); state = 'play'; }, tp(x, y) { P.x = x; P.y = y; P.lastSafe = { x, y }; const r = roomAt(x, y); curRoom = r; snapCamera(); if (state === 'slide') state = 'play'; },
  newGame() { PROG = progDefaults(); applyProg(); load('wood', 'start'); state = 'play'; tut = null; },
  step(n = 1, dt = 1 / 60) { for (let i = 0; i < n; i++) update(dt); render(); },
  press(code) { keys.add(code); pressed.add(code); }, release(code) { keys.delete(code); },
  slay(e) { killEnemy(e); }, set god(v) { god = v; }, get god() { return god; }, give: giveItem, save, time: () => time, toast, xpNeed, get rocks() { return rocks; },
  bot(opts) { return import('./bot.js').then(m => m.runBot(window.HW, opts || {})); },
};
if (new URLSearchParams(location.search).get('bot')) { const go = () => { if (!booted) { setTimeout(go, 100); return; } HW.newGame(); HW.bot().then(r => { window.__botRes = r; console.log('BOT', JSON.stringify(r, null, 1)); }); }; go(); }
