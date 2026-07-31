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

function providers() {
  // Each provider is opt-in via env, so a fresh clone runs locally with no
  // OAuth apps registered — you just cannot sign in until you add one.
  const list = [];
  if (process.env.AUTH_GITHUB_ID && process.env.AUTH_GITHUB_SECRET) {
    list.push(
      GitHub({
        clientId: process.env.AUTH_GITHUB_ID,
        clientSecret: process.env.AUTH_GITHUB_SECRET,
      }),
    );
  }
  if (process.env.AUTH_GOOGLE_ID && process.env.AUTH_GOOGLE_SECRET) {
    list.push(
      Google({
        clientId: process.env.AUTH_GOOGLE_ID,
        clientSecret: process.env.AUTH_GOOGLE_SECRET,
      }),
    );
  }
  return list;
}

/** True when at least one OAuth provider is configured. */
export function hasAuthProviders(): boolean {
  return Boolean(
    (process.env.AUTH_GITHUB_ID && process.env.AUTH_GITHUB_SECRET) ||
      (process.env.AUTH_GOOGLE_ID && process.env.AUTH_GOOGLE_SECRET),
  );
}

export const { handlers, auth, signIn, signOut } = NextAuth(() => {
  const connectionString = process.env.DATABASE_URL;

  const config: NextAuthConfig = {
    providers: providers(),
    pages: { signIn: '/signin' },
    // Database sessions require an adapter, and Auth.js throws on every call if
    // one is declared without the other. With no DATABASE_URL there is nothing
    // to sign in against anyway, so fall back to JWT and let `auth()` simply
    // return null instead of erroring on a page that only wanted to know
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
