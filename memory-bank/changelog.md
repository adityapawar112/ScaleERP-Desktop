# Changelog - ScaleERP

## [1.2.2] - 2026-05-19
### Added
- **Invoice Engine Integration Documentation**: Created `memory-bank/documentation/invoice-customization-engine.md` detailing the schema normalization layer, template registry, client-side brand asset pipeline (optimize-on-upload via canvas), physical stacking (A5-on-A4), digital PDF fallbacks, and clipboard sharing automation. Provided a step-by-step developer integration blueprint for adapting this engine to other billing applications.
- **Custom Device Fingerprint Binding**: Added support for entering a custom device fingerprint in the Developer Dashboard's license generation form instead of forcing binding to the current developer machine. Added a "**Use Current Device**" quick-fill helper button.
- **Pasted Private Key PEM Signing**: Added a monospace textarea to paste or input custom private key PEMs directly in the Developer Dashboard modal. This allows developers to sign licenses directly from packaged desktop application environments where `vendor/keys/private_key.pem` is omitted.
- **IPC Handler & Preload Parity**: Integrated `customDeviceFingerprint` and `privateKeyPem` parameters across window API typing (`electron.d.ts`), preload IPC bridge (`preload.ts`), and the main-process handler (`handlers.ts`).
- **Dynamic Key Fallback**: The backend automatically falls back to loading local keys in development mode when the textarea is left blank, but requires pasted PEM content in production mode, issuing clear runtime instructions if omitted.

### Fixed
- **Build Safety Audit Resolution**: Refactored the private key input's `placeholder` text to avoid using literal PEM headers like `"-----BEGIN RSA PRIVATE KEY-----"`. This prevents the placeholder string from being bundled into the production JavaScript asset and triggering security violations in the robust `verify-build-safety.cjs` audit, allowing the production build to pass.

## [1.2.1] - 2026-05-19
### Added
- **Comprehensive User-Facing SOP Documentation**: Created and verified a complete set of user-facing SOP documentation for the ScaleERP desktop application under `memory-bank/scaleerp-web/website-structure/docs/`. Organized into 7 categories:
  - Category 1 (Getting Started): Installation, license activation, login, basic settings setup, and dashboard overview.
  - Category 2 (Inventory & Godowns): Managing products, archiving/restoring items, viewing stock transaction history logs, and responding to low stock alerts.
  - Category 3 (Retail Customers & Invoicing): Managing customers, creating retail sales bills, post-sale payment logging via the leisure modal, managing/printing invoices, and customer khata ledgers.
  - Category 4 (Wholesale Brokers): Managing brokers, logging wholesale purchases, calculating unit rates and brokerage commissions, and managing split supplier ledgers.
  - Category 5 (Reports & WhatsApp): Generating reports, downloading Excel/PDF/print formats, setting up custom WhatsApp presets, and using dynamic template placeholders.
  - Category 6 (Backups & Security): Local manual and automated backups, cloud backup settings (Google Drive), offline licensing, and clock tampering lockouts.
  - Category 7 (Troubleshooting & FAQs): Step-by-step troubleshooting for common errors (duplicates, clock synchronization, database lockouts) and FAQ guide.
- **Village-Friendly Language Standard**: Wrote all user guides using simplified, step-by-step plain language ("Grandma Standard") matching actual button labels and form inputs.
- **Codebase and UI Alignment**: Systematically cross-verified every documentation file against corresponding React page components (`Products.tsx`, `CustomerTransactions.tsx`, `Settings.tsx`, `Dashboard.tsx`, `Licensing.tsx`, `WhatsAppManager.tsx`, `Reports.tsx`, `Backups.tsx`, `BrokerLeisures.tsx`, `CustomerLeisures.tsx`) to ensure 100% accurate labels, button text, validation messages, and calculations.
- **Security Boundaries Enforcement**: Strictly excluded the Developer Dashboard and Database Diagnostics pages from user documentation.
- **Master Prompt Generation (`prompt.md`)**: Designed a complete AI instructions prompt in `memory-bank/scaleerp-web/prompt.md` guiding builders on how to scaffold, build, and deploy the `scaleerp-web` marketing, blogs, user documentation portal, and cryptographic licensing database engine using Next.js, shadcn/ui, shadcn space components (Base UI primitives, Nova visual layout, and pre-built widgets/charts CLI namespaces), Supabase PostgreSQL schema migrations, and Vercel secure Serverless environments.


