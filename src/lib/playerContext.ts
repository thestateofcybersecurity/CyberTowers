import type { RunSnapshot, TowerId } from '@/game/core/types';
import { levelFromXp, unlockedTowers } from '@/game/data/progression';
import { getOrCreateProfile, isMongoConfigured, saves, type ProfileDoc } from '@/lib/mongo';
import { currentUser } from '@/lib/session';

export interface PlayerContext {
  signedIn: boolean;
  handle: string;
  level: number;
  xp: number;
  unlocked: TowerId[];
  campaign: ProfileDoc['campaign'];
  stats: ProfileDoc['stats'] | null;
}

const GUEST: PlayerContext = {
  signedIn: false,
  handle: 'Guest',
  level: 1,
  xp: 0,
  unlocked: unlockedTowers(1),
  campaign: {},
  stats: null,
};

/**
 * Everything a page needs to know about the player, degrading to a sensible
 * guest profile when nobody is signed in or the datastore is not configured.
 * Pages call this instead of touching Mongo directly, so a missing env var
 * shows an unauthenticated game rather than a stack trace.
 */
export async function loadPlayerContext(): Promise<PlayerContext> {
  if (!isMongoConfigured()) return GUEST;

  try {
    const user = await currentUser();
    if (!user) return GUEST;

    const profile = await getOrCreateProfile(user.id, user.name);
    const level = levelFromXp(profile.xp);

    return {
      signedIn: true,
      handle: profile.handle,
      level,
      xp: profile.xp,
      unlocked: unlockedTowers(level),
      campaign: profile.campaign,
      stats: profile.stats,
    };
  } catch (error) {
    console.error('Failed to load player profile:', error);
    return GUEST;
  }
}

/** Fetches a cloud save for one board, or null if there is none. */
export async function loadSnapshot(
  mapId: string,
  mode: 'campaign' | 'endless',
): Promise<RunSnapshot | null> {
  if (!isMongoConfigured()) return null;
  try {
    const user = await currentUser();
    if (!user) return null;
    const col = await saves();
    const doc = await col.findOne({ userId: user.id, mapId, mode });
    return doc?.snapshot ?? null;
  } catch (error) {
    console.error('Failed to load cloud save:', error);
    return null;
  }
}
