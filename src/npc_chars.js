// npc_chars.js — SNES-RPG people at Chrono Trigger fidelity: 16 wide × 32 tall, four tones per material, a
// coloured outline, eye whites and brows, folds in the cloth, a buckle, a scabbard on the back, a four-frame
// stride. 3 facings × 4 walk frames. Left = flipped right.
// Keys: h hair, H hair shade, i hair light, j hair dark   s skin, S skin shade, n skin light, m brow/lash
//       e pupil, w eye white, k mouth/leather   t tunic, T shade, u light, v fold   p pants, P shade
//       b boots, B boot light   a belt, A buckle   q steel   c hat, C hat shade
import { fromGrid, outline, flipX, shade } from './px.js';

const W = 16;
const BODY = {
  down: [
    '......hhhh......',
    '....hhiihhhh....',
    '...hhiiihhhhhH..',
    '..hhiiihhhhhhhH.',
    '..hhihhhhhhhhhH.',
    '..hhhhhhhhhhhhH.',
    '..hHhssssssshHH.',
    '..HhsnsssssnsHH.',
    '..Hsssssssssss..',
    '..ssmwesssmwes..',
    '..sssssssssssss.',
    '..SsssSSsSSsssS.',
    '...SsssskksssS..',
    '....SSssssSS....',
    '.....aaAaaa.....',
    '...uuttttttTT...',
    '..suuttttttTTs..',
    '..suutttvtttTs..',
    '..suttttvttttTs.',
    '..SutttttttttTS.',
    '..SkttttttttTTS.',
    '...aaaAaaaaaaa..',
    '...uttttttttTT..',
    '...tttttvtttTT..',
    '...ttttttttttT..',
  ],
  up: [
    '......hhhh......',
    '....hhhhhhhh....',
    '...hhhhhhhhhhh..',
    '..hhhhhhhhhhhhH.',
    '..hhhhhhhhhhhhH.',
    '..hhhhhhihhhhhH.',
    '..hhhhhhhhhhhhH.',
    '..HhhhhhhhhhhhH.',
    '..HhhhhhhhhhhHH.',
    '..HHhhhhhhhhHH..',
    '...HHhhhhhhHH...',
    '....HHHHHHHH....',
    '.....ssssss.....',
    '.....SSssSS.....',
    '.....aaaaaa.....',
    '...uutttttttT...',
    '..suutttttttTs..',
    '..suutttttttTs..',
    '..sutkkkkkttTTs.',
    '..SutkqqkkttTTS.',
    '..SutttkkttttTS.',
    '...aaaaaaaaaa...',
    '...uttttttttTT..',
    '...ttttttttttT..',
    '...ttttttttttT..',
  ],
  side: [
    '......hhhh......',
    '....hhhhhhhh....',
    '...hhhiihhhhhh..',
    '..hhhiiihhhhhhh.',
    '..hhhihhhhhhhhh.',
    '..hhhhhhhhhhhhh.',
    '..hhhhhhhhsssss.',
    '..Hhhhhhhhsnsss.',
    '..Hhhhhhhssssss.',
    '..Hhhhhhhsssmwe.',
    '..HhhhhhhsssssS.',
    '...HhhhhhSSssSS.',
    '....HHhhsSSkS...',
    '......SSssS.....',
    '......aaAaa.....',
    '.....uttttttT...',
    '.....uutttttT...',
    '.....uutttsstT..',
    '.....uttttssTT..',
    '.....utttvtsT...',
    '.....kttttttT...',
    '.....aaaaAaaa...',
    '......ttttttT...',
    '......tttvttT...',
    '......ttttttT...',
  ],
};
const LEGS = {
  down: [
    ['...pppp..pppP...', '...pppp..pppP...', '...PPPP..PPPP...', '...bBbb..bBbb...', '...bbbb..bbbb...', '...bbbb..bbbb...', '..bbbbb..bbbbb..'],
    ['...pppp..pppP...', '...PPPP..pppP...', '...bBbb..PPPP...', '...bbbb..bBbb...', '..bbbbb..bbbb...', '..bbbbb..bbbbb..', '.........bbbbb..'],
    ['...pppp..pppP...', '...pppp..pppP...', '...PPPP..PPPP...', '...bBbb..bBbb...', '...bbbb..bbbb...', '..bbbbb..bbbbb..', '................'],
    ['...pppp..pppP...', '...pppp..PPPP...', '...PPPP..bBbb...', '...bBbb..bbbb...', '...bbbb..bbbbb..', '..bbbbb..bbbbb..', '..bbbbb.........'],
  ],
  side: [
    ['......pppppP....', '......pppppP....', '......PPPPPP....', '......bBbbbb....', '......bbbbbb....', '......bbbbbb....', '.....bbbbbbbb...'],
    ['......pppppP....', '.....ppppp.ppp..', '....ppp....ppp..', '....PP......PP..', '...bBb......bBb.', '...bbb......bbb.', '..bbbb......bbbb'],
    ['......pppppP....', '......pppppP....', '......PPPPPP....', '......bBbbbb....', '......bbbbbb....', '.....bbbbbbb....', '................'],
    ['......pppppP....', '......pppppP....', '.....pppppPP....', '.....bBbbb......', '.....bbbbb......', '.....bbbbbb.....', '......bbbbbbb...'],
  ],
};
const SKIRT = {
  down: [
    ['...pppppppppP...', '...pppppppppP...', '..ppppppppppPP..', '..ppppppppppPP..', '.ppppppppppppPP.', '.ppppppppppppPP.', '...bb......bb...'],
    ['...pppppppppP...', '...pppppppppP...', '..ppppppppppPP..', '..ppppppppppPP..', '.ppppppppppppPP.', '.ppppppppppppPP.', '..bb........bb..'],
    ['...pppppppppP...', '...pppppppppP...', '..ppppppppppPP..', '..ppppppppppPP..', '.ppppppppppppPP.', '.ppppppppppppPP.', '.....bbbb.......'],
    ['...pppppppppP...', '...pppppppppP...', '..ppppppppppPP..', '..ppppppppppPP..', '.ppppppppppppPP.', '.ppppppppppppPP.', '..bb........bb..'],
  ],
  side: [
    ['......pppppp....', '......pppppp....', '.....ppppppP....', '.....pppppppP...', '....ppppppppP...', '....ppppppppP...', '.......bbb......'],
    ['......pppppp....', '......pppppp....', '.....ppppppP....', '.....pppppppP...', '....ppppppppP...', '....ppppppppP...', '.....bbb..bb....'],
    ['......pppppp....', '......pppppp....', '.....ppppppP....', '.....pppppppP...', '....ppppppppP...', '....ppppppppP...', '.......bbbb.....'],
    ['......pppppp....', '......pppppp....', '.....ppppppP....', '.....pppppppP...', '....ppppppppP...', '....ppppppppP...', '.....bbb..bb....'],
  ],
};
const HAT = {
  down: ['.....cccccc.....', '...cccccccccc...', '..cccccccccccc..', 'cCCCCCCCCCCCCCCc'],
  up: ['.....cccccc.....', '...cccccccccc...', '..cccccccccccc..', 'cCCCCCCCCCCCCCCc'],
  side: ['.....cccccc.....', '...cccccccccc...', '..cccccccccccc..', 'cCCCCCCCCCCCCCCc'],
};

