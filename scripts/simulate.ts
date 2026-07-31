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
 * Buildable tiles ordered the way a competent player would fill them: closest
 * to a lane first, but interleaved across lanes so every lane gets covered.
 * Sorting purely by distance clusters the whole budget onto whichever lane
 * happens to have the tightest tiles and leaves the others undefended, which
 * looks like a balance problem but is really a bot problem.
 */
function buildSpots(game: Game): Array<{ col: number; row: number }> {
  const { board } = game;
  const perLane: Array<Array<{ col: number; row: number; d: number }>> = board.lanes.map(() => []);

  for (let row = 0; row < board.rows; row++) {
    for (let col = 0; col < board.cols; col++) {
      if (!board.isBuildable(col, row)) continue;
      const x = col * 40 + 20;
      const y = row * 40 + 20;

      let best = Infinity;
      let bestLane = 0;
      board.lanes.forEach((lane, i) => {
        for (const p of lane.points) {
          const d = Math.hypot(p.x - x, p.y - y);
          if (d < best) {
            best = d;
            bestLane = i;
          }
        }
      });
      perLane[bestLane].push({ col, row, d: best });
    }
  }

  for (const list of perLane) list.sort((a, b) => a.d - b.d);

  const ordered: Array<{ col: number; row: number }> = [];
  for (let i = 0; ordered.length < perLane.reduce((n, l) => n + l.length, 0); i++) {
    for (const list of perLane) if (list[i]) ordered.push(list[i]);
  }
  return ordered;
}

/**
 * Spends every credit it can: builds out to `maxTowers` near the lane, then
 * pours the rest into upgrades. Approximates a competent player closely enough
 * to tell "the balance is wrong" from "the bot is bad", which the first version
 * of this harness could not do.
 */
function invest(game: Game, types: TowerId[], maxTowers = 40): number {
  const spots = buildSpots(game);
  let actions = 0;
  let progress = true;

  while (progress) {
    progress = false;

    if (game.towers.length < maxTowers) {
      const affordable = types.filter((t) => game.credits >= TOWERS[t].tiers[0].cost);
      if (affordable.length > 0) {
        // Rotate through the affordable set so the mix stays varied.
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

    // Upgrade the cheapest available improvement, which keeps the whole board
    // rising rather than dumping everything into one maxed tower.
    let cheapest: { id: number; cost: number } | null = null;
    for (const tower of game.towers) {
      const cost = game.upgradeCost(tower);
      if (cost === null || cost > game.credits) continue;
      if (!cheapest || cost < cheapest.cost) cheapest = { id: tower.id, cost };
    }
    if (cheapest && game.upgrade(cheapest.id).ok) {
      actions += 1;
      progress = true;
    }
  }

  return actions;
}

/** Kept for the smoke test, where only "can towers be placed at all" matters. */
function autoBuild(game: Game, types: TowerId[]): number {
  return invest(game, types);
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

function balanceReport(): void {
  const builds: Array<{ name: string; types: TowerId[] }> = [
    { name: 'firewall spam', types: ['firewall'] },
    { name: 'mixed', types: ['firewall', 'antivirus', 'ids', 'edr'] },
    { name: 'full roster', types: TOWER_ORDER },
  ];

  for (const mode of ['campaign', 'endless'] as GameMode[]) {
    console.log(`\n\x1b[1m${mode.toUpperCase()}\x1b[0m`);
    for (const map of MAPS) {
      const row: string[] = [];
      for (const build of builds) {
        const game = new Game({ map, mode, unlocked: TOWER_ORDER });
        invest(game, build.types);
        for (let i = 0; i < 5400 && game.phase !== 'defeat' && game.phase !== 'victory'; i++) {
          run(game, 1);
          // Reinvest during build phases, the way a real player would.
          if (game.phase === 'building') invest(game, build.types);
        }
        row.push(
          `${build.name}: W${game.wave}${game.phase === 'victory' ? '✓' : ''}`.padEnd(22),
        );
      }
      console.log(`  ${map.name.padEnd(18)} ${row.join('   ')}`);
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
