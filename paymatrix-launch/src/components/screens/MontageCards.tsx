import React from 'react';
import { PieChart, Zap, WifiOff, ArrowRight } from 'lucide-react';
import { VIDEO_THEME } from '../../constants/videoTheme';

export const MontageCardMinFlow: React.FC = () => (
  <div
    style={{
      width: '900px',
      backgroundColor: '#16161a',
      borderRadius: '36px',
      border: '1.5px solid rgba(255, 255, 255, 0.12)',
      padding: '44px 48px',
      boxShadow: '0 40px 100px rgba(0,0,0,0.95)',
    }}
  >
    <div style={{ display: 'flex', alignItems: 'center', gap: '22px', marginBottom: '28px' }}>
      <div
        style={{
          width: '72px',
          height: '72px',
          borderRadius: '24px',
          backgroundColor: 'rgba(52, 211, 153, 0.15)',
          border: '1.5px solid rgba(52, 211, 153, 0.35)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: '#34d399',
        }}
      >
        <Zap size={36} color="#34d399" strokeWidth={2.4} />
      </div>
      <div>
        <div style={{ fontSize: '18px', color: '#34d399', fontWeight: 800, letterSpacing: '0.14em', textTransform: 'uppercase' }}>
          DEBT SIMPLIFICATION
        </div>
        <div style={{ fontFamily: VIDEO_THEME.fonts.heading, fontSize: '34px', fontWeight: 800, color: '#ffffff', marginTop: '4px' }}>
          Greedy Min-Flow Graph Engine
        </div>
      </div>
    </div>

    {/* Metric Reduction Banner */}
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-around',
        backgroundColor: '#0a0a0c',
        borderRadius: '28px',
        padding: '28px 24px',
        border: '1.5px solid rgba(255, 255, 255, 0.08)',
        marginBottom: '26px',
      }}
    >
      <div style={{ textAlign: 'center' }}>
        <div style={{ fontFamily: VIDEO_THEME.fonts.heading, fontSize: '56px', fontWeight: 900, color: '#71717a' }}>
          14
        </div>
        <div style={{ fontSize: '20px', color: '#a1a1aa', fontWeight: 700, marginTop: '4px' }}>Raw debts</div>
      </div>
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          backgroundColor: 'rgba(255, 255, 255, 0.08)',
          padding: '12px 24px',
          borderRadius: '999px',
          border: '1.5px solid rgba(255, 255, 255, 0.12)',
        }}
      >
        <span style={{ fontSize: '18px', color: '#ffffff', fontWeight: 700 }}>Reduced to</span>
        <ArrowRight size={22} color="#ffffff" strokeWidth={2.5} />
      </div>
      <div style={{ textAlign: 'center' }}>
        <div style={{ fontFamily: VIDEO_THEME.fonts.heading, fontSize: '64px', fontWeight: 900, color: '#34d399' }}>
          3
        </div>
        <div style={{ fontSize: '20px', color: '#34d399', fontWeight: 800, marginTop: '4px' }}>
          Direct Transfers
        </div>
      </div>
    </div>

    {/* Directed Flows: Meet, Akul, Jeet -> Harshil */}
    <div style={{ display: 'flex', gap: '14px' }}>
      {[
        { from: 'Meet', to: 'Harshil', amount: '₹1,070' },
        { from: 'Akul', to: 'Harshil', amount: '₹1,070' },
        { from: 'Jeet', to: 'Harshil', amount: '₹1,070' },
      ].map((transfer) => (
        <div
          key={transfer.from}
          style={{
            flex: 1,
            backgroundColor: '#0a0a0c',
            border: '1.5px solid rgba(255, 255, 255, 0.06)',
            borderRadius: '20px',
            padding: '16px 14px',
            textAlign: 'center',
          }}
        >
          <div style={{ fontSize: '18px', fontWeight: 700, color: '#ffffff', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}>
            <span>{transfer.from}</span>
            <ArrowRight size={16} color="#71717a" />
            <span>{transfer.to}</span>
          </div>
          <div style={{ fontSize: '24px', fontWeight: 900, color: '#34d399', fontFamily: VIDEO_THEME.fonts.heading, marginTop: '6px' }}>
            {transfer.amount}
          </div>
        </div>
      ))}
    </div>
  </div>
);

