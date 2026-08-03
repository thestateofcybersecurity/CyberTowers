'use client';

import Link from 'next/link';
import type { RunResult } from '@/game/core/types';

export type SubmitState =
  | { status: 'idle' }
  | { status: 'sending' }
  | { status: 'done'; xpEarned: number; level: number }
  | { status: 'skipped'; reason: string }
  | { status: 'error'; message: string };

interface Props {
  result: RunResult;
  mapName: string;
  submit: SubmitState;
  onRetry: () => void;
}

export default function RunSummary({ result, mapName, submit, onRetry }: Props) {
  const won = result.victory;
  // The two seats win by opposite events, and every figure below reads the
  // other way round from an intrusion: a breached core is the goal, and the
  // bodies on the floor are your own.
  const attacking = result.role === 'attacker';

  const title = attacking
    ? won
      ? 'CORE BREACHED'
      : 'INTRUSION BURNED'
    : won
      ? 'NETWORK SECURED'
      : 'CORE BREACHED';

  const blurb = attacking
    ? won
      ? `You got in. ${mapName} lost its core on wave ${result.wave}.`
      : `The network held. ${mapName} still stands after ${result.wave} waves.`
    : won
      ? `You held every wave on ${mapName}. The adversary got nothing.`
      : `Hostile traffic reached the core on wave ${result.wave}.`;

  return (
    <div className="absolute inset-0 z-20 grid place-items-center bg-void/85 p-6 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-2xl border border-edge bg-panel p-6 shadow-2xl">
        <div className="label">{mapName}</div>
        <h2
          className={`mt-1 font-mono text-2xl font-bold tracking-tight ${won ? 'text-lime' : 'text-rose'}`}
        >
          {title}
        </h2>
        <p className="mt-1 text-sm text-muted">{blurb}</p>

        <dl className="mt-5 grid grid-cols-2 gap-3">
          <Stat label="Final score" value={result.score.toLocaleString()} big />
          <Stat label="Wave reached" value={String(result.wave)} big />
          <Stat
            label={attacking ? 'Units lost' : 'Threats neutralised'}
            value={result.threatsKilled.toLocaleString()}
          />
          <Stat
            label={attacking ? 'Core still up' : 'Integrity left'}
            value={`${result.integrity}`}
          />
          <Stat label="Run time" value={formatDuration(result.elapsed)} />
          <Stat label="XP earned" value={`+${result.xpEarned.toLocaleString()}`} />
        </dl>

        <div className="mt-4 min-h-[36px] rounded-lg border border-edge bg-panel-2/60 px-3 py-2 text-xs">
          {submit.status === 'sending' && <span className="text-muted">Submitting score…</span>}
          {submit.status === 'done' && (
            <span className="text-lime">
              Score posted. +{submit.xpEarned.toLocaleString()} XP · clearance level {submit.level}
            </span>
          )}
          {submit.status === 'skipped' && <span className="text-muted">{submit.reason}</span>}
          {submit.status === 'error' && <span className="text-rose">{submit.message}</span>}
          {submit.status === 'idle' && <span className="text-muted">Run complete.</span>}
        </div>

        <div className="mt-5 flex gap-2">
          <button
            type="button"
            onClick={onRetry}
            className="flex-1 rounded-lg border border-cyan/50 bg-cyan/10 px-4 py-2.5 font-mono text-sm font-semibold text-cyan transition hover:bg-cyan/20"
          >
            RUN IT BACK
          </button>
          <Link
            href={attacking ? '/leaderboard?role=attacker' : '/leaderboard'}
            className="rounded-lg border border-edge px-4 py-2.5 font-mono text-sm text-muted transition hover:bg-panel-2 hover:text-ink"
          >
            RANKS
          </Link>
          <Link
            href="/"
            className="rounded-lg border border-edge px-4 py-2.5 font-mono text-sm text-muted transition hover:bg-panel-2 hover:text-ink"
          >
            EXIT
          </Link>
        </div>
      </div>
    </div>
  );
}

function Stat({ label, value, big }: { label: string; value: string; big?: boolean }) {
  return (
    <div>
      <dt className="label">{label}</dt>
      <dd className={`font-mono tabular-nums text-ink ${big ? 'text-xl' : 'text-sm'}`}>{value}</dd>
    </div>
  );
}

function formatDuration(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${String(s).padStart(2, '0')}`;
}
