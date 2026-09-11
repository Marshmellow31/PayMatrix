import React from 'react';
import { Img, staticFile } from 'remotion';
import { VIDEO_THEME } from '../constants/videoTheme';

interface ReceiptPaperProps {
  detectedItems?: boolean;
  style?: React.CSSProperties;
  use3DPlate?: boolean;
  plateSrc?: string;
  width?: number;
}

export const ReceiptPaper: React.FC<ReceiptPaperProps> = ({
  detectedItems = false,
  style = {},
  use3DPlate = false,
  plateSrc = 'plates/scene05_receipt_hero.png',
  width = 720,
}) => {
  if (use3DPlate) {
    return (
      <div
        style={{
          width: `${width}px`,
          position: 'relative',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          ...style,
        }}
      >
        <Img
          src={staticFile(plateSrc)}
          style={{
            width: '100%',
            height: 'auto',
            display: 'block',
          }}
        />
      </div>
    );
  }

  return (
    <div
      style={{
        width: `${width}px`,
        backgroundColor: '#faf8f5',
        color: '#111111',
        fontFamily: VIDEO_THEME.fonts.mono,
        padding: '48px 44px 56px 44px',
        boxShadow: '0 35px 80px rgba(0, 0, 0, 0.95), 0 15px 35px rgba(0, 0, 0, 0.7)',
        position: 'relative',
        boxSizing: 'border-box',
        border: '1px solid rgba(0, 0, 0, 0.08)',
        ...style,
      }}
    >
      {/* Header */}
      <div style={{ textAlign: 'center', borderBottom: '1.5px dashed #b0b0aa', paddingBottom: '20px', marginBottom: '20px' }}>
        <div style={{ fontSize: '28px', fontWeight: 900, fontFamily: VIDEO_THEME.fonts.heading, letterSpacing: '-0.02em', color: '#000000' }}>
          FISHERMAN'S WHARF
        </div>
        <div style={{ fontSize: '15px', color: '#444444', marginTop: '4px', fontWeight: 600 }}>
          Cavelossim Beach · Goa
        </div>
        <div style={{ fontSize: '12px', color: '#666666', marginTop: '5px' }}>
          Date: 07-SEP-2026 · Table #14 · Bill: #4892
        </div>
      </div>

      {/* Line Items Table */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', fontSize: '16px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 800, fontSize: '13px', color: '#555555', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
          <span>ITEM</span>
          <span>AMOUNT</span>
        </div>

        {/* Item 1 */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            padding: '7px 10px',
            borderRadius: '8px',
            backgroundColor: detectedItems ? 'rgba(0, 0, 0, 0.08)' : 'transparent',
            border: detectedItems ? '1px solid rgba(0, 0, 0, 0.25)' : '1px solid transparent',
            transition: 'all 0.3s ease',
          }}
        >
          <span style={{ fontSize: '17px' }}>1x Tandoori Kingfish</span>
          <span style={{ fontSize: '18px', fontWeight: 800 }}>₹1,850.00</span>
        </div>

        {/* Item 2 */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            padding: '7px 10px',
            borderRadius: '8px',
            backgroundColor: detectedItems ? 'rgba(0, 0, 0, 0.08)' : 'transparent',
            border: detectedItems ? '1px solid rgba(0, 0, 0, 0.25)' : '1px solid transparent',
            transition: 'all 0.3s ease',
          }}
        >
          <span style={{ fontSize: '17px' }}>2x Butter Garlic Naan</span>
          <span style={{ fontSize: '18px', fontWeight: 800 }}>₹280.00</span>
        </div>

        {/* Item 3 */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            padding: '7px 10px',
            borderRadius: '8px',
            backgroundColor: detectedItems ? 'rgba(0, 0, 0, 0.08)' : 'transparent',
            border: detectedItems ? '1px solid rgba(0, 0, 0, 0.25)' : '1px solid transparent',
            transition: 'all 0.3s ease',
          }}
        >
          <span style={{ fontSize: '17px' }}>4x Fresh Virgin Mojito</span>
          <span style={{ fontSize: '18px', fontWeight: 800 }}>₹1,400.00</span>
        </div>

        {/* Item 4 */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            padding: '7px 10px',
            borderRadius: '8px',
            backgroundColor: detectedItems ? 'rgba(0, 0, 0, 0.08)' : 'transparent',
            border: detectedItems ? '1px solid rgba(0, 0, 0, 0.25)' : '1px solid transparent',
            transition: 'all 0.3s ease',
          }}
        >
          <span style={{ fontSize: '17px' }}>CGST (2.5%) + SGST (2.5%)</span>
          <span style={{ fontSize: '18px', fontWeight: 800 }}>₹180.00</span>
        </div>

        {/* Item 5 */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            padding: '7px 10px',
            borderRadius: '8px',
            backgroundColor: detectedItems ? 'rgba(0, 0, 0, 0.08)' : 'transparent',
            border: detectedItems ? '1px solid rgba(0, 0, 0, 0.25)' : '1px solid transparent',
            transition: 'all 0.3s ease',
          }}
        >
          <span style={{ fontSize: '17px' }}>Service Charge (10%)</span>
          <span style={{ fontSize: '18px', fontWeight: 800 }}>₹570.00</span>
        </div>
      </div>

      {/* Divider */}
      <div style={{ borderTop: '2.5px solid #000000', marginTop: '20px', paddingTop: '16px' }}>
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'baseline',
            padding: '8px 12px',
            borderRadius: '8px',
            backgroundColor: detectedItems ? 'rgba(0, 0, 0, 0.1)' : 'transparent',
            border: detectedItems ? '1.5px solid #000000' : 'none',
          }}
        >
          <span style={{ fontSize: '17px', fontWeight: 900, fontFamily: VIDEO_THEME.fonts.heading, letterSpacing: '0.05em' }}>
            TOTAL DUE
          </span>
          <span style={{ fontSize: '32px', fontWeight: 900, fontFamily: VIDEO_THEME.fonts.heading, color: '#000000' }}>
            ₹4,280.00
          </span>
        </div>
      </div>

      {/* Barcode graphic */}
      <div style={{ marginTop: '26px', display: 'flex', flexDirection: 'column', alignItems: 'center', opacity: 0.75 }}>
        <div style={{ height: '44px', width: '88%', background: 'repeating-linear-gradient(90deg, #000, #000 2.5px, transparent 2.5px, transparent 6px, #000 6px, #000 10px, transparent 10px, transparent 11px)' }} />
        <div style={{ fontSize: '11px', letterSpacing: '4px', marginTop: '6px' }}>*4892-090726-PM*</div>
      </div>

      {/* Serrated Zigzag Receipt Bottom Edge */}
      <div
        style={{
          position: 'absolute',
          bottom: '-14px',
          left: 0,
          right: 0,
          height: '14px',
          background: 'radial-gradient(circle, transparent, transparent 50%, #f5f5f3 50%, #f5f5f3 100%)',
          backgroundSize: '20px 20px',
        }}
      />
    </div>
  );
};
