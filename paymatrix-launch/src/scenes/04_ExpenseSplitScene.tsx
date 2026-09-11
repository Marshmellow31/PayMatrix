import React from 'react';
import { AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig } from 'remotion';
import { Background } from '../components/Background';
import { PhoneMockup } from '../components/PhoneMockup';
import { ExpenseSplitScreen } from '../components/screens/ExpenseSplitScreen';
import { VIDEO_THEME } from '../constants/videoTheme';

export const ExpenseSplitScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Kinetic copy switch: "ADD IT." (frame 0-65) -> "SPLIT IT!" (frame 65-150)
  const isSplitPhase = frame > 65;

  const phrase1Spring = spring({
    frame,
    fps,
    config: { damping: 16, stiffness: 150 },
  });
  const phrase1Y = interpolate(phrase1Spring, [0, 1], [30, 0]);
  const phrase1Opacity = interpolate(frame, [0, 12, 55, 65], [0, 1, 1, 0], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const phrase2Spring = spring({
    frame: frame - 65,
    fps,
    config: { damping: 16, stiffness: 150 },
  });
  const phrase2Y = interpolate(phrase2Spring, [0, 1], [30, 0]);
  const phrase2Opacity = interpolate(phrase2Spring, [0, 1], [0, 1]);

  const cameraScale = interpolate(frame, [0, 150], [1, 1.04]);

  // Exit transition
  const exitOpacity = interpolate(frame, [135, 150], [1, 0], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  return (
    <AbsoluteFill style={{ opacity: exitOpacity, backgroundColor: VIDEO_THEME.canvas }}>
      <Background glowColor="rgba(255, 255, 255, 0.02)" glowIntensity={0.8} />

      {/* Commanding Cinematic Dynamic Headline: "ADD IT." -> "SPLIT IT!" */}
      <div
        style={{
          position: 'absolute',
          top: '140px',
          left: '0px',
          right: '0px',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          textAlign: 'center',
          padding: '0 50px',
          zIndex: 30,
        }}
      >
        {!isSplitPhase ? (
          <div style={{ transform: `translateY(${phrase1Y}px)`, opacity: phrase1Opacity }}>
            <h1
              style={{
                fontFamily: VIDEO_THEME.fonts.heading,
                fontSize: '104px',
                fontWeight: 900,
                letterSpacing: '-0.05em',
                lineHeight: 0.98,
                color: '#ffffff',
                margin: 0,
                textTransform: 'uppercase',
              }}
            >
              Add it.
            </h1>
          </div>
        ) : (
          <div style={{ transform: `translateY(${phrase2Y}px)`, opacity: phrase2Opacity }}>
            <h1
              style={{
                fontFamily: VIDEO_THEME.fonts.heading,
                fontSize: '104px',
                fontWeight: 900,
                letterSpacing: '-0.05em',
                lineHeight: 0.98,
                color: '#ffffff',
                margin: 0,
                textTransform: 'uppercase',
                background: 'linear-gradient(180deg, #ffffff 40%, rgba(255, 255, 255, 0.6) 100%)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
              }}
            >
              Split it!
            </h1>
          </div>
        )}
      </div>

      {/* Modern Android Flagship Smartphone — Identical Placeholder to Scene 3 */}
      <div
        style={{
          position: 'absolute',
          left: '50%',
          top: '440px',
          transform: 'translateX(-50%)',
          zIndex: 40,
        }}
      >
        <div
          style={{
            transform: `scale(${cameraScale})`,
            transformOrigin: 'top center',
          }}
        >
          <PhoneMockup
            width={840}
            rotateX={0}
            rotateY={0}
            rotateZ={0}
            use3DPlate={true}
            plateSrc="plates/scene04_phone_cropped.png"
          />
        </div>
      </div>
    </AbsoluteFill>
  );
};
