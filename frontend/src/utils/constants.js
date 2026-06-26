// Group categories
export const GROUP_CATEGORIES = [
  { value: 'Trip', label: 'Trip', icon: 'Plane', color: '#6366f1' },
  { value: 'Roommates', label: 'Roommates', icon: 'Home', color: '#22c55e' },
  { value: 'Events', label: 'Events', icon: 'PartyPopper', color: '#f59e0b' },
  { value: 'Friends', label: 'Friends', icon: 'Flame', color: '#f97316' },
  { value: 'Couple', label: 'Couple', icon: 'Heart', color: '#ec4899' },
  { value: 'Other', label: 'Other', icon: 'Hash', color: '#919191' },
];

// Expense categories
export const EXPENSE_CATEGORIES = [
  { value: 'Food', label: 'Food', icon: 'Utensils', color: '#f97316' },
  { value: 'Travel', label: 'Travel', icon: 'Car', color: '#3b82f6' },
  { value: 'Rent', label: 'Rent', icon: 'Home', color: '#8b5cf6' },
  { value: 'Entertainment', label: 'Entertainment', icon: 'Film', color: '#ec4899' },
  { value: 'Utilities', label: 'Utilities', icon: 'Zap', color: '#eab308' },
  { value: 'Shopping', label: 'Shopping', icon: 'ShoppingBag', color: '#14b8a6' },
  { value: 'Health', label: 'Health', icon: 'Activity', color: '#ef4444' },
  { value: 'Education', label: 'Education', icon: 'GraduationCap', color: '#6366f1' },
  { value: 'Other', label: 'Other', icon: 'Hash', color: '#919191' },
];

// Split types
export const SPLIT_TYPES = [
  { value: 'equal', label: 'Equal' },
  { value: 'exact', label: 'Exact Amount' },
  { value: 'percentage', label: 'Percentage' },
  { value: 'shares', label: 'Shares' },
  { value: 'itemized', label: 'Itemized (GST)' },
];

// API_URL and SOCKET_URL removed — no backend server exists.
// All data access goes through Firestore SDK and Firebase Cloud Functions directly.
