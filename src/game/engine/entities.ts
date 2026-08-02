import type {
  ActiveStatus,
  AttackParams,
  OnHitEffect,
  TargetingMode,
  ThreatDef,
  ThreatId,
  TowerDef,
  TowerId,
} from '../core/types';

/**
 * Entities are plain mutable records rather than classes with behaviour. All
 * the rules live in the systems that operate on them, so there is exactly one
 * place where damage is applied, one place where movement happens, and no way
 * for two code paths to update the same entity in the same tick.
 */

export interface Threat {
  id: number;
  def: ThreatDef;
  type: ThreatId;

  /** Distance travelled along its lane, in pixels. */
  progress: number;
  lane: number;
  tunneled: boolean;

  x: number;
  y: number;
  /** Position at the end of the previous tick, for render interpolation. */
  prevX: number;
  prevY: number;

  hp: number;
  maxHp: number;
  /** Flat damage reduction per hit, scaled up with the wave number. */
  armor: number;
  shield: number;
  maxShield: number;
  shieldTimer: number;

  /** Tiles per second before status effects. */
  speed: number;
  damage: number;
  bounty: number;
  xp: number;

  statuses: ActiveStatus[];
  /** Bitmask over TOWER_ORDER of the control types that have damaged it. */
  layers: number;
  revealed: boolean;
  /** Seconds of white-flash remaining after taking a hit. */
  flash: number;
  alive: boolean;
  /** Set when a threat is being pulled by a honeypot, for the render offset. */
  lureX: number;
  lureY: number;
}

export interface ResolvedStats {
  damage: number;
  range: number;
  fireRate: number;
  params: AttackParams;
  onHit: OnHitEffect[];
}

export interface Tower {
  id: number;
  type: TowerId;
  def: TowerDef;
  tier: number;

  col: number;
  row: number;
  x: number;
  y: number;

  /** Seconds until this tower may fire again. */
  cooldown: number;
  targeting: TargetingMode;
  /** Radians; purely cosmetic, drives the barrel indicator. */
  angle: number;

  stats: ResolvedStats;

  /** Aura contributions from nearby SOC uplinks, recomputed on board changes. */
  auraDamage: number;
  auraFireRate: number;
  auraDetect: boolean;

  /** AI Sentinel ramp state. */
  rampTarget: number;
  rampStacks: number;

  kills: number;
  damageDealt: number;
  /** Seconds of muzzle-flash remaining. */
  flash: number;
}

export type ProjectileKind = 'bolt' | 'orb' | 'pulse';

export interface Projectile {
  id: number;
  x: number;
  y: number;
  prevX: number;
  prevY: number;
  /** Pixels per second. */
  speed: number;
  targetId: number;
  damage: number;
  sourceTower: number;
  color: string;
  kind: ProjectileKind;
  onHit: OnHitEffect[];
  splashRadius: number;
  splashFalloff: number;
  /** Remaining extra threats this shot may pass through. */
  pierce: number;
  hit: Set<number>;
  alive: boolean;
  /** Seconds before the projectile gives up and despawns. */
  ttl: number;
}

export type EffectKind =
  | 'blast'
  | 'beam'
  | 'chain'
  | 'ring'
  | 'text'
  | 'leak';

export interface Effect {
  kind: EffectKind;
  x: number;
  y: number;
  x2: number;
  y2: number;
  radius: number;
  color: string;
  text: string;
  age: number;
  life: number;
}

let nextId = 1;

export function allocId(): number {
  return nextId++;
}

/** Resets the id counter so a fresh run starts from a clean numbering. */
export function resetIds(): void {
  nextId = 1;
}
