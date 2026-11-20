import React from 'react';
import {AbsoluteFill, Img, staticFile, useCurrentFrame} from 'remotion';
import {Cam, Embers, Grain, LightLeak, Scrim, Snow, WarmGrade, Word, headline} from './components';
import {C, F, FPS, H, TL, W, clamp01, easeIn, easeOut, flicker, lerp, prog, sp} from './lib';

const {s1, s2, s3, s4, s5} = TL;
const LOGO_H = 240;

/** Background behind a cut-out: cold blue night (k=0) to warm amber room (k=1). */
const Room: React.FC<{warm: number}> = ({warm}) => (
  <>
    <AbsoluteFill
      style={{background: `radial-gradient(ellipse 95% 70% at 50% 45%, #1C2B3D 0%, ${C.frost} 72%)`}}
    />
    <AbsoluteFill
      style={{
        opacity: warm,
        background: `radial-gradient(ellipse 95% 70% at 50% 45%, ${C.ember} 0%, ${C.night} 72%)`,
      }}
    />
  </>
);

/**
 * A product cut-out (front.png / back.png, the store's own photos with the background removed)
 * moved like a camera: drawn `z` frame-widths wide with image point (x, y) at (W/2, cy).
 * `warm` lights the fabric from cold blue to candle warm; the product is never redrawn.
 */
const Cutout: React.FC<{
  src: string;
  t: number;
  t0: number;
  t1: number;
  from: Cam;
  to: Cam;
  cy?: number;
  warm?: number;
  bright?: number;
}> = ({src, t, t0, t1, from, to, cy = H / 2, warm = 1, bright = 1}) => {
  const k = prog(t, t0, t1, (x) => x * (2 - x) * 0.35 + x * 0.65);
  const z = lerp(from.z, to.z, k);
  const S = W * z;
  const left = W / 2 - lerp(from.x, to.x, k) * S;
  const top = cy - lerp(from.y, to.y, k) * S;
  const mask = {
    WebkitMaskImage: `url(${staticFile(src)})`,
    WebkitMaskSize: '100% 100%',
  } as React.CSSProperties;
  return (
    <div style={{position: 'absolute', left, top, width: S, height: S}}>
      <Img
        src={staticFile(src)}
        style={{
          width: S,
          height: S,
          filter: `brightness(${lerp(0.62, 1.04, warm) * bright}) saturate(${lerp(0.75, 1, warm)}) contrast(1.05)`,
        }}
      />
      <div
        style={{
          ...mask,
          position: 'absolute',
          inset: 0,
          mixBlendMode: 'soft-light',
          background: `radial-gradient(ellipse 70% 60% at 50% 45%, rgba(255,175,95,${0.1 * warm}) 0%, rgba(120,170,255,${0.5 * (1 - warm)}) 100%)`,
        }}
      />
    </div>
  );
};

/** A white-background store photo laid onto a warm cream wall (multiply), so white reads as room light. */
const CreamShot: React.FC<{src: string; t: number; t0: number; t1: number; from: Cam; to: Cam; opacity: number}> = ({
  src,
  t,
  t0,
  t1,
  from,
  to,
  opacity,
}) => {
  const k = prog(t, t0, t1, (x) => x * (2 - x) * 0.35 + x * 0.65);
  const z = lerp(from.z, to.z, k);
  const S = W * z;
  return (
    <AbsoluteFill
      style={{
        opacity,
        isolation: 'isolate',
        background: `radial-gradient(ellipse 85% 65% at 50% 40%, #FFF1DC 0%, ${C.cream2} 55%, #C9A780 100%)`,
      }}
    >
      <Img
        src={staticFile(src)}
        style={{
          position: 'absolute',
          width: S,
          height: S,
          left: W / 2 - lerp(from.x, to.x, k) * S,
          top: H / 2 - lerp(from.y, to.y, k) * S,
          mixBlendMode: 'multiply',
          filter: 'contrast(1.04) saturate(1.05)',
        }}
      />
    </AbsoluteFill>
  );
};

