import React from 'react';
import {AbsoluteFill, Img, staticFile, useCurrentFrame} from 'remotion';
import {Cam, Embers, Grain, LightLeak, Scrim, Word, headline} from './components';
import {C, F, FPS, H, TL, W, clamp01, easeIn, easeOut, flicker, lerp, prog, sp} from './lib';

const {s1, s2, s3, s4, s5} = TL;
const LOGO_H = 230;
const camK = (t: number, t0: number, t1: number) => prog(t, t0, t1, (x) => x * (2 - x) * 0.35 + x * 0.65);

/** Source sizes of the store photos (public/photos), so non-square photos keep their shape. */
const SIZE: Record<string, [number, number]> = {
  'lit.png': [1500, 1456],
  'unlit.png': [1500, 1456],
  'set6.jpg': [1500, 696],
  'books.jpg': [1100, 1100],
  'petals.jpg': [1100, 1100],
  'teapot.jpg': [1100, 1127],
  'twine.jpg': [1100, 1127],
  'jars.jpg': [1500, 723],
  'coolwhite.jpg': [1500, 747],
  'switch.jpg': [1500, 1368],
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

/* Scene 1: a dark room from the store photo, defocused, and the hook. */
const Hook: React.FC<{t: number; frame: number}> = ({t, frame}) => {
  const out = prog(t, s1.exit - 0.05, s1.exit + 0.25, easeIn);
  const words = ['CANDLELIGHT', 'WITHOUT', 'FIRE?'];
  const w = (i: number) => (
    <Word
      key={i}
      k={sp(frame, s1.words[i], {damping: 13, stiffness: 260, mass: 0.6})}
      out={out}
      punch
      color={i === 2 ? C.gold : C.cream}
      style={{margin: '0 0.12em'}}
    >
      {words[i]}
    </Word>
  );
  return (
    <AbsoluteFill style={{opacity: 1 - prog(t, s2.start, s2.start + 0.45)}}>
      <AbsoluteFill style={{backgroundColor: C.night}} />
      <Pic
        name="jars.jpg"
        t={t}
        t0={0}
        t1={2.2}
        from={{z: 3.2, x: 0.6, y: 0.6}}
        to={{z: 3.5, x: 0.6, y: 0.6}}
        style={{filter: `blur(22px) brightness(${0.7 + 0.08 * flicker(t, 1)})`}}
      />
      <AbsoluteFill style={{background: 'rgba(8,5,3,0.3)'}} />
      <AbsoluteFill style={{alignItems: 'center', justifyContent: 'center', paddingBottom: 160}}>
        <div style={{...headline, fontSize: 120, width: 1000}}>
          <div>{w(0)}</div>
          <div>{[1, 2].map(w)}</div>
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};

/* Scene 2: one candle, unlit, then the store's lit photo of the same candle fades in. */
const Reveal: React.FC<{t: number}> = ({t}) => {
  const on = prog(t, s2.on, s2.on + 0.45, easeOut);
  const exit = prog(t, s2.exit - 0.05, s3.start + 0.05, easeIn);
  const label = prog(t, s2.label, s2.label + 0.7, easeOut);
  const cam = {t, t0: s2.start, t1: s3.start + 0.3, from: {z: 0.82, x: 0.5, y: 0.52}, to: {z: 0.98, x: 0.5, y: 0.52}};
  return (
    <AbsoluteFill style={{opacity: prog(t, s2.start, s2.start + 0.4) * (1 - exit)}}>
      <Dark glow={on * (0.85 + 0.15 * flicker(t, 3))} at={44} />
      <Pic name="unlit.png" {...cam} cy={H * 0.5} style={{filter: 'brightness(0.8)'}} />
      <Pic name="lit.png" {...cam} cy={H * 0.5} style={{opacity: on, filter: `brightness(${1 + 0.06 * flicker(t, 6)})`}} />
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
          paddingLeft: '0.28em',
          color: C.gold,
          opacity: label,
          transform: `translateY(${(1 - label) * 18}px)`,
          filter: `blur(${(1 - label) * 8}px)`,
        }}
      >
        SOLAR LED CANDLES
      </div>
      <div
        style={{
          position: 'absolute',
          top: 362,
          width: '100%',
          textAlign: 'center',
          fontFamily: F.sans,
          fontWeight: 500,
          fontSize: 32,
          letterSpacing: '0.24em',
          paddingLeft: '0.24em',
          color: C.creamDim,
          opacity: prog(t, s2.label + 0.2, s2.label + 0.9, easeOut),
        }}
      >
        SET OF 6
      </div>
    </AbsoluteFill>
  );
};

