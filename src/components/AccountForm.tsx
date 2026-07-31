'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';

type Mode = 'create' | 'restore';

/**
 * Handle-based sign-up. No password, no email, no OAuth app: pick a name and
 * you have a real account with cloud saves and leaderboard entries.
 *
 * The recovery key is shown exactly once, because it is the only thing that can
 * restore the account on another device and the server never stores a copy it
 * could show again later.
 */
export default function AccountForm() {
  const router = useRouter();
  const [mode, setMode] = useState<Mode>('create');
  const [handle, setHandle] = useState('');
  const [key, setKey] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [recoveryKey, setRecoveryKey] = useState('');
  const [copied, setCopied] = useState(false);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError('');

    try {
      const response = await fetch('/api/guest', {
        method: mode === 'create' ? 'POST' : 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(mode === 'create' ? { handle } : { recoveryKey: key }),
      });
      const data = await response.json();

      if (!response.ok) {
        setError(data.error ?? 'Something went wrong.');
        return;
      }

      if (mode === 'create') {
        setRecoveryKey(data.recoveryKey);
      } else {
        router.push('/profile');
        router.refresh();
      }
    } catch {
      setError('Network error.');
    } finally {
      setBusy(false);
    }
  }

  if (recoveryKey) {
    return (
      <div className="mt-6">
        <div className="rounded-lg border border-lime/40 bg-lime/10 px-4 py-3 text-sm text-lime">
          Account created. You are signed in on this browser.
        </div>

        <div className="mt-4">
          <div className="label">Recovery key</div>
          <p className="mt-1 text-xs leading-relaxed text-muted">
            Save this. It is the only way to get back into this account on another device, and it
            is shown once — the server keeps no copy it could show you again. Anyone who has it can
            use the account, so treat it like a password.
          </p>
          <div className="mt-2 flex gap-2">
            <code className="min-w-0 flex-1 truncate rounded-md border border-edge bg-panel-2 px-3 py-2 font-mono text-xs text-ink">
              {recoveryKey}
            </code>
            <button
              type="button"
              onClick={async () => {
                await navigator.clipboard.writeText(recoveryKey);
                setCopied(true);
              }}
              className="shrink-0 rounded-md border border-edge px-3 py-2 font-mono text-xs text-muted transition hover:bg-panel-2 hover:text-ink"
            >
              {copied ? 'COPIED' : 'COPY'}
            </button>
          </div>
        </div>

        <button
          type="button"
          onClick={() => {
            router.push('/profile');
            router.refresh();
          }}
          className="mt-4 w-full rounded-lg border border-cyan/50 bg-cyan/10 px-4 py-2.5 font-mono text-sm font-semibold text-cyan transition hover:bg-cyan/20"
        >
          CONTINUE
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="mt-6">
      <div className="mb-3 flex gap-1 rounded-lg border border-edge p-1">
        {(['create', 'restore'] as Mode[]).map((m) => (
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
            {m === 'create' ? 'NEW ACCOUNT' : 'RESTORE'}
          </button>
        ))}
      </div>

      {mode === 'create' ? (
        <>
          <label className="label" htmlFor="handle">
            Choose a handle
          </label>
          <input
            id="handle"
            value={handle}
            onChange={(e) => setHandle(e.target.value)}
            maxLength={24}
            autoComplete="off"
            placeholder="operator"
            className="mt-1.5 w-full rounded-md border border-edge bg-panel-2 px-3 py-2 font-mono text-sm text-ink outline-none transition focus:border-cyan/60"
          />
          <p className="mt-1.5 text-xs text-muted">
            This is the name that appears on the leaderboard. No email, no password.
          </p>
        </>
      ) : (
        <>
          <label className="label" htmlFor="recovery">
            Recovery key
          </label>
          <input
            id="recovery"
            value={key}
            onChange={(e) => setKey(e.target.value)}
            autoComplete="off"
            placeholder="g_…"
            className="mt-1.5 w-full rounded-md border border-edge bg-panel-2 px-3 py-2 font-mono text-sm text-ink outline-none transition focus:border-cyan/60"
          />
          <p className="mt-1.5 text-xs text-muted">
            Paste the key you were given when the account was created.
          </p>
        </>
      )}

      {error && <p className="mt-2 text-xs text-rose">{error}</p>}

      <button
        type="submit"
        disabled={busy || (mode === 'create' ? handle.trim().length < 2 : key.trim().length < 8)}
        className="mt-4 w-full rounded-lg border border-cyan/50 bg-cyan/10 px-4 py-2.5 font-mono text-sm font-semibold text-cyan transition hover:bg-cyan/20 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {busy ? 'WORKING…' : mode === 'create' ? 'CREATE ACCOUNT' : 'RESTORE ACCOUNT'}
      </button>
    </form>
  );
}
