import React from 'react';
import {Composition} from 'remotion';
import {ProjectorAd} from './ProjectorAd';
import {FPS, H, TL, W} from './lib';

export const Root: React.FC = () => (
  <Composition
    id="ProjectorAd"
    component={ProjectorAd}
    durationInFrames={Math.round(TL.duration * FPS)}
    fps={FPS}
    width={W}
    height={H}
  />
);
