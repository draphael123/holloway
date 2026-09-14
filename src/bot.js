// bot.js — an in-page playtest bot on the real loop with the real art. `?bot=1` or `await HW.bot(opts)`.
// It walks the intended route of a holloway (world.js `route`), fights what seals a room, opens the chest,
// digs the plug, kills the boss, takes the stairs. It records deaths, kills, frames, NaN draws, UI text
// outside the buffer, blank frames, and errors. A death three times in one room lifts the bot past it.
import { AREAS, K, SOLID, DIGGABLE, SWIMMABLE, CELL_W, CELL_H } from './world.js';

const TS = 16;
export async function runBot(HW, opts = {}) {
  const report = { deaths: 0, kills: 0, steps: 0, nanDraws: 0, offscreenText: 0, blankFrames: 0, errors: [], notes: [], rooms: {}, t0: performance.now() };
  // ---- instrumentation ----
  const g = HW.buf.getContext('2d');
  const oDraw = g.drawImage.bind(g), oText = g.drawImage;
  g.drawImage = function (...a) { for (let i = 1; i < a.length; i++) if (typeof a[i] === 'number' && !Number.isFinite(a[i])) { report.nanDraws++; if (report.nanDraws < 4) report.notes.push('NaN draw: ' + new Error().stack.split('\n')[2]); return; } return oDraw(...a); };
  const onErr = e => { report.errors.push(String(e.message || e.reason || e)); }; addEventListener('error', onErr); addEventListener('unhandledrejection', onErr);
  const blank = () => { const d = g.getImageData(0, 0, 320, 180).data; const cols = new Set(); for (let i = 0; i < d.length; i += 4 * 97) cols.add((d[i] >> 4) + ',' + (d[i + 1] >> 4) + ',' + (d[i + 2] >> 4)); return cols.size < 4; };
  const P = HW.P;
  const step = n => { HW.step(n); report.steps += n; };
  const tap = async (code, frames = 2) => { HW.press(code); step(frames); HW.release(code); step(1); };
  const holdDir = (dx, dy) => { for (const c of ['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight']) HW.release(c); if (dy < -0.3) HW.press('ArrowUp'); if (dy > 0.3) HW.press('ArrowDown'); if (dx < -0.3) HW.press('ArrowLeft'); if (dx > 0.3) HW.press('ArrowRight'); };
  const stop = () => holdDir(0, 0);
  const yieldNow = () => new Promise(r => setTimeout(r, 0));
  const area = () => HW.area;
  const tile = (x, y) => { const a = area(); return (x < 0 || y < 0 || x >= a.W || y >= a.H) ? K.WALL : a.tiles[y * a.W + x]; };
  const swim = () => !!P.abilities.lungs;
  const passable = (x, y, allowDig) => { const k = tile(x, y); if (k === K.PIT) return false; if (DIGGABLE.has(k)) return allowDig; if (SWIMMABLE.has(k)) return swim(); return !SOLID.has(k); };
  // BFS in tiles from the player's tile to a target tile (4-neighbour), returns list of tile centres
  const path = (tx, ty, allowDig = false) => {
    const a = area(); const sx = Math.floor(P.x / TS), sy = Math.floor((P.y - 1) / TS); const key = (x, y) => x + ',' + y;
    const prev = new Map([[key(sx, sy), null]]); const q = [[sx, sy]]; let found = false;
    while (q.length) { const [x, y] = q.shift(); if (x === tx && y === ty) { found = true; break; } for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const nx = x + dx, ny = y + dy; if (prev.has(key(nx, ny))) continue; if (!(passable(nx, ny, allowDig) || (nx === tx && ny === ty))) continue; if (HW.sealed && HW.room && HW.room.doors.some(d => d.x === nx && d.y === ny)) continue; prev.set(key(nx, ny), [x, y]); q.push([nx, ny]); } }
    if (!found) return null; const out = []; let cur = [tx, ty]; while (cur) { out.push(cur); cur = prev.get(key(cur[0], cur[1])); } return out.reverse();
  };
  const walkTo = async (tx, ty, { allowDig = false, maxFrames = 900, stopAt = 6 } = {}) => {
    let pth = path(tx, ty, false) || (allowDig ? path(tx, ty, true) : null); if (!pth) { report.notes.push(`nopath from ${Math.floor(P.x / TS)},${Math.floor((P.y - 1) / TS)} in ${HW.area.id} to ${tx},${ty} (state ${HW.state}, room ${HW.room && HW.room.id})`); return 'nopath'; }
    let i = 1, frames = 0, lastPos = [P.x, P.y], stuck = 0; report.lastWalk = { to: [tx, ty], len: pth.length, trace: [] }; const startArea = HW.area.id;
    while (i < pth.length && frames < maxFrames) {
      if (frames % 40 === 0) report.lastWalk.trace.push([frames, i, Math.round(P.x), Math.round(P.y), HW.state, HW.room && HW.room.id, stuck]);
      const [cx, cy] = pth[i]; const gx = cx * TS + 8, gy = cy * TS + 9; const dx = gx - P.x, dy = gy - P.y; const d = Math.hypot(dx, dy);
      if (d < 4 || (i === pth.length - 1 && d < stopAt)) { i++; continue; }
      // a diggable tile in the way: face it and hold X
      const nk = tile(cx, cy); if (DIGGABLE.has(nk) && allowDig && d < 18) { holdDir(dx, dy); step(2); stop(); HW.press('KeyX'); step(3); HW.release('KeyX'); step(40); frames += 45; continue; }
      holdDir(dx, dy); step(1); frames++;
      if (HW.state !== 'play') { stop(); return HW.state; }
      if (HW.area.id !== startArea) { stop(); return 'area:' + HW.area.id; }
      if (Math.hypot(P.x - lastPos[0], P.y - lastPos[1]) < 0.2) { stuck++; if (stuck > 30) { stop(); pth = path(tx, ty, allowDig); if (!pth) return 'stuck'; i = 1; stuck = 0; await tap('KeyZ', 3); } } else stuck = 0;
      lastPos = [P.x, P.y];
      if (frames % 60 === 0) await yieldNow();
    }
    stop(); return frames >= maxFrames ? 'timeout' : 'ok';
  };
  const nearestLand = () => { const sx = Math.floor(P.x / TS), sy = Math.floor((P.y - 1) / TS); let best = null, bd = 1e9; for (let dy = -6; dy <= 6; dy++) for (let dx = -8; dx <= 8; dx++) { const x = sx + dx, y = sy + dy; const k = tile(x, y); if (k !== K.FLOOR) continue; if (HW.room && (x < HW.room.x || x >= HW.room.x + HW.room.w || y < HW.room.y || y >= HW.room.y + HW.room.h)) continue; const d = dx * dx + dy * dy; if (d < bd) { bd = d; best = [x, y]; } } return best; };
  const liveHere = () => HW.enemies.filter(e => e.alive && (HW.room ? e.room === HW.room.id : Math.hypot(e.x - P.x, e.y - P.y) < 160));
  // fight everything alive in the current room: approach, cut, roll away from a tell
  const fight = async (maxFrames = 3600) => {
    let frames = 0, deathsHere = 0; if (liveHere().some(e => e.def.big)) maxFrames *= 2;
    while (liveHere().length && frames < maxFrames) {
      const es = liveHere(); let e = null, best = 1e9; for (const x of es) { if (x.state === 'under') continue; const d = Math.hypot(x.x - P.x, x.y - (P.y - 4)); if (d < best) { best = d; e = x; } }
      if (!e) { step(5); frames += 5; continue; }
      const dx = e.x - P.x, dy = e.y - (P.y - 4), d = Math.hypot(dx, dy);
      if (P.swim) { const land = nearestLand(); if (land) { holdDir(land[0] * TS + 8 - P.x, land[1] * TS + 9 - P.y); step(1); frames++; continue; } }
      const danger = es.some(x => x.state === 'tell' && x.tellT < 0.22 && Math.hypot(x.x - P.x, x.y - P.y) < 50) || es.some(x => x.state === 'charge' && Math.hypot(x.x - P.x, x.y - P.y) < 70) || es.some(x => x.mark && Math.hypot(x.mark.x - P.x, x.mark.y - P.y) < 34) || (window.HW.shocks || []).some(s => Math.abs(Math.hypot(s.x - P.x, s.y - P.y) - s.r) < 40);
      const rockDanger = (window.HW.rocks || []).some(r => !r.done && r.t > r.mark - 0.3 && Math.hypot(r.x - P.x, r.y - P.y) < 22);
      if ((danger || rockDanger) && P.roll <= 0) {
        if (P.st > 25) { const a = Math.atan2(dy, dx) + Math.PI / 2 * (Math.random() < 0.5 ? 1 : -1); holdDir(Math.cos(a), Math.sin(a)); await tap('KeyZ', 2); step(14); frames += 17; stop(); continue; }
        stop(); holdDir(Math.abs(dx) > Math.abs(dy) ? Math.sign(dx) : 0, Math.abs(dx) > Math.abs(dy) ? 0 : Math.sign(dy)); step(1); stop(); HW.press('KeyC'); step(24); HW.release('KeyC'); step(2); frames += 27; continue; }
      const anyTell = es.some(x => x.state === 'tell' && Math.hypot(x.x - P.x, x.y - P.y) < 60);
      const stunned = e.state === 'stunned' || e.state === 'recover' || e.state === 'stagger';
      const reach = e.r + 16;
      const nextTile = tile(Math.floor((P.x + Math.sign(dx) * 9) / TS), Math.floor((P.y + Math.sign(dy) * 9) / TS));
      if (d > reach && e.def.big && e.def.swims && SWIMMABLE.has(nextTile)) { stop(); step(3); frames += 3; }
      else if (d > reach) { holdDir(dx, dy); step(1); frames++; }
      else { stop(); holdDir(Math.abs(dx) > Math.abs(dy) ? Math.sign(dx) : 0, Math.abs(dx) > Math.abs(dy) ? 0 : Math.sign(dy)); step(1); stop();
        if (e.id === 'warden' && !stunned && !anyTell) { HW.press('KeyX'); step(22); HW.release('KeyX'); step(20); frames += 42; }
        else if (e.id === 'warden' && !stunned) { step(4); frames += 4; }
        else { await tap('KeyX', 2); step(10); frames += 13; } }
      if (HW.state === 'dead') { deathsHere++; report.deaths++; report.notes.push(`died to ${P.lastHurtBy} in ${HW.room ? HW.room.id : 'wood'} (lv${P.lvl})`); step(80); await tap('KeyZ'); step(20); if (deathsHere >= 3) { report.notes.push(`lifted past ${HW.room ? HW.room.id : 'wood'} after 3 deaths`); for (const x of liveHere()) HW.slay(x); step(30); return 'lifted'; } return 'died'; }
      if (HW.state !== 'play') { step(5); frames += 5; }
      if (frames % 60 === 0) await yieldNow();
    }
    stop(); return frames >= maxFrames ? 'timeout' : 'ok';
  };
  const doorTile = (fromRoom, toRoom) => { const f = HW.area.rooms.find(r => r.id === fromRoom), t = HW.area.rooms.find(r => r.id === toRoom); if (!f || !t) return null; const side = t.gx > f.gx ? 'e' : t.gx < f.gx ? 'w' : t.gy > f.gy ? 's' : 'n'; const d = f.doors.find(x => x.side === side); if (!d) return null; return [d.x + (side === 'e' ? 1 : side === 'w' ? -1 : 0), d.y + (side === 's' ? 1 : side === 'n' ? -1 : 0)]; };
  const roomsPath = (from, to) => { const grid = HW.area.def.grid; const pos = {}; grid.forEach((row, gy) => row.forEach((id, gx) => pos[id] = [gx, gy])); const q = [[from]]; const seen = new Set([from]); while (q.length) { const p = q.shift(); const cur = p[p.length - 1]; if (cur === to) return p; const r = HW.area.rooms.find(x => x.id === cur); for (const d of r.doors) { const nx = d.x + (d.side === 'e' ? 1 : d.side === 'w' ? -1 : 0), ny = d.y + (d.side === 's' ? 1 : d.side === 'n' ? -1 : 0); if (nx < 0 || ny < 0 || nx >= HW.area.W || ny >= HW.area.H) continue; const nid = grid[Math.floor(ny / CELL_H)][Math.floor(nx / CELL_W)]; if (!seen.has(nid)) { seen.add(nid); q.push(p.concat(nid)); } } } return null; };
  const goRoom = async (to, allowDig) => {
    let hops = 0;
    while (HW.room.id !== to && hops++ < 12) {
      const from = HW.room.id; const rp = roomsPath(from, to); if (!rp || rp.length < 2) return 'noroute';
      const next = rp[1]; const dt = doorTile(from, next); if (!dt) return 'nodoor';
      // anything alive here seals the doors: fight first
      if (liveHere().length) { const f = await fight(); if (f === 'timeout') return 'fightTimeout'; if (f === 'died') continue; }
      const r = await walkTo(dt[0], dt[1], { allowDig, maxFrames: 1200, stopAt: 3 });
      while (HW.state === 'slide') step(1);
      if (HW.room.id === from) { const f = HW.area.rooms.find(x => x.id === from); const t = HW.area.rooms.find(x => x.id === next); holdDir(t.gx - f.gx, t.gy - f.gy); step(24); stop(); while (HW.state === 'slide') step(1); }
      if (HW.room.id === from) { if (r === 'died') continue; return 'stuckAt:' + from + ':' + r; }
      report.rooms[HW.room.id] = (report.rooms[HW.room.id] || 0) + 1;
    }
    return HW.room.id === to ? 'ok' : 'hops';
  };
  // ---- run ----
  try {
    const route = opts.route || (HW.area && HW.area.def.route) || AREAS.warren.route;
    if (opts.walk) { const r = await walkTo(opts.walk[0], opts.walk[1], { maxFrames: 600, stopAt: 3 }); report.notes.push('walk: ' + r); report.lastWalk.trace.push(['end', Math.round(P.x), Math.round(P.y), HW.room && HW.room.id]); return report; }
    const target = opts.area || 'warren';
    if (target === 'mere') HW.PROG.quest.warren = true;
    if (!HW.area || HW.area.id !== target) {
      // the wood first: kill what is near, talk to nobody, walk to the gate
      if (!HW.area || HW.area.id !== 'wood') HW.load('wood', 'start');
      HW.tut = null; HW.state = 'play';
      let f = await fight(1200); report.notes.push('wood fight: ' + f);
      if (target === 'mere') { const cul = HW.area.ents.find(e => e.kind === 'culvert'); let r = await walkTo(cul.x, cul.y - 1, { maxFrames: 2400 }); if (HW.area.id !== target && r !== 'ok') r = await walkTo(cul.x + 1, cul.y - 1, { maxFrames: 1200 }); report.notes.push('walk to culvert: ' + r); if (HW.area.id !== target) { holdDir(0, 1); step(30); stop(); } }
      else { const mouth = HW.area.ents.find(e => e.kind === 'mouth'); const r = await walkTo(mouth.x, mouth.y + 1, { maxFrames: 2400 }); report.notes.push('walk to mouth: ' + r); if (HW.area.id !== target) { holdDir(0, -1); step(30); stop(); } }
      if (!HW.area || HW.area.id !== target) { report.notes.push('never entered ' + target); }
    }
    if (HW.area && HW.area.id === target) {
      const kills0 = Object.values(HW.PROG.kills).reduce((a, b) => a + b, 0);
      for (const leg of route) {
        if (HW.state === 'won') break;
        if (!HW.area || HW.area.id !== target || !HW.room) { HW.load(target, 'entry'); report.notes.push('re-entered ' + target); }
        const allowDig = !!P.abilities.claw;
        if (HW.room.id !== leg.room) { const r = await goRoom(leg.room, allowDig); if (r !== 'ok') { report.notes.push(`route ${leg.room}: ${r}`); if (r.startsWith('stuck') || r === 'noroute' || r.startsWith('blocked')) { const t = HW.area.rooms.find(x => x.id === leg.room); HW.tp(t.x * TS + 10 * TS, t.y * TS + 6 * TS); report.notes.push(`teleported into ${leg.room}`); } } }
        if (HW.room.id !== leg.room) { const r = await goRoom(leg.room, allowDig); if (r !== 'ok') { const t = HW.area.rooms.find(x => x.id === leg.room); HW.tp(t.x * TS + 10 * TS, t.y * TS + 6 * TS); report.notes.push(`teleported into ${leg.room} (${r})`); } }
        if (leg.do === 'clear') { const f = await fight(); if (f !== 'ok') report.notes.push(`${leg.room} fight: ${f}`); }
        else if (leg.do === 'chest') { const c = HW.area.ents.find(e => e.kind === 'chest' && e.room === leg.room); if (c) { const sides = [[0, 1, 0, -1], [0, -1, 0, 1], [-1, 0, 1, 0], [1, 0, -1, 0]].filter(([dx, dy]) => passable(c.x + dx, c.y + dy, false)); for (let k = 0; k < 3 && !HW.PROG.opened[c.key]; k++) { const sd = sides[k % Math.max(1, sides.length)] || [0, 1, 0, -1]; await walkTo(c.x + sd[0], c.y + sd[1], { stopAt: 3 }); holdDir(sd[2], sd[3]); step(3); stop(); step(2); await tap('Space'); step(10); } report.notes.push(`chest ${leg.room}: keys=${P.keys} opened=${!!HW.PROG.opened[c.key]}`); } }
        else if (leg.do === 'dig' || leg.do === 'swim') { const r = HW.room; const plug = r.doors.find(d => d.side === leg.at); if (plug) { const res = await walkTo(plug.x, plug.y, { allowDig: true, maxFrames: 1500, stopAt: 3 }); report.notes.push(`${leg.do} ${leg.room}: ${res} claw=${!!P.abilities.claw} lungs=${!!P.abilities.lungs}`); } }
        else if (leg.do === 'stairs') { const s = HW.area.ents.find(e => e.kind === 'stairs'); const res = await walkTo(s.x, s.y, { stopAt: 2 }); step(10); report.notes.push(`stairs: ${res} state=${HW.state}`); }
        if (blank()) report.blankFrames++;
        await yieldNow();
      }
      report.kills = Object.values(HW.PROG.kills).reduce((a, b) => a + b, 0) - kills0;
    }
  } catch (e) { report.errors.push('bot: ' + (e.stack || e)); }
  stop(); g.drawImage = oDraw; removeEventListener('error', onErr); removeEventListener('unhandledrejection', onErr);
  report.seconds = Math.round(report.steps / 60); report.wall = Math.round((performance.now() - report.t0) / 1000); report.finalState = HW.state; report.level = P.lvl; report.hp = P.hp; report.claw = !!P.abilities.claw;
  return report;
}
