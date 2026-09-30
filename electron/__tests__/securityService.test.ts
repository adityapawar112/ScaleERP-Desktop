import { describe, it, expect, vi, beforeEach } from 'vitest';
import { SecurityService } from '../services/securityService';
import { safeStorage } from 'electron';

// Mock Electron
vi.mock('electron', () => ({
  safeStorage: {
    isEncryptionAvailable: vi.fn(() => true),
    encryptString: vi.fn((text) => Buffer.from(`encrypted-${text}`)),
    decryptString: vi.fn((buffer) => buffer.toString().replace('encrypted-', '')),
  },
  app: {
    getPath: vi.fn(() => '/mock/path'),
    isPackaged: false,
  },
  shell: {
    openExternal: vi.fn().mockResolvedValue(undefined),
  }
}));

describe('SecurityService (Reliability)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(safeStorage.isEncryptionAvailable).mockReturnValue(true);
  });

  it('should encrypt and decrypt strings without data loss', () => {
    const complexString = '{"token": "xyz-123", "expires": 123456789, "scope": "drive.file"}';
    const base64 = SecurityService.encryptToBase64(complexString);
    
    // Ensure it's a valid base64 string
    expect(base64).toMatch(/^[A-Za-z0-9+/=]+$/);
    
    const decrypted = SecurityService.decryptFromBase64(base64);
    expect(decrypted).toBe(complexString);
  });

  it('should handle empty strings', () => {
    const original = '';
    const base64 = SecurityService.encryptToBase64(original);
    const decrypted = SecurityService.decryptFromBase64(base64);
    expect(decrypted).toBe(original);
  });

  it('should throw explicit error when encryption is unavailable', () => {
    vi.mocked(safeStorage.isEncryptionAvailable).mockReturnValue(false);

    expect(() => SecurityService.encryptString('sensitive data')).toThrow(/Encryption is unavailable/i);
  });

  it('should return null or throw on invalid base64 decryption', () => {
    // Depending on implementation, it might throw or return garbage.
    // Our implementation uses Buffer.from(base64, 'base64') and then decryptString.
    // If decryption fails, safeStorage usually throws.
    
    vi.mocked(safeStorage.decryptString).mockImplementation(() => {
      throw new Error('Decryption failed');
    });

    expect(() => SecurityService.decryptFromBase64('invalid-base64')).toThrow();
  });
});
