import { ipcMain, app, IpcMainInvokeEvent } from 'electron';
import * as fs from 'fs/promises';
import { logger } from '../services/logger';
import * as path from 'path';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);
import { dbManager, DatabaseManagerStats } from '../database/manager';
import { LicenseManager } from '../services/licenseManager';
import { LicenseScheduler } from '../services/licenseScheduler';
import { LicenseEnforcement, Operation } from '../services/licenseEnforcement';
import { AuthService } from '../services/authService';
import { PasswordResetService } from '../services/passwordReset';
import { validateDeveloperSecret } from '../services/securityConfig';
import {
  CRUDOperations,
  TransactionCRUDOperations,
  LeisureCRUDOperations,
  DatabaseOperationResult,
  DatabaseIPCChannels,
  DatabaseStats
} from '../database/types';
import { whatsappPresets } from '../database/operations';
import { seedSampleData } from '../database/seeding';
import { googleDriveService } from '../services/googleDriveService';

// Migration-related interfaces removed - migrations are obsolete after database reset

// IPC Handler function type - flexible to accommodate different signatures
type IPCHandler = (...args: any[]) => any;

let licenseManager: LicenseManager | null = null;
let licenseScheduler: LicenseScheduler | null = null;
let licenseEnforcement: LicenseEnforcement | null = null;
let authService: AuthService | null = null;
let passwordResetService: PasswordResetService | null = null;
let restartSchedulerCallback: (() => Promise<void>) | null = null;

export function setLicenseManager(manager: LicenseManager | null): void {
  licenseManager = manager;
}

export function setLicenseScheduler(scheduler: LicenseScheduler | null): void {
  licenseScheduler = scheduler;
}

export function setLicenseEnforcement(enforcement: LicenseEnforcement | null): void {
  licenseEnforcement = enforcement;
}

export function setAuthService(service: AuthService | null): void {
  authService = service;
}

export function setPasswordResetService(service: PasswordResetService | null): void {
  passwordResetService = service;
}

export function setRestartSchedulerCallback(callback: () => Promise<void>): void {
  restartSchedulerCallback = callback;
}

/**
 * Helper to ensure a request is authorized with the developer secret.
 * Used for sensitive admin/dev-only IPC handlers.
 */
function requireAuth(secret: string): void {
  if (!validateDeveloperSecret(secret)) {
    logger.security('Unauthorized IPC access attempt detected');
    throw new Error('Unauthorized: Invalid developer secret');
  }
}

/**
 * Generic IPC Handler Factory
 * Creates type-safe IPC handlers for CRUD operations
 */

// ===========================================
// GENERIC CRUD HANDLER FACTORY
// ===========================================

/**
 * Create IPC handlers for basic CRUD operations
 */
export function createCRUDHandlers<T, TInsert, TUpdate>(
  entityName: string,
  operations: CRUDOperations<T, TInsert, TUpdate>
): Record<string, IPCHandler> {
  return {
    [`db:${entityName}:getAll`]: async (): Promise<T[]> => {
      try {
        if (!dbManager || !dbManager.isInitialized()) {
          throw new Error('Database not initialized');
        }
        return await operations.getAll();
      } catch (error) {
        console.error(`IPC db:${entityName}:getAll error:`, error);
        throw error;
      }
    },

    [`db:${entityName}:getById`]: async (event: IpcMainInvokeEvent, id: string): Promise<T | null> => {
      try {
        if (!dbManager || !dbManager.isInitialized()) {
          throw new Error('Database not initialized');
        }
        if (!id || typeof id !== 'string') {
          throw new Error('Invalid ID provided');
        }
        return await operations.getById(id);
      } catch (error) {
        logger.error(`IPC db:${entityName}:getById error:`, error);
        throw error;
      }
    },

    [`db:${entityName}:insert`]: async (
      event: IpcMainInvokeEvent,
      data: TInsert
    ): Promise<DatabaseOperationResult> => {
      try {
        if (licenseEnforcement) {
          licenseEnforcement.ensureAllowed(Operation.WriteData);
        }
        if (!dbManager || !dbManager.isInitialized()) {
          throw new Error('Database not initialized');
        }
        if (!data || typeof data !== 'object') {
          throw new Error('Invalid data provided');
        }
        return await operations.insert(data);
      } catch (error) {
        logger.error(`IPC db:${entityName}:insert error:`, error);
        throw error;
      }
    },

    [`db:${entityName}:update`]: async (
      event: IpcMainInvokeEvent,
      id: string,
      data: TUpdate
    ): Promise<DatabaseOperationResult> => {
      try {
        if (licenseEnforcement) {
          licenseEnforcement.ensureAllowed(Operation.WriteData);
        }
        if (!dbManager || !dbManager.isInitialized()) {
          throw new Error('Database not initialized');
        }
        if (!id || typeof id !== 'string') {
          throw new Error('Invalid ID provided');
        }
        if (!data || typeof data !== 'object') {
          throw new Error('Invalid data provided');
        }
        return await operations.update(id, data);
      } catch (error) {
        logger.error(`IPC db:${entityName}:update error:`, error);
        throw error;
      }
    },

    [`db:${entityName}:delete`]: async (
      event: IpcMainInvokeEvent,
      id: string
    ): Promise<DatabaseOperationResult> => {
      try {
        if (licenseEnforcement) {
          licenseEnforcement.ensureAllowed(Operation.WriteData);
        }
        if (!dbManager || !dbManager.isInitialized()) {
          throw new Error('Database not initialized');
        }
        if (!id || typeof id !== 'string') {
          throw new Error('Invalid ID provided');
        }
        return await operations.delete(id);
      } catch (error) {
        logger.error(`IPC db:${entityName}:delete error:`, error);
        throw error;
      }
    },
  };
}

/**
 * Create IPC handlers for transaction operations (with additional getByBrokerId/getByCustomerId)
 */
export function createTransactionCRUDHandlers<T, TInsert, TUpdate>(
  entityName: string,
  operations: TransactionCRUDOperations<T, TInsert, TUpdate>
): Record<string, IPCHandler> {
  const baseHandlers = createCRUDHandlers(entityName, operations);

  // Add transaction-specific handlers
  const transactionHandlers: Record<string, (event: IpcMainInvokeEvent, ...args: any[]) => Promise<any>> = {};

  if (operations.getByBrokerId) {
    transactionHandlers[`db:${entityName}:getByBrokerId`] = async (event: IpcMainInvokeEvent, brokerId: string): Promise<T[]> => {
      try {
        if (!dbManager || !dbManager.isInitialized()) {
          throw new Error('Database not initialized');
        }
        if (!brokerId || typeof brokerId !== 'string') {
          throw new Error('Invalid broker ID provided');
        }
        return await operations.getByBrokerId!(brokerId);
      } catch (error) {
        logger.error(`IPC db:${entityName}:getByBrokerId error:`, error);
        throw error;
      }
    };
  }

  if (operations.getByCustomerId) {
    transactionHandlers[`db:${entityName}:getByCustomerId`] = async (event: IpcMainInvokeEvent, customerId: string): Promise<T[]> => {
      try {
        if (!dbManager || !dbManager.isInitialized()) {
          throw new Error('Database not initialized');
        }
        if (!customerId || typeof customerId !== 'string') {
          throw new Error('Invalid customer ID provided');
        }
        return await operations.getByCustomerId!(customerId);
      } catch (error) {
        logger.error(`IPC db:${entityName}:getByCustomerId error:`, error);
        throw error;
      }
    };
  }

  return { ...baseHandlers, ...transactionHandlers };
}

/**
 * Create IPC handlers for leisure operations (with additional getByBrokerId/getByCustomerId)
 */