## [1.2.0] - 2026-05-18
### Added
- **Unsaved Settings Navigation Prompt**: Implemented robust unsaved changes detection (`isDirty`) in `Settings.tsx` via deep JSON equality check against context state. Intercepts client-side navigation attempts via React Router v7 `useBlocker` (enabled by refactoring `App.tsx` to `createHashRouter` and `RouterProvider`), rendering a clean React Bootstrap confirmation modal to prevent accidental data loss. Also handles browser window reload/close via standard `beforeunload` listener.
- **Advanced Invoice Customization Engine**: Built a decoupled, highly responsive invoice rendering system (`TemplateRegistry.tsx`) supporting multiple professional layouts: Standard A4 Corporate, Modern Minimalist Clean, Compact A5 Half-Page, and Thermal POS 80mm Roll.
- **Visual Brand Asset Uploaders**: Added dedicated uploader sections in `Settings.tsx` for Company Logo, Header Banner, and Payment QR Code. Uploaded images are client-side optimized via HTML5 Canvas (`imageOptimizer.ts`) and securely written to disk (`assets/branding/`) via IPC.
- **Dynamic Layout & Styling Controls**: Integrated default template selection, accent color picker with curated swatch pills, and print copies configuration.
- **Physical Multi-Copy Stacking**: Enabled single-page dual stacking (`dual_compact`) for 2-copy physical printing, stacking two Compact A5 invoices vertically on a single A4 sheet separated by a dashed scissor cut-line.
- **Intelligent Digital Fallback**: Implemented automatic state interception during headless PDF generation (WhatsApp/PDF downloads). Overrides thermal roll layouts to single-copy Standard A4 format for elegant electronic document distribution.
- **Runtime Modal Quick-Switcher**: Replaced hardcoded invoice components in `InvoiceModal.tsx` with `<TemplateRegistry />` and added an interactive top controls bar (`quick-controls-bar`) for real-time layout and copy overrides.
- **Live Interactive Preview**: Built a sticky real-time invoice preview container in `Settings.tsx` populated with mock customer transaction data, providing instant visual feedback on styling changes.
- **Flawless Print Layout Enforcement**: Resolved dual compact stack overflow and single-page invoice height constraints by enforcing `@page` 0mm print margins for end-to-end full paper coverage, removing artificial `maxHeight` restrictions for natural multi-page pagination, and adding automatic item-count thresholds (>4 items) to smartly fallback from dual-compact to multi-page mode.
- **Repeating Multi-Page Headers**: Structured `StandardA4`, `ModernClean`, and `CompactA5` with a master table enclosing the header banner, company logo, business details, and info grid inside `<thead>`. This natively guarantees that every physical printed page begins exactly with the professional branding header when breaking across multiple physical sheets.
- **100% Localization Parity**: Performed an exhaustive localization audit and replaced all hardcoded strings across Settings UI, Invoice Modal overrides, and all PDF invoice templates (Standard A4, Modern Clean, Compact A5, Thermal POS) with exact localized keys in both English (`en/translation.json`) and Marathi (`mr/translation.json`).
- **Frictionless WhatsApp Direct App Launch**: Replaced browser-first web redirects (`wa.me`) with native custom URI scheme (`whatsapp://send?phone=${finalPhone}&text=${encodedMessage}`) in `WhatsAppManager.tsx` and `InvoiceModal.tsx`. This tells the operating system to launch WhatsApp Desktop instantly without intermediate browser prompts. Enclosed IPC calls in a robust `try...catch` block to automatically fall back to `https://wa.me/...` if WhatsApp Desktop is missing or fails to launch, ensuring absolute reliability.
- **ScaleERP Web & Cloud Licensing Blueprint**: Created a dedicated `memory-bank/scaleerp-web/` documentation tree specifying the architectural blueprint for an isolated Vercel + Supabase cloud licensing backend. Structured comprehensive Supabase PostgreSQL relational schemas for lead generation (`customer_inquiries`), SEO blogging (`blogs`), explicit license deadlines (`valid_until`, `maintenance_until`), and an automated cloud heartbeat synchronization API (`POST /api/v1/licensing/sync-heartbeat`) that instantly flags local SQLite date tampering or system clock manipulation.
- **ScaleERP Web Application Context**: Fully populated `app-context.md` inside `memory-bank/scaleerp-web/`, defining the commercial rationale for the website, the desktop client's WAL offline architecture, end-to-end sequence flowcharts for the 16-digit activation handshake, and background anti-tamper telemetry reporting.
- **ScaleERP & ScaleERP Web Design System**: Fully refactored `design.md` inside `memory-bank/scaleerp-web/` to enforce an uncompromising 80/20 brand hierarchy. 80% core focus is dedicated to ScaleERP product ideology (`"Rooted in Soil, Empowered by Precision"`, offline ledger accuracy, Terracotta Earth `#B4532B` identity, white cow logo, and high-speed tabular typography). 20% accent focus is dedicated to the parent relationship with ScaleERP (`Ouroboros` perpetual loop, authoritative Bebas Neue/Public Sans typography, and Electric Navy `#004B72` trust badges).



