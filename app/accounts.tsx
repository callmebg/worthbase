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
  ScrollView,
  StyleSheet,
  TouchableOpacity,
} from 'react-native';
import { useAppTheme } from '@/utils/format';
import { useAccountStore } from '@/stores/account-store';
import { useSettingsStore } from '@/stores/settings-store';
import { BalanceSnapshotRepository } from '@/db/balance-snapshot-repository';
import { AccountType, AccountTypeLabels } from '@/types/enums';
import { ACCOUNT_TYPE_ICONS } from '@/theme/icons';
import type { Account } from '@/types/models';
import { formatCurrency, formatDate } from '@/utils/format';
import { AppCard } from '@/components/ui/Card';
import { AppButton } from '@/components/ui/Button';
import { AppTextInput } from '@/components/ui/TextInput';
import { AppChip } from '@/components/ui/Chip';
import { AppBottomSheet } from '@/components/ui/BottomSheet';
import { Icon } from '@/components/ui/Icon';
import { ConfirmSheet } from '@/components/ConfirmSheet';
import { isValidNumber } from '@/utils/validation';
import { LIABILITY_ACCOUNT_TYPES } from '@/types/enums';
import { useToast } from '@/hooks/useToast';
import { spacing } from '@/theme/tokens';

export default function AccountsScreen() {
  const theme = useAppTheme();
  const toast = useToast();
  const { accounts, balances, loadAccounts, addAccount, editAccount, updateBalance, deleteAccount, hardDelete } = useAccountStore();
  const { currencySymbol } = useSettingsStore();
  const [showAddSheet, setShowAddSheet] = useState(false);
  const [updateTarget, setUpdateTarget] = useState<Account | null>(null);
  const [editTarget, setEditTarget] = useState<Account | null>(null);
  const [historyVisible, setHistoryVisible] = useState(false);
  const [actionTarget, setActionTarget] = useState<Account | null>(null);
  const [confirmArchive, setConfirmArchive] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  useEffect(() => { loadAccounts(); }, []);

  const totalBalance = accounts.reduce((sum, a) => sum + (balances.get(a.id) ?? 0), 0);

  const handleUpdateBalance = async (accountId: string, balance: number) => {
    try {
      await updateBalance(accountId, balance);
      setUpdateTarget(null);
      toast.show('余额已更新', 'success');
    } catch (err) {
      toast.show(`更新失败: ${(err as Error).message}`, 'error');
    }
  };

  const handleArchive = async () => {
    if (!actionTarget) return;
    try {
      await deleteAccount(actionTarget.id);
      setConfirmArchive(false);
      setActionTarget(null);
      toast.show('账户已存档', 'success');
    } catch (err) {
      toast.show(`存档失败: ${(err as Error).message}`, 'error');
    }
  };

  const handleHardDelete = async () => {
    if (!actionTarget) return;
    try {
      await hardDelete(actionTarget.id);
      setConfirmDelete(false);
      setActionTarget(null);
      toast.show('账户已删除', 'success');
    } catch (err) {
      toast.show(`删除失败: ${(err as Error).message}`, 'error');
    }
  };

  const handleLongPress = (account: Account) => {
    setActionTarget(account);
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      {/* Total Balance Hero Card */}
      <View style={[styles.totalCard, { backgroundColor: theme.colors.primary }]}>
        <Text style={[styles.totalLabel, { color: theme.colors.onPrimary }]}>账户余额总计</Text>
        <Text style={[styles.totalAmount, { color: theme.colors.onPrimary }]}>{formatCurrency(totalBalance, currencySymbol)}</Text>
        <Text style={[styles.accountCount, { color: theme.colors.onPrimary }]}>{accounts.length} 个账户</Text>
      </View>

      {/* Account List */}
      <FlatList
        data={accounts}
        keyExtractor={item => item.id}
        contentContainerStyle={styles.list}
        renderItem={({ item }) => (
          <AppCard
            onPress={() => setUpdateTarget(item)}
            onLongPress={() => handleLongPress(item)}
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
              {formatCurrency(balances.get(item.id) ?? 0, currencySymbol)}
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
        onAdd={async (name, type, initialBalance) => {
          try {
            await addAccount(name, type, null, initialBalance);
            setShowAddSheet(false);
            toast.show('账户已添加', 'success');
          } catch (err) {
            toast.show(`添加失败: ${(err as Error).message}`, 'error');
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
            toast.show('已保存', 'success');
          } catch (err) {
            toast.show(`保存失败: ${(err as Error).message}`, 'error');
          }
        }}
        onArchive={(account) => {
          setEditTarget(null);
          setActionTarget(account);
          setConfirmArchive(true);
        }}
        onHardDelete={(account) => {
          setEditTarget(null);
          setActionTarget(account);
          setConfirmDelete(true);
        }}
      />

      {/* Account Action Sheet (long-press menu) */}
      <AccountActionSheet
        account={actionTarget}
        onClose={() => setActionTarget(null)}
        onEdit={(account) => { setActionTarget(null); setEditTarget(account); }}
        onArchive={(account) => { setActionTarget(account); setConfirmArchive(true); }}
        onDelete={(account) => { setActionTarget(account); setConfirmDelete(true); }}
      />

      {/* Confirmation Sheets */}
      <ConfirmSheet
        visible={confirmArchive}
        onClose={() => setConfirmArchive(false)}
        onConfirm={handleArchive}
        title="存档账户"
        description={actionTarget ? `确定要存档"${actionTarget.name}"吗？存档后账户将被隐藏，但历史余额数据将保留。` : undefined}
        confirmLabel="存档"
        icon="Archive"
        variant="danger"
      />
      <ConfirmSheet
        visible={confirmDelete}
        onClose={() => setConfirmDelete(false)}
        onConfirm={handleHardDelete}
        title="彻底删除账户"
        description="此操作不可撤销，该账户及其所有余额记录将被永久删除。"
        confirmLabel="彻底删除"
        icon="Trash2"
        variant="danger"
      />
    </View>
  );
}

// ── Add Account BottomSheet ──

function AddAccountSheet({ visible, onClose, onAdd }: {
  visible: boolean;
  onClose: () => void;
  onAdd: (name: string, type: AccountType, initialBalance?: number) => void;
}) {
  const theme = useAppTheme();
  const [name, setName] = useState('');
  const [type, setType] = useState<AccountType>(AccountType.WECHAT);
  const [initialBalance, setInitialBalance] = useState('');
  const types = Object.values(AccountType);

  const balanceError =
    initialBalance && !isValidNumber(initialBalance) ? '请输入有效金额' : '';

  return (
    <AppBottomSheet visible={visible} onClose={onClose} snapPoints={['70%', '90%']}>
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
      <AppTextInput bottomSheet
        label={LIABILITY_ACCOUNT_TYPES.has(type) ? '初始欠款（可选）' : '初始余额（可选）'}
        value={initialBalance}
        onChangeText={setInitialBalance}
        placeholder={LIABILITY_ACCOUNT_TYPES.has(type) ? '-5000.00' : '0.00'}
        keyboardType="numeric"
        error={balanceError}
      />
      <View style={styles.sheetActions}>
        <AppButton title="取消" variant="text" onPress={onClose} style={styles.sheetBtn} />
        <AppButton
          title="确认"
          variant="primary"
          disabled={!name.trim()}
          onPress={() => {
            let balance: number | undefined;
            if (initialBalance && isValidNumber(initialBalance)) {
              balance = parseFloat(initialBalance);
              // Auto-negate for liability accounts (user enters positive debt amount)
              if (LIABILITY_ACCOUNT_TYPES.has(type) && balance > 0) {
                balance = -balance;
              }
            }
            onAdd(name.trim(), type, balance);
            setName('');
            setInitialBalance('');
          }}
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
  const { currencySymbol } = useSettingsStore();
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
        当前余额: {formatCurrency(currentBalance, currencySymbol)}
      </Text>
      <AppTextInput bottomSheet
        label="输入新余额"
        value={balance}
        onChangeText={setBalance}
        keyboardType="numeric"
        placeholder="支持负数，如 -5000"
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
  const { currencySymbol } = useSettingsStore();
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
      <ScrollView style={{ maxHeight: 300 }}>
        {dates.map((item) => {
          const total = item.balances.reduce((s, b) => s + b.balance, 0);
          return (
            <View key={item.date} style={[styles.historyRow, { borderBottomColor: theme.colors.outline }]}>
              <Text style={[styles.historyDate, { color: theme.colors.onSurfaceVariant }]}>
                {formatDate(item.date)}
              </Text>
              <Text style={[styles.historyTotal, { color: theme.colors.onSurface }]}>
                {formatCurrency(total, currencySymbol)}
              </Text>
            </View>
          );
        })}
      </ScrollView>
      <AppButton title="关闭" variant="primary" onPress={onClose} style={{ marginTop: spacing.md }} />
    </AppBottomSheet>
  );
}

// ── Edit Account BottomSheet ──

function EditAccountSheet({ account, onClose, onSave, onArchive, onHardDelete }: {
  account: Account | null;
  onClose: () => void;
  onSave: (id: string, name: string, type: AccountType) => void;
  onArchive: (account: Account) => void;
  onHardDelete: (account: Account) => void;
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
        title="存档此账户"
        variant="secondary"
        icon="Archive"
        onPress={() => onArchive(account)}
        style={{ marginTop: 12 }}
      />
      <AppButton
        title="彻底删除"
        variant="danger"
        icon="Trash2"
        onPress={() => onHardDelete(account)}
        style={{ marginTop: spacing.sm }}
      />
    </AppBottomSheet>
  );
}

// ── Account Action Sheet (long-press menu) ──

function AccountActionSheet({ account, onClose, onEdit, onArchive, onDelete }: {
  account: Account | null;
  onClose: () => void;
  onEdit: (account: Account) => void;
  onArchive: (account: Account) => void;
  onDelete: (account: Account) => void;
}) {
  const theme = useAppTheme();
  if (!account) return null;

  return (
    <AppBottomSheet visible={!!account} onClose={onClose} snapPoints={['35%']}>
      <View style={actionStyles.header}>
        <Icon
          name={ACCOUNT_TYPE_ICONS[account.type] || 'CreditCard'}
          size={24}
          color="primary"
        />
        <View style={actionStyles.headerText}>
          <Text style={[actionStyles.name, { color: theme.colors.onSurface }]}>
            {account.name}
          </Text>
          <Text style={[actionStyles.type, { color: theme.colors.onSurfaceVariant }]}>
            {AccountTypeLabels[account.type]}
          </Text>
        </View>
      </View>

      <View style={[actionStyles.divider, { backgroundColor: theme.colors.outline }]} />

      <TouchableOpacity style={actionStyles.actionRow} onPress={() => onEdit(account)}>
        <Icon name="Pencil" size={20} color={theme.colors.onSurface} />
        <Text style={[actionStyles.actionLabel, { color: theme.colors.onSurface }]}>编辑</Text>
      </TouchableOpacity>

      <TouchableOpacity style={actionStyles.actionRow} onPress={() => onArchive(account)}>
        <Icon name="Archive" size={20} color={theme.colors.onSurfaceVariant} />
        <Text style={[actionStyles.actionLabel, { color: theme.colors.onSurfaceVariant }]}>存档</Text>
      </TouchableOpacity>

      <TouchableOpacity style={actionStyles.actionRow} onPress={() => onDelete(account)}>
        <Icon name="Trash2" size={20} color={theme.colors.error} />
        <Text style={[actionStyles.actionLabel, { color: theme.colors.error }]}>彻底删除</Text>
      </TouchableOpacity>
    </AppBottomSheet>
  );
}

const actionStyles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: spacing.md },
  headerText: { flex: 1 },
  name: { fontSize: 18, fontWeight: '700' },
  type: { fontSize: 13, marginTop: 2 },
  divider: { height: StyleSheet.hairlineWidth, marginBottom: spacing.sm },
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 14,
    paddingHorizontal: spacing.xs,
  },
  actionLabel: { fontSize: 16 },
});

