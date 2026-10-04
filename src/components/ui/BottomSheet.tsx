/**
 * WorthBase Shared BottomSheet Component
 * Wraps @gorhom/react-native-bottom-sheet with unified configuration.
 */

import React, { useCallback, useRef, useMemo, forwardRef, useImperativeHandle } from 'react';
import { StyleSheet, View } from 'react-native';
import BottomSheetBase, {
  BottomSheetBackdrop,
  BottomSheetScrollView,
  BottomSheetTextInput,
} from '@gorhom/bottom-sheet';
import type { BottomSheetBackdropProps } from '@gorhom/bottom-sheet';
import { useTheme } from 'react-native-paper';
import { radius } from '@/theme/tokens';

export interface AppBottomSheetRef {
  open: () => void;
  close: () => void;
}

interface AppBottomSheetProps {
  /** Snap points (e.g. ['50%', '90%']) */
  snapPoints?: (string | number)[];
  /** Whether the sheet is visible */
  visible: boolean;
  /** Called when sheet should close */
  onClose: () => void;
  /** Sheet content */
  children: React.ReactNode;
  /** Enable backdrop dismiss (default: true) */
  dismissOnBackdrop?: boolean;
  /** Title text (optional) */
  title?: string;
}

export const AppBottomSheet = forwardRef<AppBottomSheetRef, AppBottomSheetProps>(
  function AppBottomSheet(
    {
      snapPoints = ['50%', '90%'],
      visible,
      onClose,
      children,
      dismissOnBackdrop = true,
      title,
    },
    ref,
  ) {
    const theme = useTheme();
    const sheetRef = useRef<BottomSheetBase>(null);

    useImperativeHandle(ref, () => ({
      open: () => sheetRef.current?.expand(),
      close: () => sheetRef.current?.close(),
    }));

    const handleSheetChanges = useCallback(
      (index: number) => {
        if (index === -1) {
          onClose();
        }
      },
      [onClose],
    );

    // v5 的 backdropComponent 收到的是 BottomSheetBackdropProps（BottomSheetDefaultBackdropProps
    // 是它的超集，且未从包根导出）。多出来的 disappearsOnIndex / pressBehavior 均为可选，可直接展开。
    const renderBackdrop = useCallback(
      (props: BottomSheetBackdropProps) => (
        <BottomSheetBackdrop
          {...props}
          disappearsOnIndex={-1}
          pressBehavior={dismissOnBackdrop ? 'close' : 'none'}
        />
      ),
      [dismissOnBackdrop],
    );

    const memoSnapPoints = useMemo(() => snapPoints, [snapPoints]);

    if (!visible) return null;

    return (
      <BottomSheetBase
        ref={sheetRef}
        index={0}
        snapPoints={memoSnapPoints}
        onChange={handleSheetChanges}
        backdropComponent={renderBackdrop}
        enablePanDownToClose
        // @gorhom/bottom-sheet v5 没有 enableKeyboardHandling 这个 prop（v4 遗留），
        // 键盘行为统一由下面的 keyboardBehavior 控制。
        keyboardBehavior="interactive"
        style={styles.sheet}
        backgroundStyle={{
          backgroundColor: theme.colors.surface,
          borderRadius: radius.xl,
        }}
        handleIndicatorStyle={{
          backgroundColor: theme.colors.outlineVariant,
        }}
      >
        <BottomSheetScrollView
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
        >
          {title && (
            <View style={styles.titleContainer}>
              {/* Title would use Text component — kept simple here */}
            </View>
          )}
          {children}
        </BottomSheetScrollView>
      </BottomSheetBase>
    );
  },
);

// Re-export for convenience
export { BottomSheetTextInput };

const styles = StyleSheet.create({
  sheet: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
  },
  content: {
    paddingHorizontal: 20,
    paddingBottom: 32,
    paddingTop: 8,
  },
  titleContainer: {
    paddingBottom: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    marginBottom: 16,
  },
});
