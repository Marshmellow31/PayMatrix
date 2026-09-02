// Group categories
export const GROUP_CATEGORIES = [
  { value: 'Trip', label: 'Trip & Travel', icon: 'Plane', color: '#6366f1' },
  { value: 'Food', label: 'Food & Dining', icon: 'Utensils', color: '#f97316' },
  { value: 'Roommates', label: 'Roommates & Flat', icon: 'Home', color: '#22c55e' },
  { value: 'Friends', label: 'Friends & Gang', icon: 'Flame', color: '#ec4899' },
  { value: 'Work', label: 'Work & Office', icon: 'Briefcase', color: '#3b82f6' },
  { value: 'Events', label: 'Events & Party', icon: 'PartyPopper', color: '#f59e0b' },
  { value: 'Couple', label: 'Couple & Partner', icon: 'Heart', color: '#f43f5e' },
  { value: 'Sports', label: 'Sports & Fitness', icon: 'Trophy', color: '#10b981' },
  { value: 'Entertainment', label: 'Entertainment', icon: 'Film', color: '#a855f7' },
  { value: 'Shopping', label: 'Shopping & Groceries', icon: 'ShoppingBag', color: '#06b6d4' },
  { value: 'Family', label: 'Family & Home', icon: 'Users', color: '#8b5cf6' },
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