/* Scene 3: close-ups (the flame, the solar panel on top, the switch underneath). */
const CloseUps: React.FC<{t: number}> = ({t}) => {
  const sh = s3.shots;
  const ends = [sh[1], sh[2], s3.end];
  const textIn = (d: number) => prog(t, s3.text + d, s3.text + d + 0.6, easeOut);
  const textOut = prog(t, s3.textOut, s3.textOut + 0.35, easeIn);
  const vis = (i: number) =>
    (i === 0 ? prog(t, sh[0] - 0.3, sh[0] + 0.05) : prog(t, sh[i] - 0.15, sh[i] + 0.25)) *
    (i < 2 ? 1 - prog(t, ends[i] + 0.1, ends[i] + 0.35) : 1);
  return (
    <AbsoluteFill>
      <Dark at={40} />
      {t < ends[0] + 0.4 && (
        <AbsoluteFill style={{opacity: vis(0)}}>
          <Pic name="lit.png" t={t} t0={sh[0] - 0.3} t1={ends[0] + 0.3} from={{z: 2.9, x: 0.5, y: 0.24}} to={{z: 2.5, x: 0.5, y: 0.3}} cy={H * 0.42} />
        </AbsoluteFill>
      )}
      {t > sh[1] - 0.2 && t < ends[1] + 0.4 && (
        <AbsoluteFill style={{opacity: vis(1)}}>
          <Pic name="unlit.png" t={t} t0={sh[1] - 0.3} t1={ends[1] + 0.3} from={{z: 2.2, x: 0.45, y: 0.4}} to={{z: 2.5, x: 0.55, y: 0.38}} cy={H * 0.42} />
        </AbsoluteFill>
      )}
      {t > sh[2] - 0.2 && (
        <AbsoluteFill
          style={{
            opacity: vis(2),
            isolation: 'isolate',
            background: `radial-gradient(ellipse 85% 65% at 50% 40%, #FFF1DC 0%, ${C.cream2} 55%, #C9A780 100%)`,
          }}
        >
          <Pic
            name="switch.jpg"
            t={t}
            t0={sh[2] - 0.3}
            t1={s3.end + 0.3}
            from={{z: 2.0, x: 0.6, y: 0.74}}
            to={{z: 1.8, x: 0.55, y: 0.7}}
            cy={H * 0.42}
            style={{mixBlendMode: 'multiply'}}
          />
        </AbsoluteFill>
      )}
      <Scrim top={1080} height={500} amount={textIn(0) * (1 - textOut)} />
      <div style={{...headline, position: 'absolute', top: 1190, width: '100%', fontSize: 120}}>
        <div>
          {['CHARGED', 'BY'].map((w, i) => (
            <Word key={w} k={textIn(i * 0.09)} out={textOut} style={{margin: '0 0.12em'}}>
              {w}
            </Word>
          ))}
        </div>
        <div>
          <Word k={textIn(0.2)} out={textOut} style={{margin: '0 0.12em'}}>THE</Word>
          <Word k={textIn(0.29)} out={textOut} color={C.gold} style={{margin: '0 0.12em'}}>
            SUN
          </Word>
        </div>
      </div>
    </AbsoluteFill>
  );
};

/* Scene 4: the store's room photos as cards, one per beat, then the cool white option. */
const ROOMS: {name: string; from: Cam; to: Cam}[] = [
  {name: 'books.jpg', from: {z: 1.0, x: 0.5, y: 0.5}, to: {z: 1.12, x: 0.46, y: 0.52}},
  {name: 'petals.jpg', from: {z: 1.12, x: 0.55, y: 0.5}, to: {z: 1.0, x: 0.5, y: 0.5}},
  {name: 'jars.jpg', from: {z: 1.5, x: 0.62, y: 0.55}, to: {z: 1.62, x: 0.7, y: 0.55}},
  {name: 'coolwhite.jpg', from: {z: 1.45, x: 0.42, y: 0.5}, to: {z: 1.58, x: 0.58, y: 0.5}},
];
const CHIPS = ['NO FLAME, NO SMOKE', 'WATERPROOF', 'ABOUT 8 H OF LIGHT'];

