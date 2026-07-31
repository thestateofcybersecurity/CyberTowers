import { redirect } from 'next/navigation';
import { authDiagnostics, signIn } from '@/auth';
import AccountForm from '@/components/AccountForm';
import SiteNav from '@/components/SiteNav';
import { isMongoConfigured } from '@/lib/mongo';
import { currentUser } from '@/lib/session';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Sign in · CyberTowers' };

const PROVIDERS = [
  { id: 'github', label: 'Continue with GitHub', env: 'AUTH_GITHUB_ID' },
  { id: 'google', label: 'Continue with Google', env: 'AUTH_GOOGLE_ID' },
] as const;

export default async function SignInPage() {
  const user = await currentUser();
  if (user) redirect('/profile');

  const available = PROVIDERS.filter((p) => Boolean(process.env[p.env]));
  const diagnostics = authDiagnostics();
  const accountsPossible = isMongoConfigured() && diagnostics.secret;

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

          {accountsPossible ? (
            <>
              <AccountForm />

              {available.length > 0 && (
                <>
                  <div className="my-5 flex items-center gap-3">
                    <span className="h-px flex-1 bg-edge" />
                    <span className="label">or</span>
                    <span className="h-px flex-1 bg-edge" />
                  </div>
                  <div className="space-y-2">
                    {available.map((provider) => (
                      <form
                        key={provider.id}
                        action={async () => {
                          'use server';
                          await signIn(provider.id, { redirectTo: '/profile' });
                        }}
                      >
                        <button
                          type="submit"
                          className="w-full rounded-lg border border-edge px-4 py-2.5 font-mono text-sm text-ink transition hover:bg-panel-2"
                        >
                          {provider.label}
                        </button>
                      </form>
                    ))}
                  </div>
                </>
              )}
            </>
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
                  label="Postgres (Neon)"
                  ok={diagnostics.database}
                  hint="Only needed for OAuth sign-in, not for handle accounts."
                />
                <ConfigRow
                  label="GitHub OAuth"
                  ok={diagnostics.github}
                  hint="Optional. AUTH_GITHUB_ID + AUTH_GITHUB_SECRET."
                />
              </dl>
            </div>
          )}
        </div>

        {accountsPossible && (
          <p className="mt-4 px-1 text-xs leading-relaxed text-muted">
            Handle accounts need no email, password or OAuth app. Sign-in is a signed cookie, and
            you get a recovery key to move the account between devices. Adding{' '}
            <code className="font-mono">AUTH_GITHUB_ID</code> and{' '}
            <code className="font-mono">AUTH_GITHUB_SECRET</code> enables GitHub sign-in alongside
            it.
          </p>
        )}
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
