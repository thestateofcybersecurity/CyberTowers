import { redirect } from 'next/navigation';
import { auth, signIn } from '@/auth';
import SiteNav from '@/components/SiteNav';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Sign in · CyberTowers' };

const PROVIDERS = [
  { id: 'github', label: 'Continue with GitHub', env: 'AUTH_GITHUB_ID' },
  { id: 'google', label: 'Continue with Google', env: 'AUTH_GOOGLE_ID' },
] as const;

export default async function SignInPage() {
  const session = await auth();
  if (session?.user) redirect('/profile');

  const available = PROVIDERS.filter((p) => Boolean(process.env[p.env]));

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
            <div className="mt-6 rounded-lg border border-amber/40 bg-amber/10 px-4 py-3 text-sm text-amber">
              No OAuth provider is configured on this deployment. Set{' '}
              <code className="font-mono">AUTH_GITHUB_ID</code> and{' '}
              <code className="font-mono">AUTH_GITHUB_SECRET</code> (or the Google equivalents) to
              enable accounts.
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
