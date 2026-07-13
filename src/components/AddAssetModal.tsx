/**
 * WorthBase (家底) - Add Asset Modal (3-step form)
 * Step 1: Basic info (name, category, purchase date, purchase price)
 * Step 2: Holding cost settings (amortization method, valuation tracking)
 * Step 3: Recurring expenses & maintenance records
 * Redesigned with design system and shared components.
 */

import { useState, useEffect, useMemo } from 'react';
import {
  View, Text, StyleSheet, ScrollView, Alert, Switch, TouchableOpacity,
} from 'react-native';
import { useAppTheme } from '@/utils/format';
import { DatePickerField } from './DatePickerField';
import { useAssetStore } from '@/stores/asset-store';
import { RecurringExpenseRepository } from '@/db/recurring-expense-repository';
import { MaintenanceRepository } from '@/db/maintenance-repository';
import {
  AssetCategory, AssetCategoryLabels,
  AmortizationType, AmortizationTypeLabels, AmortizationTypeDescriptions,
} from '@/types/enums';
import { ASSET_CATEGORY_ICONS } from '@/theme/icons';
import type { Asset, RecurringExpense, MaintenanceRecord } from '@/types/models';
import { getCurrentDate } from '@/utils/format';
import { isValidPositiveNumber, isValidDate } from '@/utils/validation';
import { AppBottomSheet } from '@/components/ui/BottomSheet';
import { AppTextInput } from '@/components/ui/TextInput';
import { AppChip } from '@/components/ui/Chip';
import { AppButton } from '@/components/ui/Button';
import { Icon } from '@/components/ui/Icon';
import { radius } from '@/theme/tokens';
import { recommendAmortization } from '@/engine/AmortizationRecommender';

type DraftRecurring = Omit<RecurringExpense, 'id' | 'createdAt' | 'assetId'>;
type DraftMaintenance = Omit<MaintenanceRecord, 'id' | 'createdAt' | 'assetId'>;

/** Preset lifespan options for quick selection */
const LIFESPAN_PRESETS = [
  { label: '3年', months: 36 },
  { label: '5年', months: 60 },
  { label: '10年', months: 120 },
];

/** Maximum allowed lifespan in months (100 years) */
const MAX_LIFESPAN_MONTHS = 1200;

