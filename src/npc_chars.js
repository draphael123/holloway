// chars.js — SNES-RPG character sprites from text grids. Big head (~40% of height),
// 14 wide × 28 tall, 3 facings × 3 walk frames, auto-outlined. Left = flipped right.
import { fromGrid, outline, flipX, shade } from './px.js';

// Keys: h hair, H hair shade, s skin, S skin shade, e eye, w eye-white, t tunic, T tunic shade,
// p pants, P pants shade, b boots, a accent (collar/belt), c hat, C hat shade
const BODY = {
  down: [
    '.....h..h.....',
    '....hhhhhh....',
    '..hhhhhhhhhh..',
    '.hhhhhhhhhhhh.',
    '.hhhhhhhhhhhh.',
    '.hhhhHhhhHhhh.',
    '.hhHsssssssHh.',
    '.Hsssssssssss.',
    '..sswessswes..',
    '..sseessseess.',
    '..ssssssssss..',
    '...ssSSSSss...',
    '....SSssSS....',
    '....aaaaaa....',
    '..tttttttttt..',
    '.stttttttttts.',
    '.stttttttttts.',
    '.sTttttttttTs.',
    '..TTaaaaaaTT..',
    '..pppppppppp..',
    '..pppppppppp..',
  ],
  up: [
    '.....h..h.....',
    '....hhhhhh....',
    '..hhhhhhhhhh..',
    '.hhhhhhhhhhhh.',
    '.hhhhhhhhhhhh.',
    '.hhhhhhhhhhhh.',
    '.hhhhhhhhhhhh.',
    '.HhhhhhhhhhhH.',
    '..HhhhhhhhhH..',
    '..hhhhhhhhhh..',
    '...HHHHHHHH...',
    '....ssssss....',
    '....SSssSS....',
    '....tttttt....',
    '..tttttttttt..',
    '.stttttttttts.',
    '.stttttttttts.',
    '.sTttttttttTs.',
    '..TTaaaaaaTT..',
    '..pppppppppp..',
    '..pppppppppp..',
  ],
  side: [
    '.....h..h.....',
    '....hhhhhh....',
    '..hhhhhhhhhh..',
    '.hhhhhhhhhhhh.',
    '.hhhhhhhhhhhh.',
    '.hhhhhhhhHhhh.',
    '.hhhhhhhssssh.',
    '.Hhhhhhsssssss',
    '.Hhhhhhsssswes',
    '.Hhhhhhssssees',
    '..Hhhhhssssss.',
    '...HHhsSSSss..',
    '.....SSssS....',
    '.....aaaaa....',
    '....tttttttt..',
    '....tttttttt..',
    '....tttsstt...',
    '....TTtssTt...',
    '....aaaaaaa...',
    '.....ppppp....',
    '.....ppppp....',
  ],
};
const LEGS = {
  down: [
    ['..pppp..pppp..', '..pppp..pppp..', '..pppp..pppp..', '..PPPP..PPPP..', '..bbbb..bbbb..', '..bbbb..bbbb..', '.bbbbb..bbbbb.'],
    ['..pppp..pppp..', '..pppp..pppp..', '..PPPP..pppp..', '..bbbb..PPPP..', '..bbbb..bbbb..', '.bbbbb..bbbb..', '........bbbbb.'],
    ['..pppp..pppp..', '..pppp..pppp..', '..pppp..PPPP..', '..PPPP..bbbb..', '..bbbb..bbbb..', '..bbbb..bbbbb.', '.bbbbb........'],
  ],
  side: [
    ['.....ppppp....', '.....ppppp....', '.....ppppp....', '.....PPPPP....', '.....bbbbb....', '.....bbbbb....', '....bbbbbbb...'],
    ['.....ppppp....', '....pppp.ppp..', '...ppp...ppp..', '...PP.....PP..', '..bbb.....bbb.', '..bbb.....bbb.', '.bbbb.....bbbb'],
    ['.....ppppp....', '.....ppppp....', '.....PPPPP....', '....bbbbb.....', '....bbbbb.....', '.....bbbbbb...', '....bbbbbbb...'],
  ],
};
const SKIRT = {
  down: [
    ['..pppppppppp..', '..pppppppppp..', '.pppppppppppp.', '.pppppppppppp.', 'pppppppppppppp', 'PPPPPPPPPPPPPP', '...bb....bb...'],
    ['..pppppppppp..', '..pppppppppp..', '.pppppppppppp.', '.pppppppppppp.', 'pppppppppppppp', 'PPPPPPPPPPPPPP', '..bb......bb..'],
    ['..pppppppppp..', '..pppppppppp..', '.pppppppppppp.', '.pppppppppppp.', 'pppppppppppppp', 'PPPPPPPPPPPPPP', '.....bbbb.....'],
  ],
  side: [
    ['.....pppppp...', '.....pppppp...', '....ppppppp...', '....pppppppp..', '...ppppppppp..', '...PPPPPPPPP..', '......bbb.....'],
    ['.....pppppp...', '.....pppppp...', '....ppppppp...', '....pppppppp..', '...ppppppppp..', '...PPPPPPPPP..', '....bbb..bb...'],
    ['.....pppppp...', '.....pppppp...', '....ppppppp...', '....pppppppp..', '...ppppppppp..', '...PPPPPPPPP..', '......bbbb....'],
  ],
};

export function makePalette(o) {
  return {
    h: o.hair, H: shade(o.hair, -0.32), s: o.skin, S: shade(o.skin, -0.25), e: '#25182a', w: '#fbf6ea',
    t: o.tunic, T: shade(o.tunic, -0.3), p: o.pants, P: shade(o.pants, -0.3), b: o.boots, a: o.accent || shade(o.tunic, -0.45),
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
      if (opts.hat) rows = HAT[facing].concat(rows.slice(3));
      const c = outline(fromGrid(rows, pal, 2));
      return { canvas: c, ax: Math.floor(c.width / 2), ay: c.height - 2, bob: fi === 0 ? 0 : 1 };
    });
  }
  out.right = out.side; out.left = out.side.map(f => ({ ...f, canvas: flipX(f.canvas) })); delete out.side;
  return out;
}
const HAT = {
  down: ['.....cccc.....', '...cccccccc...', '..cccccccccc..', 'cCCCCCCCCCCCCc'],
  up: ['.....cccc.....', '...cccccccc...', '..cccccccccc..', 'cCCCCCCCCCCCCc'],
  side: ['.....cccc.....', '...cccccccc...', '..cccccccccc..', 'cCCCCCCCCCCCCc'],
};
