# ScaleERP Memory Bank Index

Welcome to the **ScaleERP** documentation index. This central hub provides exhaustive links and metadata for all project documentation.

## Core Memory Bank
*Foundational documents defining the project's identity and state.*

| Document | Metadata |
| :--- | :--- |
| [Project Brief](file:///c:/Users/adity/Desktop/Ouroscale/ScaleERP/memory-bank/projectBrief.md) | High-level mission, core functional/non-functional requirements, and the primary Tech Stack. |
| [Product Context](file:///c:/Users/adity/Desktop/Ouroscale/ScaleERP/memory-bank/productContext.md) | Explains "The Why" behind the project, user problems, and the intended User Experience. |
| [System Patterns](file:///c:/Users/adity/Desktop/Ouroscale/ScaleERP/memory-bank/systemPatterns.md) | Technical architecture, IPC communication patterns, and finalized design decisions. |
| [Tech Context](file:///c:/Users/adity/Desktop/Ouroscale/ScaleERP/memory-bank/techContext.md) | Detailed development setup, environment variables, technical constraints, and dependencies. |
| [Active Context](file:///c:/Users/adity/Desktop/Ouroscale/ScaleERP/memory-bank/activeContext.md) | Real-time work focus, the most recent 10 events, and immediate next steps. |
| [Progress](file:///c:/Users/adity/Desktop/Ouroscale/ScaleERP/memory-bank/progress.md) | Status tracking for all features (Working vs. Pending) and the current roadmap. |
| [Changelog](file:///c:/Users/adity/Desktop/Ouroscale/ScaleERP/memory-bank/changelog.md) | Comprehensive history of all versions, major changes, and critical fixes. |

## Development Lifecycle & Metadata
*Tracking the evolution and methodology of the project.*

| Document | Metadata |
| :--- | :--- |
| [AIDLC State](file:///c:/Users/adity/Desktop/Ouroscale/ScaleERP/memory-bank/aidlc-state.md) | Current phase in the AI-Driven Development Life Cycle (Inception/Construction/etc.). |
| [Development Timeline](file:///c:/Users/adity/Desktop/Ouroscale/ScaleERP/memory-bank/development-timeline.md) | Chronological breakdown of development phases and major milestones reached. |
| [Reflection Log](file:///c:/Users/adity/Desktop/Ouroscale/ScaleERP/memory-bank/raw_reflection_log.md) | Lessons learned, model reflections, and retrospectives on technical challenges. |

## Codebase Wiki
*Deep technical documentation for the application implementation.*

### 🏛️ Backend (Electron Main Process)
- [Backend Overview](file:///c:/Users/adity/Desktop/Ouroscale/ScaleERP/memory-bank/documentation/Codebase-wiki/Backend/backend.md) — Main process architecture and life-cycle management.
- [Database](file:///c:/Users/adity/Desktop/Ouroscale/ScaleERP/memory-bank/documentation/Codebase-wiki/Backend/Database/database.md) — SQLite connection handling, WAL mode, and database initializers.
- [Schema Design](file:///c:/Users/adity/Desktop/Ouroscale/ScaleERP/memory-bank/documentation/Codebase-wiki/Backend/Database/schema.md) — SQL table definitions and relational constraints.
- [Database Operations](file:///c:/Users/adity/Desktop/Ouroscale/ScaleERP/memory-bank/documentation/Codebase-wiki/Backend/Database/operations.md) — Internal logic for CRUD operations and data mutations.
- [IPC Communication](file:///c:/Users/adity/Desktop/Ouroscale/ScaleERP/memory-bank/documentation/Codebase-wiki/Backend/IPC/ipc-communication.md) — Registry of all IPC channels and message protocols.
- [Backup Scheduler](file:///c:/Users/adity/Desktop/Ouroscale/ScaleERP/memory-bank/documentation/Codebase-wiki/Backend/Services/backup-scheduler.md) — Automated database backup logic and cron configurations.

### 🖼️ Frontend (React Renderer)
- [Frontend Overview](file:///c:/Users/adity/Desktop/Ouroscale/ScaleERP/memory-bank/documentation/Codebase-wiki/Frontend/frontend.md) — React file structure, page routing, and design philosophy.
- [Components](file:///c:/Users/adity/Desktop/Ouroscale/ScaleERP/memory-bank/documentation/Codebase-wiki/Frontend/Components/components.md) — Documentation for reusable UI elements and component API.
- [Pages](file:///c:/Users/adity/Desktop/Ouroscale/ScaleERP/memory-bank/documentation/Codebase-wiki/Frontend/Pages/pages.md) — Breakdown of all view-layer screens (21 pages).
- [State Management](file:///c:/Users/adity/Desktop/Ouroscale/ScaleERP/memory-bank/documentation/Codebase-wiki/Frontend/Context/app-context.md) — Global state flow using React Context and custom hooks.
- [Internationalization](file:///c:/Users/adity/Desktop/Ouroscale/ScaleERP/memory-bank/documentation/Codebase-wiki/Frontend/Internationalization/i18n.md) — Localization setup for English and Marathi.
- [Excel Export](file:///c:/Users/adity/Desktop/Ouroscale/ScaleERP/memory-bank/documentation/Codebase-wiki/Frontend/Utils/excel-export.md) — Logic for generating professional reports with ExcelJS.

### ⚙️ Configuration & DevOps
- [Development Setup](file:///c:/Users/adity/Desktop/Ouroscale/ScaleERP/memory-bank/documentation/Codebase-wiki/Configuration/setup.md) — Quick start guide for setting up the local environment.
- [Build & Distribution](file:///c:/Users/adity/Desktop/Ouroscale/ScaleERP/memory-bank/documentation/Codebase-wiki/Configuration/build.md) — Instructions for packaging the app into installers.
- [Wiki README](file:///c:/Users/adity/Desktop/Ouroscale/ScaleERP/memory-bank/documentation/Codebase-wiki/README.md) — The technical wiki entry point.

## Licensing & Production Hardening
*Security-focused documentation for the ScaleERP Licensing System.*

| Document | Metadata |
| :--- | :--- |
| [Licensing Plan](file:///c:/Users/adity/Desktop/Ouroscale/ScaleERP/memory-bank/documentation/Licensing_Prod/licensing-implementation-plan.md) | The original architectural blueprint for RSA-based offline licensing. |
| [Production Readiness](file:///c:/Users/adity/Desktop/Ouroscale/ScaleERP/memory-bank/documentation/Licensing_Prod/PRODUCTION-READINESS.md) | Final safety checks and go-live verification status. |
| [Licensing Security](file:///c:/Users/adity/Desktop/Ouroscale/ScaleERP/memory-bank/documentation/Licensing_Prod/LICENSE-TESTING.md) | Protocols for validating cryptographic signatures and tamper detection. |
| [RSA Key Rotation](file:///c:/Users/adity/Desktop/Ouroscale/ScaleERP/memory-bank/documentation/Licensing_Prod/RSA-KEY-ROTATION-SOP.md) | Standard Operating Procedure for rotating encryption keys securely. |
| [Vendor Ops Guide](file:///c:/Users/adity/Desktop/Ouroscale/ScaleERP/memory-bank/documentation/Licensing_Prod/vendor-ops-guide.md) | Admin manuals for generating licenses and supporting offline users. |


## Miscellaneous & History
*General utility files and Git history snapshots.*

- [API Reference](file:///c:/Users/adity/Desktop/Ouroscale/ScaleERP/memory-bank/documentation/api-reference.md) — Simplified index of common IPC/Internal signatures.
- [Todo List](file:///c:/Users/adity/Desktop/Ouroscale/ScaleERP/memory-bank/documentation/todo-list.md) — Operational task tracker for development tasks.
- [Current Diff](file:///c:/Users/adity/Desktop/Ouroscale/ScaleERP/memory-bank/githistory/current_diff.md) — Snapshot of active/staged changes in the working directory.


---
*Last updated: 2026-05-15*
