import { describe, it, expect } from 'vitest';
import { createWorld, stepWorld } from '../src/game/world';
import type { WorldState } from '../src/game/world';
import { createBot } from '../src/entities/bot';
import { PIERCING_BOLT, VOID_ERUPTION, ARCING_LANCE, SWEEPING_BLADE } from '../src/abilities/definitions';
import { createPlayer, PLAYER_RADIUS } from '../src/entities/player';
import { ARENA_WIDTH } from '../src/core/arena';

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
  it('spawns a player and one bot per archetype, with no active skillshots', () => {
    const world = createWorld();
    expect(world.bots.length).toBe(5);
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

describe('circle archetype (Void Eruption): ground-targeted, resolves instantly at windup end', () => {
  it('hits a stationary player once the windup elapses', () => {
    const player = createPlayer({ x: 700, y: 700 });
    const bot = createBot({ x: 100, y: 100 }, VOID_ERUPTION.id, 0);
    const world: WorldState = { player, bots: [bot], skillshots: [] };

    const { events, world: finalWorld } = runTicks(world, 60, {});
    expect(events.filter((e) => e.type === 'cast').length).toBe(1);
    const hitEvents = events.filter((e) => e.type === 'hit');
    expect(hitEvents.length).toBe(1);
    expect(hitEvents[0]!.abilityId).toBe(VOID_ERUPTION.id);
    // It's a one-shot resolution, not a traveling entity.
    expect(finalWorld.skillshots.length).toBe(0);
  });

  it('running away during the windup clears the danger radius in time', () => {
    const player = createPlayer({ x: 700, y: 700 });
    const bot = createBot({ x: 100, y: 100 }, VOID_ERUPTION.id, 0);
    let world: WorldState = { player, bots: [bot], skillshots: [] };

    const allEvents: ReturnType<typeof stepWorld>['events'] = [];
    for (let i = 0; i < 60; i++) {
      const result = stepWorld(world, DT, { moveTo: { x: ARENA_WIDTH - PLAYER_RADIUS, y: 700 } });
      world = result.world;
      allEvents.push(...result.events);
    }
    expect(allEvents.filter((e) => e.type === 'hit').length).toBe(0);
  });
});

describe('beam archetype (Arcing Lance): instant-hit rectangle after a long windup', () => {
  it('hits a stationary player standing along the beam path', () => {
    const player = createPlayer({ x: 800, y: 700 });
    const bot = createBot({ x: 100, y: 700 }, ARCING_LANCE.id, 0);
    const world: WorldState = { player, bots: [bot], skillshots: [] };

    const { events } = runTicks(world, 60, {});
    expect(events.filter((e) => e.type === 'cast').length).toBe(1);
    expect(events.filter((e) => e.type === 'hit' && e.abilityId === ARCING_LANCE.id).length).toBe(1);
  });

  it('stepping perpendicular out of the beam before it fires avoids the hit', () => {
    const player = createPlayer({ x: 800, y: 700 });
    const bot = createBot({ x: 100, y: 700 }, ARCING_LANCE.id, 0);
    let world: WorldState = { player, bots: [bot], skillshots: [] };

    const allEvents: ReturnType<typeof stepWorld>['events'] = [];
    for (let i = 0; i < 60; i++) {
      const result = stepWorld(world, DT, { moveTo: { x: 800, y: 1300 } });
      world = result.world;
      allEvents.push(...result.events);
    }
    expect(allEvents.filter((e) => e.type === 'hit').length).toBe(0);
  });
});

describe('cone archetype (Sweeping Blade): instant-hit sector after a windup', () => {
  it('hits a stationary player standing in the sector', () => {
    const player = createPlayer({ x: 700, y: 700 });
    const bot = createBot({ x: 620, y: 700 }, SWEEPING_BLADE.id, 0);
    const world: WorldState = { player, bots: [bot], skillshots: [] };

    const { events } = runTicks(world, 40, {});
    expect(events.filter((e) => e.type === 'cast').length).toBe(1);
    expect(events.filter((e) => e.type === 'hit' && e.abilityId === SWEEPING_BLADE.id).length).toBe(1);
  });

  it('sidestepping out of the narrow sector before it fires avoids the hit', () => {
    const player = createPlayer({ x: 700, y: 700 });
    const bot = createBot({ x: 620, y: 700 }, SWEEPING_BLADE.id, 0);
    let world: WorldState = { player, bots: [bot], skillshots: [] };

    const allEvents: ReturnType<typeof stepWorld>['events'] = [];
    for (let i = 0; i < 40; i++) {
      const result = stepWorld(world, DT, { moveTo: { x: 700, y: 1300 } });
      world = result.world;
      allEvents.push(...result.events);
    }
    expect(allEvents.filter((e) => e.type === 'hit').length).toBe(0);
  });
});
