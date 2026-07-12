/**
 * WorthBase (家底) - Settlement Modal
 * Input sell date + sell price, preview settlement result, confirm sale.
 * Redesigned with BottomSheet and shared components.
 */

import { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Alert,
} from 'react-native';
import { useAppTheme } from '@/utils/format';
import { DatePickerField } from './DatePickerField';
import { SettlementCalculator } from '@/engine/SettlementCalculator';
import type { Asset, SettlementResult } from '@/types/models';
import { formatCurrency, getCurrentDate } from '@/utils/format';
import { isValidNonNegativeNumber } from '@/utils/validation';
import { AppBottomSheet } from '@/components/ui/BottomSheet';
import { AppTextInput } from '@/components/ui/TextInput';
import { AppButton } from '@/components/ui/Button';
import { AppCard } from '@/components/ui/Card';
import { radius } from '@/theme/tokens';

export function SettlementModal({ visible, asset, onClose, onConfirm }: {
  visible: boolean;
  asset: Asset;
  onClose: () => void;
  onConfirm: (sellDate: string, sellPrice: number) => void;
}) {
  const theme = useAppTheme();
  const [sellDate, setSellDate] = useState(getCurrentDate());
  const [sellPrice, setSellPrice] = useState('');
  const [preview, setPreview] = useState<SettlementResult | null>(null);

  useEffect(() => {
    if (visible && asset) {
      setSellDate(getCurrentDate());
      setSellPrice(String(asset.currentValuation ?? asset.purchasePrice));
      setPreview(null);
    }
  }, [visible, asset]);

  useEffect(() => {
    if (!visible || !asset || !sellPrice) return;
    const price = parseFloat(sellPrice);
    if (isNaN(price)) return;
    (async () => {
      const result = await SettlementCalculator.preview(asset, price);
      setPreview(result);
    })();
  }, [sellPrice, sellDate, asset, visible]);

  const priceValid = !sellPrice.trim() || isValidNonNegativeNumber(sellPrice);

  const handleConfirm = () => {
    if (!sellPrice.trim() || !isValidNonNegativeNumber(sellPrice)) {
      Alert.alert('无效输入', '请输入有效的卖出价格');
      return;
    }
    const price = parseFloat(sellPrice) || 0;
    onConfirm(sellDate, price);
  };

  if (!asset) return null;

  return (
    <AppBottomSheet visible={visible} onClose={onClose} snapPoints={['70%', '90%']}>
      <Text style={[styles.title, { color: theme.colors.onSurface }]}>卖出结算</Text>
      <Text style={[styles.assetName, { color: theme.colors.onSurfaceVariant }]}>{asset.name}</Text>

      <DatePickerField label="卖出日期" value={sellDate} onChange={setSellDate} maximumDate={new Date()} />

      <AppTextInput bottomSheet
        label="卖出价格"
        value={sellPrice}
        onChangeText={setSellPrice}
        keyboardType="decimal-pad"
        error={!priceValid ? '请输入有效数字' : undefined}
      />

      {preview ? (
        <View style={[styles.previewCard, { backgroundColor: theme.colors.surfaceVariant }]}>
          <Text style={[styles.previewTitle, { color: theme.colors.onSurface }]}>结算预览</Text>
          <PreviewRow label="购入价" value={formatCurrency(preview.purchasePrice)} theme={theme} />
          <PreviewRow label="卖价" value={formatCurrency(preview.sellPrice)} theme={theme} />
          <PreviewRow
            label={preview.depreciation > 0 ? '贬值' : '升值'}
            value={formatCurrency(Math.abs(preview.depreciation))}
            theme={theme}
            valueColor={preview.depreciation > 0 ? theme.colors.error : theme.colors.success}
          />
          <PreviewRow label="累计持有成本" value={formatCurrency(preview.totalHoldingCost)} theme={theme} />
          <View style={[styles.divider, { backgroundColor: theme.colors.outline }]} />
          <PreviewRow label="真实净支出" value={formatCurrency(preview.netExpenditure)} theme={theme} bold valueColor={theme.colors.error} />
          <PreviewRow label="持有天数" value={`${preview.ownershipDays} 天`} theme={theme} />
          <PreviewRow label="日均成本" value={`${formatCurrency(preview.dailyAverageCost)}/天`} theme={theme} bold />
        </View>
      ) : null}

      <View style={styles.actions}>
        <AppButton title="取消" variant="text" onPress={onClose} style={{ flex: 1 }} />
        <AppButton title="确认卖出" variant="danger" onPress={handleConfirm} style={{ flex: 1 }} />
      </View>
    </AppBottomSheet>
  );
}

function PreviewRow({ label, value, theme, bold, valueColor }: {
  label: string;
  value: string;
  theme: any;
  bold?: boolean;
  valueColor?: string;
}) {
  return (
    <View style={styles.previewRow}>
      <Text style={[styles.previewLabel, { color: theme.colors.onSurfaceVariant }]}>{label}</Text>
      <Text style={[
        styles.previewValue,
        { color: valueColor || theme.colors.onSurface },
        bold && { fontWeight: '700' },
      ]}>
        {value}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  title: { fontSize: 20, fontWeight: '700', marginBottom: 8 },
  assetName: { fontSize: 16, marginBottom: 16 },
  previewCard: { borderRadius: radius.md, padding: 16, marginTop: 8 },
  previewTitle: { fontSize: 16, fontWeight: '700', marginBottom: 12 },
  previewRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 6 },
  previewLabel: { fontSize: 14 },
  previewValue: { fontSize: 14, fontWeight: '500' },
  divider: { height: 1, marginVertical: 8 },
  actions: { flexDirection: 'row', gap: 12, marginTop: 16 },
});
