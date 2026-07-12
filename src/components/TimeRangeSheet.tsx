/**
 * TimeRangeSheet — bottom-sheet date range picker for the trend chart.
 *
 * Two interaction modes:
 * 1. Quick presets: tap a chip → immediately applies and closes.
 * 2. Custom range: scroll year/month wheels, tap 确定.
 *
 * Uses real ScrollView-based scroll wheels with snap behavior.
 */

import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  Pressable,
  ScrollView,
  useWindowDimensions,
} from 'react-native';
import { useAppTheme } from '@/utils/format';
import { AppChip } from '@/components/ui/Chip';

/* ── types ──────────────────────────────────────────────── */

export type TimeRangePreset = '3m' | '6m' | '1y' | 'ytd' | 'all';

export type TimeRangeState =
  | TimeRangePreset
  | { start: string; end: string }; // YYYY-MM format

interface Props {
  visible: boolean;
  onClose: () => void;
  onConfirm: (range: TimeRangeState) => void;
  currentRange: TimeRangeState;
}

/* ── constants ──────────────────────────────────────────── */

const ITEM_HEIGHT = 40;
const VISIBLE_ITEMS = 3; // show 3 rows: above / selected / below
const SCROLL_HEIGHT = ITEM_HEIGHT * VISIBLE_ITEMS;
const PADDING_ITEMS = 1; // spacer items at top/bottom so edges can center

const MIN_YEAR = 2015;
const MAX_YEAR = new Date().getFullYear() + 1;
const YEARS = Array.from({ length: MAX_YEAR - MIN_YEAR + 1 }, (_, i) => MIN_YEAR + i);
const MONTHS = Array.from({ length: 12 }, (_, i) => `${i + 1}月`);

const QUICK_PRESETS: { key: TimeRangePreset; label: string }[] = [
  { key: '3m', label: '近3月' },
  { key: '6m', label: '近6月' },
  { key: '1y', label: '近1年' },
  { key: 'ytd', label: '今年' },
  { key: 'all', label: '全部历史' },
];

/* ── helpers ────────────────────────────────────────────── */

function toYYYYMM(y: number, m: number): string {
  return `${y}-${String(m).padStart(2, '0')}`;
}

function monthsBetween(y1: number, m1: number, y2: number, m2: number): number {
  return (y2 - y1) * 12 + (m2 - m1) + 1;
}

/* ── ScrollWheel ────────────────────────────────────────── */

function ScrollWheel({
  items,
  selectedIndex,
  onSelect,
  labelColor,
  surfaceColor,
  primaryColor,
}: {
  items: (string | number)[];
  selectedIndex: number;
  onSelect: (index: number) => void;
  labelColor: string;
  surfaceColor: string;
  primaryColor: string;
}) {
  const scrollRef = useRef<ScrollView>(null);
  const isScrollingRef = useRef(false);

  // Scroll to selected item on mount / when selectedIndex changes externally
  useEffect(() => {
    if (!isScrollingRef.current) {
      scrollRef.current?.scrollTo({
        y: selectedIndex * ITEM_HEIGHT,
        animated: false,
      });
    }
  }, [selectedIndex]);

  const handleMomentumEnd = useCallback(
    (e: { nativeEvent: { contentOffset: { y: number } } }) => {
      isScrollingRef.current = false;
      const idx = Math.round(e.nativeEvent.contentOffset.y / ITEM_HEIGHT);
      const clamped = Math.max(0, Math.min(items.length - 1, idx));
      onSelect(clamped);
    },
    [items.length, onSelect],
  );

  const handleScrollBegin = useCallback(() => {
    isScrollingRef.current = true;
  }, []);

  return (
    <View style={[styles.wheelContainer, { backgroundColor: surfaceColor, borderRadius: 10 }]}>
      {/* Highlight bar behind selected item */}
      <View
        style={[
          styles.wheelHighlight,
          {
            top: ITEM_HEIGHT * PADDING_ITEMS,
            height: ITEM_HEIGHT,
            backgroundColor: primaryColor + '18',
            borderRadius: 8,
          },
        ]}
        pointerEvents="none"
      />
      <ScrollView
        ref={scrollRef}
        style={{ height: SCROLL_HEIGHT }}
        contentContainerStyle={{ paddingVertical: ITEM_HEIGHT * PADDING_ITEMS }}
        showsVerticalScrollIndicator={false}
        snapToInterval={ITEM_HEIGHT}
        snapToAlignment="start"
        decelerationRate="fast"
        onMomentumScrollEnd={handleMomentumEnd}
        onScrollBeginDrag={handleScrollBegin}
      >
        {items.map((item, idx) => {
          const isSelected = idx === selectedIndex;
          return (
            <View key={idx} style={[styles.wheelItem, { height: ITEM_HEIGHT }]}>
              <Text
                style={[
                  styles.wheelItemText,
                  {
                    color: isSelected ? primaryColor : labelColor,
                    fontWeight: isSelected ? '700' : '400',
                    fontSize: isSelected ? 17 : 15,
                    opacity: isSelected ? 1 : 0.5,
                  },
                ]}
              >
                {item}
              </Text>
            </View>
          );
        })}
      </ScrollView>
    </View>
  );
}

