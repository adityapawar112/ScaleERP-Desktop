// src/utils/reportDataGenerators.ts
import { 
  ReportData, 
  ReportConfig 
} from '../types/reports';
import { 
  Product, 
  Broker, 
  Customer, 
  BrokerTransaction, 
  CustomerTransaction,
  BrokerLeisure,
  CustomerLeisure,
  StockHistory,
  ProductManufacturer
} from '../../electron/database/types';

/**
 * Format date for display
 */
const formatDate = (dateStr: string) => {
  try {
    return new Date(dateStr).toLocaleDateString();
  } catch (e) {
    return dateStr;
  }
};

/**
 * Format currency for display
 */
const formatCurrency = (amount: number | undefined | null) => {
  if (amount === undefined || amount === null) return '0.00';
  return amount.toLocaleString('en-IN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
};

/**
 * 1. Inventory Report Generator
 */
export const generateInventoryReport = (
  products: Product[],
  manufacturers: ProductManufacturer[],
  t: any
): ReportData => {
  const headers = [
    t('reports.headers.productName', 'Product Name'),
    t('reports.headers.manufacturer', 'Manufacturer'),
    t('reports.headers.stockQuantity', 'Stock Quantity'),
    t('reports.headers.price', 'Price'),
    t('reports.headers.value', 'Value'),
  ];
  const rows: (string | number)[][] = [];
  let totalValue = 0;

  products.forEach(p => {
    const productManufacturers = manufacturers.filter(m => m.product_id === p.id);
    
    if (productManufacturers.length > 0) {
      productManufacturers.forEach(pm => {
        const value = pm.quantity * (p.price || 0);
        totalValue += value;
        rows.push([
          p.name,
          pm.manufacturer_name,
          pm.quantity,
          formatCurrency(p.price),
          formatCurrency(value)
        ]);
      });
    } else {
      const value = (p.stock_quantity || 0) * (p.price || 0);
      totalValue += value;
      rows.push([
        p.name,
        t('common.unknown', 'N/A'),
        p.stock_quantity || 0,
        formatCurrency(p.price),
        formatCurrency(value)
      ]);
    }
  });

  return {
    title: t('reports.items.inventoryStatus.name', 'Inventory Status Report'),
    headers,
    rows,
    totals: [
      { label: t('reports.totals.totalInventoryValue', 'Total Inventory Value'), value: formatCurrency(totalValue) }
    ],
    generatedAt: new Date().toLocaleString(),
    category: t('reports.categories.inventory', 'Inventory')
  };
};

/**
 * 2. Broker Transaction Report Generator
 */
export const generateBrokerTransactionReport = (
  transactions: BrokerTransaction[],
  brokers: Broker[],
  config: ReportConfig,
  t: any
): ReportData => {
  const headers = [
    t('reports.headers.date', 'Date'),
    t('reports.headers.invoiceNo', 'Invoice #'),
    t('reports.headers.broker', 'Broker'),
    t('reports.headers.amount', 'Amount'),
    t('reports.headers.prevBalance', 'Prev. Balance'),
    t('reports.headers.totalPayable', 'Total Payable'),
  ];
  const rows: (string | number)[][] = [];
  let totalAmount = 0;

  // Filter by date range if provided
  const filtered = transactions.filter(t => {
    if (config.dateFrom && t.date < config.dateFrom) return false;
    if (config.dateTo && t.date > config.dateTo) return false;
    if (config.entityId && t.broker_id !== config.entityId) return false;
    return true;
  });

  filtered.sort((a, b) => b.date.localeCompare(a.date)).forEach(tx => {
    const broker = brokers.find(b => b.id === tx.broker_id);
    totalAmount += tx.total_amount;
    rows.push([
      formatDate(tx.date),
      tx.invoice_number || t('common.unknown', 'N/A'),
      broker?.name || t('common.unknown', 'Unknown'),
      formatCurrency(tx.total_amount),
      formatCurrency(tx.previous_balance),
      formatCurrency((tx.total_amount || 0) + (tx.previous_balance || 0))
    ]);
  });

  return {
    title: t('reports.items.brokerTransactions.name', 'Broker Transaction Report'),
    dateRange: config.dateFrom && config.dateTo ? { from: config.dateFrom, to: config.dateTo } : undefined,
    headers,
    rows,
    totals: [
      { label: t('reports.totals.totalTransactionAmount', 'Total Transaction Amount'), value: formatCurrency(totalAmount) }
    ],
    generatedAt: new Date().toLocaleString(),
    category: t('reports.categories.transactions', 'Transactions')
  };
};

/**
 * 3. Broker Ledger Report Generator
 */
export const generateBrokerLedgerReport = (
  leisures: BrokerLeisure[],
  brokers: Broker[],
  config: ReportConfig,
  t: any
): ReportData => {
  const headers = [
    t('reports.headers.date', 'Date'),
    t('reports.headers.broker', 'Broker'),
    t('reports.headers.type', 'Type'),
    t('reports.headers.amount', 'Amount'),
    t('reports.headers.notes', 'Notes'),
  ];
  const rows: (string | number)[][] = [];
  let totalPurchases = 0;
  let totalPayments = 0;

  const filtered = leisures.filter(l => {
    if (config.dateFrom && l.date < config.dateFrom) return false;
    if (config.dateTo && l.date > config.dateTo) return false;
    if (config.entityId && l.broker_id !== config.entityId) return false;
    return true;
  });

  filtered.sort((a, b) => b.date.localeCompare(a.date)).forEach(l => {
    if (l.type === 'purchase') totalPurchases += l.amount;
    else totalPayments += l.amount;

    const typeStr =
      l.type === 'purchase'
        ? t('reports.types.purchase', 'PURCHASE')
        : t('reports.types.payment', 'PAYMENT');

    rows.push([
      formatDate(l.date),
      l.broker_name || t('common.unknown', 'N/A'),
      typeStr,
      formatCurrency(l.amount),
      l.notes || ''
    ]);
  });

  return {
    title: t('reports.items.brokerLedger.name', 'Broker Ledger Report'),
    dateRange: config.dateFrom && config.dateTo ? { from: config.dateFrom, to: config.dateTo } : undefined,
    headers,
    rows,
    totals: [
      { label: t('reports.totals.totalPurchases', 'Total Purchases'), value: formatCurrency(totalPurchases) },
      { label: t('reports.totals.totalPayments', 'Total Payments/Payables'), value: formatCurrency(totalPayments) },
      { label: t('reports.totals.netBalance', 'Net Balance'), value: formatCurrency(totalPurchases - totalPayments) }
    ],
    generatedAt: new Date().toLocaleString(),
    category: t('reports.categories.accounting', 'Accounting')
  };
};

/**
 * 4. Broker Master List Generator
 */
export const generateBrokerListReport = (brokers: Broker[], t: any): ReportData => {
  const headers = [
    t('reports.headers.broker', 'Broker Name'),
    t('reports.headers.contact', 'Contact'),
    t('reports.headers.address', 'Address'),
    t('reports.headers.totalPurchases', 'Total Purchases'),
    t('reports.headers.totalPaid', 'Total Paid'),
    t('reports.headers.balance', 'Balance'),
  ];
  const rows: (string | number)[][] = [];

  brokers.forEach(b => {
    rows.push([
      b.name,
      b.contact || t('common.unknown', 'N/A'),
      b.address || t('common.unknown', 'N/A'),
      formatCurrency(b.total_pending),
      formatCurrency(b.total_paid),
      formatCurrency((b.total_pending || 0) - (b.total_paid || 0))
    ]);
  });

  return {
    title: t('reports.items.brokerList.name', 'Broker Master List'),
    headers,
    rows,
    generatedAt: new Date().toLocaleString(),
    category: t('reports.categories.masterData', 'Master Data')
  };
};

/**
 * 5. Customer Master List Generator
 */
export const generateCustomerListReport = (customers: Customer[], t: any): ReportData => {
  const headers = [
    t('reports.headers.customerName', 'Customer Name'),
    t('reports.headers.contact', 'Contact'),
    t('reports.headers.address', 'Address'),
    t('reports.headers.totalSales', 'Total Sales'),
    t('reports.headers.totalReceived', 'Total Received'),
    t('reports.headers.balance', 'Balance'),
  ];
  const rows: (string | number)[][] = [];

  customers.forEach(c => {
    rows.push([
      c.name,
      c.contact || t('common.unknown', 'N/A'),
      c.address || t('common.unknown', 'N/A'),
      formatCurrency(c.total_pending),
      formatCurrency(c.total_paid),
      formatCurrency((c.total_pending || 0) - (c.total_paid || 0))
    ]);
  });

  return {
    title: t('reports.items.customerList.name', 'Customer Master List'),
    headers,
    rows,
    generatedAt: new Date().toLocaleString(),
    category: t('reports.categories.masterData', 'Master Data')
  };
};

/**
 * 6. Inventory Movement History Generator
 */
export const generateStockHistoryReport = (
  history: StockHistory[],
  products: Product[],
  config: ReportConfig,
  t: any
): ReportData => {
  const headers = [
    t('reports.headers.date', 'Date'),
    t('reports.headers.product', 'Product'),
    t('reports.headers.type', 'Type'),
    t('reports.headers.quantity', 'Quantity'),
    t('reports.headers.notes', 'Notes'),
  ];
  const rows: (string | number)[][] = [];

  const filtered = history.filter(h => {
    if (config.dateFrom && h.date < config.dateFrom) return false;
    if (config.dateTo && h.date > config.dateTo) return false;
    if (config.entityId && h.product_id !== config.entityId) return false;
    return true;
  });

  filtered.sort((a, b) => b.date.localeCompare(a.date)).forEach(h => {
    const product = products.find(p => p.id === h.product_id);
    const typeStr =
      h.type === 'in'
        ? t('reports.types.stockIn', 'STOCK IN')
        : t('reports.types.stockOut', 'STOCK OUT');

    rows.push([
      formatDate(h.date),
      product?.name || t('common.unknown', 'Unknown'),
      typeStr,
      h.quantity,
      h.notes || ''
    ]);
  });

  return {
    title: t('reports.items.stockHistory.name', 'Inventory Movement History'),
    dateRange: config.dateFrom && config.dateTo ? { from: config.dateFrom, to: config.dateTo } : undefined,
    headers,
    rows,
    generatedAt: new Date().toLocaleString(),
    category: t('reports.categories.inventory', 'Inventory')
  };
};

/**
 * 7. Transaction and Ledgers (Combined Customer View)
 */
export const generateCustomerTransactionReport = (
  transactions: CustomerTransaction[],
  customers: Customer[],
  config: ReportConfig,
  t: any
): ReportData => {
  const headers = [
    t('reports.headers.date', 'Date'),
    t('reports.headers.invoiceNo', 'Invoice #'),
    t('reports.headers.customer', 'Customer'),
    t('reports.headers.amount', 'Amount'),
    t('reports.headers.paymentMethod', 'Payment Method'),
  ];
  const rows: (string | number)[][] = [];
  let totalAmount = 0;

  const filtered = transactions.filter(t => {
    if (config.dateFrom && t.date < config.dateFrom) return false;
    if (config.dateTo && t.date > config.dateTo) return false;
    if (config.entityId && t.customer_id !== config.entityId) return false;
    return true;
  });

  filtered.sort((a, b) => b.date.localeCompare(a.date)).forEach(tx => {
    const customer = customers.find(c => c.id === tx.customer_id);
    totalAmount += tx.total_amount;
    rows.push([
      formatDate(tx.date),
      tx.invoice_number || t('common.unknown', 'N/A'),
      customer?.name || t('common.unknown', 'Unknown'),
      formatCurrency(tx.total_amount),
      (tx.payment_method || t('common.unknown', 'N/A')).toUpperCase()
    ]);
  });

  return {
    title: t('reports.items.customerSales.name', 'Customer Sales Report'),
    dateRange: config.dateFrom && config.dateTo ? { from: config.dateFrom, to: config.dateTo } : undefined,
    headers,
    rows,
    totals: [
      { label: t('reports.totals.totalSalesAmount', 'Total Sales Amount'), value: formatCurrency(totalAmount) }
    ],
    generatedAt: new Date().toLocaleString(),
    category: t('reports.categories.transactions', 'Transactions')
  };
};

/**
 * 8. Day Book Report Generator
 * Summarized view of all daily business transactions
 */
export const generateDayBookReport = (
  brokerTxs: BrokerTransaction[],
  customerTxs: CustomerTransaction[],
  brokerLeisures: BrokerLeisure[],
  customerLeisures: CustomerLeisure[],
  config: ReportConfig,
  t: any
): ReportData => {
  const headers = [
    t('reports.headers.date', 'Date'),
    t('reports.headers.type', 'Type'),
    t('reports.headers.entity', 'Entity'),
    t('reports.headers.details', 'Details'),
    t('reports.headers.debitCashOut', 'Debit (Cash Out)'),
    t('reports.headers.creditCashIn', 'Credit (Cash In)'),
  ];
  const rows: (string | number)[][] = [];
  let totalCashIn = 0;
  let totalCashOut = 0;

  const dateFrom = config.dateFrom;
  const dateTo = config.dateTo;

  // 1. Process Broker Transactions (Purchases -> Debit)
  brokerTxs.forEach(tx => {
    if (dateFrom && tx.date < dateFrom) return;
    if (dateTo && tx.date > dateTo) return;
    
    totalCashOut += tx.total_amount;
    rows.push([
      formatDate(tx.date),
      t('reports.types.purchase', 'PURCHASE'),
      t('reports.headers.broker', 'Broker'),
      `Inv: ${tx.invoice_number || t('common.unknown', 'N/A')}`,
      formatCurrency(tx.total_amount),
      '0.00'
    ]);
  });

  // 2. Process Customer Transactions (Sales -> Credit)
  customerTxs.forEach(tx => {
    if (dateFrom && tx.date < dateFrom) return;
    if (dateTo && tx.date > dateTo) return;
    
    totalCashIn += tx.total_amount;
    rows.push([
      formatDate(tx.date),
      t('reports.types.sale', 'SALE'),
      t('reports.headers.customer', 'Customer'),
      `Inv: ${tx.invoice_number || t('common.unknown', 'N/A')}`,
      '0.00',
      formatCurrency(tx.total_amount)
    ]);
  });

  // 3. Process Broker Payments (Payments Made -> Debit)
  brokerLeisures.forEach(l => {
    if (dateFrom && l.date < dateFrom) return;
    if (dateTo && l.date > dateTo) return;
    if (l.type === 'purchase') return; // Already covered by transactions

    totalCashOut += l.amount;
    rows.push([
      formatDate(l.date),
      t('reports.types.payment', 'PAYMENT'),
      l.broker_name || t('reports.headers.broker', 'Broker'),
      l.notes || '',
      formatCurrency(l.amount),
      '0.00'
    ]);
  });

  // 4. Process Customer Receipts (Payments Received -> Credit)
  customerLeisures.forEach(l => {
    if (dateFrom && l.date < dateFrom) return;
    if (dateTo && l.date > dateTo) return;
    if (l.type === 'sale') return; // Already covered by transactions

    totalCashIn += l.amount;
    rows.push([
      formatDate(l.date),
      t('reports.types.receipt', 'RECEIPT'),
      l.customer_name || t('reports.headers.customer', 'Customer'),
      l.notes || '',
      '0.00',
      formatCurrency(l.amount)
    ]);
  });

  // Sort by date
  rows.sort((a, b) => (a[0] as string).localeCompare(b[0] as string));

  return {
    title: t('reports.items.dayBook.name', 'Day Book Report'),
    dateRange: dateFrom && dateTo ? { from: dateFrom, to: dateTo } : undefined,
    headers,
    rows,
    totals: [
      { label: t('reports.totals.totalCashOut', 'Total Cash Out (Debit)'), value: formatCurrency(totalCashOut) },
      { label: t('reports.totals.totalCashIn', 'Total Cash In (Credit)'), value: formatCurrency(totalCashIn) },
      { label: t('reports.totals.netCashFlow', 'Net Cash Flow'), value: formatCurrency(totalCashIn - totalCashOut) }
    ],
    generatedAt: new Date().toLocaleString(),
    category: t('reports.categories.accounting', 'Accounting')
  };
};

/**
 * 9. Outstanding Payments Report Generator
 * Analyze pending dues from customers and payables to suppliers
 */
export const generateOutstandingPaymentsReport = (
  brokers: Broker[],
  customers: Customer[],
  t: any
): ReportData => {
  const headers = [
    t('reports.headers.entityType', 'Entity Type'),
    t('reports.headers.customerName', 'Name'),
    t('reports.headers.contact', 'Contact'),
    t('reports.headers.totalPurchases', 'Total Pending'),
    t('reports.headers.totalPaid', 'Total Paid'),
    t('reports.headers.balanceOwed', 'Balance Owed'),
  ];
  const rows: (string | number)[][] = [];
  let totalReceivable = 0;
  let totalPayable = 0;

  // Process Brokers (Payables)
  brokers.forEach(b => {
    const balance = (b.total_pending || 0) - (b.total_paid || 0);
    if (balance === 0) return;

    totalPayable += balance;
    rows.push([
      t('reports.types.brokerPayable', 'BROKER (Payable)'),
      b.name,
      b.contact || t('common.unknown', 'N/A'),
      formatCurrency(b.total_pending),
      formatCurrency(b.total_paid),
      formatCurrency(balance)
    ]);
  });

  // Process Customers (Receivables)
  customers.forEach(c => {
    const balance = (c.total_pending || 0) - (c.total_paid || 0);
    if (balance === 0) return;

    totalReceivable += balance;
    rows.push([
      t('reports.types.customerReceivable', 'CUSTOMER (Receivable)'),
      c.name,
      c.contact || t('common.unknown', 'N/A'),
      formatCurrency(c.total_pending),
      formatCurrency(c.total_paid),
      formatCurrency(balance)
    ]);
  });

  return {
    title: t('reports.items.outstandingPayments.name', 'Outstanding Payments Report'),
    headers,
    rows,
    totals: [
      { label: t('reports.totals.totalReceivables', 'Total Receivables (Customers)'), value: formatCurrency(totalReceivable) },
      { label: t('reports.totals.totalPayables', 'Total Payables (Brokers)'), value: formatCurrency(totalPayable) },
      { label: t('reports.totals.netPosition', 'Net Position'), value: formatCurrency(totalReceivable - totalPayable) }
    ],
    generatedAt: new Date().toLocaleString(),
    category: t('reports.categories.accounting', 'Accounting')
  };
};

