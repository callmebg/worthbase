/**
 * WorthBase (家底) - Valuation History Chart
 * Line chart showing valuation changes over time for an asset.
 * Redesigned with design system and theme-aware colors.
 */

import { useEffect, useState } from 'react';
import { View, Text, Dimensions, StyleSheet } from 'react-native';
import { useAppTheme } from '@/utils/format';
import { LineChart } from 'react-native-chart-kit';
import { ValuationRepository } from '@/db/valuation-repository';
import { formatCurrency } from '@/utils/format';
import { Icon } from '@/components/ui/Icon';

const screenWidth = Dimensions.get('window').width;

export function ValuationChart({ assetId, purchasePrice, currencySymbol = '¥' }: {
  assetId: string;
  purchasePrice: number;
  currencySymbol?: string;
}) {
  const theme = useAppTheme();
  const [data, setData] = useState<{ labels: string[]; datasets: { data: number[] }[] }>({
    labels: [],
    datasets: [{ data: [] }],
  });
  const [latest, setLatest] = useState<number | null>(null);
  const [change, setChange] = useState<number>(0);

  useEffect(() => {
    (async () => {
      const history = await ValuationRepository.getByAsset(assetId);
      if (history.length === 0) return;

      const points = history.map(h => h.valuation);
      const labels = history.map(h => h.recordedDate.substring(5));
      setData({ labels, datasets: [{ data: points }] });

      const latestVal = history[history.length - 1].valuation;
      setLatest(latestVal);
      setChange(latestVal - purchasePrice);
    })();
  }, [assetId, purchasePrice]);

  if (data.datasets[0].data.length === 0) {
    return (
      <View style={styles.empty}>
        <Icon name="BarChart3" size={24} color="onSurfaceVariant" />
        <Text style={[styles.emptyText, { color: theme.colors.onSurfaceVariant }]}>暂无估值记录</Text>
      </View>
    );
  }

  return (
    <View>
      <View style={styles.headerRow}>
        <Text style={[styles.latestLabel, { color: theme.colors.onSurfaceVariant }]}>当前估值</Text>
        <Text style={[styles.latestValue, { color: theme.colors.onSurface }]}>
          {formatCurrency(latest ?? 0, currencySymbol)}
        </Text>
        {change !== 0 ? (
          <Text style={[styles.changeBadge, { color: change > 0 ? theme.colors.success : theme.colors.error }]}>
            {change > 0 ? '↑' : '↓'} {formatCurrency(Math.abs(change), currencySymbol)}
          </Text>
        ) : null}
      </View>
      <LineChart
        data={data}
        width={screenWidth - 64}
        height={160}
        chartConfig={{
          backgroundColor: theme.colors.surface,
          backgroundGradientFrom: theme.colors.surface,
          backgroundGradientTo: theme.colors.surface,
          decimalPlaces: 0,
          color: () => theme.colors.primary,
          labelColor: () => theme.colors.onSurfaceVariant,
          propsForDots: { r: '3', strokeWidth: '1', stroke: theme.colors.primary },
        }}
        bezier
        style={styles.chart}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  headerRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 },
  latestLabel: { fontSize: 14 },
  latestValue: { fontSize: 18, fontWeight: '700' },
  changeBadge: { fontSize: 12, fontWeight: '500' },
  chart: { borderRadius: 8 },
  empty: { height: 120, alignItems: 'center', justifyContent: 'center', gap: 8 },
  emptyText: { fontSize: 14 },
});
