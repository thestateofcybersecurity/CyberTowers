'use client';

import { useState } from 'react';

export default function HandleEditor({ initial }: { initial: string }) {
  const [handle, setHandle] = useState(initial);
  const [state, setState] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const [message, setMessage] = useState('');

  async function save(event: React.FormEvent) {
    event.preventDefault();
    setState('saving');
    try {
      const response = await fetch('/api/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ handle }),
      });
      const data = await response.json();
      if (!response.ok) {
        setState('error');
        setMessage(data.error ?? 'Could not save handle.');
        return;
      }
      setState('saved');
      setMessage('Saved. New scores will use this name.');
    } catch {
      setState('error');
      setMessage('Network error.');
    }
  }

  return (
    <form onSubmit={save} className="mt-3">
      <label className="label" htmlFor="handle">
        Leaderboard handle
      </label>
      <div className="mt-1.5 flex gap-2">
        <input
          id="handle"
          value={handle}
          onChange={(e) => {
            setHandle(e.target.value);
            setState('idle');
          }}
          maxLength={24}
          className="min-w-0 flex-1 rounded-md border border-edge bg-panel-2 px-3 py-2 font-mono text-sm text-ink outline-none transition focus:border-cyan/60"
        />
        <button
          type="submit"
          disabled={state === 'saving' || handle === initial || handle.trim().length < 2}
          className="rounded-md border border-cyan/50 bg-cyan/10 px-4 py-2 font-mono text-xs font-semibold text-cyan transition hover:bg-cyan/20 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {state === 'saving' ? 'SAVING' : 'SAVE'}
        </button>
      </div>
      {message && (
        <p className={`mt-1.5 text-xs ${state === 'error' ? 'text-rose' : 'text-lime'}`}>
          {message}
        </p>
      )}
    </form>
  );
}