/* ── YearMonthPicker ────────────────────────────────────── */

function YearMonthPicker({
  label,
  year,
  month,
  onChange,
  labelColor,
  surfaceColor,
  primaryColor,
}: {
  label: string;
  year: number;
  month: number; // 1-12
  onChange: (y: number, m: number) => void;
  labelColor: string;
  surfaceColor: string;
  primaryColor: string;
}) {
  const yearIndex = YEARS.indexOf(year);
  const monthIndex = month - 1;

  const onYearSelect = useCallback(
    (idx: number) => onChange(YEARS[idx], month),
    [month, onChange],
  );

  const onMonthSelect = useCallback(
    (idx: number) => onChange(year, idx + 1),
    [year, onChange],
  );

  return (
    <View style={styles.pickerGroup}>
      <Text style={[styles.pickerLabel, { color: labelColor }]}>{label}</Text>
      <View style={styles.pickerRow}>
        <ScrollWheel
          items={YEARS}
          selectedIndex={yearIndex >= 0 ? yearIndex : 0}
          onSelect={onYearSelect}
          labelColor={labelColor}
          surfaceColor={surfaceColor}
          primaryColor={primaryColor}
        />
        <ScrollWheel
          items={MONTHS}
          selectedIndex={monthIndex}
          onSelect={onMonthSelect}
          labelColor={labelColor}
          surfaceColor={surfaceColor}
          primaryColor={primaryColor}
        />
      </View>
    </View>
  );
}

/* ── main component ─────────────────────────────────────── */

