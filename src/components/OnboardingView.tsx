/**
 * WorthBase (家底) - Onboarding Component
 * Shows when no accounts exist, guiding the user to add their first account.
 * Redesigned with design system and Lucide icons.
 */

import { View, Text, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { useTheme } from 'react-native-paper';
import { Wallet, BarChart3, Package, Lock } from 'lucide-react-native';
import { AppButton } from '@/components/ui/Button';
import { Icon } from '@/components/ui/Icon';

export function OnboardingView() {
  const router = useRouter();
  const theme = useTheme();

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <View style={[styles.iconWrapper, { backgroundColor: theme.colors.primaryContainer }]}>
        <Wallet size={48} color={theme.colors.primary} />
      </View>
      <Text style={[styles.title, { color: theme.colors.onSurface }]}>欢迎使用家底</Text>
      <Text style={[styles.desc, { color: theme.colors.onSurfaceVariant }]}>
        记录你的账户余额和实物资产，{'\n'}
        了解净资产趋势和持有成本，{'\n'}
        回答"我到底有多少钱"和"养这些东西每月花多少钱"。
      </Text>

      <View style={styles.features}>
        <View style={styles.featureRow}>
          <Icon name="BarChart3" size={20} color="primary" />
          <Text style={[styles.featureText, { color: theme.colors.onSurface }]}>
            净资产趋势追踪
          </Text>
        </View>
        <View style={styles.featureRow}>
          <Icon name="Package" size={20} color="primary" />
          <Text style={[styles.featureText, { color: theme.colors.onSurface }]}>
            实物资产持有成本计算
          </Text>
        </View>
        <View style={styles.featureRow}>
          <Icon name="Lock" size={20} color="primary" />
          <Text style={[styles.featureText, { color: theme.colors.onSurface }]}>
            数据完全本地存储，隐私优先
          </Text>
        </View>
      </View>

      <AppButton
        title="添加第一个账户"
        variant="primary"
        icon="ChevronRight"
        onPress={() => router.push('/accounts')}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
  },
  iconWrapper: {
    width: 96,
    height: 96,
    borderRadius: 48,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    marginBottom: 8,
  },
  desc: {
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 32,
  },
  features: {
    gap: 16,
    marginBottom: 40,
  },
  featureRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  featureText: {
    fontSize: 14,
  },
});
