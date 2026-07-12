/**
 * WorthBase (家底) - Holding Cost Breakdown Component
 * Shows the 3-layer breakdown: amortization + recurring + maintenance.
 * Redesigned with design tokens.
 */

import { View, Text, StyleSheet } from 'react-native';
import { useAppTheme } from '@/utils/format';
import type { HoldingCostResult } from '@/types/models';
import { formatCurrency } from '@/utils/format';
import { radius } from '@/theme/tokens';

export function HoldingCostBreakdown({ result, currencySymbol = '¥' }: {
  result: HoldingCostResult;
  currencySymbol?: string;
}) {
  const theme = useAppTheme();

  const layers = [
    { label: '分摊成本', value: result.monthlyAmortization, color: theme.colors.primary },
    { label: '经常性支出', value: result.monthlyRecurring, color: theme.colors.success },
    { label: '维护分摊', value: result.monthlyMaintenance, color: theme.colors.warning },
  ];

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.surfaceVariant }]}>
      {layers.map((layer, i) => {
        const pct = result.monthlyTotal > 0 ? (layer.value / result.monthlyTotal * 100) : 0;
        return (
          <View key={i} style={styles.row}>
            <View style={[styles.dot, { backgroundColor: layer.color }]} />
            <Text style={[styles.label, { color: theme.colors.onSurfaceVariant }]}>{layer.label}</Text>
            <Text style={[styles.pct, { color: theme.colors.tertiary }]}>{pct.toFixed(0)}%</Text>
            <Text style={[styles.value, { color: theme.colors.onSurface }]}>{formatCurrency(layer.value, currencySymbol)}</Text>
          </View>
        );
      })}
      <View style={[styles.divider, { backgroundColor: theme.colors.outline }]} />
      <View style={styles.row}>
        <Text style={[styles.totalLabel, { color: theme.colors.onSurface }]}>月持有成本</Text>
        <Text style={[styles.totalValue, { color: theme.colors.primary }]}>{formatCurrency(result.monthlyTotal, currencySymbol)}/月</Text>
      </View>
      <View style={styles.row}>
        <Text style={[styles.subLabel, { color: theme.colors.tertiary }]}>日均</Text>
        <Text style={[styles.subValue, { color: theme.colors.onSurfaceVariant }]}>{formatCurrency(result.dailyAverage, currencySymbol)}/天</Text>
      </View>
      <View style={styles.row}>
        <Text style={[styles.subLabel, { color: theme.colors.tertiary }]}>累计已分摊</Text>
        <Text style={[styles.subValue, { color: theme.colors.onSurfaceVariant }]}>{formatCurrency(result.accumulatedTotal, currencySymbol)}</Text>
      </View>
      <View style={styles.row}>
        <Text style={[styles.subLabel, { color: theme.colors.tertiary }]}>剩余未分摊</Text>
        <Text style={[styles.subValue, { color: theme.colors.onSurfaceVariant }]}>{formatCurrency(result.remainingUnamortized, currencySymbol)}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { borderRadius: radius.md, padding: 16 },
  row: { flexDirection: 'row', alignItems: 'center', paddingVertical: 4, gap: 8 },
  dot: { width: 8, height: 8, borderRadius: 4 },
  label: { flex: 1, fontSize: 14 },
  pct: { fontSize: 12, width: 36, textAlign: 'right' },
  value: { fontSize: 14, fontWeight: '500', width: 100, textAlign: 'right' },
  divider: { height: 1, marginVertical: 8 },
  totalLabel: { flex: 1, fontSize: 16, fontWeight: '600' },
  totalValue: { fontSize: 18, fontWeight: '700' },
  subLabel: { flex: 1, fontSize: 13 },
  subValue: { fontSize: 13, fontWeight: '500' },
});
