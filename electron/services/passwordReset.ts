import { hashPassword } from "./passwordHasher";
import * as userOperations from "../database/userOperations";
import { v4 as uuidv4 } from "uuid";
import crypto from "crypto";
import fs from "fs";
import path from "path";
import { getDeviceFingerprint } from "./deviceFingerprint";
import {
  isResetNonceUsed,
  markResetNonceUsed,
} from "../database/licenseOperations";

const RESET_CODE_EXPIRATION_MINUTES = 30;
const ENCRYPTION_ALGORITHM = "aes-256-gcm";
const IV_LENGTH = 16;

interface ResetChallengePayload {
  challengeId: string;
  userId: string;
  username: string;
  licenseId: string;
  deviceFingerprint: string;
  issuedAt: number;
  expiration: number;
}

interface SignedResetCodePayload {
  challengeId: string;
  userId: string;
  username: string;
  licenseId: string;
  deviceFingerprint: string;
  nonce: string;
  issuedAt: number;
  expiration: number;
  keyId: string;
  signature: string;
}

// NOTE: For the encrypted challenge transport we keep the existing offline
// passphrase model so support can decrypt challenge blobs and issue reset codes.
const OFFLINE_SIGNING_PASSPHRASE =
  process.env.OFFLINE_SIGNING_PASSPHRASE ||
  "super-secret-offline-passphrase-for-reset";

const RESET_SIGNING_PRIVATE_KEY_PATH =
  process.env.RESET_SIGNING_PRIVATE_KEY_PATH ||
  path.join(process.cwd(), "vendor", "keys", "private_key.pem");

const RESET_SIGNING_PUBLIC_KEY_PATH =
  process.env.RESET_SIGNING_PUBLIC_KEY_PATH ||
  path.join(process.cwd(), "vendor", "keys", "public_key.pem");

const RESET_SIGNING_KEY_ID =
  process.env.RESET_SIGNING_KEY_ID || "reset_key_001";

function getKeyFromPassphrase(passphrase: string): Buffer {
  return crypto.pbkdf2Sync(passphrase, "salt", 100000, 32, "sha512");
}

function canonicalizePayload(payload: Record<string, unknown>): string {
  const sortedKeys = Object.keys(payload).sort();
  const sortedPayload: Record<string, unknown> = {};
  for (const key of sortedKeys) {
    sortedPayload[key] = payload[key];
  }
  return JSON.stringify(sortedPayload);
}

function loadPrivateSigningKey(): string {
  if (process.env.RESET_SIGNING_PRIVATE_KEY_PEM) {
    return process.env.RESET_SIGNING_PRIVATE_KEY_PEM;
  }

  return fs.readFileSync(RESET_SIGNING_PRIVATE_KEY_PATH, "utf8");
}

function loadPublicSigningKey(): string {
  if (process.env.RESET_SIGNING_PUBLIC_KEY_PEM) {
    return process.env.RESET_SIGNING_PUBLIC_KEY_PEM;
  }

  return fs.readFileSync(RESET_SIGNING_PUBLIC_KEY_PATH, "utf8");
}

function signResetPayload(payload: Omit<SignedResetCodePayload, "signature">): string {
  const privateKey = loadPrivateSigningKey();
  const canonicalPayload = canonicalizePayload(payload);
  return crypto
    .sign("sha256", Buffer.from(canonicalPayload, "utf8"), privateKey)
    .toString("base64");
}

function verifyResetPayloadSignature(payload: Omit<SignedResetCodePayload, "signature">, signature: string): boolean {
  const publicKey = loadPublicSigningKey();
  const canonicalPayload = canonicalizePayload(payload);

  return crypto.verify(
    "sha256",
    Buffer.from(canonicalPayload, "utf8"),
    publicKey,
    Buffer.from(signature, "base64")
  );
}

const encryptionKey = getKeyFromPassphrase(OFFLINE_SIGNING_PASSPHRASE);

export class PasswordResetService {
  private challenges: Map<string, ResetChallengePayload> = new Map();

  constructor() {
    setInterval(() => this.cleanupExpiredChallenges(), 60 * 1000);
  }

  private cleanupExpiredChallenges() {
    const now = Date.now();
    for (const [challengeId, challenge] of this.challenges.entries()) {
      if (challenge.expiration < now) {
        this.challenges.delete(challengeId);
      }
    }
  }

  private encryptBlob(payload: Record<string, unknown>): string {
    const iv = crypto.randomBytes(IV_LENGTH);
    const cipher = crypto.createCipheriv(ENCRYPTION_ALGORITHM, encryptionKey, iv);

    let encrypted = cipher.update(JSON.stringify(payload), "utf8", "hex");
    encrypted += cipher.final("hex");
    const tag = cipher.getAuthTag();

    return `${iv.toString("hex")}:${encrypted}:${tag.toString("hex")}`;
  }

  private decryptBlob<T>(blob: string): T {
    const parts = blob.split(":");
    if (parts.length !== 3) {
      throw new Error("Invalid blob format");
    }

    const iv = Buffer.from(parts[0], "hex");
    const encryptedText = parts[1];
    const tag = Buffer.from(parts[2], "hex");

    const decipher = crypto.createDecipheriv(ENCRYPTION_ALGORITHM, encryptionKey, iv);
    decipher.setAuthTag(tag);

    let decrypted = decipher.update(encryptedText, "hex", "utf8");
    decrypted += decipher.final("utf8");

    return JSON.parse(decrypted) as T;
  }

