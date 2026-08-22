/**
 * WorthBase Icon Picker Sheet
 * Reusable icon selection component using BottomSheet.
 * Provides search, category browsing, and a 4-column icon grid.
 */

import { useState, useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useTheme } from 'react-native-paper';
import { AppBottomSheet } from '@/components/ui/BottomSheet';
import { AppTextInput } from '@/components/ui/TextInput';
import { AppButton } from '@/components/ui/Button';
import { Icon } from '@/components/ui/Icon';
import { ALL_ICON_NAMES } from '@/components/ui/Icon';
import { ICON_CATEGORIES } from '@/theme/icons';
import { radius } from '@/theme/tokens';

interface IconPickerSheetProps {
  visible: boolean;
  onClose: () => void;
  onConfirm: (iconName: string | null) => void;
  /** Currently selected icon name (null = default) */
  currentIcon: string | null;
  /** Label for the "use default" option */
  defaultLabel?: string;
}

const GRID_COLUMNS = 4;
const ICON_SIZE = 24;

export function IconPickerSheet({
  visible,
  onClose,
  onConfirm,
  currentIcon,
  defaultLabel = '使用默认图标',
}: IconPickerSheetProps) {
  const theme = useTheme();
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('popular');
  const [selectedIcon, setSelectedIcon] = useState<string | null>(currentIcon);

  // Filter icons by search and category
  const filteredIcons = useMemo(() => {
    let icons: string[];

    if (search.trim()) {
      // Search across all icons (case-insensitive)
      const query = search.toLowerCase();
      icons = ALL_ICON_NAMES.filter(name => name.toLowerCase().includes(query));
    } else if (selectedCategory === 'all') {
      // Show all icons
      icons = ALL_ICON_NAMES;
    } else {
      // Filter by selected category
      const category = ICON_CATEGORIES.find(c => c.key === selectedCategory);
      if (category) {
        icons = category.icons;
      } else {
        icons = ALL_ICON_NAMES;
      }
    }

    return icons;
  }, [search, selectedCategory]);

  // Current preview: selected icon or placeholder
  const previewIcon = selectedIcon || currentIcon;

  const handleConfirm = () => {
    onConfirm(selectedIcon);
    onClose();
  };

  const handleReset = () => {
    setSelectedIcon(null);
  };

  // Sync selectedIcon when currentIcon changes
  useMemo(() => {
    setSelectedIcon(currentIcon);
  }, [currentIcon]);

  return (
    <AppBottomSheet
      visible={visible}
      onClose={onClose}
      snapPoints={['90%']}
    >
      {/* Header with preview */}
      <View style={styles.header}>
        <View style={[styles.previewBox, { backgroundColor: theme.colors.surfaceVariant }]}>
          {previewIcon ? (
            <Icon name={previewIcon} size={28} color="primary" />
          ) : (
            <View style={styles.previewPlaceholder} />
          )}
        </View>
        <View style={styles.previewInfo}>
          <Text style={[styles.previewLabel, { color: theme.colors.onSurfaceVariant }]}>
            当前选择
          </Text>
          <Text style={[styles.previewName, { color: theme.colors.onSurface }]}>
            {previewIcon || '默认图标'}
          </Text>
        </View>
      </View>

      {/* Search */}
      <AppTextInput
        bottomSheet
        label="搜索图标"
        value={search}
        onChangeText={setSearch}
        placeholder="输入英文名..."
        style={styles.search}
      />

      {/* Category chips — flexWrap two-row layout */}
      <View style={styles.categoryRow}>
        {/* "全部" chip */}
        {(() => {
          const isAllSelected = selectedCategory === 'all' && !search.trim();
          return (
            <TouchableOpacity
              onPress={() => { setSelectedCategory('all'); setSearch(''); }}
              style={[
                styles.categoryChip,
                {
                  backgroundColor: isAllSelected ? theme.colors.primary : theme.colors.surfaceVariant,
                  borderColor: isAllSelected ? theme.colors.primary : theme.colors.outline,
                },
              ]}
            >
              <Text
                style={[
                  styles.categoryLabel,
                  { color: isAllSelected ? theme.colors.onPrimary : theme.colors.onSurface },
                ]}
              >
                全部 ({ALL_ICON_NAMES.length})
              </Text>
            </TouchableOpacity>
          );
        })()}
        {ICON_CATEGORIES.map(cat => {
          const isSelected = selectedCategory === cat.key && !search.trim();
          return (
            <TouchableOpacity
              key={cat.key}
              onPress={() => { setSelectedCategory(cat.key); setSearch(''); }}
              style={[
                styles.categoryChip,
                {
                  backgroundColor: isSelected ? theme.colors.primary : theme.colors.surfaceVariant,
                  borderColor: isSelected ? theme.colors.primary : theme.colors.outline,
                },
              ]}
            >
              <Text
                style={[
                  styles.categoryLabel,
                  { color: isSelected ? theme.colors.onPrimary : theme.colors.onSurface },
                ]}
              >
                {cat.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* "Use default" option */}
      <TouchableOpacity
        onPress={handleReset}
        style={[
          styles.defaultOption,
          {
            backgroundColor: selectedIcon === null
              ? theme.colors.primaryContainer
              : theme.colors.surfaceVariant,
            borderColor: selectedIcon === null
              ? theme.colors.primary
              : 'transparent',
          },
        ]}
      >
        <Icon name="RotateCcw" size={20} color={selectedIcon === null ? 'primary' : 'onSurfaceVariant'} />
        <Text
          style={[
            styles.defaultLabel,
            { color: selectedIcon === null ? theme.colors.primary : theme.colors.onSurfaceVariant },
          ]}
        >
          {defaultLabel}
        </Text>
      </TouchableOpacity>

      {/* Icon grid */}
      <View style={styles.grid}>
        {filteredIcons.map(name => {
          const isSelected = selectedIcon === name;
          return (
            <TouchableOpacity
              key={name}
              onPress={() => setSelectedIcon(name)}
              style={[
                styles.iconCell,
                {
                  backgroundColor: isSelected ? theme.colors.primaryContainer : 'transparent',
                  borderColor: isSelected ? theme.colors.primary : 'transparent',
                },
              ]}
            >
              <Icon
                name={name}
                size={ICON_SIZE}
                color={isSelected ? 'primary' : 'onSurface'}
              />
            </TouchableOpacity>
          );
        })}
        {filteredIcons.length === 0 && (
          <Text style={[styles.emptyText, { color: theme.colors.onSurfaceVariant }]}>
            未找到匹配的图标
          </Text>
        )}
      </View>

      {/* Footer buttons */}
      <View style={styles.footer}>
        <AppButton title="取消" variant="text" onPress={onClose} style={{ flex: 1 }} />
        <AppButton title="确认" variant="primary" onPress={handleConfirm} style={{ flex: 1 }} />
      </View>
    </AppBottomSheet>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 12,
  },
  previewBox: {
    width: 48,
    height: 48,
    borderRadius: radius.md,
    justifyContent: 'center',
    alignItems: 'center',
  },
  previewPlaceholder: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#ccc',
  },
  previewInfo: {
    flex: 1,
  },
  previewLabel: {
    fontSize: 12,
  },
  previewName: {
    fontSize: 16,
    fontWeight: '600',
  },
  search: {
    marginBottom: 8,
  },
  categoryRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: 12,
    paddingHorizontal: 2,
  },
  categoryChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: radius.sm,
    borderWidth: 1,
  },
  categoryLabel: {
    fontSize: 13,
    fontWeight: '500',
  },
  defaultOption: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: radius.sm,
    borderWidth: 1,
    marginBottom: 12,
  },
  defaultLabel: {
    fontSize: 14,
    fontWeight: '500',
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 4,
    marginBottom: 16,
  },
  iconCell: {
    width: `${100 / GRID_COLUMNS - 1}%`,
    aspectRatio: 1,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: radius.sm,
    borderWidth: 2,
  },
  emptyText: {
    fontSize: 14,
    textAlign: 'center',
    width: '100%',
    paddingVertical: 32,
  },
  footer: {
    flexDirection: 'row',
    gap: 12,
    paddingTop: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: 'transparent',
  },
});
