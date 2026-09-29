import { ARENA_WIDTH, ARENA_HEIGHT, worldToScreen, worldLengthToScreen } from './viewport';
import type { Viewport } from './viewport';
import type { Vec2 } from '../core/vec';
import { sub, normalize, length as vecLength } from '../core/vec';
import type { PlayerState } from '../entities/player';
import { PLAYER_RADIUS } from '../entities/player';
import type { BotState } from '../entities/bot';
import type { LinearSkillshot } from '../entities/skillshot';
import { ABILITIES } from '../abilities/definitions';
import type { AbilityDef, LinearAbilityDef, CircleAbilityDef, BeamAbilityDef, ConeAbilityDef } from '../abilities/definitions';
import type { EffectsState } from './effects';
import { CLICK_MARKER_LIFETIME } from './effects';

const GRID_SPACING = 200; // world units
const ARENA_FILL = '#12161f';
const ARENA_BORDER = '#3a4256';
const GRID_COLOR = 'rgba(255, 255, 255, 0.06)';
const PLAYER_COLOR = '#5bd1ff';
const PLAYER_OUTLINE = '#e8fbff';
const DESTINATION_LINE_COLOR = 'rgba(91, 209, 255, 0.35)';
const CLICK_MARKER_COLOR = '#4dff8f';
const BOT_RADIUS = 55; // world units, cosmetic only — bots can't be hit
const BOT_COLOR = '#ffb454';
const BOT_OUTLINE = '#4a2f0e';
const CAST_BAR_WIDTH = 70; // CSS pixels
const CAST_BAR_HEIGHT = 8;
const DEBUG_COLOR = '#ff2fd1';

export interface RenderState {
  player: PlayerState;
  bots: BotState[];
  skillshots: LinearSkillshot[];
  effects: EffectsState;
  /** Debug key (`` ` ``) toggles drawing exact collision hitboxes. */
  debug?: boolean;
}

export function clearCanvas(ctx: CanvasRenderingContext2D, width: number, height: number): void {
  ctx.fillStyle = '#05060a';
  ctx.fillRect(0, 0, width, height);
}

export function drawArena(ctx: CanvasRenderingContext2D, viewport: Viewport): void {
  const topLeft = worldToScreen(viewport, { x: 0, y: 0 });
  const bottomRight = worldToScreen(viewport, { x: ARENA_WIDTH, y: ARENA_HEIGHT });
  const w = bottomRight.x - topLeft.x;
  const h = bottomRight.y - topLeft.y;

  ctx.fillStyle = ARENA_FILL;
  ctx.fillRect(topLeft.x, topLeft.y, w, h);

  ctx.strokeStyle = GRID_COLOR;
  ctx.lineWidth = 1;
  ctx.beginPath();
  for (let x = 0; x <= ARENA_WIDTH; x += GRID_SPACING) {
    const a = worldToScreen(viewport, { x, y: 0 });
    const b = worldToScreen(viewport, { x, y: ARENA_HEIGHT });
    ctx.moveTo(a.x, a.y);
    ctx.lineTo(b.x, b.y);
  }
  for (let y = 0; y <= ARENA_HEIGHT; y += GRID_SPACING) {
    const a = worldToScreen(viewport, { x: 0, y });
    const b = worldToScreen(viewport, { x: ARENA_WIDTH, y });
    ctx.moveTo(a.x, a.y);
    ctx.lineTo(b.x, b.y);
  }
  ctx.stroke();

  ctx.strokeStyle = ARENA_BORDER;
  ctx.lineWidth = 3;
  ctx.strokeRect(topLeft.x, topLeft.y, w, h);
}

