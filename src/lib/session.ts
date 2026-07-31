import { headers } from 'next/headers';
import { isNeonAuthConfigured } from './env';
import { readTokenFromCookieHeader, verifyToken } from './guest';
import { isMongoConfigured, profiles } from './mongo';
import { getNeonUser } from './neonAuth';

export interface SessionUser {
  id: string;
  name: string;
  /** How this identity was established. */
  kind: 'neon' | 'handle';
}

/** True when a real identity provider is available. */
export function isAuthConfigured(): boolean {
  return isNeonAuthConfigured();
}

/** Reads and verifies the handle-account cookie, if there is one. */
async function handleAccount(): Promise<SessionUser | null> {
  if (!isMongoConfigured()) return null;
  try {
    const store = await headers();
    const id = verifyToken(readTokenFromCookieHeader(store.get('cookie')));
    if (!id) return null;

    const col = await profiles();
    const profile = await col.findOne({ _id: id });
    if (!profile) return null;

    return { id, name: profile.handle, kind: 'handle' };
  } catch (error) {
    console.error('Handle account lookup failed:', error);
    return null;
  }
}

/**
 * Resolves the signed-in user from either identity source. Neon Auth wins when
 * both are present, since a verified account is the stronger claim.
 */
export async function currentUser(): Promise<SessionUser | null> {
  const neon = await getNeonUser();
  if (neon) return { ...neon, kind: 'neon' };
  return handleAccount();
}

export function jsonError(message: string, status: number): Response {
  return Response.json({ error: message }, { status });
}

/**
 * Shared preamble for every game API route: refuse early and clearly when the
 * datastore is not configured, and when nobody is signed in.
 */
export async function requireUser(): Promise<
  { user: SessionUser; error: null } | { user: null; error: Response }
> {
  if (!isMongoConfigured()) {
    return {
      user: null,
      error: jsonError('MONGODB_URI is not configured on this deployment.', 503),
    };
  }
  const user = await currentUser();
  if (!user) return { user: null, error: jsonError('Sign in required.', 401) };
  return { user, error: null };
}
