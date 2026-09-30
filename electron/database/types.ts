/**
 * Database Type Definitions
 * Comprehensive TypeScript interfaces for all database entities
 */

// ===========================================
// BASE TYPES
// ===========================================

export interface BaseEntity {
  id: string;
  created_at: string;
  updated_at: string;
}

export interface DatabaseStats {
  products: { count: number };
  brokers: { count: number };
  customers: { count: number };
  brokerTransactions: { count: number };
  customerTransactions: { count: number };
  brokerLeisures: { count: number };
  customerLeisures: { count: number };
  stockHistory: { count: number };
  productManufacturers?: { count: number };
  businessSettings?: { count: number };
}

// ===========================================
// PRODUCT TYPES
// ===========================================

export interface Product extends BaseEntity {
  name: string;
  description?: string;
  price?: number;
  stock_quantity?: number;
}

export interface ProductInsert {
  id: string;
  name: string;
  description?: string;
  price?: number;
  stock_quantity?: number;
}

export interface ProductUpdate {
  name?: string;
  description?: string;
  price?: number;
  stock_quantity?: number;
}

// ===========================================
// BROKER TYPES
// ===========================================

export interface Broker extends BaseEntity {
  name: string;
  contact?: string;
  address?: string;
  total_pending?: number;
  total_paid?: number;
}

export interface BrokerInsert {
  id: string;
  name: string;
  contact?: string;
  address?: string;
  total_pending?: number;
  total_paid?: number;
}

export interface BrokerUpdate {
  name?: string;
  contact?: string;
  address?: string;
  total_pending?: number;
  total_paid?: number;
}

// ===========================================
// CUSTOMER TYPES
// ===========================================

export interface Customer extends BaseEntity {
  name: string;
  contact?: string;
  address?: string;
  total_pending?: number;
  total_paid?: number;
}

export interface CustomerInsert {
  id: string;
  name: string;
  contact?: string;
  address?: string;
  total_pending?: number;
  total_paid?: number;
}

export interface CustomerUpdate {
  name?: string;
  contact?: string;
  address?: string;
  total_pending?: number;
  total_paid?: number;
}

// ===========================================
// TRANSACTION TYPES
// ===========================================

export interface BrokerTransactionProduct {
  id: string;
  product_id: string;
  manufacturer_id: string;
  units: number;
  unit_type: string;
  rate: number;
  brokerage_per_unit?: number;
  brokerage?: number;
  total: number;
}

export interface BrokerTransaction extends BaseEntity {
  broker_id: string;
  date: string;
  time?: string;
  invoice_number?: string;
  total_amount: number;
  total_brokerage?: number;
  previous_balance?: number;
  payment_method?: string;
  notes?: string;
  products?: BrokerTransactionProduct[];
}

export interface BrokerTransactionInsert {
  id: string;
  broker_id: string;
  date: string;
  time?: string;
  invoice_number?: string;
  total_amount: number;
  total_brokerage?: number;
  previous_balance?: number;
  payment_method?: string;
  notes?: string;
  products?: BrokerTransactionProduct[];
}

export interface BrokerTransactionUpdate {
  broker_id?: string;
  date?: string;
  time?: string;
  invoice_number?: string;
  total_amount?: number;
  total_brokerage?: number;
  previous_balance?: number;
  payment_method?: string;
  notes?: string;
}

export interface CustomerTransactionProduct {
  id: string;
  product_id: string;
  manufacturer_id: string;
  quantity: number;
  unit_type: string;
  price: number;
  labour: number;
  total: number;
}

export interface CustomerTransaction extends BaseEntity {
  customer_id?: string;
  date: string;
  time?: string;
  invoice_number?: string;
  total_amount: number;
  labour_charge?: number;
  previous_balance?: number;
  payment_method?: string;
  notes?: string;
  products?: CustomerTransactionProduct[];
}

export interface CustomerTransactionInsert {
  id: string;
  customer_id?: string;
  date: string;
  time?: string;
  invoice_number?: string;
  total_amount: number;
  labour_charge?: number;
  previous_balance?: number;
  payment_method?: string;
  notes?: string;
  products?: CustomerTransactionProduct[];
}

