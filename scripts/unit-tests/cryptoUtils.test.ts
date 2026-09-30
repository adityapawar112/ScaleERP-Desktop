// scripts/unit-tests/cryptoUtils.test.ts
import crypto from 'crypto';
import { canonicalize, signLicense, verifyLicenseBlob, registerPublicKey } from '../../electron/services/cryptoUtils';

function runTests() {
  console.log('--- Running cryptoUtils unit tests ---');

  // 1. Test Canonicalization
  console.log('Testing canonicalize...');
  const obj1 = { b: 2, a: 1, c: { e: 5, d: 4 } };
  const obj2 = { a: 1, b: 2, c: { d: 4, e: 5 } };
  const canon1 = canonicalize(obj1);
  const canon2 = canonicalize(obj2);

  if (canon1 === canon2 && canon1 === '{"a":1,"b":2,"c":{"d":4,"e":5}}') {
    console.log('✅ Canonicalization OK (keys sorted)');
  } else {
    console.error('❌ Canonicalization Failed');
    console.error('canon1:', canon1);
    console.error('canon2:', canon2);
    process.exit(1);
  }

  // 2. Test Sign/Verify Flow
  console.log('Testing Sign/Verify Flow...');
  const { publicKey, privateKey } = crypto.generateKeyPairSync('rsa', {
    modulusLength: 2048,
    publicKeyEncoding: { type: 'spki', format: 'pem' },
    privateKeyEncoding: { type: 'pkcs8', format: 'pem' },
  });

  const testKeyId = 'unit_test_key';
  registerPublicKey(testKeyId, publicKey);

  const payload = { 
    customer_id: 'cust_001', 
    expiry: '2026-12-31', 
    features: ['all'] 
  };

  const blob = signLicense(payload, privateKey, testKeyId);
  const result = verifyLicenseBlob(blob);

  if (result.valid && JSON.stringify(result.payload) === JSON.stringify(payload)) {
    console.log('✅ Sign/Verify Flow OK');
  } else {
    console.error('❌ Sign/Verify Flow Failed', result.reason);
    process.exit(1);
  }

  // 3. Test Tamper Detection
  console.log('Testing Tamper Detection...');
  const envelopeJson = Buffer.from(blob, 'base64').toString('utf-8');
  const envelope = JSON.parse(envelopeJson);
  
  // Tamper with payload
  const tamperedPayload = JSON.parse(envelope.payload);
  tamperedPayload.expiry = '2099-12-31';
  envelope.payload = JSON.stringify(tamperedPayload);
  
  const tamperedBlob = Buffer.from(JSON.stringify(envelope), 'utf-8').toString('base64');
  const tamperResult = verifyLicenseBlob(tamperedBlob);

  if (!tamperResult.valid && tamperResult.reason === 'Signature verification failed') {
    console.log('✅ Tamper Detection OK');
  } else {
    console.error('❌ Tamper Detection Failed', tamperResult.reason);
    process.exit(1);
  }

  // 4. Test Invalid Blob
  console.log('Testing Invalid Blob...');
  const invalidResult = verifyLicenseBlob('not-a-base64-envelope');
  if (!invalidResult.valid) {
    console.log('✅ Invalid Blob Handling OK');
  } else {
    console.error('❌ Invalid Blob Handling Failed');
    process.exit(1);
  }

  console.log('--- All cryptoUtils tests passed ---');
}

runTests();