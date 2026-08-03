import { z } from 'zod';
import type { GameMode } from '@/game/core/types';
import { getMap } from '@/game/data/maps';
import { getOperation } from '@/game/data/operations';
import { THREATS } from '@/game/data/threats';
import { TOWER_ORDER } from '@/game/data/towers';
import {
  buildWave,
  killReward,
  waveBounty,
  MAX_INTRUSION_UNITS,
  MAX_INTRUSION_WAVES,
} from '@/game/data/waves';

/**
 * Server-side plausibility checks for submitted runs.
 *
 * This is a browser game: the client owns the simulation, so a determined
 * player can always lie. What we can do cheaply is replay the *wave generator*
 * (which is deterministic in map/mode/wave) and reject anything outside the
 * bounds the real game could have produced. That stops casual tampering and
 * keeps a single edited number out of the leaderboard, without pretending to be
 * anti-cheat it cannot be.
 */

export const runResultSchema = z.object({
  mapId: z.string().min(1).max(64),
  // Older clients predate the attacker seat and only ever sent defender runs.
  role: z.enum(['defender', 'attacker']).default('defender'),
  operationId: z.string().min(1).max(64).optional(),
  mode: z.enum(['campaign', 'endless']),
  wave: z.number().int().min(1).max(2000),
  score: z.number().int().min(0).max(50_000_000),
  elapsed: z.number().int().min(0).max(60 * 60 * 24),
  threatsKilled: z.number().int().min(0).max(2_000_000),
  integrity: z.number().int().min(0).max(1000),
  victory: z.boolean(),
  xpEarned: z.number().int().min(0).max(2_000_000),
  towersUsed: z.array(z.enum(TOWER_ORDER as [string, ...string[]])).max(16),
});

export type RunSubmission = z.infer<typeof runResultSchema>;

export const profilePatchSchema = z.object({
  handle: z
    .string()
    .trim()
    .min(2)
    .max(24)
    .regex(/^[A-Za-z0-9_. -]+$/, 'Letters, numbers, spaces, dot, dash and underscore only'),
});

const towerSnapshotSchema = z.object({
  type: z.enum(TOWER_ORDER as [string, ...string[]]),
  col: z.number().int().min(0).max(200),
  row: z.number().int().min(0).max(200),
  tier: z.number().int().min(0).max(3),
  targeting: z.enum(['first', 'last', 'strongest', 'weakest', 'closest']),
  kills: z.number().int().min(0),
  damageDealt: z.number().min(0),
});

export const snapshotSchema = z.object({
  version: z.number().int(),
  mapId: z.string().min(1).max(64),
  mode: z.enum(['campaign', 'endless']),
  seed: z.number(),
  wave: z.number().int().min(1).max(2000),
  integrity: z.number().min(0),
  credits: z.number().min(0),
  score: z.number().min(0),
  elapsed: z.number().min(0),
  livesLost: z.number().int().min(0),
  threatsKilled: z.number().int().min(0),
  towers: z.array(towerSnapshotSchema).max(400),
});

export interface RunBounds {
  maxScore: number;
  maxKills: number;
  minElapsed: number;
}

/**
 * Rebuilds every wave up to `wave` and totals what the game could have paid
 * out, with generous headroom for honeypot bonuses and early-call rewards.
 */
export function runBounds(mapId: string, mode: GameMode, wave: number, integrity: number): RunBounds {
  const map = getMap(mapId);
  if (!map) return { maxScore: 0, maxKills: 0, minElapsed: 0 };

  const economy = map.modifiers?.economyScale ?? 1;
  let credits = 0;
  let kills = 0;
  let spawnSeconds = 0;

  for (let w = 1; w <= wave; w++) {
    const plan = buildWave(map, w, mode);
    credits += waveBounty(w);
    // Sending every wave early, at the capped bonus.
    credits += 60;

    let waveSpan = 0;
    for (const group of plan.groups) {
      const def = THREATS[group.threat];
      if (!def) continue;

      // A botnet node that dies also pays out its four children.
      const splitCount = def.traits.splitInto ? def.traits.splitInto.count : 0;
      const splitDef = def.traits.splitInto ? THREATS[def.traits.splitInto.id] : null;

      kills += group.count * (1 + splitCount);
      credits += group.count * killReward(def.bounty, w, economy);
      if (splitDef) credits += group.count * splitCount * killReward(splitDef.bounty, w, economy);
      // Best-case honeypot forensics bonus on every kill.
      credits += group.count * (1 + splitCount) * 9;

      waveSpan = Math.max(waveSpan, group.delay + Math.max(0, group.count - 1) * group.interval);
    }
    spawnSeconds += waveSpan;
  }

  return {
    // Double the theoretical payout as slack, then add the end-of-run bonuses.
    maxScore: Math.ceil(credits * 2 + integrity * 25 + 5000 + 1000),
    maxKills: Math.ceil(kills * 1.5 + 50),
    // Waves cannot spawn faster than their own schedule; 0.5 covers rounding
    // and the fact that the final wave need not fully drain.
    minElapsed: Math.floor(spawnSeconds * 0.5),
  };
}

