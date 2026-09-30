# ScaleERP - Inventory Management System

A comprehensive desktop inventory management solution designed for small to medium businesses. Built with modern React technologies and Electron, featuring advanced analytics, multi-language support, and comprehensive reporting capabilities. Manage products, track transactions, monitor business performance, and export data seamlessly.

## Features

### 🏪 Core Inventory Management
- **Multi-Manufacturer Stock Tracking**: Track inventory by manufacturer with granular stock levels
- **Product CRUD Operations**: Complete create, read, update, delete operations for inventory items
- **Stock History Audit Trail**: Complete transaction history with manufacturer-level tracking
- **Real-time Stock Updates**: Automatic inventory adjustments on transactions
- **Stock Validation**: Business rules preventing negative inventory

### 🏢 Supplier & Customer Management
- **Broker Management**: Comprehensive supplier relationship management with financial tracking
- **Customer Relationship Management**: Customer database with balance monitoring
- **Contact Information**: Store and manage contact details for all business partners
- **Financial Overview**: Track total pending and paid amounts per entity
- **Duplicate Prevention**: Smart validation to prevent duplicate entries

### 💰 Transaction Processing
- **Purchase Transactions**: Record supplier purchases with automatic stock increases
- **Sales Transactions**: Process customer sales with automatic stock decreases
- **Invoice Generation**: Automatic sequential invoice numbering with year-based prefixes
- **Line Item Details**: Detailed transaction breakdowns with manufacturer tracking
- **Transaction History**: Complete audit trail of all business transactions

### 💳 Payment & Financial Management
- **Dual Payment Methods**: Support for Cash and UPI payment processing
- **Leisure Records**: Track "toBePaid" and "paid" states for all transactions
- **Balance Calculations**: Automatic calculation of outstanding balances
- **Financial Analytics**: Revenue tracking and cost management
- **Payment Reconciliation**: Monitor and reconcile payments across all entities

### 📊 Advanced Analytics & Reporting
- **Real-time KPIs**: Live business metrics and performance indicators
- **Interactive Data Visualization**: Charts for sales trends and product performance
- **Business Intelligence**: Profit margins, stock turnover, and cash flow analysis
- **Custom Reporting**: Flexible data export and analysis capabilities
- **Performance Monitoring**: Track business health and operational efficiency

### 📄 Professional Export System
- **Excel Export Engine**: Professional Excel reports using ExcelJS library
- **Transaction Reports**: Detailed line-item transaction exports
- **Financial Reports**: Payment history and balance reports
- **Automated File Management**: Date-stamped filenames and organized exports
- **Multi-format Support**: Excel and PDF document generation

### 🌐 Enterprise-Grade Features
- **Multi-Language Support**: Complete English and Marathi localization
- **Automatic Language Detection**: Browser-based language preference detection
- **Persistent Settings**: User preferences saved locally
- **Cultural Formatting**: Localized number and date formatting
- **Accessibility**: WCAG-compliant interface design

### 🛡️ Data Integrity & Security
- **Deletion Impact Analysis**: Prevent data corruption with safety warnings
- **Transaction Rollback**: Automatic reversal of stock changes
- **Foreign Key Constraints**: Database-level referential integrity
- **Audit Trails**: Complete history of all data modifications
- **Data Validation**: Comprehensive business rule enforcement

### 🎨 Modern Desktop User Experience
- **Native Desktop Application**: Built with Electron for cross-platform compatibility
- **Responsive Design**: Mobile-friendly interface using Bootstrap 5
- **Professional UI**: Clean, intuitive interface with React Bootstrap components
- **Type-Safe Development**: Full TypeScript implementation for reliability
- **Performance Optimized**: Efficient rendering and data management

### 🔧 Advanced Database Features
- **SQLite with WAL Mode**: High-performance database with write-ahead logging
- **Full-Text Search**: FTS5 virtual tables for advanced search capabilities
- **Database Views**: Pre-computed views for optimized queries
- **Comprehensive Indexing**: Performance-optimized database queries
- **Migration Framework**: Support for future database schema updates