export function makePalette(o) {
  const acc = o.accent || shade(o.tunic, -0.45);
  return {
    h: o.hair, H: shade(o.hair, -0.32), i: shade(o.hair, 0.3), j: shade(o.hair, -0.5),
    s: o.skin, S: shade(o.skin, -0.22), n: shade(o.skin, 0.18), m: shade(o.skin, -0.5), e: '#2a1a2a', w: '#fbf6ea', k: '#3a2a22',
    t: o.tunic, T: shade(o.tunic, -0.28), u: shade(o.tunic, 0.2), v: shade(o.tunic, -0.45),
    p: o.pants, P: shade(o.pants, -0.3), b: o.boots, B: shade(o.boots, 0.25), a: acc, A: shade(acc, -0.4), q: '#9a9aa8',
    c: o.hat || '#000', C: shade(o.hat || '#000', -0.3),
  };
}
// a coloured outline, not black: the darkest of the clothes, so the sprite sits in the scene instead of on it
const OUTLINE = '#241826';

export function bakeCharacter(opts) {
  const pal = makePalette(opts);
  const legs = opts.dress ? SKIRT : LEGS;
  const out = {};
  for (const facing of ['down', 'up', 'side']) {
    const body = BODY[facing];
    const legSet = legs[facing === 'up' ? 'down' : facing];
    out[facing] = legSet.map((lg, fi) => {
      let rows = body.concat(lg);
      if (opts.hat) rows = HAT[facing].concat(rows.slice(4));
      for (const r of rows) if (r.length !== W) throw new Error('character row width ' + r.length + ': ' + r);
      const c = outline(fromGrid(rows, pal, 2), OUTLINE);
      return { canvas: c, ax: Math.floor(c.width / 2), ay: c.height - 2, bob: fi === 2 ? 1 : 0 };
    });
  }
  out.right = out.side; out.left = out.side.map(f => ({ ...f, canvas: flipX(f.canvas) })); delete out.side;
  return out;
}
