import Link from 'next/link';
import SiteNav from '@/components/SiteNav';
import type { GameMode } from '@/game/core/types';
import { MAPS, getMap } from '@/game/data/maps';
import { isMongoConfigured, scores } from '@/lib/mongo';
import { currentUser } from '@/lib/session';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Leaderboard · CyberTowers' };

interface Props {
  searchParams: Promise<{ mapId?: string; mode?: string }>;
}

interface Row {
  userId: string;
  handle: string;
  score: number;
  wave: number;
  mapId: string;
  mode: GameMode;
  victory: boolean;
  elapsed: number;
}

export default async function LeaderboardPage({ searchParams }: Props) {
  const query = await searchParams;
  const mapId = query.mapId && getMap(query.mapId) ? query.mapId : undefined;
  const mode: GameMode | undefined =
    query.mode === 'campaign' || query.mode === 'endless' ? query.mode : undefined;

  const configured = isMongoConfigured();
  let rows: Row[] = [];
  let me: string | null = null;

  if (configured) {
    try {
      const col = await scores();
      const match: Record<string, unknown> = {};
      if (mapId) match.mapId = mapId;
      if (mode) match.mode = mode;

      // One row per player: their best run on this board, not every attempt.
      const docs = await col
        .aggregate([
          { $match: match },
          { $sort: { score: -1 } },
          {
            $group: {
              _id: '$userId',
              handle: { $first: '$handle' },
              score: { $first: '$score' },
              wave: { $first: '$wave' },
              mapId: { $first: '$mapId' },
              mode: { $first: '$mode' },
              victory: { $first: '$victory' },
              elapsed: { $first: '$elapsed' },
            },
          },
          { $sort: { score: -1 } },
          { $limit: 50 },
        ])
        .toArray();

      rows = docs.map((d) => ({
        userId: String(d._id),
        handle: d.handle,
        score: d.score,
        wave: d.wave,
        mapId: d.mapId,
        mode: d.mode,
        victory: d.victory,
        elapsed: d.elapsed,
      }));

      me = (await currentUser())?.id ?? null;
    } catch (error) {
      console.error('Leaderboard query failed:', error);
    }
  }

  return (
    <>
      <SiteNav />
      <main className="mx-auto w-full max-w-5xl flex-1 px-5 py-10">
        <h1 className="font-mono text-3xl font-bold tracking-tight text-ink">Leaderboard</h1>
        <p className="mt-2 text-sm text-muted">
          Best run per operator. Submissions are checked against what the wave generator could
          actually have produced before they are accepted.
        </p>

        <div className="mt-6 flex flex-wrap gap-2">
          <Filter href="/leaderboard" label="All boards" active={!mapId && !mode} />
          {(['campaign', 'endless'] as const).map((m) => (
            <Filter
              key={m}
              href={`/leaderboard?mode=${m}`}
              label={m === 'campaign' ? 'Campaign' : 'Endless'}
              active={mode === m && !mapId}
            />
          ))}
          {MAPS.map((map) => (
            <Filter
              key={map.id}
              href={`/leaderboard?mapId=${map.id}`}
              label={map.name}
              active={mapId === map.id}
            />
          ))}
        </div>

        {!configured ? (
          <Empty>
            MongoDB is not configured on this deployment. Set <code>MONGODB_URI</code> to enable
            scores.
          </Empty>
        ) : rows.length === 0 ? (
          <Empty>
            No runs posted yet.{' '}
            <Link href="/" className="text-cyan underline underline-offset-2">
              Be the first.
            </Link>
          </Empty>
        ) : (
          <div className="mt-6 overflow-hidden rounded-xl border border-edge">
            <table className="w-full text-sm">
              <thead className="bg-panel">
                <tr className="text-left">
                  <Th className="w-14">#</Th>
                  <Th>Operator</Th>
                  <Th>Board</Th>
                  <Th className="text-right">Wave</Th>
                  <Th className="text-right">Time</Th>
                  <Th className="text-right">Score</Th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row, i) => {
                  const map = getMap(row.mapId);
                  const isYou = me === row.userId;
                  return (
                    <tr
                      key={row.userId}
                      className={`border-t border-edge ${isYou ? 'bg-cyan/10' : 'odd:bg-panel/40'}`}
                    >
                      <Td className="font-mono text-muted">{i + 1}</Td>
                      <Td>
                        <span className="text-ink">{row.handle}</span>
                        {isYou && <span className="ml-2 font-mono text-[10px] text-cyan">YOU</span>}
                        {row.victory && (
                          <span className="ml-2 font-mono text-[10px] text-lime">CLEARED</span>
                        )}
                      </Td>
                      <Td className="text-muted">
                        {map?.name ?? row.mapId}
                        <span className="ml-1.5 font-mono text-[10px] uppercase text-muted/70">
                          {row.mode}
                        </span>
                      </Td>
                      <Td className="text-right font-mono tabular-nums text-ink">{row.wave}</Td>
                      <Td className="text-right font-mono tabular-nums text-muted">
                        {formatDuration(row.elapsed)}
                      </Td>
                      <Td className="text-right font-mono tabular-nums font-semibold text-amber">
                        {row.score.toLocaleString()}
                      </Td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </main>
    </>
  );
}

function Filter({ href, label, active }: { href: string; label: string; active: boolean }) {
  return (
    <Link
      href={href}
      className={`rounded-md border px-3 py-1.5 font-mono text-xs transition ${
        active
          ? 'border-cyan/50 bg-cyan/10 text-cyan'
          : 'border-edge text-muted hover:bg-panel-2 hover:text-ink'
      }`}
    >
      {label}
    </Link>
  );
}

function Empty({ children }: { children: React.ReactNode }) {
  return (
    <div className="mt-6 rounded-xl border border-edge bg-panel/60 px-5 py-10 text-center text-sm text-muted">
      {children}
    </div>
  );
}

function Th({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return <th className={`px-4 py-2.5 label ${className}`}>{children}</th>;
}

function Td({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return <td className={`px-4 py-2.5 ${className}`}>{children}</td>;
}

function formatDuration(seconds: number): string {
  const m = Math.floor(seconds / 60);
  return `${m}:${String(seconds % 60).padStart(2, '0')}`;
}
