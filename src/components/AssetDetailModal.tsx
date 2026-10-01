/**
 * WorthBase (家底) - Asset Detail Modal
 * Shows holding cost overview, breakdown, purchase info, valuation chart,
 * lifecycle action buttons (edit, retire, sell).
 * Redesigned with design system and shared components.
 */

import { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  Switch,
  ActivityIndicator,
  TouchableOpacity,
} from 'react-native';
import { useAppTheme } from '@/utils/format';
import { useAssetStore } from '@/stores/asset-store';
import { useSettingsStore } from '@/stores/settings-store';
import { AssetRepository } from '@/db/asset-repository';
import { HoldingCostCalculator } from '@/engine/HoldingCostCalculator';
import { SettlementCalculator } from '@/engine/SettlementCalculator';
import { RecurringExpenseRepository } from '@/db/recurring-expense-repository';
import { MaintenanceRepository } from '@/db/maintenance-repository';
import { UsageRepository } from '@/db/usage-repository';
import { UsageCalculator } from '@/engine/UsageCalculator';
import { HoldingCostBreakdown } from './HoldingCostBreakdown';
import { ValuationChart } from './ValuationChart';
import { SettlementModal } from './SettlementModal';
import { AddAssetModal } from './AddAssetModal';
import { DatePickerField } from './DatePickerField';
import {
  AssetStatus,
  AssetStatusLabels,
  AssetStatusColors,
  AssetCategory,
  AssetCategoryLabels,
  ExpenseFrequency,
  ExpenseFrequencyLabels,
  ExpenseFrequencySuffixes,
} from '@/types/enums';
import { ASSET_CATEGORY_ICONS, resolveAssetIcon } from '@/theme/icons';
import type { Asset, HoldingCostResult, RecurringExpense, MaintenanceRecord, SettlementResult, UsageRecord, UsageResult } from '@/types/models';
import { formatCurrency, formatDate, getCurrentDate, getCurrentMonth, getMonthsHeld, formatDuration } from '@/utils/format';
import { MetalPriceService, type MetalPrices } from '@/services/metal-price-service';
import { AppBottomSheet } from '@/components/ui/BottomSheet';
import { AppButton } from '@/components/ui/Button';
import { AppChip } from '@/components/ui/Chip';
import { AppTextInput } from '@/components/ui/TextInput';
import { Icon } from '@/components/ui/Icon';
import { ConfirmSheet } from '@/components/ConfirmSheet';
import { useToast } from '@/hooks/useToast';
import { radius } from '@/theme/tokens';

