import {
  Activity,
  Car,
  Film,
  Flame,
  GraduationCap,
  Hash,
  Heart,
  Home,
  PartyPopper,
  Plane,
  ShoppingBag,
  Utensils,
  Zap,
} from 'lucide-react';

const ICONS = Object.freeze({
  Activity,
  Car,
  Film,
  Flame,
  GraduationCap,
  Hash,
  Heart,
  Home,
  PartyPopper,
  Plane,
  ShoppingBag,
  Utensils,
  Zap,
});

export const getLucideIcon = (name) => ICONS[name] || Hash;
