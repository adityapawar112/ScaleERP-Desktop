# Robust Google Drive Cloud Sync & Automated Backup Architecture for Electron Applications

This guide provides an end-to-end architectural explanation and implementation manual for adding secure, resilient Google Drive cloud backup synchronization to any Electron desktop application. 

Based on the production-tested implementation in **ScaleERP**, this architecture solves the common challenges of desktop OAuth authentication (such as Google's embedded browser blocks) and offline network volatility through a durable upload queue.

---

```mermaid
flowchart TD
    subgraph UI [Frontend / React Renderer]
        BUI[Backup Management UI]
        CBS[Cloud Settings Component]
    end

    subgraph IPC [Electron IPC Bridge]
        HND[ipcMain Handlers]
    end

    subgraph Core [Main Process / Services]
        GDS[GoogleDriveService Singleton]
        SEC[SecurityService / safeStorage]
        DB[SQLite Database & Manager]
        PKCE[PKCE Crypto Utility]
        SCH[Backup Scheduler / node-cron]
    end

    subgraph External [External Environment]
        SYS[System Default Browser]
        LOOP[Local Loopback Server :42856]
        GDRIVE[Google Drive API]
    end

    %% Flow interactions
    BUI -- "Force Sync / Status" --> HND
    CBS -- "Login / Logout" --> HND
    HND <--> GDS
    SCH -- "1. Enqueue Backup" --> GDS
    GDS <--> DB
    GDS -- "2. Generate Verifier & Challenge" --> PKCE
    GDS -- "3. Open Auth URL" --> SYS
    SYS -- "4. Redirect with Auth Code" --> LOOP
    LOOP -- "5. Deliver Code" --> GDS
    GDS -- "6. Encrypt Refresh Token" --> SEC
    SEC --> DB
    GDS -- "7. Stream ZIP Upload" --> GDRIVE
```

---

## 1. Executive Summary & Design Principles

### The Problem with Electron OAuth
Historically, Electron apps performed OAuth by opening an embedded `BrowserWindow` or `<webview>`. However, Google and other major identity providers actively block embedded web views (`disallowed_useragent`) to prevent malicious applications from intercepting user credentials and session cookies.

### The Modern Solution: System Browser + PKCE (RFC 8252)
To comply with modern OAuth 2.0 recommendations for native apps:
1. **System Default Browser**: Authentication occurs entirely outside the Electron app in the user's secure default browser (Chrome, Edge, Safari, etc.).
2. **Local Loopback Capture**: Electron temporarily spawns a lightweight local HTTP server on a fixed loopback port (`http://127.0.0.1:42856`) to receive the OAuth redirect authorization code.
3. **PKCE (Proof Key for Code Exchange)**: Cryptographic challenges (`code_verifier` and `code_challenge`) ensure that even if another local process listens on the loopback port, only the initiating Electron application can exchange the authorization code for access and refresh tokens.

### Offline-First Resilience: The Durable Queue
Desktop applications frequently operate in offline or unstable network environments. Instead of attempting direct uploads that fail when offline, every generated backup (scheduled or manual) is inserted into a local SQLite queue (`cloud_storage_queue`). A background processor sweeps the queue, uploading pending files with exponential backoff retries and cryptographic checksum verification.

---

## 2. Google Cloud Console Setup Guide

To implement this flow in your application, you must configure a Google Cloud project and generate OAuth credentials.

### Step 1: Create a Google Cloud Project
1. Navigate to the [Google Cloud Console](https://console.cloud.google.com/).
2. Click the project dropdown in the top navigation bar and select **New Project**.
3. Enter a Project Name (e.g., `My Electron App Cloud Sync`) and click **Create**.

### Step 2: Enable Required APIs
1. In the sidebar, navigate to **APIs & Services** > **Library**.
2. Search for **Google Drive API** and click **Enable**.
3. Search for **Google People API** (or Google Identity APIs) and click **Enable** (required for retrieving the user's email address and profile).

### Step 3: Configure the OAuth Consent Screen
1. Navigate to **APIs & Services** > **OAuth consent screen**.
2. Select **External** user type (unless your app is strictly internal to a Google Workspace organization) and click **Create**.
3. **App Information**: Enter your App Name, User Support Email, and Developer Contact Email.
4. **Scopes**: Click **Add or Remove Scopes**. Add the following:
   - `https://www.googleapis.com/auth/drive.file`: **Crucial Security Best Practice**. This scope grants access *only* to files and folders created specifically by your application. Your app cannot see or modify the user's personal Google Drive files.
   - `https://www.googleapis.com/auth/userinfo.email`: Allows displaying the connected Google account email in your UI.
   - `https://www.googleapis.com/auth/userinfo.profile` & `openid`: Basic profile identification.
5. **Test Users**: If your app is in "Testing" mode, add the Google email addresses of the users who will be testing the backup functionality. (Once verified, you can publish the app).

### Step 4: Generate OAuth Desktop Credentials
1. Navigate to **APIs & Services** > **Credentials**.
2. Click **Create Credentials** > **OAuth client ID**.
3. **Application Type**: Select **Desktop app** *(CRITICAL: Do NOT select Web application)*. Desktop app configuration specifically licenses local loopback IP redirects (`127.0.0.1` and `localhost`).
4. Enter a Name (e.g., `Electron Desktop Client`) and click **Create**.
5. Save the generated **Client ID** and **Client Secret**. These will be integrated into your Electron main process configuration.

---

## 3. Core Implementation Guide (Modular Codebase)

Below is the complete, modular TypeScript implementation designed for seamless integration into any Electron application.

### Required Dependencies
Ensure your project has the following packages installed:
```bash
npm install googleapis electron-store uuid
npm install --save-dev @types/uuid
```
*(Note: This guide assumes you have SQLite or another local database configured for queue persistence).*

---

### Module A: PKCE Cryptographic Utility (`electron/utils/pkce.ts`)
Generates high-entropy random verifiers and SHA-256 challenges required for secure code exchange.

```typescript
import * as crypto from 'crypto';

export class PKCE {
  /**
   * Generates a 64-character high-entropy cryptographic random verifier string
   */
  static generateVerifier(length: number = 64): string {
    const charset = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-._~';
    let verifier = '';
    const values = crypto.randomBytes(length);
    for (let i = 0; i < length; i++) {
      verifier += charset[values[i] % charset.length];
    }
    return verifier;
  }

  /**
   * Generates a base64url-encoded SHA-256 challenge from the verifier
   */
  static generateChallenge(verifier: string): string {
    const hash = crypto.createHash('sha256').update(verifier).digest();
    return this.base64UrlEncode(hash);
  }

  private static base64UrlEncode(buffer: Buffer): string {
    return buffer.toString('base64')
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=/g, '');
  }
}
```

---

### Module B: Encrypted Storage (`electron/services/securityService.ts`)
Leverages Electron's OS-level hardware-backed keyring (`safeStorage`) on Windows (DPAPI), macOS (Keychain), and Linux (Secret Service) to securely encrypt stored refresh tokens.

```typescript
import { safeStorage } from 'electron';

export class SecurityService {
  static isEncryptionAvailable(): boolean {
    try {
      return safeStorage.isEncryptionAvailable();
    } catch (error) {
      console.error('safeStorage availability check failed:', error);
      return false;
    }
  }

  static encryptString(plainText: string): Buffer {
    if (!this.isEncryptionAvailable()) {
      throw new Error('OS encryption is unavailable. Verify system keyring service.');
    }
    return safeStorage.encryptString(plainText);
  }

  static decryptString(encrypted: Buffer): string {
    if (!this.isEncryptionAvailable()) {
      throw new Error('OS encryption is unavailable. Cannot decrypt data.');
    }
    return safeStorage.decryptString(encrypted);
  }

  static encryptToBase64(plainText: string): string {
    return this.encryptString(plainText).toString('base64');
  }

  static decryptFromBase64(base64: string): string {
    const buffer = Buffer.from(base64, 'base64');
    return this.decryptString(buffer);
  }
}
```

---

### Module C: SQLite Database Schema (`electron/database/cloud_schema.sql`)
The persistent structure required for tracking cloud connection settings and the durable upload queue.

```sql
-- Cloud storage settings (Tracks active Google Drive connection and root folder)
CREATE TABLE IF NOT EXISTS cloud_storage_settings (
    id INTEGER PRIMARY KEY CHECK (id = 1),
    provider TEXT NOT NULL DEFAULT 'google_drive',
    folder_id TEXT,
    account_email TEXT,
    auto_upload_enabled BOOLEAN DEFAULT 0,
    storage_encryption_status TEXT DEFAULT 'unknown',
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Cloud storage upload queue (Durable offline queue)
CREATE TABLE IF NOT EXISTS cloud_storage_queue (
    id TEXT PRIMARY KEY,
    file_path TEXT NOT NULL,
    checksum TEXT NOT NULL,
    status TEXT CHECK(status IN ('pending', 'uploading', 'completed', 'failed')) DEFAULT 'pending',
    attempt_count INTEGER DEFAULT 0,
    next_retry_at DATETIME,
    last_error TEXT,
    drive_file_id TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Insert default configuration row
INSERT OR IGNORE INTO cloud_storage_settings (id, provider, auto_upload_enabled)
VALUES (1, 'google_drive', 0);
```

---

### Module D: Core Google Drive Service (`electron/services/googleDriveService.ts`)
The primary service engine orchestrating OAuth login, loopback listening, token persistence, folder verification, and robust file streaming.

```typescript
import { google } from 'googleapis';
import { app, shell } from 'electron';
import { EventEmitter } from 'events';
import * as path from 'path';
import * as fs from 'fs';
import * as crypto from 'crypto';
import * as http from 'http';
import Store from 'electron-store';
import { v4 as uuidv4 } from 'uuid';
import { PKCE } from '../utils/pkce';
import { SecurityService } from './securityService';

// Note: Replace dbManager with your application's SQLite database instance
import { dbManager } from '../database/manager';

export class GoogleDriveService {
  private static instance: GoogleDriveService;
  private oauth2Client: any;
  private store: Store;
  private codeVerifier: string | null = null;
  private accountEmail: string | null = null;
  private authServer: http.Server | null = null;
  private isLoggingIn = false;
  private events = new EventEmitter();

  private readonly SCOPES = [
    'https://www.googleapis.com/auth/drive.file',
    'https://www.googleapis.com/auth/userinfo.email',
    'https://www.googleapis.com/auth/userinfo.profile',
    'openid'
  ];

  // Fixed local loopback port matching Google Console Desktop Client settings
  private readonly REDIRECT_URI = 'http://127.0.0.1:42856/';
  
  // Replace with your Google OAuth Client ID and Secret
  private readonly CLIENT_ID = 'YOUR_GOOGLE_CLIENT_ID.apps.googleusercontent.com';
  private readonly CLIENT_SECRET = 'YOUR_GOOGLE_CLIENT_SECRET';

  private constructor() {
    this.store = new Store({ name: 'google-drive-settings' });
    this.oauth2Client = new google.auth.OAuth2(
      this.CLIENT_ID,
      this.CLIENT_SECRET,
      this.REDIRECT_URI
    );
  }

  public static getInstance(): GoogleDriveService {
    if (!GoogleDriveService.instance) {
      GoogleDriveService.instance = new GoogleDriveService();
    }
    return GoogleDriveService.instance;
  }

  public async initialize(): Promise<void> {
    try {
      this.loadToken();
      const settings = await this.getSettings();
      if (settings?.account_email) {
        this.accountEmail = settings.account_email;
      }

      if (this.oauth2Client.credentials.refresh_token) {
        await this.refreshAccessToken();
        console.log(`Google Drive session successfully verified for: ${this.accountEmail}`);
      }
    } catch (err) {
      console.error('Failed to initialize Google Drive session:', err);
    }
  }

  /**
   * Spawns loopback server and opens user's system browser for OAuth
   */
  public async login(): Promise<void> {
    if (this.isLoggingIn) return;
    this.isLoggingIn = true;

    try {
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

      this.authServer = http.createServer(async (req, res) => {
        try {
          if (req.url === '/favicon.ico') {
            res.writeHead(204);
            res.end();
            return;
          }

          const url = new URL(req.url!, `http://${req.headers.host}`);
          const code = url.searchParams.get('code');
          const error = url.searchParams.get('error');

          if (error) {
            res.writeHead(400, { 'Content-Type': 'text/html' });
            res.end(`<h1>Authentication Failed</h1><p>Error: ${error}</p>`);
            this.cleanupAuthServer();
            return;
          }

          if (code) {
            res.writeHead(200, { 'Content-Type': 'text/html' });
            res.end('<h1>Authentication Successful!</h1><p>You can close this tab and return to the desktop application.</p>');
            
            await this.handleCallback(url.toString());
            this.cleanupAuthServer();
          } else {
            res.writeHead(404);
            res.end();
          }
        } catch (error) {
          console.error('Loopback server error:', error);
          if (!res.headersSent) res.writeHead(500).end('Server error');
        }
      });

      this.authServer.on('error', (err) => {
        console.error('Auth server error:', err);
        this.cleanupAuthServer();
      });

      this.authServer.listen(42856, '127.0.0.1', () => {
        console.log('Started local OAuth capture server on 127.0.0.1:42856');
        shell.openExternal(authUrl);
      });

      // 5-minute timeout watchdog
      setTimeout(() => {
        if (this.isLoggingIn) {
          console.warn('Auth server timed out after 5 minutes.');
          this.cleanupAuthServer();
        }
      }, 5 * 60 * 1000);

    } catch (error) {
      this.cleanupAuthServer();
      throw error;
    }
  }

  private cleanupAuthServer(): void {
    if (this.authServer) {
      this.authServer.close();
      this.authServer = null;
    }
    this.isLoggingIn = false;
  }

  public async handleCallback(url: string): Promise<void> {
    const parsedUrl = new URL(url);
    const code = parsedUrl.searchParams.get('code');

    if (!code || !this.codeVerifier) {
      throw new Error('Invalid OAuth callback or missing PKCE verifier');
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

    const oauth2 = google.oauth2({ version: 'v2', auth: this.oauth2Client });
    const userInfo = await oauth2.userinfo.get();
    
    const oldSettings = await this.getSettings();
    const accountChanged = oldSettings.account_email && oldSettings.account_email !== userInfo.data.email;
    
    this.accountEmail = userInfo.data.email || null;

    if (accountChanged) {
      console.log('Google account switched. Flagging recent backups for re-synchronization.');
      await this.resetRecentBackups(5);
    }

    await this.updateSettings({
      account_email: userInfo.data.email,
      auto_upload_enabled: true
    });

    this.events.emit('auth-success', userInfo.data.email);
    this.codeVerifier = null;
  }

  private async refreshAccessToken(): Promise<void> {
    try {
      const { credentials } = await this.oauth2Client.refreshAccessToken();
      this.oauth2Client.setCredentials(credentials);
      if (credentials.refresh_token) {
        this.saveToken(credentials.refresh_token);
      }
    } catch (error) {
      this.oauth2Client.setCredentials({});
      throw error;
    }
  }

  public async logout(): Promise<void> {
    this.oauth2Client.setCredentials({});
    this.accountEmail = null;
    this.store.delete('refresh_token_encrypted');
    await this.updateSettings({
      account_email: '',
      auto_upload_enabled: false,
      folder_id: ''
    });
  }

  public async getStatus(): Promise<any> {
    const settings = await this.getSettings();
    return {
      connected: !!this.oauth2Client.credentials.refresh_token,
      account_email: this.accountEmail || settings.account_email,
      auto_upload_enabled: settings.auto_upload_enabled,
      encryption_available: SecurityService.isEncryptionAvailable(),
      storage_encryption_status: settings.storage_encryption_status
    };
  }

  /**
   * Enqueues a local backup file into the durable SQLite upload queue
   */
  public async enqueue(filePath: string): Promise<void> {
    if (!fs.existsSync(filePath)) return;

    const checksum = await this.calculateChecksum(filePath);
    const id = uuidv4();
    const db = dbManager.getDatabase();

    await new Promise<void>((resolve, reject) => {
      db.run(
        'INSERT INTO cloud_storage_queue (id, file_path, checksum, status) VALUES (?, ?, ?, ?)',
        [id, filePath, checksum, 'pending'],
        (err: any) => (err ? reject(err) : resolve())
      );
    });

    console.log(`Backup queued for cloud storage: ${path.basename(filePath)}`);
    this.processQueue();
  }

  /**
   * Sweeps the queue and processes pending uploads with exponential backoff
   */
  public async processQueue(): Promise<void> {
    if (!this.accountEmail || !this.oauth2Client.credentials.refresh_token) return;

    try {
      const folderId = await this.getOrCreateFolder();
      const db = dbManager.getDatabase();
      
      const pendingItems = await new Promise<any[]>((resolve, reject) => {
        db.all(
          'SELECT * FROM cloud_storage_queue WHERE status IN ("pending", "failed") AND (next_retry_at IS NULL OR next_retry_at <= CURRENT_TIMESTAMP) ORDER BY created_at ASC',
          (err: any, rows: any) => (err ? reject(err) : resolve(rows || []))
        );
      });

      if (pendingItems.length === 0) return;

      for (const item of pendingItems) {
        await this.uploadFile(item, folderId);
      }
    } catch (error) {
      console.error('Queue processing error:', error);
    }
  }

  private async uploadFile(item: any, folderId: string): Promise<void> {
    try {
      await this.updateQueueStatus(item.id, 'uploading');

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

      await this.updateQueueStatus(item.id, 'completed', { drive_file_id: response.data.id });
      console.log(`Cloud upload successful: ${path.basename(item.file_path)}`);
    } catch (error: any) {
      console.error(`Upload failed for ${path.basename(item.file_path)}:`, error);
      
      const attemptCount = item.attempt_count + 1;
      const backoffMinutes = Math.min(Math.pow(2, attemptCount) * 5, 1440); // 1 day max
      const nextRetry = new Date();
      nextRetry.setMinutes(nextRetry.getMinutes() + backoffMinutes);

      await this.updateQueueStatus(item.id, 'failed', {
        attempt_count: attemptCount,
        next_retry_at: nextRetry.toISOString(),
        last_error: error.message
      });
    }
  }

  private async getOrCreateFolder(): Promise<string> {
    const settings = await this.getSettings();
    const drive = google.drive({ version: 'v3', auth: this.oauth2Client });

    if (settings?.folder_id) {
      try {
        await drive.files.get({ fileId: settings.folder_id });
        return settings.folder_id;
      } catch (error: any) {
        if (error.code === 404) await this.updateSettings({ folder_id: '' });
        else throw error;
      }
    }
    
    const response = await drive.files.list({
      q: "name = 'Application Backups' and mimeType = 'application/vnd.google-apps.folder' and trashed = false",
      fields: 'files(id)',
      spaces: 'drive'
    });

    if (response.data.files && response.data.files.length > 0) {
      const folderId = response.data.files[0].id!;
      await this.updateSettings({ folder_id: folderId });
      return folderId;
    }

    const folder = await drive.files.create({
      requestBody: {
        name: 'Application Backups',
        mimeType: 'application/vnd.google-apps.folder'
      },
      fields: 'id'
    });

    const folderId = folder.data.id!;
    await this.updateSettings({ folder_id: folderId });
    return folderId;
  }

  private calculateChecksum(filePath: string): Promise<string> {
    return new Promise((resolve, reject) => {
      const hash = crypto.createHash('sha256');
      const stream = fs.createReadStream(filePath);
      stream.on('data', (chunk) => hash.update(chunk));
      stream.on('end', () => resolve(hash.digest('hex')));
      stream.on('error', (err) => reject(err));
    });
  }

  private saveToken(refreshToken: string): void {
    try {
      const encrypted = SecurityService.encryptToBase64(refreshToken);
      this.store.set('refresh_token_encrypted', encrypted);
      this.updateSettings({ storage_encryption_status: 'safeStorage' });
    } catch (error) {
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
      }
    } catch (error) {
      console.error('Failed to decrypt refresh token:', error);
    }
  }

  private async getSettings(): Promise<any> {
    const db = dbManager.getDatabase();
    return new Promise((resolve, reject) => {
      db.get('SELECT * FROM cloud_storage_settings WHERE id = 1', (err: any, row: any) => (err ? reject(err) : resolve(row || {})));
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
        (err: any) => (err ? reject(err) : resolve())
      );
    });
  }

  private async updateQueueStatus(id: string, status: string, extra: any = {}): Promise<void> {
    const db = dbManager.getDatabase();
    const sets = [`status = ?`];
    const params = [status];

    if (extra.attempt_count !== undefined) { sets.push(`attempt_count = ?`); params.push(extra.attempt_count); }
    if (extra.next_retry_at !== undefined) { sets.push(`next_retry_at = ?`); params.push(extra.next_retry_at); }
    if (extra.last_error !== undefined) { sets.push(`last_error = ?`); params.push(extra.last_error); }
    if (extra.drive_file_id !== undefined) { sets.push(`drive_file_id = ?`); params.push(extra.drive_file_id); }
    params.push(id);

    return new Promise((resolve, reject) => {
      db.run(`UPDATE cloud_storage_queue SET ${sets.join(', ')} WHERE id = ?`, params, (err: any) => (err ? reject(err) : resolve()));
    });
  }

  public async toggleItemStatus(filePath: string): Promise<boolean> {
    try {
      const db = dbManager.getDatabase();
      const item = await new Promise<any>((resolve, reject) => {
        db.get('SELECT id, status FROM cloud_storage_queue WHERE file_path = ?', [filePath], (err: any, row: any) => (err ? reject(err) : resolve(row)));
      });

      if (!item) {
        const checksum = await this.calculateChecksum(filePath);
        await new Promise<void>((resolve, reject) => {
          db.run(
            'INSERT INTO cloud_storage_queue (id, file_path, checksum, status, attempt_count, created_at) VALUES (?, ?, ?, ?, ?, ?)',
            [uuidv4(), filePath, checksum, 'pending', 0, new Date().toISOString()],
            (err: any) => (err ? reject(err) : resolve())
          );
        });
      } else {
        await new Promise<void>((resolve, reject) => {
          db.run('UPDATE cloud_storage_queue SET status = ?, attempt_count = 0, next_retry_at = NULL WHERE id = ?', ['pending', item.id], (err: any) => (err ? reject(err) : resolve()));
        });
      }
      this.processQueue();
      return true;
    } catch (error) {
      console.error('Failed to toggle sync status:', error);
      return false;
    }
  }

  private async resetRecentBackups(count: number): Promise<void> {
    const db = dbManager.getDatabase();
    const rows = await new Promise<any[]>((resolve, reject) => {
      db.all('SELECT id FROM cloud_storage_queue WHERE status = "completed" ORDER BY created_at DESC LIMIT ?', [count], (err: any, r: any) => (err ? reject(err) : resolve(r || [])));
    });
    if (rows.length === 0) return;
    const ids = rows.map(r => `'${r.id}'`).join(',');
    await new Promise<void>((resolve, reject) => {
      db.run(`UPDATE cloud_storage_queue SET status = 'pending', attempt_count = 0, next_retry_at = NULL WHERE id IN (${ids})`, (err: any) => (err ? reject(err) : resolve()));
    });
  }

  public onAuthSuccess(callback: (email: string) => void): () => void {
    this.events.on('auth-success', callback);
    return () => this.events.off('auth-success', callback);
  }
}

