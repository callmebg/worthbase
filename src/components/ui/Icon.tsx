/**
 * WorthBase Icon Component
 * Wraps Lucide React Native icons with theme-aware color support.
 *
 * Usage: <Icon name="Wallet" size={24} color="primary" />
 * Icons are imported individually for tree-shaking.
 * ~310 icons registered for the icon picker.
 */

import React from 'react';
import { useTheme } from 'react-native-paper';
import {
  // ── Tab / Navigation ──
  LayoutDashboard, Settings,
  // ── Common Actions ──
  Plus, Pencil, Pen, Trash2, X, Check,
  ChevronRight, ChevronDown, ChevronLeft, ChevronUp,
  RotateCcw, RefreshCw, Download, Upload, Filter, Search,
  Lock, Fingerprint, Palette, Moon, Globe, Target,
  FileJson, FileSpreadsheet, FileDown, HardDrive,
  Info, Calendar, Clock, AlertCircle,
  PackagePlus, Maximize2, Archive, DollarSign, History, PenLine,
  // ── 交通出行 ──
  Car, CarFront, Bus, TrainFront, Plane, Ship, Truck, Motorbike, Bike,
  Scooter, Helicopter, Van, Ambulance, Sailboat, Anchor, LifeBuoy,
  Fuel, ParkingMeter, TrafficCone, Rocket, Navigation, MapPin, Map, Route,
  // ── 建筑房产 ──
  House, Building, Building2, Castle, Church, School, Hotel, Hospital,
  Warehouse, Landmark, Tent, Fence, Store,
  // ── 科技数码 ──
  Smartphone, Laptop, Tablet, Monitor, Camera, Video,
  Headphones, Keyboard, Mouse, Gamepad2, Tv, Speaker,
  Printer, Radio, Bluetooth, Wifi, Router, Server,
  Cpu, Gpu, Projector, Phone, PcCase, FileScan,
  BatteryFull, BatteryCharging, SignalHigh,
  // ── 家居家电 ──
  Sofa, Bed, BedDouble, BedSingle, Lamp, LampDesk, LampFloor,
  Bath, ShowerHead, Toilet, Armchair, CookingPot,
  Refrigerator, WashingMachine, Microwave, Blender, Fan, Heater, Bot,
  // ── 穿戴配饰 ──
  Watch, Shirt, ShoppingBag, Glasses, Crown, Gem,
  Scissors, HandMetal, Backpack, Briefcase, Handbag,
  HardHat, SportShoe, GraduationCap,
  // ── 金融财务 ──
  Wallet, CreditCard, Banknote, Coins, CircleDollarSign,
  PiggyBank, Receipt, Calculator, BadgeCheck, Tag,
  TrendingUp, TrendingDown, ChartPie, ChartBar,
  WalletCards, Vault, HandCoins,
  // ── 餐饮美食 ──
  Utensils, UtensilsCrossed, Coffee, Wine, Beer,
  Pizza, Cake, Sandwich, IceCreamCone, EggFried, Cherry,
  Soup, Salad, Apple, Banana, Grape, Milk, Egg,
  Croissant, Hamburger, Citrus, Martini, CupSoda, Beef, IceCreamBowl,
  // ── 运动户外 ──
  Dumbbell, Mountain, MountainSnow, Trophy, Medal, Flag, Timer, Flame,
  Volleyball,
  // ── 文娱休闲 ──
  Book, BookOpen, Music, Film, Clapperboard, Guitar, Mic,
  Ticket, Play, Popcorn, Piano, Drum, Podcast, Joystick, Puzzle, Dices,
  // ── 工具器械 ──
  Wrench, Hammer, Drill, Ruler, Compass, Cog, Paintbrush, Construction,
  Toolbox, Pin, PaintRoller, PaintBucket, Scale, CassetteTape,
  // ── 自然 / 动植物 ──
  TreePine, TreeDeciduous, TreePalm, Trees,
  Flower2, Rose, Sun, Cloud, CloudRain, Snowflake, Umbrella, Leaf,
  Wind, Zap, Bolt, Droplet, Waves,
  Bug, Dog, Cat, Bird, Fish, Rabbit, Turtle,
  // ── 通用 / 符号 ──
  Package, MoreHorizontal, CheckCircle, MessageCircle, MessageSquare,
  Baby, Gift, Star, Heart,
  Key, Shield, Bell,
  Circle, Square, Triangle,
  ArrowUp, ArrowDown, ArrowLeft, ArrowRight, ArrowUpDown,
  Minus, Copy, Clipboard,
  Eye, Ear, Hand, User, Users,
  ZoomIn, ZoomOut, Undo, Redo, Share, Save,
  Lightbulb, Power, Plug,
  Syringe, Pill, Thermometer, Microscope, Telescope,
  FlaskConical, FlaskRound, Atom, Brain, Diamond,
  File, Folder, Notebook, ClipboardPen, ClipboardList, PencilLine,
  FilePen, FileText, FileCode,
  CircleAlert, CircleX, CircleCheck,
  SquarePen, SquarePlus, SquareMinus,
  Eraser, ShoppingCart, TentTree,
} from 'lucide-react-native';
import type { LucideIcon } from 'lucide-react-native';

