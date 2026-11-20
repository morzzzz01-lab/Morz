import React from 'react';
import {Composition} from 'remotion';
import {FairyAd} from './FairyAd';
import {FPS, H, TL, W} from './lib';

export const Root: React.FC = () => (
  <Composition
    id="FairyAd"
    component={FairyAd}
    durationInFrames={Math.round(TL.duration * FPS)}
    fps={FPS}
    width={W}
    height={H}
  />
);
