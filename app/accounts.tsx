/**
 * WorthBase (家底) - Accounts Tab
 * Shows account list with balances, total liquid assets, and balance history.
 * Redesigned with design system, Paper components, BottomSheet, and Lucide icons.
 */

import { useEffect, useState, useRef } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  Alert,
} from 'react-native';
import { useAppTheme } from '@/utils/format';
import { useAccountStore } from '@/stores/account-store';
import { BalanceSnapshotRepository } from '@/db/balance-snapshot-repository';
import { AccountType, AccountTypeLabels } from '@/types/enums';
import { ACCOUNT_TYPE_ICONS } from '@/theme/icons';
import type { Account } from '@/types/models';
import { formatCurrency, formatDate } from '@/utils/format';
import { AppCard } from '@/components/ui/Card';
import { AppButton } from '@/components/ui/Button';
import { AppTextInput } from '@/components/ui/TextInput';
import { AppChip } from '@/components/ui/Chip';
import { AppBottomSheet, BottomSheetTextInput } from '@/components/ui/BottomSheet';
import type { AppBottomSheetRef } from '@/components/ui/BottomSheet';
import { Icon } from '@/components/ui/Icon';

export default function AccountsScreen() {
  const theme = useAppTheme();
  const { accounts, balances, loadAccounts, addAccount, editAccount, updateBalance, deleteAccount } = useAccountStore();
  const [showAddSheet, setShowAddSheet] = useState(false);
  const [updateTarget, setUpdateTarget] = useState<Account | null>(null);
  const [editTarget, setEditTarget] = useState<Account | null>(null);
  const [historyVisible, setHistoryVisible] = useState(false);

  useEffect(() => { loadAccounts(); }, []);

  const totalBalance = accounts.reduce((sum, a) => sum + (balances.get(a.id) ?? 0), 0);

  const handleUpdateBalance = async (accountId: string, balance: number) => {
    try {
      await updateBalance(accountId, balance);
      setUpdateTarget(null);
    } catch (err) {
      Alert.alert('更新失败', (err as Error).message);
    }
  };

  const handleDelete = (account: Account) => {
    Alert.alert(
      '删除账户',
      `确定要删除"${account.name}"吗？相关的余额历史也会被删除。`,
      [
        { text: '取消', style: 'cancel' },
        {
          text: '删除', style: 'destructive', onPress: async () => {
            try {
              await deleteAccount(account.id);
            } catch (err) {
              Alert.alert('删除失败', (err as Error).message);
            }
          },
        },
      ]
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      {/* Total Balance Hero Card */}
      <View style={[styles.totalCard, { backgroundColor: theme.colors.primary }]}>
        <Text style={styles.totalLabel}>流动资产总计</Text>
        <Text style={styles.totalAmount}>{formatCurrency(totalBalance)}</Text>
        <Text style={styles.accountCount}>{accounts.length} 个账户</Text>
      </View>

      {/* Account List */}
      <FlatList
        data={accounts}
        keyExtractor={item => item.id}
        contentContainerStyle={styles.list}
        renderItem={({ item }) => (
          <AppCard
            onPress={() => setUpdateTarget(item)}
            onLongPress={() => setEditTarget(item)}
            style={styles.accountCard}
          >
            <View style={styles.cardHeader}>
              <Icon
                name={ACCOUNT_TYPE_ICONS[item.type] || 'CreditCard'}
                size={28}
                color="primary"
              />
              <View style={styles.cardInfo}>
                <Text style={[styles.cardName, { color: theme.colors.onSurface }]}>
                  {item.name}
                </Text>
                <Text style={[styles.cardType, { color: theme.colors.onSurfaceVariant }]}>
                  {AccountTypeLabels[item.type]}
                </Text>
              </View>
            </View>
            <Text style={[styles.cardBalance, { color: theme.colors.onSurface }]}>
              {formatCurrency(balances.get(item.id) ?? 0)}
            </Text>
            <AppButton
              title="更新余额"
              variant="secondary"
              onPress={() => setUpdateTarget(item)}
              compact
              style={styles.updateBtn}
            />
          </AppCard>
        )}
      />

      {/* Action Buttons */}
      <View style={styles.actions}>
        <AppButton
          title="添加账户"
          variant="primary"
          icon="Plus"
          onPress={() => setShowAddSheet(true)}
          style={styles.actionBtn}
        />
        <AppButton
          title="余额历史"
          variant="secondary"
          icon="Clock"
          onPress={() => setHistoryVisible(true)}
          style={styles.actionBtn}
        />
      </View>

      {/* Add Account BottomSheet */}
      <AddAccountSheet
        visible={showAddSheet}
        onClose={() => setShowAddSheet(false)}
        onAdd={async (name, type) => {
          try {
            await addAccount(name, type);
            setShowAddSheet(false);
          } catch (err) {
            Alert.alert('添加失败', (err as Error).message);
          }
        }}
      />

      {/* Update Balance BottomSheet */}
      <UpdateBalanceSheet
        account={updateTarget}
        currentBalance={updateTarget ? balances.get(updateTarget.id) ?? 0 : 0}
        onClose={() => setUpdateTarget(null)}
        onUpdate={handleUpdateBalance}
      />

      {/* Balance History BottomSheet */}
      <BalanceHistorySheet
        visible={historyVisible}
        onClose={() => setHistoryVisible(false)}
      />

      {/* Edit Account BottomSheet */}
      <EditAccountSheet
        account={editTarget}
        onClose={() => setEditTarget(null)}
        onSave={async (id, name, type) => {
          try {
            await editAccount(id, { name, type });
            setEditTarget(null);
          } catch (err) {
            Alert.alert('保存失败', (err as Error).message);
          }
        }}
        onDelete={(account) => {
          setEditTarget(null);
          handleDelete(account);
        }}
      />
    </View>
  );
}

// ── Add Account BottomSheet ──

function AddAccountSheet({ visible, onClose, onAdd }: {
  visible: boolean;
  onClose: () => void;
  onAdd: (name: string, type: AccountType) => void;
}) {
  const theme = useAppTheme();
  const [name, setName] = useState('');
  const [type, setType] = useState<AccountType>(AccountType.WECHAT);
  const types = Object.values(AccountType);

  return (
    <AppBottomSheet visible={visible} onClose={onClose} snapPoints={['60%', '85%']}>
      <Text style={[styles.sheetTitle, { color: theme.colors.onSurface }]}>添加账户</Text>
      <AppTextInput bottomSheet
        label="账户名称"
        value={name}
        onChangeText={setName}
        autoFocus
      />
      <Text style={[styles.label, { color: theme.colors.onSurfaceVariant }]}>账户类型</Text>
      <View style={styles.typeGrid}>
        {types.map(t => (
          <AppChip
            key={t}
            label={AccountTypeLabels[t]}
            selected={type === t}
            onPress={() => setType(t)}
            icon={ACCOUNT_TYPE_ICONS[t]}
          />
        ))}
      </View>
      <View style={styles.sheetActions}>
        <AppButton title="取消" variant="text" onPress={onClose} style={styles.sheetBtn} />
        <AppButton
          title="确认"
          variant="primary"
          disabled={!name.trim()}
          onPress={() => { onAdd(name.trim(), type); setName(''); }}
          style={styles.sheetBtn}
        />
      </View>
    </AppBottomSheet>
  );
}

// ── Update Balance BottomSheet ──

function UpdateBalanceSheet({ account, currentBalance, onClose, onUpdate }: {
  account: Account | null;
  currentBalance: number;
  onClose: () => void;
  onUpdate: (accountId: string, balance: number) => void;
}) {
  const theme = useAppTheme();
  const [balance, setBalance] = useState('');

  useEffect(() => { setBalance(''); }, [account]);

  if (!account) return null;

  return (
    <AppBottomSheet visible={!!account} onClose={onClose} snapPoints={['50%']}>
      <Text style={[styles.sheetTitle, { color: theme.colors.onSurface }]}>更新余额</Text>
      <Text style={[styles.sheetSubtitle, { color: theme.colors.onSurfaceVariant }]}>
        {account.name}
      </Text>
      <Text style={[styles.currentBalance, { color: theme.colors.tertiary }]}>
        当前余额: {formatCurrency(currentBalance)}
      </Text>
      <AppTextInput bottomSheet
        label="输入新余额"
        value={balance}
        onChangeText={setBalance}
        keyboardType="decimal-pad"
        autoFocus
      />
      <View style={styles.sheetActions}>
        <AppButton title="取消" variant="text" onPress={onClose} style={styles.sheetBtn} />
        <AppButton
          title="保存"
          variant="primary"
          disabled={!balance}
          onPress={() => onUpdate(account.id, parseFloat(balance) || 0)}
          style={styles.sheetBtn}
        />
      </View>
    </AppBottomSheet>
  );
}

// ── Balance History BottomSheet ──

function BalanceHistorySheet({ visible, onClose }: {
  visible: boolean;
  onClose: () => void;
}) {
  const theme = useAppTheme();
  const [dates, setDates] = useState<{ date: string; balances: { accountId: string; balance: number }[] }[]>([]);

  useEffect(() => {
    if (visible) loadHistory();
  }, [visible]);

  const loadHistory = async () => {
    const allDates = await BalanceSnapshotRepository.getAllSnapshotDates();
    const history = await Promise.all(
      allDates.slice(0, 30).map(async date => ({
        date,
        balances: Array.from((await BalanceSnapshotRepository.getBalancesForDate(date)).entries()).map(
          ([accountId, balance]) => ({ accountId, balance })
        ),
      }))
    );
    setDates(history);
  };

  return (
    <AppBottomSheet visible={visible} onClose={onClose} snapPoints={['60%', '85%']}>
      <Text style={[styles.sheetTitle, { color: theme.colors.onSurface }]}>余额更新历史</Text>
      <FlatList
        data={dates}
        keyExtractor={item => item.date}
        renderItem={({ item }) => {
          const total = item.balances.reduce((s, b) => s + b.balance, 0);
          return (
            <View style={[styles.historyRow, { borderBottomColor: theme.colors.outline }]}>
              <Text style={[styles.historyDate, { color: theme.colors.onSurfaceVariant }]}>
                {formatDate(item.date)}
              </Text>
              <Text style={[styles.historyTotal, { color: theme.colors.onSurface }]}>
                {formatCurrency(total)}
              </Text>
            </View>
          );
        }}
      />
      <AppButton title="关闭" variant="primary" onPress={onClose} style={{ marginTop: 16 }} />
    </AppBottomSheet>
  );
}

// ── Edit Account BottomSheet ──

function EditAccountSheet({ account, onClose, onSave, onDelete }: {
  account: Account | null;
  onClose: () => void;
  onSave: (id: string, name: string, type: AccountType) => void;
  onDelete: (account: Account) => void;
}) {
  const theme = useAppTheme();
  const [name, setName] = useState('');
  const [type, setType] = useState<AccountType>(AccountType.WECHAT);
  const types = Object.values(AccountType);

  useEffect(() => {
    if (account) {
      setName(account.name);
      setType(account.type);
    }
  }, [account]);

  if (!account) return null;

  return (
    <AppBottomSheet visible={!!account} onClose={onClose} snapPoints={['60%', '85%']}>
      <Text style={[styles.sheetTitle, { color: theme.colors.onSurface }]}>编辑账户</Text>
      <AppTextInput bottomSheet
        label="账户名称"
        value={name}
        onChangeText={setName}
      />
      <Text style={[styles.label, { color: theme.colors.onSurfaceVariant }]}>账户类型</Text>
      <View style={styles.typeGrid}>
        {types.map(t => (
          <AppChip
            key={t}
            label={AccountTypeLabels[t]}
            selected={type === t}
            onPress={() => setType(t)}
            icon={ACCOUNT_TYPE_ICONS[t]}
          />
        ))}
      </View>
      <View style={styles.sheetActions}>
        <AppButton title="取消" variant="text" onPress={onClose} style={styles.sheetBtn} />
        <AppButton
          title="保存"
          variant="primary"
          disabled={!name.trim()}
          onPress={() => onSave(account.id, name.trim(), type)}
          style={styles.sheetBtn}
        />
      </View>
      <AppButton
        title="删除此账户"
        variant="danger"
        icon="Trash2"
        onPress={() => onDelete(account)}
        style={{ marginTop: 12 }}
      />
    </AppBottomSheet>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  totalCard: {
    padding: 24,
    alignItems: 'center',
    borderRadius: 16,
    margin: 16,
    shadowColor: '#000',
    shadowOpacity: 0.12,
    shadowRadius: 12,
    elevation: 4,
  },
  totalLabel: { color: '#fff', fontSize: 14, opacity: 0.85 },
  totalAmount: { color: '#fff', fontSize: 32, fontWeight: '700', marginTop: 4 },
  accountCount: { color: '#fff', fontSize: 12, opacity: 0.6, marginTop: 4 },
  list: { paddingHorizontal: 16, paddingBottom: 100 },
  accountCard: { marginBottom: 12 },
  cardHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
  cardInfo: { flex: 1, marginLeft: 12 },
  cardName: { fontSize: 16, fontWeight: '600' },
  cardType: { fontSize: 12, marginTop: 2 },
  cardBalance: { fontSize: 24, fontWeight: '700', marginBottom: 12 },
  updateBtn: { marginTop: 4 },
  actions: { flexDirection: 'row', paddingHorizontal: 16, gap: 12, paddingBottom: 16 },
  actionBtn: { flex: 1 },
  // Sheet styles
  sheetTitle: { fontSize: 20, fontWeight: '700', marginBottom: 16 },
  sheetSubtitle: { fontSize: 16, marginBottom: 4 },
  currentBalance: { fontSize: 14, marginBottom: 12 },
  label: { fontSize: 14, marginBottom: 8 },
  typeGrid: { flexDirection: 'row', flexWrap: 'wrap', marginBottom: 20 },
  sheetActions: { flexDirection: 'row', gap: 12 },
  sheetBtn: { flex: 1 },
  // History
  historyRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  historyDate: { fontSize: 14 },
  historyTotal: { fontSize: 14, fontWeight: '600' },
});
