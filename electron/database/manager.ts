import sqlite3 from 'sqlite3';
import * as nodePath from 'path';
import * as fs from 'fs';
import { app } from 'electron';
import { BackupOperations, BackupMetadata, BackupListItem } from './backupOps';
import { v4 as uuidv4 } from 'uuid';
import { logger } from '../services/logger';

// Database Manager Stats Interface
export interface DatabaseManagerStats {
  initialized: boolean;
  dbPath: string;
}

// Database Manager Class for Electron main process
export class DatabaseManager {
  private db: sqlite3.Database | null = null;
  private dbPath: string;
  private initialized: boolean = false;

  constructor() {
    // Database will be stored in userData directory
    // Multi-environment safety: fallback for scripts/testing
    let userDataPath: string;
    try {
      userDataPath = app.getPath('userData');
    } catch (e) {
      userDataPath = process.cwd();
    }
    this.dbPath = nodePath.join(userDataPath, 'inventory.db');
  }

  /**
   * Initialize the database connection and run schema
   */
  public async initialize(): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        try {
          const userDataPath = app?.getPath?.('userData');
          if (userDataPath) {
            this.dbPath = nodePath.join(userDataPath, 'inventory.db');
          }
        } catch (e) {
          // Keep constructor value if app.getPath fails
        }

        // Create database directory if it doesn't exist
        const dbDir = nodePath.dirname(this.dbPath);
        if (!fs.existsSync(dbDir)) {
          fs.mkdirSync(dbDir, { recursive: true });
        }