export const TimeRangeSheet: React.FC<Props> = ({
  visible,
  onClose,
  onConfirm,
  currentRange,
}) => {
  const theme = useAppTheme();
  const { height: windowHeight } = useWindowDimensions();
  const now = new Date();

  const [startYear, setStartYear] = useState(now.getFullYear());
  const [startMonth, setStartMonth] = useState(Math.max(1, now.getMonth() - 4));
  const [endYear, setEndYear] = useState(now.getFullYear());
  const [endMonth, setEndMonth] = useState(now.getMonth() + 1);

  // Reset picker state when sheet opens
  useEffect(() => {
    if (!visible) return;
    const endY = now.getFullYear();
    const endM = now.getMonth() + 1;
    let startY = endY;
    let startM = endM;

    if (typeof currentRange === 'string') {
      if (currentRange === '3m') startM = endM - 2;
      else if (currentRange === '6m') startM = endM - 5;
      else if (currentRange === '1y') startM = endM - 11;
      else if (currentRange === 'ytd') { startY = endY; startM = 1; }
      else if (currentRange === 'all') { startY = MIN_YEAR; startM = 1; }
      while (startM <= 0) { startM += 12; startY -= 1; }
    } else {
      const [sy, sm] = currentRange.start.split('-').map(Number);
      const [ey, em] = currentRange.end.split('-').map(Number);
      startY = sy; startM = sm;
      setEndYear(ey); setEndMonth(em);
    }

    setStartYear(Math.max(MIN_YEAR, startY));
    setStartMonth(Math.max(1, Math.min(12, startM)));
    if (typeof currentRange === 'string') {
      setEndYear(endY);
      setEndMonth(endM);
    }
  }, [visible, currentRange]);

  const totalMonths = monthsBetween(startYear, startMonth, endYear, endMonth);
  const isRangeValid =
    totalMonths >= 1 &&
    (startYear < endYear || (startYear === endYear && startMonth <= endMonth));

  const handleStartChange = useCallback((y: number, m: number) => {
    setStartYear(y);
    setStartMonth(m);
  }, []);

  const handleEndChange = useCallback((y: number, m: number) => {
    setEndYear(y);
    setEndMonth(m);
  }, []);

  const handleQuickPreset = useCallback(
    (key: TimeRangePreset) => onConfirm(key),
    [onConfirm],
  );

  const handleConfirm = useCallback(() => {
    if (!isRangeValid) return;
    onConfirm({
      start: toYYYYMM(startYear, startMonth),
      end: toYYYYMM(endYear, endMonth),
    });
  }, [isRangeValid, startYear, startMonth, endYear, endMonth, onConfirm]);

  const handleReset = useCallback(() => onConfirm('6m'), [onConfirm]);

  if (!visible) return null;

  const colors = {
    label: theme.colors.onSurfaceVariant,
    surface: theme.colors.surfaceVariant,
    bg: theme.colors.surface,
    primary: theme.colors.primary,
    onSurface: theme.colors.onSurface,
    outline: theme.colors.outline,
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
      statusBarTranslucent
    >
      {/* Backdrop and sheet are siblings — nesting ScrollView inside Pressable blocks scroll gestures */}
      <Pressable style={styles.backdrop} onPress={onClose} />
      <View style={styles.sheetPositioner} pointerEvents="box-none">
        <View
          style={[styles.sheet, { backgroundColor: colors.bg, height: windowHeight * 0.85 }]}
        >
          {/* Scrollable content area */}
          <ScrollView
            style={styles.scrollArea}
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
            bounces={false}
          >
            {/* Drag handle */}
            <View style={styles.handleWrap}>
              <View style={[styles.handle, { backgroundColor: colors.outline }]} />
            </View>

            {/* Title row */}
            <View style={styles.titleRow}>
              <Text style={[styles.title, { color: colors.onSurface }]}>选择时间范围</Text>
              <TouchableOpacity onPress={onClose} hitSlop={12}>
                <Text style={[styles.closeText, { color: colors.label }]}>✕</Text>
              </TouchableOpacity>
            </View>

            {/* Quick presets */}
            <View style={styles.presetWrap}>
              {QUICK_PRESETS.map((p) => (
                <AppChip
                  key={p.key}
                  label={p.label}
                  selected={currentRange === p.key}
                  onPress={() => handleQuickPreset(p.key)}
                  compact
                />
              ))}
            </View>

            <View style={[styles.divider, { backgroundColor: colors.outline }]} />

            {/* Pickers */}
            <YearMonthPicker
              label="起始月份"
              year={startYear}
              month={startMonth}
              onChange={handleStartChange}
              labelColor={colors.label}
              surfaceColor={colors.surface}
              primaryColor={colors.primary}
            />

            <YearMonthPicker
              label="结束月份"
              year={endYear}
              month={endMonth}
              onChange={handleEndChange}
              labelColor={colors.label}
              surfaceColor={colors.surface}
              primaryColor={colors.primary}
            />

            {/* Summary */}
            <View style={styles.summaryRow}>
              <Text style={[styles.summaryText, { color: colors.label }]}>
                {startYear}年{startMonth}月 → {endYear}年{endMonth}月
              </Text>
              <Text
                style={[
                  styles.summaryMonths,
                  { color: isRangeValid ? colors.primary : '#EA3943' },
                ]}
              >
                {isRangeValid ? `共${totalMonths}个月` : '起始不能晚于结束'}
              </Text>
            </View>
          </ScrollView>

          {/* Action buttons — pinned at bottom */}
          <View style={styles.actionRow}>
            <TouchableOpacity
              onPress={handleReset}
              style={[styles.resetBtn, { borderColor: colors.outline }]}
            >
              <Text style={[styles.resetBtnText, { color: colors.label }]}>重置为预设</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={handleConfirm}
              disabled={!isRangeValid}
              style={[
                styles.confirmBtn,
                { backgroundColor: isRangeValid ? colors.primary : colors.surface },
              ]}
            >
              <Text
                style={[
                  styles.confirmBtnText,
                  { color: isRangeValid ? '#fff' : colors.label },
                ]}
              >
                确定
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

/* ── styles ─────────────────────────────────────────────── */

const styles = StyleSheet.create({
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.45)',
  },
  sheetPositioner: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'flex-end',
  },
  sheet: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingHorizontal: 20,
    paddingBottom: 32,
  },
  scrollArea: { flex: 1 },
  scrollContent: { paddingBottom: 12 },
  handleWrap: { alignItems: 'center', paddingTop: 10, paddingBottom: 8 },
  handle: { width: 36, height: 4, borderRadius: 2 },
  titleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  title: { fontSize: 17, fontWeight: '700' },
  closeText: { fontSize: 18, fontWeight: '600', padding: 4 },
  presetWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 16 },
  divider: { height: StyleSheet.hairlineWidth, marginBottom: 20 },
  // Picker
  pickerGroup: { marginBottom: 20 },
  pickerLabel: { fontSize: 13, fontWeight: '600', marginBottom: 8 },
  pickerRow: { flexDirection: 'row', gap: 12 },
  wheelContainer: { flex: 1, overflow: 'hidden' },
  wheelHighlight: { position: 'absolute', left: 4, right: 4, zIndex: 0 },
  wheelItem: { alignItems: 'center', justifyContent: 'center' },
  wheelItemText: { textAlign: 'center' },
  // Summary
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  summaryText: { fontSize: 14 },
  summaryMonths: { fontSize: 14, fontWeight: '600' },
  // Actions
  actionRow: { flexDirection: 'row', gap: 12 },
  resetBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
  },
  resetBtnText: { fontSize: 15, fontWeight: '600' },
  confirmBtn: { flex: 1, paddingVertical: 14, borderRadius: 12, alignItems: 'center' },
  confirmBtnText: { fontSize: 15, fontWeight: '700' },
});
