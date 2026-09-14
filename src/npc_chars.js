// npc_chars.js — SNES-RPG people in the Chrono Trigger manner: 16 wide × 28 tall, a big head with lit and
// shadowed hair, three-tone cloth, a belt, a proper stride. 3 facings × 3 walk frames, auto-outlined.
// Left = flipped right. Keys: h hair, H hair shade, i hair light, s skin, S skin shade, e eye, w eye-white,
// t tunic, T tunic shade, u tunic light, p pants, P pants shade, b boots, a accent (collar/belt), c hat, C hat shade
import { fromGrid, outline, flipX, shade } from './px.js';

const W = 16;
const BODY = {
  down: [
    '......hhhh......',
    '....hhiihhhh....',
    '...hhiiihhhhh...',
    '..hhhiihhhhhhH..',
    '..hhhhhhhhhhhH..',
    '..hhhhhhhhhhhH..',
    '..hHssssssssHH..',
    '..Hsssssssssss..',
    '..sswesssswess..',
    '..ssssssssssss..',
    '..SsssSSSSsssS..',
    '...SSssssssSS...',
    '....SSssssSS....',
    '.....aaaaaa.....',
    '...uutttttttT...',
    '..suutttttttTs..',
    '..suutttttttTs..',
    '..sutttttttttTs.',
    '..SutttttttttTS.',
    '...aaaaaaaaaa...',
    '...uttttttttTT..',
    '...ttttttttttT..',
  ],
  up: [
    '......hhhh......',
    '....hhhhhhhh....',
    '...hhhhhhhhhh...',
    '..hhhhhhhhhhhH..',
    '..hhhhhhhhhhhH..',
    '..hhhhhhhhhhhH..',
    '..hhhhhhhhhhhH..',
    '..HhhhhhhhhhhH..',
    '..HhhhhhhhhhHH..',
    '...HhhhhhhhHH...',
    '....HHHHHHHH....',
    '.....ssssss.....',
    '.....SSssSS.....',
    '.....tttttt.....',
    '...uutttttttT...',
    '..suutttttttTs..',
    '..suutttttttTs..',
    '..sutttttttttTs.',
    '..SutttttttttTS.',
    '...aaaaaaaaaa...',
    '...uttttttttTT..',
    '...ttttttttttT..',
  ],
  side: [
    '......hhhh......',
    '....hhhhhhhh....',
    '...hhhihhhhhh...',
    '..hhhiihhhhhhh..',
    '..hhhhhhhhhhhh..',
    '..hhhhhhhhhhhh..',
    '..hhhhhhhsssss..',
    '..Hhhhhhhssssss.',
    '..Hhhhhhhssswes.',
    '..Hhhhhhhssssss.',
    '...Hhhhhhsssss..',
    '....HHhhSSSss...',
    '......SSssS.....',
    '......aaaaa.....',
    '.....uttttttT...',
    '.....uttttttT...',
    '.....utttssttT..',
    '.....uTttsstT...',
    '.....aaaaaaaa...',
    '......ttttttT...',
    '......ttttttT...',
    '......ttttttT...',
  ],
};
const LEGS = {
  down: [
    ['...pppp..pppP...', '...pppp..pppP...', '...PPPP..PPPP...', '...bbbb..bbbb...', '...bbbb..bbbb...', '..bbbbb..bbbbb..'],
    ['...pppp..pppP...', '...PPPP..pppP...', '...bbbb..PPPP...', '...bbbb..bbbb...', '..bbbbb..bbbb...', '.........bbbbb..'],
    ['...pppp..pppP...', '...pppp..PPPP...', '...PPPP..bbbb...', '...bbbb..bbbb...', '...bbbb..bbbbb..', '..bbbbb.........'],
  ],
  side: [
    ['......pppppP....', '......pppppP....', '......PPPPPP....', '......bbbbbb....', '......bbbbbb....', '.....bbbbbbbb...'],
    ['......pppppP....', '.....ppppp.ppp..', '....ppp....ppp..', '....PP......PP..', '...bbb......bbb.', '..bbbb......bbbb'],
    ['......pppppP....', '......pppppP....', '......PPPPPP....', '.....bbbbb......', '.....bbbbb......', '......bbbbbbb...'],
  ],
};
const SKIRT = {
  down: [
    ['...pppppppppP...', '...pppppppppP...', '..ppppppppppPP..', '..ppppppppppPP..', '.ppppppppppppPP.', '...bb......bb...'],
    ['...pppppppppP...', '...pppppppppP...', '..ppppppppppPP..', '..ppppppppppPP..', '.ppppppppppppPP.', '..bb........bb..'],
    ['...pppppppppP...', '...pppppppppP...', '..ppppppppppPP..', '..ppppppppppPP..', '.ppppppppppppPP.', '.....bbbb.......'],
  ],
  side: [
    ['......pppppp....', '......pppppp....', '.....ppppppP....', '.....pppppppP...', '....ppppppppP...', '.......bbb......'],
    ['......pppppp....', '......pppppp....', '.....ppppppP....', '.....pppppppP...', '....ppppppppP...', '.....bbb..bb....'],
    ['......pppppp....', '......pppppp....', '.....ppppppP....', '.....pppppppP...', '....ppppppppP...', '.......bbbb.....'],
  ],
};
const HAT = {
  down: ['.....cccccc.....', '...cccccccccc...', '..cccccccccccc..', 'cCCCCCCCCCCCCCCc'],
  up: ['.....cccccc.....', '...cccccccccc...', '..cccccccccccc..', 'cCCCCCCCCCCCCCCc'],
  side: ['.....cccccc.....', '...cccccccccc...', '..cccccccccccc..', 'cCCCCCCCCCCCCCCc'],
};

export function makePalette(o) {
  return {
    h: o.hair, H: shade(o.hair, -0.32), i: shade(o.hair, 0.28), s: o.skin, S: shade(o.skin, -0.25), e: '#25182a', w: '#fbf6ea',
    t: o.tunic, T: shade(o.tunic, -0.3), u: shade(o.tunic, 0.18), p: o.pants, P: shade(o.pants, -0.3), b: o.boots, a: o.accent || shade(o.tunic, -0.45),
    c: o.hat || '#000', C: shade(o.hat || '#000', -0.3),
  };
}

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
      const c = outline(fromGrid(rows, pal, 2));
      return { canvas: c, ax: Math.floor(c.width / 2), ay: c.height - 2, bob: fi === 0 ? 0 : 1 };
    });
  }
  out.right = out.side; out.left = out.side.map(f => ({ ...f, canvas: flipX(f.canvas) })); delete out.side;
  return out;
}
