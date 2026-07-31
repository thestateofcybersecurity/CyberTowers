import { getFlashSprite, getThreatSprite, getTowerSprite } from '../art/bake';
import { TILE, lerp } from '../core/math';
import type { TowerId } from '../core/types';
import type { Game } from './Game';
import type { Effect, Projectile, Threat, Tower } from './entities';

export interface ViewState {
  hoverCol: number;
  hoverRow: number;
  /** Tower type queued for placement, or null when not building. */
  buildType: TowerId | null;
  selectedTowerId: number | null;
  showAllRanges: boolean;
}

const PALETTE = {
  bg: '#05070f',
  grid: 'rgba(94, 234, 212, 0.055)',
  gridStrong: 'rgba(94, 234, 212, 0.11)',
  lane: '#0d1b2e',
  laneEdge: 'rgba(56, 189, 248, 0.55)',
  laneFlow: 'rgba(125, 211, 252, 0.85)',
  blocked: '#0c1424',
  blockedEdge: 'rgba(148, 163, 184, 0.25)',
  buildOk: 'rgba(74, 222, 128, 0.30)',
  buildBad: 'rgba(248, 113, 113, 0.32)',
};

/**
 * Canvas renderer. The board's static layer (background, terrain, lanes) is
 * painted once into an offscreen canvas and blitted each frame; only entities
 * and effects are redrawn. That keeps a busy boss wave comfortably at 60fps.
 */
export class Renderer {
  private static_: HTMLCanvasElement | null = null;
  private width = 0;
  private height = 0;

  constructor(private readonly game: Game) {}

  /** Discards the cached terrain layer, e.g. after a resize. */
  invalidate(): void {
    this.static_ = null;
  }

  draw(ctx: CanvasRenderingContext2D, alpha: number, time: number, view: ViewState): void {
    const { board } = this.game;
    this.width = board.width;
    this.height = board.height;

    if (!this.static_) this.static_ = this.paintStatic();
    ctx.imageSmoothingEnabled = false;
    ctx.clearRect(0, 0, this.width, this.height);
    ctx.drawImage(this.static_, 0, 0);

    this.drawLaneFlow(ctx, time);
    this.drawBuildOverlay(ctx, view);
    this.drawRanges(ctx, view);
    this.drawCore(ctx, time);
    this.drawTowers(ctx, view);
    this.drawThreats(ctx, alpha);
    this.drawProjectiles(ctx, alpha);
    this.drawEffects(ctx);
  }

  /* ------------------------------------------------------------ static layer */

  private paintStatic(): HTMLCanvasElement {
    const canvas = document.createElement('canvas');
    canvas.width = this.width;
    canvas.height = this.height;
    const ctx = canvas.getContext('2d')!;
    const { board } = this.game;

    ctx.fillStyle = PALETTE.bg;
    ctx.fillRect(0, 0, this.width, this.height);

    // Buildable tiles get a faintly brighter cell so the playable area reads at
    // a glance without needing a legend.
    for (let row = 0; row < board.rows; row++) {
      for (let col = 0; col < board.cols; col++) {
        if (!board.isBuildable(col, row)) continue;
        ctx.fillStyle = 'rgba(56, 189, 248, 0.028)';
        ctx.fillRect(col * TILE + 1, row * TILE + 1, TILE - 2, TILE - 2);
      }
    }

    ctx.strokeStyle = PALETTE.grid;
    ctx.lineWidth = 1;
    ctx.beginPath();
    for (let x = 0; x <= board.cols; x++) {
      ctx.moveTo(x * TILE + 0.5, 0);
      ctx.lineTo(x * TILE + 0.5, this.height);
    }
    for (let y = 0; y <= board.rows; y++) {
      ctx.moveTo(0, y * TILE + 0.5);
      ctx.lineTo(this.width, y * TILE + 0.5);
    }
    ctx.stroke();

    this.paintBlocked(ctx);
    this.paintLanes(ctx);
    return canvas;
  }

  private paintBlocked(ctx: CanvasRenderingContext2D): void {
    for (const tile of this.game.map.blocked) {
      const x = tile.x * TILE;
      const y = tile.y * TILE;
      ctx.fillStyle = PALETTE.blocked;
      ctx.fillRect(x + 2, y + 2, TILE - 4, TILE - 4);
      ctx.strokeStyle = PALETTE.blockedEdge;
      ctx.lineWidth = 1;
      ctx.strokeRect(x + 2.5, y + 2.5, TILE - 5, TILE - 5);

      // Rack units, so blocked terrain reads as hardware rather than a hole.
      ctx.fillStyle = 'rgba(148, 163, 184, 0.16)';
      for (let i = 0; i < 4; i++) {
        ctx.fillRect(x + 6, y + 7 + i * 7, TILE - 12, 3);
      }
    }
  }

