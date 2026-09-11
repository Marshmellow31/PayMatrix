import React from 'react';
import {
  BarChart3,
  Bell,
  Camera,
  ChevronRight,
  Home,
  LayoutGrid,
  Palmtree,
  Plus,
  ScrollText,
  User,
  Users,
  WalletCards,
} from 'lucide-react';
import { VIDEO_THEME } from '../../constants/videoTheme';
import { AnimatedNumber } from '../AnimatedNumber';

interface DashboardScreenProps {
  balanceProgress?: number;
  highlightAction?: 'scan' | 'add' | null;
}

export const DashboardScreen: React.FC<DashboardScreenProps> = ({
  balanceProgress = 1,
  highlightAction = null,
}) => {
  return (
    <div
      style={{
        width: '100%',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        backgroundColor: VIDEO_THEME.pageBg,
        color: VIDEO_THEME.textPrimary,
        position: 'relative',
        overflow: 'hidden',
        boxSizing: 'border-box',
        fontFamily: VIDEO_THEME.fonts.body,
      }}
    >
      {/* ─── Production Header (from frontend/src/components/layout/Header.jsx) ─── */}
      <header
        style={{
          height: '56px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          padding: '0 20px',
          borderBottom: '1px solid rgba(255, 255, 255, 0.07)',
          backgroundColor: 'rgba(26, 26, 26, 0.95)',
          backdropFilter: 'blur(20px)',
          WebkitBackdropFilter: 'blur(20px)',
          zIndex: 40,
          flexShrink: 0,
        }}
      >
        {/* PAYMATRIX Wordmark */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <span
            style={{
              fontFamily: VIDEO_THEME.fonts.heading,
              fontSize: '18px',
              fontWeight: 700,
              letterSpacing: '-0.04em',
              color: '#ffffff',
            }}
          >
            PAYMATRIX
          </span>
        </div>

        {/* Header Actions: Analytics, Notifications, Profile Avatar */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          {/* Analytics Icon Button */}
          <div
            style={{
              width: '36px',
              height: '36px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              borderRadius: '12px',
              color: 'rgba(255, 255, 255, 0.50)',
            }}
          >
            <BarChart3 size={19} strokeWidth={1.7} />
          </div>

          {/* Notifications Icon Button with Unread Badge */}
          <div
            style={{
              position: 'relative',
              width: '36px',
              height: '36px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              borderRadius: '12px',
              color: 'rgba(255, 255, 255, 0.50)',
            }}
          >
            <Bell size={19} strokeWidth={1.7} />
            <span
              style={{
                position: 'absolute',
                top: '2px',
                right: '2px',
                height: '16px',
                minWidth: '16px',
                borderRadius: '9999px',
                border: '2px solid #1A1A1A',
                backgroundColor: '#ffffff',
                padding: '0 3px',
                fontSize: '9px',
                fontWeight: 700,
                color: '#000000',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                lineHeight: 1,
              }}
            >
              2
            </span>
          </div>

          {/* User Avatar (from Avatar.jsx) */}
          <div
            style={{
              width: '32px',
              height: '32px',
              borderRadius: '9999px',
              background: 'linear-gradient(135deg, #3B82F6 0%, #1D4ED8 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontFamily: VIDEO_THEME.fonts.heading,
              fontSize: '12px',
              fontWeight: 900,
              color: '#ffffff',
              boxShadow: '0 4px 12px rgba(0, 0, 0, 0.4)',
              marginLeft: '4px',
            }}
          >
            HP
          </div>
        </div>
      </header>

      {/* ─── Scrollable Page Body (from Dashboard.jsx) ─── */}
      <div
        style={{
          flex: 1,
          padding: '16px 20px 84px 20px',
          display: 'flex',
          flexDirection: 'column',
          gap: '16px',
          overflowY: 'hidden',
          boxSizing: 'border-box',
        }}
      >
        {/* Welcome Section */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          <div>
            <p
              style={{
                fontSize: '12px',
                fontWeight: 500,
                color: 'rgba(255, 255, 255, 0.35)',
                margin: 0,
              }}
            >
              Welcome back
            </p>
            <h1
              style={{
                fontFamily: VIDEO_THEME.fonts.heading,
                fontSize: '26px',
                fontWeight: 900,
                letterSpacing: '-0.045em',
                color: '#ffffff',
                margin: '2px 0 0 0',
              }}
            >
              Harshil
            </h1>
          </div>

          {/* Sync Status Pill */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              borderRadius: '9999px',
              border: '1px solid rgba(255, 255, 255, 0.08)',
              backgroundColor: 'rgba(255, 255, 255, 0.035)',
              padding: '6px 12px',
            }}
          >
            <span
              style={{
                width: '8px',
                height: '8px',
                borderRadius: '9999px',
                backgroundColor: VIDEO_THEME.emerald,
                boxShadow: '0 0 8px rgba(110, 231, 183, 0.8)',
              }}
            />
            <span
              style={{
                fontSize: '10px',
                fontWeight: 600,
                color: 'rgba(255, 255, 255, 0.45)',
              }}
            >
              Synced today
            </span>
          </div>
        </div>

        {/* ─── Hero Balance Card (Exact from Dashboard.jsx lines 202-232) ─── */}
        <div
          style={{
            position: 'relative',
            overflow: 'hidden',
            borderRadius: '1.85rem',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            background: VIDEO_THEME.heroGradient,
            padding: '22px',
            boxShadow: VIDEO_THEME.shadows.hero,
          }}
        >
          {/* Ambient Glow Orb */}
          <div
            style={{
              position: 'absolute',
              right: '-96px',
              top: '-96px',
              width: '256px',
              height: '256px',
              borderRadius: '50%',
              backgroundColor: 'rgba(255, 255, 255, 0.055)',
              filter: 'blur(48px)',
              pointerEvents: 'none',
            }}
          />

          <div style={{ position: 'relative', zIndex: 10 }}>
            {/* Header row */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div>
                <p
                  style={{
                    fontSize: '9px',
                    fontWeight: 700,
                    textTransform: 'uppercase',
                    letterSpacing: '0.22em',
                    color: 'rgba(255, 255, 255, 0.25)',
                    margin: 0,
                  }}
                >
                  YOUR POSITION
                </p>
                <p
                  style={{
                    fontSize: '12px',
                    color: 'rgba(255, 255, 255, 0.45)',
                    margin: '6px 0 0 0',
                    fontWeight: 500,
                  }}
                >
                  Overall, you are owed
                </p>
              </div>
              <WalletCards size={22} color="rgba(255, 255, 255, 0.25)" />
            </div>

            {/* Rupee Amount with AnimatedNumber */}
            <div
              style={{
                marginTop: '24px',
                fontFamily: VIDEO_THEME.fonts.heading,
                fontSize: '40px',
                fontWeight: 900,
                lineHeight: 1,
                letterSpacing: '-0.065em',
                color: '#ffffff',
                display: 'flex',
                alignItems: 'baseline',
              }}
            >
              <span
                style={{
                  fontSize: '0.58em',
                  fontWeight: 600,
                  color: 'rgba(255, 255, 255, 0.35)',
                  marginRight: '4px',
                }}
              >
                ₹
              </span>
              <AnimatedNumber value={4280 * balanceProgress} durationInFrames={30} decimals={2} />
            </div>

            {/* Sub-metrics Divider */}
            <div
              style={{
                marginTop: '22px',
                display: 'grid',
                gridTemplateColumns: '1fr 1fr',
                borderTop: '1px solid rgba(255, 255, 255, 0.08)',
                paddingTop: '14px',
              }}
            >
              <div style={{ paddingRight: '16px' }}>
                <p
                  style={{
                    fontSize: '8px',
                    fontWeight: 700,
                    textTransform: 'uppercase',
                    letterSpacing: '0.16em',
                    color: 'rgba(255, 255, 255, 0.25)',
                    margin: 0,
                  }}
                >
                  YOU OWE
                </p>
                <p
                  style={{
                    fontFamily: VIDEO_THEME.fonts.heading,
                    fontSize: '17px',
                    fontWeight: 700,
                    color: VIDEO_THEME.redTone,
                    margin: '6px 0 0 0',
                  }}
                >
                  ₹0.00
                </p>
              </div>

              <div
                style={{
                  borderLeft: '1px solid rgba(255, 255, 255, 0.08)',
                  paddingLeft: '16px',
                }}
              >
                <p
                  style={{
                    fontSize: '8px',
                    fontWeight: 700,
                    textTransform: 'uppercase',
                    letterSpacing: '0.16em',
                    color: 'rgba(255, 255, 255, 0.25)',
                    margin: 0,
                  }}
                >
                  YOU ARE OWED
                </p>
                <p
                  style={{
                    fontFamily: VIDEO_THEME.fonts.heading,
                    fontSize: '17px',
                    fontWeight: 700,
                    color: VIDEO_THEME.emeraldTone,
                    margin: '6px 0 0 0',
                  }}
                >
                  ₹4,280.00
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* ─── Quick Actions (Dashboard.jsx lines 442-462) ─── */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: '12px',
          }}
        >
          {/* Action 1: Scan receipt (Primary White Button) */}
          <div
            style={{
              minHeight: '100px',
              borderRadius: '24px',
              padding: '16px',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
              backgroundColor: '#ffffff',
              color: '#000000',
              boxShadow:
                highlightAction === 'scan'
                  ? '0 16px 40px rgba(255, 255, 255, 0.25)'
                  : VIDEO_THEME.shadows.actionPrimary,
              transform: highlightAction === 'scan' ? 'scale(1.02)' : 'none',
              transition: 'all 0.2s ease',
              boxSizing: 'border-box',
            }}
          >
            <div
              style={{
                width: '38px',
                height: '38px',
                borderRadius: '12px',
                backgroundColor: 'rgba(0, 0, 0, 0.06)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#000000',
              }}
            >
              <Camera size={19} />
            </div>
            <div>
              <span
                style={{
                  display: 'block',
                  fontSize: '14px',
                  fontWeight: 700,
                  color: '#000000',
                }}
              >
                Scan receipt
              </span>
              <span
                style={{
                  display: 'block',
                  fontSize: '10px',
                  color: 'rgba(0, 0, 0, 0.45)',
                  marginTop: '2px',
                  fontWeight: 500,
                }}
              >
                Camera or gallery
              </span>
            </div>
          </div>

          {/* Action 2: Add expense (Dark Secondary Card) */}
          <div
            style={{
              minHeight: '100px',
              borderRadius: '24px',
              padding: '16px',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
              backgroundColor:
                highlightAction === 'add' ? VIDEO_THEME.surfaceHigh : '#1a1a1a',
              border: '1px solid rgba(255, 255, 255, 0.08)',
              color: '#ffffff',
              transform: highlightAction === 'add' ? 'scale(1.02)' : 'none',
              transition: 'all 0.2s ease',
              boxSizing: 'border-box',
            }}
          >
            <div
              style={{
                width: '38px',
                height: '38px',
                borderRadius: '12px',
                backgroundColor: 'rgba(255, 255, 255, 0.06)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#ffffff',
              }}
            >
              <Plus size={19} />
            </div>
            <div>
              <span
                style={{
                  display: 'block',
                  fontSize: '14px',
                  fontWeight: 700,
                  color: '#ffffff',
                }}
              >
                Add expense
              </span>
              <span
                style={{
                  display: 'block',
                  fontSize: '10px',
                  color: 'rgba(255, 255, 255, 0.30)',
                  marginTop: '2px',
                  fontWeight: 500,
                }}
              >
                Record manually
              </span>
            </div>
          </div>
        </div>

        {/* ─── Active Groups Section (Dashboard.jsx lines 287-326) ─── */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'flex-end',
            }}
          >
            <div>
              <h2
                style={{
                  fontFamily: VIDEO_THEME.fonts.heading,
                  fontSize: '15px',
                  fontWeight: 600,
                  letterSpacing: '-0.02em',
                  color: '#ffffff',
                  margin: 0,
                }}
              >
                Active groups
              </h2>
              <p
                style={{
                  fontSize: '11px',
                  color: 'rgba(255, 255, 255, 0.30)',
                  margin: '2px 0 0 0',
                }}
              >
                Balances ordered by what matters
              </p>
            </div>
            <span
              style={{
                fontSize: '11px',
                fontWeight: 500,
                color: 'rgba(255, 255, 255, 0.45)',
              }}
            >
              See all
            </span>
          </div>

          {/* Group 1: Goa Weekend */}
          <div
            style={{
              borderRadius: '1.35rem',
              border: '1px solid rgba(255, 255, 255, 0.08)',
              backgroundColor: '#1a1a1a',
              padding: '12px 14px',
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
            }}
          >
            {/* Category Icon with authentic 18% opacity tinted background */}
            <div
              style={{
                width: '44px',
                height: '44px',
                borderRadius: '16px',
                backgroundColor: `${VIDEO_THEME.categoryColors.Trip}18`,
                border: `1px solid ${VIDEO_THEME.categoryColors.Trip}30`,
                color: VIDEO_THEME.categoryColors.Trip,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
              }}
            >
              <Palmtree size={22} strokeWidth={1.8} />
            </div>

            <div style={{ minWidth: 0, flex: 1 }}>
              <span
                style={{
                  display: 'block',
                  fontSize: '14px',
                  fontWeight: 700,
                  color: 'rgba(255, 255, 255, 0.85)',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                }}
              >
                Goa Weekend
              </span>
              <span
                style={{
                  display: 'block',
                  fontSize: '10px',
                  color: 'rgba(255, 255, 255, 0.30)',
                  marginTop: '2px',
                }}
              >
                4 members · Harshil, Meet, Akul, Jeet
              </span>
            </div>

            <div style={{ textAlign: 'right', flexShrink: 0 }}>
              <span
                style={{
                  display: 'block',
                  fontSize: '9px',
                  textTransform: 'uppercase',
                  letterSpacing: '0.04em',
                  color: 'rgba(255, 255, 255, 0.30)',
                }}
              >
                You are owed
              </span>
              <span
                style={{
                  display: 'block',
                  fontFamily: VIDEO_THEME.fonts.heading,
                  fontSize: '14px',
                  fontWeight: 700,
                  color: VIDEO_THEME.emeraldTone,
                  marginTop: '2px',
                }}
              >
                +₹3,210.00
              </span>
            </div>
            <ChevronRight size={15} color="rgba(255, 255, 255, 0.20)" />
          </div>

          {/* Group 2: Flat 402 */}
          <div
            style={{
              borderRadius: '1.35rem',
              border: '1px solid rgba(255, 255, 255, 0.08)',
              backgroundColor: '#1a1a1a',
              padding: '12px 14px',
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
            }}
          >
            {/* Category Icon: Roommates (#22c55e) */}
            <div
              style={{
                width: '44px',
                height: '44px',
                borderRadius: '16px',
                backgroundColor: `${VIDEO_THEME.categoryColors.Roommates}18`,
                border: `1px solid ${VIDEO_THEME.categoryColors.Roommates}30`,
                color: VIDEO_THEME.categoryColors.Roommates,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
              }}
            >
              <Home size={22} strokeWidth={1.8} />
            </div>

            <div style={{ minWidth: 0, flex: 1 }}>
              <span
                style={{
                  display: 'block',
                  fontSize: '14px',
                  fontWeight: 700,
                  color: 'rgba(255, 255, 255, 0.85)',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                }}
              >
                Flat 402
              </span>
              <span
                style={{
                  display: 'block',
                  fontSize: '10px',
                  color: 'rgba(255, 255, 255, 0.30)',
                  marginTop: '2px',
                }}
              >
                3 members · Groceries & WiFi
              </span>
            </div>

            <div style={{ textAlign: 'right', flexShrink: 0 }}>
              <span
                style={{
                  display: 'block',
                  fontSize: '9px',
                  textTransform: 'uppercase',
                  letterSpacing: '0.04em',
                  color: 'rgba(255, 255, 255, 0.30)',
                }}
              >
                Settled
              </span>
              <span
                style={{
                  display: 'block',
                  fontFamily: VIDEO_THEME.fonts.heading,
                  fontSize: '14px',
                  fontWeight: 700,
                  color: 'rgba(255, 255, 255, 0.55)',
                  marginTop: '2px',
                }}
              >
                ₹0.00
              </span>
            </div>
            <ChevronRight size={15} color="rgba(255, 255, 255, 0.20)" />
          </div>
        </div>
      </div>

      {/* ─── Production BottomNav (from frontend/src/components/layout/BottomNav.jsx) ─── */}
      <nav
        style={{
          position: 'absolute',
          bottom: 0,
          left: 0,
          right: 0,
          height: '62px',
          borderTop: '1px solid rgba(255, 255, 255, 0.07)',
          backgroundColor: 'rgba(26, 26, 26, 0.98)',
          backdropFilter: 'blur(20px)',
          WebkitBackdropFilter: 'blur(20px)',
          display: 'flex',
          alignItems: 'stretch',
          padding: '0 8px 10px 8px',
          zIndex: 50,
          boxSizing: 'border-box',
        }}
      >
        {/* Tab 1: Home (Active) */}
        <div
          style={{
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '3px',
            color: '#ffffff',
            position: 'relative',
          }}
        >
          {/* Active Top Line Indicator */}
          <span
            style={{
              position: 'absolute',
              top: 0,
              width: '20px',
              height: '2px',
              borderRadius: '9999px',
              backgroundColor: '#ffffff',
            }}
          />
          <Home size={19} strokeWidth={2.2} />
          <span style={{ fontSize: '10px', fontWeight: 600, lineHeight: 1 }}>Home</span>
        </div>

        {/* Tab 2: Friends */}
        <div
          style={{
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '3px',
            color: 'rgba(255, 255, 255, 0.38)',
          }}
        >
          <Users size={19} strokeWidth={1.65} />
          <span style={{ fontSize: '10px', fontWeight: 500, lineHeight: 1 }}>Friends</span>
        </div>

        {/* Tab 3: Groups */}
        <div
          style={{
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '3px',
            color: 'rgba(255, 255, 255, 0.38)',
          }}
        >
          <LayoutGrid size={19} strokeWidth={1.65} />
          <span style={{ fontSize: '10px', fontWeight: 500, lineHeight: 1 }}>Groups</span>
        </div>

        {/* Tab 4: Logs */}
        <div
          style={{
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '3px',
            color: 'rgba(255, 255, 255, 0.38)',
          }}
        >
          <ScrollText size={19} strokeWidth={1.65} />
          <span style={{ fontSize: '10px', fontWeight: 500, lineHeight: 1 }}>Logs</span>
        </div>

        {/* Tab 5: Profile */}
        <div
          style={{
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '3px',
            color: 'rgba(255, 255, 255, 0.38)',
          }}
        >
          <User size={19} strokeWidth={1.65} />
          <span style={{ fontSize: '10px', fontWeight: 500, lineHeight: 1 }}>Profile</span>
        </div>
      </nav>
    </div>
  );
};
