import { google } from 'googleapis';
import { app, shell } from 'electron';
import { EventEmitter } from 'events';
import * as path from 'path';
import * as fs from 'fs';
import * as crypto from 'crypto';
import * as http from 'http';
import Store from 'electron-store';
import { PKCE } from '../utils/pkce';
import { loadEnv } from '../utils/env';
import { SecurityService } from './securityService';
import { logger } from './logger';
import { dbManager } from '../database/manager';
import { BackupOperations } from '../database/backupOps';
import { v4 as uuidv4 } from 'uuid';

/**
 * GoogleDriveService
 * Handles OAuth2 with PKCE, token management, and file uploads.
 * Implements a durable queue for offline support.
 */
export class GoogleDriveService {
  private static instance: GoogleDriveService;
  private oauth2Client: any;
  private store: any;
  private codeVerifier: string | null = null;
  private accountEmail: string | null = null;
  private authServer: http.Server | null = null;
  private isLoggingIn = false;
  private initializationPromise: Promise<void> | null = null;
  private events = new EventEmitter();
  
  // Scopes for Google Drive API and User Profile
  private readonly SCOPES = [
    'https://www.googleapis.com/auth/drive.file',
    'https://www.googleapis.com/auth/userinfo.email',
    'https://www.googleapis.com/auth/userinfo.profile',
    'openid'
  ];
  
  // Redirect URI for Desktop App (Standard loopback with port)
  private readonly REDIRECT_URI = 'http://127.0.0.1:42856/';
 
  // Google OAuth Client ID and Secret (loaded securely via environment variables)
  private get CLIENT_ID(): string {
    loadEnv();
    return process.env.GOOGLE_CLIENT_ID || '';
  }

  private get CLIENT_SECRET(): string {
    loadEnv();
    return process.env.GOOGLE_CLIENT_SECRET || '';
  }

  private constructor() {
    loadEnv();
    this.store = new Store({ name: 'google-drive-settings' });
    this.oauth2Client = new google.auth.OAuth2(
      this.CLIENT_ID,
      this.CLIENT_SECRET,
      this.REDIRECT_URI
    );
  }

  /**
   * Initialize the service.
   * MUST be called after app.whenReady() because safeStorage requires it.
   */
  public initialize(): void {
    if (this.initializationPromise) return;

    this.initializationPromise = (async () => {
      try {
        // Load refresh token from safeStorage if it exists
        this.loadToken();

        const settings = await this.getSettings();
        if (settings && settings.account_email) {
          this.accountEmail = settings.account_email;
        }

        // If we have a refresh token, try to refresh the access token to verify the session
        if (this.oauth2Client.credentials.refresh_token) {
          await this.refreshAccessToken();
          logger.info(`Google Drive session verified for: ${this.accountEmail}`);
        }
      } catch (err: any) {
        logger.error('Failed to initialize Google Drive session:', err);
      }
    })();
  }

  public static getInstance(): GoogleDriveService {
    if (!GoogleDriveService.instance) {
      GoogleDriveService.instance = new GoogleDriveService();
    }
    return GoogleDriveService.instance;
  }

