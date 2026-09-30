import './utils/bootstrap';
import { app, BrowserWindow, shell } from 'electron';
import * as path from 'path';
import * as fs from 'fs';
import { dbManager } from './database/manager';
import { BackupScheduler } from './services/backupScheduler';
import { LicenseManager } from './services/licenseManager';
import { LicenseScheduler } from './services/licenseScheduler';
import { LicenseEnforcement } from './services/licenseEnforcement';
import { AuthService } from './services/authService';
import {
  setLicenseManager,
  setLicenseScheduler,
  setLicenseEnforcement,
  setAuthService,
  setPasswordResetService,
  setRestartSchedulerCallback,
} from './ipc/handlers';
import { PasswordResetService } from './services/passwordReset';
import { logger } from './services/logger';
import { googleDriveService } from './services/googleDriveService';
import { internetService } from './services/internetService';

// Single Instance Lock
const gotTheLock = app.requestSingleInstanceLock();

if (!gotTheLock) {
  app.quit();
} else {
  // Handle second instance
  app.on('second-instance', (event, commandLine) => {
    // Someone tried to run a second instance, we should focus our window.
    if (currentMainWindow) {
      if (currentMainWindow.isMinimized()) currentMainWindow.restore();
      currentMainWindow.focus();
    }

    // Handle deep link from command line (Windows/Linux)
    const url = commandLine.pop();
    if (url && url.startsWith('scaleerp://')) {
      handleDeepLink(url);
    }
  });

  // Handle deep link (macOS)
  app.on('open-url', (event, url) => {
    event.preventDefault();
    handleDeepLink(url);
  });
}

// Register custom protocol
if (process.defaultApp) {
  if (process.argv.length >= 2) {
    app.setAsDefaultProtocolClient('scaleerp', process.execPath, [path.resolve(process.argv[1])]);
  }
} else {
  app.setAsDefaultProtocolClient('scaleerp');
}

/**
 * Handle deep links (e.g., scaleerp://auth?code=...)
 */
async function handleDeepLink(url: string): Promise<void> {
  logger.info(`Handling deep link: ${url}`);
  if (url.includes('scaleerp://auth')) {
    try {
      await googleDriveService.handleCallback(url);
      if (currentMainWindow) {
        currentMainWindow.webContents.send('google-drive:auth-success');
      }
    } catch (error) {
      logger.error('Failed to handle OAuth callback via deep link:', error);
      if (currentMainWindow) {
        currentMainWindow.webContents.send('google-drive:auth-error', (error as Error).message);
      }
    }
  }
}

// Global database utilities - single source of truth for all database operations
// eslint-disable-next-line
let dbUtils: any = null;

// Global backup scheduler instance
let backupScheduler: BackupScheduler | null = null;
let licenseManager: LicenseManager | null = null;
let licenseScheduler: LicenseScheduler | null = null;
let licenseEnforcement: LicenseEnforcement | null = null;
let authService: AuthService | null = null;
let passwordResetService: PasswordResetService | null = null;

// Initialize backup scheduler
async function initializeBackupScheduler(): Promise<void> {
  try {
    backupScheduler = new BackupScheduler(dbManager, licenseManager);

    await backupScheduler.start(); // Start ignores settings.enabled now since it is forced

    logger.info('Backup scheduler initialized successfully');
  } catch (error) {
    logger.error('Failed to initialize backup scheduler:', error);
  }
}

// Initialize database when app starts
async function initializeDatabase(): Promise<void> {
  try {
    // Initialize database manager
    await dbManager.initialize();

    // Import database operations
    const {
      products,
      brokers,
      customers,
      brokerTransactions,
      customerTransactions,
      brokerLeisures,
      customerLeisures,
      getDatabaseStats
    } = await import('./database/operations');

    dbUtils = {
      products,
      brokers,
      customers,
      brokerTransactions,
      customerTransactions,
      brokerLeisures,
      customerLeisures,
      getDatabaseStats
    };

    logger.info('Database and utilities initialized successfully in main process');
  } catch (error) {
    logger.error('Failed to initialize database:', error);
  }
}

async function initializeLicensing(): Promise<void> {
  try {
    const devPublicKeyPath = path.join(process.cwd(), 'vendor', 'keys', 'public_key.pem');
    const licenseManagerOptions = fs.existsSync(devPublicKeyPath)
      ? { publicKeyPath: devPublicKeyPath }
      : {};

    licenseManager = new LicenseManager(licenseManagerOptions);
    setLicenseManager(licenseManager);

    licenseEnforcement = new LicenseEnforcement(licenseManager);
    setLicenseEnforcement(licenseEnforcement);

    await licenseManager.validateLicense();
    logger.info('License manager initialized successfully');
  } catch (error) {
    setLicenseManager(null);
    setLicenseEnforcement(null);
    logger.error('Failed to initialize licensing:', error);
  }
}

async function initializeAuth(): Promise<void> {
  try {
    authService = new AuthService();
    setAuthService(authService);

    const sessionStatus = await authService.checkSession();
    if (sessionStatus.authenticated) {
      logger.info('Auth initialized with active session');
    } else {
      logger.info('Auth initialized (login required)');
    }
  } catch (error) {
    setAuthService(null);
    authService = null;
    logger.error('Failed to initialize auth:', error);
  }
}

