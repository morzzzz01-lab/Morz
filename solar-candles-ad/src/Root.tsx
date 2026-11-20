import React from 'react';
import {Composition} from 'remotion';
import {CandleAd} from './CandleAd';
import {FPS, H, TL, W} from './lib';

export const Root: React.FC = () => (
  <Composition
    id="CandleAd"
    component={CandleAd}
    durationInFrames={Math.round(TL.duration * FPS)}
    fps={FPS}
    width={W}
    height={H}
  />
);
