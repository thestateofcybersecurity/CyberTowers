import { redirect } from 'next/navigation';
import AccountForm from '@/components/AccountForm';
import NeonAuthForm from '@/components/NeonAuthForm';
import SiteNav from '@/components/SiteNav';
import { authDiagnostics, isNeonAuthConfigured } from '@/lib/env';
import { isMongoConfigured } from '@/lib/mongo';
import { currentUser } from '@/lib/session';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Sign in · CyberTowers' };

export default async function SignInPage() {
  const user = await currentUser();
  if (user) redirect('/profile');

  const diagnostics = authDiagnostics();
  const neonAuth = isNeonAuthConfigured();
  // Handle accounts are the fallback when no identity provider is available.
  const handleAccounts = isMongoConfigured() && diagnostics.secret;

  return (
    <>
      <SiteNav />
      <main className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center px-5 py-16">
        <div className="rounded-2xl border border-edge bg-panel/80 p-7">
          <h1 className="font-mono text-2xl font-bold tracking-tight text-ink">Sign in</h1>
          <p className="mt-2 text-sm leading-relaxed text-muted">
            An account keeps your clearance level, unlocked defences, cloud saves and leaderboard
            ranks. The game is fully playable without one.
          </p>

          {neonAuth && (
            <>
              <NeonAuthForm />
              {handleAccounts && (
                <div className="my-5 flex items-center gap-3">
                  <span className="h-px flex-1 bg-edge" />
                  <span className="label">or</span>
                  <span className="h-px flex-1 bg-edge" />
                </div>
              )}
            </>
          )}
          {handleAccounts ? (
            <AccountForm />
          ) : (
            <div className="mt-6 space-y-3">
              <div className="rounded-lg border border-amber/40 bg-amber/10 px-4 py-3 text-sm text-amber">
                Accounts are unavailable on this deployment. Below is what the server can currently
                see — presence only, never values.
              </div>
              <dl className="rounded-lg border border-edge bg-panel-2/50 px-4 py-3 text-xs">
                <ConfigRow
                  label="AUTH_SECRET"
                  ok={diagnostics.secret}
                  hint="Generate with `npx auth secret`. NEXTAUTH_SECRET also works."
                />
                <ConfigRow
                  label="MongoDB"
                  ok={diagnostics.mongo}
                  hint="MONGODB_URI. Stores profiles, saves and scores."
                />
                <ConfigRow
                  label="Neon Auth base URL"
                  ok={diagnostics.neonAuthBaseUrl}
                  hint="NEON_AUTH_BASE_URL, provisioned when Neon Auth is enabled on the project."
                />
                <ConfigRow
                  label="Neon Auth cookie key"
                  ok={diagnostics.neonAuthCookieSecret}
                  hint="Derived from AUTH_SECRET automatically, or set NEON_AUTH_COOKIE_SECRET."
                />
              </dl>
            </div>
          )}
        </div>

        <p className="mt-4 px-1 text-xs leading-relaxed text-muted">
          {neonAuth && handleAccounts
            ? 'Neon Auth accounts use an email and password and live in your Neon project. Handle accounts need neither, and use a signed cookie plus a recovery key.'
            : neonAuth
              ? 'Sign-in is handled by Neon Auth. Accounts live in your Neon project alongside the game data.'
              : 'Neon Auth is not configured, so this deployment is using handle accounts: no email or password, a signed cookie, and a recovery key to move between devices.'}
        </p>

      </main>
    </>
  );
}

function ConfigRow({ label, ok, hint }: { label: string; ok: boolean; hint: string }) {
  return (
    <div className="flex items-start gap-2.5 border-b border-edge/60 py-1.5 last:border-0">
      <span className={ok ? 'text-lime' : 'text-rose'}>{ok ? '✓' : '✗'}</span>
      <div className="min-w-0">
        <div className={`font-mono ${ok ? 'text-ink' : 'text-rose'}`}>{label}</div>
        {!ok && <div className="mt-0.5 text-muted">{hint}</div>}
      </div>
    </div>
  );
}
