// Electron API type definitions
import {
  Product,
  ProductInsert,
  ProductUpdate,
  Broker,
  BrokerInsert,
  BrokerUpdate,
  Customer,
  CustomerInsert,
  CustomerUpdate,
  BrokerTransaction,
  BrokerTransactionInsert,
  BrokerTransactionUpdate,
  CustomerTransaction,
  CustomerTransactionInsert,
  CustomerTransactionUpdate,
  BrokerLeisure,
  BrokerLeisureInsert,
  BrokerLeisureUpdate,
  CustomerLeisure,
  CustomerLeisureInsert,
  CustomerLeisureUpdate,
  StockHistory,
  StockHistoryInsert,
  StockHistoryUpdate,
  ProductManufacturer,
  ProductManufacturerInsert,
  ProductManufacturerUpdate,
  DatabaseStats,
  DatabaseOperationResult,
} from '../../electron/database/types';
import { BackupListItem } from '../../electron/database/backupOps';
import { LicenseStatus } from '../../electron/services/licenseManager';

export interface AuthResult {
  success: boolean;
  message: string;
  user?: {
    user_id: string;
    username: string;
    license_id: string;
  };
  lockout?: {
    locked_out: boolean;
    failed_attempts: number;
    max_failed_attempts: number;
  };
}

export interface SessionStatus {
  authenticated: boolean;
  user?: {
    user_id: string;
    username: string;
    license_id: string;
  };
  expires_at?: string;
}

