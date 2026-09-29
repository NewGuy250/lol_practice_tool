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

// `circle` / `beam` / `cone` / `ring` archetypes are added in Phase 3.
export type AbilityDef = LinearAbilityDef;

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

export const ABILITIES: Record<string, AbilityDef> = {
  [PIERCING_BOLT.id]: PIERCING_BOLT,
};
