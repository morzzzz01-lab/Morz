import React from 'react';
import {Composition} from 'remotion';
import {RobeAd} from './RobeAd';
import {FPS, H, TL, W} from './lib';

export const Root: React.FC = () => (
  <Composition
    id="RobeAd"
    component={RobeAd}
    durationInFrames={Math.round(TL.duration * FPS)}
    fps={FPS}
    width={W}
    height={H}
  />
);