export interface ElectronAPI {
  database: {
    // Database stats
    getStats: () => Promise<DatabaseStats>;
    getDatabaseStats: () => Promise<DatabaseStats>;

    // Products CRUD
    products: {
      getAll: () => Promise<Product[]>;
      getById: (id: string) => Promise<Product | null>;
      insert: (data: ProductInsert) => Promise<DatabaseOperationResult>;
      update: (id: string, data: ProductUpdate) => Promise<DatabaseOperationResult>;
      delete: (id: string) => Promise<DatabaseOperationResult>;
      archive: (id: string) => Promise<DatabaseOperationResult>;
      unarchive: (id: string) => Promise<DatabaseOperationResult>;
      getArchived: () => Promise<Product[]>;
    };

    // Brokers CRUD
    brokers: {
      getAll: () => Promise<Broker[]>;
      getById: (id: string) => Promise<Broker | null>;
      insert: (data: BrokerInsert) => Promise<DatabaseOperationResult>;
      update: (id: string, data: BrokerUpdate) => Promise<DatabaseOperationResult>;
      delete: (id: string) => Promise<DatabaseOperationResult>;
    };

    // Customers CRUD
    customers: {
      getAll: () => Promise<Customer[]>;
      getById: (id: string) => Promise<Customer | null>;
      insert: (data: CustomerInsert) => Promise<DatabaseOperationResult>;
      update: (id: string, data: CustomerUpdate) => Promise<DatabaseOperationResult>;
      delete: (id: string) => Promise<DatabaseOperationResult>;
    };

    // Broker Transactions CRUD
    brokerTransactions: {
      getAll: () => Promise<BrokerTransaction[]>;
      getById: (id: string) => Promise<BrokerTransaction | null>;
      getByBrokerId: (brokerId: string) => Promise<BrokerTransaction[]>;
      insert: (data: BrokerTransactionInsert) => Promise<DatabaseOperationResult>;
      update: (id: string, data: BrokerTransactionUpdate) => Promise<DatabaseOperationResult>;
      delete: (id: string) => Promise<DatabaseOperationResult>;
    };

    // Customer Transactions CRUD
    customerTransactions: {
      getAll: () => Promise<CustomerTransaction[]>;
      getById: (id: string) => Promise<CustomerTransaction | null>;
      getByCustomerId: (customerId: string) => Promise<CustomerTransaction[]>;
      insert: (data: CustomerTransactionInsert) => Promise<DatabaseOperationResult>;
      update: (id: string, data: CustomerTransactionUpdate) => Promise<DatabaseOperationResult>;
      delete: (id: string) => Promise<DatabaseOperationResult>;
    };

    // Broker Leisures CRUD
    brokerLeisures: {
      getAll: () => Promise<BrokerLeisure[]>;
      getById: (id: string) => Promise<BrokerLeisure | null>;
      getByBrokerId: (brokerId: string) => Promise<BrokerLeisure[]>;
      insert: (data: BrokerLeisureInsert) => Promise<DatabaseOperationResult>;
      update: (id: string, data: BrokerLeisureUpdate) => Promise<DatabaseOperationResult>;
      delete: (id: string) => Promise<DatabaseOperationResult>;
    };

    // Customer Leisures CRUD
    customerLeisures: {
      getAll: () => Promise<CustomerLeisure[]>;
      getById: (id: string) => Promise<CustomerLeisure | null>;
      getByCustomerId: (customerId: string) => Promise<CustomerLeisure[]>;
      insert: (data: CustomerLeisureInsert) => Promise<DatabaseOperationResult>;
      update: (id: string, data: CustomerLeisureUpdate) => Promise<DatabaseOperationResult>;
      delete: (id: string) => Promise<DatabaseOperationResult>;
    };

    // Stock History CRUD
    stockHistory: {
      getAll: () => Promise<StockHistory[]>;
      getById: (id: string) => Promise<StockHistory | null>;
      getByProductId: (productId: string) => Promise<StockHistory[]>;
      getByDateRange: (startDate: string, endDate: string) => Promise<StockHistory[]>;
      insert: (data: StockHistoryInsert) => Promise<DatabaseOperationResult>;
      update: (id: string, data: StockHistoryUpdate) => Promise<DatabaseOperationResult>;
      delete: (id: string) => Promise<DatabaseOperationResult>;
    };

    // Product Manufacturers CRUD
    productManufacturers: {
      getAll: () => Promise<ProductManufacturer[]>;
      getById: (id: string) => Promise<ProductManufacturer | null>;
      getByProductId: (productId: string) => Promise<ProductManufacturer[]>;
      insert: (data: ProductManufacturerInsert) => Promise<DatabaseOperationResult>;
      update: (id: string, data: ProductManufacturerUpdate) => Promise<DatabaseOperationResult>;
      delete: (id: string) => Promise<DatabaseOperationResult>;
      archive: (id: string) => Promise<DatabaseOperationResult>;
      unarchive: (id: string) => Promise<DatabaseOperationResult>;
      getArchived: () => Promise<ProductManufacturer[]>;
    };

    // Deletion impact analysis functions
    analyzeBrokerTransactionDeletion: (transactionId: string) => Promise<any>;
    analyzeCustomerTransactionDeletion: (transactionId: string) => Promise<any>;
    analyzeBrokerLeisureDeletion: (leisureId: string) => Promise<any>;
    analyzeCustomerLeisureDeletion: (leisureId: string) => Promise<any>;
    analyzeProductDeletion: (productId: string) => Promise<any>;
    analyzeManufacturerDeletion: (manufacturerId: string) => Promise<any>;
    analyzeBrokerDeletion: (brokerId: string) => Promise<any>;
    analyzeCustomerDeletion: (customerId: string) => Promise<any>;
    seedDatabase: (secret: string) => Promise<{ success: boolean; message: string; error?: string }>;

    // Backup operations
    backup: {
      create: () => Promise<DatabaseOperationResult>;
      list: (directory?: string) => Promise<BackupListItem[]>;
      validate: (path: string) => Promise<{ valid: boolean; details: any }>;
      restore: (path: string) => Promise<{ success: boolean; errors: string[] }>;
      getSettings: () => Promise<any>;
      updateSettings: (settings: any) => Promise<any>;
      openFolder: () => Promise<void>;
    };
  };

  licensing: {
    getStatus: () => Promise<LicenseStatus>;
    validate: () => Promise<LicenseStatus>;
    importLicense: (blob: string) => Promise<LicenseStatus>;
    activateOnline: (payload: {
      activationKey: string;
      customerName?: string;
      customerPhone?: string;
    }) => Promise<{
      success: boolean;
      edition?: string;
      validUntil?: string;
      licenseStatus?: LicenseStatus;
      message?: string;
    }>;
    getDeviceFingerprint: () => Promise<string>;
    getSchedulerState: () => Promise<{ running: boolean }>;
    forceCheck: () => Promise<any>;
    openKeysFolder: () => Promise<void>;
    getEventHistory: () => Promise<{ events: any[]; licenseId: string | null }>;
    getHeartbeats: () => Promise<{ heartbeats: any[] }>;
    getBlob: () => Promise<{ blob: string | null; licenseId: string | null }>;
    adminUpdate: (fields: {
      license_id?: string;
      valid_from?: string;
      valid_until?: string;
      maintenance_until?: string;
      edition?: string;
      grace_until?: string | null;
      grace_mode?: string;
    }, secret: string) => Promise<{ success: boolean; error?: string }>;
    adminClearTamper: (licenseId: string, secret: string) => Promise<{ success: boolean; error?: string }>;
  };

