import { dbManager } from './manager';
import { logger } from '../services/logger';

export interface UserRecord {
  user_id: string;
  username: string;
  password_hash: string;
  license_id: string;
  created_at?: string;
  last_login?: string | null;
  locked_out?: boolean | number;
  failed_attempts?: number;
  max_failed_attempts?: number;
}

function run(sql: string, params: any[] = []): Promise<{ lastID: number; changes: number }> {
  return new Promise((resolve, reject) => {
    const db = dbManager.getDatabase();
    db.run(sql, params, function (err) {
      if (err) reject(err);
      else resolve({ lastID: this.lastID, changes: this.changes });
    });
  });
}

function get<T>(sql: string, params: any[] = []): Promise<T | null> {
  return new Promise((resolve, reject) => {
    const db = dbManager.getDatabase();
    db.get(sql, params, (err, row) => {
      if (err) reject(err);
      else resolve((row as T) || null);
    });
  });
}

export async function createUser(user: {
  user_id: string;
  username: string;
  password_hash: string;
  license_id: string;
  max_failed_attempts?: number;
}): Promise<void> {
  logger.info(`Creating user: ${user.username} (ID: ${user.user_id})`);
  await run(
    `INSERT INTO users (
      user_id, username, password_hash, license_id, max_failed_attempts
    ) VALUES (?, ?, ?, ?, ?)`,
    [
      user.user_id,
      user.username,
      user.password_hash,
      user.license_id,
      user.max_failed_attempts ?? 5,
    ]
  );
}

export function getUserByUsername(username: string): Promise<UserRecord | null> {
  return get<UserRecord>(
    `SELECT user_id, username, password_hash, license_id, created_at, last_login, locked_out, failed_attempts, max_failed_attempts
     FROM users
     WHERE username = ?
     LIMIT 1`,
    [username]
  );
}

export async function updateUserPassword(userId: string, passwordHash: string): Promise<void> {
  logger.security('User password updated', { user_id: userId });
  await run(
    `UPDATE users
     SET password_hash = ?, failed_attempts = 0, locked_out = 0
     WHERE user_id = ?`,
    [passwordHash, userId]
  );
}

export async function resetFailedAttempts(userId: string): Promise<void> {
  logger.info(`Resetting failed login attempts for user: ${userId}`);
  await run(
    `UPDATE users
     SET failed_attempts = 0,
         locked_out = 0,
         last_login = CURRENT_TIMESTAMP
     WHERE user_id = ?`,
    [userId]
  );
}

export async function incrementFailedAttempts(userId: string): Promise<void> {
  logger.warn(`Failed login attempt for user: ${userId}`);
  await run(
    `UPDATE users
     SET failed_attempts = failed_attempts + 1,
         locked_out = CASE
           WHEN (failed_attempts + 1) >= max_failed_attempts THEN 1
           ELSE locked_out
         END
     WHERE user_id = ?`,
    [userId]
  );
}

export async function lockUser(userId: string): Promise<void> {
  logger.security('User account locked due to security policy', { user_id: userId });
  await run(
    `UPDATE users
     SET locked_out = 1
     WHERE user_id = ?`,
    [userId]
  );
}

export async function unlockUser(userId: string): Promise<void> {
  logger.info(`Unlocking user account: ${userId}`);
  await run(
    `UPDATE users
     SET locked_out = 0,
         failed_attempts = 0
     WHERE user_id = ?`,
    [userId]
  );
}
export async function getAllUsers(): Promise<Partial<UserRecord>[]> {
  return new Promise((resolve, reject) => {
    const db = dbManager.getDatabase();
    db.all(
      `SELECT user_id, username, license_id, locked_out, failed_attempts, max_failed_attempts, last_login
       FROM users
       ORDER BY username ASC`,
      (err, rows) => {
        if (err) reject(err);
        else resolve(rows as Partial<UserRecord>[]);
      }
    );
  });
}
