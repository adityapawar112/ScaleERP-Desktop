import ExcelJS from 'exceljs';
import { ReportData } from '../types/reports';

// Types for different data structures
export interface BrokerTransactionData {
  id: string;
  brokerId: string;
  brokerName: string;
  invoiceNumber?: string;
  date: string;
  time: string;
  products: Array<{ productId: string; manufacturerId: string; units: number; unitType: 'tonnes' | 'units'; rate: number; brokeragePerUnit?: number; brokerage?: number; total: number }>;
  previousBalance: number;
  totalAmount: number;
  totalBrokerage?: number;
}

export interface CustomerTransactionData {
  id: string;
  invoiceNumber?: string;
  customerName?: string;
  date: string;
  time: string;
  products: Array<{ productId: string; manufacturerId: string; quantity: number; unitType: 'tonnes' | 'units'; price: number; labour?: number; total: number }>;
  labourCharge?: number;
  totalAmount: number;
  paymentMethod: 'UPI' | 'cash';
}

export interface LeisureData {
  id: string;
  entityId: string; // brokerId or customerId
  entityName: string; // brokerName or customerName
  entityType: 'broker' | 'customer';
  pendingAmount: number;
  paidAmount: number;
  brokerage?: number;
  date: string;
  time: string;
  notes: string;
}

export interface Product {
  id: string;
  name: string;
  manufacturerStocks: { manufacturerId: string; manufacturerName: string; quantity: number }[];
}

// Utility function to get current date for filename
export const getCurrentDateString = (): string => {
  const now = new Date();
  return now.toISOString().split('T')[0]; // YYYY-MM-DD format
};

// Utility function to download Excel file in browser
const downloadExcelFile = async (workbook: ExcelJS.Workbook, fileName: string): Promise<void> => {
  try {
    // Generate buffer from workbook
    const buffer = await workbook.xlsx.writeBuffer();

    // Create blob from buffer
    const blob = new Blob([buffer], {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    });

    // Create download link
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = fileName;
    link.style.display = 'none';

    // Add to DOM, click, and remove
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    // Clean up object URL
    window.URL.revokeObjectURL(url);
  } catch (error) {
    console.error('Error downloading Excel file:', error);
    throw new Error('Failed to download Excel file');
  }
};

// Export broker transactions to Excel
export const exportBrokerTransactionsToExcel = async (
  transactions: BrokerTransactionData[],
  products: Product[],
  filename?: string
): Promise<void> => {
  const fileName = filename || `Broker_Transactions_${getCurrentDateString()}.xlsx`;

  // Create workbook and worksheet
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet('Broker Transaction Details');

  // Create header row for line-item format
  const headerRow = [
    'Transaction ID',
    'Invoice No',
    'Date',
    'Time',
    'Broker',
    'Product',
    'Manufacturer',
    'Units',
    'Unit Type',
    'Rate',
    'Brokerage/Unit',
    'Brokerage Total',
    'Line Total',
    'Previous Balance',
    'Transaction Total',
    'Total Brokerage'
  ];

  // Add header row
  worksheet.addRow(headerRow);

  // Add data rows - one row per product line item
  transactions.forEach(transaction => {
    transaction.products.forEach((productData) => {
      if (productData.units > 0) {
        const product = products.find(p => p.id === productData.productId);
        const manufacturerStock = product?.manufacturerStocks.find(m => m.manufacturerId === productData.manufacturerId);

        const row = [
          transaction.id,
          transaction.invoiceNumber || 'N/A',
          transaction.date,
          transaction.time,
          transaction.brokerName,
          product?.name || productData.productId,
          manufacturerStock?.manufacturerName || productData.manufacturerId,
          productData.units,
          productData.unitType,
          parseFloat(productData.rate.toFixed(2)),
          parseFloat((productData.brokeragePerUnit || 0).toFixed(2)),
          parseFloat((productData.brokerage || 0).toFixed(2)),
          parseFloat(productData.total.toFixed(2)),
          parseFloat(transaction.previousBalance.toFixed(2)),
          parseFloat(transaction.totalAmount.toFixed(2)),
          parseFloat((transaction.totalBrokerage || 0).toFixed(2))
        ];

        worksheet.addRow(row);
      }
    });
  });

  // Set column widths
  worksheet.columns = [
    { width: 15 }, // Transaction ID
    { width: 15 }, // Invoice No
    { width: 12 }, // Date
    { width: 10 }, // Time
    { width: 20 }, // Broker
    { width: 20 }, // Product
    { width: 20 }, // Manufacturer
    { width: 10 }, // Units
    { width: 10 }, // Unit Type
    { width: 10 }, // Rate
    { width: 14 }, // Brokerage/Unit
    { width: 15 }, // Brokerage Total
    { width: 12 }, // Line Total
    { width: 15 }, // Previous Balance
    { width: 15 }, // Transaction Total
    { width: 15 }, // Total Brokerage
  ];

  // Download file in browser
  await downloadExcelFile(workbook, fileName);
};

