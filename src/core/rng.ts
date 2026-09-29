/**
 * Seeded RNG (mulberry32) so runs can be reproduced in tests and replays.
 * Never use Math.random() in game/entities/ai code — use an Rng instance instead.
 */

export interface Rng {
  /** Returns a float in [0, 1). */
  next(): number;
  /** Returns a float in [min, max). */
  range(min: number, max: number): number;
  /** Returns a sample from a normal distribution (Box–Muller) with the given mean/stddev. */
  gaussian(mean: number, stddev: number): number;
}

export function createRng(seed: number): Rng {
  let state = seed >>> 0;

  function next(): number {
    state |= 0;
    state = (state + 0x6d2b79f5) | 0;
    let t = Math.imul(state ^ (state >>> 15), 1 | state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }

  function range(min: number, max: number): number {
    return min + next() * (max - min);
  }

  function gaussian(mean: number, stddev: number): number {
    // Box–Muller transform. Avoid u === 0 (log(0) is -Infinity).
    let u = 0;
    let v = 0;
    while (u === 0) u = next();
    while (v === 0) v = next();
    const z = Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
    return mean + z * stddev;
  }

  return { next, range, gaussian };
}
