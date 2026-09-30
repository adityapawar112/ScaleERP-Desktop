// scripts/unit-tests/licenseScheduler.test.ts

// Mock dependencies BEFORE any other imports
const path = require('path');
const Module = require('module');
const EventEmitter = require('events');

// Mock LicenseOperations state
const mockHeartbeats: any[] = [];

const licenseOpsMock = {
  logHeartbeat: async (data: any) => {
    console.log('[MOCK DB] logHeartbeat:', data);
    const record = { ...data, id: Date.now() };
    mockHeartbeats.unshift(record);
  },
  getRecentHeartbeats: async (limit: number, licenseId?: string) => {
    return mockHeartbeats.slice(0, limit);
  },
  getActiveLicense: async () => null,
  getLicenseById: async () => null,
  logLicenseEvent: async () => {},
  saveLicense: async () => {}
};

const originalLoad = Module._load;
Module._load = function(request: string, parent: any, isMain: boolean) {
  const normalizedRequest = request.replace(/\\/g, '/');
  
  if (request === 'electron') {
    return {
      app: {
        getPath: (name: string) => path.join(process.cwd(), 'test-userData')
      },
      BrowserWindow: class {
        webContents = { send: (channel: string, data: any) => {
          console.log(`[IPC SEND] ${channel}:`, data);
          (global as any).lastIpcMessage = { channel, data };
        }};
      }
    };
  }

  if (normalizedRequest.includes('database/licenseOperations')) {
    return licenseOpsMock;
  }

  if (normalizedRequest.includes('database/manager')) {
    return {
      dbManager: {
        getDatabase: () => ({
          run: () => {},
          get: () => {},
          all: () => {}
        })
      }
    };
  }

  return originalLoad.apply(this, arguments);
};

// Mock AuthService
class MockAuthService extends EventEmitter {
  async checkSession() {
    return { authenticated: true, user: { user_id: 'user_001' } };
  }
}

// Mock additional dependencies imported by licenseScheduler.ts
Module._load = (function(originalLoad) {
  return function(request: string, parent: any, isMain: boolean) {
    const normalizedRequest = request.replace(/\\/g, '/');
    
    if (request === 'electron') {
      return {
        app: {
          getPath: (name: string) => path.join(process.cwd(), 'test-userData')
        },
        BrowserWindow: class {
          webContents = { send: (channel: string, data: any) => {
            console.log(`[IPC SEND] ${channel}:`, data);
            (global as any).lastIpcMessage = { channel, data };
          }};
        }
      };
    }

    if (normalizedRequest.includes('node-cron')) {
      return {
        schedule: () => ({ stop: () => {} })
      };
    }

    if (normalizedRequest.includes('database/licenseOperations')) {
      return licenseOpsMock;
    }

    if (normalizedRequest.includes('database/manager')) {
      return {
        dbManager: {
          getDatabase: () => ({
            run: () => {},
            get: () => {},
            all: () => {}
          }),
          initialize: async () => {}
        }
      };
    }

    if (normalizedRequest.includes('services/deviceFingerprint')) {
      return {
        getDeviceFingerprint: () => 'test-device-id'
      };
    }

    if (normalizedRequest.includes('services/authService')) {
      return {
        AuthService: class extends EventEmitter {
          checkSession = async () => ({ authenticated: true, user: { user_id: 'user_001' } });
        }
      };
    }

    return originalLoad.apply(this, arguments);
  };
})(Module._load);

// Now we can require the classes under test
const { LicenseScheduler } = require('../../electron/services/licenseScheduler');
const { LicenseManager } = require('../../electron/services/licenseManager');

async function runTests() {
  console.log('--- Running LicenseScheduler unit tests ---');

  const lm = new LicenseManager({
    publicKey: 'dummy-key',
    licenseFilePath: 'test.lic',
    keyId: 'test_key'
  });

  // Mock LicenseManager methods to avoid file system and real validation
  lm.validateLicense = async () => (lm as any).cachedStatus;
  lm.getStatus = () => (lm as any).cachedStatus;

  // Force valid status for testing scheduler
  (lm as any).cachedStatus = {
    valid: true,
    state: 'valid',
    payload: { license_id: 'LIC-123' },
    daysUntilExpiry: 10,
    maintenanceActive: true
  };

  const auth = new MockAuthService() as any;
  const win = new (require('electron').BrowserWindow)() as any;
  const scheduler = new LicenseScheduler(lm, auth, win);

  // 1. Test Heartbeat Logging
  console.log('Testing Heartbeat Logging...');
  await (scheduler as any).logHeartbeat('startup');
  
  if (mockHeartbeats.length > 0 && mockHeartbeats[0].reason === 'startup') {
    console.log('✅ Heartbeat Logging OK');
  } else {
    console.error('❌ Heartbeat Logging Failed');
    process.exit(1);
  }

  // 2. Test Clock Tamper Detection (Normal)
  console.log('Testing Tamper Detection (Normal)...');
  const tamperNormal = await (scheduler as any).detectClockTampering();
  if (!tamperNormal) {
    console.log('✅ Normal Clock Detected OK');
  } else {
    console.error('❌ Normal Clock incorrectly flagged as Tampering');
    process.exit(1);
  }

  // 3. Test Clock Tamper Detection (Tampered)
  console.log('Testing Tamper Detection (Tampered)...');
  // Inject a future heartbeat
  mockHeartbeats.unshift({
    license_id: 'LIC-123',
    system_time_iso: new Date(Date.now() + 1000 * 60 * 60 * 24 * 10).toISOString(), // 10 days in future
    reason: 'hourly'
  });
  
  const tamperDetected = await (scheduler as any).detectClockTampering();
  if (tamperDetected) {
    console.log('✅ Clock Tamper Detection OK');
  } else {
    console.error('❌ Clock Tamper Detection Failed to flag future heartbeat');
    process.exit(1);
  }

  // 4. Test Expiry Warning IPC
  console.log('Testing Expiry Warning IPC...');
  (lm as any).cachedStatus.daysUntilExpiry = 5; // Urgent
  await (scheduler as any).checkLicenseExpiry();
  
  const msg = (global as any).lastIpcMessage;
  if (msg && msg.channel === 'license-warning' && msg.data.level === 'urgent') {
    console.log('✅ Expiry Warning IPC OK');
  } else {
    console.error('❌ Expiry Warning IPC Failed');
    process.exit(1);
  }

  console.log('--- All LicenseScheduler tests passed ---');
}

runTests().catch(err => {
  console.error(err);
  process.exit(1);
});