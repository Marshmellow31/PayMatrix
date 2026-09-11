import React from 'react';
import { Img, staticFile } from 'remotion';
import { VIDEO_THEME } from '../constants/videoTheme';

interface PhoneMockupProps {
  children?: React.ReactNode;
  width?: number;
  height?: number;
  scale?: number;
  rotateX?: number;
  rotateY?: number;
  rotateZ?: number;
  translateX?: number;
  translateY?: number;
  translateZ?: number;
  opacity?: number;
  style?: React.CSSProperties;
  showReflection?: boolean;
  use3DPlate?: boolean;
  plateSrc?: string;
}

export const PhoneMockup: React.FC<PhoneMockupProps> = ({
  children,
  width = 540,
  height = 1160,
  scale = 1,
  rotateX = 0,
  rotateY = 0,
  rotateZ = 0,
  translateX = 0,
  translateY = 0,
  translateZ = 0,
  opacity = 1,
  style = {},
  showReflection = false,
  use3DPlate = false,
  plateSrc = 'plates/scene03_phone_cropped.png',
}) => {
  if (use3DPlate) {
    return (
      <div
        style={{
          width: `${width}px`,
          position: 'relative',
          transformStyle: 'preserve-3d',
          transform: `perspective(1200px) translate3d(${translateX}px, ${translateY}px, ${translateZ}px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) rotateZ(${rotateZ}deg) scale(${scale})`,
          opacity,
          ...style,
        }}
      >
        <Img
          src={staticFile(plateSrc)}
          style={{
            width: '100%',
            height: 'auto',
            display: 'block',
            filter: 'drop-shadow(0 35px 70px rgba(0, 0, 0, 0.95)) drop-shadow(0 15px 30px rgba(0, 0, 0, 0.8))',
          }}
        />
      </div>
    );
  }

  return (
    <div
      style={{
        width: `${width}px`,
        height: `${height}px`,
        position: 'relative',
        transformStyle: 'preserve-3d',
        transform: `perspective(1200px) translate3d(${translateX}px, ${translateY}px, ${translateZ}px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) rotateZ(${rotateZ}deg) scale(${scale})`,
        opacity,
        ...style,
      }}
    >
      {/* 3D Contact Shadow */}
      <div
        style={{
          position: 'absolute',
          bottom: '-45px',
          left: '5%',
          width: '90%',
          height: '55px',
          borderRadius: '50%',
          background: 'radial-gradient(ellipse at center, rgba(0,0,0,0.98) 0%, rgba(0,0,0,0) 75%)',
          filter: 'blur(32px)',
          transform: 'translateZ(-50px)',
          pointerEvents: 'none',
        }}
      />

      {/* Sleek, Modern, Ultra-Thin Neutral Android Frame */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          borderRadius: '46px',
          background: '#0a0a0a',
          border: '2.5px solid rgba(255, 255, 255, 0.16)',
          boxShadow: `
            0 50px 100px -20px rgba(0, 0, 0, 0.98),
            0 25px 50px -10px rgba(0, 0, 0, 0.92),
            inset 0 0 0 1px rgba(0, 0, 0, 0.95)
          `,
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
        }}
      >
        {/* Subtle Top Ear Speaker Slit */}
        <div
          style={{
            position: 'absolute',
            top: '5px',
            left: '50%',
            transform: 'translateX(-50%)',
            width: '44px',
            height: '3px',
            borderRadius: '2px',
            backgroundColor: 'rgba(255, 255, 255, 0.15)',
            zIndex: 100,
          }}
        />

        {/* Minimal Android Camera Punch-Hole */}
        <div
          style={{
            position: 'absolute',
            top: '13px',
            left: '50%',
            transform: 'translateX(-50%)',
            width: '11px',
            height: '11px',
            borderRadius: '50%',
            backgroundColor: '#020202',
            zIndex: 100,
            boxShadow: '0 0 3px rgba(0,0,0,0.9)',
            border: '1px solid rgba(255, 255, 255, 0.1)',
          }}
        />

        {/* Screen Content Container */}
        <div
          style={{
            width: '100%',
            height: '100%',
            position: 'relative',
            backgroundColor: VIDEO_THEME.pageBg,
            overflow: 'hidden',
            fontFamily: VIDEO_THEME.fonts.body,
          }}
        >
          {children}
        </div>

        {/* Modern Android Gesture Navigation Bar */}
        <div
          style={{
            position: 'absolute',
            bottom: '10px',
            left: '50%',
            transform: 'translateX(-50%)',
            width: '130px',
            height: '4.5px',
            borderRadius: '999px',
            backgroundColor: 'rgba(255, 255, 255, 0.35)',
            zIndex: 100,
            pointerEvents: 'none',
          }}
        />

        {/* Subtle Specular Sheen */}
        {showReflection && (
          <div
            style={{
              position: 'absolute',
              inset: 0,
              background:
                'linear-gradient(135deg, rgba(255,255,255,0.05) 0%, transparent 40%)',
              pointerEvents: 'none',
              zIndex: 90,
            }}
          />
        )}
      </div>
    </div>
  );
};
