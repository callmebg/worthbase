/**
 * WorthBase Icon Mappings
 * Maps app concepts (tabs, account types, asset categories, actions) to Lucide icon names.
 * Also provides icon category metadata for the icon picker and icon resolution utilities.
 */

import { AccountType } from '@/types/enums';
import { AssetCategory } from '@/types/enums';
import { AssetStatus } from '@/types/enums';
import { ALL_ICON_NAMES } from '@/components/ui/Icon';

/** Tab bar icons */
export const TAB_ICONS = {
  index: 'LayoutDashboard',
  accounts: 'Wallet',
  assets: 'Package',
  settings: 'Settings',
} as const;

/** Account type default icons */
export const ACCOUNT_TYPE_ICONS: Record<AccountType, string> = {
  [AccountType.WECHAT]: 'MessageCircle',
  [AccountType.ALIPAY]: 'Wallet',
  [AccountType.BANK_CARD]: 'Building2',
  [AccountType.CASH]: 'Banknote',
  [AccountType.FUND]: 'TrendingUp',
  [AccountType.CREDIT_CARD]: 'CreditCard',
  [AccountType.LOAN]: 'HandCoins',
  [AccountType.OTHER]: 'MoreHorizontal',
};

/** Asset category default icons */
export const ASSET_CATEGORY_ICONS: Record<AssetCategory, string> = {
  [AssetCategory.VEHICLE]: 'Car',
  [AssetCategory.REAL_ESTATE]: 'Home',
  [AssetCategory.ELECTRONICS]: 'Smartphone',
  [AssetCategory.DIGITAL]: 'Laptop',
  [AssetCategory.HOME]: 'Sofa',
  [AssetCategory.LUXURY]: 'Watch',
  [AssetCategory.PRECIOUS_METAL]: 'Gem',
  [AssetCategory.OTHER]: 'Package',
};

/** Asset status icons */
export const ASSET_STATUS_ICONS: Record<AssetStatus, string> = {
  [AssetStatus.ACTIVE]: 'CheckCircle',
  [AssetStatus.RETIRED]: 'Archive',
  [AssetStatus.SOLD]: 'DollarSign',
};

/** Common action icons */
export const ACTION_ICONS = {
  add: 'Plus',
  edit: 'Pencil',
  delete: 'Trash2',
  close: 'X',
  check: 'Check',
  chevronRight: 'ChevronRight',
  chevronDown: 'ChevronDown',
  refresh: 'RefreshCw',
  download: 'Download',
  upload: 'Upload',
  filter: 'Filter',
  search: 'Search',
  lock: 'Lock',
  fingerprint: 'Fingerprint',
  palette: 'Palette',
  moon: 'Moon',
  globe: 'Globe',
  target: 'Target',
  fileJson: 'FileJson',
  fileSpreadsheet: 'FileSpreadsheet',
  fileDown: 'FileDown',
  hardDrive: 'HardDrive',
  info: 'Info',
  settings: 'Settings',
  pieChart: 'PieChart',
  barChart: 'BarChart3',
  calendar: 'Calendar',
  clock: 'Clock',
  alertCircle: 'AlertCircle',
} as const;

// ──────────────────────────────────────────────
// Icon Category Metadata (for IconPickerSheet)
// ──────────────────────────────────────────────

interface IconCategory {
  key: string;
  label: string;
  icons: string[];
}

