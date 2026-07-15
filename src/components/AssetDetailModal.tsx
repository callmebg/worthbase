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
} from 'react-native';
import { useAppTheme } from '@/utils/format';
import { useAssetStore } from '@/stores/asset-store';
import { useSettingsStore } from '@/stores/settings-store';
import { HoldingCostCalculator } from '@/engine/HoldingCostCalculator';
import { SettlementCalculator } from '@/engine/SettlementCalculator';
import { RecurringExpenseRepository } from '@/db/recurring-expense-repository';
import { MaintenanceRepository } from '@/db/maintenance-repository';
import { HoldingCostBreakdown } from './HoldingCostBreakdown';
import { ValuationChart } from './ValuationChart';
import { SettlementModal } from './SettlementModal';
import { AddAssetModal } from './AddAssetModal';
import { DatePickerField } from './DatePickerField';
import {
  AssetStatus,
  AssetStatusLabels,
  AssetStatusColors,
  AssetCategoryLabels,
} from '@/types/enums';
import { ASSET_CATEGORY_ICONS } from '@/theme/icons';
import type { Asset, HoldingCostResult, RecurringExpense, MaintenanceRecord, SettlementResult } from '@/types/models';
import { formatCurrency, formatDate, getCurrentDate, getCurrentMonth, getMonthsHeld, formatDuration } from '@/utils/format';
import { AppBottomSheet } from '@/components/ui/BottomSheet';
import { AppButton } from '@/components/ui/Button';
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
  const [recurringFrom, setRecurringFrom] = useState(getCurrentMonth());

  // Maintenance record add state
  const [showAddMaintenance, setShowAddMaintenance] = useState(false);
  const [maintenanceName, setMaintenanceName] = useState('');
  const [maintenanceAmount, setMaintenanceAmount] = useState('');
  const [maintenanceDate, setMaintenanceDate] = useState(getCurrentDate());
  const [maintenanceAmortize, setMaintenanceAmortize] = useState(true);

  const loadData = useCallback(async () => {
    if (!asset) return;
    setLoading(true);
    try {
      const hc = await HoldingCostCalculator.calculate(asset);
      setHoldingCost(hc);
      setRecurring(await RecurringExpenseRepository.getByAsset(asset.id));
      setMaintenance(await MaintenanceRepository.getByAsset(asset.id));
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

  if (!asset) return null;

  const isActive = asset.status === AssetStatus.ACTIVE;
  const isSold = asset.status === AssetStatus.SOLD;
  const isRetired = asset.status === AssetStatus.RETIRED;
  const iconName = ASSET_CATEGORY_ICONS[asset.category as keyof typeof ASSET_CATEGORY_ICONS] || 'Package';

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
      await RecurringExpenseRepository.create({ assetId: asset.id, name: recurringName.trim(), amount, effectiveFrom: recurringFrom, effectiveTo: null });
      setRecurringName(''); setRecurringAmount(''); setShowAddRecurring(false);
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
              <Text style={[styles.subAmount, { color: theme.colors.onSurface }]}>{formatCurrency(re.amount, currencySymbol)}/月</Text>
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
              <DatePickerField label="生效日期" value={recurringFrom} onChange={setRecurringFrom} />
              <AppButton title="确认添加" variant="primary" compact onPress={handleAddRecurring} style={{ alignSelf: 'flex-start' }} />
            </View>
          )}
        </View>

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
        <AppTextInput bottomSheet label="输入当前估值" value={newValuation} onChangeText={setNewValuation} keyboardType="decimal-pad" autoFocus />
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
    </AppBottomSheet>
  );
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
  switchRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 4 },
  switchLabel: { fontSize: 14 },
  valTitle: { fontSize: 20, fontWeight: '700', marginBottom: 4 },
  valSubtitle: { fontSize: 14, marginBottom: 16 },
  valActions: { flexDirection: 'row', gap: 12 },
});
