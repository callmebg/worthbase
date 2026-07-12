/**
 * WorthBase (家底) - Dashboard Tab (总览)
 * Shows net worth card, asset breakdown, trend chart, holding cost summary, quick actions.
 * Redesigned with design system, Paper components, and Lucide icons.
 */

import { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  Dimensions,
  RefreshControl,
  TouchableOpacity,
  Alert,
  Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAppTheme } from '@/utils/format';
import { useFocusEffect, useRouter } from 'expo-router';
import * as ScreenOrientation from 'expo-screen-orientation';
import { InteractiveTrendChart } from '@/components/InteractiveTrendChart';
import { useAccountStore } from '@/stores/account-store';
import { useAssetStore } from '@/stores/asset-store';
import { useSettingsStore } from '@/stores/settings-store';
import { NetWorthCalculator } from '@/engine/NetWorthCalculator';
import { HoldingCostCalculator } from '@/engine/HoldingCostCalculator';
import { getStrategy } from '@/engine/strategies';
import { BalanceSnapshotRepository } from '@/db/balance-snapshot-repository';
import { ValuationRepository } from '@/db/valuation-repository';
import { AssetStatus, AssetCategoryLabels } from '@/types/enums';
import { ASSET_CATEGORY_ICONS } from '@/theme/icons';
import type { NetWorthResult, ValuationHistory } from '@/types/models';
import { formatCurrency, formatCompactCurrency } from '@/utils/format';
import { AppCard } from '@/components/ui/Card';
import { AppChip } from '@/components/ui/Chip';
import { Icon } from '@/components/ui/Icon';
import { OnboardingView } from '@/components/OnboardingView';
import { TimeRangeSheet, type TimeRangeState, type TimeRangePreset } from '@/components/TimeRangeSheet';

const screenWidth = Dimensions.get('window').width;

