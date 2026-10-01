# ScaleERP Desktop Packaging & Code Signing Guide

This specification details the production packaging pipeline, code signing procedures, CI/CD automation, and deployment workflows for **ScaleERP-Desktop**.

---

## 1. Architecture & Packaging Overview

ScaleERP-Desktop combines an **Electron 34** runtime, an **ACID-compliant SQLite 3 (WAL mode)** database, and a **React 19 + TypeScript** frontend compiled with **Vite 8**.

```
+-----------------------------------------------------------------------------+
|                           SCALEERP PACKAGING PIPELINE                       |
+-----------------------------------------------------------------------------+
|                                                                             |
|  [React 19 + Vite]         [Electron Main & Services]    [SQLite Schema]    |
|        │                               │                        │           |
|   (vite build)             (tsc -p electron/tsconfig)   (copy-schema)      |
|        ▼                               ▼                        ▼           |
|    build/ (UI assets)       build-electron/ (Main bundle)  database/schema.sql|
|        │                               │                        │           |
|        └───────────────┬───────────────┴────────────────────────┘           |
|                        ▼                                                    |
|           [scripts/obfuscate-main.cjs]  (Production only)                   |
|                        ▼                                                    |
|         [scripts/verify-build-safety.cjs] (Security Audit)                  |
|                        ▼                                                    |
|         [electron-builder --win]                                            |
|                        ├──────────────────────────┐                         |
|                        ▼                          ▼                         |
|             ScaleERP-Setup-1.0.0.exe    ScaleERP-Portable-1.0.0.zip         |
|             (NSIS System Installer)     (Air-gapped Portable Workstation)   |
|                                                                             |
+-----------------------------------------------------------------------------+
```

### Packaging Outputs

| Artifact Name | Target Type | Intended Use Case |
| :--- | :--- | :--- |
| `ScaleERP-Setup-1.0.0.exe` | NSIS Installer | Primary enterprise installation with desktop shortcuts, Start Menu entry, registry association (`scaleerp://`), and uninstaller. |
| `ScaleERP-Portable-1.0.0.zip` | Standalone ZIP | Portable extraction for restricted or air-gapped godown workstations lacking administrative install privileges. |
| `ScaleERP-Portable-1.0.0.exe` | Portable Executable | Single-file portable runtime that unpacks to local AppData cache at execution time. |
| `latest.yml` | Update Metadata | Cryptographic block map and SHA-512 hashes consumed by Electron's auto-updater module. |

---

## 2. Packaging Configuration (`package.json`)

