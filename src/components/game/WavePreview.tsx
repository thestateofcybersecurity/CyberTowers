'use client';

import type { WavePlan } from '@/game/core/types';
import { THREATS } from '@/game/data/threats';
import { waveSummary } from '@/game/data/waves';
import PixelIcon from './PixelIcon';

interface Props {
  plan: WavePlan;
  wave: number;
}

const TRAIT_TAGS: Array<{ key: string; label: string; tone: string }> = [
  { key: 'stealth', label: 'STEALTH', tone: 'text-violet' },
  { key: 'tunneled', label: 'TUNNELLED', tone: 'text-cyan' },
  { key: 'regen', label: 'REGEN', tone: 'text-lime' },
  { key: 'shield', label: 'SHIELDED', tone: 'text-cyan' },
  { key: 'splitInto', label: 'SPLITS', tone: 'text-rose' },
  { key: 'slowImmune', label: 'UNSLOWABLE', tone: 'text-amber' },
  { key: 'drain', label: 'DRAINS', tone: 'text-amber' },
  { key: 'hardened', label: 'ARMOURED', tone: 'text-rose' },
];

export default function WavePreview({ plan, wave }: Props) {
  const summary = waveSummary(plan);

  return (
    <div className="rounded-xl border border-edge bg-panel/90 p-3">
      <div className="mb-2 flex items-baseline justify-between">
        <span className="label">Incoming · wave {wave}</span>
        {plan.isBoss && (
          <span className="rounded bg-rose/20 px-1.5 py-0.5 font-mono text-[10px] font-semibold text-rose">
            BOSS
          </span>
        )}
      </div>

      <ul className="space-y-1.5">
        {summary.map(({ threat, count }) => {
          const def = THREATS[threat];
          if (!def) return null;
          const tags = TRAIT_TAGS.filter(
            (t) => (def.traits as Record<string, unknown>)[t.key],
          );

          return (
            <li key={threat} className="flex items-center gap-2.5" title={def.blurb}>
              <PixelIcon kind="threat" id={threat} size={24} className="shrink-0" />
              <div className="min-w-0 flex-1">
                <div className="truncate text-xs text-ink">{def.name}</div>
                {tags.length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {tags.map((t) => (
                      <span key={t.key} className={`font-mono text-[9px] ${t.tone}`}>
                        {t.label}
                      </span>
                    ))}
                  </div>
                )}
              </div>
              <span className="font-mono text-xs tabular-nums text-muted">×{count}</span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
