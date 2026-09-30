# Database Documentation

ScaleERP uses SQLite with Write-Ahead Logging (WAL) mode for high-performance, reliable local data storage.

## Overview

| Aspect | Details |
|--------|---------|
| **Engine** | SQLite 3.35+ |
| **Mode** | WAL (Write-Ahead Logging) |
| **Location** | User data directory (platform-specific) |
| **Backup** | Automated via Backup Scheduler |

## Database Manager (`electron/database/manager.ts`)

The `DatabaseManager` class is the single source of truth for database connections and lifecycle management.

### Key Responsibilities

1. **Connection Management** — Single connection instance across the application
2. **Initialization** — Schema creation and migrations on first run
3. **Lifecycle** — Graceful shutdown and connection cleanup
4. **Health Checks** — Connection status monitoring

### Initialization Flow

```
┌─────────────────────────────────────────────────────────┐
│                  DatabaseManager.initialize()            │
└───────────────────────────┬─────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────┐
│              Determine Database Path                     │
│  - Development: ./data/scaleerp.db                     │
│  - Production: userData/scaleerp.db                    │
└───────────────────────────┬─────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────┐
│              Create SQLite Connection                    │
│  - Enable WAL mode                                      │
│  - Enable foreign keys                                  │
│  - Configure pragmas for performance                    │
└───────────────────────────┬─────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────┐
│              Run Schema Migrations                       │
│  - Read schema.sql                                      │
│  - Execute CREATE TABLE statements                      │
│  - Create indexes and triggers                          │
└───────────────────────────┬─────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────┐
│              Database Ready for Operations               │
└─────────────────────────────────────────────────────────┘
```

### Performance Optimizations

The database is configured with several performance optimizations:

```sql
PRAGMA journal_mode = WAL;          -- Write-Ahead Logging for concurrency
PRAGMA synchronous = NORMAL;        -- Balance safety and performance (Best for WAL)
PRAGMA cache_size = 10000;          -- 10MB cache for frequently accessed data
PRAGMA temp_store = MEMORY;         -- Store temp tables in memory
PRAGMA mmap_size = 268435456;       -- 256MB memory-mapped I/O for faster page reads
```

### Business Logic & Calculations
Core system calculations for account balances and inventory reversals are documented in [Calculations Documentation](calculations.md).

### WAL Mode Benefits

| Benefit | Description |
|---------|-------------|
| **Concurrent Reads** | Readers don't block writers |
| **Better Write Performance** | Sequential writes instead of random |
| **Crash Recovery** | Automatic recovery from WAL files |
| **Reduced Lock Contention** | Multiple readers can operate simultaneously |

## Schema Overview

See [Schema Documentation](schema.md) for complete schema details.

### Core Tables

| Table | Purpose | Key Fields |
|-------|---------|------------|
| `products` | Inventory items | id, name, price, stock_quantity |
| `product_manufacturers` | Multi-manufacturer stock | product_id, manufacturer_id, quantity |
| `brokers` | Suppliers | id, name, contact, total_pending |
| `customers` | Buyers | id, name, contact, total_pending |
| `broker_transactions` | Purchase records | id, broker_id, total_amount |
| `customer_transactions` | Sales records | id, customer_id, total_amount |
| `broker_leisures` | Supplier payments | id, broker_id, amount, type |
| `customer_leisures` | Customer payments | id, customer_id, amount, type |

### Supporting Tables

| Table | Purpose |
|-------|---------|
| `stock_history` | Audit trail for stock changes |
| `business_settings` | Application configuration |
| `backup_settings` | Backup scheduler configuration |
| `backup_history` | Backup operation log |
| `whatsapp_presets` | Message templates |
| `licenses` | Issued license metadata |
| `users` | Admin user accounts |
| `license_events` | Append-only audit trail for licenses |
| `license_heartbeats` | Security heartbeats for clock tampers |
| `license_customers` | Software licensee data |
| `license_policies` | License generation templates |
| `password_reset_tokens` | Credential recovery tokens |
| `used_reset_nonces` | Vendor-signed reset nonces |
| `clock_override_tokens` | Tamper lock recovery tokens |

## Database Operations

See [Operations Documentation](operations.md) for CRUD operation details.

### Available Operations

