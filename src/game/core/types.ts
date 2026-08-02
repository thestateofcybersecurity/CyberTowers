/**
 * Shared type vocabulary for the CyberTowers simulation.
 *
 * Everything in `src/game` is framework-agnostic: no React, no DOM globals
 * outside of the renderer and sprite baker. That keeps the simulation testable
 * and lets the same code drive a headless score validator on the server.
 */

export interface Vec2 {
  x: number;
  y: number;
}

export type TowerId =
  | 'firewall'
  | 'antivirus'
  | 'ids'
  | 'encryption'
  | 'honeypot'
  | 'soc'
  | 'sentinel'
  | 'edr';

export type ThreatId =
  | 'virus'
  | 'worm'
  | 'trojan'
  | 'phishing'
  | 'ransomware'
  | 'botnet'
  | 'bot'
  | 'rootkit'
  | 'cryptominer'
  | 'ddos'
  | 'tunnel'
  | 'apt'
  | 'logicbomb'
  | 'zeroday';

/** How a tower picks among the threats inside its range. */
export type TargetingMode = 'first' | 'last' | 'strongest' | 'weakest' | 'closest';

export const TARGETING_MODES: TargetingMode[] = [
  'first',
  'last',
  'strongest',
  'weakest',
  'closest',
];

export type StatusKind = 'slow' | 'burn' | 'flag' | 'stun';

/**
 * An effect a tower applies to whatever it hits. `potency` is interpreted per
 * kind: slow = fraction of speed removed (0..1), burn = damage per second,
 * flag = extra fraction of damage taken (0.25 => +25%), stun = unused.
 */
export interface OnHitEffect {
  type: StatusKind;
  potency: number;
  duration: number;
  /** 0..1, defaults to 1. */
  chance?: number;
}

/** An active status riding on a threat. */
export interface ActiveStatus {
  type: StatusKind;
  potency: number;
  remaining: number;
  /** Tower instance id that applied it, for kill attribution on DoT. */
  sourceId: number;
}

/**
 * Tunables shared by every attack behaviour. Each tower supplies the subset it
 * cares about; tiers can override individual fields as the tower is upgraded.
 */
export interface AttackParams {
  /** Radius in px for splash damage. */
  splashRadius: number;
  /** Fraction of damage retained at the outer edge of a splash. */
  splashFalloff: number;
  /** Number of additional targets a chain attack bounces to. */
  chainJumps: number;
  /** Fraction of damage retained per chain jump. */
  chainFalloff: number;
  /** Max distance a chain can jump. */
  chainRange: number;
  /** Extra threats a projectile passes through before expiring. */
  pierce: number;
  /** Damage bonus granted to towers inside a support aura (0.2 => +20%). */
  auraDamage: number;
  /** Fire-rate bonus granted to towers inside a support aura. */
  auraFireRate: number;
  /** Bonus damage accumulated per consecutive hit on the same target. */
  rampPerHit: number;
  /** Cap on accumulated ramp damage, as a fraction of base damage. */
  rampMax: number;
  /** Radius within which a lure pulls threats off their optimal line. */
  lureRadius: number;
  /** Strength of the lure's pull, 0..1. */
  lurePull: number;
  /** Reveals stealth threats inside range. */
  detectStealth: boolean;
  /** Can target threats with the `tunneled` trait. */
  hitsTunneled: boolean;
  /** Credits refunded to the player per kill (honeypot forensics). */
  bountyBonus: number;
}

export type AttackKind =
  | 'projectile'
  | 'splash'
  | 'chain'
  | 'beam'
  | 'field'
  | 'lure'
  | 'aura';

export interface TowerTier {
  /** Cost to build (tier 0) or to upgrade into this tier. */
  cost: number;
  damage: number;
  /** Range in pixels. */
  range: number;
  /** Shots per second. */
  fireRate: number;
  onHit?: OnHitEffect[];
  params?: Partial<AttackParams>;
  /** Short player-facing description of what this tier adds. */
  note: string;
}

export interface TowerDef {
  id: TowerId;
  name: string;
  /** One-word archetype shown on the build card. */
  role: string;
  /** Flavour text grounded in the real security control. */
  blurb: string;
  /** Account clearance level required to build it. */
  unlockLevel: number;
  attack: AttackKind;
  /** Accent colour for projectiles, range rings and UI chrome. */
  color: string;
  /** Exactly four entries: build tier plus three upgrades. */
  tiers: TowerTier[];
  params: Partial<AttackParams>;
  /** Default targeting mode for newly placed towers. */
  targeting: TargetingMode;
}