const styles = StyleSheet.create({
  container: { flex: 1 },
  totalCard: {
    padding: spacing.lg,
    alignItems: 'center',
    borderRadius: 16,
    margin: spacing.md,
    shadowColor: '#000',
    shadowOpacity: 0.12,
    shadowRadius: 12,
    elevation: 4,
  },
  totalLabel: { fontSize: 14, opacity: 0.85 },
  totalAmount: { fontSize: 32, fontWeight: '700', marginTop: spacing.xs },
  accountCount: { fontSize: 12, opacity: 0.6, marginTop: spacing.xs },
  list: { paddingHorizontal: spacing.md, paddingBottom: 100 },
  accountCard: { marginBottom: spacing.sm + spacing.xs },
  cardHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: spacing.sm },
  cardInfo: { flex: 1, marginLeft: spacing.sm + spacing.xs },
  cardName: { fontSize: 16, fontWeight: '600' },
  cardType: { fontSize: 12, marginTop: 2 },
  cardBalance: { fontSize: 24, fontWeight: '700', marginBottom: spacing.sm + spacing.xs },
  updateBtn: { marginTop: spacing.xs },
  actions: { flexDirection: 'row', paddingHorizontal: spacing.md, gap: spacing.sm + spacing.xs, paddingBottom: spacing.md },
  actionBtn: { flex: 1 },
  // Sheet styles
  sheetTitle: { fontSize: 20, fontWeight: '700', marginBottom: spacing.md },
  sheetSubtitle: { fontSize: 16, marginBottom: spacing.xs },
  currentBalance: { fontSize: 14, marginBottom: spacing.sm + spacing.xs },
  label: { fontSize: 14, marginBottom: spacing.sm },
  typeGrid: { flexDirection: 'row', flexWrap: 'wrap', marginBottom: spacing.md + spacing.xs },
  sheetActions: { flexDirection: 'row', gap: spacing.sm + spacing.xs },
  sheetBtn: { flex: 1 },
  // History
  historyRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: spacing.sm + spacing.xs,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  historyDate: { fontSize: 14 },
  historyTotal: { fontSize: 14, fontWeight: '600' },
});