  public async generateResetChallenge(username: string): Promise<string> {
    const user = await userOperations.getUserByUsername(username);
    if (!user) {
      throw new Error("User not found");
    }

    const issuedAt = Date.now();
    const challengePayload: ResetChallengePayload = {
      challengeId: uuidv4(),
      userId: user.user_id,
      username: user.username,
      licenseId: user.license_id,
      deviceFingerprint: getDeviceFingerprint(),
      issuedAt,
      expiration: issuedAt + RESET_CODE_EXPIRATION_MINUTES * 60 * 1000,
    };

    this.challenges.set(challengePayload.challengeId, challengePayload);

    return this.encryptBlob(challengePayload as unknown as Record<string, unknown>);
  }

  public async verifyResetChallengeBlob(blob: string): Promise<ResetChallengePayload> {
    try {
      const payload = this.decryptBlob<ResetChallengePayload>(blob);

      if (payload.expiration < Date.now()) {
        throw new Error("Reset challenge expired");
      }

      const storedChallenge = this.challenges.get(payload.challengeId);
      if (!storedChallenge) {
        throw new Error("Invalid or consumed reset challenge");
      }

      if (
        storedChallenge.userId !== payload.userId ||
        storedChallenge.username !== payload.username ||
        storedChallenge.licenseId !== payload.licenseId
      ) {
        throw new Error("Reset challenge identity mismatch");
      }

      return payload;
    } catch (error) {
      console.error("Error verifying reset challenge blob:", error);
      throw new Error("Invalid or corrupted reset challenge blob");
    }
  }

  // Intended for vendor-side reset code generation after support receives challenge blob.
  public async generateSignedResetCode(
    challengePayload: ResetChallengePayload
  ): Promise<string> {
    if (challengePayload.expiration < Date.now()) {
      throw new Error("Challenge already expired");
    }

    const payloadToSign: Omit<SignedResetCodePayload, "signature"> = {
      challengeId: challengePayload.challengeId,
      userId: challengePayload.userId,
      username: challengePayload.username,
      licenseId: challengePayload.licenseId,
      deviceFingerprint: challengePayload.deviceFingerprint,
      nonce: uuidv4(),
      issuedAt: Date.now(),
      expiration: Date.now() + RESET_CODE_EXPIRATION_MINUTES * 60 * 1000,
      keyId: RESET_SIGNING_KEY_ID,
    };

    const signature = signResetPayload(payloadToSign);

    const fullPayload: SignedResetCodePayload = {
      ...payloadToSign,
      signature,
    };

    return this.encryptBlob(fullPayload as unknown as Record<string, unknown>);
  }

  private async parseAndValidateResetCode(
    resetCodeBlob: string
  ): Promise<Omit<SignedResetCodePayload, "signature">> {
    const codePayload = this.decryptBlob<SignedResetCodePayload>(resetCodeBlob);

    const { signature, ...payloadWithoutSignature } = codePayload;

    if (!signature) {
      throw new Error("Missing reset code signature");
    }

    const isSignatureValid = verifyResetPayloadSignature(
      payloadWithoutSignature,
      signature
    );

    if (!isSignatureValid) {
      throw new Error("Invalid reset code signature");
    }

    if (payloadWithoutSignature.expiration < Date.now()) {
      throw new Error("Reset code expired");
    }

    const challenge = this.challenges.get(payloadWithoutSignature.challengeId);
    if (!challenge) {
      throw new Error("Invalid or already used reset code (challenge not found)");
    }

    if (
      challenge.userId !== payloadWithoutSignature.userId ||
      challenge.username !== payloadWithoutSignature.username ||
      challenge.licenseId !== payloadWithoutSignature.licenseId
    ) {
      throw new Error("Reset code identity mismatch");
    }

    const nonceAlreadyUsed = await isResetNonceUsed(payloadWithoutSignature.nonce);
    if (nonceAlreadyUsed) {
      throw new Error("Reset code nonce has already been used");
    }

    return payloadWithoutSignature;
  }

  public async verifyResetCode(resetCodeBlob: string): Promise<{
    success: boolean;
    valid: boolean;
    reason?: string;
    userId?: string;
    username?: string;
    licenseId?: string;
    expiresAt?: number;
  }> {
    try {
      const verifiedPayload = await this.parseAndValidateResetCode(resetCodeBlob);

      return {
        success: true,
        valid: true,
        userId: verifiedPayload.userId,
        username: verifiedPayload.username,
        licenseId: verifiedPayload.licenseId,
        expiresAt: verifiedPayload.expiration,
      };
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Unknown verification error";
      return {
        success: false,
        valid: false,
        reason: message,
      };
    }
  }

  public async verifyAndApplyResetCode(
    resetCodeBlob: string,
    newPassword: string
  ): Promise<void> {
    try {
      const verifiedPayload = await this.parseAndValidateResetCode(resetCodeBlob);

      const user = await userOperations.getUserByUsername(verifiedPayload.username);
      if (!user) {
        throw new Error("User not found");
      }

      if (user.user_id !== verifiedPayload.userId) {
        throw new Error("Reset user identity mismatch");
      }

      if (user.license_id !== verifiedPayload.licenseId) {
        throw new Error("Reset license identity mismatch");
      }

      const hashedPassword = await hashPassword(newPassword);

      // Critical fix: update by user_id (correct API contract).
      await userOperations.updateUserPassword(verifiedPayload.userId, hashedPassword);

      await markResetNonceUsed(
        verifiedPayload.nonce,
        verifiedPayload.licenseId,
        verifiedPayload.userId
      );

      this.challenges.delete(verifiedPayload.challengeId);
    } catch (error) {
      console.error("Error verifying and applying reset code:", error);
      throw new Error(
        "Failed to apply password reset: " +
          (error instanceof Error ? error.message : "unknown error")
      );
    }
  }
}