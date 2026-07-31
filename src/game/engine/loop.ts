import { FIXED_DT, type Game } from './Game';

/**
 * Drives the simulation with a fixed-timestep accumulator and renders with
 * interpolation.
 *
 * The distinction that matters: `game.tick()` always advances exactly 1/60s, no
 * matter how long the frame took. Physics never depends on frame rate, a slow
 * frame cannot teleport a threat through a tower's range, and the fast-forward
 * button runs more ticks per frame rather than making each tick bigger.
 */
export class GameLoop {
  /** 1, 2 or 3. Multiplies how many simulation steps run per rendered frame. */
  speed = 1;
  paused = false;

  private raf = 0;
  private last = 0;
  private accumulator = 0;
  private clock = 0;
  private running = false;

  constructor(
    private readonly game: Game,
    private readonly render: (alpha: number, time: number) => void,
  ) {}

  start(): void {
    if (this.running) return;
    this.running = true;
    this.last = performance.now();
    this.accumulator = 0;
    this.raf = requestAnimationFrame(this.frame);
  }

  stop(): void {
    this.running = false;
    cancelAnimationFrame(this.raf);
  }

  private frame = (now: number): void => {
    if (!this.running) return;
    this.raf = requestAnimationFrame(this.frame);

    // Clamping the delta is what prevents the "spiral of death": after a tab
    // has been backgrounded for a minute we simulate a quarter second, not
    // sixty seconds of catch-up that would then make the next frame later still.
    const elapsed = Math.min((now - this.last) / 1000, 0.25);
    this.last = now;

    if (!this.paused) {
      this.clock += elapsed;
      this.accumulator += elapsed * this.speed;

      let steps = 0;
      while (this.accumulator >= FIXED_DT && steps < 12) {
        this.game.tick();
        this.accumulator -= FIXED_DT;
        steps += 1;
      }
      // If we hit the step cap the world is running slower than real time;
      // drop the backlog rather than accumulating debt we can never repay.
      if (steps >= 12) this.accumulator = 0;
    }

    const alpha = this.paused ? 1 : this.accumulator / FIXED_DT;
    this.render(alpha, this.clock);
  };
}
