import React from 'react';
import { AbsoluteFill, interpolate, spring, staticFile, useCurrentFrame, useVideoConfig } from 'remotion';
import { Background } from '../components/Background';
import { VIDEO_THEME } from '../constants/videoTheme';

export const LaunchPayoffScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Headline Entrance ("TRY TODAY!")
  const headSpring = spring({
    frame: frame - 4,
    fps,
    config: { damping: 16, stiffness: 130, mass: 0.9 },
  });
  const headScale = interpolate(headSpring, [0, 1], [0.85, 1]);
  const headY = interpolate(headSpring, [0, 1], [40, 0]);
  const headOpacity = interpolate(headSpring, [0, 1], [0, 1]);

  // Sub-headline Entrance ("SPLIT BILLS IN SECONDS! ZERO MATH. ZERO DRAMA!")
  const subSpring = spring({
    frame: frame - 16,
    fps,
    config: { damping: 16, stiffness: 120 },
  });
  const subY = interpolate(subSpring, [0, 1], [30, 0]);
  const subOpacity = interpolate(subSpring, [0, 1], [0, 1]);

  // Side-by-Side Lockup Entrance (PayMatrix brand + Google Play badge)
  const rowSpring = spring({
    frame: frame - 28,
    fps,
    config: { damping: 16, stiffness: 120, mass: 0.9 },
  });
  const rowY = interpolate(rowSpring, [0, 1], [40, 0]);
  const rowScale = interpolate(rowSpring, [0, 1], [0.9, 1]);
  const rowOpacity = interpolate(rowSpring, [0, 1], [0, 1]);

  // Feature Highlights Entrance
  const chipsSpring = spring({
    frame: frame - 42,
    fps,
    config: { damping: 16, stiffness: 120 },
  });
  const chipsY = interpolate(chipsSpring, [0, 1], [30, 0]);
  const chipsOpacity = interpolate(chipsSpring, [0, 1], [0, 1]);

  // Footer / Package ID
  const footSpring = spring({
    frame: frame - 54,
    fps,
    config: { damping: 18, stiffness: 110 },
  });
  const footOpacity = interpolate(footSpring, [0, 1], [0, 1]);

  // Subtle energetic pulse on the primary CTA glow
  const pulse = Math.sin(frame * 0.12) * 0.04 + 1;

  return (
    <AbsoluteFill style={{ backgroundColor: VIDEO_THEME.canvas }}>
      <Background glowColor="rgba(255, 255, 255, 0.04)" glowIntensity={1.2} />

      <AbsoluteFill
        style={{
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          alignItems: 'center',
          textAlign: 'center',
          padding: '0 50px',
          boxSizing: 'border-box',
        }}
      >
        {/* Commanding Announcement Headline */}
        <div
          style={{
            transform: `translateY(${headY}px) scale(${headScale})`,
            opacity: headOpacity,
            marginBottom: '20px',
          }}
        >
          <h1
            style={{
              fontFamily: VIDEO_THEME.fonts.heading,
              fontSize: '144px',
              fontWeight: 900,
              letterSpacing: '-0.05em',
              lineHeight: 1.0,
              margin: 0,
              textTransform: 'uppercase',
              color: '#ffffff',
              textShadow: '0 12px 50px rgba(255, 255, 255, 0.2)',
            }}
          >
            TRY TODAY!
          </h1>
        </div>

        {/* Exciting Sub-headline with exclamation marks */}
        <div
          style={{
            transform: `translateY(${subY}px)`,
            opacity: subOpacity,
            marginBottom: '72px',
          }}
        >
          <p
            style={{
              fontFamily: VIDEO_THEME.fonts.heading,
              fontSize: '40px',
              fontWeight: 800,
              letterSpacing: '0.01em',
              color: '#f4f4f5',
              margin: 0,
              textTransform: 'uppercase',
              lineHeight: 1.2,
            }}
          >
            Split Bills in Seconds! Zero Math. Zero Drama!
          </p>
        </div>

        {/* Side-by-Side: PayMatrix Lockup on the side of Google Play Badge */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '28px',
            transform: `translateY(${rowY}px) scale(${rowScale * pulse})`,
            opacity: rowOpacity,
            marginBottom: '72px',
            width: '100%',
          }}
        >
          {/* Side A: PayMatrix Brand Pill */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '20px',
              padding: '16px 36px 16px 24px',
              borderRadius: '28px',
              backgroundColor: '#111111',
              border: `1.5px solid ${VIDEO_THEME.borderHigh}`,
              boxShadow: '0 24px 60px rgba(0, 0, 0, 0.95)',
              height: '118px',
              boxSizing: 'border-box',
            }}
          >
            <div
              style={{
                width: '80px',
                height: '80px',
                borderRadius: '22px',
                border: `1px solid ${VIDEO_THEME.borderDefault}`,
                overflow: 'hidden',
                backgroundColor: '#000000',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
              }}
            >
              <img
                src={staticFile('logo.png')}
                alt="PayMatrix"
                style={{
                  width: '100%',
                  height: '100%',
                  objectFit: 'cover',
                  transform: 'scale(1.32)',
                }}
              />
            </div>
            <div style={{ textAlign: 'left' }}>
              <div
                style={{
                  fontFamily: VIDEO_THEME.fonts.heading,
                  fontSize: '54px',
                  fontWeight: 900,
                  letterSpacing: '-0.04em',
                  color: '#ffffff',
                  lineHeight: 1,
                }}
              >
                paymatrix
              </div>
              <div
                style={{
                  fontSize: '15px',
                  color: VIDEO_THEME.textDim,
                  fontWeight: 700,
                  letterSpacing: '0.06em',
                  textTransform: 'uppercase',
                  marginTop: '6px',
                  fontFamily: VIDEO_THEME.fonts.mono,
                }}
              >
                Shared Expenses
              </div>
            </div>
          </div>

          {/* Side B: Google Play Store Badge */}
          <div
            style={{
              height: '118px',
              borderRadius: '28px',
              backgroundColor: '#000000',
              border: `1.5px solid ${VIDEO_THEME.borderHigh}`,
              boxShadow: '0 24px 60px rgba(0, 0, 0, 0.95)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '0 22px',
              boxSizing: 'border-box',
              overflow: 'hidden',
            }}
          >
            <img
              src={staticFile('google-play-badge.svg')}
              alt="Get it on Google Play"
              style={{ height: '96px', display: 'block' }}
            />
          </div>
        </div>

        {/* High-Energy Feature Highlights Chips */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'row',
            justifyContent: 'center',
            alignItems: 'center',
            gap: '16px',
            transform: `translateY(${chipsY}px)`,
            opacity: chipsOpacity,
            marginBottom: '56px',
            flexWrap: 'wrap',
          }}
        >
          <div
            style={{
              padding: '16px 32px',
              borderRadius: '999px',
              backgroundColor: 'rgba(255, 255, 255, 0.08)',
              border: `1px solid ${VIDEO_THEME.borderDefault}`,
              fontSize: '24px',
              fontWeight: 800,
              letterSpacing: '0.04em',
              color: '#ffffff',
              textTransform: 'uppercase',
              fontFamily: VIDEO_THEME.fonts.heading,
              boxShadow: '0 8px 28px rgba(0,0,0,0.5)',
            }}
          >
            ⚡ INSTANT SPLITS!
          </div>

          <div
            style={{
              padding: '16px 32px',
              borderRadius: '999px',
              backgroundColor: 'rgba(255, 255, 255, 0.08)',
              border: `1px solid ${VIDEO_THEME.borderDefault}`,
              fontSize: '24px',
              fontWeight: 800,
              letterSpacing: '0.04em',
              color: '#ffffff',
              textTransform: 'uppercase',
              fontFamily: VIDEO_THEME.fonts.heading,
              boxShadow: '0 8px 28px rgba(0,0,0,0.5)',
            }}
          >
            💸 1-TAP UPI!
          </div>
        </div>

        {/* Global Package ID */}
        <div
          style={{
            opacity: footOpacity,
            fontSize: '22px',
            color: VIDEO_THEME.textDim,
            fontFamily: VIDEO_THEME.fonts.mono,
            letterSpacing: '0.08em',
          }}
        >
          com.paymatrix.app
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