```typescript
// Entity operations
dbUtils.products      // Product CRUD
dbUtils.brokers       // Broker CRUD
dbUtils.customers     // Customer CRUD

// Transaction operations
dbUtils.brokerTransactions    // Purchase transactions
dbUtils.customerTransactions  // Sales transactions

// Leisure operations
dbUtils.brokerLeisures    // Supplier payments
dbUtils.customerLeisures  // Customer payments

// Utility operations
dbUtils.getDatabaseStats  // Database statistics
```

## Connection Lifecycle

### Startup

1. Application starts
2. `DatabaseManager.initialize()` called
3. Connection established
4. Schema applied
5. Operations available

### Runtime

1. Single connection shared across all operations
2. WAL mode allows concurrent reads
3. Transactions ensure data consistency
4. Foreign keys enforce referential integrity

### Shutdown

1. Application closing
2. `DatabaseManager.close()` called
3. Pending transactions committed
4. Connection closed gracefully
5. WAL checkpoint performed

### Reset & Recovery
If the database needs to be hard reset, the system attempts to safely delete `inventory.db`.
- Implements a retry-loop for `EBUSY` file locks (retries 3 times, with 500ms delay).
- After deletion, recursively re-invokes `initialize()`.

## Error Handling

### Connection Errors

```typescript
try {
  await dbManager.initialize();
} catch (error) {
  console.error('Database initialization failed:', error);
  // Application continues with limited functionality
}
```

### Query Errors

All database operations return typed results and throw descriptive errors:

```typescript
try {
  const products = await dbUtils.products.getAll();
} catch (error) {
  // Error includes query context and SQL error details
  console.error('Failed to fetch products:', error);
}
```

## Data Integrity

### Foreign Keys

Foreign key constraints are enforced:

```sql
PRAGMA foreign_keys = ON;
```

This ensures:
- Deleting a product cascades to related records
- Transaction products reference valid transactions
- Leisure records reference valid brokers/customers

### Schema Validation
During boot or diagnostics, `validateSchema()` explicitly verifies database structural integrity:
1.  **Required Tables**: Ensures `products`, `brokers`, `customers`, `broker_transactions`, `customer_transactions`, `broker_leisures`, `customer_leisures`, `stock_history`, and `product_manufacturers` exist.
2.  **Required Columns**: Strictly verifies that critical transaction columns (like `previous_balance`) have not been altered or dropped in migrations.

### Transactions

Multi-step operations use database transactions:

```typescript
await runTransaction(async () => {
  // All operations succeed or all fail
  await insertTransaction(data);
  await updateStock(productId, quantity);
  await createLeisure(leisureData);
});
```

## Backup & Recovery

See [Backup Scheduler Documentation](../Services/backup-scheduler.md) for details.

### Backup Validation Process
When creating or restoring a backup, the DatabaseManager runs rigorous integrity checks:
1. **ZIP Extraction**: Unpacks the `.zip` containing SQL dumps and metadata.
2. **Checksum Verification**: Validates the SHA-checksum against the embedded JSON metadata.
3. **Database Constraints Check**: Invokes `#PRAGMA integrity_check` on the reconstructed SQLite instance before exposing it to the UI.

### Backup Types

| Type | Trigger | Purpose |
|------|---------|---------|
| **Auto** | Scheduled | Regular protection |
| **Manual** | User action | On-demand backup |
| **Pre-operation** | Before major changes | Safety net |
| **Pre-restore** | Before restore | Rollback capability |

## Performance Monitoring

### Database Statistics

```typescript
const stats = await dbUtils.getDatabaseStats();
// Returns:
// - Table row counts
// - Database size
// - WAL file size
// - Last vacuum time
```

### Query Optimization

Indexes are created for common query patterns:

```sql
-- Product lookups
CREATE INDEX idx_products_name ON products(name);

-- Transaction queries
CREATE INDEX idx_broker_transactions_broker_date 
  ON broker_transactions(broker_id, date DESC);

-- Stock history
CREATE INDEX idx_stock_history_product_date 
  ON stock_history(product_id, date DESC);
```

## Full-Text Search

FTS5 virtual tables enable fast text search:

```sql
CREATE VIRTUAL TABLE products_fts USING fts5(
  name, description,
  content=products,
  content_rowid=rowid
);
```

Triggers keep FTS tables synchronized with source tables.

## Related Documentation

- [Schema Design](schema.md) — Complete table definitions
- [Database Operations](operations.md) — CRUD operations & API
- [Business Logic & Calculations](calculations.md) — Formulas & stock protocols
- [IPC Communication](../IPC/ipc-communication.md) — Frontend access
- [Backup Scheduler](../Services/backup-scheduler.md) — Automated backups