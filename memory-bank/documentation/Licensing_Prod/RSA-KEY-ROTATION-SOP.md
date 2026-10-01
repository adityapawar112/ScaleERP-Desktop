# RSA Key Rotation SOP (Standard Operating Procedure)

This document outlines the procedure for rotating the RSA key pair used by the ScaleERP licensing system. Key rotation is necessary if the private key is suspected of being compromised or as part of a regular security lifecycle.

## ⚠️ Critical Impact Notice
> [!WARNING]
> Rotating the RSA keys is a **breaking change**. Once the new public key is embedded in the application:
> 1. All existing licenses signed with the OLD private key will become **INVALID**.
> 2. Customers will be locked out of their applications until they receive a new license signed with the NEW private key and update their software.

---

## 1. Preparation
Before starting, ensure you have:
- Access to the internal **License Registry** (to track who needs new licenses).
- A backup of the current `vendor/keys/` directory.
- Permission to push a new version of the application.

## 2. Step-by-Step Procedure

### Step 2.1: Generate New Keys
Run the key generation script. This will overwrite the existing `private_key.pem` and `public_key.pem` in `vendor/keys/`.

```bash
npm run generate-license-keys
```

### Step 2.2: Update the Embedded Public Key
1. Open `electron/services/embeddedPublicKey.ts`.
2. Find the `EMBEDDED_LICENSE_PUBLIC_KEYS` object.
3. Open `vendor/keys/public_key.pem` and copy its contents.
4. Add a new entry to the object (e.g., `key_002`) or update the existing one if you do not wish to support legacy keys.

Recommended approach: **Hard Cut-off**
```typescript
// electron/services/embeddedPublicKey.ts
export const EMBEDDED_LICENSE_PUBLIC_KEYS: Record<string, string> = {
  key_002: `-----BEGIN PUBLIC KEY-----
[PASTE NEW PUBLIC KEY HERE]
-----END PUBLIC KEY-----`,
};
```

### Step 2.3: Update License Generator
If you changed the key ID (e.g., to `key_002`), update the default `key_id` in `vendor/generate-license.cjs` to match.

### Step 2.4: Build and Deploy
1. Run a full clean build:
   ```bash
   npm run build-all
   ```
2. Distribute the new version to customers.

## 3. Post-Rotation Workflow
1. For each active customer in your Registry:
   - Generate a new license using the **NEW** keys.
   - Send the new `.lic` file to the customer.
2. Provide instructions for the customer to:
   - Update the application.
   - Import the new license file.

## 4. Emergency Rollback
If the rotation fails and you need to revert:
1. Restore the `vendor/keys/` backup.
2. Revert the changes in `electron/services/embeddedPublicKey.ts`.
3. Rebuild and redeploy.

---
© 2026 ScaleERP Security & Engineering
