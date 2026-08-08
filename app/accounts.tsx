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
  TouchableOpacity,
  RefreshControl,
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
import { FORTUNES } from '@/utils/fortunes';
import { spacing } from '@/theme/tokens';
import { AccountExplainer } from '@/components/AccountExplainer';

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
  const [showExplainer, setShowExplainer] = useState(false);
  const [accountHistoryTarget, setAccountHistoryTarget] = useState<Account | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [previousBalances, setPreviousBalances] = useState<Map<string, number>>(new Map());

  useEffect(() => {
    loadAccounts();
    BalanceSnapshotRepository.getPreviousBalances().then(setPreviousBalances);
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    const fortune = FORTUNES[Math.floor(Math.random() * FORTUNES.length)];
    toast.show(fortune, 'success', 2500);
    loadAccounts();
    setTimeout(() => setRefreshing(false), 400);
  };

  const totalBalance = accounts.reduce((sum, a) => sum + (balances.get(a.id) ?? 0), 0);

  const handleUpdateBalance = async (accountId: string, balance: number) => {
    try {
      await updateBalance(accountId, balance);
      setUpdateTarget(null);
      const prev = await BalanceSnapshotRepository.getPreviousBalances();
      setPreviousBalances(prev);
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
        <View style={styles.heroLabelRow}>
          <View style={styles.heroLabelLeft}>
            <Text style={[styles.totalLabel, { color: theme.colors.onPrimary }]}>账户余额总计</Text>
            <TouchableOpacity
              onPress={() => setShowExplainer(true)}
              style={styles.infoIconBtn}
            >
              <Icon name="Info" size={14} color={theme.colors.onPrimary} />
            </TouchableOpacity>
          </View>
        </View>
        <TouchableOpacity onPress={() => setHistoryVisible(true)} activeOpacity={0.7}>
          <Text style={[styles.totalAmount, { color: theme.colors.onPrimary }]}>{formatCurrency(totalBalance, currencySymbol)}</Text>
        </TouchableOpacity>
        <Text style={[styles.accountCount, { color: theme.colors.onPrimary }]}>{accounts.length} 个账户</Text>
      </View>

      {/* Account List */}
      <FlatList
        data={accounts}
        keyExtractor={item => item.id}
        contentContainerStyle={[styles.list, { paddingBottom: 24 }]}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={theme.colors.primary}
          />
        }
        ListFooterComponent={
          <TouchableOpacity
            onPress={() => setShowAddSheet(true)}
            style={[styles.addBtn, { borderColor: theme.colors.outline }]}
            activeOpacity={0.7}
          >
            <Icon name="Plus" size={18} color={theme.colors.primary} />
            <Text style={[styles.addBtnLabel, { color: theme.colors.primary }]}>添加账户</Text>
          </TouchableOpacity>
        }
        renderItem={({ item }) => (
          <AppCard
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
              <TouchableOpacity onPress={() => setUpdateTarget(item)} activeOpacity={0.7} style={styles.cardBalanceWrap}>
                <Text style={[styles.cardBalance, { color: theme.colors.onSurface }]}>
                  {formatCurrency(balances.get(item.id) ?? 0, currencySymbol)}
                </Text>
                {(() => {
                  const current = balances.get(item.id) ?? 0;
                  const sharePct = totalBalance !== 0 ? (current / totalBalance) * 100 : 0;
                  const share = sharePct >= 0.05 ? sharePct.toFixed(1) : null;
                  const prev = previousBalances.get(item.id);
                  let deltaText = '';
                  let deltaColor = theme.colors.onSurfaceVariant;
                  if (prev !== undefined) {
                    const delta = current - prev;
                    if (delta !== 0) {
                      const pct = prev !== 0 ? ((delta / Math.abs(prev)) * 100).toFixed(1) : null;
                      const sign = delta > 0 ? '+' : '';
                      deltaColor = delta > 0 ? theme.colors.error : theme.colors.success;
                      deltaText = `${sign}${formatCurrency(delta, currencySymbol)}${pct ? ` (${sign}${pct}%)` : ''}`;
                    }
                  }
                  if (!share && !deltaText) return null;
                  return (
                    <View style={styles.cardMetaRow}>
                      {share && (
                        <Text style={[styles.cardDelta, { color: theme.colors.onSurfaceVariant }]}>
                          占比{share}%
                        </Text>
                      )}
                      {share && deltaText && (
                        <Text style={[styles.cardMetaSep, { color: theme.colors.onSurfaceVariant }]}>·</Text>
                      )}
                      {deltaText !== '' && (
                        <Text style={[styles.cardDelta, { color: deltaColor }]}>
                          {deltaText}
                        </Text>
                      )}
                    </View>
                  );
                })()}
              </TouchableOpacity>
            </View>
          </AppCard>
        )}
      />

      {/* Add account button is at the bottom of the list */}

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
        onUpdateBalance={(account) => { setActionTarget(null); setUpdateTarget(account); }}
        onViewHistory={(account) => { setActionTarget(null); setAccountHistoryTarget(account); }}
        onArchive={(account) => { setActionTarget(account); setConfirmArchive(true); }}
        onDelete={(account) => { setActionTarget(account); setConfirmDelete(true); }}
      />

      {/* Account History Sheet (single account balance changes) */}
      <AccountHistorySheet
        account={accountHistoryTarget}
        onClose={() => setAccountHistoryTarget(null)}
      />

      {/* Account Explainer */}
      <AccountExplainer
        visible={showExplainer}
        onClose={() => setShowExplainer(false)}
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
      <FlatList
        data={dates}
        keyExtractor={item => item.date}
        style={{ flex: 1 }}
        renderItem={({ item }) => {
          const total = item.balances.reduce((s, b) => s + b.balance, 0);
          return (
            <View style={[styles.historyRow, { borderBottomColor: theme.colors.outline }]}>
              <Text style={[styles.historyDate, { color: theme.colors.onSurfaceVariant }]}>
                {formatDate(item.date)}
              </Text>
              <Text style={[styles.historyTotal, { color: theme.colors.onSurface }]}>
                {formatCurrency(total, currencySymbol)}
              </Text>
            </View>
          );
        }}
      />
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

function AccountActionSheet({ account, onClose, onEdit, onUpdateBalance, onViewHistory, onArchive, onDelete }: {
  account: Account | null;
  onClose: () => void;
  onEdit: (account: Account) => void;
  onUpdateBalance: (account: Account) => void;
  onViewHistory: (account: Account) => void;
  onArchive: (account: Account) => void;
  onDelete: (account: Account) => void;
}) {
  const theme = useAppTheme();
  if (!account) return null;

  return (
    <AppBottomSheet visible={!!account} onClose={onClose} snapPoints={['45%']}>
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

      <TouchableOpacity style={actionStyles.actionRow} onPress={() => onUpdateBalance(account)}>
        <Icon name="PenLine" size={20} color={theme.colors.onSurface} />
        <Text style={[actionStyles.actionLabel, { color: theme.colors.onSurface }]}>记录余额</Text>
      </TouchableOpacity>

      <TouchableOpacity style={actionStyles.actionRow} onPress={() => onViewHistory(account)}>
        <Icon name="History" size={20} color={theme.colors.onSurfaceVariant} />
        <Text style={[actionStyles.actionLabel, { color: theme.colors.onSurfaceVariant }]}>查看变更</Text>
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

// ── Account History Sheet (single account balance changes) ──

function AccountHistorySheet({ account, onClose }: {
  account: Account | null;
  onClose: () => void;
}) {
  const theme = useAppTheme();
  const { currencySymbol } = useSettingsStore();
  const [snapshots, setSnapshots] = useState<{ date: string; balance: number }[]>([]);

  useEffect(() => {
    if (account) loadSnapshots(account.id);
  }, [account]);

  const loadSnapshots = async (accountId: string) => {
    const allDates = await BalanceSnapshotRepository.getAllSnapshotDates();
    const result: { date: string; balance: number }[] = [];
    for (const date of allDates) {
      const balMap = await BalanceSnapshotRepository.getBalancesForDate(date);
      const balance = balMap.get(accountId);
      if (balance !== undefined) {
        result.push({ date, balance });
      }
    }
    setSnapshots(result);
  };

  if (!account) return null;

  return (
    <AppBottomSheet visible={!!account} onClose={onClose} snapPoints={['60%', '85%']}>
      <Text style={[styles.sheetTitle, { color: theme.colors.onSurface }]}>{account.name} 变更历史</Text>
      {snapshots.length < 2 ? (
        <View style={styles.historyEmpty}>
          <Icon name="History" size={32} color="onSurfaceVariant" />
          <Text style={[styles.historyEmptyHint, { color: theme.colors.onSurfaceVariant }]}>
            暂无变更历史
          </Text>
          <Text style={[styles.historyEmptyHint, { color: theme.colors.tertiary }]}>
            记录两次余额后即可查看变化趋势
          </Text>
        </View>
      ) : (
        <FlatList
          data={snapshots}
          keyExtractor={item => item.date}
          style={{ flex: 1 }}
          renderItem={({ item, index }) => {
            const prev = index < snapshots.length - 1 ? snapshots[index + 1].balance : null;
            const delta = prev !== null ? item.balance - prev : null;
            return (
              <View style={[styles.historyRow, { borderBottomColor: theme.colors.outline }]}>
                <Text style={[styles.historyDate, { color: theme.colors.onSurfaceVariant }]}>
                  {formatDate(item.date)}
                </Text>
                <View style={styles.historyRight}>
                  <Text style={[styles.historyTotal, { color: theme.colors.onSurface }]}>
                    {formatCurrency(item.balance, currencySymbol)}
                  </Text>
                  {delta !== null && delta !== 0 && (
                    <Text style={[styles.historyDelta, { color: delta > 0 ? theme.colors.error : theme.colors.success }]}>
                      {delta > 0 ? '+' : ''}{formatCurrency(delta, currencySymbol)}
                    </Text>
                  )}
                </View>
              </View>
            );
          }}
        />
      )}
      <AppButton title="关闭" variant="primary" onPress={onClose} style={{ marginTop: spacing.md }} />
    </AppBottomSheet>
  );
}

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
  heroLabelRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  heroLabelLeft: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  totalLabel: { fontSize: 14, opacity: 0.85 },
  infoIconBtn: { opacity: 0.7, padding: 2 },
  totalAmount: { fontSize: 32, fontWeight: '700', marginTop: spacing.xs },
  accountCount: { fontSize: 12, opacity: 0.6, marginTop: spacing.xs },
  list: { paddingHorizontal: spacing.md },
  accountCard: { marginBottom: spacing.sm + spacing.xs },
  cardHeader: { flexDirection: 'row', alignItems: 'center' },
  cardInfo: { flex: 1, marginLeft: spacing.sm + spacing.xs },
  cardName: { fontSize: 16, fontWeight: '600' },
  cardType: { fontSize: 12, marginTop: 2 },
  cardBalanceWrap: { alignItems: 'flex-end' },
  cardBalance: { fontSize: 20, fontWeight: '700' },
  cardDelta: { fontSize: 11, marginTop: 2 },
  cardMetaRow: { flexDirection: 'row', alignItems: 'center', marginTop: 2 },
  cardMetaSep: { fontSize: 11, marginHorizontal: 4 },
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
  historyRight: { alignItems: 'flex-end' },
  historyDelta: { fontSize: 12, marginTop: 2 },
  historyEmpty: { alignItems: 'center', justifyContent: 'center', paddingVertical: spacing.xl },
  historyEmptyHint: { fontSize: 14, marginTop: spacing.xs },
  // Add button
  addBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    marginTop: spacing.sm,
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    borderStyle: 'dashed',
  },
  addBtnLabel: { fontSize: 15, fontWeight: '600' },
});
