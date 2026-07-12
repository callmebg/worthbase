/**
 * WorthBase Icon Mappings
 * Maps app concepts (tabs, account types, asset categories, actions) to Lucide icon names.
 */

import { AccountType } from '@/types/enums';
import { AssetCategory } from '@/types/enums';
import { AssetStatus } from '@/types/enums';

/** Tab bar icons */
export const TAB_ICONS = {
  index: 'LayoutDashboard',
  accounts: 'Wallet',
  assets: 'Package',
  settings: 'Settings',
} as const;

/** Account type icons */
export const ACCOUNT_TYPE_ICONS: Record<AccountType, string> = {
  [AccountType.WECHAT]: 'MessageCircle',
  [AccountType.ALIPAY]: 'Wallet',
  [AccountType.BANK_CARD]: 'Building2',
  [AccountType.CASH]: 'Banknote',
  [AccountType.FUND]: 'TrendingUp',
  [AccountType.OTHER]: 'CreditCard',
};

/** Asset category icons */
export const ASSET_CATEGORY_ICONS: Record<AssetCategory, string> = {
  [AssetCategory.VEHICLE]: 'Car',
  [AssetCategory.REAL_ESTATE]: 'Home',
  [AssetCategory.ELECTRONICS]: 'Smartphone',
  [AssetCategory.DIGITAL]: 'Laptop',
  [AssetCategory.FURNITURE]: 'Armchair',
  [AssetCategory.APPLIANCE]: 'Plug',
  [AssetCategory.LUXURY]: 'Watch',
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
