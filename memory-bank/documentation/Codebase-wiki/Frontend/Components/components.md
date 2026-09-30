# Shared Components Documentation

The ScaleERP application includes modular, shared components that provide reusable UI functionality and central security enforcement across the interface.

## Component Overview

| Component | File | Purpose | Used In |
|-----------|------|---------|---------|
| Sidebar | `Sidebar.tsx` | Main navigation | Root App Router |
| SearchBar | `SearchBar.tsx` | Generic search input | Grids, WhatsAppManager |
| SearchableSelect | `SearchableSelect.tsx` | Searchable dropdown | Transaction forms |
| CustomerInvoice | `CustomerInvoice.tsx` | Customer invoice generation | CustomerTransactions |
| SupplierInvoice | `SupplierInvoice.tsx` | Supplier invoice generation | BrokerTransactions |
| LanguageSwitcher | `LanguageSwitcher.tsx` | Language selection | Admin Modals |
| DeletionWarningModal| `DeletionWarningModal.tsx` | Multi-impact deletion confirmation | Entity pages |
| LicenseGuard | `LicenseGuard.tsx` | Route & Interactive Hard/Soft Locking | Root Router / Sub-routes |
| LicenseBanner | `LicenseBanner.tsx` | Expiration / Grace UI Banner | Root App Content |
| ChangePasswordModal| `ChangePasswordModal.tsx`| Changing localized user password | Header Menu |
| PasswordResetModal | `PasswordResetModal.tsx`| Challenge/Response Offline Key | Login/Lockout Pages |

---

## LicenseGuard (`LicenseGuard.tsx`)

A critical Higher-Order visual component that encapsulates application functionality to enforce the underlying `LicenseContext`. 

### Features

- Determines access dynamically using internal mapping state: `valid`, `grace`, `expired`, `invalid`, `no-license`.
- Renders `LicenseActivation` seamlessly covering children if a valid license is voided or not found.
- Triggers loading/spinner block over active context during `refreshStatus` invocations.
- Enforces Developer Bypass (ignoring expiry or active lockout to expose dev-dashboard tools).

### Usage

```typescript
import LicenseGuard from './components/LicenseGuard';

return (
  <LicenseGuard onActivateLicense={handleActivateLicense}>
     {authView === 'authenticated' && currentUser && (
        <MainAppContent />
     )}
  </LicenseGuard>
);
```

---

## LicenseBanner (`LicenseBanner.tsx`)

An immersive banner component meant to rest beneath navigation headers across the application, alerting the user to License Grace limits or Maintenance issues non-destructively.

### Features
- Pulls `warningLevel` and `warningMessage` natively from `LicenseContext`.
- Contextually uses color mapping based on severity (Warning, Danger, Notice).
- Collapsible on non-essential views, but persistent upon full app reload.

---

## SearchBar (`SearchBar.tsx`)

A generic search input component with debounced search functionality.

### Props

```typescript
interface SearchBarProps {
  value?: string;
  onSearch?: (value: string) => void;
  onChange?: (e: React.ChangeEvent<HTMLInputElement>) => void;
  placeholder?: string;
}
```

### Features

- Debounce capability inherently optimized via local React state hook matching.
- Icon integrations rendering magnifying glass bounds.

---

## SearchableSelect (`SearchableSelect.tsx`)

A dropdown component with built-in search functionality targeting objects in bulk configurations.

### Props

```typescript
interface SearchableSelectProps {
  options: Array<{ value: string; label: string }>;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  isDisabled?: boolean;
}
```

---

## CustomerInvoice & SupplierInvoice

Generates professional, printable invoices utilizing generic structures and isolated business constraints. Maps line-item breakdowns against backend types via generic UI structures (`SupplierInvoice.tsx` & `CustomerInvoice.tsx`). Contains dynamic formatting capable of WhatsApp click-to-open parameter manipulation.

---

## DeletionWarningModal (`DeletionWarningModal.tsx`)

Confirmation modal for destructive delete operations, integrating seamlessly with backend dependency checks (Reverse Stock Deletions).

### Props

```typescript
interface DeletionWarningModalProps {
  show: boolean;
  onHide: () => void;
  onConfirm: () => void;
  entityType?: 'customer' | 'broker' | 'product' | 'transaction' | 'leisure' | 'preset' | string;
  entityName?: string;
  warningText?: string;
}
```

### Features

- Clear warning message.
- Contextual replacement of variables based on `entityType` referencing system impacts (e.g., "Deleting this transaction will reverse XYZ quantity from stock").

## Related Documentation

- [Frontend Overview](../frontend.md) — React architecture
- [Pages](../Pages/pages.md) — Page components
- [State Management](../Context/app-context.md) — Context usage
- [Internationalization](../Internationalization/i18n.md) — i18n integration