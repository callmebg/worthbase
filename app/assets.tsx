/**
 * WorthBase (家底) - Assets Tab (资产管理)
 * Shows asset overview, category-grouped list, status filter, add/detail modals.
 * Redesigned with design system, Paper components, and Lucide icons.
 */

import { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  TouchableOpacity,
  RefreshControl,
} from 'react-native';
import { useAppTheme } from '@/utils/format';
import { useFocusEffect } from 'expo-router';
import { useAssetStore } from '@/stores/asset-store';
import { useSettingsStore } from '@/stores/settings-store';
import { HoldingCostCalculator } from '@/engine/HoldingCostCalculator';
import { UsageCalculator } from '@/engine/UsageCalculator';
import { UsageRepository } from '@/db/usage-repository';
import { AddAssetModal } from '@/components/AddAssetModal';
import { AssetDetailModal } from '@/components/AssetDetailModal';
import { HoldingCostExplainer } from '@/components/HoldingCostExplainer';
import { ConfirmSheet } from '@/components/ConfirmSheet';
import {
  AssetStatus,
  AssetStatusLabels,
  AssetStatusColors,
  AssetCategoryLabels,
} from '@/types/enums';
import { ASSET_CATEGORY_ICONS, ASSET_STATUS_ICONS } from '@/theme/icons';
import type { Asset, HoldingCostResult, UsageResult } from '@/types/models';
import { formatCurrency, formatCompactCurrency, getMonthsHeld } from '@/utils/format';
import { AppCard } from '@/components/ui/Card';
import { AppChip } from '@/components/ui/Chip';
import { EmptyState } from '@/components/ui/EmptyState';
import { Icon } from '@/components/ui/Icon';
import { useToast } from '@/hooks/useToast';
import { FORTUNES } from '@/utils/fortunes';
import { spacing } from '@/theme/tokens';

type StatusFilter = 'all' | AssetStatus;

