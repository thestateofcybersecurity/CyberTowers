import { clearCookieHeader } from '@/lib/guest';
import { profiles, saves, scores } from '@/lib/mongo';
import { jsonError, requireUser } from '@/lib/session';

export const dynamic = 'force-dynamic';

/**
 * Permanently deletes the signed-in account and everything attached to it:
 * profile, cloud saves and leaderboard entries.
 *
 * Anyone who can create an account should be able to remove it, and for handle
 * accounts there is no other route to it — there is no email to appeal to and
 * no provider dashboard to revoke from.
 *
 * Requires `?confirm=DELETE` so a stray request cannot destroy a profile, and
 * only ever touches documents belonging to the caller.
 */
export async function DELETE(request: Request) {
  const { user, error } = await requireUser();
  if (error) return error;

  const url = new URL(request.url);
  if (url.searchParams.get('confirm') !== 'DELETE') {
    return jsonError('Add ?confirm=DELETE to permanently delete this account.', 400);
  }

  const [profileCol, saveCol, scoreCol] = await Promise.all([profiles(), saves(), scores()]);

  const [savesDeleted, scoresDeleted] = await Promise.all([
    saveCol.deleteMany({ userId: user.id }),
    scoreCol.deleteMany({ userId: user.id }),
  ]);
  const profileDeleted = await profileCol.deleteOne({ _id: user.id });

  return Response.json(
    {
      ok: true,
      deleted: {
        profile: profileDeleted.deletedCount,
        saves: savesDeleted.deletedCount,
        scores: scoresDeleted.deletedCount,
      },
    },
    // The cookie is meaningless now; clearing it avoids leaving the browser
    // holding a token for an account that no longer exists.
    { headers: { 'Set-Cookie': clearCookieHeader() } },
  );
}
