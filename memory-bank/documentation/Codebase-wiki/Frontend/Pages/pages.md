# Pages Documentation

The ScaleERP application includes localized pages mapped by React Router functioning securely underneath the `LicenseGuard` structure.

## Page Overview

| Page | Route | File | Description |
|------|-------|------|-------------|
| Products | `/inventory` | `Products.tsx` | Consolidated Inventory management |
| Brokers | `/brokers` | `Brokers.tsx` | Supplier management |
| Broker Transactions | `/broker-transactions` | `BrokerTransactions.tsx` | Purchase transactions |
| Broker Leisures | `/broker-leisures` | `BrokerLeisures.tsx` | Supplier payments |
| Customers | `/customers` | `Customers.tsx` | Customer management |
| Customer Transactions | `/customer-transactions` | `CustomerTransactions.tsx` | Sales transactions |
| Customer Leisures | `/customer-leisures` | `CustomerLeisures.tsx` | Customer payments |
| Settings | `/settings` | `Settings.tsx` | Application settings |
| WhatsApp Manager | `/whatsapp-manager` | `WhatsAppManager.tsx` | WhatsApp integration |
| Licensing | `/licensing` | `Licensing.tsx` | Public License status dashboard |
| License Activation | `/activate` | `LicenseActivation.tsx` | Standalone lock-screen for new keys |
| Admin / Dev Utils | `/dev-dashboard` | Multiple | Root diagnostic tooling and configuration |

---

## Products Page (`Products.tsx`) `Consolidated Inventory Tab`

The unified Inventory tab resolves multiple prior components into a singular management interface, merging active stock observation, archived element handling, and history diagnostics without relying on multi-page navigation.

### Key Architectural Enhancements

- **Inline Editable Nodes:** Manufacturers and basic product strings can be dynamically edited inline without popping independent modals over top of the data hierarchy, enabling high-rate batch modifications.
- **Active / Archive Toggle View:** Instead of an isolated `/archive` route, users hit a physical toggle to observe soft-deleted records faded inside the same active table environment, revealing `Unarchive` controls directly beside previous deletion anchors.
- **Multi-layered Nested Trees:** A product is iterated through `map()` rendering individual `Col` block cards representing child manufacturers (a subset of `product_manufacturers`) displaying aggregated `quantity` per specific subset under the global `stockQuantity` tracker.

---

## WhatsApp Manager Page (`WhatsAppManager.tsx`)

The central messaging configuration application utilized for directly notifying suppliers and users regarding pending leisures, transaction details, or custom notifications without enforcing direct physical data inputs over mobile devices.

### Features

- Two-mode structural design handling both **Customers** and **Brokers** natively underneath specific `search` tables.
- Pagination implemented actively over both arrays (Contacts and Presets).
- **Dynamic Templating System**: Utilizes `whatsappPresets` state logic to embed bracketed string parsing (e.g. `{contactName}`, `{totalPending}`) automatically prior to API push.

### Key Implementation Flow

```typescript
// Replace placeholders in message securely before linking
let message = preset.message;
message = message.replace(/{contactName}/g, selectedContact.name);
message = message.replace(/{businessName}/g, businessSettings.businessName);
message = message.replace(/{totalPending}/g, selectedContact.totalPending.toFixed(2));

// Create WhatsApp URL API standard encoding
const whatsappUrl = `https://wa.me/${phoneNumber}?text=${encodeURIComponent(message)}`;
window.open(whatsappUrl, '_blank');
```

---

## Remaining Standard Operations

Functions such as `BrokerTransactions`, `CustomerTransactions`, `Leisures`, and `Settings` rely on shared standard components like SearchBars, dropdown paginations, and Form models mapping straight to their native CRUD implementations in `AppContext.tsx`.

## System Diagnostics and Hardware Constraints (Developer Areas)

Pages such as `DatabaseDiagnostics.tsx`, `TableViewer.tsx`, `LicenseAdmin.tsx`, and `LicenseLogs.tsx` are now functionally grouped via the central layout controller (`App.tsx`) to act exclusively under Developer Bypass routing, ensuring minimal impact to standard consumer visualization workflows while preserving extensive system oversight via `/dev-dashboard`.