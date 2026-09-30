// scripts/validate-license-phase5-auth-integration.cjs
const fs = require('fs');
const os = require('os');
const path = require('path');
const Module = require('module');
const { spawnSync } = require('child_process');

function fail(message) {
  console.error(message);
  process.exit(1);
}

function assert(condition, message) {
  if (!condition) {
    fail(message);
  }
}

function get(db, sql, params = []) {
  return new Promise((resolve, reject) => {
    db.get(sql, params, (err, row) => {
      if (err) {
        reject(err);
        return;
      }
      resolve(row || null);
    });
  });
}

async function main() {
  const projectRoot = path.resolve(__dirname, '..');
  const buildDbManagerPath = path.join(projectRoot, 'build-electron', 'database', 'manager.js');
  const buildAuthServicePath = path.join(projectRoot, 'build-electron', 'services', 'authService.js');
  const buildLicenseOpsPath = path.join(projectRoot, 'build-electron', 'database', 'licenseOperations.js');
  const buildSchemaPath = path.join(projectRoot, 'build-electron', 'database', 'schema.sql');
  const createUserCliPath = path.join(projectRoot, 'vendor', 'create-user.cjs');
  const preloadPath = path.join(projectRoot, 'electron', 'preload.ts');
  const typesPath = path.join(projectRoot, 'src', 'types', 'electron.d.ts');
  const handlersPath = path.join(projectRoot, 'electron', 'ipc', 'handlers.ts');

  const requiredFiles = [
    buildDbManagerPath,
    buildAuthServicePath,
    buildLicenseOpsPath,
    buildSchemaPath,
    createUserCliPath,
    preloadPath,
    typesPath,
    handlersPath,
  ];

  for (const filePath of requiredFiles) {
    if (!fs.existsSync(filePath)) {
      fail(`Required file missing: ${filePath}`);
    }
  }

  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'scaleerp-phase5-auth-int-'));
  const dbPath = path.join(tempDir, 'inventory.db');

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

  let dbManager;
  try {
    ({ dbManager } = require(buildDbManagerPath));
    const { AuthService } = require(buildAuthServicePath);
    const licenseOps = require(buildLicenseOpsPath);

    await dbManager.initialize();
    const db = dbManager.getDatabase();

    await licenseOps.saveLicense({
      license_id: 'lic_auth_integration_001',
      customer_id: 'cust_auth_integration_001',
      status: 'active',
      edition: 'Pro',
      valid_from: '2026-01-01T00:00:00.000Z',
      valid_until: '2027-01-01T00:00:00.000Z',
      maintenance_until: '2099-01-01T00:00:00.000Z',
      license_blob: 'legacy-blob-before-cli',
    });

    const createResult = spawnSync(
      process.execPath,
      [
        createUserCliPath,
        '--dbPath',
        dbPath,
        '--username',
        'cli.user',
        '--password',
        'Pass#12345',
        '--licenseId',
        'lic_auth_integration_001',
        '--licenseBlob',
        'phase5-new-license-blob',
        '--json',
        'true',
      ],
      {
        cwd: projectRoot,
        encoding: 'utf8',
      }
    );

    if (createResult.status !== 0) {
      fail(`vendor-create-user-failed: ${(createResult.stderr || createResult.stdout || '').trim()}`);
    }

    const createPayload = JSON.parse((createResult.stdout || '').trim());
    assert(createPayload.success === true, 'vendor-create-user-result-invalid');

    const createdUser = await get(
      db,
      'SELECT user_id, username, password_hash, license_id, failed_attempts, locked_out FROM users WHERE username = ? LIMIT 1',
      ['cli.user']
    );
    assert(!!createdUser, 'vendor-create-user-no-db-row');
    assert(createdUser.license_id === 'lic_auth_integration_001', 'vendor-create-user-license-link-invalid');
    assert(createdUser.password_hash !== 'Pass#12345', 'vendor-create-user-password-not-hashed');

    const linkedLicense = await get(db, 'SELECT license_blob FROM licenses WHERE license_id = ? LIMIT 1', [
      'lic_auth_integration_001',
    ]);
    assert(linkedLicense && linkedLicense.license_blob === 'phase5-new-license-blob', 'vendor-license-blob-association-failed');
    console.log('vendor-create-user-ok');

    const authService = new AuthService();

    for (let i = 0; i < 5; i += 1) {
      // eslint-disable-next-line no-await-in-loop
      await authService.login('cli.user', 'Wrong#Password');
    }

    const lockoutStatus = await authService.getLockoutStatus('cli.user');
    assert(lockoutStatus.success === true, 'auth-lockout-status-call-failed');
    assert(lockoutStatus.lockout && lockoutStatus.lockout.locked_out === true, 'auth-lockout-not-triggered');
    console.log('auth-lockout-ok');

    const unlockResult = await authService.unlockByUsername('cli.user');
    assert(unlockResult.success === true, 'auth-unlock-failed');

    const loginResult = await authService.login('cli.user', 'Pass#12345');
    assert(loginResult.success === true, 'auth-login-failed-after-unlock');

    const sessionStatus = await authService.checkSession();
    assert(sessionStatus.authenticated === true, 'auth-session-check-failed');
    console.log('auth-session-ok');

    const changePasswordResult = await authService.changePassword('cli.user', 'Pass#12345', 'Pass#67890');
    assert(changePasswordResult.success === true, 'auth-change-password-failed');

    await authService.logout();

    const reloginResult = await authService.login('cli.user', 'Pass#67890');
    assert(reloginResult.success === true, 'auth-relogin-with-new-password-failed');
    console.log('auth-password-change-ok');

    await authService.logout();
    const finalSession = await authService.checkSession();
    assert(finalSession.authenticated === false, 'auth-logout-session-clear-failed');

    const preloadSource = fs.readFileSync(preloadPath, 'utf8');
    const typesSource = fs.readFileSync(typesPath, 'utf8');
    const handlersSource = fs.readFileSync(handlersPath, 'utf8');

    const authMethods = ['login', 'logout', 'checkSession', 'changePassword', 'lockoutStatus'];

    for (const method of authMethods) {
      assert(preloadSource.includes(`auth:`) && preloadSource.includes(`${method}:`), `preload-missing-auth-${method}`);
      assert(typesSource.includes('auth:') && typesSource.includes(`${method}:`), `types-missing-auth-${method}`);
    }

    const authChannels = [
      'auth:login',
      'auth:logout',
      'auth:session-check',
      'auth:change-password',
      'auth:lockout-status',
    ];

    for (const channel of authChannels) {
      assert(handlersSource.includes(`'${channel}'`), `handlers-missing-${channel}`);
    }
    console.log('auth-ipc-preload-types-ok');

    dbManager.close();
    console.log('phase5-auth-integration-ok');
  } catch (error) {
    fail(error instanceof Error ? error.stack || error.message : String(error));
  } finally {
    Module._load = originalLoad;
  }
}

main();