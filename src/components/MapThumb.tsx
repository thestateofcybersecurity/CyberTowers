'use client';

import { useEffect, useRef } from 'react';
import type { GameMapDef } from '@/game/core/types';

/**
 * A miniature of a mission's lane layout, drawn straight from the map data.
 * Keeps the mission cards honest: what you see is the board you will play,
 * with no separate artwork to drift out of sync.
 */
export default function MapThumb({ map }: { map: GameMapDef }) {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const cell = 8;
    canvas.width = map.cols * cell;
    canvas.height = map.rows * cell;

    ctx.fillStyle = '#070d18';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.strokeStyle = 'rgba(34, 211, 238, 0.07)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    for (let x = 0; x <= map.cols; x += 2) {
      ctx.moveTo(x * cell + 0.5, 0);
      ctx.lineTo(x * cell + 0.5, canvas.height);
    }
    for (let y = 0; y <= map.rows; y += 2) {
      ctx.moveTo(0, y * cell + 0.5);
      ctx.lineTo(canvas.width, y * cell + 0.5);
    }
    ctx.stroke();

    ctx.fillStyle = 'rgba(148, 163, 184, 0.22)';
    for (const tile of map.blocked) {
      ctx.fillRect(tile.x * cell, tile.y * cell, cell, cell);
    }

    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    for (const lane of map.lanes) {
      const points = lane.map((t) => ({ x: t.x * cell + cell / 2, y: t.y * cell + cell / 2 }));

      ctx.strokeStyle = 'rgba(56, 189, 248, 0.20)';
      ctx.lineWidth = cell * 0.9;
      stroke(ctx, points);

      ctx.strokeStyle = '#38bdf8';
      ctx.lineWidth = 1.5;
      stroke(ctx, points);
    }

    // The core, where every lane terminates.
    const last = map.lanes[0][map.lanes[0].length - 1];
    ctx.fillStyle = '#4ade80';
    ctx.beginPath();
    ctx.arc(last.x * cell + cell / 2, last.y * cell + cell / 2, cell * 0.8, 0, Math.PI * 2);
    ctx.fill();
  }, [map]);

  return (
    <canvas
      ref={ref}
      className="w-full rounded-lg border border-edge"
      style={{ aspectRatio: `${map.cols} / ${map.rows}` }}
    />
  );
}

function stroke(ctx: CanvasRenderingContext2D, points: { x: number; y: number }[]): void {
  ctx.beginPath();
  ctx.moveTo(points[0].x, points[0].y);
  for (let i = 1; i < points.length; i++) ctx.lineTo(points[i].x, points[i].y);
  ctx.stroke();
}
