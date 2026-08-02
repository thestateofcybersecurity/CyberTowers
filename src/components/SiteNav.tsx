import Link from 'next/link';
import { isMongoConfigured } from '@/lib/mongo';
import { currentUser } from '@/lib/session';
import SignOutButton from './SignOutButton';

const LINKS = [
  { href: '/', label: 'Missions' },
  { href: '/operations', label: 'Operations' },
  { href: '/leaderboard', label: 'Leaderboard' },
  { href: '/codex', label: 'Codex' },
];

export default async function SiteNav() {
  const user = await currentUser();
  // Accounts need somewhere to live. Without Mongo there is nothing to sign in
  // to, whether or not an OAuth provider happens to be configured.
  const canSignIn = isMongoConfigured();

  return (
    <header className="sticky top-0 z-30 border-b border-edge bg-void/80 backdrop-blur">
      <nav className="mx-auto flex w-full max-w-7xl items-center gap-6 px-5 py-3">
        <Link href="/" className="flex items-center gap-2.5">
          <span className="grid h-7 w-7 place-items-center rounded-md border border-cyan/50 bg-cyan/10 font-mono text-xs font-bold text-cyan">
            CT
          </span>
          <span className="font-mono text-sm font-semibold tracking-[0.18em] text-ink">
            CYBERTOWERS
          </span>
        </Link>

        <div className="ml-2 hidden items-center gap-1 sm:flex">
          {LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="rounded-md px-3 py-1.5 text-sm text-muted transition hover:bg-panel-2 hover:text-ink"
            >
              {link.label}
            </Link>
          ))}
        </div>

        <div className="ml-auto flex items-center gap-3">
          {user ? (
            <>
              <Link
                href="/profile"
                className="flex items-center gap-2 rounded-md border border-edge px-3 py-1.5 text-sm text-ink transition hover:bg-panel-2"
              >
                <span className="h-1.5 w-1.5 rounded-full bg-lime" />
                {user.name}
              </Link>
              <SignOutButton kind={user.kind} />
            </>
          ) : canSignIn ? (
            <Link
              href="/signin"
              className="rounded-md border border-cyan/50 bg-cyan/10 px-3.5 py-1.5 text-sm font-medium text-cyan transition hover:bg-cyan/20"
            >
              Sign in
            </Link>
          ) : (
            <span className="label" title="Set MONGODB_URI to enable accounts">
              Guest mode
            </span>
          )}
        </div>
      </nav>
    </header>
  );
}