/* Scene 1: cold night, snow outside, the hook. */
const Hook: React.FC<{t: number; frame: number}> = ({t, frame}) => {
  const out = prog(t, s1.exit - 0.05, s1.exit + 0.25, easeIn);
  const words = ['STILL', 'FREEZING', 'AT', 'HOME?'];
  const w = (i: number) => (
    <Word
      key={i}
      k={sp(frame, s1.words[i], {damping: 13, stiffness: 260, mass: 0.6})}
      out={out}
      punch
      color={i === 1 ? C.ice : C.cream}
      style={{margin: '0 0.12em'}}
    >
      {words[i]}
    </Word>
  );
  return (
    <AbsoluteFill style={{opacity: 1 - prog(t, s2.start, s2.start + 0.45)}}>
      <Room warm={0} />
      <AbsoluteFill
        style={{
          background:
            'linear-gradient(160deg, rgba(150,190,255,0.16) 0%, transparent 35%, transparent 65%, rgba(150,190,255,0.08) 100%)',
        }}
      />
      <Snow t={t} amount={1} />
      <AbsoluteFill style={{alignItems: 'center', justifyContent: 'center', paddingBottom: 160}}>
        <div style={{...headline, fontSize: 128, width: 1000}}>
          <div>{[0, 1].map(w)}</div>
          <div>{[2, 3].map(w)}</div>
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};

/* Scene 2: the robe in the cold, then warm light floods in. */
const Reveal: React.FC<{t: number}> = ({t}) => {
  const warm = prog(t, s2.warm, s2.warm + 1.1, easeOut);
  const exit = prog(t, s2.exit - 0.05, s3.start + 0.05, easeIn);
  const label = prog(t, s2.label, s2.label + 0.7, easeOut);
  const halo = warm * (0.85 + 0.15 * flicker(t, 5));
  return (
    <AbsoluteFill style={{opacity: prog(t, s2.start, s2.start + 0.4) * (1 - exit)}}>
      <Room warm={warm} />
      <Snow t={t} amount={1 - warm} />
      <AbsoluteFill
        style={{
          mixBlendMode: 'screen',
          opacity: halo,
          background:
            'radial-gradient(circle at 50% 48%, rgba(255,170,80,0.5) 0%, rgba(255,120,40,0.2) 26%, transparent 52%)',
        }}
      />
      <Cutout
        src="photos/front.png"
        t={t}
        t0={s2.start}
        t1={s3.start + 0.3}
        from={{z: 1.12, x: 0.5, y: 0.5}}
        to={{z: 1.3, x: 0.5, y: 0.48}}
        cy={H * 0.53 - exit * 200}
        warm={warm}
      />
      <div
        style={{
          position: 'absolute',
          top: 250,
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
        HOODED HEATED BLANKET
      </div>
    </AbsoluteFill>
  );
};

/* Scene 3: close-ups (sherpa-lined hood, the control panel, cuff and pocket). */
const CLOSE = [
  {from: {z: 2.5, x: 0.5, y: 0.16}, to: {z: 2.85, x: 0.5, y: 0.24}},
  {from: {z: 3.3, x: 0.45, y: 0.36}, to: {z: 3.0, x: 0.47, y: 0.39}},
  {from: {z: 2.6, x: 0.34, y: 0.53}, to: {z: 2.6, x: 0.6, y: 0.47}},
];

const CloseUps: React.FC<{t: number}> = ({t}) => {
  const ends = [...s3.shots.slice(1), s3.end];
  const textIn = (d: number) => prog(t, s3.text + d, s3.text + d + 0.6, easeOut);
  const textOut = prog(t, s3.textOut, s3.textOut + 0.35, easeIn);
  return (
    <AbsoluteFill>
      <Room warm={1} />
      {CLOSE.map((c, i) => {
        const t0 = s3.shots[i];
        if (t < t0 - 0.35 || t > ends[i] + 0.4) return null;
        const fade = i === 0 ? prog(t, t0 - 0.3, t0 + 0.05) : prog(t, t0 - 0.15, t0 + 0.25);
        const leave = i < 2 ? 1 - prog(t, ends[i] + 0.1, ends[i] + 0.35) : 1;
        return (
          <AbsoluteFill key={i} style={{opacity: fade * leave}}>
            <Cutout src="photos/front.png" t={t} t0={t0 - 0.3} t1={ends[i] + 0.3} from={c.from} to={c.to} />
          </AbsoluteFill>
        );
      })}
      <Scrim top={1080} height={500} amount={textIn(0) * (1 - textOut)} />
      <div style={{...headline, position: 'absolute', top: 1190, width: '100%', fontSize: 120}}>
        <div>
          <Word k={textIn(0)} out={textOut} color={C.gold}>WARMTH</Word>
        </div>
        <div>
          {['YOU', 'CAN', 'WEAR'].map((w, i) => (
            <Word key={w} k={textIn(0.12 + i * 0.09)} out={textOut} style={{margin: '0 0.12em'}}>
              {w}
            </Word>
          ))}
        </div>
      </div>
    </AbsoluteFill>
  );
};

/* Scene 4: worn (the store's model photo), its controller, the back, the front. One per beat. */
const CHIPS = ['SOFT FLANNEL', 'COZY HOOD', 'PLUG-IN WARMTH'];

const Angles: React.FC<{t: number; frame: number}> = ({t, frame}) => {
  const sh = s4.shots;
  const inn = (i: number) => prog(t, sh[i] - 0.12, sh[i] + 0.1);
  const kick = (i: number) => 1 + 0.07 * (1 - prog(t, sh[i] - 0.12, sh[i] + 0.35, easeOut));
  const chipsOut = prog(t, s4.chipsOut, s4.chipsOut + 0.3, easeIn);
  return (
    <AbsoluteFill>
      {t < sh[2] + 0.2 && (
        <>
          <CreamShot
            src="photos/model.jpg"
            t={t}
            t0={sh[0] - 0.12}
            t1={sh[1]}
            from={{z: 1.85 * kick(0), x: 0.46, y: 0.5}}
            to={{z: 1.95, x: 0.47, y: 0.5}}
            opacity={inn(0)}
          />
          {t > sh[1] - 0.15 && (
            <CreamShot
              src="photos/model.jpg"
              t={t}
              t0={sh[1] - 0.12}
              t1={sh[2] + 0.2}
              from={{z: 2.9 * kick(1), x: 0.87, y: 0.55}}
              to={{z: 2.6, x: 0.84, y: 0.56}}
              opacity={inn(1)}
            />
          )}
        </>
      )}
      {t > sh[2] - 0.15 && (
        <AbsoluteFill style={{opacity: inn(2)}}>
          <Room warm={1} />
          <AbsoluteFill
            style={{
              mixBlendMode: 'screen',
              background:
                'radial-gradient(circle at 50% 50%, rgba(255,170,80,0.42) 0%, rgba(255,120,40,0.15) 28%, transparent 55%)',
            }}
          />
          {t < sh[3] + 0.2 ? (
            <Cutout
              src="photos/back.png"
              t={t}
              t0={sh[2] - 0.12}
              t1={sh[3] + 0.2}
              from={{z: 1.1 * kick(2), x: 0.5, y: 0.5}}
              to={{z: 1.2, x: 0.5, y: 0.5}}
              cy={H * 0.5}
            />
          ) : null}
          {t > sh[3] - 0.15 && (
            <AbsoluteFill style={{opacity: inn(3)}}>
              <Room warm={1} />
              <AbsoluteFill
                style={{
                  mixBlendMode: 'screen',
                  background:
                    'radial-gradient(circle at 50% 50%, rgba(255,170,80,0.42) 0%, rgba(255,120,40,0.15) 28%, transparent 55%)',
                }}
              />
              <Cutout
                src="photos/front.png"
                t={t}
                t0={sh[3] - 0.12}
                t1={s4.end + 0.2}
                from={{z: 1.3 * kick(3), x: 0.5, y: 0.5}}
                to={{z: 1.18, x: 0.5, y: 0.5}}
                cy={H * 0.5}
              />
            </AbsoluteFill>
          )}
        </AbsoluteFill>
      )}
      {/* soft warm flash on each cut */}
      <AbsoluteFill
        style={{
          mixBlendMode: 'screen',
          background: C.gold,
          opacity: 0.2 * Math.max(...sh.slice(1).map((c) => Math.max(0, 1 - Math.abs(t - c) / 0.1)), 0),
        }}
      />
      {/* feature chips, one per beat */}
      {CHIPS.map((label, i) => {
        const k = sp(frame, s4.chips[i], {damping: 12, stiffness: 220, mass: 0.7});
        return (
          <div
            key={label}
            style={{
              position: 'absolute',
              top: 1255 + i * 96,
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
    </AbsoluteFill>
  );
};

/* Scene 5: the robe in warm light, the line, the logo, the call to action. */
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
      <Room warm={1} />
      <AbsoluteFill
        style={{
          mixBlendMode: 'screen',
          opacity: 0.9 + 0.1 * flicker(t, 2),
          background:
            'radial-gradient(circle at 50% 42%, rgba(255,170,80,0.5) 0%, rgba(255,120,40,0.18) 28%, transparent 55%)',
        }}
      />
      <Cutout
        src="photos/front.png"
        t={t}
        t0={s5.start - 0.15}
        t1={s5.end}
        from={{z: 0.95, x: 0.5, y: 0.5}}
        to={{z: 0.84, x: 0.5, y: 0.5}}
        cy={810}
      />
      <Scrim top={110} height={400} amount={0.7 * l1(0)} />
      <div style={{...headline, position: 'absolute', top: 175, width: '100%', fontSize: 96}}>
        <div>
          {['STAY', 'COZY'].map((w, i) => (
            <Word key={w} k={l1(i * 0.09)} color={i === 1 ? C.gold : C.cream} style={{margin: '0 0.12em'}}>
              {w}
            </Word>
          ))}
        </div>
        <div>
          {['ALL', 'WINTER'].map((w, i) => (
            <Word key={w} k={l2(i * 0.09)} style={{margin: '0 0.12em'}}>
              {w}
            </Word>
          ))}
        </div>
      </div>
      <Scrim top={1180} height={520} amount={0.85 * brand} />
      {/* the MORZ mini logo from the store theme (assets/morz-logo-mini-light.png), unaltered */}
      <Img
        src={staticFile('logo/morz-logo-mini-light.png')}
        style={{
          position: 'absolute',
          top: 1265,
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
          top: 1520,
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

export const RobeAd: React.FC = () => {
  const frame = useCurrentFrame();
  const t = frame / FPS;
  const show = (a: number, b: number) => t >= a && t < b;
  const cold = t < s2.warm;
  return (
    <AbsoluteFill style={{backgroundColor: C.night}}>
      {show(0, s2.start + 0.5) && <Hook t={t} frame={frame} />}
      {show(s2.start, s3.start + 0.1) && <Reveal t={t} />}
      {show(s3.start - 0.35, s4.start + 0.15) && <CloseUps t={t} />}
      {show(s4.start - 0.2, s5.start + 0.3) && <Angles t={t} frame={frame} />}
      {show(s5.start - 0.15, 99) && <Finale t={t} frame={frame} />}
      <WarmGrade t={t} strength={cold ? 0 : 0.18} />
      <LightLeak t={t} amount={cold ? 0 : 0.35} />
      <Embers t={t} amount={cold ? 0 : t >= s4.start && t < s4.shots[2] ? 0.25 : 0.6} />
      <Grain frame={frame} />
      <AbsoluteFill style={{background: C.night, opacity: prog(t, s5.end - 0.25, s5.end, easeIn) * 0.6}} />
    </AbsoluteFill>
  );
};
