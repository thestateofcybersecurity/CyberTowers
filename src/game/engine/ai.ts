import { TILE } from '../core/math';
import type { TowerId } from '../core/types';
import { TOWERS, TOWER_ORDER } from '../data/towers';
import type { Board } from './board';
import { lanePointAt } from './board';
import type { Game } from './Game';

/**
 * The defending network, when the player is the one attacking.
 *
 * This has to be a competent opponent or the mode is pointless: a board that
 * builds badly makes every intrusion succeed and teaches nothing. It reuses the
 * placement heuristic the balance harness converged on after two wrong answers
 * — order tiles by how much lane they actually cover, rather than by distance to
 * the nearest lane, which scatters towers onto short unshared stubs wherever
 * lanes converge.
 */

/** Buildable tiles ordered by how much lane sits inside a tower's radius. */
export function coverageSpots(board: Board): Array<{ col: number; row: number }> {
  const samples: Array<{ x: number; y: number }> = [];
  const point = { x: 0, y: 0 };
  for (const lane of board.lanes) {
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
      const x = col * TILE + TILE / 2;
      const y = row * TILE + TILE / 2;

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
 * A defensive posture. Real networks are not uniformly good at everything, and
 * a target that leans one way gives the attacker something to read and exploit:
 * a detection-heavy network punishes stealth but is thin against volume.
 */
export interface DefencePosture {
  id: string;
  name: string;
  /** How the operator describes their own programme. */
  blurb: string;
  /** Weighting per tower type; higher means built more often. */
  favour: Partial<Record<TowerId, number>>;
  /** What an attacker should notice about it. */
  weakness: string;
}

export const POSTURES: DefencePosture[] = [
  {
    id: 'perimeter',
    name: 'Perimeter-heavy',
    blurb: 'Money went into filtering at the edge. Plenty of throughput, little insight.',
    favour: { firewall: 4, antivirus: 2, edr: 1 },
    weakness: 'Almost no detection. Stealth walks through it.',
  },
  {
    id: 'detection',
    name: 'Detection-led',
    blurb: 'A mature monitoring programme with sensors everywhere and analysts behind them.',
    favour: { ids: 4, soc: 2, sentinel: 2, firewall: 1 },
    weakness: 'Thin raw damage. Volume overwhelms it before analysis matters.',
  },
  {
    id: 'containment',
    name: 'Containment-first',
    blurb: 'Segmentation and endpoint isolation, built by someone who has been breached before.',
    favour: { edr: 3, encryption: 3, firewall: 2 },
    weakness: 'Slow to kill anything. Armoured payloads survive the crossing.',
  },
  {
    id: 'balanced',
    name: 'Defence in depth',
    blurb: 'No single control carries the programme. Layered, and expensive.',
    favour: { firewall: 2, antivirus: 2, ids: 2, edr: 2, encryption: 1, soc: 1, sentinel: 1 },
    weakness: 'No obvious gap. Look for the lane it covers worst.',
  },
];

export function getPosture(id: string): DefencePosture {
  return POSTURES.find((p) => p.id === id) ?? POSTURES[3];
}

/** Weighted pick, deterministic given the counter passed in. */
function pickTower(posture: DefencePosture, n: number): TowerId {
  const entries = TOWER_ORDER.filter((id) => (posture.favour[id] ?? 0) > 0);
  const weights = entries.map((id) => posture.favour[id] ?? 0);
  const total = weights.reduce((a, b) => a + b, 0);
  // Deterministic sweep rather than random, so the same target always builds
  // the same network and an attacker can learn it across attempts.
  let roll = ((n * 37) % 100) / 100 * total;
  for (let i = 0; i < entries.length; i++) {
    roll -= weights[i];
    if (roll <= 0) return entries[i];
  }
  return entries[entries.length - 1];
}

/**
 * Spends a defensive budget on the board: builds out toward a target count,
 * then deepens what is already there. Mirrors how the balance harness found
 * competent play, so the attacker faces something that behaves like a player
 * rather than a random scatter.
 */
export function fortify(game: Game, budget: number, posture: DefencePosture, maxTowers = 26): number {
  const spots = coverageSpots(game.board);
  let spent = 0;
  let guard = 0;

  const canSpend = (cost: number) => cost <= budget - spent;

  while (guard++ < 400) {
    let acted = false;

    if (game.towers.length < maxTowers) {
      const type = pickTower(posture, game.towers.length);
      const cost = TOWERS[type].tiers[0].cost;
      if (canSpend(cost)) {
        for (const spot of spots) {
          if (game.towerAt(spot.col, spot.row)) continue;
          if (game.placeDefence(spot.col, spot.row, type)) {
            spent += cost;
            acted = true;
          }
          break;
        }
      }
    }

    if (!acted) {
      // Deepen the least-upgraded tower first, which keeps the whole network
      // rising instead of producing one maxed tower beside eight tier-ones.
      let best: { id: number; cost: number; tier: number } | null = null;
      for (const tower of game.towers) {
        const next = tower.def.tiers[tower.tier + 1];
        if (!next || !canSpend(next.cost)) continue;
        if (!best || tower.tier < best.tier) {
          best = { id: tower.id, cost: next.cost, tier: tower.tier };
        }
      }
      if (best && game.upgradeDefence(best.id)) {
        spent += best.cost;
        acted = true;
      }
    }

    if (!acted) break;
  }

  return spent;
}
