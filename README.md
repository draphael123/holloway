# HOLLOWAY

A 16-bit top-down action RPG in BRACKEN's forest world. One hero, no classes. *The wood keeps what it
takes, and what you take from the wood, you keep.*

- `node serve.mjs` → http://localhost:5870 (no dependencies; everything is baked at load)
- `node tools/audit.mjs` — static checks on every map (door pairing, staged reachability by key → this
  holloway's verb → every verb, boss/mini/chest tables, the culvert)
- `?bot=1` — the in-page playtest bot walks the warren's route, fights, and reports deaths/NaN draws/errors
  to `window.__botRes`; `await HW.bot({ area: 'mere' })` does the same for the mere

## The holloways

| | verb from the named creature | boss and its keeping | rule |
|---|---|---|---|
| THE WARREN (under the roots) | THE DIGGER → THE CLAW (dig soft earth) | THE OLD BROCK | rocks fall on marked spots |
| THE MERE (under the stream, through the culvert grate) | THE EELWIFE → THE LUNGS (swim deep water, no sword in it) | THE OLD PIKE, fought from the land | spouts, and water that is a wall until you have lungs |

THE PEDLAR by the road sells a heal, a permanent heart, and charms. Gold comes from what you kill and dig up.

## Controls

| key | pad | verb |
|---|---|---|
| arrows / WASD | stick / d-pad | walk (swim, with the lungs) |
| X | X | cut (three in a run; the third is a thrust). HOLD: THE HEAVY BLOW. At soft earth with the claw: dig |
| C | B / bumpers | hold to GUARD. Tap as a blow lands to PARRY |
| Z | A | step: a short hop the way you press, or back when still (dive, in water) |
| SPACE / ENTER | Y | talk, open, read, buy |
| TAB | Select | the pack: status, skills, charms, bestiary, settings |
| ESC | Start | pause / back |

Menus take Z / ENTER / SPACE / X (pad A / X) only. Never a direction.

## Layout

- `src/world.js` — every area as ASCII (rooms are 20×11 cells). Pure data, importable under node. Each
  holloway declares its `verb`, `hazard`, `won` card, `music`, `route`.
- `src/main.js` — the game: player, combat, creature AIs (`def.ai` shares a kit, `def.tn` renames its tells),
  rooms and camera, loot, progression, shop, menus, HUD, gamepad.
- `src/chars.js` (hand-pixelled Brock and Digger grids, procedural everything else), `src/dungeon_art.js`,
  `src/art.js`, `src/npc_chars.js`, `src/px.js` — baked pixel art. `src/font.js` — a 3×5 pixel font.
- `src/audio.js` — synthesised SFX + two CC0 loops (`audio/CREDITS.txt`).
- `src/bot.js` — the playtest bot. `tools/audit.mjs` — the map audit.
- `DESIGN.md` — the brief and the rules. `NEXT-PROMPT.md` — the open list.

## Debug API (`window.HW`)

`HW.load('mere','entry')`, `HW.tp(x,y)`, `HW.step(n)` (n updates, one draw — the preview pane delivers no
animation frames, so drive it with step), `HW.press('KeyX')` / `HW.release`, `HW.god = true`,
`HW.give('lungs')`, `HW.slay(enemy)`, `HW.bot({ area, route, walk })`.