export function AssetDetailModal({ asset, onClose, onEdit }: {
  asset: Asset | null;
  onClose: () => void;
  onEdit?: (asset: Asset) => void;
}) {
  const theme = useAppTheme();
  const { currencySymbol } = useSettingsStore();
  const { markRetired, recordSale, updateValuation, loadAssets, restoreAsset } = useAssetStore();
  const [holdingCost, setHoldingCost] = useState<HoldingCostResult | null>(null);
  const [recurring, setRecurring] = useState<RecurringExpense[]>([]);
  const [maintenance, setMaintenance] = useState<MaintenanceRecord[]>([]);
  const [showSettlement, setShowSettlement] = useState(false);
  const [showEdit, setShowEdit] = useState(false);
  const [settlement, setSettlement] = useState<SettlementResult | null>(null);
  const [loading, setLoading] = useState(false);
  const toast = useToast();

  // Confirmation sheet states
  const [confirmRetire, setConfirmRetire] = useState(false);
  const [confirmRestore, setConfirmRestore] = useState(false);
  const [deleteRecurringTarget, setDeleteRecurringTarget] = useState<RecurringExpense | null>(null);
  const [deleteMaintenanceTarget, setDeleteMaintenanceTarget] = useState<MaintenanceRecord | null>(null);

  // Valuation update state
  const [showValuationInput, setShowValuationInput] = useState(false);
  const [newValuation, setNewValuation] = useState('');

  // Recurring expense add state
  const [showAddRecurring, setShowAddRecurring] = useState(false);
  const [recurringName, setRecurringName] = useState('');
  const [recurringAmount, setRecurringAmount] = useState('');
  const [recurringFrequency, setRecurringFrequency] = useState<ExpenseFrequency>(ExpenseFrequency.MONTHLY);
  const [recurringFrom, setRecurringFrom] = useState(getCurrentMonth());

  // Live metal reference prices (贵金属实时参考价)
  const [metalPrices, setMetalPrices] = useState<MetalPrices | null>(null);

  // Maintenance record add state
  const [showAddMaintenance, setShowAddMaintenance] = useState(false);
  const [maintenanceName, setMaintenanceName] = useState('');
  const [maintenanceAmount, setMaintenanceAmount] = useState('');
  const [maintenanceDate, setMaintenanceDate] = useState(getCurrentDate());
  const [maintenanceAmortize, setMaintenanceAmortize] = useState(true);

  // Usage tracking state
  const [usageRecords, setUsageRecords] = useState<UsageRecord[]>([]);
  const [usageResult, setUsageResult] = useState<UsageResult | null>(null);
  const [deleteUsageTarget, setDeleteUsageTarget] = useState<UsageRecord | null>(null);
  const [trackingEnabled, setTrackingEnabled] = useState(false);
  const [editingInitialCount, setEditingInitialCount] = useState(false);
  const [initialCountInput, setInitialCountInput] = useState('');

  // Sync local tracking state when asset changes
  useEffect(() => { setTrackingEnabled(asset?.usageTracking ?? false); }, [asset?.id, asset?.usageTracking]);

  const loadData = useCallback(async () => {
    if (!asset) return;
    setLoading(true);
    try {
      const hc = await HoldingCostCalculator.calculate(asset);
      setHoldingCost(hc);
      setRecurring(await RecurringExpenseRepository.getByAsset(asset.id));
      setMaintenance(await MaintenanceRepository.getByAsset(asset.id));
      // Usage data
      setUsageRecords(await UsageRepository.getByAssetRecent(asset.id));
      setUsageResult(await UsageCalculator.calculate(asset));
      if (asset.status === AssetStatus.SOLD) {
        const s = await SettlementCalculator.calculate(asset);
        setSettlement(s);
      } else {
        setSettlement(null);
      }
    } finally {
      setLoading(false);
    }
  }, [asset]);

  useEffect(() => { loadData(); }, [loadData]);

  // 贵金属资产：先展示缓存价格，再后台刷新（离线时保持缓存，静默降级）
  useEffect(() => {
    if (asset?.category !== AssetCategory.PRECIOUS_METAL || !asset?.weightGrams) {
      setMetalPrices(null);
      return;
    }
    let cancelled = false;
    (async () => {
      const cached = await MetalPriceService.getCached();
      if (!cancelled && cached) setMetalPrices(cached);
      const prices = await MetalPriceService.getPrices();
      if (!cancelled) setMetalPrices(prices);
    })();
    return () => { cancelled = true; };
  }, [asset?.id, asset?.category, asset?.weightGrams]);

  if (!asset) return null;

  const isActive = asset.status === AssetStatus.ACTIVE;
  const isSold = asset.status === AssetStatus.SOLD;
  const isRetired = asset.status === AssetStatus.RETIRED;
  const iconName = resolveAssetIcon(asset.icon, asset.category);

  const handleRetire = async () => {
    try {
      await markRetired(asset.id);
      setConfirmRetire(false);
      await loadAssets();
      onClose();
    } catch (err) {
      toast.show(`操作失败: ${(err as Error).message}`, 'error');
    }
  };

  const handleUpdateValuation = async () => {
    if (!asset || !newValuation.trim()) return;
    const val = parseFloat(newValuation);
    if (isNaN(val) || val < 0) { toast.show('请输入有效的估值金额', 'error'); return; }
    try {
      await updateValuation(asset.id, val);
      setShowValuationInput(false); setNewValuation('');
      await loadAssets(); await loadData();
    } catch (err) {
      toast.show(`更新失败: ${(err as Error).message}`, 'error');
    }
  };

  const handleAddRecurring = async () => {
    if (!asset || !recurringName.trim() || !recurringAmount.trim()) return;
    const amount = parseFloat(recurringAmount);
    if (isNaN(amount) || amount <= 0) { toast.show('请输入有效的金额', 'error'); return; }
    try {
      await RecurringExpenseRepository.create({ assetId: asset.id, name: recurringName.trim(), amount, frequency: recurringFrequency, effectiveFrom: recurringFrom, effectiveTo: null });
      setRecurringName(''); setRecurringAmount(''); setRecurringFrequency(ExpenseFrequency.MONTHLY); setShowAddRecurring(false);
      await loadData(); await loadAssets();
    } catch (err) {
      toast.show(`添加失败: ${(err as Error).message}`, 'error');
    }
  };

  const handleDeleteRecurring = async () => {
    if (!deleteRecurringTarget) return;
    try {
      await RecurringExpenseRepository.delete(deleteRecurringTarget.id);
      setDeleteRecurringTarget(null);
      await loadData(); await loadAssets();
    } catch (err) {
      toast.show(`删除失败: ${(err as Error).message}`, 'error');
    }
  };

  const handleAddMaintenance = async () => {
    if (!asset || !maintenanceName.trim() || !maintenanceAmount.trim()) return;
    const amount = parseFloat(maintenanceAmount);
    if (isNaN(amount) || amount <= 0) { toast.show('请输入有效的金额', 'error'); return; }
    try {
      await MaintenanceRepository.create({ assetId: asset.id, name: maintenanceName.trim(), amount, date: maintenanceDate, amortize: maintenanceAmortize });
      setMaintenanceName(''); setMaintenanceAmount(''); setShowAddMaintenance(false);
      await loadData(); await loadAssets();
    } catch (err) {
      toast.show(`添加失败: ${(err as Error).message}`, 'error');
    }
  };

  const handleDeleteMaintenance = async () => {
    if (!deleteMaintenanceTarget) return;
    try {
      await MaintenanceRepository.delete(deleteMaintenanceTarget.id);
      setDeleteMaintenanceTarget(null);
      await loadData(); await loadAssets();
    } catch (err) {
      toast.show(`删除失败: ${(err as Error).message}`, 'error');
    }
  };

  const handleToggleUsageTracking = async (enabled: boolean) => {
    if (!asset) return;
    setTrackingEnabled(enabled); // Immediate UI feedback
    try {
      await AssetRepository.update(asset.id, { usageTracking: enabled });
      await loadAssets();
      await loadData();
    } catch (err) {
      setTrackingEnabled(!enabled); // Rollback on error
      toast.show(`更新失败: ${(err as Error).message}`, 'error');
    }
  };

  const handleSaveInitialCount = async () => {
    if (!asset) return;
    const count = parseInt(initialCountInput) || 0;
    try {
      await AssetRepository.update(asset.id, { initialUseCount: Math.max(0, count) });
      setEditingInitialCount(false);
      setInitialCountInput('');
      await loadAssets();
      await loadData();
    } catch (err) {
      toast.show(`更新失败: ${(err as Error).message}`, 'error');
    }
  };

  const handleUsagePlusOne = async () => {
    if (!asset) return;
    // Prevent duplicate on the same day
    const today = new Date().toISOString().substring(0, 10);
    const lastUsed = await UsageRepository.getLastUsed(asset.id);
    if (lastUsed === today) {
      toast.show('今天已经记录过了', 'info');
      return;
    }

    // Haptic feedback — gracefully degrade if unavailable
    try {
      const Haptics = require('expo-haptics');
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } catch {}
    try {
      const newTotalUseCount = (usageResult?.totalUseCount ?? 0) + 1;
      await UsageRepository.create({
        assetId: asset.id,
        usedAt: today,
        note: null,
      });
      await loadData();

      // Milestone celebration
      const oldCostPerUse = usageResult?.costPerUse ?? Infinity;
      const newCostPerUse = asset.purchasePrice / newTotalUseCount;
      const milestones = [500, 200, 100, 50];
      for (const threshold of milestones) {
        if (oldCostPerUse >= threshold && newCostPerUse < threshold) {
          toast.show(`🎉 次均成本突破 ¥${threshold}！`, 'success', 3000);
          return;
        }
      }
      toast.show(`已记录使用，次均 ${formatCurrency(newCostPerUse, currencySymbol)}`, 'success');
    } catch (err) {
      toast.show(`记录失败: ${(err as Error).message}`, 'error');
    }
  };

  const handleDeleteUsage = async () => {
    if (!deleteUsageTarget) return;
    try {
      await UsageRepository.delete(deleteUsageTarget.id);
      setDeleteUsageTarget(null);
      await loadData();
    } catch (err) {
      toast.show(`删除失败: ${(err as Error).message}`, 'error');
    }
  };

  const handleRestore = async () => {
    try {
      await restoreAsset(asset.id);
      setConfirmRestore(false);
      await loadAssets(); await loadData();
    } catch (err) {
      toast.show(`操作失败: ${(err as Error).message}`, 'error');
    }
  };

  return (
    <AppBottomSheet visible={!!asset} onClose={onClose} snapPoints={['85%', '95%']}>
      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
        </View>
      ) : (
      <>
      {/* Header */}
      <View style={styles.header}>
        <Icon name={iconName} size={32} color="primary" />
        <View style={{ flex: 1, marginLeft: 12 }}>
          <Text style={[styles.assetName, { color: theme.colors.onSurface }]}>{asset.name}</Text>
          <View style={styles.headerMeta}>
            <View style={[styles.statusBadge, { backgroundColor: AssetStatusColors[asset.status] + '20' }]}>
              <Text style={[styles.statusText, { color: AssetStatusColors[asset.status] }]}>
                {AssetStatusLabels[asset.status]}
              </Text>
            </View>
            {isActive && holdingCost && holdingCost.monthlyTotal > 0 ? (
              <Text style={[styles.headerCost, { color: theme.colors.primary }]}>
                {formatCurrency(holdingCost.monthlyTotal, currencySymbol)}/月 · {formatCurrency(holdingCost.dailyAverage, currencySymbol)}/天
              </Text>
            ) : null}
          </View>
        </View>
      </View>

      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Holding Cost */}
        {isActive && holdingCost ? (
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: theme.colors.onSurface }]}>持有成本</Text>
            <HoldingCostBreakdown result={holdingCost} currencySymbol={currencySymbol} />
          </View>
        ) : null}

        {/* Settlement */}
        {isSold && settlement ? (
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: theme.colors.onSurface }]}>卖出结算</Text>
            <View style={[styles.settlementCard, { backgroundColor: theme.colors.surfaceVariant }]}>
              <SettRow label="购入价" value={formatCurrency(settlement.purchasePrice, currencySymbol)} theme={theme} />
              <SettRow label="卖价" value={formatCurrency(settlement.sellPrice, currencySymbol)} theme={theme} />
              <SettRow
                label={settlement.depreciation > 0 ? '贬值' : '升值'}
                value={formatCurrency(Math.abs(settlement.depreciation), currencySymbol)}
                theme={theme}
                valueColor={settlement.depreciation > 0 ? theme.colors.error : theme.colors.success}
              />
              <SettRow label="累计持有成本" value={formatCurrency(settlement.totalHoldingCost, currencySymbol)} theme={theme} />
              <View style={[styles.divider, { backgroundColor: theme.colors.outline }]} />
              <SettRow label="真实净支出" value={formatCurrency(settlement.netExpenditure, currencySymbol)} theme={theme} bold valueColor={theme.colors.error} />
              <SettRow label="持有天数" value={`${settlement.ownershipDays} 天`} theme={theme} />
              <SettRow label="日均成本" value={`${formatCurrency(settlement.dailyAverageCost, currencySymbol)}/天`} theme={theme} />
            </View>
          </View>
        ) : null}

        {/* Purchase Info */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: theme.colors.onSurface }]}>购入信息</Text>
          <View style={[styles.infoCard, { backgroundColor: theme.colors.surfaceVariant }]}>
            <InfoRow label="分类" value={AssetCategoryLabels[asset.category]} theme={theme} />
            <InfoRow label="购入日期" value={formatDate(asset.purchaseDate)} theme={theme} />
            <InfoRow label="购入价格" value={formatCurrency(asset.purchasePrice, currencySymbol)} theme={theme} />
            {asset.weightGrams ? <InfoRow label="克数" value={`${asset.weightGrams} g`} theme={theme} /> : null}
            <InfoRow label="已持有" value={formatDuration(getMonthsHeld(asset.purchaseDate))} theme={theme} />
            <InfoRow label="折旧方式" value={describeAmortization(asset)} theme={theme} />
            {asset.residualValue ? <InfoRow label="预估残值" value={formatCurrency(asset.residualValue, currencySymbol)} theme={theme} /> : null}
          </View>
        </View>

        {/* Live Metal Price Reference (贵金属实时参考价) */}
        {metalPrices && asset.weightGrams ? (
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: theme.colors.onSurface }]}>实时参考价</Text>
            <View style={[styles.infoCard, { backgroundColor: theme.colors.surfaceVariant }]}>
              <InfoRow label="黄金" value={`${formatCurrency(metalPrices.goldPerGram, currencySymbol)}/克`} theme={theme} />
              <InfoRow label="白银" value={`${formatCurrency(metalPrices.silverPerGram, currencySymbol)}/克`} theme={theme} />
              <InfoRow
                label={`按金价市值（${asset.weightGrams}g）`}
                value={formatCurrency(metalPrices.goldPerGram * asset.weightGrams, currencySymbol)}
                theme={theme}
              />
              <InfoRow
                label={`按银价市值（${asset.weightGrams}g）`}
                value={formatCurrency(metalPrices.silverPerGram * asset.weightGrams, currencySymbol)}
                theme={theme}
              />
              <Text style={[styles.metalNote, { color: theme.colors.tertiary }]}>
                {metalPrices.stale ? '缓存于' : '更新于'} {formatTimeHM(metalPrices.fetchedAt)}
                {metalPrices.stale ? '（当前无法联网）' : ''} · 国际现货折算，仅供估价参考
              </Text>
            </View>
          </View>
        ) : null}

        {/* Valuation Chart */}
        {asset.valuationTracking ? (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={[styles.sectionTitle, { color: theme.colors.onSurface }]}>估值历史</Text>
              {isActive && (
                <AppButton
                  title="更新估值"
                  variant="secondary"
                  compact
                  onPress={() => { setNewValuation(String(asset.currentValuation ?? asset.purchasePrice)); setShowValuationInput(true); }}
                />
              )}
            </View>
            <ValuationChart assetId={asset.id} purchasePrice={asset.purchasePrice} />
          </View>
        ) : isActive ? (
          <View style={styles.section}>
            <AppButton
              title="记录估值"
              variant="secondary"
              icon="Pencil"
              onPress={() => { setNewValuation(String(asset.currentValuation ?? asset.purchasePrice)); setShowValuationInput(true); }}
            />
          </View>
        ) : null}

        {/* Recurring Expenses */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionTitle, { color: theme.colors.onSurface }]}>经常性支出</Text>
            {isActive && (
              <AppButton title={showAddRecurring ? '收起' : '添加'} variant="text" compact onPress={() => setShowAddRecurring(!showAddRecurring)} />
            )}
          </View>
          {recurring.length > 0 ? recurring.map(re => (
            <View key={re.id} style={[styles.subRow, { borderBottomColor: theme.colors.outline }]}>
              <Text style={[styles.subName, { color: theme.colors.onSurface }]}>{re.name}</Text>
              <Text style={[styles.subAmount, { color: theme.colors.onSurface }]}>{formatCurrency(re.amount, currencySymbol)}{ExpenseFrequencySuffixes[re.frequency ?? ExpenseFrequency.MONTHLY]}</Text>
              <Text style={[styles.subPeriod, { color: theme.colors.tertiary }]}>{re.effectiveFrom.substring(0, 7)} ~ {re.effectiveTo ? re.effectiveTo.substring(0, 7) : '至今'}</Text>
              {isActive && <AppButton title="✕" variant="text" compact onPress={() => setDeleteRecurringTarget(re)} />}
            </View>
          )) : (
            <Text style={[styles.emptySubtext, { color: theme.colors.tertiary }]}>暂无经常性支出</Text>
          )}
          {showAddRecurring && isActive && (
            <View style={[styles.inlineForm, { backgroundColor: theme.colors.surfaceVariant }]}>
              <AppTextInput bottomSheet label="名称(如话费)" value={recurringName} onChangeText={setRecurringName} />
              <AppTextInput bottomSheet label="金额" value={recurringAmount} onChangeText={setRecurringAmount} keyboardType="decimal-pad" />
              <View style={styles.chipRow}>
                {Object.values(ExpenseFrequency).map(freq => (
                  <AppChip
                    key={freq}
                    label={ExpenseFrequencyLabels[freq]}
                    selected={recurringFrequency === freq}
                    onPress={() => setRecurringFrequency(freq)}
                    compact
                  />
                ))}
              </View>
              <DatePickerField label="生效日期" value={recurringFrom} onChange={setRecurringFrom} />
              <AppButton title="确认添加" variant="primary" compact onPress={handleAddRecurring} style={{ alignSelf: 'flex-start' }} />
            </View>
          )}
        </View>

        {/* Usage Records (cost-per-use tracking) */}
        {isActive && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={[styles.sectionTitle, { color: theme.colors.onSurface }]}>使用追踪</Text>
              <Switch
                value={trackingEnabled}
                onValueChange={handleToggleUsageTracking}
                trackColor={{ false: theme.colors.outline, true: theme.colors.primary }}
              />
            </View>

            {trackingEnabled ? (
              <>
                {/* Stats Card */}
                <View style={[styles.usageStatsCard, { backgroundColor: theme.colors.surfaceVariant }]}>
                  <View style={styles.usageStatsRow}>
                    <View style={styles.usageStat}>
                      <Text style={[styles.usageStatValue, { color: theme.colors.primary }]}>
                        {usageResult && isFinite(usageResult.costPerUse)
                          ? formatCurrency(usageResult.costPerUse, currencySymbol)
                          : '--'}
                      </Text>
                      <Text style={[styles.usageStatLabel, { color: theme.colors.onSurfaceVariant }]}>次均成本</Text>
                    </View>
                    <View style={styles.usageStat}>
                      <Text style={[styles.usageStatValue, { color: theme.colors.onSurface }]}>
                        {usageResult?.totalUseCount ?? 0} 次
                      </Text>
                      <Text style={[styles.usageStatLabel, { color: theme.colors.onSurfaceVariant }]}>
                        {usageResult && usageResult.initialUseCount > 0
                          ? `初始 ${usageResult.initialUseCount} + 记录 ${usageResult.useCount}`
                          : '使用次数'}
                      </Text>
                    </View>
                    <View style={styles.usageStat}>
                      <Text style={[styles.usageStatValue, { color: theme.colors.onSurface }]}>
                        {usageResult?.lastUsedAt
                          ? `${usageResult.daysSinceLastUse}天前`
                          : '从未使用'}
                      </Text>
                      <Text style={[styles.usageStatLabel, { color: theme.colors.onSurfaceVariant }]}>上次使用</Text>
                    </View>
                  </View>
                  {usageResult && usageResult.recentUseCount > 0 && (
                    <Text style={[styles.usageRecent, { color: theme.colors.tertiary }]}>
                      最近30天使用了 {usageResult.recentUseCount} 次
                    </Text>
                  )}
                </View>

                {/* Initial use count editor */}
                {editingInitialCount ? (
                  <View style={[styles.initialCountForm, { backgroundColor: theme.colors.surfaceVariant }]}>
                    <AppTextInput
                      bottomSheet
                      label="初始使用次数"
                      value={initialCountInput}
                      onChangeText={setInitialCountInput}
                      placeholder="在开始记录之前已经用了多少次？"
                      keyboardType="number-pad"
                      autoFocus
                    />
                    <View style={styles.initialCountActions}>
                      <AppButton title="取消" variant="text" onPress={() => { setEditingInitialCount(false); setInitialCountInput(''); }} compact />
                      <AppButton title="保存" variant="primary" onPress={handleSaveInitialCount} compact />
                    </View>
                  </View>
                ) : (
                  <TouchableOpacity
                    onPress={() => { setInitialCountInput(String(asset.initialUseCount ?? 0)); setEditingInitialCount(true); }}
                    style={[styles.initialCountRow, { borderBottomColor: theme.colors.outline }]}
                  >
                    <Text style={[styles.initialCountLabel, { color: theme.colors.onSurfaceVariant }]}>初始使用次数</Text>
                    <Text style={[styles.initialCountValue, { color: theme.colors.primary }]}>
                      {asset.initialUseCount ?? 0} 次
                      <Text style={{ color: theme.colors.tertiary, fontSize: 12 }}>  编辑</Text>
                    </Text>
                  </TouchableOpacity>
                )}

                {/* +1 Button */}
                <AppButton
                  title="使用"
                  variant="primary"
                  icon="Plus"
                  onPress={handleUsagePlusOne}
                  style={styles.usagePlusBtn}
                />

                {/* Cost-per-use trend */}
                {usageRecords.length >= 2 && (() => {
                  const reversed = [...usageRecords].reverse();
                  const initialCount = asset.initialUseCount ?? 0;
                  const points = reversed.map((_, i) => {
                    const count = initialCount + i + 1;
                    return formatCurrency(asset.purchasePrice / count, currencySymbol);
                  });
                  const display = points.length <= 6 ? points : [
                    points[0],
                    ...points.filter((_: string, i: number) =>
                      i > 0 && i < points.length - 1 &&
                      (points.length <= 6 || i % Math.ceil((points.length - 2) / 4) === 0)
                    ).slice(0, 4),
                    points[points.length - 1],
                  ];
                  return (
                    <Text style={[styles.usageTrend, { color: theme.colors.tertiary }]}>
                      次均成本变化: {display.join(' → ')}
                    </Text>
                  );
                })()}

                {/* History list */}
                {usageRecords.length > 0 ? (
                  <View style={styles.usageHistoryList}>
                    {usageRecords.map(r => (
                      <View key={r.id} style={[styles.subRow, { borderBottomColor: theme.colors.outline }]}>
                        <Icon name="CheckCircle" size={16} color="success" />
                        <Text style={[styles.subName, { color: theme.colors.onSurface }]}>
                          {formatDate(r.usedAt)}
                        </Text>
                        <AppButton title="✕" variant="text" compact onPress={() => setDeleteUsageTarget(r)} />
                      </View>
                    ))}
                  </View>
                ) : (
                  <Text style={[styles.emptySubtext, { color: theme.colors.tertiary }]}>
                    {asset.initialUseCount > 0
                      ? `已设置初始 ${asset.initialUseCount} 次，点上方按钮继续记录`
                      : '还没记录过使用，点上方按钮记录第一次吧'}
                  </Text>
                )}
              </>
            ) : (
              <Text style={[styles.emptySubtext, { color: theme.colors.tertiary }]}>
                开启后可在资产卡片上一键记录使用次数，追踪次均成本。
              </Text>
            )}
          </View>
        )}

        {/* Maintenance Records */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionTitle, { color: theme.colors.onSurface }]}>维护记录</Text>
            {isActive && (
              <AppButton title={showAddMaintenance ? '收起' : '添加'} variant="text" compact onPress={() => setShowAddMaintenance(!showAddMaintenance)} />
            )}
          </View>
          {maintenance.length > 0 ? maintenance.map(m => (
            <View key={m.id} style={[styles.subRow, { borderBottomColor: theme.colors.outline }]}>
              <Text style={[styles.subName, { color: theme.colors.onSurface }]}>{m.name}</Text>
              <Text style={[styles.subAmount, { color: theme.colors.onSurface }]}>{formatCurrency(m.amount, currencySymbol)}</Text>
              <Text style={[styles.subPeriod, { color: theme.colors.tertiary }]}>{formatDate(m.date)}{m.amortize ? ' (分摊)' : ''}</Text>
              {isActive && <AppButton title="✕" variant="text" compact onPress={() => setDeleteMaintenanceTarget(m)} />}
            </View>
          )) : (
            <Text style={[styles.emptySubtext, { color: theme.colors.tertiary }]}>暂无维护记录</Text>
          )}
          {showAddMaintenance && isActive && (
            <View style={[styles.inlineForm, { backgroundColor: theme.colors.surfaceVariant }]}>
              <AppTextInput bottomSheet label="名称(如换屏)" value={maintenanceName} onChangeText={setMaintenanceName} />
              <AppTextInput bottomSheet label="金额" value={maintenanceAmount} onChangeText={setMaintenanceAmount} keyboardType="decimal-pad" />
              <DatePickerField label="维护日期" value={maintenanceDate} onChange={setMaintenanceDate} />
              <View style={styles.switchRow}>
                <Text style={[styles.switchLabel, { color: theme.colors.onSurface }]}>纳入分摊</Text>
                <Switch value={maintenanceAmortize} onValueChange={setMaintenanceAmortize} trackColor={{ false: theme.colors.outline, true: theme.colors.primary }} />
              </View>
              <AppButton title="确认添加" variant="primary" compact onPress={handleAddMaintenance} style={{ alignSelf: 'flex-start' }} />
            </View>
          )}
        </View>
      </ScrollView>

      {/* Action Buttons */}
      <View style={[styles.actions, { borderTopColor: theme.colors.outline }]}>
        {isActive && (
          <>
            <AppButton title="编辑" variant="secondary" onPress={() => setShowEdit(true)} style={{ flex: 1 }} />
            <AppButton title="退役" variant="secondary" onPress={() => setConfirmRetire(true)} style={{ flex: 1, borderColor: theme.colors.warning }} labelStyle={{ color: theme.colors.warning }} />
            <AppButton title="卖出" variant="danger" onPress={() => setShowSettlement(true)} style={{ flex: 1 }} />
          </>
        )}
        {isRetired && (
          <>
            <AppButton title="恢复" variant="secondary" onPress={() => setConfirmRestore(true)} style={{ flex: 1, borderColor: theme.colors.success }} labelStyle={{ color: theme.colors.success }} />
            <AppButton title="卖出" variant="danger" onPress={() => setShowSettlement(true)} style={{ flex: 1 }} />
            <AppButton title="关闭" variant="text" onPress={onClose} style={{ flex: 1 }} />
          </>
        )}
        {isSold && <AppButton title="关闭" variant="text" onPress={onClose} />}
      </View>

      {/* Valuation Update Sub-sheet */}
      <AppBottomSheet visible={showValuationInput} onClose={() => setShowValuationInput(false)} snapPoints={['40%']}>
        <Text style={[styles.valTitle, { color: theme.colors.onSurface }]}>更新估值</Text>
        <Text style={[styles.valSubtitle, { color: theme.colors.onSurfaceVariant }]}>{asset?.name}</Text>
        {asset?.weightGrams && metalPrices ? (
          <View style={[styles.chipRow, { marginBottom: 12 }]}>
            <AppButton
              title="按金价填入"
              variant="secondary"
              compact
              onPress={() => setNewValuation(String(Math.round(metalPrices.goldPerGram * (asset.weightGrams ?? 0))))}
            />
            <AppButton
              title="按银价填入"
              variant="secondary"
              compact
              onPress={() => setNewValuation(String(Math.round(metalPrices.silverPerGram * (asset.weightGrams ?? 0))))}
            />
          </View>
        ) : null}
        <AppTextInput bottomSheet label="输入当前估值" value={newValuation} onChangeText={setNewValuation} keyboardType="decimal-pad" autoFocus={!asset?.weightGrams} />
        <View style={styles.valActions}>
          <AppButton title="取消" variant="text" onPress={() => setShowValuationInput(false)} style={{ flex: 1 }} />
          <AppButton title="保存" variant="primary" onPress={handleUpdateValuation} style={{ flex: 1 }} />
        </View>
      </AppBottomSheet>

      </>
      )}

      <SettlementModal
        visible={showSettlement}
        asset={asset}
        onClose={() => setShowSettlement(false)}
        onConfirm={async (sellDate, sellPrice) => {
          try {
            await recordSale(asset.id, sellDate, sellPrice);
            await loadAssets(); setShowSettlement(false); onClose();
          } catch (err) { toast.show(`卖出失败: ${(err as Error).message}`, 'error'); }
        }}
      />

      <AddAssetModal
        visible={showEdit}
        editAsset={asset}
        onClose={() => setShowEdit(false)}
        onSaved={() => { setShowEdit(false); onClose(); }}
      />

      {/* Confirmation Sheets */}
      <ConfirmSheet
        visible={confirmRetire}
        onClose={() => setConfirmRetire(false)}
        onConfirm={handleRetire}
        title="退役资产"
        description={`确定要将"${asset.name}"标记为退役吗？`}
        confirmLabel="退役"
        icon="Archive"
        variant="danger"
      />
      <ConfirmSheet
        visible={confirmRestore}
        onClose={() => setConfirmRestore(false)}
        onConfirm={handleRestore}
        title="恢复资产"
        description={`确定要将"${asset.name}"恢复为使用中吗？`}
        confirmLabel="恢复"
        icon="RotateCcw"
      />
      <ConfirmSheet
        visible={!!deleteRecurringTarget}
        onClose={() => setDeleteRecurringTarget(null)}
        onConfirm={handleDeleteRecurring}
        title="删除经常性支出"
        description={deleteRecurringTarget ? `确定要删除"${deleteRecurringTarget.name}"吗？` : undefined}
        confirmLabel="删除"
        icon="Trash2"
        variant="danger"
      />
      <ConfirmSheet
        visible={!!deleteMaintenanceTarget}
        onClose={() => setDeleteMaintenanceTarget(null)}
        onConfirm={handleDeleteMaintenance}
        title="删除维护记录"
        description={deleteMaintenanceTarget ? `确定要删除"${deleteMaintenanceTarget.name}"吗？` : undefined}
        confirmLabel="删除"
        icon="Trash2"
        variant="danger"
      />
      <ConfirmSheet
        visible={!!deleteUsageTarget}
        onClose={() => setDeleteUsageTarget(null)}
        onConfirm={handleDeleteUsage}
        title="删除使用记录"
        description={deleteUsageTarget ? `确定要删除 ${formatDate(deleteUsageTarget.usedAt)} 的使用记录吗？` : undefined}
        confirmLabel="删除"
        icon="Trash2"
        variant="danger"
      />
    </AppBottomSheet>
  );
}

