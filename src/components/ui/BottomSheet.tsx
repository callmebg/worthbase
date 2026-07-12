/**
 * WorthBase Shared BottomSheet Component
 * Wraps @gorhom/react-native-bottom-sheet with unified configuration.
 */

import React, { useCallback, useRef, useMemo, forwardRef, useImperativeHandle } from 'react';
import { StyleSheet, View, Keyboard } from 'react-native';
import BottomSheetBase, {
  BottomSheetBackdrop,
  BottomSheetScrollView,
  BottomSheetTextInput,
} from '@gorhom/bottom-sheet';
import type { BottomSheetDefaultBackdropProps } from '@gorhom/bottom-sheet';
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
  /** Enable keyboard handling (default: true) */
  enableKeyboardHandling?: boolean;
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
      enableKeyboardHandling = true,
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

    const renderBackdrop = useCallback(
      (props: BottomSheetDefaultBackdropProps) => (
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
        enableKeyboardHandling={enableKeyboardHandling}
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
