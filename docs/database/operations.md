# Database Operations Documentation

Complete reference for all CRUD operations and utility functions available in the ScaleERP database layer. These are accessible via `window.electronAPI.database` in the renderer process.

## Overview

The database operations are organized into entity-specific modules, each providing type-safe CRUD operations, along with impact analysis utilities to ensure safe deletions.

## Entity Operations

### Products Operations

Provides CRUD operations and archiving for inventory items.

#### Available Functions

| Function | Description | Returns |
|----------|-------------|---------|
| `products.getAll()` | Fetch all products | `Product[]` |
| `products.getById(id)` | Fetch product by ID | `Product \| null` |
| `products.insert(data)` | Create new product | `DatabaseOperationResult` |
| `products.update(id, data)` | Update product details | `DatabaseOperationResult` |
| `products.delete(id)` | Delete product (requires impact analysis) | `DatabaseOperationResult` |
| `products.archive(id)` | Soft delete product and linked manufacturers| `DatabaseOperationResult` |
| `products.unarchive(id)` | Restore archived product | `DatabaseOperationResult` |
| `products.getArchived()` | Fetch archived products with their stocks | `Product[]` |

#### Usage Example

```typescript
// Fetch all products
const allProducts = await window.electronAPI.database.products.getAll();

// Create a new product
const result = await window.electronAPI.database.products.insert({
  id: 'prod_123',
  name: 'Premium Cattle Feed',
  description: 'High energy feed',
  price: 550,
  stock_quantity: 0
});
```

---

### Brokers Operations

Manages supplier information and tracks accumulated balances.

#### Available Functions

| Function | Description | Returns |
|----------|-------------|---------|
| `brokers.getAll()` | Fetch all brokers | `Broker[]` |
| `brokers.getById(id)` | Fetch broker by ID | `Broker \| null` |
| `brokers.insert(data)` | Create new broker | `DatabaseOperationResult` |
| `brokers.update(id, data)` | Update broker details | `DatabaseOperationResult` |
| `brokers.delete(id)` | Delete broker and all linked transactions | `DatabaseOperationResult` |

---

### Customers Operations

Manages buyer information and tracks their outstanding balances.

#### Available Functions

| Function | Description | Returns |
|----------|-------------|---------|
| `customers.getAll()` | Fetch all customers | `Customer[]` |
| `customers.getById(id)` | Fetch customer by ID | `Customer \| null` |
| `customers.insert(data)` | Create new customer | `DatabaseOperationResult` |
| `customers.update(id, data)` | Update customer | `DatabaseOperationResult` |
| `customers.delete(id)` | Delete customer and linked sales | `DatabaseOperationResult` |

---

### Broker Transactions Operations

Manages inventory purchases from suppliers.

#### Available Functions

| Function | Description | Returns |
|----------|-------------|---------|
| `brokerTransactions.getAll()` | Fetch all transactions | `BrokerTransaction[]` |
| `brokerTransactions.getById(id)` | Fetch transaction by ID | `BrokerTransaction \| null` |
| `brokerTransactions.insert(data)` | Create new purchase | `DatabaseOperationResult` |
| `brokerTransactions.update(id, data)` | Update transaction notes | `DatabaseOperationResult` |
| `brokerTransactions.delete(id)` | Delete transaction | `DatabaseOperationResult` |

#### Transaction Creation Example
```typescript
await window.electronAPI.database.brokerTransactions.insert({
  id: 'tx_123',
  broker_id: 'broker_1',
  date: '2026-04-19',
  total_amount: 5000,
  payment_method: 'cash',
  products: [
    { product_id: 'prod_1', manufacturer_id: 'mfr_1', units: 10, rate: 500 }
  ]
});
```

---

### Customer Transactions Operations

Manages inventory sales to customers.

#### Available Functions

| Function | Description | Returns |
|----------|-------------|---------|
| `customerTransactions.getAll()` | Fetch all sales | `CustomerTransaction[]` |
| `customerTransactions.getById(id)` | Fetch sale by ID | `CustomerTransaction \| null` |
| `customerTransactions.insert(data)` | Create new sale | `DatabaseOperationResult` |
| `customerTransactions.update(id, data)` | Update transaction notes | `DatabaseOperationResult` |
| `customerTransactions.delete(id)` | Delete transaction | `DatabaseOperationResult` |

---

### Leisure (Payment) Operations

Manages payments flowing to brokers and from customers.

#### Broker Leisures
| Function | Description | Returns |
|----------|-------------|---------|
| `brokerLeisures.getAll()` | Fetch all supplier payments | `Leisure[]` |
| `brokerLeisures.insert(data)` | Record payment to supplier | `DatabaseOperationResult` |
| `brokerLeisures.delete(id)` | Delete payment | `DatabaseOperationResult` |

#### Customer Leisures
| Function | Description | Returns |
|----------|-------------|---------|
| `customerLeisures.getAll()` | Fetch all customer receipts | `CustomerLeisure[]` |
| `customerLeisures.insert(data)` | Record receipt from customer | `DatabaseOperationResult` |
| `customerLeisures.delete(id)` | Delete payment | `DatabaseOperationResult` |

