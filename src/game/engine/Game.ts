import { Rng, TILE, clamp, dist2, hashString } from '../core/math';
import type {
  GameMapDef,
  GameMode,
  GamePhase,
  OnHitEffect,
  RunResult,
  RunSnapshot,
  ThreatId,
  TowerId,
  Vec2,
  WavePlan,
} from '../core/types';
import { TARGETING_MODES } from '../core/types';
import { THREATS } from '../data/threats';
import { TOWERS, resolveTower, sellValue } from '../data/towers';
import { bountyScale, buildWave, healthScale, speedScale, waveBounty } from '../data/waves';
import { Board, lanePointAt } from './board';
import {
  allocId,
  resetIds,
  type Effect,
  type Projectile,
  type Threat,
  type Tower,
} from './entities';

/** The simulation advances in fixed 1/60s steps. Nothing else may change state. */
export const FIXED_DT = 1 / 60;

/** Seconds of build time between waves. */
export const BUILD_TIME = 20;
const FIRST_BUILD_TIME = 30;

export const SNAPSHOT_VERSION = 1;

export type GameEvent =
  | { type: 'wave-start'; wave: number; isBoss: boolean }
  | { type: 'wave-clear'; wave: number; bounty: number }
  | { type: 'kill'; threat: ThreatId; x: number; y: number; bounty: number }
  | { type: 'leak'; threat: ThreatId; damage: number }
  | { type: 'build'; tower: TowerId }
  | { type: 'upgrade'; tower: TowerId; tier: number }
  | { type: 'sell'; tower: TowerId; refund: number }
  | { type: 'fire'; tower: TowerId }
  | { type: 'victory' }
  | { type: 'defeat' }
  | { type: 'denied'; reason: string };

export interface GameOptions {
  map: GameMapDef;
  mode: GameMode;
  seed?: number;
  /** Towers the account has unlocked; anything else is refused at build time. */
  unlocked?: TowerId[];
  onEvent?: (event: GameEvent) => void;
}

export interface BuildResult {
  ok: boolean;
  reason?: string;
}

const scratch: Vec2 = { x: 0, y: 0 };

export class Game {
  readonly board: Board;
  readonly map: GameMapDef;
  readonly mode: GameMode;
  readonly seed: number;

  phase: GamePhase = 'building';
  wave = 0;
  credits: number;
  integrity: number;
  maxIntegrity: number;
  score = 0;
  xpEarned = 0;
  elapsed = 0;
  livesLost = 0;
  threatsKilled = 0;

  threats: Threat[] = [];
  towers: Tower[] = [];
  projectiles: Projectile[] = [];
  effects: Effect[] = [];

  /** Countdown to the next wave while in the building phase. */
  buildTimer = FIRST_BUILD_TIME;
  plan: WavePlan;
  /** Seconds since the current wave began spawning. */
  private waveClock = 0;
  /** Flattened, time-sorted spawn schedule for the active wave. */
  private schedule: Array<{ at: number; threat: ThreatId; lane: number }> = [];
  private scheduleIndex = 0;

  private unlocked: Set<TowerId>;
  private onEvent?: (event: GameEvent) => void;
  private rng: Rng;
  /** Tower occupancy by tile index, so placement checks are O(1). */
  private occupancy: Map<number, Tower> = new Map();
  /** Id indexes, so per-tick lookups never degrade into linear scans. */
  private threatById: Map<number, Threat> = new Map();
  private towerById: Map<number, Tower> = new Map();
  /** Threats created by splits, flushed at the end of the tick that made them. */
  private pendingSpawns: Array<{
    type: ThreatId;
    lane: number;
    progress: number;
    tunneled: boolean;
  }> = [];

  constructor(opts: GameOptions) {
    this.map = opts.map;
    this.mode = opts.mode;
    this.seed = opts.seed ?? hashString(`${opts.map.id}:${opts.mode}`);
    this.board = new Board(opts.map);
    this.credits = opts.map.startCredits;
    this.integrity = opts.map.startIntegrity;
    this.maxIntegrity = opts.map.startIntegrity;
    this.unlocked = new Set(opts.unlocked ?? ['firewall', 'antivirus']);
    this.onEvent = opts.onEvent;
    this.rng = new Rng(this.seed);

    resetIds();
    this.wave = 1;
    this.plan = buildWave(this.map, 1, this.mode);
  }

  private emit(event: GameEvent): void {
    this.onEvent?.(event);
  }

  /* ------------------------------------------------------------ player input */

