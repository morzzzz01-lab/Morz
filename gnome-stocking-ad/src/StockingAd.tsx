import React from 'react';
import {AbsoluteFill, Img, staticFile, useCurrentFrame} from 'remotion';
import {Cam, Embers, Grain, LightLeak, Scrim, Shot, Snow, WarmGrade, Word, headline} from './components';
import {C, F, FPS, H, TL, W, clamp01, easeIn, easeOut, flicker, lerp, prog, sp} from './lib';

const {s1, s2, s3, s4, s5} = TL;
const LOGO_H = 230;
const camK = (t: number, t0: number, t1: number) => prog(t, t0, t1, (x) => x * (2 - x) * 0.35 + x * 0.65);

const WarmRoom: React.FC<{glow?: number}> = ({glow = 1}) => (
  <>
    <AbsoluteFill style={{background: `radial-gradient(ellipse 95% 70% at 50% 45%, ${C.ember} 0%, ${C.night} 72%)`}} />
    <AbsoluteFill
      style={{
        mixBlendMode: 'screen',
        opacity: glow,
        background:
          'radial-gradient(circle at 50% 46%, rgba(255,170,80,0.45) 0%, rgba(255,120,40,0.16) 28%, transparent 55%)',
      }}
    />
  </>
);

/** The pair cut-out (the store's own transparent photo), moved like a camera. */
const Pair: React.FC<{t: number; t0: number; t1: number; from: Cam; to: Cam; cy?: number; sweep?: number}> = ({
  t,
  t0,
  t1,
  from,
  to,
  cy = H / 2,
  sweep = -1,
}) => {
  const k = camK(t, t0, t1);
  const S = W * lerp(from.z, to.z, k);
  const src = staticFile('photos/s1.png');
  return (
    <div
      style={{
        position: 'absolute',
        left: W / 2 - lerp(from.x, to.x, k) * S,
        top: cy - lerp(from.y, to.y, k) * S,
        width: S,
        height: S,
      }}
    >
      <Img src={src} style={{width: S, height: S, filter: 'contrast(1.04) drop-shadow(0 30px 50px rgba(0,0,0,0.5))'}} />
      {sweep > 0 && sweep < 1 && (
        <div
          style={{
            position: 'absolute',
            inset: 0,
            mixBlendMode: 'screen',
            opacity: 0.5,
            WebkitMaskImage: `url(${src})`,
            WebkitMaskSize: '100% 100%',
            background: `linear-gradient(115deg, transparent ${lerp(-30, 110, sweep) - 12}%, rgba(255,236,200,0.85) ${lerp(-30, 110, sweep)}%, transparent ${lerp(-30, 110, sweep) + 12}%)`,
          }}
        />
      )}
    </div>
  );
};

/* Scene 1: the fireplace photo, defocused and dimmed, and the hook. */
const Hook: React.FC<{t: number; frame: number}> = ({t, frame}) => {
  const out = prog(t, s1.exit - 0.05, s1.exit + 0.25, easeIn);
  const words = ['YOUR', 'FIREPLACE', 'LOOKS', 'EMPTY?'];
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
      <Shot
        src="photos/s4.jpg"
        t={t}
        t0={0}
        t1={2.2}
        from={{z: 2.2, x: 0.5, y: 0.55}}
        to={{z: 2.4, x: 0.5, y: 0.55}}
        bright={0.4 + 0.06 * flicker(t, 1)}
        blur={24}
      />
      <AbsoluteFill style={{background: 'rgba(8,5,3,0.4)'}} />
      <Snow t={t} amount={0.35} count={40} />
      <AbsoluteFill style={{alignItems: 'center', justifyContent: 'center', paddingBottom: 160}}>
        <div style={{...headline, fontSize: 118, width: 1000}}>
          <div>{[0, 1].map(w)}</div>
          <div>{[2, 3].map(w)}</div>
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};

/* Scene 2: the pair in warm light, slow push in, a sheen across the fabric. */
const Reveal: React.FC<{t: number}> = ({t}) => {
  const glow = prog(t, s2.glow, s2.glow + 0.9, easeOut) * (0.85 + 0.15 * flicker(t, 4));
  const exit = prog(t, s2.exit - 0.05, s3.start + 0.05, easeIn);
  const label = prog(t, s2.label, s2.label + 0.7, easeOut);
  return (
    <AbsoluteFill style={{opacity: prog(t, s2.start, s2.start + 0.4) * (1 - exit)}}>
      <WarmRoom glow={glow} />
      <Pair
        t={t}
        t0={s2.start}
        t1={s3.start + 0.3}
        from={{z: 1.05, x: 0.48, y: 0.53}}
        to={{z: 1.2, x: 0.48, y: 0.53}}
        cy={H * 0.52}
        sweep={prog(t, s2.sweep, s2.sweep + 0.9, (x) => x)}
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
        GNOME CHRISTMAS STOCKING
      </div>
    </AbsoluteFill>
  );
};

