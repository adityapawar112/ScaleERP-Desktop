// vendor/generate-license.cjs
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

function canonicalize(value) {
  if (Array.isArray(value)) {
    return JSON.stringify(value.map((item) => JSON.parse(canonicalize(item))));
  }

  if (value && typeof value === 'object') {
    const sorted = Object.keys(value)
      .sort()
      .reduce((acc, key) => {
        const current = value[key];
        acc[key] = current && typeof current === 'object' ? JSON.parse(canonicalize(current)) : current;
        return acc;
      }, {});

    return JSON.stringify(sorted);
  }

  return JSON.stringify(value);
}

function parseArgs(argv) {
  const args = {};

  for (let index = 2; index < argv.length; index += 1) {
    const current = argv[index];
    if (!current.startsWith('--')) {
      continue;
    }

    const key = current.slice(2);
    const next = argv[index + 1];
    if (!next || next.startsWith('--')) {
      args[key] = 'true';
      continue;
    }

    args[key] = next;
    index += 1;
  }

  return args;
}

function readJsonFile(filePath) {
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

function addDays(isoDate, days) {
  const value = new Date(isoDate);
  value.setUTCDate(value.getUTCDate() + days);
  return value.toISOString();
}

function buildPayload(args) {
  const validFrom = args.validFrom || new Date().toISOString();
  const validUntil = args.validUntil || addDays(validFrom, 365);
  const maintenanceUntil = args.maintenanceUntil || addDays(validFrom, 90);
  const features = args.features ? JSON.parse(args.features) : { inventory: true, reports: true };

  return {
    license_id: args.licenseId || crypto.randomUUID(),
    customer_id: args.customerId || 'customer-demo',
    edition: args.edition || 'Pro',
    valid_from: validFrom,
    valid_until: validUntil,
    maintenance_until: maintenanceUntil,
    device_fingerprint: args.deviceFingerprint || null,
    grace_until: args.graceUntil || undefined,
    grace_mode: args.graceMode || undefined,
    features,
  };
}

function main() {
  const args = parseArgs(process.argv);
  const projectRoot = path.resolve(__dirname, '..');
  const privateKeyPath = args.privateKey || path.join(__dirname, 'keys', 'private_key.pem');
  const outputPath = args.output ? path.resolve(projectRoot, args.output) : null;

  let payload;
  if (args.input) {
    payload = readJsonFile(path.resolve(projectRoot, args.input));
  } else {
    payload = buildPayload(args);
  }

  const privateKey = fs.readFileSync(privateKeyPath, 'utf8');
  const canonicalPayload = canonicalize(payload);
  const signature = crypto
    .sign('SHA256', Buffer.from(canonicalPayload, 'utf8'), privateKey)
    .toString('base64');

  const envelope = {
    payload: canonicalPayload,
    signature,
    key_id: args.keyId || 'key_001',
  };

  const blob = Buffer.from(JSON.stringify(envelope), 'utf8').toString('base64');

  if (outputPath) {
    fs.mkdirSync(path.dirname(outputPath), { recursive: true });
    fs.writeFileSync(outputPath, blob, 'utf8');
    console.log(`license-written=${outputPath}`);
  }

  console.log(blob);
}

main();