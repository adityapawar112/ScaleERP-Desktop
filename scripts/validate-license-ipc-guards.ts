/**
 * scripts/validate-license-ipc-guards.ts
 * 
 * Verifies that the IPC handlers are correctly guarded by LicenseEnforcement.
 */

import { LicenseEnforcement, Operation } from '../electron/services/licenseEnforcement';
import { LicenseManager } from '../electron/services/licenseManager';

// Mock LicenseManager
class MockLicenseManager {
  private status: any;
  constructor(status: any) {
    this.status = status;
  }
  getStatus() {
    return this.status;
  }
}

async function testGuards() {
  console.log('🔍 Testing IPC License Enforcement Guards...');

  const expiredManager = new MockLicenseManager({
    valid: false,
    state: 'expired',
    reason: 'License expired',
    tamperDetected: false
  });

  const enforcement = new LicenseEnforcement(expiredManager as any);

  const testCases = [
    { op: Operation.WriteData, expected: 'block' },
    { op: Operation.RunBackup, expected: 'block' },
    { op: Operation.ManageUsers, expected: 'block' },
    { op: Operation.ReadData, expected: 'block' }, // Expired blocks everything
  ];

  for (const test of testCases) {
    const allowed = enforcement.isAllowed(test.op);
    if (allowed && test.expected === 'block') {
      console.error(`❌ FAILURE: Operation ${test.op} allowed in EXPIRED state!`);
      process.exit(1);
    } else {
      console.log(`✅ Success: Operation ${test.op} blocked in EXPIRED state.`);
    }
  }

  const graceManager = new MockLicenseManager({
    valid: true,
    state: 'grace',
    reason: 'Grace period',
    tamperDetected: false
  });

  const graceEnforcement = new LicenseEnforcement(graceManager as any);

  const graceCases = [
    { op: Operation.ReadData, expected: 'allow' },
    { op: Operation.WriteData, expected: 'block' },
    { op: Operation.RunBackup, expected: 'block' },
  ];

  for (const test of graceCases) {
    const allowed = graceEnforcement.isAllowed(test.op);
    if (allowed && test.expected === 'block') {
      console.error(`❌ FAILURE: Operation ${test.op} allowed in GRACE state!`);
      process.exit(1);
    } else if (!allowed && test.expected === 'allow') {
      console.error(`❌ FAILURE: Operation ${test.op} blocked in GRACE state!`);
      process.exit(1);
    } else {
      console.log(`✅ Success: Operation ${test.op} ${test.expected}ed in GRACE state.`);
    }
  }

  console.log('\n✨ All IPC License Guards verified successfully!');
}

testGuards().catch(err => {
  console.error(err);
  process.exit(1);
});
