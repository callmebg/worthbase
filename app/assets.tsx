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
  Alert,
  TouchableOpacity,
} from 'react-native';
import { useAppTheme } from '@/utils/format';
import { useFocusEffect } from 'expo-router';
import { useAssetStore } from '@/stores/asset-store';
import { useSettingsStore } from '@/stores/settings-store';
import { HoldingCostCalculator } from '@/engine/HoldingCostCalculator';
import { AddAssetModal } from '@/components/AddAssetModal';
import { AssetDetailModal } from '@/components/AssetDetailModal';
import {
  AssetStatus,
  AssetStatusLabels,
  AssetStatusColors,
  AssetCategoryLabels,
} from '@/types/enums';
import { ASSET_CATEGORY_ICONS, ASSET_STATUS_ICONS } from '@/theme/icons';
import type { Asset, HoldingCostResult } from '@/types/models';
import { formatCurrency, formatCompactCurrency, getMonthsHeld } from '@/utils/format';
import { AppCard } from '@/components/ui/Card';
import { AppChip } from '@/components/ui/Chip';
import { AppFAB } from '@/components/ui/FAB';
import { EmptyState } from '@/components/ui/EmptyState';
import { Icon } from '@/components/ui/Icon';

type StatusFilter = 'all' | AssetStatus;

export default function AssetsScreen() {
  const theme = useAppTheme();
  const { assets, statusFilter, loadAssets, setStatusFilter, deleteAsset } = useAssetStore();
  const { currencySymbol } = useSettingsStore();
  const [showAdd, setShowAdd] = useState(false);
  const [detailAsset, setDetailAsset] = useState<Asset | null>(null);
  const [costMap, setCostMap] = useState<Map<string, HoldingCostResult>>(new Map());

  useFocusEffect(useCallback(() => { loadAssets(); }, []));

  useEffect(() => {
    (async () => {
      const activeAssets = assets.filter(a => a.status === AssetStatus.ACTIVE);
      const results = await HoldingCostCalculator.calculateAll(activeAssets);
      setCostMap(results);
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

  const handleDelete = (asset: Asset) => {
    Alert.alert('删除资产', `确定要删除"${asset.name}"吗？所有相关数据将永久删除。`, [
      { text: '取消', style: 'cancel' },
      {
        text: '删除', style: 'destructive', onPress: async () => {
          try {
            await deleteAsset(asset.id);
            setDetailAsset(null);
          } catch (err) {
            Alert.alert('删除失败', (err as Error).message);
          }
        },
      },
    ]);
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      {/* Overview Stats Card */}
      <AppCard style={styles.overviewCard}>
        <View style={styles.overviewHeader}>
          <Text style={[styles.overviewTitle, { color: theme.colors.onSurface }]}>资产概览</Text>
          <TouchableOpacity
            onPress={() =>
              Alert.alert(
                '持有成本计算规则',
                '持有成本 = 分摊成本 + 经常性支出 + 维护分摊\n\n' +
                '【分摊成本】购入价按分摊方式逐月摊消：\n' +
                '• 简单线性：购入价 ÷ 已持有月数（递减）\n' +
                '• 预期寿命：购入价 ÷ 预期使用月数（固定）\n' +
                '• 残值分摊：(购入价 - 残值) ÷ 预期月数（固定）\n' +
                '• 不分摊：月分摊 = 0\n\n' +
                '【经常性支出】绑定在资产上的周期性费用（如保险、订阅），按月计算。\n\n' +
                '【维护分摊】一次性维护费用，勾选"纳入分摊"后按剩余持有月数均摊。\n\n' +
                '【资产总值】所有在用资产的当前估值之和。\n' +
                '【月持有成本】所有在用资产的月持有成本之和。',
              )
            }
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
                return (
                  <AssetCardItem
                    key={asset.id}
                    asset={asset}
                    cost={cost}
                    currencySymbol={currencySymbol}
                    onPress={() => setDetailAsset(asset)}
                    onLongPress={() => handleDelete(asset)}
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
            description="点击下方按钮添加第一个资产"
            actionLabel="添加资产"
            onAction={() => setShowAdd(true)}
          />
        }
      />

      {/* FAB */}
      <AppFAB icon="Plus" label="添加资产" onPress={() => setShowAdd(true)} />

      {/* Modals — will be updated in Phase 11 */}
      <AddAssetModal visible={showAdd} onClose={() => setShowAdd(false)} onSaved={() => loadAssets()} />
      <AssetDetailModal asset={detailAsset} onClose={() => setDetailAsset(null)} />
    </View>
  );
}

// ── Asset Card Item ──

function AssetCardItem({ asset, cost, currencySymbol, onPress, onLongPress }: {
  asset: Asset;
  cost?: HoldingCostResult;
  currencySymbol: string;
  onPress: () => void;
  onLongPress: () => void;
}) {
  const theme = useAppTheme();
  const isActive = asset.status === AssetStatus.ACTIVE;
  const valuation = asset.currentValuation ?? asset.purchasePrice;
  const change = valuation - asset.purchasePrice;
  const months = getMonthsHeld(asset.purchaseDate);
  const iconName = ASSET_CATEGORY_ICONS[asset.category as keyof typeof ASSET_CATEGORY_ICONS] || 'Package';

  const statusColor = AssetStatusColors[asset.status];

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
          {change !== 0 ? (
            <Text style={[styles.changeText, { color: change > 0 ? theme.colors.success : theme.colors.error }]}>
              {change > 0 ? '↑' : '↓'} {Math.abs(change / asset.purchasePrice * 100).toFixed(0)}%
            </Text>
          ) : null}
        </View>
      </View>

      {isActive && cost ? (
        <View style={[styles.cardFooter, { borderTopColor: theme.colors.outline }]}>
          <View style={styles.costInfo}>
            <Text style={[styles.costMonthly, { color: theme.colors.primary }]}>
              {formatCurrency(cost.monthlyTotal, currencySymbol)}/月
            </Text>
            <Text style={[styles.costDaily, { color: theme.colors.onSurfaceVariant }]}>
              {formatCurrency(cost.dailyAverage, currencySymbol)}/天
            </Text>
          </View>
          <Text style={[styles.heldDuration, { color: theme.colors.onSurfaceVariant }]}>
            {months}个月
          </Text>
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
  list: { paddingHorizontal: 16, paddingBottom: 120 },
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
  cardFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 12, paddingTop: 12, borderTopWidth: StyleSheet.hairlineWidth },
  costInfo: { flexDirection: 'row', gap: 12 },
  costMonthly: { fontSize: 14, fontWeight: '600' },
  costDaily: { fontSize: 13 },
  heldDuration: { fontSize: 12 },
});
