import React from 'react';
import {
  ArrowLeft,
  MoreVertical,
  UserPlus,
  Plane,
  Copy,
  Plus,
  ScanLine,
  WalletCards,
  Wifi,
  BatteryMedium,
} from 'lucide-react';
import { VIDEO_THEME } from '../../constants/videoTheme';

interface GroupScreenProps {
  revealMembers?: boolean;
  activeTab?: 'Expenses' | 'Members' | 'Logs' | 'Insights';
}

export const GroupScreen: React.FC<GroupScreenProps> = ({
  revealMembers = true,
  activeTab = 'Members',
}) => {
  const members = [
    {
      name: 'Harshil Patel',
      initial: 'H',
      avatarBg: '#3b82f6',
      isAdmin: true,
      isMe: true,
      email: 'harshil@paymatrix.app',
      balance: '+₹3,210.00',
      isPositive: true,
    },
    {
      name: 'Meet Patel',
      initial: 'M',
      avatarBg: '#10b981',
      isAdmin: false,
      isMe: false,
      email: 'meet@paymatrix.app',
      balance: '-₹1,070.00',
      isPositive: false,
    },
    {
      name: 'Akul Patel',
      initial: 'A',
      avatarBg: '#f59e0b',
      isAdmin: false,
      isMe: false,
      email: 'akul@paymatrix.app',
      balance: '-₹1,070.00',
      isPositive: false,
    },
    {
      name: 'Jeet Patel',
      initial: 'J',
      avatarBg: '#8b5cf6',
      isAdmin: false,
      isMe: false,
      email: 'jeet@paymatrix.app',
      balance: '-₹1,070.00',
      isPositive: false,
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
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <Wifi size={32} />
          <BatteryMedium size={36} />
        </div>
      </div>

      {/* ─── Top App Navigation Bar: "← Back" + Actions ─── */}
      <div
        style={{
          height: '120px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '24px',
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '24px',
            fontSize: '44px',
            fontWeight: 700,
            letterSpacing: '-0.02em',
          }}
        >
          <ArrowLeft size={44} strokeWidth={2.5} />
          <span>Back</span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '36px', color: '#ffffff' }}>
          <UserPlus size={42} strokeWidth={2.2} />
          <MoreVertical size={42} strokeWidth={2.2} />
        </div>
      </div>

      {/* ─── Group Hero Header Card ─── */}
      <div
        style={{
          borderRadius: '44px',
          backgroundColor: '#161618',
          border: '1.5px solid rgba(255, 255, 255, 0.08)',
          padding: '40px 38px',
          display: 'flex',
          flexDirection: 'column',
          gap: '28px',
          marginBottom: '32px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '28px' }}>
          {/* Cyan Squircle Icon */}
          <div
            style={{
              width: '110px',
              height: '110px',
              borderRadius: '34px',
              backgroundColor: 'rgba(56, 189, 248, 0.14)',
              border: '1.5px solid rgba(56, 189, 248, 0.3)',
              color: '#38bdf8',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
            }}
          >
            <Plane size={54} strokeWidth={2.2} />
          </div>

          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px', flexWrap: 'wrap' }}>
              <h1
                style={{
                  fontSize: '46px',
                  fontWeight: 800,
                  color: '#ffffff',
                  letterSpacing: '-0.03em',
                  margin: 0,
                }}
              >
                Goa weekend
              </h1>
              <span
                style={{
                  padding: '6px 16px',
                  borderRadius: '999px',
                  fontSize: '22px',
                  fontWeight: 700,
                  textTransform: 'uppercase',
                  letterSpacing: '0.06em',
                  border: '1px solid rgba(56, 189, 248, 0.3)',
                  backgroundColor: 'rgba(56, 189, 248, 0.12)',
                  color: '#38bdf8',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '8px',
                }}
              >
                <Plane size={20} />
                <span>TRIP</span>
              </span>
            </div>

            <p
              style={{
                fontSize: '28px',
                color: '#8e8e93',
                marginTop: '10px',
                marginBottom: 0,
                fontWeight: 500,
              }}
            >
              4 members · Created by Harshil Patel
            </p>
          </div>
        </div>

        {/* Action Chips: Share Code & Invite */}
        <div style={{ display: 'flex', gap: '20px' }}>
          <div
            style={{
              padding: '14px 28px',
              borderRadius: '999px',
              backgroundColor: 'rgba(255, 255, 255, 0.05)',
              border: '1.5px solid rgba(255, 255, 255, 0.1)',
              display: 'flex',
              alignItems: 'center',
              gap: '14px',
              fontSize: '26px',
              fontWeight: 600,
              color: '#d4d4d8',
            }}
          >
            <span style={{ color: '#a78bfa' }}>&lt;</span>
            <span style={{ letterSpacing: '0.04em' }}>GOAWKND1</span>
            <Copy size={24} style={{ color: '#8e8e93' }} />
          </div>

          <div
            style={{
              padding: '14px 28px',
              borderRadius: '999px',
              backgroundColor: 'rgba(255, 255, 255, 0.05)',
              border: '1.5px solid rgba(255, 255, 255, 0.1)',
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              fontSize: '26px',
              fontWeight: 600,
              color: '#d4d4d8',
            }}
          >
            <UserPlus size={24} />
            <span>Invite</span>
          </div>
        </div>
      </div>

      {/* ─── Balance Summary Card ─── */}
      <div
        style={{
          borderRadius: '44px',
          backgroundColor: '#161618',
          border: '1.5px solid rgba(255, 255, 255, 0.08)',
          padding: '40px 38px',
          marginBottom: '36px',
        }}
      >
        <p
          style={{
            fontSize: '24px',
            fontWeight: 800,
            textTransform: 'uppercase',
            letterSpacing: '0.14em',
            color: '#71717a',
            margin: 0,
            fontFamily: VIDEO_THEME.fonts.heading,
          }}
        >
          YOUR GROUP BALANCE
        </p>

        <div
          style={{
            fontFamily: VIDEO_THEME.fonts.heading,
            fontSize: '78px',
            fontWeight: 900,
            color: '#34d399',
            marginTop: '8px',
            letterSpacing: '-0.04em',
          }}
        >
          +₹3,210.00
        </div>

        <p
          style={{
            fontSize: '28px',
            color: '#34d399',
            marginTop: '8px',
            marginBottom: 0,
            fontWeight: 600,
          }}
        >
          You are owed in this group
        </p>
      </div>

      {/* ─── Action Buttons: Add Expense & Scan Bill + Settle Up ─── */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', marginBottom: '40px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
          {/* Solid White Pill */}
          <div
            style={{
              height: '110px',
              borderRadius: '999px',
              backgroundColor: '#ffffff',
              color: '#09090b',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '16px',
              fontSize: '30px',
              fontWeight: 800,
              letterSpacing: '0.04em',
              textTransform: 'uppercase',
              boxShadow: '0 8px 24px rgba(255, 255, 255, 0.15)',
            }}
          >
            <Plus size={34} strokeWidth={3} />
            <span>ADD EXPENSE</span>
          </div>

          {/* Dark Pill */}
          <div
            style={{
              height: '110px',
              borderRadius: '999px',
              backgroundColor: '#18181b',
              border: '1.5px solid rgba(255, 255, 255, 0.12)',
              color: '#ffffff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '16px',
              fontSize: '30px',
              fontWeight: 800,
              letterSpacing: '0.04em',
              textTransform: 'uppercase',
            }}
          >
            <ScanLine size={34} strokeWidth={2.5} />
            <span>SCAN BILL</span>
          </div>
        </div>

        {/* Full-width Settle Up */}
        <div
          style={{
            height: '110px',
            borderRadius: '999px',
            backgroundColor: '#18181b',
            border: '1.5px solid rgba(255, 255, 255, 0.12)',
            color: '#ffffff',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '16px',
            fontSize: '30px',
            fontWeight: 800,
            letterSpacing: '0.04em',
            textTransform: 'uppercase',
          }}
        >
          <WalletCards size={34} strokeWidth={2.5} />
          <span>SETTLE UP</span>
        </div>
      </div>

      {/* ─── 4 Tabs Row: Expenses | Members | Logs | Insights ─── */}
      <div
        style={{
          display: 'flex',
          borderBottom: '1.5px solid rgba(255, 255, 255, 0.1)',
          marginBottom: '36px',
        }}
      >
        {['Expenses', 'Members', 'Logs', 'Insights'].map((tab) => {
          const isActive = tab === activeTab;
          return (
            <div
              key={tab}
              style={{
                flex: 1,
                textAlign: 'center',
                paddingBottom: '24px',
                fontSize: '32px',
                fontWeight: isActive ? 800 : 500,
                color: isActive ? '#ffffff' : '#71717a',
                position: 'relative',
              }}
            >
              {tab}
              {isActive && (
                <div
                  style={{
                    position: 'absolute',
                    bottom: '-2px',
                    left: '15%',
                    right: '15%',
                    height: '5px',
                    borderRadius: '999px',
                    backgroundColor: '#ffffff',
                  }}
                />
              )}
            </div>
          );
        })}
      </div>

      {/* ─── Members List Section ─── */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '20px' }}>
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '8px',
          }}
        >
          <div>
            <span style={{ fontSize: '38px', fontWeight: 800, color: '#ffffff' }}>Members</span>
            <span style={{ fontSize: '28px', color: '#71717a', marginLeft: '16px' }}>
              4 people
            </span>
          </div>
          <UserPlus size={36} style={{ color: '#ffffff' }} />
        </div>

        {/* Member Cards */}
        {members.map((member) => (
          <div
            key={member.name}
            style={{
              borderRadius: '34px',
              backgroundColor: '#161618',
              border: '1.5px solid rgba(255, 255, 255, 0.07)',
              padding: '28px 32px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}
          >
            {/* Left: Avatar + Info */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '24px' }}>
              <div
                style={{
                  width: '90px',
                  height: '90px',
                  borderRadius: '50%',
                  backgroundColor: member.avatarBg,
                  color: '#ffffff',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '38px',
                  fontWeight: 800,
                  flexShrink: 0,
                }}
              >
                {member.initial}
              </div>

              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                  <span style={{ fontSize: '34px', fontWeight: 700, color: '#ffffff' }}>
                    {member.name}
                  </span>
                  {member.isAdmin && (
                    <span
                      style={{
                        padding: '4px 14px',
                        borderRadius: '999px',
                        fontSize: '18px',
                        fontWeight: 800,
                        backgroundColor: 'rgba(56, 189, 248, 0.15)',
                        color: '#38bdf8',
                        textTransform: 'uppercase',
                        letterSpacing: '0.06em',
                      }}
                    >
                      ADMIN
                    </span>
                  )}
                  {member.isMe && (
                    <span
                      style={{
                        padding: '4px 14px',
                        borderRadius: '999px',
                        fontSize: '18px',
                        fontWeight: 800,
                        backgroundColor: 'rgba(255, 255, 255, 0.12)',
                        color: '#e4e4e7',
                        textTransform: 'uppercase',
                        letterSpacing: '0.06em',
                      }}
                    >
                      YOU
                    </span>
                  )}
                </div>

                <p
                  style={{
                    fontSize: '24px',
                    color: '#71717a',
                    marginTop: '6px',
                    marginBottom: 0,
                    fontWeight: 500,
                  }}
                >
                  {member.email}
                </p>
              </div>
            </div>

            {/* Right: Balance */}
            <div
              style={{
                fontFamily: VIDEO_THEME.fonts.heading,
                fontSize: '38px',
                fontWeight: 800,
                color: member.isPositive ? '#34d399' : '#fbbf24',
                letterSpacing: '-0.02em',
              }}
            >
              {member.balance}
            </div>
          </div>
        ))}
      </div>

      {/* ─── Android Gesture Home Indicator Bar ─── */}
      <div
        style={{
          position: 'absolute',
          bottom: '24px',
          left: '50%',
          transform: 'translateX(-50%)',
          width: '320px',
          height: '8px',
          borderRadius: '999px',
          backgroundColor: 'rgba(255, 255, 255, 0.4)',
        }}
      />
    </div>
  );
};
