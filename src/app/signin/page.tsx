import { redirect } from 'next/navigation';
import { authDiagnostics, signIn } from '@/auth';
import { getSession } from '@/lib/session';
import SiteNav from '@/components/SiteNav';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Sign in · CyberTowers' };

const PROVIDERS = [
  { id: 'github', label: 'Continue with GitHub', env: 'AUTH_GITHUB_ID' },
  { id: 'google', label: 'Continue with Google', env: 'AUTH_GOOGLE_ID' },
] as const;

export default async function SignInPage() {
  const session = await getSession();
  if (session?.user) redirect('/profile');

  const available = PROVIDERS.filter((p) => Boolean(process.env[p.env]));
  const diagnostics = authDiagnostics();

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

          {available.length === 0 ? (
            <div className="mt-6 space-y-3">
              <div className="rounded-lg border border-amber/40 bg-amber/10 px-4 py-3 text-sm text-amber">
                Sign-in is not available on this deployment yet. Below is what the server can
                currently see — presence only, never values.
              </div>
              <dl className="rounded-lg border border-edge bg-panel-2/50 px-4 py-3 text-xs">
                <ConfigRow
                  label="AUTH_SECRET"
                  ok={diagnostics.secret}
                  hint="Generate with `npx auth secret`. NEXTAUTH_SECRET also works."
                />
                <ConfigRow
                  label="Postgres (Neon)"
                  ok={diagnostics.database}
                  hint="DATABASE_URL, POSTGRES_URL or the Neon integration equivalents."
                />
                <ConfigRow
                  label="MongoDB"
                  ok={diagnostics.mongo}
                  hint="MONGODB_URI. Stores profiles, saves and scores."
                />
                <ConfigRow
                  label="GitHub OAuth"
                  ok={diagnostics.github}
                  hint="AUTH_GITHUB_ID + AUTH_GITHUB_SECRET. No database integration provides these."
                />
                <ConfigRow
                  label="Google OAuth"
                  ok={diagnostics.google}
                  hint="AUTH_GOOGLE_ID + AUTH_GOOGLE_SECRET."
                />
              </dl>
              <p className="text-xs leading-relaxed text-muted">
                Database integrations provision databases, not identity providers. At least one
                OAuth app has to be registered by hand, with callback URL{' '}
                <code className="font-mono text-ink">
                  {'{origin}'}/api/auth/callback/github
                </code>
                .
              </p>
            </div>
          ) : (
            <div className="mt-6 space-y-2">
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
                    className="w-full rounded-lg border border-cyan/50 bg-cyan/10 px-4 py-2.5 font-mono text-sm font-semibold text-cyan transition hover:bg-cyan/20"
                  >
                    {provider.label}
                  </button>
                </form>
              ))}
            </div>
          )}
        </div>
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
