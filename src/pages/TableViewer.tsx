import React, { useState, useEffect } from 'react';
import { Container, Row, Col, Card, Button, Alert, Table, Badge, Spinner, Form, InputGroup, Dropdown } from 'react-bootstrap';
import type { ElectronAPI } from '../types/electron';
import CustomPagination from '../components/CustomPagination';

// Error Boundary Component
class TableViewerErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { hasError: boolean; error?: Error }
> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('TableViewer Error Boundary caught an error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <Container fluid className="py-4">
          <Row className="mb-4">
            <Col>
              <div className="page-header">
                <h2>Table Data Viewer</h2>
                <p>Browse and inspect database table contents</p>
              </div>
            </Col>
          </Row>
          <Alert variant="danger">
            <h4>Component Error</h4>
            <p>An error occurred while loading the Table Data Viewer page.</p>
            {this.state.error && (
              <details>
                <summary>Error Details</summary>
                <pre>{this.state.error.message}</pre>
              </details>
            )}
            <Button onClick={() => window.location.reload()} variant="outline-primary">
              Reload Page
            </Button>
          </Alert>
        </Container>
      );
    }

    return this.props.children;
  }
}

// Ensure ElectronAPI types are available globally
declare global {
  interface Window {
    electronAPI?: ElectronAPI;
  }
}

interface TableData {
  columns: string[];
  rows: any[];
  totalCount: number;
}

interface TableInfo {
  name: string;
  description: string;
  category: string;
}

