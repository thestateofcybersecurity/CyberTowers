/**
 * Headless simulation harness.
 *
 * The engine has no DOM dependencies, so the whole game can be driven from
 * Node. This is both a smoke test (does combat actually work?) and a balance
 * tool (how far does a given build get on each map?).
 *
 *   npm run simulate            # smoke test, exits non-zero on failure
 *   npm run simulate -- --balance
 */

import { validateSprites } from '../src/game/art/bake';
import { FIXED_DT, Game } from '../src/game/engine/Game';
import { lanePointAt } from '../src/game/engine/board';
import { MAPS, getMap } from '../src/game/data/maps';
import { TOWERS, TOWER_ORDER } from '../src/game/data/towers';
import type { GameMode, TowerId } from '../src/game/core/types';

let failures = 0;

function check(label: string, condition: boolean, detail = ''): void {
  if (condition) {
    console.log(`  \x1b[32m✓\x1b[0m ${label}${detail ? ` — ${detail}` : ''}`);
  } else {
    failures += 1;
    console.log(`  \x1b[31m✗\x1b[0m ${label}${detail ? ` — ${detail}` : ''}`);
  }
}

/** Advances the simulation by `seconds` of game time. */
function run(game: Game, seconds: number): void {
  const steps = Math.round(seconds / FIXED_DT);
  for (let i = 0; i < steps; i++) game.tick();
}

/**
 * Buildable tiles ordered by how much lane they actually cover.
 *
 * Earlier versions sorted by distance to the nearest lane, then by lane in
 * round-robin. Both are wrong in the same way: on a map whose lanes converge,
 * they scatter towers onto short unshared stubs instead of stacking the shared
 * corridor, which made an easy map look brutally hard. Counting how many lane
 * sample points sit inside a nominal tower radius gets convergent and
 * independent layouts right without special-casing either.
 */
function buildSpots(game: Game): Array<{ col: number; row: number }> {
  const { board } = game;

  // Sample every lane at a fixed interval so coverage is comparable between
  // a long serpentine lane and a short straight one.
  const samples: Array<{ x: number; y: number }> = [];
  for (const lane of board.lanes) {
    const point = { x: 0, y: 0 };
    for (let d = 0; d < lane.length; d += 20) {
      lanePointAt(lane, d, point);
      samples.push({ x: point.x, y: point.y });
    }
  }

  const RANGE = 130;
  const rangeSq = RANGE * RANGE;
  const spots: Array<{ col: number; row: number; covered: number; near: number }> = [];

  for (let row = 0; row < board.rows; row++) {
    for (let col = 0; col < board.cols; col++) {
      if (!board.isBuildable(col, row)) continue;
      const x = col * 40 + 20;
      const y = row * 40 + 20;

      let covered = 0;
      let near = Infinity;
      for (const s of samples) {
        const d2 = (s.x - x) ** 2 + (s.y - y) ** 2;
        if (d2 <= rangeSq) covered += 1;
        if (d2 < near) near = d2;
      }
      if (covered > 0) spots.push({ col, row, covered, near });
    }
  }

  return spots
    .sort((a, b) => b.covered - a.covered || a.near - b.near)
    .map(({ col, row }) => ({ col, row }));
}

/**
 * A spending policy. `concentrate` is the important one: it pours every credit
 * into maxing out the towers it already has before building another. That is
 * how a real player actually plays, and the first version of this harness could
 * not express it — it only ever bought the cheapest available upgrade, which
 * spreads a board thin and hides how strong a single maxed tower is.
 */
export interface Policy {
  name: string;
  types: TowerId[];
  concentrate: boolean;
  maxTowers: number;
  /** Towers to stand up before any credits go into upgrades. */
  minTowers?: number;
}

function cheapestUpgrade(game: Game): { id: number; cost: number } | null {
  let best: { id: number; cost: number } | null = null;
  for (const tower of game.towers) {
    const cost = game.upgradeCost(tower);
    if (cost === null || cost > game.credits) continue;
    if (!best || cost < best.cost) best = { id: tower.id, cost };
  }
  return best;
}