  canBuild(col: number, row: number, type: TowerId): BuildResult {
    if (!this.unlocked.has(type)) return { ok: false, reason: 'Not yet unlocked' };
    if (!this.board.isBuildable(col, row)) return { ok: false, reason: 'Cannot build there' };
    if (this.occupancy.has(this.tileKey(col, row))) return { ok: false, reason: 'Tile occupied' };
    if (this.credits < TOWERS[type].tiers[0].cost) return { ok: false, reason: 'Not enough credits' };
    return { ok: true };
  }

  build(col: number, row: number, type: TowerId): BuildResult {
    const check = this.canBuild(col, row, type);
    if (!check.ok) {
      this.emit({ type: 'denied', reason: check.reason! });
      return check;
    }

    const def = TOWERS[type];
    const stats = resolveTower(type, 0);
    const tower: Tower = {
      id: allocId(),
      type,
      def,
      tier: 0,
      col,
      row,
      x: col * TILE + TILE / 2,
      y: row * TILE + TILE / 2,
      cooldown: 0,
      targeting: def.targeting,
      angle: 0,
      stats,
      auraDamage: 0,
      auraFireRate: 0,
      auraDetect: false,
      rampTarget: 0,
      rampStacks: 0,
      kills: 0,
      damageDealt: 0,
      flash: 0,
    };

    this.credits -= def.tiers[0].cost;
    this.towers.push(tower);
    this.occupancy.set(this.tileKey(col, row), tower);
    this.recomputeAuras();
    this.emit({ type: 'build', tower: type });
    return { ok: true };
  }

  upgradeCost(tower: Tower): number | null {
    const next = tower.tier + 1;
    if (next >= tower.def.tiers.length) return null;
    return tower.def.tiers[next].cost;
  }

  upgrade(towerId: number): BuildResult {
    const tower = this.towerById.get(towerId);
    if (!tower) return { ok: false, reason: 'No such tower' };

    const cost = this.upgradeCost(tower);
    if (cost === null) {
      this.emit({ type: 'denied', reason: 'Already at max tier' });
      return { ok: false, reason: 'Already at max tier' };
    }
    if (this.credits < cost) {
      this.emit({ type: 'denied', reason: 'Not enough credits' });
      return { ok: false, reason: 'Not enough credits' };
    }

    this.credits -= cost;
    tower.tier += 1;
    tower.stats = resolveTower(tower.type, tower.tier);
    tower.rampStacks = 0;
    this.recomputeAuras();
    this.emit({ type: 'upgrade', tower: tower.type, tier: tower.tier });
    return { ok: true };
  }

  sell(towerId: number): BuildResult {
    const index = this.towers.findIndex((t) => t.id === towerId);
    if (index === -1) return { ok: false, reason: 'No such tower' };

    const tower = this.towers[index];
    const refund = sellValue(tower.type, tower.tier);
    this.credits += refund;
    this.towers.splice(index, 1);
    this.occupancy.delete(this.tileKey(tower.col, tower.row));
    this.recomputeAuras();
    this.emit({ type: 'sell', tower: tower.type, refund });
    return { ok: true };
  }

  cycleTargeting(towerId: number): void {
    const tower = this.towerById.get(towerId);
    if (!tower) return;
    const i = TARGETING_MODES.indexOf(tower.targeting);
    tower.targeting = TARGETING_MODES[(i + 1) % TARGETING_MODES.length];
  }

  towerAt(col: number, row: number): Tower | undefined {
    return this.occupancy.get(this.tileKey(col, row));
  }

  /** Stats a freshly built tower of this type would have, for the build ghost. */
  previewStats(type: TowerId) {
    return resolveTower(type, 0);
  }

  /** Skips the remaining build time and pays a bonus scaled to the time saved. */
  callWaveEarly(): void {
    if (this.phase !== 'building') return;
    const bonus = Math.round(this.buildTimer * 6);
    this.credits += bonus;
    this.score += bonus;
    this.buildTimer = 0;
    this.startWave();
  }

  private tileKey(col: number, row: number): number {
    return row * this.board.cols + col;
  }

  /* ------------------------------------------------------------------ auras */

