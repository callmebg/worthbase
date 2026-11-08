/**
 * WorthBase (家底) - Accounts Tab
 * Shows account list with balances, total liquid assets, and balance history.
 * Redesigned with design system, Paper components, BottomSheet, and Lucide icons.
 */

import { useEffect, useState } from 'react';
import {
  View,
  Text,
  FlatList,
  SectionList,
  StyleSheet,
  TouchableOpacity,
  RefreshControl,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useAppTheme, formatCurrency, formatDate, getCurrentDate } from '@/utils/format';
import { useAccountStore } from '@/stores/account-store';
import { useSettingsStore } from '@/stores/settings-store';
import { BalanceSnapshotRepository } from '@/db/balance-snapshot-repository';
import {
  AccountType,
  AccountTypeLabels,
  LIABILITY_ACCOUNT_TYPES,
  RESTRICTED_ACCOUNT_TYPES,
} from '@/types/enums';
import { ACCOUNT_TYPE_ICONS, resolveAccountIcon } from '@/theme/icons';
import { bucketAccounts, type LiquidityBucket } from '@/engine/accountBuckets';
import { IconPickerSheet } from '@/components/IconPickerSheet';
import { DatePickerField } from '@/components/DatePickerField';
import type { Account } from '@/types/models';
import { AppCard } from '@/components/ui/Card';
import { AppButton } from '@/components/ui/Button';
import { AppTextInput } from '@/components/ui/TextInput';
import { AppChip } from '@/components/ui/Chip';
import { AppBottomSheet } from '@/components/ui/BottomSheet';
import { Icon } from '@/components/ui/Icon';
import { ConfirmSheet } from '@/components/ConfirmSheet';
import { isValidNumber } from '@/utils/validation';
import { useToast } from '@/hooks/useToast';
import { FORTUNES } from '@/utils/fortunes';
import { spacing, radius } from '@/theme/tokens';
import { AccountExplainer } from '@/components/AccountExplainer';

/** 账户列表的分组顺序与标题 */
const ACCOUNT_SECTIONS: { bucket: LiquidityBucket; title: string }[] = [
  { bucket: 'available', title: '可用' },
  { bucket: 'restricted', title: '受限' },
  { bucket: 'liability', title: '负债' },
];

