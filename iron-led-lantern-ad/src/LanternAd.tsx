import React from 'react';
import {AbsoluteFill, Img, staticFile, useCurrentFrame} from 'remotion';
import {
  Embers,
  Grain,
  LightLeak,
  Scrim,
  Shot,
  WarmGrade,
  Word,
  headline,
} from './components';
import {C, F, FPS, H, TL, W, clamp01, easeIn, easeOut, flicker, lerp, prog, sp} from './lib';

const {s1, s2, s3, s4, s5} = TL;

/* Scene 1: dark, cosy room (the hero photo, defocused and dimmed) and the hook. */
const Hook: React.FC<{t: number; frame: number}> = ({t, frame}) => {
  const out = prog(t, s1.exit - 0.05, s1.exit + 0.25, easeIn);
  const words = ['YOUR', 'ROOM', 'IS', 'MISSING', 'THIS...'];
  const w = (i: number) => (
    <Word
      key={i}
      k={sp(frame, s1.words[i], {damping: 13, stiffness: 260, mass: 0.6})}
      out={out}
      punch
      color={i === 4 ? C.gold : C.cream}
      style={{margin: '0 0.12em'}}
    >
      {words[i]}
    </Word>
  );
  return (
    <AbsoluteFill style={{opacity: 1 - prog(t, s2.start, s2.start + 0.45)}}>
      <Shot
        src="photos/s10.jpg"
        t={t}
        t0={0}
        t1={2.2}
        from={{z: 2.5, x: 0.66, y: 0.62}}
        to={{z: 2.75, x: 0.64, y: 0.62}}
        bright={0.3 + 0.05 * flicker(t, 1)}
        blur={26}
      />
      <AbsoluteFill style={{background: 'rgba(8,5,3,0.35)'}} />
      <AbsoluteFill
        style={{alignItems: 'center', justifyContent: 'center', paddingBottom: 160}}
      >
        <div style={{...headline, fontSize: 118, width: 980}}>
          <div>{[0, 1, 2].map(w)}</div>
          <div>{[3, 4].map(w)}</div>
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};

/* Scene 2: the lantern in the dark, its light comes up, slow push in. */
const Reveal: React.FC<{t: number}> = ({t}) => {
  const on = prog(t, s2.lightOn, s2.lightOn + 0.5, easeOut);
  // Two quick pulses as the light catches, then a steady candle flicker.
  const catchPulse =
    t > s2.lightOn && t < s2.lightOn + 0.32
      ? 0.55 * Math.max(0, Math.sin(((t - s2.lightOn) / 0.32) * Math.PI * 2))
      : 0;
  const light = clamp01(on * (0.9 + 0.1 * flicker(t, 3)) + catchPulse * (1 - on));
  const bright = lerp(0.22, 1.04, light);
  const zoom = lerp(1.12, 1.32, prog(t, s2.start, s2.exit + 0.3, (x) => x));
  const exit = prog(t, s2.exit - 0.05, s3.start + 0.05, easeIn);
  const S = W * zoom * (1 + exit * 0.5);
  const cy = H * 0.49;
  const sweep = prog(t, s2.sweep, s2.sweep + 0.9, (x) => x);
  const label = prog(t, s2.label, s2.label + 0.7, easeOut);
  return (
    <AbsoluteFill
      style={{
        opacity: prog(t, s2.start, s2.start + 0.4) * (1 - exit),
        background: `radial-gradient(ellipse 90% 70% at 50% 52%, ${C.ember} 0%, ${C.night} 70%)`,
      }}
    >
      {/* halo behind the lantern, driven by the light */}
      <AbsoluteFill
        style={{
          mixBlendMode: 'screen',
          opacity: light * 0.95,
          background: `radial-gradient(circle at 50% ${(cy / H) * 100 + 2}%, rgba(255,170,80,0.55) 0%, rgba(255,120,40,0.22) 22%, transparent 48%)`,
        }}
      />
      {/* warm pool on the surface */}
      <div
        style={{
          position: 'absolute',
          left: W / 2 - S * 0.48,
          top: cy + S * 0.36,
          width: S * 0.96,
          height: S * 0.16,
          borderRadius: '50%',
          opacity: 0.25 + 0.6 * light,
          background:
            'radial-gradient(ellipse at 50% 40%, rgba(255,175,90,0.55) 0%, rgba(255,140,60,0.15) 45%, transparent 70%)',
          filter: 'blur(8px)',
        }}
      />
      <div style={{position: 'absolute', left: W / 2 - S / 2, top: cy - S / 2, width: S, height: S}}>
        <Img
          src={staticFile('photos/s1.png')}
          style={{width: S, height: S, filter: `brightness(${bright}) saturate(1.08) contrast(1.05)`}}
        />
        {/* a sheen crossing the metal, masked to the lantern itself */}
        <div
          style={{
            position: 'absolute',
            inset: 0,
            mixBlendMode: 'screen',
            opacity: sweep > 0 && sweep < 1 ? 0.55 : 0,
            WebkitMaskImage: `url(${staticFile('photos/s1.png')})`,
            WebkitMaskSize: '100% 100%',
            background: `linear-gradient(115deg, transparent ${lerp(-30, 110, sweep) - 12}%, rgba(255,236,200,0.85) ${lerp(-30, 110, sweep)}%, transparent ${lerp(-30, 110, sweep) + 12}%)`,
          }}
        />
      </div>
      <div
        style={{
          position: 'absolute',
          top: 300,
          width: '100%',
          textAlign: 'center',
          fontFamily: F.sans,
          fontWeight: 650,
          fontSize: 40,
          letterSpacing: '0.28em',
          color: C.gold,
          opacity: label,
          transform: `translateY(${(1 - label) * 18}px)`,
          filter: `blur(${(1 - label) * 8}px)`,
        }}
      >
        IRON LED CANDLE LANTERN
      </div>
    </AbsoluteFill>
  );
};

/* Scene 3: close-ups of the cut-outs, warm and slow. */
const CLOSE = [
  {src: 'photos/s8.jpg', from: {z: 2.7, x: 0.5, y: 0.5}, to: {z: 2.45, x: 0.5, y: 0.66}},
  {src: 'photos/s7.jpg', from: {z: 2.3, x: 0.47, y: 0.62}, to: {z: 2.7, x: 0.52, y: 0.6}},
  {src: 'photos/s9.jpg', from: {z: 2.6, x: 0.5, y: 0.7}, to: {z: 2.4, x: 0.5, y: 0.55}},
];

const CloseUps: React.FC<{t: number}> = ({t}) => {
  const ends = [...s3.shots.slice(1), s3.end];
  const textIn = (d: number) => prog(t, s3.text + d, s3.text + d + 0.6, easeOut);
  const textOut = prog(t, s3.textOut, s3.textOut + 0.35, easeIn);
  return (
    <AbsoluteFill>
      {CLOSE.map((c, i) => {
        const t0 = s3.shots[i];
        const fade = i === 0 ? prog(t, t0 - 0.3, t0 + 0.05) : prog(t, t0 - 0.15, t0 + 0.25);
        if (t < t0 - 0.35 || t > ends[i] + 0.4) return null;
        return (
          <Shot
            key={i}
            src={c.src}
            t={t}
            t0={t0 - 0.3}
            t1={ends[i] + 0.3}
            from={c.from}
            to={c.to}
            opacity={fade}
            bright={1.02}
          />
        );
      })}
      <Scrim top={1080} height={500} amount={textIn(0) * (1 - textOut)} />
      <Scrim top={1150} height={360} amount={0.7 * textIn(0) * (1 - textOut)} />
      <div
        style={{
          ...headline,
          position: 'absolute',
          top: 1190,
          width: '100%',
          fontSize: 124,
        }}
      >
        <div>
          <Word k={textIn(0)} out={textOut}>INSTANT</Word>
        </div>
        <div>
          <Word k={textIn(0.12)} out={textOut} color={C.gold}>COZY</Word>{' '}
          <Word k={textIn(0.24)} out={textOut}>VIBES</Word>
        </div>
      </div>
    </AbsoluteFill>
  );
};

/* Scene 4: other angles, one per beat, each moving a different way. */
const ANGLES = [
  {src: 'photos/s4.jpg', from: {z: 1.95, x: 0.42, y: 0.45}, to: {z: 2.1, x: 0.62, y: 0.47}},
  {src: 'photos/s2.jpg', from: {z: 2.15, x: 0.55, y: 0.52}, to: {z: 1.95, x: 0.42, y: 0.4}},
  {src: 'photos/s6.jpg', from: {z: 1.95, x: 0.34, y: 0.42}, to: {z: 2.15, x: 0.4, y: 0.52}},
  {src: 'photos/s5.jpg', from: {z: 2.2, x: 0.68, y: 0.55}, to: {z: 2.0, x: 0.5, y: 0.55}},
];

const Angles: React.FC<{t: number}> = ({t}) => {
  const ends = [...s4.shots.slice(1), s4.end];
  return (
    <AbsoluteFill>
      {ANGLES.map((a, i) => {
        const t0 = s4.shots[i];
        if (t < t0 - 0.2 || t > ends[i] + 0.25) return null;
        // the incoming shot pushes in from slightly closer, so every cut has a little energy
        const kick = 1 + 0.07 * (1 - prog(t, t0 - 0.12, t0 + 0.35, easeOut));
        return (
          <Shot
            key={i}
            src={a.src}
            t={t}
            t0={t0 - 0.12}
            t1={ends[i] + 0.2}
            from={{...a.from, z: a.from.z * kick}}
            to={a.to}
            opacity={prog(t, t0 - 0.12, t0 + 0.1)}
          />
        );
      })}
      {/* soft warm flash on each cut */}
      <AbsoluteFill
        style={{
          mixBlendMode: 'screen',
          background: C.gold,
          opacity:
            0.22 *
            Math.max(
              ...s4.shots.slice(1).map((c) => Math.max(0, 1 - Math.abs(t - c) / 0.1)),
              0,
            ),
        }}
      />
    </AbsoluteFill>
  );
};

/* Scene 5: the three lanterns together, the line, the brand, the call to action. */
const Finale: React.FC<{t: number; frame: number}> = ({t, frame}) => {
  const enter = prog(t, s5.start - 0.15, s5.start + 0.25);
  const l1 = (d: number) => prog(t, s5.line1 + d, s5.line1 + d + 0.6, easeOut);
  const l2 = (d: number) => prog(t, s5.line2 + d, s5.line2 + d + 0.6, easeOut);
  const brand = prog(t, s5.brand, s5.brand + 0.8, easeOut);
  const cta = sp(frame, s5.cta, {damping: 11, stiffness: 210, mass: 0.7});
  const pulse = t > s5.cta + 0.6 ? 1 + 0.03 * Math.sin((t - s5.cta - 0.6) * Math.PI * 2 * 1.333) : 1;
  const shine = ((t - s5.cta - 0.5) % 1.5) / 0.7;
  return (
    <AbsoluteFill style={{opacity: enter}}>
      <Shot
        src="photos/s10.jpg"
        t={t}
        t0={s5.start - 0.15}
        t1={s5.end}
        from={{z: 1.36, x: 0.51, y: 0.66}}
        to={{z: 1.24, x: 0.51, y: 0.67}}
        cy={1030}
        bright={1.03}
      />
      <Scrim top={190} height={470} amount={0.85 * l1(0)} />
      <div style={{...headline, position: 'absolute', top: 290, width: '100%', fontSize: 92}}>
        <div>
          {['MAKE', 'YOUR', 'SPACE'].map((w, i) => (
            <Word key={w} k={l1(i * 0.09)} style={{margin: '0 0.12em'}}>
              {w}
            </Word>
          ))}
        </div>
        <div>
          <Word k={l2(0)} style={{margin: '0 0.12em'}}>FEEL</Word>
          <Word k={l2(0.09)} color={C.gold} style={{margin: '0 0.12em'}}>
            SPECIAL
          </Word>
        </div>
      </div>
      <Scrim top={1280} height={360} amount={0.8 * brand} />
      <div
        style={{
          position: 'absolute',
          top: 1335,
          width: '100%',
          textAlign: 'center',
          fontFamily: F.sans,
          fontWeight: 800,
          fontSize: 76,
          color: C.cream,
          letterSpacing: `${lerp(0.7, 0.42, brand)}em`,
          paddingLeft: `${lerp(0.7, 0.42, brand)}em`,
          opacity: brand,
          filter: `blur(${(1 - brand) * 10}px)`,
          textShadow: '0 4px 30px rgba(0,0,0,0.5)',
        }}
      >
        MORZ
      </div>
      <div
        style={{
          position: 'absolute',
          top: 1450,
          left: W / 2 - 220,
          width: 440,
          height: 104,
          borderRadius: 52,
          background: `linear-gradient(180deg, ${C.goldHi} 0%, ${C.gold} 100%)`,
          boxShadow: '0 10px 40px rgba(255,160,60,0.35)',
          transform: `scale(${cta * pulse})`,
          opacity: clamp01(cta * 1.5),
          overflow: 'hidden',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontFamily: F.sans,
          fontWeight: 800,
          fontSize: 40,
          letterSpacing: '0.16em',
          paddingLeft: '0.16em',
          color: C.ink,
        }}
      >
        SHOP NOW
        <div
          style={{
            position: 'absolute',
            inset: 0,
            opacity: shine > 0 && shine < 1 ? 0.7 : 0,
            background: `linear-gradient(110deg, transparent ${lerp(-20, 120, shine) - 14}%, rgba(255,255,255,0.9) ${lerp(-20, 120, shine)}%, transparent ${lerp(-20, 120, shine) + 14}%)`,
          }}
        />
      </div>
    </AbsoluteFill>
  );
};

export const LanternAd: React.FC = () => {
  const frame = useCurrentFrame();
  const t = frame / FPS;
  const show = (a: number, b: number) => t >= a && t < b;
  return (
    <AbsoluteFill style={{backgroundColor: C.night}}>
      {show(0, s2.start + 0.5) && <Hook t={t} frame={frame} />}
      {show(s2.start, s3.start + 0.1) && <Reveal t={t} />}
      {show(s3.start - 0.35, s4.start + 0.15) && <CloseUps t={t} />}
      {show(s4.start - 0.2, s5.start + 0.3) && <Angles t={t} />}
      {show(s5.start - 0.15, 99) && <Finale t={t} frame={frame} />}
      <WarmGrade t={t} strength={t < s2.lightOn ? 0.6 : 1} />
      <LightLeak t={t} amount={t < s2.lightOn ? 0.15 : 0.45} />
      <LightLeak t={t} amount={t < s2.lightOn ? 0.0 : 0.25} seed={2.4} />
      <Embers t={t} amount={t < s2.lightOn ? 0.35 : 0.8} />
      <Grain frame={frame} />
      {/* fade from black on the very last frames for a clean loop */}
      <AbsoluteFill style={{background: C.night, opacity: prog(t, s5.end - 0.25, s5.end, easeIn) * 0.6}} />
    </AbsoluteFill>
  );
};