export function createLeisureCRUDHandlers<T, TInsert, TUpdate>(
  entityName: string,
  operations: LeisureCRUDOperations<T, TInsert, TUpdate>
): Record<string, IPCHandler> {
  const baseHandlers = createCRUDHandlers(entityName, operations);

  // Add leisure-specific handlers
  const leisureHandlers: Record<string, (event: IpcMainInvokeEvent, ...args: any[]) => Promise<any>> = {};

  if (operations.getByBrokerId) {
    leisureHandlers[`db:${entityName}:getByBrokerId`] = async (event: IpcMainInvokeEvent, brokerId: string): Promise<T[]> => {
      try {
        if (!dbManager || !dbManager.isInitialized()) {
          throw new Error('Database not initialized');
        }
        if (!brokerId || typeof brokerId !== 'string') {
          throw new Error('Invalid broker ID provided');
        }
        return await operations.getByBrokerId!(brokerId);
      } catch (error) {
        logger.error(`IPC db:${entityName}:getByBrokerId error:`, error);
        throw error;
      }
    };
  }

  if (operations.getByCustomerId) {
    leisureHandlers[`db:${entityName}:getByCustomerId`] = async (event: IpcMainInvokeEvent, customerId: string): Promise<T[]> => {
      try {
        if (!dbManager || !dbManager.isInitialized()) {
          throw new Error('Database not initialized');
        }
        if (!customerId || typeof customerId !== 'string') {
          throw new Error('Invalid customer ID provided');
        }
        return await operations.getByCustomerId!(customerId);
      } catch (error) {
        logger.error(`IPC db:${entityName}:getByCustomerId error:`, error);
        throw error;
      }
    };
  }

  return { ...baseHandlers, ...leisureHandlers };
}

// ===========================================
// SPECIALIZED HANDLERS
// ===========================================

/**
 * Create specialized handlers for database statistics
 */
