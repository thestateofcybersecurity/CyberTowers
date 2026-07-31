import { TILE, distToSegment, tileToWorld } from '../core/math';
import type { GameMapDef, Vec2 } from '../core/types';

/**
 * A lane flattened into an arc-length parameterisation. Threats store a single
 * scalar `progress` in pixels instead of a waypoint index, which makes "which
 * threat is furthest along?" a numeric comparison rather than a path walk. That
 * is what powers first/last targeting without any special cases.
 */
export interface Lane {
  points: Vec2[];
  /** Cumulative distance to the start of each point. */
  cumulative: number[];
  length: number;
}

function buildLane(tiles: Vec2[]): Lane {
  const points = tiles.map(tileToWorld);
  const cumulative: number[] = [0];
  let total = 0;
  for (let i = 1; i < points.length; i++) {
    total += Math.hypot(points[i].x - points[i - 1].x, points[i].y - points[i - 1].y);
    cumulative.push(total);
  }
  return { points, cumulative, length: total };
}

/** World position at `distance` px along the lane, clamped at both ends. */
export function lanePointAt(lane: Lane, distance: number, out: Vec2): Vec2 {
  if (distance <= 0) {
    out.x = lane.points[0].x;
    out.y = lane.points[0].y;
    return out;
  }
  if (distance >= lane.length) {
    const last = lane.points[lane.points.length - 1];
    out.x = last.x;
    out.y = last.y;
    return out;
  }

  // Points per lane are few (under a dozen), so a linear scan beats the
  // bookkeeping a binary search would need here.
  let i = 1;
  while (i < lane.cumulative.length - 1 && lane.cumulative[i] < distance) i++;

  const segStart = lane.cumulative[i - 1];
  const segLen = lane.cumulative[i] - segStart;
  const t = segLen === 0 ? 0 : (distance - segStart) / segLen;
  const a = lane.points[i - 1];
  const b = lane.points[i];
  out.x = a.x + (b.x - a.x) * t;
  out.y = a.y + (b.y - a.y) * t;
  return out;
}

export class Board {
  readonly map: GameMapDef;
  readonly cols: number;
  readonly rows: number;
  readonly width: number;
  readonly height: number;
  readonly lanes: Lane[];
  /** Straight-line routes for tunnelled threats: spawn point directly to core. */
  readonly tunnelLanes: Lane[];
  readonly core: Vec2;

  /** cols*rows flags: 1 when a tower may be placed on that tile. */
  private readonly buildable: Uint8Array;

  constructor(map: GameMapDef) {
    this.map = map;
    this.cols = map.cols;
    this.rows = map.rows;
    this.width = map.cols * TILE;
    this.height = map.rows * TILE;
    this.lanes = map.lanes.map(buildLane);

    const lastLane = this.lanes[0];
    this.core = { ...lastLane.points[lastLane.points.length - 1] };

    this.tunnelLanes = this.lanes.map((lane) => ({
      points: [lane.points[0], this.core],
      cumulative: [0, Math.hypot(this.core.x - lane.points[0].x, this.core.y - lane.points[0].y)],
      length: Math.hypot(this.core.x - lane.points[0].x, this.core.y - lane.points[0].y),
    }));

    this.buildable = new Uint8Array(this.cols * this.rows);
    this.computeBuildable(map.blocked);
  }

  private computeBuildable(blocked: Vec2[]): void {
    const blockedKeys = new Set(blocked.map((b) => `${b.x},${b.y}`));
    // A tile is off-limits if its centre sits within roughly two-thirds of a
    // tile of any lane segment. Using the centre (not a corner, which is what
    // the original did) means the exclusion band is symmetric around the path.
    const clearance = TILE * 0.68;

    for (let row = 0; row < this.rows; row++) {
      for (let col = 0; col < this.cols; col++) {
        if (blockedKeys.has(`${col},${row}`)) continue;

        const cx = col * TILE + TILE / 2;
        const cy = row * TILE + TILE / 2;
        let onPath = false;

        for (const lane of this.lanes) {
          for (let i = 1; i < lane.points.length && !onPath; i++) {
            const a = lane.points[i - 1];
            const b = lane.points[i];
            if (distToSegment(cx, cy, a.x, a.y, b.x, b.y) < clearance) onPath = true;
          }
          if (onPath) break;
        }

        if (!onPath) this.buildable[row * this.cols + col] = 1;
      }
    }
  }

  inBounds(col: number, row: number): boolean {
    return col >= 0 && row >= 0 && col < this.cols && row < this.rows;
  }

  isBuildable(col: number, row: number): boolean {
    if (!this.inBounds(col, row)) return false;
    return this.buildable[row * this.cols + col] === 1;
  }

  /** Total buildable tiles, surfaced in the map select card. */
  get buildableCount(): number {
    let n = 0;
    for (let i = 0; i < this.buildable.length; i++) n += this.buildable[i];
    return n;
  }
}
