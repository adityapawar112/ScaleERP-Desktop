# Project Brief: ScaleERP Inventory Management System

## Project Identity
- **Name**: ScaleERP
- **Type**: Desktop Inventory Management Application
- **Platform**: Electron (cross-platform: Windows, macOS, Linux)
- **Repository**: https://github.com/adityapawar112/ScaleERP-Desktop.git

## Core Purpose
ScaleERP is a comprehensive inventory management desktop application designed for small to medium businesses. It provides end-to-end management of products, suppliers (brokers), customers, transactions, and financial tracking with a focus on simplicity and reliability.

## Core Requirements

### Functional Requirements
1. **Product & Inventory Management**
   - Track products with multi-manufacturer stock levels
   - Full CRUD operations for products and manufacturers
   - Stock history audit trail with transaction-level tracking
   - Real-time stock updates on purchase/sale transactions

2. **Supplier (Broker) Management**
   - Supplier database with contact information
   - Purchase transaction recording with line-item details
   - Payment tracking with "purchase"/"payable" states (brokers) and "receivable"/"sale" states (customers)
   - Financial overview (total pending/paid per supplier)

3. **Customer Management**
   - Customer database with contact information
   - Sales transaction recording with payment tracking
   - Payment tracking with leisure records
   - Balance monitoring per customer

4. **Transaction Processing**
   - Purchase transactions (stock increases)
   - Sales transactions (stock decreases)
   - Automatic sequential invoice numbering with year-based prefixes
   - Support for Cash and UPI payment methods

5. **Financial Management**
   - Leisure records for payment state tracking
   - Automatic balance calculations
   - Cash vs UPI payment method tracking
   - Financial reports and Excel exports

6. **Data Export & Reporting**
   - Professional Excel exports via ExcelJS
   - Transaction reports with line-item details
   - Financial reports with payment history
   - Automated filename generation with timestamps

7. **WhatsApp Manager**
   - Customer/Broker selection for targeted messaging
   - CRUD operations for message presets with dynamic placeholders
   - WhatsApp Web integration via pre-filled URLs

8. **Offline Licensing & Security**
   - RSA-2048 signed license blobs for offline activation
   - Multi-stage enforcement (Valid, Grace, Hard Lockout)
   - Clock tamper detection via heartbeat analysis
   - AES-256-GCM encrypted session persistence

9. **Advanced Invoice Customization Engine**
   - Multiple professional layout templates (Standard A4, Modern Clean, Compact A5, Thermal POS 80mm Roll)
   - Brand asset uploading (Company Logo, Header Banner, Payment QR Code) with client-side canvas optimization
   - Multi-copy printing with single-page dual stacking and scissor-cut separation
   - Dynamic accent color customization and runtime modal quick-switcher
   - Intelligent digital fallback formatting for automated WhatsApp sharing and PDF downloads

10. **Multi-Language Support**
   - English and Marathi localization
   - Automatic browser language detection
   - Persistent language preferences

### Non-Functional Requirements
1. **Performance**: SQLite with WAL mode, indexed queries, FTS5 search
2. **Reliability**: Foreign key constraints, transaction rollback, deletion impact analysis
3. **Security**: Secure IPC communication via Electron context bridge
4. **Usability**: Responsive Bootstrap 5 UI, keyboard navigation, accessibility
5. **Portability**: Cross-platform desktop application (Windows, macOS, Linux)

## Technology Stack

### Frontend
- React 19.2.0 with TypeScript
- Vite 8.0.3 build tool
- Bootstrap 5.3.1 + React Bootstrap 2.8.0
- React Router DOM 7.9.5 (HashRouter for Electron)
- Chart.js 4.5.1 for data visualization
- i18next 25.6.1 for internationalization

### Backend
- Electron 41.0.4 desktop runtime
- SQLite 5.1.7 with WAL mode
- ExcelJS 4.4.0 for Excel exports
- jsPDF 3.0.3 for PDF generation
- node-cron 4.2.1 for backup scheduling

80. ### Development
- TypeScript 5.9.3
- ESLint 9.39.4
- Electron Builder 26.0.12
- javascript-obfuscator 5.4.1

## Project Scope

### In Scope
- Desktop inventory management application
- Product, supplier, and customer management
- Purchase and sales transaction processing
- Payment tracking and financial management
- Excel export and reporting
- Advanced invoice customization engine and visual brand asset uploaders
- Multi-language support (English/Marathi)
- Database backup system (Manual & Scheduled)
- WhatsApp messaging presets and integration
- Offline licensing and hardware binding
- Developer diagnostics and data seeding tools
- Cross-platform distribution (Windows, macOS, Linux)

### Out of Scope
- Cloud-based or web-only deployment
- Multi-user concurrent access
- Real-time collaboration features
- Mobile application
- Third-party API integrations (accounting software, etc.)

## Success Criteria
1. All CRUD operations function correctly with proper validation
2. Transactions accurately update stock levels and financial balances
3. Excel exports generate professional, accurate reports
4. Application runs reliably on Windows, macOS, and Linux
5. Multi-language support works seamlessly
6. Database maintains referential integrity and data consistency
7. No data loss through proper backup and rollback mechanisms

## Project Constraints
- Single-user desktop application
- SQLite database (no external database server)
- Local file system for data storage
- Electron security model for IPC communication