  /**
   * Start the OAuth2 login flow
   */
  public async login(): Promise<void> {
    if (this.isLoggingIn) {
      logger.warn('Login already in progress, ignoring duplicate request.');
      return;
    }

    this.isLoggingIn = true;

    try {
      if (!this.CLIENT_ID || !this.CLIENT_SECRET) {
        const errorMsg = 'Google Drive integration is not configured. Please set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET in .env.local.';
        logger.error(errorMsg);
        throw new Error(errorMsg);
      }

      this.oauth2Client = new google.auth.OAuth2(
        this.CLIENT_ID,
        this.CLIENT_SECRET,
        this.REDIRECT_URI
      );

      this.codeVerifier = PKCE.generateVerifier();
      const codeChallenge = PKCE.generateChallenge(this.codeVerifier);

      const authUrl = this.oauth2Client.generateAuthUrl({
        access_type: 'offline',
        scope: this.SCOPES,
        code_challenge: codeChallenge,
        code_challenge_method: 'S256',
        prompt: 'consent',
        redirect_uri: this.REDIRECT_URI
      });

      logger.info(`Generated Google Drive Auth URL: ${authUrl}`);

      // Start a temporary local server to catch the callback
      this.authServer = http.createServer(async (req, res) => {
        try {
          // Ignore favicon requests
          if (req.url === '/favicon.ico') {
            res.writeHead(204);
            res.end();
            return;
          }

          logger.info(`Auth server received request: ${req.url}`);
          const url = new URL(req.url!, `http://${req.headers.host}`);
          const code = url.searchParams.get('code');
          const error = url.searchParams.get('error');

          if (error) {
            logger.error(`Google Drive Auth error from callback: ${error}`);
            res.writeHead(400, { 'Content-Type': 'text/html' });
            res.end(`<h1>Authentication Failed</h1><p>Error: ${error}</p>`);
            this.cleanupAuthServer();
            return;
          }

          if (code) {
            res.writeHead(200, { 'Content-Type': 'text/html' });
            res.end('<h1>Authentication Successful!</h1><p>You can close this window and return to ScaleERP.</p>');
            
            logger.info('Authorization code received, exchanging for tokens...');
            await this.handleCallback(url.toString());
            
            this.cleanupAuthServer();
          } else {
            // If we reach here and it's not a callback, just return 404
            res.writeHead(404);
            res.end();
          }
        } catch (error) {
          logger.error('Error handling auth server request:', error);
          if (!res.headersSent) {
            res.writeHead(500);
            res.end('Internal server error.');
          }
        }
      });

      this.authServer.on('error', (err) => {
        logger.error('Auth server error event:', err);
        this.isLoggingIn = false;
        this.authServer = null;
      });

      this.authServer.listen(42856, '127.0.0.1', () => {
        logger.info('Started temporary auth server on port 42856');
        shell.openExternal(authUrl);
      });

      // Timeout the server after 5 minutes if no response
      setTimeout(() => {
        if (this.isLoggingIn) {
          logger.warn('Auth server timed out after 5 minutes.');
          this.cleanupAuthServer();
        }
      }, 5 * 60 * 1000);

      logger.info('Opening system browser for Google Drive authentication.');
    } catch (error) {
      this.isLoggingIn = false;
      logger.error('Failed to initiate login:', error);
      throw error;
    }
  }

  private cleanupAuthServer(): void {
    if (this.authServer) {
      logger.info('Cleaning up auth server...');
      this.authServer.close();
      this.authServer = null;
    }
    this.isLoggingIn = false;
  }

  /**
   * Handle the authorization code from the redirect URL
   */
  public async handleCallback(url: string): Promise<void> {
    try {
      const parsedUrl = new URL(url);
      const code = parsedUrl.searchParams.get('code');

      if (!code) {
        throw new Error('No authorization code found in redirect URL');
      }

      if (!this.codeVerifier) {
        throw new Error('No PKCE code verifier found. Login must be initiated from the app.');
      }

      const { tokens } = await this.oauth2Client.getToken({
        code,
        codeVerifier: this.codeVerifier,
        redirect_uri: this.REDIRECT_URI
      });

      this.oauth2Client.setCredentials(tokens);

      if (tokens.refresh_token) {
        this.saveToken(tokens.refresh_token);
      }

      // Get user email
      const oauth2 = google.oauth2({ version: 'v2', auth: this.oauth2Client });
      const userInfo = await oauth2.userinfo.get();

      // Check if account has changed to trigger a partial re-sync
      const oldSettings = await this.getSettings();
      const accountChanged = oldSettings.account_email && oldSettings.account_email !== userInfo.data.email;
      
      this.accountEmail = userInfo.data.email || null;

      if (accountChanged) {
        logger.info(`Account changed from ${oldSettings.account_email} to ${this.accountEmail}. Resetting recent backups for re-sync.`);
        await this.resetRecentBackups(5);
      }

      await this.updateSettings({
        account_email: userInfo.data.email,
        auto_upload_enabled: true
      });

      logger.info(`Successfully logged in to Google Drive as ${userInfo.data.email}`);
      
      // Notify listeners
      this.events.emit('auth-success', userInfo.data.email);

      // Cleanup
      this.codeVerifier = null;
    } catch (error: any) {
      logger.error('Failed to handle Google Drive OAuth callback:', error.message || error);
      throw error;
    }
  }

