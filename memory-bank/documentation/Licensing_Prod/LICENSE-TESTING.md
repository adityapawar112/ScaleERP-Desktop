# License Testing Guide

Quick reference for generating and testing licenses in ScaleERP.

## Prerequisites

RSA key pair must exist in `vendor/keys/`:
- `private_key.pem` — used to sign licenses
- `public_key.pem` — embedded in the app for verification

If missing, generate them:
```bash
node vendor/generate-license-keys.cjs
```

## Generate a Test License

### Basic License (365 days validity, 90 days maintenance)
```bash
node vendor/generate-license.cjs --output license-test.lic
```

### License with Custom Validity
```bash
node vendor/generate-license.cjs \
  --validFrom 2026-04-05T00:00:00.000Z \
  --validUntil 2027-04-05T00:00:00.000Z \
  --maintenanceUntil 2026-07-05T00:00:00.000Z \
  --output license-test.lic
```

### License with Grace Period
```bash
node vendor/generate-license.cjs \
  --graceUntil 2026-05-05T00:00:00.000Z \
  --graceMode "read-only" \
  --output license-grace.lic
```

### License with Device Binding
```bash
# First, get your device fingerprint from the app's activation screen
node vendor/generate-license.cjs \
  --deviceFingerprint "YOUR_FINGERPRINT_HERE" \
  --output license-bound.lic
```

### License with Custom Features
```bash
node vendor/generate-license.cjs \
  --features '{"inventory":true,"reports":true,"whatsapp":false}' \
  --output license-features.lic
```

## Import a License

### Method 1: Paste License
1. Open the app — you'll see "No License Found"
2. Click "Import License"
3. Select the "Paste License" tab
4. Open `license-test.lic` in a text editor
5. Copy the entire base64 blob
6. Paste it into the text area
7. Click "Activate License"

### Method 2: Import File
1. Open the app — you'll see "No License Found"
2. Click "Import License"
3. Select the "Import File" tab
4. Click "Browse Files"
5. Select your `.lic` file
6. The app will read and validate it automatically

### Method 3: Open Keys Folder
1. On the activation screen, click "📁 Open License Keys Folder"
2. This opens `vendor/keys/` in your file explorer
3. Place your license file there for easy access

## Test Scenarios

### 1. Valid License
```bash
node vendor/generate-license.cjs --output license-valid.lic
```
**Expected:** App loads normally, no banners.

### 2. Expired License
```bash
node vendor/generate-license.cjs \
  --validFrom 2025-01-01T00:00:00.000Z \
  --validUntil 2025-06-01T00:00:00.000Z \
  --output license-expired.lic
```
**Expected:** Blocking overlay with "License Expired" message.

### 3. Grace Period License
```bash
node vendor/generate-license.cjs \
  --validUntil 2026-04-10T00:00:00.000Z \
  --graceUntil 2026-04-15T00:00:00.000Z \
  --graceMode "read-only" \
  --output license-grace.lic
```
**Expected:** App loads with grace period warning banner.

### 4. Warning Thresholds
```bash
# 30-day warning (info level)
node vendor/generate-license.cjs \
  --validUntil 2026-05-05T00:00:00.000Z \
  --output license-30day.lic

# 7-day warning (urgent level)
node vendor/generate-license.cjs \
  --validUntil 2026-04-12T00:00:00.000Z \
  --output license-7day.lic
```
**Expected:** Blue banner (30-day) or orange banner (7-day).

### 5. Invalid/Tampered License
1. Generate a valid license
2. Open the `.lic` file in a text editor
3. Change any character in the base64 blob
4. Try to import
**Expected:** "Invalid license" blocking screen.

### 6. Wrong Device License
1. Generate a license bound to a different fingerprint
2. Try to import on your machine
**Expected:** "Invalid license" — device binding enforced.

## Validate License Contents

Decode a license blob to inspect its contents:
```bash
# On Linux/macOS
cat license-test.lic | base64 -d | jq .

# On Windows (PowerShell)
[Text.Encoding]::UTF8.GetString([Convert]::FromBase64String((Get-Content license-test.lic))) | ConvertFrom-Json
```

Expected output:
```json
{
  "payload": "{\"customer_id\":\"customer-demo\",\"device_fingerprint\":null,\"edition\":\"Pro\",\"features\":{\"inventory\":true,\"reports\":true},\"license_id\":\"...\",\"maintenance_until\":\"2026-07-03T...\",\"valid_from\":\"2026-04-05T...\",\"valid_until\":\"2027-04-05T...\"}",
  "signature": "base64-signature-here",
  "key_id": "key_001"
}
```

## Run Validation Scripts

```bash
# Phase 1: Schema, crypto, fingerprint
node scripts/validate-license-phase1.cjs

# Phase 2: License manager, import, validation
node scripts/validate-license-phase2.cjs

# Phase 3: Scheduler, heartbeats, clock tamper
node scripts/validate-license-phase3.cjs

# Phase 4: UI components, event subscriptions
node scripts/validate-license-phase4.cjs
```

## Troubleshooting

### "License manager not initialized"
- Ensure the app is running in Electron (not browser)
- Check that `vendor/keys/public_key.pem` exists

### "Device fingerprint mismatch"
- The license was generated for a different machine
- Generate a new license without `--deviceFingerprint` or use your current fingerprint

### "License expired"
- Check `valid_until` and `maintenance_until` dates
- `maintenance_until` acts as the effective expiry (90-day hard block)

### "Clock tamper detected"
- System clock was set back more than 7 days
- The scheduler detects this via heartbeat analysis
- Fix: restore correct system time and wait for next heartbeat

### Import button does nothing
- Ensure you're running in Electron, not `npm run dev` (browser mode)
- The `showOpenDialog` IPC only works in Electron