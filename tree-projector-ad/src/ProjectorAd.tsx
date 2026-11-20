import React from 'react';
import {AbsoluteFill, Img, staticFile, useCurrentFrame} from 'remotion';
import {Cam, Embers, Grain, LightLeak, Scrim, Word, headline} from './components';
import {C, F, FPS, H, TL, W, clamp01, easeIn, easeOut, flicker, lerp, prog, sp} from './lib';

const {s1, s2, s3, s4, s5} = TL;
const LOGO_H = 230;
const camK = (t: number, t0: number, t1: number) => prog(t, t0, t1, (x) => x * (2 - x) * 0.35 + x * 0.65);

/** Source sizes of the store photos (public/photos), so non-square photos keep their shape. */
const SIZE: Record<string, [number, number]> = {
  'tree.png': [1200, 1168],
  'ceiling.jpg': [1200, 2014],
  'gift.jpg': [1200, 1251],
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

/**
 * A small store photo shown as a card over a defocused copy of itself, so a 250 px
 * photo is never blown up to the full frame.
 */
const Card: React.FC<{name: string; t: number; t0: number; t1: number; from: Cam; to: Cam; opacity: number; kick: number}> = ({
  name,
  t,
  t0,
  t1,
  from,
  to,
  opacity,
  kick,
}) => {
  const [iw, ih] = SIZE[name];
  const cw = 940;
  const ch = iw / ih > 1.5 ? 760 : 1000;
  return (
    <AbsoluteFill style={{opacity, backgroundColor: C.night, overflow: 'hidden'}}>
      <Pic
        name={name}
        t={t}
        t0={t0}
        t1={t1}
        from={{z: 2.6, x: 0.5, y: 0.5}}
        to={{z: 2.8, x: 0.5, y: 0.5}}
        style={{filter: 'blur(40px) brightness(0.45) saturate(1.2)'}}
      />
      <div
        style={{
          position: 'absolute',
          left: (W - cw) / 2,
          top: H * 0.43 - ch / 2,
          width: cw,
          height: ch,
          borderRadius: 34,
          overflow: 'hidden',
          boxShadow: '0 40px 90px rgba(0,0,0,0.6), 0 0 0 1.5px rgba(245,185,92,0.35)',
          transform: `scale(${lerp(1, 0.96, kick)})`,
        }}
      >
        <Pic name={name} t={t} t0={t0} t1={t1} from={from} to={to} cx={cw / 2} cy={ch / 2} />
      </div>
    </AbsoluteFill>
  );
};

/** Full-bleed ceiling photo (portrait crop, covers 9:16 at z >= 1.08). */
const Ceiling: React.FC<{t: number; t0: number; t1: number; from: Cam; to: Cam; opacity?: number; blur?: number; bright?: number}> = ({
  t, t0, t1, from, to, opacity = 1, blur = 0, bright = 1,
}) => (
  <AbsoluteFill style={{opacity, backgroundColor: C.night, overflow: 'hidden'}}>
    <Pic name="ceiling.jpg" t={t} t0={t0} t1={t1} from={from} to={to} style={{filter: `brightness(${bright}) saturate(1.08)${blur > 0.2 ? ` blur(${blur}px)` : ''}`}} />
  </AbsoluteFill>
);

/** Red and green halo, the colours of the projection. */
const Halo: React.FC<{amount: number; t: number; at?: number}> = ({amount, t, at = 45}) => (
  <AbsoluteFill style={{mixBlendMode: 'screen', opacity: amount}}>
    <AbsoluteFill style={{opacity: 0.8 + 0.2 * flicker(t, 1), background: `radial-gradient(circle at ${38 + 3 * Math.sin(t * 0.5)}% ${at}%, rgba(255,70,60,0.32) 0%, transparent 34%)`}} />
    <AbsoluteFill style={{opacity: 0.8 + 0.2 * flicker(t, 4), background: `radial-gradient(circle at ${64 + 3 * Math.cos(t * 0.6)}% ${at - 4}%, rgba(70,220,110,0.28) 0%, transparent 34%)`}} />
    <AbsoluteFill style={{background: `radial-gradient(circle at 50% ${at}%, rgba(255,190,90,0.3) 0%, transparent 45%)`}} />
  </AbsoluteFill>
);

const TreeCut: React.FC<{t: number; t0: number; t1: number; from: Cam; to: Cam; cy?: number}> = (p) => (
  <Pic name="tree.png" {...p} style={{filter: 'brightness(1.05) saturate(1.08) drop-shadow(0 26px 46px rgba(0,0,0,0.55))'}} />
);

/* Scene 1: the ceiling photo, dark and out of focus, and the hook. */
const Hook: React.FC<{t: number; frame: number}> = ({t, frame}) => {
  const out = prog(t, s1.exit - 0.05, s1.exit + 0.25, easeIn);
  const words = ['WHAT', 'IF', 'YOUR', 'CEILING', 'DID', 'THIS?'];
  const w = (i: number) => (
    <Word key={i} k={sp(frame, s1.words[i], {damping: 13, stiffness: 260, mass: 0.6})} out={out} punch color={i === 5 ? C.gold : C.cream} style={{margin: '0 0.12em'}}>
      {words[i]}
    </Word>
  );
  return (
    <AbsoluteFill>
      <Ceiling t={t} t0={0} t1={2.3} from={{z: 1.12, x: 0.5, y: 0.5}} to={{z: 1.18, x: 0.5, y: 0.48}} blur={24} bright={0.3} />
      <AbsoluteFill style={{alignItems: 'center', justifyContent: 'center', paddingBottom: 160, opacity: 1 - out}}>
        <div style={{...headline, fontSize: 116, width: 1000}}>
          <div>{[0, 1, 2].map(w)}</div>
          <div>{[3, 4, 5].map(w)}</div>
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};

/* Scene 2: focus pulls in on the projected ceiling, slow tilt up. */
const Reveal: React.FC<{t: number}> = ({t}) => {
  const r = prog(t, s2.reveal - 0.3, s2.reveal + 0.6, easeOut);
  const exit = prog(t, s2.exit - 0.05, s3.start + 0.05, easeIn);
  const label = prog(t, s2.label, s2.label + 0.7, easeOut);
  return (
    <AbsoluteFill style={{opacity: prog(t, s2.start, s2.start + 0.3) * (1 - exit)}}>
      <Ceiling t={t} t0={0} t1={s3.start + 0.3} from={{z: 1.12, x: 0.5, y: 0.5}} to={{z: 1.4, x: 0.55, y: 0.36}} blur={lerp(24, 0, r)} bright={lerp(0.3, 1.05, r)} />
      <Scrim top={1290} height={260} amount={label} />
      <div style={{position: 'absolute', top: 1370, width: '100%', textAlign: 'center', fontFamily: F.sans, fontWeight: 650, fontSize: 40, letterSpacing: '0.28em', paddingLeft: '0.28em', color: C.gold, opacity: label, transform: `translateY(${(1 - label) * 18}px)`, filter: `blur(${(1 - label) * 8}px)`}}>
        CHRISTMAS PROJECTION LIGHT
      </div>
    </AbsoluteFill>
  );
};

/* Scene 3: close-ups of the little tree (the lens on top, the lit wreath, the USB plug). */
const CLOSE: {from: Cam; to: Cam}[] = [
  {from: {z: 2.3, x: 0.72, y: 0.14}, to: {z: 2.0, x: 0.72, y: 0.24}},
  {from: {z: 1.75, x: 0.42, y: 0.68}, to: {z: 1.75, x: 0.52, y: 0.66}},
  {from: {z: 2.1, x: 0.16, y: 0.82}, to: {z: 1.9, x: 0.24, y: 0.8}},
];

const CloseUps: React.FC<{t: number}> = ({t}) => {
  const ends = [...s3.shots.slice(1), s3.end];
  const textIn = (d: number) => prog(t, s3.text + d, s3.text + d + 0.6, easeOut);
  const textOut = prog(t, s3.textOut, s3.textOut + 0.35, easeIn);
  return (
    <AbsoluteFill>
      <Dark at={42} glow={0.6} />
      <Halo amount={0.9} t={t} at={42} />
      {CLOSE.map((c, i) => {
        const t0 = s3.shots[i];
        if (t < t0 - 0.35 || t > ends[i] + 0.4) return null;
        const fade = i === 0 ? prog(t, t0 - 0.3, t0 + 0.05) : prog(t, t0 - 0.15, t0 + 0.25);
        const leave = i < 2 ? 1 - prog(t, ends[i] + 0.1, ends[i] + 0.35) : 1;
        return (
          <AbsoluteFill key={i} style={{opacity: fade * leave}}>
            <TreeCut t={t} t0={t0 - 0.3} t1={ends[i] + 0.3} from={c.from} to={c.to} cy={H * 0.42} />
          </AbsoluteFill>
        );
      })}
      <Scrim top={1080} height={500} amount={textIn(0) * (1 - textOut)} />
      <div style={{...headline, position: 'absolute', top: 1190, width: '100%', fontSize: 124}}>
        <div>
          {['TINY', 'TREE,'].map((w, i) => (
            <Word key={w} k={textIn(i * 0.09)} out={textOut} style={{margin: '0 0.12em'}}>{w}</Word>
          ))}
        </div>
        <div>
          {['BIG', 'MAGIC'].map((w, i) => (
            <Word key={w} k={textIn(0.2 + i * 0.09)} out={textOut} color={i === 1 ? C.gold : C.cream} style={{margin: '0 0.12em'}}>{w}</Word>
          ))}
        </div>
      </div>
    </AbsoluteFill>
  );
};

/* Scene 4: the ceiling again, the whole tree, the gift box; chips; "a gift they'll love". */
const CHIPS = ['NOTHING TO HANG', 'QUICK TO SET UP', 'MOVES ROOM TO ROOM'];

const Angles: React.FC<{t: number; frame: number}> = ({t, frame}) => {
  const sh = s4.shots;
  const ends = [...sh.slice(1), s4.end];
  const chipsOut = prog(t, s4.chipsOut, s4.chipsOut + 0.3, easeIn);
  const g = sp(frame, s4.gift, {damping: 12, stiffness: 200, mass: 0.7});
  const kick = (i: number) => 1 - prog(t, sh[i] - 0.12, sh[i] + 0.35, easeOut);
  const inn = (i: number) => prog(t, sh[i] - 0.12, sh[i] + 0.1);
  const live = (i: number) => t > sh[i] - 0.2 && t < ends[i] + 0.25;
  return (
    <AbsoluteFill>
      {live(0) && <Ceiling t={t} t0={sh[0] - 0.12} t1={ends[0] + 0.2} from={{z: 1.7 * (1 + 0.07 * kick(0)), x: 0.3, y: 0.34}} to={{z: 1.8, x: 0.62, y: 0.33}} opacity={inn(0)} />}
      {live(1) && (
        <AbsoluteFill style={{opacity: inn(1)}}>
          <Dark at={44} glow={0.6} />
          <Halo amount={0.9} t={t} at={44} />
          <TreeCut t={t} t0={sh[1] - 0.12} t1={ends[1] + 0.2} from={{z: 0.95 * (1 + 0.07 * kick(1)), x: 0.47, y: 0.5}} to={{z: 1.02, x: 0.47, y: 0.5}} cy={H * 0.4} />
        </AbsoluteFill>
      )}
      {live(2) && <Ceiling t={t} t0={sh[2] - 0.12} t1={ends[2] + 0.2} from={{z: 1.25 * (1 + 0.07 * kick(2)), x: 0.5, y: 0.6}} to={{z: 1.18, x: 0.5, y: 0.5}} opacity={inn(2)} />}
      {live(3) && <Card name="gift.jpg" t={t} t0={sh[3] - 0.12} t1={ends[3] + 0.2} from={{z: 1.05, x: 0.55, y: 0.5}} to={{z: 1.15, x: 0.58, y: 0.48}} opacity={inn(3)} kick={kick(3)} />}
      <AbsoluteFill style={{mixBlendMode: 'screen', background: C.gold, opacity: 0.18 * Math.max(...sh.slice(1).map((c) => Math.max(0, 1 - Math.abs(t - c) / 0.1)), 0)}} />
      {CHIPS.map((label, i) => {
        const k = sp(frame, s4.chips[i], {damping: 12, stiffness: 220, mass: 0.7});
        return (
          <div key={label} style={{position: 'absolute', top: 1265 + i * 96, left: 0, right: 0, display: 'flex', justifyContent: 'center', opacity: clamp01(k * 1.5) * (1 - chipsOut), transform: `translateY(${(1 - k) * 30}px) scale(${lerp(0.85, 1, k)})`}}>
            <div style={{display: 'flex', alignItems: 'center', gap: 18, padding: '18px 34px', borderRadius: 44, background: 'rgba(20,13,6,0.82)', border: '1.5px solid rgba(245,185,92,0.55)', fontFamily: F.sans, fontWeight: 750, fontSize: 36, letterSpacing: '0.12em', color: C.cream}}>
              <span style={{width: 14, height: 14, borderRadius: 7, background: C.gold}} />
              {label}
            </div>
          </div>
        );
      })}
      <div style={{...headline, position: 'absolute', top: 1360, width: '100%', fontSize: 84, color: C.cream, opacity: clamp01(g * 1.4), transform: `translateY(${(1 - g) * 30}px)`}}>
        A GIFT THEY'LL <span style={{color: C.gold}}>LOVE</span>
      </div>
    </AbsoluteFill>
  );
};

/* Scene 5: the tree in festive light, the line, the logo, the call to action. */
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
      <Dark at={44} glow={0.7} />
      <Halo amount={1} t={t} at={44} />
      <TreeCut t={t} t0={s5.start - 0.15} t1={s5.end} from={{z: 0.88, x: 0.47, y: 0.5}} to={{z: 0.8, x: 0.47, y: 0.5}} cy={850} />
      <Scrim top={110} height={400} amount={0.6 * l1(0)} />
      <div style={{...headline, position: 'absolute', top: 175, width: '100%', fontSize: 100}}>
        <div>
          <Word k={l1(0)} style={{margin: '0 0.12em'}}>INSTANT</Word>
        </div>
        <div>
          {['CHRISTMAS', 'MAGIC'].map((w, i) => (
            <Word key={w} k={l2(i * 0.09)} color={i === 1 ? C.gold : C.cream} style={{margin: '0 0.12em'}}>{w}</Word>
          ))}
        </div>
      </div>
      <Scrim top={1220} height={520} amount={0.85 * brand} />
      {/* the MORZ mini logo from the store theme (assets/morz-logo-mini-light.png), unaltered */}
      <Img src={staticFile('logo/morz-logo-mini-light.png')} style={{position: 'absolute', top: 1285, left: W / 2 - (LOGO_H * (308 / 404)) / 2, height: LOGO_H, width: LOGO_H * (308 / 404), opacity: clamp01(brand * 1.4), transform: `scale(${logoK}) translateY(${(1 - brand) * 24}px)`, filter: `blur(${(1 - brand) * 10}px) drop-shadow(0 6px 24px rgba(0,0,0,0.55))`}} />
      <div style={{position: 'absolute', top: 1530, left: W / 2 - 220, width: 440, height: 104, borderRadius: 52, background: `linear-gradient(180deg, ${C.goldHi} 0%, ${C.gold} 100%)`, boxShadow: '0 10px 40px rgba(255,160,60,0.35)', transform: `scale(${cta * pulse})`, opacity: clamp01(cta * 1.5), overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: F.sans, fontWeight: 800, fontSize: 40, letterSpacing: '0.16em', paddingLeft: '0.16em', color: C.ink}}>
        SHOP NOW
        <div style={{position: 'absolute', inset: 0, opacity: shine > 0 && shine < 1 ? 0.7 : 0, background: `linear-gradient(110deg, transparent ${lerp(-20, 120, shine) - 14}%, rgba(255,255,255,0.9) ${lerp(-20, 120, shine)}%, transparent ${lerp(-20, 120, shine) + 14}%)`}} />
      </div>
    </AbsoluteFill>
  );
};

export const ProjectorAd: React.FC = () => {
  const frame = useCurrentFrame();
  const t = frame / FPS;
  const show = (a: number, b: number) => t >= a && t < b;
  return (
    <AbsoluteFill style={{backgroundColor: C.night}}>
      {show(0, s2.start + 0.35) && <Hook t={t} frame={frame} />}
      {show(s2.start, s3.start + 0.1) && <Reveal t={t} />}
      {show(s3.start - 0.35, s4.start + 0.15) && <CloseUps t={t} />}
      {show(s4.start - 0.2, s5.start + 0.3) && <Angles t={t} frame={frame} />}
      {show(s5.start - 0.15, 99) && <Finale t={t} frame={frame} />}
      <AbsoluteFill style={{background: 'radial-gradient(ellipse 120% 85% at 50% 50%, transparent 55%, rgba(8,5,3,0.7) 100%)'}} />
      <LightLeak t={t} amount={0.2} />
      <Embers t={t} amount={0.4} />
      <Grain frame={frame} />
      <AbsoluteFill style={{background: C.night, opacity: prog(t, s5.end - 0.25, s5.end, easeIn) * 0.6}} />
    </AbsoluteFill>
  );
};
