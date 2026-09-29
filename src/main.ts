import { startLoop } from './core/loop';
import { createInputManager } from './core/input';
import { computeViewport } from './render/viewport';
import type { Viewport } from './render/viewport';
import { render } from './render/renderer';
import { createEffectsState, spawnClickMarker, stepEffects } from './render/effects';
import { createWorld, stepWorld } from './game/world';
import type { PlayerCommand } from './entities/player';

const canvas = document.getElementById('game-canvas') as HTMLCanvasElement | null;
if (!canvas) throw new Error('Missing #game-canvas element');

const ctx = canvas.getContext('2d');
if (!ctx) throw new Error('Canvas 2D context is not available');

let viewport: Viewport = computeViewport(window.innerWidth, window.innerHeight);

function resize(): void {
  const dpr = window.devicePixelRatio || 1;
  const cssWidth = window.innerWidth;
  const cssHeight = window.innerHeight;

  canvas!.width = Math.round(cssWidth * dpr);
  canvas!.height = Math.round(cssHeight * dpr);
  canvas!.style.width = `${cssWidth}px`;
  canvas!.style.height = `${cssHeight}px`;
  ctx!.setTransform(dpr, 0, 0, dpr, 0, 0);

  viewport = computeViewport(cssWidth, cssHeight);
}

window.addEventListener('resize', resize);
resize();

const input = createInputManager(canvas, () => viewport);

let world = createWorld();
const effects = createEffectsState();

function step(dt: number): void {
  const state = input.getState();
  const events = input.consumeEvents();

  if (events.moveClickedAt) {
    spawnClickMarker(effects, events.moveClickedAt);
  }

  const command: PlayerCommand = {};
  if (events.stop) {
    command.stop = true;
  } else if (state.rightMouseDown) {
    command.moveTo = state.cursorWorld;
  }

  const result = stepWorld(world, dt, command);
  world = result.world;
  stepEffects(effects, dt);

  for (const event of result.events) {
    if (event.type === 'hit') {
      // eslint-disable-next-line no-console
      console.log(`[hit] ${event.abilityId} at t=${performance.now().toFixed(0)}ms`);
    }
  }

  // Flash/pause/restart/debug-toggle are reserved for later phases (see PLAN.md).
}

function frameRender(_alpha: number): void {
  render(ctx!, viewport, { player: world.player, bots: world.bots, skillshots: world.skillshots, effects });
}

startLoop({ step, render: frameRender });
