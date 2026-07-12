/**
 * WorthBase (家底) - Settings Tab (设置)
 * Sections: Security, Appearance, Net Worth Goal, Data, About.
 * Redesigned with design system, Paper components, BottomSheet, and Lucide icons.
 */

import { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  Alert,
  TouchableOpacity,
  Linking,
} from 'react-native';
import * as DocumentPicker from 'expo-document-picker';
import { useTheme } from 'react-native-paper';
import { useSettingsStore } from '@/stores/settings-store';
import { useAccountStore } from '@/stores/account-store';
import { useAssetStore } from '@/stores/asset-store';
import { AuthService } from '@/services/auth-service';
import { ExportService } from '@/services/export-service';
import { ImportService } from '@/services/import-service';
import { BackupService } from '@/services/backup-service';
import { AppCard } from '@/components/ui/Card';
import { AppListItem } from '@/components/ui/ListItem';
import { AppChip } from '@/components/ui/Chip';
import { AppButton } from '@/components/ui/Button';
import { AppTextInput } from '@/components/ui/TextInput';
import { AppBottomSheet } from '@/components/ui/BottomSheet';
import { Icon } from '@/components/ui/Icon';

const THEME_COLORS = [
  { key: 'purple', color: '#6C5CE7', label: '紫色' },
  { key: 'blue', color: '#0984E3', label: '蓝色' },
  { key: 'green', color: '#00B894', label: '绿色' },
  { key: 'orange', color: '#E17055', label: '橙色' },
];

const CURRENCY_OPTIONS = ['¥', '$', '€', '£', '₩'];

const DARK_MODE_OPTIONS = [
  { key: 'system' as const, label: '跟随系统' },
  { key: 'light' as const, label: '浅色' },
  { key: 'dark' as const, label: '深色' },
];

