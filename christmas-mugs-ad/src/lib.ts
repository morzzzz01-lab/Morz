import {Easing, spring, SpringConfig} from 'remotion';
import timeline from '../timeline.json';

export const TL = timeline;
export const FPS = TL.fps;
export const W = 1080;
export const H = 1920;

/** MORZ palette: warm black, gold, cream; ice blue only for the cold opening. Gold marks the point of each line. */
export const C = {
  night: '#0E0A07',
  ember: '#2A1709',
  cream: '#FFF5E6',
  creamDim: 'rgba(255,245,230,0.72)',
  gold: '#F5B95C',
  goldHi: '#FFD58F',
  glow: 'rgba(255,170,80,1)',
  ink: '#140D06',
  ice: '#A9D4FF',
  frost: '#0B1622',
  cream2: '#F3E6D3',
};

export const F = {
  sans: '"Inter Variable", Inter, system-ui, sans-serif',
  serif: '"Instrument Serif", Georgia, serif',
};

export const clamp01 = (x: number) => Math.min(1, Math.max(0, x));
export const lerp = (a: number, b: number, k: number) => a + (b - a) * k;

export const easeInOut = Easing.bezier(0.65, 0, 0.35, 1);
export const easeOut = Easing.bezier(0.16, 1, 0.3, 1);
export const easeIn = Easing.bezier(0.6, 0, 0.9, 0.35);

export const prog = (
  t: number,
  t0: number,
  t1: number,
  ease: (x: number) => number = easeInOut,
) => ease(clamp01((t - t0) / (t1 - t0)));

export const sp = (frame: number, startSec: number, config: Partial<SpringConfig> = {}) => {
  const fr = frame - startSec * FPS;
  if (fr <= 0) return 0;
  return spring({frame: fr, fps: FPS, config: {damping: 14, mass: 0.8, stiffness: 140, ...config}});
};

/** Deterministic 0..1 noise; never Math.random() in a render. */
export const rand = (n: number) => {
  const x = Math.sin(n * 127.1 + 311.7) * 43758.5453;
  return x - Math.floor(x);
};

/** Candle flicker, 0..1, a smooth sum of slow sines. */
export const flicker = (t: number, seed = 0) =>
  0.5 +
  0.22 * Math.sin(t * 7.3 + seed) +
  0.16 * Math.sin(t * 13.1 + seed * 2.1) +
  0.12 * Math.sin(t * 23.7 + seed * 3.7);