/** Format an ISO timestamp as local "M-DD HH:mm" (no Intl dependency) */
function formatTimeHM(iso: string): string {
  const d = new Date(iso);
  if (isNaN(d.getTime())) return '--';
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getMonth() + 1}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

/** Human-readable amortization description — hides technical strategy names */
function describeAmortization(asset: Asset): string {
  switch (asset.amortizationType) {
    case 'simple_linear':
      return '按已持有时间递减';
    case 'expected_lifespan': {
      const months = asset.expectedLifespanMonths;
      if (!months) return '按预期寿命均摊';
      const years = months / 12;
      return `用 ${years % 1 === 0 ? years : years.toFixed(1)} 年均摊`;
    }
    case 'residual_value': {
      const months = asset.expectedLifespanMonths;
      if (!months) return '考虑残值后均摊';
      const years = months / 12;
      return `用 ${years % 1 === 0 ? years : years.toFixed(1)} 年均摊（含残值）`;
    }
    case 'no_amortization':
      return '不计算折旧';
    default:
      return '未知';
  }
}

function SettRow({ label, value, theme, bold, valueColor }: { label: string; value: string; theme: any; bold?: boolean; valueColor?: string }) {
  return (
    <View style={styles.settRow}>
      <Text style={[styles.settLabel, { color: theme.colors.onSurfaceVariant }]}>{label}</Text>
      <Text style={[styles.settValue, { color: valueColor || theme.colors.onSurface }, bold && { fontWeight: '700' }]}>{value}</Text>
    </View>
  );
}