export default function SettingsScreen() {
  const theme = useTheme();
  const settings = useSettingsStore();
  const { accounts, balances } = useAccountStore();
  const { assets } = useAssetStore();

  const [pinInput, setPinInput] = useState('');
  const [showPinSetup, setShowPinSetup] = useState(false);
  const [goalInput, setGoalInput] = useState('');
  const [biometricAvailable, setBiometricAvailable] = useState(false);
  const [biometricType, setBiometricType] = useState('生物识别');
  const [backupList, setBackupList] = useState<string[]>([]);
  const [showBackups, setShowBackups] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [importing, setImporting] = useState(false);

  useEffect(() => {
    AuthService.isBiometricAvailable().then(setBiometricAvailable);
    AuthService.getBiometricType().then(setBiometricType);
    BackupService.listBackups().then(setBackupList);
  }, []);

  const handleToggleLock = async (enabled: boolean) => {
    if (enabled) {
      setShowPinSetup(true);
    } else {
      await AuthService.clearPin();
      await settings.update({ appLockEnabled: false, biometricEnabled: false, pinHash: null });
    }
  };

  const handlePinConfirm = async () => {
    if (pinInput.length < 4) {
      Alert.alert('PIN 太短', '请输入至少4位数字');
      return;
    }
    await AuthService.savePin(pinInput);
    await settings.update({ appLockEnabled: true, pinHash: 'secure-store' });
    setPinInput('');
    setShowPinSetup(false);
    Alert.alert('已启用', '应用锁已开启，每次启动需要 PIN 码解锁');
  };

  const handleToggleBiometric = async (enabled: boolean) => {
    if (enabled) {
      const available = await AuthService.isBiometricAvailable();
      if (!available) {
        Alert.alert('不可用', '当前设备不支持生物识别或未录入指纹/Face ID');
        return;
      }
      const success = await AuthService.authenticateWithBiometric();
      if (!success) {
        Alert.alert('验证失败', '生物识别验证未通过，请重试');
        return;
      }
    }
    await settings.update({ biometricEnabled: enabled });
  };

  const handleExportJSON = async () => {
    setExporting(true);
    try {
      await ExportService.exportJSON();
      Alert.alert('导出成功', 'JSON 数据已导出');
    } catch (err) {
      Alert.alert('导出失败', (err as Error).message);
    } finally {
      setExporting(false);
    }
  };

  const handleExportCSV = async () => {
    setExporting(true);
    try {
      await ExportService.exportCSV();
      Alert.alert('导出成功', 'CSV 数据已导出');
    } catch (err) {
      Alert.alert('导出失败', (err as Error).message);
    } finally {
      setExporting(false);
    }
  };

  const handleImportJSON = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: 'application/json',
        copyToCacheDirectory: true,
      });
      if (result.canceled || !result.assets?.[0]) return;

      const fileUri = result.assets[0].uri;
      const preview = await ImportService.preview(fileUri);
      Alert.alert(
        '导入预览',
        `将导入：\n${preview.accounts} 个账户\n${preview.assets} 个资产\n${preview.snapshots} 条余额快照\n\n⚠️ 将替换当前所有数据`,
        [
          { text: '取消', style: 'cancel' },
          {
            text: '确认导入',
            style: 'destructive',
            onPress: async () => {
              setImporting(true);
              try {
                await ImportService.importReplace(fileUri);
                await useAccountStore.getState().loadAccounts();
                await useAssetStore.getState().loadAssets();
                await settings.loadSettings();
                Alert.alert('导入成功', '数据已恢复');
              } catch (err) {
                Alert.alert('导入失败', (err as Error).message);
              } finally {
                setImporting(false);
              }
            },
          },
        ],
      );
    } catch (err) {
      Alert.alert('导入失败', (err as Error).message);
    }
  };

  const handleShowBackups = async () => {
    const backups = await BackupService.listBackups();
    setBackupList(backups);
    setShowBackups(true);
  };

  const handleRestoreBackup = (fileName: string) => {
    Alert.alert(
      '恢复备份',
      `确定要恢复备份 ${fileName} 吗？\n\n⚠️ 当前数据将被替换`,
      [
        { text: '取消', style: 'cancel' },
        {
          text: '确认恢复',
          style: 'destructive',
          onPress: async () => {
            try {
              await BackupService.restoreFromBackup(fileName);
              await useAccountStore.getState().loadAccounts();
              await useAssetStore.getState().loadAssets();
              await settings.loadSettings();
              setShowBackups(false);
              Alert.alert('恢复成功', '已从备份恢复数据');
            } catch (err) {
              Alert.alert('恢复失败', (err as Error).message);
            }
          },
        },
      ],
    );
  };

  const handleSetGoal = async () => {
    const goal = parseFloat(goalInput) || null;
    await settings.update({ netWorthGoal: goal });
    setGoalInput('');
    Alert.alert('已保存', '净资产目标已更新');
  };

  return (
    <ScrollView style={[styles.container, { backgroundColor: theme.colors.background }]}>
      {/* ── Security Section ── */}
      <AppCard style={styles.section}>
        <Text style={[styles.sectionTitle, { color: theme.colors.onSurface }]}>安全</Text>
        <AppListItem
          title="应用锁"
          description="开启后需 PIN 码解锁"
          icon="Lock"
          rightElement="switch"
          switchValue={settings.appLockEnabled}
          onSwitchChange={handleToggleLock}
        />
        {settings.appLockEnabled && (
          <AppListItem
            title="生物识别"
            description={biometricAvailable ? `${biometricType} 解锁` : '设备不支持'}
            icon="Fingerprint"
            rightElement="switch"
            switchValue={settings.biometricEnabled}
            onSwitchChange={handleToggleBiometric}
            disabled={!biometricAvailable}
          />
        )}
      </AppCard>

      {/* ── Appearance Section ── */}
      <AppCard style={styles.section}>
        <Text style={[styles.sectionTitle, { color: theme.colors.onSurface }]}>外观</Text>

        <Text style={[styles.subLabel, { color: theme.colors.onSurfaceVariant }]}>主题颜色</Text>
        <View style={styles.colorRow}>
          {THEME_COLORS.map(tc => (
            <TouchableOpacity
              key={tc.key}
              style={[
                styles.colorSwatch,
                { backgroundColor: tc.color },
                settings.themeColor === tc.color && {
                  borderWidth: 3,
                  borderColor: tc.color,
                  opacity: 1,
                  transform: [{ scale: 1.15 }],
                },
                settings.themeColor !== tc.color && {
                  opacity: 0.6,
                },
              ]}
              onPress={() => settings.update({ themeColor: tc.color })}
            >
              {settings.themeColor === tc.color && (
                <Icon name="Check" size={18} color="#fff" />
              )}
            </TouchableOpacity>
          ))}
        </View>

        <Text style={[styles.subLabel, { color: theme.colors.onSurfaceVariant }]}>深色模式</Text>
        <View style={styles.chipRow}>
          {DARK_MODE_OPTIONS.map(opt => (
            <AppChip
              key={opt.key}
              label={opt.label}
              selected={settings.darkMode === opt.key}
              onPress={() => settings.update({ darkMode: opt.key })}
              icon={opt.key === 'system' ? 'Settings' : opt.key === 'light' ? 'Palette' : 'Moon'}
            />
          ))}
        </View>

        <Text style={[styles.subLabel, { color: theme.colors.onSurfaceVariant }]}>货币符号</Text>
        <View style={styles.chipRow}>
          {CURRENCY_OPTIONS.map(sym => (
            <AppChip
              key={sym}
              label={sym}
              selected={settings.currencySymbol === sym}
              onPress={() => settings.update({ currencySymbol: sym })}
            />
          ))}
        </View>
      </AppCard>

      {/* ── Net Worth Goal Section ── */}
      <AppCard style={styles.section}>
        <Text style={[styles.sectionTitle, { color: theme.colors.onSurface }]}>净资产目标</Text>
        <Text style={[styles.subtext, { color: theme.colors.onSurfaceVariant }]}>
          设定目标后在总览面板显示进度
        </Text>
        {settings.netWorthGoal ? (
          <View style={styles.goalRow}>
            <Text style={[styles.goalValue, { color: theme.colors.primary }]}>
              {settings.currencySymbol}{settings.netWorthGoal.toLocaleString('zh-CN')}
            </Text>
            <AppButton
              title="清除"
              variant="text"
              onPress={() => settings.update({ netWorthGoal: null })}
            />
          </View>
        ) : null}
        <View style={styles.goalInputRow}>
          <AppTextInput
            label="输入目标金额"
            value={goalInput}
            onChangeText={setGoalInput}
            keyboardType="decimal-pad"
            style={{ flex: 1 }}
          />
          <AppButton
            title="保存"
            variant="primary"
            onPress={handleSetGoal}
            style={styles.goalBtn}
          />
        </View>
      </AppCard>

      {/* ── Data Section ── */}
      <AppCard style={styles.section}>
        <Text style={[styles.sectionTitle, { color: theme.colors.onSurface }]}>数据</Text>
        <AppListItem
          title="导出 JSON 备份"
          description="完整数据备份，可用于恢复"
          icon="FileJson"
          rightElement="chevron"
          onPress={handleExportJSON}
          disabled={exporting}
        />
        <AppListItem
          title="导出 CSV"
          description="可读格式，适合 Excel 查看"
          icon="FileSpreadsheet"
          rightElement="chevron"
          onPress={handleExportCSV}
          disabled={exporting}
        />
        <AppListItem
          title="导入 JSON 数据"
          description="从之前导出的 JSON 文件恢复"
          icon="FileDown"
          rightElement="chevron"
          onPress={handleImportJSON}
          disabled={importing}
        />
        <AppListItem
          title="自动备份管理"
          description={`查看和恢复自动备份（最近 ${backupList.length} 份）`}
          icon="HardDrive"
          rightElement="chevron"
          onPress={handleShowBackups}
        />
      </AppCard>

      {/* ── About Section ── */}
      <AppCard style={styles.section}>
        <Text style={[styles.sectionTitle, { color: theme.colors.onSurface }]}>关于</Text>
        <AppListItem
          title="家底 WorthBase"
          description="v1.0.1"
          icon="Info"
        />
        <Text style={[styles.aboutDesc, { color: theme.colors.onSurfaceVariant }]}>
          个人财务状态管理应用{'\n'}
          隐私优先 · 本地存储 · 持有成本智能计算
        </Text>
        <AppListItem
          title="GitHub"
          description="github.com/callmebg/worthbase"
          icon="HardDrive"
          rightElement="chevron"
          onPress={() => Linking.openURL('https://github.com/callmebg/worthbase.git')}
        />
        <AppListItem
          title="联系邮箱"
          description="497649129@qq.com"
          icon="Info"
          rightElement="chevron"
          onPress={() => Linking.openURL('mailto:497649129@qq.com')}
        />
      </AppCard>

      {/* Bottom Sheets */}
      <AppBottomSheet visible={showPinSetup} onClose={() => { setShowPinSetup(false); setPinInput(''); }} snapPoints={['50%', '70%']}>
        <Text style={[styles.sheetTitle, { color: theme.colors.onSurface }]}>设置 PIN 码</Text>
        <AppTextInput
          bottomSheet
          label="至少4位数字"
          value={pinInput}
          onChangeText={setPinInput}
          keyboardType="number-pad"
          secureTextEntry
          autoFocus
        />
        <View style={styles.sheetActions}>
          <AppButton title="取消" variant="text" onPress={() => { setShowPinSetup(false); setPinInput(''); }} style={{ flex: 1 }} />
          <AppButton title="确认" variant="primary" onPress={handlePinConfirm} style={{ flex: 1 }} />
        </View>
      </AppBottomSheet>

      <AppBottomSheet visible={showBackups} onClose={() => setShowBackups(false)} snapPoints={['60%', '85%']}>
        <Text style={[styles.sheetTitle, { color: theme.colors.onSurface }]}>自动备份</Text>
        {backupList.length === 0 ? (
          <Text style={[styles.emptyText, { color: theme.colors.onSurfaceVariant }]}>
            暂无备份
          </Text>
        ) : (
          <ScrollView style={{ maxHeight: 300 }}>
            {backupList.map((fileName, i) => {
              const dateMatch = fileName.match(/worthbase_(.+)\.db/);
              const dateStr = dateMatch
                ? dateMatch[1].replace(/-/g, ':').replace('T', ' ').substring(0, 19)
                : fileName;
              return (
                <AppListItem
                  key={i}
                  title={dateStr}
                  rightElement="text"
                  rightText="恢复"
                  icon="HardDrive"
                  onPress={() => handleRestoreBackup(fileName)}
                />
              );
            })}
          </ScrollView>
        )}
        <AppButton title="关闭" variant="primary" onPress={() => setShowBackups(false)} style={{ marginTop: 16 }} />
      </AppBottomSheet>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  section: { marginHorizontal: 16, marginTop: 16, marginBottom: 0 },
  sectionTitle: { fontSize: 18, fontWeight: '700', marginBottom: 12 },
  subLabel: { fontSize: 14, marginTop: 12, marginBottom: 8 },
  subtext: { fontSize: 12, marginBottom: 8 },
  colorRow: { flexDirection: 'row', gap: 12, marginBottom: 8 },
  colorSwatch: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', marginBottom: 8 },
  goalRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 8 },
  goalValue: { fontSize: 18, fontWeight: '700' },
  goalInputRow: { flexDirection: 'row', gap: 8, marginTop: 12, alignItems: 'flex-start' },
  goalBtn: { marginTop: 4 },
  aboutDesc: { fontSize: 13, marginTop: 8, lineHeight: 20, paddingHorizontal: 8 },
  sheetTitle: { fontSize: 20, fontWeight: '700', marginBottom: 16 },
  sheetActions: { flexDirection: 'row', gap: 12 },
  emptyText: { fontSize: 14, textAlign: 'center', paddingVertical: 16 },
});
