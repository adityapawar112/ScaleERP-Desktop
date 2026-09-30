import * as crypto from 'crypto';

/**
 * PKCE (Proof Key for Code Exchange) Utility
 * Generates code_verifier and code_challenge for secure OAuth2 flows in public clients (like Electron)
 */
export class PKCE {
  /**
   * Generates a high-entropy cryptographic random string
   */
  static generateVerifier(length: number = 64): string {
    const charset = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-._~';
    let verifier = '';
    const values = crypto.randomBytes(length);
    for (let i = 0; i < length; i++) {
      verifier += charset[values[i] % charset.length];
    }
    return verifier;
  }

  /**
   * Generates a code challenge from a verifier using SHA-256
   */
  static generateChallenge(verifier: string): string {
    const hash = crypto.createHash('sha256').update(verifier).digest();
    return this.base64UrlEncode(hash);
  }

  /**
   * Base64URL encoding (removes =, replaces + with -, / with _)
   */
  private static base64UrlEncode(buffer: Buffer): string {
    return buffer.toString('base64')
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=/g, '');
  }
}
