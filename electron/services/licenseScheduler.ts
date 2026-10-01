import { BrowserWindow, app } from 'electron';
import * as cron from 'node-cron';
import { LicenseManager, LicenseStatus } from './licenseManager';
import { logHeartbeat, getRecentHeartbeats } from '../database/licenseOperations';
import { getDeviceFingerprint } from './deviceFingerprint';
import { AuthService } from './authService';
import { logger } from './logger';

// Clock tamper tolerance: 24 hours in milliseconds
const CLOCK_TAMPER_TOLERANCE_MS = 24 * 60 * 60 * 1000;

/**
 * Detect clock tampering by analyzing heartbeat history.
 * If the current system time is BEFORE the last heartbeat time by more than
 * the tolerance window, flag it as tampering.
 * 
 * Exported so LicenseManager can also verify clock integrity on startup.
 */
export async function detectClockTampering(): Promise<boolean> {
  try {
    // Get the most recent heartbeats based on system_time_iso (per backend fix)
    const heartbeats = await getRecentHeartbeats(5);
    if (heartbeats.length < 2) return false;

    const now = new Date().getTime();
    const lastHeartbeat = new Date(heartbeats[0].system_time_iso).getTime();

    // If current time is BEFORE last heartbeat by more than tolerance, flag as tampering
    if (now < lastHeartbeat - CLOCK_TAMPER_TOLERANCE_MS) {
      logger.security('Clock tamper detected', {
        now: new Date(now).toISOString(),
        lastHeartbeat: new Date(lastHeartbeat).toISOString(),
        diff_ms: now - lastHeartbeat
      });
      return true;
    }

    return false;
  } catch (error) {
    logger.error('Error detecting clock tampering:', error);
    return false;
  }
}

/**
 * LicenseScheduler - Periodic license validation and heartbeat logging.
 *
 * Responsibilities:
 * 1. Log heartbeats hourly for clock tamper detection
 * 2. Run daily expiry checks with warning thresholds (30 days, 7 days)
 * 3. Detect clock tampering by analyzing heartbeat history
 * 4. Emit IPC events to renderer for license status changes
 *
 * Pattern follows BackupScheduler: start()/stop() lifecycle with cron.ScheduledTask management.
 */
export class LicenseScheduler {
  private dailyJob: cron.ScheduledTask | null = null;
  private hourlyJob: cron.ScheduledTask | null = null;
  private licenseManager: LicenseManager;
  private authService: AuthService;
  private mainWindow: BrowserWindow;

  constructor(licenseManager: LicenseManager, authService: AuthService, mainWindow: BrowserWindow) {
    this.licenseManager = licenseManager;
    this.authService = authService;
    this.mainWindow = mainWindow;
  }

  /**
   * Start both scheduled license checks.
   * - Daily at 9 AM: expiry warning check and maintenance status
   * - Every hour: heartbeat logging for clock tamper detection
   */
  start(): void {
    // Daily check at 9 AM for warnings and maintenance expiry
    this.dailyJob = cron.schedule('0 9 * * *', async () => {
      await this.checkLicenseExpiry();
    });

    // Hourly heartbeat for clock tamper detection
    this.hourlyJob = cron.schedule('0 * * * *', async () => {
      await this.logHeartbeat('hourly');
    });

    // Listen to auth events for immediate heartbeats or logging
    this.authService.on('login', (user) => {
      this.logHeartbeat('user_action').catch(err => {
        console.error('Failed to log heartbeat on login:', err);
      });
      console.log(`License heartbeat triggered by login: ${user.username}`);
    });

    this.authService.on('logout', (user) => {
      console.log(`User logged out: ${user.username}`);
    });

    // Log initial heartbeat on startup
    this.logHeartbeat('startup').catch(err => {
      logger.error('Failed to log initial license heartbeat:', err);
    });

    logger.info('License scheduler started');
  }

  /**
   * Stop all scheduled license checks.
   */
  stop(): void {
    if (this.dailyJob) {
      this.dailyJob.stop();
      this.dailyJob = null;
    }
    if (this.hourlyJob) {
      this.hourlyJob.stop();
      this.hourlyJob = null;
    }
    console.log('License scheduler stopped');
  }

  /**
   * Check if the scheduler is currently running.
   */
  isRunning(): boolean {
    return this.dailyJob !== null && this.hourlyJob !== null;
  }

  /**
   * Force an immediate license check and return the status.
   */
  async forceCheck(): Promise<{ status: LicenseStatus; tamperDetected: boolean }> {
    const status = await this.licenseManager.validateLicense();
    const tamperDetected = await this.detectClockTampering();
    return { status, tamperDetected };
  }

