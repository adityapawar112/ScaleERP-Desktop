// electron/services/authService.ts
import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';
import { EventEmitter } from 'events';
import { app } from 'electron';
import {
  getUserByUsername,
  updateUserPassword,
  incrementFailedAttempts,
  resetFailedAttempts,
  lockUser,
  unlockUser,
  type UserRecord,
} from '../database/userOperations';
import { validateUserHasActiveLicense } from '../database/licenseOperations';
import { hashPassword, verifyPassword } from './passwordHasher';

interface SessionPayload {
  session_id: string;
  user_id: string;
  username: string;
  license_id: string;
  issued_at: string;
  expires_at: string;
}

export interface AuthResult {
  success: boolean;
  message: string;
  user?: {
    user_id: string;
    username: string;
    license_id: string;
  };
  lockout?: {
    locked_out: boolean;
    failed_attempts: number;
    max_failed_attempts: number;
  };
}

export interface SessionStatus {
  authenticated: boolean;
  user?: {
    user_id: string;
    username: string;
    license_id: string;
  };
  expires_at?: string;
}

export class AuthService extends EventEmitter {
  private readonly sessionFilePath: string;
  private readonly sessionKeyPath: string;
  private readonly sessionTtlHours: number;
  private currentSession: SessionPayload | null = null;

  constructor() {
    super();
    const userDataPath = app.getPath('userData');
    this.sessionFilePath = path.join(userDataPath, 'auth-session.enc');
    this.sessionKeyPath = path.join(userDataPath, 'auth-session.key');

    const parsedTtl = Number(process.env.AUTH_SESSION_TTL_HOURS ?? '24');
    this.sessionTtlHours = Number.isFinite(parsedTtl) && parsedTtl > 0 ? parsedTtl : 24;
  }

  async login(username: string, password: string): Promise<AuthResult> {
    const user = await this.requireUserByUsername(username);
    if (!user) {
      return { success: false, message: 'Invalid username or password' };
    }

    if (Number(user.locked_out) === 1) {
      return {
        success: false,
        message: 'User is locked out',
        lockout: this.getLockoutPayload(user),
      };
    }

    const licenseValidation = await validateUserHasActiveLicense(user.user_id);
    if (!licenseValidation.valid) {
      return {
        success: false,
        message: `Active license required (${licenseValidation.reason ?? 'UNKNOWN'})`,
      };
    }

    const passwordOk = await verifyPassword(password, user.password_hash);
    if (!passwordOk) {
      await incrementFailedAttempts(user.user_id);
      const refreshed = await getUserByUsername(user.username);
      return {
        success: false,
        message: 'Invalid username or password',
        lockout: refreshed ? this.getLockoutPayload(refreshed) : undefined,
      };
    }

    await resetFailedAttempts(user.user_id);
    const session = this.buildSession(user);
    this.persistSession(session);
    this.currentSession = session;

    this.emit('login', {
      user_id: user.user_id,
      username: user.username,
      license_id: user.license_id,
    });

    return {
      success: true,
      message: 'Login successful',
      user: {
        user_id: user.user_id,
        username: user.username,
        license_id: user.license_id,
      },
    };
  }

  async logout(): Promise<AuthResult> {
    const oldSession = this.currentSession;
    this.currentSession = null;
    this.clearSessionFile();

    if (oldSession) {
      this.emit('logout', {
        user_id: oldSession.user_id,
        username: oldSession.username,
      });
    }

    return { success: true, message: 'Logout successful' };
  }

  async checkSession(): Promise<SessionStatus> {
    const session = this.currentSession ?? this.loadPersistedSession();
    if (!session) {
      return { authenticated: false };
    }

    const expiresAt = new Date(session.expires_at);
    if (Number.isNaN(expiresAt.getTime()) || Date.now() >= expiresAt.getTime()) {
      await this.logout();
      return { authenticated: false };
    }

    const user = await getUserByUsername(session.username);
    if (!user || user.user_id !== session.user_id || Number(user.locked_out) === 1) {
      await this.logout();
      return { authenticated: false };
    }

    const licenseValidation = await validateUserHasActiveLicense(user.user_id);
    if (!licenseValidation.valid) {
      await this.logout();
      return { authenticated: false };
    }

    this.currentSession = session;
    return {
      authenticated: true,
      user: {
        user_id: user.user_id,
        username: user.username,
        license_id: user.license_id,
      },
      expires_at: session.expires_at,
    };
  }

