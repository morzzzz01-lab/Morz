import React from 'react';
import {AbsoluteFill, Img, staticFile} from 'remotion';
import {C, F, H, W, clamp01, easeOut, flicker, lerp, prog, rand} from './lib';

export type Cam = {z: number; x: number; y: number};

/**
 * One product photo as a camera shot. The square photo is drawn `z` frame-widths wide with
 * image point (x, y) at the frame centre (cy), and the camera moves from `from` to `to`
 * between t0 and t1. When the photo is shorter than the frame, a blurred copy of the same
 * photo fills the rest, so the product itself is never stretched or altered.
 */
export const Shot: React.FC<{
  src: string;
  t: number;
  t0: number;
  t1: number;
  from: Cam;
  to: Cam;
  cy?: number;
  opacity?: number;
  bright?: number;
  blur?: number;
}> = ({src, t, t0, t1, from, to, cy = H * 0.5, opacity = 1, bright = 1, blur = 0}) => {
  const k = prog(t, t0, t1, (x) => x * (2 - x) * 0.35 + x * 0.65);
  const z = lerp(from.z, to.z, k);
  const x = lerp(from.x, to.x, k);
  const y = lerp(from.y, to.y, k);
  const S = W * z;
  const left = W / 2 - x * S;
  const top = cy - y * S;
  const short = S < H;
  const grade = `brightness(${bright}) saturate(1.12) contrast(1.06)`;
  return (
    <AbsoluteFill style={{opacity, overflow: 'hidden', backgroundColor: C.night}}>
      {short && (
        <Img
          src={staticFile(src)}
          style={{
            position: 'absolute',
            width: H * 1.25,
            height: H * 1.25,
            left: W / 2 - H * 0.625,
            top: H / 2 - H * 0.625,
            filter: `blur(46px) brightness(${0.42 * bright}) saturate(1.2)`,
          }}
        />
      )}
      <Img
        src={staticFile(src)}
        style={{
          position: 'absolute',
          width: S,
          height: S,
          left,
          top,
          filter: blur > 0 ? `${grade} blur(${blur}px)` : grade,
          WebkitMaskImage: short
            ? 'linear-gradient(to bottom, transparent 0%, #000 14%, #000 86%, transparent 100%)'
            : undefined,
        }}
      />
    </AbsoluteFill>
  );
};

/** Warm grade over everything: candle-gold soft light, dark edges. */
export const WarmGrade: React.FC<{t: number; strength?: number}> = ({t, strength = 1}) => (
  <>
    <AbsoluteFill
      style={{
        mixBlendMode: 'soft-light',
        opacity: 0.55 * strength,
        background: `radial-gradient(ellipse 80% 60% at 50% ${55 + 3 * Math.sin(t * 0.7)}%, ${C.gold} 0%, #7A3A10 70%, ${C.night} 100%)`,
      }}
    />
    <AbsoluteFill
      style={{
        background:
          'radial-gradient(ellipse 120% 85% at 50% 50%, transparent 52%, rgba(8,5,3,0.78) 100%)',
      }}
    />
  </>
);

/** Slow light leak drifting across the frame (screen blend). */
export const LightLeak: React.FC<{t: number; amount: number; seed?: number}> = ({
  t,
  amount,
  seed = 0,
}) => {
  const x = 20 + 60 * (0.5 + 0.5 * Math.sin(t * 0.45 + seed));
  const y = 25 + 50 * (0.5 + 0.5 * Math.cos(t * 0.33 + seed * 1.7));
  return (
    <AbsoluteFill
      style={{
        mixBlendMode: 'screen',
        opacity: amount,
        background: `radial-gradient(circle at ${x}% ${y}%, rgba(255,150,60,0.55) 0%, rgba(255,110,40,0.18) 28%, transparent 55%)`,
      }}
    />
  );
};

/** Floating warm dust and bokeh, deterministic. */
export const Embers: React.FC<{t: number; amount: number; count?: number}> = ({
  t,
  amount,
  count = 26,
}) => (
  <AbsoluteFill style={{mixBlendMode: 'screen', opacity: amount}}>
    {Array.from({length: count}).map((_, i) => {
      const big = rand(i * 3.1) > 0.72;
      const r = big ? 18 + 30 * rand(i * 7.7) : 3 + 5 * rand(i * 5.3);
      const speed = 18 + 40 * rand(i * 2.2);
      const x = W * rand(i * 9.1) + 30 * Math.sin(t * 0.6 + i);
      const y = ((H * rand(i * 4.4) - t * speed) % (H + 200) + H + 200) % (H + 200) - 100;
      const a = (big ? 0.22 : 0.7) * (0.5 + 0.5 * flicker(t, i));
      return (
        <div
          key={i}
          style={{
            position: 'absolute',
            left: x - r,
            top: y - r,
            width: r * 2,
            height: r * 2,
            borderRadius: '50%',
            opacity: a,
            filter: big ? 'blur(6px)' : 'blur(1px)',
            background: `radial-gradient(circle, ${C.goldHi} 0%, rgba(255,170,80,0.5) 45%, transparent 70%)`,
          }}
        />
      );
    })}
  </AbsoluteFill>
);

export const Grain: React.FC<{frame: number; opacity?: number}> = ({frame, opacity = 0.08}) => (
  <AbsoluteFill style={{pointerEvents: 'none', mixBlendMode: 'overlay', opacity}}>
    <svg width={W} height={H}>
      <filter id="grain" x="0" y="0" width="100%" height="100%">
        <feTurbulence
          type="fractalNoise"
          baseFrequency="0.8"
          numOctaves={2}
          seed={Math.floor(frame / 2) % 97}
          stitchTiles="stitch"
        />
        <feColorMatrix type="saturate" values="0" />
      </filter>
      <rect width={W} height={H} filter="url(#grain)" />
    </svg>
  </AbsoluteFill>
);

/** Shade behind a caption block so it reads on any photo. */
export const Scrim: React.FC<{top: number; height: number; amount: number}> = ({
  top,
  height,
  amount,
}) => (
  <div
    style={{
      position: 'absolute',
      left: 0,
      right: 0,
      top,
      height,
      opacity: amount,
      background:
        'linear-gradient(to bottom, transparent 0%, rgba(10,6,3,0.62) 30%, rgba(10,6,3,0.62) 70%, transparent 100%)',
    }}
  />
);

/**
 * A word that lands: rises, unblurs and settles. `k` 0→1 in, `out` 0→1 away.
 * `punch` adds a scale overshoot for the hook.
 */
export const Word: React.FC<{
  k: number;
  out?: number;
  punch?: boolean;
  color?: string;
  children: React.ReactNode;
  style?: React.CSSProperties;
}> = ({k, out = 0, punch, color = C.cream, children, style}) => {
  const kk = clamp01(k);
  const scale = punch ? lerp(1.45, 1, Math.min(1, k)) + (k > 1 ? 0 : 0) : 1;
  return (
    <span
      style={{
        display: 'inline-block',
        color,
        opacity: kk * (1 - out),
        transform: `translateY(${(1 - kk) * 40 - out * 30}px) scale(${scale})`,
        filter: `blur(${(1 - kk) * 14 + out * 10}px)`,
        ...style,
      }}
    >
      {children}
    </span>
  );
};

export const headline: React.CSSProperties = {
  fontFamily: F.sans,
  fontWeight: 850,
  letterSpacing: '-0.015em',
  lineHeight: 1.02,
  textTransform: 'uppercase',
  textAlign: 'center',
  textShadow: '0 6px 40px rgba(0,0,0,0.55)',
};

export {easeOut};
