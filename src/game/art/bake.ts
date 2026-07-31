import type { ThreatId, TowerId } from '../core/types';
import { SPRITE_SIZE, THREAT_SPRITES, TOWER_SPRITES, type PixelSprite } from './sprites';

/**
 * Turns character-grid sprites into canvases once, then hands out the cached
 * result. Baking at an integer scale keeps every pixel square: scaling a 16px
 * source to, say, 23px at draw time is what makes hand-drawn pixel art look
 * like mush, so callers ask for a target size and get the nearest clean multiple.
 */

const cache = new Map<string, HTMLCanvasElement>();

function validate(name: string, sprite: PixelSprite): void {
  if (sprite.rows.length !== SPRITE_SIZE) {
    throw new Error(
      `Sprite "${name}" has ${sprite.rows.length} rows, expected ${SPRITE_SIZE}.`,
    );
  }
  sprite.rows.forEach((row, i) => {
    if (row.length !== SPRITE_SIZE) {
      throw new Error(
        `Sprite "${name}" row ${i} is ${row.length} chars, expected ${SPRITE_SIZE}: "${row}"`,
      );
    }
    for (const ch of row) {
      if (ch !== '.' && !(ch in sprite.palette)) {
        throw new Error(`Sprite "${name}" row ${i} uses undefined palette key "${ch}".`);
      }
    }
  });
}

let validated = false;

/**
 * Checks every sprite grid. Pure string work with no canvas involved, so the
 * headless simulation harness can run it in Node and catch a miscounted row
 * before it ever reaches a browser.
 */
export function validateSprites(): void {
  for (const [id, sprite] of Object.entries(THREAT_SPRITES)) validate(`threat:${id}`, sprite);
  for (const [id, sprite] of Object.entries(TOWER_SPRITES)) validate(`tower:${id}`, sprite);
}

/** Runs once on first bake so a bad grid fails immediately and obviously. */
function validateAll(): void {
  if (validated) return;
  validated = true;
  validateSprites();
}

function makeCanvas(w: number, h: number): HTMLCanvasElement {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  return c;
}

function paint(sprite: PixelSprite, scale: number): HTMLCanvasElement {
  const canvas = makeCanvas(SPRITE_SIZE * scale, SPRITE_SIZE * scale);
  const ctx = canvas.getContext('2d')!;
  ctx.imageSmoothingEnabled = false;

  for (let y = 0; y < SPRITE_SIZE; y++) {
    const row = sprite.rows[y];
    for (let x = 0; x < SPRITE_SIZE; x++) {
      const ch = row[x];
      if (ch === '.') continue;
      ctx.fillStyle = sprite.palette[ch];
      ctx.fillRect(x * scale, y * scale, scale, scale);
    }
  }
  return canvas;
}

/** Largest integer scale whose output does not exceed `targetPx`. */
function scaleFor(targetPx: number): number {
  return Math.max(1, Math.round(targetPx / SPRITE_SIZE));
}

export function getThreatSprite(id: ThreatId, targetPx: number): HTMLCanvasElement {
  validateAll();
  const scale = scaleFor(targetPx);
  const key = `t:${id}:${scale}`;
  let canvas = cache.get(key);
  if (!canvas) {
    canvas = paint(THREAT_SPRITES[id], scale);
    cache.set(key, canvas);
  }
  return canvas;
}

/**
 * Tower sprites carry their upgrade tier as chevrons burned into the bottom of
 * the sprite, so a glance at the board tells you which batteries are maxed
 * without hovering anything.
 */
export function getTowerSprite(id: TowerId, tier: number, targetPx: number): HTMLCanvasElement {
  validateAll();
  const scale = scaleFor(targetPx);
  const key = `w:${id}:${tier}:${scale}`;
  const hit = cache.get(key);
  if (hit) return hit;

  const canvas = paint(TOWER_SPRITES[id], scale);
  if (tier > 0) {
    const ctx = canvas.getContext('2d')!;
    const pip = Math.max(1, Math.floor(scale));
    const gap = pip;
    const totalW = tier * pip * 2 + (tier - 1) * gap;
    let x = Math.round((canvas.width - totalW) / 2);
    const y = canvas.height - pip * 2;

    for (let i = 0; i < tier; i++) {
      ctx.fillStyle = '#0b1220';
      ctx.fillRect(x - pip / 2, y - pip / 2, pip * 3, pip * 2);
      ctx.fillStyle = TIER_PIP_COLORS[Math.min(tier, 3)];
      ctx.fillRect(x, y, pip * 2, pip);
      x += pip * 2 + gap;
    }
  }

  cache.set(key, canvas);
  return canvas;
}

const TIER_PIP_COLORS = ['#64748b', '#7dd3fc', '#c084fc', '#fbbf24'];

/**
 * A solid-white silhouette of a sprite, composited on top at low alpha for the
 * hit flash. Pre-baking beats per-frame filter work by a wide margin.
 */
const flashCache = new WeakMap<HTMLCanvasElement, HTMLCanvasElement>();

export function getFlashSprite(source: HTMLCanvasElement): HTMLCanvasElement {
  const cached = flashCache.get(source);
  if (cached) return cached;

  const canvas = makeCanvas(source.width, source.height);
  const ctx = canvas.getContext('2d')!;
  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(source, 0, 0);
  ctx.globalCompositeOperation = 'source-in';
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  flashCache.set(source, canvas);
  return canvas;
}

/** Frees baked canvases; used when the game unmounts. */
export function clearSpriteCache(): void {
  cache.clear();
}
