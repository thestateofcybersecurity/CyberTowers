import { Rng, hashString } from '../core/math';
import type { GameMapDef, GameMode, SpawnGroup, ThreatId, WavePlan } from '../core/types';
import { BOSS_THREAT, THREATS } from './threats';

/**
 * Difficulty curve. Health compounds so late waves genuinely threaten a maxed
 * board, while speed and bounty grow far more gently: runaway speed makes a map
 * unplayable rather than hard, and runaway bounty removes every build decision.
 */
export function healthScale(wave: number): number {
  return Math.pow(1.058, wave - 1);
}

export function speedScale(wave: number): number {
  return Math.min(1.5, 1 + (wave - 1) * 0.004);
}

/**
 * Bounty compounds too, just more slowly than health. This is the single most
 * important relationship in the whole balance: if income grows linearly while
 * threat health grows exponentially, the player falls behind at an accelerating
 * rate and no amount of skill closes the gap. Compounding both keeps a good
 * board viable deep into a run, and the gap between the two rates is what makes
 * endless eventually end.
 */
export function bountyScale(wave: number): number {
  return Math.pow(1.042, wave - 1);
}

/**
 * Fraction of a threat's budget value actually paid out as credits.
 *
 * This is the one lever that separates difficulty from income. A wave's budget
 * is spent as `count = share / bounty`, so income is `count * bounty`, which is
 * the budget itself: making threats cheaper just spawns more of them and pays
 * exactly the same. Without a payout rate, "more enemies per wave" and "fewer
 * credits per wave" are contradictory requests.
 *
 * With it, `waveBudget` sets how much is coming and this sets how well it pays.
 */
export const KILL_PAYOUT_RATE = 0.7;

/** Credits a single kill is worth at a given wave. */
export function killReward(baseBounty: number, wave: number, economyScale = 1): number {
  return Math.max(1, Math.round(baseBounty * KILL_PAYOUT_RATE * bountyScale(wave) * economyScale));
}

/** Rough "threat points" a wave is allowed to spend. */
function waveBudget(wave: number): number {
  return 17 * Math.pow(wave, 1.16) + 15 * wave;
}

export function isBossWave(wave: number): boolean {
  return wave > 0 && wave % 10 === 0;
}

/**
 * Base credits for clearing a wave, before the clear-rate multiplier the game
 * applies. Deliberately smaller than it was: kills should be the main income,
 * with this as a top-up, not a guaranteed salary that pays out whether or not
 * the player is actually holding the line.
 */
export function waveBounty(wave: number): number {
  return Math.round(50 + wave * 12 + (isBossWave(wave) ? 150 : 0));
}

function eligibleThreats(map: GameMapDef, wave: number): ThreatId[] {
  return map.threatPool.filter((id) => {
    const def = THREATS[id];
    return def && wave >= def.minWave && !def.traits.boss;
  });
}

/**
 * Weighted pick that drifts toward heavier threats as the run progresses, so
 * wave 30 is not still 60% viruses just because viruses have the largest base
 * weight.
 */
function pickThreat(rng: Rng, pool: ThreatId[], wave: number): ThreatId {
  const weights = pool.map((id) => {
    const def = THREATS[id];
    const maturity = Math.max(0, wave - def.minWave);
    // Older unlocks decay slowly; recent unlocks get a temporary boost.
    const recency = 1 + Math.max(0, 6 - maturity) * 0.25;
    return def.weight * recency;
  });

  const total = weights.reduce((a, b) => a + b, 0);
  let roll = rng.next() * total;
  for (let i = 0; i < pool.length; i++) {
    roll -= weights[i];
    if (roll <= 0) return pool[i];
  }
  return pool[pool.length - 1];
}

/** Swarm threats spawn in tight bursts; heavy threats trickle in. */
function spawnInterval(id: ThreatId, wave: number): number {
  const def = THREATS[id];
  const base = def.bounty <= 4 ? 0.18 : def.bounty <= 10 ? 0.5 : def.bounty <= 25 ? 0.85 : 1.3;
  return Math.max(0.12, base - wave * 0.006);
}

/**
 * Builds the plan for a single wave. Deterministic in `(mapId, mode, wave)`, so
 * every player sees the same campaign and the server can rebuild any wave to
 * check a submitted score against it.
 */
export function buildWave(map: GameMapDef, wave: number, mode: GameMode): WavePlan {
  const rng = new Rng(hashString(`${map.id}:${mode}:${wave}`));
  const laneCount = map.lanes.length;
  const boss = isBossWave(wave);
  const groups: SpawnGroup[] = [];

  if (boss) {
    // The boss enters alone on the first lane, then escorts arrive late enough
    // that the player has to choose between focusing it or clearing the chaff.
    groups.push({
      threat: BOSS_THREAT,
      count: 1 + Math.floor((wave - 10) / 30),
      interval: 4,
      delay: 2,
      lane: rng.int(0, laneCount - 1),
      scale: 1,
    });
  }

  const pool = eligibleThreats(map, wave);
  if (pool.length === 0) {
    // Wave 1 on a pool with nothing unlocked yet: fall back to the basics.
    pool.push('virus');
  }

  const budget = waveBudget(wave) * (boss ? 0.45 : 1);
  const groupCount = Math.min(5, 1 + Math.floor(wave / 4));
  let remaining = budget;

  for (let g = 0; g < groupCount; g++) {
    // Spread the budget unevenly so waves have a shape rather than a flat mass.
    const share = g === groupCount - 1 ? remaining : remaining * rng.range(0.3, 0.55);
    remaining -= share;

    const threat = pickThreat(rng, pool, wave);
    const def = THREATS[threat];
    const count = Math.max(1, Math.min(60, Math.round(share / Math.max(2, def.bounty))));

    groups.push({
      threat,
      count,
      interval: spawnInterval(threat, wave),
      delay: (boss ? 6 : 0) + g * rng.range(1.6, 4.2),
      lane: rng.int(0, laneCount - 1),
      scale: 1,
    });

    if (remaining <= 0) break;
  }

  return { index: wave, groups, bounty: waveBounty(wave), isBoss: boss };
}

/** Total threats in a wave, for the "incoming" preview panel. */
export function waveSummary(plan: WavePlan): Array<{ threat: ThreatId; count: number }> {
  const tally = new Map<ThreatId, number>();
  for (const g of plan.groups) {
    tally.set(g.threat, (tally.get(g.threat) ?? 0) + g.count);
  }
  return [...tally.entries()]
    .map(([threat, count]) => ({ threat, count }))
    .sort((a, b) => b.count - a.count);
}
