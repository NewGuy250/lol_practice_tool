import type { Vec2 } from '../core/vec';
import type { AbilityDef } from '../abilities/definitions';

/**
 * A bot's cast state machine: it waits out its cooldown, then locks in an
 * aim point and winds up (telegraphing the cast), then fires.
 *
 * The locked `aimPoint` is a world position, not just a direction, so it
 * works for every archetype: `linear`/`linearSlow`/`beam`/`cone` derive a
 * direction from (aimPoint - position), while `circle` uses the point
 * itself as the ground target.
 *
 * Aiming is `direct` only in Phase 2/3 (aim at the player's position at the
 * moment the windup starts); `predictive`/`mixed` aim modes and multi-bot
 * spawning arrive in Phase 4.
 */

export type BotCastPhase = 'idle' | 'winding-up';

export interface BotState {
  position: Vec2;
  abilityId: string;
  phase: BotCastPhase;
  /** Seconds left before the bot may start its next cast (phase === 'idle'). */
  cooldownRemaining: number;
  /** Seconds left in the current windup (phase === 'winding-up'). */
  windupRemaining: number;
  /** Target point locked in when the windup started; null while idle. */
  aimPoint: Vec2 | null;
}

export function createBot(position: Vec2, abilityId: string, initialCooldown = 0): BotState {
  return {
    position: { ...position },
    abilityId,
    phase: 'idle',
    cooldownRemaining: initialCooldown,
    windupRemaining: 0,
    aimPoint: null,
  };
}

export interface BotCast {
  abilityId: string;
  origin: Vec2;
  aimPoint: Vec2;
}

export interface BotStepResult {
  bot: BotState;
  /** Set on the exact tick the ability should fire/resolve. */
  cast: BotCast | null;
}

export function stepBot(
  bot: BotState,
  dt: number,
  ability: AbilityDef,
  playerPosition: Vec2
): BotStepResult {
  if (bot.phase === 'idle') {
    const cooldownRemaining = bot.cooldownRemaining - dt;
    if (cooldownRemaining > 0) {
      return { bot: { ...bot, cooldownRemaining }, cast: null };
    }
    // Cooldown elapsed: lock the aim point now and start the telegraphed windup.
    return {
      bot: {
        ...bot,
        cooldownRemaining: 0,
        phase: 'winding-up',
        windupRemaining: ability.windup,
        aimPoint: { ...playerPosition },
      },
      cast: null,
    };
  }

  // phase === 'winding-up'
  const windupRemaining = bot.windupRemaining - dt;
  if (windupRemaining > 0) {
    return { bot: { ...bot, windupRemaining }, cast: null };
  }

  const aimPoint = bot.aimPoint ?? { x: bot.position.x + 1, y: bot.position.y };
  return {
    bot: {
      ...bot,
      phase: 'idle',
      windupRemaining: 0,
      aimPoint: null,
      cooldownRemaining: ability.cooldown,
    },
    cast: { abilityId: bot.abilityId, origin: { ...bot.position }, aimPoint },
  };
}
