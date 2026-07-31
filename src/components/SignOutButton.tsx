'use client';

import { createAuthClient } from '@neondatabase/auth/next';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

/**
 * Signing out differs by identity source: Neon Auth revokes its session through
 * the SDK, handle accounts just drop their cookie. Neither is a GET link, which
 * is the point — signing out should not happen because something prefetched a
 * URL.
 */
export default function SignOutButton({ kind }: { kind: 'neon' | 'handle' }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  return (
    <button
      type="button"
      disabled={busy}
      onClick={async () => {
        setBusy(true);
        try {
          if (kind === 'neon') {
            await createAuthClient().signOut();
          } else {
            await fetch('/api/guest', { method: 'DELETE' });
          }
        } catch {
          // Falling through to the redirect is still the right outcome: the
          // user asked to leave, so take them out of the signed-in views.
        }
        router.push('/');
        router.refresh();
      }}
      className="text-sm text-muted transition hover:text-ink disabled:opacity-50"
    >
      Sign out
    </button>
  );
}
