# AppContext & LicenseContext Documentation

The frontend uses specialized React Context providers to organize and map localized functionality across the Electron boundary, prioritizing performance caching, unified entity models, and runtime application security enforcement.

## Context Mapping

| Context | File | Purpose |
|---------|------|---------|
| **AppContext** | `src/context/AppContext.tsx` | Domain Data, Backend Entity Models, General CRUD. |
| **LicenseContext** | `src/context/LicenseContext.tsx` | Cryptographic Validation state, Lockout timing, Warnings. |

---

## AppContext Architecture

Central state mapping to physical representations of the `products`, `transactions`, and `whatsappPresets` retrieved from SQLite arrays into object models.

### Advanced Types mapping

```typescript
export interface Product {
  id: string;
  name: string;
  description: string;
  price: number;
  stockQuantity: number;
  manufacturerStocks: ManufacturerStock[];
  stockHistory: StockHistory[];
  isArchived?: boolean;
}

export interface WhatsAppPreset {
  id: string;
  title: string;
  message: string;
}
```

Notably, a `Product` is unified in the global state alongside its array of `manufacturerStocks` and `stockHistory` instead of segregating them into localized UI lookups. This enables `Products.tsx` to handle nested manipulations directly via `updateProduct` inside a unified dispatch loop.

### Parallel Data Loading

```typescript
// Data loaded via highly parallel Promise.all blocks mapping native IPC requests.
const [ productsData, brokersData, /* ... */ whatsappPresetsData ] = await Promise.all([
    window.electronAPI.invoke('db:products:getAll'),
    window.electronAPI.invoke('db:brokers:getAll'),
    window.electronAPI.invoke('db:whatsappPresets:getAll'),
    // Retrieves additional entities...
]);
```

### WhatsApp Preset Operations

`AppContext` directly provides hooks designed to construct or destroy dynamic message templates utilized exclusively by the `WhatsAppManager.tsx` UI view:
`addWhatsAppPreset`, `updateWhatsAppPreset`, `deleteWhatsAppPreset`.

---

## LicenseContext Architecture

The `LicenseContext` operates uniquely. Instead of merely reflecting UI state, it operates as a secure intermediary boundary directly subscribing to one-way global security messages bridged via the Preload API.

### Context Type Definition

```typescript
export interface LicenseUIState {
  state: 'valid' | 'grace' | 'expired' | 'invalid' | 'no-license';
  warningLevel: 'info' | 'urgent' | 'critical' | null;
  warningMessage: string | null;
  maintenanceDaysLeft: number | null;
  renewalDays: number | null;
  clockTamperDetected: boolean;
  isDeveloperBypass: boolean;
  deviceFingerprint: string | null;
  // ... Key payload traits
}

interface LicenseContextType {
  licenseState: LicenseUIState;
  refreshLicense: () => Promise<void>;
  importLicense: (blob: string) => Promise<boolean>;
  clockTamperDetected: boolean;
  isElectronAvailable: boolean;
  setDeveloperBypass: (enabled: boolean) => void;
}
```

### Event-Driven Preload Synchronization

`LicenseContext` attaches immediate listeners over the Window's `electronAPI.licensingEvents` object:
- `onWarning`: Captures soft/hard locks from the periodic health checks.
- `onExpired`: Drops the frontend State into immediate Hard Locked view-modes.
- `onClockTamperDetected`: Invalidates the session actively upon user OS clock rollback.
- `onMaintenanceExpired`: Switches to persistent view-only limits for CRUD ops.

### Context Interaction Methods

- `refreshLicense()`: Forces an on-demand poll against `getStatus()` via IPC to retrieve the latest state overrides and recalculates Warning Levels strictly internally.
- `importLicense()`: Exposes `Licensing.tsx` with a localized file string parsing method mapped internally back to state manipulation.
- `isElectronAvailable`: Safe-guard fallback property for resolving rendering issues outside of packaged builds (Browser simulation mapping).

## Related Documentation

- [Frontend Overview](../frontend.md) — React architecture
- [Pages](../Pages/pages.md) — Page components using context
- [Backend IPC](../../Backend/IPC/ipc-communication.md) — Frontend-backend communication