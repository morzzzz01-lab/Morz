import React from 'react';
import {Composition} from 'remotion';
import {LanternAd} from './LanternAd';
import {FPS, H, TL, W} from './lib';

export const Root: React.FC = () => (
  <Composition
    id="LanternAd"
    component={LanternAd}
    durationInFrames={Math.round(TL.duration * FPS)}
    fps={FPS}
    width={W}
    height={H}
  />
);