export default function AssetsScreen() {
  const theme = useAppTheme();
  const toast = useToast();
  const { assets, statusFilter, loadAssets, setStatusFilter, deleteAsset } = useAssetStore();
  const { currencySymbol } = useSettingsStore();
  const [showAdd, setShowAdd] = useState(false);
  const [showCostExplainer, setShowCostExplainer] = useState(false);
  const [detailAsset, setDetailAsset] = useState<Asset | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Asset | null>(null);
  const [costMap, setCostMap] = useState<Map<string, HoldingCostResult>>(new Map());
  const [usageMap, setUsageMap] = useState<Map<string, UsageResult>>(new Map());
  const [refreshing, setRefreshing] = useState(false);

  useFocusEffect(useCallback(() => { loadAssets(); }, []));

  useEffect(() => {
    (async () => {
      const activeAssets = assets.filter(a => a.status === AssetStatus.ACTIVE);
      const results = await HoldingCostCalculator.calculateAll(activeAssets);
      setCostMap(results);
    })();
  }, [assets]);

  useEffect(() => {
    (async () => {
      const activeWithCost = assets.filter(a => a.status === AssetStatus.ACTIVE);
      const results = await UsageCalculator.calculateAll(activeWithCost);
      setUsageMap(results);
    })();
  }, [assets]);

  const filtered = assets.filter(a => statusFilter === 'all' || a.status === statusFilter);

  // Group by category
  const grouped = filtered.reduce((acc, asset) => {
    const cat = asset.category;
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push(asset);
    return acc;
  }, {} as Record<string, Asset[]>);

  const totalValuation = assets
    .filter(a => a.status === AssetStatus.ACTIVE)
    .reduce((sum, a) => sum + (a.currentValuation ?? a.purchasePrice), 0);
  const totalCost = Array.from(costMap.values()).reduce((sum, r) => sum + r.monthlyTotal, 0);
  const activeCount = assets.filter(a => a.status === AssetStatus.ACTIVE).length;

  const filters: { key: StatusFilter; label: string }[] = [
    { key: 'all', label: '全部' },
    { key: AssetStatus.ACTIVE, label: '使用中' },
    { key: AssetStatus.RETIRED, label: '退役' },
    { key: AssetStatus.SOLD, label: '已售' },
  ];

  const handleUsagePlusOne = async (assetId: string) => {
    // Prevent duplicate on the same day
    const today = new Date().toISOString().substring(0, 10);
    const lastUsed = await UsageRepository.getLastUsed(assetId);
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
      await UsageRepository.create({
        assetId,
        usedAt: today,
        note: null,
      });
      const asset = assets.find(a => a.id === assetId);
      if (asset) {
        const result = await UsageCalculator.calculate(asset);
        setUsageMap(prev => new Map(prev).set(assetId, result));

        // Milestone celebration
        const oldCostPerUse = usageMap.get(assetId)?.costPerUse ?? Infinity;
        const newCostPerUse = result.costPerUse;
        const milestones = [500, 200, 100, 50];
        for (const threshold of milestones) {
          if (oldCostPerUse >= threshold && newCostPerUse < threshold) {
            toast.show(`🎉 次均成本突破 ¥${threshold}！`, 'success', 3000);
            break;
          }
        }
        if (newCostPerUse < 500 || oldCostPerUse >= 500) {
          // Only show normal toast if no milestone was hit
          if (!milestones.some(t => oldCostPerUse >= t && newCostPerUse < t)) {
            toast.show(`已记录使用，次均 ${formatCurrency(newCostPerUse, currencySymbol)}`, 'success');
          }
        } else {
          toast.show(`已记录使用，次均 ${formatCurrency(newCostPerUse, currencySymbol)}`, 'success');
        }
      }
    } catch (err) {
      toast.show(`记录失败: ${(err as Error).message}`, 'error');
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    const fortune = FORTUNES[Math.floor(Math.random() * FORTUNES.length)];
    toast.show(fortune, 'success', 2500);
    loadAssets();
    setTimeout(() => setRefreshing(false), 400);
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      await deleteAsset(deleteTarget.id);
      setDetailAsset(null);
      setDeleteTarget(null);
      toast.show('资产已删除', 'success');
    } catch (err) {
      toast.show(`删除失败: ${(err as Error).message}`, 'error');
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      {/* Overview Stats Card */}
      <AppCard style={styles.overviewCard}>
        <View style={styles.overviewHeader}>
          <Text style={[styles.overviewTitle, { color: theme.colors.onSurface }]}>资产概览</Text>
          <TouchableOpacity
            onPress={() => setShowCostExplainer(true)}
            style={styles.helpBtn}
          >
            <Icon name="Info" size={18} color="onSurfaceVariant" />
          </TouchableOpacity>
        </View>
        <View style={styles.overviewRow}>
          <View style={styles.overviewItem}>
            <Text style={[styles.overviewLabel, { color: theme.colors.onSurfaceVariant }]}>
              资产总值
            </Text>
            <Text style={[styles.overviewValue, { color: theme.colors.onSurface }]}>
              {formatCompactCurrency(totalValuation, currencySymbol)}
            </Text>
          </View>
          <View style={styles.overviewItem}>
            <Text style={[styles.overviewLabel, { color: theme.colors.onSurfaceVariant }]}>
              月持有成本
            </Text>
            <Text style={[styles.overviewValue, { color: theme.colors.onSurface }]}>
              {formatCompactCurrency(totalCost, currencySymbol)}
            </Text>
          </View>
          <View style={styles.overviewItem}>
            <Text style={[styles.overviewLabel, { color: theme.colors.onSurfaceVariant }]}>
              资产数量
            </Text>
            <Text style={[styles.overviewValue, { color: theme.colors.onSurface }]}>
              {activeCount}
            </Text>
          </View>
        </View>
      </AppCard>

      {/* Status Filter Chips */}
      <View style={styles.filterRow}>
        {filters.map(f => (
          <AppChip
            key={f.key}
            label={f.label}
            selected={statusFilter === f.key}
            onPress={() => setStatusFilter(f.key)}
          />
        ))}
      </View>

      {/* Asset List */}
      <FlatList
        data={Object.entries(grouped)}
        keyExtractor={([cat]) => cat}
        contentContainerStyle={styles.list}
        ListFooterComponent={
          <TouchableOpacity
            onPress={() => setShowAdd(true)}
            style={[styles.addBtn, { borderColor: theme.colors.outline }]}
            activeOpacity={0.7}
          >
            <Icon name="Plus" size={18} color={theme.colors.primary} />
            <Text style={[styles.addBtnLabel, { color: theme.colors.primary }]}>添加资产</Text>
          </TouchableOpacity>
        }
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={theme.colors.primary}
          />
        }
        renderItem={({ item: [cat, items] }) => {
          const iconName = ASSET_CATEGORY_ICONS[cat as keyof typeof ASSET_CATEGORY_ICONS] || 'Package';
          return (
            <View style={styles.categoryGroup}>
              <View style={styles.categoryHeader}>
                <Icon name={iconName} size={18} color="primary" />
                <Text style={[styles.categoryTitle, { color: theme.colors.onSurface }]}>
                  {AssetCategoryLabels[cat as keyof typeof AssetCategoryLabels]}
                </Text>
                <Text style={[styles.categoryCount, { color: theme.colors.onSurfaceVariant }]}>
                  {items.length}
                </Text>
              </View>
              {items.map(asset => {
                const cost = costMap.get(asset.id);
                const usage = usageMap.get(asset.id);
                return (
                  <AssetCardItem
                    key={asset.id}
                    asset={asset}
                    cost={cost}
                    usage={usage}
                    currencySymbol={currencySymbol}
                    onPress={() => setDetailAsset(asset)}
                    onLongPress={() => setDeleteTarget(asset)}
                    onPlusOne={() => handleUsagePlusOne(asset.id)}
                  />
                );
              })}
            </View>
          );
        }}
        ListEmptyComponent={
          <EmptyState
            icon="Package"
            title="暂无资产"
            description="你买的东西，每个月都在花你的钱。&#10;记录它们，看看真相。"
            actionLabel="添加资产"
            onAction={() => setShowAdd(true)}
          />
        }
      />

      {/* Add asset button is at the bottom of the list */}

      {/* Modals — will be updated in Phase 11 */}
      <AddAssetModal visible={showAdd} onClose={() => setShowAdd(false)} onSaved={() => { loadAssets(); toast.show('资产已保存', 'success'); }} />
      <AssetDetailModal asset={detailAsset} onClose={() => setDetailAsset(null)} />
      <HoldingCostExplainer visible={showCostExplainer} onClose={() => setShowCostExplainer(false)} />
      <ConfirmSheet
        visible={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
        title="删除资产"
        description={deleteTarget ? `确定要删除"${deleteTarget.name}"吗？所有相关数据将永久删除。` : undefined}
        confirmLabel="删除"
        icon="Trash2"
        variant="danger"
      />
    </View>
  );
}

