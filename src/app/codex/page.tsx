import PixelIcon from '@/components/game/PixelIcon';
import SiteNav from '@/components/SiteNav';
import {
  ADVENTURE_URL,
  TACTIC_COLOR,
  THREAT_ATTACK,
  TOWER_D3FEND,
  attackUrl,
  d3fendUrl,
} from '@/game/data/attack';
import { ALERT_FATIGUE, DEFENCE_IN_DEPTH, MAX_DEPTH_MULTIPLIER, alertFatigue } from '@/game/data/doctrine';
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

        <div className="mt-5 rounded-xl border border-violet/40 bg-violet/5 p-4">
          <div className="flex flex-wrap items-start gap-3">
            <div className="min-w-0 flex-1">
              <h2 className="font-mono text-sm font-semibold text-ink">
                Every threat and defence here is real
              </h2>
              <p className="mt-1.5 text-xs leading-relaxed text-muted">
                Threats map to MITRE ATT&amp;CK techniques and defences to MITRE D3FEND
                countermeasures, using the same dataset that powers{' '}
                <span className="text-ink">MITRE ATT&amp;CK Adventure</span>. Nothing here is
                invented: if a threat has no D3FEND coverage, this page says so rather than
                guessing.
              </p>
            </div>
            <a
              href={ADVENTURE_URL}
              className="shrink-0 rounded-lg border border-violet/50 bg-violet/10 px-4 py-2 font-mono text-xs font-semibold text-violet transition hover:bg-violet/20"
            >
              PLAY THE ADVENTURE →
            </a>
          </div>
          <p className="mt-3 text-[11px] leading-relaxed text-muted">
            Same seven D3FEND tactics the Adventure&rsquo;s Defender seat uses: Model, Harden,
            Detect, Isolate, Deceive, Evict, Restore. A firewall here is Isolate there; a honeypot
            is Deceive in both.
          </p>
        </div>

        <h2 className="label mt-10 mb-3">Doctrine</h2>
        <div className="grid gap-3 md:grid-cols-2">
          <article className="rounded-xl border border-edge bg-panel/80 p-4">
            <h3 className="font-mono text-sm font-semibold text-ink">Defence in depth</h3>
            <p className="mt-1.5 text-xs leading-relaxed text-muted">
              A threat that has already been engaged by several{' '}
              <span className="text-ink">different kinds</span> of control takes more damage from
              the next one. Ten firewalls are one layer. A firewall, an IDS and an encryption field
              are three.
            </p>
            <p className="mt-2 font-mono text-xs text-cyan">
              +{Math.round(DEFENCE_IN_DEPTH.bonusPerLayer * 100)}% per extra layer, up to ×
              {MAX_DEPTH_MULTIPLIER.toFixed(2)} at {DEFENCE_IN_DEPTH.maxLayers} layers
            </p>
            <p className="mt-2 text-[11px] leading-relaxed text-muted">
              The small marks above a threat&rsquo;s health bar count the layers it has taken so
              far. This is the main reason a varied board beats a bigger uniform one.
            </p>
          </article>

          <article className="rounded-xl border border-edge bg-panel/80 p-4">
            <h3 className="font-mono text-sm font-semibold text-ink">Alert fatigue</h3>
            <p className="mt-1.5 text-xs leading-relaxed text-muted">
              More sensors means more alerts, and past a point less attention paid to any one of
              them. Detectors past the {ALERT_FATIGUE.free}rd dilute the strength of every flag on
              the board. Detection itself never fails; only the damage bonus weakens.
            </p>
            <dl className="mt-2 space-y-0.5 font-mono text-xs">
              {[3, 5, 8, 12].map((n) => (
                <div key={n} className="flex justify-between">
                  <dt className="text-muted">{n} detectors</dt>
                  <dd className={alertFatigue(n) < 0.7 ? 'text-rose' : 'text-ink'}>
                    {Math.round(alertFatigue(n) * 100)}% flag strength
                  </dd>
                </div>
              ))}
            </dl>
            <p className="mt-2 text-[11px] leading-relaxed text-muted">
              Three upgraded sensors beat ten cheap ones, which is the right answer here and in a
              real detection programme.
            </p>
          </article>
        </div>

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

                <div className="mt-3 border-t border-edge pt-3">
                  <div className="flex items-center gap-2">
                    <span className="label">D3FEND</span>
                    <span
                      className="rounded px-1.5 py-0.5 font-mono text-[10px]"
                      style={{
                        background: `${TACTIC_COLOR[TOWER_D3FEND[id].tactic]}22`,
                        color: TACTIC_COLOR[TOWER_D3FEND[id].tactic],
                      }}
                    >
                      {TOWER_D3FEND[id].tactic}
                    </span>
                  </div>
                  <ul className="mt-1.5 space-y-0.5">
                    {TOWER_D3FEND[id].counters.map((c) => (
                      <li key={c.id} className="text-[11px]">
                        <a
                          href={d3fendUrl(c.name)}
                          className="font-mono text-muted transition hover:text-cyan"
                        >
                          {c.id}
                        </a>{' '}
                        <span className="text-muted">{c.name}</span>
                      </li>
                    ))}
                  </ul>
                </div>

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
                <Th>ATT&amp;CK</Th>
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
                    <Td>
                      <a
                        href={attackUrl(THREAT_ATTACK[id].id)}
                        className="font-mono text-[11px] text-violet transition hover:text-ink"
                      >
                        {THREAT_ATTACK[id].id}
                      </a>
                      <div className="mt-0.5 max-w-[220px] text-[11px] leading-snug text-muted">
                        {THREAT_ATTACK[id].name}
                      </div>
                      <div className="mt-0.5 max-w-[220px] text-[10px] leading-snug text-muted/70">
                        {THREAT_ATTACK[id].note}
                      </div>
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
