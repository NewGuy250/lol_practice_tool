import { createPlayer, stepPlayer, spawnPositionCenter, PLAYER_RADIUS } from '../entities/player';
import type { PlayerState, PlayerCommand } from '../entities/player';
import { createBot, stepBot } from '../entities/bot';
import type { BotState } from '../entities/bot';
import { spawnLinearSkillshot, stepLinearSkillshot, isLinearSkillshotExpired } from '../entities/skillshot';
import type { LinearSkillshot } from '../entities/skillshot';
import { circleVsSweptCircle } from '../core/collision';
import { ABILITIES, PIERCING_BOLT } from '../abilities/definitions';
import { ARENA_WIDTH } from '../core/arena';

/**
 * Owns all simulation entities and advances them one fixed step at a time.
 * Pure/functional: `stepWorld` takes the previous state and returns the
 * next state plus a list of events for the renderer/UI/audio to react to.
 * Must not import from render/ or ui/ (see PLAN.md's architecture rule).
 */

export interface WorldEvent {
  type: 'hit' | 'cast';
  abilityId: string;
}

export interface WorldState {
  player: PlayerState;
  bots: BotState[];
  skillshots: LinearSkillshot[];
}

export function createWorld(): WorldState {
  const bot = createBot({ x: ARENA_WIDTH / 2, y: 180 }, PIERCING_BOLT.id, 1);
  return {
    player: createPlayer(spawnPositionCenter()),
    bots: [bot],
    skillshots: [],
  };
}

export interface WorldStepResult {
  world: WorldState;
  events: WorldEvent[];
}

export function stepWorld(world: WorldState, dt: number, playerCommand: PlayerCommand): WorldStepResult {
  const events: WorldEvent[] = [];

  const player = stepPlayer(world.player, dt, playerCommand);

  const bots: BotState[] = [];
  const newlySpawned: LinearSkillshot[] = [];
  for (const bot of world.bots) {
    const ability = ABILITIES[bot.abilityId];
    if (!ability) {
      bots.push(bot);
      continue;
    }
    const result = stepBot(bot, dt, ability, player.position);
    bots.push(result.bot);
    if (result.cast) {
      newlySpawned.push(spawnLinearSkillshot(ability, result.cast.origin, result.cast.direction));
      events.push({ type: 'cast', abilityId: result.cast.abilityId });
    }
  }

  const survivors: LinearSkillshot[] = [];
  for (const shot of world.skillshots) {
    const stepped = stepLinearSkillshot(shot, dt);
    const projectileRadius = stepped.width / 2;
    const hit = circleVsSweptCircle(
      player.position,
      PLAYER_RADIUS,
      stepped.previousPosition,
      stepped.position,
      projectileRadius
    );
    if (hit) {
      events.push({ type: 'hit', abilityId: stepped.abilityId });
      continue; // Phase 2: the projectile disappears on hit.
    }
    if (!isLinearSkillshotExpired(stepped)) {
      survivors.push(stepped);
    }
  }

  return {
    world: { player, bots, skillshots: [...survivors, ...newlySpawned] },
    events,
  };
}
