import * as fs from 'fs';
import * as path from 'path';
import AdmZip from 'adm-zip';
import { createHash } from 'crypto';
import sqlite3 from 'sqlite3';
import { logger } from '../services/logger';

export interface BackupMetadata {
  timestamp: Date;
  version: string;
  size: number;
  integrityCheck: boolean;
  checksum: string;
  sourceVersion: string;
}

export interface BackupListItem extends BackupMetadata {
  path: string;
  cloudStatus?: 'not_enqueued' | 'pending' | 'uploading' | 'completed' | 'failed';
}

/**
 * Backup Operations Class
 * Specialized operations for SQLite database backup and file management
 */
export class BackupOperations {
  /**
   * Create a binary copy of the database file.
   * This is much safer than SQL dumps for SQLite as it preserves all indexes, triggers, and WAL state.
   */
  static async createBinaryCopy(sourcePath: string, destinationPath: string, db: sqlite3.Database): Promise<void> {
    logger.info(`Starting binary database backup: ${sourcePath} -> ${destinationPath}`);
    
    return new Promise((resolve, reject) => {
      // First, we must checkpoint the WAL to ensure the main .db file is up to date
      db.run('PRAGMA wal_checkpoint(PASSIVE)', (err) => {
        if (err) {
          logger.warn('WAL checkpoint failed before binary copy, backup might be slightly stale:', err);
        }
        
        try {
          // Perform a safe file copy
          fs.copyFileSync(sourcePath, destinationPath);
          logger.info('Binary database copy completed');
          resolve();
        } catch (copyErr) {
          reject(new Error(`Failed to copy database file: ${copyErr instanceof Error ? copyErr.message : 'Unknown error'}`));
        }
      });
    });
  }

  /**
   * Compress database binary and metadata to ZIP file
   */
  static async compressToZIP(dbFilePath: string, metadata: BackupMetadata, tempDir: string): Promise<string> {
    logger.info(`Compressing binary database to ZIP. Size: ${metadata.size} bytes`);
    const zip = new AdmZip();

    // Add the binary database file
    zip.addLocalFile(dbFilePath, '', 'inventory.db');

    // Convert metadata to JSON
    const metadataJson = JSON.stringify(metadata, null, 2);
    zip.addFile('metadata.json', Buffer.from(metadataJson, 'utf-8'));

    // Generate timestamp-based filename
    const timestamp = metadata.timestamp.toISOString().replace(/[:.]/g, '-');
    const zipPath = path.join(tempDir, `scaleerp-backup-${timestamp}.zip`);

    // Write ZIP file
    zip.writeZip(zipPath);

    return zipPath;
  }

  /**
   * Extract ZIP file and parse contents
   */
  static async extractFromZIP(zipPath: string, extractToDir: string): Promise<{ dbFilePath: string; metadata: BackupMetadata }> {
    logger.info(`Extracting database from ZIP: ${zipPath}`);
    try {
      const zip = new AdmZip(zipPath);
      const zipEntries = zip.getEntries();

      let metadata: BackupMetadata | null = null;
      let dbFound = false;

      // Extract all files to the target directory
      zip.extractAllTo(extractToDir, true);

      const dbFilePath = path.join(extractToDir, 'inventory.db');
      const metadataPath = path.join(extractToDir, 'metadata.json');

      if (fs.existsSync(dbFilePath)) {
        dbFound = true;
      }

      if (fs.existsSync(metadataPath)) {
        const metadataJson = fs.readFileSync(metadataPath, 'utf-8');
        metadata = JSON.parse(metadataJson) as BackupMetadata;
        metadata.timestamp = new Date(metadata.timestamp);
      }

      if (!metadata) {
        throw new Error('Backup metadata not found in ZIP file');
      }

      if (!dbFound) {
        throw new Error('Database binary not found in ZIP file');
      }

      return { dbFilePath, metadata };
    } catch (error: any) {
      throw new Error(`Failed to extract ZIP file: ${error.message}`);
    }
  }

  /**
   * Read only the metadata from a backup ZIP without extracting the database
   */
  static async getMetadataOnly(zipPath: string): Promise<BackupMetadata> {
    try {
      const zip = new AdmZip(zipPath);
      const metadataEntry = zip.getEntry('metadata.json');

      if (!metadataEntry) {
        throw new Error('Backup metadata not found in ZIP file');
      }

      const metadataJson = zip.readAsText(metadataEntry);
      const metadata = JSON.parse(metadataJson) as BackupMetadata;
      metadata.timestamp = new Date(metadata.timestamp);

      return metadata;
    } catch (error: any) {
      throw new Error(`Failed to read backup metadata: ${error.message}`);
    }
  }

  /**
   * Checkpoint WAL mode for consistency
   */
  static async checkpointWAL(db: sqlite3.Database): Promise<void> {
    return new Promise((resolve, reject) => {
      db.run('PRAGMA wal_checkpoint(PASSIVE)', (err) => {
        if (err) {
          reject(new Error(`WAL checkpoint failed: ${err.message}`));
        } else {
          resolve();
        }
      });
    });
  }

  /**
   * Calculate SHA-256 checksum of file
   */
  static async calculateChecksum(filePath: string): Promise<string> {
    return new Promise((resolve, reject) => {
      const hash = createHash('sha256');
      const stream = fs.createReadStream(filePath);

      stream.on('data', (chunk) => {
        hash.update(chunk);
      });

      stream.on('end', () => {
        resolve(hash.digest('hex'));
      });

      stream.on('error', (err) => {
        reject(new Error(`Checksum calculation failed: ${err.message}`));
      });
    });
  }

  /**
   * Run integrity check on database
   */
  static async runIntegrityCheck(db: sqlite3.Database): Promise<boolean> {
    logger.info('Running database integrity check');
    return new Promise((resolve, reject) => {
      db.get('PRAGMA integrity_check', (err, row: any) => {
        if (err) {
          reject(new Error(`Integrity check failed: ${err.message}`));
        } else {
          const result = row ? (row['integrity_check'] as string) : 'failed';
          resolve(result === 'ok');
        }
      });
    });
  }

  /**
   * Get database file size
   */
  static async getDatabaseSize(dbPath: string): Promise<number> {
    try {
      const stats = await fs.promises.stat(dbPath);
      return stats.size;
    } catch (error: any) {
      throw new Error(`Failed to get database size: ${error.message}`);
    }
  }
}
