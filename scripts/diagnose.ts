/**
 * Wave-by-wave difficulty trace for a single board.
 *
 * The balance table says *where* a run dies; this says *why*. It prints, per
 * wave, the total health the wave will field against the total damage per
 * second the player's board can actually deliver, so a gap that opens at wave
 * nine is visible as a gap rather than inferred from a death.
 *
 *   npx tsx scripts/diagnose.ts cloud-region campaign
 */

import { getMap } from '../src/game/data/maps';
import { THREATS } from '../src/game/data/threats';
import { TOWERS, TOWER_ORDER } from '../src/game/data/towers';
import { buildWave, healthScale } from '../src/game/data/waves';
import type { GameMode, TowerId } from '../src/game/core/types';
import { FIXED_DT, Game } from '../src/game/engine/Game';

const mapId = process.argv[2] ?? 'cloud-region';
const mode = (process.argv[3] ?? 'campaign') as GameMode;
const map = getMap(mapId);
if (!map) {
  console.error(`Unknown map: ${mapId}`);
  process.exit(1);
}

/** Total effective health a wave will field, boss included. */
function waveHealth(wave: number): number {
  const plan = buildWave(map!, wave, mode);
  const scale = healthScale(wave) * (map!.modifiers?.healthScale ?? 1);
  let total = 0;
  for (const g of plan.groups) {
    const def = THREATS[g.threat];
    if (!def) continue;
    const shield = def.traits.shield ?? 0;
    let each = (def.health + shield) * scale;
    if (def.traits.splitInto) {
      const child = THREATS[def.traits.splitInto.id];
      each += child.health * scale * def.traits.splitInto.count;
    }
    total += each * g.count;
  }
  return total;
}

/** Nominal damage per second of the current board, ignoring coverage. */
function boardDps(game: Game): number {
  let dps = 0;
  for (const t of game.towers) {
    if (t.def.attack === 'aura') continue;
    dps += t.stats.damage * (1 + t.auraDamage) * t.stats.fireRate * (1 + t.auraFireRate);
  }
  return dps;
}

function buildSpots(game: Game) {
  const spots: Array<{ col: number; row: number; d: number }> = [];
  for (let row = 0; row < game.board.rows; row++) {
    for (let col = 0; col < game.board.cols; col++) {
      if (!game.board.isBuildable(col, row)) continue;
      const x = col * 40 + 20;
      const y = row * 40 + 20;
      let best = Infinity;
      for (const lane of game.board.lanes) {
        for (const p of lane.points) best = Math.min(best, Math.hypot(p.x - x, p.y - y));
      }
      spots.push({ col, row, d: best });
    }
  }
  return spots.sort((a, b) => a.d - b.d);
}

function invest(game: Game, types: TowerId[], maxTowers = 40): void {
  const spots = buildSpots(game);
  let progress = true;
  while (progress) {
    progress = false;
    if (game.towers.length < maxTowers) {
      const affordable = types.filter((t) => game.credits >= TOWERS[t].tiers[0].cost);
      if (affordable.length > 0) {
        const type = affordable[game.towers.length % affordable.length];
        for (const s of spots) {
          if (game.towerAt(s.col, s.row)) continue;
          if (game.build(s.col, s.row, type).ok) progress = true;
          break;
        }
        if (progress) continue;
      }
    }
    let cheapest: { id: number; cost: number } | null = null;
    for (const t of game.towers) {
      const c = game.upgradeCost(t);
      if (c === null || c > game.credits) continue;
      if (!cheapest || c < cheapest.cost) cheapest = { id: t.id, cost: c };
    }
    if (cheapest && game.upgrade(cheapest.id).ok) progress = true;
  }
}

const game = new Game({ map, mode, unlocked: TOWER_ORDER });
invest(game, TOWER_ORDER);

console.log(`\n${map.name} · ${mode}\n`);
console.log('wave   waveHP   boardDPS   needDPS   ratio  towers  credits  integrity');

let lastWave = 0;
let totalEarned = 0;
let prevCredits = game.credits;

for (let i = 0; i < 6000 && game.phase !== 'defeat' && game.phase !== 'victory'; i++) {
  for (let s = 0; s < 60; s++) game.tick();

  if (game.credits > prevCredits) totalEarned += game.credits - prevCredits;
  prevCredits = game.credits;

  if (game.phase === 'building') {
    invest(game, TOWER_ORDER);
    prevCredits = game.credits;
  }

  if (game.wave !== lastWave) {
    lastWave = game.wave;
    const hp = waveHealth(game.wave);
    const dps = boardDps(game);
    // A wave has roughly its spawn window plus a lane traversal to be cleared;
    // 30s is a fair approximation across these maps.
    const need = hp / 30;
    const ratio = dps / need;
    console.log(
      `${String(game.wave).padStart(4)}  ${String(Math.round(hp)).padStart(7)}  ` +
        `${String(Math.round(dps)).padStart(8)}  ${String(Math.round(need)).padStart(8)}  ` +
        `${ratio.toFixed(2).padStart(6)}  ${String(game.towers.length).padStart(6)}  ` +
        `${String(Math.round(game.credits)).padStart(7)}  ${String(Math.round(game.integrity)).padStart(9)}`,
    );
  }
}

console.log(
  `\nended: ${game.phase} at wave ${game.wave}, ${Math.round(totalEarned)} credits earned total\n`,
);
void FIXED_DT;
