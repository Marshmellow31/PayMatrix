import React from 'react';
import { ArrowLeft, Utensils, Wifi, BatteryMedium, Check } from 'lucide-react';
import { VIDEO_THEME } from '../../constants/videoTheme';

interface ExpenseSplitScreenProps {
  splitProgress?: number; // 0 to 1
}

export const ExpenseSplitScreen: React.FC<ExpenseSplitScreenProps> = ({
  splitProgress = 1,
}) => {
  const members = [
    {
      name: 'Harshil Patel',
      initial: 'H',
      avatarBg: '#3b82f6',
      share: '25.0% equal share',
      amount: '₹1,070.00',
      isYou: true,
    },
    {
      name: 'Meet Patel',
      initial: 'M',
      avatarBg: '#10b981',
      share: '25.0% equal share',
      amount: '₹1,070.00',
      isYou: false,
    },
    {
      name: 'Akul Patel',
      initial: 'A',
      avatarBg: '#f59e0b',
      share: '25.0% equal share',
      amount: '₹1,070.00',
      isYou: false,
    },
    {
      name: 'Jeet Patel',
      initial: 'J',
      avatarBg: '#8b5cf6',
      share: '25.0% equal share',
      amount: '₹1,070.00',
      isYou: false,
    },
  ];

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

      {/* ─── Top App Bar: Back Button + Step Indicator ─── */}
      <div
        style={{
          height: '120px',
          display: 'flex',
          alignItems: 'center',
          gap: '24px',
          marginBottom: '20px',
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
        <div style={{ flex: 1 }}>
          <div
            style={{
              fontSize: '40px',
              fontWeight: 800,
              color: '#ffffff',
              lineHeight: 1.1,
              fontFamily: VIDEO_THEME.fonts.heading,
            }}
          >
            Record Transaction
          </div>
          <div
            style={{
              fontSize: '22px',
              fontWeight: 800,
              color: '#34d399',
              letterSpacing: '0.12em',
              textTransform: 'uppercase',
              marginTop: '4px',
            }}
          >
            STEP 3 OF 3 · SPLIT WITH
          </div>
        </div>
      </div>

      {/* ─── 3 Progress Step Indicator Bars ─── */}
      <div
        style={{
          display: 'flex',
          gap: '16px',
          marginBottom: '36px',
        }}
      >
        <div style={{ flex: 1, height: '8px', borderRadius: '4px', backgroundColor: '#34d399' }} />
        <div style={{ flex: 1, height: '8px', borderRadius: '4px', backgroundColor: '#34d399' }} />
        <div style={{ flex: 1, height: '8px', borderRadius: '4px', backgroundColor: '#34d399' }} />
      </div>

      {/* ─── Expense Summary Card (Total Amount) ─── */}
      <div
        style={{
          borderRadius: '36px',
          backgroundColor: '#16161a',
          border: '1.5px solid rgba(255, 255, 255, 0.08)',
          padding: '36px 40px',
          marginBottom: '32px',
          boxShadow: '0 16px 40px rgba(0, 0, 0, 0.6)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '22px', marginBottom: '20px' }}>
          <div
            style={{
              width: '72px',
              height: '72px',
              borderRadius: '24px',
              backgroundColor: 'rgba(249, 115, 22, 0.15)',
              border: '1.5px solid rgba(249, 115, 22, 0.3)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#f97316',
            }}
          >
            <Utensils size={36} strokeWidth={2.4} />
          </div>
          <div>
            <div
              style={{
                fontFamily: VIDEO_THEME.fonts.heading,
                fontSize: '38px',
                fontWeight: 800,
                color: '#ffffff',
              }}
            >
              Fisherman's Wharf Dinner
            </div>
            <div style={{ fontSize: '26px', color: '#a1a1aa', marginTop: '4px' }}>
              Food & Dining · Goa weekend trip · Paid by You
            </div>
          </div>
        </div>

        <div
          style={{
            backgroundColor: '#0a0a0c',
            borderRadius: '28px',
            border: '1.5px solid rgba(255, 255, 255, 0.08)',
            padding: '24px 32px',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'baseline',
          }}
        >
          <div
            style={{
              fontSize: '22px',
              color: '#71717a',
              fontWeight: 800,
              letterSpacing: '0.14em',
              textTransform: 'uppercase',
            }}
          >
            TOTAL AMOUNT
          </div>
          <div
            style={{
              fontFamily: VIDEO_THEME.fonts.heading,
              fontSize: '64px',
              fontWeight: 900,
              color: '#ffffff',
              letterSpacing: '-0.03em',
            }}
          >
            ₹4,280.00
          </div>
        </div>
      </div>

      {/* ─── Split Type Pill Selector (Equal / Exact / % / Shares) ─── */}
      <div
        style={{
          display: 'flex',
          gap: '14px',
          marginBottom: '32px',
        }}
      >
        {[
          { label: '÷ EQUAL', active: true },
          { label: '⚹ EXACT', active: false },
          { label: '% PERCENT', active: false },
          { label: '◔ SHARES', active: false },
        ].map((tab, idx) => (
          <div
            key={idx}
            style={{
              flex: 1,
              height: '76px',
              borderRadius: '22px',
              backgroundColor: tab.active ? '#ffffff' : 'rgba(255, 255, 255, 0.04)',
              color: tab.active ? '#000000' : 'rgba(255, 255, 255, 0.6)',
              border: tab.active ? 'none' : '1.5px solid rgba(255, 255, 255, 0.06)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '24px',
              fontWeight: 800,
              letterSpacing: '0.04em',
              boxShadow: tab.active ? '0 8px 24px rgba(255, 255, 255, 0.25)' : 'none',
            }}
          >
            {tab.label}
          </div>
        ))}
      </div>

      {/* ─── Distribution Header ─── */}
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
          DISTRIBUTION PREVIEW
        </span>
        <span
          style={{
            fontSize: '22px',
            color: '#34d399',
            fontWeight: 800,
            letterSpacing: '0.08em',
          }}
        >
          4 ACTIVE
        </span>
      </div>

      {/* ─── 4 Member Share Cards ─── */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginBottom: '32px' }}>
        {members.map((member, idx) => (
          <div
            key={idx}
            style={{
              backgroundColor: '#16161a',
              borderRadius: '28px',
              border: '1.5px solid rgba(255, 255, 255, 0.08)',
              padding: '24px 32px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '22px' }}>
              <div
                style={{
                  width: '68px',
                  height: '68px',
                  borderRadius: '50%',
                  backgroundColor: member.avatarBg,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '28px',
                  fontWeight: 800,
                  color: '#ffffff',
                }}
              >
                {member.initial}
              </div>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <span
                    style={{
                      fontFamily: VIDEO_THEME.fonts.heading,
                      fontSize: '34px',
                      fontWeight: 800,
                      color: '#ffffff',
                    }}
                  >
                    {member.name}
                  </span>
                  {member.isYou && (
                    <span
                      style={{
                        backgroundColor: 'rgba(255, 255, 255, 0.12)',
                        padding: '4px 14px',
                        borderRadius: '999px',
                        fontSize: '18px',
                        fontWeight: 800,
                        color: '#ffffff',
                      }}
                    >
                      YOU
                    </span>
                  )}
                </div>
                <div style={{ fontSize: '24px', color: '#71717a', marginTop: '4px' }}>
                  {member.share}
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '18px' }}>
              <div
                style={{
                  fontFamily: VIDEO_THEME.fonts.heading,
                  fontSize: '40px',
                  fontWeight: 900,
                  color: '#ffffff',
                  letterSpacing: '-0.02em',
                }}
              >
                {member.amount}
              </div>
              <div
                style={{
                  width: '40px',
                  height: '40px',
                  borderRadius: '50%',
                  backgroundColor: 'rgba(52, 211, 153, 0.15)',
                  border: '1.5px solid #34d399',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#34d399',
                }}
              >
                <Check size={24} strokeWidth={3} />
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* ─── Deterministic Remainder Allocation Status ─── */}
      <div
        style={{
          borderRadius: '24px',
          backgroundColor: 'rgba(52, 211, 153, 0.08)',
          border: '1.5px solid rgba(52, 211, 153, 0.25)',
          padding: '24px 32px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '36px',
        }}
      >
        <span style={{ fontSize: '26px', color: '#e4e4e7', fontWeight: 700 }}>
          Deterministic Remainder Allocation
        </span>
        <span
          style={{
            fontSize: '28px',
            color: '#34d399',
            fontWeight: 800,
            fontFamily: VIDEO_THEME.fonts.mono,
          }}
        >
          ₹0.00 Exact
        </span>
      </div>

      {/* ─── Save & Split CTA Pill ─── */}
      <div
        style={{
          height: '104px',
          borderRadius: '999px',
          backgroundColor: '#ffffff',
          color: '#0a0a0c',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontFamily: VIDEO_THEME.fonts.heading,
          fontSize: '34px',
          fontWeight: 900,
          boxShadow: '0 12px 36px rgba(255, 255, 255, 0.25)',
        }}
      >
        Save & Split Expense
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
