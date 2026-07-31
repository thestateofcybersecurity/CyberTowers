'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';

/** Clears a handle account's cookie. OAuth sessions use Auth.js's own route. */
export default function SignOutButton() {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  return (
    <button
      type="button"
      disabled={busy}
      onClick={async () => {
        setBusy(true);
        await fetch('/api/guest', { method: 'DELETE' }).catch(() => {});
        router.push('/');
        router.refresh();
      }}
      className="text-sm text-muted transition hover:text-ink disabled:opacity-50"
    >
      Sign out
    </button>
  );
}