export const MontageCardAnalytics: React.FC = () => (
  <div
    style={{
      width: '900px',
      backgroundColor: '#16161a',
      borderRadius: '36px',
      border: '1.5px solid rgba(255, 255, 255, 0.12)',
      padding: '44px 48px',
      boxShadow: '0 40px 100px rgba(0,0,0,0.95)',
    }}
  >
    <div style={{ display: 'flex', alignItems: 'center', gap: '22px', marginBottom: '32px' }}>
      <div
        style={{
          width: '72px',
          height: '72px',
          borderRadius: '24px',
          backgroundColor: 'rgba(52, 211, 153, 0.15)',
          border: '1.5px solid rgba(52, 211, 153, 0.35)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: '#34d399',
        }}
      >
        <PieChart size={36} color="#34d399" strokeWidth={2.4} />
      </div>
      <div>
        <div style={{ fontSize: '18px', color: '#34d399', fontWeight: 800, letterSpacing: '0.14em', textTransform: 'uppercase' }}>
          SPENDING INTELLIGENCE
        </div>
        <div style={{ fontFamily: VIDEO_THEME.fonts.heading, fontSize: '34px', fontWeight: 800, color: '#ffffff', marginTop: '4px' }}>
          Real-Time Category Analytics
        </div>
      </div>
    </div>

    {/* Visual Thick High-Contrast Progress Bars */}
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      <div style={{ backgroundColor: '#0a0a0c', borderRadius: '24px', padding: '24px 28px', border: '1.5px solid rgba(255, 255, 255, 0.06)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
          <span style={{ fontSize: '26px', fontWeight: 800, color: '#ffffff' }}>Food & Dining</span>
          <span style={{ fontSize: '28px', fontWeight: 900, color: '#34d399' }}>₹14,280.00 (48%)</span>
        </div>
        <div style={{ height: '18px', borderRadius: '999px', backgroundColor: 'rgba(255, 255, 255, 0.08)', overflow: 'hidden' }}>
          <div style={{ width: '48%', height: '100%', background: 'linear-gradient(90deg, #10b981 0%, #34d399 100%)', borderRadius: '999px' }} />
        </div>
      </div>

      <div style={{ backgroundColor: '#0a0a0c', borderRadius: '24px', padding: '24px 28px', border: '1.5px solid rgba(255, 255, 255, 0.06)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
          <span style={{ fontSize: '26px', fontWeight: 800, color: '#ffffff' }}>Stays & Accommodations</span>
          <span style={{ fontSize: '28px', fontWeight: 900, color: '#60a5fa' }}>₹9,500.00 (32%)</span>
        </div>
        <div style={{ height: '18px', borderRadius: '999px', backgroundColor: 'rgba(255, 255, 255, 0.08)', overflow: 'hidden' }}>
          <div style={{ width: '32%', height: '100%', background: 'linear-gradient(90deg, #3b82f6 0%, #60a5fa 100%)', borderRadius: '999px' }} />
        </div>
      </div>
    </div>
  </div>
);

export const MontageCardOffline: React.FC = () => (
  <div
    style={{
      width: '900px',
      backgroundColor: '#16161a',
      borderRadius: '36px',
      border: '1.5px solid rgba(255, 255, 255, 0.12)',
      padding: '48px 52px',
      boxShadow: '0 40px 100px rgba(0,0,0,0.95)',
    }}
  >
    <div style={{ display: 'flex', alignItems: 'center', gap: '26px' }}>
      <div
        style={{
          width: '84px',
          height: '84px',
          borderRadius: '26px',
          backgroundColor: 'rgba(52, 211, 153, 0.15)',
          border: '1.5px solid rgba(52, 211, 153, 0.35)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: '#34d399',
          flexShrink: 0,
        }}
      >
        <WifiOff size={44} color="#34d399" strokeWidth={2.4} />
      </div>
      <div>
        <div style={{ fontFamily: VIDEO_THEME.fonts.heading, fontSize: '38px', fontWeight: 800, color: '#ffffff' }}>
          Offline-First Architecture
        </div>
        <div style={{ fontFamily: VIDEO_THEME.fonts.body, fontSize: '26px', color: '#d4d4d8', marginTop: '10px', lineHeight: 1.45, fontWeight: 500 }}>
          Log expenses anywhere with zero internet. Instant cloud sync the second you reconnect.
        </div>
      </div>
    </div>
  </div>
);
