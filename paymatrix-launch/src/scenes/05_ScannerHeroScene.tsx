import React from 'react';
import { AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig } from 'remotion';
import { Background } from '../components/Background';
import { ReceiptPaper } from '../components/ReceiptPaper';
import { LaserScanner } from '../components/LaserScanner';
import { VIDEO_THEME } from '../constants/videoTheme';
import { Check } from 'lucide-react';

export const ScannerHeroScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Receipt entrance
  const receiptEntrance = spring({
    frame,
    fps,
    config: { damping: 16, stiffness: 140, mass: 0.9 },
  });
  const receiptY = interpolate(receiptEntrance, [0, 1], [250, 0]);
  const receiptScale = interpolate(receiptEntrance, [0, 1], [0.95, 1.0]);
  const receiptOpacity = interpolate(receiptEntrance, [0, 0.2, 1], [0, 1, 1]);

  // Laser scan progress (frame 15 to 70)
  const scanProgress = interpolate(frame, [15, 70], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
  const itemsDetected = frame > 45;

  // Kinetic Words: "SCAN." -> "SPLIT." -> "DONE!"
  const scanWordSpring = spring({
    frame: frame - 10,
    fps,
    config: { damping: 14, stiffness: 180 },
  });
  const scanWordScale = interpolate(scanWordSpring, [0, 1], [0.75, 1]);
  const scanWordOpacity = interpolate(scanWordSpring, [0, 1], [0, 1]);

  const splitWordSpring = spring({
    frame: frame - 38,
    fps,
    config: { damping: 14, stiffness: 180 },
  });
  const splitWordScale = interpolate(splitWordSpring, [0, 1], [0.75, 1]);
  const splitWordOpacity = interpolate(splitWordSpring, [0, 1], [0, 1]);

  const doneWordSpring = spring({
    frame: frame - 68,
    fps,
    config: { damping: 14, stiffness: 180 },
  });
  const doneWordScale = interpolate(doneWordSpring, [0, 1], [0.75, 1]);
  const doneWordOpacity = interpolate(doneWordSpring, [0, 1], [0, 1]);

  // Digital card transformation / overlay at frame 78+
  const cardTransformSpring = spring({
    frame: frame - 78,
    fps,
    config: { damping: 16, stiffness: 140 },
  });
  const cardScale = interpolate(cardTransformSpring, [0, 1], [0.9, 1]);
  const cardOpacity = interpolate(cardTransformSpring, [0, 1], [0, 1]);

  // Scene exit transition
  const exitOpacity = interpolate(frame, [122, 135], [1, 0], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  return (
    <AbsoluteFill style={{ opacity: exitOpacity, backgroundColor: VIDEO_THEME.canvas }}>
      <Background glowColor="rgba(255, 255, 255, 0.02)" glowIntensity={0.8} />

      {/* Top Headline: SCAN. SPLIT. DONE. (Zero Decorative Pills) */}
      <div
        style={{
          position: 'absolute',
          top: '160px',
          left: '0px',
          right: '0px',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          gap: '32px',
          zIndex: 30,
        }}
      >
        <div
          style={{
            fontFamily: VIDEO_THEME.fonts.heading,
            fontSize: '80px',
            fontWeight: 900,
            letterSpacing: '-0.05em',
            color: '#ffffff',
            transform: `scale(${scanWordScale})`,
            opacity: scanWordOpacity,
          }}
        >
          SCAN.
        </div>
        <div
          style={{
            fontFamily: VIDEO_THEME.fonts.heading,
            fontSize: '80px',
            fontWeight: 900,
            letterSpacing: '-0.05em',
            color: '#ffffff',
            transform: `scale(${splitWordScale})`,
            opacity: splitWordOpacity,
          }}
        >
          SPLIT.
        </div>
        <div
          style={{
            fontFamily: VIDEO_THEME.fonts.heading,
            fontSize: '80px',
            fontWeight: 900,
            letterSpacing: '-0.05em',
            color: '#ffffff',
            transform: `scale(${doneWordScale})`,
            opacity: doneWordOpacity,
            display: 'flex',
            alignItems: 'center',
            gap: '14px',
          }}
        >
          DONE.
          <div
            style={{
              width: '48px',
              height: '48px',
              borderRadius: '50%',
              backgroundColor: '#ffffff',
              color: '#000000',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 0 24px rgba(255, 255, 255, 0.4)',
            }}
          >
            <Check size={30} strokeWidth={3.5} />
          </div>
        </div>
      </div>

      {/* Centered Large Receipt and Optical Laser Overlay */}
      <div
        style={{
          position: 'absolute',
          left: '50%',
          top: '50%',
          transform: 'translate(-50%, -46%)',
          zIndex: 40,
        }}
      >
        <div
          style={{
            transform: `translateY(${receiptY}px) scale(${receiptScale})`,
            opacity: receiptOpacity,
            position: 'relative',
          }}
        >
          {/* Physical Flat Receipt (No Blender perspective tilt) */}
          <ReceiptPaper width={720} detectedItems={itemsDetected} />

          {/* Optical Silver Laser Scanner */}
          <LaserScanner progress={scanProgress} height={820} width={720} />

          {/* Result Digital Card Overlay (Reveals after scan) */}
          {frame > 78 && (
            <div
              style={{
                position: 'absolute',
                inset: 0,
                backgroundColor: '#111111',
                borderRadius: '24px',
                border: `1.5px solid ${VIDEO_THEME.borderHigh}`,
                padding: '40px 36px',
                boxShadow: '0 30px 80px rgba(0,0,0,0.95)',
                transform: `scale(${cardScale})`,
                opacity: cardOpacity,
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                zIndex: 60,
              }}
            >
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '22px' }}>
                  <div
                    style={{
                      backgroundColor: 'rgba(255, 255, 255, 0.08)',
                      border: `1px solid ${VIDEO_THEME.borderDefault}`,
                      color: VIDEO_THEME.textPrimary,
                      fontSize: '13px',
                      fontWeight: 700,
                      padding: '7px 16px',
                      borderRadius: '999px',
                      textTransform: 'uppercase',
                      fontFamily: VIDEO_THEME.fonts.mono,
                    }}
                  >
                    AI Verified · 5 Items
                  </div>
                  <div style={{ fontSize: '14px', color: VIDEO_THEME.textDim }}>Table #14</div>
                </div>

                <div style={{ fontFamily: VIDEO_THEME.fonts.heading, fontSize: '32px', fontWeight: 900, color: VIDEO_THEME.textPrimary }}>
                  Fisherman's Wharf
                </div>
                <div style={{ fontSize: '16px', color: VIDEO_THEME.textDim, marginTop: '6px' }}>
                  Dinner · Food & Drinks
                </div>

                <div
                  style={{
                    margin: '32px 0',
                    padding: '26px',
                    borderRadius: '22px',
                    backgroundColor: '#0a0a0a',
                    border: `1px solid ${VIDEO_THEME.borderDefault}`,
                  }}
                >
                  <div style={{ fontSize: '13px', color: VIDEO_THEME.textDim, textTransform: 'uppercase', fontWeight: 700, fontFamily: VIDEO_THEME.fonts.mono }}>
                    Extracted Total
                  </div>
                  <div
                    style={{
                      fontFamily: VIDEO_THEME.fonts.heading,
                      fontSize: '52px',
                      fontWeight: 900,
                      color: VIDEO_THEME.textPrimary,
                      marginTop: '6px',
                      letterSpacing: '-0.04em',
                    }}
                  >
                    ₹4,280.00
                  </div>
                </div>
              </div>

              <div
                style={{
                  height: '62px',
                  borderRadius: '999px',
                  background: VIDEO_THEME.ctaPrimary,
                  color: VIDEO_THEME.textDark,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontFamily: VIDEO_THEME.fonts.heading,
                  fontSize: '17px',
                  fontWeight: 800,
                  boxShadow: '0 8px 28px rgba(255, 255, 255, 0.2)',
                }}
              >
                Ready to Split with Group
              </div>
            </div>
          )}
        </div>
      </div>
    </AbsoluteFill>
  );
};