const Angles: React.FC<{t: number; frame: number}> = ({t, frame}) => {
  const sh = s4.shots;
  const ends = [...sh.slice(1), s4.end];
  const chipsOut = prog(t, s4.chipsOut, s4.chipsOut + 0.3, easeIn);
  const col = sp(frame, s4.colors, {damping: 12, stiffness: 200, mass: 0.7});
  return (
    <AbsoluteFill>
      {ROOMS.map((r, i) => {
        if (t < sh[i] - 0.2 || t > ends[i] + 0.25) return null;
        return (
          <Card
            key={r.name}
            name={r.name}
            t={t}
            t0={sh[i] - 0.12}
            t1={ends[i] + 0.2}
            from={r.from}
            to={r.to}
            opacity={prog(t, sh[i] - 0.12, sh[i] + 0.1)}
            kick={1 - prog(t, sh[i] - 0.12, sh[i] + 0.35, easeOut)}
          />
        );
      })}
      <AbsoluteFill
        style={{
          mixBlendMode: 'screen',
          background: C.gold,
          opacity: 0.18 * Math.max(...sh.slice(1).map((c) => Math.max(0, 1 - Math.abs(t - c) / 0.1)), 0),
        }}
      />
      {CHIPS.map((label, i) => {
        const k = sp(frame, s4.chips[i], {damping: 12, stiffness: 220, mass: 0.7});
        return (
          <div
            key={label}
            style={{
              position: 'absolute',
              top: 1265 + i * 96,
              left: 0,
              right: 0,
              display: 'flex',
              justifyContent: 'center',
              opacity: clamp01(k * 1.5) * (1 - chipsOut),
              transform: `translateY(${(1 - k) * 30}px) scale(${lerp(0.85, 1, k)})`,
            }}
          >
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 18,
                padding: '18px 34px',
                borderRadius: 44,
                background: 'rgba(20,13,6,0.82)',
                border: '1.5px solid rgba(245,185,92,0.55)',
                fontFamily: F.sans,
                fontWeight: 750,
                fontSize: 36,
                letterSpacing: '0.12em',
                color: C.cream,
              }}
            >
              <span style={{width: 14, height: 14, borderRadius: 7, background: C.gold}} />
              {label}
            </div>
          </div>
        );
      })}
      <div
        style={{
          position: 'absolute',
          top: 1290,
          width: '100%',
          textAlign: 'center',
          opacity: clamp01(col * 1.4),
          transform: `translateY(${(1 - col) * 30}px)`,
        }}
      >
        <div style={{...headline, fontSize: 84, color: C.cream}}>
          3 LIGHT <span style={{color: C.gold}}>COLOURS</span>
        </div>
        <div
          style={{
            marginTop: 18,
            fontFamily: F.sans,
            fontWeight: 650,
            fontSize: 34,
            letterSpacing: '0.18em',
            color: C.creamDim,
          }}
        >
          WARM WHITE · YELLOW · COOL WHITE
        </div>
      </div>
    </AbsoluteFill>
  );
};

/* Scene 5: one lit candle, big, the line, the logo, the call to action. */
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
      <Dark glow={0.9 + 0.1 * flicker(t, 2)} at={40} />
      <Pic
        name="lit.png"
        t={t}
        t0={s5.start - 0.15}
        t1={s5.end}
        from={{z: 0.98, x: 0.5, y: 0.5}}
        to={{z: 0.86, x: 0.5, y: 0.5}}
        cy={850}
        style={{filter: `brightness(${1 + 0.05 * flicker(t, 7)})`}}
      />
      <Scrim top={110} height={400} amount={0.7 * l1(0)} />
      <div style={{...headline, position: 'absolute', top: 175, width: '100%', fontSize: 104}}>
        <div>
          {['COZY', 'GLOW,'].map((w, i) => (
            <Word key={w} k={l1(i * 0.09)} style={{margin: '0 0.12em'}}>
              {w}
            </Word>
          ))}
        </div>
        <div>
          <Word k={l2(0)} color={C.gold} style={{margin: '0 0.12em'}}>
            ZERO
          </Word>
          <Word k={l2(0.09)} style={{margin: '0 0.12em'}}>FLAME</Word>
        </div>
      </div>
      <Scrim top={1220} height={520} amount={0.85 * brand} />
      {/* the MORZ mini logo from the store theme (assets/morz-logo-mini-light.png), unaltered */}
      <Img
        src={staticFile('logo/morz-logo-mini-light.png')}
        style={{
          position: 'absolute',
          top: 1285,
          left: W / 2 - (LOGO_H * (308 / 404)) / 2,
          height: LOGO_H,
          width: LOGO_H * (308 / 404),
          opacity: clamp01(brand * 1.4),
          transform: `scale(${logoK}) translateY(${(1 - brand) * 24}px)`,
          filter: `blur(${(1 - brand) * 10}px) drop-shadow(0 6px 24px rgba(0,0,0,0.55))`,
        }}
      />
      <div
        style={{
          position: 'absolute',
          top: 1530,
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

export const CandleAd: React.FC = () => {
  const frame = useCurrentFrame();
  const t = frame / FPS;
  const show = (a: number, b: number) => t >= a && t < b;
  const cream = t >= s3.shots[2] - 0.2 && t < s4.start;
  return (
    <AbsoluteFill style={{backgroundColor: C.night}}>
      {show(0, s2.start + 0.5) && <Hook t={t} frame={frame} />}
      {show(s2.start, s3.start + 0.1) && <Reveal t={t} />}
      {show(s3.start - 0.35, s4.start + 0.15) && <CloseUps t={t} />}
      {show(s4.start - 0.2, s5.start + 0.3) && <Angles t={t} frame={frame} />}
      {show(s5.start - 0.15, 99) && <Finale t={t} frame={frame} />}
      <AbsoluteFill
        style={{background: 'radial-gradient(ellipse 120% 85% at 50% 50%, transparent 55%, rgba(8,5,3,0.7) 100%)'}}
      />
      <LightLeak t={t} amount={t < s2.on ? 0.1 : 0.3} />
      <Embers t={t} amount={cream ? 0.15 : 0.55} />
      <Grain frame={frame} />
      <AbsoluteFill style={{background: C.night, opacity: prog(t, s5.end - 0.25, s5.end, easeIn) * 0.6}} />
    </AbsoluteFill>
  );
};
