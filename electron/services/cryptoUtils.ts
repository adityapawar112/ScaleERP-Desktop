// electron/services/cryptoUtils.ts
import crypto from 'crypto';
import { EMBEDDED_LICENSE_PUBLIC_KEYS } from './embeddedPublicKey';

export interface LicenseBlobEnvelope {
  payload: string;
  signature: string;
  key_id?: string;
}

export interface LicenseBlobVerificationResult<T = Record<string, unknown>> {
  valid: boolean;
  payload?: T;
  reason?: string;
  keyId?: string;
}

export const PUBLIC_KEYS: Record<string, string> = {
  ...EMBEDDED_LICENSE_PUBLIC_KEYS,
};

function sortValue(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map((item) => sortValue(item));
  }

  if (value && typeof value === 'object') {
    return Object.keys(value as Record<string, unknown>)
      .sort()
      .reduce<Record<string, unknown>>((acc, key) => {
        acc[key] = sortValue((value as Record<string, unknown>)[key]);
        return acc;
      }, {});
  }

  return value;
}

export function canonicalize(value: unknown): string {
  return JSON.stringify(sortValue(value));
}

export function registerPublicKey(keyId: string, publicKey: string): void {
  PUBLIC_KEYS[keyId] = publicKey;
}

export function signLicense(payload: Record<string, unknown>, privateKey: string, keyId = 'key_001'): string {
  const canonicalPayload = canonicalize(payload);
  
  // Upgrade to RSA-PSS padding for new signatures
  const signature = crypto.sign(
    'SHA256',
    Buffer.from(canonicalPayload, 'utf-8'),
    {
      key: privateKey,
      padding: crypto.constants.RSA_PKCS1_PSS_PADDING,
      saltLength: crypto.constants.RSA_PSS_SALTLEN_DIGEST,
    }
  ).toString('base64');

  const envelope: LicenseBlobEnvelope = {
    payload: canonicalPayload,
    signature,
    key_id: keyId
  };

  return Buffer.from(JSON.stringify(envelope), 'utf-8').toString('base64');
}

export function verifyLicenseBlob<T = Record<string, unknown>>(blob: string): LicenseBlobVerificationResult<T> {
  try {
    const decoded = Buffer.from(blob, 'base64').toString('utf-8');
    const envelope = JSON.parse(decoded) as LicenseBlobEnvelope;

    if (!envelope.payload || !envelope.signature) {
      return { valid: false, reason: 'License blob is missing payload or signature' };
    }

    const keyId = envelope.key_id || 'key_001';
    const publicKey = PUBLIC_KEYS[keyId];
    if (!publicKey) {
      return { valid: false, reason: `Unknown key_id: ${keyId}`, keyId };
    }

    const parsedPayload = JSON.parse(envelope.payload) as T;
    const canonicalPayload = canonicalize(parsedPayload);
    const dataBuffer = Buffer.from(canonicalPayload, 'utf-8');
    const signatureBuffer = Buffer.from(envelope.signature, 'base64');

    // Attempt 1: Verify using modern RSA-PSS padding
    let isValid = false;
    try {
      isValid = crypto.verify(
        'SHA256',
        dataBuffer,
        {
          key: publicKey,
          padding: crypto.constants.RSA_PKCS1_PSS_PADDING,
          saltLength: crypto.constants.RSA_PSS_SALTLEN_DIGEST,
        },
        signatureBuffer
      );
    } catch (e) {
      // PSS verification might throw if parameters are totally incompatible,
      // we'll catch and let it fall through to v1.5
    }

    // Attempt 2: Fallback to legacy PKCS#1 v1.5 (current default)
    if (!isValid) {
      isValid = crypto.verify(
        'SHA256',
        dataBuffer,
        publicKey,
        signatureBuffer
      );
    }

    if (!isValid) {
      return { valid: false, reason: 'Signature verification failed (both PSS and legacy checks failed)', keyId };
    }

    return {
      valid: true,
      payload: parsedPayload,
      keyId
    };
  } catch (error) {
    return {
      valid: false,
      reason: `Verification error: ${error instanceof Error ? error.message : String(error)}`
    };
  }
}