  /**
   * SOC uplinks buff their neighbours. Recomputed only when the board changes,
   * never per frame: with a handful of towers this is far cheaper than having
   * every tower search for supporters on every shot.
   */
  private recomputeAuras(): void {
    this.towerById.clear();
    for (const tower of this.towers) this.towerById.set(tower.id, tower);

    for (const tower of this.towers) {
      tower.auraDamage = 0;
      tower.auraFireRate = 0;
      tower.auraDetect = false;
    }

    for (const source of this.towers) {
      const p = source.stats.params;
      if (p.auraDamage === 0 && p.auraFireRate === 0 && !p.detectStealth) continue;
      if (source.def.attack !== 'aura') continue;

      const rangeSq = source.stats.range * source.stats.range;
      for (const target of this.towers) {
        if (target === source) continue;
        if (dist2(source.x, source.y, target.x, target.y) > rangeSq) continue;
        target.auraDamage += p.auraDamage;
        target.auraFireRate += p.auraFireRate;
        if (p.detectStealth) target.auraDetect = true;
      }
    }
  }

  /* ------------------------------------------------------------ wave director */

  private startWave(): void {
    this.plan = buildWave(this.map, this.wave, this.mode);
    this.schedule = [];

    for (const group of this.plan.groups) {
      for (let i = 0; i < group.count; i++) {
        this.schedule.push({
          at: group.delay + i * group.interval,
          threat: group.threat,
          lane: group.lane % this.board.lanes.length,
        });
      }
    }
    this.schedule.sort((a, b) => a.at - b.at);

    this.scheduleIndex = 0;
    this.waveClock = 0;
    this.phase = 'spawning';
    this.emit({ type: 'wave-start', wave: this.wave, isBoss: this.plan.isBoss });
  }

  private completeWave(): void {
    const bounty = waveBounty(this.wave);
    this.credits += bounty;
    this.score += bounty;
    this.emit({ type: 'wave-clear', wave: this.wave, bounty });

    if (this.mode === 'campaign' && this.wave >= this.map.waveCount) {
      this.phase = 'victory';
      this.emit({ type: 'victory' });
      return;
    }

    this.wave += 1;
    this.plan = buildWave(this.map, this.wave, this.mode);
    this.buildTimer = BUILD_TIME;
    this.phase = 'building';
  }

  /* -------------------------------------------------------------- simulation */

  /**
   * Advances the world by exactly one fixed step. This is the only method that
   * mutates simulation state, and it is called from exactly one place.
   */
  tick(): void {
    if (this.phase === 'victory' || this.phase === 'defeat') return;

    const dt = FIXED_DT;
    this.elapsed += dt;

    this.updateWaveDirector(dt);
    this.reindexThreats();
    this.updateDetection();
    this.updateThreats(dt);
    this.updateTowers(dt);
    this.updateProjectiles(dt);
    this.updateEffects(dt);
    this.compact();

    // `tick` returns early when already finished, so reaching here means the run
    // is still live and this is the transition into defeat.
    if (this.integrity <= 0) {
      this.integrity = 0;
      this.phase = 'defeat';
      this.emit({ type: 'defeat' });
    }
  }

  private reindexThreats(): void {
    this.threatById.clear();
    for (const threat of this.threats) this.threatById.set(threat.id, threat);
  }

  private updateWaveDirector(dt: number): void {
    switch (this.phase) {
      case 'building': {
        this.buildTimer -= dt;
        if (this.buildTimer <= 0) {
          this.buildTimer = 0;
          this.startWave();
        }
        break;
      }
      case 'spawning': {
        this.waveClock += dt;
        while (
          this.scheduleIndex < this.schedule.length &&
          this.schedule[this.scheduleIndex].at <= this.waveClock
        ) {
          const entry = this.schedule[this.scheduleIndex++];
          this.spawnThreat(entry.threat, entry.lane);
        }
        if (this.scheduleIndex >= this.schedule.length) this.phase = 'clearing';
        break;
      }
      case 'clearing': {
        if (this.threats.length === 0) this.completeWave();
        break;
      }
      default:
        break;
    }
  }

