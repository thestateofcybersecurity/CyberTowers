import type { GameMode, GameRole, TowerId } from '@/game/core/types';
import { levelFromXp } from '@/game/data/progression';
import { getOrCreateProfile, isMongoConfigured, profiles, scores } from '@/lib/mongo';
import { currentUser, jsonError, requireUser } from '@/lib/session';
import { rateLimit, runResultSchema, validateRun } from '@/lib/validation';

export const dynamic = 'force-dynamic';

/**
 * Leaderboard. Public: signing in is required to *post* a score, not to read
 * one. Each player contributes their single best run per board rather than
 * filling the top ten with their own attempts.
 */
export async function GET(request: Request) {
  if (!isMongoConfigured()) return Response.json({ entries: [], configured: false });

  const url = new URL(request.url);
  const mapId = url.searchParams.get('mapId') ?? undefined;
  const modeParam = url.searchParams.get('mode');
  const mode: GameMode | undefined =
    modeParam === 'campaign' || modeParam === 'endless' ? modeParam : undefined;
  const roleParam = url.searchParams.get('role');
  const role: GameRole = roleParam === 'attacker' ? 'attacker' : 'defender';
  const limit = Math.min(100, Math.max(1, Number(url.searchParams.get('limit') ?? 25)));

  // Defenders and attackers score in unrelated currencies, so they get separate
  // boards. Documents written before the attacker seat existed carry no role
  // and are all defender runs.
  const match: Record<string, unknown> =
    role === 'attacker' ? { role: 'attacker' } : { role: { $ne: 'attacker' } };
  if (mapId) match.mapId = mapId;
  if (mode) match.mode = mode;

  const col = await scores();
  const entries = await col
    .aggregate([
      { $match: match },
      { $sort: { score: -1 } },
      {
        $group: {
          _id: '$userId',
          handle: { $first: '$handle' },
          score: { $first: '$score' },
          wave: { $first: '$wave' },
          mapId: { $first: '$mapId' },
          mode: { $first: '$mode' },
          role: { $first: '$role' },
          victory: { $first: '$victory' },
          elapsed: { $first: '$elapsed' },
          createdAt: { $first: '$createdAt' },
        },
      },
      { $sort: { score: -1 } },
      { $limit: limit },
    ])
    .toArray();

  const me = await currentUser();

  return Response.json({
    configured: true,
    role,
    entries: entries.map((e, i) => ({
      rank: i + 1,
      userId: String(e._id),
      handle: e.handle,
      score: e.score,
      wave: e.wave,
      mapId: e.mapId,
      mode: e.mode,
      role: (e.role ?? 'defender') as GameRole,
      victory: e.victory,
      elapsed: e.elapsed,
      createdAt: e.createdAt,
      isYou: me ? String(e._id) === me.id : false,
    })),
  });
}

export async function POST(request: Request) {
  const { user, error } = await requireUser();
  if (error) return error;

  if (!rateLimit(`score:${user.id}`, 12, 60_000)) {
    return jsonError('Too many submissions, slow down.', 429);
  }

  const body = await request.json().catch(() => null);
  const parsed = runResultSchema.safeParse(body);
  if (!parsed.success) {
    return jsonError(parsed.error.issues[0]?.message ?? 'Invalid run result', 400);
  }

  const run = parsed.data;
  const verdict = validateRun(run);
  if (!verdict.ok) {
    // Rejected runs are dropped rather than stored-and-flagged: a leaderboard
    // that quietly contains unverified entries is worse than one that refuses
    // them at the door.
    return jsonError(`Run rejected: ${verdict.reason}`, 422);
  }

  const profile = await getOrCreateProfile(user.id, user.name);

  const scoreCol = await scores();
  await scoreCol.insertOne({
    userId: user.id,
    handle: profile.handle,
    mapId: run.mapId,
    role: run.role,
    mode: run.mode,
    wave: run.wave,
    score: run.score,
    elapsed: run.elapsed,
    threatsKilled: run.threatsKilled,
    integrity: run.integrity,
    victory: run.victory,
    towersUsed: run.towersUsed as TowerId[],
    createdAt: new Date(),
  });

  // XP is clamped to what the run could plausibly have earned before it is
  // committed, so account progression cannot be inflated either.
  const grantedXp = Math.min(run.xpEarned, Math.ceil(verdict.bounds.maxScore / 4) + 500);
  // Operations record against their own key so clearing one unlocks the next
  // without touching the plain campaign's progress on the same board.
  const progressKey =
    run.role === 'attacker'
      ? `atk:${run.operationId ?? run.mapId}`
      : run.operationId
        ? `op:${run.operationId}`
        : run.mapId;
  const previous = profile.campaign[progressKey] ?? { bestWave: 0, bestScore: 0, cleared: false };

  const nextXp = profile.xp + grantedXp;
  const col = await profiles();
  await col.updateOne(
    { _id: user.id },
    {
      $set: {
        xp: nextXp,
        level: levelFromXp(nextXp),
        [`campaign.${progressKey}`]: {
          bestWave: Math.max(previous.bestWave, run.wave),
          bestScore: Math.max(previous.bestScore, run.score),
          cleared: previous.cleared || run.victory,
        },
        updatedAt: new Date(),
      },
      // An intrusion's "kills" are its own units lost, and its waves are ones it
      // launched rather than held. Adding them to the defensive counters made
      // the career page read as though losing an intrusion killed threats.
      $inc:
        run.role === 'attacker'
          ? {
              'stats.runs': 1,
              'stats.intrusions': 1,
              'stats.unitsLost': run.threatsKilled,
              'stats.coresBreached': run.victory ? 1 : 0,
            }
          : {
              'stats.runs': 1,
              'stats.wavesCleared': run.wave,
              'stats.threatsKilled': run.threatsKilled,
            },
      $max: {
        'stats.bestEndlessWave': run.mode === 'endless' ? run.wave : 0,
      },
    },
  );

  return Response.json({
    ok: true,
    xpEarned: grantedXp,
    xp: nextXp,
    level: levelFromXp(nextXp),
  });
}
