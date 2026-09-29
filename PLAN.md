# Skillshot Dodge Trainer — Implementation Plan

A browser game with League of Legends–style controls (right-click to move) where the player's only job is to dodge skillshots fired by bots. The goal is to train movement, reaction time, and reading of spell telegraphs.

---

## 1. Tech stack (decided)

| Concern | Choice | Why |
|---|---|---|
| Language | **TypeScript** (strict) | Type safety for the entity and ability data |
| Build/dev | **Vite** (`npm create vite@latest . -- --template vanilla-ts`) | Starts instantly and hot-reloads |
| Rendering | **HTML5 Canvas 2D**, no engine | Simple shapes are enough, and there is no engine to learn |
| Tests | **Vitest** | Covers the pure math: collision, prediction, movement |
| Persistence | `localStorage` (wrapped in try/catch) | Stores best scores and settings |

No UI framework. Menus and the HUD are plain DOM overlays on top of the canvas (absolutely positioned `<div>`s), and the game world is drawn on the canvas.

---

## 2. Core design

### World and units
- Use **League-like world units** so the ability numbers feel right. Examples: move speed about 340 units/s, champion hitbox radius 65, Ezreal Q speed 2000.
- The arena is a fixed rectangle, **2400 × 1400 units**. It is scaled uniformly to fit the window (letterboxed). There is no camera scrolling in the MVP.
- One `worldToScreen` / `screenToWorld` transform in `render/viewport.ts`. It is recalculated whenever the window is resized.

### Game loop
- A **fixed timestep of 60 Hz** for simulation, driven by `requestAnimationFrame` with an accumulator. Rendering happens once per frame.
- All simulation code takes `dt` in seconds. The simulation must never read wall-clock time directly, so tests stay deterministic.
- Use a seeded RNG (`core/rng.ts`, e.g. mulberry32) so runs can be reproduced.

### Controls (LoL-style)
| Input | Action |
|---|---|
| Right-click | Set the move destination and show a green click marker that fades out |
| **Hold** right-click | Keep updating the destination to the cursor every tick, as in LoL |
| `S` | Stop (clear the destination) |
| `F` | Flash: blink up to 400 units toward the cursor, 15 s cooldown in practice mode (configurable) |
| `Esc` | Pause menu |
| `R` | Restart the run from the game-over screen |
| `Space` | Hold to re-centre (a no-op for now, reserved) |

- Call `preventDefault` on `contextmenu` for the canvas.
- Movement is a straight line to the destination at constant speed. The player stops exactly on the target and does not overshoot. Clamp the position inside the arena, allowing for the hitbox radius.
- Show the player's facing direction (small triangle) and a faint line to the destination.

### Skillshot types (data-driven)
Every ability is a plain data object in `src/abilities/definitions.ts`. The engine supports **archetypes**, and each individual ability just fills in the numbers.

| Archetype | Behaviour | Example values (LoL-inspired) |
|---|---|---|
| `linear` | Projectile travels from the caster along a direction; collides as a circle of `width/2` | "Mystic Shot": speed 2000, range 1150, width 120, windup 0.25 s |
| `linearSlow` | Same, but slow and wide | "Dark Binding": speed 1200, range 1300, width 140, windup 0.25 s |
| `circle` | Ground-targeted. The telegraph circle appears, then after `delay` it hits everything inside `radius` | "Eye of Destruction": radius 200, delay 0.8 s |
| `beam` | Instant-hit rectangle after a long visible windup (telegraphed line) | "Arcanopulse": length 1400, width 140, windup 0.6 s |
| `cone` | Sector of `angle` and `range`, hits after the windup | angle 50°, range 700, windup 0.4 s |
| `ring` (stretch) | Donut: safe in the centre, hit on the ring | inner 250, outer 450, delay 1.0 s |

Common fields: `id`, `name`, `archetype`, `windup`, `cooldown`, `color`, and the archetype-specific numbers. Keep the names generic or invented. Don't use Riot's champion names, icons, or art.

**Telegraphs are required for fairness.** During the windup, the bot shows a cast bar or glow. For `circle`, `beam`, `cone`, and `ring`, draw the area indicator during the whole windup/delay, with a fill that grows to show when it will land. Linear projectiles draw a faint path line only on the Easy difficulty.