---

### WhatsApp Presets Operations

Manages message templates for WhatsApp integration.

| Function | Description | Returns |
|----------|-------------|---------|
| `whatsappPresets.getAll()` | Fetch all presets | `WhatsAppPreset[]` |
| `whatsappPresets.getById(id)` | Fetch preset by ID | `WhatsAppPreset \| null` |
| `whatsappPresets.insert(data)` | Create new preset | `DatabaseOperationResult` |
| `whatsappPresets.update(id, data)` | Update preset details | `DatabaseOperationResult` |
| `whatsappPresets.delete(id)` | Delete preset | `DatabaseOperationResult` |

---

### Backup Operations

Manages automated and manual database backups and their configurations.

#### Available Functions

| Function | Description | Returns |
|----------|-------------|---------|
| `backup.create()` | Create a manual backup immediately | `any` |
| `backup.list(directory?)` | List all available backup files | `any[]` |
| `backup.validate(path)` | Validate the integrity of a backup zip | `{ valid: boolean; details: any }` |
| `backup.restore(path)` | Safely restore the DB from a specific backup file | `{ success: boolean; errors: string[] }` |
| `backup.getSettings()` | Fetch the backup scheduler configuration | `any` |
| `backup.updateSettings(settings)` | Update the scheduler configuration | `any` |

---

## Utility & Impact Analysis Operations

Because deletions can cascade across the financial and inventory history, the system provides several analysis pipelines.

### Deletion Impact Analysis
These methods return an assessment showing the financial and structural impact of deleting the entity.

```typescript
// Impact of deleting a purchase transaction
const txImpact = await window.electronAPI.database.analyzeBrokerTransactionDeletion(txId);
// Returns: { affectedLeisures, affectedStockHistory, financialImpact, orphanedRecords, willDeleteTransaction, willDeleteLeisure }

// Impact of deleting a product
const prodImpact = await window.electronAPI.database.analyzeProductDeletion(productId);
// Returns: { affectedTransactions, affectedStockHistory, totalFinancialImpact, canDelete }

// Impact of deleting a manufacturer
const mfrImpact = await window.electronAPI.database.analyzeManufacturerDeletion(manufacturerId);

// Impact of deleting entities
const brokerImpact = await window.electronAPI.database.analyzeBrokerDeletion(brokerId);
const customerImpact = await window.electronAPI.database.analyzeCustomerDeletion(customerId);

// Impact of deleting leisures
const brokerLeisureImpact = await window.electronAPI.database.analyzeBrokerLeisureDeletion(leisureId);
const customerLeisureImpact = await window.electronAPI.database.analyzeCustomerLeisureDeletion(leisureId);
```

### Financial Aggregations

```typescript
// Recompute and persist account balances
await window.electronAPI.database.updateBrokerTotals(brokerId);
await window.electronAPI.database.updateCustomerTotals(customerId);

// High-level financial analytics
const dailySales = await window.electronAPI.database.getDailySalesTotal('2026-04-19');
const monthlySales = await window.electronAPI.database.getMonthlySalesTotal(2026, 4);
```

### Stock Reversal Operations

These are automatically invoked behind the scenes when a transaction is deleted to properly reconstruct the stock quantity, but are documented here for completeness.

```typescript
// Undo the stock addition of a purchase
await window.electronAPI.database.reverseBrokerTransactionStock(transactionId);

// Undo the stock reduction of a sale
await window.electronAPI.database.reverseCustomerTransactionStock(transactionId);
```

### Identification and Tracking

```typescript
// Auto-increment invoices
const nextBrokerInvoice = await window.electronAPI.database.generateBrokerInvoiceNumber();
const nextCustomerInvoice = await window.electronAPI.database.generateCustomerInvoiceNumber();

// Transaction execution wrapper
await window.electronAPI.database.runTransaction(async () => {
    // Operations inside this block are covered by SQL BEGIN ... COMMIT
});
```

---

## Error Handling

### DatabaseOperationResult

All CRUD mutations explicitly return a structured state:

```typescript
interface DatabaseOperationResult {
  success: boolean;
  id?: string;
  changes?: number;
  error?: string;
}
```

### Error Handling Pattern

```typescript
try {
  const result = await window.electronAPI.database.products.insert(data);
  
  if (result.success) {
    console.log('Successfully created:', result.id);
  } else {
    // Handled failure (e.g. constraint violation)
    console.error('Failed:', result.error);
  }
} catch (error) {
  // Unhandled system error, likely terminating the process flow
  console.error('Terminal Database error:', error);
}
```

## Related Documentation

- [Database Schema](schema.md) — Underlying table definitions
- [Business Logic & Calculations](calculations.md) — Detail on financial totals and bounds
- [Database Overview](database.md) — Configuration and system architecture
- [IPC Communication](../IPC/ipc-communication.md) — Implementation details of the context bridge