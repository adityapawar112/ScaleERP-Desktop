// scripts/validate-license-phase5-auth-foundation.cjs
const fs = require('fs');
const os = require('os');
const path = require('path');
const Module = require('module');

function fail(message) {
  console.error(message);
  process.exit(1);
}

function assert(condition, message) {
  if (!condition) {
    fail(message);
  }
}

function run(sqliteDb, sql, params = []) {
  return new Promise((resolve, reject) => {
    sqliteDb.run(sql, params, function onRun(err) {
      if (err) {
        reject(err);
        return;
      }
      resolve({ changes: this.changes, lastID: this.lastID });
    });
  });
}

function all(sqliteDb, sql, params = []) {
  return new Promise((resolve, reject) => {
    sqliteDb.all(sql, params, (err, rows) => {
      if (err) {
        reject(err);
        return;
      }
      resolve(rows || []);
    });
  });
}

async function main() {
  const projectRoot = path.resolve(__dirname, '..');
  const buildDbManagerPath = path.join(projectRoot, 'build-electron', 'database', 'manager.js');
  const buildUserOpsPath = path.join(projectRoot, 'build-electron', 'database', 'userOperations.js');
  const buildLicenseOpsPath = path.join(projectRoot, 'build-electron', 'database', 'licenseOperations.js');
  const buildHasherPath = path.join(projectRoot, 'build-electron', 'services', 'passwordHasher.js');
  const buildSchemaPath = path.join(projectRoot, 'build-electron', 'database', 'schema.sql');

  const requiredFiles = [
    buildDbManagerPath,
    buildUserOpsPath,
    buildLicenseOpsPath,
    buildHasherPath,
    buildSchemaPath,
  ];

  for (const filePath of requiredFiles) {
    if (!fs.existsSync(filePath)) {
      fail(`Required build artifact missing: ${filePath}`);
    }
  }

  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'scaleerp-phase5-auth-'));

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

  try {
    const { dbManager } = require(buildDbManagerPath);
    const userOps = require(buildUserOpsPath);
    const licenseOps = require(buildLicenseOpsPath);
    const hasher = require(buildHasherPath);

    await dbManager.initialize();
    const db = dbManager.getDatabase();

    // 1) Password hashing checks
    const rawPassword = 'StrongPassword#123';
    const passwordHash = await hasher.hashPassword(rawPassword);
    assert(passwordHash && passwordHash !== rawPassword, 'password-hash-invalid-or-plaintext');
    assert(await hasher.verifyPassword(rawPassword, passwordHash), 'password-verify-expected-true');
    assert(!(await hasher.verifyPassword('WrongPassword', passwordHash)), 'password-verify-expected-false');
    console.log('password-hashing-ok');

    // 2) Seed active license and create user
    await licenseOps.saveLicense({
      license_id: 'lic_active_001',
      customer_id: 'cust_phase5_001',
      status: 'active',
      edition: 'Pro',
      valid_from: '2026-01-01T00:00:00.000Z',
      valid_until: '2027-01-01T00:00:00.000Z',
      maintenance_until: '2099-01-01T00:00:00.000Z',
      license_blob: 'sample-license-blob',
    });

    await userOps.createUser({
      user_id: 'usr_001',
      username: 'alpha.user',
      password_hash: passwordHash,
      license_id: 'lic_active_001',
    });

    const user = await userOps.getUserByUsername('alpha.user');
    assert(!!user, 'user-not-created');
    assert(user.username === 'alpha.user', 'user-lookup-failed');
    console.log('user-create-read-ok');

    // 3) Update password
    const nextHash = await hasher.hashPassword('AnotherStrongPassword#456');
    await userOps.updateUserPassword('usr_001', nextHash);
    const updatedUser = await userOps.getUserByUsername('alpha.user');
    assert(!!updatedUser, 'updated-user-not-found');
    assert(updatedUser.password_hash === nextHash, 'update-user-password-failed');
    console.log('user-update-password-ok');

    // 4) Failed attempts and lockout
    await userOps.incrementFailedAttempts('usr_001');
    await userOps.incrementFailedAttempts('usr_001');
    let lockoutCheck = await userOps.getUserByUsername('alpha.user');
    assert(lockoutCheck.failed_attempts === 2, 'failed-attempts-increment-failed');

    await userOps.lockUser('usr_001');
    lockoutCheck = await userOps.getUserByUsername('alpha.user');
    assert(Number(lockoutCheck.locked_out) === 1, 'lock-user-failed');

    await userOps.unlockUser('usr_001');
    lockoutCheck = await userOps.getUserByUsername('alpha.user');
    assert(Number(lockoutCheck.locked_out) === 0 && lockoutCheck.failed_attempts === 0, 'unlock-user-failed');

    await userOps.incrementFailedAttempts('usr_001');
    await userOps.resetFailedAttempts('usr_001');
    lockoutCheck = await userOps.getUserByUsername('alpha.user');
    assert(lockoutCheck.failed_attempts === 0, 'reset-failed-attempts-failed');
    console.log('user-lockout-ops-ok');

    // 5) FTS validation: insert, update, delete trigger synchronization
    let rows = await all(db, `SELECT rowid, username FROM users_fts WHERE users_fts MATCH ?`, ['alpha*']);
    assert(rows.length >= 1, 'users-fts-insert-sync-failed');

    await run(db, `UPDATE users SET username = ? WHERE user_id = ?`, ['alpha.renamed', 'usr_001']);
    rows = await all(db, `SELECT rowid, username FROM users_fts WHERE users_fts MATCH ?`, ['renamed*']);
    assert(rows.length >= 1, 'users-fts-update-sync-failed');

    await run(db, `DELETE FROM users WHERE user_id = ?`, ['usr_001']);
    rows = await all(db, `SELECT rowid, username FROM users_fts WHERE users_fts MATCH ?`, ['renamed*']);
    assert(rows.length === 0, 'users-fts-delete-sync-failed');
    console.log('users-fts-sync-ok');

    // 6) License validation for login
    await userOps.createUser({
      user_id: 'usr_lic_ok',
      username: 'license.ok',
      password_hash: passwordHash,
      license_id: 'lic_active_001',
    });
    const validResult = await licenseOps.validateUserHasActiveLicense('usr_lic_ok');
    assert(validResult.valid, `expected active license valid, got: ${JSON.stringify(validResult)}`);

    await licenseOps.saveLicense({
      license_id: 'lic_expired_001',
      customer_id: 'cust_phase5_002',
      status: 'active',
      edition: 'Pro',
      valid_from: '2024-01-01T00:00:00.000Z',
      valid_until: '2025-01-01T00:00:00.000Z',
      maintenance_until: '2024-04-01T00:00:00.000Z',
      license_blob: 'sample-license-blob-expired',
    });
    await userOps.createUser({
      user_id: 'usr_lic_expired',
      username: 'license.expired',
      password_hash: passwordHash,
      license_id: 'lic_expired_001',
    });
    const expiredResult = await licenseOps.validateUserHasActiveLicense('usr_lic_expired');
    assert(!expiredResult.valid && expiredResult.reason === 'LICENSE_EXPIRED', `expected LICENSE_EXPIRED, got: ${JSON.stringify(expiredResult)}`);
    console.log('user-license-validation-ok');

    dbManager.close();
    console.log('phase5-auth-foundation-ok');
  } catch (error) {
    fail(error instanceof Error ? error.stack || error.message : String(error));
  } finally {
    Module._load = originalLoad;
  }
}

main();
