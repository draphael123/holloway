# HOLLOWAY

A 16-bit top-down action RPG in BRACKEN's forest world. One hero, no classes. *The wood keeps what it
takes, and what you take from the wood, you keep.*

- `node serve.mjs` → http://localhost:5870 (no dependencies; everything is baked at load)
- `node tools/audit.mjs` — static checks on every map (door pairing, staged reachability, boss/mini/chest tables)
- `?bot=1` — the in-page playtest bot walks the intended route, fights, and reports deaths/NaN draws/errors
  to `window.__botRes`

## Controls

| key | verb |
|---|---|
| arrows / WASD | walk |
| X | cut (three in a run; the third is a thrust). HOLD X: THE HEAVY BLOW. X at soft earth with the claw: dig |
| C | hold to GUARD. Tap as a blow lands to PARRY |
| Z | roll |
| SPACE / ENTER | talk, open, read |
| TAB | the pack: status, skills, charms, bestiary, settings |
| ESC | pause / back |

Menus take Z / ENTER / SPACE / X only. Never a direction.

## Layout

- `src/world.js` — every area as ASCII (rooms are 20×11 cells). Pure data, importable under node.
- `src/main.js` — the game: player, combat, creature AIs, rooms and camera, loot, progression, menus, HUD.
- `src/chars.js`, `src/dungeon_art.js`, `src/art.js`, `src/npc_chars.js`, `src/px.js` — baked pixel art.
- `src/font.js` — a 3×5 pixel font with a measured `textW()`.
- `src/audio.js` — synthesised SFX + one music track (`audio/theme.ogg`, CC0; see `audio/CREDITS.txt`).
- `src/bot.js` — the playtest bot. `tools/audit.mjs` — the map audit.
- `DESIGN.md` — the brief and the rules. `NEXT-PROMPT.md` — the open list.

## Debug API (`window.HW`)

`HW.load('warren','entry')`, `HW.tp(x,y)`, `HW.step(n)` (n updates, one draw — the preview pane delivers no
animation frames, so drive it with step), `HW.press('KeyX')` / `HW.release`, `HW.god = true`, `HW.give('claw')`,
`HW.slay(enemy)`, `HW.bot({ walk: [tx,ty] })`.