export function createStatsHandlers(): Record<string, IPCHandler> {
  return {
    'db:getStats': async (): Promise<DatabaseManagerStats> => {
      try {
        if (!dbManager || !dbManager.isInitialized()) {
          throw new Error('Database not initialized');
        }
        return dbManager.getStats();
      } catch (error) {
        logger.error('IPC db:getStats error:', error);
        throw error;
      }
    },

    'db:getDatabaseStats': async (): Promise<DatabaseStats> => {
      try {
        if (!dbManager || !dbManager.isInitialized()) {
          throw new Error('Database not initialized');
        }
        // Import and call getDatabaseStats from operations
        const { getDatabaseStats } = await import('../database/operations');
        return await getDatabaseStats();
      } catch (error) {
        logger.error('IPC db:getDatabaseStats error:', error);
        throw error;
      }
    },

    'db:updateBrokerTotals': async (event: IpcMainInvokeEvent, brokerId: string): Promise<void> => {
      try {
        if (licenseEnforcement) {
          licenseEnforcement.ensureAllowed(Operation.WriteData);
        }
        if (!dbManager || !dbManager.isInitialized()) {
          throw new Error('Database not initialized');
        }
        if (!brokerId || typeof brokerId !== 'string') {
          throw new Error('Invalid broker ID provided');
        }
        const { updateBrokerTotals } = await import('../database/operations');
        return await updateBrokerTotals(brokerId);
      } catch (error) {
        console.error('IPC db:updateBrokerTotals error:', error);
        throw error;
      }
    },

    'db:updateCustomerTotals': async (event: IpcMainInvokeEvent, customerId: string): Promise<void> => {
      try {
        if (licenseEnforcement) {
          licenseEnforcement.ensureAllowed(Operation.WriteData);
        }
        if (!dbManager || !dbManager.isInitialized()) {
          throw new Error('Database not initialized');
        }
        if (!customerId || typeof customerId !== 'string') {
          throw new Error('Invalid customer ID provided');
        }
        const { updateCustomerTotals } = await import('../database/operations');
        return await updateCustomerTotals(customerId);
      } catch (error) {
        console.error('IPC db:updateCustomerTotals error:', error);
        throw error;
      }
    },

    'db:analyzeBrokerTransactionDeletion': async (event: IpcMainInvokeEvent, transactionId: string): Promise<any> => {
      try {
        if (!dbManager || !dbManager.isInitialized()) {
          throw new Error('Database not initialized');
        }
        if (!transactionId || typeof transactionId !== 'string') {
          throw new Error('Invalid transaction ID provided');
        }
        const { analyzeBrokerTransactionDeletion } = await import('../database/operations');
        return await analyzeBrokerTransactionDeletion(transactionId);
      } catch (error) {
        logger.error('IPC db:analyzeBrokerTransactionDeletion error:', error);
        throw error;
      }
    },

    'db:analyzeCustomerTransactionDeletion': async (event: IpcMainInvokeEvent, transactionId: string): Promise<any> => {
      try {
        if (!dbManager || !dbManager.isInitialized()) {
          throw new Error('Database not initialized');
        }
        if (!transactionId || typeof transactionId !== 'string') {
          throw new Error('Invalid transaction ID provided');
        }
        const { analyzeCustomerTransactionDeletion } = await import('../database/operations');
        return await analyzeCustomerTransactionDeletion(transactionId);
      } catch (error) {
        logger.error('IPC db:analyzeCustomerTransactionDeletion error:', error);
        throw error;
      }
    },

    'db:analyzeBrokerLeisureDeletion': async (event: IpcMainInvokeEvent, leisureId: string): Promise<any> => {
      try {
        if (!dbManager || !dbManager.isInitialized()) {
          throw new Error('Database not initialized');
        }
        if (!leisureId || typeof leisureId !== 'string') {
          throw new Error('Invalid leisure ID provided');
        }
        const { analyzeBrokerLeisureDeletion } = await import('../database/operations');
        return await analyzeBrokerLeisureDeletion(leisureId);
      } catch (error) {
        logger.error('IPC db:analyzeBrokerLeisureDeletion error:', error);
        throw error;
      }
    },

    'db:analyzeCustomerLeisureDeletion': async (event: IpcMainInvokeEvent, leisureId: string): Promise<any> => {
      try {
        if (!dbManager || !dbManager.isInitialized()) {
          throw new Error('Database not initialized');
        }
        if (!leisureId || typeof leisureId !== 'string') {
          throw new Error('Invalid leisure ID provided');
        }
        const { analyzeCustomerLeisureDeletion } = await import('../database/operations');
        return await analyzeCustomerLeisureDeletion(leisureId);
      } catch (error) {
        logger.error('IPC db:analyzeCustomerLeisureDeletion error:', error);
        throw error;
      }
    },

    'db:analyzeProductDeletion': async (event: IpcMainInvokeEvent, productId: string): Promise<any> => {
      try {
        if (!dbManager || !dbManager.isInitialized()) {
          throw new Error('Database not initialized');
        }
        if (!productId || typeof productId !== 'string') {
          throw new Error('Invalid product ID provided');
        }
        const { analyzeProductDeletion } = await import('../database/operations');
        return await analyzeProductDeletion(productId);
      } catch (error) {
        logger.error('IPC db:analyzeProductDeletion error:', error);
        throw error;
      }
    },

    'db:analyzeManufacturerDeletion': async (event: IpcMainInvokeEvent, manufacturerId: string): Promise<any> => {
      try {
        if (!dbManager || !dbManager.isInitialized()) {
          throw new Error('Database not initialized');
        }
        if (!manufacturerId || typeof manufacturerId !== 'string') {
          throw new Error('Invalid manufacturer ID provided');
        }
        const { analyzeManufacturerDeletion } = await import('../database/operations');
        return await analyzeManufacturerDeletion(manufacturerId);
      } catch (error) {
        logger.error('IPC db:analyzeManufacturerDeletion error:', error);
        throw error;
      }
    },

    'db:analyzeBrokerDeletion': async (event: IpcMainInvokeEvent, brokerId: string): Promise<any> => {
      try {
        if (!dbManager || !dbManager.isInitialized()) {
          throw new Error('Database not initialized');
        }
        if (!brokerId || typeof brokerId !== 'string') {
          throw new Error('Invalid broker ID provided');
        }
        const { analyzeBrokerDeletion } = await import('../database/operations');
        return await analyzeBrokerDeletion(brokerId);
      } catch (error) {
        logger.error('IPC db:analyzeBrokerDeletion error:', error);
        throw error;
      }
    },

    'db:analyzeCustomerDeletion': async (event: IpcMainInvokeEvent, customerId: string): Promise<any> => {
      try {
        if (!dbManager || !dbManager.isInitialized()) {
          throw new Error('Database not initialized');
        }
        if (!customerId || typeof customerId !== 'string') {
          throw new Error('Invalid customer ID provided');
        }
        const { analyzeCustomerDeletion } = await import('../database/operations');
        return await analyzeCustomerDeletion(customerId);
      } catch (error) {
        console.error('IPC db:analyzeCustomerDeletion error:', error);
        throw error;
      }
    },

    // Migration handlers removed - migrations are obsolete after database reset

    'db:resetDatabase': async (event: IpcMainInvokeEvent, secret: string): Promise<void> => {
      try {
        requireAuth(secret);
        if (licenseEnforcement) {
          licenseEnforcement.ensureAllowed(Operation.WriteData);
        }
        if (!dbManager) {
          throw new Error('Database manager not available');
        }
        await dbManager.resetDatabase();
        console.log('✅ Database reset completed via IPC');

        // Relaunch the app to ensure clean state
        console.log('🔄 Relaunching app after database reset...');
        app.relaunch();
        app.exit(0);
      } catch (error) {
        console.error('IPC db:resetDatabase error:', error);
        throw error;
      }
    },
    
    'db:seedDatabase': async (event: IpcMainInvokeEvent, secret: string) => {
      try {
        requireAuth(secret);
        return await seedSampleData();
      } catch (error) {
        console.error('IPC db:seedDatabase error:', error);
        throw error;
      }
    },

    'db:openDatabaseFolder': async (): Promise<void> => {
      try {
        const { shell } = await import('electron');
        const userDataPath = app.getPath('userData');
        await shell.openPath(userDataPath);
        console.log('✅ Database folder opened:', userDataPath);
      } catch (error) {
        console.error('IPC db:openDatabaseFolder error:', error);
        throw error;
      }
    },

    'app:reloadWindow': async (): Promise<void> => {
      try {
        const { BrowserWindow } = await import('electron');
        const focusedWindow = BrowserWindow.getFocusedWindow();
        if (focusedWindow) {
          focusedWindow.reload();
          console.log('✅ Window reloaded via IPC');
        } else {
          console.warn('No focused window found to reload');
        }
      } catch (error) {
        console.error('IPC app:reloadWindow error:', error);
        throw error;
      }
    },

    'db:executeRawQuery': async (event: IpcMainInvokeEvent, query: string, secret: string): Promise<any[]> => {
      try {
        requireAuth(secret);
        if (!dbManager || !dbManager.isInitialized()) {
          throw new Error('Database not initialized');
        }
        if (!query || typeof query !== 'string') {
          throw new Error('Invalid query provided');
        }

        // Basic security check - only allow SELECT queries for safety
        const trimmedQuery = query.trim().toUpperCase();
        if (!trimmedQuery.startsWith('SELECT')) {
          throw new Error('Only SELECT queries are allowed for raw database access');
        }

        return new Promise((resolve, reject) => {
          const db = dbManager.getDatabase();
          db.all(query, (err, rows) => {
            if (err) {
              reject(err);
            } else {
              resolve(rows || []);
            }
          });
        });
      } catch (error) {
        console.error('IPC db:executeRawQuery error:', error);
        throw error;
      }
    },

    // Backup system handlers
    'db:backup:create': async (): Promise<{ success: boolean; path: string; metadata: any }> => {
      try {
        if (licenseEnforcement) {
          licenseEnforcement.ensureAllowed(Operation.RunBackup);
        }
        if (!dbManager || !dbManager.isInitialized()) {
          throw new Error('Database not initialized');
        }
        return await dbManager.createBackup('manual');
      } catch (error) {
        console.error('IPC db:backup:create error:', error);
        throw error;
      }
    },

    'db:backup:list': async (event: IpcMainInvokeEvent, directory?: string): Promise<any[]> => {
      try {
        if (!dbManager || !dbManager.isInitialized()) {
          throw new Error('Database not initialized');
        }
        return await dbManager.getBackupList(directory);
      } catch (error) {
        console.error('IPC db:backup:list error:', error);
        throw error;
      }
    },

    'license:refresh': async () => {
      try {
        if (!licenseManager) {
          throw new Error('License manager not available');
        }
        const status = await licenseManager.validateLicense();
        if (status.valid && restartSchedulerCallback) {
          await restartSchedulerCallback();
        }
        return status;
      } catch (error) {
        console.error('IPC license:refresh error:', error);
        throw error;
      }
    },

    'db:backup:openFolder': async (): Promise<void> => {
      try {
        const { shell } = await import('electron');
        const { backupSettingsOperations } = await import('../database/operations');
        const settings = await backupSettingsOperations.get();
        let backupPath = settings?.backup_location;
        
        if (!backupPath) {
          backupPath = path.join(app.getPath('userData'), 'backups');
        }
        
        // Ensure directory exists before trying to open it
        const fsSync = await import('fs');
        if (!fsSync.existsSync(backupPath)) {
            await fs.mkdir(backupPath, { recursive: true });
        }
        
        await shell.openPath(backupPath);
        logger.info(`✅ Backup folder opened: ${backupPath}`);
      } catch (error) {
        console.error('IPC db:backup:openFolder error:', error);
        throw error;
      }
    },

    'db:backup:validate': async (event: IpcMainInvokeEvent, path: string): Promise<{ valid: boolean; details: any }> => {
      try {
        if (!dbManager || !dbManager.isInitialized()) {
          throw new Error('Database not initialized');
        }
        if (!path || typeof path !== 'string') {
          throw new Error('Invalid path provided');
        }
        return await dbManager.validateBackup(path);
      } catch (error) {
        console.error('IPC db:backup:validate error:', error);
        throw error;
      }
    },

    // Restore is a sensitive write operation
    'db:backup:restore': async (event: IpcMainInvokeEvent, path: string): Promise<{ success: boolean; errors: string[] }> => {
      try {
        if (licenseEnforcement) {
          licenseEnforcement.ensureAllowed(Operation.WriteData);
        }
        if (!dbManager || !dbManager.isInitialized()) {
          throw new Error('Database not initialized');
        }
        if (!path || typeof path !== 'string') {
          throw new Error('Invalid path provided');
        }
        const result = await dbManager.restoreBackup(path);
        
        if (result.success) {
          console.log('✅ Database restore completed via IPC');
          console.log('🔄 Relaunching app after database restore...');
          app.relaunch();
          app.exit(0);
        }
        
        return result;
      } catch (error) {
        console.error('IPC db:backup:restore error:', error);
        throw error;
      }
    },

    'db:backup:getSettings': async (): Promise<any> => {
      try {
        // Import backup settings operations
        const { backupSettingsOperations } = await import('../database/operations');
        return await backupSettingsOperations.get();
      } catch (error) {
        console.error('IPC db:backup:getSettings error:', error);
        throw error;
      }
    },

    'db:backup:updateSettings': async (event: IpcMainInvokeEvent, settings: any): Promise<any> => {
      try {
        if (licenseEnforcement) {
          licenseEnforcement.ensureAllowed(Operation.WriteData);
        }
        // Import backup settings operations
        const { backupSettingsOperations } = await import('../database/operations');

        const result = await backupSettingsOperations.update({
          auto_backup_enabled: settings.auto_backup_enabled || 1,
          backup_frequency: settings.backup_frequency || 'weekly',
          backup_location: settings.backup_location || ''
        });

        // Update the backup scheduler if it's running
        try {
          const backupScheduler = (global as any).backupScheduler;
          if (backupScheduler && backupScheduler.updateSettings) {
            backupScheduler.updateSettings({
              enabled: Boolean(settings.auto_backup_enabled),
              frequency: settings.backup_frequency || 'weekly',
              location: settings.backup_location || backupScheduler.getSettings().location
            });
          }
        } catch (schedulerError) {
          console.warn('Failed to update backup scheduler:', schedulerError);
        }

        return result;
      } catch (error) {
        console.error('IPC db:backup:updateSettings error:', error);
        throw error;
      }
    },

    'dialog:showOpenDialog': async (event: IpcMainInvokeEvent, options: any): Promise<any> => {
      try {
        const { dialog } = await import('electron');
        return dialog.showOpenDialog(options);
      } catch (error) {
        console.error('IPC dialog:showOpenDialog error:', error);
        throw error;
      }
    },

    'license:getStatus': async () => {
      if (!licenseManager) {
        throw new Error('License manager not initialized');
      }

      const status = licenseManager.getStatus();
      if (status) {
        return status;
      }

      return licenseManager.validateLicense();
    },

    'license:validate': async () => {
      if (!licenseManager) {
        throw new Error('License manager not initialized');
      }

      return licenseManager.validateLicense();
    },

    'license:activate-online': async (
      event: IpcMainInvokeEvent,
      payload: { activationKey: string; customerName?: string; customerPhone?: string }
    ) => {
      if (!licenseManager) {
        throw new Error('License manager not initialized');
      }
      const { activationKey, customerName, customerPhone } = payload || {};
      if (!activationKey || typeof activationKey !== 'string') {
        throw new Error('Activation key is required');
      }

      const { getDeviceFingerprint } = await import('../services/deviceFingerprint');
      const os = await import('os');
      const deviceFingerprint = getDeviceFingerprint();
      const hostname = os.hostname();

      const baseUrl = process.env.SCALEERP_API_URL || process.env.VITE_API_URL || 'http://localhost:3000';

      try {
        const res = await fetch(`${baseUrl}/api/v1/licensing/activate`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            activationKey: activationKey.trim().toUpperCase(),
            deviceFingerprint,
            hostname,
            customerName: customerName?.trim() || '',
            customerPhone: customerPhone?.trim() || '',
          }),
        });

        const data = await res.json();
        if (!res.ok || !data.success || !data.licenseBlob) {
          return {
            success: false,
            message: data.message || 'Activation failed on licensing server.',
          };
        }

        const importResult = await licenseManager.importLicense(data.licenseBlob);
        if (!importResult.valid) {
          return {
            success: false,
            message: importResult.reason || 'Cryptographic verification failed for received license.',
          };
        }

        if (restartSchedulerCallback) {
          await restartSchedulerCallback();
        }

        return {
          success: true,
          edition: data.edition || importResult.payload?.edition,
          validUntil: data.validUntil || importResult.payload?.valid_until,
          licenseStatus: importResult,
        };
      } catch (err: any) {
        logger.error('license:activate-online network error:', err);
        return {
          success: false,
          message: err.message || 'Failed to reach licensing authority server. Ensure ScaleERP Web is accessible or check your internet connection.',
        };
      }
    },

    'license:import': async (event: IpcMainInvokeEvent, blob: string) => {
      if (!licenseManager) {
        throw new Error('License manager not initialized');
      }
      if (!blob || typeof blob !== 'string') {
        throw new Error('Invalid license blob provided');
      }

      const result = await licenseManager.importLicense(blob);
      if (result.valid && restartSchedulerCallback) {
        await restartSchedulerCallback();
      }
      return result;
    },

    'license:getDeviceFingerprint': async () => {
      if (!licenseManager) {
        throw new Error('License manager not initialized');
      }

      return licenseManager.getDeviceFingerprint();
    },

    // Reads a license file from disk and returns its contents as a string.
    // Used by the LicenseActivation page for file-based license import.
    'read-license-file': async (event: IpcMainInvokeEvent, filePath: string): Promise<string> => {
      try {
        // Security: resolve and validate the file path to prevent path traversal
        const path = await import('path');
        const resolvedPath = path.resolve(filePath);
        // Only allow reading of files with license-related extensions
        const allowedExtensions = ['.json', '.lic', '.license', '.txt', '.key'];
        const ext = path.extname(resolvedPath).toLowerCase();
        if (!allowedExtensions.includes(ext)) {
          throw new Error(`File type not allowed: ${ext}. Allowed types: ${allowedExtensions.join(', ')}`);
        }
        return await fs.readFile(resolvedPath, 'utf-8');
      } catch (error) {
        console.error('read-license-file error:', error);
        throw new Error(`Failed to read license file: ${error instanceof Error ? error.message : 'unknown error'}`);
      }
    },

    // License scheduler handlers
    'license:scheduler:state': async () => {
      if (!licenseScheduler) {
        return { running: false, reason: 'Scheduler not initialized' };
      }
      return { running: licenseScheduler.isRunning() };
    },

    'license:scheduler:force-check': async () => {
      if (!licenseScheduler) {
        throw new Error('License scheduler not initialized');
      }
      return licenseScheduler.forceCheck();
    },

    // Returns recent license events for the active license.
    'license:getEventHistory': async () => {
      try {
        const { getActiveLicense, getLicenseEvents } = await import('../database/licenseOperations');
        const activeLicense = await getActiveLicense();
        if (!activeLicense) {
          return { events: [], licenseId: null };
        }
        const events = await getLicenseEvents(activeLicense.license_id, 100);
        return { events, licenseId: activeLicense.license_id };
      } catch (error) {
        console.error('license:getEventHistory error:', error);
        return { events: [], licenseId: null, error: error instanceof Error ? error.message : 'unknown' };
      }
    },

    // Returns recent heartbeat entries.
    'license:getHeartbeats': async () => {
      try {
        const { getRecentHeartbeats } = await import('../database/licenseOperations');
        const heartbeats = await getRecentHeartbeats(100);
        return { heartbeats };
      } catch (error) {
        console.error('license:getHeartbeats error:', error);
        return { heartbeats: [], error: error instanceof Error ? error.message : 'unknown' };
      }
    },

    // Developer-only: directly update license fields in the database.
    // WARNING: Changes are NOT cryptographically signed. For testing/debugging only.
    'license:admin:update': async (event: IpcMainInvokeEvent, fields: {
      license_id?: string;
      valid_from?: string;
      valid_until?: string;
      maintenance_until?: string;
      edition?: string;
      grace_until?: string | null;
      grace_mode?: string;
    }, secret: string) => {
      try {
        requireAuth(secret);
        const { getActiveLicense, getLicenseById, updateLicenseFields, logLicenseEvent } = await import('../database/licenseOperations');
        
        // Priority for targeting:
        // 1. Explicit license_id in fields
        // 2. Currently loaded license in licenseManager
        // 3. Fallback to getActiveLicense()
        let targetId = fields.license_id;
        
        if (!targetId && licenseManager) {
          const status = licenseManager.getStatus();
          targetId = status?.payload?.license_id;
        }

        let targetRecord;
        if (targetId) {
          targetRecord = await getLicenseById(targetId);
        } else {
          targetRecord = await getActiveLicense();
        }

        if (!targetRecord) {
          return { success: false, error: 'No license found to update' };
        }

        const updateData: Record<string, string | null> = {};

        // Sync valid_until if valid_from is changed to keep UI display consistent with anniversary logic
        if (fields.valid_from) {
          updateData.valid_from = fields.valid_from;
          const fromDate = new Date(fields.valid_from);
          if (!Number.isNaN(fromDate.getTime())) {
            const syncedUntil = new Date(fromDate.getTime() + 365 * 24 * 60 * 60 * 1000);
            updateData.valid_until = syncedUntil.toISOString();
          }
        } else if (fields.valid_until) {
          updateData.valid_until = fields.valid_until;
        }

        if (fields.maintenance_until) updateData.maintenance_until = fields.maintenance_until;
        if (fields.edition) updateData.edition = fields.edition;
        if (fields.grace_until !== undefined) updateData.grace_until = fields.grace_until;
        if (fields.grace_mode) updateData.grace_mode = fields.grace_mode;

        if (Object.keys(updateData).length === 0) {
          return { success: false, error: 'No fields to update' };
        }

        await updateLicenseFields(targetRecord.license_id, updateData);
        await logLicenseEvent(targetRecord.license_id, 'admin_override', { fields: updateData });

        // Invalidate cached status so next getStatus() re-reads from DB
        if (licenseManager) {
          (licenseManager as any).cachedStatus = null;
        }
        if (restartSchedulerCallback) {
          await restartSchedulerCallback();
        }
        return { success: true, targetId: targetRecord.license_id };
      } catch (error) {
        logger.error('license:admin:update error:', error);
        return { success: false, error: error instanceof Error ? error.message : 'unknown' };
      }
    },

    'license:admin:clear-tamper': async (event: IpcMainInvokeEvent, licenseId: string | undefined, secret: string) => {
      try {
        requireAuth(secret);
        const { getActiveLicense, clearFutureHeartbeats, logLicenseEvent } = await import('../database/licenseOperations');
        
        let targetId = licenseId;
        if (!targetId && licenseManager) {
          const status = licenseManager.getStatus();
          targetId = status?.payload?.license_id;
        }

        if (!targetId) {
          const active = await getActiveLicense();
          targetId = active?.license_id;
        }

        if (!targetId) {
          return { success: false, error: 'No license found to clear tamper state' };
        }

        await clearFutureHeartbeats(targetId);
        await logLicenseEvent(targetId, 'admin_clear_tamper', { timestamp: new Date().toISOString() });

        if (licenseManager) {
          (licenseManager as any).cachedStatus = null;
        }
        if (restartSchedulerCallback) {
          await restartSchedulerCallback();
        }

        return { success: true };
      } catch (error) {
        logger.error('license:admin:clear-tamper error:', error);
        return { success: false, error: error instanceof Error ? error.message : 'unknown' };
      }
    },

    // Returns the raw license blob for the active license (for display/copy purposes).
    'license:getBlob': async () => {
      try {
        const { getActiveLicense, getLicenseById } = await import('../database/licenseOperations');
        
        let targetId: string | undefined;
        if (licenseManager) {
          const status = licenseManager.getStatus();
          targetId = status?.payload?.license_id;
        }

        const activeLicense = targetId 
          ? await getLicenseById(targetId)
          : await getActiveLicense();

        if (!activeLicense) {
          return { blob: null, licenseId: null };
        }
        return { blob: activeLicense.license_blob, licenseId: activeLicense.license_id };
      } catch (error) {
        logger.error('license:getBlob error:', error);
        return { blob: null, licenseId: null, error: error instanceof Error ? error.message : 'unknown' };
      }
    },

    // Opens the userData directory where license.lic is stored.
    // This is the correct location for the license file in both dev and production.
    'license:open-keys-folder': async () => {
      try {
        const { shell } = await import('electron');
        const userDataPath = app.getPath('userData');
        await shell.openPath(userDataPath);
        logger.info('License folder opened');
      } catch (error) {
        logger.error('license:open-keys-folder error:', error);
        throw new Error(`Failed to open license folder: ${error instanceof Error ? error.message : 'unknown error'}`);
      }
    },

    'dev:generate-license': async (event: IpcMainInvokeEvent, input: {
      customerId?: string;
      customerName?: string;
      customerEmail?: string;
      customerCompany?: string;
      edition?: 'Basic' | 'Pro' | 'Enterprise';
      validFrom?: string;
      validUntil?: string;
      durationDays?: number;
      maintenanceDays?: number;
      bindToCurrentDevice?: boolean;
      licenseType?: string;
      customDeviceFingerprint?: string | null;
      privateKeyPem?: string;
    }, secret: string) => {
      try {
        requireAuth(secret);
        const fs = await import('fs');
        const path = await import('path');
        const crypto = await import('crypto');
        const { signLicense } = await import('../services/cryptoUtils');
        const { getDeviceFingerprint } = await import('../services/deviceFingerprint');
        const { saveLicense, upsertLicenseCustomer } = await import('../database/licenseOperations');

        const keyId = process.env.LICENSE_SIGNING_KEY_ID || 'key_001';
        
        let privateKeyPem = input?.privateKeyPem || process.env.LICENSE_SIGNING_PRIVATE_KEY_PEM;
        if (!privateKeyPem) {
          try {
            privateKeyPem = fs.readFileSync(path.join(process.cwd(), 'vendor', 'keys', 'private_key.pem'), 'utf8');
          } catch (e) {
            return {
              success: false,
              error: 'Private key is missing or could not be read. If running in a packaged build, please paste the private key PEM directly in the form.'
            };
          }
        }

        const nowIso = new Date().toISOString();
        const validFromIso = input?.validFrom || nowIso;
        const durationDays = Number.isFinite(Number(input?.durationDays)) ? Number(input?.durationDays) : 365;
        const maintenanceDays = Number.isFinite(Number(input?.maintenanceDays)) ? Number(input?.maintenanceDays) : 90;

        const validFromDate = new Date(validFromIso);
        if (Number.isNaN(validFromDate.getTime())) {
          return { success: false, error: 'Invalid validFrom date' };
        }

        const validUntilIso = input?.validUntil || new Date(
          validFromDate.getTime() + durationDays * 24 * 60 * 60 * 1000
        ).toISOString();

        const maintenanceUntilIso = new Date(
          validFromDate.getTime() + maintenanceDays * 24 * 60 * 60 * 1000
        ).toISOString();

        const customerId = (input?.customerId || 'customer-dev').trim();
        const customerName = (input?.customerName || customerId).trim();
        const licenseId = `lic_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;

        let deviceFingerprintVal: string | null = null;
        if (input && 'customDeviceFingerprint' in input) {
          deviceFingerprintVal = input.customDeviceFingerprint || null;
        } else {
          deviceFingerprintVal = input?.bindToCurrentDevice === false ? null : getDeviceFingerprint();
        }

        const payload = {
          license_id: licenseId,
          customer_id: customerId,
          edition: (input?.edition || 'Pro') as 'Basic' | 'Pro' | 'Enterprise',
          license_type: input?.licenseType || 'subscription',
          valid_from: validFromIso,
          valid_until: validUntilIso,
          maintenance_until: maintenanceUntilIso,
          device_fingerprint: deviceFingerprintVal,
          features: { inventory: true, reports: true },
        };

        const blob = signLicense(payload as Record<string, unknown>, privateKeyPem, keyId);

        await upsertLicenseCustomer({
          customer_id: customerId,
          name: customerName,
          email: input?.customerEmail || null,
          company: input?.customerCompany || null,
          status: 'active',
        });

        await saveLicense({
          license_id: licenseId,
          customer_id: customerId,
          status: 'active',
          edition: payload.edition,
          valid_from: payload.valid_from,
          valid_until: payload.valid_until,
          maintenance_until: payload.maintenance_until,
          device_fingerprint: payload.device_fingerprint,
          license_blob: blob,
          grace_until: null,
          grace_mode: null,
        });

        return { success: true, blob, payload };
      } catch (error) {
        console.error('dev:generate-license error:', error);
        return { success: false, error: error instanceof Error ? error.message : 'unknown' };
      }
    },

    'dev:authenticate-secret': async (event: IpcMainInvokeEvent, secret: string) => {
      try {
        const isValid = validateDeveloperSecret(secret);
        return { success: isValid };
      } catch (error) {
        console.error('dev:authenticate-secret error:', error);
        return { success: false, error: 'Internal validation error' };
      }
    },

    'dev:create-user': async (event: IpcMainInvokeEvent, input: {
      username?: string;
      password?: string;
      licenseId?: string;
      maxFailedAttempts?: number;
    }, secret: string) => {
      try {
        requireAuth(secret);
        if (licenseEnforcement) {
          licenseEnforcement.ensureAllowed(Operation.ManageUsers);
        }
        const { hashPassword } = await import('../services/passwordHasher');
        const { createUser, getUserByUsername, getAllUsers, updateUserPassword } = await import('../database/userOperations');
        const { getActiveLicense } = await import('../database/licenseOperations');

        const username = (input?.username || '').trim();
        const password = input?.password || '';
        if (!username || !password) {
          return { success: false, error: 'Username and password are required' };
        }

        const existing = await getUserByUsername(username);
        if (existing) {
          return { success: false, error: 'Username already exists' };
        }

        const activeLicense = await getActiveLicense();
        const licenseId = (input?.licenseId || activeLicense?.license_id || '').trim();
        if (!licenseId) {
          return { success: false, error: 'No license ID provided and no active license available' };
        }

        const userId = `usr_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
        const passwordHash = await hashPassword(password);

        await createUser({
          user_id: userId,
          username,
          password_hash: passwordHash,
          license_id: licenseId,
          max_failed_attempts: Number.isFinite(Number(input?.maxFailedAttempts))
            ? Number(input?.maxFailedAttempts)
            : 5,
        });

        return {
          success: true,
          userId,
          username,
          licenseId,
          message: 'User account created successfully',
        };
      } catch (error) {
        console.error('dev:create-user error:', error);
        return { success: false, error: error instanceof Error ? error.message : 'unknown' };
      }
    },

    'dev:get-users': async (event: IpcMainInvokeEvent, secret: string) => {
      try {
        requireAuth(secret);
        const { getAllUsers } = await import('../database/userOperations');
        const users = await getAllUsers();
        return { success: true, users };
      } catch (error) {
        console.error('dev:get-users error:', error);
        return { success: false, error: error instanceof Error ? error.message : 'unknown' };
      }
    },

    'dev:reset-user-password': async (event: IpcMainInvokeEvent, input: { username: string; newPassword: string }, secret: string) => {
      try {
        requireAuth(secret);
        if (licenseEnforcement) {
          licenseEnforcement.ensureAllowed(Operation.ManageUsers);
        }
        const { hashPassword } = await import('../services/passwordHasher');
        const { getUserByUsername, updateUserPassword } = await import('../database/userOperations');

        const username = input.username?.trim();
        const newPassword = input.newPassword;

        if (!username || !newPassword) {
          throw new Error('Username and new password are required');
        }

        const user = await getUserByUsername(username);
        if (!user) {
          throw new Error(`User "${username}" not found`);
        }

        const passwordHash = await hashPassword(newPassword);
        await updateUserPassword(user.user_id, passwordHash);

        return { success: true, message: `Password for user "${username}" has been reset successfully.` };
      } catch (error) {
        console.error('dev:reset-user-password error:', error);
        return { success: false, error: error instanceof Error ? error.message : 'unknown' };
      }
    },

    'dev:generate-reset-code': async (event: IpcMainInvokeEvent, input: { challengeBlob?: string }, secret: string) => {
      try {
        requireAuth(secret);
        if (licenseEnforcement) {
          licenseEnforcement.ensureAllowed(Operation.ManageUsers);
        }
        if (!passwordResetService) {
          throw new Error('Password reset service not initialized');
        }

        const challengeBlob = input?.challengeBlob?.trim();
        if (!challengeBlob) {
          return { success: false, error: 'Challenge blob is required' };
        }

        const challengePayload = await passwordResetService.verifyResetChallengeBlob(challengeBlob);
        const resetCodeBlob = await passwordResetService.generateSignedResetCode(challengePayload);

        return { success: true, resetCodeBlob };
      } catch (error) {
        console.error('dev:generate-reset-code error:', error);
        return { success: false, error: error instanceof Error ? error.message : 'unknown' };
      }
    },

    'auth:has-users': async () => {
      try {
        const { getAllUsers } = await import('../database/userOperations');
        const users = await getAllUsers();
        return { hasUsers: users && users.length > 0, count: users ? users.length : 0 };
      } catch (err: any) {
        logger.error('auth:has-users error:', err);
        return { hasUsers: false, count: 0, error: err.message };
      }
    },

    'auth:setup-initial-admin': async (
      event: IpcMainInvokeEvent,
      payload: { username?: string; password: string; fullName?: string }
    ) => {
      try {
        const { getAllUsers, createUser } = await import('../database/userOperations');
        const existingUsers = await getAllUsers();
        if (existingUsers && existingUsers.length > 0) {
          return {
            success: false,
            message: 'Initial administrator setup is only permitted when no database users exist.',
          };
        }

        const username = (payload?.username || 'admin').trim().toLowerCase();
        const password = payload?.password;
        if (!password || password.length < 4) {
          return {
            success: false,
            message: 'Administrator password must be at least 4 characters.',
          };
        }

        let licenseId = 'default-license';
        if (licenseManager) {
          const status = licenseManager.getStatus();
          if (status?.payload?.license_id) {
            licenseId = status.payload.license_id;
          }
        }

        const { hashPassword } = await import('../services/passwordHasher');
        const crypto = await import('crypto');
        const passwordHash = await hashPassword(password);
        const userId = crypto.randomUUID();

        await createUser({
          user_id: userId,
          username,
          password_hash: passwordHash,
          license_id: licenseId,
          max_failed_attempts: 5,
        });

        if (!authService) {
          throw new Error('Auth service not initialized');
        }

        const loginResult = await authService.login(username, password);

        return {
          success: true,
          user: loginResult.user,
          message: 'Administrator account configured successfully.',
        };
      } catch (err: any) {
        logger.error('auth:setup-initial-admin error:', err);
        return {
          success: false,
          message: err.message || 'Failed to configure initial administrator account.',
        };
      }
    },

    'auth:login': async (event: IpcMainInvokeEvent, username: string, password: string) => {
      if (!authService) {
        throw new Error('Auth service not initialized');
      }
      return authService.login(username, password);
    },

    'auth:logout': async () => {
      if (!authService) {
        throw new Error('Auth service not initialized');
      }
      return authService.logout();
    },

    'auth:session-check': async () => {
      if (!authService) {
        throw new Error('Auth service not initialized');
      }
      return authService.checkSession();
    },

    'auth:change-password': async (
      event: IpcMainInvokeEvent,
      username: string,
      currentPassword: string,
      newPassword: string
    ) => {
      if (licenseEnforcement) {
        licenseEnforcement.ensureAllowed(Operation.WriteData);
      }
      if (!authService) {
        throw new Error('Auth service not initialized');
      }
      return authService.changePassword(username, currentPassword, newPassword);
    },

    'auth:lockout-status': async (event: IpcMainInvokeEvent, username: string) => {
      if (!authService) {
        throw new Error('Auth service not initialized');
      }
      return authService.getLockoutStatus(username);
    },

    'auth:request-reset': async (event: IpcMainInvokeEvent, username: string) => {
      if (!passwordResetService) {
        throw new Error('Password reset service not initialized');
      }
      return passwordResetService.generateResetChallenge(username);
    },

    'auth:verify-reset-code': async (event: IpcMainInvokeEvent, resetCodeBlob: string) => {
      if (!passwordResetService) {
        throw new Error('Password reset service not initialized');
      }
      if (!resetCodeBlob || typeof resetCodeBlob !== 'string') {
        throw new Error('Invalid reset code blob');
      }

      return passwordResetService.verifyResetCode(resetCodeBlob);
    },

    // Note: auth:perform-reset is NOT blocked by WriteData enforcement
    // as it must work even when the license is expired/invalid/grace (Section 9.6)
    'auth:perform-reset': async (event: IpcMainInvokeEvent, resetCodeBlob: string, newPassword: string) => {
      if (!passwordResetService) {
        throw new Error('Password reset service not initialized');
      }
      await passwordResetService.verifyAndApplyResetCode(resetCodeBlob, newPassword);
      return { success: true, message: 'Password reset successfully' };
    },
  };
}