  spawnThreat(type: ThreatId, lane: number, progress = 0): Threat {
    const def = THREATS[type];
    const mods = this.map.modifiers ?? {};

    // Endless keeps compounding past the campaign length so a maxed board still
    // eventually loses; campaign tops out at its authored wave count.
    const overtime =
      this.mode === 'endless' && this.wave > this.map.waveCount
        ? Math.pow(1.03, this.wave - this.map.waveCount)
        : 1;

    const hpScale = healthScale(this.wave) * (mods.healthScale ?? 1) * overtime;
    const shield = def.traits.shield ? Math.round(def.traits.shield * hpScale) : 0;

    const threat: Threat = {
      id: allocId(),
      def,
      type,
      progress,
      lane,
      tunneled: Boolean(def.traits.tunneled),
      x: 0,
      y: 0,
      prevX: 0,
      prevY: 0,
      hp: Math.round(def.health * hpScale),
      maxHp: Math.round(def.health * hpScale),
      armor: def.armor * (1 + (this.wave - 1) * 0.03),
      shield,
      maxShield: shield,
      shieldTimer: 0,
      speed: def.speed * speedScale(this.wave) * (mods.speedScale ?? 1),
      damage: def.damage,
      bounty: Math.round(def.bounty * bountyScale(this.wave) * (mods.economyScale ?? 1)),
      xp: def.xp,
      statuses: [],
      revealed: !def.traits.stealth,
      flash: 0,
      alive: true,
      lureX: 0,
      lureY: 0,
    };

    const lanes = threat.tunneled ? this.board.tunnelLanes : this.board.lanes;
    lanePointAt(lanes[lane], progress, scratch);
    threat.x = threat.prevX = scratch.x;
    threat.y = threat.prevY = scratch.y;

    this.threats.push(threat);
    return threat;
  }

  /**
   * Stealth threats are hidden by default and re-hide the moment no detector
   * covers them, so selling an IDS actually has consequences.
   */
  private updateDetection(): void {
    let anyStealth = false;
    for (const threat of this.threats) {
      if (threat.def.traits.stealth) {
        threat.revealed = false;
        anyStealth = true;
      }
    }
    if (!anyStealth) return;

    for (const tower of this.towers) {
      if (!tower.stats.params.detectStealth && !tower.auraDetect) continue;
      const rangeSq = tower.stats.range * tower.stats.range;
      for (const threat of this.threats) {
        if (!threat.def.traits.stealth || threat.revealed) continue;
        if (dist2(tower.x, tower.y, threat.x, threat.y) <= rangeSq) threat.revealed = true;
      }
    }
  }

  private updateThreats(dt: number): void {
    for (const threat of this.threats) {
      if (!threat.alive) continue;

      threat.prevX = threat.x;
      threat.prevY = threat.y;
      if (threat.flash > 0) threat.flash -= dt;

      this.tickStatuses(threat, dt);
      if (!threat.alive) continue;

      if (threat.def.traits.regen && threat.hp < threat.maxHp) {
        threat.hp = Math.min(
          threat.maxHp,
          threat.hp + threat.def.traits.regen * healthScale(this.wave) * dt,
        );
      }

      if (threat.maxShield > 0 && threat.shield < threat.maxShield) {
        threat.shieldTimer -= dt;
        if (threat.shieldTimer <= 0) {
          threat.shield = Math.min(threat.maxShield, threat.shield + threat.maxShield * 0.35 * dt);
        }
      }

      if (threat.def.traits.drain) {
        this.credits = Math.max(0, this.credits - threat.def.traits.drain * dt);
      }

      let speedMul = 1;
      const slow = this.strongest(threat, 'slow');
      if (slow > 0 && !threat.def.traits.slowImmune) speedMul *= 1 - slow;
      if (threat.statuses.some((s) => s.type === 'stun')) speedMul = 0;
      if (threat.def.traits.enrage && threat.hp / threat.maxHp < 0.3) {
        speedMul *= threat.def.traits.enrage;
      }

      threat.progress += threat.speed * TILE * speedMul * dt;

      const lanes = threat.tunneled ? this.board.tunnelLanes : this.board.lanes;
      const lane = lanes[threat.lane];
      if (threat.progress >= lane.length) {
        this.leak(threat);
        continue;
      }

      lanePointAt(lane, threat.progress, scratch);
      threat.x = scratch.x;
      threat.y = scratch.y;
    }
  }

  private tickStatuses(threat: Threat, dt: number): void {
    for (let i = threat.statuses.length - 1; i >= 0; i--) {
      const status = threat.statuses[i];
      status.remaining -= dt;

      if (status.type === 'burn' && threat.alive) {
        const source = this.towerById.get(status.sourceId);
        this.applyDamage(threat, status.potency * dt, source, true);
      }

      if (status.remaining <= 0) threat.statuses.splice(i, 1);
    }
  }

  private strongest(threat: Threat, kind: 'slow' | 'flag' | 'stun'): number {
    let best = -1;
    for (const s of threat.statuses) {
      if (s.type === kind && s.potency > best) best = s.potency;
    }
    return best;
  }

