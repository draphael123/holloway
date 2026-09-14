# HOLLOWAY — next

## Waiting on Daniel
- Play both holloways on the deployed build. Report in a stream; I work the queue.
- Feel: walk, roll, parry window, the heavy blow. Swimming speed. Whether "fight the pike from the land" reads
  without being told.
- The pedlar's prices. The bottled heart at 60 and mothsilk at 45 are guesses.

## Done from the first playtest
- Roll: 58 px, 32 stamina (was 100 / 22). Say if it still feels long.
- Chrono Trigger read: hero and NPC sprites redrawn with shaded hair, three-tone cloth and a stride; grass tufts; wall shadows.
- Enemies are goblins: cutter, whelp, slinger (stones), shieldbearer, bog goblin, drowned goblin. Bosses stay beasts.
- Combat sounds are recorded CC0 samples (audio/sfx), synth as fallback.

## Done from the second playtest note ("low detail, sparse")
- Environment: ArMM1998's painted CC0 tileset (grass, path, stream, cliffs, trees, bushes, stumps, rocks, fence, lodge, cave mouth, cave walls). `src/tileset.js` maps the sheet cells.
- Hero and villagers are the tileset's own sprites, recoloured per character (hair, tunic, trousers), with the sheet's four-direction sword swings for attacks. The hand-drawn 16x32 grids are still in npc_chars.js as the fallback if the sheet fails to load.
- Cave floors, rocks, plants, mushrooms and crystals from George Bailey's set (CC-BY 4.0, credited in Settings).
- Every screen auto-dressed to a density target at parse time; `node tools/quality.mjs` prints props per 100 tiles per room.
- The wood has a two-row cliff along the top with the warren mouth cut into it.

## Done from the third note
- Hero and villagers: Svetlana Kushnariova's painted 24x32 people (CC-BY 3.0), two tiles tall. No swing frames in that set, so the sword is still an overlay; drawing swing frames for it is the next art job.
- The roll is a STEP: a short hop the way you press, or straight back when standing still. Untouchable for its length.
- Fewer goblins per room, longer gaps between their wind-ups, and every blow shows the weapon.
- Cave music in the warren (it had been playing the wood's theme) and a crystal-cave loop in the mere.
- Denser dungeon dressing: stalactites, rubble, glowing crystals, moss, puddles, crates.

## Known and open (round 2)
- The bot beats the warren; in the mere it reaches the pike but does not kill it inside its budget (it never
  wades in after it, so it waits for surges and snaps). A person will not have that problem, but the pike's
  heart (460) may still be long. Measure a human time-to-kill before touching it.
- Wardens (warren) and thornshots in the sluice (mere) are what kill the bot. Both fine for a person with
  guard and parry, in theory.
- Room I of the mere: the stairs are ringed by water; you swim to them. Intentional, but check it reads.
- Gamepad mapping is standard-layout only (A roll, X cut, B guard, Y talk, Start pause, Select pack). Untested
  on real hardware; the pane has no pad.
- The Brock and the Digger are hand-pixelled text grids now (`BROCK_DOWN`, `DIGGER_SIDE` in chars.js), the
  mere's four creatures are still procedural. If the pixel pass reads better, do the pike and the eelwife.
- Only two music loops: the wood's theme and the descent (both holloways). A third for boss rooms would help.

## Holloway three candidates
- THE HIVE — under the old oak; a hornet queen's cousins. Verb: THE WINGS (a short glide over pits: the
  warren's pit gallery and the mere's chapel get a second life). Rule: honey slows.
- THE KILN — the charcoal burners' pit. Verb: THE EMBER (light braziers, burn bramble). Rule: smoke blinds.
- Each one: a new tile for its rule, a named creature with the verb, a boss with a KEEPING, five landmarks.
