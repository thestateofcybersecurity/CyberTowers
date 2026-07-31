import { createHmac, randomBytes, timingSafeEqual } from 'node:crypto';
import { authSecret } from './env';

/**
 * Handle-based accounts, for deployments with no OAuth app registered.
 *
 * A player picks a name and gets a real, persistent account: profile, cloud
 * saves and leaderboard entries, all keyed on the same user id string that
 * Auth.js accounts use, so every API route works unchanged.
 *
 * Identity is a signed token in an HttpOnly cookie. The signature is an HMAC
 * over a random id using AUTH_SECRET, so a token cannot be forged or pointed at
 * somebody else's account — but anyone holding the token *is* the account,
 * exactly like a password. That is why it is shown once as a recovery key and
 * never stored anywhere we could leak it.
 */

export const GUEST_COOKIE = 'ct_account';
const MAX_AGE = 60 * 60 * 24 * 365;

function sign(id: string, secret: string): string {
  return createHmac('sha256', secret).update(id).digest('base64url');
}

/** Creates a new account id and its signed token. */
export function issueToken(): { id: string; token: string } | null {
  const secret = authSecret();
  if (!secret) return null;
  const id = `g_${randomBytes(16).toString('hex')}`;
  return { id, token: `${id}.${sign(id, secret)}` };
}

/** Returns the account id if the token is well-formed and correctly signed. */
export function verifyToken(token: string | undefined | null): string | null {
  const secret = authSecret();
  if (!secret || !token) return null;

  const dot = token.lastIndexOf('.');
  if (dot <= 0) return null;

  const id = token.slice(0, dot);
  const provided = token.slice(dot + 1);
  if (!/^g_[0-9a-f]{32}$/.test(id)) return null;

  const expected = sign(id, secret);
  const a = Buffer.from(provided);
  const b = Buffer.from(expected);
  // Length check first: timingSafeEqual throws on a mismatch rather than
  // returning false, and the length is not the secret part anyway.
  if (a.length !== b.length) return null;
  return timingSafeEqual(a, b) ? id : null;
}

export function cookieHeader(token: string): string {
  const secure = process.env.NODE_ENV === 'production' ? '; Secure' : '';
  return `${GUEST_COOKIE}=${token}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${MAX_AGE}${secure}`;
}

export function clearCookieHeader(): string {
  const secure = process.env.NODE_ENV === 'production' ? '; Secure' : '';
  return `${GUEST_COOKIE}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0${secure}`;
}

/** Reads the token out of a raw Cookie header. */
export function readTokenFromCookieHeader(header: string | null): string | null {
  if (!header) return null;
  for (const part of header.split(';')) {
    const [name, ...rest] = part.trim().split('=');
    if (name === GUEST_COOKIE) return rest.join('=');
  }
  return null;
}