  private applyStatus(threat: Threat, effect: OnHitEffect, sourceId: number): void {
    if (effect.chance !== undefined && !this.rng.chance(effect.chance)) return;
    if (effect.type === 'slow' && threat.def.traits.slowImmune) return;

    // Statuses of the same kind never stack; the strongest wins and refreshes.
    const existing = threat.statuses.find((s) => s.type === effect.type);
    if (existing) {
      if (effect.potency >= existing.potency) {
        existing.potency = effect.potency;
        existing.sourceId = sourceId;
      }
      existing.remaining = Math.max(existing.remaining, effect.duration);
      return;
    }

    threat.statuses.push({
      type: effect.type,
      potency: effect.potency,
      remaining: effect.duration,
      sourceId,
    });
  }

  /**
   * The single point at which any threat loses health. Every weapon, splash,
   * chain and damage-over-time tick funnels through here, so a hit can never be
   * counted twice.
   */
  private applyDamage(threat: Threat, raw: number, tower: Tower | undefined, ignoreArmor = false): void {
    if (!threat.alive || raw <= 0) return;

    let damage = raw;

    const flag = this.strongest(threat, 'flag');
    if (flag > 0) damage *= 1 + flag;

    if (!ignoreArmor) {
      // Armour subtracts flat damage but can never fully negate a hit, so rapid
      // low-damage towers become inefficient against heavies without becoming
      // literally useless. At a 15% floor an 8-damage firewall did 1.2 to a
      // zero-day, which made the wave-10 boss an unpassable wall for any cheap
      // build rather than a reason to diversify. 25% keeps the incentive to
      // bring heavy hitters without deleting the contribution of the rest.
      damage = Math.max(damage * 0.25, damage - threat.armor);
    }
    if (threat.def.traits.hardened) damage *= 0.8;

    if (threat.shield > 0) {
      const absorbed = Math.min(threat.shield, damage);
      threat.shield -= absorbed;
      damage -= absorbed;
      threat.shieldTimer = threat.def.traits.shieldDelay ?? 4;
    }

    if (damage <= 0) return;

    threat.hp -= damage;
    threat.flash = 0.08;
    if (tower) tower.damageDealt += damage;

    if (threat.hp <= 0) this.killThreat(threat, tower);
  }

  private killThreat(threat: Threat, tower: Tower | undefined): void {
    if (!threat.alive) return;
    threat.alive = false;
    threat.hp = 0;

    // Honeypots turn nearby kills into extra budget; the best one in range wins
    // rather than every honeypot stacking.
    let bonus = 0;
    for (const t of this.towers) {
      const b = t.stats.params.bountyBonus;
      if (b <= 0) continue;
      const r = t.stats.params.lureRadius || t.stats.range;
      if (dist2(t.x, t.y, threat.x, threat.y) <= r * r) bonus = Math.max(bonus, b);
    }

    const payout = threat.bounty + bonus;
    this.credits += payout;
    this.score += payout;
    this.xpEarned += threat.xp;
    this.threatsKilled += 1;
    if (tower) tower.kills += 1;

    // Children are queued rather than spawned inline: `this.threats` is being
    // iterated by the caller, and appending mid-iteration would step them on the
    // same tick they were created.
    const split = threat.def.traits.splitInto;
    if (split) {
      for (let i = 0; i < split.count; i++) {
        this.pendingSpawns.push({
          type: split.id,
          lane: threat.lane,
          progress: Math.max(0, threat.progress - i * 6),
          tunneled: threat.tunneled,
        });
      }
    }

    this.addEffect('blast', threat.x, threat.y, {
      radius: threat.def.size * 1.8,
      color: tower?.def.color ?? '#f87171',
      life: 0.35,
    });
    this.emit({ type: 'kill', threat: threat.type, x: threat.x, y: threat.y, bounty: payout });
  }

  private leak(threat: Threat): void {
    threat.alive = false;
    const damage = Math.max(1, Math.round(threat.damage));
    this.integrity -= damage;
    this.livesLost += 1;

    this.addEffect('leak', this.board.core.x, this.board.core.y, {
      radius: 60,
      color: '#ef4444',
      life: 0.5,
    });
    this.emit({ type: 'leak', threat: threat.type, damage });
  }

  /* ----------------------------------------------------------------- towers */

  private updateTowers(dt: number): void {
    for (const tower of this.towers) {
      if (tower.flash > 0) tower.flash -= dt;
      if (tower.def.attack === 'aura') continue;

      tower.cooldown -= dt;
      if (tower.cooldown > 0) continue;

      const rate = tower.stats.fireRate * (1 + tower.auraFireRate);
      if (rate <= 0) continue;

      if (tower.def.attack === 'field' || tower.def.attack === 'lure') {
        if (this.pulse(tower)) tower.cooldown = 1 / rate;
        continue;
      }

      const target = this.findTarget(tower);
      if (!target) {
        tower.rampStacks = 0;
        continue;
      }

      tower.angle = Math.atan2(target.y - tower.y, target.x - tower.x);
      tower.flash = 0.06;
      tower.cooldown = 1 / rate;
      this.fire(tower, target);
      this.emit({ type: 'fire', tower: tower.type });
    }
  }

