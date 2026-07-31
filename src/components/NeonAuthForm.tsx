'use client';

import { createAuthClient } from '@neondatabase/auth/next';
import { useRouter } from 'next/navigation';
import { useMemo, useState } from 'react';

type Mode = 'signin' | 'signup';

/**
 * Email and password sign-in against Neon Auth.
 *
 * Built on the SDK's client rather than its prebuilt UI kit: the kit ships its
 * own stylesheet and would land as a foreign-looking panel in the middle of
 * this interface. The trade is that the states below are ours to get right.
 */
export default function NeonAuthForm() {
  const router = useRouter();
  const client = useMemo(() => createAuthClient(), []);

  const [mode, setMode] = useState<Mode>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError('');

    try {
      const result =
        mode === 'signin'
          ? await client.signIn.email({ email, password })
          : await client.signUp.email({ email, password, name: name || email.split('@')[0] });

      if (result?.error) {
        setError(result.error.message ?? 'Could not complete that request.');
        return;
      }

      router.push('/profile');
      router.refresh();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Network error.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} className="mt-6">
      <div className="mb-3 flex gap-1 rounded-lg border border-edge p-1">
        {(['signin', 'signup'] as Mode[]).map((m) => (
          <button
            key={m}
            type="button"
            onClick={() => {
              setMode(m);
              setError('');
            }}
            className={`flex-1 rounded-md px-3 py-1.5 font-mono text-xs transition ${
              mode === m ? 'bg-cyan/15 text-cyan' : 'text-muted hover:text-ink'
            }`}
          >
            {m === 'signin' ? 'SIGN IN' : 'CREATE ACCOUNT'}
          </button>
        ))}
      </div>

      {mode === 'signup' && (
        <>
          <label className="label" htmlFor="name">
            Display name
          </label>
          <input
            id="name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            maxLength={24}
            autoComplete="nickname"
            placeholder="operator"
            className="mb-3 mt-1.5 w-full rounded-md border border-edge bg-panel-2 px-3 py-2 font-mono text-sm text-ink outline-none transition focus:border-cyan/60"
          />
        </>
      )}

      <label className="label" htmlFor="email">
        Email
      </label>
      <input
        id="email"
        type="email"
        required
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        autoComplete="email"
        className="mb-3 mt-1.5 w-full rounded-md border border-edge bg-panel-2 px-3 py-2 font-mono text-sm text-ink outline-none transition focus:border-cyan/60"
      />

      <label className="label" htmlFor="password">
        Password
      </label>
      <input
        id="password"
        type="password"
        required
        minLength={8}
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        autoComplete={mode === 'signin' ? 'current-password' : 'new-password'}
        className="mt-1.5 w-full rounded-md border border-edge bg-panel-2 px-3 py-2 font-mono text-sm text-ink outline-none transition focus:border-cyan/60"
      />

      {error && <p className="mt-2 text-xs text-rose">{error}</p>}

      <button
        type="submit"
        disabled={busy || !email || password.length < 8}
        className="mt-4 w-full rounded-lg border border-cyan/50 bg-cyan/10 px-4 py-2.5 font-mono text-sm font-semibold text-cyan transition hover:bg-cyan/20 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {busy ? 'WORKING…' : mode === 'signin' ? 'SIGN IN' : 'CREATE ACCOUNT'}
      </button>
    </form>
  );
}
