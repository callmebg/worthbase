/**
 * WorthBase (家底) - Dashboard Tab (总览)
 * Shows net worth card, asset breakdown, trend chart, holding cost summary, quick actions.
 * Redesigned with design system, Paper components, and Lucide icons.
 */

import { useEffect, useLayoutEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  Dimensions,
  RefreshControl,
  TouchableOpacity,
  Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAppTheme, formatCurrency, formatCompactCurrency } from '@/utils/format';
import { useFocusEffect, useRouter, useNavigation } from 'expo-router';
import * as ScreenOrientation from 'expo-screen-orientation';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { InteractiveTrendChart } from '@/components/InteractiveTrendChart';
import { useAccountStore } from '@/stores/account-store';
import { useAssetStore } from '@/stores/asset-store';
import { useSettingsStore } from '@/stores/settings-store';
import { NetWorthCalculator } from '@/engine/NetWorthCalculator';
import { ProjectionCalculator } from '@/engine/ProjectionCalculator';
import type { ProjectionDetail } from '@/engine/ProjectionCalculator';
import { GoalProjectionExplainer } from '@/components/GoalProjectionExplainer';
import { HoldingCostCalculator } from '@/engine/HoldingCostCalculator';
import { UsageCalculator } from '@/engine/UsageCalculator';
import { BalanceSnapshotRepository } from '@/db/balance-snapshot-repository';
import { ValuationRepository } from '@/db/valuation-repository';
import { AssetStatus, AssetCategoryLabels } from '@/types/enums';
import { ASSET_CATEGORY_ICONS, resolveAssetIcon } from '@/theme/icons';
import { spacing, radius } from '@/theme/tokens';
import type { NetWorthResult, ValuationHistory, UsageResult } from '@/types/models';
import { AppCard } from '@/components/ui/Card';
import { AppChip } from '@/components/ui/Chip';
import { Icon } from '@/components/ui/Icon';
import { useToast } from '@/hooks/useToast';
import { FORTUNES } from '@/utils/fortunes';
import { Settings } from 'lucide-react-native';
import { OnboardingView } from '@/components/OnboardingView';
import { TimeRangeSheet, type TimeRangeState, type TimeRangePreset } from '@/components/TimeRangeSheet';
import { NetWorthExplainer } from '@/components/NetWorthExplainer';
import { AppBottomSheet } from '@/components/ui/BottomSheet';
import { AppTextInput } from '@/components/ui/TextInput';
import { AppButton } from '@/components/ui/Button';

const screenWidth = Dimensions.get('window').width;