  private canTarget(tower: Tower, threat: Threat): boolean {
    if (!threat.alive) return false;
    if (threat.def.traits.stealth && !threat.revealed) return false;
    if (threat.tunneled && !tower.stats.params.hitsTunneled) return false;
    return true;
  }

  private findTarget(tower: Tower): Threat | undefined {
    const rangeSq = tower.stats.range * tower.stats.range;
    let best: Threat | undefined;
    let bestKey = 0;

    for (const threat of this.threats) {
      if (!this.canTarget(tower, threat)) continue;
      const d2 = dist2(tower.x, tower.y, threat.x, threat.y);
      if (d2 > rangeSq) continue;

      let key: number;
      switch (tower.targeting) {
        case 'first':
          key = threat.progress;
          break;
        case 'last':
          key = -threat.progress;
          break;
        case 'strongest':
          key = threat.hp + threat.shield;
          break;
        case 'weakest':
          key = -(threat.hp + threat.shield);
          break;
        case 'closest':
        default:
          key = -d2;
          break;
      }

      if (!best || key > bestKey) {
        best = threat;
        bestKey = key;
      }
    }
    return best;
  }

  private effectiveDamage(tower: Tower): number {
    let damage = tower.stats.damage * (1 + tower.auraDamage);
    if (tower.stats.params.rampPerHit > 0) {
      damage *= 1 + Math.min(tower.stats.params.rampMax, tower.rampStacks * tower.stats.params.rampPerHit);
    }
    return damage;
  }

  private fire(tower: Tower, target: Threat): void {
    const params = tower.stats.params;
    const damage = this.effectiveDamage(tower);

    switch (tower.def.attack) {
      case 'beam': {
        // Hitscan. Ramp resets whenever the tower switches targets, so parking
        // a Sentinel on a boss is meaningfully better than letting it retarget.
        if (tower.rampTarget === target.id) {
          tower.rampStacks += 1;
        } else {
          tower.rampTarget = target.id;
          tower.rampStacks = 0;
        }
        this.applyDamage(target, damage, tower);
        this.applyEffects(tower, target);
        this.addEffect('beam', tower.x, tower.y, {
          x2: target.x,
          y2: target.y,
          color: tower.def.color,
          life: 0.12,
        });
        break;
      }

      case 'chain': {
        let current = target;
        let currentDamage = damage;
        const struck = new Set<number>([current.id]);
        let from = { x: tower.x, y: tower.y };

        this.applyDamage(current, currentDamage, tower);
        this.applyEffects(tower, current);
        this.addEffect('chain', from.x, from.y, {
          x2: current.x,
          y2: current.y,
          color: tower.def.color,
          life: 0.18,
        });

        for (let jump = 0; jump < params.chainJumps; jump++) {
          const next = this.nearestUnstruck(current, struck, params.chainRange, tower);
          if (!next) break;
          currentDamage *= params.chainFalloff;
          from = { x: current.x, y: current.y };
          this.applyDamage(next, currentDamage, tower);
          this.applyEffects(tower, next);
          this.addEffect('chain', from.x, from.y, {
            x2: next.x,
            y2: next.y,
            color: tower.def.color,
            life: 0.18,
          });
          struck.add(next.id);
          current = next;
        }
        break;
      }

      case 'splash':
      case 'projectile':
      default: {
        this.projectiles.push({
          id: allocId(),
          x: tower.x,
          y: tower.y,
          prevX: tower.x,
          prevY: tower.y,
          speed: 430,
          targetId: target.id,
          damage,
          sourceTower: tower.id,
          color: tower.def.color,
          kind: params.splashRadius > 0 ? 'orb' : 'bolt',
          onHit: tower.stats.onHit,
          splashRadius: params.splashRadius,
          splashFalloff: params.splashFalloff,
          pierce: params.pierce,
          hit: new Set(),
          alive: true,
          ttl: 3,
        });
        break;
      }
    }
  }

