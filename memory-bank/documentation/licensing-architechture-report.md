# Enterprise Licensing & Developer Dashboard: Implementation Blueprint

This document is a complete architectural specification and blueprint for rebuilding the offline-first licensing system and developer dashboard from scratch. It is strictly tech-agnostic and designed to be integrated into **any target application** (e.g., Pharmacy System, Retail POS, ERP). 

By strictly following the schemas, logic gates, payload structures, and dashboard UI architectures outlined below, an engineering team can exactly replicate the robust licensing engine originally analyzed.

---

## 1. Concrete Parameters & Thresholds

The system operates strictly on the following mathematical windows and limits. These constants must be codified into the application layer:

- **Standard Renewal Term**: 365 Days from `valid_from`.
- **Standard Maintenance Term**: 90 Days from `valid_from`.
- **Hard Lock Grace Limit**: 7 Days after the 365-day renewal term ends.
- **Trial Period Setup (Optional)**: 14 Days.
- **Heartbeat Frequency**: Snapshot of system time logged every 1 hour (via background scheduler).
- **Clock Tamper Tolerance**: Maximum negative chronometric shift of 24 hours. (If `current_time` < `last_heartbeat_time` - 24 hours, flag as tampered).

---

## 2. Database Schema Requirements

The target application must instantiate the following discrete tables isolated from its primary business logic.

### 2.1 `license_customers`
Records the entity holding the license.
- `customer_id` (String / UUID, Primary Key)
- `name`, `email`, `company` (Strings)
- `status` (Enum/String: 'active', 'suspended', 'expired')
- `created_at`, `updated_at` (Datetimes)

### 2.2 `license_policies`
Reusable templates defining baseline constraints.
- `policy_id` (String / UUID, Primary Key)
- `name` (String)
- `license_type` (Enum: 'trial', 'subscription', 'perpetual')
- `duration_days` (Integer, default: 365)
- `maintenance_days` (Integer, default: 90)
- `max_devices` (Integer, default: 1)
- `features_json` (JSON String: defines toggles like `{"multi_user": true}`)
- `created_at` (Datetime)

### 2.3 `licenses`
The central state table for an active license.
- `license_id` (String / UUID, Primary Key)
- `customer_id` (Foreign Key -> `license_customers`)
- `policy_id` (Foreign Key -> `license_policies`)
- `status` (Enum: 'active', 'expired', 'revoked', 'renewed')
- `edition` (String: 'Basic', 'Pro', 'Enterprise')
- `valid_from`, `valid_until`, `maintenance_until` (ISO Datetime Strings)
- `device_fingerprint` (String)
- `license_blob` (Text: The raw base64 string provided to the client)
- `grace_until` (ISO Datetime String, Optional)
- `grace_mode` (String, Optional)
- `created_at`, `updated_at` (Datetimes)

