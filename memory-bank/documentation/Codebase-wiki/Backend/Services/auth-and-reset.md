# Authentication & Password Reset Documentation

The ScaleERP backend provides a secure user authentication layer with encrypted session persistence and an offline, support-assisted password recovery mechanism.

## Authentication System

### Session Management
The system uses a transparent persistence layer for active sessions:
- **Encryption**: Session data is encrypted using **AES-256-GCM**.
- **Storage**: Tokens are stored in the user's `userData` folder (`auth-session.enc`).
- **Persistence**: Sessions survive application restarts but are terminated immediately if the license status changes to `Expired` or `Tampered`.

### Login Security
- **Hashing**: Passwords are hashed using `bcrypt` (12 rounds).
- **Lockout Policy**: Accounts are automatically locked for 15 minutes after **5 consecutive failed attempts**.
- **Lockout Persistence**: Lockouts are tracked in the `auth_lockouts` table and verified during the `auth:login` IPC call.

## Offline Password Reset

Since the application is offline-first, password recovery relies on a cryptographic challenge-response protocol between the User and Ouroscale Support.

### Reset Flow

1.  **Challenge Generation**: The user clicks "Forgot Password" on the login screen. The application generates an encrypted **Challenge Blob** (via `window.electronAPI.auth.requestReset`).
2.  **Support Interaction**: The user provides this blob to support via phone/messaging.
3.  **Vendor Response**: Support decrypts the blob, verifies the user, and uses the **Vendor Private Key** to sign a **Reset Packet** (via `window.electronAPI.devTools.generateResetCode`).
4.  **Application Consumption**: The user enters the Reset Packet into the application (via `window.electronAPI.auth.verifyResetCode`).
5.  **Verification**: 
    -   The backend verifies the RSA signature using the embedded public key.
    -   It checks the `nonces` table to ensure the packet hasn't been used before.
    -   It verifies the challenge ID matches the original request.
6.  **Password Update**: If valid, the system allows the user to set a new password (`window.electronAPI.auth.performReset`), which is then re-hashed and stored in the `users` table.

## Security Precautions

*   **Reset Expiry**: Reset packets are only valid for 1 hour from generation.
*   **Nonce Tracking**: Every reset event consumes a cryptographic nonce to prevent replay attacks.
*   **Tamper Protection**: Any attempt to brute-force the reset code results in an immediate security lockout of the authentication service.

## IPC API

See the `auth:*` and `dev:generate-reset-code` sections in [API Reference](../../api-reference.md).
