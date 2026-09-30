// electron/services/licenseManager.ts
import * as fs from 'fs';
import * as path from 'path';
import { app } from 'electron';
import {
  getActiveLicense,
  logLicenseEvent,
  saveLicense,
  type LicenseRecord,
} from '../database/licenseOperations';
import {
  registerPublicKey,
  verifyLicenseBlob,
  type LicenseBlobVerificationResult,
} from './cryptoUtils';
import { getDeviceFingerprint } from './deviceFingerprint';
import { EMBEDDED_LICENSE_PUBLIC_KEYS } from './embeddedPublicKey';
import { detectClockTampering } from './licenseScheduler';

export interface LicensePayload {
  license_id: string;
  customer_id: string;
  edition: 'Basic' | 'Pro' | 'Enterprise';
  license_type?: 'trial' | 'subscription' | 'perpetual';
  valid_from: string;
  valid_until: string;
  maintenance_until: string;
  device_fingerprint?: string | null;
  grace_until?: string;
  grace_mode?: 'view_only' | 'admin_only';
  features?: Record<string, boolean>;
}

export interface LicenseStatus {
  valid: boolean;
  state: 'missing' | 'valid' | 'grace' | 'expired' | 'invalid';
  reason?: string;
  payload?: LicensePayload;
  daysUntilExpiry: number | null;
  daysUntilRenewal: number | null;
  maintenanceActive: boolean;
  isGracePeriod: boolean;
  deviceFingerprint: string;
  source: 'file' | 'database' | 'none';
  tamperDetected: boolean;
}

interface LicenseManagerOptions {
  publicKey?: string;
  publicKeyPath?: string;
  licenseFilePath?: string;
  keyId?: string;
}

export class LicenseManager {
  private readonly licenseFilePath: string;
  private readonly keyId: string;
  private cachedStatus: LicenseStatus | null = null;

  constructor(options: LicenseManagerOptions = {}) {
    this.keyId = options.keyId ?? 'key_001';
    this.licenseFilePath = options.licenseFilePath ?? this.resolveDefaultLicenseFilePath();

    const isPackaged = app ? app.isPackaged : true; // Default to secure if app is missing
    const isDev = !isPackaged || process.env.NODE_ENV === 'development';

    if (options.publicKey && isDev) {
      registerPublicKey(this.keyId, options.publicKey);
    } else if (options.publicKeyPath && isDev) {
      const publicKey = fs.readFileSync(options.publicKeyPath, 'utf8');
      registerPublicKey(this.keyId, publicKey);
    } else {
      const embeddedKey = EMBEDDED_LICENSE_PUBLIC_KEYS[this.keyId];
      if (embeddedKey) {
        registerPublicKey(this.keyId, embeddedKey);
      } else if (isDev) {
         // Fallback for development if no embedded key is found for this ID
         // This allows new keys to be tested before being embedded
         if (options.publicKey) {
          registerPublicKey(this.keyId, options.publicKey);
         } else if (options.publicKeyPath) {
          const publicKey = fs.readFileSync(options.publicKeyPath, 'utf8');
          registerPublicKey(this.keyId, publicKey);
         }
      }
    }
  }

  getStatus(): LicenseStatus | null {
    return this.cachedStatus;
  }

  async validateLicense(): Promise<LicenseStatus> {
    const loaded = await this.loadPersistedLicenseBlob();

    if (!loaded.blob) {
      const missingStatus: LicenseStatus = {
        valid: false,
        state: 'missing',
        reason: 'No license found',
        daysUntilExpiry: null,
        daysUntilRenewal: null,
        maintenanceActive: false,
        isGracePeriod: false,
        deviceFingerprint: getDeviceFingerprint(),
        source: 'none',
        tamperDetected: false,
      };

      this.cachedStatus = missingStatus;
      return missingStatus;
    }

    const status = await this.validateLicenseBlob(loaded.blob, loaded.source);
    
    // Check for clock tampering as part of the core validation loop
    const tamperDetected = await detectClockTampering();
    status.tamperDetected = tamperDetected;

    this.cachedStatus = status;
    return status;
  }

  async validateLicenseBlob(
    blob: string,
    source: 'file' | 'database' | 'none' = 'none',
  ): Promise<LicenseStatus> {
    const verification = verifyLicenseBlob<LicensePayload>(blob);
    return this.buildStatusFromVerification(verification, source);
  }