export function AddAssetModal({ visible, onClose, onSaved, editAsset }: {
  visible: boolean;
  onClose: () => void;
  onSaved?: () => void;
  editAsset?: Asset | null;
}) {
  const theme = useAppTheme();
  const { addAsset, editAsset: updateAsset } = useAssetStore();
  const [step, setStep] = useState(1);

  // Step 1 fields
  const [name, setName] = useState('');
  const [category, setCategory] = useState<AssetCategory>(AssetCategory.ELECTRONICS);
  const [purchaseDate, setPurchaseDate] = useState(getCurrentDate());
  const [purchasePrice, setPurchasePrice] = useState('');

  // Step 2 fields
  const [amortizationType, setAmortizationType] = useState<AmortizationType>(AmortizationType.SIMPLE_LINEAR);
  const [expectedLifespan, setExpectedLifespan] = useState('');
  const [residualValue, setResidualValue] = useState('');
  const [valuationTracking, setValuationTracking] = useState(false);
  const [currentValuation, setCurrentValuation] = useState('');

  // Step 3 fields
  const [recurringExpenses, setRecurringExpenses] = useState<DraftRecurring[]>([]);
  const [maintenanceRecords, setMaintenanceRecords] = useState<DraftMaintenance[]>([]);
  const [recurringName, setRecurringName] = useState('');
  const [recurringAmount, setRecurringAmount] = useState('');
  const [maintenanceName, setMaintenanceName] = useState('');
  const [maintenanceAmount, setMaintenanceAmount] = useState('');
  const [maintenanceDate, setMaintenanceDate] = useState(getCurrentDate());
  const [maintenanceAmortize, setMaintenanceAmortize] = useState(true);

  // Recommendation tracking — whether user has manually overridden the auto-recommendation
  const [userModifiedAmortizationType, setUserModifiedAmortizationType] = useState(false);
  const [userModifiedLifespan, setUserModifiedLifespan] = useState(false);
  const [lifespanMode, setLifespanMode] = useState<'preset' | 'custom'>('preset');
  const [lifespanYears, setLifespanYears] = useState('');

  const recommendation = useMemo(
    () => recommendAmortization(category),
    [category]
  );

  // Apply recommendation when entering Step 2 (only for new assets, not editing)
  useEffect(() => {
    if (step === 2 && !editAsset) {
      if (!userModifiedAmortizationType) {
        setAmortizationType(recommendation.type);
      }
      if (!userModifiedLifespan) {
        if (recommendation.defaultLifespanMonths) {
          const monthsStr = String(recommendation.defaultLifespanMonths);
          setExpectedLifespan(monthsStr);
          const matchedPreset = LIFESPAN_PRESETS.find(p => p.months === recommendation.defaultLifespanMonths);
          if (matchedPreset) {
            setLifespanMode('preset');
            setLifespanYears('');
          } else {
            setLifespanMode('custom');
            const yrs = recommendation.defaultLifespanMonths / 12;
            setLifespanYears(yrs % 1 === 0 ? String(yrs) : yrs.toFixed(1));
          }
        } else {
          setExpectedLifespan('');
          setLifespanMode('preset');
          setLifespanYears('');
        }
      }
    }
  }, [step, editAsset, userModifiedAmortizationType, userModifiedLifespan, recommendation]);

  const handleCategoryChange = (cat: AssetCategory) => {
    setCategory(cat);
    if (!editAsset) {
      setUserModifiedAmortizationType(false);
      setUserModifiedLifespan(false);
      setLifespanMode('preset');
      setLifespanYears('');
    }
  };

  const resetForm = () => {
    setStep(1); setName(''); setCategory(AssetCategory.ELECTRONICS);
    setPurchaseDate(getCurrentDate()); setPurchasePrice('');
    setAmortizationType(AmortizationType.SIMPLE_LINEAR);
    setExpectedLifespan(''); setResidualValue('');
    setValuationTracking(false); setCurrentValuation('');
    setRecurringExpenses([]); setMaintenanceRecords([]);
    setRecurringName(''); setRecurringAmount('');
    setMaintenanceName(''); setMaintenanceAmount('');
    setMaintenanceDate(getCurrentDate()); setMaintenanceAmortize(true);
    setUserModifiedAmortizationType(false); setUserModifiedLifespan(false);
    setLifespanMode('preset'); setLifespanYears('');
  };

  // Prefill when editing
  useEffect(() => {
    if (editAsset) {
      setStep(1);
      setName(editAsset.name);
      setCategory(editAsset.category);
      setPurchaseDate(editAsset.purchaseDate);
      setPurchasePrice(String(editAsset.purchasePrice));
      setAmortizationType(editAsset.amortizationType);
      const lifespanStr = editAsset.expectedLifespanMonths ? String(editAsset.expectedLifespanMonths) : '';
      setExpectedLifespan(lifespanStr);
      if (lifespanStr) {
        const months = parseInt(lifespanStr);
        const matchedPreset = LIFESPAN_PRESETS.find(p => p.months === months);
        if (matchedPreset) {
          setLifespanMode('preset');
          setLifespanYears('');
        } else {
          setLifespanMode('custom');
          const yrs = months / 12;
          setLifespanYears(yrs % 1 === 0 ? String(yrs) : yrs.toFixed(1));
        }
      } else {
        setLifespanMode('preset');
        setLifespanYears('');
      }
      setResidualValue(editAsset.residualValue ? String(editAsset.residualValue) : '');
      setValuationTracking(editAsset.valuationTracking);
      setCurrentValuation(editAsset.currentValuation ? String(editAsset.currentValuation) : '');
    }
  }, [editAsset, visible]);

  const priceValid = !purchasePrice.trim() || isValidPositiveNumber(purchasePrice);
  const dateValid = isValidDate(purchaseDate);
  const canProceedStep1 = name.trim() && purchasePrice.trim() && isValidPositiveNumber(purchasePrice) && dateValid;
  const lifespanValid = !!(expectedLifespan.trim() && parseInt(expectedLifespan) > 0 && parseInt(expectedLifespan) <= MAX_LIFESPAN_MONTHS);
  const canProceedStep2 = (amortizationType !== AmortizationType.EXPECTED_LIFESPAN || lifespanValid)
    && (amortizationType !== AmortizationType.RESIDUAL_VALUE || (lifespanValid && residualValue.trim() && isValidPositiveNumber(residualValue)));
  const lifespanYearsError = lifespanYears.trim() && parseFloat(lifespanYears) > 100 ? '不能超过100年（1200个月）' : undefined;

  const handleAddRecurring = () => {
    if (!recurringName.trim()) { Alert.alert('提示', '请输入支出名称'); return; }
    if (!recurringAmount.trim() || !isValidPositiveNumber(recurringAmount)) { Alert.alert('提示', '请输入有效的金额（大于 0）'); return; }
    setRecurringExpenses([...recurringExpenses, {
      name: recurringName.trim(), amount: parseFloat(recurringAmount),
      effectiveFrom: purchaseDate.substring(0, 7), effectiveTo: null,
    }]);
    setRecurringName(''); setRecurringAmount('');
  };

  const handleAddMaintenance = () => {
    if (!maintenanceName.trim()) { Alert.alert('提示', '请输入维护名称'); return; }
    if (!maintenanceAmount.trim() || !isValidPositiveNumber(maintenanceAmount)) { Alert.alert('提示', '请输入有效的金额（大于 0）'); return; }
    setMaintenanceRecords([...maintenanceRecords, {
      name: maintenanceName.trim(), amount: parseFloat(maintenanceAmount),
      date: maintenanceDate, amortize: maintenanceAmortize,
    }]);
    setMaintenanceName(''); setMaintenanceAmount('');
  };

  const handleSave = async () => {
    try {
      const assetData = {
        name: name.trim(),
        category,
        purchaseDate,
        purchasePrice: parseFloat(purchasePrice) || 0,
        amortizationType,
        expectedLifespanMonths: expectedLifespan ? parseInt(expectedLifespan) : null,
        residualValue: residualValue ? parseFloat(residualValue) : null,
        valuationTracking,
        currentValuation: currentValuation ? parseFloat(currentValuation) : (valuationTracking ? parseFloat(purchasePrice) || null : null),
        imagePath: null,
        sellDate: null,
        sellPrice: null,
      };

      let savedAsset: Asset;
      if (editAsset) {
        await updateAsset(editAsset.id, assetData);
        savedAsset = { ...editAsset, ...assetData };
        const oldRecurring = await RecurringExpenseRepository.getByAsset(editAsset.id);
        const oldMaintenance = await MaintenanceRepository.getByAsset(editAsset.id);
        await Promise.all([
          ...oldRecurring.map(r => RecurringExpenseRepository.delete(r.id)),
          ...oldMaintenance.map(m => MaintenanceRepository.delete(m.id)),
        ]);
      } else {
        savedAsset = await addAsset(assetData);
      }

      for (const re of recurringExpenses) {
        await RecurringExpenseRepository.create({
          assetId: savedAsset.id, name: re.name, amount: re.amount,
          effectiveFrom: re.effectiveFrom, effectiveTo: re.effectiveTo,
        });
      }

      for (const m of maintenanceRecords) {
        await MaintenanceRepository.create({
          assetId: savedAsset.id, name: m.name, amount: m.amount,
          date: m.date, amortize: m.amortize,
        });
      }

      resetForm();
      onSaved?.();
      onClose();
    } catch (err) {
      Alert.alert('保存失败', (err as Error).message);
    }
  };

  const categories = Object.values(AssetCategory);
  const amortTypes = Object.values(AmortizationType);

  return (
    <AppBottomSheet visible={visible} onClose={() => { resetForm(); onClose(); }} snapPoints={['80%', '95%']}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={[styles.title, { color: theme.colors.onSurface }]}>
          {editAsset ? '编辑资产' : '添加资产'}
        </Text>
        <Text style={[styles.stepIndicator, { color: theme.colors.tertiary }]}>步骤 {step}/3</Text>
      </View>

      {/* Step indicator bar */}
      <View style={styles.stepBar}>
        {[1, 2, 3].map(s => (
          <View key={s} style={[styles.stepDot, { backgroundColor: s <= step ? theme.colors.primary : theme.colors.outline }]} />
        ))}
      </View>

      <ScrollView showsVerticalScrollIndicator={false}>
        {step === 1 && (
          <>
            <AppTextInput bottomSheet
              label="资产名称"
              value={name}
              onChangeText={setName}
              placeholder="如：iPhone 15 Pro"
            />

            <Text style={[styles.label, { color: theme.colors.onSurfaceVariant }]}>分类</Text>
            <View style={styles.grid}>
              {categories.map(cat => (
                <AppChip
                  key={cat}
                  label={AssetCategoryLabels[cat]}
                  selected={category === cat}
                  onPress={() => handleCategoryChange(cat)}
                  icon={ASSET_CATEGORY_ICONS[cat]}
                />
              ))}
            </View>

            <DatePickerField label="购入日期" value={purchaseDate} onChange={setPurchaseDate} />
            {!dateValid && purchaseDate.length > 0 ? (
              <Text style={[styles.errorHint, { color: theme.colors.error }]}>日期格式无效</Text>
            ) : null}

            <AppTextInput bottomSheet
              label="购入价格"
              value={purchasePrice}
              onChangeText={setPurchasePrice}
              placeholder="0.00"
              keyboardType="decimal-pad"
              error={!priceValid ? '价格必须大于 0' : undefined}
            />
          </>
        )}

        {step === 2 && (
          <>
            <Text style={[styles.label, { color: theme.colors.onSurfaceVariant }]}>分摊方式</Text>
            {recommendation.hint ? (
              <Text style={[styles.hintText, { color: theme.colors.tertiary }]}>{recommendation.hint}</Text>
            ) : null}
            {amortTypes.map(at => (
              <TouchableOpacity
                key={at}
                style={[
                  styles.radioRow,
                  { borderBottomColor: theme.colors.outline },
                  amortizationType === at && { backgroundColor: theme.colors.primaryContainer + '30' },
                ]}
                onPress={() => { setUserModifiedAmortizationType(true); setAmortizationType(at); }}
              >
                <View
                  style={[
                    styles.radio,
                    { borderColor: amortizationType === at ? theme.colors.primary : theme.colors.outline },
                  ]}
                >
                  {amortizationType === at && <View style={[styles.radioDot, { backgroundColor: theme.colors.primary }]} />}
                </View>
                <View style={{ flex: 1, paddingVertical: 12 }}>
                  <View style={styles.radioLabelRow}>
                    <Text style={[styles.radioLabel, { color: theme.colors.onSurface }]}>{AmortizationTypeLabels[at]}</Text>
                    {at === recommendation.type ? (
                      <View style={[styles.recommendBadge, { backgroundColor: theme.colors.primaryContainer }]}>
                        <Text style={[styles.recommendBadgeText, { color: theme.colors.onPrimaryContainer }]}>推荐</Text>
                      </View>
                    ) : null}
                  </View>
                  <Text style={[styles.radioDesc, { color: theme.colors.tertiary }]}>{AmortizationTypeDescriptions[at]}</Text>
                </View>
              </TouchableOpacity>
            ))}

            {(amortizationType === AmortizationType.EXPECTED_LIFESPAN || amortizationType === AmortizationType.RESIDUAL_VALUE) && (
              <View>
                <Text style={[styles.label, { color: theme.colors.onSurfaceVariant }]}>预期使用年限</Text>
                <View style={styles.grid}>
                  {LIFESPAN_PRESETS.map(preset => (
                    <AppChip
                      key={preset.label}
                      label={preset.label}
                      selected={lifespanMode === 'preset' && expectedLifespan === String(preset.months)}
                      onPress={() => {
                        setUserModifiedLifespan(true);
                        setLifespanMode('preset');
                        setExpectedLifespan(String(preset.months));
                        setLifespanYears('');
                      }}
                    />
                  ))}
                  <AppChip
                    label="自定义"
                    selected={lifespanMode === 'custom'}
                    onPress={() => {
                      setUserModifiedLifespan(true);
                      setLifespanMode('custom');
                      if (expectedLifespan && parseInt(expectedLifespan) > 0) {
                        const months = parseInt(expectedLifespan);
                        const yrs = months / 12;
                        setLifespanYears(yrs % 1 === 0 ? String(yrs) : yrs.toFixed(1));
                      }
                    }}
                  />
                </View>
                {lifespanMode === 'custom' ? (
                  <View>
                    <AppTextInput bottomSheet
                      label="预期使用年数"
                      value={lifespanYears}
                      onChangeText={(text) => {
                        setUserModifiedLifespan(true);
                        setLifespanYears(text);
                        const years = parseFloat(text);
                        if (!isNaN(years) && years > 0) {
                          const months = Math.round(years * 12);
                          setExpectedLifespan(String(months));
                        } else if (text.trim() === '') {
                          setExpectedLifespan('');
                        }
                      }}
                      placeholder="如：30"
                      keyboardType="decimal-pad"
                      error={lifespanYearsError}
                    />
                    {lifespanYears.trim() && !isNaN(parseFloat(lifespanYears)) && parseFloat(lifespanYears) > 0 && parseFloat(lifespanYears) <= 100 ? (
                      <Text style={[styles.hintText, { color: theme.colors.tertiary }]}>
                        = {Math.round(parseFloat(lifespanYears) * 12)} 个月
                      </Text>
                    ) : null}
                  </View>
                ) : null}
              </View>
            )}

            {amortizationType === AmortizationType.RESIDUAL_VALUE && (
              <AppTextInput bottomSheet
                label="预估残值"
                value={residualValue}
                onChangeText={setResidualValue}
                placeholder="0.00"
                keyboardType="decimal-pad"
              />
            )}

            <View style={styles.switchRow}>
              <Text style={[styles.switchLabel, { color: theme.colors.onSurface }]}>估值追踪</Text>
              <Switch
                value={valuationTracking}
                onValueChange={setValuationTracking}
                trackColor={{ false: theme.colors.outline, true: theme.colors.primary }}
              />
            </View>

            {valuationTracking && (
              <AppTextInput bottomSheet
                label="当前估值"
                value={currentValuation}
                onChangeText={setCurrentValuation}
                placeholder="留空则使用购入价"
                keyboardType="decimal-pad"
              />
            )}
          </>
        )}

        {step === 3 && (
          <>
            <Text style={[styles.label, { color: theme.colors.onSurfaceVariant }]}>经常性支出（可选）</Text>
            {recurringExpenses.map((re, i) => (
              <View key={i} style={[styles.draftRow, { borderBottomColor: theme.colors.outline }]}>
                <Text style={[styles.draftName, { color: theme.colors.onSurface }]}>{re.name}</Text>
                <Text style={[styles.draftAmount, { color: theme.colors.onSurfaceVariant }]}>{re.amount}/月</Text>
                <AppButton title="✕" variant="text" onPress={() => setRecurringExpenses(recurringExpenses.filter((_, idx) => idx !== i))} compact />
              </View>
            ))}
            <View style={styles.inlineAdd}>
              <AppTextInput bottomSheet label="名称(如话费)" value={recurringName} onChangeText={setRecurringName} style={{ flex: 2 }} />
              <AppTextInput bottomSheet label="金额" value={recurringAmount} onChangeText={setRecurringAmount} keyboardType="decimal-pad" style={{ flex: 1, marginLeft: 8 }} />
            </View>
            <AppButton title="添加" variant="secondary" onPress={handleAddRecurring} compact style={{ alignSelf: 'flex-start', marginBottom: 8 }} />

            <Text style={[styles.label, { color: theme.colors.onSurfaceVariant, marginTop: 16 }]}>一次性维护（可选）</Text>
            {maintenanceRecords.map((m, i) => (
              <View key={i} style={[styles.draftRow, { borderBottomColor: theme.colors.outline }]}>
                <Text style={[styles.draftName, { color: theme.colors.onSurface }]}>{m.name}</Text>
                <Text style={[styles.draftAmount, { color: theme.colors.onSurfaceVariant }]}>{m.amount}{m.amortize ? ' (分摊)' : ''}</Text>
                <AppButton title="✕" variant="text" onPress={() => setMaintenanceRecords(maintenanceRecords.filter((_, idx) => idx !== i))} compact />
              </View>
            ))}
            <View style={styles.inlineAdd}>
              <AppTextInput bottomSheet label="名称(如换屏)" value={maintenanceName} onChangeText={setMaintenanceName} style={{ flex: 2 }} />
              <AppTextInput bottomSheet label="金额" value={maintenanceAmount} onChangeText={setMaintenanceAmount} keyboardType="decimal-pad" style={{ flex: 1, marginLeft: 8 }} />
            </View>
            <DatePickerField label="维护日期" value={maintenanceDate} onChange={setMaintenanceDate} />
            <View style={styles.switchRow}>
              <Text style={[styles.switchLabel, { color: theme.colors.onSurface }]}>纳入分摊</Text>
              <Switch
                value={maintenanceAmortize}
                onValueChange={setMaintenanceAmortize}
                trackColor={{ false: theme.colors.outline, true: theme.colors.primary }}
              />
            </View>
            <AppButton title="添加" variant="secondary" onPress={handleAddMaintenance} compact style={{ alignSelf: 'flex-start' }} />
          </>
        )}
      </ScrollView>

      {/* Footer buttons */}
      <View style={styles.footer}>
        {step > 1 && (
          <AppButton title="上一步" variant="text" onPress={() => setStep(step - 1)} style={{ flex: 1 }} />
        )}
        {step < 3 ? (
          <AppButton
            title="下一步"
            variant="primary"
            disabled={step === 1 && !canProceedStep1}
            onPress={() => setStep(step + 1)}
            style={{ flex: 1 }}
          />
        ) : (
          <AppButton
            title={editAsset ? '保存修改' : '创建资产'}
            variant="primary"
            onPress={handleSave}
            style={{ flex: 1 }}
          />
        )}
        <AppButton title="取消" variant="text" onPress={() => { resetForm(); onClose(); }} style={{ flex: 1 }} />
      </View>
    </AppBottomSheet>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  title: { fontSize: 20, fontWeight: '700' },
  stepIndicator: { fontSize: 14 },
  stepBar: { flexDirection: 'row', gap: 4, marginBottom: 16 },
  stepDot: { flex: 1, height: 3, borderRadius: 2 },
  label: { fontSize: 14, fontWeight: '500', marginBottom: 8, marginTop: 12 },
  hintText: { fontSize: 12, marginBottom: 8, marginTop: -4 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', marginBottom: 8 },
  radioRow: { flexDirection: 'row', alignItems: 'center', gap: 12, borderBottomWidth: StyleSheet.hairlineWidth },
  radio: { width: 20, height: 20, borderRadius: 10, borderWidth: 2, justifyContent: 'center', alignItems: 'center' },
  radioDot: { width: 10, height: 10, borderRadius: 5 },
  radioLabel: { fontSize: 15, fontWeight: '500' },
  radioLabelRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  recommendBadge: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 },
  recommendBadgeText: { fontSize: 10, fontWeight: '600' },
  radioDesc: { fontSize: 12, marginTop: 2 },
  switchRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 12 },
  switchLabel: { fontSize: 15 },
  draftRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 8, gap: 8, borderBottomWidth: StyleSheet.hairlineWidth },
  draftName: { flex: 1, fontSize: 14 },
  draftAmount: { fontSize: 14 },
  inlineAdd: { flexDirection: 'row', marginTop: 4 },
  footer: { flexDirection: 'row', gap: 12, paddingTop: 12, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: 'transparent' },
  errorHint: { fontSize: 12, marginBottom: 4, marginTop: -4 },
});