### Collision (`src/core/collision.ts`, pure functions and unit-tested)
- `circleCircle(a, ra, b, rb)`: used for projectiles and ground circles.
- `circleVsSweptCircle(player, projPrev, projNow, projRadius)`: capsule test so fast projectiles can't tunnel through the player between ticks. **This is required.** At 2000 u/s and 60 Hz, a projectile moves about 33 units per tick.
- `circleVsOrientedRect(center, r, rectCenter, halfW, halfL, angle)`: beam.
- `circleVsCone(center, r, origin, dir, halfAngle, range)`: counts as a hit if the circle overlaps the sector (check the distance to the edges, not only the centre).
- `circleVsRing(center, r, ringCenter, inner, outer)`.

The player hitbox is a circle of radius 65. A hit when the edge of the player's hitbox touches the spell counts, as in LoL.

### Bots
- `Bot` entity: position, `abilities[]` with individual cooldowns, `aimMode`, and `reactionJitter`.
- Bots stand around the arena edge (they can reposition slowly in later phases) and do **not** move toward the player in the MVP.
- **Aim modes** (`src/ai/aiming.ts`, unit-tested):
  - `direct`: aim at the player's current position.
  - `predictive`: lead the target using the player's current velocity. For projectiles, solve the intercept time (quadratic). For delayed AoE, aim at `pos + vel * delay`.
  - `mixed`: pick `direct` or `predictive` at random per cast. This trains the player not to be predictable.
  - Add Gaussian aim error scaled by difficulty.
- The cast scheduler uses a global "spell pressure" budget so that bots don't all fire in the same frame. Keep a minimum gap between casts that shrinks as difficulty rises.

### Game modes
1. **Endless survival (MVP).** 3 lives, and a hit removes a life with 1 s of invulnerability (the player blinks). Difficulty ramps every 20 s: more bots, shorter cooldowns, more predictive aim, and new archetypes unlocked. Score = time survived. Also track dodges.
2. **Drill mode.** Choose one or more archetypes and a difficulty, then practise with infinite lives while the screen shows hits and dodges per minute.
3. **Custom (stretch).** Sliders for bot count, projectile speed multiplier, aim mode, and whether Flash is enabled.

### Difficulty presets
| | Easy | Normal | Hard | Insane |
|---|---|---|---|---|
| Bots at start | 1 | 2 | 3 | 4 |
| Cooldown multiplier | 1.5 | 1.0 | 0.8 | 0.6 |
| Predictive aim % | 0 | 30 | 60 | 85 |
| Aim error (units, σ) | 120 | 60 | 30 | 10 |
| Path lines on linear | yes | no | no | no |

### Stats and feedback
- A projectile or area counts as a **dodge** when it expires without hitting the player while the player was within `range + 200` of its path. That way, skillshots that were never near the player don't inflate the count.
- HUD (DOM): timer, lives, dodges, hits, a Flash cooldown circle, and difficulty level.
- Game-over screen: time survived, dodges, dodge %, the ability that hit most often, personal best (saved in localStorage per mode and difficulty).
- On a hit: short screen shake, a red flash on the player, and floating text showing the ability name.
- Optional sound effects with Web Audio synth beeps (no asset files). Include a mute toggle.

---

## 3. Project structure

