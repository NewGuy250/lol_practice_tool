import type { Vec2 } from './vec';
import type { Viewport } from '../render/viewport';
import { screenToWorld } from '../render/viewport';

/**
 * Converts raw mouse/keyboard events into world-space intent, once, here.
 * Nothing downstream should touch screen pixels or DOM event objects.
 *
 * Continuous state (cursor position, whether the move button is held) is
 * read directly via `getState()`. Discrete "this happened once" actions
 * (stop, flash, pause, restart, debug toggle) are edge-triggered and must be
 * drained with `consumeEvents()` so each key press is only handled once,
 * however many fixed simulation steps run before the next drain.
 */

const RIGHT_MOUSE_BUTTON = 2;

export interface InputState {
  /** Current cursor position in world space. */
  cursorWorld: Vec2;
  /** True while the right mouse button is held down. */
  rightMouseDown: boolean;
}

export interface InputEvents {
  /** World position at the instant the right mouse button was pressed (for the click marker). */
  moveClickedAt: Vec2 | null;
  stop: boolean;
  flash: boolean;
  pause: boolean;
  restart: boolean;
  toggleDebug: boolean;
}

export interface InputManager {
  getState(): InputState;
  /** Returns and clears the events that occurred since the last call. */
  consumeEvents(): InputEvents;
  dispose(): void;
}

function emptyEvents(): InputEvents {
  return {
    moveClickedAt: null,
    stop: false,
    flash: false,
    pause: false,
    restart: false,
    toggleDebug: false,
  };
}

export function createInputManager(
  target: HTMLElement,
  getViewport: () => Viewport
): InputManager {
  const state: InputState = {
    cursorWorld: { x: 0, y: 0 },
    rightMouseDown: false,
  };
  let pending = emptyEvents();

  function updateCursorFromEvent(e: MouseEvent): void {
    const rect = target.getBoundingClientRect();
    const screen = { x: e.clientX - rect.left, y: e.clientY - rect.top };
    state.cursorWorld = screenToWorld(getViewport(), screen);
  }

  function onContextMenu(e: Event): void {
    e.preventDefault();
  }

  function onMouseMove(e: MouseEvent): void {
    updateCursorFromEvent(e);
  }

  function onMouseDown(e: MouseEvent): void {
    if (e.button !== RIGHT_MOUSE_BUTTON) return;
    updateCursorFromEvent(e);
    state.rightMouseDown = true;
    pending.moveClickedAt = { ...state.cursorWorld };
  }

  function onMouseUp(e: MouseEvent): void {
    if (e.button !== RIGHT_MOUSE_BUTTON) return;
    state.rightMouseDown = false;
  }

  function onMouseLeave(): void {
    // Don't stop movement if the cursor briefly leaves the canvas while held;
    // only stop tracking so we don't act on stale coordinates.
  }

  function onKeyDown(e: KeyboardEvent): void {
    // Ignore auto-repeat so holding a key doesn't spam one-shot events.
    if (e.repeat) return;
    switch (e.key.toLowerCase()) {
      case 's':
        pending.stop = true;
        break;
      case 'f':
        pending.flash = true;
        break;
      case 'escape':
        pending.pause = true;
        break;
      case 'r':
        pending.restart = true;
        break;
      case '`':
        pending.toggleDebug = true;
        break;
      default:
        break;
    }
  }

  target.addEventListener('contextmenu', onContextMenu);
  target.addEventListener('mousemove', onMouseMove);
  target.addEventListener('mousedown', onMouseDown);
  window.addEventListener('mouseup', onMouseUp);
  target.addEventListener('mouseleave', onMouseLeave);
  window.addEventListener('keydown', onKeyDown);

  return {
    getState(): InputState {
      return state;
    },
    consumeEvents(): InputEvents {
      const events = pending;
      pending = emptyEvents();
      return events;
    },
    dispose(): void {
      target.removeEventListener('contextmenu', onContextMenu);
      target.removeEventListener('mousemove', onMouseMove);
      target.removeEventListener('mousedown', onMouseDown);
      window.removeEventListener('mouseup', onMouseUp);
      target.removeEventListener('mouseleave', onMouseLeave);
      window.removeEventListener('keydown', onKeyDown);
    },
  };
}
