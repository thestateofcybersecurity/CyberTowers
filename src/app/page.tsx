import Link from 'next/link';
import MapThumb from '@/components/MapThumb';
import SiteNav from '@/components/SiteNav';
import { MAPS } from '@/game/data/maps';
import { levelProgress, nextUnlock } from '@/game/data/progression';
import { TOWERS } from '@/game/data/towers';
import { loadPlayerContext } from '@/lib/playerContext';

export const dynamic = 'force-dynamic';

export default async function HomePage() {
  const player = await loadPlayerContext();
  const progress = levelProgress(player.xp);
  const upcoming = nextUnlock(player.level);

  return (
    <>
      <SiteNav />
      <main className="mx-auto w-full max-w-7xl flex-1 px-5 py-10">
        <section className="mb-10">
          <p className="label">Cybersecurity tower defence</p>
          <h1 className="mt-2 max-w-3xl font-mono text-4xl font-bold leading-tight tracking-tight text-ink sm:text-5xl">
            Hostile traffic is already on the wire.
          </h1>
          <p className="mt-3 max-w-2xl text-base leading-relaxed text-muted">
            Place firewalls, intrusion detection, encryption fields and AI sentinels along the
            network path. Every threat behaves like the real thing: ransomware is armoured,
            rootkits are invisible until something detects them, and a zero-day does not care
            about your rule sets.
          </p>

          <div className="mt-6 flex flex-wrap items-center gap-4">
            <div className="rounded-xl border border-edge bg-panel/80 px-4 py-3">
              <div className="label">Clearance level</div>
              <div className="mt-0.5 flex items-baseline gap-2">
                <span className="font-mono text-2xl font-bold text-cyan">{player.level}</span>
                <span className="text-xs text-muted">{player.xp.toLocaleString()} XP</span>
              </div>
              <div className="mt-2 h-1 w-40 overflow-hidden rounded-full bg-edge">
                <div
                  className="h-full rounded-full bg-cyan"
                  style={{ width: `${Math.min(100, (progress.into / progress.span) * 100)}%` }}
                />
              </div>
            </div>

            {upcoming && (
              <div className="rounded-xl border border-edge bg-panel/80 px-4 py-3">
                <div className="label">Next unlock</div>
                <div className="mt-0.5 font-mono text-sm text-ink">
                  {TOWERS[upcoming.tower].name}
                </div>
                <div className="text-xs text-muted">at clearance level {upcoming.atLevel}</div>
              </div>
            )}

            {!player.signedIn && (
              <div className="rounded-xl border border-amber/40 bg-amber/10 px-4 py-3 text-sm text-amber">
                Playing as a guest. Sign in to keep progress, cloud saves and leaderboard ranks.
              </div>
            )}
          </div>
        </section>

        <section>
          <h2 className="label mb-3">Missions</h2>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {MAPS.map((map) => {
              const record = player.campaign[map.id];
              const prerequisite = map.unlockAfter;
              // Guests get every map: gating progression behind an account for
              // someone just trying the game is a bad first impression.
              const locked =
                player.signedIn &&
                prerequisite !== null &&
                !player.campaign[prerequisite]?.cleared;

              return (
                <article
                  key={map.id}
                  className={`flex flex-col overflow-hidden rounded-xl border bg-panel/80 transition ${
                    locked ? 'border-edge/60 opacity-60' : 'border-edge hover:border-cyan/50'
                  }`}
                >
                  <div className="p-3 pb-0">
                    <MapThumb map={map} />
                  </div>

                  <div className="flex flex-1 flex-col p-4">
                    <div className="flex items-start justify-between gap-2">
                      <h3 className="font-mono text-base font-semibold text-ink">{map.name}</h3>
                      <Difficulty level={map.difficulty} />
                    </div>

                    <p className="mt-2 flex-1 text-sm leading-relaxed text-muted">{map.brief}</p>

                    <dl className="mt-3 grid grid-cols-3 gap-2 border-t border-edge pt-3">
                      <Meta label="Lanes" value={String(map.lanes.length)} />
                      <Meta label="Waves" value={String(map.waveCount)} />
                      <Meta label="Best" value={record ? `W${record.bestWave}` : '—'} />
                    </dl>

                    {locked ? (
                      <p className="mt-3 rounded-lg border border-edge bg-panel-2/50 px-3 py-2 text-center font-mono text-xs text-muted">
                        🔒 Clear {MAPS.find((m) => m.id === prerequisite)?.name} first
                      </p>
                    ) : (
                      <div className="mt-3 flex gap-2">
                        <Link
                          href={`/play/${map.id}?mode=campaign`}
                          className="flex-1 rounded-lg border border-cyan/50 bg-cyan/10 px-3 py-2 text-center font-mono text-xs font-semibold text-cyan transition hover:bg-cyan/20"
                        >
                          CAMPAIGN
                        </Link>
                        <Link
                          href={`/play/${map.id}?mode=endless`}
                          className="rounded-lg border border-edge px-3 py-2 text-center font-mono text-xs text-muted transition hover:bg-panel-2 hover:text-ink"
                        >
                          ENDLESS
                        </Link>
                      </div>
                    )}

                    {record?.cleared && (
                      <p className="mt-2 text-center font-mono text-[10px] text-lime">
                        ✓ CLEARED · best score {record.bestScore.toLocaleString()}
                      </p>
                    )}
                  </div>
                </article>
              );
            })}
          </div>
        </section>
      </main>

      <footer className="border-t border-edge px-5 py-6 text-center text-xs text-muted">
        Built with Next.js on Vercel · Auth on Neon Postgres · Game data on MongoDB
      </footer>
    </>
  );
}

function Difficulty({ level }: { level: number }) {
  return (
    <span className="flex shrink-0 gap-0.5" title={`Difficulty ${level} of 5`}>
      {Array.from({ length: 5 }, (_, i) => (
        <span key={i} className={`h-1.5 w-1.5 rounded-full ${i < level ? 'bg-rose' : 'bg-edge'}`} />
      ))}
    </span>
  );
}

function Meta({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="label">{label}</dt>
      <dd className="font-mono text-sm text-ink">{value}</dd>
    </div>
  );
}
