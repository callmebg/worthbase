/**
 * WorthBase (家底) - Cash Flow Screen (固定收支)
 *
 * 管的是**家庭层面**的周期性现金流：
 *  - 固定收入：月薪、季度奖、年终奖
 *  - 不依附于资产的固定支出：房租、宽带、人寿险
 *
 * 依附于资产的支出（车险、绑在房子上的物业费）不在这里——它们在资产详情里，
 * 算持有成本。两张表按领域互斥，相加不会重复计算。页顶那行只读汇总就是把
 * 这部分也报给用户看，避免他以为「我的支出怎么少了一半」。
 *
 * 这里只录**周期性、计划性**的金额，不录流水。是财务报表的输入，不是流水账的输入。
 */

import { useCallback, useEffect, useState } from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity } from 'react-native';
import { useFocusEffect, router } from 'expo-router';
import { useAppTheme, formatCurrency, getCurrentMonth } from '@/utils/format';
import { useSettingsStore } from '@/stores/settings-store';
import { useCashFlowStore } from '@/stores/cash-flow-store';
import { RecurringExpenseCalculator, toMonthlyAmount } from '@/engine/RecurringExpenseCalculator';
import { RecurringExpenseRepository } from '@/db/recurring-expense-repository';
import {
  CashFlowKind,
  CashFlowKindLabels,
  ExpenseFrequency,
  ExpenseFrequencyLabels,
  ExpenseFrequencySuffixes,
  EXPENSE_FREQUENCY_MONTHS,
} from '@/types/enums';
import type { CashFlow } from '@/types/models';
import { AppCard } from '@/components/ui/Card';
import { AppButton } from '@/components/ui/Button';
import { AppChip } from '@/components/ui/Chip';
import { AppTextInput } from '@/components/ui/TextInput';
import { AppBottomSheet } from '@/components/ui/BottomSheet';
import { Icon } from '@/components/ui/Icon';
import { EmptyState } from '@/components/ui/EmptyState';
import { ConfirmSheet } from '@/components/ConfirmSheet';
import { DatePickerField } from '@/components/DatePickerField';
import { useToast } from '@/hooks/useToast';
import { spacing, radius } from '@/theme/tokens';
import { isValidNumber } from '@/utils/validation';

const FREQUENCIES = Object.values(ExpenseFrequency);
const KINDS = Object.values(CashFlowKind);