// ── Asset Card Item ──

function AssetCardItem({ asset, cost, usage, currencySymbol, onPress, onLongPress, onPlusOne }: {
  asset: Asset;
  cost?: HoldingCostResult;
  usage?: UsageResult;
  currencySymbol: string;
  onPress: () => void;
  onLongPress: () => void;
  onPlusOne: () => void;
}) {
  const theme = useAppTheme();
  const isActive = asset.status === AssetStatus.ACTIVE;
  const valuation = asset.currentValuation ?? asset.purchasePrice;
  const change = valuation - asset.purchasePrice;
  const months = getMonthsHeld(asset.purchaseDate);
  const iconName = ASSET_CATEGORY_ICONS[asset.category as keyof typeof ASSET_CATEGORY_ICONS] || 'Package';

  const statusColor = AssetStatusColors[asset.status];
  const hasUsage = usage && isFinite(usage.costPerUse);

  return (
    <AppCard onPress={onPress} onLongPress={onLongPress} style={styles.assetCard}>
      <View style={styles.cardHeader}>
        <View style={styles.cardLeft}>
          <Icon name={iconName} size={28} color="primary" />
          <View>
            <Text style={[styles.cardName, { color: theme.colors.onSurface }]}>
              {asset.name}
            </Text>
            <View style={[styles.statusBadge, { backgroundColor: statusColor + '20' }]}>
              <Text style={[styles.statusText, { color: statusColor }]}>
                {AssetStatusLabels[asset.status]}
              </Text>
            </View>
          </View>
        </View>
        <View style={styles.cardRight}>
          <Text style={[styles.valuationAmount, { color: theme.colors.onSurface }]}>
            {formatCompactCurrency(valuation, currencySymbol)}
          </Text>
          {change !== 0 && asset.purchasePrice !== 0 ? (
            <Text style={[styles.changeText, { color: change > 0 ? theme.colors.success : theme.colors.error }]}>
              {change > 0 ? '↑' : '↓'} {Math.abs(change / asset.purchasePrice * 100).toFixed(0)}%
            </Text>
          ) : null}
        </View>
      </View>

      {isActive ? (
        <View style={[styles.cardFooter, { borderTopColor: theme.colors.outline }]}>
          {asset.usageTracking ? (
            <>
              {/* Row 1: Hero — cost-per-use + [+1] button */}
              <View style={styles.footerRow1}>
                <Text style={[
                  styles.heroNumber,
                  { color: usage?.isNeglected ? theme.colors.warning : theme.colors.primary },
                ]}>
                  {hasUsage ? `次均 ${formatCurrency(usage!.costPerUse, currencySymbol)}` : '从未使用'}
                </Text>
                <TouchableOpacity
                  onPress={onPlusOne}
                  style={[styles.plusOneBtn, { backgroundColor: theme.colors.primaryContainer }]}
                  activeOpacity={0.6}
                >
                  <Icon name="Plus" size={18} color="primary" />
                </TouchableOpacity>
              </View>
              {/* Row 2: Secondary — holding cost + usage count */}
              <View style={styles.footerRow2}>
                {cost ? (
                  <Text style={[styles.secondaryInfo, { color: theme.colors.onSurfaceVariant }]}>
                    {formatCurrency(cost.monthlyTotal, currencySymbol)}/月 · ≈{formatCurrency(cost.dailyAverage, currencySymbol)}/天
                    {usage && usage.useCount > 0 ? ` · 已用 ${usage.useCount} 次` : ''}
                  </Text>
                ) : (
                  <Text style={[styles.secondaryInfo, { color: theme.colors.onSurfaceVariant }]}>
                    {months}个月
                  </Text>
                )}
                {usage?.isNeglected && (
                  <Text style={[styles.neglectTag, { color: theme.colors.warning }]}>闲置 {usage.daysSinceLastUse} 天</Text>
                )}
              </View>
            </>
          ) : (
            /* No usage tracking — classic footer */
            <View style={styles.footerRow1}>
              {cost ? (
                <View style={styles.costInfo}>
                  <Text style={[styles.heroNumber, { color: theme.colors.primary }]}>
                    {formatCurrency(cost.monthlyTotal, currencySymbol)}/月
                  </Text>
                  <Text style={[styles.secondaryInfo, { color: theme.colors.onSurfaceVariant }]}>
                    ≈ {formatCurrency(cost.dailyAverage, currencySymbol)}/天
                  </Text>
                </View>
              ) : (
                <Text style={[styles.secondaryInfo, { color: theme.colors.onSurfaceVariant }]}>
                  {months}个月
                </Text>
              )}
            </View>
          )}
        </View>
      ) : null}
    </AppCard>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  overviewCard: { marginHorizontal: 16, marginTop: 16, marginBottom: 8 },
  overviewHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  overviewTitle: { fontSize: 16, fontWeight: '700' },
  helpBtn: { padding: 4 },
  overviewRow: { flexDirection: 'row' },
  overviewItem: { flex: 1, alignItems: 'center' },
  overviewLabel: { fontSize: 12 },
  overviewValue: { fontSize: 20, fontWeight: '700', marginTop: 4 },
  filterRow: { flexDirection: 'row', paddingHorizontal: 16, marginBottom: 8 },
  list: { paddingHorizontal: 16, paddingBottom: 24 },
  categoryGroup: { marginBottom: 16 },
  categoryHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8, paddingVertical: 4 },
  categoryTitle: { fontSize: 15, fontWeight: '600' },
  categoryCount: { fontSize: 12 },
  assetCard: { marginBottom: 8 },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  cardLeft: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  cardName: { fontSize: 16, fontWeight: '600' },
  statusBadge: { paddingHorizontal: 6, paddingVertical: 1, borderRadius: 4, marginTop: 2, alignSelf: 'flex-start' },
  statusText: { fontSize: 10, fontWeight: '500' },
  cardRight: { alignItems: 'flex-end' },
  valuationAmount: { fontSize: 18, fontWeight: '700' },
  changeText: { fontSize: 12, fontWeight: '500', marginTop: 2 },
  cardFooter: { marginTop: 12, paddingTop: 12, borderTopWidth: StyleSheet.hairlineWidth },
  // Tracking ON: hero number + +1 button
  footerRow1: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  heroNumber: { fontSize: 17, fontWeight: '700' },
  plusOneBtn: { width: 36, height: 36, borderRadius: 18, justifyContent: 'center', alignItems: 'center' },
  // Tracking ON: secondary info line
  footerRow2: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 6 },
  secondaryInfo: { fontSize: 12 },
  neglectTag: { fontSize: 12, fontWeight: '600' },
  // Tracking OFF: classic footer
  costInfo: { flexDirection: 'row', gap: 12 },
  // Add button
  addBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    marginTop: spacing.sm,
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    borderStyle: 'dashed',
  },
  addBtnLabel: { fontSize: 15, fontWeight: '600' },
});
