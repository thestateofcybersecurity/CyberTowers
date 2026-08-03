/**
 * Does a legitimate run actually survive submission?
 *
 * The scores endpoint replays the wave generator and rejects anything outside
 * what the real game could have paid out. That check is only as good as its
 * model of the game, and it silently drifts every time scoring changes: the
 * player sees "Run rejected", and nothing in CI notices.
 *
 * So play real games in both seats, across every map, mode, operation and
 * posture, and push each genuine result through the same validator the API
 * uses. Anything rejected here would have been rejected for a player.
 *
 * The end-of-run summary is checked here too, for the same reason: it is shared
 * between the seats, and its wording used to congratulate an attacker for
 * breaching a core by telling them the network was secured.
 *
 *   npm run leaderboard
 *   npm run leaderboard -- --verbose
 */

import { renderToStaticMarkup } from 'react-dom/server';
import RunSummary from '../src/components/game/RunSummary';
import { Game } from '../src/game/engine/Game';
import { coverageSpots, POSTURES } from '../src/game/engine/ai';
import { MAPS } from '../src/game/data/maps';
import { OPERATIONS } from '../src/game/data/operations';
import { THREATS } from '../src/game/data/threats';
import { TOWERS, TOWER_ORDER } from '../src/game/data/towers';
import type { GameMode, GameRole, RunResult, ThreatId, TowerId } from '../src/game/core/types';
import { validateRun, type RunSubmission } from '../src/lib/validation';

const STEP = 1 / 60;
const verbose = process.argv.includes('--verbose');

function advance(game: Game, seconds: number): void {
  const steps = Math.round(seconds / STEP);
  for (let i = 0; i < steps; i++) game.tick();
}

/**
 * Plays like a person: stand a board up, then pour everything into deepening
 * it. The concentrated half matters because that is the strategy players find
 * on their own, and it produces the highest scores, which is exactly where a
 * too-tight bound bites first.
 */
function invest(game: Game, types: TowerId[], minTowers: number, maxTowers: number): void {
  const spots = coverageSpots(game.board);
  let progress = true;

  while (progress) {
    progress = false;

    if (game.towers.length >= minTowers) {
      let deep: { id: number; tier: number } | null = null;
      for (const tower of game.towers) {
        const cost = game.upgradeCost(tower);
        if (cost === null || cost > game.credits) continue;
        if (!deep || tower.tier > deep.tier) deep = { id: tower.id, tier: tower.tier };
      }
      if (deep && game.upgrade(deep.id).ok) {
        progress = true;
        continue;
      }
    }

    if (game.towers.length < maxTowers) {
      const affordable = types.filter((t) => game.credits >= TOWERS[t].tiers[0].cost);
      if (affordable.length === 0) continue;
      const type = affordable[game.towers.length % affordable.length];
      for (const spot of spots) {
        if (game.towerAt(spot.col, spot.row)) continue;
        if (game.build(spot.col, spot.row, type).ok) progress = true;
        break;
      }
    }
  }
}

function playDefence(opts: {
  mapId: string;
  mode: GameMode;
  operationId?: string;
  types: TowerId[];
  minTowers: number;
  /** Call every wave the instant the build phase opens, for the early bonus. */
  rush: boolean;
}) {
  const map = MAPS.find((m) => m.id === opts.mapId)!;
  const operation = opts.operationId ? OPERATIONS.find((o) => o.id === opts.operationId) : undefined;
  const game = new Game({ map, mode: opts.mode, unlocked: TOWER_ORDER, operation });

  const cap = opts.mode === 'endless' ? 40000 : 20000;
  invest(game, opts.types, opts.minTowers, 40);

  for (let i = 0; i < cap && game.phase !== 'defeat' && game.phase !== 'victory'; i++) {
    game.tick();
    if (game.phase === 'building') {
      invest(game, opts.types, opts.minTowers, 40);
      if (opts.rush) game.callWaveEarly();
    }
    // Endless has no end. Stop somewhere deep enough to be a real submission.
    if (opts.mode === 'endless' && game.wave > 30) break;
  }

  return game;
}

/**
 * Buys the most damage it can afford each wave, which maximises attacker score.
 * `budgetScale` thins the defending network: a soft target is how a good player
 * experiences a board they have learned, and a deep breach is precisely the run
 * the old defender-derived bound threw away.
 */
