import { levelFromXp, unlockedTowers } from '@/game/data/progression';
import { getOrCreateProfile, profiles } from '@/lib/mongo';
import { jsonError, requireUser } from '@/lib/session';
import { profilePatchSchema } from '@/lib/validation';

export const dynamic = 'force-dynamic';

export async function GET() {
  const { user, error } = await requireUser();
  if (error) return error;

  const profile = await getOrCreateProfile(user.id, user.name);
  const level = levelFromXp(profile.xp);

  return Response.json({
    handle: profile.handle,
    xp: profile.xp,
    level,
    unlocked: unlockedTowers(level),
    campaign: profile.campaign,
    stats: profile.stats,
  });
}

export async function PATCH(request: Request) {
  const { user, error } = await requireUser();
  if (error) return error;

  const body = await request.json().catch(() => null);
  const parsed = profilePatchSchema.safeParse(body);
  if (!parsed.success) {
    return jsonError(parsed.error.issues[0]?.message ?? 'Invalid handle', 400);
  }

  const col = await profiles();
  await getOrCreateProfile(user.id, user.name);
  await col.updateOne(
    { _id: user.id },
    { $set: { handle: parsed.data.handle, updatedAt: new Date() } },
  );

  return Response.json({ handle: parsed.data.handle });
}
