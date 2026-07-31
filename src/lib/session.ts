import { auth } from '@/auth';
import { isMongoConfigured } from './mongo';

export interface SessionUser {
  id: string;
  name: string;
}

/** Resolves the signed-in user, or null when there is no session. */
export async function currentUser(): Promise<SessionUser | null> {
  const session = await auth();
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
