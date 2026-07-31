import type { DefaultSession } from 'next-auth';

/**
 * Auth.js does not put the user id on the session by default when using the
 * database strategy. `callbacks.session` in src/auth.ts adds it; this teaches
 * TypeScript about it.
 */
declare module 'next-auth' {
  interface Session {
    user: {
      id: string;
    } & DefaultSession['user'];
  }
}

export {};
