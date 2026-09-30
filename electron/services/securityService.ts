import { safeStorage } from 'electron';
import { logger } from './logger';

/**
 * SecurityService
 * Handles encrypted storage using Electron's safeStorage API.
 * Provides graceful degradation checks and explicit security status reporting.
 */
export class SecurityService {
  /**
   * Check if safeStorage is available on the current platform
   */
  static isEncryptionAvailable(): boolean {
    try {
      return safeStorage.isEncryptionAvailable();
    } catch (error) {
      logger.error('Error checking safeStorage availability:', error);
      return false;
    }
  }

  /**
   * Encrypt a string
   * @param plainText The text to encrypt
   * @returns Buffer of encrypted data
   * @throws Error if encryption is unavailable
   */
  static encryptString(plainText: string): Buffer {
    if (!this.isEncryptionAvailable()) {
      throw new Error('Encryption is unavailable on this system. Please check your system keyring/secret service.');
    }
    return safeStorage.encryptString(plainText);
  }

  /**
   * Decrypt a buffer
   * @param encrypted The encrypted buffer
   * @returns Decrypted plain text string
   */
  static decryptString(encrypted: Buffer): string {
    if (!this.isEncryptionAvailable()) {
      throw new Error('Encryption is unavailable. Cannot decrypt data.');
    }
    return safeStorage.decryptString(encrypted);
  }

  /**
   * Encrypt data and return as Base64 string for storage in JSON/SQLite
   */
  static encryptToBase64(plainText: string): string {
    const encrypted = this.encryptString(plainText);
    return encrypted.toString('base64');
  }

  /**
   * Decrypt from Base64 string
   */
  static decryptFromBase64(base64: string): string {
    const buffer = Buffer.from(base64, 'base64');
    return this.decryptString(buffer);
  }
}
