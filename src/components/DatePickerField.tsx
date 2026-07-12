/**
 * WorthBase (家底) - Date Picker Field
 * Reusable date picker component wrapping @react-native-community/datetimepicker.
 * Redesigned with design system and Lucide icon.
 */

import { useState } from 'react';
import { View, Text, TouchableOpacity, Platform, StyleSheet } from 'react-native';
import DateTimePicker, { DateTimePickerEvent } from '@react-native-community/datetimepicker';
import { useTheme } from 'react-native-paper';
import { Calendar } from 'lucide-react-native';
import { radius } from '@/theme/tokens';

interface DatePickerFieldProps {
  value: string; // YYYY-MM-DD
  onChange: (date: string) => void;
  label?: string;
  minimumDate?: Date;
  maximumDate?: Date;
}

export function DatePickerField({ value, onChange, label, minimumDate, maximumDate }: DatePickerFieldProps) {
  const theme = useTheme();
  const [showPicker, setShowPicker] = useState(false);

  const currentDate = value ? new Date(value + 'T00:00:00') : new Date();

  const handleChange = (_event: DateTimePickerEvent, selectedDate?: Date) => {
    if (Platform.OS === 'android') {
      setShowPicker(false);
    }
    if (selectedDate) {
      const y = selectedDate.getFullYear();
      const m = String(selectedDate.getMonth() + 1).padStart(2, '0');
      const d = String(selectedDate.getDate()).padStart(2, '0');
      onChange(`${y}-${m}-${d}`);
    }
  };

  return (
    <View>
      {label ? (
        <Text style={[styles.label, { color: theme.colors.onSurfaceVariant }]}>{label}</Text>
      ) : null}
      <TouchableOpacity
        style={[styles.field, { borderColor: theme.colors.outline }]}
        onPress={() => setShowPicker(true)}
      >
        <Text style={[styles.value, { color: theme.colors.onSurface }]}>{value || '请选择日期'}</Text>
        <Calendar size={18} color={theme.colors.onSurfaceVariant} />
      </TouchableOpacity>
      {showPicker && (
        <DateTimePicker
          value={currentDate}
          mode="date"
          display={Platform.OS === 'ios' ? 'spinner' : 'default'}
          onChange={handleChange}
          minimumDate={minimumDate}
          maximumDate={maximumDate}
          locale="zh-CN"
        />
      )}
      {showPicker && Platform.OS === 'ios' && (
        <TouchableOpacity style={styles.iosDone} onPress={() => setShowPicker(false)}>
          <Text style={[styles.iosDoneText, { color: theme.colors.primary }]}>完成</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  label: {
    fontSize: 14,
    fontWeight: '500',
    marginBottom: 8,
    marginTop: 12,
  },
  field: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: radius.sm,
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginBottom: 8,
  },
  value: {
    fontSize: 16,
  },
  iosDone: {
    alignSelf: 'flex-end',
    paddingVertical: 8,
    paddingHorizontal: 16,
  },
  iosDoneText: {
    fontSize: 16,
    fontWeight: '500',
  },
});