/* Scene 3: close-ups of the plaid hat and nose, the beard, the snowflake. */
const CLOSE = [
  {from: {z: 3.0, x: 0.66, y: 0.33}, to: {z: 2.7, x: 0.67, y: 0.4}},
  {from: {z: 2.8, x: 0.3, y: 0.48}, to: {z: 2.8, x: 0.31, y: 0.64}},
  {from: {z: 3.2, x: 0.73, y: 0.86}, to: {z: 2.9, x: 0.71, y: 0.8}},
];

const CloseUps: React.FC<{t: number}> = ({t}) => {
  const ends = [...s3.shots.slice(1), s3.end];
  const textIn = (d: number) => prog(t, s3.text + d, s3.text + d + 0.6, easeOut);
  const textOut = prog(t, s3.textOut, s3.textOut + 0.35, easeIn);
  return (
    <AbsoluteFill>
      <WarmRoom />
      {CLOSE.map((c, i) => {
        const t0 = s3.shots[i];
        if (t < t0 - 0.35 || t > ends[i] + 0.4) return null;
        const fade = i === 0 ? prog(t, t0 - 0.3, t0 + 0.05) : prog(t, t0 - 0.15, t0 + 0.25);
        const leave = i < 2 ? 1 - prog(t, ends[i] + 0.1, ends[i] + 0.35) : 1;
        return (
          <AbsoluteFill key={i} style={{opacity: fade * leave}}>
            <Pair t={t} t0={t0 - 0.3} t1={ends[i] + 0.3} from={c.from} to={c.to} />
          </AbsoluteFill>
        );
      })}
      <Scrim top={1080} height={500} amount={textIn(0) * (1 - textOut)} />
      <div style={{...headline, position: 'absolute', top: 1190, width: '100%', fontSize: 120}}>
        <div>
          <Word k={textIn(0)} out={textOut}>FESTIVE</Word>
        </div>
        <div>
          <Word k={textIn(0.12)} out={textOut} color={C.gold} style={{margin: '0 0.12em'}}>
            GNOME
          </Word>
          <Word k={textIn(0.21)} out={textOut} style={{margin: '0 0.12em'}}>
            CHARM
          </Word>
        </div>
      </div>
    </AbsoluteFill>
  );
};

/* Scene 4: the store's room photos, one per beat, then both colours side by side. */
const ROOMS = [
  {src: 'photos/s2.jpg', from: {z: 1.95, x: 0.42, y: 0.55}, to: {z: 2.1, x: 0.6, y: 0.56}},
  {src: 'photos/s3.jpg', from: {z: 2.1, x: 0.52, y: 0.62}, to: {z: 1.95, x: 0.5, y: 0.45}},
  {src: 'photos/s4.jpg', from: {z: 2.1, x: 0.55, y: 0.5}, to: {z: 2.0, x: 0.8, y: 0.45}},
];
const CHIPS = ['ROOMY FOR GIFTS', 'HANG IT ANYWHERE', 'REUSABLE FOR YEARS'];