export default function DashboardScreen() {
  const router = useRouter();
  const theme = useAppTheme();
  const { accounts, balances, loadAccounts } = useAccountStore();
  const { assets, loadAssets } = useAssetStore();
  const { netWorthGoal, currencySymbol } = useSettingsStore();

  const [netWorth, setNetWorth] = useState<NetWorthResult | null>(null);
  const [totalMonthlyCost, setTotalMonthlyCost] = useState(0);
  const [costBreakdown, setCostBreakdown] = useState<{ name: string; cost: number; category: string }[]>([]);
  const [categoryBreakdown, setCategoryBreakdown] = useState<{ category: string; label: string; value: number }[]>([]);
  const [trendData, setTrendData] = useState<{ labels: string[]; datasets: { data: number[] }[] }>({ labels: [], datasets: [{ data: [] }] });
  const [timeRange, setTimeRange] = useState<TimeRangeState>('6m');
  const [refreshing, setRefreshing] = useState(false);
  const [fullscreenChart, setFullscreenChart] = useState(false);
  const [fullscreenKey, setFullscreenKey] = useState(0);
  const [sheetVisible, setSheetVisible] = useState(false);

  // Lock to landscape when fullscreen chart is open
  useEffect(() => {
    if (fullscreenChart) {
      ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.LANDSCAPE);
    } else {
      ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.PORTRAIT);
    }
  }, [fullscreenChart]);

  // Show onboarding when no accounts exist
  if (accounts.length === 0) {
    return <OnboardingView />;
  }

  const loadData = useCallback(async () => {
    const now = new Date();
    const nw = await NetWorthCalculator.calculate(now);
    setNetWorth(nw);

    const activeAssets = assets.filter(a => a.status === AssetStatus.ACTIVE);
    const totalMC = await HoldingCostCalculator.getTotalMonthly(activeAssets, now);
    setTotalMonthlyCost(totalMC);

    // Per-asset cost breakdown
    const allResults = await HoldingCostCalculator.calculateAll(activeAssets, now);
    const breakdown = activeAssets.map(asset => {
      const result = allResults.get(asset.id);
      return {
        name: asset.name,
        cost: result?.monthlyTotal ?? 0,
        category: asset.category,
      };
    }).filter(b => b.cost > 0).sort((a, b) => b.cost - a.cost);
    setCostBreakdown(breakdown);

    // Category breakdown for visualization
    const catMap = new Map<string, number>();
    for (const asset of activeAssets) {
      const result = allResults.get(asset.id);
      const val = result?.currentValuation ?? 0;
      catMap.set(asset.category, (catMap.get(asset.category) ?? 0) + val);
    }
    const catBreakdown = Array.from(catMap.entries())
      .map(([category, value]) => ({
        category,
        label: AssetCategoryLabels[category as keyof typeof AssetCategoryLabels] || category,
        value,
      }))
      .filter(c => c.value > 0)
      .sort((a, b) => b.value - a.value);
    setCategoryBreakdown(catBreakdown);

    // ── Trend data: same formula as hero card ──────────────────────────────────
    // net worth = liquid assets + asset valuations − unamortized cost
    const activeAccountIds = new Set(accounts.map(a => a.id));
    const trackedAssets = activeAssets.filter(a => a.valuationTracking);

    // Pre-fetch all valuation histories ONCE (not inside the date loop)
    const valuationHistories = new Map<string, ValuationHistory[]>();
    for (const asset of trackedAssets) {
      const history = await ValuationRepository.getByAsset(asset.id);
      valuationHistories.set(asset.id, history); // already ASC ordered by recorded_date
    }

    // Determine date range boundaries
    const allDates = await BalanceSnapshotRepository.getAllSnapshotDates(); // DESC
    let cutoffStr: string;
    let endStr = '9999-12-31';
    if (typeof timeRange === 'string') {
      // Preset
      const curMonth = now.getMonth() + 1;
      const curYear = now.getFullYear();
      if (timeRange === '3m') {
        const d = new Date(curYear, curMonth - 3, 1);
        cutoffStr = d.toISOString().substring(0, 10);
      } else if (timeRange === '6m') {
        const d = new Date(curYear, curMonth - 6, 1);
        cutoffStr = d.toISOString().substring(0, 10);
      } else if (timeRange === '1y') {
        const d = new Date(curYear, curMonth - 12, 1);
        cutoffStr = d.toISOString().substring(0, 10);
      } else if (timeRange === 'ytd') {
        cutoffStr = `${curYear}-01-01`;
      } else {
        // 'all' — no cutoff
        cutoffStr = '0000-01-01';
      }
    } else {
      // Custom range { start, end } — YYYY-MM format
      cutoffStr = timeRange.start + '-01';
      // End of the end month
      const [ey, em] = timeRange.end.split('-').map(Number);
      const endOfMonth = new Date(ey, em, 0); // last day of the month
      endStr = endOfMonth.toISOString().substring(0, 10);
    }
    // Keep only snapshots within range, then reverse to chronological (ASC) order
    const recentDates = allDates.filter(d => d >= cutoffStr && d <= endStr).reverse();

    // Compute net worth for EVERY date in range first (before downsampling)
    const allPoints: { date: string; value: number }[] = [];
    for (const date of recentDates) {
      const dateObj = new Date(date + 'T00:00:00');

      // 1. Liquid assets — only from active (non-deleted) accounts
      const balMap = await BalanceSnapshotRepository.getBalancesForDate(date);
      let totalBalance = 0;
      for (const [accountId, b] of balMap.entries()) {
        if (activeAccountIds.has(accountId)) totalBalance += b;
      }

      // 2. Asset valuations — lookup in pre-fetched history (reverse scan for latest ≤ date)
      let totalValuation = 0;
      for (const asset of trackedAssets) {
        const history = valuationHistories.get(asset.id) ?? [];
        let latestVal: number | null = null;
        for (let i = history.length - 1; i >= 0; i--) {
          if (history[i].recordedDate <= date) {
            latestVal = history[i].valuation;
            break;
          }
        }
        // Fallback to purchase price if no valuation record exists before this date
        totalValuation += latestVal ?? asset.purchasePrice;
      }

      // 3. Unamortized cost — same strategy as hero card
      let totalUnamortized = 0;
      for (const asset of activeAssets) {
        const strategy = getStrategy(asset);
        totalUnamortized += strategy.calculateRemaining(asset, dateObj);
      }

      allPoints.push({ date, value: totalBalance + totalValuation - totalUnamortized });
    }

    // Downsample to ≤ MAX_POINTS preserving peaks and valleys
    const MAX_POINTS = 24;
    const sampled = allPoints.length > MAX_POINTS
      ? downsamplePreservingExtrema(allPoints, MAX_POINTS)
      : allPoints;

    const labels = sampled.map(p => p.date.substring(5));
    const points = sampled.map(p => p.value);
    setTrendData({ labels, datasets: [{ data: points }] });
  }, [assets, accounts, timeRange]);

  useFocusEffect(useCallback(() => {
    loadAccounts();
    loadAssets();
  }, []));

  useEffect(() => {
    loadData();
  }, [loadData]);

  const onRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  const progress = netWorthGoal ? Math.min(100, (netWorth?.netWorth ?? 0) / netWorthGoal * 100) : 0;
  const totalCatValue = categoryBreakdown.reduce((s, c) => s + c.value, 0);

  const timeRangeLabels: Record<TimeRangePreset, string> = {
    '3m': '3月',
    '6m': '6月',
    '1y': '1年',
    'ytd': '今年',
    'all': '全部',
  };
  const presetKeys: TimeRangePreset[] = ['6m', 'ytd'];
  const isCustomRange = typeof timeRange !== 'string';
  const rangeDisplayText = isCustomRange
    ? `${timeRange.start.replace('-', '.')} – ${timeRange.end.replace('-', '.')}`
    : '';

  return (
    <>
    <ScrollView
      style={[styles.container, { backgroundColor: theme.colors.background }]}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={onRefresh}
          tintColor={theme.colors.primary}
        />
      }
    >
      {/* ── Net Worth Hero Card ── */}
      <View style={[styles.heroCard, { backgroundColor: theme.colors.primary }]}>
        <View style={styles.heroLabelRow}>
          <Text style={styles.heroLabel}>总净资产</Text>
          <TouchableOpacity
            onPress={() =>
              Alert.alert(
                '净资产计算方式',
                '净资产 = 流动资产 + 资产估值 - 未分摊成本\n\n' +
                '• 流动资产：所有账户最新余额之和（账户页）\n' +
                '• 资产估值：已开启估值追踪的在用资产的当前估值之和（资产页）\n' +
                '• 未分摊成本：各资产购入价中尚未分摊完毕的部分\n\n' +
                '通俗理解：如果今天把所有东西按估值卖掉，再扣除还没"消费完"的购入成本，你实际剩多少。',
              )
            }
            style={styles.infoIconBtn}
          >
            <Icon name="Info" size={14} color="#fff" />
          </TouchableOpacity>
        </View>
        <Text style={styles.heroAmount}>
          {formatCurrency(netWorth?.netWorth ?? 0, currencySymbol)}
        </Text>

        {netWorthGoal ? (
          <View style={styles.progressRow}>
            <View style={styles.progressBar}>
              <View style={[styles.progressFill, { width: `${progress}%` }]} />
            </View>
            <Text style={styles.progressText}>
              {progress.toFixed(0)}% / {formatCompactCurrency(netWorthGoal, currencySymbol)}
            </Text>
          </View>
        ) : null}

        <View style={styles.breakdownRow}>
          <Text style={styles.breakdownOp}>=</Text>
          <View style={styles.breakdownItem}>
            <Text style={styles.breakdownLabel}>流动资产</Text>
            <Text style={styles.breakdownValue}>
              {formatCompactCurrency(netWorth?.liquidAssets ?? 0, currencySymbol)}
            </Text>
          </View>
          <Text style={styles.breakdownOp}>+</Text>
          <View style={styles.breakdownItem}>
            <Text style={styles.breakdownLabel}>资产估值</Text>
            <Text style={styles.breakdownValue}>
              {formatCompactCurrency(netWorth?.assetValuations ?? 0, currencySymbol)}
            </Text>
          </View>
          <Text style={styles.breakdownOp}>-</Text>
          <View style={styles.breakdownItem}>
            <Text style={styles.breakdownLabel}>未分摊成本</Text>
            <Text style={styles.breakdownValue}>
              {formatCompactCurrency(netWorth?.unamortizedCost ?? 0, currencySymbol)}
            </Text>
          </View>
        </View>
      </View>

      {/* ── Asset Category Visualization ── */}
      {categoryBreakdown.length > 0 && (
        <AppCard style={styles.section}>
          <Text style={[styles.sectionTitle, { color: theme.colors.onSurface }]}>
            资产分类
          </Text>
          {categoryBreakdown.map((cat) => {
            const pct = totalCatValue > 0 ? (cat.value / totalCatValue * 100) : 0;
            const iconName = ASSET_CATEGORY_ICONS[cat.category as keyof typeof ASSET_CATEGORY_ICONS] || 'Package';
            return (
              <View key={cat.category} style={styles.catRow}>
                <Icon name={iconName} size={18} color="onSurfaceVariant" />
                <Text style={[styles.catLabel, { color: theme.colors.onSurface }]}>{cat.label}</Text>
                <View style={[styles.catBarBg, { backgroundColor: theme.colors.surfaceVariant }]}>
                  <View style={[styles.catBarFill, { width: `${pct}%`, backgroundColor: theme.colors.primary }]} />
                </View>
                <Text style={[styles.catPct, { color: theme.colors.onSurfaceVariant }]}>
                  {pct.toFixed(0)}%
                </Text>
              </View>
            );
          })}
        </AppCard>
      )}

      {/* ── Trend Chart ── */}
      <AppCard style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={[styles.sectionTitle, { color: theme.colors.onSurface }]}>
            净资产趋势
          </Text>
          <View style={styles.chartHeaderRight}>
            {isCustomRange ? (
              /* Custom range bar: back + range text + calendar */
              <View style={styles.customRangeBar}>
                <TouchableOpacity
                  onPress={() => setTimeRange('6m')}
                  style={styles.backToPresetBtn}
                  hitSlop={8}
                >
                  <Icon name="ChevronLeft" size={18} color="onSurfaceVariant" />
                </TouchableOpacity>
                <TouchableOpacity onPress={() => setSheetVisible(true)} style={styles.rangeTextBtn}>
                  <Text style={[styles.rangeTextValue, { color: theme.colors.primary }]}>
                    {rangeDisplayText}
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={() => setSheetVisible(true)} style={styles.calendarBtn}>
                  <Icon name="Calendar" size={18} color="onSurfaceVariant" />
                </TouchableOpacity>
              </View>
            ) : (
              /* Preset chips + calendar */
              <View style={styles.rangeToggle}>
                {presetKeys.map(r => (
                  <AppChip
                    key={r}
                    label={timeRangeLabels[r]}
                    selected={timeRange === r}
                    onPress={() => setTimeRange(r)}
                    compact
                    style={styles.rangeChip}
                  />
                ))}
                <TouchableOpacity
                  onPress={() => setSheetVisible(true)}
                  style={styles.calendarBtn}
                >
                  <Icon name="Calendar" size={18} color="onSurfaceVariant" />
                </TouchableOpacity>
              </View>
            )}
            {trendData.datasets[0].data.length > 1 && (
              <TouchableOpacity
                onPress={() => { setFullscreenKey(k => k + 1); setFullscreenChart(true); }}
                style={styles.fullscreenBtn}
              >
                <Icon name="Maximize2" size={18} color="onSurfaceVariant" />
              </TouchableOpacity>
            )}
          </View>
        </View>
        {trendData.datasets[0].data.length > 1 ? (
          <>
          <InteractiveTrendChart
            data={{ labels: trendData.labels, values: trendData.datasets[0].data }}
            width={screenWidth - 64}
            height={200}
            currencySymbol={currencySymbol}
            backgroundColor={theme.colors.surface}
            primaryColor={theme.colors.primary}
            labelColor={theme.colors.onSurfaceVariant}
            gridColor={theme.colors.surfaceVariant}
            goalValue={netWorthGoal}
          />
          {/* ── Period change delta ── */}
          {(() => {
            const data = trendData.datasets[0].data;
            const first = data[0], last = data[data.length - 1];
            const delta = last - first;
            const pct = first !== 0 ? (delta / Math.abs(first) * 100) : 0;
            const isPositive = delta >= 0;
            return (
              <View style={styles.deltaRow}>
                <Text style={[styles.deltaLabel, { color: theme.colors.onSurfaceVariant }]}>
                  期间变化
                </Text>
                <Text style={[styles.deltaValue, { color: isPositive ? '#00B894' : '#EA3943' }]}>
                  {isPositive ? '+' : ''}{formatCurrency(delta, currencySymbol)}
                  {' '}({isPositive ? '+' : ''}{pct.toFixed(1)}%)
                </Text>
              </View>
            );
          })()}
          </>
        ) : (
          <View style={styles.emptyChart}>
            <Icon name="BarChart3" size={32} color="onSurfaceVariant" />
            <Text style={[styles.emptyText, { color: theme.colors.onSurfaceVariant }]}>
              暂无趋势数据
            </Text>
            <Text style={[styles.emptySubtext, { color: theme.colors.tertiary }]}>
              更新余额后会生成趋势
            </Text>
          </View>
        )}
      </AppCard>

      {/* ── Holding Cost Summary ── */}
      <AppCard style={styles.section}>
        <Text style={[styles.sectionTitle, { color: theme.colors.onSurface }]}>
          持有成本汇总
        </Text>
        <View style={[styles.costInner, { backgroundColor: theme.colors.surfaceVariant }]}>
          <View style={styles.costRow}>
            <Text style={[styles.costLabel, { color: theme.colors.onSurfaceVariant }]}>
              月持有成本
            </Text>
            <Text style={[styles.costValuePrimary, { color: theme.colors.primary }]}>
              {formatCurrency(totalMonthlyCost, currencySymbol)}/月
            </Text>
          </View>
          <View style={styles.costRow}>
            <Text style={[styles.costLabel, { color: theme.colors.onSurfaceVariant }]}>
              日均持有成本
            </Text>
            <Text style={[styles.costValue, { color: theme.colors.onSurface }]}>
              {formatCurrency(totalMonthlyCost / 30, currencySymbol)}/天
            </Text>
          </View>
          <Text style={[styles.costTag, { color: theme.colors.tertiary }]}>
            养你所有的东西
          </Text>
        </View>

        {costBreakdown.length > 0 && (
          <View style={styles.costBreakdownList}>
            {costBreakdown.map((item, i) => {
              const pct = totalMonthlyCost > 0 ? (item.cost / totalMonthlyCost * 100) : 0;
              const iconName = ASSET_CATEGORY_ICONS[item.category as keyof typeof ASSET_CATEGORY_ICONS] || 'Package';
              return (
                <View
                  key={i}
                  style={[styles.costBreakdownRow, { borderBottomColor: theme.colors.outline }]}
                >
                  <Icon name={iconName} size={18} color="onSurfaceVariant" />
                  <Text style={[styles.costBreakdownName, { color: theme.colors.onSurface }]}>
                    {item.name}
                  </Text>
                  <View style={[styles.costPctBarBg, { backgroundColor: theme.colors.surfaceVariant }]}>
                    <View style={[styles.costPctBarFill, { width: `${pct}%`, backgroundColor: theme.colors.primary }]} />
                  </View>
                  <Text style={[styles.costBreakdownPct, { color: theme.colors.onSurfaceVariant }]}>
                    {pct.toFixed(0)}%
                  </Text>
                  <Text style={[styles.costBreakdownCost, { color: theme.colors.onSurface }]}>
                    {formatCurrency(item.cost, currencySymbol)}
                  </Text>
                </View>
              );
            })}
          </View>
        )}
      </AppCard>

      {/* ── Quick Actions ── */}
      <View style={styles.quickActions}>
        <AppCard
          onPress={() => router.push('/accounts')}
          style={styles.quickBtn}
        >
          <View style={styles.quickBtnContent}>
            <Icon name="Wallet" size={28} color="primary" />
            <Text style={[styles.quickBtnText, { color: theme.colors.onSurfaceVariant }]}>
              更新余额
            </Text>
          </View>
        </AppCard>
        <AppCard
          onPress={() => router.push('/assets')}
          style={styles.quickBtn}
        >
          <View style={styles.quickBtnContent}>
            <Icon name="PackagePlus" size={28} color="primary" />
            <Text style={[styles.quickBtnText, { color: theme.colors.onSurfaceVariant }]}>
              添加资产
            </Text>
          </View>
        </AppCard>
        <AppCard
          onPress={() => router.push('/settings')}
          style={styles.quickBtn}
        >
          <View style={styles.quickBtnContent}>
            <Icon name="Download" size={28} color="primary" />
            <Text style={[styles.quickBtnText, { color: theme.colors.onSurfaceVariant }]}>
              导出数据
            </Text>
          </View>
        </AppCard>
      </View>
    </ScrollView>

    {/* ── Fullscreen Chart Modal ── */}
    <Modal
      visible={fullscreenChart}
      animationType="slide"
      transparent={false}
      onRequestClose={() => setFullscreenChart(false)}
      statusBarTranslucent
    >
      <SafeAreaView style={[styles.fullscreenContainer, { backgroundColor: theme.colors.background }]}>
        {/* Header: close LEFT, title center, range RIGHT */}
        <View style={styles.fullscreenHeader}>
          <TouchableOpacity
            onPress={() => setFullscreenChart(false)}
            style={styles.closeBtn}
            hitSlop={{ top: 16, bottom: 16, left: 16, right: 16 }}
          >
            <Icon name="X" size={24} color="onSurface" />
          </TouchableOpacity>
          <Text style={[styles.fullscreenTitle, { color: theme.colors.onSurface }]}>
            净资产趋势
          </Text>
          <View style={styles.fullscreenRange}>
            {isCustomRange ? (
              <TouchableOpacity onPress={() => setSheetVisible(true)} style={styles.fsCustomRange}>
                <Text style={[styles.fsCustomRangeText, { color: theme.colors.primary }]}>
                  {rangeDisplayText}
                </Text>
                <Icon name="Calendar" size={16} color="primary" />
              </TouchableOpacity>
            ) : (
              <>
                {presetKeys.map(r => (
                  <AppChip
                    key={r}
                    label={timeRangeLabels[r]}
                    selected={timeRange === r}
                    onPress={() => setTimeRange(r)}
                    compact
                  />
                ))}
                <TouchableOpacity onPress={() => setSheetVisible(true)} style={styles.calendarBtn}>
                  <Icon name="Calendar" size={16} color="onSurfaceVariant" />
                </TouchableOpacity>
              </>
            )}
          </View>
        </View>

        {/* Chart area — flex:1 fills remaining, onLayout gives real dims */}
        <View style={styles.fullscreenChartWrap}>
          <InteractiveTrendChart
            key={fullscreenKey}
            data={{ labels: trendData.labels, values: trendData.datasets[0].data }}
            currencySymbol={currencySymbol}
            backgroundColor={theme.colors.surface}
            primaryColor={theme.colors.primary}
            labelColor={theme.colors.onSurfaceVariant}
            gridColor={theme.colors.surfaceVariant}
            goalValue={netWorthGoal}
          />
        </View>
      </SafeAreaView>
    </Modal>

    {/* ── Time Range Picker Sheet ── */}
    <TimeRangeSheet
      visible={sheetVisible}
      onClose={() => setSheetVisible(false)}
      onConfirm={(range) => {
        setTimeRange(range);
        setSheetVisible(false);
      }}
      currentRange={timeRange}
    />
    </>
  );
}