export default function CashFlowScreen() {
  const theme = useAppTheme();
  const toast = useToast();
  const { currencySymbol } = useSettingsStore();
  const { cashFlows, loadCashFlows, removeCashFlow } = useCashFlowStore();

  const [sheetVisible, setSheetVisible] = useState(false);
  const [editTarget, setEditTarget] = useState<CashFlow | null>(null);
  const [pendingKind, setPendingKind] = useState<CashFlowKind>(CashFlowKind.INCOME);
  const [deleteTarget, setDeleteTarget] = useState<CashFlow | null>(null);
  const [assetSummary, setAssetSummary] = useState({ count: 0, total: 0 });

  useFocusEffect(
    useCallback(() => {
      loadCashFlows();
      // 资产附属支出的只读汇总，防止用户以为「固定支出」就只有这一页
      const month = getCurrentMonth();
      (async () => {
        const [list, total] = await Promise.all([
          RecurringExpenseRepository.getForMonth(month),
          RecurringExpenseCalculator.getMonthlyTotal(month),
        ]);
        setAssetSummary({ count: list.length, total });
      })();
    }, [loadCashFlows])
  );

  const incomes = cashFlows.filter((f) => f.kind === CashFlowKind.INCOME);
  const expenses = cashFlows.filter((f) => f.kind === CashFlowKind.EXPENSE);

  const sumMonthly = (list: CashFlow[]) => list.reduce((sum, f) => sum + toMonthlyAmount(f), 0);
  const monthlyIncome = sumMonthly(incomes);
  const monthlyHouseholdExpense = sumMonthly(expenses);
  const monthlyExpenseTotal = monthlyHouseholdExpense + assetSummary.total;
  const monthlyNet = monthlyIncome - monthlyExpenseTotal;

  const openAdd = (kind: CashFlowKind) => {
    setEditTarget(null);
    setPendingKind(kind);
    setSheetVisible(true);
  };

  const openEdit = (flow: CashFlow) => {
    setEditTarget(flow);
    setPendingKind(flow.kind);
    setSheetVisible(true);
  };

  const closeSheet = () => {
    setSheetVisible(false);
    setEditTarget(null);
  };

  return (
    <ScrollView style={[styles.container, { backgroundColor: theme.colors.background }]}>
      {/* ── 月度净流入 hero ── */}
      <View style={[styles.heroCard, { backgroundColor: theme.colors.primary }]}>
        <Text style={[styles.heroLabel, { color: theme.colors.onPrimary }]}>每月净流入</Text>
        <Text style={[styles.heroAmount, { color: theme.colors.onPrimary }]}>
          {monthlyNet >= 0 ? '+' : '−'}
          {formatCurrency(Math.abs(monthlyNet), currencySymbol)}
        </Text>
        <Text style={[styles.heroSub, { color: theme.colors.onPrimary }]}>
          收入 {formatCurrency(monthlyIncome, currencySymbol)} − 支出{' '}
          {formatCurrency(monthlyExpenseTotal, currencySymbol)}
        </Text>
      </View>

      {/* ── 资产附属支出（只读汇总，点击去资产页）── */}
      {assetSummary.count > 0 && (
        <TouchableOpacity
          onPress={() => router.push('/assets')}
          activeOpacity={0.7}
          style={[styles.assetSummaryRow, { backgroundColor: theme.colors.surfaceVariant }]}
        >
          <Icon name="Package" size={16} color="onSurfaceVariant" />
          <Text style={[styles.assetSummaryText, { color: theme.colors.onSurfaceVariant }]}>
            另有 {assetSummary.count} 笔资产附属支出 {formatCurrency(assetSummary.total, currencySymbol)}/月
          </Text>
          <Icon name="ChevronRight" size={16} color="onSurfaceVariant" />
        </TouchableOpacity>
      )}

      {/* ── 固定收入 ── */}
      <AppCard style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={[styles.sectionTitle, { color: theme.colors.onSurface }]}>
            {CashFlowKindLabels[CashFlowKind.INCOME]}
          </Text>
          <Text style={[styles.sectionTotal, { color: theme.colors.success }]}>
            +{formatCurrency(monthlyIncome, currencySymbol)}/月
          </Text>
        </View>
        {incomes.length === 0 ? (
          <Text style={[styles.sectionHint, { color: theme.colors.onSurfaceVariant }]}>
            月薪、季度奖、年终奖——录进来，净资产预测才准。
          </Text>
        ) : (
          incomes.map((flow) => (
            <CashFlowRow
              key={flow.id}
              flow={flow}
              currencySymbol={currencySymbol}
              onPress={() => openEdit(flow)}
            />
          ))
        )}
        <AppButton
          title="添加收入"
          variant="secondary"
          icon="Plus"
          onPress={() => openAdd(CashFlowKind.INCOME)}
          style={{ marginTop: spacing.sm }}
        />
      </AppCard>

      {/* ── 固定支出 ── */}
      <AppCard style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={[styles.sectionTitle, { color: theme.colors.onSurface }]}>
            {CashFlowKindLabels[CashFlowKind.EXPENSE]}
          </Text>
          <Text style={[styles.sectionTotal, { color: theme.colors.error }]}>
            −{formatCurrency(monthlyHouseholdExpense, currencySymbol)}/月
          </Text>
        </View>
        {expenses.length === 0 ? (
          <Text style={[styles.sectionHint, { color: theme.colors.onSurfaceVariant }]}>
            房租、宽带、人寿险这类不绑在某个东西上的支出记这里。
          </Text>
        ) : (
          expenses.map((flow) => (
            <CashFlowRow
              key={flow.id}
              flow={flow}
              currencySymbol={currencySymbol}
              onPress={() => openEdit(flow)}
            />
          ))
        )}
        <AppButton
          title="添加支出"
          variant="secondary"
          icon="Plus"
          onPress={() => openAdd(CashFlowKind.EXPENSE)}
          style={{ marginTop: spacing.sm }}
        />
      </AppCard>

      {cashFlows.length === 0 && (
        <EmptyState
          icon="Wallet"
          title="还没有固定收支"
          description="车险、物业费等依附于资产的支出，请在资产详情里添加；房租、宽带、保险和各类收入记在这里。"
        />
      )}

      <CashFlowSheet
        visible={sheetVisible}
        existing={editTarget}
        defaultKind={pendingKind}
        currencySymbol={currencySymbol}
        onClose={closeSheet}
        onSaved={(message) => { closeSheet(); toast.show(message, 'success'); }}
        onError={(message) => toast.show(message, 'error')}
        onDelete={(flow) => { setSheetVisible(false); setEditTarget(null); setDeleteTarget(flow); }}
      />

      <ConfirmSheet
        visible={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={async () => {
          if (!deleteTarget) return;
          try {
            await removeCashFlow(deleteTarget.id);
            toast.show('已删除', 'success');
          } catch (err) {
            toast.show(`删除失败: ${(err as Error).message}`, 'error');
          } finally {
            setDeleteTarget(null);
          }
        }}
        title="删除这条记录"
        description={deleteTarget ? `确定要删除「${deleteTarget.name}」吗？此操作不可撤销。` : undefined}
        confirmLabel="删除"
        icon="Trash2"
        variant="danger"
      />
    </ScrollView>
  );
}

// ── 单行 ──

function CashFlowRow({ flow, currencySymbol, onPress }: {
  flow: CashFlow;
  currencySymbol: string;
  onPress: () => void;
}) {
  const theme = useAppTheme();
  const monthly = toMonthlyAmount(flow);
  const isIncome = flow.kind === CashFlowKind.INCOME;
  const ended = flow.effectiveTo !== null && flow.effectiveTo < getCurrentMonth();

  return (
    <TouchableOpacity onPress={onPress} activeOpacity={0.7} style={styles.row}>
      <View style={styles.rowMain}>
        <Text style={[styles.rowName, { color: theme.colors.onSurface }, ended && styles.rowEnded]}>
          {flow.name}
        </Text>
        <Text style={[styles.rowMeta, { color: theme.colors.onSurfaceVariant }]}>
          {formatCurrency(flow.amount, currencySymbol)}
          {ExpenseFrequencySuffixes[flow.frequency]}
          {flow.frequency !== ExpenseFrequency.MONTHLY
            ? ` · 月均 ${formatCurrency(monthly, currencySymbol)}`
            : ''}
          {flow.effectiveTo ? ` · 至 ${flow.effectiveTo}` : ''}
          {ended ? ' · 已结束' : ''}
        </Text>
      </View>
      <Text
        style={[
          styles.rowAmount,
          {
            color: ended
              ? theme.colors.onSurfaceVariant
              : isIncome
                ? theme.colors.success
                : theme.colors.error,
          },
        ]}
      >
        {isIncome ? '+' : '−'}
        {formatCurrency(monthly, currencySymbol)}
      </Text>
    </TouchableOpacity>
  );
}

// ── 添加 / 编辑 BottomSheet ──

function CashFlowSheet({ visible, existing, defaultKind, currencySymbol, onClose, onSaved, onError, onDelete }: {
  visible: boolean;
  existing: CashFlow | null;
  defaultKind: CashFlowKind;
  currencySymbol: string;
  onClose: () => void;
  onSaved: (message: string) => void;
  onError: (message: string) => void;
  onDelete: (flow: CashFlow) => void;
}) {
  const theme = useAppTheme();
  const [name, setName] = useState('');
  const [amount, setAmount] = useState('');
  const [kind, setKind] = useState<CashFlowKind>(defaultKind);
  const [frequency, setFrequency] = useState<ExpenseFrequency>(ExpenseFrequency.MONTHLY);
  // DatePickerField 需要完整日期，内部存 'YYYY-MM-01'，落库时截成 'YYYY-MM'
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');

  // 每次打开时按 existing / defaultKind 重置表单
  useEffect(() => {
    if (!visible) return;
    setName(existing?.name ?? '');
    setAmount(existing ? String(existing.amount) : '');
    setKind(existing?.kind ?? defaultKind);
    setFrequency(existing?.frequency ?? ExpenseFrequency.MONTHLY);
    setFromDate(`${existing?.effectiveFrom ?? getCurrentMonth()}-01`);
    setToDate(existing?.effectiveTo ? `${existing.effectiveTo}-01` : '');
  }, [visible, existing, defaultKind]);

  const amountError = amount && !isValidNumber(amount) ? '请输入有效金额' : '';
  const monthlyPreview =
    amount && isValidNumber(amount)
      ? parseFloat(amount) / EXPENSE_FREQUENCY_MONTHS[frequency]
      : 0;

  const handleSave = async () => {
    if (!name.trim()) { onError('请填写名称'); return; }
    if (!amount || !isValidNumber(amount)) { onError('请填写有效金额'); return; }
    if (!fromDate) { onError('请选择生效月份'); return; }

    const effectiveFrom = fromDate.substring(0, 7);
    const effectiveTo = toDate ? toDate.substring(0, 7) : null;
    if (effectiveTo && effectiveTo < effectiveFrom) {
      onError('结束月份不能早于生效月份');
      return;
    }

    const payload = {
      kind,
      name: name.trim(),
      amount: parseFloat(amount),
      frequency,
      effectiveFrom,
      effectiveTo,
      note: null,
    };

    try {
      if (existing) {
        await useCashFlowStore.getState().editCashFlow(existing.id, payload);
        onSaved('已保存');
      } else {
        await useCashFlowStore.getState().addCashFlow(payload);
        onSaved('已添加');
      }
    } catch (err) {
      onError(`保存失败: ${(err as Error).message}`);
    }
  };

  return (
    <AppBottomSheet visible={visible} onClose={onClose} snapPoints={['75%', '92%']}>
      <Text style={[styles.sheetTitle, { color: theme.colors.onSurface }]}>
        {existing ? '编辑' : '添加'}
        {CashFlowKindLabels[kind]}
      </Text>

      <View style={styles.chipRow}>
        {KINDS.map((k) => (
          <AppChip
            key={k}
            label={CashFlowKindLabels[k]}
            selected={kind === k}
            onPress={() => setKind(k)}
            icon={k === CashFlowKind.INCOME ? 'TrendingUp' : 'TrendingDown'}
          />
        ))}
      </View>

      <AppTextInput
        bottomSheet
        label="名称"
        value={name}
        onChangeText={setName}
        placeholder="房租 / 月薪 / 年终奖"
      />
      <AppTextInput
        bottomSheet
        label="金额"
        value={amount}
        onChangeText={setAmount}
        keyboardType="numeric"
        placeholder="0.00"
        error={amountError}
      />

      <Text style={[styles.label, { color: theme.colors.onSurfaceVariant }]}>周期</Text>
      <View style={styles.chipRow}>
        {FREQUENCIES.map((f) => (
          <AppChip
            key={f}
            label={ExpenseFrequencyLabels[f]}
            selected={frequency === f}
            onPress={() => setFrequency(f)}
          />
        ))}
      </View>
      {frequency !== ExpenseFrequency.MONTHLY && monthlyPreview > 0 && (
        <Text style={[styles.previewText, { color: theme.colors.onSurfaceVariant }]}>
          折合月均 {formatCurrency(monthlyPreview, currencySymbol)}
        </Text>
      )}

      <DatePickerField label="生效月份" value={fromDate} onChange={setFromDate} />
      <DatePickerField label="结束月份（留空表示持续中）" value={toDate} onChange={setToDate} />
      {toDate ? (
        <AppButton title="清除结束月份" variant="text" onPress={() => setToDate('')} />
      ) : null}

      <View style={styles.sheetActions}>
        <AppButton title="取消" variant="text" onPress={onClose} style={styles.sheetBtn} />
        <AppButton title="保存" variant="primary" onPress={handleSave} style={styles.sheetBtn} />
      </View>

      {existing ? (
        <AppButton
          title="删除"
          variant="danger"
          icon="Trash2"
          onPress={() => onDelete(existing)}
          style={{ marginTop: spacing.sm }}
        />
      ) : null}
    </AppBottomSheet>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  heroCard: {
    margin: spacing.md,
    marginBottom: spacing.sm,
    borderRadius: radius.lg,
    padding: spacing.lg,
  },
  heroLabel: { fontSize: 13, opacity: 0.85 },
  heroAmount: { fontSize: 32, fontWeight: '700', marginTop: 4 },
  heroSub: { fontSize: 12, opacity: 0.85, marginTop: 4 },
  assetSummaryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginHorizontal: spacing.md,
    marginBottom: spacing.sm,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: 10,
  },
  assetSummaryText: { flex: 1, fontSize: 12, lineHeight: 17 },
  section: { marginHorizontal: spacing.md, marginBottom: spacing.sm },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
    marginBottom: spacing.xs,
  },
  sectionTitle: { fontSize: 16, fontWeight: '700' },
  sectionTotal: { fontSize: 13, fontWeight: '600' },
  sectionHint: { fontSize: 12, lineHeight: 18, marginVertical: spacing.sm },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    gap: spacing.sm,
  },
  rowMain: { flex: 1 },
  rowName: { fontSize: 15, fontWeight: '500' },
  rowEnded: { textDecorationLine: 'line-through', opacity: 0.6 },
  rowMeta: { fontSize: 12, marginTop: 2 },
  rowAmount: { fontSize: 15, fontWeight: '600' },
  sheetTitle: { fontSize: 20, fontWeight: '700', marginBottom: spacing.md },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs, marginBottom: spacing.sm },
  label: { fontSize: 14, marginBottom: spacing.sm, marginTop: spacing.xs },
  previewText: { fontSize: 12, marginBottom: spacing.sm },
  sheetActions: { flexDirection: 'row', gap: spacing.sm + spacing.xs, marginTop: spacing.md },
  sheetBtn: { flex: 1 },
});
