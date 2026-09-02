import {
  Activity,
  Briefcase,
  Building,
  Car,
  Coffee,
  Compass,
  Film,
  Flame,
  GraduationCap,
  Hash,
  Heart,
  Home,
  Palmtree,
  PartyPopper,
  Plane,
  ShoppingBag,
  Sparkles,
  Trophy,
  Users,
  Utensils,
  Zap,
} from 'lucide-react';
import { GROUP_CATEGORIES, EXPENSE_CATEGORIES } from './constants.js';

const ICONS = Object.freeze({
  Activity,
  Briefcase,
  Building,
  Car,
  Coffee,
  Compass,
  Film,
  Flame,
  GraduationCap,
  Hash,
  Heart,
  Home,
  Palmtree,
  PartyPopper,
  Plane,
  ShoppingBag,
  Sparkles,
  Trophy,
  Users,
  Utensils,
  Zap,
});

// Direct alias mapping for category strings to Lucide icons
const CATEGORY_TO_ICON = Object.freeze({
  // Group Categories
  trip: Plane,
  travel: Plane,
  vacation: Palmtree,
  tour: Compass,
  food: Utensils,
  dining: Utensils,
  restaurant: Utensils,
  cafe: Coffee,
  roommates: Home,
  flat: Home,
  home: Home,
  house: Building,
  friends: Flame,
  gang: Flame,
  squad: Sparkles,
  work: Briefcase,
  office: Briefcase,
  project: Briefcase,
  company: Building,
  events: PartyPopper,
  party: PartyPopper,
  celebration: PartyPopper,
  couple: Heart,
  partner: Heart,
  love: Heart,
  sports: Trophy,
  fitness: Trophy,
  games: Trophy,
  entertainment: Film,
  movies: Film,
  cinema: Film,
  shopping: ShoppingBag,
  groceries: ShoppingBag,
  family: Users,
  household: Users,
  other: Hash,

  // Expense Categories
  rent: Home,
  utilities: Zap,
  health: Activity,
  education: GraduationCap,
});

/**
 * Resolves an icon identifier (icon name, category string, or alias) to a Lucide icon component.
 * Case-insensitive and falls back to Hash if unmatched.
 */
export const getLucideIcon = (identifier) => {
  if (!identifier) return Hash;
  if (typeof identifier !== 'string') return Hash;

  // 1. Direct Lucide icon name lookup
  if (ICONS[identifier]) return ICONS[identifier];

  // 2. Normalized category / alias lookup
  const normalized = identifier.trim().toLowerCase();
  if (CATEGORY_TO_ICON[normalized]) return CATEGORY_TO_ICON[normalized];

  // 3. Match against GROUP_CATEGORIES values or labels
  const matchedGroupCat = GROUP_CATEGORIES.find(
    (c) =>
      c.value.toLowerCase() === normalized ||
      c.label.toLowerCase() === normalized ||
      c.icon.toLowerCase() === normalized
  );
  if (matchedGroupCat && ICONS[matchedGroupCat.icon]) {
    return ICONS[matchedGroupCat.icon];
  }

  // 4. Match against EXPENSE_CATEGORIES
  const matchedExpCat = EXPENSE_CATEGORIES.find(
    (c) =>
      c.value.toLowerCase() === normalized ||
      c.label.toLowerCase() === normalized ||
      c.icon.toLowerCase() === normalized
  );
  if (matchedExpCat && ICONS[matchedExpCat.icon]) {
    return ICONS[matchedExpCat.icon];
  }

  return Hash;
};

/**
 * Intelligent helper to get full category metadata (Icon, Color, Label, Value).
 * If category is missing or 'Other', it uses groupName heuristics to provide a smart default.
 */
export const getGroupCategoryMeta = (category, groupName = '') => {
  let targetCategory = category;

  // Heuristic inference for legacy/unconfigured groups with generic 'Other' or null category
  if (!targetCategory || targetCategory === 'Other' || targetCategory === 'other') {
    const lowerName = (groupName || '').toLowerCase();
    if (/(trip|tour|trek|pass|goa|manali|camp|flight|travel|hike)/i.test(lowerName)) {
      targetCategory = 'Trip';
    } else if (
      /(chicken|mcdonalds|burger|pizza|food|cafe|dine|dinner|lunch|biryani|chai|tea|snack|bar)/i.test(
        lowerName
      )
    ) {
      targetCategory = 'Food';
    } else if (/(work|office|icd|project|corp|team|startup|client|desk)/i.test(lowerName)) {
      targetCategory = 'Work';
    } else if (/(flat|room|house|rent|pg|hostel|apartment|stay)/i.test(lowerName)) {
      targetCategory = 'Roommates';
    } else if (/(gang|buddies|bros|friends|party|boys|girls|squad)/i.test(lowerName)) {
      targetCategory = 'Friends';
    } else if (
      /(movie|cinema|netflix|game|gaming|match|turf|sport|cricket|football)/i.test(lowerName)
    ) {
      targetCategory = 'Entertainment';
    }
  }

  const normalized = (targetCategory || 'Other').trim().toLowerCase();
  const matched = GROUP_CATEGORIES.find(
    (c) =>
      c.value.toLowerCase() === normalized ||
      c.label.toLowerCase() === normalized ||
      c.icon.toLowerCase() === normalized
  );

  if (matched) {
    return {
      ...matched,
      IconComponent: getLucideIcon(matched.icon),
    };
  }

  return {
    value: targetCategory || 'Other',
    label: targetCategory || 'Other',
    icon: 'Hash',
    IconComponent: getLucideIcon(targetCategory) || Hash,
    color: '#919191',
  };
};
