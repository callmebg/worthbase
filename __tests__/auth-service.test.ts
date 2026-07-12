/// <reference types="jest" />

/**
 * WorthBase (家底) - Auth Service Tests
 * Tests PIN hashing, SecureStore integration, biometric availability.
 */

import { AuthService } from '@/services/auth-service';
import * as SecureStore from 'expo-secure-store';
import * as LocalAuthentication from 'expo-local-authentication';
import * as Crypto from 'expo-crypto';

beforeEach(() => {
  jest.clearAllMocks();
  // Clear secure store
  (SecureStore.deleteItemAsync as jest.Mock).mockClear();
  (SecureStore.setItemAsync as jest.Mock).mockClear();
  (SecureStore.getItemAsync as jest.Mock).mockClear();
});

describe('AuthService - PIN management', () => {
  test('savePin: hashes PIN with SHA-256 and stores in SecureStore', async () => {
    await AuthService.savePin('1234');

    expect(Crypto.digestStringAsync).toHaveBeenCalledWith(
      Crypto.CryptoDigestAlgorithm.SHA256,
      '1234',
    );
    expect(SecureStore.setItemAsync).toHaveBeenCalledWith(
      'worthbase_pin_hash',
      expect.stringContaining('mock-sha256-'),
    );
  });

  test('getPinHash: retrieves hash from SecureStore', async () => {
    (SecureStore.getItemAsync as jest.Mock).mockResolvedValue('stored-hash-value');

    const hash = await AuthService.getPinHash();

    expect(SecureStore.getItemAsync).toHaveBeenCalledWith('worthbase_pin_hash');
    expect(hash).toBe('stored-hash-value');
  });

  test('getPinHash: returns null when no PIN is stored', async () => {
    (SecureStore.getItemAsync as jest.Mock).mockResolvedValue(null);

    const hash = await AuthService.getPinHash();

    expect(hash).toBeNull();
  });

  test('verifyPin: returns true when PIN matches stored hash', async () => {
    // The mock hash for '1234' is deterministic (same algo in mock)
    (SecureStore.getItemAsync as jest.Mock).mockImplementation(async (key: string) => {
      if (key === 'worthbase_pin_hash') {
        // Return the same mock hash that savePin('1234') would produce
        return await Crypto.digestStringAsync(Crypto.CryptoDigestAlgorithm.SHA256, '1234');
      }
      return null;
    });

    const result = await AuthService.verifyPin('1234');
    expect(result).toBe(true);
  });

  test('verifyPin: returns false when PIN does not match', async () => {
    (SecureStore.getItemAsync as jest.Mock).mockResolvedValue('different-hash');

    const result = await AuthService.verifyPin('9999');
    expect(result).toBe(false);
  });

  test('verifyPin: returns false when no PIN is stored', async () => {
    (SecureStore.getItemAsync as jest.Mock).mockResolvedValue(null);

    const result = await AuthService.verifyPin('1234');
    expect(result).toBe(false);
  });

  test('clearPin: removes PIN hash from SecureStore', async () => {
    await AuthService.clearPin();

    expect(SecureStore.deleteItemAsync).toHaveBeenCalledWith('worthbase_pin_hash');
  });
});

describe('AuthService - Biometric', () => {
  test('isBiometricAvailable: returns true when hardware and enrollment are available', async () => {
    (LocalAuthentication.hasHardwareAsync as jest.Mock).mockResolvedValue(true);
    (LocalAuthentication.isEnrolledAsync as jest.Mock).mockResolvedValue(true);

    const result = await AuthService.isBiometricAvailable();
    expect(result).toBe(true);
  });

  test('isBiometricAvailable: returns false when no hardware', async () => {
    (LocalAuthentication.hasHardwareAsync as jest.Mock).mockResolvedValue(false);

    const result = await AuthService.isBiometricAvailable();
    expect(result).toBe(false);
  });

  test('isBiometricAvailable: returns false when not enrolled', async () => {
    (LocalAuthentication.hasHardwareAsync as jest.Mock).mockResolvedValue(true);
    (LocalAuthentication.isEnrolledAsync as jest.Mock).mockResolvedValue(false);

    const result = await AuthService.isBiometricAvailable();
    expect(result).toBe(false);
  });

  test('authenticateWithBiometric: returns true on success', async () => {
    (LocalAuthentication.authenticateAsync as jest.Mock).mockResolvedValue({ success: true });

    const result = await AuthService.authenticateWithBiometric();
    expect(result).toBe(true);
    expect(LocalAuthentication.authenticateAsync).toHaveBeenCalledWith(
      expect.objectContaining({ promptMessage: '解锁家底' }),
    );
  });

  test('authenticateWithBiometric: returns false on failure', async () => {
    (LocalAuthentication.authenticateAsync as jest.Mock).mockResolvedValue({ success: false });

    const result = await AuthService.authenticateWithBiometric();
    expect(result).toBe(false);
  });

  test('authenticateWithBiometric: returns false on exception', async () => {
    (LocalAuthentication.authenticateAsync as jest.Mock).mockRejectedValue(new Error('timeout'));

    const result = await AuthService.authenticateWithBiometric();
    expect(result).toBe(false);
  });

  test('getBiometricType: returns Face ID when facial recognition is supported', async () => {
    (LocalAuthentication.supportedAuthenticationTypesAsync as jest.Mock).mockResolvedValue([2]);

    const type = await AuthService.getBiometricType();
    expect(type).toBe('Face ID');
  });

  test('getBiometricType: returns 指纹 when fingerprint is supported', async () => {
    (LocalAuthentication.supportedAuthenticationTypesAsync as jest.Mock).mockResolvedValue([1]);

    const type = await AuthService.getBiometricType();
    expect(type).toBe('指纹');
  });

  test('getBiometricType: returns 生物识别 when no types are supported', async () => {
    (LocalAuthentication.supportedAuthenticationTypesAsync as jest.Mock).mockResolvedValue([]);

    const type = await AuthService.getBiometricType();
    expect(type).toBe('生物识别');
  });
});
