/**
 * WorthBase (家底) - Lock Screen Component
 * Full-screen overlay that blocks access until PIN/biometric authentication.
 * Redesigned with design system and Lucide icons.
 */

import { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Vibration,
  ActivityIndicator,
} from 'react-native';
import { useTheme } from 'react-native-paper';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSequence,
  withTiming,
  Easing,
} from 'react-native-reanimated';
import { Lock, Delete } from 'lucide-react-native';
import { AuthService } from '@/services/auth-service';
import { useSettingsStore } from '@/stores/settings-store';

interface LockScreenProps {
  onUnlocked: () => void;
  themeColor: string;
}

export function LockScreen({ onUnlocked, themeColor }: LockScreenProps) {
  const theme = useTheme();
  const { biometricEnabled } = useSettingsStore();
  const [pin, setPin] = useState('');
  const [error, setError] = useState('');
  const [isAuthenticating, setIsAuthenticating] = useState(false);
  const [biometricType, setBiometricType] = useState('生物识别');
  const [attempts, setAttempts] = useState(0);
  const shakeX = useSharedValue(0);

  useEffect(() => {
    AuthService.getBiometricType().then(setBiometricType);
  }, []);

  // Try biometric on mount if enabled
  useEffect(() => {
    if (biometricEnabled) {
      tryBiometric();
    }
  }, [biometricEnabled]);

  const shake = useCallback(() => {
    shakeX.value = withSequence(
      withTiming(10, { duration: 50, easing: Easing.linear }),
      withTiming(-10, { duration: 50, easing: Easing.linear }),
      withTiming(10, { duration: 50, easing: Easing.linear }),
      withTiming(-10, { duration: 50, easing: Easing.linear }),
      withTiming(0, { duration: 50, easing: Easing.linear }),
    );
    Vibration.vibrate(200);
  }, [shakeX]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: shakeX.value }],
  }));

  const tryBiometric = async () => {
    setIsAuthenticating(true);
    const success = await AuthService.authenticateWithBiometric();
    setIsAuthenticating(false);
    if (success) {
      onUnlocked();
    }
  };

  const handlePinSubmit = async () => {
    if (pin.length < 4) {
      setError('请输入至少4位数字');
      shake();
      return;
    }

    setIsAuthenticating(true);
    const valid = await AuthService.verifyPin(pin);
    setIsAuthenticating(false);

    if (valid) {
      setError('');
      setAttempts(0);
      onUnlocked();
    } else {
      setAttempts(prev => prev + 1);
      setError(`PIN 码错误${attempts >= 2 ? `（已尝试 ${attempts + 1} 次）` : ''}`);
      setPin('');
      shake();
    }
  };

  const handleKeyPress = (key: string) => {
    if (key === 'delete') {
      setPin(prev => prev.slice(0, -1));
      setError('');
    } else if (key === 'confirm') {
      handlePinSubmit();
    } else if (pin.length < 6) {
      setPin(prev => prev + key);
      setError('');
    }
  };

  // Auto-submit when 4+ digits entered
  useEffect(() => {
    if (pin.length >= 4) {
      const timer = setTimeout(handlePinSubmit, 300);
      return () => clearTimeout(timer);
    }
  }, [pin]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.surface }]}>
      <View style={styles.header}>
        <Text style={[styles.appName, { color: theme.colors.onSurface }]}>家底</Text>
        <Text style={[styles.subtitle, { color: theme.colors.onSurfaceVariant }]}>WorthBase</Text>
      </View>

      <Animated.View style={[styles.pinDotsContainer, animatedStyle]}>
        <View style={styles.pinDots}>
          {[0, 1, 2, 3].map(i => (
            <View
              key={i}
              style={[
                styles.pinDot,
                { backgroundColor: pin.length > i ? theme.colors.primary : theme.colors.outline },
                error && pin.length > i && { backgroundColor: theme.colors.error },
              ]}
            />
          ))}
          {pin.length > 4 && (
            <>
              {[4, 5].map(i => (
                <View
                  key={i}
                  style={[
                    styles.pinDotSmall,
                    { backgroundColor: pin.length > i ? theme.colors.primary : theme.colors.outline },
                  ]}
                />
              ))}
            </>
          )}
        </View>
        {error ? (
          <Text style={[styles.errorText, { color: theme.colors.error }]}>{error}</Text>
        ) : null}
      </Animated.View>

      {isAuthenticating ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
          <Text style={[styles.loadingText, { color: theme.colors.onSurfaceVariant }]}>验证中...</Text>
        </View>
      ) : (
        <View style={styles.keypad}>
          {[
            ['1', '2', '3'],
            ['4', '5', '6'],
            ['7', '8', '9'],
          ].map((row, rowIdx) => (
            <View key={rowIdx} style={styles.keypadRow}>
              {row.map(key => (
                <TouchableOpacity
                  key={key}
                  style={[styles.keypadBtn, { backgroundColor: theme.colors.surfaceVariant }]}
                  onPress={() => handleKeyPress(key)}
                  activeOpacity={0.6}
                >
                  <Text style={[styles.keypadBtnText, { color: theme.colors.onSurface }]}>{key}</Text>
                </TouchableOpacity>
              ))}
            </View>
          ))}
          <View style={styles.keypadRow}>
            {biometricEnabled ? (
              <TouchableOpacity
                style={[styles.keypadBtn, { backgroundColor: theme.colors.surfaceVariant }]}
                onPress={tryBiometric}
                activeOpacity={0.6}
              >
                <Lock size={22} color={theme.colors.onSurface} />
                <Text style={[styles.keypadBtnSubtext, { color: theme.colors.onSurfaceVariant }]}>
                  {biometricType}
                </Text>
              </TouchableOpacity>
            ) : (
              <View style={styles.keypadBtn} />
            )}
            <TouchableOpacity
              style={[styles.keypadBtn, { backgroundColor: theme.colors.surfaceVariant }]}
              onPress={() => handleKeyPress('0')}
              activeOpacity={0.6}
            >
              <Text style={[styles.keypadBtnText, { color: theme.colors.onSurface }]}>0</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.keypadBtn, { backgroundColor: theme.colors.surfaceVariant }]}
              onPress={() => handleKeyPress('delete')}
              activeOpacity={0.6}
              disabled={pin.length === 0}
            >
              <Delete
                size={22}
                color={pin.length === 0 ? theme.colors.outline : theme.colors.onSurface}
              />
            </TouchableOpacity>
          </View>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 9999,
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    alignItems: 'center',
    marginBottom: 48,
  },
  appName: {
    fontSize: 32,
    fontWeight: '800',
    letterSpacing: 4,
  },
  subtitle: {
    fontSize: 14,
    marginTop: 4,
    letterSpacing: 2,
  },
  pinDotsContainer: {
    alignItems: 'center',
    marginBottom: 48,
    minHeight: 48,
  },
  pinDots: {
    flexDirection: 'row',
    gap: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  pinDot: {
    width: 16,
    height: 16,
    borderRadius: 8,
  },
  pinDotSmall: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  errorText: {
    fontSize: 14,
    marginTop: 12,
  },
  loadingContainer: {
    alignItems: 'center',
    gap: 12,
  },
  loadingText: {
    fontSize: 14,
  },
  keypad: {
    width: '100%',
    paddingHorizontal: 48,
    gap: 12,
  },
  keypadRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    gap: 12,
  },
  keypadBtn: {
    width: 72,
    height: 72,
    borderRadius: 36,
    justifyContent: 'center',
    alignItems: 'center',
  },
  keypadBtnText: {
    fontSize: 28,
    fontWeight: '500',
  },
  keypadBtnSubtext: {
    fontSize: 9,
    marginTop: 2,
  },
});
