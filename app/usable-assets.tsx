/**
 * WorthBase (家底) - Usable Assets Screen (可用资金)
 *
 * 只回答一个问题：**这一天，你手上能拿出多少钱？**
 *
 * 刻意做成「选一个日期 → 给一个数字」。**不做时间轴滑动条、不做多日期对比曲线**
 * ——那会把一个答案变成一张需要解读的图表，而这个页面存在的意义就是给一个答案。
 *
 * 三条铁律（与 UsableAssetsCalculator 一致）：
 *  1. 公积金等受限账户永不计入，无论日期选到多远
 *  2. 定期存款只算**本金**，不算利息——App 显示的每个数字都是用户亲手输入的
 *  3. 负债账户不计入
 */

import { useCallback, useEffect, useState } from 'react';
import { View, Text, ScrollView, StyleSheet } from 'react-native';
import { useFocusEffect } from 'expo-router';
import { useAppTheme, formatCurrency, getCurrentDate } from '@/utils/format';
import { useSettingsStore } from '@/stores/settings-store';
import { UsableAssetsCalculator } from '@/engine/UsableAssetsCalculator';
import { DatePickerField } from '@/components/DatePickerField';
import { AppCard } from '@/components/ui/Card';
import { Icon } from '@/components/ui/Icon';
import { spacing, radius } from '@/theme/tokens';
import type { UsableAssetsResult } from '@/types/models';

export default function UsableAssetsScreen() {
  const theme = useAppTheme();
  const { currencySymbol } = useSettingsStore();
  const [targetDate, setTargetDate] = useState(getCurrentDate());
  const [result, setResult] = useState<UsableAssetsResult | null>(null);

  const recalculate = useCallback(async (date: string) => {
    setResult(await UsableAssetsCalculator.calculate(date));
  }, []);

  // 从别的页面改了余额/收支再回来，要重算
  useFocusEffect(
    useCallback(() => {
      recalculate(targetDate);
    }, [recalculate, targetDate])
  );

  useEffect(() => {
    recalculate(targetDate);
  }, [targetDate, recalculate]);

  const isToday = targetDate === getCurrentDate();

  const rows: { label: string; value: number; hint?: string; muted?: boolean }[] = result
    ? [
        { label: '可用活期', value: result.availableLiquid },
        {
          label: '已到期定期（本金）',
          value: result.maturedDeposits,
          hint: '不含利息',
          muted: result.maturedDeposits === 0,
        },
        {
          label: `累计净现金流${result.monthsCounted > 0 ? `（${result.monthsCounted} 个月）` : ''}`,
          value: result.netCashFlow,
          hint: '固定收入 − 固定支出',
          muted: result.netCashFlow === 0,
        },
      ]
    : [];

  return (
    <ScrollView style={[styles.container, { backgroundColor: theme.colors.background }]}>
      {/* ── 日期 + 结果 ── */}
      <View style={[styles.heroCard, { backgroundColor: theme.colors.primary }]}>
        <Text style={[styles.heroLabel, { color: theme.colors.onPrimary }]}>
          {isToday ? '今天可用' : `${targetDate} 可用`}
        </Text>
        <Text style={[styles.heroAmount, { color: theme.colors.onPrimary }]}>
          {formatCurrency(result?.total ?? 0, currencySymbol)}
        </Text>
        <Text style={[styles.heroSub, { color: theme.colors.onPrimary }]}>
          这笔钱那天你真的能拿出来用
        </Text>
      </View>

      <AppCard style={styles.section}>
        <DatePickerField label="查哪一天" value={targetDate} onChange={setTargetDate} />
      </AppCard>

      {/* ── 拆解 ── */}
      {result && (
        <AppCard style={styles.section}>
          <Text style={[styles.sectionTitle, { color: theme.colors.onSurface }]}>怎么算出来的</Text>
          {rows.map((row, index) => (
            <View key={row.label}>
              {index > 0 && <View style={[styles.divider, { backgroundColor: theme.colors.outline }]} />}
              <View style={styles.row}>
                <View style={styles.rowMain}>
                  <Text
                    style={[
                      styles.rowLabel,
                      { color: row.muted ? theme.colors.onSurfaceVariant : theme.colors.onSurface },
                    ]}
                  >
                    {row.label}
                  </Text>
                  {row.hint ? (
                    <Text style={[styles.rowHint, { color: theme.colors.onSurfaceVariant }]}>{row.hint}</Text>
                  ) : null}
                </View>
                <Text
                  style={[
                    styles.rowValue,
                    {
                      color:
                        row.value < 0
                          ? theme.colors.error
                          : row.muted
                            ? theme.colors.onSurfaceVariant
                            : theme.colors.onSurface,
                    },
                  ]}
                >
                  {row.value < 0 ? '−' : ''}
                  {formatCurrency(Math.abs(row.value), currencySymbol)}
                </Text>
              </View>
            </View>
          ))}
        </AppCard>
      )}

      {/* ── 口径说明 ── */}
      <View style={[styles.noteBox, { backgroundColor: theme.colors.surfaceVariant }]}>
        <Icon name="Info" size={14} color="onSurfaceVariant" />
        <Text style={[styles.noteText, { color: theme.colors.onSurfaceVariant }]}>
          公积金等受限资金不计入——等得再久它也取不出来。定期存款只算本金，不算利息；
          这里显示的每个数字，都是你自己录进去的。
        </Text>
      </View>
    </ScrollView>
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
  heroAmount: { fontSize: 36, fontWeight: '700', marginTop: 4 },
  heroSub: { fontSize: 12, opacity: 0.85, marginTop: 6 },
  section: { marginHorizontal: spacing.md, marginBottom: spacing.sm },
  sectionTitle: { fontSize: 16, fontWeight: '700', marginBottom: spacing.xs },
  row: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, gap: spacing.sm },
  rowMain: { flex: 1 },
  rowLabel: { fontSize: 14, fontWeight: '500' },
  rowHint: { fontSize: 11, marginTop: 2 },
  rowValue: { fontSize: 15, fontWeight: '600' },
  divider: { height: StyleSheet.hairlineWidth },
  noteBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    marginHorizontal: spacing.md,
    marginBottom: spacing.lg,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: 12,
  },
  noteText: { flex: 1, fontSize: 12, lineHeight: 18 },
});
