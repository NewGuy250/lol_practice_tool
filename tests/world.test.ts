import { describe, it, expect } from 'vitest';
import { createWorld, stepWorld } from '../src/game/world';
import type { WorldState } from '../src/game/world';
import { createBot } from '../src/entities/bot';
import { PIERCING_BOLT } from '../src/abilities/definitions';
import { createPlayer } from '../src/entities/player';

const DT = 1 / 60;

function runTicks(world: WorldState, ticks: number, command: Parameters<typeof stepWorld>[2] = {}) {
  let current = world;
  const allEvents: ReturnType<typeof stepWorld>['events'] = [];
  for (let i = 0; i < ticks; i++) {
    const result = stepWorld(current, DT, command);
    current = result.world;
    allEvents.push(...result.events);
  }
  return { world: current, events: allEvents };
}

describe('createWorld', () => {
  it('spawns a player and one bot with no active skillshots', () => {
    const world = createWorld();
    expect(world.bots.length).toBe(1);
    expect(world.skillshots.length).toBe(0);
    expect(world.player.position).toBeDefined();
  });
});

describe('stepWorld', () => {
  it('a stationary player directly in a bot\'s line of fire eventually gets hit', () => {
    const player = createPlayer({ x: 500, y: 800 });
    const bot = createBot({ x: 500, y: 100 }, PIERCING_BOLT.id, 0); // directly above the player
    const world: WorldState = { player, bots: [bot], skillshots: [] };

    // Enough ticks for windup (0.25s) + full travel time (range/speed ≈ 0.575s) + margin.
    const { events } = runTicks(world, 120, {});

    const hitEvents = events.filter((e) => e.type === 'hit');
    const castEvents = events.filter((e) => e.type === 'cast');
    expect(castEvents.length).toBe(1);
    expect(hitEvents.length).toBe(1);
    expect(hitEvents[0]!.abilityId).toBe(PIERCING_BOLT.id);
  });

  it('sidestepping out of the telegraphed path avoids the hit', () => {
    const player = createPlayer({ x: 500, y: 800 });
    const bot = createBot({ x: 500, y: 100 }, PIERCING_BOLT.id, 0);
    let world: WorldState = { player, bots: [bot], skillshots: [] };

    const allEvents: ReturnType<typeof stepWorld>['events'] = [];
    for (let i = 0; i < 120; i++) {
      // Move far to the side, well outside the projectile's width, every tick.
      const result = stepWorld(world, DT, { moveTo: { x: 1600, y: 800 } });
      world = result.world;
      allEvents.push(...result.events);
    }

    const hitEvents = allEvents.filter((e) => e.type === 'hit');
    expect(hitEvents.length).toBe(0);
  });

  it('removes a skillshot once it hits the player (Phase 2: disappears on hit)', () => {
    const player = createPlayer({ x: 500, y: 800 });
    const bot = createBot({ x: 500, y: 100 }, PIERCING_BOLT.id, 0);
    const world: WorldState = { player, bots: [bot], skillshots: [] };

    const { world: finalWorld, events } = runTicks(world, 120, {});
    expect(events.some((e) => e.type === 'hit')).toBe(true);
    expect(finalWorld.skillshots.length).toBe(0);
  });

  it('a fast projectile never tunnels through a stationary player without a hit event, at the full 60 Hz step size', () => {
    // Place the player exactly along the bot's firing line at a distance
    // that requires many ticks to reach, so we exercise the real per-tick
    // travel distance (~33 u/tick at 2000 u/s) against the player's hitbox.
    const player = createPlayer({ x: 500, y: 900 });
    const bot = createBot({ x: 500, y: 100 }, PIERCING_BOLT.id, 0);
    const world: WorldState = { player, bots: [bot], skillshots: [] };

    const { events } = runTicks(world, 120, {});
    expect(events.filter((e) => e.type === 'hit').length).toBe(1);
  });
});
