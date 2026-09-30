/**
 * vendor/generate-reset-code.cjs
 *
 * Developer CLI tool to generate a vendor-signed password reset code
 * from a user's encrypted reset challenge blob.
 *
 * Usage: node vendor/generate-reset-code.cjs <request_blob>
 */

const crypto = require("crypto");
const fs = require("fs");
const path = require("path");

const OFFLINE_SIGNING_PASSPHRASE =
  process.env.OFFLINE_SIGNING_PASSPHRASE ||
  "super-secret-offline-passphrase-for-reset";

const RESET_CODE_EXPIRATION_MINUTES = 30;
const ENCRYPTION_ALGORITHM = "aes-256-gcm";
const IV_LENGTH = 16;

const RESET_SIGNING_PRIVATE_KEY_PATH =
  process.env.RESET_SIGNING_PRIVATE_KEY_PATH ||
  path.join(process.cwd(), "vendor", "keys", "private_key.pem");

const RESET_SIGNING_KEY_ID =
  process.env.RESET_SIGNING_KEY_ID || "reset_key_001";

function getKeyFromPassphrase(passphrase) {
  return crypto.pbkdf2Sync(passphrase, "salt", 100000, 32, "sha512");
}

function canonicalizePayload(payload) {
  const sortedKeys = Object.keys(payload).sort();
  const sortedPayload = {};
  for (const key of sortedKeys) {
    sortedPayload[key] = payload[key];
  }
  return JSON.stringify(sortedPayload);
}

function loadPrivateSigningKey() {
  if (process.env.RESET_SIGNING_PRIVATE_KEY_PEM) {
    return process.env.RESET_SIGNING_PRIVATE_KEY_PEM;
  }

  return fs.readFileSync(RESET_SIGNING_PRIVATE_KEY_PATH, "utf8");
}

const encryptionKey = getKeyFromPassphrase(OFFLINE_SIGNING_PASSPHRASE);

function decryptBlob(blob) {
  const parts = blob.split(":");
  if (parts.length !== 3) {
    throw new Error("Invalid request blob format");
  }

  const iv = Buffer.from(parts[0], "hex");
  const encryptedText = parts[1];
  const tag = Buffer.from(parts[2], "hex");

  const decipher = crypto.createDecipheriv(ENCRYPTION_ALGORITHM, encryptionKey, iv);
  decipher.setAuthTag(tag);

  let decrypted = decipher.update(encryptedText, "hex", "utf8");
  decrypted += decipher.final("utf8");
  return JSON.parse(decrypted);
}

function encryptBlob(payload) {
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ENCRYPTION_ALGORITHM, encryptionKey, iv);

  let encrypted = cipher.update(JSON.stringify(payload), "utf8", "hex");
  encrypted += cipher.final("hex");
  const tag = cipher.getAuthTag();

  return `${iv.toString("hex")}:${encrypted}:${tag.toString("hex")}`;
}

function signResetPayload(payloadWithoutSignature) {
  const privateKey = loadPrivateSigningKey();
  const canonicalPayload = canonicalizePayload(payloadWithoutSignature);
  return crypto
    .sign("sha256", Buffer.from(canonicalPayload, "utf8"), privateKey)
    .toString("base64");
}

async function main() {
  const args = process.argv.slice(2);
  if (args.length < 1) {
    console.log("Usage: node vendor/generate-reset-code.cjs <request_blob>");
    process.exit(1);
  }

  const requestBlob = args[0];

  try {
    // 1) Decrypt and validate the user challenge blob
    const challenge = decryptBlob(requestBlob);

    if (challenge.expiration < Date.now()) {
      throw new Error("Reset request has expired");
    }

    if (
      !challenge.challengeId ||
      !challenge.userId ||
      !challenge.username ||
      !challenge.licenseId ||
      !challenge.deviceFingerprint
    ) {
      throw new Error("Reset challenge is missing required identity fields");
    }

    console.log(`Processing reset request for user: ${challenge.username}`);
    console.log(`Challenge ID: ${challenge.challengeId}`);
    console.log(`License ID: ${challenge.licenseId}`);

    // 2) Build vendor-signed reset payload
    const payloadToSign = {
      challengeId: challenge.challengeId,
      userId: challenge.userId,
      username: challenge.username,
      licenseId: challenge.licenseId,
      deviceFingerprint: challenge.deviceFingerprint,
      nonce: crypto.randomUUID(),
      issuedAt: Date.now(),
      expiration: Date.now() + RESET_CODE_EXPIRATION_MINUTES * 60 * 1000,
      keyId: RESET_SIGNING_KEY_ID,
    };

    const signature = signResetPayload(payloadToSign);

    const signedResetPayload = {
      ...payloadToSign,
      signature,
    };

    // 3) Encrypt signed payload as reset code blob
    const resetCode = encryptBlob(signedResetPayload);

    console.log("\n✅ Password reset code generated successfully:");
    console.log("--------------------------------------------------");
    console.log(resetCode);
    console.log("--------------------------------------------------");
    console.log(`\nThis code will expire in ${RESET_CODE_EXPIRATION_MINUTES} minutes.`);
  } catch (error) {
    console.error("❌ Error generating reset code:", error.message);
    process.exit(1);
  }
}

main();