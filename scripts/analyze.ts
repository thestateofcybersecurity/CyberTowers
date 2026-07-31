/**
 * Balance analysis: is the optimal build a corner solution?
 *
 *   npm run analyze
 *
 * A tower defence board is a budget allocation problem. If total damage is a
 * linear function of how credits are split between tower types, the optimum is
 * always a corner — put everything into whichever type has the best damage per
 * credit. Mixed builds only win when the payoff is concave (each additional
 * copy is worth less) or complementary (types multiply each other).
 *
 * This prints the three numbers that decide which regime the game is in:
 *
 *   dmg/cr      damage per second per credit, ignoring everything else
 *   reach/cr    dps x range / cost, the real currency of a tower defence,
 *               because a threat only takes damage while it is inside a radius
 *               and time-in-range is proportional to range
 *   armour cliff how much of that survives against a heavily armoured target
 *
 * A type that leads on all three at once is a dominant strategy and the game
 * has no build decisions in it.
 */

import { TOWERS, TOWER_ORDER, investedCredits, resolveTower } from '../src/game/data/towers';
import type { TowerId } from '../src/game/core/types';

/** Damage actually landed per hit against a given armour value. */
function afterArmour(damage: number, armour: number, floor = 0.25): number {
  return Math.max(damage * floor, damage - armour);
}

interface Row {
  id: TowerId;
  tier: number;
  cost: number;
  dps: number;
  range: number;
  dpsPerCredit: number;
  reachPerCredit: number;
  vsArmour9: number;
  multiTarget: number;
  soloPerCredit: number;
}

/** Expected targets hit per shot, so splash and chain are not undercounted. */
function multiTargetFactor(id: TowerId, tier: number): number {
  const { params, def } = resolveTower(id, tier);
  switch (def.attack) {
    case 'splash': {
      // Threats are strung out along a lane, so a blast of radius r covers
      // roughly 2r of lane. At ~22px spacing that is how many it catches.
      const covered = (params.splashRadius * 2) / 22;
      return Math.max(1, Math.min(5, covered * (0.5 + params.splashFalloff / 2)));
    }
    case 'chain':
      return 1 + params.chainJumps * params.chainFalloff;
    case 'field':
    case 'lure':
      // Pulses hit everything in the circle, not one target.
      return Math.max(1, Math.min(6, (params.lureRadius || 100) / 45));
    default:
      return 1 + params.pierce * 0.6;
  }
}

function analyse(): Row[] {
  const rows: Row[] = [];
  for (const id of TOWER_ORDER) {
    const def = TOWERS[id];
    for (let tier = 0; tier < def.tiers.length; tier++) {
      const stats = resolveTower(id, tier);
      const cost = investedCredits(id, tier);
      const multi = multiTargetFactor(id, tier);
      const dps = stats.damage * stats.fireRate * multi;
      const armoured = afterArmour(stats.damage, 9) * stats.fireRate * multi;

      rows.push({
        id,
        tier,
        cost,
        dps,
        range: stats.range,
        dpsPerCredit: dps / cost,
        reachPerCredit: (dps * stats.range) / cost,
        vsArmour9: armoured / cost,
        multiTarget: multi,
        // Against a single target the multi-target bonus does not exist. This
        // is the boss-wave number, and the reason single-target towers earn
        // their place despite looking poor on the headline figure.
        soloPerCredit:
          (stats.damage * stats.fireRate * (1 + stats.params.rampMax * 0.6)) / cost,
      });
    }
  }
  return rows;
}

function bar(value: number, max: number, width = 14): string {
  const n = Math.max(0, Math.round((value / max) * width));
  return '█'.repeat(n) + '·'.repeat(width - n);
}

const rows = analyse();

console.log('\n\x1b[1mPer-tower efficiency (support towers deal no damage by design)\x1b[0m\n');
const maxReach = Math.max(...rows.map((r) => r.reachPerCredit));

console.log(
  '  tower        tier  cost   dps   range  targets  dmg/cr   solo/cr   vs armour9',
);
for (const id of TOWER_ORDER) {
  for (const r of rows.filter((x) => x.id === id)) {
    console.log(
      `  ${id.padEnd(11)} MK${r.tier + 1}  ${String(r.cost).padStart(5)}  ` +
        `${r.dps.toFixed(0).padStart(4)}  ${String(Math.round(r.range)).padStart(5)}  ` +
        `${r.multiTarget.toFixed(1).padStart(6)}  ${r.dpsPerCredit.toFixed(3).padStart(6)}  ` +
        `${r.soloPerCredit.toFixed(3).padStart(7)}  ${r.vsArmour9.toFixed(3).padStart(10)}`,
    );
  }
}

