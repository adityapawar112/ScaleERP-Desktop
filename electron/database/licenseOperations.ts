import { dbManager } from './manager';
import { logger } from '../services/logger';

export interface LicenseCustomerRecord {
  customer_id: string;
  name: string;
  email?: string | null;
  company?: string | null;
  status?: 'active' | 'suspended' | 'expired';
}

export interface LicenseRecord {
  license_id: string;
  customer_id: string;
  policy_id?: string;
  status?: 'active' | 'expired' | 'revoked' | 'renewed';
  edition?: 'Basic' | 'Pro' | 'Enterprise';
  valid_from: string;
  valid_until: string;
  maintenance_until: string;
  device_fingerprint?: string | null;
  license_blob: string;
  grace_until?: string | null;
  grace_mode?: 'view_only' | 'admin_only' | null;
}

export interface LicenseEventRecord {
  event_id: string;
  license_id: string | null;
  event_type: string;
  event_data?: string | null;
  created_at?: string;
}

export interface LicenseHeartbeatRecord {
  id: string;
  license_id: string;
  checked_at?: string;
  system_time_iso: string;
  reason?: string | null;
  metadata?: string | null;
}

export interface PasswordResetTokenRecord {
  id: string;
  user_id: string;
  token_hash: string;
  expires_at: string;
  used?: boolean;
  used_at?: string | null;
}

export interface ClockOverrideTokenRecord {
  token_id: string;
  license_id: string;
  expires_at: string;
  nonce: string;
  used_at?: string | null;
}

export interface UserLicenseLinkRecord {
  user_id: string;
  license_id: string;
}