  licensingEvents: {
    onWarning: (callback: (data: { daysLeft: number; level: string }) => void) => () => void;
    onExpired: (callback: (data: { reason: string }) => void) => () => void;
    onClockTamperDetected: (callback: (data: { timestamp: string; currentFingerprint: string }) => void) => () => void;
    onMaintenanceExpired: (callback: (data: { payload: any }) => void) => () => void;
  };

  auth: {
    login: (username: string, password: string) => Promise<AuthResult>;
    logout: () => Promise<AuthResult>;
    checkSession: () => Promise<SessionStatus>;
    changePassword: (username: string, currentPassword: string, newPassword: string) => Promise<AuthResult>;
    lockoutStatus: (username: string) => Promise<AuthResult>;
    requestReset: (username: string) => Promise<string>;
    verifyResetCode: (resetCodeBlob: string) => Promise<{
      success: boolean;
      valid: boolean;
      reason?: string;
      userId?: string;
      username?: string;
      licenseId?: string;
      expiresAt?: number;
    }>;
    performReset: (resetCodeBlob: string, newPassword: string) => Promise<{ success: boolean; message: string }>;
    hasUsers: () => Promise<{ hasUsers: boolean; count: number; error?: string }>;
    setupInitialAdmin: (payload: {
      username?: string;
      password: string;
      fullName?: string;
    }) => Promise<{
      success: boolean;
      user?: {
        user_id: string;
        username: string;
        license_id: string;
      };
      message?: string;
    }>;
  };

  devTools: {
    generateLicense: (input: {
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
    }, secret: string) => Promise<{
      success: boolean;
      blob?: string;
      payload?: Record<string, unknown>;
      error?: string;
    }>;
    createUser: (input: {
      username?: string;
      password?: string;
      licenseId?: string;
      maxFailedAttempts?: number;
    }, secret: string) => Promise<{
      success: boolean;
      userId?: string;
      username?: string;
      licenseId?: string;
      message?: string;
      error?: string;
    }>;
    generateResetCode: (input: { challengeBlob?: string }, secret: string) => Promise<{
      success: boolean;
      resetCodeBlob?: string;
      error?: string;
    }>;
    getUsers: (secret: string) => Promise<{
      success: boolean;
      users?: any[];
      error?: string;
    }>;
    resetUserPassword: (input: { username: string; newPassword: string }, secret: string) => Promise<{
      success: boolean;
      message?: string;
      error?: string;
    }>;
    authenticateSecret: (secret: string) => Promise<{ success: boolean; error?: string }>;
  };

  // Generic IPC invoke method for dynamic calls
  invoke: (channel: string, ...args: any[]) => Promise<any>;

  // App version
  getAppVersion: () => Promise<string>;

  // External links
  openExternal: (url: string) => Promise<void>;

  // Window controls
  reloadWindow: () => Promise<void>;

  // dialog controls
  showOpenDialog: (options: any) => Promise<any>;

  // Google Drive Cloud Backup
  googleDrive: {
    login: () => Promise<{ success: boolean; authUrl?: string } | void>;
    logout: () => Promise<void>;
    getStatus: () => Promise<any>;
    processQueue: () => Promise<void>;
    toggleItemStatus: (filePath: string) => Promise<boolean>;
  };

  export: {
    printToPDF: (fileName: string, subFolder: string) => Promise<{ success: boolean; path: string }>;
  };

  system: {
    copyFileToClipboard: (absolutePath: string) => Promise<{ success: boolean }>;
    saveAsset: (base64Data: string, fileName: string, subFolder?: string) => Promise<{ success: boolean; path?: string; error?: string }>;
    deleteAsset: (absolutePath: string) => Promise<{ success: boolean; error?: string }>;
    readAssetAsBase64: (absolutePath: string) => Promise<{ success: boolean; dataUrl?: string; error?: string }>;
  };

  googleDriveEvents: {
    onAuthSuccess: (callback: () => void) => () => void;
    onAuthError: (callback: (error: string) => void) => () => void;
  };
}

// Extend window interface
declare global {
  interface Window {
    electronAPI?: ElectronAPI;
  }
}
