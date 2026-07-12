/**
 * WorthBase Icon Component
 * Wraps Lucide React Native icons with theme-aware color support.
 *
 * Usage: <Icon name="Wallet" size={24} color="primary" />
 * Icons are imported individually for tree-shaking.
 */

import React from 'react';
import { useTheme } from 'react-native-paper';
import {
  LayoutDashboard,
  Wallet,
  Package,
  Settings,
  MessageCircle,
  Building2,
  Banknote,
  TrendingUp,
  CreditCard,
  Car,
  Home,
  Smartphone,
  Laptop,
  Armchair,
  Plug,
  Watch,
  CheckCircle,
  Archive,
  DollarSign,
  Plus,
  Pencil,
  Trash2,
  X,
  Check,
  ChevronRight,
  ChevronDown,
  RefreshCw,
  Download,
  Upload,
  Filter,
  Search,
  Lock,
  Fingerprint,
  Palette,
  Moon,
  Globe,
  Target,
  FileJson,
  FileSpreadsheet,
  FileDown,
  HardDrive,
  Info,
  PieChart,
  BarChart3,
  Calendar,
  Clock,
  AlertCircle,
  PackagePlus,
  Maximize2,
} from 'lucide-react-native';
import type { LucideIcon } from 'lucide-react-native';

/** Registry of all available icons */
const ICON_REGISTRY: Record<string, LucideIcon> = {
  LayoutDashboard,
  Wallet,
  Package,
  Settings,
  MessageCircle,
  Building2,
  Banknote,
  TrendingUp,
  CreditCard,
  Car,
  Home,
  Smartphone,
  Laptop,
  Armchair,
  Plug,
  Watch,
  CheckCircle,
  Archive,
  DollarSign,
  Plus,
  Pencil,
  Trash2,
  X,
  Check,
  ChevronRight,
  ChevronDown,
  RefreshCw,
  Download,
  Upload,
  Filter,
  Search,
  Lock,
  Fingerprint,
  Palette,
  Moon,
  Globe,
  Target,
  FileJson,
  FileSpreadsheet,
  FileDown,
  HardDrive,
  Info,
  PieChart,
  BarChart3,
  Calendar,
  Clock,
  AlertCircle,
  PackagePlus,
  Maximize2,
};

export type IconName = keyof typeof ICON_REGISTRY;

interface IconProps {
  /** Icon name from the registry */
  name: string;
  /** Size in pixels (default: 24) */
  size?: number;
  /** Color: theme key or raw hex. Defaults to onSurface */
  color?: string;
  /** Stroke width (default: 2) */
  strokeWidth?: number;
}

/**
 * Theme-aware icon component.
 * Resolves color from theme if it matches a theme color key, otherwise uses raw value.
 */
export function Icon({ name, size = 24, color, strokeWidth = 2 }: IconProps) {
  const theme = useTheme();
  const IconComponent = ICON_REGISTRY[name];

  if (!IconComponent) {
    if (__DEV__) {
      console.warn(`Icon "${name}" not found in registry`);
    }
    return null;
  }

  // Resolve color: try theme color key first, fallback to raw value
  const resolvedColor = color
    ? ((theme.colors as unknown as Record<string, string>)[color] ?? color)
    : theme.colors.onSurface;

  return <IconComponent size={size} color={resolvedColor} strokeWidth={strokeWidth} />;
}
