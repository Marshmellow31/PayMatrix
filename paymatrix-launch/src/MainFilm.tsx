import React from 'react';
import { AbsoluteFill, Sequence } from 'remotion';
import { TIMELINE } from './constants/timeline';
import { VIDEO_THEME } from './constants/videoTheme';
import { HookScene } from './scenes/01_HookScene';
import { LogoScene } from './scenes/02_LogoScene';
import { HeroGroupScene } from './scenes/03_HeroGroupScene';
import { ExpenseSplitScene } from './scenes/04_ExpenseSplitScene';
import { ScannerHeroScene } from './scenes/05_ScannerHeroScene';
import { SettlementScene } from './scenes/06_SettlementScene';
import { MontageScene } from './scenes/07_MontageScene';
import { LaunchPayoffScene } from './scenes/08_LaunchPayoffScene';

export const MainFilm: React.FC = () => {
  return (
    <AbsoluteFill style={{ backgroundColor: VIDEO_THEME.canvas }}>
      {/* Global Typography Imports */}
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&family=JetBrains+Mono:wght@400;500;600;700;800&family=Manrope:wght@600;700;800;900&display=swap');
      `}</style>

      {/* 01: Hook (0:00 - 0:03) */}
      <Sequence from={TIMELINE.hook.start} durationInFrames={TIMELINE.hook.duration}>
        <HookScene />
      </Sequence>

      {/* 02: PayMatrix Reveal (0:03 - 0:07) */}
      <Sequence from={TIMELINE.logo.start} durationInFrames={TIMELINE.logo.duration}>
        <LogoScene />
      </Sequence>

      {/* 03: Product Hero + Group (0:07 - 0:13) */}
      <Sequence from={TIMELINE.heroGroup.start} durationInFrames={TIMELINE.heroGroup.duration}>
        <HeroGroupScene />
      </Sequence>

      {/* 04: Add + Split (0:13 - 0:19) */}
      <Sequence from={TIMELINE.expenseSplit.start} durationInFrames={TIMELINE.expenseSplit.duration}>
        <ExpenseSplitScene />
      </Sequence>

      {/* 05: AI Receipt Scanner Hero Moment (0:19 - 0:26) */}
      <Sequence from={TIMELINE.scannerHero.start} durationInFrames={TIMELINE.scannerHero.duration}>
        <ScannerHeroScene />
      </Sequence>

      {/* 06: Balances → Settle Up UPI (0:26 - 0:32) */}
      <Sequence from={TIMELINE.settlement.start} durationInFrames={TIMELINE.settlement.duration}>
        <SettlementScene />
      </Sequence>

      {/* 07: Fast Product Montage (0:32 - 0:36) */}
      <Sequence from={TIMELINE.montage.start} durationInFrames={TIMELINE.montage.duration}>
        <MontageScene />
      </Sequence>

      {/* 08: Google Play Launch Payoff (0:36 - 0:40) */}
      <Sequence from={TIMELINE.launchPayoff.start} durationInFrames={TIMELINE.launchPayoff.duration}>
        <LaunchPayoffScene />
      </Sequence>
    </AbsoluteFill>
  );
};