### 📱 Cross-Platform Compatibility
- **Windows Support**: Native Windows application with installer
- **macOS Support**: Native macOS application with DMG packaging
- **Linux Support**: AppImage distribution for Linux systems
- **System Integration**: Native file dialogs and system notifications
- **Offline Operation**: Full functionality without internet connectivity

## Architecture Overview

### Application Architecture
This inventory management system follows a layered architecture pattern with clear separation of concerns:

- **Presentation Layer**: React-based frontend with TypeScript, Bootstrap 5, and responsive design
- **Business Logic Layer**: Electron main process handling IPC communication and state management
- **Data Layer**: SQLite database with comprehensive schema and operations
- **Infrastructure Layer**: Electron runtime and system integration

### Presentation Layer Architecture

#### React Application Structure
The frontend is built with React 19.2.0 and TypeScript, featuring a component-based architecture with clear separation of concerns:

- **App.tsx**: Main application router with HashRouter and sidebar layout
- **index.tsx**: React root renderer with context providers
- **index.css**: Global styles with custom CSS variables and Bootstrap overrides

#### Component Architecture

**Navigation Components:**
- **Sidebar**: Fixed-width navigation with branding, menu sections, language switcher, and exit controls
- **LanguageSwitcher**: Internationalization dropdown with English/Marathi support

**Modal Components:**
- **DeletionWarningModal**: Sophisticated confirmation dialog with impact analysis, safety warnings, and confirmation requirements
- **Form Modals**: Reusable modal dialogs for data entry and editing

**Page Components (12 Pages):**
- **Archive**: Archive management for historical data
- **BrokerLeisures**: Supplier payment tracking and settlement management
- **Brokers**: Supplier management with CRUD operations and financial tracking
- **BrokerTransactions**: Purchase transaction management with line-item details
- **CustomerLeisures**: Customer payment recording and outstanding balance management
- **Customers**: Customer relationship management with balance tracking
- **CustomerTransactions**: Sales transaction management with payment tracking
- **DatabaseDiagnostics**: Database health monitoring and statistics
- **Leisures**: Combined leisure management for all payment records
- **Products**: Inventory management with manufacturer stock cards and transaction history
- **Settings**: Business configuration and product/manufacturer setup
- **TableViewer**: Raw database table inspection and data viewing

#### UI Design System

