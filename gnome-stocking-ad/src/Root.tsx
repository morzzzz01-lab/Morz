import React from 'react';
import {Composition} from 'remotion';
import {StockingAd} from './StockingAd';
import {FPS, H, TL, W} from './lib';

export const Root: React.FC = () => (
  <Composition
    id="StockingAd"
    component={StockingAd}
    durationInFrames={Math.round(TL.duration * FPS)}
    fps={FPS}
    width={W}
    height={H}
  />
);
