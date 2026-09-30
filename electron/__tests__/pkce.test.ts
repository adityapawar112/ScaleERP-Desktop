import { describe, it, expect, vi } from 'vitest';
import { PKCE } from '../utils/pkce';

// Mock Electron (for logger if needed)
vi.mock('electron', () => ({
  app: {
    getPath: vi.fn(() => '/mock/path'),
    isPackaged: false,
  }
}));

describe('PKCE Utility', () => {
  it('should generate a verifier of correct length', () => {
    const verifier = PKCE.generateVerifier(64);
    expect(verifier).toHaveLength(64);
    // Should be base64url compatible
    expect(verifier).toMatch(/^[A-Za-z0-9\-._~]+$/);
  });

  it('should generate different verifiers each time', () => {
    const v1 = PKCE.generateVerifier(64);
    const v2 = PKCE.generateVerifier(64);
    expect(v1).not.toBe(v2);
  });

  it('should generate a valid challenge from a verifier', () => {
    const verifier = 'test-verifier-string-1234567890-test-verifier-string-1234567890';
    const challenge = PKCE.generateChallenge(verifier);
    
    expect(challenge).toBeTruthy();
    expect(challenge).toMatch(/^[A-Za-z0-9\-_]+$/);
    expect(challenge).not.toContain('=');
    expect(challenge).not.toContain('+');
    expect(challenge).not.toContain('/');
  });
});