        // Open database connection
        this.db = new sqlite3.Database(this.dbPath, (err) => {
          if (err) {
            logger.error('Failed to open database:', err);
            reject(err);
            return;
          }

          // Enable WAL mode and other optimizations
          this.db!.run('PRAGMA journal_mode = WAL');
          this.db!.run('PRAGMA synchronous = NORMAL');
          this.db!.run('PRAGMA cache_size = 10000');
          this.db!.run('PRAGMA temp_store = MEMORY');
          this.db!.run('PRAGMA foreign_keys = ON');

          // Run the schema
          this.runSchema()
            .then(() => this.runMigrations())
            .then(() => {
              this.initialized = true;
              logger.info('Database initialized successfully');
              resolve();
            })
            .catch(reject);
        });

      } catch (error) {
        logger.error('Failed to initialize database:', error);
        reject(error);
      }
    });
  }

  /**
   * Connect to database without running schema (for restore operations)
   */
  private async connectOnly(): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        // Create database directory if it doesn't exist
        const dbDir = nodePath.dirname(this.dbPath);
        if (!fs.existsSync(dbDir)) {
          fs.mkdirSync(dbDir, { recursive: true });
        }

        // Open database connection
        this.db = new sqlite3.Database(this.dbPath, (err) => {
          if (err) {
            logger.error('Failed to open database (connectOnly):', err);
            reject(err);
            return;
          }

          // Enable WAL mode and other optimizations
          this.db!.run('PRAGMA journal_mode = WAL');
          this.db!.run('PRAGMA synchronous = NORMAL');
          this.db!.run('PRAGMA cache_size = 10000');
          this.db!.run('PRAGMA temp_store = MEMORY');
          this.db!.run('PRAGMA foreign_keys = ON');

          // Only set this.db, don't run schema or set initialized flag
          logger.info('Database connected (no schema)');
          resolve();
        });
      } catch (error) {
        logger.error('Failed to connect to database:', error);
        reject(error);
      }
    });
  }

  /**
   * Run the database schema
   */
  private async runSchema(): Promise<void> {
    return new Promise((resolve, reject) => {
      if (!this.db) {
        reject(new Error('Database not initialized'));
        return;
      }

      try {
        // Read and execute schema file
        const schemaPath = nodePath.join(__dirname, 'schema.sql');
        const schemaSQL = fs.readFileSync(schemaPath, 'utf-8');

        // Execute the entire schema at once
        this.db!.exec(schemaSQL, (err) => {
          if (err) {
            logger.error('Error executing schema:', err);
            reject(err);
            return;
          }

          logger.info('Database schema applied successfully');
          resolve();
        });

      } catch (error) {
        logger.error('Failed to run database schema:', error);
        reject(error);
      }
    });
  }

  /**
   * Run non-destructive database migrations for existing SQLite databases
   */
  private async runMigrations(): Promise<void> {
    return new Promise((resolve) => {
      if (!this.db) {
        resolve();
        return;
      }

      const migrations = [
        "ALTER TABLE broker_transactions ADD COLUMN total_brokerage REAL DEFAULT 0;",
        "ALTER TABLE broker_transaction_products ADD COLUMN brokerage_per_unit REAL DEFAULT 0;",
        "ALTER TABLE broker_transaction_products ADD COLUMN brokerage REAL DEFAULT 0;",
        "ALTER TABLE broker_leisures ADD COLUMN brokerage REAL DEFAULT 0;",
        "ALTER TABLE customer_transactions ADD COLUMN labour_charge REAL DEFAULT 0;",
        "ALTER TABLE business_settings ADD COLUMN invoice_whatsapp_template TEXT DEFAULT 'Tax Invoice for {partyName} dated {dateStr}';",
        "ALTER TABLE business_settings ADD COLUMN logo_path TEXT;",
        "ALTER TABLE business_settings ADD COLUMN header_banner_path TEXT;",
        "ALTER TABLE business_settings ADD COLUMN qr_code_path TEXT;",
        "ALTER TABLE business_settings ADD COLUMN default_invoice_template TEXT DEFAULT 'standard_a4';",
        "ALTER TABLE business_settings ADD COLUMN invoice_accent_color TEXT DEFAULT '#2563eb';",
        "ALTER TABLE business_settings ADD COLUMN print_copies INTEGER DEFAULT 1;",
        "ALTER TABLE business_settings ADD COLUMN print_layout_mode TEXT DEFAULT 'single';",
        "ALTER TABLE business_settings ADD COLUMN custom_footer_text TEXT;",
        "DROP VIEW IF EXISTS broker_transaction_summary;",
        "CREATE VIEW broker_transaction_summary AS SELECT bt.id, bt.broker_id, b.name as broker_name, bt.date, bt.time, bt.invoice_number, bt.total_amount, bt.total_brokerage, bt.previous_balance, bt.payment_method, COUNT(btp.id) as product_count, GROUP_CONCAT(p.name || ' (' || btp.units || ' ' || btp.unit_type || ')', ', ') as products FROM broker_transactions bt JOIN brokers b ON bt.broker_id = b.id LEFT JOIN broker_transaction_products btp ON bt.id = btp.transaction_id LEFT JOIN products p ON btp.product_id = p.id GROUP BY bt.id, bt.broker_id, b.name, bt.date, bt.time, bt.invoice_number, bt.total_amount, bt.total_brokerage, bt.previous_balance, bt.payment_method;",
        "DROP VIEW IF EXISTS customer_transaction_summary;",
        "CREATE VIEW customer_transaction_summary AS SELECT ct.id, ct.customer_id, c.name as customer_name, ct.date, ct.time, ct.invoice_number, ct.total_amount, ct.labour_charge, ct.previous_balance, ct.payment_method, COUNT(ctp.id) as product_count, GROUP_CONCAT(p.name || ' (' || ctp.quantity || ' ' || ctp.unit_type || ')', ', ') as products FROM customer_transactions ct LEFT JOIN customers c ON ct.customer_id = c.id LEFT JOIN customer_transaction_products ctp ON ct.id = ctp.transaction_id LEFT JOIN products p ON ctp.product_id = p.id GROUP BY ct.id, ct.customer_id, c.name, ct.date, ct.time, ct.invoice_number, ct.total_amount, ct.labour_charge, ct.previous_balance, ct.payment_method;"
      ];

      const runNext = (index: number) => {
        if (index >= migrations.length) {
          logger.info('Database migrations completed');
          resolve();
          return;
        }
        this.db!.run(migrations[index], () => {
          runNext(index + 1);
        });
      };

      runNext(0);
    });
  }

  /**
   * Get the database instance
   */
  public getDatabase(): sqlite3.Database {
    if (!this.db || !this.initialized) {
      throw new Error('Database not initialized. Call initialize() first.');
    }
    return this.db;
  }

  /**
   * Close the database connection
   */
  public close(): void {
    if (this.db) {
      this.db.close((err) => {
        if (err) {
          logger.error('Error closing database:', err);
        } else {
          logger.info('Database connection closed');
        }
      });
      this.db = null;
      this.initialized = false;
    }
  }

  /**
   * Check if database is initialized
   */
  public isInitialized(): boolean {
    return this.initialized;
  }

  /**
   * Reset the database by deleting all files and reinitializing
   */
  public async resetDatabase(): Promise<void> {
    logger.info("Starting database reset...");

    try {
      // Close existing connection if open
      this.close();

      // Wait a bit for connections to fully close
      await new Promise((resolve) => setTimeout(resolve, 200));

      // Delete all database files (DB, WAL, SHM)
      this.deleteDatabaseFiles();
      logger.info("Database files deleted");

      // Reinitialize the database
      await this.initialize();
      logger.info("Database reset completed successfully");
    } catch (error) {
      logger.error("Database reset failed:", error);
      throw error;
    }
  }

  /**
   * Delete the database file and its associated SQLite temporary files (WAL, SHM)
   */
  private deleteDatabaseFiles(): void {
    const filesToDelete = [
      this.dbPath,
      `${this.dbPath}-wal`,
      `${this.dbPath}-shm`,
      `${this.dbPath}-journal`,
    ];

    for (const file of filesToDelete) {
      if (fs.existsSync(file)) {
        try {
          fs.unlinkSync(file);
          logger.info(`Deleted database file: ${nodePath.basename(file)}`);
        } catch (error) {
          logger.warn(`Failed to delete database file ${file}:`, error);
          // If we can't delete the main file, it's a problem, but temp files might just be already gone
          if (file === this.dbPath) throw error;
        }
      }
    }
  }

  /**
   * Validate database schema against expected structure
   */
  public async validateSchema(): Promise<{ valid: boolean; issues: string[] }> {
    if (!this.db || !this.initialized) {
      throw new Error('Database not initialized');
    }

    const issues: string[] = [];

    try {
      // Check for required tables
      const requiredTables = [
        'products', 'brokers', 'customers',
        'broker_transactions', 'customer_transactions',
        'broker_leisures', 'customer_leisures',
        'stock_history', 'product_manufacturers'
      ];

      for (const table of requiredTables) {
        await new Promise<void>((resolve, reject) => {
          this.db!.get("SELECT name FROM sqlite_master WHERE type='table' AND name=?", [table], (err, row) => {
            if (err) reject(err);
            else if (!row) {
              issues.push(`Missing required table: ${table}`);
            }
            resolve();
          });
        });
      }

      // Check for required columns in transaction tables
      const transactionTables = ['broker_transactions', 'customer_transactions'];
      for (const table of transactionTables) {
        const columns = await new Promise<any[]>((resolve, reject) => {
          this.db!.all(`PRAGMA table_info(${table})`, (err, rows) => {
            if (err) reject(err);
            else resolve(rows);
          });
        });

        const hasPreviousBalance = columns.some(col => col.name === 'previous_balance');
        if (!hasPreviousBalance) {
          issues.push(`Table ${table} missing required column: previous_balance`);
        }
      }

      return { valid: issues.length === 0, issues };
    } catch (error) {
      issues.push(`Schema validation failed: ${error}`);
      return { valid: false, issues };
    }
  }

  /**
   * Get database statistics
   */
  public getStats(): DatabaseManagerStats {
    if (!this.db || !this.initialized) {
      throw new Error('Database not initialized');
    }

    // For sqlite3, we return basic stats
    return {
      initialized: true,
      dbPath: this.dbPath,
      // Note: sqlite3 doesn't provide as detailed stats as better-sqlite3
      // but we can add more stats here if needed
    };
  }

  /**
   * Create a backup of the current database
   */
  public async createBackup(type: 'manual' | 'auto' | 'pre_operation' | 'pre_restore' = 'manual'): Promise<{ success: boolean; path: string; metadata: BackupMetadata }> {
    if (!this.db || !this.initialized) {
      throw new Error('Database not initialized');
    }

    // Get application version
    let appVersion = '0.0.0';
    try {
      appVersion = app.getVersion();
    } catch (e) {
      // Script context
    }

    // Create working directory
    const timestamp = new Date();
    let tempPath: string;
    try {
      tempPath = app.getPath('temp');
    } catch (e) {
      tempPath = process.env.TEMP || process.env.TMP || '/tmp';
    }
    const workingDir = nodePath.join(tempPath, `scaleerp-backup-${timestamp.toISOString().replace(/[:.]/g, '-')}`);

    try {
      await fs.promises.mkdir(workingDir, { recursive: true });

      // Create Binary Copy of the database
      const tempDbPath = nodePath.join(workingDir, 'inventory.db');
      await BackupOperations.createBinaryCopy(this.dbPath, tempDbPath, this.db!);

      // Run integrity check on the live database
      const integrityCheck = await BackupOperations.runIntegrityCheck(this.db!);

      // Get database size
      const dbSize = await BackupOperations.getDatabaseSize(this.dbPath);

      // Calculate checksum on the binary file
      const checksum = await BackupOperations.calculateChecksum(tempDbPath);

      // Create metadata
      const metadata: BackupMetadata = {
        timestamp,
        version: appVersion,
        size: dbSize,
        integrityCheck,
        checksum,
        sourceVersion: appVersion
      };

      // Compress binary .db to ZIP
      const zipPath = await BackupOperations.compressToZIP(tempDbPath, metadata, workingDir);

      // Move to backup location (default to userData/backups)
      let userDataPath: string;
      try {
        userDataPath = app.getPath('userData');
      } catch (e) {
        userDataPath = process.cwd();
      }
      const backupDir = nodePath.join(userDataPath, 'backups');
      await fs.promises.mkdir(backupDir, { recursive: true });

      const finalPath = nodePath.join(backupDir, nodePath.basename(zipPath));
      await fs.promises.rename(zipPath, finalPath);

      // Get frequency type for auto backups
      let frequencyType: 'daily' | 'weekly' | 'monthly' | undefined;
      if (type === 'auto') {
        try {
          const { backupSettingsOperations } = await import('./operations');
          const settings = await backupSettingsOperations.get();
          frequencyType = settings?.backup_frequency as 'daily' | 'weekly' | 'monthly';
        } catch (error) {
          logger.warn('Failed to get backup frequency for logging:', error);
        }
      }

      // Log backup to database
      await this.logBackupToHistory({
        id: uuidv4(),
        timestamp,
        type,
        path: finalPath,
        size: (await fs.promises.stat(finalPath)).size,
        success: true,
        errorMessage: null,
        frequency_type: frequencyType
      });

      logger.info('Backup created successfully');
      return { success: true, path: finalPath, metadata };

    } catch (error: any) {
      // Log failed backup
      await this.logBackupToHistory({
        id: uuidv4(),
        timestamp,
        type,
        path: '',
        size: 0,
        success: false,
        errorMessage: error.message
      });

      logger.error('Backup failed:', error);
      throw error;
    } finally {
      // Clean up temporary files
      try {
        await fs.promises.rm(workingDir, { recursive: true, force: true });
      } catch (cleanupError) {
        logger.warn('Failed to cleanup temp directory:', cleanupError);
      }
    }
  }

  /**
   * Validate a backup file
   */
  public async validateBackup(path: string): Promise<{ valid: boolean; details: any }> {
    try {
      // Create a unique temporary directory for validation
      let tempPath: string;
      try {
        tempPath = app.getPath('temp');
      } catch (e) {
        tempPath = process.env.TEMP || process.env.TMP || '/tmp';
      }
      const validationDir = nodePath.join(tempPath, `validation-${Date.now()}`);
      await fs.promises.mkdir(validationDir, { recursive: true });

      // Extract backup and validate metadata
      const { dbFilePath, metadata } = await BackupOperations.extractFromZIP(path, validationDir);

      // Check integrity (checksum validation)
      const fileStats = await fs.promises.stat(path);
      const actualChecksum = await BackupOperations.calculateChecksum(dbFilePath);

      const isValidChecksum = actualChecksum === metadata.checksum;
      const hasMetadata = !!(metadata && metadata.timestamp && metadata.version);

      // Clean up validation directory
      try {
        await fs.promises.rm(validationDir, { recursive: true, force: true });
      } catch (e) {
        logger.warn('Failed to cleanup validation directory:', e);
      }

      return {
        valid: isValidChecksum && hasMetadata,
        details: {
          path,
          size: fileStats.size,
          checksum: {
            expected: metadata.checksum,
            actual: actualChecksum,
            match: isValidChecksum
          },
          content: {
            hasDatabase: true,
            hasMetadata: true
          },
          metadata
        }
      };
    } catch (error: any) {
      return {
        valid: false,
        details: {
          error: error.message,
          path
        }
      };
    }
  }

  /**
   * Restore from a backup file
   */
  public async restoreBackup(path: string): Promise<{ success: boolean; errors: string[] }> {
    if (!this.db || !this.initialized) {
      throw new Error('Database not initialized');
    }

    const errors: string[] = [];

    try {
      logger.info('Starting binary backup restoration');

      // Create a unique temporary directory for extraction
      let tempPath: string;
      try {
        tempPath = app.getPath('temp');
      } catch (e) {
        tempPath = process.env.TEMP || process.env.TMP || '/tmp';
      }
      const extractionDir = nodePath.join(tempPath, `extraction-${Date.now()}`);
      await fs.promises.mkdir(extractionDir, { recursive: true });

      // Extract backup and validate metadata
      const { dbFilePath, metadata } = await BackupOperations.extractFromZIP(path, extractionDir);

      // 1. Validate Cheksum of extracted binary
      const actualChecksum = await BackupOperations.calculateChecksum(dbFilePath);
      if (actualChecksum !== metadata.checksum) {
        throw new Error('Checksum mismatch after extraction. The backup file might be corrupted.');
      }

      // Create pre-restore backup for safety
      await this.createBackup('pre_restore');
      logger.info('Created pre-restore backup');

      // Close current database connection
      const oldDbPath = this.dbPath;
      this.close();

      // Wait for locks to release
      await new Promise((resolve) => setTimeout(resolve, 500));

      // 2. BACKUP the existing file and PURGE state
      if (fs.existsSync(oldDbPath)) {
        fs.renameSync(oldDbPath, `${oldDbPath}.backup`);
      }

      // Purge WAL/SHM files
      const tempFiles = [`${oldDbPath}-wal`, `${oldDbPath}-shm`, `${oldDbPath}-journal`];
      for (const tempFile of tempFiles) {
        if (fs.existsSync(tempFile)) {
          fs.unlinkSync(tempFile);
        }
      }

      // 3. REPLACING file with binary from backup
      fs.copyFileSync(dbFilePath, oldDbPath);
      logger.info('Database binary file replaced from backup');

      // 4. Reconnect and verify integrity
      await this.initialize();
      const integrityOk = await BackupOperations.runIntegrityCheck(this.db!);
      if (!integrityOk) {
        throw new Error('Post-restore binary integrity check failed');
      }

      // Clean up backup db file and extraction directory
      const backupDbPath = `${oldDbPath}.backup`;
      if (fs.existsSync(backupDbPath)) {
        fs.unlinkSync(backupDbPath);
      }
      
      try {
        await fs.promises.rm(extractionDir, { recursive: true, force: true });
      } catch (e) {
        logger.warn('Failed to cleanup extraction directory:', e);
      }

      logger.info('Backup restored successfully (Binary Mode)');
      return { success: true, errors };

    } catch (error: any) {
      errors.push(error.message);

      // Attempt to restore from pre-restore backup
      try {
        logger.error('Restore failed, rolling back to pre-restore DB file...');
        
        // Close broken DB connection
        this.close();
        
        // Let it close completely
        await new Promise(resolve => setTimeout(resolve, 500));
        
        const backupDbPath = `${this.dbPath}.backup`;
        
        if (fs.existsSync(this.dbPath)) {
          fs.unlinkSync(this.dbPath); // Delete the corrupted newly restored file
        }
        
        if (fs.existsSync(backupDbPath)) {
          fs.renameSync(backupDbPath, this.dbPath); // Restore the old file
          logger.info('Successfully rolled back to original database file');
        }
        
        // Re-establish connection
        await this.initialize();
        
      } catch (fallbackError: any) {
        logger.error('Failed to rollback restore:', fallbackError);
        errors.push(`Failed to rollback from failure: ${fallbackError.message}. Manual intervention required.`);
      }

      return { success: false, errors };
    }
  }

  /**
   * Get list of backup files
   */
  public async getBackupList(directory?: string): Promise<BackupListItem[]> {
    let backupDir = directory;
    if (!backupDir) {
      let userDataPath: string;
      try {
        userDataPath = app.getPath('userData');
      } catch (e) {
        userDataPath = process.cwd();
      }
      backupDir = nodePath.join(userDataPath, 'backups');
    }

    try {
      // Ensure backup directory exists
      await fs.promises.mkdir(backupDir, { recursive: true });

      // Read files
      const files = await fs.promises.readdir(backupDir);
      const backupFiles = files.filter(file => file.endsWith('.zip'));

      const backups: BackupListItem[] = [];

      for (const file of backupFiles) {
        const filePath = nodePath.join(backupDir, file);
        try {
          // Extract only metadata for performance
          const metadata = await BackupOperations.getMetadataOnly(filePath);
          
          // Get cloud sync status from database
          const cloudItem = await new Promise<any>((resolve) => {
            if (!this.db || !this.initialized) {
              resolve(null);
              return;
            }
            this.db.get('SELECT status FROM cloud_storage_queue WHERE file_path = ?', [filePath], (err, row) => {
              if (err) resolve(null);
              else resolve(row);
            });
          });

          backups.push({
            ...metadata,
            path: filePath,
            cloudStatus: cloudItem ? cloudItem.status : 'not_enqueued'
          });
        } catch (error) {
          logger.warn(`Failed to read metadata from backup ${file}:`, error);
        }
      }

      // Sort by timestamp descending
      backups.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());

      return backups;
    } catch (error) {
      logger.error('Failed to get backup list:', error);
      throw error;
    }
  }

  /**
   * Log backup operation to history table
   */
  private async logBackupToHistory(backupRecord: {
    id: string;
    timestamp: Date;
    type: 'auto' | 'manual' | 'pre_operation' | 'pre_restore';
    path: string;
    size: number;
    success: boolean;
    errorMessage: string | null;
    frequency_type?: 'daily' | 'weekly' | 'monthly';
  }): Promise<void> {
    if (!this.db || !this.initialized) {
      return; // Silently skip if DB not ready
    }

    return new Promise((resolve, reject) => {
      const sql = `
        INSERT INTO backup_history (id, timestamp, type, path, size_bytes, success, error_message, frequency_type, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `;

      const params = [
        backupRecord.id,
        backupRecord.timestamp.toISOString(),
        backupRecord.type,
        backupRecord.path,
        backupRecord.size,
        backupRecord.success ? 1 : 0,
        backupRecord.errorMessage,
        backupRecord.frequency_type || null,
        new Date().toISOString()
      ];

      this.db!.run(sql, params, (err) => {
        if (err) {
          logger.warn('Failed to log backup to history:', err);
          // Don't throw - backup succeeded even if logging failed
        }
        resolve();
      });
    });
  }
}

// Create and export database manager instance
export const dbManager = new DatabaseManager();