```
lol_practice_tool/
├─ index.html
├─ package.json
├─ tsconfig.json
├─ vite.config.ts
├─ src/
│  ├─ main.ts                  # bootstrap: canvas, loop, scene switch
│  ├─ core/
│  │  ├─ loop.ts               # fixed-timestep loop
│  │  ├─ input.ts              # mouse/keyboard → intent state (world coords)
│  │  ├─ collision.ts          # pure geometry (tested)
│  │  ├─ vec.ts                # Vec2 helpers (tested)
│  │  └─ rng.ts                # seeded RNG
│  ├─ entities/
│  │  ├─ player.ts             # movement, flash, invulnerability
│  │  ├─ bot.ts                # cooldowns, casting state machine
│  │  └─ skillshot.ts          # live spell instances per archetype
│  ├─ abilities/
│  │  └─ definitions.ts        # data table of all abilities
│  ├─ ai/
│  │  ├─ aiming.ts             # direct / predictive / error (tested)
│  │  └─ director.ts           # spawns bots, ramps difficulty, cast budget
│  ├─ game/
│  │  ├─ world.ts              # owns entities, step(dt), emits events
│  │  ├─ modes.ts              # endless / drill / custom rules
│  │  ├─ difficulty.ts         # presets table
│  │  └─ stats.ts              # dodge/hit tracking, persistence
│  ├─ render/
│  │  ├─ viewport.ts           # world↔screen transform, resize
│  │  ├─ renderer.ts           # draws arena, entities, telegraphs
│  │  └─ effects.ts            # click marker, shake, floating text
│  └─ ui/
│     ├─ hud.ts
│     ├─ menus.ts              # main menu, pause, game over, settings
│     └─ styles.css
└─ tests/
   ├─ collision.test.ts
   ├─ aiming.test.ts
   └─ player.test.ts
```

**Architecture rule:** `game/` and `entities/` must not import from `render/` or `ui/`. `World.step(dt, input)` changes state and returns events (`hit`, `dodge`, `cast`). The renderer and UI read the state and react to the events. This keeps the simulation testable without a browser.

---

## 4. Build phases (do them in order and check each before moving on)

### Phase 1: Scaffold and movement
- Vite + TS project, strict tsconfig, Vitest configured, `npm run dev`, `npm test`.
- Canvas fills the window, and the arena is letterboxed and drawn with a grid.
- Player circle; right-click to move; hold right-click to follow the cursor; `S` stops; click marker.
- **Done when:** movement feels like LoL: no drift, no overshoot, and it stays inside the arena. `vec` and `player` tests pass.

### Phase 2: One bot and a linear skillshot
- One bot in a fixed position fires `linear` projectiles on a cooldown, using direct aim.
- Swept-circle collision, and a hit is logged to the console.
- **Done when:** a projectile at 2000 u/s never passes through the player without registering a hit (covered by a unit test), and sidestepping visibly works.

### Phase 3: All archetypes and telegraphs
- Implement `linearSlow`, `circle`, `beam`, `cone` with windup indicators.
- Unit tests for each collision function, including edge-graze cases.
- A debug key `` ` `` toggles hitbox drawing.
- **Done when:** each archetype can be seen, dodged, and hit fairly, and the tests pass.

### Phase 4: AI aiming and director
- `predictive` aim with intercept solving, aim error, and `mixed` mode.
- A director that spawns bots around the edge, uses the cast budget, and ramps difficulty over time.
- **Done when:** walking in a straight line at Hard reliably gets you hit, and juking (changing direction) lets you dodge.

### Phase 5: Endless mode, HUD, and menus
- Lives, invulnerability, score, dodge tracking, Flash on `F` with a cooldown UI.
- Main menu (mode and difficulty), pause, game over with stats, personal bests in localStorage.
- **Done when:** a full loop works (menu → play → die → stats → restart) with no console errors.

### Phase 6: Drill mode, polish, and settings
- Drill mode with archetype checkboxes.
- Screen shake, floating text, synth SFX with a mute toggle, settings (Flash key, show path lines, volume).
- **Done when:** both modes are playable and the settings persist.

### Stretch (later)
- `ring` archetype, and bots that strafe along the edge.
- Terrain or walls with simple pathfinding (A* on a grid) so the player can use cover.
- Replay: record inputs plus the seed and play them back deterministically.
- Heatmap on the game-over screen showing where the player was hit.
- Ability "combos" (a stun circle followed by a linear shot).

---

## 5. Notes for the implementer (Sonnet)
- Keep the simulation pure and deterministic: no `Date.now()` or `Math.random()` in `game/`, `entities/`, or `ai/`. Use `dt` and `rng`.
- Convert mouse coordinates to world space in `input.ts` once. Nothing downstream should touch screen pixels.
- Handle `devicePixelRatio` so the canvas stays sharp on high-DPI screens.
- Tune the ability numbers in `definitions.ts` only. Don't hardcode them anywhere else.
- After each phase, run `npm test` and `npx tsc --noEmit`, and play the game in the browser.
- Do not use Riot Games assets, champion names, or logos. Use original names and simple shapes.