## [1.1.4] - 2026-05-17
### Added
- **Advanced Invoice Engine Inception**: Completed AI-DLC Inception phase for the Advanced Invoice Engine & Customization feature.
- **Inception Documentation**: Documented comprehensive requirements (`requirements.md`), user stories (`user-stories.md`), architectural overview (`application-design/architecture.md`), and units of work (`units-of-work.md`) in `aidlc-docs/`.
- **Modular Invoice Architecture**: Designed modular invoice template engine supporting Standard A4, Modern Clean, Compact A5 (Dual Copy), and Thermal Receipt formats, alongside SQLite schema expansions for custom branding assets (logo, header banner, QR code).

## [1.1.3] - 2026-05-17
### Added
- **Configurable WhatsApp Invoice Templates**: Added `invoice_whatsapp_template` column to `business_settings` database schema with automatic non-destructive startup migration. Implemented interactive template textarea in `Settings.tsx` with one-click placeholder insertion (`{partyName}`, `{businessName}`, `{date}`, `{invoiceNumber}`, `{totalAmount}`) mirroring the WhatsApp Manager preset UX.
- **Dynamic WhatsApp Automation**: Updated `InvoiceModal.tsx` to format invoice sharing text dynamically using the configured template prior to launching WhatsApp.
- **Missing Invoice Translations**: Added localized keys and English/Marathi translations for `BROK./UNIT`, `BROKERAGE`, `Products Total`, and `Total Brokerage` in `SupplierInvoice.tsx`, and `Subtotal`, `Labour Charge` in `CustomerInvoice.tsx`.
- **Login Screen Language Switcher**: Added absolute top-right `<LanguageSwitcher />` to `LoginScreen.tsx` for instantaneous pre-authentication language switching.
- **Per-product Brokerage Tracking**: Added `total_brokerage`, `brokerage_per_unit`, and `brokerage` fields to database schema and TypeScript interfaces.
- **Brokerage Automation & UI**: Implemented automatic calculation of total brokerage across Broker Transactions and synchronized purchase records in Broker Ledgers (`broker_leisures`).
- **Brokerage KPI**: Added a dedicated "Total Brokerage Given" KPI badge on the Broker Ledgers page.
- **Supplier Invoice & Excel Exports**: Included Brokerage per Unit and Total Brokerage breakdown in Supplier Invoices (`SupplierInvoice.tsx`) and Excel exports (`excelExport.ts`).
- **Automatic Startup Schema Migration**: Implemented `runMigrations()` in `manager.ts` to execute non-destructive `ALTER TABLE` statements on existing SQLite databases on app startup. Updated database seeder with sample brokerage and labour charges.
- **Marathi Translations**: Added all corresponding i18n keys and Marathi translations (`दलाली`, `एकूण दलाली`, `मजुरी आकार`, etc.).

### Changed
- **Comprehensive Modal & Searchbar Localization**: Fully localized all View/Edit transaction modals, leisure modals, search bar placeholders, and duplicate warning modals across `BrokerTransactions.tsx`, `CustomerTransactions.tsx`, `Brokers.tsx`, `Customers.tsx`, `BrokerLeisures.tsx`, `CustomerLeisures.tsx`, and `Products.tsx`.
- **Transaction Total Refinement**: Corrected `totalAmount` in Broker Transactions so it accurately equals Products Cost + Total Brokerage, ensuring precise ledger balance propagation. Formatted Supplier Invoice summary to display Products Total, Total Brokerage, Transaction Total, Previous Balance, and Net Outstanding.
- **Customer Labour Refactoring**: Replaced row-level per-product labour calculation with an overall fixed top-level `labourCharge` input in Customer Transactions (`CustomerTransactions.tsx`).
- Removed row-level labour columns from product grids, view modals, customer invoices (`CustomerInvoice.tsx`), and Excel exports, while preserving backward compatibility with past database records.