export interface CustomerTransactionUpdate {
  customer_id?: string;
  date?: string;
  time?: string;
  invoice_number?: string;
  total_amount?: number;
  labour_charge?: number;
  previous_balance?: number;
  payment_method?: string;
  notes?: string;
}

// ===========================================
// LEISURE (PAYMENT) TYPES
// ===========================================

export interface BrokerLeisure extends BaseEntity {
  broker_id: string;
  broker_name: string;
  type: 'purchase' | 'payable';
  amount: number;
  brokerage?: number;
  transaction_id?: string;
  payment_method?: string;
  date: string;
  time?: string;
  notes?: string;
}

export interface BrokerLeisureInsert {
  id: string;
  broker_id: string;
  broker_name: string;
  type: 'purchase' | 'payable';
  amount: number;
  brokerage?: number;
  transaction_id?: string;
  payment_method?: string;
  date: string;
  time?: string;
  notes?: string;
}

export interface BrokerLeisureUpdate {
  broker_id?: string;
  broker_name?: string;
  type?: 'purchase' | 'payable';
  amount?: number;
  brokerage?: number;
  transaction_id?: string;
  payment_method?: string;
  date?: string;
  time?: string;
  notes?: string;
}

export interface CustomerLeisure extends BaseEntity {
  customer_id: string;
  customer_name: string;
  type: 'receivable' | 'sale';
  amount: number;
  transaction_id?: string;
  payment_method?: string;
  date: string;
  time?: string;
  notes?: string;
}

export interface CustomerLeisureInsert {
  id: string;
  customer_id: string;
  customer_name: string;
  type: 'receivable' | 'sale';
  amount: number;
  transaction_id?: string;
  payment_method?: string;
  date: string;
  time?: string;
  notes?: string;
}

export interface CustomerLeisureUpdate {
  customer_id?: string;
  customer_name?: string;
  type?: 'receivable' | 'sale';
  amount?: number;
  transaction_id?: string;
  payment_method?: string;
  date?: string;
  time?: string;
  notes?: string;
}

// ===========================================
// STOCK HISTORY TYPES
// ===========================================

export interface StockHistory extends BaseEntity {
  product_id: string;
  date: string;
  time?: string;
  type: 'in' | 'out';
  quantity: number;
  notes?: string;
  broker_id?: string;
  manufacturer_id?: string;
  leisure_created?: boolean;
}

export interface StockHistoryInsert {
  product_id: string;
  date: string;
  time?: string;
  type: 'in' | 'out';
  quantity: number;
  notes?: string;
  broker_id?: string;
  manufacturer_id?: string;
  leisure_created?: boolean;
}

export interface StockHistoryUpdate {
  product_id?: string;
  date?: string;
  time?: string;
  type?: 'in' | 'out';
  quantity?: number;
  notes?: string;
  broker_id?: string;
  manufacturer_id?: string;
  leisure_created?: boolean;
}

// ===========================================
// PRODUCT MANUFACTURERS TYPES
// ===========================================

export interface ProductManufacturer {
  id: string;
  product_id: string;
  manufacturer_id: string;
  manufacturer_name: string;
  quantity: number;
}

export interface ProductManufacturerInsert {
  id: string;
  product_id: string;
  manufacturer_id: string;
  manufacturer_name: string;
  quantity: number;
}

export interface ProductManufacturerUpdate {
  product_id?: string;
  manufacturer_id?: string;
  manufacturer_name?: string;
  quantity?: number;
}


// ===========================================
// UTILITY TYPES
// ===========================================

export type PaymentMethod = 'cash' | 'card' | 'bank_transfer' | 'cheque' | 'upi' | 'other';

export type UnitType = 'kg' | 'gram' | 'ton' | 'piece' | 'box' | 'bag' | 'liter' | 'meter' | 'other';

export type BrokerLeisureType = 'purchase' | 'payable';
export type CustomerLeisureType = 'receivable' | 'sale';

// ===========================================
// DATABASE OPERATION RESULTS
// ===========================================

export interface DatabaseOperationResult {
  changes?: number;
  lastID?: number;
  id?: string;
}

export interface DatabaseQueryResult<T> {
  data?: T;
  error?: string;
}

// ===========================================
// IPC CHANNEL TYPES
// ===========================================

