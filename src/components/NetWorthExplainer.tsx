/**
 * NetWorthExplainer — two-tier bottom-sheet explaining the net-worth formula.
 *
 * Simple view (default): plain-language formula + everyday analogy.
 * Detailed view: full formula with per-term explanations + negative-worth tip.
 */

import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useAppTheme } from '@/utils/format';
import { AppBottomSheet } from '@/components/ui';
import { spacing, radius } from '@/theme/tokens';

interface NetWorthExplainerProps {
  visible: boolean;
  onClose: () => void;
}

/** A single term row in the detailed view: bullet label + description. */
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
  const [showDetail, setShowDetail] = useState(false);

  // Reset to simple view whenever the sheet is opened
  useEffect(() => {
    if (visible) {
      setShowDetail(false);
    }
  }, [visible]);

  return (
    <AppBottomSheet visible={visible} onClose={onClose} snapPoints={['60%', '85%']}>
      {/* ── Simple view ── */}
      {!showDetail ? (
        <View>
          <Text style={[styles.title, { color: theme.colors.onSurface }]}>
            净资产是什么？
          </Text>

          <View
            style={[
              styles.formulaBox,
              { backgroundColor: theme.colors.surfaceVariant },
            ]}
          >
            <Text style={[styles.formulaText, { color: theme.colors.onSurface }]}>
              净资产 = 你有多少现金 + 东西值多少 - 还没“用完”的购买成本
            </Text>
          </View>

          <Text style={[styles.bodyText, { color: theme.colors.onSurfaceVariant }]}>
            就像买了一台 ¥6000 的手机，用了 1 年（共 3 年寿命），还有 ¥4000
            没“消费完”，这部分就是未分摊成本。
          </Text>

          <TouchableOpacity
            onPress={() => setShowDetail(true)}
            style={[styles.toggleBtn, { borderColor: theme.colors.primary }]}
            hitSlop={8}
          >
            <Text style={[styles.toggleBtnText, { color: theme.colors.primary }]}>
              了解更多 →
            </Text>
          </TouchableOpacity>
        </View>
      ) : (
        /* ── Detailed view ── */
        <View>
          <Text style={[styles.title, { color: theme.colors.onSurface }]}>
            净资产计算方式
          </Text>

          <View
            style={[
              styles.formulaBox,
              { backgroundColor: theme.colors.surfaceVariant },
            ]}
          >
            <Text style={[styles.formulaText, { color: theme.colors.onSurface }]}>
              净资产 = 流动资产（各账户余额总和）+ 资产估值（资产当前市场价）-
              未分摊成本（还没用完的购买成本）
            </Text>
          </View>

          {/* Per-term explanations */}
          <View style={styles.termList}>
            <TermItem
              label="流动资产"
              desc="微信、支付宝、银行卡等账户的余额总和"
              dotColor={theme.colors.primary}
              labelColor={theme.colors.onSurface}
              descColor={theme.colors.onSurfaceVariant}
            />
            <TermItem
              label="资产估值"
              desc="你的车、房子、手机等物品的当前估值"
              dotColor={theme.colors.primary}
              labelColor={theme.colors.onSurface}
              descColor={theme.colors.onSurfaceVariant}
            />
            <TermItem
              label="未分摊成本"
              desc={'购买价格中，按使用时间还没“消耗完”的部分'}
              dotColor={theme.colors.primary}
              labelColor={theme.colors.onSurface}
              descColor={theme.colors.onSurfaceVariant}
            />
          </View>

          {/* Negative net worth tip */}
          <View
            style={[
              styles.tipBox,
              { backgroundColor: theme.colors.error + '14' },
            ]}
          >
            <Text style={[styles.tipText, { color: theme.colors.error }]}>
              如果净资产为负，可能是资产估值偏低，或分摊设置过于激进。
            </Text>
          </View>

          <TouchableOpacity
            onPress={() => setShowDetail(false)}
            style={[styles.toggleBtn, { borderColor: theme.colors.outline }]}
            hitSlop={8}
          >
            <Text
              style={[styles.toggleBtnText, { color: theme.colors.onSurfaceVariant }]}
            >
              ← 返回简洁版
            </Text>
          </TouchableOpacity>
        </View>
      )}
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
    fontSize: 15,
    fontWeight: '600',
    lineHeight: 24,
  },
  bodyText: {
    fontSize: 14,
    lineHeight: 22,
    marginBottom: spacing.lg,
  },
  toggleBtn: {
    alignSelf: 'flex-start',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: radius.md,
    borderWidth: 1.5,
    marginTop: spacing.sm,
  },
  toggleBtnText: {
    fontSize: 14,
    fontWeight: '600',
  },
  // Term list (detailed view)
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
  // Tip box
  tipBox: {
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: 12,
    marginBottom: spacing.md,
  },
  tipText: {
    fontSize: 13,
    lineHeight: 20,
    fontWeight: '500',
  },
});