const TableViewer: React.FC = () => {
  const [selectedTable, setSelectedTable] = useState<string>('');
  const [tableData, setTableData] = useState<TableData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [sortColumn, setSortColumn] = useState<string>('');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
  const [pageSize] = useState(50);
  const [debugInfo, setDebugInfo] = useState<string>('');

  const addDebugInfo = (info: string) => {
    console.log('[TableViewer]', info);
    setDebugInfo(prev => prev + '\n' + new Date().toLocaleTimeString() + ': ' + info);
  };



  // Available tables organized by category
  const availableTables: TableInfo[] = [
    // Core Entities (Single Source of Truth)
    { name: 'products', description: 'Product catalog and inventory items (PRIMARY DATA)', category: 'Core Entities' },
    { name: 'product_manufacturers', description: 'Product-manufacturer stock relationships (PRIMARY DATA)', category: 'Core Entities' },
    { name: 'brokers', description: 'Supplier/vendor information (PRIMARY DATA)', category: 'Core Entities' },
    { name: 'customers', description: 'Customer/client information (PRIMARY DATA)', category: 'Core Entities' },
    { name: 'broker_transactions', description: 'Purchase transactions from brokers (PRIMARY DATA)', category: 'Core Entities' },
    { name: 'customer_transactions', description: 'Sales transactions to customers (PRIMARY DATA)', category: 'Core Entities' },
    { name: 'broker_leisures', description: 'Broker payment records (PRIMARY DATA)', category: 'Core Entities' },
    { name: 'customer_leisures', description: 'Customer payment records (PRIMARY DATA)', category: 'Core Entities' },
    { name: 'stock_history', description: 'Stock movement records (PRIMARY DATA)', category: 'Core Entities' },

    // Transaction Details
    { name: 'broker_transaction_products', description: 'Product details for broker transactions', category: 'Transaction Details' },
    { name: 'customer_transaction_products', description: 'Product details for customer transactions', category: 'Transaction Details' },

    // Licensing & Security
    { name: 'license_customers', description: 'Customer records for licensing', category: 'Licensing & Security' },
    { name: 'license_policies', description: 'License policy templates', category: 'Licensing & Security' },
    { name: 'licenses', description: 'Issued licenses and activation state', category: 'Licensing & Security' },
    { name: 'users', description: 'Application user accounts', category: 'Licensing & Security' },
    { name: 'license_events', description: 'Audit log for license and security events', category: 'Licensing & Security' },
    { name: 'password_reset_tokens', description: 'Active password reset tokens', category: 'Licensing & Security' },
    { name: 'used_reset_nonces', description: 'Security nonces for reset operations', category: 'Licensing & Security' },
    { name: 'license_heartbeats', description: 'Device heartbeats for clock tamper detection', category: 'Licensing & Security' },
    { name: 'clock_override_tokens', description: 'Support override tokens for security recovery', category: 'Licensing & Security' },

    // Infrastructure & Backup
    { name: 'backup_settings', description: 'Configuration for automated backups', category: 'Infrastructure & Backup' },
    { name: 'backup_history', description: 'Log of performed backups and their status', category: 'Infrastructure & Backup' },

    // Communication
    { name: 'whatsapp_presets', description: 'Message templates for WhatsApp integration', category: 'Communication' },

    // Settings and Configuration (Input Mechanisms)
    { name: 'business_settings', description: 'Business configuration settings (INPUT ONLY)', category: 'Settings & Configuration' },

    // Search Indexes
    { name: 'products_fts', description: 'Full-text search index for products', category: 'Search Indexes' },
    { name: 'brokers_fts', description: 'Full-text search index for brokers', category: 'Search Indexes' },
    { name: 'customers_fts', description: 'Full-text search index for customers', category: 'Search Indexes' },
    { name: 'users_fts', description: 'Full-text search index for user accounts', category: 'Search Indexes' },

    // Database Views
    { name: 'product_stock_summary', description: 'Product stock summary view', category: 'Database Views' },
    { name: 'broker_transaction_summary', description: 'Broker transaction summary view', category: 'Database Views' },
    { name: 'customer_transaction_summary', description: 'Customer transaction summary view', category: 'Database Views' },
  ];

  const loadTableData = async (tableName: string, page: number = 1) => {
    if (!tableName) return;

    setLoading(true);
    setError(null);

    try {
      if (!window.electronAPI) {
        throw new Error('Electron API not available');
      }

      // Use raw SQL query for debugging - shows ALL records without business logic filtering
      const query = `SELECT * FROM ${tableName} ORDER BY ROWID DESC`; // ROWID DESC to show newest first
      addDebugInfo(`Table: ${tableName} -> Raw Query: ${query}`);

      const secret = window.sessionStorage.getItem('dev_secret_stored') || '';
      const data = await window.electronAPI.invoke('db:executeRawQuery', query, secret);

      addDebugInfo(`Received ${Array.isArray(data) ? data.length : 'non-array'} records`);

      // Convert data to table format
      if (Array.isArray(data) && data.length > 0) {
        const columns = Object.keys(data[0]);
        const rows = data.slice((page - 1) * pageSize, page * pageSize);

        setTableData({
          columns,
          rows,
          totalCount: data.length
        });
      } else {
        setTableData({
          columns: [],
          rows: [],
          totalCount: 0
        });
      }

      setCurrentPage(page);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load table data';
      addDebugInfo(`Error loading table data: ${errorMessage}`);
      setError(errorMessage);
      setTableData(null);
    } finally {
      setLoading(false);
    }
  };

  const handleTableSelect = (tableName: string) => {
    setSelectedTable(tableName);
    setCurrentPage(1);
    setSearchTerm('');
    setSortColumn('');
    setSortDirection('asc');
    loadTableData(tableName);
  };

  const handleSearch = () => {
    loadTableData(selectedTable, 1);
  };

  const handleSort = (column: string) => {
    const newDirection = sortColumn === column && sortDirection === 'asc' ? 'desc' : 'asc';
    setSortColumn(column);
    setSortDirection(newDirection);
    loadTableData(selectedTable, currentPage);
  };

  const handlePageChange = (page: number) => {
    loadTableData(selectedTable, page);
  };

  const exportToCSV = () => {
    if (!tableData) return;

    const csvContent = [
      tableData.columns.join(','),
      ...tableData.rows.map(row =>
        tableData.columns.map(col => {
          const value = row[col];
          // Escape commas and quotes in CSV
          if (typeof value === 'string' && (value.includes(',') || value.includes('"'))) {
            return `"${value.replace(/"/g, '""')}"`;
          }
          return value || '';
        }).join(',')
      )
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `${selectedTable}_export.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const getTableCategoryBadge = (category: string) => {
    const colorMap: { [key: string]: string } = {
      'Core Entities': 'primary',
      'Transaction Details': 'success',
      'Licensing & Security': 'danger',
      'Infrastructure & Backup': 'dark',
      'Communication': 'warning',
      'Settings & Configuration': 'info',
      'Product Manufacturers': 'warning',
      'Search Indexes': 'secondary',
      'Database Views': 'light'
    };
    return <Badge bg={colorMap[category] || 'secondary'} text={category === 'Database Views' ? 'dark' : undefined}>{category}</Badge>;
  };

  const groupedTables = availableTables.reduce((acc, table) => {
    if (!acc[table.category]) {
      acc[table.category] = [];
    }
    acc[table.category].push(table);
    return acc;
  }, {} as { [key: string]: TableInfo[] });

  const totalPages = tableData ? Math.ceil(tableData.totalCount / pageSize) : 0;

  return (
    <Container fluid className="py-4">
      <Row className="mb-4">
        <Col>
          <div className="page-header">
            <h2>Table Data Viewer</h2>
            <p>Browse and inspect database table contents</p>
          </div>
        </Col>
      </Row>

      <Row className="mb-4">
        <Col md={4}>
          <Card>
            <Card.Header>
              <h5 className="mb-0">Select Table</h5>
            </Card.Header>
            <Card.Body style={{ maxHeight: '400px', overflowY: 'auto' }}>
              {Object.entries(groupedTables).map(([category, tables]) => (
                <div key={category} className="mb-3">
                  <h6 className="text-muted mb-2">{getTableCategoryBadge(category)}</h6>
                  {tables.map(table => (
                    <Button
                      key={table.name}
                      variant={selectedTable === table.name ? 'primary' : 'outline-secondary'}
                      size="sm"
                      className="w-100 mb-1 text-start"
                      onClick={() => handleTableSelect(table.name)}
                      title={table.description}
                    >
                      {table.name}
                    </Button>
                  ))}
                </div>
              ))}
            </Card.Body>
          </Card>
        </Col>

        <Col md={8}>
          {selectedTable && (
            <Card>
              <Card.Header>
                <div className="d-flex justify-content-between align-items-center">
                  <div>
                    <h5 className="mb-0">Table: {selectedTable}</h5>
                    <small className="text-muted">
                      {availableTables.find(t => t.name === selectedTable)?.description}
                    </small>
                  </div>
                  <Button
                    variant="outline-success"
                    size="sm"
                    onClick={exportToCSV}
                    disabled={!tableData || tableData.rows.length === 0}
                  >
                    Export CSV
                  </Button>
                </div>
              </Card.Header>
              <Card.Body>
                {/* Search and Filters */}
                <Row className="mb-3">
                  <Col md={6}>
                    <InputGroup>
                      <Form.Control
                        type="text"
                        placeholder="Search..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
                      />
                      <Button variant="outline-secondary" onClick={handleSearch}>
                        Search
                      </Button>
                    </InputGroup>
                  </Col>
                  <Col md={6} className="text-end">
                    <small className="text-muted">
                      {tableData ? `${tableData.totalCount} total records` : 'No data loaded'}
                    </small>
                  </Col>
                </Row>

                {/* Loading/Error States */}
                {loading && (
                  <div className="text-center py-4">
                    <Spinner animation="border" />
                    <p className="mt-2">Loading table data...</p>
                  </div>
                )}

                {error && (
                  <Alert variant="danger">
                    <strong>Error:</strong> {error}
                  </Alert>
                )}

                {/* Table Data */}
                {tableData && !loading && (
                  <>
                    <div style={{ maxHeight: '500px', overflowY: 'auto' }}>
                      <Table striped bordered hover responsive size="sm">
                        <thead className="table-dark" style={{ position: 'sticky', top: 0 }}>
                          <tr>
                            {tableData.columns.map(column => (
                              <th
                                key={column}
                                style={{ cursor: 'pointer' }}
                                onClick={() => handleSort(column)}
                              >
                                {column}
                                {sortColumn === column && (
                                  <span className="ms-1">
                                    {sortDirection === 'asc' ? '↑' : '↓'}
                                  </span>
                                )}
                              </th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {tableData.rows.map((row, index) => (
                            <tr key={index}>
                              {tableData.columns.map(column => (
                                <td key={column}>
                                  {row[column] !== null && row[column] !== undefined
                                    ? String(row[column])
                                    : <span className="text-muted">NULL</span>
                                  }
                                </td>
                              ))}
                            </tr>
                          ))}
                        </tbody>
                      </Table>
                    </div>

                    {/* Pagination */}
                    {totalPages > 1 && (
                      <div className="d-flex justify-content-center mt-3">
                        <CustomPagination
                          currentPage={currentPage}
                          totalPages={totalPages}
                          onPageChange={handlePageChange}
                        />
                      </div>
                    )}

                    {/* Page Info */}
                    <div className="text-center mt-2">
                      <small className="text-muted">
                        Page {currentPage} of {totalPages} •
                        Showing {tableData.rows.length} of {tableData.totalCount} records
                      </small>
                    </div>
                  </>
                )}

                {/* Empty State */}
                {tableData && tableData.rows.length === 0 && !loading && (
                  <div className="text-center py-4">
                    <p className="text-muted">No data found in this table.</p>
                  </div>
                )}
              </Card.Body>
            </Card>
          )}

          {!selectedTable && (
            <Card>
              <Card.Body className="text-center py-5">
                <h5 className="text-muted">Select a table to view its data</h5>
                <p className="text-muted">Choose a table from the list on the left to browse its contents.</p>
              </Card.Body>
            </Card>
          )}
        </Col>
      </Row>

      {/* Debug Information */}
      {debugInfo && (
        <Row className="mb-4">
          <Col>
            <Card>
              <Card.Header>
                <h5 className="mb-0">Debug Information</h5>
              </Card.Header>
              <Card.Body>
                <pre style={{
                  backgroundColor: '#f8f9fa',
                  padding: '10px',
                  borderRadius: '4px',
                  fontSize: '12px',
                  maxHeight: '200px',
                  overflowY: 'auto',
                  whiteSpace: 'pre-wrap'
                }}>
                  {debugInfo}
                </pre>
                <Button
                  variant="outline-secondary"
                  size="sm"
                  onClick={() => setDebugInfo('')}
                >
                  Clear Debug Info
                </Button>
              </Card.Body>
            </Card>
          </Col>
        </Row>
      )}
    </Container>
  );
};

const TableViewerWithErrorBoundary: React.FC = () => (
  <TableViewerErrorBoundary>
    <TableViewer />
  </TableViewerErrorBoundary>
);

export default TableViewerWithErrorBoundary;
