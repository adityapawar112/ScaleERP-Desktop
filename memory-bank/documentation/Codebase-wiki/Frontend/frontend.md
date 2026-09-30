# Frontend Overview — React Architecture

The ScaleERP frontend is built with React 19, TypeScript, and Bootstrap 5, providing a responsive, user-friendly interface for inventory management, secured by a dedicated Licensing layer.

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                    React Application                        │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │              App.tsx (Root Component)                │   │
│  │  - HashRouter for Electron compatibility            │   │
│  │  - Authentication & Session Verification            │   │
│  │  - Integrates LicenseGuard for access control       │   │
│  │  - Sidebar navigation                               │   │
│  │  - Route definitions                                │   │
│  └───────────────────────┬─────────────────────────────┘   │
│                          │                                  │
│         ┌────────────────┼────────────────┐                │
│         ▼                ▼                ▼                │
│  ┌──────────────┐ ┌──────────────┐ ┌──────────────┐       │
│  │   Sidebar    │ │    Pages     │ │  Components  │       │
│  │  (Navigation)│ │  (14 pages)  │ │  (11 shared) │       │
│  └──────────────┘ └──────────────┘ └──────────────┘       │
│                          │                                  │
│                          ▼                                  │
│  ┌─────────────────────────────────────────────────────┐   │
│  │          Contexts (State Management)                 │   │
│  │  - AppContext: Global state, IPC communication, CRUD│   │
│  │  - LicenseContext: Security, validation, tamper     │   │
│  │    detection, graceful lockout enforcement          │   │
│  └─────────────────────────────────────────────────────┘   │
│                          │                                  │
│                          ▼                                  │
│  ┌─────────────────────────────────────────────────────┐   │
│  │              i18n (Internationalization)             │   │
│  │  - English and Marathi support                      │   │
│  │  - Browser language detection                       │   │
│  └─────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
```

## Technology Stack

| Technology | Version | Purpose |
|------------|---------|---------|
| React | 19.2.0 | UI framework |
| TypeScript | 5.9.3 | Type safety |
| React Router DOM | 7.9.5 | Client-side routing |
| Bootstrap | 5.3.1 | CSS framework |
| React Bootstrap | 2.8.0 | Bootstrap components |
| Chart.js | 4.5.1 | Data visualization |
| i18next | 25.6.1 | Internationalization |
| React Icons | 5.5.0 | Icon library |
| ExcelJS | 4.4.0 | Excel export |

## Entry Point (`src/index.tsx`)

The application entry point renders the root component:

```typescript
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';
import './i18n';

