# System Patterns - ScaleERP

## Architecture Overview
ScaleERP is a desktop-first application built with Electron, React, and TypeScript. It follows a modular service-based architecture for core functionalities like Database, Security, and Cloud Sync.

## Key Patterns

### 1. Service Singleton Pattern
Core services (GoogleDriveService, SecurityService, DatabaseManager) are implemented as singletons to ensure consistent state and resource management across the application lifecycle.

### 2. OAuth2 System Browser Flow (New)
To comply with modern security standards (and bypass Google's embedded browser blocks), ScaleERP uses an external system browser flow:
- **Initiation**: App generates an OAuth URL with PKCE (Proof Key for Code Exchange).
- **Redirection**: `shell.openExternal` opens the system's default browser.
- **Local Capture**: A temporary `http` server on `127.0.0.1:42856` captures the authorization code via loopback.
- **Handshake**: The app performs a secure code-for-token exchange using the captured code and the local PKCE verifier.

### 3. Durable Cloud Queue
Cloud uploads are managed via a queue that persists to disk. This ensures that backups generated while offline are automatically uploaded once a connection is established.

### 4. Integrated Backup Management UI
Configuration and history are consolidated into a single "Backups" view:
- **Service Status**: Real-time connection status and account information.
- **Unified Actions**: Manual backup triggers, cloud sync triggers, and system restoration are co-located.
- **Transparency**: Every local backup is mapped to its cloud synchronization state via database joins, providing immediate visual feedback to the user.

### 5. Decoupled Template Registry & Digital Fallback
The invoice engine decouples visual presentation from data normalization:
- **Normalization**: `templateUtils.ts` maps disparate transaction schemas (`CustomerTransaction`, `BrokerTransaction`) to a unified `NormalizedProductItem[]` structure.
- **Presentation**: `TemplateRegistry.tsx` acts as a runtime switcher coordinating layout templates (`StandardA4`, `ModernClean`, `CompactA5`, `Thermal80mm`).
- **Dual Stacking**: For physical printing, half-page layouts (`CompactA5`) can be vertically dual-stacked on a single A4 sheet with an intermediate scissor-cut line.
- **Digital Fallback**: When headless PDF generation is invoked for electronic distribution (WhatsApp/PDF downloads), thermal roll layouts and multi-copy configurations are automatically overridden to a single-copy corporate A4 layout.

### 6. Database Schema Management
Schema versions are tracked in a `metadata` table. Migrations are handled automatically on startup by the Database Manager.
