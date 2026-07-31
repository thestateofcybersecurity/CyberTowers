'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { sfx } from '@/game/audio/sfx';
import { TILE } from '@/game/core/math';
import type {
  GameMapDef,
  GameMode,
  RunResult,
  RunSnapshot,
  TowerId,
  WavePlan,
} from '@/game/core/types';
import { TOWER_ORDER, TOWERS } from '@/game/data/towers';
import { Game, type GameEvent } from '@/game/engine/Game';
import { Renderer, type ViewState } from '@/game/engine/Renderer';
import { GameLoop } from '@/game/engine/loop';
import type { Tower } from '@/game/engine/entities';
import RunSummary, { type SubmitState } from './RunSummary';
import TopBar, { type HudState } from './TopBar';
import TowerInspector from './TowerInspector';
import TowerPalette from './TowerPalette';
import WavePreview from './WavePreview';

interface Props {
  map: GameMapDef;
  mode: GameMode;
  unlocked: TowerId[];
  signedIn: boolean;
  initialSnapshot: RunSnapshot | null;
}

/** How often the React HUD re-reads the simulation, in ms. */
const HUD_INTERVAL = 90;

export default function GameShell({ map, mode, unlocked, signedIn, initialSnapshot }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const gameRef = useRef<Game | null>(null);
  const loopRef = useRef<GameLoop | null>(null);

  // View state is read by the renderer every frame, so it lives in a ref and is
  // mirrored into React state only where the UI needs to display it.
  const viewRef = useRef<ViewState>({
    hoverCol: -1,
    hoverRow: -1,
    buildType: null,
    selectedTowerId: null,
    showAllRanges: false,
  });

  const [runId, setRunId] = useState(0);
  const [hud, setHud] = useState<HudState>(() => ({
    integrity: map.startIntegrity,
    maxIntegrity: map.startIntegrity,
    credits: map.startCredits,
    wave: 1,
    waveCount: map.waveCount,
    score: 0,
    phase: 'building',
    buildTimer: 30,
    threatsAlive: 0,
    isBossWave: false,
  }));
  const [plan, setPlan] = useState<WavePlan | null>(null);
  const [buildType, setBuildType] = useState<TowerId | null>(null);
  const [selected, setSelected] = useState<Tower | null>(null);
  const [showRanges, setShowRanges] = useState(false);
  const [speed, setSpeed] = useState(1);
  const [paused, setPaused] = useState(false);
  const [muted, setMuted] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [result, setResult] = useState<RunResult | null>(null);
  const [submit, setSubmit] = useState<SubmitState>({ status: 'idle' });

  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const showToast = useCallback((message: string) => {
    setToast(message);
    if (toastTimer.current) clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(null), 1600);
  }, []);

  /* --------------------------------------------------------- score & saving */

  const submitRun = useCallback(
    async (game: Game, runResult: RunResult) => {
      if (!signedIn) {
        setSubmit({
          status: 'skipped',
          reason: 'Sign in to post scores to the leaderboard and keep cloud saves.',
        });
        return;
      }

      setSubmit({ status: 'sending' });
      try {
        const response = await fetch('/api/scores', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            ...runResult,
            towersUsed: [...new Set(game.towers.map((t) => t.type))],
          }),
        });
        const data = await response.json();
        if (!response.ok) {
          setSubmit({ status: 'error', message: data.error ?? 'Could not post score.' });
          return;
        }
        setSubmit({ status: 'done', xpEarned: data.xpEarned, level: data.level });
      } catch {
        setSubmit({ status: 'error', message: 'Network error while posting score.' });
      }
    },
    [signedIn],
  );

  const saveToCloud = useCallback(
    (game: Game) => {
      if (!signedIn) return;
      void fetch('/api/saves', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(game.snapshot()),
      }).catch(() => {
        // A failed autosave should never interrupt play; the run continues and
        // the next wave-clear will try again.
      });
    },
    [signedIn],
  );


  const syncHud = useCallback((game: Game) => {
    setHud({
      integrity: game.integrity,
      maxIntegrity: game.maxIntegrity,
      credits: game.credits,
      wave: game.wave,
      waveCount: game.map.waveCount,
      score: game.score,
      phase: game.phase,
      buildTimer: game.buildTimer,
      threatsAlive: game.threats.length,
      isBossWave: game.plan.isBoss,
    });

    const id = viewRef.current.selectedTowerId;
    setSelected(id === null ? null : (game.towers.find((t) => t.id === id) ?? null));
  }, []);

  const handleEvent = useCallback(
    (event: GameEvent, game: Game) => {
      switch (event.type) {
        case 'fire':
          sfx.play(TOWERS[event.tower].attack === 'chain' ? 'zap' : 'shoot');
          break;
        case 'kill':
          sfx.play('kill');
          break;
        case 'build':
          sfx.play('build');
          break;
        case 'upgrade':
          sfx.play('upgrade');
          break;
        case 'sell':
          sfx.play('sell');
          break;
        case 'leak':
          sfx.play('leak');
          break;
        case 'wave-start':
          sfx.play(event.isBoss ? 'boss' : 'wave');
          setPlan(game.plan);
          break;
        case 'wave-clear':
          setPlan(game.plan);
          saveToCloud(game);
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
    [saveToCloud, showToast, submitRun],
  );

  /* ----------------------------------------------------------- engine setup */

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    canvas.width = map.cols * TILE;
    canvas.height = map.rows * TILE;

    const game = new Game({
      map,
      mode,
      unlocked,
      onEvent: (event) => handleEvent(event, game),
    });

    if (initialSnapshot && initialSnapshot.mapId === map.id && initialSnapshot.mode === mode) {
      game.restore(initialSnapshot);
    }

    const renderer = new Renderer(game);
    let lastHud = 0;

    const loop = new GameLoop(game, (alpha, time) => {
      renderer.draw(ctx, alpha, time, viewRef.current);

      const now = performance.now();
      if (now - lastHud >= HUD_INTERVAL) {
        lastHud = now;
        syncHud(game);
      }
    });

    gameRef.current = game;
    loopRef.current = loop;
    loop.start();
    syncHud(game);
    setPlan(game.plan);

    return () => {
      loop.stop();
      gameRef.current = null;
      loopRef.current = null;
    };
    // `runId` is the restart signal; everything else is stable for a given run.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [map, mode, runId]);

  /* ------------------------------------------------------------- interaction */

  const pointerToTile = (event: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current!;
    const rect = canvas.getBoundingClientRect();
    // The canvas is displayed scaled to fit; convert CSS pixels back to the
    // fixed internal resolution before dividing into tiles.
    const x = ((event.clientX - rect.left) / rect.width) * canvas.width;
    const y = ((event.clientY - rect.top) / rect.height) * canvas.height;
    return { col: Math.floor(x / TILE), row: Math.floor(y / TILE) };
  };

  const handleMove = (event: React.MouseEvent<HTMLCanvasElement>) => {
    const { col, row } = pointerToTile(event);
    viewRef.current.hoverCol = col;
    viewRef.current.hoverRow = row;
  };

  const handleClick = (event: React.MouseEvent<HTMLCanvasElement>) => {
    const game = gameRef.current;
    if (!game) return;
    sfx.unlock();

    const { col, row } = pointerToTile(event);
    const existing = game.towerAt(col, row);

    if (existing) {
      viewRef.current.selectedTowerId = existing.id;
      viewRef.current.buildType = null;
      setBuildType(null);
      setSelected(existing);
      return;
    }

    if (viewRef.current.buildType) {
      const type = viewRef.current.buildType;
      const outcome = game.build(col, row, type);
      // Holding the tower selected after a successful build lets you place a
      // whole battery without reselecting between each one.
      if (outcome.ok && game.credits < TOWERS[type].tiers[0].cost) {
        viewRef.current.buildType = null;
        setBuildType(null);
      }
      syncHud(game);
      return;
    }

    viewRef.current.selectedTowerId = null;
    setSelected(null);
  };

  const selectBuild = useCallback((type: TowerId | null) => {
    sfx.unlock();
    viewRef.current.buildType = type;
    viewRef.current.selectedTowerId = null;
    setBuildType(type);
    setSelected(null);
  }, []);

  const upgradeSelected = useCallback(() => {
    const game = gameRef.current;
    const id = viewRef.current.selectedTowerId;
    if (!game || id === null) return;
    game.upgrade(id);
    syncHud(game);
  }, [syncHud]);

  const sellSelected = useCallback(() => {
    const game = gameRef.current;
    const id = viewRef.current.selectedTowerId;
    if (!game || id === null) return;
    game.sell(id);
    viewRef.current.selectedTowerId = null;
    setSelected(null);
    syncHud(game);
  }, [syncHud]);

  const cycleTargeting = useCallback(() => {
    const game = gameRef.current;
    const id = viewRef.current.selectedTowerId;
    if (!game || id === null) return;
    game.cycleTargeting(id);
    syncHud(game);
  }, [syncHud]);

  const togglePause = useCallback(() => {
    const loop = loopRef.current;
    if (!loop) return;
    loop.paused = !loop.paused;
    setPaused(loop.paused);
  }, []);

  const changeSpeed = useCallback((next: number) => {
    if (loopRef.current) loopRef.current.speed = next;
    setSpeed(next);
  }, []);

  const toggleMute = useCallback(() => {
    const next = !sfx.isMuted;
    sfx.setMuted(next);
    setMuted(next);
  }, []);

  const callWave = useCallback(() => {
    const game = gameRef.current;
    if (!game) return;
    sfx.unlock();
    game.callWaveEarly();
    syncHud(game);
  }, [syncHud]);

  const retry = useCallback(() => {
    setResult(null);
    setSubmit({ status: 'idle' });
    setSelected(null);
    setBuildType(null);
    viewRef.current = {
      hoverCol: -1,
      hoverRow: -1,
      buildType: null,
      selectedTowerId: null,
      showAllRanges: false,
    };
    setShowRanges(false);
    setRunId((n) => n + 1);
  }, []);

  /* -------------------------------------------------------------- shortcuts */

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.target instanceof HTMLInputElement) return;

      const index = Number(event.key) - 1;
      if (index >= 0 && index < TOWER_ORDER.length) {
        const id = TOWER_ORDER[index];
        if (unlocked.includes(id)) selectBuild(buildType === id ? null : id);
        return;
      }

      switch (event.key) {
        case 'Escape':
          selectBuild(null);
          viewRef.current.selectedTowerId = null;
          setSelected(null);
          break;
        case ' ':
          event.preventDefault();
          togglePause();
          break;
        case 'Enter':
          callWave();
          break;
        case 'u':
        case 'U':
          upgradeSelected();
          break;
        case 's':
        case 'S':
          sellSelected();
          break;
        case 't':
        case 'T':
          cycleTargeting();
          break;
        case 'r':
        case 'R':
          setShowRanges((prev) => {
            viewRef.current.showAllRanges = !prev;
            return !prev;
          });
          break;
        case 'm':
        case 'M':
          toggleMute();
          break;
        default:
          break;
      }
    };

    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [
    buildType,
    callWave,
    cycleTargeting,
    selectBuild,
    sellSelected,
    toggleMute,
    togglePause,
    unlocked,
    upgradeSelected,
  ]);

  /* ------------------------------------------------------------------ render */

  return (
    <div className="mx-auto flex w-full max-w-[1500px] flex-col gap-3 p-3 lg:p-4">
      <TopBar
        mapName={map.name}
        mode={mode}
        hud={hud}
        speed={speed}
        paused={paused}
        muted={muted}
        onSpeed={changeSpeed}
        onTogglePause={togglePause}
        onToggleMute={toggleMute}
        onCallWave={callWave}
      />

      <div className="grid gap-3 xl:grid-cols-[minmax(0,1fr)_300px]">
        <div className="relative">
          <canvas
            ref={canvasRef}
            onMouseMove={handleMove}
            onMouseLeave={() => {
              viewRef.current.hoverCol = -1;
              viewRef.current.hoverRow = -1;
            }}
            onClick={handleClick}
            className="pixelated w-full rounded-xl border border-edge bg-void"
            style={{ aspectRatio: `${map.cols} / ${map.rows}`, cursor: buildType ? 'crosshair' : 'pointer' }}
          />

          {toast && (
            <div className="pointer-events-none absolute left-1/2 top-4 -translate-x-1/2 rounded-md border border-rose/50 bg-void/90 px-3 py-1.5 font-mono text-xs text-rose">
              {toast}
            </div>
          )}

          {showRanges && (
            <div className="pointer-events-none absolute right-3 top-3 rounded-md border border-cyan/40 bg-void/85 px-2 py-1 font-mono text-[10px] text-cyan">
              ALL RANGES · R
            </div>
          )}

          {paused && !result && (
            <div className="pointer-events-none absolute inset-0 grid place-items-center rounded-xl bg-void/60">
              <span className="font-mono text-lg tracking-[0.3em] text-ink">PAUSED</span>
            </div>
          )}

          {result && (
            <RunSummary result={result} mapName={map.name} submit={submit} onRetry={retry} />
          )}
        </div>

        <aside className="flex flex-col gap-3">
          <TowerPalette
            unlocked={unlocked}
            credits={hud.credits}
            selected={buildType}
            onSelect={selectBuild}
          />
          <TowerInspector
            tower={selected}
            credits={hud.credits}
            onUpgrade={upgradeSelected}
            onSell={sellSelected}
            onCycleTargeting={cycleTargeting}
          />
          {plan && <WavePreview plan={plan} wave={hud.wave} />}
        </aside>
      </div>
    </div>
  );
}
