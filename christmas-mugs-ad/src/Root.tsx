import React from 'react';
import {Composition} from 'remotion';
import {MugAd} from './MugAd';
import {FPS, H, TL, W} from './lib';

export const Root: React.FC = () => (
  <Composition
    id="MugAd"
    component={MugAd}
    durationInFrames={Math.round(TL.duration * FPS)}
    fps={FPS}
    width={W}
    height={H}
  />
);
