/**
 * AccountExplainer — bottom-sheet help for the Accounts page.
 * Explains how to add accounts, update balances, view history, archive & delete.
 */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useAppTheme } from '@/utils/format';
import { AppBottomSheet } from '@/components/ui';
import { Icon } from '@/components/ui/Icon';
import { spacing, radius } from '@/theme/tokens';

interface AccountExplainerProps {
  visible: boolean;
  onClose: () => void;
}

function SectionItem({
  icon,
  label,
  desc,
  iconColor,
  labelColor,
  descColor,
}: {
  icon: string;
  label: string;
  desc: string;
  iconColor: string;
  labelColor: string;
  descColor: string;
}) {
  return (
    <View style={styles.sectionRow}>
      <Icon name={icon} size={20} color={iconColor} />
      <View style={styles.sectionTextWrap}>
        <Text style={[styles.sectionLabel, { color: labelColor }]}>{label}</Text>
        <Text style={[styles.sectionDesc, { color: descColor }]}>{desc}</Text>
      </View>
    </View>
  );
}

export function AccountExplainer({ visible, onClose }: AccountExplainerProps) {
  const theme = useAppTheme();

  return (
    <AppBottomSheet visible={visible} onClose={onClose} snapPoints={['65%']}>
      <Text style={[styles.title, { color: theme.colors.onSurface }]}>
        账户管理指南
      </Text>

      <View style={styles.sectionList}>
        <SectionItem
          icon="Plus"
          label="添加账户"
          desc="点击右下角悬浮按钮，输入账户名称、类型和初始余额即可创建。支持微信、支付宝、银行卡等多种类型。"
          iconColor="primary"
          labelColor={theme.colors.onSurface}
          descColor={theme.colors.onSurfaceVariant}
        />
        <SectionItem
          icon="PenLine"
          label="更新余额"
          desc="点击账户卡片或长按选择「记录余额」，输入当前实际余额。系统会自动记录快照用于趋势分析。"
          iconColor="primary"
          labelColor={theme.colors.onSurface}
          descColor={theme.colors.onSurfaceVariant}
        />
        <SectionItem
          icon="Clock"
          label="余额历史"
          desc="点击 Hero 卡片右上角时钟图标，查看所有账户的余额更新记录。每次更新余额都会生成一条快照。"
          iconColor="primary"
          labelColor={theme.colors.onSurface}
          descColor={theme.colors.onSurfaceVariant}
        />
        <SectionItem
          icon="History"
          label="查看变更"
          desc="长按账户选择「查看变更」，可查看该账户每次余额变化的详情和差值。"
          iconColor="primary"
          labelColor={theme.colors.onSurface}
          descColor={theme.colors.onSurfaceVariant}
        />
        <SectionItem
          icon="Archive"
          label="存档与删除"
          desc="存档会隐藏账户但保留历史数据；彻底删除将永久移除账户及所有余额记录，不可恢复。"
          iconColor="error"
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
          建议每月至少更新一次余额，这样净资产趋势图才能准确反映你的财务变化。
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
  sectionList: {
    gap: 16,
    marginBottom: spacing.md,
  },
  sectionRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
  },
  sectionTextWrap: {
    flex: 1,
  },
  sectionLabel: {
    fontSize: 15,
    fontWeight: '600',
    marginBottom: 2,
  },
  sectionDesc: {
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
