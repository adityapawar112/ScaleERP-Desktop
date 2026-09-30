// vendor/create-user.cjs
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const sqlite3 = require('sqlite3');
const bcrypt = require('bcryptjs');

function parseArgs(argv) {
  const args = {};

  for (let i = 2; i < argv.length; i += 1) {
    const current = argv[i];
    if (!current.startsWith('--')) {
      continue;
    }

    const key = current.slice(2);
    const next = argv[i + 1];
    if (!next || next.startsWith('--')) {
      args[key] = 'true';
      continue;
    }

    args[key] = next;
    i += 1;
  }

  return args;
}

function fail(message) {
  console.error(`❌ ${message}`);
  process.exit(1);
}

function openDatabase(dbPath) {
  return new Promise((resolve, reject) => {
    const db = new sqlite3.Database(dbPath, (err) => {
      if (err) {
        reject(err);
        return;
      }
      resolve(db);
    });
  });
}

function run(db, sql, params = []) {
  return new Promise((resolve, reject) => {
    db.run(sql, params, function onRun(err) {
      if (err) {
        reject(err);
        return;
      }
      resolve({ changes: this.changes, lastID: this.lastID });
    });
  });
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

function close(db) {
  return new Promise((resolve, reject) => {
    db.close((err) => {
      if (err) {
        reject(err);
        return;
      }
      resolve();
    });
  });
}

async function main() {
  const args = parseArgs(process.argv);
  const projectRoot = path.resolve(__dirname, '..');

  const username = (args.username || '').trim();
  const password = args.password || '';
  const licenseId = (args.licenseId || '').trim();
  const dbPath = args.dbPath ? path.resolve(projectRoot, args.dbPath) : '';

  if (!username) {
    fail('Missing required argument: --username');
  }
  if (!password) {
    fail('Missing required argument: --password');
  }
  if (!licenseId) {
    fail('Missing required argument: --licenseId');
  }
  if (!dbPath) {
    fail('Missing required argument: --dbPath');
  }
  if (!fs.existsSync(dbPath)) {
    fail(`Database file not found: ${dbPath}`);
  }

  const roundsRaw = Number(process.env.BCRYPT_SALT_ROUNDS || args.bcryptRounds || '12');
  const bcryptRounds = Number.isFinite(roundsRaw) && roundsRaw >= 8 && roundsRaw <= 15 ? roundsRaw : 12;

  const maxFailedAttemptsRaw = Number(args.maxFailedAttempts || '5');
  const maxFailedAttempts = Number.isFinite(maxFailedAttemptsRaw) && maxFailedAttemptsRaw > 0
    ? Math.floor(maxFailedAttemptsRaw)
    : 5;

  const userId = args.userId || `usr_${crypto.randomUUID().replace(/-/g, '')}`;
  const suppliedBlob = args.licenseBlob || null;
  const suppliedBlobFile = args.licenseBlobFile
    ? fs.readFileSync(path.resolve(projectRoot, args.licenseBlobFile), 'utf8').trim()
    : null;
  const licenseBlobInput = suppliedBlobFile || suppliedBlob;

  const db = await openDatabase(dbPath);
  try {
    const existing = await get(db, 'SELECT user_id FROM users WHERE username = ? LIMIT 1', [username]);
    if (existing) {
      fail(`Username already exists: ${username}`);
    }

    const license = await get(
      db,
      `SELECT license_id, status, valid_from, maintenance_until, license_blob
       FROM licenses
       WHERE license_id = ?
       LIMIT 1`,
      [licenseId]
    );

    if (!license) {
      fail(`License not found for license_id=${licenseId}`);
    }

    if (!['active', 'renewed'].includes(String(license.status || ''))) {
      fail(`License is not active/renewed (status=${license.status || 'unknown'})`);
    }

    if (licenseBlobInput) {
      await run(db, 'UPDATE licenses SET license_blob = ?, updated_at = CURRENT_TIMESTAMP WHERE license_id = ?', [
        licenseBlobInput,
        licenseId,
      ]);
      license.license_blob = licenseBlobInput;
    }

    if (!license.license_blob || !String(license.license_blob).trim()) {
      fail('License blob is empty. Provide --licenseBlob or --licenseBlobFile to associate a blob during user creation.');
    }

    const passwordHash = await bcrypt.hash(password, bcryptRounds);

    await run(
      db,
      `INSERT INTO users (user_id, username, password_hash, license_id, max_failed_attempts)
       VALUES (?, ?, ?, ?, ?)`,
      [userId, username, passwordHash, licenseId, maxFailedAttempts]
    );

    const result = {
      success: true,
      user: {
        user_id: userId,
        username,
        license_id: licenseId,
        max_failed_attempts: maxFailedAttempts,
      },
      license: {
        license_id: license.license_id,
        status: license.status,
        valid_from: license.valid_from,
        maintenance_until: license.maintenance_until,
        blob_associated: true,
        blob_preview: String(license.license_blob).slice(0, 24),
      },
    };

    if (args.json === 'true') {
      console.log(JSON.stringify(result));
      return;
    }

    console.log('✅ User created and linked to license successfully');
    console.log(`user_id=${result.user.user_id}`);
    console.log(`username=${result.user.username}`);
    console.log(`license_id=${result.user.license_id}`);
    console.log(`blob_preview=${result.license.blob_preview}`);
  } finally {
    await close(db);
  }
}

main().catch((error) => {
  fail(error instanceof Error ? error.message : String(error));
});