export type DatabaseIPCChannels =
  // Products
  | 'db:products:getAll'
  | 'db:products:getById'
  | 'db:products:insert'
  | 'db:products:update'
  | 'db:products:delete'

  // Brokers
  | 'db:brokers:getAll'
  | 'db:brokers:getById'
  | 'db:brokers:insert'
  | 'db:brokers:update'
  | 'db:brokers:delete'

  // Customers
  | 'db:customers:getAll'
  | 'db:customers:getById'
  | 'db:customers:insert'
  | 'db:customers:update'
  | 'db:customers:delete'

  // Broker Transactions
  | 'db:brokerTransactions:getAll'
  | 'db:brokerTransactions:getById'
  | 'db:brokerTransactions:getByBrokerId'
  | 'db:brokerTransactions:insert'
  | 'db:brokerTransactions:update'
  | 'db:brokerTransactions:delete'

  // Customer Transactions
  | 'db:customerTransactions:getAll'
  | 'db:customerTransactions:getById'
  | 'db:customerTransactions:getByCustomerId'
  | 'db:customerTransactions:insert'
  | 'db:customerTransactions:update'
  | 'db:customerTransactions:delete'

  // Broker Leisures
  | 'db:brokerLeisures:getAll'
  | 'db:brokerLeisures:getById'
  | 'db:brokerLeisures:getByBrokerId'
  | 'db:brokerLeisures:insert'
  | 'db:brokerLeisures:update'
  | 'db:brokerLeisures:delete'

  // Customer Leisures
  | 'db:customerLeisures:getAll'
  | 'db:customerLeisures:getById'
  | 'db:customerLeisures:getByCustomerId'
  | 'db:customerLeisures:insert'
  | 'db:customerLeisures:update'
  | 'db:customerLeisures:delete'

  // Stock History
  | 'db:stockHistory:getAll'
  | 'db:stockHistory:getById'
  | 'db:stockHistory:insert'
  | 'db:stockHistory:update'
  | 'db:stockHistory:delete'
  | 'db:stockHistory:getByProductId'
  | 'db:stockHistory:getByDateRange'

  // Product Manufacturers
  | 'db:productManufacturers:getAll'
  | 'db:productManufacturers:getById'
  | 'db:productManufacturers:insert'
  | 'db:productManufacturers:update'
  | 'db:productManufacturers:delete'
  | 'db:productManufacturers:getByProductId'

  // Backup operations
  | 'db:backup:create'
  | 'db:backup:list'
  | 'db:backup:validate'
  | 'db:backup:restore'
  | 'db:backup:getSettings'
  | 'db:backup:updateSettings'

  // Stats
  | 'db:getStats'
  | 'db:getDatabaseStats'
  | 'db:analyzeBrokerTransactionDeletion'
  | 'db:analyzeCustomerTransactionDeletion'
  | 'db:analyzeBrokerLeisureDeletion'
  | 'db:analyzeCustomerLeisureDeletion'
  | 'db:analyzeProductDeletion'
  | 'db:analyzeManufacturerDeletion'
  | 'db:analyzeBrokerDeletion'
  | 'db:analyzeCustomerDeletion'
  | 'db:seedDatabase';

// ===========================================
// GENERIC CRUD TYPES
// ===========================================

export interface CRUDOperations<T, TInsert, TUpdate> {
  getAll: () => Promise<T[]>;
  getById: (id: string) => Promise<T | null>;
  insert: (data: TInsert) => Promise<DatabaseOperationResult>;
  update: (id: string, data: TUpdate) => Promise<DatabaseOperationResult>;
  delete: (id: string) => Promise<DatabaseOperationResult>;
}

export interface TransactionCRUDOperations<T, TInsert, TUpdate> extends CRUDOperations<T, TInsert, TUpdate> {
  getByBrokerId?: (brokerId: string) => Promise<T[]>;
  getByCustomerId?: (customerId: string) => Promise<T[]>;
}

export interface LeisureCRUDOperations<T, TInsert, TUpdate> extends CRUDOperations<T, TInsert, TUpdate> {
  getByBrokerId?: (brokerId: string) => Promise<T[]>;
  getByCustomerId?: (customerId: string) => Promise<T[]>;
}
