# Business Logic & Calculations

This document centralizes all mathematical formulas and logical protocols used in the ScaleERP database layer.

## Account Balance Logic

ScaleERP uses a "Net Balance" approach for both Brokers (Suppliers) and Customers.

### Broker Net Balance
The `total_pending` for a broker is calculated based on their leisures:

| Field | Formula |
|-------|---------|
| **Total Purchase** | `SUM(amount)` where `type = 'purchase'` |
| **Total Payable** | `SUM(amount)` where `type = 'payable'` |
| **Total Pending** | `Total Purchase - Total Payable` |

> [!NOTE]
> `total_paid` in the `brokers` table strictly tracks the `Total Payable` amount.

### Customer Net Balance
The `total_pending` for a customer is calculated based on their leisures:

| Field | Formula |
|-------|---------|
| **Total Sale** | `SUM(amount)` where `type = 'sale'` |
| **Total Receivable** | `SUM(amount)` where `type = 'receivable'` |
| **Total Pending** | `Total Sale - Total Receivable` |

---

## Stock Reversal Protocol

When a transaction (Purchase or Sale) is deleted, the system executes a **Reverse Stock Operation** to maintain inventory integrity.

### Logic Flow
1.  **Audit Lookup**: Retrieve all `stock_history` records linked to the `transaction_id`.
2.  **Reverse Quantity Calculation**:
    *   **Broker Transaction (IN)**: `reverseQuantity = -originalQuantity` (Undo stock addition).
    *   **Customer Transaction (OUT)**: `reverseQuantity = originalQuantity` (Undo stock subtraction).
3.  **Global Update**: `products.stock_quantity = stock_quantity + reverseQuantity`.
4.  **Manufacturer Update**: `product_manufacturers.quantity = quantity + reverseQuantity`.
5.  **Audit Cleanup**: Delete the original `stock_history` record to maintain a clean timeline.

---

## Deletion Impact Analysis

Before deleting critical entities, the system performs a financial and operational analysis via the `analyzeDeletion` API.

### Metrics Calculated
- **Financial Impact**: The total monetary value being removed from account history.
- **Affected Records**: Count of linked leisures and stock history entries that will be orphaned or deleted.
- **Dependency Check**: For products and manufacturers, the system checks if any existing transactions reference them. If references exist, the **Deletion is Blocked** (`canDelete = false`).

---

## Financial Aggregations

### Daily/Monthly Sales
Sales totals are derived directly from `customer_transactions` using the `total_amount` column:
- **Daily**: `SUM(total_amount)` filtered by exact `date`.
- **Monthly**: `SUM(total_amount)` filtered by `date BETWEEN startOfMonth AND endOfMonth`.

### Transaction Totals
For detailed transaction views, the system uses the `broker_transaction_summary` and `customer_transaction_summary` views which aggregate line items:
- **Product Count**: `COUNT(transaction_product_id)`.
- **Product List**: `GROUP_CONCAT(name || ' (qty)')`.
