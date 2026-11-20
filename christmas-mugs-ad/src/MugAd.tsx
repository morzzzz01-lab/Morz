import React from 'react';
import {AbsoluteFill, Img, staticFile, useCurrentFrame} from 'remotion';
import {Cam, Embers, Grain, LightLeak, Scrim, Word, headline} from './components';
import {C, F, FPS, H, TL, W, clamp01, easeIn, easeOut, flicker, lerp, prog, sp} from './lib';

const {s1, s2, s3, s4, s5} = TL;
const LOGO_H = 230;
const camK = (t: number, t0: number, t1: number) => prog(t, t0, t1, (x) => x * (2 - x) * 0.35 + x * 0.65);

/** Source sizes of the store photos (public/photos), so non-square photos keep their shape. */
const SIZE: Record<string, [number, number]> = {
  'mug.png': [1000, 1500],
  'table.jpg': [1200, 1800],
  'stack1.jpg': [1200, 1800],
  'stack2.jpg': [1200, 1800],
};

/** One store photo moved like a camera: `z` frame-widths wide, photo point (x, y) at (cx, cy). */
const Pic: React.FC<{
  name: string;
  t: number;
  t0: number;
  t1: number;
  from: Cam;
  to: Cam;
  cx?: number;
  cy?: number;
  style?: React.CSSProperties;
}> = ({name, t, t0, t1, from, to, cx = W / 2, cy = H / 2, style}) => {
  const [iw, ih] = SIZE[name];
  const k = camK(t, t0, t1);
  const Sw = W * lerp(from.z, to.z, k);
  const Sh = (Sw * ih) / iw;
  return (
    <Img
      src={staticFile(`photos/${name}`)}
      style={{
        position: 'absolute',
        width: Sw,
        height: Sh,
        left: cx - lerp(from.x, to.x, k) * Sw,
        top: cy - lerp(from.y, to.y, k) * Sh,
        ...style,
      }}
    />
  );
};

const Dark: React.FC<{glow?: number; at?: number}> = ({glow = 1, at = 46}) => (
  <>
    <AbsoluteFill style={{background: `radial-gradient(ellipse 95% 70% at 50% 45%, ${C.ember} 0%, ${C.night} 72%)`}} />
    <AbsoluteFill
      style={{
        mixBlendMode: 'screen',
        opacity: glow,
        background: `radial-gradient(circle at 50% ${at}%, rgba(255,175,85,0.5) 0%, rgba(255,120,40,0.18) 26%, transparent 52%)`,
      }}
    />
  </>
);

/** Full-bleed store photo with a camera move (the portrait photos cover 9:16 at z >= 1.19). */
const Full: React.FC<{name: string; t: number; t0: number; t1: number; from: Cam; to: Cam; opacity?: number; blur?: number; bright?: number}> = ({
  name, t, t0, t1, from, to, opacity = 1, blur = 0, bright = 1,
}) => (
  <AbsoluteFill style={{opacity, backgroundColor: C.night, overflow: 'hidden'}}>
    <Pic
      name={name}
      t={t}
      t0={t0}
      t1={t1}
      from={from}
      to={to}
      style={{filter: `brightness(${bright}) saturate(1.08) contrast(1.05)${blur ? ` blur(${blur}px)` : ''}`}}
    />
  </AbsoluteFill>
);