export interface UserActiveLicenseValidationResult {
  valid: boolean;
  reason?:
    | 'USER_NOT_FOUND'
    | 'LICENSE_LINK_MISSING'
    | 'LICENSE_NOT_FOUND'
    | 'LICENSE_INACTIVE_STATUS'
    | 'LICENSE_NOT_YET_ACTIVE'
    | 'LICENSE_EXPIRED'
    | 'LICENSE_INVALID_DATES';
  license?: LicenseRecord;
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

function all<T>(sql: string, params: any[] = []): Promise<T[]> {
  return new Promise((resolve, reject) => {
    const db = dbManager.getDatabase();
    db.all(sql, params, (err, rows) => {
      if (err) reject(err);
      else resolve((rows as T[]) || []);
    });
  });
}

export async function upsertLicenseCustomer(customer: LicenseCustomerRecord): Promise<void> {
  logger.info(`Upserting customer: ${customer.customer_id}`);
  await run(
    `INSERT INTO license_customers (customer_id, name, email, company, status)
     VALUES (?, ?, ?, ?, ?)
     ON CONFLICT(customer_id) DO UPDATE SET
       name = excluded.name,
       email = excluded.email,
       company = excluded.company,
       status = excluded.status,
       updated_at = CURRENT_TIMESTAMP`,
    [
      customer.customer_id,
      customer.name,
      customer.email ?? null,
      customer.company ?? null,
      customer.status ?? 'active'
    ]
  );
}

export function getLicenseCustomerById(customerId: string): Promise<LicenseCustomerRecord | null> {
  return get<LicenseCustomerRecord>('SELECT * FROM license_customers WHERE customer_id = ?', [customerId]);
}

export async function saveLicense(license: LicenseRecord): Promise<void> {
  const existingCustomer = await getLicenseCustomerById(license.customer_id);
  if (!existingCustomer) {
    await upsertLicenseCustomer({
      customer_id: license.customer_id,
      name: license.customer_id,
      status: 'active'
    });
  }

  logger.info(`Saving/Updating license: ${license.license_id} for customer: ${license.customer_id}`);
  if (license.device_fingerprint) {
    logger.security('License binding fingerprint updated', { license_id: license.license_id, fingerprint: license.device_fingerprint });
  }

  await run(
    `INSERT INTO licenses (
      license_id, customer_id, policy_id, status, edition, valid_from, valid_until,
      maintenance_until, device_fingerprint, license_blob, grace_until, grace_mode
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(license_id) DO UPDATE SET
      customer_id = excluded.customer_id,
      policy_id = excluded.policy_id,
      status = excluded.status,
      edition = excluded.edition,
      valid_from = excluded.valid_from,
      valid_until = excluded.valid_until,
      maintenance_until = excluded.maintenance_until,
      device_fingerprint = excluded.device_fingerprint,
      license_blob = excluded.license_blob,
      grace_until = excluded.grace_until,
      grace_mode = excluded.grace_mode,
      updated_at = CURRENT_TIMESTAMP`,
    [
      license.license_id,
      license.customer_id,
      license.policy_id ?? 'annual-pro-1yr-90d',
      license.status ?? 'active',
      license.edition ?? 'Pro',
      license.valid_from,
      license.valid_until,
      license.maintenance_until,
      license.device_fingerprint ?? null,
      license.license_blob,
      license.grace_until ?? null,
      license.grace_mode ?? null
    ]
  );
}

export function getLicenseById(licenseId: string): Promise<LicenseRecord | null> {
  return get<LicenseRecord>('SELECT * FROM licenses WHERE license_id = ?', [licenseId]);
}

export function getActiveLicense(): Promise<LicenseRecord | null> {
  return get<LicenseRecord>(
    `SELECT * FROM licenses
     WHERE status IN ('active', 'renewed')
     ORDER BY updated_at DESC, created_at DESC
     LIMIT 1`
  );
}

export async function updateLicenseStatus(licenseId: string, status: LicenseRecord['status']): Promise<void> {
  logger.info(`Updating license status: ${licenseId} -> ${status}`);
  await run('UPDATE licenses SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE license_id = ?', [status, licenseId]);
}

export async function logLicenseEvent(licenseId: string | null, eventType: string, eventData?: Record<string, unknown>): Promise<void> {
  const eventId = `lic_evt_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
  logger.info(`License event: ${eventType} (ID: ${licenseId})`);
  await run(
    `INSERT INTO license_events (event_id, license_id, event_type, event_data)
     VALUES (?, ?, ?, ?)`,
    [eventId, licenseId, eventType, eventData ? JSON.stringify(eventData) : null]
  );
}

export function getLicenseEvents(licenseId: string, limit = 50): Promise<LicenseEventRecord[]> {
  return all<LicenseEventRecord>(
    `SELECT * FROM license_events WHERE license_id = ? ORDER BY created_at DESC LIMIT ?`,
    [licenseId, limit]
  );
}

export async function logHeartbeat(heartbeat: Omit<LicenseHeartbeatRecord, 'id'>): Promise<void> {
  const id = `hb_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
  logger.info(`Recording heartbeat for license: ${heartbeat.license_id} (Reason: ${heartbeat.reason || 'none'})`);
  
  if (heartbeat.metadata) {
    logger.security('Heartbeat metadata received', { license_id: heartbeat.license_id, metadata: heartbeat.metadata });
  }

  await run(
    `INSERT INTO license_heartbeats (id, license_id, system_time_iso, reason, metadata)
     VALUES (?, ?, ?, ?, ?)`,
    [
      id,
      heartbeat.license_id,
      heartbeat.system_time_iso,
      heartbeat.reason ?? null,
      heartbeat.metadata ?? null
    ]
  );
}

export function getRecentHeartbeats(limit = 10, licenseId?: string): Promise<LicenseHeartbeatRecord[]> {
  if (licenseId) {
    return all<LicenseHeartbeatRecord>(
      `SELECT * FROM license_heartbeats WHERE license_id = ? ORDER BY system_time_iso DESC, id DESC LIMIT ?`,
      [licenseId, limit]
    );
  }

  return all<LicenseHeartbeatRecord>(
    `SELECT * FROM license_heartbeats ORDER BY system_time_iso DESC, id DESC LIMIT ?`,
    [limit]
  );
}

export async function savePasswordResetToken(token: PasswordResetTokenRecord): Promise<void> {
  logger.info(`Saving password reset token for user: ${token.user_id}`);
  await run(
    `INSERT INTO password_reset_tokens (id, user_id, token_hash, expires_at, used, used_at)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [token.id, token.user_id, token.token_hash, token.expires_at, token.used ? 1 : 0, token.used_at ?? null]
  );
}

export async function markPasswordResetTokenUsed(id: string): Promise<void> {
  logger.info(`Marking password reset token used: ${id}`);
  await run(
    `UPDATE password_reset_tokens SET used = 1, used_at = CURRENT_TIMESTAMP WHERE id = ?`,
    [id]
  );
}

export async function markResetNonceUsed(nonce: string, licenseId: string, userId: string): Promise<void> {
  logger.info(`Marking reset nonce used for license: ${licenseId}`);
  await run(
    `INSERT INTO used_reset_nonces (nonce, license_id, user_id) VALUES (?, ?, ?)`,
    [nonce, licenseId, userId]
  );
}

export async function isResetNonceUsed(nonce: string): Promise<boolean> {
  const row = await get<{ nonce: string }>('SELECT nonce FROM used_reset_nonces WHERE nonce = ?', [nonce]);
  return Boolean(row);
}

export async function saveClockOverrideToken(token: ClockOverrideTokenRecord): Promise<void> {
  logger.info(`Saving clock override token for license: ${token.license_id}`);
  await run(
    `INSERT INTO clock_override_tokens (token_id, license_id, expires_at, nonce, used_at)
     VALUES (?, ?, ?, ?, ?)`,
    [token.token_id, token.license_id, token.expires_at, token.nonce, token.used_at ?? null]
  );
}

export async function markClockOverrideTokenUsed(tokenId: string): Promise<void> {
  logger.info(`Marking clock override token used: ${tokenId}`);
  await run(
    `UPDATE clock_override_tokens SET used_at = CURRENT_TIMESTAMP WHERE token_id = ?`,
    [tokenId]
  );
}

export async function linkUserToLicense(userId: string, licenseId: string): Promise<void> {
  logger.info(`Linking user ${userId} to license ${licenseId}`);
  await run(
    `UPDATE users
     SET license_id = ?
     WHERE user_id = ?`,
    [licenseId, userId]
  );
}

export function getUserLicenseLink(userId: string): Promise<UserLicenseLinkRecord | null> {
  return get<UserLicenseLinkRecord>(
    `SELECT user_id, license_id
     FROM users
     WHERE user_id = ?
     LIMIT 1`,
    [userId]
  );
}

export async function validateUserHasActiveLicense(userId: string): Promise<UserActiveLicenseValidationResult> {
  const userLink = await getUserLicenseLink(userId);
  if (!userLink) {
    return { valid: false, reason: 'USER_NOT_FOUND' };
  }

  if (!userLink.license_id) {
    return { valid: false, reason: 'LICENSE_LINK_MISSING' };
  }

  const license = await getLicenseById(userLink.license_id);
  if (!license) {
    return { valid: false, reason: 'LICENSE_NOT_FOUND' };
  }

  if (!['active', 'renewed'].includes(license.status ?? '')) {
    return { valid: false, reason: 'LICENSE_INACTIVE_STATUS', license };
  }

  const now = new Date();
  const validFrom = new Date(license.valid_from);
  const maintenanceUntil = new Date(license.maintenance_until);
  const validUntil = new Date(license.valid_until);

  if (Number.isNaN(validFrom.getTime()) || Number.isNaN(maintenanceUntil.getTime()) || Number.isNaN(validUntil.getTime())) {
    return { valid: false, reason: 'LICENSE_INVALID_DATES', license };
  }

  if (now.getTime() < validFrom.getTime()) {
    return { valid: false, reason: 'LICENSE_NOT_YET_ACTIVE', license };
  }

  // Business rule: Hard Lock occurs 7 days after valid_until.
  // Before that, login is allowed (though access may be Soft Locked/View-Only).
  const gracePeriodMs = 7 * 24 * 60 * 60 * 1000;
  const hardLockDate = new Date(validUntil.getTime() + gracePeriodMs);

  if (now.getTime() > hardLockDate.getTime()) {
    return { valid: false, reason: 'LICENSE_EXPIRED', license };
  }

  return { valid: true, license };
}

/**
 * Update specific fields of a license record directly.
 * Used by the developer admin panel for testing/debugging.
 * WARNING: Changes are NOT cryptographically signed.
 */
export async function updateLicenseFields(licenseId: string, fields: Record<string, string | null>): Promise<void> {
  const allowedFields = ['valid_from', 'valid_until', 'maintenance_until', 'edition', 'grace_until', 'grace_mode', 'status'];
  const setClauses: string[] = [];
  const values: (string | null)[] = [];

  for (const [key, value] of Object.entries(fields)) {
    if (allowedFields.includes(key)) {
      setClauses.push(`${key} = ?`);
      values.push(value);
    }
  }

  if (setClauses.length === 0) {
    throw new Error('No valid fields to update');
  }

  setClauses.push('updated_at = CURRENT_TIMESTAMP');
  values.push(licenseId);

  logger.info(`Administrative license update for: ${licenseId}`, fields);
  
  await run(
    `UPDATE licenses SET ${setClauses.join(', ')} WHERE license_id = ?`,
    values
  );
}

/**
 * Clear all heatbeats that are timestamped in the future relative to the current system time.
 * Used for administrative override of clock tamper detection.
 */
export async function clearFutureHeartbeats(licenseId: string, nowIsoOverride?: string): Promise<void> {
  const nowIso = nowIsoOverride || new Date().toISOString();
  logger.warn(`Administrative override: Clearing future heartbeats for ${licenseId} (Now: ${nowIso})`);
  await run(
    `DELETE FROM license_heartbeats 
     WHERE license_id = ? AND system_time_iso > ?`,
    [licenseId, nowIso]
  );
}
