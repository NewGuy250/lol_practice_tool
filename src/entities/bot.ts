import type { Vec2 } from '../core/vec';
import { sub, normalize } from '../core/vec';
import type { AbilityDef } from '../abilities/definitions';

/**
 * A bot's cast state machine: it waits out its cooldown, then locks in an
 * aim direction and winds up (telegraphing the cast), then fires.
 *
 * Aiming is `direct` only in Phase 2 (aim at the player's position at the
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
  /** Direction locked in when the windup started; null while idle. */
  aimDirection: Vec2 | null;
}

export function createBot(position: Vec2, abilityId: string, initialCooldown = 0): BotState {
  return {
    position: { ...position },
    abilityId,
    phase: 'idle',
    cooldownRemaining: initialCooldown,
    windupRemaining: 0,
    aimDirection: null,
  };
}

export interface BotCast {
  abilityId: string;
  origin: Vec2;
  direction: Vec2;
}

export interface BotStepResult {
  bot: BotState;
  /** Set on the exact tick the projectile should be spawned. */
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
    // Cooldown elapsed: lock aim now and start the telegraphed windup.
    const aimDirection = normalize(sub(playerPosition, bot.position));
    return {
      bot: {
        ...bot,
        cooldownRemaining: 0,
        phase: 'winding-up',
        windupRemaining: ability.windup,
        aimDirection,
      },
      cast: null,
    };
  }

  // phase === 'winding-up'
  const windupRemaining = bot.windupRemaining - dt;
  if (windupRemaining > 0) {
    return { bot: { ...bot, windupRemaining }, cast: null };
  }

  const direction = bot.aimDirection ?? { x: 1, y: 0 };
  return {
    bot: {
      ...bot,
      phase: 'idle',
      windupRemaining: 0,
      aimDirection: null,
      cooldownRemaining: ability.cooldown,
    },
    cast: { abilityId: bot.abilityId, origin: { ...bot.position }, direction },
  };
}
