'use client';

import Link from 'next/link';
import type { GamePhase } from '@/game/core/types';

export interface HudState {
  integrity: number;
  maxIntegrity: number;
  credits: number;
  wave: number;
  waveCount: number;
  score: number;
  phase: GamePhase;
  buildTimer: number;
  threatsAlive: number;
  isBossWave: boolean;
}

interface Props {
  mapName: string;
  mode: string;
  hud: HudState;
  speed: number;
  paused: boolean;
  muted: boolean;
  onSpeed: (speed: number) => void;
  onTogglePause: () => void;
  onToggleMute: () => void;
  onCallWave: () => void;
}

const PHASE_LABEL: Record<GamePhase, string> = {
  loading: 'Loading',
  building: 'Build phase',
  spawning: 'Under attack',
  clearing: 'Mopping up',
  victory: 'Secured',
  defeat: 'Breached',
};

export default function TopBar({
  mapName,
  mode,
  hud,
  speed,
  paused,
  muted,
  onSpeed,
  onTogglePause,
  onToggleMute,
  onCallWave,
}: Props) {
  const integrityPct = Math.max(0, (hud.integrity / hud.maxIntegrity) * 100);
  const critical = integrityPct <= 25;

  return (
    <div className="flex flex-wrap items-center gap-x-5 gap-y-3 rounded-xl border border-edge bg-panel/90 px-4 py-3">
      <div className="min-w-0">
        <Link href="/" className="label transition hover:text-ink">
          ← {mapName}
        </Link>
        <div className="font-mono text-sm text-ink">
          {PHASE_LABEL[hud.phase]}
          {hud.isBossWave && hud.phase !== 'building' && (
            <span className="ml-2 rounded bg-rose/20 px-1.5 py-0.5 text-[10px] font-semibold text-rose">
              BOSS
            </span>
          )}
        </div>
      </div>

      {/* Core integrity */}
      <div className="min-w-[170px] flex-1">
        <div className="flex items-baseline justify-between">
          <span className="label">Core integrity</span>
          <span
            className={`font-mono text-sm tabular-nums ${critical ? 'text-rose' : 'text-ink'}`}
          >
            {Math.max(0, Math.round(hud.integrity))}
          </span>
        </div>
        <div className={`relative mt-1 h-1.5 overflow-hidden rounded-full bg-edge ${critical ? 'alert-ring' : ''}`}>
          <div
            className="h-full rounded-full transition-[width] duration-200"
            style={{
              width: `${integrityPct}%`,
              background:
                integrityPct > 55 ? '#4ade80' : integrityPct > 25 ? '#fbbf24' : '#f87171',
            }}
          />
        </div>
      </div>

      <Stat label="Credits" value={Math.floor(hud.credits).toLocaleString()} tone="amber" />
      <Stat
        label="Wave"
        value={mode === 'endless' ? `${hud.wave}` : `${hud.wave} / ${hud.waveCount}`}
      />
      <Stat label="Score" value={Math.round(hud.score).toLocaleString()} />
      <Stat label="Hostiles" value={`${hud.threatsAlive}`} tone={hud.threatsAlive > 0 ? 'rose' : undefined} />

      <div className="ml-auto flex items-center gap-2">
        {hud.phase === 'building' && (
          <button
            type="button"
            onClick={onCallWave}
            className="rounded-md border border-lime/50 bg-lime/10 px-3 py-1.5 font-mono text-xs font-semibold text-lime transition hover:bg-lime/20"
          >
            SEND WAVE ({Math.ceil(hud.buildTimer)}s) +{Math.round(hud.buildTimer * 6)}
          </button>
        )}

        <div className="flex overflow-hidden rounded-md border border-edge">
          {[1, 2, 3].map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => onSpeed(s)}
              className={`px-2.5 py-1.5 font-mono text-xs transition ${
                speed === s ? 'bg-cyan/20 text-cyan' : 'text-muted hover:bg-panel-2'
              }`}
            >
              {s}×
            </button>
          ))}
        </div>

        <IconButton onClick={onTogglePause} active={paused} title="Pause (Space)">
          {paused ? '▶' : '❚❚'}
        </IconButton>
        <IconButton onClick={onToggleMute} active={muted} title="Mute (M)">
          {muted ? '🔇' : '🔊'}
        </IconButton>
      </div>
    </div>
  );
}

function Stat({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone?: 'amber' | 'rose';
}) {
  const color = tone === 'amber' ? 'text-amber' : tone === 'rose' ? 'text-rose' : 'text-ink';
  return (
    <div>
      <div className="label">{label}</div>
      <div className={`font-mono text-sm tabular-nums ${color}`}>{value}</div>
    </div>
  );
}

function IconButton({
  children,
  onClick,
  active,
  title,
}: {
  children: React.ReactNode;
  onClick: () => void;
  active?: boolean;
  title: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={title}
      className={`grid h-8 w-8 place-items-center rounded-md border border-edge text-xs transition ${
        active ? 'bg-panel-2 text-cyan' : 'text-muted hover:bg-panel-2 hover:text-ink'
      }`}
    >
      {children}
    </button>
  );
}
