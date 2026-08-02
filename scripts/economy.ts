/**
 * Income against difficulty: when does the board saturate?
 *
 *   npm run economy [mapId] [mode]
 *
 * A tower defence stops being a game the moment the player can afford
 * everything they want. After that there are no decisions left, only waiting.
 * The balance harness could not see this: it spends every credit it has, so a
 * runaway surplus looks identical to a tight economy.
 *
 * This models the other side. For each wave it computes what a player actually
 * earns and compares it against what a full board costs, and reports:
 *
 *   saturation wave   the wave where cumulative income covers a full board
 *   surplus           credits left over at the end, which is dead money
 *   HP vs DPS         whether threats are outgrowing what the board can field
 *
 * Saturation well before the final wave means the back half of the campaign is
 * decision-free, which is precisely what playtesting reported.
 */

import { getMap, MAPS } from '../src/game/data/maps';
import { THREATS } from '../src/game/data/threats';
import { TOWERS, TOWER_ORDER, investedCredits, resolveTower } from '../src/game/data/towers';

import { buildWave, healthScale, killReward, waveBounty } from '../src/game/data/waves';
import type { GameMapDef, GameMode } from '../src/game/core/types';

/** Credits a competent player collects from one wave. */
function waveIncome(map: GameMapDef, wave: number, mode: GameMode): number {
  const plan = buildWave(map, wave, mode);
  const economy = map.modifiers?.economyScale ?? 1;
  let kills = 0;

  for (const group of plan.groups) {
    const def = THREATS[group.threat];
    if (!def) continue;
    kills += group.count * killReward(def.bounty, wave, economy);

    // Splitters pay out twice: the parent and everything it scatters.
    const split = def.traits.splitInto;
    if (split) {
      const child = THREATS[split.id];
      kills += group.count * split.count * killReward(child.bounty, wave, economy);
    }
  }

  // Clearing cleanly, plus sending every wave early for the full bonus.
  return kills + waveBounty(wave) + 60;
}

/** Effective health a wave fields, boss and splits included. */
function waveHealth(map: GameMapDef, wave: number, mode: GameMode): number {
  const plan = buildWave(map, wave, mode);
  const scale = healthScale(wave) * (map.modifiers?.healthScale ?? 1);
  let hp = 0;

  for (const group of plan.groups) {
    const def = THREATS[group.threat];
    if (!def) continue;
    let each = (def.health + (def.traits.shield ?? 0)) * scale;
    const split = def.traits.splitInto;
    if (split) each += THREATS[split.id].health * scale * split.count;
    hp += each * group.count;
  }
  return hp;
}


/**
 * Credits-to-damage conversion rate a competent player achieves, averaged over
 * the damage-dealing types at max tier and discounted for coverage: a tower
 * only fires while something is inside its radius, and shots overkill.
 */
function dpsPerCredit(): number {
  const rates = TOWER_ORDER.map((id) => {
    const s = resolveTower(id, TOWERS[id].tiers.length - 1);
    const cost = investedCredits(id, TOWERS[id].tiers.length - 1);
    return (s.damage * s.fireRate) / cost;
  }).filter((r) => r > 0);
  const mean = rates.reduce((a, b) => a + b, 0) / rates.length;
  return mean * 0.45;
}


/**
 * Seconds a wave realistically has to be killed in: its spawn window plus one
 * traversal. Anything still alive after that is a leak.
 */
const WAVE_SECONDS = 45;

/**
 * The ratio that decides whether a tower defence stays a game.
 *
 * `affordable / required` is how much more damage the player can buy than the
 * wave demands. Above about 2 there is nothing to think about; below 1 the wave
 * cannot be stopped at any placement. A healthy campaign starts generous, so
 * early mistakes are survivable, and closes toward the low end.
 *
 * Measuring "percent of a fixed full board" instead was the mistake that made a
 * 35-wave map look broken purely for being long.
 */
function pressureRatio(map: GameMapDef, wave: number, mode: GameMode, cumulative: number): number {
  const required = waveHealth(map, wave, mode) / WAVE_SECONDS;
  const affordable = cumulative * dpsPerCredit();
  return affordable / required;
}

let unhealthy = 0;