  /** Encryption fields and honeypots hit everything in range at once. */
  private pulse(tower: Tower): boolean {
    const rangeSq = tower.stats.range * tower.stats.range;
    const damage = this.effectiveDamage(tower);
    let hitAnything = false;

    for (const threat of this.threats) {
      if (!this.canTarget(tower, threat)) continue;
      if (dist2(tower.x, tower.y, threat.x, threat.y) > rangeSq) continue;
      hitAnything = true;
      this.applyDamage(threat, damage, tower);
      this.applyEffects(tower, threat);

      if (tower.def.attack === 'lure') {
        // The tarpit is modelled as a strong, short slow rather than by moving
        // threats off their lane, which would desync progress-based targeting.
        this.applyStatus(
          threat,
          { type: 'slow', potency: tower.stats.params.lurePull, duration: 0.8 },
          tower.id,
        );
        threat.lureX = tower.x;
        threat.lureY = tower.y;
      }
    }

    if (hitAnything) {
      tower.flash = 0.08;
      this.addEffect('ring', tower.x, tower.y, {
        radius: tower.stats.range,
        color: tower.def.color,
        life: 0.35,
      });
    }
    return hitAnything;
  }

  private applyEffects(tower: Tower, threat: Threat): void {
    for (const effect of tower.stats.onHit) {
      this.applyStatus(threat, effect, tower.id);
    }
  }

  private nearestUnstruck(
    from: Threat,
    struck: Set<number>,
    range: number,
    tower: Tower,
  ): Threat | undefined {
    const rangeSq = range * range;
    let best: Threat | undefined;
    let bestD = Infinity;
    for (const threat of this.threats) {
      if (struck.has(threat.id) || !this.canTarget(tower, threat)) continue;
      const d = dist2(from.x, from.y, threat.x, threat.y);
      if (d <= rangeSq && d < bestD) {
        best = threat;
        bestD = d;
      }
    }
    return best;
  }

  /* ------------------------------------------------------------- projectiles */

  private updateProjectiles(dt: number): void {
    for (const p of this.projectiles) {
      if (!p.alive) continue;

      p.prevX = p.x;
      p.prevY = p.y;
      p.ttl -= dt;
      if (p.ttl <= 0) {
        p.alive = false;
        continue;
      }

      const target = this.threatById.get(p.targetId);
      if (!target || !target.alive) {
        // The target died mid-flight. Splash shots still detonate where they
        // were headed; direct shots simply fizzle.
        if (p.splashRadius > 0) this.detonate(p, p.x, p.y);
        p.alive = false;
        continue;
      }

      const dx = target.x - p.x;
      const dy = target.y - p.y;
      const distance = Math.hypot(dx, dy);
      const step = p.speed * dt;

      if (distance <= step + target.def.size * 0.5) {
        p.x = target.x;
        p.y = target.y;
        this.impact(p, target);
      } else {
        p.x += (dx / distance) * step;
        p.y += (dy / distance) * step;
      }
    }
  }

  private impact(p: Projectile, target: Threat): void {
    const tower = this.towerById.get(p.sourceTower);

    if (p.splashRadius > 0) {
      this.detonate(p, target.x, target.y);
      p.alive = false;
      return;
    }

    this.applyDamage(target, p.damage, tower);
    for (const effect of p.onHit) this.applyStatus(target, effect, p.sourceTower);
    p.hit.add(target.id);

    if (p.pierce > 0 && tower) {
      p.pierce -= 1;
      const next = this.nearestUnstruck(target, p.hit, 130, tower);
      if (next) {
        p.targetId = next.id;
        return;
      }
    }
    p.alive = false;
  }

  private detonate(p: Projectile, x: number, y: number): void {
    const tower = this.towerById.get(p.sourceTower);
    const radiusSq = p.splashRadius * p.splashRadius;

    for (const threat of this.threats) {
      if (!threat.alive) continue;
      if (tower && !this.canTarget(tower, threat)) continue;
      const d2 = dist2(x, y, threat.x, threat.y);
      if (d2 > radiusSq) continue;

      // Full damage at the centre, tapering to `splashFalloff` at the edge.
      const t = Math.sqrt(d2) / p.splashRadius;
      const falloff = 1 - (1 - p.splashFalloff) * t;
      this.applyDamage(threat, p.damage * falloff, tower);
      for (const effect of p.onHit) this.applyStatus(threat, effect, p.sourceTower);
    }

    this.addEffect('blast', x, y, { radius: p.splashRadius, color: p.color, life: 0.3 });
  }

  /* ----------------------------------------------------------------- effects */