  /**
   * Refresh the access token using the stored refresh token
   */
  private async refreshAccessToken(): Promise<void> {
    try {
      const { credentials } = await this.oauth2Client.refreshAccessToken();
      this.oauth2Client.setCredentials(credentials);
      
      // If a new refresh token is returned, save it
      if (credentials.refresh_token) {
        this.saveToken(credentials.refresh_token);
      }
    } catch (error) {
      logger.error('Failed to refresh Google Drive access token:', error);
      // If refresh fails, we might need to re-authenticate
      this.oauth2Client.setCredentials({});
      throw error;
    }
  }

  /**
   * Logout and clear credentials
   */
  public async logout(): Promise<void> {
    this.oauth2Client.setCredentials({});
    this.accountEmail = null;
    this.store.delete('refresh_token_encrypted');
    await this.updateSettings({
      account_email: '',
      auto_upload_enabled: false,
      folder_id: ''
    });
    logger.info('Logged out from Google Drive');
  }

  /**
   * Get current connection status
   */
  public async getStatus(): Promise<any> {
    if (this.initializationPromise) {
      await this.initializationPromise;
    }
    const settings = await this.getSettings();
    const isEncryptionAvailable = SecurityService.isEncryptionAvailable();
    
    return {
      connected: !!this.oauth2Client.credentials.refresh_token,
      account_email: this.accountEmail || settings.account_email,
      auto_upload_enabled: settings.auto_upload_enabled,
      encryption_available: isEncryptionAvailable,
      storage_encryption_status: settings.storage_encryption_status
    };
  }

  /**
   * Enqueue a file for upload
   */
  public async enqueue(filePath: string): Promise<void> {
    try {
      if (!fs.existsSync(filePath)) {
        logger.error(`File not found for cloud upload: ${filePath}`);
        return;
      }

      const checksum = await BackupOperations.calculateChecksum(filePath);
      const id = uuidv4();

      const db = dbManager.getDatabase();
      await new Promise<void>((resolve, reject) => {
        db.run(
          'INSERT INTO cloud_storage_queue (id, file_path, checksum, status) VALUES (?, ?, ?, ?)',
          [id, filePath, checksum, 'pending'],
          (err) => {
            if (err) reject(err);
            else resolve();
          }
        );
      });

      logger.info(`Backup enqueued for cloud storage: ${path.basename(filePath)}`);
      
      // Attempt immediate upload if online
      this.processQueue();
    } catch (error) {
      logger.error('Failed to enqueue file for cloud storage:', error);
    }
  }

