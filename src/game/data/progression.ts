import type { TowerId } from '../core/types';
import { TOWERS, TOWER_ORDER } from './towers';

/**
 * Account-level progression. Clearance level is earned across every run and
 * gates which defences you may build, which is what gives an early campaign
 * map a reason to be replayed on endless.
 */
export const LEVEL_XP = [
  0, 150, 400, 850, 1500, 2400, 3600, 5200, 7300, 10000, 13500, 18000, 24000, 32000, 42000,
];

export const MAX_LEVEL = LEVEL_XP.length;

export function levelFromXp(xp: number): number {
  let level = 1;
  for (let i = 1; i < LEVEL_XP.length; i++) {
    if (xp >= LEVEL_XP[i]) level = i + 1;
    else break;
  }
  return level;
}

/** XP still needed for the next level, and the size of the current band. */
export function levelProgress(xp: number): { level: number; into: number; span: number } {
  const level = levelFromXp(xp);
  if (level >= MAX_LEVEL) return { level, into: 1, span: 1 };
  const floor = LEVEL_XP[level - 1];
  const ceiling = LEVEL_XP[level];
  return { level, into: xp - floor, span: ceiling - floor };
}

export function unlockedTowers(level: number): TowerId[] {
  return TOWER_ORDER.filter((id) => TOWERS[id].unlockLevel <= level);
}

/** The next defence that unlocks, for the "coming up" hint on the profile. */
export function nextUnlock(level: number): { tower: TowerId; atLevel: number } | null {
  const upcoming = TOWER_ORDER.map((id) => ({ tower: id, atLevel: TOWERS[id].unlockLevel }))
    .filter((entry) => entry.atLevel > level)
    .sort((a, b) => a.atLevel - b.atLevel);
  return upcoming[0] ?? null;
}
