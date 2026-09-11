import React from 'react';
import { AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig } from 'remotion';
import { Background } from '../components/Background';
import { PhoneMockup } from '../components/PhoneMockup';
import { GroupScreen } from '../components/screens/GroupScreen';
import { VIDEO_THEME } from '../constants/videoTheme';

export const HeroGroupScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Kinetic Headline: Line 1 "EVERYONE." (frame 0) -> Line 2 "ONE PLACE." (frame 18)
  const line1Spring = spring({
    frame: frame - 6,
    fps,
    config: { damping: 16, stiffness: 140 },
  });
  const line1Y = interpolate(line1Spring, [0, 1], [30, 0]);
  const line1Opacity = interpolate(line1Spring, [0, 1], [0, 1]);

  const line2Spring = spring({
    frame: frame - 22,
    fps,
    config: { damping: 16, stiffness: 140 },
  });
  const line2Y = interpolate(line2Spring, [0, 1], [30, 0]);
  const line2Opacity = interpolate(line2Spring, [0, 1], [0, 1]);

  // Grand Smartphone Debut: Smooth continuous glide from bottom into hero position
  const phoneEntrance = spring({
    frame: frame - 4,
    fps,
    config: { damping: 18, stiffness: 90, mass: 0.9 },
  });
  const phoneTranslateY = interpolate(phoneEntrance, [0, 1], [880, 0]);
  const phoneOpacity = interpolate(phoneEntrance, [0, 0.2, 1], [0, 1, 1]);

  // Continuous subtle cinematic camera push into the UI
  const cameraScale = interpolate(frame, [0, 150], [1, 1.04]);

  // Exit transition matching 150 frame duration
  const exitOpacity = interpolate(frame, [135, 150], [1, 0], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  return (
    <AbsoluteFill style={{ opacity: exitOpacity, backgroundColor: VIDEO_THEME.canvas }}>
      <Background glowColor="rgba(255, 255, 255, 0.02)" glowIntensity={0.8} />

      {/* Commanding 2-Line Headline: EVERYONE. / ONE PLACE. */}
      <div
        style={{
          position: 'absolute',
          top: '140px',
          left: '0px',
          right: '0px',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          textAlign: 'center',
          padding: '0 50px',
          zIndex: 30,
        }}
      >
        <div
          style={{
            transform: `translateY(${line1Y}px)`,
            opacity: line1Opacity,
          }}
        >
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
            Everyone.
          </h1>
        </div>

        <div
          style={{
            transform: `translateY(${line2Y}px)`,
            opacity: line2Opacity,
            marginTop: '10px',
          }}
        >
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
            One place.
          </h1>
        </div>
      </div>

      {/* Modern Android Flagship Smartphone */}
      <div
        style={{
          position: 'absolute',
          left: '50%',
          top: '440px',
          transform: 'translateX(-50%)',
          opacity: phoneOpacity,
          zIndex: 40,
        }}
      >
        <div
          style={{
            transform: `translateY(${phoneTranslateY}px) scale(${cameraScale})`,
            transformOrigin: 'top center',
          }}
        >
          <PhoneMockup
            width={840}
            rotateX={0}
            rotateY={0}
            rotateZ={0}
            use3DPlate={true}
          />
        </div>
      </div>
    </AbsoluteFill>
  );
};
