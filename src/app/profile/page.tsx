import Link from 'next/link';
import { redirect } from 'next/navigation';
import PixelIcon from '@/components/game/PixelIcon';
import DeleteAccount from '@/components/DeleteAccount';
import HandleEditor from '@/components/HandleEditor';
import SiteNav from '@/components/SiteNav';
import { getMap } from '@/game/data/maps';
import { MAX_LEVEL, levelProgress, nextUnlock } from '@/game/data/progression';
import { TOWERS, TOWER_ORDER } from '@/game/data/towers';
import { isMongoConfigured, saves } from '@/lib/mongo';
import { loadPlayerContext } from '@/lib/playerContext';
import { currentUser } from '@/lib/session';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Profile · CyberTowers' };

export default async function ProfilePage() {
  const player = await loadPlayerContext();
  if (!player.signedIn) redirect('/signin');

  const progress = levelProgress(player.xp);
  const upcoming = nextUnlock(player.level);

  let cloudSaves: Array<{ mapId: string; mode: string; wave: number; score: number }> = [];
  if (isMongoConfigured()) {
    const user = await currentUser();
    if (user) {
      const col = await saves();
      const docs = await col.find({ userId: user.id }).sort({ updatedAt: -1 }).toArray();
      cloudSaves = docs.map((d) => ({
        mapId: d.mapId,
        mode: d.mode,
        wave: d.snapshot.wave,
        score: d.snapshot.score,
      }));
    }
  }

  return (
    <>
      <SiteNav />
      <main className="mx-auto w-full max-w-5xl flex-1 px-5 py-10">
        <h1 className="font-mono text-3xl font-bold tracking-tight text-ink">{player.handle}</h1>

        <div className="mt-6 grid gap-4 lg:grid-cols-3">
          <section className="rounded-xl border border-edge bg-panel/80 p-5 lg:col-span-1">
            <div className="label">Clearance</div>
            <div className="mt-1 flex items-baseline gap-2">
              <span className="font-mono text-4xl font-bold text-cyan">{player.level}</span>
              <span className="text-sm text-muted">of {MAX_LEVEL}</span>
            </div>
            <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-edge">
              <div
                className="h-full rounded-full bg-cyan"
                style={{ width: `${Math.min(100, (progress.into / progress.span) * 100)}%` }}
              />
            </div>
            <p className="mt-1.5 font-mono text-xs text-muted">
              {player.xp.toLocaleString()} XP
              {player.level < MAX_LEVEL &&
                ` · ${(progress.span - progress.into).toLocaleString()} to next level`}
            </p>

            <HandleEditor initial={player.handle} />
            <DeleteAccount handle={player.handle} kind={player.kind} />
          </section>

          <section className="rounded-xl border border-edge bg-panel/80 p-5 lg:col-span-2">
            <div className="label">Career</div>
            <dl className="mt-3 grid grid-cols-2 gap-4 sm:grid-cols-4">
              <Stat label="Runs" value={player.stats?.runs ?? 0} />
              <Stat label="Waves cleared" value={player.stats?.wavesCleared ?? 0} />
              <Stat label="Threats killed" value={player.stats?.threatsKilled ?? 0} />
              <Stat label="Best endless" value={player.stats?.bestEndlessWave ?? 0} />
            </dl>

            <div className="label mt-6">Defences unlocked</div>
            <div className="mt-2 flex flex-wrap gap-2">
              {TOWER_ORDER.map((id) => {
                const owned = player.unlocked.includes(id);
                return (
                  <div
                    key={id}
                    title={
                      owned ? TOWERS[id].name : `${TOWERS[id].name} · level ${TOWERS[id].unlockLevel}`
                    }
                    className={`flex items-center gap-2 rounded-lg border px-2.5 py-1.5 ${
                      owned ? 'border-edge bg-panel-2/60' : 'border-edge/50 opacity-40'
                    }`}
                  >
                    <PixelIcon kind="tower" id={id} size={20} />
                    <span className="font-mono text-xs text-ink">{TOWERS[id].name}</span>
                  </div>
                );
              })}
            </div>
            {upcoming && (
              <p className="mt-2 text-xs text-muted">
                Next: <span className="text-ink">{TOWERS[upcoming.tower].name}</span> at clearance
                level {upcoming.atLevel}.
              </p>
            )}
          </section>
        </div>

        <section className="mt-4 rounded-xl border border-edge bg-panel/80 p-5">
          <div className="label">Cloud saves</div>
          {cloudSaves.length === 0 ? (
            <p className="mt-2 text-sm text-muted">
              No saved runs yet. Progress autosaves at the end of every wave.
            </p>
          ) : (
            <ul className="mt-3 divide-y divide-edge">
              {cloudSaves.map((save) => {
                const map = getMap(save.mapId);
                return (
                  <li
                    key={`${save.mapId}:${save.mode}`}
                    className="flex flex-wrap items-center gap-3 py-2.5"
                  >
                    <span className="font-mono text-sm text-ink">{map?.name ?? save.mapId}</span>
                    <span className="font-mono text-[10px] uppercase text-muted">{save.mode}</span>
                    <span className="font-mono text-xs text-muted">
                      wave {save.wave} · {save.score.toLocaleString()} pts
                    </span>
                    <Link
                      href={`/play/${save.mapId}?mode=${save.mode}&resume=1`}
                      className="ml-auto rounded-md border border-cyan/50 bg-cyan/10 px-3 py-1.5 font-mono text-xs text-cyan transition hover:bg-cyan/20"
                    >
                      RESUME
                    </Link>
                  </li>
                );
              })}
            </ul>
          )}
        </section>

        <section className="mt-4 rounded-xl border border-edge bg-panel/80 p-5">
          <div className="label">Campaign progress</div>
          <ul className="mt-3 space-y-2">
            {Object.entries(player.campaign).length === 0 && (
              <li className="text-sm text-muted">No missions attempted yet.</li>
            )}
            {Object.entries(player.campaign).map(([mapId, record]) => {
              const map = getMap(mapId);
              return (
                <li key={mapId} className="flex flex-wrap items-center gap-3 text-sm">
                  <span className="font-mono text-ink">{map?.name ?? mapId}</span>
                  {record.cleared && <span className="font-mono text-[10px] text-lime">CLEARED</span>}
                  <span className="ml-auto font-mono text-xs text-muted">
                    best wave {record.bestWave} · {record.bestScore.toLocaleString()} pts
                  </span>
                </li>
              );
            })}
          </ul>
        </section>
      </main>
    </>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div>
      <dt className="label">{label}</dt>
      <dd className="font-mono text-xl tabular-nums text-ink">{value.toLocaleString()}</dd>
    </div>
  );
}