function InfoRow({ label, value, theme }: { label: string; value: string; theme: any }) {
  return (
    <View style={styles.infoRow}>
      <Text style={[styles.infoLabel, { color: theme.colors.onSurfaceVariant }]}>{label}</Text>
      <Text style={[styles.infoValue, { color: theme.colors.onSurface }]}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  loadingContainer: { justifyContent: 'center', alignItems: 'center', paddingVertical: 48 },
  header: { flexDirection: 'row', alignItems: 'center', marginBottom: 16 },
  assetName: { fontSize: 20, fontWeight: '700' },
  headerMeta: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 4, flexWrap: 'wrap' },
  headerCost: { fontSize: 13, fontWeight: '600' },
  statusBadge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6, alignSelf: 'flex-start' },
  statusText: { fontSize: 11, fontWeight: '500' },
  section: { marginBottom: 20 },
  sectionTitle: { fontSize: 16, fontWeight: '700', marginBottom: 8 },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  infoCard: { borderRadius: radius.md, padding: 16 },
  infoRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 6 },
  infoLabel: { fontSize: 14 },
  infoValue: { fontSize: 14, fontWeight: '500' },
  subRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 8, borderBottomWidth: StyleSheet.hairlineWidth, gap: 8 },
  subName: { flex: 1, fontSize: 14 },
  subAmount: { fontSize: 14, fontWeight: '500' },
  subPeriod: { fontSize: 12 },
  settlementCard: { borderRadius: radius.md, padding: 16 },
  settRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 6 },
  settLabel: { fontSize: 14 },
  settValue: { fontSize: 14, fontWeight: '500' },
  divider: { height: 1, marginVertical: 8 },
  actions: { flexDirection: 'row', gap: 8, paddingTop: 12, borderTopWidth: StyleSheet.hairlineWidth },
  emptySubtext: { fontSize: 13, paddingVertical: 8 },
  inlineForm: { marginTop: 8, gap: 8, padding: 12, borderRadius: radius.sm },
  chipRow: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
  metalNote: { fontSize: 11, marginTop: 6, lineHeight: 16 },
  switchRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 4 },
  switchLabel: { fontSize: 14 },
  valTitle: { fontSize: 20, fontWeight: '700', marginBottom: 4 },
  valSubtitle: { fontSize: 14, marginBottom: 16 },
  valActions: { flexDirection: 'row', gap: 12 },
  // Usage section
  usageStatsCard: { borderRadius: radius.md, padding: 16, marginBottom: 12 },
  usageStatsRow: { flexDirection: 'row', justifyContent: 'space-around' },
  usageStat: { alignItems: 'center' },
  usageStatValue: { fontSize: 18, fontWeight: '700' },
  usageStatLabel: { fontSize: 12, marginTop: 2 },
  usageRecent: { fontSize: 12, textAlign: 'center', marginTop: 10 },
  initialCountRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 10, borderBottomWidth: StyleSheet.hairlineWidth, marginBottom: 8 },
  initialCountLabel: { fontSize: 14 },
  initialCountValue: { fontSize: 14, fontWeight: '600' },
  initialCountForm: { padding: 12, borderRadius: radius.sm, marginBottom: 8 },
  initialCountActions: { flexDirection: 'row', justifyContent: 'flex-end', gap: 8, marginTop: 4 },
  usagePlusBtn: { marginBottom: 12 },
  usageTrend: { fontSize: 12, marginBottom: 12, fontStyle: 'italic', paddingHorizontal: 4 },
  usageHistoryList: { marginTop: 4 },
});
