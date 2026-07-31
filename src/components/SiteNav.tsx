import Link from 'next/link';
import { auth, hasAuthProviders } from '@/auth';

const LINKS = [
  { href: '/', label: 'Missions' },
  { href: '/leaderboard', label: 'Leaderboard' },
  { href: '/codex', label: 'Codex' },
];

export default async function SiteNav() {
  const session = await auth();
  const configured = hasAuthProviders();

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
          {session?.user ? (
            <>
              <Link
                href="/profile"
                className="flex items-center gap-2 rounded-md border border-edge px-3 py-1.5 text-sm text-ink transition hover:bg-panel-2"
              >
                <span className="h-1.5 w-1.5 rounded-full bg-lime" />
                {session.user.name ?? 'Operator'}
              </Link>
              <Link
                href="/api/auth/signout"
                className="text-sm text-muted transition hover:text-ink"
              >
                Sign out
              </Link>
            </>
          ) : configured ? (
            <Link
              href="/signin"
              className="rounded-md border border-cyan/50 bg-cyan/10 px-3.5 py-1.5 text-sm font-medium text-cyan transition hover:bg-cyan/20"
            >
              Sign in
            </Link>
          ) : (
            <span className="label" title="Configure AUTH_GITHUB_ID or AUTH_GOOGLE_ID to enable accounts">
              Guest mode
            </span>
          )}
        </div>
      </nav>
    </header>
  );
}