export function drawPlayer(ctx: CanvasRenderingContext2D, viewport: Viewport, player: PlayerState): void {
  const screenPos = worldToScreen(viewport, player.position);
  const radius = worldLengthToScreen(viewport, PLAYER_RADIUS);

  if (player.moveTarget) {
    const destScreen = worldToScreen(viewport, player.moveTarget);
    ctx.strokeStyle = DESTINATION_LINE_COLOR;
    ctx.lineWidth = 2;
    ctx.setLineDash([6, 6]);
    ctx.beginPath();
    ctx.moveTo(screenPos.x, screenPos.y);
    ctx.lineTo(destScreen.x, destScreen.y);
    ctx.stroke();
    ctx.setLineDash([]);
  }

  ctx.fillStyle = PLAYER_COLOR;
  ctx.strokeStyle = PLAYER_OUTLINE;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(screenPos.x, screenPos.y, radius, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();

  // Facing triangle, pointing in `player.facing`.
  const tipLen = radius * 1.15;
  const backLen = radius * 0.55;
  const backWidth = radius * 0.6;
  const angle = player.facing;
  const perp = angle + Math.PI / 2;
  const tip = {
    x: screenPos.x + Math.cos(angle) * tipLen,
    y: screenPos.y + Math.sin(angle) * tipLen,
  };
  const backCenter = {
    x: screenPos.x + Math.cos(angle) * backLen,
    y: screenPos.y + Math.sin(angle) * backLen,
  };
  const backA = {
    x: backCenter.x + Math.cos(perp) * backWidth,
    y: backCenter.y + Math.sin(perp) * backWidth,
  };
  const backB = {
    x: backCenter.x - Math.cos(perp) * backWidth,
    y: backCenter.y - Math.sin(perp) * backWidth,
  };
  ctx.fillStyle = PLAYER_OUTLINE;
  ctx.beginPath();
  ctx.moveTo(tip.x, tip.y);
  ctx.lineTo(backA.x, backA.y);
  ctx.lineTo(backB.x, backB.y);
  ctx.closePath();
  ctx.fill();
}

function directionBetween(a: Vec2, b: Vec2): Vec2 {
  const d = sub(b, a);
  return vecLength(d) > 1e-6 ? normalize(d) : { x: 1, y: 0 };
}

/** Full danger-zone outline shown immediately (fairness), with a fill that grows as `progress` (0->1) approaches landing. */
function drawLinearTelegraph(
  ctx: CanvasRenderingContext2D,
  viewport: Viewport,
  ability: LinearAbilityDef,
  origin: Vec2,
  aimPoint: Vec2,
  progress: number
): void {
  const direction = directionBetween(origin, aimPoint);
  const screenOrigin = worldToScreen(viewport, origin);
  const previewLen = worldLengthToScreen(viewport, ability.range);
  const previewWidth = worldLengthToScreen(viewport, ability.width);
  const end = {
    x: screenOrigin.x + direction.x * previewLen,
    y: screenOrigin.y + direction.y * previewLen,
  };

  ctx.strokeStyle = ability.color;
  ctx.globalAlpha = 0.15 + progress * 0.35;
  ctx.lineWidth = Math.max(1, previewWidth);
  ctx.beginPath();
  ctx.moveTo(screenOrigin.x, screenOrigin.y);
  ctx.lineTo(end.x, end.y);
  ctx.stroke();
  ctx.globalAlpha = 1;
}

function drawCircleTelegraph(
  ctx: CanvasRenderingContext2D,
  viewport: Viewport,
  ability: CircleAbilityDef,
  aimPoint: Vec2,
  progress: number
): void {
  const center = worldToScreen(viewport, aimPoint);
  const radius = worldLengthToScreen(viewport, ability.radius);

  ctx.strokeStyle = ability.color;
  ctx.globalAlpha = 0.6;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(center.x, center.y, radius, 0, Math.PI * 2);
  ctx.stroke();
  ctx.globalAlpha = 1;

  ctx.fillStyle = ability.color;
  ctx.globalAlpha = 0.12 + progress * 0.35;
  ctx.beginPath();
  ctx.arc(center.x, center.y, radius * progress, 0, Math.PI * 2);
  ctx.fill();
  ctx.globalAlpha = 1;
}

function drawBeamTelegraph(
  ctx: CanvasRenderingContext2D,
  viewport: Viewport,
  ability: BeamAbilityDef,
  origin: Vec2,
  aimPoint: Vec2,
  progress: number
): void {
  const direction = directionBetween(origin, aimPoint);
  const angle = Math.atan2(direction.y, direction.x);
  const screenOrigin = worldToScreen(viewport, origin);
  const beamLength = worldLengthToScreen(viewport, ability.length);
  const beamWidth = worldLengthToScreen(viewport, ability.width);

  ctx.save();
  ctx.translate(screenOrigin.x, screenOrigin.y);
  ctx.rotate(angle);

  ctx.strokeStyle = ability.color;
  ctx.globalAlpha = 0.6;
  ctx.lineWidth = 2;
  ctx.strokeRect(0, -beamWidth / 2, beamLength, beamWidth);
  ctx.globalAlpha = 1;

  ctx.fillStyle = ability.color;
  ctx.globalAlpha = 0.12 + progress * 0.4;
  ctx.fillRect(0, -beamWidth / 2, beamLength, beamWidth);
  ctx.globalAlpha = 1;

  ctx.restore();
}

function drawConeTelegraph(
  ctx: CanvasRenderingContext2D,
  viewport: Viewport,
  ability: ConeAbilityDef,
  origin: Vec2,
  aimPoint: Vec2,
  progress: number
): void {
  const direction = directionBetween(origin, aimPoint);
  const angle = Math.atan2(direction.y, direction.x);
  const halfAngle = ability.angle / 2;
  const screenOrigin = worldToScreen(viewport, origin);
  const range = worldLengthToScreen(viewport, ability.range);

  ctx.save();
  ctx.translate(screenOrigin.x, screenOrigin.y);

  ctx.strokeStyle = ability.color;
  ctx.globalAlpha = 0.6;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.arc(0, 0, range, angle - halfAngle, angle + halfAngle);
  ctx.closePath();
  ctx.stroke();
  ctx.globalAlpha = 1;

  ctx.fillStyle = ability.color;
  ctx.globalAlpha = 0.12 + progress * 0.4;
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.arc(0, 0, range * progress, angle - halfAngle, angle + halfAngle);
  ctx.closePath();
  ctx.fill();
  ctx.globalAlpha = 1;

  ctx.restore();
}

function drawTelegraph(
  ctx: CanvasRenderingContext2D,
  viewport: Viewport,
  ability: AbilityDef,
  origin: Vec2,
  aimPoint: Vec2,
  progress: number
): void {
  switch (ability.archetype) {
    case 'linear':
    case 'linearSlow':
      drawLinearTelegraph(ctx, viewport, ability, origin, aimPoint, progress);
      break;
    case 'circle':
      drawCircleTelegraph(ctx, viewport, ability, aimPoint, progress);
      break;
    case 'beam':
      drawBeamTelegraph(ctx, viewport, ability, origin, aimPoint, progress);
      break;
    case 'cone':
      drawConeTelegraph(ctx, viewport, ability, origin, aimPoint, progress);
      break;
  }
}

/**
 * Draws a bot and, while it's winding up, its telegraph — the full danger
 * zone for its archetype (band/circle/beam/cone), shown at full extent
 * immediately, with a fill that grows as the windup nears its end, plus a
 * cast bar. This is what makes the upcoming shot dodgeable instead of an
 * unfair surprise.
 */
export function drawBot(ctx: CanvasRenderingContext2D, viewport: Viewport, bot: BotState): void {
  const screenPos = worldToScreen(viewport, bot.position);
  const radius = worldLengthToScreen(viewport, BOT_RADIUS);
  const ability = ABILITIES[bot.abilityId];

  if (bot.phase === 'winding-up' && bot.aimPoint && ability) {
    const progress = 1 - bot.windupRemaining / ability.windup; // 0 -> 1
    drawTelegraph(ctx, viewport, ability, bot.position, bot.aimPoint, progress);

    const barX = screenPos.x - CAST_BAR_WIDTH / 2;
    const barY = screenPos.y - radius - 18;
    ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
    ctx.fillRect(barX, barY, CAST_BAR_WIDTH, CAST_BAR_HEIGHT);
    ctx.fillStyle = ability.color;
    ctx.fillRect(barX, barY, CAST_BAR_WIDTH * progress, CAST_BAR_HEIGHT);
  }

  ctx.fillStyle = BOT_COLOR;
  ctx.strokeStyle = BOT_OUTLINE;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(screenPos.x, screenPos.y, radius, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
}

export function drawSkillshot(
  ctx: CanvasRenderingContext2D,
  viewport: Viewport,
  shot: LinearSkillshot
): void {
  const screenPos = worldToScreen(viewport, shot.position);
  const prevScreen = worldToScreen(viewport, shot.previousPosition);
  const radius = worldLengthToScreen(viewport, shot.width / 2);

  // Short trail back toward last tick's position, so fast shots read as motion.
  ctx.strokeStyle = shot.color;
  ctx.globalAlpha = 0.5;
  ctx.lineWidth = Math.max(1, radius * 1.2);
  ctx.beginPath();
  ctx.moveTo(prevScreen.x, prevScreen.y);
  ctx.lineTo(screenPos.x, screenPos.y);
  ctx.stroke();
  ctx.globalAlpha = 1;

  ctx.fillStyle = shot.color;
  ctx.beginPath();
  ctx.arc(screenPos.x, screenPos.y, radius, 0, Math.PI * 2);
  ctx.fill();
}

export function drawEffects(ctx: CanvasRenderingContext2D, viewport: Viewport, effects: EffectsState): void {
  for (const marker of effects.clickMarkers) {
    const t = marker.age / CLICK_MARKER_LIFETIME; // 0 -> 1
    const alpha = 1 - t;
    const screenPos = worldToScreen(viewport, marker.position);
    const radius = worldLengthToScreen(viewport, 18 + t * 10);

    ctx.strokeStyle = CLICK_MARKER_COLOR;
    ctx.globalAlpha = alpha;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(screenPos.x - radius, screenPos.y);
    ctx.lineTo(screenPos.x + radius, screenPos.y);
    ctx.moveTo(screenPos.x, screenPos.y - radius);
    ctx.lineTo(screenPos.x, screenPos.y + radius);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(screenPos.x, screenPos.y, radius, 0, Math.PI * 2);
    ctx.stroke();
    ctx.globalAlpha = 1;
  }
}

/**
 * Debug view (toggled by the `` ` `` key): draws the exact shapes collision
 * checks use, rather than the stylized visuals above — most usefully, each
 * projectile's swept capsule (previous tick's position -> this tick's
 * position), which is what actually gets tested against the player each
 * step and is otherwise invisible.
 */
function drawDebugOverlay(ctx: CanvasRenderingContext2D, viewport: Viewport, state: RenderState): void {
  ctx.strokeStyle = DEBUG_COLOR;
  ctx.lineWidth = 2;
  ctx.setLineDash([4, 4]);

  const playerScreen = worldToScreen(viewport, state.player.position);
  const playerRadius = worldLengthToScreen(viewport, PLAYER_RADIUS);
  ctx.beginPath();
  ctx.arc(playerScreen.x, playerScreen.y, playerRadius, 0, Math.PI * 2);
  ctx.stroke();

  for (const shot of state.skillshots) {
    const a = worldToScreen(viewport, shot.previousPosition);
    const b = worldToScreen(viewport, shot.position);
    const r = worldLengthToScreen(viewport, shot.width / 2);
    ctx.beginPath();
    ctx.moveTo(a.x, a.y);
    ctx.lineTo(b.x, b.y);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(a.x, a.y, r, 0, Math.PI * 2);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(b.x, b.y, r, 0, Math.PI * 2);
    ctx.stroke();
  }

  ctx.setLineDash([]);
}

export function render(
  ctx: CanvasRenderingContext2D,
  viewport: Viewport,
  state: RenderState
): void {
  clearCanvas(ctx, viewport.screenWidth, viewport.screenHeight);
  drawArena(ctx, viewport);
  drawEffects(ctx, viewport, state.effects);
  for (const bot of state.bots) {
    drawBot(ctx, viewport, bot);
  }
  for (const shot of state.skillshots) {
    drawSkillshot(ctx, viewport, shot);
  }
  drawPlayer(ctx, viewport, state.player);
  if (state.debug) {
    drawDebugOverlay(ctx, viewport, state);
  }
}
