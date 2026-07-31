'use client';

import { createAuthClient } from '@neondatabase/auth/next';

import { useRouter } from 'next/navigation';
import { useState } from 'react';

/** Two-step account deletion: reveal, then type the confirmation word. */
export default function DeleteAccount({
  handle,
  kind,
}: {
  handle: string;
  kind: 'neon' | 'handle';
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [typed, setTyped] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  async function remove() {
    setBusy(true);
    setError('');
    try {
      const response = await fetch('/api/account?confirm=DELETE', { method: 'DELETE' });
      const data = await response.json();
      if (!response.ok) {
        setError(data.error ?? 'Could not delete the account.');
        return;
      }
      // Neon Auth owns the session; without ending it here the next request
      // would be handed a brand new empty profile and the deletion would look
      // like it had not worked.
      if (kind === 'neon') {
        await createAuthClient()
          .signOut()
          .catch(() => {});
      }

      router.push('/');
      router.refresh();
    } catch {
      setError('Network error.');
    } finally {
      setBusy(false);
    }
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="mt-3 text-xs text-muted underline underline-offset-2 transition hover:text-rose"
      >
        {kind === 'handle' ? 'Delete this account' : 'Delete my game data'}
      </button>
    );
  }

  return (
    <div className="mt-3 rounded-lg border border-rose/40 bg-rose/5 p-3">
      <p className="text-xs leading-relaxed text-ink">
        {kind === 'handle' ? (
          <>
            This permanently deletes <span className="font-mono">{handle}</span>, its cloud saves
            and its leaderboard entries. It cannot be undone, and the recovery key will stop
            working.
          </>
        ) : (
          <>
            This permanently deletes the progress, cloud saves and leaderboard entries for{' '}
            <span className="font-mono">{handle}</span>, and signs you out. Your login itself is
            managed by Neon Auth and is not removed — signing back in starts you from zero.
          </>
        )}
      </p>
      <label className="label mt-2 block" htmlFor="confirm-delete">
        Type DELETE to confirm
      </label>
      <input
        id="confirm-delete"
        value={typed}
        onChange={(e) => setTyped(e.target.value)}
        autoComplete="off"
        className="mt-1 w-full rounded-md border border-edge bg-panel-2 px-3 py-1.5 font-mono text-xs text-ink outline-none focus:border-rose/60"
      />
      {error && <p className="mt-1.5 text-xs text-rose">{error}</p>}
      <div className="mt-2 flex gap-2">
        <button
          type="button"
          onClick={remove}
          disabled={typed !== 'DELETE' || busy}
          className="rounded-md border border-rose/50 bg-rose/10 px-3 py-1.5 font-mono text-xs font-semibold text-rose transition hover:bg-rose/20 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {busy ? 'DELETING…' : 'DELETE PERMANENTLY'}
        </button>
        <button
          type="button"
          onClick={() => {
            setOpen(false);
            setTyped('');
            setError('');
          }}
          className="rounded-md border border-edge px-3 py-1.5 font-mono text-xs text-muted transition hover:text-ink"
        >
          CANCEL
        </button>
      </div>
    </div>
  );
}
