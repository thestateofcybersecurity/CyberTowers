import { getOrCreateProfile, isMongoConfigured, profiles } from '@/lib/mongo';
import { clearCookieHeader, cookieHeader, issueToken, verifyToken } from '@/lib/guest';
import { jsonError } from '@/lib/session';
import { profilePatchSchema, rateLimit } from '@/lib/validation';

export const dynamic = 'force-dynamic';

function clientKey(request: Request): string {
  return request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'unknown';
}

/** Creates a handle account and signs the browser in. */
export async function POST(request: Request) {
  if (!isMongoConfigured()) {
    return jsonError('MONGODB_URI is not configured on this deployment.', 503);
  }
  if (!rateLimit(`guest:${clientKey(request)}`, 5, 60_000)) {
    return jsonError('Too many accounts created from this address. Try again shortly.', 429);
  }

  const body = await request.json().catch(() => null);
  const parsed = profilePatchSchema.safeParse(body);
  if (!parsed.success) {
    return jsonError(parsed.error.issues[0]?.message ?? 'Invalid handle', 400);
  }

  const issued = issueToken();
  if (!issued) {
    return jsonError('AUTH_SECRET is not configured on this deployment.', 503);
  }

  await getOrCreateProfile(issued.id, parsed.data.handle);

  return Response.json(
    { ok: true, handle: parsed.data.handle, recoveryKey: issued.token },
    { headers: { 'Set-Cookie': cookieHeader(issued.token) } },
  );
}

/** Restores an existing handle account on another browser from its key. */
export async function PUT(request: Request) {
  if (!isMongoConfigured()) {
    return jsonError('MONGODB_URI is not configured on this deployment.', 503);
  }
  if (!rateLimit(`restore:${clientKey(request)}`, 10, 60_000)) {
    return jsonError('Too many attempts. Try again shortly.', 429);
  }

  const body = await request.json().catch(() => null);
  const key = typeof body?.recoveryKey === 'string' ? body.recoveryKey.trim() : '';

  const id = verifyToken(key);
  if (!id) return jsonError('That recovery key is not valid.', 400);

  // A correctly signed key for an account that was never created is still not a
  // usable identity; require the profile to exist.
  const col = await profiles();
  const existing = await col.findOne({ _id: id });
  if (!existing) return jsonError('No account exists for that recovery key.', 404);

  return Response.json(
    { ok: true, handle: existing.handle },
    { headers: { 'Set-Cookie': cookieHeader(key) } },
  );
}

/** Signs out of a handle account on this browser. */
export async function DELETE() {
  return Response.json({ ok: true }, { headers: { 'Set-Cookie': clearCookieHeader() } });
}