  /**
   * Process the upload queue
   */
  public async processQueue(): Promise<void> {
    if (this.initializationPromise) {
      await this.initializationPromise;
    }
    
    if (!this.accountEmail || !this.oauth2Client.credentials.refresh_token) {
      logger.warn('Cannot process Google Drive queue: Not logged in');
      return;
    }

    logger.info(`Starting Google Drive sync process for: ${this.accountEmail}`);

    try {
      // CRITICAL: Check folder existence BEFORE checking the queue.
      // This ensures that if the folder was deleted, we recreate it and re-queue backups.
      logger.info('Verifying Google Drive backup folder...');
      const folderId = await this.getOrCreateFolder();
      logger.info(`Using backup folder ID: ${folderId}`);

      const db = dbManager.getDatabase();
      logger.info('Checking local database for pending or failed uploads...');
      
      const pendingItems = await new Promise<any[]>((resolve, reject) => {
        db.all(
          'SELECT * FROM cloud_storage_queue WHERE status IN ("pending", "failed") AND (next_retry_at IS NULL OR next_retry_at <= CURRENT_TIMESTAMP) ORDER BY created_at ASC',
          (err, rows) => {
            if (err) reject(err);
            else resolve(rows || []);
          }
        );
      });

      if (pendingItems.length === 0) {
        logger.info('Sync check complete: No pending items found in local database.');
        return;
      }

      logger.info(`Found ${pendingItems.length} items requiring cloud sync.`);

      for (const item of pendingItems) {
        logger.info(`Syncing item ${item.id}: ${path.basename(item.file_path)} (Attempt ${item.attempt_count + 1})`);
        await this.uploadFile(item);
      }
      
      logger.info('Google Drive sync process completed successfully.');
    } catch (error) {
      logger.error('Critical error during Google Drive sync process:', error);
    }
  }

  /**
   * Upload a specific file from the queue
   */
  private async uploadFile(item: any): Promise<void> {
    if (!this.oauth2Client.credentials.refresh_token) {
      logger.warn('Skipping cloud upload: Not logged in to Google Drive');
      return;
    }

    try {
      // Mark as uploading
      await this.updateQueueStatus(item.id, 'uploading');

      // Check for or create folder
      const folderId = await this.getOrCreateFolder();

      const drive = google.drive({ version: 'v3', auth: this.oauth2Client });
      
      const fileMetadata = {
        name: path.basename(item.file_path),
        parents: [folderId]
      };
      
      const media = {
        mimeType: 'application/zip',
        body: fs.createReadStream(item.file_path)
      };

      const response = await drive.files.create({
        requestBody: fileMetadata,
        media: media,
        fields: 'id'
      });

      const driveFileId = response.data.id;
      
      // Mark as completed
      await this.updateQueueStatus(item.id, 'completed', { drive_file_id: driveFileId });
      logger.info(`Cloud upload successful: ${path.basename(item.file_path)} -> ${driveFileId}`);

    } catch (error: any) {
      logger.error(`Cloud upload failed for ${path.basename(item.file_path)}:`, error);
      
      // Calculate next retry (exponential backoff: 2^attempt * 5 minutes)
      const attemptCount = item.attempt_count + 1;
      const backoffMinutes = Math.min(Math.pow(2, attemptCount) * 5, 1440); // Max 1 day
      const nextRetry = new Date();
      nextRetry.setMinutes(nextRetry.getMinutes() + backoffMinutes);

      await this.updateQueueStatus(item.id, 'failed', {
        attempt_count: attemptCount,
        next_retry_at: nextRetry.toISOString(),
        last_error: error.message
      });
      
      // If unauthorized, token might be revoked
      if (error.code === 401 || error.code === 400) {
        logger.warn('Google Drive authorization lost. User re-login required.');
        // We might want to emit an event here for the UI
      }
    }
  }

