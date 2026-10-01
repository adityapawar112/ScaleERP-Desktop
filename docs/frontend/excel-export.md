# Excel Export Utility Documentation

The Excel export utility provides professional Excel file generation for various data types in the ScaleERP application.

## Overview

| Aspect | Details |
|--------|---------|
| **Location** | `src/utils/excelExport.ts` |
| **Library** | ExcelJS 4.4.0 |
| **Purpose** | Generate professional Excel reports |
| **Output Format** | XLSX (Excel 2007+) |

## Available Functions

### Export Broker Transactions

```typescript
export const exportBrokerTransactionsToExcel = async (
  transactions: BrokerTransactionData[],
  products: Product[],
  filename?: string
): Promise<void>
```

**Parameters:**
- `transactions` — Array of broker transaction data
- `products` — Array of products for lookup
- `filename` — Optional custom filename (defaults to `Broker_Transactions_YYYY-MM-DD.xlsx`)

**Output Columns:**
| Column | Description |
|--------|-------------|
| Transaction ID | Unique transaction identifier |
| Invoice No | Invoice number (or N/A) |
| Date | Transaction date |
| Time | Transaction time |
| Broker | Broker name |
| Product | Product name |
| Manufacturer | Manufacturer name |
| Units | Quantity purchased |
| Unit Type | 'tonnes' or 'units' |
| Rate | Price per unit |
| Line Total | Line item total |
| Previous Balance | Balance before transaction |
| Transaction Total | Total transaction amount |

**Usage Example:**
```typescript
import { exportBrokerTransactionsToExcel } from './utils/excelExport';

await exportBrokerTransactionsToExcel(transactions, products, 'My_Custom_Name.xlsx');
```

---

### Export Customer Transactions

```typescript
export const exportCustomerTransactionsToExcel = async (
  transactions: CustomerTransactionData[],
  products: Product[],
  filename?: string
): Promise<void>
```

**Parameters:**
- `transactions` — Array of customer transaction data
- `products` — Array of products for lookup
- `filename` — Optional custom filename (defaults to `Customer_Sales_YYYY-MM-DD.xlsx`)

**Output Columns:**
| Column | Description |
|--------|-------------|
| Transaction ID | Unique transaction identifier |
| Invoice No | Invoice number (or N/A) |
| Date | Transaction date |
| Time | Transaction time |
| Customer | Customer name (or 'Unknown Customer') |
| Product | Product name |
| Manufacturer | Manufacturer name |
| Quantity | Quantity sold |
| Unit Type | 'tonnes' or 'units' |
| Price | Selling price per unit |
| Labour | Labour charges |
| Line Total | Line item total |
| Payment Method | 'UPI' or 'CASH' |
| Transaction Total | Total transaction amount |

**Usage Example:**
```typescript
import { exportCustomerTransactionsToExcel } from './utils/excelExport';

await exportCustomerTransactionsToExcel(transactions, products, 'Monthly_Sales.xlsx');
```

---

### Export Leisure Records

```typescript
export const exportLeisureRecordsToExcel = async (
  leisureRecords: LeisureData[],
  filename?: string
): Promise<void>
```

**Parameters:**
- `leisureRecords` — Array of leisure (payment) records
- `filename` — Optional custom filename (defaults to `Leisure_Records_YYYY-MM-DD.xlsx`)

**Output Columns:**
| Column | Description |
|--------|-------------|
| Entity | Broker or customer name |
| Type | Purchase/Payable (broker) or Receivable/Sale (customer) |
| Amount | Payment amount |
| Date | Payment date |
| Time | Payment time |
| Notes | Payment notes |

**Usage Example:**
```typescript
import { exportLeisureRecordsToExcel } from './utils/excelExport';

await exportLeisureRecordsToExcel(leisureRecords, 'Payments_April.xlsx');
```

---

## Data Types

### BrokerTransactionData

```typescript
interface BrokerTransactionData {
  id: string;
  brokerId: string;
  brokerName: string;
  invoiceNumber?: string;
  date: string;
  time: string;
  products: Array<{
    productId: string;
    manufacturerId: string;
    units: number;
    unitType: 'tonnes' | 'units';
    rate: number;
    total: number;
  }>;
  previousBalance: number;
  totalAmount: number;
}
```

### CustomerTransactionData

