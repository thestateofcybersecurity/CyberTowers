'use client';

import type { TargetingMode } from '@/game/core/types';
import { sellValue } from '@/game/data/towers';
import type { Tower } from '@/game/engine/entities';
import PixelIcon from './PixelIcon';

interface Props {
  tower: Tower | null;
  credits: number;
  /** Board-wide detection signal quality, 1 down toward 0. */
  alertFatigue: number;
  onUpgrade: () => void;
  onSell: () => void;
  onCycleTargeting: () => void;
}

const TARGETING_LABEL: Record<TargetingMode, string> = {
  first: 'First',
  last: 'Last',
  strongest: 'Strongest',
  weakest: 'Weakest',
  closest: 'Closest',
};

export default function TowerInspector({
  tower,
  credits,
  alertFatigue,
  onUpgrade,
  onSell,
  onCycleTargeting,
}: Props) {
  if (!tower) {
    return (
      <div className="rounded-xl border border-edge bg-panel/90 p-4">
        <div className="label">Inspector</div>
        <p className="mt-2 text-sm text-muted">
          Click a placed defence to inspect it, upgrade it, or change how it picks targets.
        </p>
        <dl className="mt-4 space-y-1.5 text-xs text-muted">
          <Hint keys="U" text="Upgrade selected" />
          <Hint keys="S" text="Sell selected" />
          <Hint keys="T" text="Cycle targeting" />
          <Hint keys="R" text="Show all ranges" />
          <Hint keys="Space" text="Pause" />
          <Hint keys="Enter" text="Send next wave early" />
        </dl>
      </div>
    );
  }

  const nextTier = tower.def.tiers[tower.tier + 1];
  const maxed = !nextTier;
  const canAfford = nextTier ? credits >= nextTier.cost : false;
  const refund = sellValue(tower.type, tower.tier);

  return (
    <div className="rounded-xl border border-edge bg-panel/90 p-4">
      <div className="flex items-start gap-3">
        <PixelIcon kind="tower" id={tower.type} tier={tower.tier} size={40} />
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <h3 className="truncate text-sm font-semibold text-ink">{tower.def.name}</h3>
            <span
              className="rounded px-1.5 py-0.5 font-mono text-[10px] font-semibold"
              style={{ background: `${tower.def.color}22`, color: tower.def.color }}
            >
              MK {tower.tier + 1}
            </span>
          </div>
          <p className="label mt-0.5 normal-case tracking-normal">{tower.def.role}</p>
        </div>
      </div>

      <dl className="mt-3 grid grid-cols-2 gap-x-3 gap-y-2">
        <Stat label="Damage" value={fmt(tower.stats.damage * (1 + tower.auraDamage))} />
        <Stat label="Range" value={`${Math.round(tower.stats.range)}`} />
        <Stat
          label="Rate"
          value={`${fmt(tower.stats.fireRate * (1 + tower.auraFireRate))}/s`}
        />
        <Stat label="Kills" value={`${tower.kills}`} />
      </dl>

      {tower.stats.params.detectStealth && alertFatigue < 0.995 && (
        <p className="mt-2 rounded-md border border-amber/40 bg-amber/10 px-2 py-1 font-mono text-[10px] text-amber">
          Alert fatigue: flags at {Math.round(alertFatigue * 100)}% strength. Too many sensors
          dilute every alert; upgrade rather than add.
        </p>
      )}

      {(tower.auraDamage > 0 || tower.auraFireRate > 0) && (
        <p className="mt-2 rounded-md border border-orange-500/30 bg-orange-500/10 px-2 py-1 font-mono text-[10px] text-amber">
          SOC uplink: +{Math.round(tower.auraDamage * 100)}% damage, +
          {Math.round(tower.auraFireRate * 100)}% rate
        </p>
      )}

      <button
        type="button"
        onClick={onCycleTargeting}
        className="mt-3 flex w-full items-center justify-between rounded-md border border-edge bg-panel-2/60 px-3 py-2 text-xs transition hover:bg-panel-2"
      >
        <span className="label">Targeting</span>
        <span className="font-mono text-ink">{TARGETING_LABEL[tower.targeting]} →</span>
      </button>

      {maxed ? (
        <div className="mt-2 rounded-md border border-amber/40 bg-amber/10 px-3 py-2 text-center font-mono text-xs text-amber">
          MAX TIER
        </div>
      ) : (
        <button
          type="button"
          onClick={onUpgrade}
          disabled={!canAfford}
          className={`mt-2 w-full rounded-md border px-3 py-2 text-left transition ${
            canAfford
              ? 'border-lime/50 bg-lime/10 hover:bg-lime/20'
              : 'cursor-not-allowed border-edge bg-panel-2/40 opacity-60'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className={`font-mono text-xs font-semibold ${canAfford ? 'text-lime' : 'text-muted'}`}>
              UPGRADE → MK {tower.tier + 2}
            </span>
            <span className={`font-mono text-xs ${canAfford ? 'text-amber' : 'text-rose'}`}>
              {nextTier.cost} cr
            </span>
          </div>
          <p className="mt-1 text-[11px] leading-snug text-muted">{nextTier.note}</p>
        </button>
      )}

      <button
        type="button"
        onClick={onSell}
        className="mt-2 w-full rounded-md border border-edge px-3 py-1.5 font-mono text-xs text-muted transition hover:border-rose/50 hover:text-rose"
      >
        SELL · +{refund} cr
      </button>
    </div>
  );
}

function fmt(value: number): string {
  return value >= 100 ? String(Math.round(value)) : value.toFixed(1);
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="label">{label}</dt>
      <dd className="font-mono text-sm tabular-nums text-ink">{value}</dd>
    </div>
  );
}

function Hint({ keys, text }: { keys: string; text: string }) {
  return (
    <div className="flex items-center gap-2">
      <kbd className="rounded border border-edge bg-panel-2 px-1.5 py-0.5 font-mono text-[10px] text-ink">
        {keys}
      </kbd>
      <span>{text}</span>
    </div>
  );
}
