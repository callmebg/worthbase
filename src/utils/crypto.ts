/**
 * WorthBase (家底) - Crypto Utilities
 * SHA-256 hashing for PIN code storage.
 * Uses expo-crypto (available natively, no JS polyfill needed).
 */

import * as Crypto from 'expo-crypto';

/**
 * Hash a PIN code with SHA-256.
 * Returns a hex string suitable for secure storage.
 */
export async function hashPin(pin: string): Promise<string> {
  return await Crypto.digestStringAsync(
    Crypto.CryptoDigestAlgorithm.SHA256,
    pin,
  );
}

/**
 * Verify a PIN against a stored hash.
 */
export async function verifyPin(pin: string, storedHash: string): Promise<boolean> {
  const hash = await hashPin(pin);
  return hash === storedHash;
}