  /**
   * Get or create the "ScaleERP Backups" folder
   */
  private async getOrCreateFolder(): Promise<string> {
    const settings = await this.getSettings();
    const drive = google.drive({ version: 'v3', auth: this.oauth2Client });

    if (settings.folder_id) {
      try {
        // Verify the folder still exists on Drive
        await drive.files.get({ fileId: settings.folder_id });
        return settings.folder_id;
      } catch (error: any) {
        // If 404, the folder was deleted, so we need to find or create it again
        if (error.code === 404) {
          logger.warn(`Stored folder ID ${settings.folder_id} no longer exists. Searching for replacement...`);
          await this.updateSettings({ folder_id: '' });
        } else {
          throw error;
        }
      }
    }
    
    // Search for existing folder by name
    const response = await drive.files.list({
      q: "name = 'ScaleERP Backups' and mimeType = 'application/vnd.google-apps.folder' and trashed = false",
      fields: 'files(id)',
      spaces: 'drive'
    });

    if (response.data.files && response.data.files.length > 0) {
      const folderId = response.data.files[0].id!;
      await this.updateSettings({ folder_id: folderId });
      logger.info(`Found existing backup folder on Drive: ${folderId}`);
      return folderId;
    }

    // Create new folder
    logger.info('Backup folder not found on Drive. Creating new "ScaleERP Backups" folder...');
    const folderMetadata = {
      name: 'ScaleERP Backups',
      mimeType: 'application/vnd.google-apps.folder'
    };

    const folder = await drive.files.create({
      requestBody: folderMetadata,
      fields: 'id'
    });

    const folderId = folder.data.id!;
    await this.updateSettings({ folder_id: folderId });
    logger.info(`Created new Google Drive folder: ${folderId}. Queueing recent backups.`);
    
    // Reset last 3 backups to ensure the new folder isn't empty
    await this.resetRecentBackups(3);
    
    return folderId;
  }

  /**
   * Token Storage Helpers
   */
  private saveToken(refreshToken: string): void {
    try {
      const encrypted = SecurityService.encryptToBase64(refreshToken);
      this.store.set('refresh_token_encrypted', encrypted);
      
      // Update encryption status in settings
      this.updateSettings({ storage_encryption_status: 'safeStorage' });
    } catch (error) {
      logger.error('Failed to securely save refresh token:', error);
      // We don't fallback to plain text silently
      this.updateSettings({ storage_encryption_status: 'failed' });
      throw error;
    }
  }

  private loadToken(): void {
    try {
      const encrypted = this.store.get('refresh_token_encrypted') as string;
      if (encrypted) {
        const refreshToken = SecurityService.decryptFromBase64(encrypted);
        this.oauth2Client.setCredentials({ refresh_token: refreshToken });
        logger.info('Successfully loaded encrypted refresh token from store');
      } else {
        logger.info('No refresh token found in store');
      }
    } catch (error) {
      logger.error('Failed to decrypt refresh token. It might be corrupted or system keyring unavailable.', error);
    }
  }

  /**
   * Database Helpers for Settings and Queue
   */
  private async getSettings(): Promise<any> {
    const db = dbManager.getDatabase();
    return new Promise((resolve, reject) => {
      db.get('SELECT * FROM cloud_storage_settings WHERE id = 1', (err, row) => {
        if (err) reject(err);
        else resolve(row || {});
      });
    });
  }

  private async updateSettings(settings: any): Promise<void> {
    const db = dbManager.getDatabase();
    const current = await this.getSettings();
    const updated = { ...current, ...settings };

    return new Promise((resolve, reject) => {
      db.run(
        'UPDATE cloud_storage_settings SET folder_id = ?, account_email = ?, auto_upload_enabled = ?, storage_encryption_status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = 1',
        [updated.folder_id, updated.account_email, updated.auto_upload_enabled ? 1 : 0, updated.storage_encryption_status],
        (err) => {
          if (err) reject(err);
          else resolve();
        }
      );
    });
  }

  private async updateQueueStatus(id: string, status: string, extra: any = {}): Promise<void> {
    const db = dbManager.getDatabase();
    const sets = [`status = ?`];
    const params = [status];

    if (extra.attempt_count !== undefined) {
      sets.push(`attempt_count = ?`);
      params.push(extra.attempt_count);
    }
    if (extra.next_retry_at !== undefined) {
      sets.push(`next_retry_at = ?`);
      params.push(extra.next_retry_at);
    }
    if (extra.last_error !== undefined) {
      sets.push(`last_error = ?`);
      params.push(extra.last_error);
    }
    if (extra.drive_file_id !== undefined) {
      sets.push(`drive_file_id = ?`);
      params.push(extra.drive_file_id);
    }

    params.push(id);

    return new Promise((resolve, reject) => {
      db.run(
        `UPDATE cloud_storage_queue SET ${sets.join(', ')} WHERE id = ?`,
        params,
        (err) => {
          if (err) reject(err);
          else resolve();
        }
      );
    });
  }