export default function AccountsScreen() {
  const theme = useAppTheme();
  const router = useRouter();
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
  }, [loadAccounts]);

  const onRefresh = () => {
    setRefreshing(true);
    const fortune = FORTUNES[Math.floor(Math.random() * FORTUNES.length)];
    toast.show(fortune, 'success', 2500);
    loadAccounts();
    setTimeout(() => setRefreshing(false), 400);
  };

  const totalBalance = accounts.reduce((sum, a) => sum + (balances.get(a.id) ?? 0), 0);

  // 按流动性分三组。分组口径与总览页、净资产计算共用 accountBuckets.ts，
  // 三处不会走偏：「受限」= 公积金（永久）+ 未到期定期（临时）。
  const today = getCurrentDate();
  const buckets = bucketAccounts(accounts, today);
  const sections = ACCOUNT_SECTIONS
    .map(({ bucket, title }) => ({
      bucket,
      title,
      data: buckets[bucket],
      subtotal: buckets[bucket].reduce((sum, a) => sum + (balances.get(a.id) ?? 0), 0),
    }))
    .filter(section => section.data.length > 0);

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

        {/* 固定收支 / 可用资金 —— 都是「钱」的事，收进概览卡里，不单独占两行列表 */}
        <View style={styles.heroEntryRow}>
          <TouchableOpacity
            onPress={() => router.push('/cash-flow')}
            activeOpacity={0.7}
            style={styles.heroEntryBtn}
          >
            <Icon name="Wallet" size={14} color={theme.colors.onPrimary} />
            <Text style={[styles.heroEntryText, { color: theme.colors.onPrimary }]}>固定收支</Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => router.push('/usable-assets')}
            activeOpacity={0.7}
            style={styles.heroEntryBtn}
          >
            <Icon name="Calendar" size={14} color={theme.colors.onPrimary} />
            <Text style={[styles.heroEntryText, { color: theme.colors.onPrimary }]}>可用资金</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Account List — 按流动性分组（可用 / 受限 / 负债），空组不渲染 */}
      <SectionList
        sections={sections}
        keyExtractor={item => item.id}
        contentContainerStyle={[styles.list, { paddingBottom: 24 }]}
        stickySectionHeadersEnabled={false}
        renderSectionHeader={({ section }) => (
          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionTitle, { color: theme.colors.onSurfaceVariant }]}>
              {section.title}
            </Text>
            <Text style={[styles.sectionSubtotal, { color: theme.colors.onSurface }]}>
              {formatCurrency(section.subtotal, currencySymbol)}
            </Text>
          </View>
        )}
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
                name={resolveAccountIcon(item.icon, item.type)}
                size={28}
                color="primary"
              />
              <View style={styles.cardInfo}>
                <Text style={[styles.cardName, { color: theme.colors.onSurface }]}>
                  {item.name}
                </Text>
                <View style={styles.cardTypeRow}>
                  <Text style={[styles.cardType, { color: theme.colors.onSurfaceVariant }]}>
                    {AccountTypeLabels[item.type]}
                  </Text>
                  {item.maturityDate ? (
                    item.maturityDate > today ? (
                      // 未到期：显式 badge，让用户知道这笔钱为什么不在「可用」里
                      <View style={[styles.maturityBadge, { backgroundColor: theme.colors.surfaceVariant }]}>
                        <Icon name="Lock" size={10} color="onSurfaceVariant" />
                        <Text style={[styles.maturityBadgeText, { color: theme.colors.onSurfaceVariant }]}>
                          定期 · 未到期 {formatDate(item.maturityDate)}
                        </Text>
                      </View>
                    ) : (
                      // 已到期：只留日期标记，badge 撤掉——它已经能用了
                      <Text style={[styles.cardType, { color: theme.colors.onSurfaceVariant }]}>
                        · {formatDate(item.maturityDate)} 已到期
                      </Text>
                    )
                  ) : null}
                </View>
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
        onAdd={async (name, type, initialBalance, icon, maturityDate) => {
          try {
            await addAccount(name, type, icon ?? null, initialBalance, maturityDate ?? null);
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
        onSave={async (id, name, type, icon, maturityDate) => {
          try {
            await editAccount(id, { name, type, icon: icon ?? null, maturityDate: maturityDate ?? null });
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

// ── 到期日字段（定期存款）──

/**
 * 可选的到期日输入。到期日之前这笔钱不计入「可用资金」，到期日当天及之后计入。
 * **只认本金**——不采集利率、不计算利息，App 里出现的每个数字都是用户亲手输入的。
 */
function MaturityDateField({ value, onChange }: {
  value: string | null;
  onChange: (date: string | null) => void;
}) {
  const theme = useAppTheme();
  return (
    <View>
      <DatePickerField
        label="到期日（定期存款才需要填）"
        value={value ?? ''}
        onChange={(date) => onChange(date)}
      />
      <Text style={[styles.maturityHint, { color: theme.colors.onSurfaceVariant }]}>
        到期日之前不算进「可用资金」。只记本金，不算利息。
      </Text>
      {value ? (
        <AppButton title="清除到期日" variant="text" onPress={() => onChange(null)} />
      ) : null}
    </View>
  );
}

// ── Add Account BottomSheet ──

function AddAccountSheet({ visible, onClose, onAdd }: {
  visible: boolean;
  onClose: () => void;
  onAdd: (
    name: string,
    type: AccountType,
    initialBalance?: number,
    icon?: string | null,
    maturityDate?: string | null
  ) => void;
}) {
  const theme = useAppTheme();
  const [name, setName] = useState('');
  const [type, setType] = useState<AccountType>(AccountType.WECHAT);
  const [initialBalance, setInitialBalance] = useState('');
  const [customIcon, setCustomIcon] = useState<string | null>(null);
  const [iconPickerVisible, setIconPickerVisible] = useState(false);
  const [maturityDate, setMaturityDate] = useState<string | null>(null);
  const types = Object.values(AccountType);

  // 到期日只对「一笔钱锁到某天」的账户有意义：负债账户和公积金（永久受限）不显示
  const showMaturityDate = !LIABILITY_ACCOUNT_TYPES.has(type) && !RESTRICTED_ACCOUNT_TYPES.has(type);

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
      {showMaturityDate && (
        <MaturityDateField value={maturityDate} onChange={setMaturityDate} />
      )}
      {/* Custom icon button */}
      <TouchableOpacity
        onPress={() => setIconPickerVisible(true)}
        style={[styles.iconButton, { backgroundColor: theme.colors.surfaceVariant }]}
      >
        <Icon name={resolveAccountIcon(customIcon, type)} size={20} color="primary" />
        <Text style={[styles.iconButtonLabel, { color: theme.colors.onSurface }]}>
          {customIcon ? customIcon : '自定义图标'}
        </Text>
        <Icon name="ChevronRight" size={16} color="onSurfaceVariant" />
      </TouchableOpacity>
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
              if (LIABILITY_ACCOUNT_TYPES.has(type) && balance > 0) {
                balance = -balance;
              }
            }
            onAdd(name.trim(), type, balance, customIcon, showMaturityDate ? maturityDate : null);
            setName('');
            setInitialBalance('');
            setCustomIcon(null);
            setMaturityDate(null);
          }}
          style={styles.sheetBtn}
        />
      </View>
      <IconPickerSheet
        visible={iconPickerVisible}
        onClose={() => setIconPickerVisible(false)}
        onConfirm={(iconName) => setCustomIcon(iconName)}
        currentIcon={customIcon}
      />
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

  async function loadHistory() {
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
  }

  // effect 必须写在 loadHistory 之后：react-hooks/immutability 按源码顺序检查，
  // 不认 function 声明的 hoisting，先引用会报「声明前访问」
  useEffect(() => {
    if (visible) loadHistory();
  }, [visible]);

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
  onSave: (
    id: string,
    name: string,
    type: AccountType,
    icon?: string | null,
    maturityDate?: string | null
  ) => void;
  onArchive: (account: Account) => void;
  onHardDelete: (account: Account) => void;
}) {
  const theme = useAppTheme();
  const [name, setName] = useState('');
  const [type, setType] = useState<AccountType>(AccountType.WECHAT);
  const [customIcon, setCustomIcon] = useState<string | null>(null);
  const [iconPickerVisible, setIconPickerVisible] = useState(false);
  const [maturityDate, setMaturityDate] = useState<string | null>(null);
  const types = Object.values(AccountType);

  useEffect(() => {
    if (account) {
      setName(account.name);
      setType(account.type);
      setCustomIcon(account.icon);
      setMaturityDate(account.maturityDate);
    }
  }, [account]);

  if (!account) return null;

  // 切到负债/公积金类型时收起到期日，避免存下一个语义上矛盾的字段
  const showMaturityDate = !LIABILITY_ACCOUNT_TYPES.has(type) && !RESTRICTED_ACCOUNT_TYPES.has(type);

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
      {showMaturityDate ? (
        <MaturityDateField value={maturityDate} onChange={setMaturityDate} />
      ) : null}
      {/* Custom icon button */}
      <TouchableOpacity
        onPress={() => setIconPickerVisible(true)}
        style={[styles.iconButton, { backgroundColor: theme.colors.surfaceVariant }]}
      >
        <Icon name={resolveAccountIcon(customIcon, type)} size={20} color="primary" />
        <Text style={[styles.iconButtonLabel, { color: theme.colors.onSurface }]}>
          {customIcon ? customIcon : '自定义图标'}
        </Text>
        <Icon name="ChevronRight" size={16} color="onSurfaceVariant" />
      </TouchableOpacity>
      <View style={styles.sheetActions}>
        <AppButton title="取消" variant="text" onPress={onClose} style={styles.sheetBtn} />
        <AppButton
          title="保存"
          variant="primary"
          disabled={!name.trim()}
          onPress={() =>
            onSave(account.id, name.trim(), type, customIcon, showMaturityDate ? maturityDate : null)
          }
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
      <IconPickerSheet
        visible={iconPickerVisible}
        onClose={() => setIconPickerVisible(false)}
        onConfirm={(iconName) => setCustomIcon(iconName)}
        currentIcon={customIcon}
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
          name={resolveAccountIcon(account.icon, account.type)}
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

  async function loadSnapshots(accountId: string) {
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
  }

  // 同上：必须写在 loadSnapshots 之后
  useEffect(() => {
    if (account) loadSnapshots(account.id);
  }, [account]);

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
  // 概览卡内的两个入口：半透明胶囊，不额外占列表行
  heroEntryRow: {
    flexDirection: 'row',
    alignSelf: 'stretch',
    gap: spacing.sm,
    marginTop: spacing.md,
  },
  heroEntryBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    paddingVertical: 9,
    borderRadius: radius.md,
    backgroundColor: 'rgba(255,255,255,0.18)',
  },
  heroEntryText: { fontSize: 13, fontWeight: '600' },
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
  // 流动性分组
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
    paddingTop: spacing.md,
    paddingBottom: spacing.xs,
  },
  sectionTitle: { fontSize: 13, fontWeight: '600', letterSpacing: 0.5 },
  sectionSubtotal: { fontSize: 13, fontWeight: '600' },
  // 定期存款到期日
  cardTypeRow: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 6 },
  maturityBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    borderRadius: radius.sm,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  maturityBadgeText: { fontSize: 11 },
  maturityHint: { fontSize: 12, lineHeight: 17, marginBottom: spacing.sm },
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
  iconButton: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 12, paddingVertical: 10, borderRadius: 8, marginBottom: 8 },
  iconButtonLabel: { flex: 1, fontSize: 14, fontWeight: '500' },
});
