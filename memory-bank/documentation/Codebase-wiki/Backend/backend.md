# Backend Overview — Electron Architecture

The ScaleERP backend is built on Electron, providing a secure, cross-platform desktop runtime with SQLite for local data persistence.

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                    Electron Main Process                     │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │                  Application Entry                   │   │
│  │                  electron/main.ts                    │   │
│  └───────────────────────┬─────────────────────────────┘   │
│                          │                                  │
│         ┌────────────────┼────────────────┬───────────────┐│
│         ▼                ▼                ▼               ▼│
│  ┌──────────────┐ ┌──────────────┐ ┌──────────────┐ ┌──────────────┐
│  │   Database   │ │    IPC       │ │   Backup     │ │   Security   │
│  │   Manager    │ │  Handlers    │ │  Scheduler   │ │ (Auth/Lic)   │
│  └──────────────┘ └──────────────┘ └──────────────┘ └──────────────┘
│         │                │                │               │
│         ▼                ▼                ▼               ▼
│  ┌─────────────────────────────────────────────────────┐   │
│  │           SQLite Database (WAL Mode)                 │   │
│  └─────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
```

## Main Process (`electron/main.ts`)

The main process is the entry point for the Electron application. It handles:

### Initialization Sequence

1. **Licensing Check** — Verifies hardware binding and validity before window creation
2. **Database Initialization** — Connects to SQLite and runs schema migrations
3. **Backup Scheduler** — Starts automated backup service if enabled
4. **IPC Handlers** — Registers all communication channels (DB, Auth, License, Dev)
5. **Schema Validation** — Performs a structural check of the database against expected tables and columns
6. **Window Creation** — Creates the main BrowserWindow with security settings

### Key Responsibilities

| Responsibility | Implementation |
|----------------|----------------|
| Window Management | Creates and manages BrowserWindow instances |
| Database Lifecycle | Initializes and closes database connections |
| Service Coordination | Manages backup scheduler and other services |
| Security Enforcement | Configures context isolation and node integration |

### Window Configuration

```typescript
const mainWindow = new BrowserWindow({
  width: 1200,
  height: 800,
  minWidth: 800,
  minHeight: 600,
  webPreferences: {
    nodeIntegration: false,        // Security: Disable Node.js in renderer
    contextIsolation: true,        // Security: Isolate context
    preload: path.join(__dirname, 'preload.js')  // Context bridge
  },
  icon: path.join(__dirname, '../public/ScaleERPLogo.png'),
  show: false,                     // Wait for ready-to-show
  titleBarStyle: 'default',
  title: 'ScaleERP',
});
```

### Security Features

- **Context Isolation** — Renderer process cannot access Node.js APIs directly
- **Preload Script** — Secure API exposure via context bridge
- **Navigation Control** — Prevents navigation to external URLs
- **Window Creation** — Blocks unauthorized new window creation

## Preload Script (`electron/preload.ts`)

The preload script runs in the renderer process before any web content loads. It provides a secure bridge between the main process and the React frontend.

### Purpose

- Exposes specific Electron APIs to the renderer
- Maintains security by limiting available APIs
- Provides type-safe IPC communication methods

### Exposed APIs

```typescript
// Window control
window.electronAPI.minimize()
window.electronAPI.maximize()
window.electronAPI.close()

// Database operations
window.electronAPI.db.invoke(channel, ...args)

// Platform detection
window.electronAPI.platform
```

## Database Layer

See [Database Documentation](Database/database.md) for detailed information.

### Components

| File | Purpose |
|------|---------|
| `manager.ts` | Connection management, initialization, lifecycle |
| `operations.ts` | CRUD operations for all entities |
| `schema.sql` | Database schema definition |
| `types.ts` | TypeScript interfaces for type safety |
| `backupOps.ts` | Backup and restore operations |

## IPC Communication

See [IPC Documentation](IPC/ipc-communication.md) for detailed information.

### Pattern

The backend uses a **Generic IPC Handler Factory** pattern:

```typescript
// Creates type-safe handlers for any entity
createCRUDHandlers(entityName, operations)

// Generates channels like:
// db:products:getAll
// db:products:getById
// db:products:insert
// db:products:update
// db:products:delete
```

## Services

### Backup Scheduler

See [Backup Scheduler Documentation](Services/backup-scheduler.md) for detailed information.

- Automated database backups using `node-cron`
- Configurable frequency (daily, weekly, monthly)
- Backup history tracking
- Pre-operation backups for safety

### Security Services

See [Licensing Documentation](Services/licensing.md) and [Authentication Documentation](Services/auth-and-reset.md) for detailed information.

- **RSA Licensing** — Native crypto-based license enforcement
- **Encrypted Sessions** — AES-256-GCM session persistence
- **Offline Reset** — Cryptographic challenge-response password recovery

## Error Handling

The backend implements comprehensive error handling:

1. **Database Errors** — Caught and logged with context
2. **IPC Errors** — Returned to frontend with meaningful messages
3. **Initialization Errors** — Logged and application continues with limited functionality

## Development Mode

In development mode:

- Vite dev server runs on `http://localhost:3000`
- DevTools automatically open
- Hot module replacement enabled
- Source maps available

## Production Mode

In production mode:

- Loads built files from `build/index.html`
- DevTools disabled
- Optimized bundle
- Code signed (when configured)

## Related Documentation

- [Database Schema](Database/schema.md)
- [Database Operations](Database/operations.md)
- [IPC Communication](IPC/ipc-communication.md)
- [Backup Scheduler](Services/backup-scheduler.md)
- [Frontend Overview](../Frontend/frontend.md)