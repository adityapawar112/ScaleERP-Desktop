/**
 * scripts/master-licensing-e2e.ts
 * 
 * Unified End-to-End Licensing Lifecycle Verification.
 * This script verifies the entire flow from generation to hard lock.
 */

import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';
import { LicenseManager } from '../electron/services/licenseManager';
import { LicenseEnforcement, Operation } from '../electron/services/licenseEnforcement';
import { dbManager } from '../electron/database/manager';
import { signLicense } from '../electron/services/cryptoUtils';

// Mock App Data Directory
const MOCK_APP_DATA = path.join(process.cwd(), 'temp-e2e-data');
const MOCK_LICENSE_PATH = path.join(MOCK_APP_DATA, 'license.lic');
const MOCK_DB_PATH = path.join(MOCK_APP_DATA, 'inventory.db');

// Private Key for signing test licenses
const PRIVATE_KEY_PATH = path.join(process.cwd(), 'vendor', 'keys', 'private_key.pem');
const PRIVATE_KEY = fs.readFileSync(PRIVATE_KEY_PATH, 'utf8');

// Helper to add days to ISO date
function addDays(isoDate: string, days: number): string {
  const date = new Date(isoDate);
  date.setDate(date.getDate() + days);
  return date.toISOString();
}

// 1. Setup Mock Environment
async function setupEnvironment() {
  if (fs.existsSync(MOCK_APP_DATA)) {
    fs.rmSync(MOCK_APP_DATA, { recursive: true, force: true });
  }
  fs.mkdirSync(MOCK_APP_DATA, { recursive: true });

  // Override dbPath in manager
  (dbManager as any).dbPath = MOCK_DB_PATH;
  await dbManager.initialize();
  console.log('✅ Mock environment setup at:', MOCK_APP_DATA);
}

// 2. Generate License Blob
function generateLicense(overrides: any = {}): string {
  const now = new Date().toISOString();
  const payload = {
    license_id: 'e2e-test-lic-' + Date.now(),
    customer_id: 'e2e-customer',
    edition: 'Pro',
    valid_from: now,
    valid_until: addDays(now, 365),
    maintenance_until: addDays(now, 90),
    device_fingerprint: null,
    features: { inventory: true, reports: true },
    ...overrides
  };

  return signLicense(payload, PRIVATE_KEY, 'key_001');
}

// 3. Run E2E Flow
async function runE2E() {
  console.log('\n🚀 Starting Master Licensing E2E Verification...\n');

  try {
    await setupEnvironment();

    // --- STEP 1: INITIAL ACTIVATION ---
    console.log('Step 1: Validating Initial Activation...');
    const manager = new LicenseManager({ 
      licenseFilePath: MOCK_LICENSE_PATH,
      publicKeyPath: path.join(process.cwd(), 'vendor', 'keys', 'public_key.pem') 
    });
    
    let status = await manager.validateLicense();
    if (status.valid) throw new Error('License should be invalid initially');

    const validBlob = generateLicense();
    const importResult = await manager.importLicense(validBlob);
    if (!importResult.valid) throw new Error('Activation failed: ' + importResult.reason);
    console.log('  ✓ Initial activation successful');

    // --- STEP 2: MAINTENANCE WARNING (30 Days) ---
    console.log('Step 2: Verifying Info Warning (<= 30 Days)...');
    const warningBlob = generateLicense({
      maintenance_until: addDays(new Date().toISOString(), 25)
    });
    fs.writeFileSync(MOCK_LICENSE_PATH, warningBlob);
    
    // Reset cache
    (manager as any).cachedStatus = null;
    status = await manager.validateLicense();
    if (status.daysUntilExpiry > 30) throw new Error('Warning threshold failed');
    console.log('  ✓ Info warning detected at 25 days');

    // --- STEP 3: URGENT WARNING (7 Days) ---
    console.log('Step 3: Verifying Urgent Warning (<= 7 Days)...');
    const urgentBlob = generateLicense({
      maintenance_until: addDays(new Date().toISOString(), 5)
    });
    fs.writeFileSync(MOCK_LICENSE_PATH, urgentBlob);
    (manager as any).cachedStatus = null;
    status = await manager.validateLicense();
    if (status.daysUntilExpiry > 7) throw new Error('Urgent threshold failed');
    console.log('  ✓ Urgent warning detected at 5 days');

    // --- STEP 4: GRACE PERIOD (View-Only) ---
    console.log('Step 4: Verifying Grace Period (Maintenance Expired, Grace Active)...');
    const graceBlob = generateLicense({
      maintenance_until: addDays(new Date().toISOString(), -2),
      grace_until: addDays(new Date().toISOString(), 5),
      grace_mode: 'view_only'
    });
    fs.writeFileSync(MOCK_LICENSE_PATH, graceBlob);
    (manager as any).cachedStatus = null;
    status = await manager.validateLicense();
    
    const enforcement = new LicenseEnforcement(manager);
    if (!enforcement.isAllowed(Operation.ReadData)) throw new Error('Read should be allowed in grace');
    if (enforcement.isAllowed(Operation.WriteData)) throw new Error('Write should be blocked in grace');
    console.log('  ✓ Grace period enforced (Read=OK, Write=Blocked)');

    // --- STEP 5: HARD LOCK (Expired) ---
    console.log('Step 5: Verifying Hard Lock (Anniversary + Grace Expired)...');
    const expiredBlob = generateLicense({
      valid_from: addDays(new Date().toISOString(), -380), // ~1 year and 15 days ago
      maintenance_until: addDays(new Date().toISOString(), -300),
      valid_until: addDays(new Date().toISOString(), -15)
    });
    fs.writeFileSync(MOCK_LICENSE_PATH, expiredBlob);
    (manager as any).cachedStatus = null;
    status = await manager.validateLicense();
    
    if (status.valid) throw new Error('Expired license should be invalid');
    if (enforcement.isAllowed(Operation.ReadData)) throw new Error('Read should be blocked when expired');
    console.log('  ✓ Hard lock enforced (All operations blocked)');

    // --- STEP 6: DB LOGGING VERIFICATION ---
    console.log('Step 6: Verifying Event Logging...');
    const allEvents: any[] = await new Promise((resolve, reject) => {
      dbManager.getDatabase().all('SELECT * FROM license_events', (err, rows) => {
        if (err) reject(err);
        else resolve(rows);
      });
    });
    
    if (allEvents.length === 0) throw new Error('No events logged in database');
    console.log(`  ✓ Found ${allEvents.length} security events in database`);
    console.log('  ✓ Sample events:', allEvents.slice(0, 3).map(e => e.event_type).join(', '));

    console.log('\n✨ MASTER E2E VERIFICATION COMPLETED SUCCESSFULLY!');
    process.exit(0);
  } catch (error) {
    console.error('\n❌ E2E VERIFICATION FAILED:');
    console.error(error);
    process.exit(1);
  } finally {
    // Cleanup
    // fs.rmSync(MOCK_APP_DATA, { recursive: true, force: true });
  }
}

runE2E();
