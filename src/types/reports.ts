// src/types/reports.ts

export interface ReportData {
  title: string;
  dateRange?: { from: string; to: string };
  headers: string[];      // Define table column headers
  rows: (string | number)[][];       // 2D array for the table body
  totals?: Array<{         // Bottom summary metrics
    label: string;
    value: string | number;
  }>;
  summary?: string;
  category?: string;
  generatedAt: string;
}

export interface ReportMetadata {
  id: string;
  name: string;
  description: string;
  category: 'Master Data' | 'Transactions' | 'Inventory' | 'Accounting';
  icon: string; // Icon name from react-icons/md
  requiresDateRange: boolean;
  requiresEntity?: 'broker' | 'customer' | 'product';
}

export interface ReportConfig {
  dateFrom?: string;
  dateTo?: string;
  entityId?: string;
  status?: string;
}