// Export customer transactions to Excel
export const exportCustomerTransactionsToExcel = async (
  transactions: CustomerTransactionData[],
  products: Product[],
  filename?: string
): Promise<void> => {
  const fileName = filename || `Customer_Sales_${getCurrentDateString()}.xlsx`;

  // Create workbook and worksheet
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet('Customer Transaction Details');

  // Create header row for line-item format
  const headerRow = [
    'Transaction ID',
    'Invoice No',
    'Date',
    'Time',
    'Customer',
    'Product',
    'Manufacturer',
    'Quantity',
    'Unit Type',
    'Price',
    'Overall Labour Charge',
    'Line Total',
    'Payment Method',
    'Transaction Total'
  ];

  // Add header row
  worksheet.addRow(headerRow);

  // Add data rows - one row per product line item
  transactions.forEach(transaction => {
    transaction.products.forEach((productData) => {
      if (productData.quantity > 0) {
        const product = products.find(p => p.id === productData.productId);
        const manufacturerStock = product?.manufacturerStocks.find(m => m.manufacturerId === productData.manufacturerId);

        const row = [
          transaction.id,
          transaction.invoiceNumber || 'N/A',
          transaction.date,
          transaction.time,
          transaction.customerName || 'Unknown Customer',
          product?.name || productData.productId,
          manufacturerStock?.manufacturerName || productData.manufacturerId,
          productData.quantity,
          productData.unitType,
          parseFloat(productData.price.toFixed(2)),
          parseFloat((transaction.labourCharge || 0).toFixed(2)),
          parseFloat(productData.total.toFixed(2)),
          transaction.paymentMethod.toUpperCase(),
          parseFloat(transaction.totalAmount.toFixed(2))
        ];

        worksheet.addRow(row);
      }
    });
  });

  // Set column widths
  worksheet.columns = [
    { width: 15 }, // Transaction ID
    { width: 15 }, // Invoice No
    { width: 12 }, // Date
    { width: 10 }, // Time
    { width: 20 }, // Customer
    { width: 20 }, // Product
    { width: 20 }, // Manufacturer
    { width: 10 }, // Quantity
    { width: 10 }, // Unit Type
    { width: 10 }, // Price
    { width: 20 }, // Overall Labour Charge
    { width: 12 }, // Line Total
    { width: 15 }, // Payment Method
    { width: 15 }, // Transaction Total
  ];

  // Download file in browser
  await downloadExcelFile(workbook, fileName);
};

// Export leisure records to Excel
export const exportLeisureRecordsToExcel = async (
  leisureRecords: LeisureData[],
  filename?: string
): Promise<void> => {
  const fileName = filename || `Leisure_Records_${getCurrentDateString()}.xlsx`;

  // Create workbook and worksheet
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet('Leisure Records');

  // Add header row
  worksheet.addRow(['Entity', 'Type', 'Amount', 'Brokerage', 'Date', 'Time', 'Notes']);

  // Add data rows
  leisureRecords.forEach(record => {
    // Use appropriate terminology based on entity type
    let type: string;
    if (record.entityType === 'broker') {
      type = record.pendingAmount > 0 ? 'Purchase' : 'Payable';
    } else {
      type = record.pendingAmount > 0 ? 'Receivable' : 'Sale';
    }
    const amount = record.pendingAmount > 0 ? record.pendingAmount : record.paidAmount;
    worksheet.addRow([
      record.entityName,
      type,
      parseFloat(amount.toFixed(2)),
      parseFloat((record.brokerage || 0).toFixed(2)),
      record.date,
      record.time,
      record.notes
    ]);
  });

  // Set column widths
  worksheet.columns = [
    { width: 20 }, // Entity
    { width: 15 }, // Type
    { width: 12 }, // Amount
    { width: 15 }, // Brokerage
    { width: 12 }, // Date
    { width: 10 }, // Time
    { width: 30 }, // Notes
  ];

  // Download file in browser
  await downloadExcelFile(workbook, fileName);
};

// Export generic ReportData to Excel
export const exportReportToExcel = async (
  report: ReportData,
  filename?: string
): Promise<void> => {
  const fileName = filename || `${report.title.replace(/\s+/g, '_')}_${getCurrentDateString()}.xlsx`;

  // Create workbook and worksheet
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet('Report');

  // Add Title
  const titleRow = worksheet.addRow([report.title]);
  titleRow.font = { size: 16, bold: true };
  worksheet.addRow([]); // Empty row

  // Add Date Range if exists
  if (report.dateRange) {
    worksheet.addRow([`Period: ${report.dateRange.from} to ${report.dateRange.to}`]);
    worksheet.addRow([]);
  }

  // Add Headers
  const headerRow = worksheet.addRow(report.headers);
  headerRow.eachCell((cell) => {
    cell.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFE0E0E0' }
    };
    cell.font = { bold: true };
    cell.border = {
      top: { style: 'thin' },
      left: { style: 'thin' },
      bottom: { style: 'thin' },
      right: { style: 'thin' }
    };
  });

  // Add Data Rows
  report.rows.forEach(row => {
    const r = worksheet.addRow(row);
    r.eachCell((cell) => {
      cell.border = {
        top: { style: 'thin' },
        left: { style: 'thin' },
        bottom: { style: 'thin' },
        right: { style: 'thin' }
      };
    });
  });

  // Add Totals if exists
  if (report.totals && report.totals.length > 0) {
    worksheet.addRow([]);
    report.totals.forEach(total => {
      const row = worksheet.addRow(['', '', '', total.label, total.value]);
      row.font = { bold: true };
      // Align total label and value
      const labelCell = row.getCell(4);
      const valueCell = row.getCell(5);
      labelCell.alignment = { horizontal: 'right' };
      valueCell.alignment = { horizontal: 'right' };
    });
  }

  // Add Footer
  worksheet.addRow([]);
  const footerRow = worksheet.addRow([`Generated at: ${report.generatedAt}`]);
  footerRow.font = { italic: true, size: 10 };

  // Set column widths (simple auto-fit approximation)
  worksheet.columns.forEach(column => {
    let maxLength = 0;
    column.eachCell!({ includeEmpty: true }, cell => {
      const columnLength = cell.value ? cell.value.toString().length : 10;
      if (columnLength > maxLength) {
        maxLength = columnLength;
      }
    });
    column.width = Math.min(Math.max(maxLength + 2, 10), 50);
  });

  // Download file
  await downloadExcelFile(workbook, fileName);
};