const root = ReactDOM.createRoot(document.getElementById('root')!);
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
```

## Root Component (`src/App.tsx`)

The root component sets up Context Providers, Routing, Session Authentication, and License Enforcement.

```typescript
const App: React.FC = () => {
  return (
    <AppProvider>
      <LicenseContextProvider>
        <AppRouter />
      </LicenseContextProvider>
    </AppProvider>
  );
};
```

`AppRouter` handles dynamic authentication and strict routing:
1. Validates Session via Electron IPC.
2. Serves Login, Lockout, and Activation Views when blocked.
3. Wraps Main App Content inside `<LicenseGuard>` to secure components.

### Routing

Uses `HashRouter` instead of `BrowserRouter` for Electron compatibility:

| Route | Page | Description |
|-------|------|-------------|
| `/` | Redirect | Redirects to `/inventory` |
| `/inventory` | Products | Consolidated product and inventory management tab |
| `/brokers` | Brokers | Supplier management |
| `/broker-transactions` | BrokerTransactions | Purchase transactions |
| `/broker-leisures` | BrokerLeisures | Supplier payments |
| `/customers` | Customers | Customer management |
| `/customer-transactions` | CustomerTransactions | Sales transactions |
| `/customer-leisures` | CustomerLeisures | Customer payments |
| `/settings` | Settings | Application settings |
| `/whatsapp-manager` | WhatsAppManager | Dynamic WhatsApp template messaging system |
| `/licensing` | Licensing | Manage active licensing, view status |
| `/activate` | LicenseActivation | Hardware-bound License import view |
| `/dev-dashboard` | DevDashboard | Administrator / Developer utility control panel |

*(Developer dashboard pages like database-diagnostics, table-viewer, license-admin, and license-logs redirect locally to /dev-dashboard)*

## State Management

Centralized state management is split logically across modular contexts. 

### 1. Application Context (`src/context/AppContext.tsx`)

Manages the domain and physical data loaded from the backend mapping SQLite models.
Features enhanced data structures, particularly a unified representation of `products`, `manufacturerStocks`, and `stockHistory` combined in a single nested state model for simplified updates. Additional features include `whatsappPresets` for template generation.

### 2. License Context (`src/context/LicenseContext.tsx`)

Handles synchronization with `electronAPI.licensingEvents`. Provides live hooks to the Application State regarding Hard/Soft Locks without forcing database polling. Monitors:
- Expiry and Activation Status
- Maintenance and Grace Window counters
- Device Fingerprint mismatches
- Cryptographic Tamper Events globally via `clockTamperDetected`
- Developer Bypass access paths

### IPC Integration

All data operations go through IPC to the Electron backend:

```typescript
// Initial Backend Parallel Hydration (AppContext)
useEffect(() => {
  const loadDataFromDatabase = async () => {
    // ...
    const [productsData, brokersData, /* ... */ whatsappPresetsData] = await Promise.all([
      window.electronAPI.invoke('db:products:getAll'),
      // ...
      window.electronAPI.invoke('db:whatsappPresets:getAll'),
    ]);
    // transforms and integrates Data
  };
}, []);
```

## Component Structure

### Shared Components (`src/components/`)

| Component | File | Purpose |
|-----------|------|---------|
| Sidebar | `Sidebar.tsx` | Navigation sidebar |
| SearchBar | `SearchBar.tsx` | Generic search input |
| SearchableSelect | `SearchableSelect.tsx` | Searchable dropdown |
| CustomerInvoice | `CustomerInvoice.tsx` | Customer invoice generation |
| SupplierInvoice | `SupplierInvoice.tsx` | Supplier invoice generation |
| LanguageSwitcher | `LanguageSwitcher.tsx` | Language selection |
| DeletionWarningModal | `DeletionWarningModal.tsx` | Deletion confirmation |
| LicenseGuard | `LicenseGuard.tsx` | Functional Wrapper verifying route and interaction access against LicenseState |
| LicenseBanner | `LicenseBanner.tsx` | Fixed alert banner warning of upcoming expiry or grace limits |
| ChangePasswordModal | `ChangePasswordModal.tsx` | Self-serve portal for User Password alterations |
| PasswordResetModal | `PasswordResetModal.tsx` | Offline Challenge/Response UI |

### Pages (`src/pages/`)

| Page | File | Description |
|------|------|-------------|
| Products | `Products.tsx` | Unified Inventory tab (Active/Archived Inline toggling) |
| WhatsAppManager | `WhatsAppManager.tsx` | Integrated Messaging center and dynamic template manager |
| Settings | `Settings.tsx` | Application settings |
| DevDashboard | `DevDashboard.tsx` | Secret-gated developer actions |
| Licensing | `Licensing.tsx` | Public License status summary and offline refresh |
| LicenseActivation | `LicenseActivation.tsx` | Public activation file consumption |
| Customers / Brokers / Transactions / Leisures | Various... | Relational tables covering users and sales logic |

## Styling

### Layout

```typescript
// Main content area - dynamic based on LicenseGuard presence
<div style={{
  marginLeft: '250px',    // Sidebar limit
  padding: '0',
  backgroundColor: '#ffffff',
  minHeight: '100vh',
  width: 'calc(100% - 250px)',
  overflowY: 'auto'
}}>
  <LicenseBanner /> // Placed here to span the entire top content bar
  <div style={{ padding: '20px', flex: 1 }}>
    {/* Page content */}
  </div>
</div>
```

## Related Documentation

- [Components](Components/components.md) — Shared component details
- [Pages](Pages/pages.md) — Page-specific documentation
- [Contexts](Context/app-context.md) — Context structure details
- [Internationalization](Internationalization/i18n.md) — i18n configuration
- [Backend IPC](../Backend/IPC/ipc-communication.md) — Frontend-backend communication