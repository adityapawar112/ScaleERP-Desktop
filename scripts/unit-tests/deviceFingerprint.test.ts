// scripts/unit-tests/deviceFingerprint.test.ts
import { getDeviceFingerprint, getDeviceFingerprintComponents } from '../../electron/services/deviceFingerprint';

function runTests() {
  console.log('--- Running deviceFingerprint unit tests ---');

  // 1. Check components structure
  console.log('Checking fingerprint components...');
  const components = getDeviceFingerprintComponents();
  
  if (Array.isArray(components) && components.length >= 6) {
    console.log('✅ Fingerprint components OK (length: ' + components.length + ')');
    console.log('   Components: ' + components.join(', '));
  } else {
    console.error('❌ Invalid fingerprint components structure');
    process.exit(1);
  }

  // 2. Check fingerprint format
  console.log('Checking fingerprint hash (SHA-256)...');
  const fingerprint = getDeviceFingerprint();
  
  if (typeof fingerprint === 'string' && fingerprint.length === 64 && /^[0-9a-f]+$/.test(fingerprint)) {
    console.log('✅ Fingerprint hash OK: ' + fingerprint);
  } else {
    console.error('❌ Invalid fingerprint hash format');
    process.exit(1);
  }

  // 3. Consistency check
  console.log('Checking fingerprint consistency...');
  const f1 = getDeviceFingerprint();
  const f2 = getDeviceFingerprint();

  if (f1 === f2) {
    console.log('✅ Fingerprint consistency OK');
  } else {
    console.error('❌ Fingerprint inconsistency detected');
    process.exit(1);
  }

  console.log('--- All deviceFingerprint tests passed ---');
}

runTests();