async function initializePasswordReset(): Promise<void> {
  try {
    passwordResetService = new PasswordResetService();
    setPasswordResetService(passwordResetService);
    logger.info('PasswordResetService initialized successfully');
  } catch (error) {
    setPasswordResetService(null);
    passwordResetService = null;
    logger.error('Failed to initialize PasswordResetService:', error);
  }
}

function createWindow(): BrowserWindow {
  // Create the browser window
  const mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 800,
    minHeight: 600,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js')
    },
    icon: path.join(__dirname, process.platform === 'win32' ? '../public/icon.ico' : '../public/brand/app-icon-squircle-green.png'), // Use ScaleERP logo
    show: false, // Don't show until ready-to-show
    titleBarStyle: 'default',
    title: 'ScaleERP', // Set window title
  });

  // Load the app
  if (process.env.NODE_ENV === 'development') {
    // In development, load from the Vite dev server
    mainWindow.loadURL('http://localhost:3000');
    // Open DevTools in development
    mainWindow.webContents.openDevTools();
  } else {
    // In production, load the built files
    mainWindow.loadFile(path.join(__dirname, '../build/index.html'));
  }

  // Handle navigation for client-side routing
  mainWindow.webContents.on('will-navigate', (event, url) => {
    // Prevent navigation to external URLs
    const parsedUrl = new URL(url);
    if (parsedUrl.origin !== 'file://') {
      event.preventDefault();
      shell.openExternal(url);
    }
  });

  // Handle new window creation (e.g., target="_blank" links)
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    const parsedUrl = new URL(url);
    if (parsedUrl.origin === 'file://') {
      // Allow internal navigation
      return { action: 'allow' };
    } else {
      // Open external links in default browser
      shell.openExternal(url);
      return { action: 'deny' };
    }
  });

  // Show window when ready to prevent visual flash
  mainWindow.once('ready-to-show', () => {
    mainWindow.maximize(); // Maximize the window
    mainWindow.setTitle('ScaleERP'); // Ensure title is set
    mainWindow.show();
  });

  // Handle window closed
  mainWindow.on('closed', () => {
    // Dereference the window object
    // Note: In Electron, this is handled automatically
  });

  return mainWindow;
}

// Initialize license scheduler (requires mainWindow reference)
let currentMainWindow: BrowserWindow | null = null;

async function initializeLicenseScheduler(mainWindow: BrowserWindow): Promise<void> {
  currentMainWindow = mainWindow;
  try {
    if (!licenseManager) {
      console.warn('Skipping license scheduler — license manager not initialized');
      return;
    }

    // Validate license before starting scheduler
    const status = await licenseManager.validateLicense();
    if (status.valid && authService) {
      licenseScheduler = new LicenseScheduler(licenseManager, authService, mainWindow);
      setLicenseScheduler(licenseScheduler);
      licenseScheduler.start();
      console.log('License scheduler started successfully');
    } else {
      console.log(`Skipping license scheduler — license state: ${status.reason || 'invalid'}`);
    }
  } catch (error) {
    console.error('Failed to initialize license scheduler:', error);
  }
}

/**
 * Public method to restart or start the license scheduler.
 * Used when a license is newly imported or updated.
 */
export async function restartLicenseScheduler(): Promise<void> {
  if (!currentMainWindow) return;
  
  if (licenseScheduler) {
    licenseScheduler.stop();
    licenseScheduler = null;
    setLicenseScheduler(null);
  }
  
  await initializeLicenseScheduler(currentMainWindow);
}

// Setup IPC handlers for database operations
async function setupIPCHandlers(): Promise<void> {
  try {
    // Import and register all generic IPC handlers
    const { registerIPCHandlers } = await import('./ipc/handlers');
    await registerIPCHandlers();
  } catch (error) {
    console.error('Failed to setup IPC handlers:', error);
    throw error;
  }
}

// This method will be called when Electron has finished initialization
app.whenReady().then(async () => {
  await initializeDatabase();
  await initializeLicensing();
  await initializeAuth();
  await initializePasswordReset();
  await initializeBackupScheduler();
  await setupIPCHandlers();
  setRestartSchedulerCallback(restartLicenseScheduler);

  // Initialize Google Drive Service
  googleDriveService.initialize();

  // Initialize Internet Service listener
  internetService.on('online', () => {
    logger.info('System back online, processing cloud storage queue...');
    googleDriveService.processQueue();
  });

  // Listen for Google Drive auth events to refresh UI
  googleDriveService.onAuthSuccess((email) => {
    if (currentMainWindow) {
      currentMainWindow.webContents.send('google-drive:auth-success', email);
    }
  });

  googleDriveService.onAuthError((error) => {
    if (currentMainWindow) {
      currentMainWindow.webContents.send('google-drive:auth-error', error);
    }
  });

  // Initial queue process check
  googleDriveService.processQueue();

  const mainWindow = createWindow();
  await initializeLicenseScheduler(mainWindow);
});


// Quit when all windows are closed, except on macOS
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

// On macOS, re-create window when dock icon is clicked
app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});

// Security: Prevent new window creation
app.on('web-contents-created', (event, contents) => {
  contents.on('will-navigate', (event, navigationUrl) => {
    const parsedUrl = new URL(navigationUrl);
    if (parsedUrl.origin !== 'file://') {
      event.preventDefault();
      shell.openExternal(navigationUrl);
    }
  });
});
