/**
 * GoalProjectionExplainer — bottom-sheet explaining how the goal achievement date is predicted.
 * Shows the math in plain language: monthly growth, gap, data basis.
 */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useAppTheme } from '@/utils/format';
import { AppBottomSheet } from '@/components/ui';
import { Icon } from '@/components/ui/Icon';
import { spacing, radius } from '@/theme/tokens';
import type { ProjectionDetail } from '@/engine/ProjectionCalculator';
import { formatCurrency } from '@/utils/format';

interface GoalProjectionExplainerProps {
  visible: boolean;
  onClose: () => void;
  projection: ProjectionDetail | null;
  goal: number;
  currencySymbol: string;
}

/** A stat row: label on left, value on right. */
function StatRow({
  label,
  value,
  labelColor,
  valueColor,
  bold,
}: {
  label: string;
  value: string;
  labelColor: string;
  valueColor: string;
  bold?: boolean;
}) {
  return (
    <View style={styles.statRow}>
      <Text style={[styles.statLabel, { color: labelColor }]}>{label}</Text>
      <Text style={[styles.statValue, { color: valueColor }, bold && { fontWeight: '700' }]}>
        {value}
      </Text>
    </View>
  );
}

export function GoalProjectionExplainer({
  visible,
  onClose,
  projection,
  goal,
  currencySymbol,
}: GoalProjectionExplainerProps) {
  const theme = useAppTheme();

  if (!projection) return null;

  const dateStr = `${projection.achievementDate.substring(0, 4)}年${projection.achievementDate.substring(5, 7)}月`;
  const monthsText = projection.monthsNeeded < 12
    ? `${Math.round(projection.monthsNeeded)} 个月`
    : `${Math.floor(projection.monthsNeeded / 12)} 年 ${Math.round(projection.monthsNeeded % 12)} 个月`;

  return (
    <AppBottomSheet visible={visible} onClose={onClose} snapPoints={['55%']}>
      {/* Title */}
      <Text style={[styles.title, { color: theme.colors.onSurface }]}>
        预计 {dateStr} 达成
      </Text>
      <Text style={[styles.subtitle, { color: theme.colors.onSurfaceVariant }]}>
        基于你最近的净资产增长趋势推算
      </Text>

      {/* Key formula */}
      <View style={[styles.formulaBox, { backgroundColor: theme.colors.surfaceVariant }]}>
        <Text style={[styles.formulaText, { color: theme.colors.onSurface }]}>
          达成时间 = 差距 ÷ 月均增长
        </Text>
      </View>

      {/* Breakdown */}
      <View style={[styles.statsCard, { backgroundColor: theme.colors.surfaceVariant }]}>
        <StatRow
          label="当前净资产"
          value={formatCurrency(projection.currentValue, currencySymbol)}
          labelColor={theme.colors.onSurfaceVariant}
          valueColor={theme.colors.onSurface}
        />
        <StatRow
          label="目标"
          value={formatCurrency(goal, currencySymbol)}
          labelColor={theme.colors.onSurfaceVariant}
          valueColor={theme.colors.onSurface}
        />
        <View style={[styles.divider, { backgroundColor: theme.colors.outline }]} />
        <StatRow
          label="还差"
          value={formatCurrency(projection.gap, currencySymbol)}
          labelColor={theme.colors.onSurfaceVariant}
          valueColor={theme.colors.error}
          bold
        />
        <View style={[styles.divider, { backgroundColor: theme.colors.outline }]} />
        <StatRow
          label="月均增长"
          value={`≈ ${formatCurrency(projection.monthlyGrowth, currencySymbol)}`}
          labelColor={theme.colors.onSurfaceVariant}
          valueColor={theme.colors.success}
          bold
        />
        <View style={[styles.divider, { backgroundColor: theme.colors.outline }]} />
        <StatRow
          label="预计还需"
          value={monthsText}
          labelColor={theme.colors.onSurfaceVariant}
          valueColor={theme.colors.primary}
          bold
        />
      </View>

      {/* Tip */}
      <View style={[styles.tipBox, { backgroundColor: theme.colors.primary + '12' }]}>
        <Icon name="Info" size={14} color={theme.colors.primary} />
        <Text style={[styles.tipText, { color: theme.colors.primary }]}>
          基于最近 {projection.dataPointsUsed} 个数据点的线性趋势。
          实际达成时间取决于你的储蓄和投资节奏。
        </Text>
      </View>
    </AppBottomSheet>
  );
}

const styles = StyleSheet.create({
  title: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 13,
    marginBottom: spacing.md,
    lineHeight: 18,
  },
  formulaBox: {
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: 14,
    marginBottom: spacing.md,
  },
  formulaText: {
    fontSize: 15,
    fontWeight: '600',
    lineHeight: 24,
    textAlign: 'center',
  },
  statsCard: {
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: 14,
    marginBottom: spacing.md,
    gap: 10,
  },
  statRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  statLabel: {
    fontSize: 14,
  },
  statValue: {
    fontSize: 14,
    fontWeight: '500',
  },
  divider: {
    height: StyleSheet.hairlineWidth,
  },
  tipBox: {
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  tipText: {
    fontSize: 12,
    lineHeight: 18,
    fontWeight: '500',
    flex: 1,
  },
});
