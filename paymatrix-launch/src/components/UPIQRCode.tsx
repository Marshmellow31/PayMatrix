import React from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { Copy, ShieldCheck } from 'lucide-react';
import { VIDEO_THEME } from '../constants/videoTheme';

interface UPIQRCodeProps {
  amount: number;
  receiverName?: string;
  upiId?: string;
  scale?: number;
  style?: React.CSSProperties;
}

export const UPIQRCode: React.FC<UPIQRCodeProps> = ({
  amount = 1070,
  receiverName = 'Harshil Patel',
  upiId = 'harshil@upi',
  scale = 1,
  style = {},
}) => {
  const upiUrl = `upi://pay?pa=${encodeURIComponent(upiId)}&pn=${encodeURIComponent(receiverName)}&am=${amount.toFixed(2)}&cu=INR`;

  return (
    <div
      style={{
        width: '480px',
        backgroundColor: VIDEO_THEME.surfaceHigh,
        borderRadius: '32px',
        border: `1.5px solid ${VIDEO_THEME.borderHigh}`,
        padding: '28px 26px',
        boxShadow: '0 30px 90px rgba(0,0,0,0.95), 0 10px 30px rgba(0,0,0,0.7)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        transform: `scale(${scale})`,
        transformOrigin: 'center center',
        ...style,
      }}
    >
      {/* Top Card Titanium Pill Indicator */}
      <div
        style={{
          width: '44px',
          height: '4.5px',
          borderRadius: '999px',
          backgroundColor: 'rgba(255, 255, 255, 0.3)',
          marginBottom: '18px',
        }}
      />

      <div style={{ textAlign: 'center', marginBottom: '18px' }}>
        <div
          style={{
            fontFamily: VIDEO_THEME.fonts.heading,
            fontSize: '24px',
            fontWeight: 900,
            color: VIDEO_THEME.textPrimary,
            letterSpacing: '-0.02em',
          }}
        >
          Scan to Settle
        </div>
        <div style={{ fontSize: '14px', color: VIDEO_THEME.textDim, marginTop: '3px' }}>
          Pay <span style={{ color: VIDEO_THEME.textPrimary, fontWeight: 700 }}>{receiverName}</span> exact share
        </div>
        <div
          style={{
            fontFamily: VIDEO_THEME.fonts.heading,
            fontSize: '44px',
            fontWeight: 900,
            color: VIDEO_THEME.textPrimary,
            marginTop: '6px',
            letterSpacing: '-0.03em',
          }}
        >
          ₹{amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
        </div>
      </div>

      {/* QR Code Container with High-Contrast White Tile */}
      <div
        style={{
          backgroundColor: '#ffffff',
          borderRadius: '24px',
          padding: '20px',
          boxShadow: '0 16px 40px rgba(0,0,0,0.6)',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          marginBottom: '20px',
        }}
      >
        <QRCodeSVG
          value={upiUrl}
          size={260}
          level="H"
          bgColor="#ffffff"
          fgColor="#000000"
          includeMargin={false}
        />
      </div>

      {/* Verified UPI VPA Bar */}
      <div
        style={{
          width: '100%',
          backgroundColor: 'rgba(255,255,255,0.05)',
          border: `1px solid ${VIDEO_THEME.borderDefault}`,
          borderRadius: '14px',
          padding: '10px 16px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '16px',
          boxSizing: 'border-box',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <ShieldCheck size={18} color="#ffffff" />
          <span
            style={{
              fontFamily: VIDEO_THEME.fonts.mono,
              fontSize: '14px',
              fontWeight: 600,
              color: VIDEO_THEME.textSecondary,
            }}
          >
            {upiId}
          </span>
        </div>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '5px',
            fontSize: '11px',
            fontWeight: 700,
            color: VIDEO_THEME.textMuted,
            textTransform: 'uppercase',
            backgroundColor: 'rgba(255,255,255,0.08)',
            padding: '4px 10px',
            borderRadius: '8px',
          }}
        >
          <Copy size={12} /> Copy
        </div>
      </div>

      {/* UPI Apps Supported Badge */}
      <div
        style={{
          fontSize: '12px',
          color: VIDEO_THEME.textDim,
          fontWeight: 600,
          textAlign: 'center',
          letterSpacing: '0.04em',
        }}
      >
        GPay · PhonePe · Paytm · BHIM · Any UPI App
      </div>
    </div>
  );
};
