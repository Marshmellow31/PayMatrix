import React from 'react';
import { VIDEO_THEME } from '../constants/videoTheme';

interface LaserScannerProps {
  progress: number; // 0 to 1
  height?: number;
  width?: number;
}

export const LaserScanner: React.FC<LaserScannerProps> = ({
  progress,
  height = 640,
  width = 580,
}) => {
  const scanY = progress * height;
  const bracketOffset = 18;

  return (
    <div
      style={{
        position: 'absolute',
        top: `-${bracketOffset}px`,
        left: `-${bracketOffset}px`,
        width: `${width + bracketOffset * 2}px`,
        height: `${height + bracketOffset * 2}px`,
        pointerEvents: 'none',
        zIndex: 50,
      }}
    >
      {/* Viewfinder Corner 1: Top-Left */}
      <div
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: '36px',
          height: '36px',
          borderTop: '3px solid #ffffff',
          borderLeft: '3px solid #ffffff',
          borderTopLeftRadius: '10px',
          boxShadow: '0 0 12px rgba(255, 255, 255, 0.4)',
        }}
      />
      {/* Viewfinder Corner 2: Top-Right */}
      <div
        style={{
          position: 'absolute',
          top: 0,
          right: 0,
          width: '36px',
          height: '36px',
          borderTop: '3px solid #ffffff',
          borderRight: '3px solid #ffffff',
          borderTopRightRadius: '10px',
          boxShadow: '0 0 12px rgba(255, 255, 255, 0.4)',
        }}
      />
      {/* Viewfinder Corner 3: Bottom-Left */}
      <div
        style={{
          position: 'absolute',
          bottom: 0,
          left: 0,
          width: '36px',
          height: '36px',
          borderBottom: '3px solid #ffffff',
          borderLeft: '3px solid #ffffff',
          borderBottomLeftRadius: '10px',
          boxShadow: '0 0 12px rgba(255, 255, 255, 0.4)',
        }}
      />
      {/* Viewfinder Corner 4: Bottom-Right */}
      <div
        style={{
          position: 'absolute',
          bottom: 0,
          right: 0,
          width: '36px',
          height: '36px',
          borderBottom: '3px solid #ffffff',
          borderRight: '3px solid #ffffff',
          borderBottomRightRadius: '10px',
          boxShadow: '0 0 12px rgba(255, 255, 255, 0.4)',
        }}
      />

      {/* Optical Laser Scanning Line */}
      {progress > 0 && progress < 1 && (
        <div
          style={{
            position: 'absolute',
            top: `${scanY + bracketOffset}px`,
            left: 0,
            right: 0,
            height: '3.5px',
            background:
              'linear-gradient(90deg, transparent 0%, rgba(16, 185, 129, 0.85) 15%, #ffffff 50%, rgba(16, 185, 129, 0.85) 85%, transparent 100%)',
            boxShadow:
              '0 0 22px 5px rgba(16, 185, 129, 0.95), 0 0 45px 10px rgba(16, 185, 129, 0.45), 0 2px 8px rgba(0, 0, 0, 0.7)',
          }}
        >
          {/* Trailing luminous scan plane */}
          <div
            style={{
              position: 'absolute',
              bottom: '3.5px',
              left: 0,
              right: 0,
              height: '55px',
              background:
                'linear-gradient(to top, rgba(16, 185, 129, 0.28) 0%, rgba(16, 185, 129, 0.06) 55%, transparent 100%)',
              pointerEvents: 'none',
            }}
          />
        </div>
      )}


    </div>
  );
};
