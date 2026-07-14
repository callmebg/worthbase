/**
 * NetWorthExplainer — single-screen bottom-sheet explaining the net-worth formula.
 * One view. One formula. Done.
 */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useAppTheme } from '@/utils/format';
import { AppBottomSheet } from '@/components/ui';
import { spacing, radius } from '@/theme/tokens';

interface NetWorthExplainerProps {
  visible: boolean;
  onClose: () => void;
}

/** A single term row: colored dot + label + description. */
function TermItem({
  label,
  desc,
  dotColor,
  labelColor,
  descColor,
}: {
  label: string;
  desc: string;
  dotColor: string;
  labelColor: string;
  descColor: string;
}) {
  return (
    <View style={styles.termRow}>
      <View style={[styles.termDot, { backgroundColor: dotColor }]} />
      <View style={styles.termTextWrap}>
        <Text style={[styles.termLabel, { color: labelColor }]}>{label}</Text>
        <Text style={[styles.termDesc, { color: descColor }]}>{desc}</Text>
      </View>
    </View>
  );
}

export function NetWorthExplainer({ visible, onClose }: NetWorthExplainerProps) {
  const theme = useAppTheme();

  return (
    <AppBottomSheet visible={visible} onClose={onClose} snapPoints={['50%']}>
      <Text style={[styles.title, { color: theme.colors.onSurface }]}>
        净资产
      </Text>

      <View
        style={[
          styles.formulaBox,
          { backgroundColor: theme.colors.surfaceVariant },
        ]}
      >
        <Text style={[styles.formulaText, { color: theme.colors.onSurface }]}>
          净资产 = 账户余额 + 资产估值
        </Text>
      </View>

      <View style={styles.termList}>
        <TermItem
          label="账户余额"
          desc="微信、支付宝、银行卡等所有账户的余额总和。信用卡、贷款等为负数。"
          dotColor={theme.colors.primary}
          labelColor={theme.colors.onSurface}
          descColor={theme.colors.onSurfaceVariant}
        />
        <TermItem
          label="资产估值"
          desc="你的车、房子、电子设备等物品的当前估值总和。"
          dotColor={theme.colors.primary}
          labelColor={theme.colors.onSurface}
          descColor={theme.colors.onSurfaceVariant}
        />
      </View>

      <View
        style={[
          styles.tipBox,
          { backgroundColor: theme.colors.primary + '12' },
        ]}
      >
        <Text style={[styles.tipText, { color: theme.colors.primary }]}>
          持有成本（折旧、经常性支出等）可在各资产详情中查看。
        </Text>
      </View>
    </AppBottomSheet>
  );
}

const styles = StyleSheet.create({
  title: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: spacing.md,
  },
  formulaBox: {
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: 14,
    marginBottom: spacing.md,
  },
  formulaText: {
    fontSize: 16,
    fontWeight: '600',
    lineHeight: 26,
    textAlign: 'center',
  },
  termList: {
    gap: 14,
    marginBottom: spacing.md,
  },
  termRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
  },
  termDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginTop: 6,
  },
  termTextWrap: {
    flex: 1,
  },
  termLabel: {
    fontSize: 15,
    fontWeight: '600',
    marginBottom: 2,
  },
  termDesc: {
    fontSize: 13,
    lineHeight: 20,
  },
  tipBox: {
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: 12,
  },
  tipText: {
    fontSize: 13,
    lineHeight: 20,
    fontWeight: '500',
  },
});
