# ScaleERP Inventory Management System - Codebase Wiki

Welcome to the comprehensive technical documentation for the ScaleERP Inventory Management System.

## Project Overview

**ScaleERP** is a cross-platform desktop inventory management application designed for small to medium businesses. Built with Electron, React, and SQLite, it provides end-to-end management of products, suppliers (brokers), customers, transactions, and financial tracking.

### Key Features

- **Product & Inventory Management** — Multi-manufacturer stock tracking with full audit trail
- **Supplier (Broker) Management** — Purchase transactions, payment tracking, financial overview
- **Customer Management** — Sales transactions, payment tracking, balance monitoring
- **Transaction Processing** — Automatic invoice numbering, Cash/UPI payment support
- **Financial Management** — Leisure records for payment state tracking, balance calculations
- **Data Export** — Professional Excel exports via ExcelJS
- **Multi-Language Support** — English and Marathi localization
- **Automated Backups** — Scheduled database backups with history tracking

## Technology Stack

| Layer | Technology | Version |
|-------|------------|---------|
| **Frontend** | React | 19.2.0 |
| **UI Framework** | Bootstrap + React Bootstrap | 5.3.1 / 2.8.0 |
| **Routing** | React Router DOM | 7.9.5 |
| **Internationalization** | i18next | 25.6.1 |
| **Desktop Runtime** | Electron | 41.0.4 |
| **Database** | SQLite (WAL mode) | 5.1.7 |
| **Build Tool** | Vite | 8.0.3 |
| **Language** | TypeScript | 5.9.3 |

## Documentation Structure

### Backend Documentation
- [Backend Overview](Backend/backend.md) — Electron architecture and main process
- [Database](Backend/Database/database.md) — SQLite setup, WAL mode, connection management
- [Schema Design](Backend/Database/schema.md) — Complete database schema documentation
- [Database Operations](Backend/Database/operations.md) — CRUD operations and utilities
- [IPC Communication](Backend/IPC/ipc-communication.md) — Frontend-backend communication layer
- [Backup Scheduler](Backend/Services/backup-scheduler.md) — Automated backup system

### Frontend Documentation
- [Frontend Overview](Frontend/frontend.md) — React architecture and component structure
- [Components](Frontend/Components/components.md) — Shared UI components
- [Pages](Frontend/Pages/pages.md) — Application pages and routing
- [State Management](Frontend/Context/app-context.md) — Global state with AppContext
- [Internationalization](Frontend/Internationalization/i18n.md) — Multi-language support

### Configuration
- [Development Setup](Configuration/setup.md) — Getting started with development
- [Build & Distribution](Configuration/build.md) — Building for production

## Quick Start

```bash
# Install dependencies
npm install

# Development mode (runs Vite dev server + Electron)
npm run electron-dev

# Build for production
npm run build-all

# Create distributable
npm run dist
```

## Architecture Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                     Electron Main Process                    │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────────┐  │
│  │   Database    │  │     IPC      │  │     Backup       │  │
│  │   Manager     │  │   Handlers   │  │    Scheduler     │  │
│  └──────┬───────┘  └──────┬───────┘  └──────────────────┘  │
│         │                 │                                  │
│         ▼                 ▼                                  │
│  ┌──────────────────────────────────────────────────────┐  │
│  │              SQLite Database (WAL Mode)               │  │
│  └──────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
                           ▲
                           │ IPC (Context Bridge)
                           ▼
┌─────────────────────────────────────────────────────────────┐
│                    React Frontend (Renderer)                 │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────────┐  │
│  │    Pages      │  │  Components  │  │   AppContext     │  │
│  │  (11 pages)   │  │  (7 shared)  │  │  (Global State)  │  │
│  └──────────────┘  └──────────────┘  └──────────────────┘  │
│                           │                                  │
│                    ┌──────┴───────┐                         │
│                    │  React Router │                         │
│                    │  (HashRouter) │                         │
│                    └──────────────┘                         │
└─────────────────────────────────────────────────────────────┘
```

## Project Structure

```
├── electron/                 # Electron main process
│   ├── main.ts              # Application entry point
│   ├── preload.ts           # Context bridge for secure IPC
│   ├── database/            # Database layer
│   │   ├── manager.ts       # Connection management
│   │   ├── operations.ts    # CRUD operations
│   │   ├── schema.sql       # Database schema
│   │   ├── types.ts         # TypeScript interfaces
│   │   └── backupOps.ts     # Backup operations
│   ├── ipc/                 # IPC handlers
│   │   └── handlers.ts      # Frontend-backend communication
│   └── services/            # Background services
│       └── backupScheduler.ts # Automated backup scheduling
├── src/                     # React frontend
│   ├── App.tsx              # Main application component
│   ├── components/          # Shared components
│   ├── pages/               # Application pages
│   ├── context/             # State management
│   ├── i18n/                # Internationalization
│   ├── types/               # TypeScript definitions
│   └── utils/               # Utility functions
├── public/                  # Static assets
└── scripts/                 # Build/utility scripts
```

## Key Concepts

### Entities
- **Products** — Inventory items with multi-manufacturer stock levels
- **Brokers** — Suppliers who provide products (purchases)
- **Customers** — Buyers who purchase products (sales)
- **Transactions** — Purchase/sale records with line-item details
- **Leisures** — Payment records tracking financial state

### Transaction Types
- **Broker Transactions** — Purchases from suppliers (stock increases)
- **Customer Transactions** — Sales to customers (stock decreases)

### Payment Methods
- **Cash** — Physical cash payments
- **UPI** — Digital payment via UPI

### Financial States
- **Brokers**: `purchase` (new purchase) | `payable` (payment made)
- **Customers**: `sale` (new sale) | `receivable` (payment received)

## Contributing

This documentation is auto-generated from the codebase. To update:
1. Modify the source code
2. Run the documentation generator
3. Review and commit changes

---

*Last updated: 2026-04-03*