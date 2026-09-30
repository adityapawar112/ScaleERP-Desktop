import React, { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { Container, Row, Col, Card, Button, Alert, Table, Badge, Spinner } from 'react-bootstrap';
import type { ElectronAPI } from '../types/electron';

// Error Boundary Component
class DatabaseDiagnosticsErrorBoundary extends React.Component<
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
    console.error('DatabaseDiagnostics Error Boundary caught an error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <Container fluid className="py-4">
          <Row className="mb-4">
            <Col>
              <div className="page-header">
                <h2>Database Diagnostics</h2>
                <p>Check database connectivity and view system statistics</p>
              </div>
            </Col>
          </Row>
          <Alert variant="danger">
            <h4>Component Error</h4>
            <p>An error occurred while loading the Database Diagnostics page.</p>
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

interface DatabaseStats {
  // Core entities (8 tables) - SINGLE SOURCE OF TRUTH
  products: { count: number };
  brokers: { count: number };
  customers: { count: number };
  brokerTransactions: { count: number };
  customerTransactions: { count: number };
  brokerLeisures: { count: number };
  customerLeisures: { count: number };
  stockHistory: { count: number };

  // Transaction product tables (2 tables)
  brokerTransactionProducts?: { count: number };
  customerTransactionProducts?: { count: number };

  // Settings and configuration (1 table) - INPUT MECHANISM ONLY
  businessSettings?: { count: number };

  // Product manufacturers (1 table) - SINGLE SOURCE OF TRUTH
  productManufacturers?: { count: number };

  // Full-text search tables (4 tables)
  productsFts?: { count: number };
  brokersFts?: { count: number };
  customersFts?: { count: number };

  // Views (3 views)
  productStockSummary?: { count: number };
  brokerTransactionSummary?: { count: number };
  customerTransactionSummary?: { count: number };

  // Database size
  databaseSize?: { size: number };
}

const DatabaseDiagnostics: React.FC = () => {
  const { t } = useTranslation();
  const [stats, setStats] = useState<DatabaseStats | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dbStatus, setDbStatus] = useState<'checking' | 'connected' | 'error'>('checking');
  const [lastChecked, setLastChecked] = useState<Date | null>(null);
  const [debugInfo, setDebugInfo] = useState<string>('');

  const [resetRunning, setResetRunning] = useState(false);
  const [seedRunning, setSeedRunning] = useState(false);

  const addDebugInfo = useCallback((info: string) => {
    console.log('[DatabaseDiagnostics]', info);
    setDebugInfo(prev => prev + '\n' + new Date().toLocaleTimeString() + ': ' + info);
  }, []);

  const checkDatabaseConnection = useCallback(async () => {
    try {
      addDebugInfo('Checking database connection...');
      setDbStatus('checking');
      setError(null);

      // Check if Electron API is available
      if (!window.electronAPI) {
        throw new Error('Electron API not available - window.electronAPI is undefined');
      }
      addDebugInfo('Electron API available');

      // Try to get database stats to test connection
      addDebugInfo('Calling getStats method...');

      const result = await window.electronAPI.invoke('db:getStats');
      addDebugInfo('getStats call successful: ' + JSON.stringify(result));

      setDbStatus('connected');
      return true;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown database error';
      addDebugInfo('Database connection check failed: ' + errorMessage);
      setDbStatus('error');
      setError(errorMessage);
      return false;
    }
  }, [addDebugInfo]);

  const runDiagnostics = useCallback(async () => {
    addDebugInfo('Starting diagnostics...');
    setLoading(true);
    setError(null);

    try {
      // First check connection
      const isConnected = await checkDatabaseConnection();
      if (!isConnected) {
        throw new Error('Database connection failed');
      }

      // Get database statistics
      if (!window.electronAPI) {
        throw new Error('Electron API not available');
      }

      addDebugInfo('Calling getDatabaseStats method...');
      const dbStats = await window.electronAPI.invoke('db:getDatabaseStats');
      addDebugInfo('getDatabaseStats call successful: ' + JSON.stringify(dbStats));

      setStats(dbStats);
      setLastChecked(new Date());
      addDebugInfo('Diagnostics completed successfully');
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to run diagnostics';
      addDebugInfo('Diagnostics failed: ' + errorMessage);
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  }, [addDebugInfo, checkDatabaseConnection]);

  const getStatusBadge = (status: 'checking' | 'connected' | 'error') => {
    switch (status) {
      case 'checking':
        return <Badge bg="warning">Checking...</Badge>;
      case 'connected':
        return <Badge bg="success">Connected</Badge>;
      case 'error':
        return <Badge bg="danger">Error</Badge>;
    }
  };

  const getTableHealthStatus = (count: number) => {
    if (count === 0) return <Badge bg="secondary">Empty</Badge>;
    if (count < 10) return <Badge bg="warning">Low Data</Badge>;
    return <Badge bg="success">Healthy</Badge>;
  };

  useEffect(() => {
    runDiagnostics();
  }, [runDiagnostics]);

  return (
    <Container fluid className="py-4">
      <Row className="mb-4">
        <Col>
          <div className="page-header">
            <h2>{t('dev.databaseDiagnostics')}</h2>
            <p>Check database connectivity and view system statistics</p>
          </div>
        </Col>
      </Row>

      {/* Database Status */}
      <Row className="mb-4">
        <Col md={6}>
          <Card>
            <Card.Header>
              <h5 className="mb-0">Database Connection Status</h5>
            </Card.Header>
            <Card.Body>
              <div className="d-flex align-items-center mb-3">
                <span className="me-3">Status:</span>
                {getStatusBadge(dbStatus)}
              </div>

              {dbStatus === 'connected' && (
                <div className="mb-3">
                  <small className="text-muted">
                    Database initialized successfully
                  </small>
                </div>
              )}

              {error && (
                <Alert variant="danger">
                  <strong>Error:</strong> {error}
                </Alert>
              )}

              <Button
                onClick={runDiagnostics}
                disabled={loading}
                variant="primary"
              >
                {loading ? (
                  <>
                    <Spinner animation="border" size="sm" className="me-2" />
                    Running Diagnostics...
                  </>
                ) : (
                  'Run Diagnostics'
                )}
              </Button>

              {lastChecked && (
                <div className="mt-2">
                  <small className="text-muted">
                    Last checked: {lastChecked.toLocaleString()}
                  </small>
                </div>
              )}
            </Card.Body>
          </Card>
        </Col>

        <Col md={6}>
          <Card>
            <Card.Header>
              <h5 className="mb-0">Quick Actions</h5>
            </Card.Header>
            <Card.Body>
              <div className="d-grid gap-2">
                <Button
                  variant="outline-primary"
                  onClick={() => window.location.reload()}
                >
                  Refresh Page
                </Button>
                <Button
                  variant="outline-secondary"
                  onClick={() => {
                    if (window.electronAPI && window.electronAPI.getAppVersion) {
                      window.electronAPI.getAppVersion().then((version: string) => {
                        alert(`App Version: ${version}`);
                      });
                    } else {
                      alert('Electron API not available');
                    }
                  }}
                >
                  Check App Version
                </Button>

                <Button
                  variant="danger"
                  onClick={async () => {
                    const confirmReset = window.confirm(
                      '💥 DATABASE RESET\n\n' +
                      'This will completely delete the database file and recreate it from scratch!\n\n' +
                      'What this does:\n' +
                      '• Deletes the current database file (inventory.db)\n' +
                      '• Recreates the database with fresh schema\n' +
                      '• All data will be permanently lost\n\n' +
                      '⚠️ THIS CANNOT BE UNDONE! Make sure you have a backup!\n\n' +
                      'Continue?'
                    );

                    if (confirmReset) {
                      setResetRunning(true);
                      addDebugInfo('Starting database reset...');

                      try {
                        if (!window.electronAPI) {
                          throw new Error('Electron API not available');
                        }

                        const secret = window.sessionStorage.getItem('dev_secret_stored') || '';
                        if (!secret) {
                          throw new Error('Developer authentication required. Please authenticate via the Dashboard first.');
                        }

                        await window.electronAPI.invoke('db:resetDatabase', secret);
                        addDebugInfo('✅ Database reset completed successfully!');

                        alert(
                          '✅ Database Reset Completed!\n\n' +
                          'The database has been completely reset:\n' +
                          '• Database file deleted and recreated\n' +
                          '• All tables recreated with fresh schema\n' +
                          '• All data permanently lost\n\n' +
                          '🔄 The page will now refresh to reconnect to the new database.'
                        );

                        // Refresh the page to reconnect to the new database
                        window.location.reload();

                      } catch (error) {
                        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
                        addDebugInfo('❌ Database reset failed: ' + errorMessage);
                        alert('❌ Database reset failed: ' + errorMessage);
                      } finally {
                        setResetRunning(false);
                      }
                    }
                  }}
                  disabled={resetRunning}
                >
                  {resetRunning ? (
                    <>
                      <Spinner animation="border" size="sm" className="me-2" />
                      Resetting Database...
                    </>
                  ) : (
                    '💥 Reset Database'
                  )}
                </Button>

                <Button
                  variant="warning"
                  onClick={async () => {
                    const confirmSeed = window.confirm(t('dev.generateSampleDataConfirm'));

                    if (confirmSeed) {
                      setSeedRunning(true);
                      addDebugInfo('Starting sample data generation...');

                      try {
                        if (!window.electronAPI || !window.electronAPI.database.seedDatabase) {
                          throw new Error('Electron API not available');
                        }

                        const secret = window.sessionStorage.getItem('dev_secret_stored') || '';
                        if (!secret) {
                          throw new Error('Developer authentication required. Please authenticate via the Dashboard first.');
                        }

                        const result = await window.electronAPI.database.seedDatabase(secret);
                        if (result.success) {
                          addDebugInfo('✅ Sample data generation completed successfully!');
                          alert(t('dev.sampleDataGenerated'));
                          runDiagnostics(); // Refresh stats
                        } else {
                          throw new Error(result.message || 'Unknown error');
                        }

                      } catch (error) {
                        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
                        addDebugInfo('❌ Sample data generation failed: ' + errorMessage);
                        alert(t('dev.sampleDataGenerationFailed') + ': ' + errorMessage);
                      } finally {
                        setSeedRunning(false);
                      }
                    }
                  }}
                  disabled={seedRunning || resetRunning}
                >
                  {seedRunning ? (
                    <>
                      <Spinner animation="border" size="sm" className="me-2" />
                      {t('dev.generatingSampleData')}
                    </>
                  ) : (
                    <>
                      <i className="bi bi-database-add me-2"></i>
                      {t('dev.generateSampleData')}
                    </>
                  )}
                </Button>
                <Button
                  variant="outline-info"
                  onClick={async () => {
                    try {
                      if (!window.electronAPI) {
                        throw new Error('Electron API not available');
                      }

                      await window.electronAPI.invoke('db:openDatabaseFolder');
                      addDebugInfo('✅ Database folder opened successfully!');
                    } catch (error) {
                      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
                      addDebugInfo('❌ Failed to open database folder: ' + errorMessage);
                      alert('❌ Failed to open database folder: ' + errorMessage);
                    }
                  }}
                >
                  📁 Open Database Folder
                </Button>


              </div>
            </Card.Body>
          </Card>
        </Col>
      </Row>

      {/* Database Statistics */}
      {stats && (
        <Row className="mb-4">
          <Col>
            <Card>
              <Card.Header>
                <h5 className="mb-0">Database Statistics</h5>
              </Card.Header>
              <Card.Body>
                <Table striped bordered hover responsive>
                  <thead>
                    <tr>
                      <th>Table</th>
                      <th>Record Count</th>
                      <th>Status</th>
                      <th>Description</th>
                    </tr>
                  </thead>
                  <tbody>
                    {/* Core Entities  */}
                    <tr className="table-primary">
                      <td colSpan={4}><strong>🔵 Core Entities (PRIMARY DATA)</strong></td>
                    </tr>
                    <tr>
                      <td>Products</td>
                      <td>{stats.products.count}</td>
                      <td>{getTableHealthStatus(stats.products.count)}</td>
                      <td>Product catalog and inventory items </td>
                    </tr>
                    <tr>
                      <td>Product Manufacturers</td>
                      <td>{stats.productManufacturers?.count || 0}</td>
                      <td>{getTableHealthStatus(stats.productManufacturers?.count || 0)}</td>
                      <td>Product-manufacturer stock relationships </td>
                    </tr>
                    <tr>
                      <td>Brokers</td>
                      <td>{stats.brokers.count}</td>
                      <td>{getTableHealthStatus(stats.brokers.count)}</td>
                      <td>Supplier/vendor information </td>
                    </tr>
                    <tr>
                      <td>Customers</td>
                      <td>{stats.customers.count}</td>
                      <td>{getTableHealthStatus(stats.customers.count)}</td>
                      <td>Customer/client information </td>
                    </tr>
                    <tr>
                      <td>Broker Transactions</td>
                      <td>{stats.brokerTransactions.count}</td>
                      <td>{getTableHealthStatus(stats.brokerTransactions.count)}</td>
                      <td>Purchase transactions from brokers </td>
                    </tr>
                    <tr>
                      <td>Customer Transactions</td>
                      <td>{stats.customerTransactions.count}</td>
                      <td>{getTableHealthStatus(stats.customerTransactions.count)}</td>
                      <td>Sales transactions to customers </td>
                    </tr>
                    <tr>
                      <td>Broker Leisures</td>
                      <td>{stats.brokerLeisures.count}</td>
                      <td>{getTableHealthStatus(stats.brokerLeisures.count)}</td>
                      <td>Broker payment records </td>
                    </tr>
                    <tr>
                      <td>Customer Leisures</td>
                      <td>{stats.customerLeisures.count}</td>
                      <td>{getTableHealthStatus(stats.customerLeisures.count)}</td>
                      <td>Customer payment records </td>
                    </tr>
                    <tr>
                      <td>Stock History</td>
                      <td>{stats.stockHistory.count}</td>
                      <td>{getTableHealthStatus(stats.stockHistory.count)}</td>
                      <td>Stock movement records </td>
                    </tr>

                    {/* Transaction Product Tables */}
                    <tr className="table-success">
                      <td colSpan={4}><strong>🟢 Transaction Details</strong></td>
                    </tr>
                    <tr>
                      <td>Broker Transaction Products</td>
                      <td>{stats.brokerTransactionProducts?.count || 0}</td>
                      <td>{getTableHealthStatus(stats.brokerTransactionProducts?.count || 0)}</td>
                      <td>Product details for broker transactions</td>
                    </tr>
                    <tr>
                      <td>Customer Transaction Products</td>
                      <td>{stats.customerTransactionProducts?.count || 0}</td>
                      <td>{getTableHealthStatus(stats.customerTransactionProducts?.count || 0)}</td>
                      <td>Product details for customer transactions</td>
                    </tr>

                    {/* Settings and Configuration (Input Mechanisms) */}
                    <tr className="table-secondary">
                      <td colSpan={4}><strong>⚪ Settings & Configuration (INPUT ONLY)</strong></td>
                    </tr>
                    <tr>
                      <td>Business Settings</td>
                      <td>{stats.businessSettings?.count || 0}</td>
                      <td>{getTableHealthStatus(stats.businessSettings?.count || 0)}</td>
                      <td>Business configuration settings (INPUT MECHANISM - Single Source of Truth)</td>
                    </tr>

                    {/* Full-Text Search Tables */}
                    <tr className="table-secondary">
                      <td colSpan={4}><strong>Search Indexes</strong></td>
                    </tr>
                    <tr>
                      <td>Products FTS</td>
                      <td>{stats.productsFts?.count || 0}</td>
                      <td>{getTableHealthStatus(stats.productsFts?.count || 0)}</td>
                      <td>Full-text search index for products</td>
                    </tr>
                    <tr>
                      <td>Brokers FTS</td>
                      <td>{stats.brokersFts?.count || 0}</td>
                      <td>{getTableHealthStatus(stats.brokersFts?.count || 0)}</td>
                      <td>Full-text search index for brokers</td>
                    </tr>
                    <tr>
                      <td>Customers FTS</td>
                      <td>{stats.customersFts?.count || 0}</td>
                      <td>{getTableHealthStatus(stats.customersFts?.count || 0)}</td>
                      <td>Full-text search index for customers</td>
                    </tr>

                    {/* Database Views */}
                    <tr className="table-light">
                      <td colSpan={4}><strong>Database Views</strong></td>
                    </tr>
                    <tr>
                      <td>Product Stock Summary</td>
                      <td>{stats.productStockSummary?.count || 0}</td>
                      <td>{getTableHealthStatus(stats.productStockSummary?.count || 0)}</td>
                      <td>Product stock summary view</td>
                    </tr>
                    <tr>
                      <td>Broker Transaction Summary</td>
                      <td>{stats.brokerTransactionSummary?.count || 0}</td>
                      <td>{getTableHealthStatus(stats.brokerTransactionSummary?.count || 0)}</td>
                      <td>Broker transaction summary view</td>
                    </tr>
                    <tr>
                      <td>Customer Transaction Summary</td>
                      <td>{stats.customerTransactionSummary?.count || 0}</td>
                      <td>{getTableHealthStatus(stats.customerTransactionSummary?.count || 0)}</td>
                      <td>Customer transaction summary view</td>
                    </tr>
                  </tbody>
                </Table>

                <div className="mt-3">
                  <h6>Summary</h6>
                  <Row>
                    <Col md={3}>
                      <div className="text-center">
                        <h4 className="text-primary">{stats.products.count + stats.brokers.count + stats.customers.count}</h4>
                        <small className="text-muted">Master Records</small>
                      </div>
                    </Col>
                    <Col md={3}>
                      <div className="text-center">
                        <h4 className="text-success">{stats.brokerTransactions.count + stats.customerTransactions.count}</h4>
                        <small className="text-muted">Transactions</small>
                      </div>
                    </Col>
                    <Col md={3}>
                      <div className="text-center">
                        <h4 className="text-info">{stats.brokerLeisures.count + stats.customerLeisures.count}</h4>
                        <small className="text-muted">Payment Records</small>
                      </div>
                    </Col>
                    <Col md={3}>
                      <div className="text-center">
                        <h4 className="text-warning">{stats.stockHistory.count}</h4>
                        <small className="text-muted">Stock Movements</small>
                      </div>
                    </Col>
                  </Row>
                </div>
              </Card.Body>
            </Card>
          </Col>
        </Row>
      )}

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

      {/* System Information */}
      <Row>
        <Col>
          <Card>
            <Card.Header>
              <h5 className="mb-0">System Information</h5>
            </Card.Header>
            <Card.Body>
              <Row>
                <Col md={6}>
                  <h6>Environment</h6>
                  <ul className="list-unstyled">
                    <li><strong>Platform:</strong> {window.navigator.platform}</li>
                    <li><strong>User Agent:</strong> {window.navigator.userAgent.substring(0, 50)}...</li>
                    <li><strong>Language:</strong> {window.navigator.language}</li>
                    <li><strong>Online:</strong> {window.navigator.onLine ? 'Yes' : 'No'}</li>
                  </ul>
                </Col>
                <Col md={6}>
                  <h6>Application</h6>
                  <ul className="list-unstyled">
                    <li><strong>Electron Available:</strong> {typeof window.electronAPI !== 'undefined' ? 'Yes' : 'No'}</li>
                    <li><strong>Database API Available:</strong> {typeof window.electronAPI?.database !== 'undefined' ? 'Yes' : 'No'}</li>
                    <li><strong>React Version:</strong> {React.version}</li>
                    <li><strong>Timestamp:</strong> {new Date().toLocaleString()}</li>
                  </ul>
                </Col>
              </Row>
            </Card.Body>
          </Card>
        </Col>
      </Row>
    </Container>
  );
};

const DatabaseDiagnosticsWithErrorBoundary: React.FC = () => (
  <DatabaseDiagnosticsErrorBoundary>
    <DatabaseDiagnostics />
  </DatabaseDiagnosticsErrorBoundary>
);

export default DatabaseDiagnosticsWithErrorBoundary;