### 2.4 `license_heartbeats`
Immutable log for tracking offline time manipulation.
- `id` (String / UUID, Primary Key)
- `license_id` (Foreign Key -> `licenses`)
- `checked_at` (Datetime)
- `system_time_iso` (ISO Datetime String of the machine's exact unmanipulated clock)
- `reason` (String: e.g., 'hourly', 'startup', 'user_action')
- `metadata` (Text)

### 2.5 `users`
Application-level user logic structurally bound to the active license.
- `user_id` (String / UUID, Primary Key)
- `username` (String, Unique)
- `password_hash` (String)
- `license_id` (Foreign Key -> `licenses`)
- `failed_attempts` (Integer, default 0)
- `max_failed_attempts` (Integer, default 5)
- `locked_out` (Boolean)
- `last_login` (Datetime)
- `created_at` (Datetime)

### 2.6 Audit & Recovery Tables
Secondary logic to manage cryptographic resets and historical tracking.
- `license_events`: Append-only audit log tracking changes (e.g., 'license_updated', 'status_changed', 'admin_override').
- `password_reset_tokens`, `used_reset_nonces`, `clock_override_tokens`: Recovery logic tables supporting administrative and emergency bypasses.

---

## 3. Cryptographic Payload & Validation Architecture

### 3.1 The Target Payload
The structure that gets signed by the primary private key.

```json
{
  "license_id": "uuid-1234",
  "customer_id": "tenant-abc",
  "edition": "Pro",
  "license_type": "subscription",
  "valid_from": "2024-01-01T00:00:00.000Z",
  "valid_until": "2025-01-01T00:00:00.000Z",
  "maintenance_until": "2024-04-01T00:00:00.000Z",
  "device_fingerprint": "hashabc123" 
}
```

### 3.2 Key Cryptographic Concepts
1. **Canonicalization**: Prior to signing, sort the JSON payload's keys alphabetically and stringify it without whitespace. This prevents formatting mismatches.
2. **Signing Algorithm**: Fasten using RSA Asymmetric Cryptography (SHA256). Apply padding algorithms (RSA-PSS with Salt Length Digest) for modern security. The client must implement a fallback to legacy PKCS#1 v1.5 padding during verification in case PSS mathematically fails for backwards compatibility. The client should embed the Public Key directly in its source code/binary.
3. **The Blob Envelope**: The transported license file/string.
```json
{
  "payload": "{\"customer_id\": \"tenant-abc\", ...}",
  "signature": "base64-rsa-signature-string",
  "key_id": "key_production_001"
}
```

### 3.3 Hardware Fingerprinting Logic
Locally compute a unique device hash using constant environment properties.
- `Hostname` + `OS Platform` + `CPU Architecture` + `CPU Model` + `Total RAM` + `MAC Address` -> `SHA256 Hash`
*If the `device_fingerprint` in the validated Payload does not strictly equal the locally computed hash, the license state is marked INVALID.*

---

## 4. State & Expiration Logic Gates

Validation must run at startup and periodically over time (e.g., daily check). 
Compare the machine's `current_time` against the active License Payload variables:

1. **Calculate Renewal Target**: 
   `renewalEffectiveDate = valid_from + 365 Days`

2. **Calculate Hard Lock Drop-dead Date**: 
   `hardLockDate = renewalEffectiveDate + 7 Days`

3. **Validation Decision Tree**:
   The validation service evaluates the license payload to determine the State (Valid, Grace, Expired, Missing). **Simultaneously**, it evaluates an independent `tamperDetected` security boolean (current_time < last_heartbeat - 24 hours). The application enforcement router intercepts requests by evaluating the `tamperDetected` boolean first before evaluating the Enum State.
   
   - **IF** `tamperDetected == true`: Operations blocked entirely.
   - **IF** `current_time` > `hardLockDate`: 
     -> State: **EXPIRED** (Hard Lock: Application fully blocked. Requires new blob.)
   - **IF** `current_time` > `maintenance_until` OR `current_time` > `renewalEffectiveDate`: 
     -> State: **GRACE** (Soft Lock / View-Only Mode: `ReadData` and `ExportData` are permitted. `WriteData`, `RunBackup`, and `ManageUsers` operations are fully blocked.)
   - **ELSE**: 
     -> State: **VALID** (Full normal access)

*Note on Overrides*: The system *must* allow reading `valid_from` and `maintenance_until` dynamically from the local database instead of strictly the payload. This allows application admins to update local database rows to grant temporary extensions without manufacturing a new blob, while preventing edits to core tier capabilities.

---

## 5. Developer Dashboard Blueprint

The internal developer & admin interface is entirely segmented from the standard user interface and requires a "Developer Secret" for authentication access.

### Abstract Module Layout for Target Integration

**1. Access Challenge Wrapper**
- A locked screen requiring a Developer Secret mapped globally in the app's env/config.

**2. License Generation Module**
- A form inputting tenant details, durations, and tier configurations.
- Button: `Generate Blob`. Invokes internal signing utilizing the private key (if configured in dev) to output the JSON/Base64 string.
- Button: `Generate 14-Day Trial`. Bypasses data entry and instantly imports a 14-day blob for local use.

**3. Emergency Overrides Module**
- Button: `Reset Maintenance`. Updates local Database `licenses` table. Sets `maintenance_until = current_time + 90 days`.
- Button: `Reset Renewal`. Sets `valid_from = current_time`. (This dynamically pushes `renewalEffectiveDate` 365 days into the future).
- Button: `Clear Clock Tampering`. Executes: `DELETE FROM license_heartbeats WHERE system_time_iso > current_time` to clear future anomalies.

**4. User Provisioning & Password Recovery Module**
- Table displaying all accounts from the `users` collection.
- Displays `failed_attempts` and `locked_out` status.
- UI elements to forcefully assign a `new_password` directly, AND a cryptographic trapdoor to `Generate Reset Code` based on an offline challenge-response blob submitted by locked-out users.

**5. System Vitals & Logs Module**
- Dedicated Info tab displaying Application Version, License State (Valid/Grace/Expired), Session User, and locally computed Device Fingerprint.
- Dedicated Logs tab streaming the most recent internal entries from the `license_events` and `license_heartbeats` tables.

**6. Application-Specific Database Viewer (Pluggable)**
- Rather than hardcoding inventory modules, this tab renders dynamic queries.
- Connect this to the target application's local datastore (e.g., Pharmacy Stock, Rx tables, Customer ledgers) offering direct `SELECT * FROM [Dropdown]` table browsing and structural integrity checks to diagnose data corruption.

---

## 6. Frontend / Presentation Layer Requirements

For a cohesive user experience, the target application must implement the following UI patterns to respect the core licensing engine.

**1. Global State Provider (React Context / Vuex / Redux)**
- Create a global licensing context that initializes on app load. 
- It must listen to backend IPC events like `onWarning`, `onExpired`, `onClockTamperDetected`, and `onMaintenanceExpired`. 
- This provider handles nuanced UI state calculations for `warningLevel` ('info', 'urgent', 'critical') matching backend logic:
  - Maintenance $\le$ 3 days -> **critical**
  - Maintenance $\le$ 14 (>3) days -> **urgent**
  - Maintenance $\le$ 30 (>14) days -> **info**
  - Negative values (days expired) -> **critical** with custom alert string.

**2. Grace Mode Handling (Soft Lock)**
- If the global context evaluates to `Grace` status, the frontend must systematically disable all data-entry forms, creation dialogs, and save buttons across the application domains, enforcing a strict "View-Only" operational mode for users.

**3. Account Lockout Interceptor**
- Before reaching the main application, if authentication evaluates `locked_out == true` for a specific user, route immediately to a Lockout Screen. This screen must hide the standard dashboard, report the exact `failed_attempts` out of `max_failed_attempts`, and supply a clear "Reset Password" workflow.

**4. Activation Screen Trapdoor (Emergency Access)**
- The primary License Activation screen (where users paste JSON blobs or upload `.lic` files) must include a functionally hidden or obfuscated "Developer Access" button/link. This serves as a critical trapdoor, allowing an engineer to bypass a total system Hard Lock, enter the hardcoded frontend developer secret (e.g., `DEV_SECRET = 'ouro-dev-2026'`), and access the Developer Dashboard to apply overrides or clear clock tampering.
