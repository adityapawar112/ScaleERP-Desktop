# IPC Communication Documentation

The Inter-Process Communication (IPC) layer enables secure, type-safe communication between the Electron main process (backend) and the React renderer process (frontend).

## Architecture Overview

```mermaid
flowchart TD
    subgraph Renderer[React Frontend]
        AppContext[AppContext/Hooks\n- Manages app state\n- Calls window.electronAPI]
        Preload[Preload Script\n- electron/preload.ts\n- Context Bridge exposed APIs]
    end

    subgraph Main[Electron Backend]
        Handlers[IPC Handlers\n- electron/ipc/handlers.ts\n- Factory patterns & Security Guards]
        Services[Services & Database\n- execute business logic]
    end

    AppContext -->|Calls| Preload
    Preload -->|ipcRenderer.invoke| Handlers
    Preload <--|ipcRenderer.on| Handlers
    Handlers -->|Reads/Writes| Services
```

## Security Model

### Context Isolation

Electron's context isolation ensures the renderer process cannot directly access Node.js APIs or cryptographic logic:

```typescript
// main.ts - BrowserWindow configuration
webPreferences: {
  nodeIntegration: false,    // Disable Node.js in renderer
  contextIsolation: true,    // Isolate context
  sandbox: true,             // Enable sandbox
  preload: path.join(__dirname, 'preload.js')
}
```

### Preload Script

The preload script (`electron/preload.ts`) exposes securely scoped namespaces to the renderer via `window.electronAPI`:
- `database`: Core data, inventory, and backup operations.
- `licensing`: License status, validation, and imports.
- `licensingEvents`: Server-sent events for tamper and expiry warnings.
- `auth`: User authentication, session management, and password recovery.
- `devTools`: Developer-only tools, bypasses, and generation utilities.

## Main Window Exposes (`window.electronAPI`)

### 1. Database Operations (`window.electronAPI.database`)

Uses factory-based nested namespaces for entity CRUD.

| Namespace | Methods Exposed |
|-----------|-----------------|
| `products` | `getAll`, `getById`, `insert`, `update`, `delete`, `archive`, `unarchive`, `getArchived` |
| `productManufacturers`| same as products |
| `brokers`, `customers` | `getAll`, `getById`, `insert`, `update`, `delete` |
| `brokerTransactions`, `customerTransactions` | CRUD + `getByBrokerId`/`getByCustomerId` |
| `brokerLeisures`, `customerLeisures` | CRUD + `getByBrokerId`/`getByCustomerId` |
| `stockHistory` | CRUD + `getByProductId`, `getByDateRange` |
| `backup` | `create`, `list`, `validate`, `restore`, `getSettings`, `updateSettings` |

**Diagnostic & Utility Methods:**
- `getStats()`, `getDatabaseStats()`
- Deletion analysis: `analyzeBrokerTransactionDeletion()`, `analyzeProductDeletion()`, etc.

### 2. Licensing Operations (`window.electronAPI.licensing`)

Handles hardware-bound validation and logic.

| Method | Description |
|--------|-------------|
| `getStatus()` | Retrieves current license state, edition, and time remaining. |
| `validate()` | Forces a cryptographic validation against hardware fingerprint. |
| `importLicense(blob)` | Cryptographically verifies and stores a new license payload. |
| `getDeviceFingerprint()`| Returns the SHA-256 hardware identifier for vendor binding. |
| `getSchedulerState()` | Returns status of the periodic tamper-check scheduler. |
| `forceCheck()` | Triggers an immediate scheduler evaluation. |

### 3. Server-Sent Events (`window.electronAPI.licensingEvents`)

One-way asynchronous push events from Main to Renderer using `ipcRenderer.on`. Each listener returns a `cleanup()` function to prevent memory leaks in React `useEffect`.

- `onWarning(callback)`: Triggers when the maintenance window is nearing expiry.
- `onExpired(callback)`: Triggers when the hard-lock date passes.
- `onClockTamperDetected(callback)`: Triggers the moment system time drifts behind the last heartbeat.
- `onMaintenanceExpired(callback)`: Triggers when the soft-lock phase begins.

