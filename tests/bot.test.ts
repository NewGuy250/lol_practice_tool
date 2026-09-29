import { describe, it, expect } from 'vitest';
import { createBot, stepBot } from '../src/entities/bot';
import { PIERCING_BOLT } from '../src/abilities/definitions';

describe('bot cast state machine', () => {
  it('stays idle and counts down its cooldown', () => {
    let bot = createBot({ x: 0, y: 0 }, PIERCING_BOLT.id, 1);
    const result = stepBot(bot, 0.4, PIERCING_BOLT, { x: 100, y: 0 });
    bot = result.bot;
    expect(bot.phase).toBe('idle');
    expect(bot.cooldownRemaining).toBeCloseTo(0.6);
    expect(result.cast).toBeNull();
  });

  it('locks aim toward the player and starts winding up once cooldown elapses', () => {
    let bot = createBot({ x: 0, y: 0 }, PIERCING_BOLT.id, 0.1);
    const result = stepBot(bot, 0.2, PIERCING_BOLT, { x: 0, y: 500 });
    bot = result.bot;
    expect(bot.phase).toBe('winding-up');
    expect(bot.windupRemaining).toBeCloseTo(PIERCING_BOLT.windup);
    expect(bot.aimDirection).not.toBeNull();
    expect(bot.aimDirection!.x).toBeCloseTo(0);
    expect(bot.aimDirection!.y).toBeCloseTo(1);
    expect(result.cast).toBeNull();
  });

  it('fires after the windup elapses, using the locked aim direction, and resets cooldown', () => {
    let bot = createBot({ x: 0, y: 0 }, PIERCING_BOLT.id, 0);
    // Start the windup (cooldown was already 0).
    let result = stepBot(bot, 0.01, PIERCING_BOLT, { x: 1, y: 0 });
    bot = result.bot;
    expect(bot.phase).toBe('winding-up');

    // Player moves after aim was locked; the shot should NOT re-aim.
    result = stepBot(bot, PIERCING_BOLT.windup, PIERCING_BOLT, { x: 0, y: 999 });
    bot = result.bot;

    expect(result.cast).not.toBeNull();
    expect(result.cast!.abilityId).toBe(PIERCING_BOLT.id);
    expect(result.cast!.direction.x).toBeCloseTo(1);
    expect(result.cast!.direction.y).toBeCloseTo(0);
    expect(bot.phase).toBe('idle');
    expect(bot.cooldownRemaining).toBeCloseTo(PIERCING_BOLT.cooldown);
    expect(bot.aimDirection).toBeNull();
  });

  it('does not fire early: windup must fully elapse', () => {
    let bot = createBot({ x: 0, y: 0 }, PIERCING_BOLT.id, 0);
    let result = stepBot(bot, 0.01, PIERCING_BOLT, { x: 1, y: 0 });
    bot = result.bot;

    result = stepBot(bot, PIERCING_BOLT.windup - 0.05, PIERCING_BOLT, { x: 1, y: 0 });
    expect(result.cast).toBeNull();
    expect(result.bot.phase).toBe('winding-up');
  });
});
