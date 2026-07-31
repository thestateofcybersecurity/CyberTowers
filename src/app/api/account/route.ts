import { clearCookieHeader } from '@/lib/guest';
import { profiles, saves, scores } from '@/lib/mongo';
import { getNeonAuth } from '@/lib/neonAuth';
import { jsonError, requireUser } from '@/lib/session';

export const dynamic = 'force-dynamic';

/**
 * Deletes the signed-in player's game data: profile, cloud saves and
 * leaderboard entries.
 *
 * What this can also delete depends on where the identity came from, and the
 * two cases are genuinely different:
 *
 * - Handle accounts *are* the profile. Removing it removes the account, and the
 *   recovery key stops working.
 * - Neon Auth owns its own users. This cannot remove one — Neon Auth's
 *   user-deletion endpoint is not enabled on the instance — so the login
 *   survives. Without signing the session out, the very next request would
 *   recreate an empty profile and the deletion would look like it failed.
 *
 * The response says which of the two happened so the UI can be honest about it.
 */
export async function DELETE(request: Request) {
  const { user, error } = await requireUser();
  if (error) return error;

  const url = new URL(request.url);
  if (url.searchParams.get('confirm') !== 'DELETE') {
    return jsonError('Add ?confirm=DELETE to permanently delete this data.', 400);
  }

  const [profileCol, saveCol, scoreCol] = await Promise.all([profiles(), saves(), scores()]);

  const [savesDeleted, scoresDeleted] = await Promise.all([
    saveCol.deleteMany({ userId: user.id }),
    scoreCol.deleteMany({ userId: user.id }),
  ]);
  const profileDeleted = await profileCol.deleteOne({ _id: user.id });

  // End the session so the profile is not immediately recreated underneath the
  // player by whatever request the browser makes next.
  let loginRemoved = user.kind === 'handle';
  if (user.kind === 'neon') {
    try {
      await getNeonAuth()?.signOut();
    } catch (caught) {
      console.error('Neon Auth sign-out during account deletion failed:', caught);
    }
    loginRemoved = false;
  }

  return Response.json(
    {
      ok: true,
      loginRemoved,
      deleted: {
        profile: profileDeleted.deletedCount,
        saves: savesDeleted.deletedCount,
        scores: scoresDeleted.deletedCount,
      },
    },
    { headers: { 'Set-Cookie': clearCookieHeader() } },
  );
}
