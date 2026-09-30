// electron/services/licenseEnforcement.ts
import { LicenseManager } from './licenseManager';

/**
 * Operations that can be restricted by the licensing system
 */
export enum Operation {
  /** Viewing data, reports, lists */
  ReadData = 'read_data',
  /** Creating, updating, or deleting records */
  WriteData = 'write_data',
  /** Exporting data to Excel, CSV, or PDF */
  ExportData = 'export_data',
  /** Running or configuring backups */
  RunBackup = 'run_backup',
  /** Managing inventory specific settings or bulk updates */
  ManageInventory = 'manage_inventory',
  /** Creating or managing user accounts (Phase 5) */
  ManageUsers = 'manage_users',
}

/**
 * Central enforcement service for license-based restrictions.
 * This service ensures that the application respects the current license state
 * by blocking prohibited operations in 'grace' or 'expired' modes.
 */
export class LicenseEnforcement {
  private licenseManager: LicenseManager;

  constructor(licenseManager: LicenseManager) {
    this.licenseManager = licenseManager;
  }

  /**
   * Check if a given operation is allowed under the current license state.
   * Throws an Error with a descriptive message if the operation is denied.
   * 
   * Implementation rules from licensing-implementation-plan.md:
   * - Valid: Full access to all features.
   * - Grace: View-only mode. No writes, exports allowed.
   * - Expired: Blocked. Only license import and password reset available.
   * - Tamper/Invalid: Treated as expired/blocked.
   */
  ensureAllowed(operation: Operation): void {
    const status = this.licenseManager.getStatus();

    if (!status) {
      throw new Error('License status not available. Operation denied.');
    }

    // 1. Handle Invalid/Tamper states first
    if (status.tamperDetected) {
      throw new Error(`Clock tampering detected. Operation ${operation} denied for security reasons. Please contact support.`);
    }

    if (status.state === 'invalid') {
      throw new Error(`License invalid: ${status.reason || 'Verification failed'}. Operation ${operation} denied.`);
    }

    // 2. Handle Expired state
    if (status.state === 'expired') {
      // In expired state, everything covered by this enum is blocked.
      // Exception: License import and password reset don't call this service.
      throw new Error('License expired. Please renew your license to continue using ScaleERP.');
    }

    // 3. Handle Grace state (View-only)
    if (status.state === 'grace') {
      const allowedInGrace = [Operation.ReadData, Operation.ExportData];
      
      if (!allowedInGrace.includes(operation)) {
        throw new Error(`License in grace period. Operation ${operation} is restricted to view-only mode.`);
      }
      
      // Operation is allowed in grace
      return;
    }

    // 4. Handle Valid state
    if (status.state === 'valid') {
      return; // All operations allowed
    }

    // 5. Default: Block if state is unknown (e.g., missing)
    if (status.state === 'missing') {
      throw new Error('No active license found. Please activate ScaleERP.');
    }

    throw new Error(`Unauthorized operation ${operation} for license state: ${status.state}`);
  }

  /**
   * Boolean version of ensureAllowed for UI usage or conditional logic
   */
  isAllowed(operation: Operation): boolean {
    try {
      this.ensureAllowed(operation);
      return true;
    } catch {
      return false;
    }
  }
}