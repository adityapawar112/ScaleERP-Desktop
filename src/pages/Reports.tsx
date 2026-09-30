// src/pages/Reports.tsx
import React, { useState, useEffect, useMemo } from 'react';
import { 
  Container, 
  Row, 
  Col, 
  Card, 
  Button, 
  Form, 
  InputGroup, 
  Modal, 
  Alert,
  Tabs,
  Tab
} from 'react-bootstrap';
import { 
  MdSearch, 
  MdAssessment, 
  MdInventory, 
  MdPeople, 
  MdReceipt, 
  MdHistory,
  MdBarChart,
  MdClose,
  MdPlayArrow
} from 'react-icons/md';
import { useTranslation } from 'react-i18next';
import { useAppContext } from '../context/AppContext';
import ReportViewer from '../components/ReportViewer';
import { 
  ReportMetadata, 
  ReportData, 
  ReportConfig 
} from '../types/reports';
import * as Generators from '../utils/reportDataGenerators';
import { exportReportToExcel } from '../utils/excelExport';
import { printReport } from '../utils/printReport';
import { exportReportToPdf } from '../utils/pdfExport';

const Reports: React.FC = () => {
  const { t } = useTranslation();
  const { businessSettings } = useAppContext();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedReport, setSelectedReport] = useState<ReportMetadata | null>(null);
  const [showConfigModal, setShowConfigModal] = useState(false);
  const [generatedReport, setGeneratedReport] = useState<ReportData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [exportingPdf, setExportingPdf] = useState(false);

  // Configuration state
  const [config, setConfig] = useState<ReportConfig>({
    dateFrom: new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0],
    dateTo: new Date().toISOString().split('T')[0],
    entityId: ''
  });

  // Entity lists for filters
  const [brokers, setBrokers] = useState<any[]>([]);
  const [customers, setCustomers] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [b, c, p] = await Promise.all([
          window.electronAPI?.database.brokers.getAll() || Promise.resolve([]),
          window.electronAPI?.database.customers.getAll() || Promise.resolve([]),
          window.electronAPI?.database.products.getAll() || Promise.resolve([])
        ]);
        setBrokers(b);
        setCustomers(c);
        setProducts(p);
      } catch (err) {
        console.error('Error fetching entities for reports:', err);
      }
    };
    fetchData();
  }, []);

  const availableReports: ReportMetadata[] = [
    {
      id: 'inventory-status',
      name: t('reports.items.inventoryStatus.name', 'Inventory Status'),
      description: t('reports.items.inventoryStatus.description', 'Current stock levels and valuation across all products and manufacturers.'),
      category: 'Inventory',
      icon: 'MdInventory',
      requiresDateRange: false
    },
    {
      id: 'stock-history',
      name: t('reports.items.stockHistory.name', 'Stock Movement History'),
      description: t('reports.items.stockHistory.description', 'Detailed log of all inventory ins and outs with notes.'),
      category: 'Inventory',
      icon: 'MdHistory',
      requiresDateRange: true,
      requiresEntity: 'product'
    },
    {
      id: 'broker-transactions',
      name: t('reports.items.brokerTransactions.name', 'Broker Transactions'),
      description: t('reports.items.brokerTransactions.description', 'Purchase history from brokers within a specific period.'),
      category: 'Transactions',
      icon: 'MdReceipt',
      requiresDateRange: true,
      requiresEntity: 'broker'
    },
    {
      id: 'broker-ledger',
      name: t('reports.items.brokerLedger.name', 'Broker Ledger'),
      description: t('reports.items.brokerLedger.description', 'Unified account statement showing purchases and payments.'),
      category: 'Accounting',
      icon: 'MdBarChart',
      requiresDateRange: true,
      requiresEntity: 'broker'
    },
    {
      id: 'broker-list',
      name: t('reports.items.brokerList.name', 'Broker Master List'),
      description: t('reports.items.brokerList.description', 'Complete list of brokers with contact info and total balances.'),
      category: 'Master Data',
      icon: 'MdPeople',
      requiresDateRange: false
    },
    {
      id: 'customer-list',
      name: t('reports.items.customerList.name', 'Customer Master List'),
      description: t('reports.items.customerList.description', 'Complete list of customers with contact info and total outstanding.'),
      category: 'Master Data',
      icon: 'MdPeople',
      requiresDateRange: false
    },
    {
      id: 'customer-sales',
      name: t('reports.items.customerSales.name', 'Customer Sales Report'),
      description: t('reports.items.customerSales.description', 'Sales history to customers within a specific period.'),
      category: 'Transactions',
      icon: 'MdReceipt',
      requiresDateRange: true,
      requiresEntity: 'customer'
    },
    {
      id: 'day-book',
      name: t('reports.items.dayBook.name', 'Day Book'),
      description: t('reports.items.dayBook.description', 'Summarized view of all daily business transactions (Sales, Purchases, Payments).'),
      category: 'Accounting',
      icon: 'MdHistory',
      requiresDateRange: true
    },
    {
      id: 'outstanding-payments',
      name: t('reports.items.outstandingPayments.name', 'Outstanding Payments'),
      description: t('reports.items.outstandingPayments.description', 'Analyze pending dues from customers and payables to suppliers.'),
      category: 'Accounting',
      icon: 'MdBarChart',
      requiresDateRange: false
    }
  ];

  const filteredReports = useMemo(() => {
    return availableReports.filter(r => 
      r.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      r.description.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [searchTerm, availableReports]);

  const handleReportSelect = (report: ReportMetadata) => {
    setSelectedReport(report);
    setShowConfigModal(true);
    setGeneratedReport(null);
  };

  const handleGenerate = async () => {
    if (!selectedReport) return;
    setLoading(true);
    setError(null);

    try {
      let data: ReportData | null = null;

      switch (selectedReport.id) {
        case 'inventory-status': {
          const products = (await window.electronAPI?.database.products.getAll()) || [];
          const manufacturers = (await window.electronAPI?.database.productManufacturers.getAll()) || [];
          data = Generators.generateInventoryReport(products, manufacturers, t);
          break;
        }
        case 'broker-transactions': {
          const txs = (await window.electronAPI?.database.brokerTransactions.getAll()) || [];
          const brokers = (await window.electronAPI?.database.brokers.getAll()) || [];
          data = Generators.generateBrokerTransactionReport(txs, brokers, config, t);
          break;
        }
        case 'broker-ledger': {
          const leisures = (await window.electronAPI?.database.brokerLeisures.getAll()) || [];
          const brokers = (await window.electronAPI?.database.brokers.getAll()) || [];
          data = Generators.generateBrokerLedgerReport(leisures, brokers, config, t);
          break;
        }
        case 'broker-list': {
          const brokers = (await window.electronAPI?.database.brokers.getAll()) || [];
          data = Generators.generateBrokerListReport(brokers, t);
          break;
        }
        case 'customer-list': {
          const customers = (await window.electronAPI?.database.customers.getAll()) || [];
          data = Generators.generateCustomerListReport(customers, t);
          break;
        }
        case 'stock-history': {
          const history = (await window.electronAPI?.database.stockHistory.getAll()) || [];
          const products = (await window.electronAPI?.database.products.getAll()) || [];
          data = Generators.generateStockHistoryReport(history, products, config, t);
          break;
        }
        case 'customer-sales': {
          const txs = (await window.electronAPI?.database.customerTransactions.getAll()) || [];
          const customers = (await window.electronAPI?.database.customers.getAll()) || [];
          data = Generators.generateCustomerTransactionReport(txs, customers, config, t);
          break;
        }
        case 'day-book': {
          const [bt, ct, bl, cl] = await Promise.all([
            window.electronAPI?.database.brokerTransactions.getAll() || Promise.resolve([]),
            window.electronAPI?.database.customerTransactions.getAll() || Promise.resolve([]),
            window.electronAPI?.database.brokerLeisures.getAll() || Promise.resolve([]),
            window.electronAPI?.database.customerLeisures.getAll() || Promise.resolve([])
          ]);
          data = Generators.generateDayBookReport(bt, ct, bl, cl, config, t);
          break;
        }
        case 'outstanding-payments': {
          const [b, c] = await Promise.all([
            window.electronAPI?.database.brokers.getAll() || Promise.resolve([]),
            window.electronAPI?.database.customers.getAll() || Promise.resolve([])
          ]);
          data = Generators.generateOutstandingPaymentsReport(b, c, t);
          break;
        }
      }

      if (data) {
        setGeneratedReport(data);
        setShowConfigModal(false);
      }
    } catch (err) {
      console.error('Error generating report:', err);
      setError(t('reports.errorFailed', 'Failed to generate report. Please check database connectivity.'));
    } finally {
      setLoading(false);
    }
  };

  const handleExport = () => {
    if (generatedReport) {
      exportReportToExcel(generatedReport);
    }
  };

  const handlePrint = () => {
    if (generatedReport) {
      printReport(generatedReport, businessSettings);
    }
  };

  const handleExportPdf = async () => {
    if (!generatedReport) return;
    setExportingPdf(true);
    try {
      await new Promise(resolve => setTimeout(resolve, 50));
      await exportReportToPdf(generatedReport, businessSettings);
    } catch (err) {
      console.error('Error exporting PDF:', err);
      alert('Failed to export PDF report.');
    } finally {
      setExportingPdf(false);
    }
  };

  const getCategoryLabel = (categoryName: string) => {
    switch (categoryName) {
      case 'Inventory': return t('reports.categories.inventory', 'Inventory');
      case 'Transactions': return t('reports.categories.transactions', 'Transactions');
      case 'Accounting': return t('reports.categories.accounting', 'Accounting');
      case 'Master Data': return t('reports.categories.masterData', 'Master Data');
      default: return categoryName;
    }
  };

  const renderConfigFields = () => {
    if (!selectedReport) return null;

    return (
      <Form>
        {selectedReport.requiresDateRange && (
          <Row>
            <Col md={6}>
              <Form.Group className="mb-3">
                <Form.Label>{t('reports.config.dateFrom', 'Date From')}</Form.Label>
                <Form.Control 
                  type="date" 
                  value={config.dateFrom}
                  onChange={(e) => setConfig({ ...config, dateFrom: e.target.value })}
                />
              </Form.Group>
            </Col>
            <Col md={6}>
              <Form.Group className="mb-3">
                <Form.Label>{t('reports.config.dateTo', 'Date To')}</Form.Label>
                <Form.Control 
                  type="date" 
                  value={config.dateTo}
                  onChange={(e) => setConfig({ ...config, dateTo: e.target.value })}
                />
              </Form.Group>
            </Col>
          </Row>
        )}

        {selectedReport.requiresEntity === 'broker' && (
          <Form.Group className="mb-3">
            <Form.Label>{t('reports.selectBrokerOpt', 'Select Broker (Optional)')}</Form.Label>
            <Form.Select 
              value={config.entityId}
              onChange={(e) => setConfig({ ...config, entityId: e.target.value })}
            >
              <option value="">{t('reports.config.allBrokers', 'All Brokers')}</option>
              {brokers.map(b => (
                <option key={b.id} value={b.id}>{b.name}</option>
              ))}
            </Form.Select>
          </Form.Group>
        )}

        {selectedReport.requiresEntity === 'customer' && (
          <Form.Group className="mb-3">
            <Form.Label>{t('reports.selectCustomerOpt', 'Select Customer (Optional)')}</Form.Label>
            <Form.Select 
              value={config.entityId}
              onChange={(e) => setConfig({ ...config, entityId: e.target.value })}
            >
              <option value="">{t('reports.config.allCustomers', 'All Customers')}</option>
              {customers.map(c => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </Form.Select>
          </Form.Group>
        )}

        {selectedReport.requiresEntity === 'product' && (
          <Form.Group className="mb-3">
            <Form.Label>{t('reports.selectProductOpt', 'Select Product (Optional)')}</Form.Label>
            <Form.Select 
              value={config.entityId}
              onChange={(e) => setConfig({ ...config, entityId: e.target.value })}
            >
              <option value="">{t('reports.config.allProducts', 'All Products')}</option>
              {products.map(p => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </Form.Select>
          </Form.Group>
        )}
      </Form>
    );
  };

  const getIcon = (iconName: string) => {
    switch (iconName) {
      case 'MdInventory': return <MdInventory />;
      case 'MdPeople': return <MdPeople />;
      case 'MdReceipt': return <MdReceipt />;
      case 'MdHistory': return <MdHistory />;
      case 'MdBarChart': return <MdBarChart />;
      default: return <MdAssessment />;
    }
  };

  return (
    <Container fluid className="reports-page py-4">
      <Row className="mb-4">
        <Col>
          <div className="page-header">
            <h2>{t('reports.title')}</h2>
            <p>{t('reports.subtitle')}</p>
          </div>
        </Col>
      </Row>

      {!generatedReport && (
        <Row className="mb-4">
          <Col md={6} lg={4}>
            <InputGroup>
              <InputGroup.Text><MdSearch /></InputGroup.Text>
              <Form.Control 
                placeholder={t('reports.searchPlaceholder')} 
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </InputGroup>
          </Col>
        </Row>
      )}

      {generatedReport ? (
        <Card className="shadow-sm border-0 mb-4">
          <Card.Header className="bg-white d-flex justify-content-between align-items-center py-3">
            <Button 
              variant="link" 
              className="px-0 text-decoration-none d-flex align-items-center" 
              onClick={() => setGeneratedReport(null)}
              style={{ color: 'var(--primary-color)' }}
            >
              <MdClose className="me-1" /> {t('reports.backToList', 'Back to Report List')}
            </Button>
            <div className="d-flex gap-2">
              <Button 
                variant="outline-primary" 
                size="sm" 
                onClick={() => setShowConfigModal(true)}
                style={{ borderColor: 'var(--primary-color)', color: 'var(--primary-color)' }}
              >
                {t('reports.changeOptions', 'Change Options')}
              </Button>
            </div>
          </Card.Header>
          <Card.Body className="p-4">
            <ReportViewer 
              report={generatedReport} 
              onExportExcel={handleExport}
              onExportPdf={handleExportPdf}
              onPrint={handlePrint}
              isExporting={exportingPdf}
            />
          </Card.Body>
        </Card>
      ) : (
        <Tabs defaultActiveKey="all" className="mb-4 custom-tabs">
          <Tab eventKey="all" title={t('reports.allReports', 'All Reports')}>
            <Row className="g-4 mt-1">
              {filteredReports.map(report => {
                const categoryColors: Record<string, string> = {
                  'Inventory': '#2d6a4f',
                  'Transactions': '#be6d44',
                  'Accounting': '#a4161a',
                  'Master Data': '#0077b6'
                };
                const catColor = categoryColors[report.category] || 'var(--primary-color)';

                return (
                  <Col key={report.id} md={6} lg={4}>
                    <Card 
                      className="report-card h-100 shadow-sm border-0 hover-lift clickable"
                      onClick={() => handleReportSelect(report)}
                      style={{ cursor: 'pointer', borderLeft: `5px solid ${catColor}` }}
                    >
                      <Card.Body className="d-flex align-items-start p-4">
                        <div 
                          className="report-icon-wrapper rounded-circle p-3 me-3"
                          style={{ backgroundColor: `${catColor}15`, color: catColor }}
                        >
                          {getIcon(report.icon)}
                        </div>
                        <div>
                          <h5 className="mb-2">{report.name}</h5>
                          <p className="text-muted small mb-0">{report.description}</p>
                          <div className="mt-3">
                            <span 
                              className="badge bg-opacity-10 px-2 py-1"
                              style={{ backgroundColor: `${catColor}15`, color: catColor }}
                            >
                              {getCategoryLabel(report.category)}
                            </span>
                          </div>
                        </div>
                      </Card.Body>
                      <Card.Footer 
                        className="bg-transparent border-0 text-end pb-3"
                        style={{ color: catColor }}
                      >
                        {t('reports.configureAndGenerate', 'Configure & Generate →')}
                      </Card.Footer>
                    </Card>
                  </Col>
                );
              })}
            </Row>
          </Tab>
          
          {['Inventory', 'Transactions', 'Accounting', 'Master Data'].map(cat => (
            <Tab key={cat} eventKey={cat.toLowerCase()} title={getCategoryLabel(cat)}>
               <Row className="g-4 mt-1">
                {filteredReports.filter(r => r.category === cat).map(report => (
                  <Col key={report.id} md={6} lg={4}>
                    <Card 
                      className="report-card h-100 shadow-sm border-0 hover-lift"
                      onClick={() => handleReportSelect(report)}
                      style={{ cursor: 'pointer' }}
                    >
                      <Card.Body className="d-flex align-items-start p-4">
                        <div className="report-icon-wrapper rounded-circle p-3 bg-primary bg-opacity-10 text-primary me-3">
                          {getIcon(report.icon)}
                        </div>
                        <div>
                          <h5 className="mb-2">{report.name}</h5>
                          <p className="text-muted small mb-0">{report.description}</p>
                        </div>
                      </Card.Body>
                    </Card>
                  </Col>
                ))}
              </Row>
            </Tab>
          ))}
        </Tabs>
      )}

      {/* Configuration Modal */}
      <Modal show={showConfigModal} onHide={() => setShowConfigModal(false)} centered>
        <Modal.Header closeButton>
          <Modal.Title>{t('reports.config.title', 'Configure Report')}: {selectedReport?.name}</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {error && <Alert variant="danger">{error}</Alert>}
          <div className="mb-4">
            <h6 className="text-muted small text-uppercase mb-3">{t('reports.generationOptions', 'Generation Options')}</h6>
            {renderConfigFields()}
          </div>
          <div className="p-3 bg-light rounded small text-muted border-start border-primary border-4">
            <strong>{t('reports.note', 'Note:')}</strong> {t('reports.noteText', 'Generating complex reports may take a few seconds depending on the volume of data.')}
          </div>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowConfigModal(false)}>
            {t('reports.cancel', 'Cancel')}
          </Button>
          <Button 
            variant="primary" 
            onClick={handleGenerate} 
            disabled={loading}
            className="d-flex align-items-center"
          >
            {loading ? (
              <>
                <div className="spinner-border spinner-border-sm me-2" role="status" />
                {t('reports.generating', 'Generating...')}
              </>
            ) : (
              <>
                <MdPlayArrow className="me-2" /> {t('reports.generateReport', 'Generate Report')}
              </>
            )}
          </Button>
        </Modal.Footer>
      </Modal>

      <style>{`
        .hover-lift {
          transition: transform 0.2s ease-in-out, box-shadow 0.2s ease-in-out;
        }
        .hover-lift:hover {
          transform: translateY(-5px);
          box-shadow: 0 10px 20px rgba(0,0,0,0.1) !important;
        }
        .report-icon-wrapper svg {
          font-size: 24px;
        }
        .custom-tabs .nav-link {
          color: #6c757d;
          border: none;
          padding: 0.8rem 1.5rem;
          font-weight: 600;
          transition: all 0.2s;
        }
        .custom-tabs .nav-link.active {
          color: var(--primary-color) !important;
          background: transparent;
          border-bottom: 3px solid var(--primary-color);
        }
        .custom-tabs .nav-link:hover:not(.active) {
          color: var(--primary-color);
          background: rgba(190, 109, 68, 0.05);
        }
      `}</style>
    </Container>
  );
};

export default Reports;