## [1.1.2] - 2026-05-15
### Added
- Implemented **PKCE (Proof Key for Code Exchange)** for secure Google Drive authentication.
- Added **System Browser OAuth Flow** to bypass security blocks on embedded browsers.
- Implemented temporary local loopback server for automatic authorization code capture.
- Expanded OAuth scopes to include account email and profile identification.
- **Unified Cloud Backup UI**: Migrated cloud settings and status into the main Backups management page.
- **Granular Sync Tracking**: Added real-time cloud status icons (Pending/Uploading/Completed/Failed) to the backup history table.
- **Manual Re-sync Action**: Added "Force Sync" button per backup item to manually trigger queue re-insertion.
- **High-Performance PDF Export**: Installed `jspdf-autotable` and implemented a zero-DOM virtual canvas PDF generator (`pdfExport.ts`) capable of exporting 5,000+ report rows in under a second.
- **Integrated Download Option**: Added a dedicated "Download PDF" button directly in `ReportViewer.tsx` with loading spinner feedback.
- **Header Standardization**: Replaced custom inline styles and divergent header components in `Dashboard.tsx`, `Licensing.tsx`, and `Reports.tsx` with the uniform `.page-header` pattern. Added localized subtitles where needed.
- **Search Bar Alignment**: Decoupled the search input on the Reports page from the title, placing it in a dedicated row above the tabs.
- **Flawless I18n Refactoring (Phase 1-5)**: Refactored all hardcoded components, pages, and navigation (`ChangePasswordModal`, `PasswordResetModal`, `CloudBackupSettings`, `Backups`, `LicenseBanner`, `LicenseGuard`, `LicenseActivation`, `CustomerInvoice`, `SupplierInvoice`, `Products`, `Dashboard`, `DevDashboard`, `LockoutScreen`, `App`, `LoginScreen`, `Sidebar`, `Reports`, `ReportViewer`, `reportDataGenerators`) to use `useTranslation()`.
- **Flawless Key Parity**: Injected all missing AST keys into both `en/translation.json` and `mr/translation.json` to achieve 100% dictionary parity across 594 keys. Validated with AST scanners.
- **Ergonomic Sidebar Navigation**: Rearranged bottom sidebar navigation items by business usage frequency: Reports & Analysis -> System Backups -> Settings -> Licensing -> Developer Dashboard.
- **Architectural Documentation**: Created comprehensive Google Drive Cloud Sync & Automated Backup implementation guide (`google-drive-sync-implementation-guide.md`) detailing the OAuth2 PKCE system browser flow, durable queue schema, and reusable Electron modules for adaptation in other applications.

### Fixed
- Fixed unresponsive sign-in screen after user logout by implementing a full window reload (`window.electronAPI.reloadWindow()` / `window.location.reload()`) upon logout in `App.tsx`, ensuring a completely pristine DOM and React state.
- Resolved "This browser or app may not be secure" block during Google login.
- Fixed `invalid_request` errors by aligning `codeVerifier` property naming and initializing with Desktop client secrets.
- Corrected redirect URI mismatch issues between `localhost` and `127.0.0.1`.
- Improved cloud upload stability with better folder auto-discovery.
- Fixed `SQLITE_CONSTRAINT` error when enqueuing items by correctly calculating and including file checksums.
- Fixed a hanging `calculateChecksum` method by ensuring proper stream event handling.
- Resolved TypeScript type errors by updating `ElectronAPI` global declarations.
- Fixed blank PDF exports and rendering timeouts on large reports (5,000+ entries) by decoupling export from hidden DOM iframes and scaling print timeouts dynamically.

### Changed
- Migrated Google Drive authentication from embedded `BrowserWindow` to external system browser.
- Consolidated Backup and Cloud Sync management into a single, high-transparency interface.

## [1.1.1] - 2026-05-11
### Added
- Production-ready admin dashboard and reports module.
- Finalized 28-table database schema with relational integrity.
- Integrated licensing system with WhatsApp management.
