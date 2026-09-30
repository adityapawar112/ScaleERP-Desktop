import * as path from 'path';
import { app } from 'electron';
import * as cron from 'node-cron';
import * as fs from 'fs/promises';
import { DatabaseManager } from '../database/manager';
import { backupSettingsOperations } from '../database/operations';
import { LicenseManager } from './licenseManager';
import { logger } from './logger';
import { googleDriveService } from './googleDriveService';

export interface BackupSettings {
  location: string;
}

/**
 * BackupScheduler Service
 * Manages automated database backups with strict retention and catch-up mechanisms
 */
export class BackupScheduler {
  private cronJob: cron.ScheduledTask | null = null;
  private settings: BackupSettings = { location: '' };
  private databaseManager: DatabaseManager;
  private licenseManager: LicenseManager | null;

  constructor(databaseManager: DatabaseManager, licenseManager: LicenseManager | null = null) {
    this.databaseManager = databaseManager;
    this.licenseManager = licenseManager;
  }

  /**
   * Load backup settings from database or use defaults
   */
  async loadSettings(): Promise<void> {
    try {
      const settings: any = await backupSettingsOperations.get();
      if (settings) {
        this.settings = {
          location: settings.backup_location || path.join(app.getPath('userData'), 'backups')
        };
      } else {
        this.settings = {
          location: path.join(app.getPath('userData'), 'backups')
        };
      }
    } catch (error) {
      logger.warn('Failed to load backup settings from database, using defaults:', error);
      this.settings = {
        location: path.join(app.getPath('userData'), 'backups')
      };
    }
  }

  /**
   * Update backup settings (only location is managed now)
   */
  async updateSettings(settings: Partial<BackupSettings>): Promise<void> {
    this.settings = { ...this.settings, ...settings };
    
    // We still update the db row for location
    try {
      await backupSettingsOperations.update({
        auto_backup_enabled: true,
        backup_frequency: 'daily', // Hardcoded legacy fields
        backup_location: this.settings.location
      });
    } catch (error) {
      logger.error('Failed to save backup location to database:', error);
    }
  }

  /**
   * Get current backup settings
   */
  getSettings(): BackupSettings {
    return { ...this.settings };
  }

  /**
   * Start the backup scheduler using forced daily cron
   */
  async start(): Promise<void> {
    await this.loadSettings();

    // Check catch-up logic
    await this.performCatchUpCheck();

    // Stop existing job if running
    this.stop();

    // Run strictly at 2:00 AM every day
    const cronExpression = '0 2 * * *';

    logger.info(`Starting backup scheduler (cron: ${cronExpression})`);

    this.cronJob = cron.schedule(cronExpression, async () => {
      try {
        logger.info('Running scheduled automatic backup...');
        await this.performTimeTaggedBackup();
        logger.info('Scheduled backup completed successfully');
      } catch (error) {
        logger.error('Scheduled backup failed:', error);
      }
    });
  }

  /**
   * Stop the backup scheduler
   */
  stop(): void {
    if (this.cronJob) {
      this.cronJob.stop();
      this.cronJob = null;
      logger.info('Backup scheduler stopped');
    }
  }

  /**
   * Determine the current semantic tag based on date
   */
  private getTagForDate(date: Date): 'daily' | 'weekly' | 'monthly' | 'yearly' {
    const isJanFirst = date.getMonth() === 0 && date.getDate() === 1;
    if (isJanFirst) return 'yearly';

    const isFirstOfMonth = date.getDate() === 1;
    if (isFirstOfMonth) return 'monthly';

    const isSunday = date.getDay() === 0;
    if (isSunday) return 'weekly';

    return 'daily';
  }

  /**
   * Verify if licensing allows backups
   */
  private async isLicensingPermitted(): Promise<boolean> {
    if (!this.licenseManager) return true; // No license manager to enforce constraints
    
    const status = await this.licenseManager.validateLicense();
    if (status.state === 'expired') {
      logger.warn('Licensing Hard Lock active. Skipping automatic backup.');
      return false;
    }
    return true;
  }

  /**
   * Performs an automatic backup and tags it appropriately
   */
  private async performTimeTaggedBackup(): Promise<void> {
    if (!(await this.isLicensingPermitted())) {
      return;
    }

    try {
      await fs.mkdir(this.settings.location, { recursive: true });

      // Run backup
      const result = await this.databaseManager.createBackup('auto');
      if (!result.success) {
        throw new Error('Backup creation failed in DB Manager');
      }

      // We rename the resulted file to inject the tag for retention purposes
      const tag = this.getTagForDate(new Date());
      const oldPath = result.path;
      const parsedPath = path.parse(oldPath);
      const newPath = path.join(parsedPath.dir, `${parsedPath.name}-${tag}${parsedPath.ext}`);

      // Wait a moment for file handles to close, then rename
      await fs.rename(oldPath, newPath).catch(err => logger.warn(`Failed to tag backup file: ${err}`));

      // Enqueue for cloud storage
      await googleDriveService.enqueue(newPath);

      // Always sweep immediately after adding a new file
      await this.cleanupOldBackups();

    } catch (error) {
      logger.error('Automatic tagged backup failed:', error);
    }
  }

