import type { TowerId } from '../core/types';
import { TOWER_ORDER } from './towers';

/**
 * Doctrine: the two rules that make a mixed board worth more than the sum of
 * its towers, and the one that stops support from running away.
 *
 * These are the *complementarity* terms in the allocation problem. Without
 * something like them, total damage is linear in how credits are split between
 * tower types and the optimum is always a corner — everything into whichever
 * type has the best damage per credit. See `npm run analyze`.
 *
 * Both are shaped by the same two findings from how other tower defences handle
 * stacking: bonuses should be additive against a base rather than exponential,
 * because `1.2^n` runs away where `1 + 0.2n` does not; and support effects
 * should not stack across copies, because a tower buffed by five sources
 * one-shots everything and deletes the encounter.
 */

/* -------------------------------------------------------- defence in depth */

export const DEFENCE_IN_DEPTH = {
  /** Extra damage taken per distinct control that has already hit the threat. */
  bonusPerLayer: 0.09,
  /** Layers counted before the bonus stops growing. */
  maxLayers: 5,
} as const;

/**
 * Threats remember which *kinds* of defence have hit them, as a bitmask over
 * TOWER_ORDER. Layering different controls is the whole idea of defence in
 * depth, so the bonus counts distinct types, not towers: ten firewalls are one
 * layer, and a firewall plus an IDS plus an encryption field is three.
 */
export function layerBit(type: TowerId): number {
  const index = TOWER_ORDER.indexOf(type);
  return index < 0 ? 0 : 1 << index;
}

export function countLayers(mask: number): number {
  let n = 0;
  let m = mask;
  while (m) {
    m &= m - 1;
    n += 1;
  }
  return n;
}

/**
 * Damage multiplier from however many distinct controls have already engaged.
 * Additive in the layer count and hard-capped, so a wide board is rewarded
 * without the bonus becoming the whole game.
 */
export function depthMultiplier(mask: number): number {
  const layers = Math.min(countLayers(mask), DEFENCE_IN_DEPTH.maxLayers);
  return 1 + Math.max(0, layers - 1) * DEFENCE_IN_DEPTH.bonusPerLayer;
}

/** Best case, for the codex and the analyser. */
export const MAX_DEPTH_MULTIPLIER =
  1 + (DEFENCE_IN_DEPTH.maxLayers - 1) * DEFENCE_IN_DEPTH.bonusPerLayer;

/* ------------------------------------------------------------ alert fatigue */

export const ALERT_FATIGUE = {
  /** Detectors that cost nothing in signal quality. */
  free: 3,
  /** How sharply each detector past that dilutes the rest. */
  rate: 0.14,
} as const;

/**
 * Signal quality across the whole board, from 1 down toward 0.
 *
 * More detectors means more alerts, and past a point more alerts means less
 * attention paid to any one of them. Mechanically this is what stops the IDS
 * flag — the strongest multiplier available — from being something you simply
 * buy more of. Three well-upgraded sensors beat ten cheap ones, which is both
 * the correct answer here and the correct answer in a real detection programme.
 *
 * Deliberately applies only to the flag multiplier, not to whether stealth is
 * revealed at all: making rootkits intermittently untargetable would read as a
 * bug rather than a cost.
 */
export function alertFatigue(detectorCount: number): number {
  const excess = Math.max(0, detectorCount - ALERT_FATIGUE.free);
  return 1 / (1 + ALERT_FATIGUE.rate * excess);
}