function playAttack(mapId: string, postureId: string, budgetScale = 4.6, operationId?: string) {
  const map = MAPS.find((m) => m.id === mapId)!;
  const posture = POSTURES.find((p) => p.id === postureId)!;
  const operation = operationId ? OPERATIONS.find((o) => o.id === operationId) : undefined;
  const game = new Game({
    map,
    mode: 'campaign',
    role: 'attacker',
    posture,
    operation,
    defenceBudget: Math.round(map.startCredits * budgetScale),
  });

  const buyable = (Object.keys(THREATS) as ThreatId[]).filter(
    (t) => !THREATS[t].traits.boss && Number.isFinite(game.intrusionCost(t)),
  );

  for (let guard = 0; guard < 400 && game.phase !== 'defeat' && game.phase !== 'victory'; guard++) {
    if (game.phase === 'building') {
      // Most damage per intel, subject to the unit cap.
      const ranked = [...buyable].sort(
        (a, b) => THREATS[b].damage / game.intrusionCost(b) - THREATS[a].damage / game.intrusionCost(a),
      );
      const plan: Array<{ threat: ThreatId; count: number; lane: number }> = [];
      let intel = game.intel;
      let units = 0;
      for (const threat of ranked) {
        const cost = game.intrusionCost(threat);
        const count = Math.min(Math.floor(intel / cost), game.maxIntrusionUnits - units);
        if (count <= 0) continue;
        plan.push({ threat, count, lane: plan.length % game.board.lanes.length });
        intel -= count * cost;
        units += count;
        if (units >= game.maxIntrusionUnits) break;
      }
      if (plan.length === 0 || !game.launchAttack(plan).ok) break;
    }
    advance(game, 1);
  }

  return game;
}

interface Row {
  label: string;
  submission: RunSubmission;
}

function check(rows: Row[], heading: string): number {
  console.log(`\n\x1b[1m${heading}\x1b[0m`);
  let failures = 0;

  for (const { label, submission } of rows) {
    const verdict = validateRun(submission);
    const b = verdict.bounds;
    const scorePct = b.maxScore > 0 ? (submission.score / b.maxScore) * 100 : Infinity;
    const killPct = b.maxKills > 0 ? (submission.threatsKilled / b.maxKills) * 100 : Infinity;

    if (!verdict.ok) {
      failures += 1;
      console.log(`  \x1b[31m✗\x1b[0m ${label.padEnd(34)} ${verdict.reason}`);
      console.log(
        `      score ${submission.score} vs max ${b.maxScore}` +
          `  ·  kills ${submission.threatsKilled} vs max ${b.maxKills}` +
          `  ·  elapsed ${submission.elapsed}s vs min ${b.minElapsed}s`,
      );
      continue;
    }

    // Passing is not enough. A run sitting at 95% of the ceiling is a rejection
    // waiting for a slightly better player.
    const headroom = Math.min(scorePct, killPct);
    const tight = headroom > 70;
    if (tight || verbose) {
      const mark = tight ? '\x1b[33m!\x1b[0m' : '\x1b[32m✓\x1b[0m';
      console.log(
        `  ${mark} ${label.padEnd(34)} score ${scorePct.toFixed(0)}% of cap, kills ${killPct.toFixed(0)}%`,
      );
    }
    if (tight) failures += 0; // reported, not fatal
  }

  if (failures === 0) console.log('  \x1b[32mall runs accepted\x1b[0m');
  return failures;
}

let failures = 0;

// Plain campaigns, both spending styles, with and without early wave calls.
{
  const rows: Row[] = [];
  for (const map of MAPS) {
    for (const rush of [false, true]) {
      for (const [style, types, minTowers] of [
        ['mix', TOWER_ORDER, 10],
        ['firewall', ['firewall'] as TowerId[], 1],
      ] as const) {
        const game = playDefence({
          mapId: map.id,
          mode: 'campaign',
          types: types as TowerId[],
          minTowers,
          rush,
        });
        rows.push({
          label: `${map.id} ${style}${rush ? ' rush' : ''}`,
          submission: {
            ...game.result(),
            towersUsed: [...new Set(game.towers.map((t) => t.def.id))],
          } as RunSubmission,
        });
      }
    }
  }
  failures += check(rows, 'Campaign');
}

