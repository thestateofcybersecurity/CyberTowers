/**
 * Procedural sound. Every effect is synthesised from oscillators and noise at
 * play time, so the game ships with no audio files at all and nothing to load
 * before the first wave.
 *
 * The AudioContext is created lazily on the first user gesture, which is what
 * browser autoplay policies require.
 */

type SfxName =
  | 'build'
  | 'sell'
  | 'upgrade'
  | 'shoot'
  | 'zap'
  | 'blast'
  | 'kill'
  | 'leak'
  | 'wave'
  | 'boss'
  | 'victory'
  | 'defeat'
  | 'denied';

class SfxEngine {
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  private noise: AudioBuffer | null = null;
  private muted = false;
  /** Rate limit per sound so a wall of towers firing cannot clip the output. */
  private lastPlayed = new Map<SfxName, number>();

  setMuted(muted: boolean): void {
    this.muted = muted;
    if (this.master && this.ctx) {
      this.master.gain.setTargetAtTime(muted ? 0 : 0.5, this.ctx.currentTime, 0.02);
    }
  }

  get isMuted(): boolean {
    return this.muted;
  }

  private ensure(): boolean {
    if (this.ctx) return true;
    if (typeof window === 'undefined') return false;

    const Ctor = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Ctor) return false;

    this.ctx = new Ctor();
    this.master = this.ctx.createGain();
    this.master.gain.value = this.muted ? 0 : 0.5;
    this.master.connect(this.ctx.destination);

    // One second of white noise, reused for every percussive effect.
    const length = this.ctx.sampleRate;
    this.noise = this.ctx.createBuffer(1, length, this.ctx.sampleRate);
    const data = this.noise.getChannelData(0);
    for (let i = 0; i < length; i++) data[i] = Math.random() * 2 - 1;

    return true;
  }

  /** Resumes a suspended context; call from a click handler. */
  unlock(): void {
    if (!this.ensure()) return;
    if (this.ctx!.state === 'suspended') void this.ctx!.resume();
  }

  private tone(
    freq: number,
    duration: number,
    opts: { type?: OscillatorType; gain?: number; sweepTo?: number; delay?: number } = {},
  ): void {
    const ctx = this.ctx!;
    const now = ctx.currentTime + (opts.delay ?? 0);
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = opts.type ?? 'square';
    osc.frequency.setValueAtTime(freq, now);
    if (opts.sweepTo) osc.frequency.exponentialRampToValueAtTime(Math.max(1, opts.sweepTo), now + duration);

    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.exponentialRampToValueAtTime(opts.gain ?? 0.18, now + 0.008);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);

    osc.connect(gain).connect(this.master!);
    osc.start(now);
    osc.stop(now + duration + 0.02);
  }

  private burst(duration: number, freq: number, gainValue = 0.2): void {
    const ctx = this.ctx!;
    const now = ctx.currentTime;
    const src = ctx.createBufferSource();
    src.buffer = this.noise;

    const filter = ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(freq, now);
    filter.frequency.exponentialRampToValueAtTime(Math.max(80, freq * 0.3), now + duration);

    const gain = ctx.createGain();
    gain.gain.setValueAtTime(gainValue, now);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);

    src.connect(filter).connect(gain).connect(this.master!);
    src.start(now);
    src.stop(now + duration + 0.02);
  }

  play(name: SfxName): void {
    if (this.muted || !this.ensure()) return;
    if (this.ctx!.state === 'suspended') return;

    const now = performance.now();
    const throttle = name === 'shoot' || name === 'zap' ? 55 : name === 'kill' ? 40 : 0;
    if (throttle > 0) {
      const last = this.lastPlayed.get(name) ?? 0;
      if (now - last < throttle) return;
      this.lastPlayed.set(name, now);
    }

    switch (name) {
      case 'shoot':
        this.tone(720, 0.06, { type: 'square', gain: 0.05, sweepTo: 380 });
        break;
      case 'zap':
        this.tone(1400, 0.09, { type: 'sawtooth', gain: 0.05, sweepTo: 300 });
        break;
      case 'blast':
        this.burst(0.22, 900, 0.14);
        break;
      case 'kill':
        this.tone(340, 0.09, { type: 'triangle', gain: 0.07, sweepTo: 120 });
        break;
      case 'build':
        this.tone(440, 0.08, { type: 'square', gain: 0.12 });
        this.tone(660, 0.1, { type: 'square', gain: 0.1, delay: 0.06 });
        break;
      case 'upgrade':
        this.tone(523, 0.08, { type: 'square', gain: 0.12 });
        this.tone(659, 0.08, { type: 'square', gain: 0.12, delay: 0.07 });
        this.tone(784, 0.14, { type: 'square', gain: 0.12, delay: 0.14 });
        break;
      case 'sell':
        this.tone(520, 0.1, { type: 'triangle', gain: 0.12, sweepTo: 260 });
        break;
      case 'leak':
        this.tone(180, 0.4, { type: 'sawtooth', gain: 0.2, sweepTo: 60 });
        this.burst(0.3, 300, 0.16);
        break;
      case 'wave':
        this.tone(392, 0.12, { type: 'square', gain: 0.13 });
        this.tone(523, 0.18, { type: 'square', gain: 0.13, delay: 0.1 });
        break;
      case 'boss':
        this.tone(110, 0.6, { type: 'sawtooth', gain: 0.22 });
        this.tone(82, 0.8, { type: 'sawtooth', gain: 0.18, delay: 0.12 });
        break;
      case 'victory':
        [523, 659, 784, 1047].forEach((f, i) =>
          this.tone(f, 0.24, { type: 'square', gain: 0.14, delay: i * 0.13 }),
        );
        break;
      case 'defeat':
        [392, 330, 262, 196].forEach((f, i) =>
          this.tone(f, 0.34, { type: 'sawtooth', gain: 0.16, delay: i * 0.17 }),
        );
        break;
      case 'denied':
        this.tone(200, 0.1, { type: 'square', gain: 0.09 });
        break;
      default:
        break;
    }
  }
}

export const sfx = new SfxEngine();