  async importLicense(blob: string): Promise<LicenseStatus> {
    const status = await this.validateLicenseBlob(blob, 'file');

    if (!status.valid || !status.payload) {
      await this.tryLogLicenseEvent(status.payload?.license_id ?? null, 'license_import_rejected', {
        reason: status.reason ?? 'Unknown import failure',
      });
      this.cachedStatus = status;
      return status;
    }

    fs.mkdirSync(path.dirname(this.licenseFilePath), { recursive: true });
    fs.writeFileSync(this.licenseFilePath, blob.trim(), 'utf8');

    const record: LicenseRecord = {
      license_id: status.payload.license_id,
      customer_id: status.payload.customer_id,
      edition: status.payload.edition,
      valid_from: status.payload.valid_from,
      valid_until: status.payload.valid_until,
      maintenance_until: status.payload.maintenance_until,
      device_fingerprint: status.payload.device_fingerprint ?? null,
      license_blob: blob.trim(),
      grace_until: status.payload.grace_until ?? null,
      grace_mode: status.payload.grace_mode ?? null,
      status: status.isGracePeriod ? 'renewed' : 'active',
    };

    await this.trySaveLicense(record);
    await this.tryLogLicenseEvent(status.payload.license_id, 'license_imported', {
      source: 'phase2-import',
      state: status.state,
    });

    this.cachedStatus = status;
    return status;
  }

  getDeviceFingerprint(): string {
    return getDeviceFingerprint();
  }

  private async loadPersistedLicenseBlob(): Promise<{
    blob: string | null;
    source: 'file' | 'database' | 'none';
  }> {
    try {
      if (fs.existsSync(this.licenseFilePath)) {
        return {
          blob: fs.readFileSync(this.licenseFilePath, 'utf8').trim(),
          source: 'file',
        };
      }
    } catch {
      // Fall through to database lookup.
    }

    try {
      const activeLicense = await getActiveLicense();
      if (activeLicense?.license_blob) {
        return { blob: activeLicense.license_blob, source: 'database' };
      }
    } catch {
      // Return no license below.
    }

    return { blob: null, source: 'none' };
  }