  /**
   * Check license expiry and send warning events to renderer.
   * Emits:
   * - 'license-warning' at <= 30 days (level: 'info') and <= 7 days (level: 'urgent')
   * - 'license-expired' when license is past effective expiry
   * - 'maintenance-expired' when maintenance window has passed
   */
  private async checkLicenseExpiry(): Promise<void> {
    try {
      const status = await this.licenseManager.validateLicense();

      if (!status.valid) {
        // License is expired or invalid
        this.mainWindow.webContents.send('license-expired', {
          reason: status.reason || 'License is not valid'
        });
        return;
      }

      // Check maintenance expiry (maintenance_until is the effective expiry)
      if (!status.maintenanceActive) {
        // Maintenance period has ended — license may still be within valid_until but without support
        this.mainWindow.webContents.send('maintenance-expired', {
          payload: status.payload ?? null
        });
      }

      // Check warning thresholds based on days until expiry
      const daysLeft = status.daysUntilExpiry ?? Infinity;
      if (daysLeft <= 7) {
        this.mainWindow.webContents.send('license-warning', {
          daysLeft,
          level: 'urgent'
        });
      } else if (daysLeft <= 30) {
        this.mainWindow.webContents.send('license-warning', {
          daysLeft,
          level: 'info'
        });
      }
    } catch (error) {
      logger.error('Error in license expiry check:', error);
    }
  }

  /**
   * Log a heartbeat record for clock tamper detection.
   */
  private async logHeartbeat(reason: 'startup' | 'hourly' | 'scheduled' | 'user_action'): Promise<void> {
    const status = this.licenseManager.getStatus();
    if (!status?.valid || !status.payload) return;

    // Optional: Only log heartbeats if session is active for 'hourly' checks?
    // The todo says "check session during heartbeat".
    const session = await this.authService.checkSession();

    await logHeartbeat({
      license_id: status.payload.license_id,
      system_time_iso: new Date().toISOString(),
      reason,
      metadata: session.authenticated ? JSON.stringify({ user_id: session.user?.user_id }) : undefined
    });

    // After logging, check for clock tampering
    const tamperDetected = await this.detectClockTampering();
    if (tamperDetected) {
      this.mainWindow.webContents.send('clock-tamper-detected', {
        timestamp: new Date().toISOString(),
        currentFingerprint: getDeviceFingerprint()
      });
      logger.security('Clock tampering detected during heartbeat');
    }

    // Opportunistically sync heartbeat with cloud server when online
    this.syncCloudHeartbeat().catch(() => {});
  }

  /**
   * Sync heartbeat with ScaleERP Web server when internet is available.
   * Silently catches errors if offline or server is unreachable.
   */
  private async syncCloudHeartbeat(): Promise<void> {
    try {
      const status = this.licenseManager.getStatus();
      if (!status?.valid || !status.payload) return;

      const baseUrl = process.env.SCALEERP_API_URL || process.env.VITE_API_URL || 'http://localhost:3000';
      const os = await import('os');

      const response = await fetch(`${baseUrl}/api/v1/licensing/sync-heartbeat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          activationKey: status.payload.license_id,
          deviceFingerprint: getDeviceFingerprint(),
          clientSystemTime: new Date().toISOString(),
          appVersion: app?.getVersion ? app.getVersion() : '1.0.0',
          osHostname: os.hostname(),
          licenseState: status.state,
          localDatabaseState: {
            reportedValidFrom: status.payload.valid_from,
            reportedValidUntil: status.payload.valid_until,
            reportedMaintenanceUntil: status.payload.maintenance_until,
          },
        }),
      });

      if (!response.ok) return;
      const data = await response.json();

      if (data?.securityLockout) {
        this.mainWindow.webContents.send('clock-tamper-detected', {
          timestamp: new Date().toISOString(),
          currentFingerprint: getDeviceFingerprint(),
        });
        logger.security('Security lockout returned by cloud licensing server');
      } else if (data?.isLicenseUpdated && data?.updatedLicenseBlob) {
        await this.licenseManager.importLicense(data.updatedLicenseBlob);
        logger.info('License renewed and updated via cloud heartbeat synchronization');
      }
    } catch {
      // Offline / air-gapped workstations naturally ignore cloud sync failures
    }
  }

  /**
   * Detect clock tampering by analyzing heartbeat history.
   * If the current system time is before the last heartbeat time by more than
   * the tolerance window, flag it as tampering.
   */
  private async detectClockTampering(): Promise<boolean> {
    return await detectClockTampering();
  }
}