'use client';

import Link from 'next/link';
import { useCallback, useEffect, useRef, useState } from 'react';
import { sfx } from '@/game/audio/sfx';
import { TILE } from '@/game/core/math';
import type { GameMapDef, RunResult, ThreatId } from '@/game/core/types';
import { getOperation } from '@/game/data/operations';
import { THREATS, THREAT_ORDER } from '@/game/data/threats';
import { getPosture } from '@/game/engine/ai';
import { Game, type GameEvent } from '@/game/engine/Game';
import { Renderer, type ViewState } from '@/game/engine/Renderer';
import { GameLoop } from '@/game/engine/loop';
import PixelIcon from './PixelIcon';
import RunSummary, { type SubmitState } from './RunSummary';

interface Props {
  map: GameMapDef;
  operationId: string;
  postureId: string;
  signedIn: boolean;
}

interface Hud {
  intel: number;
  integrity: number;
  maxIntegrity: number;
  wave: number;
  maxWaves: number;
  phase: string;
  threatsAlive: number;
  towers: number;
  maxUnits: number;
}

/** Composable threats: bosses and split-only spawns are not purchasable. */
const BUYABLE = THREAT_ORDER.filter(
  (id) => !THREATS[id].traits.boss && Number.isFinite(THREATS[id].minWave),
);

