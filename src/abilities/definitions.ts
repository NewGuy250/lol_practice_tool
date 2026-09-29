/**
 * Data-driven ability table. Every ability is a plain object; the engine
 * only knows about `archetype`s. Tune numbers here only — nothing else
 * should hardcode ability values.
 *
 * Names, colors and flavor are original (no Riot champion/ability names,
 * icons, or art).
 */

interface BaseAbilityDef {
  id: string;
  name: string;
  /** Seconds of visible telegraph before the ability actually fires/lands. */
  windup: number;
  /** Seconds before the bot can cast this ability again after firing. */
  cooldown: number;
  color: string;
}

export interface LinearAbilityDef extends BaseAbilityDef {
  archetype: 'linear' | 'linearSlow';
  /** Projectile travel speed, units/sec. */
  speed: number;
  /** Max travel distance before the projectile expires. */
  range: number;
  /** Full width of the projectile; collision radius is width / 2. */
  width: number;
}

export interface CircleAbilityDef extends BaseAbilityDef {
  archetype: 'circle';
  /** Radius of the ground-targeted danger zone. */
  radius: number;
}

export interface BeamAbilityDef extends BaseAbilityDef {
  archetype: 'beam';
  /** Length of the instant-hit rectangle, starting at the caster. */
  length: number;
  /** Full width of the rectangle; collision half-width is width / 2. */
  width: number;
}

export interface ConeAbilityDef extends BaseAbilityDef {
  archetype: 'cone';
  /** Full angle of the sector, in radians (half on each side of the aim direction). */
  angle: number;
  /** Sector radius. */
  range: number;
}

// `ring` archetype is a stretch goal — see PLAN.md.
export type AbilityDef = LinearAbilityDef | CircleAbilityDef | BeamAbilityDef | ConeAbilityDef;

export const PIERCING_BOLT: LinearAbilityDef = {
  id: 'piercing-bolt',
  name: 'Piercing Bolt',
  archetype: 'linear',
  speed: 2000,
  range: 1150,
  width: 120,
  windup: 0.25,
  cooldown: 1.8,
  color: '#ff5b5b',
};

export const BINDING_ROOT: LinearAbilityDef = {
  id: 'binding-root',
  name: 'Binding Root',
  archetype: 'linearSlow',
  speed: 1200,
  range: 1300,
  width: 140,
  windup: 0.25,
  cooldown: 2.5,
  color: '#c97bff',
};

export const VOID_ERUPTION: CircleAbilityDef = {
  id: 'void-eruption',
  name: 'Void Eruption',
  archetype: 'circle',
  radius: 200,
  windup: 0.8,
  cooldown: 3.0,
  color: '#ff8a3d',
};

export const ARCING_LANCE: BeamAbilityDef = {
  id: 'arcing-lance',
  name: 'Arcing Lance',
  archetype: 'beam',
  length: 1400,
  width: 140,
  windup: 0.6,
  cooldown: 4.0,
  color: '#3ddbff',
};

export const SWEEPING_BLADE: ConeAbilityDef = {
  id: 'sweeping-blade',
  name: 'Sweeping Blade',
  archetype: 'cone',
  angle: (50 * Math.PI) / 180,
  range: 700,
  windup: 0.4,
  cooldown: 2.0,
  color: '#ffe23d',
};

export const ABILITIES: Record<string, AbilityDef> = {
  [PIERCING_BOLT.id]: PIERCING_BOLT,
  [BINDING_ROOT.id]: BINDING_ROOT,
  [VOID_ERUPTION.id]: VOID_ERUPTION,
  [ARCING_LANCE.id]: ARCING_LANCE,
  [SWEEPING_BLADE.id]: SWEEPING_BLADE,
};