  private addEffect(
    kind: Effect['kind'],
    x: number,
    y: number,
    opts: { x2?: number; y2?: number; radius?: number; color?: string; life?: number; text?: string },
  ): void {
    // Cosmetic only, so it is safe to drop these under load rather than let the
    // effect list grow without bound during a boss wave.
    if (this.effects.length > 240) return;
    this.effects.push({
      kind,
      x,
      y,
      x2: opts.x2 ?? x,
      y2: opts.y2 ?? y,
      radius: opts.radius ?? 20,
      color: opts.color ?? '#ffffff',
      text: opts.text ?? '',
      age: 0,
      life: opts.life ?? 0.3,
    });
  }

  private updateEffects(dt: number): void {
    for (const e of this.effects) e.age += dt;
  }

  private compact(): void {
    if (this.threats.some((t) => !t.alive)) this.threats = this.threats.filter((t) => t.alive);

    if (this.pendingSpawns.length > 0) {
      for (const spawn of this.pendingSpawns) {
        const child = this.spawnThreat(spawn.type, spawn.lane, spawn.progress);
        child.tunneled = spawn.tunneled;
      }
      this.pendingSpawns.length = 0;
    }

    if (this.projectiles.some((p) => !p.alive)) {
      this.projectiles = this.projectiles.filter((p) => p.alive);
    }
    if (this.effects.some((e) => e.age >= e.life)) {
      this.effects = this.effects.filter((e) => e.age < e.life);
    }
  }

  /* -------------------------------------------------------- save / load / end */

  snapshot(): RunSnapshot {
    return {
      version: SNAPSHOT_VERSION,
      mapId: this.map.id,
      mode: this.mode,
      seed: this.seed,
      wave: this.wave,
      integrity: this.integrity,
      credits: Math.round(this.credits),
      score: Math.round(this.score),
      elapsed: this.elapsed,
      livesLost: this.livesLost,
      threatsKilled: this.threatsKilled,
      towers: this.towers.map((t) => ({
        type: t.type,
        col: t.col,
        row: t.row,
        tier: t.tier,
        targeting: t.targeting,
        kills: t.kills,
        damageDealt: Math.round(t.damageDealt),
      })),
    };
  }

  /**
   * Rebuilds a run from a snapshot. Always lands in the building phase with a
   * fresh timer: resuming mid-wave would require serialising every threat, and
   * dropping the player back into a build phase is the friendlier contract.
   */
  restore(snapshot: RunSnapshot): void {
    this.wave = snapshot.wave;
    this.integrity = snapshot.integrity;
    this.credits = snapshot.credits;
    this.score = snapshot.score;
    this.elapsed = snapshot.elapsed;
    this.livesLost = snapshot.livesLost;
    this.threatsKilled = snapshot.threatsKilled;

    this.threats = [];
    this.projectiles = [];
    this.effects = [];
    this.towers = [];
    this.occupancy.clear();

    for (const saved of snapshot.towers) {
      const def = TOWERS[saved.type];
      if (!def) continue;
      const tower: Tower = {
        id: allocId(),
        type: saved.type,
        def,
        tier: clamp(saved.tier, 0, def.tiers.length - 1),
        col: saved.col,
        row: saved.row,
        x: saved.col * TILE + TILE / 2,
        y: saved.row * TILE + TILE / 2,
        cooldown: 0,
        targeting: saved.targeting,
        angle: 0,
        stats: resolveTower(saved.type, saved.tier),
        auraDamage: 0,
        auraFireRate: 0,
        auraDetect: false,
        rampTarget: 0,
        rampStacks: 0,
        kills: saved.kills,
        damageDealt: saved.damageDealt,
        flash: 0,
      };
      this.towers.push(tower);
      this.occupancy.set(this.tileKey(saved.col, saved.row), tower);
    }

    this.recomputeAuras();
    this.plan = buildWave(this.map, this.wave, this.mode);
    this.buildTimer = BUILD_TIME;
    this.phase = 'building';
  }

  result(): RunResult {
    const victory = this.phase === 'victory';
    const finalScore = Math.round(
      this.score + Math.max(0, this.integrity) * 25 + (victory ? 5000 : 0),
    );
    return {
      mapId: this.map.id,
      mode: this.mode,
      wave: this.wave,
      score: finalScore,
      elapsed: Math.round(this.elapsed),
      threatsKilled: this.threatsKilled,
      integrity: Math.max(0, Math.round(this.integrity)),
      victory,
      xpEarned: Math.round(this.xpEarned + (victory ? 500 : 0)),
    };
  }

  setUnlocked(towers: TowerId[]): void {
    this.unlocked = new Set(towers);
  }

  isUnlocked(type: TowerId): boolean {
    return this.unlocked.has(type);
  }
}