  private async buildStatusFromVerification(
    verification: LicenseBlobVerificationResult<LicensePayload>,
    source: 'file' | 'database' | 'none',
  ): Promise<LicenseStatus> {
    const currentFingerprint = getDeviceFingerprint();

    if (!verification.valid || !verification.payload) {
      await this.tryLogLicenseEvent(null, 'license_validation_failed', {
        reason: verification.reason ?? 'License verification failed',
      });

      return {
        valid: false,
        state: 'invalid',
        reason: verification.reason ?? 'License verification failed',
        daysUntilExpiry: null,
        daysUntilRenewal: null,
        maintenanceActive: false,
        isGracePeriod: false,
        deviceFingerprint: currentFingerprint,
        source,
        tamperDetected: false,
      };
    }

    const payload = verification.payload;
    const now = new Date();

    // Hybrid Merge: Check database for administrative overrides on dates
    let validFromStr = payload.valid_from;
    let maintenanceUntilStr = payload.maintenance_until;
    let validUntilStr = payload.valid_until;

    try {
      const { getLicenseById } = await import('../database/licenseOperations');
      const dbRecord = await getLicenseById(payload.license_id);
      
      if (dbRecord) {
        // Only override date fields to allow administrative extensions/resets
        // Edition and other core features remain locked to the signed identity
        validFromStr = dbRecord.valid_from;
        maintenanceUntilStr = dbRecord.maintenance_until;
        validUntilStr = dbRecord.valid_until;
      }
    } catch {
      // Fallback to signed payload if DB check fails
    }

    const validFrom = new Date(validFromStr);
    const maintenanceUntil = new Date(maintenanceUntilStr);
    const validUntil = new Date(validUntilStr);

    // Merge overrides back into payload for UI consistency
    const effectivePayload: LicensePayload = {
      ...payload,
      valid_from: validFromStr,
      maintenance_until: maintenanceUntilStr,
      valid_until: validUntilStr,
    };

    // Dynamic calculation: Renewal is strictly 365 days from activation (valid_from)
    const renewalEffectiveDate = new Date(validFrom.getTime() + 365 * 24 * 60 * 60 * 1000);
    
    const daysUntilExpiry = Math.floor(
      (maintenanceUntil.getTime() - now.getTime()) / (1000 * 60 * 60 * 24),
    );
    const daysUntilRenewal = Math.floor(
      (renewalEffectiveDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24),
    );

    if (Number.isNaN(validFrom.getTime()) || Number.isNaN(maintenanceUntil.getTime()) || Number.isNaN(validUntil.getTime())) {
      await this.tryLogLicenseEvent(payload.license_id, 'license_invalid_dates', {
        valid_from: payload.valid_from,
        maintenance_until: payload.maintenance_until,
      });

      return {
        valid: false,
        state: 'invalid',
        reason: 'License contains invalid dates',
        payload: effectivePayload,
        daysUntilExpiry: null,
        daysUntilRenewal: null,
        maintenanceActive: false,
        isGracePeriod: false,
        deviceFingerprint: currentFingerprint,
        source,
        tamperDetected: false,
      };
    }

    if (now.getTime() < validFrom.getTime()) {
      await this.tryLogLicenseEvent(payload.license_id, 'license_not_yet_active', {
        valid_from: payload.valid_from,
      });

      return {
        valid: false,
        state: 'invalid',
        reason: 'License is not active yet',
        payload: effectivePayload,
        daysUntilExpiry,
        daysUntilRenewal,
        maintenanceActive: false,
        isGracePeriod: false,
        deviceFingerprint: currentFingerprint,
        source,
        tamperDetected: false,
      };
    }

    if (payload.device_fingerprint && payload.device_fingerprint !== currentFingerprint) {
      await this.tryLogLicenseEvent(payload.license_id, 'license_device_mismatch', {
        expected: payload.device_fingerprint,
        actual: currentFingerprint,
      });

      return {
        valid: false,
        state: 'invalid',
        reason: 'Device fingerprint mismatch',
        payload: effectivePayload,
        daysUntilExpiry,
        daysUntilRenewal,
        maintenanceActive: false,
        isGracePeriod: false,
        deviceFingerprint: currentFingerprint,
        source,
        tamperDetected: false,
      };
    }

    const hardLockDate = new Date(renewalEffectiveDate.getTime() + 7 * 24 * 60 * 60 * 1000);

    // 1. Hard Lock (Full Block - 7 days after Renewal Anniversary)
    if (now.getTime() > hardLockDate.getTime()) {
      await this.tryLogLicenseEvent(payload.license_id, 'license_hard_lock_expired', {
        renewal_anniversary: renewalEffectiveDate.toISOString(),
        hard_lock_date: hardLockDate.toISOString(),
      });

      return {
        valid: false,
        state: 'expired',
        reason: 'License term and renewal grace period expired',
        payload: effectivePayload,
        daysUntilExpiry,
        daysUntilRenewal,
        maintenanceActive: false,
        isGracePeriod: false,
        deviceFingerprint: currentFingerprint,
        source,
        tamperDetected: false,
      };
    }

    // 2. Soft Lock / Grace Period (View-Only - After Maintenance Expiry OR Renewal Anniversary)
    if (now.getTime() > maintenanceUntil.getTime() || now.getTime() > renewalEffectiveDate.getTime()) {
      const isPostAnniversary = now.getTime() > renewalEffectiveDate.getTime();
      const reason = isPostAnniversary
        ? 'License renewal anniversary reached (Soft Lock Grace)'
        : 'Maintenance period expired (Soft Lock View-Only)';

      await this.tryLogLicenseEvent(payload.license_id, 'license_soft_lock', {
        reason,
        renewal_anniversary: renewalEffectiveDate.toISOString(),
        maintenance_until: payload.maintenance_until,
      });

      return {
        valid: true,
        state: 'grace',
        reason,
        payload: effectivePayload,
        daysUntilExpiry,
        daysUntilRenewal,
        maintenanceActive: false,
        isGracePeriod: true,
        deviceFingerprint: currentFingerprint,
        source,
        tamperDetected: false,
      };
    }

    await this.tryLogLicenseEvent(payload.license_id, 'license_validated', {
      days_until_expiry: daysUntilExpiry,
      source,
    });

    return {
      valid: true,
      state: 'valid',
      payload: effectivePayload,
      daysUntilExpiry,
      daysUntilRenewal,
      maintenanceActive: true,
      isGracePeriod: false,
      deviceFingerprint: currentFingerprint,
      source,
      tamperDetected: false,
    };
  }

  private resolveDefaultLicenseFilePath(): string {
    const userDataPath = app?.getPath?.('userData');
    if (userDataPath) {
      return path.join(userDataPath, 'license.lic');
    }

    return path.join(process.cwd(), 'tmp-license.lic');
  }

  private async tryLogLicenseEvent(
    licenseId: string | null,
    eventType: string,
    eventData?: Record<string, unknown>,
  ): Promise<void> {
    try {
      await logLicenseEvent(licenseId, eventType, eventData);
    } catch {
      // Logging should never break license validation in non-Electron/script contexts.
    }
  }

  private async trySaveLicense(record: LicenseRecord): Promise<void> {
    try {
      await saveLicense(record);
    } catch {
      // Persistence may be unavailable in isolated validation contexts.
    }
  }
}