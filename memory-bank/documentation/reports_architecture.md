# Reports & Analysis Module - Architecture & Logic Guide

This document explains the architecture, business logic, and build patterns for the "Reports and Analysis" module. It is written to help AI assistants and developers replicate this robust, live-data reporting system in other software projects.

## 1. High-Level Architecture Overview

The reporting module is designed using a **three-tier architecture** with a strict separation of concerns:
1. **Database / Backend (Electron IPC):** Queries raw, normalized records (sales, inventory, ledgers) from the local SQLite database.
2. **Business Logic Layer (Data Generators):** Takes raw data arrays and transforms them into a standardized cross-report structure (headers, rows, totals). Supports cross-module aggregation for complex reports like the Day Book.
3. **Frontend Presentation (React):** Manages user inputs (dates, filters), triggers data fetching, and renders the standardized data on screen, to Excel, or via the **Isolated Print Bridge**.

---

## 2. The Frontend Presentation Layer (React)
*(Reference: `src/app/pages/ReportsPage.tsx`)*

The frontend is responsible for the user journey: Discovery -> Configuration -> Generation -> Display/Export.

### Key Components:
- **Report Dictionary:** A central array `availableReports` holds metadata for every report (`id`, `name`, `description`, `category`, `icon`). This array drives the UI dynamically.
- **Tabbed Interface & Search:** Reports are grouped by category (Master Data, Transactions, Inventory, Accounting) and filterable via a text search field.
- **Dynamic Configuration Modal:** When a user selects a report, a modal prompts for configuration, selectively showing fields based on the report `id`:
  - *Date Ranges:* From/To dates (skipped for Master Data and Outstanding reports).
  - *Dropdown Filters:* Category, Manufacturer, Broker, Customer (populated via live DB calls on component mount).
  - *Output Formats:* Screen, Excel, Print.

### Live Data Generation Flow:
1. User clicks "Generate".
2. A `switch` statement maps the `selectedReport` to the appropriate backend `window.ouromedsAPI` call(s).
3. The API returns raw JSON arrays (e.g., `sales.list({ dateFrom, dateTo })`).
4. The raw data and user filters are immediately passed to the specific **Data Generator Function**.
5. The generator returns a standardized `ReportData` object.
6. The UI consumes the `ReportData` object and renders it via the selected output method.

---

## 3. The API Bridge & Backend Layer
*(Reference: `electron/preload.ts` & Electron Main Process)*

The frontend never runs database queries directly. Instead, it uses an IPC (Inter-Process Communication) bridge.

### API Contract:
The `window.ouromedsAPI` context bridge exposes structured functional calls.
For reports, it relies on the core module APIs rather than dedicated "report endpoints". This maximizes reusability. 
- Example: `ouromedsAPI.sales.list(filters)`
- Example: `ouromedsAPI.inventory.expiring(90)`
- Example: `ouromedsAPI.ledger.outstandingReceivables()`

### Backend DB Logic:
The backend SQLite handlers execute `JOIN` queries. For instance, fetching sales will naturally join the `sales_invoices` table with `sale_items` to return nested objects or flattened views. The rule is: **The backend returns raw facts; the frontend transforms them into reports.**

---

## 4. The Business Logic layer (Data Transformation)
*(Reference: `src/app/utils/reportDataGenerators.ts`)*

This is the most critical pattern for replicating the system. Every report has a dedicated generator function that accepts raw data and returns a standardized `ReportData` interface.

### The Unified Interface:
Every report strictly adheres to this contract:
```typescript
export interface ReportData {
  title: string;
  dateRange: { from: string; to: string };
  headers: string[];      // Define table column headers
  rows: string[][];       // 2D primitive array for the table body
  totals: Array<{         // Bottom summary metrics
    label: string; 
    value: string;
  }>;
  summary: string;
}
```

### Generator Pattern Steps:
Inside functions like `generateSalesRegisterData()` or `generateStockSummaryData()`, follow this sequence:
1. **Secondary Filtering:** Filter the raw data array against configuration inputs (e.g., removing items that don't match the selected manufacturer).
2. **Row Mapping:** Map the filtered data into `string[]` arrays. Format numbers as currencies and dates as localized strings to ensure the visual output is completely decoupled from type casting.
3. **Aggregation / Totals:** Loop through the filtered data to run reducers (e.g., calculating `Total Subtotal`, `Total Tax`, `Net Sales`).
4. **Return Formatted Object:** Construct and return the `ReportData` payload.

**Example Aggregation snippet (Day Book):**
```typescript
const cashIn = customerTransactions.reduce((sum, t) => sum + (t.totalAmount || 0), 0);
const receipts = customerLeisures.filter(l => l.type === 'receipt').reduce((sum, l) => sum + (l.amount || 0), 0);
const netFlow = (cashIn + receipts) - (cashOut + payments);
```

### Complex Reports Pattern:
- **Day Book**: Aggregates four disparate data sources (Broker Transactions, Customer Transactions, Broker Leisures, Customer Leisures) to provide a unified financial snapshot.
- **Outstanding Payments**: Filters and summarizes current balances across all Brokers and Customers, ignoring zero-balance entities.

---

## 5. Output Management & Export Logic

Once data is in the `ReportData` format, rendering it is universal across all outputs:
- **On Screen:** A `<ReportViewer />` component iterates over `headers` for `<th>` and `rows` for `<td>`.
- **Isolated Print Bridge:** To ensure clean output that matches brand identity, an invisible iframe is used.
  - Generates an isolated HTML document with proprietary CSS.
  - Injects Business Settings (headers) and the `ReportData` structure.
  - Triggers print command on the Iframe, leaving the main app UI untouched.
- **Excel Export:** Utility functions take the 2D `rows` array and pipe it into `ExcelJS`, meaning you only write the export logic once for the entire application.

## How to Apply This to Future Software Projects:
1. Define the `ReportData` contract first.
2. Build an API that can return unfiltered or date-filtered raw datasets.
3. Write pure generator functions that take raw state in and output `ReportData`.
4. Build a UI that selects the API endpoint, routes standard output through the generator, and blindly renders the `ReportData`.
