import { notFound } from 'next/navigation';
import AttackShell from '@/components/game/AttackShell';
import { getMap } from '@/game/data/maps';
import { getOperation } from '@/game/data/operations';
import { loadPlayerContext } from '@/lib/playerContext';

export const dynamic = 'force-dynamic';

interface Props {
  params: Promise<{ opId: string }>;
  searchParams: Promise<{ posture?: string }>;
}

export async function generateMetadata({ params }: Props) {
  const { opId } = await params;
  const op = getOperation(opId);
  return { title: op ? `Infiltrate ${op.name} · CyberTowers` : 'Infiltrate · CyberTowers' };
}

export default async function InfiltrateRunPage({ params, searchParams }: Props) {
  const { opId } = await params;
  const query = await searchParams;

  const operation = getOperation(opId);
  if (!operation) notFound();
  const map = getMap(operation.mapId);
  if (!map) notFound();

  const player = await loadPlayerContext();

  return (
    <main className="flex-1">
      <AttackShell
        map={map}
        operationId={operation.id}
        postureId={query.posture ?? 'balanced'}
        signedIn={player.signedIn}
      />
    </main>
  );
}
