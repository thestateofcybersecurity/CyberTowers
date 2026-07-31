import { createNeonAuth } from '@neondatabase/auth/next/server';
import { isNeonAuthConfigured, neonAuthBaseUrl, neonAuthCookieSecret } from './env';

/**
 * Neon Auth: the identity provider that actually verifies who somebody is.
 *
 * Neon Postgres and Neon Auth are separate products — the database being
 * connected says nothing about whether an identity provider exists. This module
 * is the only place that talks to the SDK, and it is built lazily so that a
 * deployment without Neon Auth provisioned imports cleanly and simply reports
 * "not configured" rather than throwing at module load.
 */

type NeonAuthInstance = ReturnType<typeof createNeonAuth>;

let cached: NeonAuthInstance | null = null;
let failed = false;

export function getNeonAuth(): NeonAuthInstance | null {
  if (cached) return cached;
  if (failed || !isNeonAuthConfigured()) return null;

  try {
    cached = createNeonAuth({
      baseUrl: neonAuthBaseUrl()!,
      cookies: { secret: neonAuthCookieSecret()! },
    });
    return cached;
  } catch (error) {
    // One failure is enough; retrying per request would just repeat the log.
    failed = true;
    console.error('Neon Auth initialisation failed:', error);
    return null;
  }
}

export interface NeonAuthUser {
  id: string;
  name: string;
}

/**
 * The signed-in Neon Auth user, or null. Never throws: an auth outage should
 * degrade the site to signed-out, not break every page that renders a nav bar.
 */
export async function getNeonUser(): Promise<NeonAuthUser | null> {
  const auth = getNeonAuth();
  if (!auth) return null;

  try {
    const result = await auth.getSession();
    const user = result?.data?.user;
    if (!user?.id) return null;
    return { id: String(user.id), name: user.name || user.email || 'operator' };
  } catch (error) {
    console.error('Neon Auth session lookup failed:', error);
    return null;
  }
}