**Styling Framework:**
- **Bootstrap 5**: Responsive grid system and component library
- **Custom CSS Variables**: Primary color palette (#be6d44) with variants
- **Component-specific Styles**: Sidebar.css and global overrides
- **Responsive Breakpoints**: Mobile-first design with proper scaling

**Visual Design Patterns:**
- **Card-based Layout**: Consistent card components with gradient headers
- **Color-coded Feedback**: Success (green), danger (red), warning (orange) states
- **Interactive Elements**: Hover effects, transitions, and visual feedback
- **Typography Hierarchy**: Consistent heading styles and text sizing

#### User Interface Patterns

**Data Display:**
- **Responsive Tables**: Bootstrap tables with pagination and sorting
- **Card Grids**: Manufacturer stock cards with click-to-view functionality
- **Modal Overlays**: Detailed information displays and form inputs
- **Toast Notifications**: Non-intrusive success/error feedback

**Form Handling:**
- **Real-time Validation**: Input validation with visual feedback
- **Modal Forms**: Clean form interfaces with proper field grouping
- **Confirmation Flows**: Safety warnings and impact analysis before destructive actions
- **Loading States**: Spinner indicators and progress feedback

**Navigation & Routing:**
- **HashRouter**: Client-side routing for Electron compatibility
- **Sectioned Sidebar**: Logical grouping of related functionality
- **Active State Indicators**: Visual feedback for current page
- **Breadcrumb Navigation**: Clear navigation hierarchy

#### User Experience Features

**Accessibility:**
- **Keyboard Navigation**: Full keyboard support for all interactions
- **Screen Reader Support**: Proper ARIA labels and semantic HTML
- **Color Contrast**: WCAG-compliant color combinations
- **Focus Management**: Proper focus handling in modals and forms

**Performance Optimizations:**
- **Lazy Loading**: On-demand component and data loading
- **Memoization**: React.memo and useMemo for expensive operations
- **Efficient Re-renders**: Optimized state management to prevent unnecessary updates
- **Bundle Optimization**: Tree-shaking and code splitting

**Error Handling:**
- **User-friendly Messages**: Clear error descriptions and recovery suggestions
- **Graceful Degradation**: Fallback UI states for error conditions
- **Loading Indicators**: Visual feedback during async operations
- **Retry Mechanisms**: Automatic retry for failed operations

#### Responsive Design
- **Mobile-First Approach**: Optimized for mobile devices with progressive enhancement
- **Breakpoint System**: xs, sm, md, lg, xl breakpoints for different screen sizes
- **Flexible Layouts**: Grid systems that adapt to screen size
- **Touch-Friendly**: Appropriate button sizes and touch targets for mobile use

### Business Logic Layer Architecture

#### IPC Communication System
The application uses Electron's IPC (Inter-Process Communication) for secure communication between the main process and renderer process:

- **50+ IPC Channels**: Comprehensive type-safe communication channels
- **Generic CRUD Handlers**: Factory pattern for consistent database operations
- **Specialized Handlers**: Transaction-specific and leisure-specific operations
- **Security Context Bridge**: Secure API exposure to renderer process
- **Error Handling**: Comprehensive error handling and validation

#### IPC Handler Architecture

**Generic CRUD Factories:**
- `createCRUDHandlers()` - Basic CRUD operations for all entities
- `createTransactionCRUDHandlers()` - Transaction operations with broker/customer filtering
- `createLeisureCRUDHandlers()` - Payment operations with entity-specific logic

**Specialized Handlers:**
- **Statistics**: Database stats, entity counts, and performance metrics
- **Financial Operations**: Broker/customer total calculations and updates
- **Deletion Analysis**: Impact assessment for safe data removal
- **Utility Functions**: Database reset, folder access, window reload

#### State Management System
The React Context provides comprehensive application state management:

- **Centralized Data Store**: Single source of truth for all application data
- **Real-time Synchronization**: Automatic data updates across components
- **Type-Safe Operations**: Full TypeScript coverage for all state operations
- **Business Logic Integration**: Transaction processing, stock management, financial calculations

#### Core Business Operations

**Transaction Management:**
- **Broker Transactions**: Purchase processing with stock increases and leisure creation
- **Customer Transactions**: Sales processing with stock decreases and payment tracking
- **Invoice Generation**: Sequential numbering with year-based prefixes
- **Product Line Items**: Detailed transaction breakdowns with manufacturer tracking

**Financial Management:**
- **Leisure Records**: Payment tracking with "toBePaid" and "paid" states
- **Balance Calculations**: Automatic total updates for brokers and customers
- **Payment Methods**: Support for Cash and UPI payment tracking

**Inventory Management:**
- **Stock Tracking**: Real-time inventory updates with manufacturer-level granularity
- **Stock History**: Complete audit trail of all inventory movements
- **Stock Validation**: Business rule enforcement for stock operations

#### Data Export System
Advanced Excel export capabilities using ExcelJS:

- **Transaction Exports**: Line-item detailed transaction reports
- **Financial Reports**: Leisure records and payment history
- **Data Formatting**: Professional Excel formatting with proper column sizing
- **File Management**: Automatic filename generation with timestamps

#### Business Rules Engine

**Data Integrity:**
- **Deletion Impact Analysis**: Prevents orphaned records and data corruption
- **Transaction Rollback**: Automatic reversal of stock changes on transaction deletion
- **Foreign Key Enforcement**: Database-level referential integrity

**Business Logic Validation:**
- **Stock Level Checks**: Prevents negative inventory
- **Financial Consistency**: Ensures balance calculations remain accurate
- **Transaction Completeness**: Validates all required transaction data

**Performance Optimizations:**
- **Batch Operations**: Efficient bulk data processing
- **Lazy Loading**: On-demand data loading for better performance
- **Memory Management**: Proper cleanup and resource management

## Technology Stack

### Presentation Layer
- **Frontend Framework**: React 19.2.0 with TypeScript
- **Build Tool**: Vite with React plugin
- **Routing**: React Router DOM v7.9.5 (HashRouter for Electron)
- **UI Framework**: Bootstrap 5.3.1 with React Bootstrap 2.8.0
- **Styling**: Custom CSS with CSS Variables and modules
- **Icons**: React Icons 5.5.0 (Material Design Icons)
- **Internationalization**: i18next 25.6.1 with react-i18next 16.2.4

### Business Logic Layer
- **Desktop Runtime**: Electron 39.1.1 with secure IPC communication
- **State Management**: React Context with TypeScript
- **Data Export**: ExcelJS 4.4.0 for professional Excel generation
- **Document Generation**: jsPDF 3.0.3 with html2canvas 1.4.1
- **Type Safety**: Comprehensive TypeScript interfaces
- **Error Handling**: Centralized error management and user feedback

### Data Layer
- **Database Engine**: SQLite 5.1.7 with WAL mode
- **Database Driver**: sqlite3 for Node.js
- **Query Optimization**: Indexed queries and database views
- **Full-Text Search**: FTS5 virtual tables for advanced search
- **Data Integrity**: Foreign key constraints and transaction management

### Development & Build Tools
- **Language**: TypeScript 5.9.3 for type safety across all layers
- **Code Quality**: ESLint 9.39.1 with React and TypeScript plugins
- **Build System**: Electron Builder 26.0.12 for desktop application packaging
- **Development Server**: Concurrently 9.2.1 for multi-process development
- **Package Management**: npm with package-lock.json
- **Build Tool**: Vite 7.2.2 with React plugin

### Key Dependencies
- **React Ecosystem**: react 19.2.0, react-dom 19.2.0, react-router-dom 7.9.5
- **Electron**: electron 39.1.1, electron-builder 26.0.12
- **Database**: sqlite3 5.1.7
- **UI Components**: bootstrap 5.3.1, react-bootstrap 2.8.0
- **Charts & Visualization**: chart.js 4.5.1, react-chartjs-2 5.3.1
- **Internationalization**: i18next 25.6.1, i18next-browser-languagedetector 8.2.0
- **Export Libraries**: exceljs 4.4.0, jspdf 3.0.3, html2canvas 1.4.1
- **Utilities**: uuid 13.0.0, react-icons 5.5.0
- **Development**: @vitejs/plugin-react 5.1.0, typescript-eslint 8.46.3

## Prerequisites

Before running this application, make sure you have the following installed:

- **Node.js** (version 16 or higher recommended)
- **npm** package manager (comes with Node.js)
- **Git** for cloning the repository

### System Requirements
- **Operating System**: Windows 10+, macOS 10.15+, or Linux
- **RAM**: 4GB minimum, 8GB recommended
- **Storage**: 500MB free space for installation and data

## Installation

### 1. Clone the Repository
```bash
git clone https://github.com/adityapawar112/ScaleERP-Desktop.git
cd inventory-management
```

### 2. Install Dependencies
```bash
npm install
```

### 3. Development Mode
For web development (opens in browser):
```bash
npm run dev
```
Then navigate to `http://localhost:3000`

### 4. Desktop Application Mode
For full Electron desktop application:
```bash
npm run electron-dev
```

## Available Scripts

### Development Scripts
- `npm run dev` - Start Vite development server (web mode)
- `npm run build` - Build the React application for production
- `npm run preview` - Preview the production build locally
- `npm run test` - Run test suite (currently no tests configured)

### Electron Scripts
- `npm run electron` - Build and run Electron application
- `npm run electron-dev` - Run Electron in development mode with hot reload
- `npm run build-electron` - Compile TypeScript and build Electron main process
- `npm run build-electron-watch` - Watch mode for Electron TypeScript compilation
- `npm run copy-schema` - Copy database schema to build directory

### Build & Distribution Scripts
- `npm run build-all` - Build both React app and Electron application
- `npm run build-electron-dist` - Create distributable packages for all platforms
- `npm run build-electron-win` - Create Windows installer package
- `npm run dist` - Alias for build-electron-dist

### Utility Scripts
Located in `scripts/` directory:
- `scripts/check-db.cjs` - Database health check and diagnostics
- `scripts/recalculate-totals.cjs` - Recalculate financial totals (repair script)

## Project Structure

```
inventory-management/
├── electron/                    # Electron main process
│   ├── main.ts                 # Main Electron process entry point
│   ├── preload.ts              # Secure preload script for IPC
│   ├── tsconfig.json           # Electron TypeScript configuration
│   ├── database/               # Database layer
│   │   ├── manager.ts          # Database connection management
│   │   ├── operations.ts       # CRUD operations and business logic
│   │   ├── schema.sql          # Database schema with 19 tables
│   │   ├── types.ts            # TypeScript interfaces
│   │   └── migration.ts        # Database migration framework
│   └── ipc/                    # IPC communication handlers
│       └── handlers.ts         # 50+ IPC channel handlers
├── src/                        # React frontend application
│   ├── components/             # Reusable UI components
│   │   ├── DeletionWarningModal.tsx # Impact analysis modal
│   │   ├── LanguageSwitcher.tsx     # i18n language selector
│   │   ├── Sidebar.tsx              # Navigation sidebar
│   │   ├── CustomerInvoice.tsx      # Invoice generation
│   │   └── SupplierInvoice.tsx      # Supplier invoice component
│   ├── context/                # React state management
│   │   └── AppContext.tsx      # Global application state
│   ├── i18n/                   # Internationalization
│   │   ├── index.ts            # i18n configuration
│   │   └── locales/            # Translation files
│   │       ├── en/translation.json  # English translations
│   │       └── mr/translation.json  # Marathi translations
│   ├── pages/                  # Main application pages
│   │   ├── Archive.tsx              # Archive management
│   │   ├── BrokerLeisures.tsx      # Supplier payments
│   │   ├── Brokers.tsx             # Supplier management
│   │   ├── BrokerTransactions.tsx  # Purchase transactions
│   │   ├── CustomerLeisures.tsx    # Customer payments
│   │   ├── Customers.tsx           # Customer management
│   │   ├── CustomerTransactions.tsx # Sales transactions
│   │   ├── DatabaseDiagnostics.tsx # Database monitoring
│   │   ├── Leisures.tsx             # Combined leisure management
│   │   ├── Products.tsx            # Inventory management
│   │   ├── Settings.tsx            # Business configuration
│   │   └── TableViewer.tsx         # Raw data inspection
│   ├── styles/                 # CSS stylesheets
│   │   └── Sidebar.css         # Sidebar-specific styles
│   ├── types/                  # TypeScript type definitions
│   │   └── electron.d.ts       # Electron API types
│   ├── utils/                  # Utility functions
│   │   └── excelExport.ts      # Excel export functionality
│   ├── App.tsx                 # Main React component
│   ├── index.tsx               # React application entry
│   └── index.css               # Global styles
├── scripts/                    # Utility scripts
│   ├── check-db.cjs           # Database health check
│   └── recalculate-totals.cjs # Financial totals repair
├── build/                     # Production build output
├── build-electron/            # Electron build artifacts
├── public/                    # Static assets
│   ├── index.html             # Main HTML template
│   ├── ScaleERPLogo.png      # Application logo
│   ├── LOGO SNOW.png          # Secondary logo
│   ├── QRCode.jpg             # QR code asset
│   └── Cow.png                # Additional logo asset
├── plans/                     # Project planning documents
│   ├── database-table-analysis.md
│   ├── ELECTRON_TYPESCRIPT_MIGRATION_PLAN.md
│   └── Prod-Manu-Deletion.md
├── package.json               # Node.js dependencies
├── tsconfig.json              # TypeScript configuration
├── vite.config.js             # Vite build configuration
├── eslint.config.js           # ESLint configuration
└── README.md                  # This documentation
```

## Usage Guide

### Getting Started
1. **Launch the Application**: Run `npm run dev` to start the development server
2. **Navigate Using Sidebar**: Use the left sidebar to access different sections
3. **Language Selection**: Choose your preferred language from the sidebar footer
4. **Business Setup**: Configure your business information in Settings

### Core Workflows

#### 1. Product & Inventory Management
- **Add Products**: Go to Settings → Product Settings to create new products
- **Add Manufacturers**: For each product, add manufacturer-specific stock levels
- **Monitor Stock**: Use the Products page to view current inventory levels
- **Stock History**: Click on manufacturer cards to view transaction history

#### 2. Supplier Management (Brokers)
- **Add Suppliers**: Create broker records with contact information
- **Record Purchases**: Use Broker Transactions to log supplier purchases
- **Track Payments**: Monitor outstanding payments in Broker Leisures
- **Financial Overview**: View total pending/paid amounts per supplier

#### 3. Customer Management
- **Add Customers**: Create customer records for sales tracking
- **Record Sales**: Use Customer Transactions for sales entry
- **Payment Tracking**: Monitor customer payments in Customer Leisures
- **Balance Monitoring**: Track outstanding customer balances

#### 4. Transaction Processing
- **Purchase Transactions**: Record supplier purchases with automatic stock increases
- **Sales Transactions**: Record customer sales with automatic stock decreases
- **Invoice Generation**: Automatic sequential invoice numbering
- **Payment Methods**: Support for Cash and UPI payment tracking

### Advanced Features

#### Analytics & Reporting
- **Real-time KPIs**: Monitor business performance metrics
- **Sales Trends**: 30-day sales analysis with interactive charts
- **Product Performance**: Top-selling products by revenue and quantity
- **Payment Analysis**: Cash vs UPI payment method distribution

#### Data Export & Backup
- **Excel Exports**: Professional Excel reports for all transaction types
- **Transaction Details**: Line-item breakdowns with manufacturer tracking
- **Financial Reports**: Payment history and outstanding balance reports
- **Automated Filenames**: Date-stamped files for easy organization

#### Multi-Language Support
- **English & Marathi**: Complete UI translation coverage
- **Automatic Detection**: Browser language preference detection
- **Persistent Settings**: Language preferences saved locally
- **Cultural Formatting**: Localized number and date formatting

#### Database Management
- **Health Monitoring**: Database diagnostics and performance metrics
- **Data Inspection**: Raw table viewing for troubleshooting
- **Backup Utilities**: Database health checks and repair scripts
- **Migration Support**: Framework for future database updates

### Business Operations

#### Daily Operations
1. **Morning Setup**: Review previous day's sales and outstanding payments
2. **Inventory Check**: Monitor stock levels and place orders as needed
3. **Transaction Entry**: Record all purchases and sales throughout the day
4. **Payment Processing**: Update payment records for completed transactions

#### Financial Management
1. **Balance Monitoring**: Track supplier and customer outstanding balances
2. **Payment Recording**: Log all payments received and made
3. **Financial Reports**: Generate Excel reports for accounting
4. **Cash Flow Analysis**: Monitor business financial health

#### Inventory Control
1. **Stock Monitoring**: Regular review of inventory levels
2. **Reorder Planning**: Identify products needing replenishment
3. **Supplier Coordination**: Manage supplier relationships and orders
4. **Stock Audits**: Use transaction history for inventory verification

### Troubleshooting

#### Common Issues
- **Database Connection**: Check database health with diagnostic tools
- **Performance Issues**: Monitor database statistics and optimize queries
- **Data Inconsistencies**: Use recalculation scripts for financial totals
- **Export Problems**: Verify Excel export functionality and file permissions

#### Data Recovery
- **Transaction Rollback**: Automatic reversal of stock changes on deletion
- **Deletion Analysis**: Impact assessment before data removal
- **Backup Verification**: Regular database health checks
- **Data Integrity**: Foreign key constraints prevent orphaned records

### Best Practices

#### Data Entry
- **Consistent Naming**: Use standardized product and supplier names
- **Complete Information**: Fill all required fields for accurate reporting
- **Regular Updates**: Keep contact information current
- **Duplicate Prevention**: Check for existing records before creation

#### Financial Management
- **Timely Payments**: Record payments as they occur
- **Accurate Tracking**: Verify payment amounts and methods
- **Regular Reconciliation**: Compare system balances with external records
- **Audit Trails**: Use transaction history for financial verification

#### System Maintenance
- **Regular Backups**: Monitor database file health
- **Performance Monitoring**: Check system responsiveness
- **Data Validation**: Use diagnostic tools for data integrity
- **Update Management**: Keep dependencies current

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is private and proprietary.

## Support

For support or questions, please contact the development team.