/** 12 categories + all icons for icon picker browsing, ~270 icons total */
export const ICON_CATEGORIES: IconCategory[] = [
  {
    key: 'popular',
    label: '常用精选',
    icons: [
      'Car', 'House', 'Wallet', 'CreditCard', 'Smartphone',
      'Laptop', 'Tablet', 'Sofa', 'Watch', 'Gem',
      'Bike', 'Scooter', 'Building2', 'Camera', 'Headphones',
      'Coffee', 'Utensils', 'Dumbbell', 'Book', 'Music',
      'Wrench', 'Star', 'Heart', 'Plane', 'Banknote',
      'Gift', 'Dog', 'Fan', 'Bed', 'Pizza',
      'Trophy', 'Gamepad2', 'Backpack', 'Briefcase',
    ],
  },
  {
    key: 'transport',
    label: '交通出行',
    icons: [
      'Car', 'CarFront', 'Bus', 'TrainFront', 'Plane',
      'Ship', 'Truck', 'Motorbike', 'Bike', 'Scooter',
      'Helicopter', 'Van', 'Ambulance', 'Sailboat', 'Anchor',
      'LifeBuoy', 'Fuel', 'ParkingMeter', 'TrafficCone', 'Rocket',
      'Navigation', 'MapPin', 'Map', 'Route',
    ],
  },
  {
    key: 'building',
    label: '建筑房产',
    icons: [
      'House', 'Building', 'Building2', 'Castle', 'Church',
      'School', 'Hotel', 'Hospital', 'Warehouse', 'Landmark',
      'Tent', 'Fence', 'Store',
    ],
  },
  {
    key: 'tech',
    label: '科技数码',
    icons: [
      'Smartphone', 'Laptop', 'Tablet', 'Monitor', 'Camera',
      'Video', 'Headphones', 'Keyboard', 'Mouse', 'Gamepad2',
      'Tv', 'Speaker', 'Printer', 'HardDrive', 'Radio',
      'Bluetooth', 'Wifi', 'Router', 'Server',
      'Cpu', 'Gpu', 'Projector', 'Phone', 'PcCase',
      'FileScan', 'BatteryFull', 'BatteryCharging', 'SignalHigh',
    ],
  },
  {
    key: 'home',
    label: '家居家电',
    icons: [
      'Sofa', 'Bed', 'BedDouble', 'BedSingle', 'Lamp',
      'LampDesk', 'LampFloor', 'Bath', 'ShowerHead', 'Toilet',
      'Armchair', 'CookingPot', 'Refrigerator', 'WashingMachine',
      'Microwave', 'Blender', 'Fan', 'Heater', 'Bot',
    ],
  },
  {
    key: 'wearable',
    label: '穿戴配饰',
    icons: [
      'Watch', 'Shirt', 'ShoppingBag', 'Glasses', 'Crown',
      'Gem', 'Scissors', 'HandMetal', 'Backpack', 'Briefcase',
      'Handbag', 'HardHat', 'SportShoe', 'GraduationCap',
    ],
  },
  {
    key: 'finance',
    label: '金融财务',
    icons: [
      'Wallet', 'CreditCard', 'Banknote', 'Coins', 'CircleDollarSign',
      'PiggyBank', 'Receipt', 'Calculator', 'BadgeCheck', 'Tag',
      'TrendingUp', 'TrendingDown', 'ChartPie', 'ChartBar',
      'WalletCards', 'Vault', 'HandCoins', 'DollarSign',
    ],
  },
  {
    key: 'food',
    label: '餐饮美食',
    icons: [
      'Utensils', 'UtensilsCrossed', 'Coffee', 'Wine', 'Beer',
      'Pizza', 'Cake', 'Sandwich', 'IceCreamCone', 'IceCreamBowl',
      'EggFried', 'Cherry', 'Soup', 'Salad', 'Apple',
      'Banana', 'Grape', 'Milk', 'Egg', 'Croissant',
      'Hamburger', 'Citrus', 'Martini', 'CupSoda', 'Beef',
    ],
  },
  {
    key: 'sport',
    label: '运动户外',
    icons: [
      'Dumbbell', 'Bike', 'Mountain', 'MountainSnow', 'Trophy',
      'Medal', 'Flag', 'Timer', 'Flame', 'Volleyball',
      'Sailboat', 'Tent', 'TentTree', 'Route',
    ],
  },
  {
    key: 'entertainment',
    label: '文娱休闲',
    icons: [
      'Book', 'BookOpen', 'Music', 'Film', 'Clapperboard',
      'Palette', 'Guitar', 'Mic', 'Ticket', 'Play',
      'Popcorn', 'Piano', 'Drum', 'Podcast', 'Joystick',
      'Puzzle', 'Dices',
    ],
  },
  {
    key: 'tools',
    label: '工具器械',
    icons: [
      'Wrench', 'Hammer', 'Drill', 'Ruler', 'Compass',
      'Cog', 'Settings', 'Paintbrush', 'Construction',
      'Toolbox', 'Pin', 'PaintRoller', 'PaintBucket',
      'Scale', 'CassetteTape', 'Scissors',
      'Syringe', 'Pill', 'Thermometer', 'Microscope',
      'Telescope', 'FlaskConical', 'FlaskRound',
    ],
  },
  {
    key: 'nature',
    label: '自然杂项',
    icons: [
      'TreePine', 'TreeDeciduous', 'TreePalm', 'Trees',
      'Flower2', 'Rose', 'Sun', 'Cloud', 'CloudRain',
      'Snowflake', 'Umbrella', 'Leaf', 'Wind', 'Zap',
      'Bolt', 'Droplet', 'Waves',
      'Bug', 'Dog', 'Cat', 'Bird', 'Fish', 'Rabbit', 'Turtle',
      'Baby', 'Gift', 'Star', 'Heart', 'Globe',
      'Package', 'MoreHorizontal', 'Diamond',
      'Atom', 'Brain', 'Lightbulb',
    ],
  },
];

// ──────────────────────────────────────────────
// Icon Resolution Utilities
// ──────────────────────────────────────────────

/** Check if an icon name exists in the registry */
function isValidIcon(name: string | null): name is string {
  if (!name) return false;
  return ALL_ICON_NAMES.includes(name);
}

/**
 * Resolve the display icon for an asset.
 * Priority: custom icon → category default → 'Package' fallback
 */
export function resolveAssetIcon(icon: string | null, category: AssetCategory): string {
  if (isValidIcon(icon)) return icon;
  return ASSET_CATEGORY_ICONS[category] || 'Package';
}

/**
 * Resolve the display icon for an account.
 * Priority: custom icon → type default → 'CreditCard' fallback
 */
export function resolveAccountIcon(icon: string | null, type: AccountType): string {
  if (isValidIcon(icon)) return icon;
  return ACCOUNT_TYPE_ICONS[type] || 'CreditCard';
}
