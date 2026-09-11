import React from 'react';
import { Composition } from 'remotion';
import { MainFilm } from './MainFilm';
import {
  FPS,
  TOTAL_DURATION_IN_FRAMES,
  TIMELINE,
} from './constants/timeline';
import { HookScene } from './scenes/01_HookScene';
import { LogoScene } from './scenes/02_LogoScene';
import { HeroGroupScene } from './scenes/03_HeroGroupScene';
import { ExpenseSplitScene } from './scenes/04_ExpenseSplitScene';
import { ScannerHeroScene } from './scenes/05_ScannerHeroScene';
import { SettlementScene } from './scenes/06_SettlementScene';
import { MontageScene } from './scenes/07_MontageScene';
import { LaunchPayoffScene } from './scenes/08_LaunchPayoffScene';
import { GroupScreen } from './components/screens/GroupScreen';
import { ExpenseSplitScreen } from './components/screens/ExpenseSplitScreen';
import { SettlementScreen } from './components/screens/SettlementScreen';
import { ReceiptPaper } from './components/ReceiptPaper';
import { PremiumFilm } from './premium/Film';

export const Root: React.FC = () => {
  return (
    <>
      <Composition id="paymatrix-Shared-Moments" component={PremiumFilm} durationInFrames={1680} fps={60} width={1080} height={2400} />
      {/* 🎬 Master 18-Second Launch Film (1080x2400 @ 60fps - 20:9 Native Device Display) */}
      <Composition
        id="PayMatrix-Launch"
        component={MainFilm}
        durationInFrames={TOTAL_DURATION_IN_FRAMES}
        fps={FPS}
        width={1080}
        height={2400}
      />

      {/* Individual Scene Compositions for Rapid Isolated Preview & Iteration */}
      <Composition
        id="01-Hook"
        component={HookScene}
        durationInFrames={TIMELINE.hook.duration}
        fps={FPS}
        width={1080}
        height={2400}
      />
      <Composition
        id="02-Logo"
        component={LogoScene}
        durationInFrames={TIMELINE.logo.duration}
        fps={FPS}
        width={1080}
        height={2400}
      />
      <Composition
        id="03-HeroGroup"
        component={HeroGroupScene}
        durationInFrames={TIMELINE.heroGroup.duration}
        fps={FPS}
        width={1080}
        height={2400}
      />
      <Composition
        id="04-ExpenseSplit"
        component={ExpenseSplitScene}
        durationInFrames={TIMELINE.expenseSplit.duration}
        fps={FPS}
        width={1080}
        height={2400}
      />
      <Composition
        id="05-ScannerHero"
        component={ScannerHeroScene}
        durationInFrames={TIMELINE.scannerHero.duration}
        fps={FPS}
        width={1080}
        height={2400}
      />
      <Composition
        id="06-Settlement"
        component={SettlementScene}
        durationInFrames={TIMELINE.settlement.duration}
        fps={FPS}
        width={1080}
        height={2400}
      />
      <Composition
        id="07-Montage"
        component={MontageScene}
        durationInFrames={TIMELINE.montage.duration}
        fps={FPS}
        width={1080}
        height={2400}
      />
      <Composition
        id="08-LaunchPayoff"
        component={LaunchPayoffScene}
        durationInFrames={TIMELINE.launchPayoff.duration}
        fps={FPS}
        width={1080}
        height={2400}
      />

      {/* 3D Blender Texture Plates */}
      <Composition
        id="Plate-GroupScreen"
        component={() => (
          <div
            style={{
              width: 1080,
              height: 2400,
              backgroundColor: '#0f0f11',
              overflow: 'hidden',
            }}
          >
            <GroupScreen revealMembers={true} />
          </div>
        )}
        durationInFrames={TIMELINE.heroGroup.duration}
        fps={FPS}
        width={1080}
        height={2400}
      />

      <Composition
        id="Plate-ExpenseSplit"
        component={() => (
          <div
            style={{
              width: 1080,
              height: 2400,
              backgroundColor: '#0f0f11',
              overflow: 'hidden',
            }}
          >
            <ExpenseSplitScreen splitProgress={1} />
          </div>
        )}
        durationInFrames={TIMELINE.expenseSplit.duration}
        fps={FPS}
        width={1080}
        height={2400}
      />

      <Composition
        id="Plate-Settlement"
        component={() => (
          <div
            style={{
              width: 1080,
              height: 2400,
              backgroundColor: '#0f0f11',
              overflow: 'hidden',
            }}
          >
            <SettlementScreen showUPIPressed={true} />
          </div>
        )}
        durationInFrames={TIMELINE.settlement.duration}
        fps={FPS}
        width={1080}
        height={2400}
      />
    </>
  );
};
