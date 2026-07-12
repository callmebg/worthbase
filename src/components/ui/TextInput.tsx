/**
 * WorthBase Shared TextInput Component
 * Wraps Paper TextInput with outlined mode, error messages, and helper text.
 * Supports `bottomSheet` mode for proper keyboard handling inside BottomSheets.
 */

import React from 'react';
import { StyleSheet, View } from 'react-native';
import { TextInput as PaperTextInput, Text } from 'react-native-paper';
import { useTheme } from 'react-native-paper';
import { BottomSheetTextInput } from '@gorhom/bottom-sheet';
import { radius } from '@/theme/tokens';

interface AppTextInputProps {
  /** Input label */
  label: string;
  /** Current value */
  value: string;
  /** Change handler */
  onChangeText: (text: string) => void;
  /** Placeholder text */
  placeholder?: string;
  /** Keyboard type */
  keyboardType?: 'default' | 'numeric' | 'decimal-pad' | 'email-address' | 'number-pad';
  /** Error message — shows red border and message below */
  error?: string;
  /** Helper text shown below input (when no error) */
  helperText?: string;
  /** Secure text entry (password) */
  secureTextEntry?: boolean;
  /** Disable the input */
  disabled?: boolean;
  /** Custom style */
  style?: object;
  /** Right adornment (e.g., icon button) */
  right?: React.ReactNode;
  /** Auto focus */
  autoFocus?: boolean;
  /** Max length */
  maxLength?: number;
  /** Multiline */
  multiline?: boolean;
  /** Use BottomSheetTextInput for proper keyboard handling inside BottomSheets */
  bottomSheet?: boolean;
}

export function AppTextInput({
  label,
  value,
  onChangeText,
  placeholder,
  keyboardType = 'default',
  error,
  helperText,
  secureTextEntry = false,
  disabled = false,
  style,
  right,
  autoFocus = false,
  maxLength,
  multiline = false,
  bottomSheet = false,
}: AppTextInputProps) {
  const theme = useTheme();

  if (bottomSheet) {
    return (
      <View style={[styles.container, style]}>
        <Text style={[styles.bsLabel, { color: theme.colors.onSurfaceVariant }]}>{label}</Text>
        <BottomSheetTextInput
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder || label}
          placeholderTextColor={theme.colors.onSurfaceVariant}
          keyboardType={keyboardType}
          secureTextEntry={secureTextEntry}
          editable={!disabled}
          autoFocus={autoFocus}
          maxLength={maxLength}
          multiline={multiline}
          style={[
            styles.bsInput,
            {
              borderColor: error ? theme.colors.error : theme.colors.outline,
              color: theme.colors.onSurface,
              backgroundColor: theme.colors.surface,
            },
          ]}
        />
        {(error || helperText) && (
          <Text
            style={[
              styles.helperText,
              { color: error ? theme.colors.error : theme.colors.onSurfaceVariant },
            ]}
          >
            {error || helperText}
          </Text>
        )}
      </View>
    );
  }

  return (
    <View style={[styles.container, style]}>
      <PaperTextInput
        mode="outlined"
        label={label}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        keyboardType={keyboardType}
        secureTextEntry={secureTextEntry}
        disabled={disabled}
        error={!!error}
        autoFocus={autoFocus}
        maxLength={maxLength}
        multiline={multiline}
        right={right as never}
        style={styles.input}
        outlineStyle={styles.outline}
        outlineColor={theme.colors.outline}
        activeOutlineColor={theme.colors.primary}
      />
      {(error || helperText) && (
        <Text
          style={[
            styles.helperText,
            { color: error ? theme.colors.error : theme.colors.onSurfaceVariant },
          ]}
        >
          {error || helperText}
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 12,
  },
  input: {
    borderRadius: radius.md,
  },
  outline: {
    borderRadius: radius.md,
  },
  helperText: {
    fontSize: 12,
    marginTop: 4,
    marginLeft: 12,
  },
  bsLabel: {
    fontSize: 14,
    fontWeight: '500',
    marginBottom: 6,
    marginLeft: 4,
  },
  bsInput: {
    borderWidth: 1,
    borderRadius: radius.md,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
  },
});