/* ------------------------------------------------------- dominance analysis */

console.log('\n\x1b[1mIs there a dominant strategy?\x1b[0m\n');
const maxTier = rows.filter((r) => r.tier === TOWERS[r.id].tiers.length - 1 && r.dps > 0);
const bestDpc = [...maxTier].sort((a, b) => b.dpsPerCredit - a.dpsPerCredit);
const bestReach = [...maxTier].sort((a, b) => b.reachPerCredit - a.reachPerCredit);
const bestArmour = [...maxTier].sort((a, b) => b.vsArmour9 - a.vsArmour9);
const bestSolo = [...maxTier].sort((a, b) => b.soloPerCredit - a.soloPerCredit);

console.log(`  best damage per credit : ${bestDpc[0].id}`);
console.log(`  best reach per credit  : ${bestReach[0].id}`);
console.log(`  best against armour    : ${bestArmour[0].id}`);
console.log(`  best on a single target: ${bestSolo[0].id}`);

// Leading the crowd-clear axes while being poor on a single target is healthy
// specialisation, not dominance. A type is only dominant if it also wins the
// case its rivals are supposed to own.
const dominant =
  bestDpc[0].id === bestReach[0].id &&
  bestReach[0].id === bestArmour[0].id &&
  bestArmour[0].id === bestSolo[0].id
    ? bestDpc[0].id
    : null;
console.log(
  dominant
    ? `\n  \x1b[31mDOMINANT: ${dominant} leads on every axis. Spamming it is optimal.\x1b[0m`
    : '\n  \x1b[32mNo single type leads on every axis — mixing has a reason to exist.\x1b[0m',
);

// A build with no answer to armour is the classic failure mode: cheap fast
// towers look wonderful on a spreadsheet and evaporate against heavies.
console.log('\n  armour cliff (share of damage per credit retained vs armour 9):');
for (const r of maxTier.sort((a, b) => b.vsArmour9 / b.dpsPerCredit - a.vsArmour9 / a.dpsPerCredit)) {
  const retained = r.vsArmour9 / r.dpsPerCredit;
  console.log(
    `    ${r.id.padEnd(11)} ${(retained * 100).toFixed(0).padStart(3)}%  ${bar(retained, 1)}`,
  );
}

/* ---------------------------------------------------------- concavity check */

console.log('\n\x1b[1mUpgrades vs more towers (is the payoff concave?)\x1b[0m\n');
console.log('  If upgrading beats building on damage per credit, concentrating wins.\n');
for (const id of TOWER_ORDER) {
  const tiers = rows.filter((r) => r.id === id);
  if (tiers[0].dps === 0) continue;
  const base = tiers[0];
  const top = tiers[tiers.length - 1];
  // Same credits, spent entirely on fresh MK1s instead of one maxed tower.
  const spam = (top.cost / base.cost) * base.dps;
  const ratio = top.dps / spam;
  const verdict = ratio > 1.15 ? 'concentrate' : ratio < 0.87 ? 'spread' : 'neutral';
  const colour = verdict === 'concentrate' ? '\x1b[31m' : verdict === 'spread' ? '\x1b[32m' : '';
  console.log(
    `  ${id.padEnd(11)} maxed=${top.dps.toFixed(0).padStart(4)} dps   ` +
      `${(top.cost / base.cost).toFixed(1)}x MK1=${spam.toFixed(0).padStart(4)} dps   ` +
      `${colour}${verdict}\x1b[0m (${ratio.toFixed(2)}x)`,
  );
}

/* -------------------------------------------------------- synergy magnitude */

console.log('\n\x1b[1mMultiplicative synergy available\x1b[0m\n');
const soc = resolveTower('soc', 3);
const ids = resolveTower('ids', 3);
const flag = ids.onHit.find((e) => e.type === 'flag');
const socMult = (1 + soc.params.auraDamage) * (1 + soc.params.auraFireRate);
const flagMult = 1 + (flag?.potency ?? 0);
console.log(`  SOC uplink MK4 : x${socMult.toFixed(2)} to every tower in range`);
console.log(`  IDS flag MK4   : x${flagMult.toFixed(2)} to all damage on flagged threats`);
console.log(`  stacked        : x${(socMult * flagMult).toFixed(2)}`);
console.log(
  '\n  These are the only terms that make a mixed board worth more than the sum\n' +
    '  of its parts. If they are small, the optimum stays at a corner.\n',
);
