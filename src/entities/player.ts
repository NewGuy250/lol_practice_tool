import type { Vec2 } from '../core/vec';
import { sub, length, angleOf, moveToward, distance } from '../core/vec';
import { clampToArena, ARENA_WIDTH, ARENA_HEIGHT } from '../core/arena';

export const PLAYER_RADIUS = 65;
export const PLAYER_MOVE_SPEED = 340; // units per second

export interface PlayerState {
  position: Vec2;
  /** Current move destination, or null if idle/stopped. */
  moveTarget: Vec2 | null;
  /** Facing direction in radians, used to draw the direction triangle. */
  facing: number;
}

export function createPlayer(position: Vec2): PlayerState {
  return {
    position: clampToArena(position, PLAYER_RADIUS),
    moveTarget: null,
    facing: 0,
  };
}

export function spawnPositionCenter(): Vec2 {
  return { x: ARENA_WIDTH / 2, y: ARENA_HEIGHT / 2 };
}

export interface PlayerCommand {
  /** New move destination this tick (world space), from a right-click or held right-click. */
  moveTo?: Vec2 | null;
  /** Clears the move destination, halting the player in place. */
  stop?: boolean;
}

/**
 * Advances the player by one fixed simulation step. Pure function: takes the
 * previous state and a command, returns the next state. Movement is a
 * straight line toward the (arena-clamped) destination at constant speed,
 * stopping exactly on arrival without overshoot.
 */
export function stepPlayer(state: PlayerState, dt: number, command: PlayerCommand): PlayerState {
  let moveTarget = state.moveTarget;

  if (command.stop) {
    moveTarget = null;
  } else if (command.moveTo) {
    // Clamp the destination itself (not just the resulting position) so
    // arrival can be detected exactly, even if the click landed outside
    // the arena (e.g. on a letterbox bar).
    moveTarget = clampToArena(command.moveTo, PLAYER_RADIUS);
  }

  let position = state.position;
  let facing = state.facing;

  if (moveTarget) {
    const toTarget = sub(moveTarget, position);
    if (length(toTarget) > 1e-6) {
      facing = angleOf(toTarget);
    }
    const maxDelta = PLAYER_MOVE_SPEED * dt;
    position = moveToward(position, moveTarget, maxDelta);
    if (distance(position, moveTarget) < 1e-6) {
      moveTarget = null; // arrived exactly; stop without overshoot
    }
  }

  position = clampToArena(position, PLAYER_RADIUS);

  return { position, moveTarget, facing };
}
