# ScaleERP Desktop — Technical Architecture & Documentation Hub

Welcome to the internal engineering documentation for the **ScaleERP Desktop** application. This directory contains detailed architectural specifications, security protocols, database schemas, and IPC interface definitions.

---

## 📚 Documentation Index

### 1. Architecture & Design Patterns
- [System Patterns](file:///c:/Users/adity/Desktop/Projects/ScaleERP/ScaleERP-Desktop/docs/architecture/system-patterns.md) — Multi-process Electron architecture, preload security boundary, and unidirectional data flow.
- [Technical Context](file:///c:/Users/adity/Desktop/Projects/ScaleERP/ScaleERP-Desktop/docs/architecture/tech-context.md) — Runtime environment, platform constraints, and build toolchains.
- [Licensing Architecture](file:///c:/Users/adity/Desktop/Projects/ScaleERP/ScaleERP-Desktop/docs/architecture/licensing-architecture.md) — Cryptographic offline license verification, hardware fingerprinting, and tamper protection.
- [Reports Architecture](file:///c:/Users/adity/Desktop/Projects/ScaleERP/ScaleERP-Desktop/docs/architecture/reports-architecture.md) — Multi-dimensional ledger aggregation, balance sheets, and cash flow calculations.
- [Invoice Customization Engine](file:///c:/Users/adity/Desktop/Projects/ScaleERP/ScaleERP-Desktop/docs/architecture/invoice-customization-engine.md) — Multi-format template renderer (Thermal 80mm, Standard A4, Modern Clean, Compact A5).

### 2. Cryptographic Licensing & Security
- [RSA Key Rotation SOP](file:///c:/Users/adity/Desktop/Projects/ScaleERP/ScaleERP-Desktop/docs/licensing/rsa-key-rotation-sop.md) — Standard operating procedure for vendor private/public RSA key rotation.
- [Vendor Operations Guide](file:///c:/Users/adity/Desktop/Projects/ScaleERP/ScaleERP-Desktop/docs/licensing/vendor-ops-guide.md) — Internal support guide for issuing `.lic` files, managing hardware bindings, and handling clock tampering.
- [License Security & Testing](file:///c:/Users/adity/Desktop/Projects/ScaleERP/ScaleERP-Desktop/docs/licensing/license-testing.md) — Verification suite for cryptographic signatures and anti-tamper defenses.
- [Production Readiness](file:///c:/Users/adity/Desktop/Projects/ScaleERP/ScaleERP-Desktop/docs/licensing/production-readiness.md) — Security checklist and go-live deployment criteria.

### 3. Database & Storage Engine
- [SQLite Schema & ERD](file:///c:/Users/adity/Desktop/Projects/ScaleERP/ScaleERP-Desktop/docs/database/schema.md) — Comprehensive relational schema definitions, constraints, and entity diagrams.
- [Database Operations](file:///c:/Users/adity/Desktop/Projects/ScaleERP/ScaleERP-Desktop/docs/database/operations.md) — ACID transactions, balance recalculations, and parameterized CRUD handlers.
- [Connection & WAL Mode](file:///c:/Users/adity/Desktop/Projects/ScaleERP/ScaleERP-Desktop/docs/database/database-wal.md) — Write-Ahead Logging (WAL) configuration, pragma tuning, and concurrent connection handling.

### 4. Inter-Process Communication (IPC)
- [IPC Communication Registry](file:///c:/Users/adity/Desktop/Projects/ScaleERP/ScaleERP-Desktop/docs/ipc/ipc-communication.md) — Complete map of IPC channels between Electron Main, Preload context bridge, and React Renderer.
- [API Reference](file:///c:/Users/adity/Desktop/Projects/ScaleERP/ScaleERP-Desktop/docs/ipc/api-reference.md) — TypeScript method signatures exposed via `window.electronAPI`.

### 5. Services & Integrations
- [Auth & Challenge-Response Reset](file:///c:/Users/adity/Desktop/Projects/ScaleERP/ScaleERP-Desktop/docs/services/auth-and-reset.md) — Offline cryptographic challenge-response password reset protocol.
- [Automated Backup Scheduler](file:///c:/Users/adity/Desktop/Projects/ScaleERP/ScaleERP-Desktop/docs/services/backup-scheduler.md) — Cron-driven automated SQLite database backup routines.
- [Google Drive Cloud Sync](file:///c:/Users/adity/Desktop/Projects/ScaleERP/ScaleERP-Desktop/docs/services/google-drive-sync.md) — Local loopback OAuth server and encrypted cloud backup queue.

### 6. Frontend Application
- [Frontend Architecture](file:///c:/Users/adity/Desktop/Projects/ScaleERP/ScaleERP-Desktop/docs/frontend/overview.md) — React 19 structure, client-side routing, and design system.
- [Component Library](file:///c:/Users/adity/Desktop/Projects/ScaleERP/ScaleERP-Desktop/docs/frontend/components.md) — Shared modals, searchable selects, and layout containers.
- [Page Directory](file:///c:/Users/adity/Desktop/Projects/ScaleERP/ScaleERP-Desktop/docs/frontend/pages.md) — Breakdown of all 21 view screens across retail, wholesale, and administration.
- [Application Context & State](file:///c:/Users/adity/Desktop/Projects/ScaleERP/ScaleERP-Desktop/docs/frontend/app-context.md) — Global React state management and real-time ledger updates.
- [Internationalization (i18n)](file:///c:/Users/adity/Desktop/Projects/ScaleERP/ScaleERP-Desktop/docs/frontend/i18n.md) — Localization architecture supporting English and Marathi.
- [Excel Export Engine](file:///c:/Users/adity/Desktop/Projects/ScaleERP/ScaleERP-Desktop/docs/frontend/excel-export.md) — Custom spreadsheet generator using ExcelJS.

### 7. Packaging & Releases
- [Packaging & Code Signing Guide](file:///c:/Users/adity/Desktop/Projects/ScaleERP/ScaleERP-Desktop/docs/PACKAGING.md) — NSIS installer, portable zip distribution, Windows Authenticode code signing, and CI/CD release workflow.
- [CHANGELOG.md](file:///c:/Users/adity/Desktop/Projects/ScaleERP/ScaleERP-Desktop/docs/CHANGELOG.md) — Chronological version log detailing all major releases, features, and security patches.