function report(map: GameMapDef, mode: GameMode): void {
  const waves = mode === 'campaign' ? map.waveCount : Math.max(map.waveCount, 40);
  let cumulative = map.startCredits;

  console.log(`\n\x1b[1m${map.name} · ${mode}\x1b[0m`);
  console.log('  wave   income   cumulative   waveHP   affordable/required');

  const ratios: number[] = [];
  for (let w = 1; w <= waves; w++) {
    cumulative += waveIncome(map, w, mode);
    const ratio = pressureRatio(map, w, mode, cumulative);
    ratios.push(ratio);

    if (w <= 5 || w % 5 === 0 || w === waves) {
      const flag = ratio > 2.5 ? '\x1b[31mtoo easy\x1b[0m' : ratio < 1 ? '\x1b[31munwinnable\x1b[0m' : '\x1b[32mok\x1b[0m';
      console.log(
        `  ${String(w).padStart(4)}  ${String(Math.round(waveIncome(map, w, mode))).padStart(6)}  ` +
          `${String(Math.round(cumulative)).padStart(10)}  ${String(Math.round(waveHealth(map, w, mode))).padStart(7)}  ` +
          `${ratio.toFixed(2).padStart(6)}  ${flag}`,
      );
    }
  }

  const late = ratios.slice(Math.floor(ratios.length * 0.7));
  const lateAvg = late.reduce((a, b) => a + b, 0) / late.length;
  console.log('');
  if (lateAvg > 2.5) {
    unhealthy += 1;
    console.log(`  \x1b[31mLate game trivial\x1b[0m — final third averages ${lateAvg.toFixed(2)}x more damage than needed.`);
  } else if (lateAvg < 1) {
    unhealthy += 1;
    console.log(`  \x1b[31mLate game unwinnable\x1b[0m — final third averages ${lateAvg.toFixed(2)}x.`);
  } else {
    console.log(`  \x1b[32mHealthy\x1b[0m — final third averages ${lateAvg.toFixed(2)}x what the wave demands.`);
  }
}

/**
 * Per-map economy multiplier that lands a campaign at `target` of a full board.
 *
 * Hand-tuning this oscillated between "saturates at wave 18" and "everything
 * dies at wave 7", so solve it instead. The global payout rate sets the shape;
 * this sets the per-map level, which is what `economyScale` exists for.
 */
function solveEconomyScale(map: GameMapDef, target: number): number {
  let lo = 0.2;
  let hi = 3;

  for (let i = 0; i < 40; i++) {
    const mid = (lo + hi) / 2;
    const probe: GameMapDef = {
      ...map,
      modifiers: { ...(map.modifiers ?? {}), economyScale: mid },
    };
    let total = probe.startCredits;
    const ratios: number[] = [];
    for (let w = 1; w <= probe.waveCount; w++) {
      total += waveIncome(probe, w, 'campaign');
      ratios.push(pressureRatio(probe, w, 'campaign', total));
    }
    const late = ratios.slice(Math.floor(ratios.length * 0.7));
    const lateAvg = late.reduce((a, b) => a + b, 0) / late.length;
    if (lateAvg > target) hi = mid;
    else lo = mid;
  }
  return Math.round(((lo + hi) / 2) * 100) / 100;
}

if (process.argv.includes('--solve')) {
  const target = 1.6;
  console.log(
    `\n\x1b[1mEconomy scale so the final third averages ${target}x the damage a wave demands\x1b[0m\n`,
  );
  for (const map of MAPS) {
    const current = map.modifiers?.economyScale ?? 1;
    const solved = solveEconomyScale(map, target);
    const move = solved > current ? 'richer' : solved < current ? 'poorer' : 'unchanged';
    console.log(
      `  ${map.name.padEnd(18)} ${String(map.waveCount).padStart(2)} waves   ` +
        `now ${current.toFixed(2)}  ->  \x1b[36m${solved.toFixed(2)}\x1b[0m  (${move})`,
    );
  }
  console.log('');
  process.exit(0);
}

const mapArg = process.argv[2];
const mode = (process.argv[3] as GameMode) ?? 'campaign';

if (mapArg) {
  const map = getMap(mapArg);
  if (!map) {
    console.error(`Unknown map: ${mapArg}`);
    process.exit(1);
  }
  report(map, mode);
} else {
  for (const map of MAPS) report(map, 'campaign');
}
console.log('');

// Playtesting found a campaign that had nothing left to decide for its back
// half, and no automated check would have caught it. This one would.
if (unhealthy > 0) {
  console.error(`\x1b[31m${unhealthy} campaign(s) outside the healthy band.\x1b[0m\n`);
  process.exit(1);
}
