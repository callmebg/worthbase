/**
 * GoalProjectionExplainer — bottom-sheet explaining how the goal achievement date is predicted.
 *
 * 把预测公式摊开给人看：月均增长 = 已知收支（用户亲手录入的固定收入/支出）
 * + 历史残差（最近 6 个数据点回归出来的、没被建模的部分）。
 *
 * 四种结论各自有明确的说法——**不允许静默空白**：
 * achievable（给日期）/ unreachable（给缺口和月均增长）/ achieved（已达成）
 * / insufficient-data（数据不足，告诉用户该录什么）。
 */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { useAppTheme, formatCurrency } from '@/utils/format';
import { AppBottomSheet, AppButton } from '@/components/ui';
import { Icon } from '@/components/ui/Icon';
import { spacing, radius } from '@/theme/tokens';
import type { ProjectionDetail } from '@/engine/ProjectionCalculator';

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

/** 缩进的次级明细行，用于拆解「月均增长」的两个来源 */
function SubStatRow({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <View style={styles.subStatRow}>
      <Text style={[styles.subStatLabel, { color }]}>{label}</Text>
      <Text style={[styles.subStatValue, { color }]}>{value}</Text>
    </View>
  );
}

function formatMonths(months: number): string {
  return months < 12
    ? `${Math.round(months)} 个月`
    : `${Math.floor(months / 12)} 年 ${Math.round(months % 12)} 个月`;
}

export function GoalProjectionExplainer({
  visible,
  onClose,
  projection,
  goal,
  currencySymbol,
}: GoalProjectionExplainerProps) {
  const theme = useAppTheme();
  const router = useRouter();

  if (!projection) return null;

  const { state, achievementDate, monthsNeeded, knownMonthlyInflow, residualMonthlyGrowth } = projection;
  const achieved = state === 'achieved';
  const reachable = state === 'achievable';

  const title = achieved
    ? '目标已达成'
    : reachable && achievementDate
      ? `预计 ${achievementDate.substring(0, 4)}年${achievementDate.substring(5, 7)}月 达成`
      : state === 'unreachable'
        ? '按当前速度暂时达不成'
        : '数据还不够，暂时算不出';

  const subtitle = achieved
    ? '当前净资产已经超过目标，去设个新的吧'
    : reachable
      ? '已知收支为主，历史趋势为残差'
      : state === 'unreachable'
        ? '已知收支与历史趋势加起来，还不足以补齐差距'
        : '先更新一次余额，或录入固定收支';

  const formula = achieved
    ? '当前净资产 ≥ 目标'
    : reachable
      ? '达成时间 = 差距 ÷ 月均增长'
      : '月均增长 = 已知收支 + 历史残差';

  const growthColor = projection.monthlyGrowth >= 0 ? theme.colors.success : theme.colors.error;

  return (
    <AppBottomSheet visible={visible} onClose={onClose} snapPoints={['55%']}>
      {/* Title */}
      <Text style={[styles.title, { color: theme.colors.onSurface }]}>{title}</Text>
      <Text style={[styles.subtitle, { color: theme.colors.onSurfaceVariant }]}>{subtitle}</Text>

      {/* Key formula */}
      <View style={[styles.formulaBox, { backgroundColor: theme.colors.surfaceVariant }]}>
        <Text style={[styles.formulaText, { color: theme.colors.onSurface }]}>{formula}</Text>
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
        {!achieved && (
          <>
            <View style={[styles.divider, { backgroundColor: theme.colors.outline }]} />
            <StatRow
              label="还差"
              value={formatCurrency(projection.gap, currencySymbol)}
              labelColor={theme.colors.onSurfaceVariant}
              valueColor={theme.colors.error}
              bold
            />
          </>
        )}
        {state !== 'insufficient-data' && (
          <>
            <View style={[styles.divider, { backgroundColor: theme.colors.outline }]} />
            <StatRow
              label="月均增长"
              value={`≈ ${formatCurrency(projection.monthlyGrowth, currencySymbol)}`}
              labelColor={theme.colors.onSurfaceVariant}
              valueColor={growthColor}
              bold
            />
            {/* 拆成两行，让用户看清哪部分是确定的、哪部分是猜的 */}
            <SubStatRow
              label="已知收支"
              value={`${knownMonthlyInflow >= 0 ? '+' : '−'}${formatCurrency(Math.abs(knownMonthlyInflow), currencySymbol)}`}
              color={theme.colors.onSurfaceVariant}
            />
            <SubStatRow
              label="历史残差"
              value={`${residualMonthlyGrowth >= 0 ? '+' : '−'}${formatCurrency(Math.abs(residualMonthlyGrowth), currencySymbol)}`}
              color={theme.colors.onSurfaceVariant}
            />
          </>
        )}
        {reachable && monthsNeeded !== null && (
          <>
            <View style={[styles.divider, { backgroundColor: theme.colors.outline }]} />
            <StatRow
              label="预计还需"
              value={formatMonths(monthsNeeded)}
              labelColor={theme.colors.onSurfaceVariant}
              valueColor={theme.colors.primary}
              bold
            />
          </>
        )}
      </View>

      {/* Tip */}
      <View style={[styles.tipBox, { backgroundColor: theme.colors.primary + '12' }]}>
        <Icon name="Info" size={14} color={theme.colors.primary} />
        <Text style={[styles.tipText, { color: theme.colors.primary }]}>
          {state === 'insufficient-data'
            ? '还没有足够的净资产记录。更新一次账户余额，或在「固定收支」里录入月薪、房租，预测就会开始工作。'
            : `「已知收支」是你录入的固定收入与支出，未来 12 个月摊平；「历史残差」是最近 ${projection.dataPointsUsed} 个数据点里我没能建模的部分（消费波动、估值涨跌）。实际达成时间取决于你的储蓄和投资节奏。`}
        </Text>
      </View>

      {/* 算不出来 / 达不成的时候，给出路而不是给一堵墙 */}
      {(state === 'insufficient-data' || state === 'unreachable') && (
        <AppButton
          title="去录入固定收支"
          variant="primary"
          icon="Wallet"
          onPress={() => { onClose(); router.push('/cash-flow'); }}
          style={{ marginTop: spacing.md }}
        />
      )}
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
  // 次级明细行：缩进 + 更小字号，视觉上是「月均增长」的展开项
  subStatRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingLeft: spacing.md,
  },
  subStatLabel: {
    fontSize: 12,
  },
  subStatValue: {
    fontSize: 12,
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
