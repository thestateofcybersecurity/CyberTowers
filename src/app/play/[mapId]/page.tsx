import { notFound } from 'next/navigation';
import GameShell from '@/components/game/GameShell';
import type { GameMode } from '@/game/core/types';
import { getMap } from '@/game/data/maps';
import { getOperation } from '@/game/data/operations';
import { loadPlayerContext, loadSnapshot } from '@/lib/playerContext';

export const dynamic = 'force-dynamic';

interface Props {
  // Next.js 16: route params and search params are Promises.
  params: Promise<{ mapId: string }>;
  searchParams: Promise<{ mode?: string; resume?: string; op?: string }>;
}

export async function generateMetadata({ params }: Props) {
  const { mapId } = await params;
  const map = getMap(mapId);
  return { title: map ? `${map.name} · CyberTowers` : 'CyberTowers' };
}

export default async function PlayPage({ params, searchParams }: Props) {
  const { mapId } = await params;
  const query = await searchParams;

  const map = getMap(mapId);
  if (!map) notFound();

  const mode: GameMode = query.mode === 'endless' ? 'endless' : 'campaign';
  const operation = query.op ? getOperation(query.op) : undefined;
  const player = await loadPlayerContext();
  const snapshot = query.resume === '1' ? await loadSnapshot(mapId, mode) : null;

  return (
    <main className="flex-1">
      <GameShell
        map={map}
        mode={mode}
        unlocked={player.unlocked}
        signedIn={player.signedIn}
        operationId={operation?.id ?? null}
        initialSnapshot={snapshot}
      />
    </main>
  );
}