/** The affordable upgrade on whichever tower is already furthest along. */
function deepestUpgrade(game: Game): { id: number; cost: number } | null {
  let best: { id: number; cost: number; tier: number } | null = null;
  for (const tower of game.towers) {
    const cost = game.upgradeCost(tower);
    if (cost === null || cost > game.credits) continue;
    if (!best || tower.tier > best.tier) best = { id: tower.id, cost, tier: tower.tier };
  }
  return best;
}

/** Spends every credit it can according to the policy. */
function invest(game: Game, policy: Policy): number {
  const spots = buildSpots(game);
  let actions = 0;
  let progress = true;

  while (progress) {
    progress = false;

    // Concentrated policies always finish what they started before expanding,
    // but only once the opening board is up: pouring the starting credits into
    // one tower leaves the lane bare and loses on its own.
    if (policy.concentrate && game.towers.length >= (policy.minTowers ?? 0)) {
      const deep = deepestUpgrade(game);
      if (deep && game.upgrade(deep.id).ok) {
        actions += 1;
        progress = true;
        continue;
      }
    }

    if (game.towers.length < policy.maxTowers) {
      const affordable = policy.types.filter((t) => game.credits >= TOWERS[t].tiers[0].cost);
      if (affordable.length > 0) {
        const type = affordable[game.towers.length % affordable.length];
        for (const spot of spots) {
          if (game.towerAt(spot.col, spot.row)) continue;
          if (game.build(spot.col, spot.row, type).ok) {
            actions += 1;
            progress = true;
          }
          break;
        }
        if (progress) continue;
      }
    }

    if (!policy.concentrate) {
      const cheap = cheapestUpgrade(game);
      if (cheap && game.upgrade(cheap.id).ok) {
        actions += 1;
        progress = true;
      }
    }
  }

  return actions;
}

/** Kept for the smoke test, where only "can towers be placed at all" matters. */
function autoBuild(game: Game, types: TowerId[]): number {
  return invest(game, { name: 'smoke', types, concentrate: false, maxTowers: 40 });
}

function smokeTest(): void {
  console.log('\n\x1b[1mSprite integrity\x1b[0m');
  try {
    validateSprites();
    check('every sprite is a well-formed 16x16 grid', true);
  } catch (error) {
    check('every sprite is a well-formed 16x16 grid', false, String(error));
  }

  console.log('\n\x1b[1mBoard geometry\x1b[0m');
  for (const map of MAPS) {
    const game = new Game({ map, mode: 'campaign' });
    const buildable = game.board.buildableCount;
    check(
      `${map.name}: has buildable tiles and no lane overlap`,
      buildable > 30 && buildable < map.cols * map.rows,
      `${buildable} tiles`,
    );
    const ends = map.lanes.map((l) => JSON.stringify(l[l.length - 1]));
    check(`${map.name}: all lanes terminate at the core`, new Set(ends).size === 1);
  }

  console.log('\n\x1b[1mUndefended control run\x1b[0m');
  {
    const game = new Game({ map: MAPS[0], mode: 'campaign' });
    run(game, 60);
    check('threats leak and integrity falls when nothing is built', game.integrity < 100, `integrity ${Math.round(game.integrity)}`);

    // Early waves are small, so an undefended core takes several minutes of
    // game time to actually fall. Run it out to prove the defeat path fires.
    run(game, 540);
    check('defeat is eventually reached with no defences', game.phase === 'defeat', `phase ${game.phase}, wave ${game.wave}`);
    check('the simulation halts once defeated', (() => { const w = game.wave; run(game, 30); return game.wave === w; })());
  }

  console.log('\n\x1b[1mDefended run\x1b[0m');
  {
    const game = new Game({
      map: MAPS[0],
      mode: 'campaign',
      unlocked: TOWER_ORDER,
    });
    const built = autoBuild(game, ['firewall', 'antivirus', 'ids']);
    check('towers can be placed', built > 0, `${built} built`);

    const creditsAfterBuild = game.credits;
    run(game, 120);

    check('towers destroy threats', game.threatsKilled > 0, `${game.threatsKilled} killed`);
    check('kills pay out credits', game.credits > creditsAfterBuild, `${Math.round(game.credits)} cr`);
    check('score accumulates', game.score > 0, `${Math.round(game.score)}`);
    check('waves advance', game.wave > 1, `reached wave ${game.wave}`);
    check(
      'a defended core survives longer than an undefended one',
      game.integrity > 0,
      `integrity ${Math.round(game.integrity)}`,
    );
    check('damage is attributed to towers', game.towers.some((t) => t.damageDealt > 0));

    const numbers = [game.credits, game.score, game.integrity, game.elapsed];
    check('no NaN leaked into game state', numbers.every(Number.isFinite));
  }

  console.log('\n\x1b[1mSave / restore\x1b[0m');
  {
    const game = new Game({ map: MAPS[1], mode: 'endless', unlocked: TOWER_ORDER });
    autoBuild(game, ['firewall', 'edr']);
    run(game, 90);

    const snapshot = game.snapshot();
    const restored = new Game({ map: MAPS[1], mode: 'endless', unlocked: TOWER_ORDER });
    restored.restore(snapshot);

    check('tower layout survives a round trip', restored.towers.length === game.towers.length);
    check('wave and credits survive a round trip', restored.wave === game.wave && Math.round(restored.credits) === Math.round(game.credits));
    check('restored run is playable', (() => { run(restored, 30); return restored.elapsed > 0; })());
  }

  console.log('\n\x1b[1mStealth and detection\x1b[0m');
  {
    const game = new Game({ map: MAPS[0], mode: 'endless', unlocked: TOWER_ORDER });
    autoBuild(game, ['firewall']);
    const rootkit = game.spawnThreat('rootkit', 0);
    run(game, 1);
    check('a rootkit is untargetable without a detector', rootkit.alive && !rootkit.revealed);

    const detectorGame = new Game({ map: MAPS[0], mode: 'endless', unlocked: TOWER_ORDER });
    autoBuild(detectorGame, ['ids']);
    const hidden = detectorGame.spawnThreat('rootkit', 0);
    run(detectorGame, 6);
    check('an IDS reveals and kills it', !hidden.alive || hidden.revealed);
  }
}

