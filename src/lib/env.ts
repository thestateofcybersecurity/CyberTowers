import { createHmac } from 'node:crypto';

/**
 * Environment resolution in one place.
 *
 * Vercel's Neon and MongoDB integrations each provision their own variable
 * names, and which ones you get depends on how the integration was added. Every
 * lookup here accepts the aliases that actually turn up in practice, because
 * the alternative is an outage whose only symptom is a variable being spelled
 * the way a different tutorial spells it.
 */

/** First environment variable in the list that is set and non-empty. */
export function firstEnv(...names: string[]): string | undefined {
  for (const name of names) {
    const value = process.env[name];
    if (value && value.trim().length > 0) return value;
  }
  return undefined;
}

/** Root signing secret. `NEXTAUTH_SECRET` is the older name for the same thing. */
export function authSecret(): string | undefined {
  return firstEnv('AUTH_SECRET', 'NEXTAUTH_SECRET');
}

/** Postgres connection string, under whichever alias the integration provisioned. */
export function databaseUrl(): string | undefined {
  return firstEnv(
    'DATABASE_URL',
    'POSTGRES_URL',
    'NEON_DATABASE_URL',
    'DATABASE_URL_UNPOOLED',
    'POSTGRES_URL_NON_POOLING',
  );
}

/** Base URL of the Neon Auth instance, provisioned by the Neon integration. */
export function neonAuthBaseUrl(): string | undefined {
  return firstEnv('NEON_AUTH_BASE_URL', 'NEXT_PUBLIC_NEON_AUTH_URL', 'VITE_NEON_AUTH_URL');
}

/**
 * Key used to sign Neon Auth session cookies.
 *
 * Neon does not provision this — it is a signing key you own, like AUTH_SECRET.
 * Rather than require a second variable that does the same job, derive it from
 * the root secret. The HMAC label keeps the two keys cryptographically
 * independent, so a Neon Auth cookie can never be confused for anything else
 * signed with AUTH_SECRET. An explicit NEON_AUTH_COOKIE_SECRET still wins if
 * you would rather manage them separately.
 */
export function neonAuthCookieSecret(): string | undefined {
  const explicit = firstEnv('NEON_AUTH_COOKIE_SECRET');
  if (explicit) return explicit;

  const root = authSecret();
  if (!root) return undefined;
  return createHmac('sha256', root).update('cybertowers:neon-auth-cookie:v1').digest('hex');
}

export function isNeonAuthConfigured(): boolean {
  return Boolean(neonAuthBaseUrl() && neonAuthCookieSecret());
}

export function isMongoUriPresent(): boolean {
  return Boolean(firstEnv('MONGODB_URI'));
}

/**
 * What is and is not configured, as booleans only. Surfaced on the sign-in page
 * so a misconfigured deployment says which piece is missing instead of just
 * refusing to work. Never includes any value, only presence.
 */
export function authDiagnostics() {
  return {
    secret: Boolean(authSecret()),
    database: Boolean(databaseUrl()),
    mongo: isMongoUriPresent(),
    neonAuthBaseUrl: Boolean(neonAuthBaseUrl()),
    neonAuthCookieSecret: Boolean(neonAuthCookieSecret()),
    neonAuth: isNeonAuthConfigured(),
  };
}
