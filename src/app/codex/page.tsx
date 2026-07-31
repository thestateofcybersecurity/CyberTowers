import PixelIcon from '@/components/game/PixelIcon';
import SiteNav from '@/components/SiteNav';
import { THREATS, THREAT_ORDER } from '@/game/data/threats';
import { TOWERS, TOWER_ORDER } from '@/game/data/towers';

export const metadata = { title: 'Codex · CyberTowers' };

/**
 * The reference sheet. Every number here is read from the same data the
 * simulation uses, so the codex cannot drift away from the game.
 */
export default function CodexPage() {
  return (
    <>
      <SiteNav />
      <main className="mx-auto w-full max-w-6xl flex-1 px-5 py-10">
        <h1 className="font-mono text-3xl font-bold tracking-tight text-ink">Codex</h1>
        <p className="mt-2 max-w-2xl text-sm leading-relaxed text-muted">
          Every defence and every threat, with the stats the simulation actually runs on. Threat
          numbers are the wave-one baseline; health and bounty scale up as a run progresses.
        </p>

        <h2 className="label mt-10 mb-3">Defences</h2>
        <div className="grid gap-3 md:grid-cols-2">
          {TOWER_ORDER.map((id) => {
            const def = TOWERS[id];
            const base = def.tiers[0];
            const max = def.tiers[def.tiers.length - 1];
            return (
              <article key={id} className="rounded-xl border border-edge bg-panel/80 p-4">
                <div className="flex items-start gap-3">
                  <PixelIcon kind="tower" id={id} tier={3} size={40} />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <h3 className="font-mono text-sm font-semibold text-ink">{def.name}</h3>
                      <span
                        className="rounded px-1.5 py-0.5 font-mono text-[10px]"
                        style={{ background: `${def.color}22`, color: def.color }}
                      >
                        {def.role}
                      </span>
                      <span className="ml-auto font-mono text-[10px] text-muted">
                        LVL {def.unlockLevel}
                      </span>
                    </div>
                    <p className="mt-1.5 text-xs leading-relaxed text-muted">{def.blurb}</p>
                  </div>
                </div>

                <dl className="mt-3 grid grid-cols-4 gap-2 border-t border-edge pt-3">
                  <Cell label="Cost" value={`${base.cost}`} />
                  <Cell label="Damage" value={`${base.damage} → ${max.damage}`} />
                  <Cell label="Range" value={`${base.range} → ${max.range}`} />
                  <Cell label="Rate" value={`${base.fireRate}/s`} />
                </dl>

                <ol className="mt-3 space-y-1">
                  {def.tiers.map((tier, i) => (
                    <li key={i} className="flex gap-2 text-[11px] leading-snug">
                      <span className="shrink-0 font-mono text-muted">MK{i + 1}</span>
                      <span className="text-muted">{tier.note}</span>
                    </li>
                  ))}
                </ol>
              </article>
            );
          })}
        </div>

        <h2 className="label mt-10 mb-3">Threats</h2>
        <div className="overflow-x-auto rounded-xl border border-edge">
          <table className="w-full min-w-[720px] text-sm">
            <thead className="bg-panel">
              <tr className="text-left">
                <Th>Threat</Th>
                <Th className="text-right">Health</Th>
                <Th className="text-right">Speed</Th>
                <Th className="text-right">Armour</Th>
                <Th className="text-right">Core dmg</Th>
                <Th className="text-right">Bounty</Th>
                <Th className="text-right">From wave</Th>
              </tr>
            </thead>
            <tbody>
              {THREAT_ORDER.map((id) => {
                const def = THREATS[id];
                return (
                  <tr key={id} className="border-t border-edge align-top odd:bg-panel/40">
                    <Td>
                      <div className="flex items-start gap-2.5">
                        <PixelIcon kind="threat" id={id} size={28} className="mt-0.5 shrink-0" />
                        <div className="min-w-0">
                          <div className="font-mono text-xs text-ink">{def.name}</div>
                          <p className="mt-0.5 max-w-md text-[11px] leading-snug text-muted">
                            {def.blurb}
                          </p>
                        </div>
                      </div>
                    </Td>
                    <Td className="text-right font-mono tabular-nums text-ink">{def.health}</Td>
                    <Td className="text-right font-mono tabular-nums text-muted">{def.speed}</Td>
                    <Td className="text-right font-mono tabular-nums text-muted">{def.armor}</Td>
                    <Td className="text-right font-mono tabular-nums text-rose">{def.damage}</Td>
                    <Td className="text-right font-mono tabular-nums text-amber">{def.bounty}</Td>
                    <Td className="text-right font-mono tabular-nums text-muted">
                      {Number.isFinite(def.minWave) ? def.minWave : '—'}
                    </Td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </main>
    </>
  );
}

function Cell({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="label">{label}</dt>
      <dd className="font-mono text-xs text-ink">{value}</dd>
    </div>
  );
}

function Th({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return <th className={`label px-3 py-2.5 ${className}`}>{children}</th>;
}

function Td({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return <td className={`px-3 py-2.5 ${className}`}>{children}</td>;
}
