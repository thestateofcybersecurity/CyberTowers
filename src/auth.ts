import NeonAdapter from '@auth/neon-adapter';
import { Pool } from '@neondatabase/serverless';
import NextAuth, { type NextAuthConfig } from 'next-auth';
import GitHub from 'next-auth/providers/github';
import Google from 'next-auth/providers/google';

/**
 * Auth.js over Neon Postgres.
 *
 * The config is a function rather than an object so the connection pool is
 * created per invocation: on Vercel each request may land in a fresh serverless
 * instance, and a pool captured at module scope can outlive the connection it
 * was holding.
 */

/** First environment variable in the list that is set and non-empty. */
function firstEnv(...names: string[]): string | undefined {
  for (const name of names) {
    const value = process.env[name];
    if (value && value.trim().length > 0) return value;
  }
  return undefined;
}

/**
 * Auth.js v5 reads `AUTH_SECRET`, but `NEXTAUTH_SECRET` is the v4 name and is
 * still what most people (and most tutorials) set. Accepting both turns a
 * silent, total auth outage into a non-event.
 */
export function authSecret(): string | undefined {
  return firstEnv('AUTH_SECRET', 'NEXTAUTH_SECRET');
}

/**
 * Postgres connection string. Vercel's Neon integration provisions several
 * aliases and which one you get depends on how the integration was added, so
 * take whichever is present rather than insisting on `DATABASE_URL`.
 *
 * The unpooled variants come last: Auth.js issues many short queries, which is
 * exactly what the pooled endpoint is for.
 */
export function databaseUrl(): string | undefined {
  return firstEnv(
    'DATABASE_URL',
    'POSTGRES_URL',
    'NEON_DATABASE_URL',
    'DATABASE_URL_UNPOOLED',
    'POSTGRES_URL_NON_POOLING',
  );
}

function githubCredentials() {
  const id = firstEnv('AUTH_GITHUB_ID', 'GITHUB_ID', 'GITHUB_CLIENT_ID');
  const secret = firstEnv('AUTH_GITHUB_SECRET', 'GITHUB_SECRET', 'GITHUB_CLIENT_SECRET');
  return id && secret ? { id, secret } : null;
}

function googleCredentials() {
  const id = firstEnv('AUTH_GOOGLE_ID', 'GOOGLE_ID', 'GOOGLE_CLIENT_ID');
  const secret = firstEnv('AUTH_GOOGLE_SECRET', 'GOOGLE_SECRET', 'GOOGLE_CLIENT_SECRET');
  return id && secret ? { id, secret } : null;
}

function providers() {
  // Each provider is opt-in via env, so a fresh clone runs locally with no
  // OAuth apps registered — you just cannot sign in until you add one.
  const list = [];

  const github = githubCredentials();
  if (github) list.push(GitHub({ clientId: github.id, clientSecret: github.secret }));

  const google = googleCredentials();
  if (google) list.push(Google({ clientId: google.id, clientSecret: google.secret }));

  return list;
}

/** True when at least one OAuth provider is configured. */
export function hasAuthProviders(): boolean {
  return Boolean(githubCredentials() || googleCredentials());
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
    github: Boolean(githubCredentials()),
    google: Boolean(googleCredentials()),
    mongo: Boolean(firstEnv('MONGODB_URI')),
  };
}

export const { handlers, auth, signIn, signOut } = NextAuth(() => {
  const connectionString = databaseUrl();
  const secret = authSecret();

  const config: NextAuthConfig = {
    providers: providers(),
    pages: { signIn: '/signin' },
    // Passing the secret explicitly means the NEXTAUTH_SECRET fallback above
    // actually takes effect; Auth.js only auto-reads AUTH_SECRET.
    secret,
    // Database sessions require an adapter, and Auth.js throws on every call if
    // one is declared without the other. With no connection string there is
    // nothing to sign in against anyway, so fall back to JWT and let `auth()`
    // simply return null instead of erroring on a page that only wanted to know
    // whether anybody was signed in.
    session: { strategy: connectionString ? 'database' : 'jwt' },
    callbacks: {
      // Database sessions do not carry the user id by default, and every game
      // API route keys its Mongo documents on it.
      session({ session, user }) {
        if (session.user && user) session.user.id = String(user.id);
        return session;
      },
    },
  };

  if (connectionString) {
    config.adapter = NeonAdapter(new Pool({ connectionString }));
  }

  return config;
});
