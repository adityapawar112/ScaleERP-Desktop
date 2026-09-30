// src/pages/Dashboard.tsx
import React, { useMemo } from 'react';
import { Container, Row, Col, Card, Button, Table } from 'react-bootstrap';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { useAppContext } from '../context/AppContext';
import { 
  MdInventory, 
  MdTrendingUp, 
  MdTrendingDown, 
  MdAttachMoney, 
  MdAddShoppingCart, 
  MdLocalShipping, 
  MdOutlineWhatsapp, 
  MdDescription,
  MdWarning,
  MdBarChart,
  MdPieChart,
  MdHistory
} from 'react-icons/md';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
  Filler
} from 'chart.js';
import { Line, Doughnut } from 'react-chartjs-2';
import '../styles/Dashboard.css';

// Register ChartJS components
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

const Dashboard: React.FC = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { 
    products, 
    brokers, 
    customers, 
    customerTransactions, 
    brokerTransactions,
    loading 
  } = useAppContext();

  // 1. Calculate KPIs
  const kpis = useMemo(() => {
    const totalInventoryValue = products.reduce((acc, p) => acc + (p.stockQuantity * p.price), 0);
    const totalReceivables = customers.reduce((acc, c) => acc + (c.totalPending - c.totalPaid), 0);
    const totalPayables = brokers.reduce((acc, b) => acc + (b.totalPending - b.totalPaid), 0);
    
    const today = new Date().toISOString().split('T')[0];
    const todaySales = customerTransactions
      .filter(t => t.date === today)
      .reduce((acc, t) => acc + t.totalAmount, 0);

    const netValue = (totalInventoryValue + totalReceivables) - totalPayables;

    return {
      inventoryValue: totalInventoryValue,
      receivables: totalReceivables,
      payables: totalPayables,
      todaySales,
      netValue
    };
  }, [products, customers, brokers, customerTransactions]);

  // 2. Sales Trend Data (Last 30 Days)
  const salesTrendData = useMemo(() => {
    const last30Days = [...Array(30)].map((_, i) => {
      const d = new Date();
      d.setDate(d.getDate() - (29 - i));
      return d.toISOString().split('T')[0];
    });

    const dailyTotals = last30Days.map(date => {
      return customerTransactions
        .filter(t => t.date === date)
        .reduce((acc, t) => acc + t.totalAmount, 0);
    });

    return {
      labels: last30Days.map(d => new Date(d).toLocaleDateString(undefined, { day: 'numeric', month: 'short' })),
      datasets: [
        {
          fill: true,
          label: t('dashboard.charts.salesTrend'),
          data: dailyTotals,
          borderColor: '#4f46e5',
          backgroundColor: 'rgba(79, 70, 229, 0.1)',
          tension: 0.4,
        },
      ],
    };
  }, [customerTransactions, t]);

  // 3. Stock Distribution Data (by Manufacturer)
  const stockDistributionData = useMemo(() => {
    const manufacturerMap = new Map<string, number>();
    
    products.forEach(p => {
      p.manufacturerStocks.forEach(ms => {
        const current = manufacturerMap.get(ms.manufacturerName) || 0;
        manufacturerMap.set(ms.manufacturerName, current + ms.quantity);
      });
    });

    const sortedManufacturers = Array.from(manufacturerMap.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5); // Top 5

    return {
      labels: sortedManufacturers.map(m => m[0]),
      datasets: [
        {
          label: 'Stock Quantity',
          data: sortedManufacturers.map(m => m[1]),
          backgroundColor: [
            '#4f46e5',
            '#10b981',
            '#f59e0b',
            '#ef4444',
            '#8b5cf6',
          ],
          borderWidth: 1,
        },
      ],
    };
  }, [products]);

  // 4. Financial Health Score
  const financialHealth = useMemo(() => {
    if (kpis.payables === 0) return 100;
    const ratio = kpis.receivables / kpis.payables;
    const score = Math.min(Math.round(ratio * 50), 100);
    return score;
  }, [kpis]);

  // 5. Low Stock Alerts (Threshold < 10)
  const lowStockProducts = useMemo(() => {
    return products
      .filter(p => p.stockQuantity < 10 && !p.isArchived)
      .slice(0, 5);
  }, [products]);

  // 6. Top Customers and Brokers
  const topCustomers = useMemo(() => {
    return [...customers]
      .sort((a, b) => b.totalPending - a.totalPending)
      .slice(0, 3);
  }, [customers]);

  const topBrokers = useMemo(() => {
    return [...brokers]
      .sort((a, b) => b.totalPending - a.totalPending)
      .slice(0, 3);
  }, [brokers]);

  // 7. Recent Transactions
  const recentTransactions = useMemo(() => {
    return [...customerTransactions]
      .sort((a, b) => b.date.localeCompare(a.date) || b.time.localeCompare(a.time))
      .slice(0, 5);
  }, [customerTransactions]);

  const formatCurrency = (val: number) => {
    return '₹' + val.toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 0 });
  };

  if (loading) {
    return (
      <Container className="d-flex align-items-center justify-content-center" style={{ minHeight: '80vh' }}>
        <div className="text-center">
          <div className="spinner-border text-primary mb-3" role="status" />
          <p>{t('common.loading')}</p>
        </div>
      </Container>
    );
  }

  return (
    <Container fluid className="dashboard-container py-4">
      {/* Header */}
      <Row className="mb-4">
        <Col>
          <div className="page-header">
            <h2>{t('dashboard.title')}</h2>
            <p>{t('dashboard.subtitle')}</p>
          </div>
        </Col>
      </Row>

      {/* KPI Cards Row */}
      <Row className="g-4 mb-4">
        <Col md={3}>
          <Card className="kpi-card kpi-inventory">
            <Card.Body>
              <div className="kpi-icon-wrapper">
                <MdInventory size={24} />
              </div>
              <p className="kpi-label">{t('dashboard.kpis.inventoryValue')}</p>
              <h3 className="kpi-value">{formatCurrency(kpis.inventoryValue)}</h3>
            </Card.Body>
          </Card>
        </Col>
        <Col md={3}>
          <Card className="kpi-card kpi-receivables">
            <Card.Body>
              <div className="kpi-icon-wrapper">
                <MdTrendingUp size={24} />
              </div>
              <p className="kpi-label">{t('dashboard.kpis.receivables')}</p>
              <h3 className="kpi-value">{formatCurrency(kpis.receivables)}</h3>
            </Card.Body>
          </Card>
        </Col>
        <Col md={3}>
          <Card className="kpi-card kpi-payables">
            <Card.Body>
              <div className="kpi-icon-wrapper">
                <MdTrendingDown size={24} />
              </div>
              <p className="kpi-label">{t('dashboard.kpis.payables')}</p>
              <h3 className="kpi-value">{formatCurrency(kpis.payables)}</h3>
            </Card.Body>
          </Card>
        </Col>
        <Col md={3}>
          <Card className="kpi-card kpi-sales">
            <Card.Body>
              <div className="kpi-icon-wrapper">
                <MdAttachMoney size={24} />
              </div>
              <p className="kpi-label">{t('dashboard.kpis.todaySales')}</p>
              <h3 className="kpi-value">{formatCurrency(kpis.todaySales)}</h3>
            </Card.Body>
          </Card>
        </Col>
      </Row>

      {/* Main Content Area */}
      <Row className="g-4">
        {/* Left Column: Charts and Quick Actions */}
        <Col lg={8}>
          <Row className="g-4">
            {/* Sales Trend Chart */}
            <Col md={12}>
              <div className="dashboard-section-card">
                <h5 className="section-title">
                  <MdBarChart /> {t('dashboard.charts.salesTrend')}
                </h5>
                <div style={{ height: '300px' }}>
                  <Line 
                    data={salesTrendData} 
                    options={{ 
                      responsive: true, 
                      maintainAspectRatio: false,
                      plugins: { legend: { display: false } },
                      scales: {
                        y: { beginAtZero: true, grid: { color: '#f3f4f6' } },
                        x: { grid: { display: false } }
                      }
                    }} 
                  />
                </div>
              </div>
            </Col>

            {/* Quick Actions */}
            <Col md={12}>
              <div className="dashboard-section-card glass-effect">
                <h5 className="section-title">{t('dashboard.quickActions.title')}</h5>
                <Row className="g-3">
                  <Col xs={6} md={3}>
                    <button className="quick-action-btn" onClick={() => navigate('/customer-transactions')}>
                      <MdAddShoppingCart size={24} />
                      {t('dashboard.quickActions.newSale')}
                    </button>
                  </Col>
                  <Col xs={6} md={3}>
                    <button className="quick-action-btn" onClick={() => navigate('/broker-transactions')}>
                      <MdLocalShipping size={24} />
                      {t('dashboard.quickActions.newPurchase')}
                    </button>
                  </Col>
                  <Col xs={6} md={3}>
                    <button className="quick-action-btn" onClick={() => navigate('/whatsapp-manager')}>
                      <MdOutlineWhatsapp size={24} />
                      {t('dashboard.quickActions.sendReminder')}
                    </button>
                  </Col>
                  <Col xs={6} md={3}>
                    <button className="quick-action-btn" onClick={() => navigate('/reports')}>
                      <MdDescription size={24} />
                      {t('dashboard.quickActions.viewReports')}
                    </button>
                  </Col>
                </Row>
              </div>
            </Col>

            {/* Recent Transactions Table */}
            <Col md={12}>
              <div className="dashboard-section-card">
                <h5 className="section-title">
                  <MdHistory /> {t('dashboard.entities.recentTransactions')}
                </h5>
                <Table responsive hover borderless className="mb-0">
                  <thead className="bg-light">
                    <tr>
                      <th>{t('common.date')}</th>
                      <th>{t('brokerTransactions.invoiceNo')}</th>
                      <th>{t('customerTransactions.customer')}</th>
                      <th>{t('common.amount')}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {recentTransactions.map(tx => (
                      <tr key={tx.id}>
                        <td className="text-muted small">{tx.date}</td>
                        <td className="fw-semibold">{tx.invoiceNumber || 'N/A'}</td>
                        <td>{customers.find(c => c.id === tx.customerId)?.name || 'Walk-in'}</td>
                        <td className="text-success fw-bold">{formatCurrency(tx.totalAmount)}</td>
                      </tr>
                    ))}
                  </tbody>
                </Table>
              </div>
            </Col>
          </Row>
        </Col>

        {/* Right Column: Distribution, Alerts, and Rankings */}
        <Col lg={4}>
          <Row className="g-4">
            {/* Financial Health Gauge */}
            <Col md={12}>
              <div className="dashboard-section-card">
                <h5 className="section-title">{t('dashboard.charts.financialHealth')}</h5>
                <div className="health-gauge-container">
                  <div className="health-score">{financialHealth}%</div>
                  <div className="health-label">Business Vitality Index</div>
                  <div className="mt-3 w-100 bg-light rounded-pill" style={{ height: '8px' }}>
                    <div 
                      className={`h-100 rounded-pill ${financialHealth > 70 ? 'bg-success' : financialHealth > 40 ? 'bg-warning' : 'bg-danger'}`}
                      style={{ width: `${financialHealth}%` }}
                    />
                  </div>
                </div>
              </div>
            </Col>

            {/* Stock Distribution */}
            <Col md={12}>
              <div className="dashboard-section-card">
                <h5 className="section-title">
                  <MdPieChart /> {t('dashboard.charts.stockDistribution')}
                </h5>
                <div style={{ height: '220px' }}>
                  <Doughnut 
                    data={stockDistributionData}
                    options={{
                      responsive: true,
                      maintainAspectRatio: false,
                      plugins: { legend: { position: 'bottom', labels: { boxWidth: 12, font: { size: 10 } } } }
                    }}
                  />
                </div>
              </div>
            </Col>

            {/* Low Stock Alerts */}
            <Col md={12}>
              <div className="dashboard-section-card bg-light border-0">
                <h5 className="section-title text-danger">
                  <MdWarning /> {t('dashboard.alerts.lowStock')}
                </h5>
                {lowStockProducts.length > 0 ? (
                  lowStockProducts.map(p => (
                    <div key={p.id} className="alert-item">
                      <div className="alert-info">
                        <h6>{p.name}</h6>
                        <p>{p.manufacturerStocks[0]?.manufacturerName || 'Unknown'}</p>
                      </div>
                      <div className="alert-badge">
                        {p.stockQuantity} {t('dashboard.alerts.unitsLeft')}
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="text-muted small text-center py-3">{t('dashboard.alerts.noAlerts')}</p>
                )}
              </div>
            </Col>

            {/* Top Entities */}
            <Col md={12}>
              <div className="dashboard-section-card">
                <h5 className="section-title">{t('dashboard.entities.topCustomers')}</h5>
                {topCustomers.map((c, i) => (
                  <div key={c.id} className="ranking-item">
                    <div className="ranking-number">{i + 1}</div>
                    <div className="ranking-name">{c.name}</div>
                    <div className="ranking-value">{formatCurrency(c.totalPending)}</div>
                  </div>
                ))}
                
                <h5 className="section-title mt-4">{t('dashboard.entities.topBrokers')}</h5>
                {topBrokers.map((b, i) => (
                  <div key={b.id} className="ranking-item">
                    <div className="ranking-number">{i + 1}</div>
                    <div className="ranking-name">{b.name}</div>
                    <div className="ranking-value">{formatCurrency(b.totalPending)}</div>
                  </div>
                ))}
              </div>
            </Col>
          </Row>
        </Col>
      </Row>
    </Container>
  );
};

export default Dashboard;
