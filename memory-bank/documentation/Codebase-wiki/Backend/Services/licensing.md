# Licensing Service Documentation

The ScaleERP licensing system provides a robust, offline-capable verification layer based on RSA-2048 cryptography and multi-stage enforcement logic.

## Architecture Overview

The licensing system consists of three main components:
1.  **Trust Anchor**: Embedded public keys in the `embeddedPublicKey.ts` service.
2.  **State Machine**: The `licenseManager.ts` which evaluates license blobs against hardware and system clock.
3.  **Enforcement Registry**: The `licenseEnforcement.ts` service which gates IPC handlers based on the current state.

## State Machine Logic

The application transitions through four primary states:

| State | Condition | Impact |
|-------|-----------|--------|
| **Valid** | Active signature, Valid until > Today, Active Maintenance | Full CRUD access enabled. |
| **Grace (Soft Lock)**| Maintenance expired OR active maintenance window reached | View-only access; new transactions blocked. |
| **Expired (Hard Lock)**| 7 days past annual anniversary | Application totally locked; activation screen forced. |
| **Tampered** | System clock earlier than last heartbeat | Application locked; requires developer reset. |

## Hybrid Merge Validation

To balance security and support flexibility, the system uses a **Hybrid Merge** approach:
*   **Signed Payload**: Core fields (Edition, ID, Features) are cryptographically signed.
*   **Database Override**: Expiry dates can be administratively updated in the local database to allow trial extensions without re-issuing a new signed blob.
*   **Consistency Check**: Every validation re-checks the signed blob against DB records to prevent unauthorized local modifications.

## Security Layers

### 1. RSA Verification
Uses `RSA-PSS` with `SHA-256`. The system rejects any license not signed by the vendor's private key. In production, local public key files are ignored in favor of the embedded constant.

### 2. Device Fingerprinting
Every license is bound to a machine-specific hash (SHA-256) of CPU and system identifiers.

### 3. Clock Tamper Detection (Heartbeats)
The system logs a "Heartbeat" every **30 minutes** of uptime. If the current system time is found to be older than the most recent heartbeat, the license is marked as `Tampered`. This also triggers a `clock-tamper-detected` event to the renderer.

## IPC API

See the `license:*` prefix section in [API Reference](../../api-reference.md).
