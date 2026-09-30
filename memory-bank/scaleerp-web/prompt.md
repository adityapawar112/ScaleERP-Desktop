# Master Prompts: Building the ScaleERP Web Platform & Licensing Engine

You are tasked with building the **ScaleERP Web App & Licensing Hub (`scaleerp-web`)**. This is a standalone Next.js application that serves as the marketing portal, SEO blog engine, user/operator documentation hub, and cryptographic license authority for the ScaleERP desktop application.

Use the specifications below to implement the complete project. Do not shortcut any features or layouts. Use pre-built components and layouts from **shadcn/ui** and **shadcn space** wherever possible to maintain a modern, professional, high-performance SaaS look.

---

## 1. Core Tech Stack & Initialization

Initialize and build the application using these core technologies:
* **Framework**: Next.js (App Router, Tailwind CSS, TypeScript, React 19).
* **UI Components**: shadcn/ui and [shadcn space](https://shadcnspace.com) components, blocks, and templates.
* **Database & Auth**: Supabase (PostgreSQL, Client & Service Role clients).
* **Cryptography**: Node.js native `crypto` module (for asymmetric RSA-PSS signature generation).
* **Hosting**: Vercel (Serverless Functions, Environment Secrets).

### Setup and Configuration

1. **Initialize Project**:
   ```bash
   npx -y create-next-app@latest ./ --typescript --tailwind --app --src-dir --import-alias "@/*" --eslint
   ```

2. **Configure shadcn/ui & shadcn space**:
   Follow the new shadcn CLI create/initialization path. Choose:
   * Component Primitive Library: **Base UI** (recommended) or **Radix UI**
   * Visual Style: **Nova** (compact data-heavy spacing) or **Vega** (classic clean)
   * Base Color: **Zinc** or **Slate**
   * Theme Color: **Orange** (aligns with Terracotta Earth theme)
   * Icon Library: **Lucide Icons**
   * Font: **Plus Jakarta Sans** or **Inter**
   
   Initialize using:
   ```bash
   npx shadcn@latest init
   ```

3. **Configure components.json for shadcn space Registry**:
   Open `components.json` and add the `@shadcn-space` namespace so you can fetch pre-built charts, sidebars, dashboard layouts, and custom buttons directly via the shadcn CLI.
   
   ```json
   {
     "$schema": "https://ui.shadcn.com/schema.json",
     "style": "new-york",
     "rsc": true,
     "tsx": true,
     "tailwind": {
       "config": "tailwind.config.js",
       "css": "src/app/globals.css",
       "baseColor": "zinc",
       "cssVariables": true,
       "prefix": ""
     },
     "aliases": {
       "components": "@/components",
       "utils": "@/lib/utils",
       "ui": "@/components/ui",
       "lib": "@/lib",
       "hooks": "@/hooks"
     },
     "registries": [
       "https://registry.shadcnspace.com"
     ]
   }
   ```

4. **Install shadcn space components via CLI**:
   Do not write custom sidebars, charts, or widgets. Install them directly:
   ```bash
   # Add core ui primitives
   npx shadcn@latest add button card dialog dropdown-menu input textarea select tabs table accordion progress toast calendar
   
   # Add shadcn space components & blocks (namespaces resolve via registry configuration)
   npx shadcn@latest add @shadcn-space/sidebar
   npx shadcn@latest add @shadcn-space/charts-component
   npx shadcn@latest add @shadcn-space/statistics-component
   npx shadcn@latest add @shadcn-space/forms
   npx shadcn@latest add @shadcn-space/marquee
   ```

---

## 2. Page Routing & Folder Structure

Structure the Next.js `src/app/` folder using App Router groups to isolate static SEO pages from dynamic dynamic functions and documents:

```
src/
├── app/
│   ├── (marketing)/                # Light Mode (Operator Focus)
│   │   ├── page.tsx                # Hero, Bento Grid, Micro-UI Snippets
│   │   ├── about/page.tsx          # ScaleERP origins, team bio
│   │   ├── pricing/page.tsx        # Basic/Pro/Enterprise tiers, contact sales CTA
│   │   ├── contact/page.tsx        # Customer Inquiry Lead Form (Submits to Supabase)
│   │   ├── terms/page.tsx          # Terms & Conditions
│   │   ├── privacy/page.tsx        # Privacy & Data protection details
│   │   └── product/
│   │       ├── layout.tsx
│   │       ├── all-features/page.tsx
│   │       ├── ledgers/page.tsx
│   │       └── comparison/page.tsx
│   │
│   ├── (resources)/                # Resource Blog Engine
│   │   └── resources/
│   │       ├── page.tsx            # Hub showing Bento cards reading from DB/MD
│   │       └── [slug]/page.tsx     # Dynamic blog renderer (reads content_md)
│   │
│   ├── (docs)/                     # Grandma-Standard User SOPs
│   │   └── docs/
│   │       ├── layout.tsx          # Sidebar category navigation + Search input
│   │       ├── page.tsx            # Redirects to 1-getting-started/installation-and-license
│   │       └── [category]/[slug]/page.tsx # SOP Markdown viewer
│   │
│   ├── (portal)/                   # Dark Mode Technical Guardians
│   │   ├── activate/page.tsx       # Air-gapped offline license QR resolver
│   │   └── layout.tsx
│   │
│   └── api/
│       └── v1/
│           ├── licensing/
│           │   ├── activate/route.ts      # Hardware binding & RSA signing
│           │   └── sync-heartbeat/route.ts # Clock check, tamper guard, auto-renew
│           ├── inquiries/route.ts         # Contact form lead storage
│           └── blogs/route.ts             # Blog JSON output
```

---

## 3. Brand Identity & Design System

Ensure strict enforcement of the **80/20 Brand Hierarchy** specified in `design.md`:

### 80% Core Focus: ScaleERP Operator Look (Light Mode)
* **Canvas background**: `#F8F9FA` or `#FFFFFF` (crisp white cards, clean panels).
* **Primary color**: Terracotta Earth (`#B4532B`). Use for primary CTA buttons, tabs, table header bands, and active states.
* **Secondary components**: Outlined terracotta borders (`border border-[#B4532B] text-[#B4532B] hover:bg-[#B4532B]/10`).
* **KPIs / Success indicators**: Ledger Green (`#10B981` or `#15803D`).
* **Typography**: Clean, high-legibility sans-serif (`Inter` or `Plus Jakarta Sans`). Tabular numbers for financial balances.

### 20% Accent Focus: ScaleERP Technical Look (Dark Mode)
* **Application Areas**: `/activate` (license files), licensing errors, security screens, and developer utilities.
* **Canvas background**: Deep Charcoal (`#121212` or `#1E293B`).
* **Primary color**: Electric Navy Blue (`#004B72`).
* **Typography**: Commanding headers use **`Bebas Neue`** (`tracking-wide fw-bold uppercase`). Body text uses **`Public Sans`** with monospaced font family for code blocks and raw JSON displays.

### Layout Elements
* **Bento Grids**: Layout features and value propositions in neat grid cards with subtle shadows (`shadow-sm`) and thin borders (`border border-gray-100`).
* **Micro-UI Snippets**: Place zoomed crops of specific UI elements (e.g. an "Active" badge, a "Print Bill" button, or an "Export Excel" checkbox) inside bento cards rather than full-page screenshots.

---

## 4. Supabase Database Schema

Run this SQL migration in your Supabase SQL Editor to set up the database tables:

```sql
-- Table 1: Customers
CREATE TABLE customers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    company_name TEXT,
    phone VARCHAR(20),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Table 2: 16-Digit License Keys
CREATE TABLE license_keys (
    key_code VARCHAR(19) PRIMARY KEY, -- Formatted as XXXX-XXXX-XXXX-XXXX
    customer_id UUID REFERENCES customers(id) ON DELETE CASCADE,
    edition TEXT NOT NULL CHECK (edition IN ('Basic', 'Pro', 'Enterprise')),
    max_devices INTEGER DEFAULT 1,
    active_devices INTEGER DEFAULT 0,
    valid_from TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    valid_until TIMESTAMP WITH TIME ZONE NOT NULL,
    maintenance_until TIMESTAMP WITH TIME ZONE NOT NULL,
    is_revoked BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Table 3: Active Device Fingerprints
CREATE TABLE device_activations (
    activation_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    key_code VARCHAR(19) REFERENCES license_keys(key_code) ON DELETE CASCADE,
    device_fingerprint TEXT NOT NULL,
    hostname TEXT,
    activated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    last_sync_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    license_blob TEXT NOT NULL,
    UNIQUE(key_code, device_fingerprint)
);

-- Table 4: Sync Logs & Tamper Verification
CREATE TABLE client_heartbeats (
    heartbeat_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    key_code VARCHAR(19) REFERENCES license_keys(key_code) ON DELETE CASCADE,
    device_fingerprint TEXT NOT NULL,
    client_system_time TIMESTAMP WITH TIME ZONE NOT NULL,
    server_recorded_time TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    reported_valid_until TIMESTAMP WITH TIME ZONE NOT NULL,
    reported_maintenance_until TIMESTAMP WITH TIME ZONE NOT NULL,
    is_tamper_flagged BOOLEAN DEFAULT FALSE,
    tamper_reason TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Table 5: Inquiries Leads (Contact Us / Book Demo)
CREATE TABLE customer_inquiries (
    inquiry_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    inquiry_type TEXT NOT NULL CHECK (inquiry_type IN ('CONTACT_US', 'BOOK_DEMO', 'SALES_ENTERPRISE')),
    name TEXT NOT NULL,
    email TEXT NOT NULL,
    phone VARCHAR(20),
    company_name TEXT,
    message TEXT NOT NULL,
    status TEXT DEFAULT 'NEW' CHECK (status IN ('NEW', 'IN_PROGRESS', 'RESOLVED', 'SPAM')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Table 6: Blogs (SEO Engine)
CREATE TABLE blogs (
    slug TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    meta_description TEXT NOT NULL,
    content_md TEXT NOT NULL,
    author TEXT NOT NULL,
    is_published BOOLEAN DEFAULT FALSE,
    published_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Table 7: Activation Logs
CREATE TABLE activation_logs (
    log_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    key_code VARCHAR(19),
    device_fingerprint TEXT,
    ip_address TEXT,
    status TEXT CHECK (status IN ('SUCCESS', 'FAILED_EXPIRED', 'FAILED_DEVICE_LIMIT', 'FAILED_INVALID_KEY', 'SECURITY_TAMPER_LOCK')),
    attempted_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

---

## 5. API Backend Implementation Details

Ensure the Vercel API routes are secure and strictly enforce logic limits. Use Next.js Route Handlers (`route.ts`).

### Environment Secrets Requirements
Store these safely in Vercel settings (never hardcode in commits):
* `SUPABASE_URL`: DB URL endpoint.
* `SUPABASE_SERVICE_ROLE_KEY`: Service role secret key (bypasses Row-Level Security for critical admin lookups).
* `RSA_PRIVATE_KEY`: Complete PEM-formatted 2048-bit RSA Private Key string.

### API 1: `POST /api/v1/licensing/activate`
* **Purpose**: Binds a new hardware fingerprint to an activation key and issues the RSA license.
* **Payload Verification**:
  1. Validate `activationKey` match format `^[A-Z0-9]{4}-[A-Z0-9]{4}-[A-Z0-9]{4}-[A-Z0-9]{4}$`.
  2. Query `license_keys` matching `key_code = activationKey`. Reject if `is_revoked` is true or `valid_until < NOW()`.
  3. Query `device_activations`. If the device fingerprint is new, confirm that `active_devices < max_devices` on the license key. Increment `active_devices` by 1.
  4. Build the JSON payload to sign:
     ```json
     {
       "license_id": "device_activations.activation_id",
       "customer_id": "license_keys.customer_id",
       "edition": "license_keys.edition",
       "valid_from": "license_keys.valid_from",
       "valid_until": "license_keys.valid_until",
       "maintenance_until": "license_keys.maintenance_until",
       "device_fingerprint": "deviceFingerprint"
     }
     ```
  5. Sign the payload using `crypto.sign('SHA256', Buffer.from(payloadString), privateKey)`.
  6. Package into an envelope: `const envelope = { payload: payloadString, signature: signature.toString('base64'), key_id: "key_001" }`.
  7. Write `license_blob` (Base64 stringified envelope) to `device_activations`.
  8. Return the signed blob, expiration dates, and active edition in the response.

### API 2: `POST /api/v1/licensing/sync-heartbeat` (Anti-Tamper & Auto-Renew)
* **Purpose**: Periodically pinged by online client machines. Synchronizes date renewals and enforces clock Rewind guards.
* **Validation Logic**:
  1. Compare local database dates reported in the payload (`localDatabaseState.reportedValidUntil`, `reportedMaintenanceUntil`) against values in Supabase (`license_keys.valid_until`, `maintenance_until`).
  2. **Rule 1: Supabase Priority (Auto-Renew)**:
     If the Vercel/Supabase DB dates are *later* than client-reported dates (e.g. administrator manually renewed the license duration on the backend), generate a freshly signed RSA license blob and return it with `isLicenseUpdated: true` and the `updatedLicenseBlob`.
  3. **Rule 2: Anti-Tamper Block**:
     If client-reported dates are *later* than Supabase dates (i.e. user manually edited their local SQLite db parameters to bypass expiry), set `is_tamper_flagged = true` with reason `"LOCAL_DATABASE_ALTERED"`, insert into logs, and return `securityLockout: true`.
  4. **Rule 3: Clock Rewind Check**:
     If `clientSystemTime` is earlier than the server time by more than 24 hours (i.e., user set back system clock to run expired app), flag `is_tamper_flagged = true`, log the lockout, and return `securityLockout: true`.
  5. If normal, update `last_sync_at` to `NOW()`.

---

## 6. Air-Gapped QR Activation Page (`/activate`)

Implement `/activate/page.tsx` as a sleek dark mode technical portal (`Neutral Dark` background with `Electric Navy` and code-styling borders):
* **Inputs**: Searchable query parameter `?fp=hash` (read from scanning client-side QR codes). If query fingerprint is missing, show an empty device fingerprint input field alongside a 16-digit license key input field.
* **Submit Action**: Submits inputs to the Vercel `/api/v1/licensing/activate` API.
* **Response Output**: On success, trigger an browser file download of `scaleerp.lic` containing the raw signed license envelope string.
* **Operator Help**: Display clear visual steps in Grandma Standard:
  1. *“Insert a clean USB Flash Drive or connect your smartphone via Bluetooth to this phone.”*
  2. *“Save the downloaded `scaleerp.lic` file onto your drive.”*
  3. *“Connect the USB Drive to your offline computer, open the ScaleERP desktop app, click 'Import License file', and select this file to unlock your store.”*

---

## 7. SEO Content & Docs Rendering Portal

### SEO Blog Engine (`/resources`)
* Render article previews using the **Resource Hub Card component**:
  * Clean image thumbnail.
  * Tag Pill containing the guide classification (e.g., `[Inventory]`, `[Brokerage]`).
  * Concise title and 1-2 sentence meta summary.
  * Published date.
* Fetch article lists and content details from the `blogs` database table. Ensure markdown formatting renders using `@tailwindcss/typography` (`prose prose-orange`) to maintain consistent line-heights and code blocks.

### Step-by-Step SOP Portal (`/docs`)
* Fetch static markdown articles under `/website-structure/docs/` dynamically or pre-render them statically during the Next.js build step.
* Build a sticky sidebar listing the 7 major folders as expandable category panels.
* Implement a client-side search bar at the top of the sidebar. As the operator types (e.g. *“delete”* or *“UPI”*), filter matching guides dynamically.
* Under each article header, insert a clean "Screenshot Placeholder" container (`border border-dashed border-gray-300 rounded-lg p-6 bg-gray-50 flex items-center justify-center`) displaying the descriptive screenshot text to inform builders where to place interface asset images.
* Adhere strictly to the **Grandma Standard**: Keep syntax plain, list exact button text labels, and prevent any exposure of Developer Dashboard diagnostic options.