/* Scene 1: the table photo, defocused and dimmed, and the hook. */
const Hook: React.FC<{t: number; frame: number}> = ({t, frame}) => {
  const out = prog(t, s1.exit - 0.05, s1.exit + 0.25, easeIn);
  const words = ['YOUR', 'COCOA', 'DESERVES', 'THIS...'];
  const w = (i: number) => (
    <Word
      key={i}
      k={sp(frame, s1.words[i], {damping: 13, stiffness: 260, mass: 0.6})}
      out={out}
      punch
      color={i === 3 ? C.gold : C.cream}
      style={{margin: '0 0.12em'}}
    >
      {words[i]}
    </Word>
  );
  return (
    <AbsoluteFill style={{opacity: 1 - prog(t, s2.start, s2.start + 0.45)}}>
      <Full
        name="table.jpg"
        t={t}
        t0={0}
        t1={2.2}
        from={{z: 1.6, x: 0.45, y: 0.4}}
        to={{z: 1.75, x: 0.45, y: 0.4}}
        blur={22}
        bright={0.42 + 0.05 * flicker(t, 1)}
      />
      <AbsoluteFill style={{background: 'rgba(8,5,3,0.3)'}} />
      <AbsoluteFill style={{alignItems: 'center', justifyContent: 'center', paddingBottom: 160}}>
        <div style={{...headline, fontSize: 124, width: 1000}}>
          <div>{[0, 1].map(w)}</div>
          <div>{[2, 3].map(w)}</div>
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};

/** The snowman mug cut-out (the store's own transparent photo), optionally with a sheen masked to it. */
const Mug: React.FC<{t: number; t0: number; t1: number; from: Cam; to: Cam; cy?: number; sweep?: number}> = ({
  t, t0, t1, from, to, cy = H / 2, sweep = -1,
}) => {
  const k = camK(t, t0, t1);
  const Sw = W * lerp(from.z, to.z, k);
  const Sh = Sw * 1.5;
  const src = staticFile('photos/mug.png');
  return (
    <div style={{position: 'absolute', left: W / 2 - lerp(from.x, to.x, k) * Sw, top: cy - lerp(from.y, to.y, k) * Sh, width: Sw, height: Sh}}>
      <Img src={src} style={{width: Sw, height: Sh, filter: 'contrast(1.03) drop-shadow(0 30px 50px rgba(0,0,0,0.5))'}} />
      {sweep > 0 && sweep < 1 && (
        <div
          style={{
            position: 'absolute',
            inset: 0,
            mixBlendMode: 'screen',
            opacity: 0.55,
            WebkitMaskImage: `url(${src})`,
            WebkitMaskSize: '100% 100%',
            background: `linear-gradient(115deg, transparent ${lerp(-30, 110, sweep) - 10}%, rgba(255,240,215,0.9) ${lerp(-30, 110, sweep)}%, transparent ${lerp(-30, 110, sweep) + 10}%)`,
          }}
        />
      )}
    </div>
  );
};

/* Scene 2: the snowman mug in warm light, slow push in, a sheen across the glaze. */
const Reveal: React.FC<{t: number}> = ({t}) => {
  const glow = prog(t, s2.glow, s2.glow + 0.9, easeOut) * (0.85 + 0.15 * flicker(t, 4));
  const exit = prog(t, s2.exit - 0.05, s3.start + 0.05, easeIn);
  const label = prog(t, s2.label, s2.label + 0.7, easeOut);
  return (
    <AbsoluteFill style={{opacity: prog(t, s2.start, s2.start + 0.4) * (1 - exit)}}>
      <Dark glow={glow} at={50} />
      <Mug t={t} t0={s2.start} t1={s3.start + 0.3} from={{z: 1.15, x: 0.45, y: 0.56}} to={{z: 1.32, x: 0.45, y: 0.56}} cy={H * 0.5} sweep={prog(t, s2.sweep, s2.sweep + 0.9, (x) => x)} />
      <div
        style={{
          position: 'absolute', top: 300, width: '100%', textAlign: 'center', fontFamily: F.sans, fontWeight: 650, fontSize: 40,
          letterSpacing: '0.28em', paddingLeft: '0.28em', color: C.gold, opacity: label,
          transform: `translateY(${(1 - label) * 18}px)`, filter: `blur(${(1 - label) * 8}px)`,
        }}
      >
        HAND-PAINTED CHRISTMAS MUGS
      </div>
      <div
        style={{
          position: 'absolute', top: 362, width: '100%', textAlign: 'center', fontFamily: F.sans, fontWeight: 500, fontSize: 32,
          letterSpacing: '0.24em', paddingLeft: '0.24em', color: C.creamDim, opacity: prog(t, s2.label + 0.2, s2.label + 0.9, easeOut),
        }}
      >
        SET OF 2 · 11 OZ
      </div>
    </AbsoluteFill>
  );
};

/* Scene 3: close-ups of the painting (snowman face, heart mitten, candy-cane handle). */
const CLOSE: {from: Cam; to: Cam}[] = [
  {from: {z: 2.1, x: 0.5, y: 0.47}, to: {z: 1.85, x: 0.5, y: 0.52}},
  {from: {z: 1.9, x: 0.66, y: 0.6}, to: {z: 1.9, x: 0.5, y: 0.64}},
  {from: {z: 1.8, x: 0.2, y: 0.52}, to: {z: 1.65, x: 0.32, y: 0.54}},
];

const CloseUps: React.FC<{t: number}> = ({t}) => {
  const ends = [...s3.shots.slice(1), s3.end];
  const textIn = (d: number) => prog(t, s3.text + d, s3.text + d + 0.6, easeOut);
  const textOut = prog(t, s3.textOut, s3.textOut + 0.35, easeIn);
  return (
    <AbsoluteFill>
      <Dark at={42} />
      {CLOSE.map((c, i) => {
        const t0 = s3.shots[i];
        if (t < t0 - 0.35 || t > ends[i] + 0.4) return null;
        const fade = i === 0 ? prog(t, t0 - 0.3, t0 + 0.05) : prog(t, t0 - 0.15, t0 + 0.25);
        const leave = i < 2 ? 1 - prog(t, ends[i] + 0.1, ends[i] + 0.35) : 1;
        return (
          <AbsoluteFill key={i} style={{opacity: fade * leave}}>
            <Mug t={t} t0={t0 - 0.3} t1={ends[i] + 0.3} from={c.from} to={c.to} cy={H * 0.42} />
          </AbsoluteFill>
        );
      })}
      <Scrim top={1080} height={500} amount={textIn(0) * (1 - textOut)} />
      <div style={{...headline, position: 'absolute', top: 1190, width: '100%', fontSize: 120}}>
        <div>
          <Word k={textIn(0)} out={textOut}>PAINTED</Word>
        </div>
        <div>
          <Word k={textIn(0.12)} out={textOut} style={{margin: '0 0.12em'}}>BY</Word>
          <Word k={textIn(0.21)} out={textOut} color={C.gold} style={{margin: '0 0.12em'}}>HAND</Word>
        </div>
      </div>
    </AbsoluteFill>
  );
};

/* Scene 4: the store's room photos, one per beat, chips, then "each one is unique". */
const ROOMS: {name: string; from: Cam; to: Cam}[] = [
  {name: 'table.jpg', from: {z: 1.45, x: 0.42, y: 0.52}, to: {z: 1.55, x: 0.48, y: 0.5}},
  {name: 'stack1.jpg', from: {z: 1.35, x: 0.5, y: 0.42}, to: {z: 1.22, x: 0.5, y: 0.45}},
  {name: 'stack2.jpg', from: {z: 1.22, x: 0.5, y: 0.45}, to: {z: 1.35, x: 0.5, y: 0.38}},
  {name: 'table.jpg', from: {z: 1.9, x: 0.72, y: 0.42}, to: {z: 1.75, x: 0.62, y: 0.45}},
];
const CHIPS = ['SET OF 2', 'DISHWASHER SAFE', 'MICROWAVE SAFE'];

const Angles: React.FC<{t: number; frame: number}> = ({t, frame}) => {
  const sh = s4.shots;
  const ends = [...sh.slice(1), s4.end];
  const chipsOut = prog(t, s4.chipsOut, s4.chipsOut + 0.3, easeIn);
  const u = sp(frame, s4.unique, {damping: 12, stiffness: 200, mass: 0.7});
  return (
    <AbsoluteFill>
      {ROOMS.map((r, i) => {
        if (t < sh[i] - 0.2 || t > ends[i] + 0.25) return null;
        const kick = 1 + 0.07 * (1 - prog(t, sh[i] - 0.12, sh[i] + 0.35, easeOut));
        return (
          <Full key={i} name={r.name} t={t} t0={sh[i] - 0.12} t1={ends[i] + 0.2} from={{...r.from, z: r.from.z * kick}} to={r.to} opacity={prog(t, sh[i] - 0.12, sh[i] + 0.1)} />
        );
      })}
      <AbsoluteFill
        style={{mixBlendMode: 'screen', background: C.gold, opacity: 0.18 * Math.max(...sh.slice(1).map((c) => Math.max(0, 1 - Math.abs(t - c) / 0.1)), 0)}}
      />
      {CHIPS.map((label, i) => {
        const k = sp(frame, s4.chips[i], {damping: 12, stiffness: 220, mass: 0.7});
        return (
          <div
            key={label}
            style={{
              position: 'absolute', top: 1265 + i * 96, left: 0, right: 0, display: 'flex', justifyContent: 'center',
              opacity: clamp01(k * 1.5) * (1 - chipsOut), transform: `translateY(${(1 - k) * 30}px) scale(${lerp(0.85, 1, k)})`,
            }}
          >
            <div
              style={{
                display: 'flex', alignItems: 'center', gap: 18, padding: '18px 34px', borderRadius: 44,
                background: 'rgba(20,13,6,0.82)', border: '1.5px solid rgba(245,185,92,0.55)',
                fontFamily: F.sans, fontWeight: 750, fontSize: 36, letterSpacing: '0.12em', color: C.cream,
              }}
            >
              <span style={{width: 14, height: 14, borderRadius: 7, background: C.gold}} />
              {label}
            </div>
          </div>
        );
      })}
      <Scrim top={1230} height={330} amount={0.9 * clamp01(u * 1.4)} />
      <div
        style={{
          ...headline, position: 'absolute', top: 1310, width: '100%', fontSize: 88, color: C.cream,
          opacity: clamp01(u * 1.4), transform: `translateY(${(1 - u) * 30}px)`,
        }}
      >
        EACH ONE IS <span style={{color: C.gold}}>UNIQUE</span>
      </div>
    </AbsoluteFill>
  );
};

/* Scene 5: the snowman mug in warm light, the line, the logo, the call to action. */
const Finale: React.FC<{t: number; frame: number}> = ({t, frame}) => {
  const enter = prog(t, s5.start - 0.15, s5.start + 0.25);
  const l1 = (d: number) => prog(t, s5.line1 + d, s5.line1 + d + 0.6, easeOut);
  const l2 = (d: number) => prog(t, s5.line2 + d, s5.line2 + d + 0.6, easeOut);
  const brand = prog(t, s5.brand, s5.brand + 0.8, easeOut);
  const logoK = lerp(0.82, 1, sp(frame, s5.brand, {damping: 11, stiffness: 200, mass: 0.7}));
  const cta = sp(frame, s5.cta, {damping: 11, stiffness: 210, mass: 0.7});
  const pulse = t > s5.cta + 0.6 ? 1 + 0.03 * Math.sin((t - s5.cta - 0.6) * Math.PI * 2 * 1.333) : 1;
  const shine = ((t - s5.cta - 0.5) % 1.5) / 0.7;
  return (
    <AbsoluteFill style={{opacity: enter}}>
      <Dark glow={0.9 + 0.1 * flicker(t, 2)} at={42} />
      <Mug t={t} t0={s5.start - 0.15} t1={s5.end} from={{z: 1.08, x: 0.45, y: 0.56}} to={{z: 0.98, x: 0.45, y: 0.56}} cy={830} />
      <Scrim top={110} height={420} amount={0.85 * l1(0)} />
      <div style={{...headline, position: 'absolute', top: 175, width: '100%', fontSize: 96}}>
        <div>
          {['MADE', 'FOR'].map((w, i) => (
            <Word key={w} k={l1(i * 0.09)} style={{margin: '0 0.12em'}}>{w}</Word>
          ))}
        </div>
        <div>
          {['COCOA', 'NIGHTS'].map((w, i) => (
            <Word key={w} k={l2(i * 0.09)} color={i === 0 ? C.gold : C.cream} style={{margin: '0 0.12em'}}>{w}</Word>
          ))}
        </div>
      </div>
      <Scrim top={1220} height={520} amount={0.9 * brand} />
      {/* the MORZ mini logo from the store theme (assets/morz-logo-mini-light.png), unaltered */}
      <Img
        src={staticFile('logo/morz-logo-mini-light.png')}
        style={{
          position: 'absolute', top: 1285, left: W / 2 - (LOGO_H * (308 / 404)) / 2, height: LOGO_H, width: LOGO_H * (308 / 404),
          opacity: clamp01(brand * 1.4), transform: `scale(${logoK}) translateY(${(1 - brand) * 24}px)`,
          filter: `blur(${(1 - brand) * 10}px) drop-shadow(0 6px 24px rgba(0,0,0,0.55))`,
        }}
      />
      <div
        style={{
          position: 'absolute', top: 1530, left: W / 2 - 220, width: 440, height: 104, borderRadius: 52,
          background: `linear-gradient(180deg, ${C.goldHi} 0%, ${C.gold} 100%)`, boxShadow: '0 10px 40px rgba(255,160,60,0.35)',
          transform: `scale(${cta * pulse})`, opacity: clamp01(cta * 1.5), overflow: 'hidden', display: 'flex', alignItems: 'center',
          justifyContent: 'center', fontFamily: F.sans, fontWeight: 800, fontSize: 40, letterSpacing: '0.16em', paddingLeft: '0.16em', color: C.ink,
        }}
      >
        SHOP NOW
        <div
          style={{
            position: 'absolute', inset: 0, opacity: shine > 0 && shine < 1 ? 0.7 : 0,
            background: `linear-gradient(110deg, transparent ${lerp(-20, 120, shine) - 14}%, rgba(255,255,255,0.9) ${lerp(-20, 120, shine)}%, transparent ${lerp(-20, 120, shine) + 14}%)`,
          }}
        />
      </div>
    </AbsoluteFill>
  );
};

export const MugAd: React.FC = () => {
  const frame = useCurrentFrame();
  const t = frame / FPS;
  const show = (a: number, b: number) => t >= a && t < b;
  return (
    <AbsoluteFill style={{backgroundColor: C.night}}>
      {show(0, s2.start + 0.5) && <Hook t={t} frame={frame} />}
      {show(s2.start, s3.start + 0.1) && <Reveal t={t} />}
      {show(s3.start - 0.35, s4.start + 0.15) && <CloseUps t={t} />}
      {show(s4.start - 0.2, s5.start + 0.3) && <Angles t={t} frame={frame} />}
      {show(s5.start - 0.15, 99) && <Finale t={t} frame={frame} />}
      <AbsoluteFill style={{background: 'radial-gradient(ellipse 120% 85% at 50% 50%, transparent 55%, rgba(8,5,3,0.7) 100%)'}} />
      <LightLeak t={t} amount={t < s2.glow ? 0.1 : 0.3} />
      <Embers t={t} amount={0.5} />
      <Grain frame={frame} />
      <AbsoluteFill style={{background: C.night, opacity: prog(t, s5.end - 0.25, s5.end, easeIn) * 0.6}} />
    </AbsoluteFill>
  );
};
