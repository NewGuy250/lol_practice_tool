/**
 * Fixed-timestep game loop driven by requestAnimationFrame.
 * Simulation always advances in fixed `dt` chunks so it stays deterministic;
 * rendering happens once per animation frame with an interpolation alpha
 * (0..1) telling the renderer how far between simulation steps we are.
 */

export interface LoopHandle {
  stop(): void;
}

export interface LoopCallbacks {
  /** Advance simulation by a fixed dt (seconds). May be called 0+ times per frame. */
  step(dt: number): void;
  /** Draw the current state. `alpha` is how far we are into the next step (0..1). */
  render(alpha: number): void;
}

const STEP_SECONDS = 1 / 60;
const MAX_FRAME_SECONDS = 0.25; // clamp huge gaps (tab backgrounded, breakpoints, etc.)

export function startLoop(callbacks: LoopCallbacks): LoopHandle {
  let accumulator = 0;
  let lastTime: number | null = null;
  let running = true;
  let rafId = 0;

  function frame(now: number): void {
    if (!running) return;

    if (lastTime === null) {
      lastTime = now;
    }
    let frameSeconds = (now - lastTime) / 1000;
    lastTime = now;
    if (frameSeconds > MAX_FRAME_SECONDS) frameSeconds = MAX_FRAME_SECONDS;

    accumulator += frameSeconds;
    while (accumulator >= STEP_SECONDS) {
      callbacks.step(STEP_SECONDS);
      accumulator -= STEP_SECONDS;
    }

    callbacks.render(accumulator / STEP_SECONDS);
    rafId = requestAnimationFrame(frame);
  }

  rafId = requestAnimationFrame(frame);

  return {
    stop(): void {
      running = false;
      cancelAnimationFrame(rafId);
    },
  };
}

export const FIXED_STEP_SECONDS = STEP_SECONDS;
