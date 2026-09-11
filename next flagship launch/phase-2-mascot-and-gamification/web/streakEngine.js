/**
 * streakEngine.js
 * Manages zero-debt streaks, karma XP, and achievement badges stored in localStorage
 */

const STORAGE_KEY = 'paymatrix_gamification_v3';

export const BADGE_DEFS = {
  SPEEDY_SETTLER: { id: 'SPEEDY_SETTLER', name: 'Speedy Settler', desc: 'Settled within 1 hour', icon: '⚡' },
  FAIR_SHARE: { id: 'FAIR_SHARE', name: 'Fair Share', desc: 'Split 10 expenses evenly', icon: '🤝' },
  ITEMIZER_ELITE: { id: 'ITEMIZER_ELITE', name: 'Itemizer Elite', desc: 'Scanned 5 itemized receipts with AI', icon: '📸' },
  GLOBETROTTER: { id: 'GLOBETROTTER', name: 'Globetrotter', desc: 'Used 3 different fiat currencies', icon: '🌐' },
  DEBT_FREE_30: { id: 'DEBT_FREE_30', name: 'Zero-Balance Knight', desc: '30 consecutive days with zero debt', icon: '🛡️' },
};

export const getGamificationProfile = () => {
  if (typeof localStorage === 'undefined') {
    return { streakCount: 0, lastActiveDate: '', karmaXp: 0, badges: [] };
  }

  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { streakCount: 0, lastActiveDate: '', karmaXp: 0, badges: [] };
    return JSON.parse(raw);
  } catch (err) {
    return { streakCount: 0, lastActiveDate: '', karmaXp: 0, badges: [] };
  }
};

export const recordFinancialAction = (actionType = 'SETTLE') => {
  const profile = getGamificationProfile();
  const today = new Date().toISOString().slice(0, 10);

  // XP Gains
  const xpMap = {
    SETTLE: 25,
    EXPENSE_ADD: 10,
    SCAN_RECEIPT: 15,
  };
  profile.karmaXp = (profile.karmaXp || 0) + (xpMap[actionType] || 5);

  // Streak evaluation
  if (!profile.lastActiveDate) {
    profile.streakCount = 1;
    profile.lastActiveDate = today;
  } else if (profile.lastActiveDate !== today) {
    const lastDate = new Date(profile.lastActiveDate);
    const currentDate = new Date(today);
    const diffDays = Math.round((currentDate - lastDate) / (1000 * 60 * 60 * 24));

    if (diffDays === 1) {
      profile.streakCount += 1;
      profile.lastActiveDate = today;
    } else if (diffDays > 1) {
      profile.streakCount = 1; // Streak reset
      profile.lastActiveDate = today;
    }
  }

  if (typeof localStorage !== 'undefined') {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(profile));
  }

  return profile;
};
