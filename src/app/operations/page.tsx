import Link from 'next/link';
import PixelIcon from '@/components/game/PixelIcon';
import SiteNav from '@/components/SiteNav';
import { attackUrl, THREAT_ATTACK } from '@/game/data/attack';
import { getMap } from '@/game/data/maps';
import {
  OPERATIONS,
  TIER_LABEL,
  TIER_ORDER,
  groupUrl,
  operationSource,
  operationsByTier,
  type Operation,
} from '@/game/data/operations';
import { THREATS } from '@/game/data/threats';
import { loadPlayerContext } from '@/lib/playerContext';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Operations · CyberTowers' };

const TIER_COLOR: Record<string, string> = {
  espionage: '#a78bfa',
  financial: '#fbbf24',
  disruption: '#f87171',
  capstone: '#22d3ee',
};

export default async function OperationsPage() {
  const player = await loadPlayerContext();

  const clearedGroup = (groupId: string): boolean => {
    const op = OPERATIONS.find((o) => o.groupId === groupId);
    return op ? Boolean(player.campaign[`op:${op.id}`]?.cleared) : false;
  };

  return (
    <>
      <SiteNav />
      <main className="mx-auto w-full max-w-6xl flex-1 px-5 py-10">
        <h1 className="font-mono text-3xl font-bold tracking-tight text-ink">Operations</h1>
        <p className="mt-2 max-w-3xl text-sm leading-relaxed text-muted">
          Campaigns against documented threat groups. Each one&rsquo;s wave roster is weighted by
          what that actor actually does, derived from its MITRE ATT&amp;CK technique list, so a
          phishing operation floods the perimeter and a destructive one arrives armoured and slow.
          The composition is the lesson.
        </p>

        {TIER_ORDER.map((tier) => {
          const ops = operationsByTier(tier);
          if (ops.length === 0) return null;
          return (
            <section key={tier} className="mt-9">
              <div className="mb-3 flex items-center gap-2">
                <span
                  className="rounded px-2 py-0.5 font-mono text-[10px] font-semibold"
                  style={{ background: `${TIER_COLOR[tier]}22`, color: TIER_COLOR[tier] }}
                >
                  {TIER_LABEL[tier].toUpperCase()}
                </span>
                <span className="h-px flex-1 bg-edge" />
              </div>

              <div className="grid gap-4 lg:grid-cols-2">
                {ops.map((op) => (
                  <OperationCard
                    key={op.id}
                    op={op}
                    locked={
                      player.signedIn && op.unlockAfter !== null && !clearedGroup(op.unlockAfter)
                    }
                    record={player.campaign[`op:${op.id}`]}
                  />
                ))}
              </div>
            </section>
          );
        })}
      </main>
    </>
  );
}

function OperationCard({
  op,
  locked,
  record,
}: {
  op: Operation;
  locked: boolean;
  record?: { bestWave: number; bestScore: number; cleared: boolean };
}) {
  const src = operationSource(op);
  const map = getMap(op.mapId);
  const prerequisite = op.unlockAfter
    ? OPERATIONS.find((o) => o.groupId === op.unlockAfter)
    : null;

  return (
    <article
      className={`flex flex-col rounded-xl border bg-panel/80 p-5 transition ${
        locked ? 'border-edge/60 opacity-60' : 'border-edge hover:border-cyan/50'
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 className="font-mono text-lg font-semibold text-ink">{op.name}</h2>
          <p className="label mt-0.5 normal-case tracking-normal">
            {src?.actor}
            {src?.aliases.length ? ` · also ${src.aliases.slice(0, 2).join(', ')}` : ''}
          </p>
        </div>
        {src && (
          <a
            href={groupUrl(op.groupId)}
            className="shrink-0 font-mono text-[10px] text-violet transition hover:text-ink"
          >
            {op.groupId} →
          </a>
        )}
      </div>

      <p className="mt-3 text-sm leading-relaxed text-muted">{op.brief}</p>
      <p className="mt-2 text-xs leading-relaxed text-cyan">{op.signature}</p>

      {src && (
        <div className="mt-3 border-t border-edge pt-3">
          <div className="label mb-1.5">
            Expect most of · derived from {src.techniqueCount} documented techniques
          </div>
          <div className="flex flex-wrap gap-2">
            {src.signature.map((threat) => {
              const def = THREATS[threat];
              if (!def) return null;
              return (
                <a
                  key={threat}
                  href={attackUrl(THREAT_ATTACK[threat].id)}
                  title={`${def.name} · ${THREAT_ATTACK[threat].name}`}
                  className="flex items-center gap-1.5 rounded-md border border-edge bg-panel-2/60 px-2 py-1 transition hover:border-violet/50"
                >
                  <PixelIcon kind="threat" id={threat} size={18} />
                  <span className="font-mono text-[10px] text-ink">{def.name}</span>
                  <span className="font-mono text-[10px] text-muted">
                    {Math.round((src.weights[threat] ?? 0) * 100)}%
                  </span>
                </a>
              );
            })}
          </div>
        </div>
      )}

      <dl className="mt-3 grid grid-cols-3 gap-2 border-t border-edge pt-3">
        <Meta label="Board" value={map?.name ?? op.mapId} />
        <Meta label="Waves" value={String(op.waveCount)} />
        <Meta label="Best" value={record ? `W${record.bestWave}` : '—'} />
      </dl>

      {locked ? (
        <p className="mt-3 rounded-lg border border-edge bg-panel-2/50 px-3 py-2 text-center font-mono text-xs text-muted">
          🔒 Clear {prerequisite?.name ?? 'the previous operation'} first
        </p>
      ) : (
        <Link
          href={`/play/${op.mapId}?mode=campaign&op=${op.id}`}
          className="mt-3 rounded-lg border border-cyan/50 bg-cyan/10 px-3 py-2 text-center font-mono text-xs font-semibold text-cyan transition hover:bg-cyan/20"
        >
          RUN OPERATION
        </Link>
      )}

      {record?.cleared && (
        <p className="mt-2 text-center font-mono text-[10px] text-lime">
          ✓ CONTAINED · best score {record.bestScore.toLocaleString()}
        </p>
      )}
    </article>
  );
}

function Meta({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="label">{label}</dt>
      <dd className="truncate font-mono text-sm text-ink">{value}</dd>
    </div>
  );
}
