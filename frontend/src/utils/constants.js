// Group categories
export const GROUP_CATEGORIES = [
  { value: 'Trip', label: 'Trip', icon: 'Plane', color: '#6366f1' },
  { value: 'Roommates', label: 'Roommates', icon: 'Home', color: '#22c55e' },
  { value: 'Events', label: 'Events', icon: 'PartyPopper', color: '#f59e0b' },
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
];

// API base URL
export const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api/v1';
export const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || 'http://localhost:5000';
