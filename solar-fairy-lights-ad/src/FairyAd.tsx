import React from 'react';
import {AbsoluteFill, Img, staticFile, useCurrentFrame} from 'remotion';
import {Cam, Embers, Grain, LightLeak, Scrim, Shot, Word, headline} from './components';
import {C, F, FPS, H, TL, W, clamp01, easeIn, easeOut, flicker, lerp, prog, sp} from './lib';

const {s1, s2, s3, s4, s5} = TL;
const LOGO_H = 230;
const camK = (t: number, t0: number, t1: number) => prog(t, t0, t1, (x) => x * (2 - x) * 0.35 + x * 0.65);

/** Source sizes of the store photos (public/photos), so non-square photos keep their shape. */
const SIZE: Record<string, [number, number]> = {
  'string.png': [1500, 1500],
  'bamboo.jpg': [1500, 1500],
  'fence.jpg': [1500, 1500],
  'cup.jpg': [1500, 1500],
  'desk.jpg': [1100, 1100],
  'line.jpg': [1100, 1100],
  'garden.jpg': [1100, 1100],
  'rail.jpg': [1100, 1100],
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

/* Scene 1: the bamboo photo, defocused into bokeh, and the hook. */
const Hook: React.FC<{t: number; frame: number}> = ({t, frame}) => {
  const out = prog(t, s1.exit - 0.05, s1.exit + 0.25, easeIn);
  const words = ['YOUR', 'BACKYARD', 'LOOKS', 'DULL?'];
  const w = (i: number) => (
    <Word key={i} k={sp(frame, s1.words[i], {damping: 13, stiffness: 260, mass: 0.6})} out={out} punch color={i === 3 ? C.gold : C.cream} style={{margin: '0 0.12em'}}>
      {words[i]}
    </Word>
  );
  return (
    <AbsoluteFill style={{opacity: 1 - prog(t, s2.start, s2.start + 0.45)}}>
      <Shot src="photos/bamboo.jpg" t={t} t0={0} t1={2.2} from={{z: 2.0, x: 0.3, y: 0.4}} to={{z: 2.2, x: 0.32, y: 0.4}} bright={0.45} blur={18} />
      <AbsoluteFill style={{background: 'rgba(8,5,3,0.35)'}} />
      <AbsoluteFill style={{alignItems: 'center', justifyContent: 'center', paddingBottom: 160}}>
        <div style={{...headline, fontSize: 124, width: 1000}}>
          <div>{[0, 1].map(w)}</div>
          <div>{[2, 3].map(w)}</div>
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};

/** Multicolour halo, the colours of the bulbs. */
const Halo: React.FC<{amount: number; t: number}> = ({amount, t}) => (
  <AbsoluteFill style={{mixBlendMode: 'screen', opacity: amount}}>
    {[
      ['255,90,90', 0.32, 0.38],
      ['90,220,140', 0.68, 0.34],
      ['120,130,255', 0.6, 0.62],
      ['255,200,80', 0.36, 0.64],
    ].map(([c, x, y], i) => (
      <AbsoluteFill
        key={i}
        style={{
          opacity: 0.75 + 0.25 * flicker(t, i * 2),
          background: `radial-gradient(circle at ${(x as number) * 100 + 3 * Math.sin(t * 0.6 + i)}% ${(y as number) * 100}%, rgba(${c},0.32) 0%, transparent 30%)`,
        }}
      />
    ))}
  </AbsoluteFill>
);

/* Scene 2: the whole string (the store's cut-out), slow push in, colour halo. */
const Reveal: React.FC<{t: number}> = ({t}) => {
  const on = prog(t, s2.on, s2.on + 0.9, easeOut);
  const exit = prog(t, s2.exit - 0.05, s3.start + 0.05, easeIn);
  const label = prog(t, s2.label, s2.label + 0.7, easeOut);
  return (
    <AbsoluteFill style={{opacity: prog(t, s2.start, s2.start + 0.4) * (1 - exit)}}>
      <Dark glow={0.4 * on} at={48} />
      <Halo amount={on} t={t} />
      <Pic name="string.png" t={t} t0={s2.start} t1={s3.start + 0.3} from={{z: 0.98, x: 0.56, y: 0.5}} to={{z: 1.1, x: 0.57, y: 0.5}} cy={H * 0.53} style={{filter: 'brightness(1.05) saturate(1.1) drop-shadow(0 20px 40px rgba(0,0,0,0.5))'}} />
      <div style={{position: 'absolute', top: 300, width: '100%', textAlign: 'center', fontFamily: F.sans, fontWeight: 650, fontSize: 40, letterSpacing: '0.28em', paddingLeft: '0.28em', color: C.gold, opacity: label, transform: `translateY(${(1 - label) * 18}px)`, filter: `blur(${(1 - label) * 8}px)`}}>
        SOLAR FAIRY LIGHTS
      </div>
      <div style={{position: 'absolute', top: 362, width: '100%', textAlign: 'center', fontFamily: F.sans, fontWeight: 500, fontSize: 32, letterSpacing: '0.24em', paddingLeft: '0.24em', color: C.creamDim, opacity: prog(t, s2.label + 0.2, s2.label + 0.9, easeOut)}}>
        39 FT · 100 LED
      </div>
    </AbsoluteFill>
  );
};

/* Scene 3: close-ups (a bulb on the bamboo, bulbs on the table, the crystal-ball bulbs). */
const CloseUps: React.FC<{t: number}> = ({t}) => {
  const sh = s3.shots;
  const ends = [sh[1], sh[2], s3.end];
  const textIn = (d: number) => prog(t, s3.text + d, s3.text + d + 0.6, easeOut);
  const textOut = prog(t, s3.textOut, s3.textOut + 0.35, easeIn);
  const vis = (i: number) =>
    (i === 0 ? prog(t, sh[0] - 0.3, sh[0] + 0.05) : prog(t, sh[i] - 0.15, sh[i] + 0.25)) * (i < 2 ? 1 - prog(t, ends[i] + 0.1, ends[i] + 0.35) : 1);
  return (
    <AbsoluteFill>
      <Dark at={44} />
      {t < ends[0] + 0.4 && <Shot src="photos/bamboo.jpg" t={t} t0={sh[0] - 0.3} t1={ends[0] + 0.3} from={{z: 2.4, x: 0.72, y: 0.55}} to={{z: 2.1, x: 0.68, y: 0.48}} opacity={vis(0)} />}
      {t > sh[1] - 0.2 && t < ends[1] + 0.4 && <Shot src="photos/cup.jpg" t={t} t0={sh[1] - 0.3} t1={ends[1] + 0.3} from={{z: 2.2, x: 0.4, y: 0.6}} to={{z: 2.2, x: 0.62, y: 0.58}} opacity={vis(1)} />}
      {t > sh[2] - 0.2 && (
        <AbsoluteFill style={{opacity: vis(2)}}>
          <Dark at={40} />
          <Halo amount={0.8} t={t} />
          <Pic name="string.png" t={t} t0={sh[2] - 0.3} t1={s3.end + 0.3} from={{z: 2.6, x: 0.66, y: 0.36}} to={{z: 2.4, x: 0.62, y: 0.5}} cy={H * 0.42} style={{filter: 'brightness(1.05) saturate(1.1)'}} />
        </AbsoluteFill>
      )}
      <Scrim top={1080} height={500} amount={textIn(0) * (1 - textOut)} />
      <div style={{...headline, position: 'absolute', top: 1190, width: '100%', fontSize: 116}}>
        <div>
          {['SUN', 'BY', 'DAY,'].map((w, i) => (
            <Word key={w} k={textIn(i * 0.09)} out={textOut} style={{margin: '0 0.12em'}}>{w}</Word>
          ))}
        </div>
        <div>
          {['GLOW', 'BY', 'NIGHT'].map((w, i) => (
            <Word key={w + i} k={textIn(0.27 + i * 0.09)} out={textOut} color={i === 0 ? C.gold : C.cream} style={{margin: '0 0.12em'}}>{w}</Word>
          ))}
        </div>
      </div>
    </AbsoluteFill>
  );
};

/* Scene 4: the store's photos, one per beat, chips, then the solar panel. */
const CHIPS = ['SOLAR POWERED', '8 LIGHTING MODES', 'WATERPROOF'];

const Angles: React.FC<{t: number; frame: number}> = ({t, frame}) => {
  const sh = s4.shots;
  const ends = [...sh.slice(1), s4.end];
  const chipsOut = prog(t, s4.chipsOut, s4.chipsOut + 0.3, easeIn);
  const au = sp(frame, s4.auto, {damping: 12, stiffness: 200, mass: 0.7});
  const kick = (i: number) => 1 - prog(t, sh[i] - 0.12, sh[i] + 0.35, easeOut);
  const inn = (i: number) => prog(t, sh[i] - 0.12, sh[i] + 0.1);
  const live = (i: number) => t > sh[i] - 0.2 && t < ends[i] + 0.25;
  return (
    <AbsoluteFill>
      {live(0) && <Shot src="photos/fence.jpg" t={t} t0={sh[0] - 0.12} t1={ends[0] + 0.2} from={{z: 1.95 * (1 + 0.07 * kick(0)), x: 0.35, y: 0.5}} to={{z: 2.05, x: 0.55, y: 0.5}} opacity={inn(0)} />}
      {live(1) && <Card name="desk.jpg" t={t} t0={sh[1] - 0.12} t1={ends[1] + 0.2} from={{z: 1.0, x: 0.5, y: 0.5}} to={{z: 1.12, x: 0.55, y: 0.5}} opacity={inn(1)} kick={kick(1)} />}
      {live(2) && <Card name="rail.jpg" t={t} t0={sh[2] - 0.12} t1={ends[2] + 0.2} from={{z: 1.12, x: 0.5, y: 0.5}} to={{z: 1.0, x: 0.5, y: 0.5}} opacity={inn(2)} kick={kick(2)} />}
      {live(3) && <Shot src="photos/fence.jpg" t={t} t0={sh[3] - 0.12} t1={ends[3] + 0.2} from={{z: 2.6 * (1 + 0.07 * kick(3)), x: 0.84, y: 0.8}} to={{z: 2.4, x: 0.82, y: 0.78}} opacity={inn(3)} />}
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
      <Scrim top={170} height={420} amount={0.9 * clamp01(au * 1.4)} />
      <div style={{...headline, position: 'absolute', top: 250, width: '100%', fontSize: 88, color: C.cream, opacity: clamp01(au * 1.4), transform: `translateY(${(1 - au) * 30}px)`}}>
        <div>TURNS ON BY ITSELF</div>
        <div style={{color: C.gold}}>WHEN IT GETS DARK</div>
      </div>
    </AbsoluteFill>
  );
};

/* Scene 5: the fence photo, the line, the logo, the call to action. */
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
      <Shot src="photos/bamboo.jpg" t={t} t0={s5.start - 0.15} t1={s5.end} from={{z: 1.95, x: 0.6, y: 0.45}} to={{z: 1.8, x: 0.58, y: 0.45}} />
      <Scrim top={110} height={420} amount={0.85 * l1(0)} />
      <div style={{...headline, position: 'absolute', top: 175, width: '100%', fontSize: 100}}>
        <div>
          {['LIGHT', 'UP'].map((w, i) => (
            <Word key={w} k={l1(i * 0.09)} style={{margin: '0 0.12em'}}>{w}</Word>
          ))}
        </div>
        <div>
          {['YOUR', 'NIGHTS'].map((w, i) => (
            <Word key={w} k={l2(i * 0.09)} color={i === 1 ? C.gold : C.cream} style={{margin: '0 0.12em'}}>{w}</Word>
          ))}
        </div>
      </div>
      <Scrim top={1220} height={520} amount={0.9 * brand} />
      <Scrim top={1260} height={420} amount={0.8 * brand} />
      {/* the MORZ mini logo from the store theme (assets/morz-logo-mini-light.png), unaltered */}
      <Img src={staticFile('logo/morz-logo-mini-light.png')} style={{position: 'absolute', top: 1285, left: W / 2 - (LOGO_H * (308 / 404)) / 2, height: LOGO_H, width: LOGO_H * (308 / 404), opacity: clamp01(brand * 1.4), transform: `scale(${logoK}) translateY(${(1 - brand) * 24}px)`, filter: `blur(${(1 - brand) * 10}px) drop-shadow(0 6px 24px rgba(0,0,0,0.55))`}} />
      <div style={{position: 'absolute', top: 1530, left: W / 2 - 220, width: 440, height: 104, borderRadius: 52, background: `linear-gradient(180deg, ${C.goldHi} 0%, ${C.gold} 100%)`, boxShadow: '0 10px 40px rgba(255,160,60,0.35)', transform: `scale(${cta * pulse})`, opacity: clamp01(cta * 1.5), overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: F.sans, fontWeight: 800, fontSize: 40, letterSpacing: '0.16em', paddingLeft: '0.16em', color: C.ink}}>
        SHOP NOW
        <div style={{position: 'absolute', inset: 0, opacity: shine > 0 && shine < 1 ? 0.7 : 0, background: `linear-gradient(110deg, transparent ${lerp(-20, 120, shine) - 14}%, rgba(255,255,255,0.9) ${lerp(-20, 120, shine)}%, transparent ${lerp(-20, 120, shine) + 14}%)`}} />
      </div>
    </AbsoluteFill>
  );
};

export const FairyAd: React.FC = () => {
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
      <LightLeak t={t} amount={0.2} />
      <Embers t={t} amount={0.35} />
      <Grain frame={frame} />
      <AbsoluteFill style={{background: C.night, opacity: prog(t, s5.end - 0.25, s5.end, easeIn) * 0.6}} />
    </AbsoluteFill>
  );
};