```typescript
interface CustomerTransactionData {
  id: string;
  invoiceNumber?: string;
  customerName?: string;
  date: string;
  time: string;
  products: Array<{
    productId: string;
    manufacturerId: string;
    quantity: number;
    unitType: 'tonnes' | 'units';
    price: number;
    labour: number;
    total: number;
  }>;
  totalAmount: number;
  paymentMethod: 'UPI' | 'cash';
}
```

### LeisureData

```typescript
interface LeisureData {
  id: string;
  entityId: string; // brokerId or customerId
  entityName: string; // brokerName or customerName
  entityType: 'broker' | 'customer';
  pendingAmount: number;
  paidAmount: number;
  date: string;
  time: string;
  notes: string;
}
```

### Product

```typescript
interface Product {
  id: string;
  name: string;
  manufacturerStocks: {
    manufacturerId: string;
    manufacturerName: string;
    quantity: number;
  }[];
}
```

---

## Utility Functions

### Get Current Date String

```typescript
export const getCurrentDateString = (): string
```

Returns the current date in `YYYY-MM-DD` format for use in filenames.

**Example:**
```typescript
const dateStr = getCurrentDateString();
// Returns: '2026-04-03'
```

### Download Excel File

```typescript
const downloadExcelFile = async (
  workbook: ExcelJS.Workbook,
  fileName: string
): Promise<void>
```

Internal function that handles the browser download of the generated Excel file.

**Process:**
1. Generate buffer from workbook
2. Create blob from buffer
3. Create download link
4. Trigger download
5. Clean up object URL

---

## Features

### Line-Item Format

All transaction exports use a **line-item format**, where each product in a transaction gets its own row. This provides:
- Detailed breakdown of each transaction
- Easy filtering and sorting in Excel
- Clear product-level analysis

### Automatic Formatting

- **Column widths** — Pre-configured for readability
- **Number formatting** — Two decimal places for currency
- **Date formatting** — Consistent YYYY-MM-DD format
- **Automatic headers** — Professional header row

### Error Handling

All functions include error handling:
```typescript
try {
  await exportBrokerTransactionsToExcel(transactions, products);
} catch (error) {
  console.error('Export failed:', error);
  // Show user-friendly error message
}
```

---

## Usage in Pages

### Broker Transactions Page

```typescript
import { exportBrokerTransactionsToExcel } from './utils/excelExport';

const BrokerTransactions = () => {
  const handleExport = async () => {
    await exportBrokerTransactionsToExcel(
      brokerTransactions,
      products,
      `Broker_Transactions_${getCurrentDateString()}.xlsx`
    );
  };
  
  return <Button onClick={handleExport}>Export to Excel</Button>;
};
```

### Customer Transactions Page

```typescript
import { exportCustomerTransactionsToExcel } from './utils/excelExport';

const CustomerTransactions = () => {
  const handleExport = async () => {
    await exportCustomerTransactionsToExcel(
      customerTransactions,
      products,
      `Customer_Sales_${getCurrentDateString()}.xlsx`
    );
  };
  
  return <Button onClick={handleExport}>Export to Excel</Button>;
};
```

---

## Best Practices

### 1. Always Provide Products Data

The export functions need product data to resolve product names and manufacturer information:

```typescript
// ✅ Good
await exportBrokerTransactionsToExcel(transactions, products);

// ❌ Bad - Missing products
await exportBrokerTransactionsToExcel(transactions, []);
```

### 2. Use Descriptive Filenames

```typescript
// ✅ Good
await exportCustomerTransactionsToExcel(
  transactions, 
  products, 
  `Sales_Report_April_2026.xlsx`
);

// ❌ Bad
await exportCustomerTransactionsToExcel(transactions, products, 'data.xlsx');
```

### 3. Handle Errors Gracefully

```typescript
try {
  await exportLeisureRecordsToExcel(leisureRecords);
} catch (error) {
  // Show user-friendly error
  setError('Failed to export data. Please try again.');
}
```

---

## Performance Considerations

### Large Datasets

For large datasets (>1000 rows):
- Consider pagination or filtering before export
- Export may take a few seconds
- Show loading indicator during export

### Memory Usage

ExcelJS creates in-memory workbooks:
- Large exports may use significant memory
- Consider streaming for very large datasets (future enhancement)

---

## Related Documentation

- [Pages](../Pages/pages.md) — Page components using exports
- [Components](../Components/components.md) — UI components
- [Database Operations](../../Backend/Database/operations.md) — Data retrieval