const Chip: React.FC<{k: number; out: number; top: number; label: string; dot?: string}> = ({k, out, top, label, dot = C.gold}) => (
  <div
    style={{
      position: 'absolute',
      top,
      left: 0,
      right: 0,
      display: 'flex',
      justifyContent: 'center',
      opacity: clamp01(k * 1.5) * (1 - out),
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
      <span style={{width: 14, height: 14, borderRadius: 7, background: dot}} />
      {label}
    </div>
  </div>
);

const Angles: React.FC<{t: number; frame: number}> = ({t, frame}) => {
  const sh = s4.shots;
  const chipsOut = prog(t, s4.chipsOut, s4.chipsOut + 0.3, easeIn);
  const col = sp(frame, s4.colors, {damping: 12, stiffness: 200, mass: 0.7});
  const ck = camK(t, sh[3] - 0.12, s4.end + 0.2);
  return (
    <AbsoluteFill>
      {ROOMS.map((r, i) => {
        if (t < sh[i] - 0.2 || t > sh[i + 1] + 0.25) return null;
        const kick = 1 + 0.07 * (1 - prog(t, sh[i] - 0.12, sh[i] + 0.35, easeOut));
        return (
          <Shot
            key={i}
            src={r.src}
            t={t}
            t0={sh[i] - 0.12}
            t1={sh[i + 1] + 0.2}
            from={{...r.from, z: r.from.z * kick}}
            to={r.to}
            opacity={prog(t, sh[i] - 0.12, sh[i] + 0.1)}
          />
        );
      })}
      {t > sh[3] - 0.15 && (
        /* both colours: the store's white-background photos laid onto a warm cream wall (multiply) */
        <AbsoluteFill
          style={{
            opacity: prog(t, sh[3] - 0.12, sh[3] + 0.1),
            isolation: 'isolate',
            background: `radial-gradient(ellipse 85% 65% at 50% 42%, #FFF1DC 0%, ${C.cream2} 55%, #C9A780 100%)`,
          }}
        >
          {['photos/s5.jpg', 'photos/s6.jpg'].map((src, i) => {
            const S = lerp(980, 1060, ck);
            return (
              <Img
                key={src}
                src={staticFile(src)}
                style={{
                  position: 'absolute',
                  width: S,
                  height: S,
                  left: (i === 0 ? W * 0.27 : W * 0.73) - S * 0.5,
                  top: H * 0.42 - S * 0.5 + (i === 0 ? -40 : 60),
                  mixBlendMode: 'multiply',
                  filter: 'contrast(1.04)',
                }}
              />
            );
          })}
        </AbsoluteFill>
      )}
      <AbsoluteFill
        style={{
          mixBlendMode: 'screen',
          background: C.gold,
          opacity: 0.2 * Math.max(...sh.slice(1).map((c) => Math.max(0, 1 - Math.abs(t - c) / 0.1)), 0),
        }}
      />
      {CHIPS.map((label, i) => (
        <Chip
          key={label}
          k={sp(frame, s4.chips[i], {damping: 12, stiffness: 220, mass: 0.7})}
          out={chipsOut}
          top={1255 + i * 96}
          label={label}
        />
      ))}
      <div
        style={{
          ...headline,
          position: 'absolute',
          top: 1290,
          width: '100%',
          fontSize: 92,
          color: C.ink,
          textShadow: 'none',
          opacity: clamp01(col * 1.4),
          transform: `translateY(${(1 - col) * 30}px)`,
        }}
      >
        <span style={{color: '#B3242B'}}>RED</span> <span style={{fontFamily: F.serif, fontStyle: 'italic', fontWeight: 400, textTransform: 'none'}}>or</span>{' '}
        <span style={{color: '#7A7672'}}>GREY</span>
      </div>
    </AbsoluteFill>
  );
};

/* Scene 5: the pair on the mantel, the line, the logo, the call to action. */
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
      <Shot
        src="photos/s2.jpg"
        t={t}
        t0={s5.start - 0.15}
        t1={s5.end}
        from={{z: 1.38, x: 0.53, y: 0.62}}
        to={{z: 1.25, x: 0.53, y: 0.62}}
        cy={880}
        bright={1.0}
      />
      <Scrim top={110} height={400} amount={0.85 * l1(0)} />
      <div style={{...headline, position: 'absolute', top: 175, width: '100%', fontSize: 92}}>
        <div>
          {['FILL', 'THEM', 'WITH'].map((w, i) => (
            <Word key={w} k={l1(i * 0.09)} style={{margin: '0 0.12em'}}>
              {w}
            </Word>
          ))}
        </div>
        <div>
          <Word k={l2(0)} style={{margin: '0 0.12em'}}>CHRISTMAS</Word>
          <Word k={l2(0.09)} color={C.gold} style={{margin: '0 0.12em'}}>
            MAGIC
          </Word>
        </div>
      </div>
      <Scrim top={1220} height={520} amount={0.9 * brand} />
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

export const StockingAd: React.FC = () => {
  const frame = useCurrentFrame();
  const t = frame / FPS;
  const show = (a: number, b: number) => t >= a && t < b;
  const cream = t >= s4.shots[3] && t < s5.start;
  return (
    <AbsoluteFill style={{backgroundColor: C.night}}>
      {show(0, s2.start + 0.5) && <Hook t={t} frame={frame} />}
      {show(s2.start, s3.start + 0.1) && <Reveal t={t} />}
      {show(s3.start - 0.35, s4.start + 0.15) && <CloseUps t={t} />}
      {show(s4.start - 0.2, s5.start + 0.3) && <Angles t={t} frame={frame} />}
      {show(s5.start - 0.15, 99) && <Finale t={t} frame={frame} />}
      <WarmGrade t={t} strength={cream ? 0.1 : 0.25} />
      <LightLeak t={t} amount={t < s2.glow ? 0.1 : 0.35} />
      <Embers t={t} amount={cream ? 0.2 : 0.6} />
      <Grain frame={frame} />
      <AbsoluteFill style={{background: C.night, opacity: prog(t, s5.end - 0.25, s5.end, easeIn) * 0.6}} />
    </AbsoluteFill>
  );
};