// Endless, where score compounds furthest past the campaign's ceiling.
{
  const rows: Row[] = [];
  for (const map of MAPS) {
    const game = playDefence({
      mapId: map.id,
      mode: 'endless',
      types: TOWER_ORDER,
      minTowers: 10,
      rush: true,
    });
    rows.push({
      label: `${map.id} endless`,
      submission: {
        ...game.result(),
        towersUsed: [...new Set(game.towers.map((t) => t.def.id))],
      } as RunSubmission,
    });
  }
  failures += check(rows, 'Endless');
}

// Operations bend the roster, so the validator's replay has to bend with it.
{
  const rows: Row[] = [];
  for (const op of OPERATIONS) {
    const game = playDefence({
      mapId: op.mapId,
      mode: 'campaign',
      operationId: op.id,
      types: TOWER_ORDER,
      minTowers: 10,
      rush: true,
    });
    rows.push({
      label: `${op.id} (${op.groupId})`,
      submission: {
        ...game.result(),
        towersUsed: [...new Set(game.towers.map((t) => t.def.id))],
      } as RunSubmission,
    });
  }
  failures += check(rows, 'Operations');
}

// The attacker seat submits to the same endpoint with a completely different
// scoring currency.
{
  const rows: Row[] = [];
  for (const map of MAPS) {
    for (const posture of POSTURES) {
      // Both a hardened target and a soft one. The soft runs breach deeply and
      // are the ones that used to be rejected.
      for (const scale of [4.6, 1]) {
        const game = playAttack(map.id, posture.id, scale);
        const breach = Math.round((game.integrityRemoved / game.maxIntegrity) * 100);
        rows.push({
          label: `${map.id} vs ${posture.id} ${breach}% breach`,
          submission: { ...game.result(), towersUsed: [] } as RunSubmission,
        });
      }
    }
  }
  failures += check(rows, 'Intrusions');
}

// The summary panel is shared between the seats and reads every figure the
// opposite way round for an intrusion.
{
  console.log('\n\x1b[1mRun summary\x1b[0m');
  let wrong = 0;
  const base: RunResult = {
    mapId: 'home-net', role: 'defender', mode: 'campaign', wave: 20, score: 1000,
    elapsed: 300, threatsKilled: 42, integrity: 80, victory: true, xpEarned: 100,
  };
  const expected: Array<[GameRole, boolean, string]> = [
    ['defender', true, 'NETWORK SECURED'],
    ['defender', false, 'CORE BREACHED'],
    // Breaching the core is how an intrusion wins, not how it loses.
    ['attacker', true, 'CORE BREACHED'],
    ['attacker', false, 'INTRUSION BURNED'],
  ];

  for (const [role, victory, headline] of expected) {
    const html = renderToStaticMarkup(
      <RunSummary
        result={{ ...base, role, victory }}
        mapName="Home Network"
        submit={{ status: 'idle' }}
        onRetry={() => {}}
      />,
    );
    const text = html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ');
    const ok =
      text.includes(headline) &&
      // An attacker never neutralises threats, and the integrity shown is the
      // target's, which is the opposite of an achievement.
      (role === 'attacker'
        ? text.includes('Units lost') && text.includes('Core still up')
        : text.includes('Threats neutralised') && text.includes('Integrity left'));
    if (!ok) {
      failures += 1;
      wrong += 1;
      console.log(`  \x1b[31m✗\x1b[0m ${role}/${victory ? 'won' : 'lost'} expected "${headline}"`);
      console.log(`      ${text.slice(0, 160)}`);
    } else if (verbose) {
      console.log(`  \x1b[32m✓\x1b[0m ${role}/${victory ? 'won' : 'lost'}  ${headline}`);
    }
  }
  if (wrong === 0) console.log('  \x1b[32mboth seats read correctly\x1b[0m');
}

console.log('');
if (failures > 0) {
  console.error(`\x1b[31m${failures} check(s) failed. A player would hit this.\x1b[0m`);
  process.exit(1);
}
console.log('\x1b[32mEvery legitimate run submits cleanly.\x1b[0m');
