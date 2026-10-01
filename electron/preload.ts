import { contextBridge, ipcRenderer } from 'electron';
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
} from './database/types';

// Expose protected methods that allow the renderer process to use
// the ipcRenderer without exposing the entire object
contextBridge.exposeInMainWorld('electronAPI', {
  // Database operations
  database: {
    // Database stats
    getStats: (): Promise<DatabaseStats> => ipcRenderer.invoke('db:getStats'),
    getDatabaseStats: (): Promise<DatabaseStats> => ipcRenderer.invoke('db:getDatabaseStats'),



    // Products CRUD
    products: {
      getAll: (): Promise<Product[]> => ipcRenderer.invoke('db:products:getAll'),
      getById: (id: string): Promise<Product | null> => ipcRenderer.invoke('db:products:getById', id),
      insert: (data: ProductInsert): Promise<DatabaseOperationResult> => ipcRenderer.invoke('db:products:insert', data),
      update: (id: string, data: ProductUpdate): Promise<DatabaseOperationResult> => ipcRenderer.invoke('db:products:update', id, data),
      delete: (id: string): Promise<DatabaseOperationResult> => ipcRenderer.invoke('db:products:delete', id),
      archive: (id: string): Promise<DatabaseOperationResult> => ipcRenderer.invoke('db:products:archive', id),
      unarchive: (id: string): Promise<DatabaseOperationResult> => ipcRenderer.invoke('db:products:unarchive', id),
      getArchived: (): Promise<Product[]> => ipcRenderer.invoke('db:products:getArchived'),
    },

    // Brokers CRUD
    brokers: {
      getAll: (): Promise<Broker[]> => ipcRenderer.invoke('db:brokers:getAll'),
      getById: (id: string): Promise<Broker | null> => ipcRenderer.invoke('db:brokers:getById', id),
      insert: (data: BrokerInsert): Promise<DatabaseOperationResult> => ipcRenderer.invoke('db:brokers:insert', data),
      update: (id: string, data: BrokerUpdate): Promise<DatabaseOperationResult> => ipcRenderer.invoke('db:brokers:update', id, data),
      delete: (id: string): Promise<DatabaseOperationResult> => ipcRenderer.invoke('db:brokers:delete', id),
    },

    // Customers CRUD
    customers: {
      getAll: (): Promise<Customer[]> => ipcRenderer.invoke('db:customers:getAll'),
      getById: (id: string): Promise<Customer | null> => ipcRenderer.invoke('db:customers:getById', id),
      insert: (data: CustomerInsert): Promise<DatabaseOperationResult> => ipcRenderer.invoke('db:customers:insert', data),
      update: (id: string, data: CustomerUpdate): Promise<DatabaseOperationResult> => ipcRenderer.invoke('db:customers:update', id, data),
      delete: (id: string): Promise<DatabaseOperationResult> => ipcRenderer.invoke('db:customers:delete', id),
    },

    // Broker Transactions CRUD
    brokerTransactions: {
      getAll: (): Promise<BrokerTransaction[]> => ipcRenderer.invoke('db:brokerTransactions:getAll'),
      getById: (id: string): Promise<BrokerTransaction | null> => ipcRenderer.invoke('db:brokerTransactions:getById', id),
      getByBrokerId: (brokerId: string): Promise<BrokerTransaction[]> => ipcRenderer.invoke('db:brokerTransactions:getByBrokerId', brokerId),
      insert: (data: BrokerTransactionInsert): Promise<DatabaseOperationResult> => ipcRenderer.invoke('db:brokerTransactions:insert', data),
      update: (id: string, data: BrokerTransactionUpdate): Promise<DatabaseOperationResult> => ipcRenderer.invoke('db:brokerTransactions:update', id, data),
      delete: (id: string): Promise<DatabaseOperationResult> => ipcRenderer.invoke('db:brokerTransactions:delete', id),
    },

    // Customer Transactions CRUD
    customerTransactions: {
      getAll: (): Promise<CustomerTransaction[]> => ipcRenderer.invoke('db:customerTransactions:getAll'),
      getById: (id: string): Promise<CustomerTransaction | null> => ipcRenderer.invoke('db:customerTransactions:getById', id),
      getByCustomerId: (customerId: string): Promise<CustomerTransaction[]> => ipcRenderer.invoke('db:customerTransactions:getByCustomerId', customerId),
      insert: (data: CustomerTransactionInsert): Promise<DatabaseOperationResult> => ipcRenderer.invoke('db:customerTransactions:insert', data),
      update: (id: string, data: CustomerTransactionUpdate): Promise<DatabaseOperationResult> => ipcRenderer.invoke('db:customerTransactions:update', id, data),
      delete: (id: string): Promise<DatabaseOperationResult> => ipcRenderer.invoke('db:customerTransactions:delete', id),
    },

    // Broker Leisures CRUD
    brokerLeisures: {
      getAll: (): Promise<BrokerLeisure[]> => ipcRenderer.invoke('db:brokerLeisures:getAll'),
      getById: (id: string): Promise<BrokerLeisure | null> => ipcRenderer.invoke('db:brokerLeisures:getById', id),
      getByBrokerId: (brokerId: string): Promise<BrokerLeisure[]> => ipcRenderer.invoke('db:brokerLeisures:getByBrokerId', brokerId),
      insert: (data: BrokerLeisureInsert): Promise<DatabaseOperationResult> => ipcRenderer.invoke('db:brokerLeisures:insert', data),
      update: (id: string, data: BrokerLeisureUpdate): Promise<DatabaseOperationResult> => ipcRenderer.invoke('db:brokerLeisures:update', id, data),
      delete: (id: string): Promise<DatabaseOperationResult> => ipcRenderer.invoke('db:brokerLeisures:delete', id),
    },

    // Customer Leisures CRUD
    customerLeisures: {
      getAll: (): Promise<CustomerLeisure[]> => ipcRenderer.invoke('db:customerLeisures:getAll'),
      getById: (id: string): Promise<CustomerLeisure | null> => ipcRenderer.invoke('db:customerLeisures:getById', id),
      getByCustomerId: (customerId: string): Promise<CustomerLeisure[]> => ipcRenderer.invoke('db:customerLeisures:getByCustomerId', customerId),
      insert: (data: CustomerLeisureInsert): Promise<DatabaseOperationResult> => ipcRenderer.invoke('db:customerLeisures:insert', data),
      update: (id: string, data: CustomerLeisureUpdate): Promise<DatabaseOperationResult> => ipcRenderer.invoke('db:customerLeisures:update', id, data),
      delete: (id: string): Promise<DatabaseOperationResult> => ipcRenderer.invoke('db:customerLeisures:delete', id),
    },

    // Stock History CRUD
    stockHistory: {
      getAll: (): Promise<StockHistory[]> => ipcRenderer.invoke('db:stockHistory:getAll'),
      getById: (id: string): Promise<StockHistory | null> => ipcRenderer.invoke('db:stockHistory:getById', id),
      getByProductId: (productId: string): Promise<StockHistory[]> => ipcRenderer.invoke('db:stockHistory:getByProductId', productId),
      getByDateRange: (startDate: string, endDate: string): Promise<StockHistory[]> =>
        ipcRenderer.invoke('db:stockHistory:getByDateRange', startDate, endDate),
      insert: (data: StockHistoryInsert): Promise<DatabaseOperationResult> => ipcRenderer.invoke('db:stockHistory:insert', data),
      update: (id: string, data: StockHistoryUpdate): Promise<DatabaseOperationResult> => ipcRenderer.invoke('db:stockHistory:update', id, data),
      delete: (id: string): Promise<DatabaseOperationResult> => ipcRenderer.invoke('db:stockHistory:delete', id),
    },

    // Product Manufacturers CRUD
    productManufacturers: {
      getAll: (): Promise<ProductManufacturer[]> => ipcRenderer.invoke('db:productManufacturers:getAll'),
      getById: (id: string): Promise<ProductManufacturer | null> => ipcRenderer.invoke('db:productManufacturers:getById', id),
      getByProductId: (productId: string): Promise<ProductManufacturer[]> => ipcRenderer.invoke('db:productManufacturers:getByProductId', productId),
      insert: (data: ProductManufacturerInsert): Promise<DatabaseOperationResult> => ipcRenderer.invoke('db:productManufacturers:insert', data),
      update: (id: string, data: ProductManufacturerUpdate): Promise<DatabaseOperationResult> => ipcRenderer.invoke('db:productManufacturers:update', id, data),
      delete: (id: string): Promise<DatabaseOperationResult> => ipcRenderer.invoke('db:productManufacturers:delete', id),
      archive: (id: string): Promise<DatabaseOperationResult> => ipcRenderer.invoke('db:productManufacturers:archive', id),
      unarchive: (id: string): Promise<DatabaseOperationResult> => ipcRenderer.invoke('db:productManufacturers:unarchive', id),
      getArchived: (): Promise<ProductManufacturer[]> => ipcRenderer.invoke('db:productManufacturers:getArchived'),
    },

    // Deletion impact analysis functions
    analyzeBrokerTransactionDeletion: (transactionId: string): Promise<any> => ipcRenderer.invoke('db:analyzeBrokerTransactionDeletion', transactionId),
    analyzeCustomerTransactionDeletion: (transactionId: string): Promise<any> => ipcRenderer.invoke('db:analyzeCustomerTransactionDeletion', transactionId),
    analyzeBrokerLeisureDeletion: (leisureId: string): Promise<any> => ipcRenderer.invoke('db:analyzeBrokerLeisureDeletion', leisureId),
    analyzeCustomerLeisureDeletion: (leisureId: string): Promise<any> => ipcRenderer.invoke('db:analyzeCustomerLeisureDeletion', leisureId),
    analyzeProductDeletion: (productId: string): Promise<any> => ipcRenderer.invoke('db:analyzeProductDeletion', productId),
    analyzeManufacturerDeletion: (manufacturerId: string): Promise<any> => ipcRenderer.invoke('db:analyzeManufacturerDeletion', manufacturerId),
    analyzeBrokerDeletion: (brokerId: string): Promise<any> => ipcRenderer.invoke('db:analyzeBrokerDeletion', brokerId),
    analyzeCustomerDeletion: (customerId: string): Promise<any> => ipcRenderer.invoke('db:analyzeCustomerDeletion', customerId),
    seedDatabase: (secret: string): Promise<{ success: boolean; message: string; error?: string }> => ipcRenderer.invoke('db:seedDatabase', secret),

    // Backup operations
    backup: {
      create: (): Promise<any> => ipcRenderer.invoke('db:backup:create'),
      list: (directory?: string): Promise<any[]> => ipcRenderer.invoke('db:backup:list', directory),
      validate: (path: string): Promise<{ valid: boolean; details: any }> => ipcRenderer.invoke('db:backup:validate', path),
      restore: (path: string): Promise<{ success: boolean; errors: string[] }> => ipcRenderer.invoke('db:backup:restore', path),
      getSettings: (): Promise<any> => ipcRenderer.invoke('db:backup:getSettings'),
      updateSettings: (settings: any): Promise<any> => ipcRenderer.invoke('db:backup:updateSettings', settings),
      openFolder: (): Promise<void> => ipcRenderer.invoke('db:backup:openFolder'),
    },
  },

  licensing: {
    getStatus: (): Promise<any> => ipcRenderer.invoke('license:getStatus'),
    validate: (): Promise<any> => ipcRenderer.invoke('license:validate'),
    importLicense: (blob: string): Promise<any> => ipcRenderer.invoke('license:import', blob),
    activateOnline: (payload: { activationKey: string; customerName?: string; customerPhone?: string }): Promise<any> =>
      ipcRenderer.invoke('license:activate-online', payload),
    getDeviceFingerprint: (): Promise<string> => ipcRenderer.invoke('license:getDeviceFingerprint'),

    // Scheduler invoke methods
    getSchedulerState: (): Promise<{ running: boolean }> => ipcRenderer.invoke('license:scheduler:state'),
    forceCheck: (): Promise<any> => ipcRenderer.invoke('license:scheduler:force-check'),

    // Opens the vendor/keys folder in the system file explorer
    openKeysFolder: (): Promise<void> => ipcRenderer.invoke('license:open-keys-folder'),

    // Returns recent license events for the active license
    getEventHistory: (): Promise<{ events: any[]; licenseId: string | null }> => ipcRenderer.invoke('license:getEventHistory'),

    // Returns recent heartbeat entries
    getHeartbeats: (): Promise<{ heartbeats: any[] }> => ipcRenderer.invoke('license:getHeartbeats'),

    // Returns the raw license blob for the active license
    getBlob: (): Promise<{ blob: string | null; licenseId: string | null }> => ipcRenderer.invoke('license:getBlob'),

    // Developer admin: update license fields directly (not cryptographically signed)
    adminUpdate: (fields: {
      license_id?: string;
      valid_from?: string;
      valid_until?: string;
      maintenance_until?: string;
      edition?: string;
      grace_until?: string | null;
      grace_mode?: string;
    }, secret: string): Promise<{ success: boolean; error?: string }> => ipcRenderer.invoke('license:admin:update', fields, secret),
    adminClearTamper: (licenseId: string, secret: string): Promise<{ success: boolean; error?: string }> => ipcRenderer.invoke('license:admin:clear-tamper', licenseId, secret),
  },

  // License event listeners (one-way from main to renderer)
  // Each listener returns a cleanup function to remove the listener when called.
  licensingEvents: {
    onWarning: (callback: (data: { daysLeft: number; level: string }) => void) => {
      const handler = (_event: unknown, data: { daysLeft: number; level: string }) => callback(data);
      ipcRenderer.on('license-warning', handler);
      return () => { ipcRenderer.removeListener('license-warning', handler); };
    },
    onExpired: (callback: (data: { reason: string }) => void) => {
      const handler = (_event: unknown, data: { reason: string }) => callback(data);
      ipcRenderer.on('license-expired', handler);
      return () => { ipcRenderer.removeListener('license-expired', handler); };
    },
    onClockTamperDetected: (callback: (data: { timestamp: string; currentFingerprint: string }) => void) => {
      const handler = (_event: unknown, data: { timestamp: string; currentFingerprint: string }) => callback(data);
      ipcRenderer.on('clock-tamper-detected', handler);
      return () => { ipcRenderer.removeListener('clock-tamper-detected', handler); };
    },
    onMaintenanceExpired: (callback: (data: { payload: any }) => void) => {
      const handler = (_event: unknown, data: { payload: any }) => callback(data);
      ipcRenderer.on('maintenance-expired', handler);
      return () => { ipcRenderer.removeListener('maintenance-expired', handler); };
    },
  },

  auth: {
    login: (username: string, password: string): Promise<any> => ipcRenderer.invoke('auth:login', username, password),
    logout: (): Promise<any> => ipcRenderer.invoke('auth:logout'),
    checkSession: (): Promise<any> => ipcRenderer.invoke('auth:session-check'),
    changePassword: (username: string, currentPassword: string, newPassword: string): Promise<any> =>
      ipcRenderer.invoke('auth:change-password', username, currentPassword, newPassword),
    lockoutStatus: (username: string): Promise<any> => ipcRenderer.invoke('auth:lockout-status', username),
    requestReset: (username: string): Promise<string> => ipcRenderer.invoke('auth:request-reset', username),
    verifyResetCode: (resetCodeBlob: string): Promise<{
      success: boolean;
      valid: boolean;
      reason?: string;
      userId?: string;
      username?: string;
      licenseId?: string;
      expiresAt?: number;
    }> => ipcRenderer.invoke('auth:verify-reset-code', resetCodeBlob),
    performReset: (resetCodeBlob: string, newPassword: string): Promise<{ success: boolean; message: string }> =>
      ipcRenderer.invoke('auth:perform-reset', resetCodeBlob, newPassword),
    hasUsers: (): Promise<{ hasUsers: boolean; count: number; error?: string }> =>
      ipcRenderer.invoke('auth:has-users'),
    setupInitialAdmin: (payload: { username?: string; password: string; fullName?: string }): Promise<any> =>
      ipcRenderer.invoke('auth:setup-initial-admin', payload),
  },

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
      customDeviceFingerprint?: string | null;
      privateKeyPem?: string;
    }, secret: string): Promise<{
      success: boolean;
      blob?: string;
      payload?: Record<string, unknown>;
      error?: string;
    }> => ipcRenderer.invoke('dev:generate-license', input, secret),

    createUser: (input: {
      username?: string;
      password?: string;
      licenseId?: string;
      maxFailedAttempts?: number;
    }, secret: string): Promise<{
      success: boolean;
      userId?: string;
      username?: string;
      licenseId?: string;
      message?: string;
      error?: string;
    }> => ipcRenderer.invoke('dev:create-user', input, secret),

    generateResetCode: (input: { challengeBlob?: string }, secret: string): Promise<{
      success: boolean;
      resetCodeBlob?: string;
      error?: string;
    }> => ipcRenderer.invoke('dev:generate-reset-code', input, secret),

    getUsers: (secret: string): Promise<{
      success: boolean;
      users?: any[];
      error?: string;
    }> => ipcRenderer.invoke('dev:get-users', secret),

    resetUserPassword: (input: { username: string; newPassword: string }, secret: string): Promise<{
      success: boolean;
      message?: string;
      error?: string;
    }> => ipcRenderer.invoke('dev:reset-user-password', input, secret),
    authenticateSecret: (secret: string): Promise<{ success: boolean; error?: string }> => ipcRenderer.invoke('dev:authenticate-secret', secret),
  },

  // Generic IPC invoke method for dynamic calls
  invoke: (channel: string, ...args: any[]): Promise<any> => ipcRenderer.invoke(channel, ...args),

  // App version
  getAppVersion: (): Promise<string> => ipcRenderer.invoke('get-app-version'),

  // External links
  openExternal: (url: string): Promise<void> => ipcRenderer.invoke('open-external', url),

  // Window controls
  reloadWindow: (): Promise<void> => ipcRenderer.invoke('app:reloadWindow'),

  // Dialog controls
  showOpenDialog: (options: any): Promise<any> => ipcRenderer.invoke('dialog:showOpenDialog', options),

  // Google Drive Cloud Backup
  googleDrive: {
    login: (): Promise<void> => ipcRenderer.invoke('google-drive:login'),
    logout: (): Promise<void> => ipcRenderer.invoke('google-drive:logout'),
    getStatus: (): Promise<any> => ipcRenderer.invoke('google-drive:getStatus'),
    processQueue: (): Promise<void> => ipcRenderer.invoke('google-drive:processQueue'),
    toggleItemStatus: (filePath: string): Promise<boolean> => ipcRenderer.invoke('google-drive:toggleItemStatus', filePath),
  },

  export: {
    printToPDF: (fileName: string, subFolder: string): Promise<{ success: boolean; path: string }> => 
      ipcRenderer.invoke('export:printToPDF', fileName, subFolder),
  },

  system: {
    copyFileToClipboard: (absolutePath: string): Promise<{ success: boolean }> => 
      ipcRenderer.invoke('system:copyFileToClipboard', absolutePath),
    saveAsset: (base64Data: string, fileName: string, subFolder?: string): Promise<{ success: boolean; path?: string; error?: string }> =>
      ipcRenderer.invoke('system:saveAsset', base64Data, fileName, subFolder),
    deleteAsset: (absolutePath: string): Promise<{ success: boolean; error?: string }> =>
      ipcRenderer.invoke('system:deleteAsset', absolutePath),
    readAssetAsBase64: (absolutePath: string): Promise<{ success: boolean; dataUrl?: string; error?: string }> =>
      ipcRenderer.invoke('system:readAssetAsBase64', absolutePath),
  },

  googleDriveEvents: {
    onAuthSuccess: (callback: () => void) => {
      const handler = () => callback();
      ipcRenderer.on('google-drive:auth-success', handler);
      return () => { ipcRenderer.removeListener('google-drive:auth-success', handler); };
    },
    onAuthError: (callback: (error: string) => void) => {
      const handler = (_event: unknown, error: string) => callback(error);
      ipcRenderer.on('google-drive:auth-error', handler);
      return () => { ipcRenderer.removeListener('google-drive:auth-error', handler); };
    },
  },
});


// Remove this if you don't need it
console.log('Preload script loaded successfully');
