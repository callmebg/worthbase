/**
 * WorthBase Shared ListItem Component
 * Wraps Paper List.Item with Lucide icon support and flexible right element.
 */

import React from 'react';
import { StyleSheet, View, Switch, Text as RNText } from 'react-native';
import { List } from 'react-native-paper';
import { useTheme } from 'react-native-paper';
import { Icon } from './Icon';

interface AppListItemProps {
  /** Title text */
  title: string;
  /** Description text (optional) */
  description?: string;
  /** Lucide icon name (left side) */
  icon?: string;
  /** Icon color (theme key or hex) */
  iconColor?: string;
  /** Press handler */
  onPress?: () => void;
  /** Right element type */
  rightElement?: 'chevron' | 'switch' | 'text' | 'custom';
  /** Switch value (when rightElement is 'switch') */
  switchValue?: boolean;
  /** Switch toggle handler */
  onSwitchChange?: (value: boolean) => void;
  /** Text for right side (when rightElement is 'text') */
  rightText?: string;
  /** Custom right element */
  customRight?: React.ReactNode;
  /** Disabled state */
  disabled?: boolean;
  /** Custom style */
  style?: object;
}

export function AppListItem({
  title,
  description,
  icon,
  iconColor,
  onPress,
  rightElement,
  switchValue,
  onSwitchChange,
  rightText,
  customRight,
  disabled = false,
  style,
}: AppListItemProps) {
  const theme = useTheme();

  const renderLeft = () => {
    if (!icon) return undefined;
    return () => (
      <View style={styles.iconContainer}>
        <Icon name={icon} size={22} color={iconColor || 'onSurfaceVariant'} />
      </View>
    );
  };

  const renderRight = () => {
    if (!rightElement) return undefined;
    return () => {
      switch (rightElement) {
        case 'chevron':
          return <Icon name="ChevronRight" size={18} color="onSurfaceVariant" />;
        case 'switch':
          return (
            <Switch
              value={switchValue}
              onValueChange={onSwitchChange}
              trackColor={{ false: theme.colors.outline, true: theme.colors.primary }}
              thumbColor={switchValue ? theme.colors.onPrimary : theme.colors.surface}
            />
          );
        case 'text':
          return (
            <RNText style={[styles.rightText, { color: theme.colors.onSurfaceVariant }]}>
              {rightText}
            </RNText>
          );
        case 'custom':
          return <>{customRight}</>;
        default:
          return null;
      }
    };
  };

  return (
    <List.Item
      title={title}
      description={description}
      onPress={disabled ? undefined : onPress}
      left={renderLeft()}
      right={renderRight()}
      disabled={disabled}
      style={[styles.item, style]}
      titleStyle={[styles.title, { color: disabled ? theme.colors.onSurfaceVariant : theme.colors.onSurface }]}
      descriptionStyle={styles.description}
    />
  );
}

const styles = StyleSheet.create({
  item: {
    paddingVertical: 8,
  },
  iconContainer: {
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
    width: 24,
  },
  title: {
    fontSize: 16,
  },
  description: {
    fontSize: 13,
  },
  rightText: {
    fontSize: 14,
    alignSelf: 'center',
  },
});
