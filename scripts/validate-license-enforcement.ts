// scripts/validate-license-enforcement.ts
import * as fs from 'fs';
import * as path from 'path';
import crypto from 'crypto';
import { LicenseManager } from '../electron/services/licenseManager';
import { LicenseEnforcement, Operation } from '../electron/services/licenseEnforcement';
import { signLicense } from '../electron/services/cryptoUtils';

/**
 * Validation script for LicenseEnforcement.ts
 * Tests that operations are correctly allowed/denied based on license state.
 */
async function runValidation() {
  console.log('🧪 Starting License Enforcement Validation...');

  const vendorKeysDir = path.join(process.cwd(), 'vendor', 'keys');
  const privateKeyPath = path.join(vendorKeysDir, 'private_key.pem');
  const publicKeyPath = path.join(vendorKeysDir, 'public_key.pem');

  if (!fs.existsSync(privateKeyPath) || !fs.existsSync(publicKeyPath)) {
    console.error('❌ Error: Vendor keys not found. Run key generation first.');
    process.exit(1);
  }

  const privateKey = fs.readFileSync(privateKeyPath, 'utf8');
  const publicKey = fs.readFileSync(publicKeyPath, 'utf8');

  // Helper to create a license manager with a specific license
  const createManagerWithLicense = (payload: any) => {
    const blob = signLicense(payload, privateKey, 'key_001');
    const licensePath = path.join(process.cwd(), 'enforcement-test.lic');
    fs.writeFileSync(licensePath, blob);
    
    return new LicenseManager({
      publicKey,
      licenseFilePath: licensePath,
      keyId: 'key_001'
    });
  };

  const now = new Date();
  const future = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
  const past = new Date(now.getTime() - 10 * 24 * 60 * 60 * 1000);

  // --- Test Case 1: Valid License ---
  console.log('\n--- Case 1: Valid License ---');
  const validPayload = {
    license_id: 'LIC-VALID',
    customer_id: 'CUST-1',
    edition: 'Pro',
    valid_from: past.toISOString(),
    valid_until: future.toISOString(),
    maintenance_until: future.toISOString(),
    features: { inventory: true }
  };
  
  const managerValid = createManagerWithLicense(validPayload);
  await managerValid.validateLicense();
  const enforcementValid = new LicenseEnforcement(managerValid);

  try {
    enforcementValid.ensureAllowed(Operation.WriteData);
    console.log('✅ Success: WriteData allowed on valid license');
    enforcementValid.ensureAllowed(Operation.ReadData);
    console.log('✅ Success: ReadData allowed on valid license');
  } catch (e: any) {
    console.error(`❌ Failure: Operation denied on valid license: ${e.message}`);
  }

  // --- Test Case 2: Grace Period ---
  console.log('\n--- Case 2: Grace Period (View-Only) ---');
  const gracePayload = {
    license_id: 'LIC-GRACE',
    customer_id: 'CUST-1',
    edition: 'Pro',
    valid_from: past.toISOString(),
    valid_until: future.toISOString(),
    maintenance_until: past.toISOString(), // Expired maintenance
    grace_until: future.toISOString(),     // Within grace
    grace_mode: 'view_only',
    features: { inventory: true }
  };
  
  const managerGrace = createManagerWithLicense(gracePayload);
  await managerGrace.validateLicense();
  const enforcementGrace = new LicenseEnforcement(managerGrace);

  try {
    enforcementGrace.ensureAllowed(Operation.ReadData);
    console.log('✅ Success: ReadData allowed in grace');
    enforcementGrace.ensureAllowed(Operation.ExportData);
    console.log('✅ Success: ExportData allowed in grace');
  } catch (e: any) {
    console.error(`❌ Failure: Read/Export denied in grace: ${e.message}`);
  }

  try {
    enforcementGrace.ensureAllowed(Operation.WriteData);
    console.error('❌ Failure: WriteData allowed in grace (should be denied)');
  } catch (e: any) {
    console.log(`✅ Success: WriteData correctly denied in grace: ${e.message}`);
  }

  // --- Test Case 3: Expired License ---
  console.log('\n--- Case 3: Expired License ---');
  const expiredPayload = {
    license_id: 'LIC-EXPIRED',
    customer_id: 'CUST-1',
    edition: 'Pro',
    valid_from: past.toISOString(),
    valid_until: past.toISOString(),
    maintenance_until: past.toISOString(),
    features: { inventory: true }
  };
  
  const managerExpired = createManagerWithLicense(expiredPayload);
  await managerExpired.validateLicense();
  const enforcementExpired = new LicenseEnforcement(managerExpired);

  try {
    enforcementExpired.ensureAllowed(Operation.ReadData);
    console.error('❌ Failure: ReadData allowed on expired license');
  } catch (e: any) {
    console.log(`✅ Success: ReadData denied on expired license: ${e.message}`);
  }

  try {
    enforcementExpired.ensureAllowed(Operation.WriteData);
    console.error('❌ Failure: WriteData allowed on expired license');
  } catch (e: any) {
    console.log(`✅ Success: WriteData denied on expired license: ${e.message}`);
  }

  // Clean up
  if (fs.existsSync('enforcement-test.lic')) fs.unlinkSync('enforcement-test.lic');
  
  console.log('\n🏁 License Enforcement Validation Complete.');
}

runValidation().catch(console.error);