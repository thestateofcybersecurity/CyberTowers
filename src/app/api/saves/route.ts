import type { GameMode } from '@/game/core/types';
import { saves } from '@/lib/mongo';
import { jsonError, requireUser } from '@/lib/session';
import { snapshotSchema } from '@/lib/validation';

export const dynamic = 'force-dynamic';

function readQuery(request: Request): { mapId: string; mode: GameMode } | null {
  const url = new URL(request.url);
  const mapId = url.searchParams.get('mapId');
  const mode = url.searchParams.get('mode');
  if (!mapId || (mode !== 'campaign' && mode !== 'endless')) return null;
  return { mapId, mode };
}

/** Returns the cloud save for one map/mode, or every save when unqualified. */
export async function GET(request: Request) {
  const { user, error } = await requireUser();
  if (error) return error;

  const col = await saves();
  const query = readQuery(request);

  if (!query) {
    const all = await col.find({ userId: user.id }).sort({ updatedAt: -1 }).toArray();
    return Response.json({
      saves: all.map((s) => ({
        mapId: s.mapId,
        mode: s.mode,
        wave: s.snapshot.wave,
        score: s.snapshot.score,
        updatedAt: s.updatedAt,
      })),
    });
  }

  const doc = await col.findOne({ userId: user.id, mapId: query.mapId, mode: query.mode });
  return Response.json({ snapshot: doc?.snapshot ?? null, updatedAt: doc?.updatedAt ?? null });
}

export async function PUT(request: Request) {
  const { user, error } = await requireUser();
  if (error) return error;

  const body = await request.json().catch(() => null);
  const parsed = snapshotSchema.safeParse(body);
  if (!parsed.success) return jsonError('Invalid snapshot', 400);

  const snapshot = parsed.data;
  const col = await saves();
  await col.updateOne(
    { userId: user.id, mapId: snapshot.mapId, mode: snapshot.mode },
    {
      $set: {
        // Cast is safe: the zod schema mirrors RunSnapshot field for field.
        snapshot: snapshot as unknown as import('@/game/core/types').RunSnapshot,
        updatedAt: new Date(),
      },
      $setOnInsert: { userId: user.id, mapId: snapshot.mapId, mode: snapshot.mode },
    },
    { upsert: true },
  );

  return Response.json({ ok: true });
}

export async function DELETE(request: Request) {
  const { user, error } = await requireUser();
  if (error) return error;

  const query = readQuery(request);
  if (!query) return jsonError('mapId and mode are required', 400);

  const col = await saves();
  await col.deleteOne({ userId: user.id, mapId: query.mapId, mode: query.mode });
  return Response.json({ ok: true });
}