export default function DashboardScreen() {
  const router = useRouter();
  const navigation = useNavigation();
  const theme = useAppTheme();

  // Settings gear in header bar
  useLayoutEffect(() => {
    navigation.setOptions({
      headerRight: () => (
        <TouchableOpacity
          onPress={() => router.push('/settings')}
          style={{ marginRight: 8 }}
          hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
        >
          <Settings size={20} color={theme.colors.onSurface} strokeWidth={2} />
        </TouchableOpacity>
      ),
    });
  }, [navigation, router, theme.colors.onSurface]);
  const { accounts, balances, loadAccounts } = useAccountStore();
  const { assets, loadAssets } = useAssetStore();
  const { netWorthGoal, currencySymbol, update } = useSettingsStore();
  const toast = useToast();

  const [netWorth, setNetWorth] = useState<NetWorthResult | null>(null);
  const [totalMonthlyCost, setTotalMonthlyCost] = useState(0);
  const [costBreakdown, setCostBreakdown] = useState<{ name: string; cost: number; category: string }[]>([]);
  const [categoryBreakdown, setCategoryBreakdown] = useState<{ category: string; label: string; value: number }[]>([]);
  const [trendData, setTrendData] = useState<{ labels: string[]; fullDates: string[]; datasets: { data: number[] }[] }>({ labels: [], fullDates: [], datasets: [{ data: [] }] });
  const [allTrendData, setAllTrendData] = useState<{ labels: string[]; fullDates: string[]; datasets: { data: number[] }[] }>({ labels: [], fullDates: [], datasets: [{ data: [] }] });
  const [timeRange, setTimeRange] = useState<TimeRangeState>('6m');
  const [refreshing, setRefreshing] = useState(false);
  const [fullscreenChart, setFullscreenChart] = useState(false);
  const [fullscreenKey, setFullscreenKey] = useState(0);
  const [sheetVisible, setSheetVisible] = useState(false);
  const [showExplainer, setShowExplainer] = useState(false);
  const [achievementDate, setAchievementDate] = useState<string | null>(null);
  const [projectionDetail, setProjectionDetail] = useState<ProjectionDetail | null>(null);
  const [showProjectionExplainer, setShowProjectionExplainer] = useState(false);
  const [showGoalSheet, setShowGoalSheet] = useState(false);
  const [goalInput, setGoalInput] = useState('');

  // Usage/cost-per-use state
  const [usageMap, setUsageMap] = useState<Map<string, UsageResult>>(new Map());

  // Lock to landscape when fullscreen chart is open
  useEffect(() => {
    if (fullscreenChart) {
      ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.LANDSCAPE);
    } else {
      ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.PORTRAIT);
    }
  }, [fullscreenChart]);

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

    // Usage data for cost-per-use dashboard insights
    const usageResults = await UsageCalculator.calculateAll(activeAssets);
    setUsageMap(usageResults);

    // Category breakdown for visualization
    // 口径必须与资产页 totalValuation 一致（assets.tsx: currentValuation ?? purchasePrice），
    // 否则分类占比加总对不上「资产总值」。
    // 注意：原先误从 HoldingCostResult 取 currentValuation —— 该类型没有此字段，
    // 恒为 undefined → val 恒为 0 → 全部被 filter(value > 0) 剔除，此结果始终为空。
    const catMap = new Map<string, number>();
    for (const asset of activeAssets) {
      const val = asset.currentValuation ?? asset.purchasePrice;
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
    // net worth = account balances + asset valuations
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

    // ALL dates in chronological order (for fullscreen chart with gesture navigation)
    const allDatesChrono = [...allDates].reverse();

    // Pre-compute balance totals and valuations for each date (reused for both filtered and full data)
    const balanceTotals = new Map<string, number>();
    const valuationTotals = new Map<string, number>();

    // 1. Fetch ALL snapshots once and compute running balance per date.
    //    This fixes the bug where only accounts with a snapshot on the exact
    //    date were counted — now we carry forward the last known balance for
    //    every account, so unchanged accounts are still included.
    const allSnapshots = await BalanceSnapshotRepository.getAllSnapshotsChronological();
    const runningBalances = new Map<string, number>();
    let snapIdx = 0;
    for (const date of allDatesChrono) {
      while (snapIdx < allSnapshots.length && allSnapshots[snapIdx].snapshotDate <= date) {
        runningBalances.set(allSnapshots[snapIdx].accountId, allSnapshots[snapIdx].balance);
        snapIdx++;
      }
      let totalBalance = 0;
      for (const [accountId, b] of runningBalances.entries()) {
        if (activeAccountIds.has(accountId)) totalBalance += b;
      }
      balanceTotals.set(date, totalBalance);

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
      valuationTotals.set(date, totalValuation);
    }

    // Filtered data (for overview chart, hero card, projection)
    const allPoints: { date: string; value: number }[] = recentDates.map(date => ({
      date,
      value: (balanceTotals.get(date) ?? 0) + (valuationTotals.get(date) ?? 0),
    }));

    // Full data (for fullscreen chart — gestures need full data for operating space)
    const allPointsFull: { date: string; value: number }[] = allDatesChrono.map(date => ({
      date,
      value: (balanceTotals.get(date) ?? 0) + (valuationTotals.get(date) ?? 0),
    }));

    // Estimate goal achievement date based on historical trend
    if (netWorthGoal && allPoints.length >= 2) {
      const detail = ProjectionCalculator.estimateProjectionDetail(allPoints, netWorthGoal);
      setAchievementDate(detail?.achievementDate ?? null);
      setProjectionDetail(detail);
    } else {
      setAchievementDate(null);
      setProjectionDetail(null);
    }

    // Filtered data for overview chart
    const labels = allPoints.map(p => p.date.substring(5));
    const fullDates = allPoints.map(p => p.date);
    const points = allPoints.map(p => p.value);
    setTrendData({ labels, fullDates, datasets: [{ data: points }] });

    // Full data for fullscreen chart
    const allLabels = allPointsFull.map(p => p.date.substring(5));
    const allFullDates = allPointsFull.map(p => p.date);
    const allValues = allPointsFull.map(p => p.value);
    setAllTrendData({ labels: allLabels, fullDates: allFullDates, datasets: [{ data: allValues }] });
  }, [assets, accounts, timeRange, netWorthGoal]);

  useFocusEffect(useCallback(() => {
    loadAccounts();
    loadAssets();
  }, []));

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Show onboarding when no accounts exist
  if (accounts.length === 0) {
    return <OnboardingView />;
  }

  const onRefresh = () => {
    setRefreshing(true);
    const fortune = FORTUNES[Math.floor(Math.random() * FORTUNES.length)];
    toast.show(fortune, 'success', 2500);
    setTimeout(() => setRefreshing(false), 400);
  };

  const progress = netWorthGoal ? Math.min(100, (netWorth?.netWorth ?? 0) / netWorthGoal * 100) : 0;
  const progressWidth = Math.max(0, progress);
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

  const handleSaveGoal = async () => {
    const goal = parseFloat(goalInput) || null;
    await update({ netWorthGoal: goal });
    setGoalInput('');
    setShowGoalSheet(false);
  };

  const handleClearGoal = async () => {
    await update({ netWorthGoal: null });
    setShowGoalSheet(false);
  };

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
          <View style={styles.heroLabelLeft}>
            <Text style={[styles.heroLabel, { color: theme.colors.onPrimary }]}>净资产</Text>
            <TouchableOpacity
              onPress={() => setShowExplainer(true)}
              style={styles.infoIconBtn}
            >
              <Icon name="Info" size={14} color={theme.colors.onPrimary} />
            </TouchableOpacity>
          </View>
          <TouchableOpacity
            onPress={() => setShowGoalSheet(true)}
            style={styles.goalIconBtn}
          >
            <Icon name="Target" size={16} color={theme.colors.onPrimary} />
          </TouchableOpacity>
        </View>
        <Text style={[styles.heroAmount, { color: theme.colors.onPrimary }]}>
          {formatCurrency(netWorth?.netWorth ?? 0, currencySymbol)}
        </Text>

        {netWorthGoal ? (
          <View style={styles.progressRow}>
            <View style={styles.progressBar}>
              <View style={[styles.progressFill, { width: `${progressWidth}%`, backgroundColor: theme.colors.onPrimary }]} />
            </View>
            <Text style={[styles.progressText, { color: theme.colors.onPrimary }, progress < 0 && { color: theme.colors.error }]}>
              {progress.toFixed(0)}% / {formatCompactCurrency(netWorthGoal, currencySymbol)}
            </Text>
          </View>
        ) : null}

        {netWorthGoal && progress < 100 && (
          <TouchableOpacity
            onPress={() => projectionDetail && setShowProjectionExplainer(true)}
            disabled={!projectionDetail}
            hitSlop={8}
          >
            <Text style={[styles.goalHint, { color: theme.colors.onPrimary }, projectionDetail && { textDecorationLine: 'underline' }]}>
              {achievementDate
                ? `预计 ${achievementDate.substring(0, 4)}年${achievementDate.substring(5, 7)}月 达成`
                : '按当前趋势暂无法预估'}
            </Text>
          </TouchableOpacity>
        )}

      </View>

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
            data={{ labels: trendData.labels, fullDates: trendData.fullDates, values: trendData.datasets[0].data }}
            height={200}
            currencySymbol={currencySymbol}
            backgroundColor={theme.colors.surface}
            primaryColor={theme.colors.primary}
            labelColor={theme.colors.onSurfaceVariant}
            gridColor={theme.colors.surfaceVariant}
            goalValue={netWorthGoal}
            lossColor={theme.colors.error}
            goalColor={theme.colors.warning}
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
                <Text style={[styles.deltaValue, { color: isPositive ? theme.colors.error : theme.colors.success }]}>
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
            {costBreakdown.slice(0, 3).map((item, i) => {
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
            <TouchableOpacity
              onPress={() => router.push('/assets')}
              style={styles.viewAllBtn}
            >
              <Text style={{ color: theme.colors.primary, fontSize: 14 }}>
                查看全部 {costBreakdown.length} 项 →
              </Text>
            </TouchableOpacity>
          </View>
        )}
      </AppCard>

      {/* ── Cost-Per-Use Insights ── */}
      {assets.filter(a => a.status === AssetStatus.ACTIVE).length > 0 && (
        <AppCard style={styles.section}>
          <Text style={[styles.sectionTitle, { color: theme.colors.onSurface }]}>
            次均成本洞察
          </Text>

          {/* Unified ranking: top 3 by cost-per-use with inline neglect badges */}
          <View style={styles.usageList}>
            {(() => {
              const activeAssets = assets.filter(a => a.status === AssetStatus.ACTIVE);
              const ranked = activeAssets
                .map(a => ({ asset: a, usage: usageMap.get(a.id) }))
                .filter(({ usage }) => usage && usage.useCount > 0)
                .sort((a, b) => (b.usage?.costPerUse ?? 0) - (a.usage?.costPerUse ?? 0))
                .slice(0, 3);

              if (ranked.length === 0) {
                return (
                  <Text style={[styles.usageEmpty, { color: theme.colors.tertiary }]}>
                    还没有使用记录，去资产页记录第一次使用吧
                  </Text>
                );
              }

              return ranked.map(({ asset, usage }, i) => {
                const iconName = resolveAssetIcon(asset.icon, asset.category);
                return (
                  <View key={asset.id} style={[styles.usageRow, i < ranked.length - 1 && { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: theme.colors.outline }]}>
                    <Icon name={iconName} size={20} color={usage!.isNeglected ? 'warning' : 'primary'} />
                    <View style={styles.usageNameWrap}>
                      <Text style={[styles.usageName, { color: theme.colors.onSurface }]} numberOfLines={1}>
                        {asset.name}
                      </Text>
                      {usage!.isNeglected && (
                        <Text style={[styles.usageNeglectBadge, { color: theme.colors.warning }]}>
                          闲置{usage!.daysSinceLastUse}天
                        </Text>
                      )}
                    </View>
                    <View style={styles.usageRight}>
                      <Text style={[styles.usageCostPerUse, { color: theme.colors.primary }]}>
                        次均 {formatCurrency(usage!.costPerUse, currencySymbol)}
                      </Text>
                      <Text style={[styles.usageCount, { color: theme.colors.onSurfaceVariant }]}>
                        用了{usage!.useCount}次
                      </Text>
                    </View>
                  </View>
                );
              });
            })()}
          </View>

          <TouchableOpacity
            onPress={() => router.push('/assets')}
            style={styles.viewAllBtn}
          >
            <Text style={{ color: theme.colors.primary, fontSize: 14 }}>
              查看全部资产 →
            </Text>
          </TouchableOpacity>
        </AppCard>
      )}

    </ScrollView>

    {/* ── Fullscreen Chart Modal ── */}
    <Modal
      visible={fullscreenChart}
      animationType="slide"
      transparent={false}
      onRequestClose={() => setFullscreenChart(false)}
      statusBarTranslucent
    >
      <GestureHandlerRootView style={styles.fullscreenContainer}>
      <SafeAreaView style={[styles.fullscreenContainer, { backgroundColor: theme.colors.background }]}>
        {/* Header: close LEFT, title center */}
        <View style={styles.fullscreenHeader}>
          <TouchableOpacity
            onPress={() => setFullscreenChart(false)}
            style={styles.closeBtn}
            hitSlop={{ top: 16, bottom: 16, left: 16, right: 16 }}
          >
            <Icon name="X" size={20} color="onSurface" />
          </TouchableOpacity>
          <Text style={[styles.fullscreenTitle, { color: theme.colors.onSurface }]}>
            净资产趋势
          </Text>
        </View>

        {/* Chart area — flex:1 fills remaining, onLayout gives real dims */}
        <View style={styles.fullscreenChartWrap}>
          <InteractiveTrendChart
            key={fullscreenKey}
            data={{ labels: allTrendData.labels, fullDates: allTrendData.fullDates, values: allTrendData.datasets[0].data }}
            currencySymbol={currencySymbol}
            backgroundColor={theme.colors.surface}
            primaryColor={theme.colors.primary}
            labelColor={theme.colors.onSurfaceVariant}
            gridColor={theme.colors.surfaceVariant}
            goalValue={netWorthGoal}
            lossColor={theme.colors.error}
            goalColor={theme.colors.warning}
            mode="fullscreen"
          />
        </View>
      </SafeAreaView>
      </GestureHandlerRootView>
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

    {/* ── Net Worth Explainer Sheet ── */}
    <NetWorthExplainer
      visible={showExplainer}
      onClose={() => setShowExplainer(false)}
    />

    {/* ── Goal Projection Explainer Sheet ── */}
    <GoalProjectionExplainer
      visible={showProjectionExplainer}
      onClose={() => setShowProjectionExplainer(false)}
      projection={projectionDetail}
      goal={netWorthGoal ?? 0}
      currencySymbol={currencySymbol}
    />

    {/* ── Net Worth Goal Sheet ── */}
    <AppBottomSheet visible={showGoalSheet} onClose={() => { setShowGoalSheet(false); setGoalInput(''); }} snapPoints={['50%']}>
      <Text style={[styles.sheetTitle, { color: theme.colors.onSurface }]}>设置净资产目标</Text>
      {netWorthGoal ? (
        <Text style={[styles.currentGoalText, { color: theme.colors.onSurfaceVariant }]}>
          当前目标：{formatCurrency(netWorthGoal, currencySymbol)}
        </Text>
      ) : null}
      <AppTextInput bottomSheet
        label="目标金额"
        value={goalInput}
        onChangeText={setGoalInput}
        keyboardType="decimal-pad"
        autoFocus
      />
      <View style={styles.sheetActions}>
        <AppButton title="取消" variant="text" onPress={() => { setShowGoalSheet(false); setGoalInput(''); }} style={{ flex: 1 }} />
        <AppButton title="保存" variant="primary" onPress={handleSaveGoal} disabled={!goalInput.trim()} style={{ flex: 1 }} />
      </View>
      {netWorthGoal ? (
        <AppButton title="清除目标" variant="text" onPress={handleClearGoal} style={{ marginTop: spacing.sm }} />
      ) : null}
    </AppBottomSheet>
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
    margin: spacing.md,
    borderRadius: radius.lg,
    padding: spacing.lg,
    shadowColor: '#000',
    shadowOpacity: 0.12,
    shadowRadius: 16,
    elevation: 6,
  },
  heroLabelRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  heroLabelLeft: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  goalIconBtn: { opacity: 0.7, padding: 2 },
  heroLabel: { fontSize: 14, opacity: 0.85 },
  infoIconBtn: { opacity: 0.7, padding: 2 },
  heroAmount: { fontSize: 36, fontWeight: '700', marginTop: spacing.xs },
  progressRow: { flexDirection: 'row', alignItems: 'center', marginTop: spacing.sm + spacing.xs, gap: spacing.sm },
  progressBar: { flex: 1, height: 6, backgroundColor: 'rgba(255,255,255,0.3)', borderRadius: 3 },
  progressFill: { height: 6, borderRadius: 3 },
  progressText: { fontSize: 12, opacity: 0.8 },
  goalHint: { fontSize: 12, marginTop: 6, opacity: 0.7 },
  breakdownRow: { flexDirection: 'row', marginTop: spacing.md, alignItems: 'center', justifyContent: 'center', gap: spacing.xs },
  breakdownOp: { fontSize: 13, opacity: 0.6, fontWeight: '500' },
  breakdownItem: { alignItems: 'center' },
  breakdownLabel: { fontSize: 11, opacity: 0.7 },
  breakdownValue: { fontSize: 14, fontWeight: '600', marginTop: 2 },
  // Sections
  section: { marginHorizontal: spacing.md, marginBottom: spacing.md },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  sectionTitle: { fontSize: 16, fontWeight: '700' },
  // Category breakdown
  catRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: spacing.sm, gap: spacing.sm },
  catLabel: { fontSize: 13, width: 52 },
  catBarBg: { flex: 1, height: 8, borderRadius: 4, overflow: 'hidden' },
  catBarFill: { height: 8, borderRadius: 4 },
  catPct: { fontSize: 12, width: 36, textAlign: 'right' },
  // Range toggle
  rangeToggle: { flexDirection: 'row' },
  chartHeaderRight: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  fullscreenBtn: { padding: spacing.xs },
  rangeChip: { marginRight: spacing.xs, marginBottom: 0 },
  // Chart
  chart: { borderRadius: 8, marginTop: spacing.sm },
  emptyChart: { height: 180, alignItems: 'center', justifyContent: 'center', gap: spacing.sm },
  emptyText: { fontSize: 15, fontWeight: '500' },
  emptySubtext: { fontSize: 12 },
  // Delta row
  deltaRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: spacing.sm + spacing.xs, paddingHorizontal: spacing.xs },
  deltaLabel: { fontSize: 13 },
  deltaValue: { fontSize: 14, fontWeight: '600' },
  // Cost
  costInner: { borderRadius: 12, padding: spacing.md, marginTop: spacing.sm },
  costRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.sm },
  costLabel: { fontSize: 14 },
  costValue: { fontSize: 18, fontWeight: '700' },
  costValuePrimary: { fontSize: 18, fontWeight: '700' },
  costTag: { fontSize: 12, marginTop: spacing.xs, fontStyle: 'italic' },
  costBreakdownList: { marginTop: spacing.sm + spacing.xs },
  costBreakdownRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, borderBottomWidth: StyleSheet.hairlineWidth, gap: spacing.sm },
  costBreakdownName: { flex: 1, fontSize: 14 },
  costPctBarBg: { width: 40, height: 6, borderRadius: 3, overflow: 'hidden' },
  costPctBarFill: { height: 6, borderRadius: 3 },
  costBreakdownPct: { fontSize: 12, width: 36, textAlign: 'right' },
  costBreakdownCost: { fontSize: 14, fontWeight: '600', width: 80, textAlign: 'right' },
  viewAllBtn: { paddingVertical: spacing.sm + spacing.xs, alignItems: 'center' },
  // Goal sheet
  sheetTitle: { fontSize: 20, fontWeight: '700', marginBottom: spacing.md },
  currentGoalText: { fontSize: 14, marginBottom: spacing.sm + spacing.xs },
  sheetActions: { flexDirection: 'row', gap: spacing.sm + spacing.xs },
  // Quick actions
  quickActions: { flexDirection: 'row', paddingHorizontal: spacing.md, gap: spacing.sm + spacing.xs, paddingBottom: spacing.xl },
  quickBtn: { flex: 1 },
  quickBtnContent: { alignItems: 'center', paddingVertical: spacing.sm },
  quickBtnText: { fontSize: 12, marginTop: spacing.sm },
  // Fullscreen chart
  fullscreenContainer: { flex: 1 },
  fullscreenHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
  },
  fullscreenTitle: { fontSize: 16, fontWeight: '700', flex: 1, textAlign: 'center' },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(128,128,128,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  fullscreenRange: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  fullscreenChartWrap: { flex: 1, paddingHorizontal: spacing.sm },
  // Custom range controls
  calendarBtn: { padding: 6 },
  backToPresetBtn: { padding: spacing.xs },
  rangeTextBtn: { paddingHorizontal: spacing.xs },
  rangeTextValue: { fontSize: 13, fontWeight: '600' },
  customRangeBar: { flexDirection: 'row', alignItems: 'center', gap: 2 },
  fsCustomRange: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  fsCustomRangeText: { fontSize: 13, fontWeight: '600' },
  // Cost-per-use insight card
  usageList: { marginTop: spacing.xs },
  usageRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, gap: spacing.sm },
  usageName: { flex: 1, fontSize: 14 },
  usageNameWrap: { flex: 1 },
  usageRight: { alignItems: 'flex-end' },
  usageCostPerUse: { fontSize: 14, fontWeight: '700' },
  usageCount: { fontSize: 11 },
  usageNeglectBadge: { fontSize: 11, marginTop: 2 },
  usageEmpty: { fontSize: 13, paddingVertical: spacing.sm + spacing.xs, textAlign: 'center' },
});