// ===========================================
// HANDLER REGISTRATION
// ===========================================

/**
 * Register all IPC handlers with Electron
 */
export async function registerIPCHandlers(): Promise<void> {
  try {
    // Import database operations
    const {
      products,
      brokers,
      customers,
      brokerTransactions,
      customerTransactions,
      brokerLeisures,
      customerLeisures,
      stockHistory,
      productManufacturers,
      brokerTransactionProducts,
      customerTransactionProducts,
      businessSettings,
      productsFts,
      brokersFts,
      customersFts,
      productStockSummary,
      brokerTransactionSummary,
      customerTransactionSummary,
    } = await import('../database/operations');

    // Create all handlers
    const allHandlers = {
      // Basic CRUD entities
      ...createCRUDHandlers('products', products as any),
      // Override products delete handler with archive/unarchive
      'db:products:archive': async (event: IpcMainInvokeEvent, id: string) => {
        try {
          if (licenseEnforcement) {
            licenseEnforcement.ensureAllowed(Operation.WriteData);
          }
          if (!dbManager || !dbManager.isInitialized()) {
            throw new Error('Database not initialized');
          }
          if (!id || typeof id !== 'string') {
            throw new Error('Invalid ID provided');
          }
          return await products.archive(id);
        } catch (error) {
          console.error('IPC db:products:archive error:', error);
          throw error;
        }
      },
      'db:products:unarchive': async (event: IpcMainInvokeEvent, id: string) => {
        try {
          if (licenseEnforcement) {
            licenseEnforcement.ensureAllowed(Operation.WriteData);
          }
          if (!dbManager || !dbManager.isInitialized()) {
            throw new Error('Database not initialized');
          }
          if (!id || typeof id !== 'string') {
            throw new Error('Invalid ID provided');
          }
          return await products.unarchive(id);
        } catch (error) {
          console.error('IPC db:products:unarchive error:', error);
          throw error;
        }
      },
      'db:products:getArchived': async () => {
        try {
          if (!dbManager || !dbManager.isInitialized()) {
            throw new Error('Database not initialized');
          }
          return await products.getArchived();
        } catch (error) {
          console.error('IPC db:products:getArchived error:', error);
          throw error;
        }
      },

      ...createCRUDHandlers('brokers', brokers as any),
      ...createCRUDHandlers('customers', customers as any),

      // Stock history entity
      ...createCRUDHandlers('stockHistory', stockHistory as any),
      // Stock history specific handlers
      'db:stockHistory:getByProductId': async (event: IpcMainInvokeEvent, productId: string) => {
        try {
          if (!dbManager || !dbManager.isInitialized()) {
            throw new Error('Database not initialized');
          }
          if (!productId || typeof productId !== 'string') {
            throw new Error('Invalid product ID provided');
          }
          return await stockHistory.getByProductId(productId);
        } catch (error) {
          console.error('IPC db:stockHistory:getByProductId error:', error);
          throw error;
        }
      },
      'db:stockHistory:getByDateRange': async (event: IpcMainInvokeEvent, startDate: string, endDate: string) => {
        try {
          if (!dbManager || !dbManager.isInitialized()) {
            throw new Error('Database not initialized');
          }
          if (!startDate || !endDate || typeof startDate !== 'string' || typeof endDate !== 'string') {
            throw new Error('Invalid date range provided');
          }
          return await stockHistory.getByDateRange(startDate, endDate);
        } catch (error) {
          console.error('IPC db:stockHistory:getByDateRange error:', error);
          throw error;
        }
      },

      // Product manufacturers entity
      ...createCRUDHandlers('productManufacturers', productManufacturers as any),
      // Product manufacturers specific handlers
      'db:productManufacturers:getByProductId': async (event: IpcMainInvokeEvent, productId: string) => {
        try {
          if (!dbManager || !dbManager.isInitialized()) {
            throw new Error('Database not initialized');
          }
          if (!productId || typeof productId !== 'string') {
            throw new Error('Invalid product ID provided');
          }
          return await productManufacturers.getByProductId(productId);
        } catch (error) {
          console.error('IPC db:productManufacturers:getByProductId error:', error);
          throw error;
        }
      },
      // Product manufacturers archive handlers
      'db:productManufacturers:archive': async (event: IpcMainInvokeEvent, manufacturerId: string) => {
        try {
          if (licenseEnforcement) {
            licenseEnforcement.ensureAllowed(Operation.WriteData);
          }
          if (!dbManager || !dbManager.isInitialized()) {
            throw new Error('Database not initialized');
          }
          if (!manufacturerId || typeof manufacturerId !== 'string') {
            throw new Error('Invalid manufacturer ID provided');
          }
          return await productManufacturers.archive(manufacturerId);
        } catch (error) {
          console.error('IPC db:productManufacturers:archive error:', error);
          throw error;
        }
      },
      'db:productManufacturers:unarchive': async (event: IpcMainInvokeEvent, manufacturerId: string) => {
        try {
          if (licenseEnforcement) {
            licenseEnforcement.ensureAllowed(Operation.WriteData);
          }
          if (!dbManager || !dbManager.isInitialized()) {
            throw new Error('Database not initialized');
          }
          if (!manufacturerId || typeof manufacturerId !== 'string') {
            throw new Error('Invalid manufacturer ID provided');
          }
          return await productManufacturers.unarchive(manufacturerId);
        } catch (error) {
          console.error('IPC db:productManufacturers:unarchive error:', error);
          throw error;
        }
      },
      'db:productManufacturers:getArchived': async () => {
        try {
          if (!dbManager || !dbManager.isInitialized()) {
            throw new Error('Database not initialized');
          }
          return await productManufacturers.getArchived();
        } catch (error) {
          console.error('IPC db:productManufacturers:getArchived error:', error);
          throw error;
        }
      },

      // Transaction entities (with getByBrokerId/getByCustomerId)
      ...createTransactionCRUDHandlers('brokerTransactions', brokerTransactions as any),
      ...createTransactionCRUDHandlers('customerTransactions', customerTransactions as any),

      // Leisure entities (with getByBrokerId/getByCustomerId)
      ...createLeisureCRUDHandlers('brokerLeisures', brokerLeisures as any),
      ...createLeisureCRUDHandlers('customerLeisures', customerLeisures as any),

      // Transaction product tables
      ...createCRUDHandlers('brokerTransactionProducts', brokerTransactionProducts as any),
      ...createCRUDHandlers('customerTransactionProducts', customerTransactionProducts as any),

      // Settings tables
      ...createCRUDHandlers('businessSettings', businessSettings as any),

      // Full-text search tables (read-only)
      ...createCRUDHandlers('productsFts', productsFts as any),
      ...createCRUDHandlers('brokersFts', brokersFts as any),
      ...createCRUDHandlers('customersFts', customersFts as any),

      // Database views (read-only)
      ...createCRUDHandlers('productStockSummary', productStockSummary as any),
      ...createCRUDHandlers('brokerTransactionSummary', brokerTransactionSummary as any),
      ...createCRUDHandlers('customerTransactionSummary', customerTransactionSummary as any),

    // Stats handlers
    ...createStatsHandlers(),
    
    // WhatsApp Presets handlers
    ...createCRUDHandlers('whatsappPresets', whatsappPresets as any),

    // Google Drive Cloud Backup handlers
    'google-drive:login': async () => {
      return await googleDriveService.login();
    },
    'google-drive:logout': async () => {
      return await googleDriveService.logout();
    },
    'google-drive:getStatus': async () => {
      return await googleDriveService.getStatus();
    },
    'google-drive:processQueue': async () => {
      return await googleDriveService.processQueue();
    },
    'google-drive:toggleItemStatus': async (event: IpcMainInvokeEvent, filePath: string) => {
      return await googleDriveService.toggleItemStatus(filePath);
    },

    // ===========================================
    // SYSTEM & EXPORT HANDLERS
    // ===========================================

    'system:copyFileToClipboard': async (event: IpcMainInvokeEvent, absolutePath: string) => {
      try {
        if (!absolutePath || typeof absolutePath !== 'string') {
          throw new Error('Invalid file path provided');
        }

        // Validate that the file exists
        const { existsSync } = await import('fs');
        if (!existsSync(absolutePath)) {
          throw new Error(`File does not exist: ${absolutePath}`);
        }

        // On Windows, use PowerShell to copy the file object to the clipboard
        // This allows Ctrl+V to attach the file in WhatsApp Desktop/Web
        if (process.platform === 'win32') {
          const command = `powershell.exe -Command "Set-Clipboard -Path '${absolutePath}'"`;
          await execAsync(command);
          logger.info(`✅ File copied to clipboard via PowerShell: ${absolutePath}`);
          return { success: true };
        } else {
          // Fallback or handle other platforms if needed
          const { clipboard } = await import('electron');
          clipboard.writeText(absolutePath);
          return { success: true, warning: 'Only path string copied on non-Windows platform' };
        }
      } catch (error) {
        logger.error('IPC system:copyFileToClipboard error:', error);
        throw error;
      }
    },

    'system:saveAsset': async (event: IpcMainInvokeEvent, base64Data: string, fileName: string, subFolder: string = 'branding') => {
      try {
        if (!base64Data || typeof base64Data !== 'string') {
          throw new Error('Invalid base64 data provided');
        }
        if (!fileName || typeof fileName !== 'string') {
          throw new Error('Invalid file name provided');
        }
        const userDataPath = app.getPath('userData');
        const targetDir = path.join(userDataPath, 'assets', subFolder);
        
        const fsSync = await import('fs');
        if (!fsSync.existsSync(targetDir)) {
          await fs.mkdir(targetDir, { recursive: true });
        }
        
        // Strip out the data URI prefix e.g. "data:image/webp;base64,"
        const matches = base64Data.match(/^data:([A-Za-z-+/]+);base64,(.+)$/);
        let buffer: Buffer;
        if (matches && matches.length === 3) {
          buffer = Buffer.from(matches[2], 'base64');
        } else {
          buffer = Buffer.from(base64Data, 'base64');
        }
        
        // Sanitize file name to avoid directory traversal
        const safeFileName = path.basename(fileName);
        const absolutePath = path.join(targetDir, safeFileName);
        
        await fs.writeFile(absolutePath, buffer);
        logger.info(`✅ Asset saved successfully: ${absolutePath}`);
        return { success: true, path: absolutePath };
      } catch (error) {
        logger.error('IPC system:saveAsset error:', error);
        return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
      }
    },

    'system:deleteAsset': async (event: IpcMainInvokeEvent, absolutePath: string) => {
      try {
        if (!absolutePath || typeof absolutePath !== 'string') {
          throw new Error('Invalid file path provided');
        }
        const fsSync = await import('fs');
        if (fsSync.existsSync(absolutePath)) {
          await fs.unlink(absolutePath);
          logger.info(`✅ Asset deleted successfully: ${absolutePath}`);
        }
        return { success: true };
      } catch (error) {
        logger.error('IPC system:deleteAsset error:', error);
        return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
      }
    },

    'system:readAssetAsBase64': async (event: IpcMainInvokeEvent, absolutePath: string) => {
      try {
        if (!absolutePath || typeof absolutePath !== 'string') {
          throw new Error('Invalid file path provided');
        }
        const fsSync = await import('fs');
        if (!fsSync.existsSync(absolutePath)) {
          return { success: false, error: 'File does not exist' };
        }
        const buffer = await fs.readFile(absolutePath);
        // Determine mime type from extension
        const ext = path.extname(absolutePath).toLowerCase();
        let mime = 'image/png';
        if (ext === '.jpg' || ext === '.jpeg') mime = 'image/jpeg';
        else if (ext === '.webp') mime = 'image/webp';
        else if (ext === '.svg') mime = 'image/svg+xml';
        
        const dataUrl = `data:${mime};base64,${buffer.toString('base64')}`;
        return { success: true, dataUrl };
      } catch (error) {
        logger.error('IPC system:readAssetAsBase64 error:', error);
        return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
      }
    },

    'export:printToPDF': async (event: IpcMainInvokeEvent, fileName: string, subFolder: string) => {
      try {
        const { BrowserWindow } = await import('electron');
        const focusedWindow = BrowserWindow.getFocusedWindow();
        
        if (!focusedWindow) {
          throw new Error('No active window found for PDF generation');
        }

        // Construct path: Downloads/ScaleERP/Invoices/{subFolder}/{fileName}
        const downloadsPath = app.getPath('downloads');
        const baseDir = path.join(downloadsPath, 'ScaleERP', 'Invoices', subFolder);
        
        // Ensure directory exists
        const fsSync = await import('fs');
        if (!fsSync.existsSync(baseDir)) {
          await fs.mkdir(baseDir, { recursive: true });
        }

        const finalFileName = fileName.endsWith('.pdf') ? fileName : `${fileName}.pdf`;
        const absolutePath = path.join(baseDir, finalFileName);

        // PDF Options for professional look
        const options = {
          margins: {
            top: 0,
            bottom: 0,
            left: 0,
            right: 0
          },
          pageSize: 'A4' as const,
          printBackground: true,
          displayHeaderFooter: false
        };

        const data = await focusedWindow.webContents.printToPDF(options);
        await fs.writeFile(absolutePath, data);

        logger.info(`✅ PDF generated successfully: ${absolutePath}`);
        return { success: true, path: absolutePath };
      } catch (error) {
        logger.error('IPC export:printToPDF error:', error);
        throw error;
      }
    },

    'open-external': async (event: IpcMainInvokeEvent, url: string) => {
      try {
        const { shell } = await import('electron');
        await shell.openExternal(url);
        return { success: true };
      } catch (error) {
        logger.error('IPC open-external error:', error);
        throw error;
      }
    },

    'get-app-version': async () => {
      return app.getVersion();
    },
  };

    // Use standard CRUD handlers for brokers and customers (no special window reload)

    // Register all handlers
    Object.entries(allHandlers).forEach(([channel, handler]) => {
      ipcMain.handle(channel as DatabaseIPCChannels, handler);
    });

    logger.info(`Registered ${Object.keys(allHandlers).length} IPC handlers`);
  } catch (error) {
    logger.error('Failed to register IPC handlers:', error);
    throw error;
  }
}