  /**
   * Checks if an offline backup was missed within the last 24 hours
   */
  private async performCatchUpCheck(): Promise<void> {
    if (!(await this.isLicensingPermitted())) return;

    try {
      const history = await this.databaseManager.getBackupList(this.settings.location);
      if (history.length === 0) {
        logger.info('No backup history found. First time catch-up triggered.');
        await this.performTimeTaggedBackup();
        return;
      }

      const latestBackup = history[0];
      const hoursSince = (Date.now() - latestBackup.timestamp.getTime()) / (1000 * 60 * 60);

      // If the last backup is older than 24 hours, perform a catch-up
      if (hoursSince >= 24) {
        logger.info(`Last backup was ~${hoursSince.toFixed(1)} hours ago. Forcing catch-up backup.`);
        await this.performTimeTaggedBackup();
      }
    } catch (error) {
      logger.warn('Catch-up check failed (this is non-fatal):', error);
    }
  }

  /**
   * Manual backup trigger
   */
  async manualBackup(): Promise<{ success: boolean; message: string }> {
    try {
      logger.info('Starting manual backup...');
      // Note: IPC route handles manual licensing checks natively; we just execute here.
      await fs.mkdir(this.settings.location, { recursive: true });
      const result = await this.databaseManager.createBackup('manual');
      if (result.success) {
        // Tag manual backup so it is ignored by automated retention
        const oldPath = result.path;
        const parsedPath = path.parse(oldPath);
        const newPath = path.join(parsedPath.dir, `${parsedPath.name}-manual${parsedPath.ext}`);
        await fs.rename(oldPath, newPath).catch(() => {});
        
        // Enqueue for cloud storage
        await googleDriveService.enqueue(newPath);
      }
      return { success: true, message: 'Manual backup completed successfully' };
    } catch (error) {
      const message = `Manual backup failed: ${error instanceof Error ? error.message : 'Unknown error'}`;
      logger.error(message);
      return { success: false, message };
    }
  }

  /**
   * Strict retention policy:
   * Keep only the latest: 3 daily, 3 weekly, 3 monthly, All yearly
   */
  private async cleanupOldBackups(): Promise<void> {
    try {
      const files = await fs.readdir(this.settings.location);
      const backupFiles = files.filter(f => f.endsWith('.zip'));
      
      const fileStats = await Promise.all(
        backupFiles.map(async file => {
          const stats = await fs.stat(path.join(this.settings.location, file));
          return { file, mtime: stats.mtime.getTime() };
        })
      );

      // Sort newest to oldest
      fileStats.sort((a, b) => b.mtime - a.mtime);

      const counts = {
        daily: 0,
        weekly: 0,
        monthly: 0,
        yearly: 0,
        manual: 0
      };

      const MAX_RETENTION = 3;

      for (const item of fileStats) {
        const filePath = path.join(this.settings.location, item.file);

        if (item.file.includes('-manual')) {
          counts.manual++;
        } else if (item.file.includes('-yearly')) {
          counts.yearly++; // Keep all yearly
        } else if (item.file.includes('-monthly')) {
          counts.monthly++;
          if (counts.monthly > MAX_RETENTION) {
            await fs.unlink(filePath).catch(() => {});
            logger.info(`Cleaned up old monthly backup: ${item.file}`);
          }
        } else if (item.file.includes('-weekly')) {
          counts.weekly++;
          if (counts.weekly > MAX_RETENTION) {
            await fs.unlink(filePath).catch(() => {});
            logger.info(`Cleaned up old weekly backup: ${item.file}`);
          }
        } else if (item.file.includes('-daily') || item.file.includes('-auto')) {
          // If it lacks a specific tag but is from 'auto', we treat it as daily implicitly
          counts.daily++;
          if (counts.daily > MAX_RETENTION) {
            await fs.unlink(filePath).catch(() => {});
            logger.info(`Cleaned up old daily backup: ${item.file}`);
          }
        }
      }
    } catch (error) {
      logger.error('Failed to cleanup old backups:', error);
    }
  }

  isRunning(): boolean {
    return this.cronJob !== null;
  }

  destroy(): void {
    this.stop();
  }
}
