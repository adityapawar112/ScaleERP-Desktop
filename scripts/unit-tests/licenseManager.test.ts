// scripts/unit-tests/licenseManager.test.ts
import crypto from 'crypto';
import * as fs from 'fs';
import * as path from 'path';
import { LicenseManager } from '../../electron/services/licenseManager';
import { signLicense } from '../../electron/services/cryptoUtils';
import { getDeviceFingerprint } from '../../electron/services/deviceFingerprint';

// Mock Module._load to handle electron.app.getPath when running in pure Node
const Module = require('module');
const originalLoad = Module._load;
Module._load = function(request: string, parent: any, isMain: boolean) {
  if (request === 'electron') {
    return {
      app: {
        getPath: (name: string) => path.join(process.cwd(), 'test-userData')
      }
    };
  }
  return originalLoad.apply(this, arguments);
};

async function runTests() {
  console.log('--- Running LicenseManager unit tests ---');

  const testDir = path.join(process.cwd(), 'test-run');
  if (!fs.existsSync(testDir)) fs.mkdirSync(testDir);
  
  const licensePath = path.join(testDir, 'test.lic');
  const { publicKey, privateKey } = crypto.generateKeyPairSync('rsa', {
    modulusLength: 2048,
    publicKeyEncoding: { type: 'spki', format: 'pem' },
    privateKeyEncoding: { type: 'pkcs8', format: 'pem' },
  });

  const lm = new LicenseManager({
    publicKey,
    licenseFilePath: licensePath,
    keyId: 'test_key'
  });

  const fingerprint = getDeviceFingerprint();

  // 1. Test Valid License
  console.log('Testing Valid License...');
  const validPayload = {
    license_id: 'LIC-001',
    customer_id: 'CUST-001',
    edition: 'Pro',
    valid_from: new Date(Date.now() - 86400000).toISOString(), // Yesterday
    valid_until: new Date(Date.now() + 31536000000).toISOString(), // 1 year
    maintenance_until: new Date(Date.now() + 31536000000).toISOString(),
    device_fingerprint: fingerprint
  };

  const validBlob = signLicense(validPayload, privateKey, 'test_key');
  const validStatus = await lm.validateLicenseBlob(validBlob);

  if (validStatus.valid && validStatus.state === 'valid') {
    console.log('✅ Valid License OK');
  } else {
    console.error('❌ Valid License Failed', validStatus.reason);
    process.exit(1);
  }

  // 2. Test Future Dated License
  console.log('Testing Future Dated License...');
  const futurePayload = {
    ...validPayload,
    valid_from: new Date(Date.now() + 86400000).toISOString() // Tomorrow
  };
  const futureBlob = signLicense(futurePayload, privateKey, 'test_key');
  const futureStatus = await lm.validateLicenseBlob(futureBlob);

  if (!futureStatus.valid && futureStatus.reason === 'License is not active yet') {
    console.log('✅ Future Dated License Rejection OK');
  } else {
    console.error('❌ Future Dated License Rejection Failed', futureStatus.reason);
    process.exit(1);
  }

  // 3. Test Expired License
  console.log('Testing Expired License...');
  const expiredPayload = {
    ...validPayload,
    maintenance_until: new Date(Date.now() - 86400000).toISOString() // Yesterday
  };
  const expiredBlob = signLicense(expiredPayload, privateKey, 'test_key');
  const expiredStatus = await lm.validateLicenseBlob(expiredBlob);

  if (!expiredStatus.valid && expiredStatus.state === 'expired') {
    console.log('✅ Expired License Rejection OK');
  } else {
    console.error('❌ Expired License Rejection Failed', expiredStatus.state);
    process.exit(1);
  }

  // 4. Test Fingerprint Mismatch
  console.log('Testing Fingerprint Mismatch...');
  const mismatchPayload = {
    ...validPayload,
    device_fingerprint: 'wrong-fingerprint'
  };
  const mismatchBlob = signLicense(mismatchPayload, privateKey, 'test_key');
  const mismatchStatus = await lm.validateLicenseBlob(mismatchBlob);

  if (!mismatchStatus.valid && mismatchStatus.reason === 'Device fingerprint mismatch') {
    console.log('✅ Fingerprint Mismatch Rejection OK');
  } else {
    console.error('❌ Fingerprint Mismatch Rejection Failed', mismatchStatus.reason);
    process.exit(1);
  }

  // 5. Test Grace Period Transition (active grace)
  console.log('Testing Grace Period Transition (active grace)...');
  const graceActivePayload = {
    ...validPayload,
    maintenance_until: new Date(Date.now() - 86400000).toISOString(), // Yesterday
    grace_until: new Date(Date.now() + 86400000).toISOString(), // Tomorrow
    grace_mode: 'view_only' as const
  };
  const graceActiveBlob = signLicense(graceActivePayload, privateKey, 'test_key');
  const graceActiveStatus = await lm.validateLicenseBlob(graceActiveBlob);

  if (graceActiveStatus.valid && graceActiveStatus.state === 'grace' && graceActiveStatus.isGracePeriod) {
    console.log('✅ Grace Period Active Transition OK');
  } else {
    console.error('❌ Grace Period Active Transition Failed', graceActiveStatus);
    process.exit(1);
  }

  // 6. Test Grace Period Transition (expired after grace)
  console.log('Testing Grace Period Transition (expired after grace)...');
  const graceExpiredPayload = {
    ...validPayload,
    maintenance_until: new Date(Date.now() - 2 * 86400000).toISOString(), // 2 days ago
    grace_until: new Date(Date.now() - 86400000).toISOString(), // Yesterday
    grace_mode: 'view_only' as const
  };
  const graceExpiredBlob = signLicense(graceExpiredPayload, privateKey, 'test_key');
  const graceExpiredStatus = await lm.validateLicenseBlob(graceExpiredBlob);

  if (!graceExpiredStatus.valid && graceExpiredStatus.state === 'expired' && !graceExpiredStatus.isGracePeriod) {
    console.log('✅ Grace Period Expiry Transition OK');
  } else {
    console.error('❌ Grace Period Expiry Transition Failed', graceExpiredStatus);
    process.exit(1);
  }

  console.log('--- All LicenseManager tests passed ---');
}

runTests().catch(err => {
  console.error(err);
  process.exit(1);
});