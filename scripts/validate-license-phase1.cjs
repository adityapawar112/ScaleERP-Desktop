// scripts/validate-license-phase1.cjs
const fs = require('fs');
const path = require('path');
const { Database } = require('sqlite3');

const rootDir = path.resolve(__dirname, '..');
const schemaPath = path.join(rootDir, 'electron', 'database', 'schema.sql');
const buildCryptoUtilsPath = path.join(rootDir, 'build-electron', 'services', 'cryptoUtils.js');
const buildDeviceFingerprintPath = path.join(rootDir, 'build-electron', 'services', 'deviceFingerprint.js');
const privateKeyPath = path.join(rootDir, 'vendor', 'keys', 'private_key.pem');
const publicKeyPath = path.join(rootDir, 'vendor', 'keys', 'public_key.pem');

function ensureFileExists(filePath, label) {
  if (!fs.existsSync(filePath)) {
    throw new Error(`${label} not found: ${filePath}`);
  }
}

function validateSchema() {
  return new Promise((resolve, reject) => {
    const schema = fs.readFileSync(schemaPath, 'utf8');
    const db = new Database(':memory:');

    db.exec(schema, (err) => {
      if (err) {
        db.close();
        reject(err);
        return;
      }

      // Verify tables were actually created
      db.all("SELECT name FROM sqlite_master WHERE type='table' ORDER BY name", (err, tables) => {
        if (err) {
          db.close();
          reject(err);
          return;
        }

        const expectedTables = [
          'broker_leisures', 'broker_transaction_products', 'broker_transactions',
          'brokers', 'brokers_fts', 'brokers_fts_data', 'brokers_fts_idx',
          'business_settings', 'clock_override_tokens', 'customer_leisures',
          'customer_transaction_products', 'customer_transactions', 'customers',
          'customers_fts', 'customers_fts_data', 'customers_fts_idx',
          'license_customers', 'license_events', 'license_heartbeats',
          'license_policies', 'licenses', 'password_reset_tokens',
          'product_manufacturers', 'products', 'products_fts', 'products_fts_data',
          'products_fts_idx', 'stock_history', 'used_reset_nonces',
          'users', 'users_fts', 'users_fts_data', 'users_fts_idx'
        ];

        const tableNames = tables.map(t => t.name);
        const missingTables = expectedTables.filter(t => !tableNames.includes(t));

        if (missingTables.length > 0) {
          db.close();
          reject(new Error(`Missing tables after schema execution: ${missingTables.join(', ')}`));
          return;
        }

        // Verify indexes were created
        db.all("SELECT name FROM sqlite_master WHERE type='index' AND name NOT LIKE 'sqlite_%'", (err, indexes) => {
          if (err) {
            db.close();
            reject(err);
            return;
          }

          if (indexes.length < 18) {
            db.close();
            reject(new Error(`Expected at least 18 indexes, found ${indexes.length}`));
            return;
          }

          // Verify triggers were created
          db.all("SELECT name FROM sqlite_master WHERE type='trigger'", (err, triggers) => {
            if (err) {
              db.close();
              reject(err);
              return;
            }

            if (triggers.length < 9) {
              db.close();
              reject(new Error(`Expected at least 9 triggers, found ${triggers.length}`));
              return;
            }

            db.close((closeErr) => {
              if (closeErr) {
                reject(closeErr);
                return;
              }
              resolve({ tableCount: tables.length, indexCount: indexes.length, triggerCount: triggers.length });
            });
          });
        });
      });
    });
  });
}

async function main() {
  ensureFileExists(schemaPath, 'Schema file');
  ensureFileExists(buildCryptoUtilsPath, 'Built cryptoUtils module');
  ensureFileExists(buildDeviceFingerprintPath, 'Built deviceFingerprint module');
  ensureFileExists(privateKeyPath, 'Vendor private key');
  ensureFileExists(publicKeyPath, 'Vendor public key');

  const schemaResult = await validateSchema();
  console.log(`schema-ok (tables=${schemaResult.tableCount}, indexes=${schemaResult.indexCount}, triggers=${schemaResult.triggerCount})`);

  const cryptoUtils = require(buildCryptoUtilsPath);
  const device = require(buildDeviceFingerprintPath);
  const publicKey = fs.readFileSync(publicKeyPath, 'utf8');
  const privateKey = fs.readFileSync(privateKeyPath, 'utf8');

  // Validate key pair: sign with private, verify with public
  const crypto = require('crypto');
  const testMessage = Buffer.from('key-pair-validation-test');
  const signature = crypto.sign('SHA256', testMessage, privateKey);
  const keyPairValid = crypto.verify('SHA256', testMessage, publicKey, signature);
  if (!keyPairValid) {
    throw new Error('RSA key pair validation failed: public key does not match private key');
  }
  console.log('key-pair-ok');

  cryptoUtils.registerPublicKey('key_001', publicKey);

  const payload = {
    license_id: 'lic_1',
    customer_id: 'cust_1',
    valid_from: '2026-04-04',
    valid_until: '2027-04-04',
    maintenance_until: '2026-07-03',
    features: {
      inventory: true,
      reports: true
    }
  };

  const blob = cryptoUtils.signLicense(payload, privateKey, 'key_001');
  const verified = cryptoUtils.verifyLicenseBlob(blob);
  const fingerprint = device.getDeviceFingerprint();

  if (!verified.valid) {
    throw new Error(`License verification failed: ${JSON.stringify(verified)}`);
  }

  if (!fingerprint || typeof fingerprint !== 'string' || fingerprint.length !== 64) {
    throw new Error('Device fingerprint is invalid');
  }

  console.log('crypto-ok');
  console.log(`fingerprint-length=${fingerprint.length}`);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});