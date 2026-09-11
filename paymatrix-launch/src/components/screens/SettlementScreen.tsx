import React from 'react';
import { ArrowLeft, Wifi, BatteryMedium, AlertCircle, Smartphone, SlidersHorizontal, CheckCircle2 } from 'lucide-react';
import { VIDEO_THEME } from '../../constants/videoTheme';

interface SettlementScreenProps {
  showUPIPressed?: boolean;
}

export const SettlementScreen: React.FC<SettlementScreenProps> = ({
  showUPIPressed = false,
}) => {
  return (
    <div
      style={{
        width: '1080px',
        height: '2400px',
        backgroundColor: '#1a1a1a',
        color: '#ffffff',
        display: 'flex',
        flexDirection: 'column',
        boxSizing: 'border-box',
        fontFamily: VIDEO_THEME.fonts.body,
        position: 'relative',
        overflow: 'hidden',
        padding: '0 48px',
      }}
    >
      {/* ─── Android Status Bar (Native API 36) ─── */}
      <div
        style={{
          height: '110px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          paddingTop: '16px',
          boxSizing: 'border-box',
          fontSize: '32px',
          fontWeight: 600,
          color: '#ffffff',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <span>4:20</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
          <Wifi size={34} strokeWidth={2.4} />
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span style={{ fontSize: '28px' }}>92%</span>
            <BatteryMedium size={36} strokeWidth={2.2} />
          </div>
        </div>
      </div>

      {/* ─── App Bar: Back Button + Settle Up Title ─── */}
      <div
        style={{
          height: '120px',
          display: 'flex',
          alignItems: 'center',
          gap: '24px',
          marginBottom: '28px',
        }}
      >
        <div
          style={{
            width: '68px',
            height: '68px',
            borderRadius: '20px',
            backgroundColor: 'rgba(255, 255, 255, 0.05)',
            border: '1.5px solid rgba(255, 255, 255, 0.08)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#ffffff',
          }}
        >
          <ArrowLeft size={36} strokeWidth={2.2} />
        </div>
        <div>
          <div
            style={{
              fontSize: '44px',
              fontWeight: 800,
              color: '#ffffff',
              lineHeight: 1.1,
              fontFamily: VIDEO_THEME.fonts.heading,
            }}
          >
            Settle Up
          </div>
          <div
            style={{
              fontSize: '22px',
              fontWeight: 700,
              color: '#34d399',
              letterSpacing: '0.08em',
              textTransform: 'uppercase',
              marginTop: '4px',
            }}
          >
            Goa Weekend Trip · Min-Flow Active
          </div>
        </div>
      </div>

      {/* ─── Total Owe Banner Card ─── */}
      <div
        style={{
          borderRadius: '36px',
          backgroundColor: 'rgba(52, 211, 153, 0.08)',
          border: '1.5px solid rgba(52, 211, 153, 0.25)',
          padding: '36px 40px',
          marginBottom: '28px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          boxShadow: '0 16px 40px rgba(0, 0, 0, 0.6)',
        }}
      >
        <div>
          <div
            style={{
              fontSize: '22px',
              color: '#34d399',
              fontWeight: 800,
              letterSpacing: '0.14em',
              textTransform: 'uppercase',
            }}
          >
            TOTAL YOU OWE
          </div>
          <div
            style={{
              fontFamily: VIDEO_THEME.fonts.heading,
              fontSize: '64px',
              fontWeight: 900,
              color: '#ffffff',
              marginTop: '4px',
              letterSpacing: '-0.03em',
            }}
          >
            ₹1,600.00
          </div>
        </div>

        <div
          style={{
            height: '76px',
            padding: '0 32px',
            borderRadius: '999px',
            backgroundColor: '#ffffff',
            color: '#000000',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '24px',
            fontWeight: 800,
            letterSpacing: '0.04em',
            boxShadow: '0 8px 24px rgba(255, 255, 255, 0.2)',
          }}
        >
          Settle All
        </div>
      </div>

      {/* ─── Informational Ledger Notice Box ─── */}
      <div
        style={{
          borderRadius: '24px',
          backgroundColor: 'rgba(255, 255, 255, 0.03)',
          border: '1.5px solid rgba(255, 255, 255, 0.06)',
          padding: '24px 30px',
          display: 'flex',
          alignItems: 'flex-start',
          gap: '18px',
          marginBottom: '36px',
        }}
      >
        <AlertCircle size={32} color="#34d399" style={{ flexShrink: 0, marginTop: '2px' }} />
        <div style={{ fontSize: '22px', color: '#a1a1aa', lineHeight: 1.4 }}>
          PayMatrix is an informational calculation ledger. Confirm only after executing payment via your UPI app or bank.
        </div>
      </div>

      {/* ─── Recommended Payments Section ─── */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '20px',
        }}
      >
        <span
          style={{
            fontSize: '24px',
            color: '#71717a',
            fontWeight: 800,
            letterSpacing: '0.12em',
            textTransform: 'uppercase',
          }}
        >
          RECOMMENDED PAYMENTS (MIN-FLOW)
        </span>
      </div>

      {/* ─── Debt Settlement Card 1: Meet Patel ─── */}
      <div
        style={{
          borderRadius: '32px',
          backgroundColor: '#16161a',
          border: '1.5px solid rgba(255, 255, 255, 0.08)',
          padding: '32px 36px',
          marginBottom: '24px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '22px' }}>
            <div
              style={{
                width: '72px',
                height: '72px',
                borderRadius: '24px',
                backgroundColor: '#10b981',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '32px',
                fontWeight: 800,
                color: '#ffffff',
              }}
            >
              M
            </div>
            <div>
              <div
                style={{
                  fontFamily: VIDEO_THEME.fonts.heading,
                  fontSize: '36px',
                  fontWeight: 800,
                  color: '#ffffff',
                }}
              >
                Meet Patel
              </div>
              <div style={{ fontSize: '24px', color: '#71717a', marginTop: '4px' }}>
                meet@paymatrix.app
              </div>
            </div>
          </div>

          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '8px 18px',
              borderRadius: '12px',
              backgroundColor: 'rgba(52, 211, 153, 0.12)',
              border: '1px solid rgba(52, 211, 153, 0.25)',
              color: '#34d399',
              fontSize: '20px',
              fontWeight: 800,
              textTransform: 'uppercase',
            }}
          >
            <CheckCircle2 size={20} strokeWidth={2.5} />
            Ready
          </div>
        </div>

        <div
          style={{
            backgroundColor: '#0a0a0c',
            borderRadius: '24px',
            border: '1.5px solid rgba(255, 255, 255, 0.06)',
            padding: '24px 30px',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '24px',
          }}
        >
          <div>
            <div style={{ fontSize: '20px', color: '#71717a', fontWeight: 800, textTransform: 'uppercase' }}>
              You should pay
            </div>
            <div
              style={{
                fontFamily: VIDEO_THEME.fonts.heading,
                fontSize: '48px',
                fontWeight: 900,
                color: '#f87171',
                marginTop: '4px',
              }}
            >
              ₹1,070.00
            </div>
          </div>
          <div style={{ fontSize: '24px', color: '#71717a' }}>
            Direct Transfer
          </div>
        </div>

        {/* 1-Tap UPI Button */}
        <div
          style={{
            height: '92px',
            borderRadius: '24px',
            backgroundColor: showUPIPressed ? '#34d399' : 'rgba(52, 211, 153, 0.15)',
            border: '2px solid #34d399',
            color: showUPIPressed ? '#000000' : '#34d399',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '16px',
            fontFamily: VIDEO_THEME.fonts.heading,
            fontSize: '30px',
            fontWeight: 800,
            letterSpacing: '0.04em',
            boxShadow: '0 8px 28px rgba(52, 211, 153, 0.2)',
          }}
        >
          <Smartphone size={34} strokeWidth={2.4} />
          Pay via UPI & QR
        </div>
      </div>

      {/* ─── Custom Settlement Button ─── */}
      <div
        style={{
          borderRadius: '28px',
          backgroundColor: 'rgba(255, 255, 255, 0.03)',
          border: '1.5px solid rgba(255, 255, 255, 0.06)',
          padding: '28px 36px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
          <div
            style={{
              width: '60px',
              height: '60px',
              borderRadius: '18px',
              backgroundColor: 'rgba(139, 92, 246, 0.15)',
              border: '1.5px solid rgba(139, 92, 246, 0.3)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#a78bfa',
            }}
          >
            <SlidersHorizontal size={30} strokeWidth={2.2} />
          </div>
          <div>
            <div style={{ fontSize: '30px', fontWeight: 800, color: '#ffffff' }}>
              Custom Settlement
            </div>
            <div style={{ fontSize: '22px', color: '#71717a', marginTop: '4px' }}>
              Pay any member any specific amount
            </div>
          </div>
        </div>
      </div>

      {/* ─── Android Gesture Nav Bar ─── */}
      <div
        style={{
          position: 'absolute',
          bottom: '24px',
          left: '50%',
          transform: 'translateX(-50%)',
          width: '320px',
          height: '8px',
          borderRadius: '4px',
          backgroundColor: 'rgba(255, 255, 255, 0.4)',
        }}
      />
    </div>
  );
};