  private paintLanes(ctx: CanvasRenderingContext2D): void {
    for (const lane of this.game.board.lanes) {
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';

      ctx.strokeStyle = PALETTE.lane;
      ctx.lineWidth = TILE * 0.86;
      this.strokeLane(ctx, lane.points);

      ctx.strokeStyle = PALETTE.laneEdge;
      ctx.lineWidth = 1.5;
      ctx.setLineDash([]);
      this.strokeLaneOutline(ctx, lane.points, TILE * 0.43);
    }
  }

  private strokeLane(ctx: CanvasRenderingContext2D, points: { x: number; y: number }[]): void {
    ctx.beginPath();
    ctx.moveTo(points[0].x, points[0].y);
    for (let i = 1; i < points.length; i++) ctx.lineTo(points[i].x, points[i].y);
    ctx.stroke();
  }

  /** Draws the two glowing rails that bound a lane. */
  private strokeLaneOutline(
    ctx: CanvasRenderingContext2D,
    points: { x: number; y: number }[],
    half: number,
  ): void {
    for (const side of [-1, 1]) {
      ctx.beginPath();
      for (let i = 1; i < points.length; i++) {
        const a = points[i - 1];
        const b = points[i];
        const dx = b.x - a.x;
        const dy = b.y - a.y;
        const len = Math.hypot(dx, dy) || 1;
        // Offset each segment along its own normal. Corners are left slightly
        // open, which reads as a bevel and avoids ugly mitre spikes.
        const nx = (-dy / len) * half * side;
        const ny = (dx / len) * half * side;
        ctx.moveTo(a.x + nx, a.y + ny);
        ctx.lineTo(b.x + nx, b.y + ny);
      }
      ctx.stroke();
    }
  }

  /** Animated dashes travelling along each lane toward the core. */
  private drawLaneFlow(ctx: CanvasRenderingContext2D, time: number): void {
    ctx.save();
    ctx.strokeStyle = PALETTE.laneFlow;
    ctx.globalAlpha = 0.24;
    ctx.lineWidth = 2;
    ctx.setLineDash([10, 26]);
    ctx.lineDashOffset = -time * 46;
    for (const lane of this.game.board.lanes) this.strokeLane(ctx, lane.points);
    ctx.restore();
  }

  /* --------------------------------------------------------------- overlays */