  /**
   * Reset the status of the most recent backups to 'pending'
   * Used when switching accounts or creating new folders.
   */
  private async resetRecentBackups(count: number): Promise<void> {
    try {
      const db = dbManager.getDatabase();
      
      // First, get the IDs of the most recent completed backups
      const rows = await new Promise<any[]>((resolve, reject) => {
        db.all(
          'SELECT id FROM cloud_storage_queue WHERE status = "completed" ORDER BY created_at DESC LIMIT ?',
          [count],
          (err, rows) => {
            if (err) reject(err);
            else resolve(rows || []);
          }
        );
      });

      if (rows.length === 0) return;

      const ids = rows.map(r => `'${r.id}'`).join(',');
      
      await new Promise<void>((resolve, reject) => {
        db.run(
          `UPDATE cloud_storage_queue 
           SET status = 'pending', attempt_count = 0, next_retry_at = NULL 
           WHERE id IN (${ids})`,
          (err) => {
            if (err) reject(err);
            else resolve();
          }
        );
      });
      logger.info(`Reset last ${rows.length} backups to pending for re-sync.`);
    } catch (error) {
      logger.error('Failed to reset recent backups:', error);
    }
  }

  /**
   * Toggle the cloud sync status for a specific file
   */
  public async toggleItemStatus(filePath: string): Promise<boolean> {
    try {
      const db = dbManager.getDatabase();
      
      // Check current status
      const item = await new Promise<any>((resolve, reject) => {
        db.get('SELECT id, status FROM cloud_storage_queue WHERE file_path = ?', [filePath], (err, row) => {
          if (err) reject(err);
          else resolve(row);
        });
      });

      if (!item) {
        // Calculate checksum before insertion
        const checksum = await BackupOperations.calculateChecksum(filePath);
        logger.info(`Calculated checksum for ${path.basename(filePath)}: ${checksum}`);
        
        // If not in queue, add it as pending
        await new Promise<void>((resolve, reject) => {
          db.run(
            'INSERT INTO cloud_storage_queue (id, file_path, checksum, status, attempt_count, created_at) VALUES (?, ?, ?, ?, ?, ?)',
            [uuidv4(), filePath, checksum, 'pending', 0, new Date().toISOString()],
            (err) => {
              if (err) {
                logger.error(`Database insertion failed for ${path.basename(filePath)} with checksum ${checksum}:`, err);
                reject(err);
              }
              else resolve();
            }
          );
        });
        logger.info(`Added ${path.basename(filePath)} to cloud sync queue as pending with checksum.`);
      } else {
        // Force back to pending
        await new Promise<void>((resolve, reject) => {
          db.run(
            'UPDATE cloud_storage_queue SET status = ?, attempt_count = 0, next_retry_at = NULL WHERE id = ?',
            ['pending', item.id],
            (err) => {
              if (err) reject(err);
              else resolve();
            }
          );
        });
        logger.info(`Forced ${path.basename(filePath)} back to pending in cloud sync queue.`);
      }
      
      // Trigger queue processing
      this.processQueue();
      
      return true;
    } catch (error) {
      logger.error('Failed to toggle cloud sync status:', error);
      return false;
    }
  }

  public onAuthSuccess(callback: (email: string) => void): () => void {
    this.events.on('auth-success', callback);
    return () => this.events.off('auth-success', callback);
  }

  public onAuthError(callback: (error: string) => void): () => void {
    this.events.on('auth-error', callback);
    return () => this.events.off('auth-error', callback);
  }
}

export const googleDriveService = GoogleDriveService.getInstance();
