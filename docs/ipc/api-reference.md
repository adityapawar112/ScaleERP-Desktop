# API Reference: ScaleERP Inventory Management System

## Overview

This document provides a complete reference for the ScaleERP Electron API. All IPC channels use the `db:`, `auth:`, `license:`, or `dev:` prefix format and are accessed via `window.electronAPI`.

## API Structure

The API is exposed through `window.electronAPI` with a nested structure:

```typescript
window.electronAPI.database.*     // Database CRUD, stats, deletion analysis, backup
window.electronAPI.auth.*         // Authentication, sessions, and recovery
window.electronAPI.licensing.*    // Licensing status, imports, and history
window.electronAPI.licensingEvents.* // One-way security event listeners
window.electronAPI.devTools.*     // Internal diagnostic and admin tools
window.electronAPI.getAppVersion() // App utilities
```

---

## Database Operations

### Products

#### `window.electronAPI.database.products.getAll()`
Get all products with manufacturer stocks and stock history.

**Returns**: `Promise<Product[]>`

#### `window.electronAPI.database.products.getById(id: string)`
Get a single product by ID.

#### `window.electronAPI.database.products.insert(data: ProductInsert)`
Create a new product.

#### `window.electronAPI.database.products.update(id: string, data: ProductUpdate)`
Update an existing product.

#### `window.electronAPI.database.products.delete(id: string)`
Delete a product (CASCADE deletes manufacturers).

#### `window.electronAPI.database.products.archive(id: string)`
Archive a product and its manufacturers (soft delete).

#### `window.electronAPI.database.products.unarchive(id: string)`
Unarchive a product and its manufacturers.

---

### Transaction & Financial Operations

#### `window.electronAPI.database.brokerTransactions.insert(data: BrokerTransactionInsert)`
Record a purchase. Updates stock, history, and broker totals.

#### `window.electronAPI.database.customerTransactions.insert(data: CustomerTransactionInsert)`
Record a sale. Decreases stock and updates customer totals.

#### `window.electronAPI.database.analyzeBrokerTransactionDeletion(transactionId: string)`
Analyze the impact of reversing a purchase (e.g., stock reduction).

#### `window.electronAPI.database.whatsappPresets.getAll()`
Get all user-defined message templates.

#### `window.electronAPI.database.whatsappPresets.insert(data: WhatsAppPresetInsert)`
Create a new message preset.

---

### Reports & Analysis

#### `window.electronAPI.database.reports.generateDayBook(startDate, endDate)`
Generate a consolidated financial summary for a date range.

#### `window.electronAPI.database.reports.getOutstandingSummary()`
Analyze all pending receivables and payables across the system.

---

### Backup System

#### `window.electronAPI.database.backup.create()`
Create a manual backup (SQL dump zipped with metadata).

#### `window.electronAPI.database.backup.restore(path: string)`
Restore from a ZIP backup. Includes pre-restore backup and integrity check.

---

## Authentication API

#### `window.electronAPI.auth.login(username, password)`
Authenticate a user. Triggers 15-minute lockout after 5 failed attempts.

#### `window.electronAPI.auth.checkSession()`
Verify active session validity and license standing.

#### `window.electronAPI.auth.requestReset(username)`
Initiate an offline password reset by generating a **Challenge Blob**.

#### `window.electronAPI.auth.verifyResetCode(resetCodeBlob)`
Validate a support-provided RSA-signed reset code.

#### `window.electronAPI.auth.performReset(resetCodeBlob, newPassword)`
Commit new password following a successful challenge-response.

---

## Licensing API

#### `window.electronAPI.licensing.getStatus()`
Get current status (Valid, Grace, Expired, Tampered).

#### `window.electronAPI.licensing.importLicense(blob)`
Incorporate a new signed license into the system.

#### `window.electronAPI.licensing.getDeviceFingerprint()`
Get the SHA-256 hardware identifier for this machine.

#### `window.electronAPI.licensing.getHeartbeats()`
Get raw heartbeat data (logged every 30 minutes of uptime).

---

## Licensing Events (Main -> Renderer)

These are one-way listeners that provide a cleanup function.

#### `window.electronAPI.licensingEvents.onWarning(callback)`
Triggers when maintenance is expiring. Returns `{ daysLeft, level }`.

#### `window.electronAPI.licensingEvents.onExpired(callback)`
Triggers on hard lock. Returns `{ reason }`.

#### `window.electronAPI.licensingEvents.onClockTamperDetected(callback)`
Triggers when system time manipulation is detected.

---

---

## Google Drive Cloud Backup API

Access via `window.electronAPI.googleDrive.*`.

#### `login()`
Initiates the OAuth2 flow with PKCE using the system's default browser.

#### `logout()`
Disconnects the Google account and wipes the local refresh token.

#### `getStatus()`
Returns the current synchronization status, account email, and folder ID.

#### `processQueue()`
Manually triggers the background worker to process pending uploads.

#### `toggleItemStatus(filePath)`
Forces a specific local backup to be enqueued or re-synced to the cloud.

---

## Google Drive Events (Main -> Renderer)

#### `onAuthSuccess(callback)`
Triggers when the OAuth2 flow completes and the user is identified.

#### `onAuthError(callback)`
Triggers if the login flow is cancelled or fails. Returns an error message.

---

## Developer Admin API (Internal)

Requires the **Developer Secret** (`scaleerp-dev-2026`) as the final argument. Access via `window.electronAPI.devTools.*`.

#### `generateLicense(params, secret)`
Generate a signed license blob (requires vendor signing keys).

#### `createUser(params, secret)`
Directly create an administrative user account.

#### `getUsers(secret)`
List all registered users and their security metadata.

#### `authenticateSecret(secret)`
Verify the administrative secret is correct.

---

## Error Handling

Common error messages:
- `"Unauthorized: Administrative secret required"` — Secret mismatch.
- `"License expired or tampered"` — Operation blocked by enforcement.
- `"LOGGER FLOOD DETECTED"` — Throttling active.
