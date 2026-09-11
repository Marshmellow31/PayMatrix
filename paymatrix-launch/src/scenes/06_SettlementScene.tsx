import React from 'react';
import { AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig } from 'remotion';
import { Background } from '../components/Background';
import { PhoneMockup } from '../components/PhoneMockup';
import { SettlementScreen } from '../components/screens/SettlementScreen';
import { UPIQRCode } from '../components/UPIQRCode';
import { VIDEO_THEME } from '../constants/videoTheme';

export const SettlementScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Top typography switch: "KNOW WHO OWES WHAT." -> "SETTLE INSTANTLY!"
  const isSettlePhase = frame > 55;

  const title1Spring = spring({
    frame,
    fps,
    config: { damping: 16, stiffness: 150 },
  });
  const title1Y = interpolate(title1Spring, [0, 1], [30, 0]);
  const title1Opacity = interpolate(frame, [0, 12, 45, 55], [0, 1, 1, 0], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const title2Spring = spring({
    frame: frame - 55,
    fps,
    config: { damping: 16, stiffness: 150 },
  });
  const title2Y = interpolate(title2Spring, [0, 1], [30, 0]);
  const title2Opacity = interpolate(title2Spring, [0, 1], [0, 1]);

  // UPI QR emerges from interface at frame 60
  const qrSpring = spring({
    frame: frame - 60,
    fps,
    config: { damping: 16, stiffness: 140, mass: 0.8 },
  });
  const qrTranslateY = interpolate(qrSpring, [0, 1], [100, 0]);
  const qrScale = interpolate(qrSpring, [0, 1], [0.8, 1.2]);
  const qrOpacity = interpolate(qrSpring, [0, 0.2, 1], [0, 1, 1]);

  const cameraScale = interpolate(frame, [0, 150], [1, 1.04]);

  // Scene exit transition
  const exitOpacity = interpolate(frame, [135, 150], [1, 0], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  return (
    <AbsoluteFill style={{ opacity: exitOpacity, backgroundColor: VIDEO_THEME.canvas }}>
      <Background glowColor="rgba(255, 255, 255, 0.02)" glowIntensity={0.8} />

      {/* Top Headline: 2-Line Bold Statements */}
      <div
        style={{
          position: 'absolute',
          top: '120px',
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
        {!isSettlePhase ? (
          <div style={{ transform: `translateY(${title1Y}px)`, opacity: title1Opacity }}>
            <h1
              style={{
                fontFamily: VIDEO_THEME.fonts.heading,
                fontSize: '88px',
                fontWeight: 900,
                letterSpacing: '-0.05em',
                lineHeight: 1.0,
                color: '#ffffff',
                margin: 0,
                textTransform: 'uppercase',
              }}
            >
              Know who
              <br />
              owes what.
            </h1>
          </div>
        ) : (
          <div style={{ transform: `translateY(${title2Y}px)`, opacity: title2Opacity }}>
            <h1
              style={{
                fontFamily: VIDEO_THEME.fonts.heading,
                fontSize: '88px',
                fontWeight: 900,
                letterSpacing: '-0.05em',
                lineHeight: 1.0,
                color: '#ffffff',
                margin: 0,
                textTransform: 'uppercase',
                background: 'linear-gradient(180deg, #ffffff 40%, rgba(255, 255, 255, 0.6) 100%)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
              }}
            >
              Settle.
              <br />
              Instantly!
            </h1>
          </div>
        )}
      </div>

      {/* Centered Large Smartphone Mockup & Elevated UPI QR — Identical Placeholder to Scene 3 */}
      <div
        style={{
          position: 'absolute',
          left: '50%',
          top: '440px',
          transform: 'translateX(-50%)',
          zIndex: 40,
        }}
      >
        <div style={{ transform: `scale(${cameraScale})`, transformOrigin: 'top center' }}>
          <PhoneMockup
            width={840}
            rotateX={0}
            rotateY={0}
            rotateZ={0}
            use3DPlate={true}
            plateSrc="plates/scene06_phone_cropped.png"
          />

          {/* Elevated 3D Vector UPI QR Code Card */}
          {frame > 60 && (
            <div
              style={{
                position: 'absolute',
                top: '44%',
                left: '50%',
                transform: `translate(-50%, -50%) translateY(${qrTranslateY}px) scale(${qrScale})`,
                opacity: qrOpacity,
                zIndex: 80,
              }}
            >
              <UPIQRCode scale={1.25} amount={1070} receiverName="Harshil Patel" upiId="harshil@upi" />
            </div>
          )}
        </div>
      </div>
    </AbsoluteFill>
  );
};
