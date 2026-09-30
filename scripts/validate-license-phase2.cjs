// scripts/validate-license-phase2.cjs
const fs = require('fs');
const os = require('os');
const path = require('path');
const Module = require('module');
const { spawnSync } = require('child_process');

function fail(message) {
  console.error(message);
  process.exit(1);
}

function run(command, args) {
  const result = spawnSync(command, args, {
    cwd: path.resolve(__dirname, '..'),
    encoding: 'utf8',
  });

  if (result.status !== 0) {
    fail(result.stderr || result.stdout || `Command failed: ${command} ${args.join(' ')}`);
  }

  return result.stdout.trim();
}

function main() {
  const projectRoot = path.resolve(__dirname, '..');
  const buildLicenseManagerPath = path.join(projectRoot, 'build-electron', 'services', 'licenseManager.js');
  const buildCryptoPath = path.join(projectRoot, 'build-electron', 'services', 'cryptoUtils.js');

  if (!fs.existsSync(buildLicenseManagerPath) || !fs.existsSync(buildCryptoPath)) {
    fail('build artifacts missing; run npm run build-electron first');
  }

  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'scaleerp-license-phase2-'));
  const licensePath = path.join(tempDir, 'sample.lic');
  const publicKey = fs.readFileSync(path.join(projectRoot, 'vendor', 'keys', 'public_key.pem'), 'utf8');

  const originalLoad = Module._load;
  Module._load = function patchedLoad(request, parent, isMain) {
    if (request === 'electron') {
      return {
        app: {
          getPath(name) {
            if (name === 'userData') {
              return tempDir;
            }
            return tempDir;
          },
        },
      };
    }

    return originalLoad.call(this, request, parent, isMain);
  };

  run(process.execPath, [
    path.join('vendor', 'generate-license.cjs'),
    '--customerId',
    'phase2-customer',
    '--output',
    licensePath,
  ]);

  const { LicenseManager } = require(buildLicenseManagerPath);
  const manager = new LicenseManager({
    publicKey,
    licenseFilePath: licensePath,
  });

  manager.validateLicense().then((validStatus) => {
    if (!validStatus.valid || validStatus.state !== 'valid') {
      fail(`expected valid status but received: ${JSON.stringify(validStatus)}`);
    }

    return manager.getDeviceFingerprint();
  }).then((fingerprint) => {
    const mismatchPath = path.join(tempDir, 'mismatch.lic');
    run(process.execPath, [
      path.join('vendor', 'generate-license.cjs'),
      '--customerId',
      'phase2-customer',
      '--deviceFingerprint',
      'mismatch-device-fingerprint',
      '--output',
      mismatchPath,
    ]);

    const mismatchManager = new LicenseManager({ publicKey, licenseFilePath: mismatchPath });
    return Promise.all([Promise.resolve(fingerprint), mismatchManager.validateLicense()]);
  }).then(([, mismatchStatus]) => {
    if (mismatchStatus.valid || mismatchStatus.reason !== 'Device fingerprint mismatch') {
      fail(`expected fingerprint mismatch status but received: ${JSON.stringify(mismatchStatus)}`);
    }

    const expiredPath = path.join(tempDir, 'expired.lic');
    run(process.execPath, [
      path.join('vendor', 'generate-license.cjs'),
      '--customerId',
      'phase2-customer',
      '--validFrom',
      '2025-01-01T00:00:00.000Z',
      '--validUntil',
      '2025-12-31T00:00:00.000Z',
      '--maintenanceUntil',
      '2025-03-01T00:00:00.000Z',
      '--output',
      expiredPath,
    ]);

    const expiredManager = new LicenseManager({ publicKey, licenseFilePath: expiredPath });
    return expiredManager.validateLicense();
  }).then((expiredStatus) => {
    if (expiredStatus.valid || expiredStatus.state !== 'expired') {
      fail(`expected expired status but received: ${JSON.stringify(expiredStatus)}`);
    }

    const futurePath = path.join(tempDir, 'future.lic');
    run(process.execPath, [
      path.join('vendor', 'generate-license.cjs'),
      '--customerId',
      'phase2-customer',
      '--validFrom',
      '2099-01-01T00:00:00.000Z',
      '--validUntil',
      '2099-12-31T00:00:00.000Z',
      '--maintenanceUntil',
      '2099-03-01T00:00:00.000Z',
      '--output',
      futurePath,
    ]);

    const futureManager = new LicenseManager({ publicKey, licenseFilePath: futurePath });
    return futureManager.validateLicense();
  }).then((futureStatus) => {
    if (futureStatus.valid || futureStatus.reason !== 'License is not active yet') {
      fail(`expected future license rejection but received: ${JSON.stringify(futureStatus)}`);
    }

    const gracePath = path.join(tempDir, 'grace.lic');
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const ninetyDaysAgo = new Date();
    ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);
    const graceUntil = new Date();
    graceUntil.setDate(graceUntil.getDate() + 3);
    run(process.execPath, [
      path.join('vendor', 'generate-license.cjs'),
      '--customerId',
      'phase2-customer',
      '--validFrom',
      ninetyDaysAgo.toISOString(),
      '--validUntil',
      new Date(yesterday.getFullYear() + 1, yesterday.getMonth(), yesterday.getDate()).toISOString(),
      '--maintenanceUntil',
      yesterday.toISOString(),
      '--graceUntil',
      graceUntil.toISOString(),
      '--graceMode',
      'view_only',
      '--output',
      gracePath,
    ]);

    const graceManager = new LicenseManager({ publicKey, licenseFilePath: gracePath });
    return graceManager.validateLicense();
  }).then((graceStatus) => {
    if (!graceStatus.isGracePeriod) {
      fail(`expected grace period but isGracePeriod is false: ${JSON.stringify(graceStatus)}`);
    }
    console.log('grace-period-ok');

    const tamperedBlob = fs.readFileSync(licensePath, 'utf8').replace(/A/g, 'B');
    const { verifyLicenseBlob, registerPublicKey } = require(buildCryptoPath);
    registerPublicKey('key_001', publicKey);
    const tamperedStatus = verifyLicenseBlob(tamperedBlob);
    if (tamperedStatus.valid) {
      fail('expected tampered blob verification to fail');
    }

    // Test importLicense flow
    const importPath = path.join(tempDir, 'import.lic');
    run(process.execPath, [
      path.join('vendor', 'generate-license.cjs'),
      '--customerId',
      'phase2-import-customer',
      '--output',
      importPath,
    ]);

    const importManager = new LicenseManager({ publicKey, licenseFilePath: importPath });
    return importManager.importLicense(fs.readFileSync(importPath, 'utf8')).then((importStatus) => {
      if (!importStatus.valid || importStatus.state !== 'valid') {
        fail(`expected valid import status but received: ${JSON.stringify(importStatus)}`);
      }

      // Verify the license was cached
      const cachedStatus = importManager.getStatus();
      if (!cachedStatus || !cachedStatus.valid) {
        fail('expected cached status after import');
      }
      console.log('import-license-ok');
      console.log('license-manager-ok');
      console.log('fingerprint-mismatch-ok');
      console.log('expired-license-ok');
      console.log('future-license-ok');
      console.log('tampered-license-ok');
      return importStatus;
    });
  }).catch((error) => {
    Module._load = originalLoad;
    fail(error instanceof Error ? error.stack || error.message : String(error));
  });
}

main();