/** Registry of all available icons — also used by icon picker for validation */
export const ICON_REGISTRY: Record<string, LucideIcon> = {
  // ── Tab / Navigation ──
  LayoutDashboard, Settings,
  // ── Common Actions ──
  Plus, Pencil, Pen, Trash2, X, Check,
  ChevronRight, ChevronDown, ChevronLeft, ChevronUp,
  RotateCcw, RefreshCw, Download, Upload, Filter, Search,
  Lock, Fingerprint, Palette, Moon, Globe, Target,
  FileJson, FileSpreadsheet, FileDown, HardDrive,
  Info, Calendar, Clock, AlertCircle,
  PackagePlus, Maximize2, Archive, DollarSign, History, PenLine,
  // ── 交通出行 ──
  Car, CarFront, Bus, TrainFront, Plane, Ship, Truck, Motorbike, Bike,
  Scooter, Helicopter, Van, Ambulance, Sailboat, Anchor, LifeBuoy,
  Fuel, ParkingMeter, TrafficCone, Rocket, Navigation, MapPin, Map, Route,
  // ── 建筑房产 ──
  House, Building, Building2, Castle, Church, School, Hotel, Hospital,
  Warehouse, Landmark, Tent, Fence, Store,
  // ── 科技数码 ──
  Smartphone, Laptop, Tablet, Monitor, Camera, Video,
  Headphones, Keyboard, Mouse, Gamepad2, Tv, Speaker,
  Printer, Radio, Bluetooth, Wifi, Router, Server,
  Cpu, Gpu, Projector, Phone, PcCase, FileScan,
  BatteryFull, BatteryCharging, SignalHigh,
  // ── 家居家电 ──
  Sofa, Bed, BedDouble, BedSingle, Lamp, LampDesk, LampFloor,
  Bath, ShowerHead, Toilet, Armchair, CookingPot,
  Refrigerator, WashingMachine, Microwave, Blender, Fan, Heater, Bot,
  // ── 穿戴配饰 ──
  Watch, Shirt, ShoppingBag, Glasses, Crown, Gem,
  Scissors, HandMetal, Backpack, Briefcase, Handbag,
  HardHat, SportShoe, GraduationCap,
  // ── 金融财务 ──
  Wallet, CreditCard, Banknote, Coins, CircleDollarSign,
  PiggyBank, Receipt, Calculator, BadgeCheck, Tag,
  TrendingUp, TrendingDown, ChartPie, ChartBar,
  WalletCards, Vault, HandCoins,
  // ── 餐饮美食 ──
  Utensils, UtensilsCrossed, Coffee, Wine, Beer,
  Pizza, Cake, Sandwich, IceCreamCone, EggFried, Cherry,
  Soup, Salad, Apple, Banana, Grape, Milk, Egg,
  Croissant, Hamburger, Citrus, Martini, CupSoda, Beef, IceCreamBowl,
  // ── 运动户外 ──
  Dumbbell, Mountain, MountainSnow, Trophy, Medal, Flag, Timer, Flame,
  Volleyball,
  // ── 文娱休闲 ──
  Book, BookOpen, Music, Film, Clapperboard, Guitar, Mic,
  Ticket, Play, Popcorn, Piano, Drum, Podcast, Joystick, Puzzle, Dices,
  // ── 工具器械 ──
  Wrench, Hammer, Drill, Ruler, Compass, Cog, Paintbrush, Construction,
  Toolbox, Pin, PaintRoller, PaintBucket, Scale, CassetteTape,
  // ── 自然 / 动植物 ──
  TreePine, TreeDeciduous, TreePalm, Trees,
  Flower2, Rose, Sun, Cloud, CloudRain, Snowflake, Umbrella, Leaf,
  Wind, Zap, Bolt, Droplet, Waves,
  Bug, Dog, Cat, Bird, Fish, Rabbit, Turtle,
  // ── 通用 / 符号 ──
  Package, MoreHorizontal, CheckCircle, MessageCircle, MessageSquare,
  Baby, Gift, Star, Heart,
  Key, Shield, Bell,
  Circle, Square, Triangle,
  ArrowUp, ArrowDown, ArrowLeft, ArrowRight, ArrowUpDown,
  Minus, Copy, Clipboard,
  Eye, Ear, Hand, User, Users,
  ZoomIn, ZoomOut, Undo, Redo, Share, Save,
  Lightbulb, Power, Plug,
  Syringe, Pill, Thermometer, Microscope, Telescope,
  FlaskConical, FlaskRound, Atom, Brain, Diamond,
  File, Folder, Notebook, ClipboardPen, ClipboardList, PencilLine,
  FilePen, FileText, FileCode,
  CircleAlert, CircleX, CircleCheck,
  SquarePen, SquarePlus, SquareMinus,
  Eraser, ShoppingCart, TentTree,
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

/** All available icon names in the registry */
export const ALL_ICON_NAMES = Object.keys(ICON_REGISTRY);
