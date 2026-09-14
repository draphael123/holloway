# HOLLOWAY — the brief

A 16-bit top-down action RPG set in BRACKEN's forest world. One hero. No classes. Everything the hero can
do, they took from something in the wood.

**The premise, in one sentence:** *The wood keeps what it takes, and what you take from the wood, you keep.*

That sentence has to retro-justify the mechanics, or it is set dressing:

- **Abilities come from named creatures.** Every holloway has a mid-dungeon named creature (rule A9) and
  killing it gives you its verb — THE CLAW from the Goblin Burrower, and so on. The verb is what opens the way to the
  boss. Zelda's item chest, but the chest is a body.
- **Stats come from the boss.** A holloway's boss leaves a KEEPING: a permanent piece of you (heart container).
- **Loot is what the wood kept.** Chests, buried mounds and rare drops are the things the wood took from
  people. The bestiary is also the hunting log: every creature says what it drops and how often.
- **The holloways are where the wood keeps its dead** — the sunken roads under the roots. Going down one is
  going to fetch something back. The first quest is the Pell boy, taken from the edge of Waymeet's wood.

## What a session is

Daniel's answer to "forty minutes in, what are you doing": all four of these, so the holloway is built for all four:

1. **Working a dungeon** — keys, locked doors, a plugged way that needs the holloway's verb, a boss at the end.
2. **Clearing crowds** — rooms seal while anything is alive in them (Zelda rule). Three encounters, not one
   encounter three times (BRACKEN B8).
3. **Hunting a drop or build** — charms drop rarely from creatures, at rates the bestiary prints; a skill tree
   spent from level-ups; two charm slots.
4. **Exploring for routes and secrets** — soft-earth veins you can dig once you have the claw, side rooms with
   chests, buried mounds.

## Three growth channels (no classes)

| channel | source | what it changes |
|---|---|---|
| ABILITIES | the named creature in each holloway | a new verb (dig, hook, light…) — gates the world |
| SKILLS | 1 point per level, spent in the tree | modifiers on the core verbs: reach, parry window, roll, stamina |
| STATS | levels (+HP, +might) and KEEPINGS from bosses | the numbers |

## Core combat (carried from BRACKEN)

- X attack: three-cut run, the third is a thrust. HOLD X for THE HEAVY BLOW (guard-breaking, stamina).
- C: tap = PARRY (a window; a perfect parry staggers and refunds), hold = GUARD (front half, stamina per hit).
- Z: DASH, fast and about four tiles, the way you press or straight ahead; untouchable for its length; stamina.
- Every enemy attack is TOLD: an amber rim pulse on the wind-up. One hue, one meaning, every creature.
  White means "you hit it". (BRACKEN's second-read rule.)
- Damage from ATTACKS, not from touch. Touch pushes.
- Bosses: four told attacks minimum, the signature at the TOP of the chain, nothing untouchable for more than
  two seconds, and every untouchable phase owes an open one. (RULES-LEVELS-AND-BOSSES A1–A6.)

## The room grid

A holloway is a grid of rooms, each one screen (20×11 tiles at 320×180). The camera locks to the room and
slides between them. Doors are two-tile gaps in the wall ring. A room with anything alive in it seals its
doors. Rooms remember being cleared. Checkpoint on entering the holloway and after the named creature.

## The first holloway — THE WARREN

Nine rooms, three by three. The intended route, and the optional ones:

```
[ A the key nook ][ B the crowd  ][ C the pit gallery (charm) ]
[ D the Burrower ][ E the hub    ][ F the archers' vein        ]
[ G the mounds   ][ H the throat ][ I THE GOBLIN SHAMAN        ]
```

H (in from the wood, rocks fall at marked spots) → E → B (sealed crowd) → A (key, wardens) → E → D (locked;
THE GOBLIN BURROWER; drops THE CLAW) → F (the plug into I is soft earth: dig it) → I (THE GOBLIN SHAMAN; KEEPING; the way
out). Optional: C (pits + archers, THORNBAND charm), G (soft earth, buried loot — needs the claw).

## Ports and process

- `node serve.mjs` → port 5870. No dependencies. Everything baked once at load (`src/px.js`).
- Buffer 320×180, 16 px tiles, integer scaled. Lay every menu out against 320×180 and MEASURE text.
- `?bot=1` runs the in-page playtest bot (walks the route, fights, records deaths, NaN draws, offscreen text,
  blank frames). `node tools/audit.mjs` checks the maps statically.
- Menus confirm on Z / ENTER / SPACE / X only. Never a direction.
- Timers are dt accumulators, never setTimeout.
