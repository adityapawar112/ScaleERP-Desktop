# ScaleERP Vendor Operations Guide (Internal)

This guide is for the ScaleERP development and support team to manage the licensing lifecycle and handle customer support for the ScaleERP desktop application.

## 1. Security Architecture Overview
- **Trust Anchor**: The Application contains a hardcoded Public RSA Key.
- **Private Key**: The `private_key.pem` is strictly for internal use. **Never share it.**
- **Offline Validation**: The app validates licenses locally. No internet connection is required by the end-user.

## 2. Managing Licenses (Back-Office)
Since the app is offline, you must maintain an internal **License Registry** (e.g., a secure Spreadsheet or CRM).

### Step-by-Step Generation:
1.  **Generate Keys (One-time)**: `npm run generate-license-keys`.
2.  **Create License**:
    ```bash
    npm run generate-license -- --customer="Acme Corp" --edition="Pro" --maint=90 --bind
    ```
3.  **Log Entry**: Copy the `LicenseID` from the output and record it in your Registry along with the customer's hardware ID (if bound).
4.  **Distribution**: Send the generated `.lic` blob to the customer via email or secure transfer.

## 3. Customer Support (AnyDesk Protocol)
When a customer reports an issue and you connect via AnyDesk:

### Accessing the Developer Dashboard:
1.  Navigate to the **Licensing** tab in the sidebar.
2.  Navigate to the **Developer Dashboard** (or use the hidden shortcut: `/dev-dashboard`).
3.  **Authenticate**: Enter the `DEVELOPER_SECRET` (Found in your Support Password Manager).
    - *Default (Development)*: `scaleerp-dev-2026`
    - *Production*: [Check Internal Vault]

### Common Support Tasks:
- **Clock Tampering**: The app detects if the system clock has been moved back more than **24 hours** from the last recorded heartbeat.
  - *Symptom*: Red "Clock Tampering Detected" alert in the UI and restricted data operations.
  - *Fix*: Ensure the system clock is correct, then use the **"Clear Clock Tamper"** button in the Dev Dashboard to reset the security history.
- **License Renewal**: If a customer pays for an extension, generate a new license blob and import it via the "Import License" button.
- **Diagnostics**: Check the **"Logs"** section. In production, sensitive data (fingerprints/hex strings) will be automatically redacted for privacy.

## 4. Disaster Recovery
- **Key Rotation**: If the private key is compromised, you must generate a new pair, update the public key in `electron/services/securityConfig.ts`, and release an application update. Previous licenses will no longer be valid.
- **Database Corruption**: If the local `inventory.db` is corrupt, use the **"Restore Backup"** feature in the Dev Dashboard. Note that Restore requires a valid Pro/Enterprise license.

## 5. Production Readiness & Build Verification
Before shipping the application, follow these steps to ensure secure operations:

### Building for Distribution
1.  **Clean Build**: Run `npm run build-all`.
2.  **Generate Installer**: Run `npm run build-electron-win`.
    - This generates a `dist/` directory with a `.exe` installer and a `win-unpacked` folder.

### Sanity Check (UAT)
1.  **Verify Redaction**:
    - Launch the app from `dist/win-unpacked/ScaleERP.exe`.
    - Perform a Licensing check.
    - Inspect the log file ( `%APPDATA%/scaleerp/logs/production.log` ).
    - Ensure sensitive device fingerprints are marked as `[DATA REDACTED FOR PRODUCTION]`.
2.  **Verify Build Payload**:
    - Check `dist/win-unpacked/resources/app/`.
    - Ensure the `vendor/` directory (containing private keys) is **ABSENT**. (The automated `scripts/verify-build-safety.cjs` should confirm this).

---
© 2026 ScaleERP Support Engineering
