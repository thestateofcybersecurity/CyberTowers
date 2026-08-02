import Link from 'next/link';
import PixelIcon from '@/components/game/PixelIcon';
import SiteNav from '@/components/SiteNav';
import { getMap } from '@/game/data/maps';
import { OPERATIONS, groupUrl, operationSource } from '@/game/data/operations';
import { THREATS } from '@/game/data/threats';
import { POSTURES } from '@/game/engine/ai';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Infiltrate · CyberTowers' };

/**
 * The attacker seat. You pick whose tradecraft to borrow and which network to
 * run it against; the posture decides what the target is bad at, which is the
 * whole read.
 */
export default function InfiltratePage() {
  return (
    <>
      <SiteNav />
      <main className="mx-auto w-full max-w-6xl flex-1 px-5 py-10">
        <p className="label">Red team</p>
        <h1 className="mt-2 font-mono text-3xl font-bold tracking-tight text-ink">Infiltrate</h1>
        <p className="mt-2 max-w-3xl text-sm leading-relaxed text-muted">
          Flip the board. The network is already built and it reinforces after every wave, so you
          have twelve attempts to take the core down. Spend intel composing each intrusion, and
          read what the target is bad at before you commit to a shape.
        </p>

        <h2 className="label mt-9 mb-3">Choose whose tradecraft to borrow</h2>
        <div className="grid gap-4 lg:grid-cols-2">
          {OPERATIONS.map((op) => {
            const src = operationSource(op);
            const map = getMap(op.mapId);
            if (!src || !map) return null;
            return (
              <article key={op.id} className="rounded-xl border border-edge bg-panel/80 p-5">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <h3 className="font-mono text-base font-semibold text-ink">{src.actor}</h3>
                    <p className="label mt-0.5 normal-case tracking-normal">{op.name}</p>
                  </div>
                  <a
                    href={groupUrl(op.groupId)}
                    className="shrink-0 font-mono text-[10px] text-violet transition hover:text-ink"
                  >
                    {op.groupId} →
                  </a>
                </div>

                <p className="mt-2 text-xs leading-relaxed text-muted">
                  Their own tradecraft costs ~30% less intel to field.
                </p>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {src.signature
                    .filter((t) => THREATS[t] && Number.isFinite(THREATS[t].minWave))
                    .map((t) => (
                      <span
                        key={t}
                        className="flex items-center gap-1 rounded border border-cyan/30 bg-cyan/5 px-1.5 py-0.5"
                      >
                        <PixelIcon kind="threat" id={t} size={14} />
                        <span className="font-mono text-[10px] text-cyan">{THREATS[t].name}</span>
                      </span>
                    ))}
                </div>

                <div className="mt-3 border-t border-edge pt-3">
                  <div className="label mb-1.5">Run against</div>
                  <div className="grid grid-cols-2 gap-1.5">
                    {POSTURES.map((posture) => (
                      <Link
                        key={posture.id}
                        href={`/infiltrate/${op.id}?posture=${posture.id}`}
                        title={`${posture.blurb} — ${posture.weakness}`}
                        className="rounded-md border border-edge bg-panel-2/60 px-2 py-1.5 text-center font-mono text-[10px] text-muted transition hover:border-rose/50 hover:text-rose"
                      >
                        {posture.name}
                      </Link>
                    ))}
                  </div>
                  <p className="mt-2 font-mono text-[10px] text-muted">on {map.name}</p>
                </div>
              </article>
            );
          })}
        </div>
      </main>
    </>
  );
}