export interface ThreatTraits {
  /** Invisible, and untargetable, until revealed by a detector. */
  stealth?: boolean;
  /** Ignores the lane and flies straight to the core. */
  tunneled?: boolean;
  /** Health regenerated per second. */
  regen?: number;
  /** Spawns smaller threats when destroyed. */
  splitInto?: { id: ThreatId; count: number };
  /** Immune to slow effects. */
  slowImmune?: boolean;
  /** Credits drained from the player per second while alive. */
  drain?: number;
  /** Absorbs damage before health; recharges after `shieldDelay` seconds idle. */
  shield?: number;
  shieldDelay?: number;
  /** Multiplier applied to speed once below 30% health. */
  enrage?: number;
  /** Counts as a boss for wave pacing and UI. */
  boss?: boolean;
  /** Reduces incoming damage by a flat amount per hit, after armor. */
  hardened?: boolean;
}

export interface ThreatDef {
  id: ThreatId;
  name: string;
  /** Real-world description, surfaced in the codex and wave preview. */
  blurb: string;
  health: number;
  /** Tiles per second. */
  speed: number;
  /** Flat damage reduction per hit. */
  armor: number;
  /** Core integrity lost if it reaches the core. */
  damage: number;
  /** Credits awarded on kill. */
  bounty: number;
  /** Account XP awarded on kill. */
  xp: number;
  /** Draw radius in px. */
  size: number;
  /** Earliest wave this threat can appear in. Bosses use `Infinity`. */
  minWave: number;
  /** Relative likelihood of being chosen once eligible. */
  weight: number;
  traits: ThreatTraits;
}

export interface MapModifiers {
  /** Multiplies all threat health on this map. */
  healthScale?: number;
  /** Multiplies all threat speed on this map. */
  speedScale?: number;
  /** Multiplies credits earned. */
  economyScale?: number;
}

export interface GameMapDef {
  id: string;
  name: string;
  /** Mission briefing shown on the map select card. */
  brief: string;
  /** 1 (training) through 5 (nightmare). */
  difficulty: number;
  /** Map id that must be cleared first, or null for the opening mission. */
  unlockAfter: string | null;
  cols: number;
  rows: number;
  /** One or more lanes, each a list of tile coordinates. */
  lanes: Vec2[][];
  /** Tiles that cannot be built on and are drawn as terrain. */
  blocked: Vec2[];
  startCredits: number;
  startIntegrity: number;
  /** Number of waves in the campaign run for this map. */
  waveCount: number;
  threatPool: ThreatId[];
  modifiers?: MapModifiers;
}

export interface SpawnGroup {
  threat: ThreatId;
  count: number;
  /** Seconds between individual spawns in this group. */
  interval: number;
  /** Seconds after wave start before the first spawn. */
  delay: number;
  lane: number;
  /** Per-wave stat multiplier applied on top of the base definition. */
  scale: number;
}

export interface WavePlan {
  index: number;
  groups: SpawnGroup[];
  /** Credits awarded for clearing the wave. */
  bounty: number;
  isBoss: boolean;
}

export type GamePhase =
  | 'loading'
  | 'building'
  | 'spawning'
  | 'clearing'
  | 'victory'
  | 'defeat';

export type GameMode = 'campaign' | 'endless';

/** Serialisable snapshot used for cloud saves and score submission. */
export interface RunSnapshot {
  version: number;
  mapId: string;
  mode: GameMode;
  seed: number;
  wave: number;
  integrity: number;
  credits: number;
  score: number;
  elapsed: number;
  livesLost: number;
  threatsKilled: number;
  towers: Array<{
    type: TowerId;
    col: number;
    row: number;
    tier: number;
    targeting: TargetingMode;
    kills: number;
    damageDealt: number;
  }>;
}

export interface RunResult {
  mapId: string;
  /** Set when the run was an operation rather than the plain campaign. */
  operationId?: string;
  mode: GameMode;
  wave: number;
  score: number;
  elapsed: number;
  threatsKilled: number;
  integrity: number;
  victory: boolean;
  xpEarned: number;
}
