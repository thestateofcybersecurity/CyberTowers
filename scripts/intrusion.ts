/**
 * Attacker-side balance: does any intrusion shape dominate?
 *
 *   npm run intrusion
 *
 * The defender harness took three attempts to stop measuring the wrong thing,
 * so this starts where that ended up. It plays real multi-type intrusions —
 * several threats in one wave, split across lanes — because alternating one
 * type per wave is not a mixed strategy and reports mixing as useless.
 *
 * Healthy: weak postures fall to more than one shape, strong postures hold most
 * of them, and no single shape beats everything.
 */

import { FIXED_DT, Game } from '../src/game/engine/Game';
import { POSTURES, getPosture } from '../src/game/engine/ai';
import { getMap } from '../src/game/data/maps';
import { OPERATIONS } from '../src/game/data/operations';
import type { ThreatId } from '../src/game/core/types';

const run = (g: Game, seconds: number) => {
  for (let i = 0; i < Math.round(seconds / FIXED_DT); i++) g.tick();
};

const SHAPES: Array<{ name: string; mix: ThreatId[] }> = [
  { name: 'swarm', mix: ['ddos', 'ddos', 'worm'] },
  { name: 'heavy', mix: ['ransomware', 'apt'] },
  { name: 'evasive', mix: ['rootkit', 'tunnel'] },
  { name: 'combined', mix: ['ransomware', 'rootkit', 'worm', 'tunnel'] },
];

function attempt(postureId: string, mix: ThreatId[], opId?: string): string {
  const operation = opId ? OPERATIONS.find((o) => o.id === opId) : undefined;
  const map = getMap(operation?.mapId ?? 'cloud-region')!;
  const game = new Game({
    map,
    mode: 'campaign',
    role: 'attacker',
    posture: getPosture(postureId),
    operation,
  });

  let wave = 0;
  while (game.phase === 'building' && wave < game.maxIntrusionWaves) {
    const share = game.intel / mix.length;
    const plan = mix.map((threat, i) => ({
      threat,
      count: Math.max(1, Math.floor(share / game.intrusionCost(threat))),
      lane: i % map.lanes.length,
    }));

    let units = plan.reduce((n, p) => n + p.count, 0);
    while (units > game.maxIntrusionUnits) {
      const biggest = plan.reduce((a, b) => (a.count >= b.count ? a : b));
      biggest.count -= 1;
      units -= 1;
    }

    if (!game.launchAttack(plan.filter((p) => p.count > 0)).ok) break;
    for (let i = 0; i < 150 && (game.phase === 'spawning' || game.phase === 'clearing'); i++) {
      run(game, 1);
    }
    wave++;
  }

  return game.phase === 'victory'
    ? `W${game.wave}✓`
    : `${Math.round((game.integrityRemoved / game.maxIntegrity) * 100)}%`;
}

console.log('\n\x1b[1mINTRUSION SHAPES vs DEFENSIVE POSTURES\x1b[0m  (cloud-region, no adversary)\n');
console.log(`  ${'posture'.padEnd(19)}${SHAPES.map((s) => s.name.padEnd(11)).join('')}`);
let dominant = 0;
for (const posture of POSTURES) {
  const cells = SHAPES.map((s) => attempt(posture.id, s.mix));
  console.log(`  ${posture.name.padEnd(19)}${cells.map((c) => c.padEnd(11)).join('')}`);
}
for (const shape of SHAPES) {
  const wins = POSTURES.filter((p) => attempt(p.id, shape.mix).includes('✓')).length;
  if (wins === POSTURES.length) {
    console.log(`\n  \x1b[31m${shape.name} breaches every posture — dominant strategy.\x1b[0m`);
    dominant += 1;
  }
}
if (dominant === 0) {
  console.log('\n  \x1b[32mNo intrusion shape beats every posture.\x1b[0m');
}
console.log('');
