/**
 * WorthBase (家底) - Authentication Service
 * Handles PIN storage (SHA-256 + expo-secure-store), biometric auth,
 * and app lock state management.
 */

import * as SecureStore from 'expo-secure-store';
import * as LocalAuthentication from 'expo-local-authentication';
import { hashPin, verifyPin as verifyPinHash } from '@/utils/crypto';

const PIN_HASH_KEY = 'worthbase_pin_hash';

export const AuthService = {
  /**
   * Save PIN hash to SecureStore (SHA-256 hashed, never plaintext).
   */
  async savePin(pin: string): Promise<void> {
    const hash = await hashPin(pin);
    await SecureStore.setItemAsync(PIN_HASH_KEY, hash);
  },

  /**
   * Retrieve stored PIN hash from SecureStore.
   */
  async getPinHash(): Promise<string | null> {
    return await SecureStore.getItemAsync(PIN_HASH_KEY);
  },

  /**
   * Verify a PIN against the stored hash.
   */
  async verifyPin(pin: string): Promise<boolean> {
    const storedHash = await SecureStore.getItemAsync(PIN_HASH_KEY);
    if (!storedHash) return false;
    return await verifyPinHash(pin, storedHash);
  },

  /**
   * Delete stored PIN hash (when app lock is disabled).
   */
  async clearPin(): Promise<void> {
    await SecureStore.deleteItemAsync(PIN_HASH_KEY);
  },

  /**
   * Check if biometric authentication is available on this device.
   */
  async isBiometricAvailable(): Promise<boolean> {
    try {
      const compatible = await LocalAuthentication.hasHardwareAsync();
      if (!compatible) return false;
      const enrolled = await LocalAuthentication.isEnrolledAsync();
      return enrolled;
    } catch {
      return false;
    }
  },

  /**
   * Attempt biometric authentication.
   * Returns true if authentication succeeded.
   */
  async authenticateWithBiometric(): Promise<boolean> {
    try {
      const result = await LocalAuthentication.authenticateAsync({
        promptMessage: '解锁家底',
        fallbackLabel: '使用 PIN 码',
        cancelLabel: '取消',
        disableDeviceFallback: true,
      });
      return result.success;
    } catch {
      return false;
    }
  },

  /**
   * Get the type of biometric authentication available.
   */
  async getBiometricType(): Promise<string> {
    try {
      const types = await LocalAuthentication.supportedAuthenticationTypesAsync();
      if (types.includes(LocalAuthentication.AuthenticationType.FACIAL_RECOGNITION)) {
        return 'Face ID';
      }
      if (types.includes(LocalAuthentication.AuthenticationType.FINGERPRINT)) {
        return '指纹';
      }
      if (types.includes(LocalAuthentication.AuthenticationType.IRIS)) {
        return '虹膜';
      }
      return '生物识别';
    } catch {
      return '生物识别';
    }
  },
};