const POLICIES: Policy[] = [
  { name: 'spread fw', types: ['firewall'], concentrate: false, maxTowers: 40 },
  // The strategy a player finds on their own: max one tower, then the next.
  { name: 'maxed fw', types: ['firewall'], concentrate: true, maxTowers: 40 },
  { name: 'spread mix', types: TOWER_ORDER, concentrate: false, maxTowers: 40 },
  { name: 'maxed mix', types: TOWER_ORDER, concentrate: true, maxTowers: 40 },
  // How a person actually plays: get a board up, then deepen it.
  { name: 'human', types: TOWER_ORDER, concentrate: true, maxTowers: 40, minTowers: 10 },
];

function balanceReport(): void {
  for (const mode of ['campaign', 'endless'] as GameMode[]) {
    console.log(`\n\x1b[1m${mode.toUpperCase()}\x1b[0m`);
    console.log(`  ${'map'.padEnd(18)} ${POLICIES.map((p) => p.name.padEnd(11)).join(' ')}`);
    for (const map of MAPS) {
      const row: string[] = [];
      for (const policy of POLICIES) {
        const game = new Game({ map, mode, unlocked: TOWER_ORDER });
        invest(game, policy);
        for (let i = 0; i < 6000 && game.phase !== 'defeat' && game.phase !== 'victory'; i++) {
          run(game, 1);
          if (game.phase === 'building') invest(game, policy);
        }
        row.push(`W${game.wave}${game.phase === 'victory' ? '\u2713' : ''}`.padEnd(11));
      }
      console.log(`  ${map.name.padEnd(18)} ${row.join(' ')}`);
    }
  }
}

const mapArg = process.argv.find((a) => a.startsWith('--map='))?.split('=')[1];
if (mapArg && !getMap(mapArg)) {
  console.error(`Unknown map: ${mapArg}`);
  process.exit(1);
}

if (process.argv.includes('--balance')) {
  balanceReport();
} else {
  smokeTest();
  console.log(
    failures === 0
      ? '\n\x1b[32mAll simulation checks passed.\x1b[0m\n'
      : `\n\x1b[31m${failures} check(s) failed.\x1b[0m\n`,
  );
  process.exit(failures === 0 ? 0 : 1);
}
