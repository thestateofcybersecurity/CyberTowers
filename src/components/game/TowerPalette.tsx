'use client';

import type { TowerId } from '@/game/core/types';
import { TOWERS, TOWER_ORDER } from '@/game/data/towers';
import PixelIcon from './PixelIcon';

interface Props {
  unlocked: TowerId[];
  credits: number;
  selected: TowerId | null;
  onSelect: (id: TowerId | null) => void;
}

export default function TowerPalette({ unlocked, credits, selected, onSelect }: Props) {
  return (
    <div className="rounded-xl border border-edge bg-panel/90 p-3">
      <div className="mb-2 flex items-baseline justify-between">
        <span className="label">Defences</span>
        <span className="label">1–8 to select · Esc to cancel</span>
      </div>

      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 xl:grid-cols-2">
        {TOWER_ORDER.map((id, index) => {
          const def = TOWERS[id];
          const cost = def.tiers[0].cost;
          const isUnlocked = unlocked.includes(id);
          const affordable = credits >= cost;
          const active = selected === id;
          const disabled = !isUnlocked || !affordable;

          return (
            <button
              key={id}
              type="button"
              disabled={!isUnlocked}
              onClick={() => onSelect(active ? null : id)}
              title={isUnlocked ? def.blurb : `Unlocks at clearance level ${def.unlockLevel}`}
              className={`group relative flex items-start gap-2.5 rounded-lg border p-2.5 text-left transition ${
                active
                  ? 'border-cyan bg-cyan/10'
                  : disabled
                    ? 'border-edge/60 bg-panel-2/40 opacity-55'
                    : 'border-edge bg-panel-2/70 hover:border-cyan/50 hover:bg-panel-2'
              }`}
            >
              <PixelIcon kind="tower" id={id} size={32} className="mt-0.5 shrink-0" />

              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1.5">
                  <span className="truncate text-xs font-semibold text-ink">{def.name}</span>
                  <span className="ml-auto font-mono text-[10px] text-muted">{index + 1}</span>
                </div>
                <div className="label mt-0.5 truncate normal-case tracking-normal">{def.role}</div>
                <div
                  className={`mt-1 font-mono text-xs tabular-nums ${
                    !isUnlocked ? 'text-muted' : affordable ? 'text-amber' : 'text-rose'
                  }`}
                >
                  {isUnlocked ? `${cost} cr` : `LVL ${def.unlockLevel}`}
                </div>
              </div>

              {!isUnlocked && (
                <span className="absolute right-2 top-2 text-[10px] text-muted">🔒</span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