/**
 * The attacker earns in a different currency and must be bounded on its own
 * terms. Intel is paid per wave as a flat stipend plus thirty times the core
 * damage done so far, so the ceiling is set by how deep the target is rather
 * than by anything on the defender's economy.
 *
 * Bounding an intrusion against the defending map's kill payouts, which is what
 * this used to do, rejected any run that breached more than about a quarter of
 * the core: the better the intrusion, the more certainly it was thrown away.
 */
export function intrusionBounds(mapId: string, wave: number): RunBounds {
  const map = getMap(mapId);
  if (!map) return { maxScore: 0, maxKills: 0, minElapsed: 0 };

  // The attacker faces a hardened core: see the attacker branch of the Game
  // constructor, which quadruples it.
  const coreDepth = map.startIntegrity * 4;

  // Per wave: stipend (60 + 14w) plus 30 per point of cumulative damage. Taking
  // cumulative damage at its maximum for every wave is unreachable in practice
  // (a fully breached core ends the run) but it is a true ceiling.
  let stipends = 0;
  for (let w = 1; w <= wave; w++) stipends += 60 + w * 14;
  const damagePayout = 30 * coreDepth * wave;

  // Overkill on the final blow is counted in full, so leave room for it.
  const maxScore = Math.ceil((stipends + damagePayout) * 1.25 + 4000 + 6000);

  // "Kills" from the attacker's seat are its own units lost. A wave is capped
  // at MAX_INTRUSION_UNITS, and a botnet node that dies leaves children behind.
  const maxKills = Math.ceil(MAX_INTRUSION_UNITS * 5 * wave + 50);

  // Waves are composed and launched by the player, so there is no spawn
  // schedule to floor the clock against. The score ceiling is the real check.
  return { maxScore, maxKills, minElapsed: 0 };
}

export interface ValidationOutcome {
  ok: boolean;
  reason?: string;
  bounds: RunBounds;
}

export function validateRun(run: RunSubmission): ValidationOutcome {
  const map = getMap(run.mapId);
  if (!map) return { ok: false, reason: 'Unknown map', bounds: { maxScore: 0, maxKills: 0, minElapsed: 0 } };

  if (run.role === 'attacker') {
    if (run.wave > MAX_INTRUSION_WAVES) {
      return {
        ok: false,
        reason: 'Wave exceeds intrusion length',
        bounds: intrusionBounds(run.mapId, MAX_INTRUSION_WAVES),
      };
    }

    const bounds = intrusionBounds(run.mapId, run.wave);
    if (run.score > bounds.maxScore) {
      return { ok: false, reason: 'Score above achievable maximum', bounds };
    }
    if (run.threatsKilled > bounds.maxKills) {
      return { ok: false, reason: 'Losses above achievable maximum', bounds };
    }
    // An intrusion wins the moment the core falls, which can happen on any
    // wave. There is no "final wave" to reach.
    return { ok: true, bounds };
  }

  const operation = run.operationId ? getOperation(run.operationId) : undefined;
  const finalWave = operation?.waveCount ?? map.waveCount;

  if (run.mode === 'campaign' && run.wave > finalWave) {
    return {
      ok: false,
      reason: 'Wave exceeds campaign length',
      bounds: runBounds(run.mapId, run.mode, finalWave, run.integrity),
    };
  }

  const bounds = runBounds(run.mapId, run.mode, run.wave, run.integrity);

  if (run.score > bounds.maxScore) return { ok: false, reason: 'Score above achievable maximum', bounds };
  if (run.threatsKilled > bounds.maxKills) return { ok: false, reason: 'Kill count above achievable maximum', bounds };
  if (run.elapsed < bounds.minElapsed) return { ok: false, reason: 'Run duration too short for wave reached', bounds };
  if (run.victory && run.mode === 'campaign' && run.wave < finalWave) {
    return { ok: false, reason: 'Victory claimed before final wave', bounds };
  }

  return { ok: true, bounds };
}

/**
 * Naive in-memory rate limiter. Per serverless instance, so it is a speed bump
 * rather than a guarantee; the plausibility bounds above are the real defence.
 */
const submissions = new Map<string, number[]>();

export function rateLimit(key: string, max: number, windowMs: number): boolean {
  const now = Date.now();
  const hits = (submissions.get(key) ?? []).filter((t) => now - t < windowMs);
  if (hits.length >= max) {
    submissions.set(key, hits);
    return false;
  }
  hits.push(now);
  submissions.set(key, hits);
  return true;
}