export default function AttackShell({ map, operationId, postureId, signedIn }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const gameRef = useRef<Game | null>(null);
  const loopRef = useRef<GameLoop | null>(null);
  const viewRef = useRef<ViewState>({
    hoverCol: -1,
    hoverRow: -1,
    buildType: null,
    selectedTowerId: null,
    showAllRanges: true,
  });

  const operation = getOperation(operationId);
  const posture = getPosture(postureId);

  const [runId, setRunId] = useState(0);
  const [hud, setHud] = useState<Hud>({
    intel: 0,
    integrity: 1,
    maxIntegrity: 1,
    wave: 1,
    maxWaves: 12,
    phase: 'building',
    threatsAlive: 0,
    towers: 0,
    maxUnits: 45,
  });
  const [plan, setPlan] = useState<Partial<Record<ThreatId, number>>>({});
  const [costs, setCosts] = useState<Partial<Record<ThreatId, number>>>({});
  const [toast, setToast] = useState<string | null>(null);
  const [result, setResult] = useState<RunResult | null>(null);
  const [submit, setSubmit] = useState<SubmitState>({ status: 'idle' });

  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const showToast = useCallback((message: string) => {
    setToast(message);
    if (toastTimer.current) clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(null), 1800);
  }, []);

  const syncHud = useCallback((game: Game) => {
    setHud({
      intel: Math.round(game.intel),
      integrity: Math.max(0, Math.round(game.integrity)),
      maxIntegrity: game.maxIntegrity,
      wave: game.wave,
      maxWaves: game.maxIntrusionWaves,
      phase: game.phase,
      threatsAlive: game.threats.length,
      towers: game.towers.length,
      maxUnits: game.maxIntrusionUnits,
    });
    const next: Partial<Record<ThreatId, number>> = {};
    for (const id of BUYABLE) next[id] = game.intrusionCost(id);
    setCosts(next);
  }, []);

  const submitRun = useCallback(
    async (game: Game, runResult: RunResult) => {
      if (!signedIn) {
        setSubmit({ status: 'skipped', reason: 'Sign in to post intrusion results.' });
        return;
      }
      setSubmit({ status: 'sending' });
      try {
        const response = await fetch('/api/scores', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ...runResult, towersUsed: [] }),
        });
        const data = await response.json();
        if (!response.ok) {
          setSubmit({ status: 'error', message: data.error ?? 'Could not post result.' });
          return;
        }
        setSubmit({ status: 'done', xpEarned: data.xpEarned, level: data.level });
      } catch {
        setSubmit({ status: 'error', message: 'Network error.' });
      }
    },
    [signedIn],
  );

  const handleEvent = useCallback(
    (event: GameEvent, game: Game) => {
      switch (event.type) {
        case 'leak':
          sfx.play('kill');
          break;
        case 'kill':
          sfx.play('sell');
          break;
        case 'wave-start':
          sfx.play('wave');
          break;
        case 'wave-clear':
          setPlan({});
          syncHud(game);
          break;
        case 'denied':
          sfx.play('denied');
          showToast(event.reason);
          break;
        case 'victory':
        case 'defeat': {
          sfx.play(event.type === 'victory' ? 'victory' : 'defeat');
          loopRef.current?.stop();
          const runResult = game.result();
          setResult(runResult);
          void submitRun(game, runResult);
          break;
        }
        default:
          break;
      }
    },
    [showToast, submitRun, syncHud],
  );

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    canvas.width = map.cols * TILE;
    canvas.height = map.rows * TILE;

    const game = new Game({
      map,
      mode: 'campaign',
      role: 'attacker',
      posture,
      operation,
      onEvent: (event) => handleEvent(event, game),
    });

    const renderer = new Renderer(game);
    let last = 0;
    const loop = new GameLoop(game, (alpha, time) => {
      renderer.draw(ctx, alpha, time, viewRef.current);
      const now = performance.now();
      if (now - last >= 90) {
        last = now;
        syncHud(game);
      }
    });

    gameRef.current = game;
    loopRef.current = loop;
    loop.start();
    syncHud(game);

    return () => {
      loop.stop();
      gameRef.current = null;
      loopRef.current = null;
    };
  }, [map, operation, posture, runId, handleEvent, syncHud]);

  const totalCost = BUYABLE.reduce((sum, id) => sum + (plan[id] ?? 0) * (costs[id] ?? 0), 0);
  const totalUnits = BUYABLE.reduce((sum, id) => sum + (plan[id] ?? 0), 0);
  const planning = hud.phase === 'building';

  const adjust = (id: ThreatId, delta: number) => {
    setPlan((prev) => {
      const next = { ...prev };
      const value = Math.max(0, (next[id] ?? 0) + delta);
      if (value === 0) delete next[id];
      else next[id] = value;
      return next;
    });
  };

  const launch = () => {
    const game = gameRef.current;
    if (!game) return;
    sfx.unlock();
    const groups = BUYABLE.filter((id) => (plan[id] ?? 0) > 0).map((id, i) => ({
      threat: id,
      count: plan[id]!,
      lane: i % map.lanes.length,
    }));
    const outcome = game.launchAttack(groups);
    if (outcome.ok) setPlan({});
    syncHud(game);
  };

  const breached = 1 - hud.integrity / Math.max(1, hud.maxIntegrity);

  return (
    <div className="mx-auto flex w-full max-w-[1500px] flex-col gap-3 p-3 lg:p-4">
      <div className="flex flex-wrap items-center gap-x-5 gap-y-3 rounded-xl border border-edge bg-panel/90 px-4 py-3">
        <div className="min-w-0">
          <Link href="/infiltrate" className="label transition hover:text-ink">
            ← {operation?.name ?? 'Intrusion'}
          </Link>
          <div className="font-mono text-sm text-ink">
            {planning ? 'Compose intrusion' : hud.threatsAlive > 0 ? 'In progress' : 'Assessing'}
          </div>
        </div>

        <div className="min-w-[200px] flex-1">
          <div className="flex items-baseline justify-between">
            <span className="label">Breach progress</span>
            <span className="font-mono text-sm tabular-nums text-rose">
              {Math.round(breached * 100)}%
            </span>
          </div>
          <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-edge">
            <div
              className="h-full rounded-full bg-rose transition-[width] duration-200"
              style={{ width: `${breached * 100}%` }}
            />
          </div>
        </div>

        <Stat label="Intel" value={hud.intel.toLocaleString()} tone="text-cyan" />
        <Stat label="Wave" value={`${hud.wave} / ${hud.maxWaves}`} />
        <Stat label="Defences" value={String(hud.towers)} tone="text-lime" />
        <Stat label="In flight" value={String(hud.threatsAlive)} />
      </div>

      <div className="grid gap-3 xl:grid-cols-[minmax(0,1fr)_330px]">
        <div className="relative">
          <canvas
            ref={canvasRef}
            className="pixelated w-full rounded-xl border border-edge bg-void"
            style={{ aspectRatio: `${map.cols} / ${map.rows}` }}
          />
          {toast && (
            <div className="pointer-events-none absolute left-1/2 top-4 -translate-x-1/2 rounded-md border border-rose/50 bg-void/90 px-3 py-1.5 font-mono text-xs text-rose">
              {toast}
            </div>
          )}
          {result && (
            <RunSummary
              result={result}
              mapName={operation?.name ?? map.name}
              submit={submit}
              onRetry={() => {
                setResult(null);
                setSubmit({ status: 'idle' });
                setPlan({});
                setRunId((n) => n + 1);
              }}
            />
          )}
        </div>

        <aside className="flex flex-col gap-3">
          <div className="rounded-xl border border-edge bg-panel/90 p-3">
            <div className="label">Target · {posture.name}</div>
            <p className="mt-1 text-xs leading-relaxed text-muted">{posture.blurb}</p>
            <p className="mt-1.5 text-xs leading-relaxed text-amber">{posture.weakness}</p>
          </div>

          <div className="rounded-xl border border-edge bg-panel/90 p-3">
            <div className="mb-2 flex items-baseline justify-between">
              <span className="label">Compose intrusion</span>
              <span className="label">
                {totalUnits} / {hud.maxUnits} units
              </span>
            </div>

            <div className="max-h-[46vh] space-y-1 overflow-y-auto pr-1">
              {BUYABLE.map((id) => {
                const def = THREATS[id];
                const cost = costs[id] ?? 0;
                const count = plan[id] ?? 0;
                const affordable = totalCost + cost <= hud.intel && totalUnits < hud.maxUnits;
                return (
                  <div
                    key={id}
                    className={`flex items-center gap-2 rounded-lg border px-2 py-1.5 ${
                      count > 0 ? 'border-cyan/40 bg-cyan/5' : 'border-edge bg-panel-2/50'
                    }`}
                  >
                    <PixelIcon kind="threat" id={id} size={22} className="shrink-0" />
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-xs text-ink">{def.name}</div>
                      <div className="font-mono text-[10px] text-muted">
                        {cost} intel · {def.damage} dmg
                      </div>
                    </div>
                    <button
                      type="button"
                      disabled={!planning || count === 0}
                      onClick={() => adjust(id, -1)}
                      className="h-6 w-6 shrink-0 rounded border border-edge font-mono text-xs text-muted transition hover:text-ink disabled:opacity-30"
                    >
                      −
                    </button>
                    <span className="w-6 shrink-0 text-center font-mono text-xs tabular-nums text-ink">
                      {count}
                    </span>
                    <button
                      type="button"
                      disabled={!planning || !affordable}
                      onClick={() => adjust(id, 1)}
                      className="h-6 w-6 shrink-0 rounded border border-edge font-mono text-xs text-muted transition hover:text-ink disabled:opacity-30"
                    >
                      +
                    </button>
                  </div>
                );
              })}
            </div>

            <div className="mt-3 flex items-baseline justify-between font-mono text-xs">
              <span className="label">Cost</span>
              <span className={totalCost > hud.intel ? 'text-rose' : 'text-cyan'}>
                {totalCost} / {hud.intel}
              </span>
            </div>

            <button
              type="button"
              onClick={launch}
              disabled={!planning || totalUnits === 0 || totalCost > hud.intel}
              className="mt-2 w-full rounded-lg border border-rose/50 bg-rose/10 px-4 py-2.5 font-mono text-sm font-semibold text-rose transition hover:bg-rose/20 disabled:cursor-not-allowed disabled:opacity-40"
            >
              {planning ? 'LAUNCH INTRUSION' : 'IN PROGRESS…'}
            </button>
            <p className="mt-2 text-[11px] leading-relaxed text-muted">
              The network reinforces after every wave. A slow intrusion is a losing one.
            </p>
          </div>
        </aside>
      </div>
    </div>
  );
}

function Stat({ label, value, tone }: { label: string; value: string; tone?: string }) {
  return (
    <div>
      <div className="label">{label}</div>
      <div className={`font-mono text-sm tabular-nums ${tone ?? 'text-ink'}`}>{value}</div>
    </div>
  );
}