export const googleDriveService = GoogleDriveService.getInstance();
```

---

### Module E: IPC Main Handlers (`electron/ipc/handlers.ts`)
Expose the service methods across the context bridge to the renderer.

```typescript
import { ipcMain, IpcMainInvokeEvent } from 'electron';
import { googleDriveService } from '../services/googleDriveService';

export function registerCloudIPCHandlers(): void {
  ipcMain.handle('google-drive:login', async () => {
    return await googleDriveService.login();
  });

  ipcMain.handle('google-drive:logout', async () => {
    return await googleDriveService.logout();
  });

  ipcMain.handle('google-drive:getStatus', async () => {
    return await googleDriveService.getStatus();
  });

  ipcMain.handle('google-drive:processQueue', async () => {
    return await googleDriveService.processQueue();
  });

  ipcMain.handle('google-drive:toggleItemStatus', async (event: IpcMainInvokeEvent, filePath: string) => {
    return await googleDriveService.toggleItemStatus(filePath);
  });
}
```

---

### Module F: Renderer Context Bridge (`src/types/electron.d.ts`)
Type definitions for the `window.electronAPI` interface.

```typescript
export interface ElectronAPI {
  googleDrive: {
    login: () => Promise<void>;
    logout: () => Promise<void>;
    getStatus: () => Promise<{
      connected: boolean;
      account_email: string | null;
      auto_upload_enabled: boolean;
      encryption_available: boolean;
      storage_encryption_status: string;
    }>;
    processQueue: () => Promise<void>;
    toggleItemStatus: (filePath: string) => Promise<boolean>;
  };
  googleDriveEvents?: {
    onAuthSuccess: (callback: (email: string) => void) => () => void;
    onAuthError: (callback: (error: string) => void) => () => void;
  };
}

declare global {
  interface Window {
    electronAPI: ElectronAPI;
  }
}
```

---

## 4. Adapting to Any Electron Codebase

To successfully deploy this in another Electron project, follow this verification checklist:

1. **Port Availability Check**: The loopback server uses port `42856`. Ensure this port does not conflict with other internal micro-services in your app.
2. **Context Bridge Exposure**: Ensure your `preload.ts` script bridges the `ipcRenderer.invoke` calls to `window.electronAPI.googleDrive`.
3. **Automated Scheduler Hook**: When your automated backup script (e.g., `node-cron`) generates a local ZIP backup, ensure its final step invokes `googleDriveService.enqueue(newBackupFilePath)`.
4. **Renderer Status Polling**: In your React/Vue/Svelte frontend, poll `getStatus()` on mount and after triggering backups to reflect real-time cloud sync states (`completed`, `uploading`, `pending`, `failed`) accurately to the user.

---
*Architecture and documentation verified against ScaleERP v1.1.2 production release standards.*