  private drawBuildOverlay(ctx: CanvasRenderingContext2D, view: ViewState): void {
    if (!view.buildType) return;
    const { hoverCol, hoverRow } = view;
    if (hoverCol < 0 || hoverRow < 0) return;

    const check = this.game.canBuild(hoverCol, hoverRow, view.buildType);
    const x = hoverCol * TILE;
    const y = hoverRow * TILE;

    ctx.fillStyle = check.ok ? PALETTE.buildOk : PALETTE.buildBad;
    ctx.fillRect(x, y, TILE, TILE);

    if (check.ok) {
      const stats = this.game.previewStats(view.buildType);
      ctx.beginPath();
      ctx.arc(x + TILE / 2, y + TILE / 2, stats.range, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(56, 189, 248, 0.07)';
      ctx.fill();
      ctx.strokeStyle = 'rgba(125, 211, 252, 0.5)';
      ctx.lineWidth = 1;
      ctx.stroke();

      const sprite = getTowerSprite(view.buildType, 0, TILE - 6);
      ctx.globalAlpha = 0.65;
      ctx.drawImage(sprite, x + (TILE - sprite.width) / 2, y + (TILE - sprite.height) / 2);
      ctx.globalAlpha = 1;
    }
  }

  private drawRanges(ctx: CanvasRenderingContext2D, view: ViewState): void {
    const targets = view.showAllRanges
      ? this.game.towers
      : this.game.towers.filter((t) => t.id === view.selectedTowerId);

    for (const tower of targets) {
      ctx.beginPath();
      ctx.arc(tower.x, tower.y, tower.stats.range, 0, Math.PI * 2);
      ctx.fillStyle = `${tower.def.color}12`;
      ctx.fill();
      ctx.strokeStyle = `${tower.def.color}88`;
      ctx.lineWidth = 1.5;
      ctx.stroke();
    }
  }

  /* ---------------------------------------------------------------- entities */

  private drawCore(ctx: CanvasRenderingContext2D, time: number): void {
    const { core } = this.game.board;
    const health = Math.max(0, this.game.integrity / this.game.maxIntegrity);
    const pulse = 0.5 + Math.sin(time * 2.4) * 0.5;
    const radius = 17 + pulse * 3;

    const hue = 140 * health;
    const color = `hsl(${hue}, 85%, 58%)`;

    ctx.save();
    ctx.shadowBlur = 22;
    ctx.shadowColor = color;

    ctx.beginPath();
    for (let i = 0; i < 6; i++) {
      const a = (Math.PI / 3) * i - Math.PI / 2;
      const px = core.x + Math.cos(a) * radius;
      const py = core.y + Math.sin(a) * radius;
      if (i === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    }
    ctx.closePath();
    ctx.fillStyle = `hsla(${hue}, 85%, 40%, 0.55)`;
    ctx.fill();
    ctx.strokeStyle = color;
    ctx.lineWidth = 2.5;
    ctx.stroke();
    ctx.restore();
  }

  private drawTowers(ctx: CanvasRenderingContext2D, view: ViewState): void {
    for (const tower of this.game.towers) {
      this.drawTower(ctx, tower, tower.id === view.selectedTowerId);
    }
  }

  private drawTower(ctx: CanvasRenderingContext2D, tower: Tower, selected: boolean): void {
    const sprite = getTowerSprite(tower.type, tower.tier, TILE - 4);
    const x = tower.x - sprite.width / 2;
    const y = tower.y - sprite.height / 2;

    if (selected) {
      ctx.strokeStyle = '#e2e8f0';
      ctx.lineWidth = 2;
      ctx.strokeRect(tower.x - TILE / 2 + 1, tower.y - TILE / 2 + 1, TILE - 2, TILE - 2);
    }

    // Barrel indicator: a short stub pointing at whatever the tower last shot.
    if (tower.def.attack !== 'aura' && tower.def.attack !== 'field') {
      ctx.save();
      ctx.strokeStyle = tower.def.color;
      ctx.lineWidth = 3;
      ctx.globalAlpha = 0.75;
      ctx.beginPath();
      ctx.moveTo(tower.x, tower.y);
      ctx.lineTo(tower.x + Math.cos(tower.angle) * 15, tower.y + Math.sin(tower.angle) * 15);
      ctx.stroke();
      ctx.restore();
    }

    ctx.drawImage(sprite, x, y);

    if (tower.flash > 0) {
      ctx.save();
      ctx.globalAlpha = Math.min(0.75, tower.flash * 9);
      ctx.globalCompositeOperation = 'lighter';
      ctx.drawImage(getFlashSprite(sprite), x, y);
      ctx.restore();
    }
  }

  private drawThreats(ctx: CanvasRenderingContext2D, alpha: number): void {
    for (const threat of this.game.threats) this.drawThreat(ctx, threat, alpha);
  }

  private drawThreat(ctx: CanvasRenderingContext2D, threat: Threat, alpha: number): void {
    const x = lerp(threat.prevX, threat.x, alpha);
    const y = lerp(threat.prevY, threat.y, alpha);
    const target = threat.def.size * 2;
    const sprite = getThreatSprite(threat.type, target);
    const sx = Math.round(x - sprite.width / 2);
    const sy = Math.round(y - sprite.height / 2);

    ctx.save();

    // Stealthed threats are drawn as a faint outline so the player can tell
    // something is there without being able to act on it.
    const hidden = threat.def.traits.stealth && !threat.revealed;
    if (hidden) ctx.globalAlpha = 0.16;

    if (threat.tunneled) {
      ctx.strokeStyle = 'rgba(96, 165, 250, 0.5)';
      ctx.setLineDash([3, 3]);
      ctx.beginPath();
      ctx.arc(x, y, threat.def.size + 5, 0, Math.PI * 2);
      ctx.stroke();
      ctx.setLineDash([]);
    }

    ctx.drawImage(sprite, sx, sy);

    if (threat.flash > 0 && !hidden) {
      ctx.globalAlpha = Math.min(0.9, threat.flash * 11);
      ctx.globalCompositeOperation = 'lighter';
      ctx.drawImage(getFlashSprite(sprite), sx, sy);
      ctx.globalCompositeOperation = 'source-over';
      ctx.globalAlpha = 1;
    }
    ctx.restore();

    if (hidden) return;

    this.drawHealthBar(ctx, threat, x, y);
    this.drawStatusPips(ctx, threat, x, y);
  }

  private drawHealthBar(
    ctx: CanvasRenderingContext2D,
    threat: Threat,
    x: number,
    y: number,
  ): void {
    const w = Math.max(18, threat.def.size * 2);
    const h = 3;
    const top = y - threat.def.size - 8;
    const pct = Math.max(0, threat.hp / threat.maxHp);

    ctx.fillStyle = 'rgba(2, 6, 23, 0.8)';
    ctx.fillRect(x - w / 2, top, w, h);
    ctx.fillStyle = pct > 0.55 ? '#4ade80' : pct > 0.25 ? '#facc15' : '#f87171';
    ctx.fillRect(x - w / 2, top, w * pct, h);

    if (threat.maxShield > 0 && threat.shield > 0) {
      ctx.fillStyle = '#38bdf8';
      ctx.fillRect(x - w / 2, top - 4, w * (threat.shield / threat.maxShield), 2);
    }
  }

  private drawStatusPips(
    ctx: CanvasRenderingContext2D,
    threat: Threat,
    x: number,
    y: number,
  ): void {
    if (threat.statuses.length === 0) return;
    const colors: Record<string, string> = {
      slow: '#38bdf8',
      burn: '#fb923c',
      flag: '#a78bfa',
      stun: '#facc15',
    };
    let px = x - (threat.statuses.length * 5) / 2;
    const py = y + threat.def.size + 4;
    for (const status of threat.statuses) {
      ctx.fillStyle = colors[status.type] ?? '#e2e8f0';
      ctx.fillRect(px, py, 3, 3);
      px += 5;
    }
  }

  private drawProjectiles(ctx: CanvasRenderingContext2D, alpha: number): void {
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    for (const p of this.game.projectiles) this.drawProjectile(ctx, p, alpha);
    ctx.restore();
  }

  private drawProjectile(ctx: CanvasRenderingContext2D, p: Projectile, alpha: number): void {
    const x = lerp(p.prevX, p.x, alpha);
    const y = lerp(p.prevY, p.y, alpha);

    if (p.kind === 'bolt') {
      const dx = x - p.prevX;
      const dy = y - p.prevY;
      const len = Math.hypot(dx, dy) || 1;
      ctx.strokeStyle = p.color;
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(x - (dx / len) * 9, y - (dy / len) * 9);
      ctx.stroke();
      return;
    }

    ctx.fillStyle = p.color;
    ctx.beginPath();
    ctx.arc(x, y, 4.5, 0, Math.PI * 2);
    ctx.fill();
  }

  private drawEffects(ctx: CanvasRenderingContext2D): void {
    ctx.save();
    for (const e of this.game.effects) this.drawEffect(ctx, e);
    ctx.restore();
  }

  private drawEffect(ctx: CanvasRenderingContext2D, e: Effect): void {
    const t = Math.min(1, e.age / e.life);
    const fade = 1 - t;

    switch (e.kind) {
      case 'blast': {
        ctx.globalCompositeOperation = 'lighter';
        ctx.globalAlpha = fade * 0.8;
        ctx.beginPath();
        ctx.arc(e.x, e.y, e.radius * (0.3 + t * 0.9), 0, Math.PI * 2);
        ctx.strokeStyle = e.color;
        ctx.lineWidth = 2 + fade * 2;
        ctx.stroke();
        break;
      }
      case 'ring': {
        ctx.globalCompositeOperation = 'lighter';
        ctx.globalAlpha = fade * 0.35;
        ctx.beginPath();
        ctx.arc(e.x, e.y, e.radius * t, 0, Math.PI * 2);
        ctx.strokeStyle = e.color;
        ctx.lineWidth = 3;
        ctx.stroke();
        break;
      }
      case 'beam': {
        ctx.globalCompositeOperation = 'lighter';
        ctx.globalAlpha = fade;
        ctx.strokeStyle = e.color;
        ctx.lineWidth = 3.5 * fade + 1;
        ctx.beginPath();
        ctx.moveTo(e.x, e.y);
        ctx.lineTo(e.x2, e.y2);
        ctx.stroke();
        break;
      }
      case 'chain': {
        // A few random offsets turn a straight line into a believable arc.
        ctx.globalCompositeOperation = 'lighter';
        ctx.globalAlpha = fade;
        ctx.strokeStyle = e.color;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(e.x, e.y);
        const steps = 4;
        for (let i = 1; i < steps; i++) {
          const f = i / steps;
          const jitter = (Math.sin(i * 12.9898 + e.age * 40) * 6) as number;
          ctx.lineTo(
            e.x + (e.x2 - e.x) * f + jitter,
            e.y + (e.y2 - e.y) * f - jitter,
          );
        }
        ctx.lineTo(e.x2, e.y2);
        ctx.stroke();
        break;
      }
      case 'leak': {
        ctx.globalCompositeOperation = 'source-over';
        ctx.globalAlpha = fade * 0.5;
        ctx.beginPath();
        ctx.arc(e.x, e.y, e.radius * (0.4 + t), 0, Math.PI * 2);
        ctx.fillStyle = e.color;
        ctx.fill();
        break;
      }
      default:
        break;
    }
    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = 'source-over';
  }
}
