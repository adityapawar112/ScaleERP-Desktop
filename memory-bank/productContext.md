# Product Context: ScaleERP Inventory Management System

## Why This Project Exists

### Problem Statement
Small to medium businesses dealing with physical inventory (feed products, agricultural supplies, etc.) need a reliable, offline-capable system to track products, manage supplier/customer relationships, process transactions, and maintain financial records. Existing solutions are often either too complex (enterprise ERP systems) or too simple (spreadsheets), leaving a gap for a purpose-built desktop application.

### Target Users
- **Business Owners**: Need quick access to inventory levels, financial summaries, and transaction history
- **Inventory Managers**: Need to track stock across multiple manufacturers and process purchases/sales
- **Accountants**: Need accurate financial records, payment tracking, and exportable reports

## Problems It Solves

### 1. Inventory Visibility
- **Without ScaleERP**: Manual counting, spreadsheet tracking, prone to errors
- **With ScaleERP**: Real-time stock levels by product and manufacturer, automatic updates on transactions

### 2. Transaction Accuracy
- **Without ScaleERP**: Manual invoice creation, risk of stock discrepancies
- **With ScaleERP**: Automatic stock updates, sequential invoice numbering, audit trail

### 3. Financial Tracking
- **Without ScaleERP**: Separate payment records, manual balance calculations
- **With ScaleERP**: Integrated leisure records, automatic balance updates, payment method tracking

### 4. Data Export & Reporting
- **Without ScaleERP**: Manual report creation in Excel, time-consuming
- **With ScaleERP**: One-click Excel exports with professional formatting

### 5. Multi-Language Support
- **Without ScaleERP**: English-only interfaces alienate non-English speakers
- **With ScaleERP**: Full English and Marathi localization

### 6. Professional Brand Identity
- **Without ScaleERP**: Plain, unformatted receipts that lack credibility and branding
- **With ScaleERP**: Visual customizer supporting custom logos, header banners, QR codes, accent colors, and multiple tailored layout templates (Standard A4, Modern Clean, Compact A5, Thermal POS)

## How It Should Work

### Core User Flows

#### 1. Daily Operations Flow
```
Start Day → Check Dashboard (KPIs) → Process Purchases → Process Sales → Record Payments → End Day
```

#### 2. License Activation Flow (First Run)
```
Launch App → Detect Missing License → Show Activation Screen → 
Import RSA-Signed Blob → Hardware ID Binding → Success → Redirect to Login
```

#### 3. Purchase Transaction Flow
```
Select Supplier → Add Products (with manufacturer) → Enter Quantities/Rates → 
Calculate Total → Record Payment Method → Save → Stock Auto-Increased → 
Leisure "receivable" Created
```

#### 3. Sales Transaction Flow
```
Select Customer → Add Products (from available stock) → Enter Quantities/Prices → 
Calculate Total → Record Payment Method → Save → Stock Auto-Decreased → 
Leisure "receivable" Created
```

#### 4. Payment Recording Flow
```
View Pending Payments → Select Transaction → Record Payment Amount → 
Choose Payment Method (Cash/UPI) → Save → Balance Updated
```

### Data Model Relationships

```
Products ←→ Product Manufacturers ←→ Stock History
    ↓              ↓
Broker Transaction Products ←→ Broker Transactions ←→ Brokers
                                    ↓
                              Broker Leisures (payments)

Customer Transaction Products ←→ Customer Transactions ←→ Customers
                                        ↓
                                  Customer Leisures (payments)
```

## User Experience Goals

### Simplicity
- Clean, intuitive interface with clear navigation
- Minimal clicks to complete common operations
- Consistent UI patterns across all pages

### Reliability
- Data integrity through foreign key constraints
- Automatic rollback on transaction deletion
- Deletion impact analysis before destructive operations

### Performance
- Fast page loads with optimized queries
- Indexed database for quick searches
- FTS5 full-text search for finding records

### Accessibility
- Keyboard navigation support
- Screen reader compatible
- WCAG-compliant color contrast
- Responsive design for different screen sizes

### Trust & Transparency
- Complete audit trail for all operations
- Clear error messages with recovery guidance
- Deletion warnings with impact analysis
- Confirmation dialogs for critical actions

## Key Features by Priority

### Must Have (Core)
1. Product CRUD with manufacturer stock tracking
2. Broker and customer management
3. Purchase and sales transaction processing
4. Payment tracking with leisure records
5. Stock history audit trail
6. Excel export and professional printing
7. Offline licensing and brute-force protection
8. Database backup system (Manual/Auto)

### Should Have (Important)
1. Multi-language support (English/Marathi)
2. Dashboard with KPIs and business vitality charts
3. WhatsApp messaging and presets
4. Full-text search across all entities
5. Developer diagnostics and seeding tools
6. Archiving system for historical data

### Nice to Have (Enhancement)
1. PDF invoice generation
2. Advanced analytics and reporting
3. Custom report builder
4. Data import from CSV/Excel
5. Automated email notifications

## Success Metrics

### Usability
- Time to complete common operations (target: < 30 seconds)
- Error rate in data entry (target: < 1%)
- User satisfaction score (target: > 4/5)

### Reliability
- Data consistency (target: 100% referential integrity)
- Uptime (target: 99.9% for local operations)
- Backup success rate (target: 100%)

### Performance
- Page load time (target: < 2 seconds)
- Search response time (target: < 500ms)
- Excel export time (target: < 5 seconds for 1000 records)
