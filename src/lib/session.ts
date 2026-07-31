import type { Session } from 'next-auth';
import { auth, authSecret, hasAuthProviders } from '@/auth';
import { isMongoConfigured } from './mongo';

export interface SessionUser {
  id: string;
  name: string;
}

/**
 * True when auth could possibly work. Without a secret Auth.js throws on every
 * call, and without a provider there is no way to have signed in, so calling
 * `auth()` in either case only produces log noise on pages that just wanted to
 * know whether anyone was logged in.
 */
export function isAuthConfigured(): boolean {
  return Boolean(authSecret()) && hasAuthProviders();
}

/** Session lookup that is safe to call on an unconfigured deployment. */
export async function getSession(): Promise<Session | null> {
  if (!isAuthConfigured()) return null;
  try {
    return await auth();
  } catch (error) {
    console.error('Auth session lookup failed:', error);
    return null;
  }
}

/** Resolves the signed-in user, or null when there is no session. */
export async function currentUser(): Promise<SessionUser | null> {
  const session = await getSession();
  const id = session?.user?.id;
  if (!id) return null;
  return { id, name: session.user?.name ?? session.user?.email ?? 'operator' };
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