### 4. Authentication Operations (`window.electronAPI.auth`)

Session and credential management.

| Method | Description |
|--------|-------------|
| `login(u, p)` | Verifies bcrypt password hash and sets encrypted session. |
| `logout()` | Destroys the persistent AES-GCM session file. |
| `checkSession()` | Validates session persistence on startup. |
| `requestReset(u)` | Generates an offline cryptographic challenge blob. |
| `verifyResetCode(blob)`| Validates the vendor-signed response packet. |
| `performReset(b, p)`| Finalizes the password override. |

### 5. Developer Tools (`window.electronAPI.devTools`)

Secret-guarded utility operations. All calls require a `secret` matching `PROCESS_ENV_DEVELOPER_SECRET`.

| Method | Description |
|--------|-------------|
| `generateLicense()` | Creates a new RSA-PSS signed blob payload offline. |
| `createUser()` | Bypasses UI to seed administrative users. |
| `generateResetCode()` | Takes a challenge blob and uses the Private Key to sign an override packet. |
| `authenticateSecret()`| Validates the dev tools password token for local sessions. |

## IPC Channel Naming Convention

All channels backing the above APIs follow a specific prefix mapping to route effectively:

| Channel Prefix | Map | Description |
|--------|----------------|-------------|
| `db:{entity}:{op}`| `.database.*.*` | Standard CRUD operations (e.g. `db:products:getAll`) |
| `auth:*` | `.auth.*` | Auth mechanisms |
| `license:*` | `.licensing.*` | Status rendering and loading |
| `license:admin:*`| `.licensing.*` | Restricted DB-level overrides (soft-modifications) |
| `dev:*` | `.devTools.*` | Raw vendor key usage for generation |

## Generic IPC Handler Factory

The backend leverages a factory pattern in `electron/ipc/handlers.ts` to strictly type the `db:*` endpoints:

```typescript
export function createCRUDHandlers<T, TInsert, TUpdate>(
  entityName: string,
  operations: CRUDOperations<T, TInsert, TUpdate>
): Record<string, IPCHandler> {
  return {
    [`db:${entityName}:getAll`]: async () => await operations.getAll(),
    [`db:${entityName}:getById`]: async (_, id: string) => await operations.getById(id),
    [`db:${entityName}:insert`]: async (_, data: TInsert) => await operations.insert(data),
    [`db:${entityName}:update`]: async (_, id: string, data: TUpdate) => await operations.update(id, data),
    [`db:${entityName}:delete`]: async (_, id: string) => await operations.delete(id),
  };
}
```

Extensions like `createTransactionCRUDHandlers` and `createLeisureCRUDHandlers` inject `getByBrokerId` and `getByCustomerId`.

## Security Guards & Authorization

Administrative and developer endpoints are gated by guard wrappers in the Main process, ensuring that even if the Renderer process is manipulated, the operations fail.

### Guard Pattern Example

```typescript
// Guard for operations requiring active/valid licenses
const requireLicense = (handler: IPCHandler): IPCHandler => {
  return async (event, ...args) => {
    await licenseEnforcement.ensureAllowed();
    return handler(event, ...args);
  };
};

// Guard for developer/vendor exclusive capabilities
const requireDev = (handler: IPCHandler): IPCHandler => {
  return async (event, ...args) => {
    const secret = args[args.length - 1]; // Assume the secret is always the final arg
    if (secret !== process.env.DEVELOPER_SECRET) {
      throw new Error('Unauthorized: Developer secret is required');
    }
    return handler(event, ...args);
  };
};
```

These wraps protect channels like `dev:generate-license` or `license:admin:update`.

## Error Handling

All IPC channels leverage robust try/catch blocks sending unified error responses back:

```typescript
try {
  const result = await window.electronAPI.auth.login(user, pass);
  if (!result.success) {
    // Expected UI feedback (e.g. invalid password)
    setError(result.error);
  }
} catch (err) {
  // IPC invocation or Main process fatal failure 
  console.error('System failure:', err.message);
}
```

## Related Documentation
- [Backend Architecture](../backend.md)
- [Database Operations](../Database/operations.md)
- [Licensing System](../Services/licensing.md)