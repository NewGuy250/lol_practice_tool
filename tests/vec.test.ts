import { describe, it, expect } from 'vitest';
import {
  vec,
  add,
  sub,
  scale,
  dot,
  length,
  lengthSq,
  distance,
  normalize,
  clampVec,
  angleOf,
  fromAngle,
  moveToward,
} from '../src/core/vec';

describe('vec', () => {
  it('adds and subtracts', () => {
    expect(add(vec(1, 2), vec(3, 4))).toEqual({ x: 4, y: 6 });
    expect(sub(vec(3, 4), vec(1, 2))).toEqual({ x: 2, y: 2 });
  });

  it('scales', () => {
    expect(scale(vec(2, 3), 2)).toEqual({ x: 4, y: 6 });
  });

  it('computes dot product', () => {
    expect(dot(vec(1, 0), vec(0, 1))).toBe(0);
    expect(dot(vec(2, 3), vec(4, 5))).toBe(2 * 4 + 3 * 5);
  });

  it('computes length and lengthSq', () => {
    expect(lengthSq(vec(3, 4))).toBe(25);
    expect(length(vec(3, 4))).toBe(5);
  });

  it('computes distance between points', () => {
    expect(distance(vec(0, 0), vec(3, 4))).toBe(5);
  });

  it('normalizes to a unit vector', () => {
    const n = normalize(vec(3, 4));
    expect(n.x).toBeCloseTo(0.6);
    expect(n.y).toBeCloseTo(0.8);
    expect(length(n)).toBeCloseTo(1);
  });

  it('normalize of the zero vector is the zero vector', () => {
    expect(normalize(vec(0, 0))).toEqual({ x: 0, y: 0 });
  });

  it('clamps a point into a box', () => {
    expect(clampVec(vec(-5, 50), vec(0, 0), vec(10, 10))).toEqual({ x: 0, y: 10 });
    expect(clampVec(vec(5, 5), vec(0, 0), vec(10, 10))).toEqual({ x: 5, y: 5 });
  });

  it('computes angleOf and fromAngle as inverses', () => {
    const a = vec(1, 1);
    const angle = angleOf(a);
    expect(angle).toBeCloseTo(Math.PI / 4);
    const back = fromAngle(angle, length(a));
    expect(back.x).toBeCloseTo(a.x);
    expect(back.y).toBeCloseTo(a.y);
  });

  describe('moveToward', () => {
    it('moves partway toward the target without overshooting', () => {
      const result = moveToward(vec(0, 0), vec(10, 0), 4);
      expect(result).toEqual({ x: 4, y: 0 });
    });

    it('stops exactly on the target when maxDelta exceeds the distance', () => {
      const result = moveToward(vec(0, 0), vec(3, 4), 100);
      expect(result).toEqual({ x: 3, y: 4 });
    });

    it('lands exactly on the target when maxDelta equals the distance', () => {
      const result = moveToward(vec(0, 0), vec(10, 0), 10);
      expect(result.x).toBeCloseTo(10);
      expect(result.y).toBeCloseTo(0);
    });

    it('returns the target as-is when already there', () => {
      const result = moveToward(vec(5, 5), vec(5, 5), 4);
      expect(result).toEqual({ x: 5, y: 5 });
    });
  });
});