The packaging behavior is defined under the `"build"` key in [package.json](file:///c:/Users/adity/Desktop/Projects/ScaleERP/ScaleERP-Desktop/package.json):

```json
{
  "build": {
    "appId": "com.scaleerp.inventory",
    "productName": "ScaleERP",
    "directories": {
      "output": "dist",
      "buildResources": "electron/build"
    },
    "files": [
      "build/**/*",
      "build-electron/**/*",
      "node_modules/**/*",
      "package.json"
    ],
    "win": {
      "icon": "public/icon.ico",
      "target": [
        "nsis",
        "portable",
        "zip"
      ],
      "artifactName": "${productName}-${version}-${os}-${arch}.${ext}",
      "forceCodeSigning": false,
      "verifyUpdateCodeSignature": false
    },
    "nsis": {
      "artifactName": "${productName}-Setup-${version}.${ext}",
      "oneClick": false,
      "perMachine": false,
      "allowToChangeInstallationDirectory": true,
      "createDesktopShortcut": true,
      "createStartMenuShortcut": true,
      "shortcutName": "ScaleERP"
    },
    "portable": {
      "artifactName": "${productName}-Portable-${version}.${ext}"
    },
    "zip": {
      "artifactName": "${productName}-Portable-${version}.${ext}"
    }
  }
}
```

### Critical Icon Asset Constraints
Windows high-DPI scaling requires that `public/icon.ico` contains an embedded icon layer of **at least 256×256 pixels**. Generating an `.ico` with only 16×16, 32×32, or 48×48 layers causes `electron-builder` to halt with:
```
⨯ image .../public/icon.ico must be at least 256x256
```
The canonical `public/icon.ico` embeds a 256×256 PNG data stream derived from high-resolution brand vectors (`public/android-chrome-512x512.png`).

---

## 3. Windows Code Signing (Authenticode)

### Production Code Signing Requirements
To prevent Microsoft SmartScreen warnings on Windows 10 and 11, production releases should be signed with an Extended Validation (EV) or Organization Validation (OV) Code Signing Certificate.

#### 1. Hardware Token / Local HSM Signing
When using a USB cryptographic token (e.g., SafeNet eToken):
```powershell
# Set environment variables for electron-builder
$env:CSC_LINK = "C:\Certs\scaleerp-code-signing.p12"
$env:CSC_KEY_PASSWORD = "YourSecurePassword"

# Or configure SignTool directly
signtool.exe sign /tr http://timestamp.digicert.com /td sha256 /fd sha256 /n "ScaleERP Technologies Pvt Ltd" dist\win-unpacked\ScaleERP.exe
```

#### 2. Cloud Signing (Azure Trusted Signing / DigiCert ONE)
In CI/CD runners (such as GitHub Actions), signing is configured via `azure/trusted-signing-action` or a custom SignTool hook using cloud credentials:
```yaml
- name: Azure Trusted Signing
  uses: azure/trusted-signing-action@v0.4.1
  with:
    azure-tenant-id: ${{ secrets.AZURE_TENANT_ID }}
    azure-client-id: ${{ secrets.AZURE_CLIENT_ID }}
    azure-client-secret: ${{ secrets.AZURE_CLIENT_SECRET }}
    endpoint: https://eus.codesigning.azure.net
    code-signing-account-name: ScaleERPAccount
    certificate-profile-name: ScaleERPProductionProfile
    files-folder: dist
    files-folder-filter: exe
    file-digest: SHA256
    timestamp-rfc3161: http://timestamp.digicert.com
    timestamp-digest: SHA256
```

#### 3. Local Development & Unsigned Builds
For testing and development evaluation, code signing enforcement is explicitly disabled via:
```json
"forceCodeSigning": false,
"verifyUpdateCodeSignature": false
```
This enables building functional binaries locally on non-signing machines.

---

## 4. Build Safety & Secret Leaks Audit

ScaleERP uses a dedicated non-superficial security auditor, [scripts/verify-build-safety.cjs](file:///c:/Users/adity/Desktop/Projects/ScaleERP/ScaleERP-Desktop/scripts/verify-build-safety.cjs). It runs before every packaging step (`npm run build-all`).

The safety auditor verifies:
1. **Config Audit**: Ensures `vendor/`, `.pem`, and `scripts/` are excluded from the Electron ASAR bundle in `package.json`.
2. **Physical Scan**: Recursively inspects `build/` and `build-electron/` to ensure no `.key`, `.pem`, `.cjs`, or vendor code exists on disk.
3. **Entropy & String Scan**: Inspects all compiled `.js` files for RSA private key headers (`-----BEGIN RSA PRIVATE KEY-----`).

If any private key or vendor file is detected, the build halts with exit code 1 to prevent leaking cryptographic root authority keys.

---

## 5. Automated CI/CD Release Pipeline

ScaleERP-Desktop includes an automated GitHub Actions release workflow located at [.github/workflows/release.yml](file:///c:/Users/adity/Desktop/Projects/ScaleERP/ScaleERP-Desktop/.github/workflows/release.yml).

### Triggering a New Release
To publish an official release:
```bash
# 1. Ensure working directory is clean and tests pass
npm run test
npm run build-all

# 2. Tag the release commit
git tag v1.0.0

# 3. Push tag to GitHub to trigger CI/CD
git push origin v1.0.0
```

### Workflow Execution Stages
1. **Runner**: `windows-latest` with Node.js 20.
2. **Clean Install**: `npm ci` ensures exact dependency resolution from `package-lock.json`.
3. **Automated Testing**: Runs 15 unit and IPC integration tests (`npm run test`).
4. **Build & Safety**: Executes `npm run build-all` (Vite, Electron tsc, schema copy, obfuscation, safety audit).
5. **Electron Builder**: Compiles NSIS installer and portable zip archive with `--publish always`.
6. **Integrity Checksums**: Generates `checksums.txt` containing SHA-256 hashes of all release binaries.
7. **GitHub Release Publication**: Uploads assets to the GitHub Release tagged `v1.0.0`.

---

## 6. Cryptographic Checksum Verification

End users and enterprise network administrators can verify binary integrity using SHA-256 checksums:

### Verification via Windows PowerShell
```powershell
Get-FileHash -Algorithm SHA256 .\ScaleERP-Setup-1.0.0.exe
```

### Verification via Linux / macOS / Git Bash
```bash
sha256sum ScaleERP-Setup-1.0.0.exe
```

Expected hash matches the official value published on the release page and the Web control plane `/download` screen.

---

## 7. Air-Gapped & Rural Mandi Deployment Guide

ScaleERP is designed for zero-connectivity environments such as wholesale grain markets (APMC mandis), cold storage warehouses, and rural fertilizer godowns.

### Step-by-Step USB Deployment Procedure:
1. **Download Standalone Archive**: Download `ScaleERP-Portable-1.0.0.zip` on an internet-connected computer.
2. **Copy to USB Media**: Extract or copy the ZIP archive directly to an encrypted USB flash drive or external SSD.
3. **Transfer to Air-Gapped Terminal**:
   - Insert USB into the target godown terminal (Windows 10 / 11 64-bit).
   - Copy folder to `C:\ScaleERP-Workstation\` or run directly from the USB drive.
4. **Launch Application**: Execute `ScaleERP.exe`. The application initializes local SQLite database in WAL mode immediately.
5. **Apply Offline License**:
   - Obtain the signed `.lic` file (generated via Web Control Plane using the terminal's hardware fingerprint).
   - In ScaleERP-Desktop, navigate to **Settings > License Activation > Import License File**.
   - Select the `.lic` file. The RSA-PSS signature is verified locally using the embedded public key, unlocking the full enterprise POS and billing features without requiring an internet connection.
