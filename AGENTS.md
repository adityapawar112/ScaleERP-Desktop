# ScaleERP-Desktop — Agent & Developer Configuration Guide

Welcome to the `ScaleERP-Desktop` repository. This file serves as the definitive reference for human developers and autonomous AI coding agents working on the ScaleERP desktop application.

---

## 1. Project Context & Technology Stack

- **Runtime**: Electron 34 with secure multi-process isolation (`contextIsolation: true`, `nodeIntegration: false`)
- **Frontend Layer**: React 19, TypeScript 5.9, Bootstrap 5, React Icons, Lucide Icons, Chart.js
- **Database Engine**: SQLite 3 with native bindings, operating in Write-Ahead Logging mode (`WAL`)
- **Security & Cryptography**: Native Node.js `crypto` with embedded RSA-2048 public key verification
- **Export & Hardware Integration**: ExcelJS (multi-sheet reports), jsPDF + html2canvas (A4 invoices), ESC/POS (80mm thermal receipt printers)
- **Packaging**: `electron-builder` producing Windows NSIS Installers (`ScaleERP-Setup-1.0.0.exe`) and Portable packages

---

## 2. System Architecture & Process Boundaries

```mermaid
flowchart TD
    subgraph RendererProcess ["React 19 Renderer Process (Chromium)"]
        UI["React Pages & Modals<br/>(Dashboard, Invoicing, Godowns, DevDashboard)"]
        State["React Context & State<br/>(AppContext, LicenseContext)"]
        UI --> State
    end

    subgraph PreloadBridge ["Preload Isolation Boundary"]
        API["contextBridge.exposeInMainWorld('electronAPI')<br/>(Typed IPC wrappers)"]
    end

    subgraph MainProcess ["Electron 34 Main Process (Node.js)"]
        IPC["ipcMain Handlers<br/>(electron/ipc/handlers.ts)"]
        DB["SQLite 3 Engine (WAL Mode)<br/>(electron/database/)"]
        Lic["RSA License Verification Engine<br/>(electron/services/licenseManager.ts)"]
        Drive["Google Drive Sync Scheduler<br/>(electron/services/googleDriveService.ts)"]
        
        IPC --> DB
        IPC --> Lic
        IPC --> Drive
    end

    State -->|Calls window.electronAPI| API
    API -->|ipcRenderer.invoke| IPC
    IPC -.->|licensingEvents (One-way push)| API
```

---

## 3. Critical Rules for Agents

### 1. IPC Boundary & Security
- **Never enable `nodeIntegration: true`** or disable `contextIsolation`.
- All interactions between React components and Node.js OS APIs must route through `electron/preload.ts` and be handled in `electron/ipc/handlers.ts`.
- Every IPC handler that alters system state or accesses internal developer tools must call `requireAuth(secret)` to validate against the master developer secret:
  ```typescript
  export const DEVELOPER_SECRET = 'scaleerp-dev-2026';
  ```

### 2. SQLite Database Integrity & WAL Mode
- The database is located at `%APPDATA%/scaleerp/data/inventory.db` in production and `./data/inventory.db` in development.
- Always preserve SQLite PRAGMAs:
  - `PRAGMA journal_mode = WAL;` (prevents database locking during background writes)
  - `PRAGMA synchronous = NORMAL;`
  - `PRAGMA foreign_keys = ON;`
- All multi-table updates (e.g. creating an invoice while decrementing stock and updating customer balance) must execute within an explicit database transaction (`BEGIN TRANSACTION` ... `COMMIT`).

### 3. Cryptographic Offline Licensing Rules
- The application is **air-gapped by default**. It must never fail or block user login simply because the computer lacks internet access.
- License status evaluates to one of three states:
  1. `valid`: Full operational access.
  2. `grace`: License expired within 7 days. Enforces view-only Soft Lock (forms and save buttons disabled).
  3. `expired` / `invalid`: Hard Lock. Displays the Lockout / Activation screen.
- Clock tampering is detected if system time rewinds by more than 24 hours relative to monotonic heartbeat logs.

### 4. Build Safety Audit
- Before shipping builds, never include vendor private signing keys or raw test scripts in production artifacts.
- The build process is audited by `scripts/verify-build-safety.cjs`, which checks that `vendor/`, `private_key.pem`, and `scripts/` are excluded from the distribution bundle.

---

## 4. Key Development & Verification Commands

```powershell
# Start Vite development server
npm run dev

# Compile Electron Main process TypeScript
npm run build-electron

# Build production React frontend bundle
npm run build

# Run Vitest test suite (15 tests covering security, licensing, Google Drive)
npm run test

# Run full production packaging build & security safety audit
npm run build-all
```
