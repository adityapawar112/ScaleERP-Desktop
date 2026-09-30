# Tech Context - ScaleERP

## Technology Stack
- **Framework**: Electron (v14+)
- **Frontend**: React with TypeScript
- **Database**: SQLite (via `better-sqlite3`)
- **Cloud API**: Google Drive API (via `googleapis`)
- **State Management**: React Context / Hooks
- **Styling**: Bootstrap 5.3.1 + React Bootstrap 2.8.0

## Asset Storage & Optimization
- **Client-Side Optimization**: Uploaded branding images are resized and compressed directly inside HTML5 `<canvas>` elements (`imageOptimizer.ts`) prior to disk persistence.
- **Disk Persistence**: Assets are written securely via Node.js `fs` buffers to the user's `assets/branding/` directory within `app.getPath('userData')` to prevent database bloat.
- **Renderer IPC Access**: Local `file:///` security restrictions are bypassed by dynamically reading disk assets as Base64 Data URLs via `window.electronAPI.system.readAssetAsBase64`.

## Security & Auth
- **OAuth2**: Google OAuth 2.0 with PKCE (Proof Key for Code Exchange).
- **Redirection**: Loopback IP address (`127.0.0.1`) with a fixed port (`42856`).
- **Token Storage**: `electron-store` with OS-level encryption (`safeStorage`) for refresh tokens.
- **PKCE**: Custom SHA-256 challenge generation for public client security.

## Development Setup
- **Build Tool**: Vite (Frontend), TSC (Electron)
- **Runtime**: Node.js 16+
- **Environment**: Windows / macOS / Linux compatible

## Technical Constraints
- Google OAuth requires a **Desktop App** client type for local loopback redirects.
- Client Secret must be included in the handshake due to `google-auth-library` implementation specifics for Desktop types.