  async changePassword(username: string, currentPassword: string, newPassword: string): Promise<AuthResult> {
    const user = await this.requireUserByUsername(username);
    if (!user) {
      return { success: false, message: 'User not found' };
    }

    const currentOk = await verifyPassword(currentPassword, user.password_hash);
    if (!currentOk) {
      return { success: false, message: 'Current password is incorrect' };
    }

    const newHash = await hashPassword(newPassword);
    await updateUserPassword(user.user_id, newHash);
    return { success: true, message: 'Password changed successfully' };
  }

  async lockByUsername(username: string): Promise<AuthResult> {
    const user = await this.requireUserByUsername(username);
    if (!user) {
      return { success: false, message: 'User not found' };
    }
    await lockUser(user.user_id);
    return { success: true, message: 'User locked successfully' };
  }

  async unlockByUsername(username: string): Promise<AuthResult> {
    const user = await this.requireUserByUsername(username);
    if (!user) {
      return { success: false, message: 'User not found' };
    }
    await unlockUser(user.user_id);
    return { success: true, message: 'User unlocked successfully' };
  }

  async getLockoutStatus(username: string): Promise<AuthResult> {
    const user = await this.requireUserByUsername(username);
    if (!user) {
      return { success: false, message: 'User not found' };
    }

    return {
      success: true,
      message: 'Lockout status fetched',
      lockout: this.getLockoutPayload(user),
    };
  }

  private async requireUserByUsername(username: string): Promise<UserRecord | null> {
    const normalized = username?.trim();
    if (!normalized) {
      return null;
    }
    return getUserByUsername(normalized);
  }

  private getLockoutPayload(user: UserRecord): { locked_out: boolean; failed_attempts: number; max_failed_attempts: number } {
    return {
      locked_out: Number(user.locked_out) === 1,
      failed_attempts: user.failed_attempts ?? 0,
      max_failed_attempts: user.max_failed_attempts ?? 5,
    };
  }

  private buildSession(user: UserRecord): SessionPayload {
    const issuedAt = new Date();
    const expiresAt = new Date(issuedAt.getTime() + this.sessionTtlHours * 60 * 60 * 1000);

    return {
      session_id: `sess_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`,
      user_id: user.user_id,
      username: user.username,
      license_id: user.license_id,
      issued_at: issuedAt.toISOString(),
      expires_at: expiresAt.toISOString(),
    };
  }

  private persistSession(session: SessionPayload): void {
    fs.mkdirSync(path.dirname(this.sessionFilePath), { recursive: true });
    const key = this.getOrCreateSessionKey();
    const iv = crypto.randomBytes(12);

    const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
    const encrypted = Buffer.concat([
      cipher.update(JSON.stringify(session), 'utf8'),
      cipher.final(),
    ]);
    const authTag = cipher.getAuthTag();

    const envelope = {
      iv: iv.toString('base64'),
      tag: authTag.toString('base64'),
      data: encrypted.toString('base64'),
    };

    fs.writeFileSync(this.sessionFilePath, JSON.stringify(envelope), 'utf8');
  }

  private loadPersistedSession(): SessionPayload | null {
    try {
      if (!fs.existsSync(this.sessionFilePath)) {
        return null;
      }

      const raw = fs.readFileSync(this.sessionFilePath, 'utf8');
      const envelope = JSON.parse(raw) as { iv: string; tag: string; data: string };
      const key = this.getOrCreateSessionKey();

      const decipher = crypto.createDecipheriv(
        'aes-256-gcm',
        key,
        Buffer.from(envelope.iv, 'base64')
      );
      decipher.setAuthTag(Buffer.from(envelope.tag, 'base64'));

      const decrypted = Buffer.concat([
        decipher.update(Buffer.from(envelope.data, 'base64')),
        decipher.final(),
      ]);

      return JSON.parse(decrypted.toString('utf8')) as SessionPayload;
    } catch {
      this.clearSessionFile();
      return null;
    }
  }

  private clearSessionFile(): void {
    try {
      if (fs.existsSync(this.sessionFilePath)) {
        fs.unlinkSync(this.sessionFilePath);
      }
    } catch {
      // ignore
    }
  }

  private getOrCreateSessionKey(): Buffer {
    if (fs.existsSync(this.sessionKeyPath)) {
      return fs.readFileSync(this.sessionKeyPath);
    }

    const key = crypto.randomBytes(32);
    fs.mkdirSync(path.dirname(this.sessionKeyPath), { recursive: true });
    fs.writeFileSync(this.sessionKeyPath, key);
    return key;
  }
}