/**
 * Downsample time-series data while preserving peaks and valleys.
 * Uses a bucket-based approach: for each bucket, keep the most extreme point
 * (alternating min/max based on distance from neighbor average).
 * Always preserves the first and last points.
 */
function downsamplePreservingExtrema(
  points: { date: string; value: number }[],
  maxPoints: number
): { date: string; value: number }[] {
  if (points.length <= maxPoints) return points;
  const result: { date: string; value: number }[] = [points[0]];
  const bucketCount = maxPoints - 2; // interior buckets (first and last are always kept)
  const interiorPoints = points.slice(1, -1);
  const bucketSize = interiorPoints.length / bucketCount;

  for (let b = 0; b < bucketCount; b++) {
    const start = Math.floor(b * bucketSize);
    const end = Math.min(Math.floor((b + 1) * bucketSize), interiorPoints.length);
    const bucket = interiorPoints.slice(start, end);
    if (bucket.length === 0) continue;

    // Find the point with max absolute deviation from the line between
    // the previous kept point and the last data point
    const prevVal = result[result.length - 1].value;
    const lastVal = points[points.length - 1].value;
    const avg = (prevVal + lastVal) / 2;
    let bestIdx = 0;
    let bestDist = -1;
    for (let j = 0; j < bucket.length; j++) {
      const dist = Math.abs(bucket[j].value - avg);
      if (dist > bestDist) { bestDist = dist; bestIdx = j; }
    }
    result.push(bucket[bestIdx]);
  }
  result.push(points[points.length - 1]);
  return result;
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  // Hero card
  heroCard: {
    margin: 16,
    borderRadius: 20,
    padding: 24,
    shadowColor: '#000',
    shadowOpacity: 0.12,
    shadowRadius: 16,
    elevation: 6,
  },
  heroLabelRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  heroLabel: { color: '#fff', fontSize: 14, opacity: 0.85 },
  infoIconBtn: { opacity: 0.7, padding: 2 },
  heroAmount: { color: '#fff', fontSize: 36, fontWeight: '700', marginTop: 4 },
  progressRow: { flexDirection: 'row', alignItems: 'center', marginTop: 12, gap: 8 },
  progressBar: { flex: 1, height: 6, backgroundColor: 'rgba(255,255,255,0.3)', borderRadius: 3 },
  progressFill: { height: 6, borderRadius: 3, backgroundColor: '#fff' },
  progressText: { color: '#fff', fontSize: 12, opacity: 0.8 },
  breakdownRow: { flexDirection: 'row', marginTop: 16, alignItems: 'center', justifyContent: 'center', gap: 4 },
  breakdownOp: { color: '#fff', fontSize: 13, opacity: 0.6, fontWeight: '500' },
  breakdownItem: { alignItems: 'center' },
  breakdownLabel: { color: '#fff', fontSize: 11, opacity: 0.7 },
  breakdownValue: { color: '#fff', fontSize: 14, fontWeight: '600', marginTop: 2 },
  // Sections
  section: { marginHorizontal: 16, marginBottom: 16 },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  sectionTitle: { fontSize: 16, fontWeight: '700' },
  // Category breakdown
  catRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 8, gap: 8 },
  catLabel: { fontSize: 13, width: 52 },
  catBarBg: { flex: 1, height: 8, borderRadius: 4, overflow: 'hidden' },
  catBarFill: { height: 8, borderRadius: 4 },
  catPct: { fontSize: 12, width: 36, textAlign: 'right' },
  // Range toggle
  rangeToggle: { flexDirection: 'row' },
  chartHeaderRight: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  fullscreenBtn: { padding: 4 },
  rangeChip: { marginRight: 4, marginBottom: 0 },
  // Chart
  chart: { borderRadius: 8, marginTop: 8 },
  emptyChart: { height: 180, alignItems: 'center', justifyContent: 'center', gap: 8 },
  emptyText: { fontSize: 15, fontWeight: '500' },
  emptySubtext: { fontSize: 12 },
  // Delta row
  deltaRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 12, paddingHorizontal: 4 },
  deltaLabel: { fontSize: 13 },
  deltaValue: { fontSize: 14, fontWeight: '600' },
  // Cost
  costInner: { borderRadius: 12, padding: 16, marginTop: 8 },
  costRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  costLabel: { fontSize: 14 },
  costValue: { fontSize: 18, fontWeight: '700' },
  costValuePrimary: { fontSize: 18, fontWeight: '700' },
  costTag: { fontSize: 12, marginTop: 4, fontStyle: 'italic' },
  costBreakdownList: { marginTop: 12 },
  costBreakdownRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, borderBottomWidth: StyleSheet.hairlineWidth, gap: 8 },
  costBreakdownName: { flex: 1, fontSize: 14 },
  costPctBarBg: { width: 40, height: 6, borderRadius: 3, overflow: 'hidden' },
  costPctBarFill: { height: 6, borderRadius: 3 },
  costBreakdownPct: { fontSize: 12, width: 36, textAlign: 'right' },
  costBreakdownCost: { fontSize: 14, fontWeight: '600', width: 80, textAlign: 'right' },
  // Quick actions
  quickActions: { flexDirection: 'row', paddingHorizontal: 16, gap: 12, paddingBottom: 32 },
  quickBtn: { flex: 1 },
  quickBtnContent: { alignItems: 'center', paddingVertical: 8 },
  quickBtnText: { fontSize: 12, marginTop: 8 },
  // Fullscreen chart
  fullscreenContainer: { flex: 1 },
  fullscreenHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingVertical: 8,
    minHeight: 52,
  },
  fullscreenTitle: { fontSize: 16, fontWeight: '700', flex: 1, textAlign: 'center' },
  closeBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(128,128,128,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  fullscreenRange: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  fullscreenChartWrap: { flex: 1, paddingHorizontal: 8, paddingBottom: 4 },
  // Custom range controls
  calendarBtn: { padding: 6 },
  backToPresetBtn: { padding: 4 },
  rangeTextBtn: { paddingHorizontal: 4 },
  rangeTextValue: { fontSize: 13, fontWeight: '600' },
  customRangeBar: { flexDirection: 'row', alignItems: 'center', gap: 2 },
  fsCustomRange: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  fsCustomRangeText: { fontSize: 13, fontWeight: '600' },
});
