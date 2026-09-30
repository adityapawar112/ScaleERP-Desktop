-- Database schema for Inventory Management System
-- Compatible with better-sqlite3 and SQLite 3.35+

-- Enable foreign keys
PRAGMA foreign_keys = ON;

-- Performance optimizations
PRAGMA journal_mode = WAL;
PRAGMA synchronous = NORMAL;
PRAGMA cache_size = 10000;
PRAGMA temp_store = MEMORY;
PRAGMA mmap_size = 268435456;

-- ===========================================
-- CORE ENTITIES
-- ===========================================

-- Products table
CREATE TABLE IF NOT EXISTS products (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT,
    price REAL DEFAULT 0,
    stock_quantity INTEGER DEFAULT 0,
    is_archived BOOLEAN DEFAULT FALSE,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Product manufacturers/stock levels
CREATE TABLE IF NOT EXISTS product_manufacturers (
    id TEXT PRIMARY KEY,
    product_id TEXT NOT NULL,
    manufacturer_id TEXT NOT NULL,
    manufacturer_name TEXT NOT NULL,
    quantity INTEGER DEFAULT 0,
    is_archived BOOLEAN DEFAULT FALSE,
    FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE,
    UNIQUE(product_id, manufacturer_id)
);

-- Stock history with full audit trail
CREATE TABLE IF NOT EXISTS stock_history (
    id TEXT PRIMARY KEY,
    product_id TEXT NOT NULL,
    date TEXT NOT NULL,
    time TEXT,
    type TEXT CHECK(type IN ('in', 'out')) NOT NULL,
    quantity INTEGER NOT NULL,
    notes TEXT,
    broker_id TEXT,
    manufacturer_id TEXT,
    transaction_id TEXT,
    leisure_created BOOLEAN DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE
);

-- Brokers (suppliers)
CREATE TABLE IF NOT EXISTS brokers (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    contact TEXT,
    address TEXT,
    total_pending REAL DEFAULT 0,
    total_paid REAL DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Customers
CREATE TABLE IF NOT EXISTS customers (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    contact TEXT,
    address TEXT,
    total_pending REAL DEFAULT 0,
    total_paid REAL DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- ===========================================
-- TRANSACTIONS
-- ===========================================

-- Broker transactions (purchases from suppliers)
CREATE TABLE IF NOT EXISTS broker_transactions (
    id TEXT PRIMARY KEY,
    broker_id TEXT NOT NULL,
    date TEXT NOT NULL,
    time TEXT,
    invoice_number TEXT,
    total_amount REAL NOT NULL,
    total_brokerage REAL DEFAULT 0,
    previous_balance REAL DEFAULT 0,
    payment_method TEXT CHECK(payment_method IN ('UPI', 'cash')) DEFAULT 'cash',
    notes TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (broker_id) REFERENCES brokers(id) ON DELETE CASCADE
);

-- Broker transaction products (many-to-many relationship)
CREATE TABLE IF NOT EXISTS broker_transaction_products (
    id TEXT PRIMARY KEY,
    transaction_id TEXT NOT NULL,
    product_id TEXT NOT NULL,
    manufacturer_id TEXT NOT NULL,
    units INTEGER NOT NULL,
    unit_type TEXT CHECK(unit_type IN ('tonnes', 'units')) DEFAULT 'units',
    rate REAL NOT NULL,
    brokerage_per_unit REAL DEFAULT 0,
    brokerage REAL DEFAULT 0,
    total REAL NOT NULL,
    FOREIGN KEY (transaction_id) REFERENCES broker_transactions(id) ON DELETE CASCADE,
    FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE
);

-- Customer transactions (sales to customers)
CREATE TABLE IF NOT EXISTS customer_transactions (
    id TEXT PRIMARY KEY,
    customer_id TEXT,
    date TEXT NOT NULL,
    time TEXT,
    invoice_number TEXT,
    total_amount REAL NOT NULL,
    labour_charge REAL DEFAULT 0,
    previous_balance REAL DEFAULT 0,
    payment_method TEXT CHECK(payment_method IN ('UPI', 'cash')) DEFAULT 'cash',
    notes TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE SET NULL
);

-- Customer transaction products (many-to-many relationship)
CREATE TABLE IF NOT EXISTS customer_transaction_products (
    id TEXT PRIMARY KEY,
    transaction_id TEXT NOT NULL,
    product_id TEXT NOT NULL,
    manufacturer_id TEXT NOT NULL,
    quantity INTEGER NOT NULL,
    unit_type TEXT CHECK(unit_type IN ('tonnes', 'units')) DEFAULT 'units',
    price REAL NOT NULL,
    labour REAL DEFAULT 0,
    total REAL NOT NULL,
    FOREIGN KEY (transaction_id) REFERENCES customer_transactions(id) ON DELETE CASCADE,
    FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE
);

-- ===========================================
-- PAYMENTS & LEISURES
-- ===========================================

-- Broker leisures (supplier payments)
CREATE TABLE IF NOT EXISTS broker_leisures (
    id TEXT PRIMARY KEY,
    broker_id TEXT NOT NULL,
    broker_name TEXT NOT NULL,
    type TEXT CHECK(type IN ('purchase', 'payable')) NOT NULL,
    amount REAL NOT NULL,
    brokerage REAL DEFAULT 0,
    transaction_id TEXT,
    payment_method TEXT CHECK(payment_method IN ('UPI', 'Cash')),
    date TEXT NOT NULL,
    time TEXT,
    notes TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (broker_id) REFERENCES brokers(id) ON DELETE CASCADE,
    FOREIGN KEY (transaction_id) REFERENCES broker_transactions(id) ON DELETE SET NULL
);

-- Customer leisures (customer payments)
CREATE TABLE IF NOT EXISTS customer_leisures (
    id TEXT PRIMARY KEY,
    customer_id TEXT NOT NULL,
    customer_name TEXT NOT NULL,
    type TEXT CHECK(type IN ('receivable', 'sale')) NOT NULL,
    amount REAL NOT NULL,
    transaction_id TEXT,
    payment_method TEXT CHECK(payment_method IN ('UPI', 'Cash')),
    date TEXT NOT NULL,
    time TEXT,
    notes TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE CASCADE,
    FOREIGN KEY (transaction_id) REFERENCES customer_transactions(id) ON DELETE SET NULL
);

-- ===========================================
-- SETTINGS & CONFIGURATION
-- ===========================================

-- Business settings
CREATE TABLE IF NOT EXISTS business_settings (
    id INTEGER PRIMARY KEY CHECK (id = 1), -- Only one row allowed
    business_name TEXT,
    address TEXT,
    proprietor_name TEXT,
    phone_numbers TEXT, -- JSON array stored as text
    invoice_whatsapp_template TEXT DEFAULT 'Tax Invoice for {partyName} dated {dateStr}',
    logo_path TEXT,
    header_banner_path TEXT,
    qr_code_path TEXT,
    default_invoice_template TEXT DEFAULT 'standard_a4',
    invoice_accent_color TEXT DEFAULT '#2563eb',
    print_copies INTEGER DEFAULT 1,
    print_layout_mode TEXT DEFAULT 'single',
    custom_footer_text TEXT,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- ===========================================
-- INDEXES FOR PERFORMANCE
-- ===========================================

-- Core entity indexes
CREATE INDEX IF NOT EXISTS idx_products_name ON products(name);
CREATE INDEX IF NOT EXISTS idx_brokers_name ON brokers(name);
CREATE INDEX IF NOT EXISTS idx_customers_name ON customers(name);

-- Transaction indexes
CREATE INDEX IF NOT EXISTS idx_broker_transactions_broker_date ON broker_transactions(broker_id, date DESC);
CREATE INDEX IF NOT EXISTS idx_broker_transactions_date ON broker_transactions(date DESC);
CREATE INDEX IF NOT EXISTS idx_customer_transactions_customer_date ON customer_transactions(customer_id, date DESC);
CREATE INDEX IF NOT EXISTS idx_customer_transactions_date ON customer_transactions(date DESC);

-- Transaction product indexes
CREATE INDEX IF NOT EXISTS idx_broker_tx_products_tx ON broker_transaction_products(transaction_id);
CREATE INDEX IF NOT EXISTS idx_broker_tx_products_product ON broker_transaction_products(product_id);
CREATE INDEX IF NOT EXISTS idx_customer_tx_products_tx ON customer_transaction_products(transaction_id);
CREATE INDEX IF NOT EXISTS idx_customer_tx_products_product ON customer_transaction_products(product_id);

-- Leisure indexes
CREATE INDEX IF NOT EXISTS idx_broker_leisures_broker_date ON broker_leisures(broker_id, date DESC);
CREATE INDEX IF NOT EXISTS idx_customer_leisures_customer_date ON customer_leisures(customer_id, date DESC);

-- Stock history indexes
CREATE INDEX IF NOT EXISTS idx_stock_history_product_date ON stock_history(product_id, date DESC);
CREATE INDEX IF NOT EXISTS idx_stock_history_type_date ON stock_history(type, date DESC);

-- Product manufacturer indexes
CREATE INDEX IF NOT EXISTS idx_product_manufacturers_product ON product_manufacturers(product_id);
CREATE INDEX IF NOT EXISTS idx_product_manufacturers_manufacturer ON product_manufacturers(manufacturer_id);

-- ===========================================
-- FULL-TEXT SEARCH TABLES
-- ===========================================

-- FTS5 virtual table for products
CREATE VIRTUAL TABLE IF NOT EXISTS products_fts USING fts5(
    name, description,
    content=products,
    content_rowid=rowid
);

-- FTS5 virtual table for brokers
CREATE VIRTUAL TABLE IF NOT EXISTS brokers_fts USING fts5(
    name, contact, address,
    content=brokers,
    content_rowid=rowid
);

-- FTS5 virtual table for customers
CREATE VIRTUAL TABLE IF NOT EXISTS customers_fts USING fts5(
    name, contact, address,
    content=customers,
    content_rowid=rowid
);

-- ===========================================
-- TRIGGERS FOR FTS SYNC
-- ===========================================

-- Products FTS triggers
CREATE TRIGGER IF NOT EXISTS products_fts_insert AFTER INSERT ON products
BEGIN
    INSERT INTO products_fts(rowid, name, description)
    VALUES (new.rowid, new.name, new.description);
END;

CREATE TRIGGER IF NOT EXISTS products_fts_delete AFTER DELETE ON products
BEGIN
    DELETE FROM products_fts WHERE rowid = old.rowid;
END;

CREATE TRIGGER IF NOT EXISTS products_fts_update AFTER UPDATE ON products
BEGIN
    UPDATE products_fts SET name = new.name, description = new.description
    WHERE rowid = new.rowid;
END;

-- Brokers FTS triggers
CREATE TRIGGER IF NOT EXISTS brokers_fts_insert AFTER INSERT ON brokers
BEGIN
    INSERT INTO brokers_fts(rowid, name, contact, address)
    VALUES (new.rowid, new.name, new.contact, new.address);
END;

CREATE TRIGGER IF NOT EXISTS brokers_fts_delete AFTER DELETE ON brokers
BEGIN
    DELETE FROM brokers_fts WHERE rowid = old.rowid;
END;

CREATE TRIGGER IF NOT EXISTS brokers_fts_update AFTER UPDATE ON brokers
BEGIN
    UPDATE brokers_fts SET name = new.name, contact = new.contact, address = new.address
    WHERE rowid = new.rowid;
END;

-- Customers FTS triggers
CREATE TRIGGER IF NOT EXISTS customers_fts_insert AFTER INSERT ON customers
BEGIN
    INSERT INTO customers_fts(rowid, name, contact, address)
    VALUES (new.rowid, new.name, new.contact, new.address);
END;

CREATE TRIGGER IF NOT EXISTS customers_fts_delete AFTER DELETE ON customers
BEGIN
    DELETE FROM customers_fts WHERE rowid = old.rowid;
END;

CREATE TRIGGER IF NOT EXISTS customers_fts_update AFTER UPDATE ON customers
BEGIN
    UPDATE customers_fts SET name = new.name, contact = new.contact, address = new.address
    WHERE rowid = new.rowid;
END;

-- ===========================================
-- VIEWS FOR COMMON QUERIES
-- ===========================================

-- View for product stock summary
CREATE VIEW IF NOT EXISTS product_stock_summary AS
SELECT
    p.id,
    p.name,
    p.stock_quantity as total_stock,
    COUNT(pm.manufacturer_id) as manufacturer_count,
    SUM(pm.quantity) as calculated_stock,
    GROUP_CONCAT(pm.manufacturer_name || ': ' || pm.quantity, '; ') as manufacturer_breakdown
FROM products p
LEFT JOIN product_manufacturers pm ON p.id = pm.product_id
GROUP BY p.id, p.name, p.stock_quantity;

-- View for broker transaction summary
CREATE VIEW IF NOT EXISTS broker_transaction_summary AS
SELECT
    bt.id,
    bt.broker_id,
    b.name as broker_name,
    bt.date,
    bt.time,
    bt.invoice_number,
    bt.total_amount,
    bt.total_brokerage,
    bt.previous_balance,
    bt.payment_method,
    COUNT(btp.id) as product_count,
    GROUP_CONCAT(p.name || ' (' || btp.units || ' ' || btp.unit_type || ')', ', ') as products
FROM broker_transactions bt
JOIN brokers b ON bt.broker_id = b.id
LEFT JOIN broker_transaction_products btp ON bt.id = btp.transaction_id
LEFT JOIN products p ON btp.product_id = p.id
GROUP BY bt.id, bt.broker_id, b.name, bt.date, bt.time, bt.invoice_number, bt.total_amount, bt.total_brokerage, bt.previous_balance, bt.payment_method;

-- View for customer transaction summary
CREATE VIEW IF NOT EXISTS customer_transaction_summary AS
SELECT
    ct.id,
    ct.customer_id,
    c.name as customer_name,
    ct.date,
    ct.time,
    ct.invoice_number,
    ct.total_amount,
    ct.labour_charge,
    ct.previous_balance,
    ct.payment_method,
    COUNT(ctp.id) as product_count,
    GROUP_CONCAT(p.name || ' (' || ctp.quantity || ' ' || ctp.unit_type || ')', ', ') as products
FROM customer_transactions ct
LEFT JOIN customers c ON ct.customer_id = c.id
LEFT JOIN customer_transaction_products ctp ON ct.id = ctp.transaction_id
LEFT JOIN products p ON ctp.product_id = p.id
GROUP BY ct.id, ct.customer_id, c.name, ct.date, ct.time, ct.invoice_number, ct.total_amount, ct.labour_charge, ct.previous_balance, ct.payment_method;

-- ===========================================
-- INITIAL DATA SEEDING
-- ===========================================

-- Insert default business settings if not exists
INSERT OR IGNORE INTO business_settings (id, business_name, phone_numbers)
VALUES (1, '', '[""]');

-- ===========================================
-- LICENSING SYSTEM SCHEMA
-- ===========================================

-- License Customers (separate from business customers)
CREATE TABLE IF NOT EXISTS license_customers (
    customer_id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    email TEXT,
    company TEXT,
    status TEXT CHECK(status IN ('active', 'suspended', 'expired')) DEFAULT 'active',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- License Policies (reusable templates)
CREATE TABLE IF NOT EXISTS license_policies (
    policy_id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    license_type TEXT CHECK(license_type IN ('trial', 'subscription', 'perpetual')) DEFAULT 'subscription',
    duration_days INTEGER DEFAULT 365,
    maintenance_days INTEGER DEFAULT 90,
    max_devices INTEGER DEFAULT 1,
    features_json TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Issued license instances
CREATE TABLE IF NOT EXISTS licenses (
    license_id TEXT PRIMARY KEY,
    customer_id TEXT NOT NULL,
    policy_id TEXT NOT NULL,
    status TEXT CHECK(status IN ('active', 'expired', 'revoked', 'renewed')) DEFAULT 'active',
    edition TEXT CHECK(edition IN ('Basic', 'Pro', 'Enterprise')) DEFAULT 'Pro',
    valid_from TEXT NOT NULL,
    valid_until TEXT NOT NULL,
    maintenance_until TEXT NOT NULL,
    device_fingerprint TEXT,
    license_blob TEXT NOT NULL,
    grace_until TEXT,
    grace_mode TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (customer_id) REFERENCES license_customers(customer_id),
    FOREIGN KEY (policy_id) REFERENCES license_policies(policy_id)
);

-- Application users linked to licenses
CREATE TABLE IF NOT EXISTS users (
    user_id TEXT PRIMARY KEY,
    username TEXT NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    license_id TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    last_login DATETIME,
    locked_out BOOLEAN DEFAULT 0,
    failed_attempts INTEGER DEFAULT 0,
    max_failed_attempts INTEGER DEFAULT 5,
    FOREIGN KEY (license_id) REFERENCES licenses(license_id),
    CHECK (failed_attempts >= 0),
    CHECK (max_failed_attempts >= 1)
);

-- FTS5 virtual table for users username search
CREATE VIRTUAL TABLE IF NOT EXISTS users_fts USING fts5(
    username,
    content=users,
    content_rowid=rowid
);

CREATE TRIGGER IF NOT EXISTS users_fts_insert AFTER INSERT ON users
BEGIN
    INSERT INTO users_fts(rowid, username)
    VALUES (new.rowid, new.username);
END;

CREATE TRIGGER IF NOT EXISTS users_fts_delete AFTER DELETE ON users
BEGIN
    INSERT INTO users_fts(users_fts, rowid, username)
    VALUES ('delete', old.rowid, old.username);
END;

CREATE TRIGGER IF NOT EXISTS users_fts_update AFTER UPDATE ON users
BEGIN
    INSERT INTO users_fts(users_fts, rowid, username)
    VALUES ('delete', old.rowid, old.username);
    INSERT INTO users_fts(rowid, username)
    VALUES (new.rowid, new.username);
END;

-- Append-only license audit log
CREATE TABLE IF NOT EXISTS license_events (
    event_id TEXT PRIMARY KEY,
    license_id TEXT,
    event_type TEXT NOT NULL,
    event_data TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (license_id) REFERENCES licenses(license_id)
);

-- Password reset tokens (hash-based option)
CREATE TABLE IF NOT EXISTS password_reset_tokens (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    token_hash TEXT NOT NULL,
    issued_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    expires_at DATETIME NOT NULL,
    used BOOLEAN DEFAULT 0,
    used_at DATETIME
);

-- Used reset nonces (vendor-signed code option)
CREATE TABLE IF NOT EXISTS used_reset_nonces (
    nonce TEXT PRIMARY KEY,
    license_id TEXT NOT NULL,
    user_id TEXT NOT NULL,
    used_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (license_id) REFERENCES licenses(license_id)
);

-- License heartbeats for clock tamper detection
CREATE TABLE IF NOT EXISTS license_heartbeats (
    id TEXT PRIMARY KEY,
    license_id TEXT NOT NULL,
    checked_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    system_time_iso TEXT NOT NULL,
    reason TEXT,
    metadata TEXT,
    FOREIGN KEY (license_id) REFERENCES licenses(license_id)
);

-- Clock override tokens for support recovery
CREATE TABLE IF NOT EXISTS clock_override_tokens (
    token_id TEXT PRIMARY KEY,
    license_id TEXT NOT NULL,
    issued_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    expires_at DATETIME NOT NULL,
    nonce TEXT NOT NULL,
    used_at DATETIME,
    FOREIGN KEY (license_id) REFERENCES licenses(license_id)
);

CREATE INDEX IF NOT EXISTS idx_licenses_customer ON licenses(customer_id);
CREATE INDEX IF NOT EXISTS idx_licenses_status ON licenses(status);
CREATE INDEX IF NOT EXISTS idx_licenses_valid_until ON licenses(valid_until);
CREATE INDEX IF NOT EXISTS idx_users_license ON users(license_id);
CREATE INDEX IF NOT EXISTS idx_users_locked_out ON users(locked_out);
CREATE INDEX IF NOT EXISTS idx_license_events_license ON license_events(license_id);
CREATE INDEX IF NOT EXISTS idx_license_events_type ON license_events(event_type);
CREATE INDEX IF NOT EXISTS idx_license_heartbeats_license ON license_heartbeats(license_id);
CREATE INDEX IF NOT EXISTS idx_license_heartbeats_checked ON license_heartbeats(checked_at);

CREATE TRIGGER IF NOT EXISTS license_status_change AFTER UPDATE OF status ON licenses
BEGIN
    INSERT INTO license_events (event_id, license_id, event_type, event_data, created_at)
    VALUES (
        lower(hex(randomblob(16))),
        NEW.license_id,
        'status_changed',
        json_object('old_status', OLD.status, 'new_status', NEW.status),
        CURRENT_TIMESTAMP
    );
END;

CREATE TRIGGER IF NOT EXISTS license_update_audit AFTER UPDATE ON licenses
BEGIN
    INSERT INTO license_events (event_id, license_id, event_type, event_data, created_at)
    VALUES (
        lower(hex(randomblob(16))),
        NEW.license_id,
        'license_updated',
        json_object('valid_until', NEW.valid_until, 'maintenance_until', NEW.maintenance_until),
        CURRENT_TIMESTAMP
    );
END;

INSERT OR IGNORE INTO license_policies (policy_id, name, license_type, duration_days, maintenance_days, max_devices, features_json)
VALUES (
    'annual-pro-1yr-90d',
    'Annual Pro - 1 Year / 90 Day Maintenance',
    'subscription',
    365,
    90,
    1,
    '{"inventory": true, "reports": true, "multi_user": false, "api_access": false}'
);

INSERT OR IGNORE INTO license_policies (policy_id, name, license_type, duration_days, maintenance_days, max_devices, features_json)
VALUES (
    'trial-14d',
    'Trial - 14 Days',
    'trial',
    14,
    14,
    1,
    '{"inventory": true, "reports": true, "export": false}'
);

-- ===========================================
-- ARCHIVING SYSTEM COLUMNS
-- ===========================================

-- Note: is_archived columns are now defined directly in table schemas above

-- Create indexes for archiving performance
CREATE INDEX IF NOT EXISTS idx_products_is_archived ON products(is_archived);
CREATE INDEX IF NOT EXISTS idx_product_manufacturers_is_archived ON product_manufacturers(is_archived);

-- ===========================================
-- BACKUP SYSTEM TABLES
-- ===========================================

-- Backup settings and history
CREATE TABLE IF NOT EXISTS backup_settings (
    id INTEGER PRIMARY KEY CHECK (id = 1), -- Only one row allowed
    auto_backup_enabled BOOLEAN DEFAULT 1,
    backup_frequency TEXT CHECK(backup_frequency IN ('daily', 'weekly', 'monthly')) DEFAULT 'weekly',
    backup_location TEXT NOT NULL,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Backup history log
CREATE TABLE IF NOT EXISTS backup_history (
    id TEXT PRIMARY KEY,
    timestamp TEXT NOT NULL,
    type TEXT CHECK(type IN ('auto', 'manual', 'pre_operation', 'pre_restore')) NOT NULL,
    path TEXT NOT NULL,
    size_bytes INTEGER,
    success BOOLEAN DEFAULT 1,
    error_message TEXT,
    frequency_type TEXT,  -- Store the frequency type for retention logic
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- ===========================================
-- INITIAL BACKUP SETTINGS SEEDING
-- ===========================================

-- ===========================================
-- WHATSAPP PRESETS
-- ===========================================

-- WhatsApp message presets
CREATE TABLE IF NOT EXISTS whatsapp_presets (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Insert default backup settings if not exists
INSERT OR IGNORE INTO backup_settings (id, auto_backup_enabled, backup_frequency, backup_location)
VALUES (1, 1, 'weekly', '');

-- ===========================================
-- CLOUD STORAGE TABLES
-- ===========================================

-- Cloud storage settings (Google Drive, etc.)
CREATE TABLE IF NOT EXISTS cloud_storage_settings (
    id INTEGER PRIMARY KEY CHECK (id = 1),
    provider TEXT NOT NULL DEFAULT 'google_drive',
    folder_id TEXT,
    account_email TEXT,
    auto_upload_enabled BOOLEAN DEFAULT 0,
    storage_encryption_status TEXT DEFAULT 'unknown',
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Cloud storage upload queue
CREATE TABLE IF NOT EXISTS cloud_storage_queue (
    id TEXT PRIMARY KEY,
    file_path TEXT NOT NULL,
    checksum TEXT NOT NULL,
    status TEXT CHECK(status IN ('pending', 'uploading', 'completed', 'failed')) DEFAULT 'pending',
    attempt_count INTEGER DEFAULT 0,
    next_retry_at DATETIME,
    last_error TEXT,
    drive_file_id TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Insert default cloud storage settings
INSERT OR IGNORE INTO cloud_storage_settings (id, provider, auto_upload_enabled)
VALUES (1, 'google_drive', 0);

