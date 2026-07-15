/**
 * HoldingCostExplainer — multi-page bottom-sheet explaining holding cost rules.
 * Three pages: Overview / Amortization Methods / Expenses & Maintenance.
 * Follows NetWorthExplainer's visual patterns.
 */

import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useAppTheme } from '@/utils/format';
import { AppBottomSheet } from '@/components/ui';
import { Icon } from '@/components/ui/Icon';
import { spacing, radius } from '@/theme/tokens';

interface HoldingCostExplainerProps {
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

/** A method card for amortization types. */
function MethodCard({
  title,
  desc,
  accentColor,
  bgColor,
  labelColor,
  descColor,
}: {
  title: string;
  desc: string;
  accentColor: string;
  bgColor: string;
  labelColor: string;
  descColor: string;
}) {
  return (
    <View style={[styles.methodCard, { backgroundColor: bgColor, borderLeftColor: accentColor }]}>
      <Text style={[styles.methodTitle, { color: labelColor }]}>{title}</Text>
      <Text style={[styles.methodDesc, { color: descColor }]}>{desc}</Text>
    </View>
  );
}

const TOTAL_PAGES = 3;

export function HoldingCostExplainer({ visible, onClose }: HoldingCostExplainerProps) {
  const theme = useAppTheme();
  const [page, setPage] = useState(0);

  const goNext = () => setPage(p => Math.min(p + 1, TOTAL_PAGES - 1));
  const goPrev = () => setPage(p => Math.max(p - 1, 0));
  const handleClose = () => { setPage(0); onClose(); };

  return (
    <AppBottomSheet visible={visible} onClose={handleClose} snapPoints={['85%']}>
      {/* ── Page 1: Overview ── */}
      {page === 0 && (
        <>
          <Text style={[styles.title, { color: theme.colors.onSurface }]}>
            持有成本
          </Text>
          <Text style={[styles.subtitle, { color: theme.colors.onSurfaceVariant }]}>
            你的东西，每个月都在花你的钱
          </Text>

          <View style={[styles.formulaBox, { backgroundColor: theme.colors.surfaceVariant }]}>
            <Text style={[styles.formulaText, { color: theme.colors.onSurface }]}>
              月持有成本 = 折旧 + 经常性支出 + 维护分摊
            </Text>
          </View>

          <View style={styles.termList}>
            <TermItem
              label="折旧"
              desc="东西用久了会贬值。一台 ¥12,000 的 MacBook，每月折旧就是你持有它的一部分成本。"
              dotColor={theme.colors.primary}
              labelColor={theme.colors.onSurface}
              descColor={theme.colors.onSurfaceVariant}
            />
            <TermItem
              label="经常性支出"
              desc="绑在资产上的周期性费用——车险、iCloud 订阅、物业费，每月都在扣。"
              dotColor={theme.colors.success}
              labelColor={theme.colors.onSurface}
              descColor={theme.colors.onSurfaceVariant}
            />
            <TermItem
              label="维护分摊"
              desc="换屏、保养、维修。一次性花的大钱，可以分摊到每个月来看。"
              dotColor={theme.colors.warning}
              labelColor={theme.colors.onSurface}
              descColor={theme.colors.onSurfaceVariant}
            />
          </View>

          <View style={[styles.tipBox, { backgroundColor: theme.colors.primary + '12' }]}>
            <Icon name="Info" size={14} color={theme.colors.primary} />
            <Text style={[styles.tipText, { color: theme.colors.primary }]}>
              月持有成本是所有费用加在一起的数字。日均 = 月成本 ÷ 30。
            </Text>
          </View>
        </>
      )}

      {/* ── Page 2: Amortization Methods ── */}
      {page === 1 && (
        <>
          <Text style={[styles.title, { color: theme.colors.onSurface }]}>
            四种折旧方式
          </Text>
          <Text style={[styles.subtitle, { color: theme.colors.onSurfaceVariant }]}>
            不同东西，贬值方式不同
          </Text>

          <View style={styles.methodList}>
            <MethodCard
              title="一直在用"
              desc="买得越久，月均越低。¥12,000 的 MacBook，用了 24 个月 → 月均 ¥500；用到 36 个月 → 月均 ¥333。"
              accentColor={theme.colors.primary}
              bgColor={theme.colors.surfaceVariant}
              labelColor={theme.colors.onSurface}
              descColor={theme.colors.onSurfaceVariant}
            />
            <MethodCard
              title="预期寿命"
              desc="每月固定金额，不管用了多久。设定用 3 年 → 每月 ¥333，雷打不动。"
              accentColor={theme.colors.success}
              bgColor={theme.colors.surfaceVariant}
              labelColor={theme.colors.onSurface}
              descColor={theme.colors.onSurfaceVariant}
            />
            <MethodCard
              title="残值分摊"
              desc="考虑到这东西以后还能卖。一辆 ¥30 万的车，5 年后还能卖 ¥10 万 → 只分摊 ¥20 万，月均 ¥3,333。"
              accentColor={theme.colors.warning}
              bgColor={theme.colors.surfaceVariant}
              labelColor={theme.colors.onSurface}
              descColor={theme.colors.onSurfaceVariant}
            />
            <MethodCard
              title="不分摊"
              desc="有些东西不贬值——黄金、奢侈品、房产。月折旧 = 0。"
              accentColor={theme.colors.onSurfaceVariant}
              bgColor={theme.colors.surfaceVariant}
              labelColor={theme.colors.onSurface}
              descColor={theme.colors.onSurfaceVariant}
            />
          </View>
        </>
      )}

      {/* ── Page 3: Expenses & Maintenance ── */}
      {page === 2 && (
        <>
          <Text style={[styles.title, { color: theme.colors.onSurface }]}>
            经常性支出 & 维护
          </Text>
          <Text style={[styles.subtitle, { color: theme.colors.onSurfaceVariant }]}>
            折旧之外，养这些东西还有这些钱
          </Text>

          <View style={styles.methodList}>
            <MethodCard
              title="经常性支出"
              desc="保险、订阅、物业费等固定支出。在资产详情里添加，自动按月计算。比如车险 ¥3,600/年 → 月均 ¥300。"
              accentColor={theme.colors.success}
              bgColor={theme.colors.surfaceVariant}
              labelColor={theme.colors.onSurface}
              descColor={theme.colors.onSurfaceVariant}
            />
            <MethodCard
              title="一次性维护"
              desc="换屏、保养、维修等一次性支出。勾选「纳入分摊」后按月均摊到持有成本里；不勾选则计入累计但不影响月成本。"
              accentColor={theme.colors.warning}
              bgColor={theme.colors.surfaceVariant}
              labelColor={theme.colors.onSurface}
              descColor={theme.colors.onSurfaceVariant}
            />
          </View>

          <View style={[styles.tipBox, { backgroundColor: theme.colors.primary + '12' }]}>
            <Icon name="Info" size={14} color={theme.colors.primary} />
            <Text style={[styles.tipText, { color: theme.colors.primary }]}>
              在资产详情页可以添加经常性支出和维护记录。
            </Text>
          </View>
        </>
      )}

      {/* ── Page Navigation ── */}
      <View style={styles.navRow}>
        <TouchableOpacity
          onPress={goPrev}
          disabled={page === 0}
          style={[styles.navBtn, page === 0 && { opacity: 0.3 }]}
          hitSlop={8}
        >
          <Icon name="ChevronLeft" size={20} color={theme.colors.onSurface} />
        </TouchableOpacity>

        <View style={styles.dots}>
          {Array.from({ length: TOTAL_PAGES }).map((_, i) => (
            <View
              key={i}
              style={[
                styles.dot,
                { backgroundColor: i === page ? theme.colors.primary : theme.colors.outlineVariant },
              ]}
            />
          ))}
        </View>

        <TouchableOpacity
          onPress={goNext}
          disabled={page === TOTAL_PAGES - 1}
          style={[styles.navBtn, page === TOTAL_PAGES - 1 && { opacity: 0.3 }]}
          hitSlop={8}
        >
          <Icon name="ChevronRight" size={20} color={theme.colors.onSurface} />
        </TouchableOpacity>
      </View>
    </AppBottomSheet>
  );
}

const styles = StyleSheet.create({
  title: {
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
    marginBottom: spacing.md,
    lineHeight: 20,
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
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  tipText: {
    fontSize: 13,
    lineHeight: 20,
    fontWeight: '500',
    flex: 1,
  },
  methodList: {
    gap: 12,
    marginBottom: spacing.md,
  },
  methodCard: {
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: 14,
    borderLeftWidth: 3,
  },
  methodTitle: {
    fontSize: 15,
    fontWeight: '600',
    marginBottom: 4,
  },
  methodDesc: {
    fontSize: 13,
    lineHeight: 20,
  },
  navRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: spacing.sm,
    gap: spacing.md,
  },
  navBtn: {
    padding: 8,
  },
  dots: {
    flexDirection: 'row',
    gap: 8,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
});
