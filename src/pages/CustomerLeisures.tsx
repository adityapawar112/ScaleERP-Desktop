import React, { useState, useEffect, useMemo } from 'react';
import { Container, Row, Col, Card, Table, Button, Form, Modal, Badge } from 'react-bootstrap';
import CustomPagination from '../components/CustomPagination';
import { useTranslation } from 'react-i18next';
import { useLocation } from 'react-router-dom';
import { useAppContext, CustomerLeisure } from '../context/AppContext';
import DeletionWarningModal from '../components/DeletionWarningModal';
import SearchBar from '../components/SearchBar';
import { exportLeisureRecordsToExcel, LeisureData, getCurrentDateString } from '../utils/excelExport';

const CustomerLeisures: React.FC = () => {
  const { t } = useTranslation();
  const location = useLocation();
  const { customerLeisures, customers, addCustomerLeisure, updateCustomerLeisure, deleteCustomerLeisure } = useAppContext();

  // State for selected customer
  const [selectedCustomerId, setSelectedCustomerId] = useState<string>('');

  // Search state
  const [searchQuery, setSearchQuery] = useState('');

  // Pagination state
  const [currentPageReceivable, setCurrentPageReceivable] = useState(1);
  const [currentPageSale, setCurrentPageSale] = useState(1);
  const itemsPerPage = 10;

  // Handle navigation from customers page
  useEffect(() => {
    if (location.state && location.state.selectedCustomerId) {
      setSelectedCustomerId(location.state.selectedCustomerId);
    }
  }, [location.state]);

  // Sort state
  const [sortColumn, setSortColumn] = useState<string>('date');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc' | null>('desc');

  // Reset pagination when customer or search changes
  useEffect(() => {
    setCurrentPageReceivable(1);
    setCurrentPageSale(1);
  }, [selectedCustomerId, searchQuery]);

  // Sort handler - 3-state cycle: asc → desc → null (default) → asc → desc → null
  const handleSort = (column: string) => {
    if (sortColumn === column) {
      if (sortDirection === 'asc') {
        setSortDirection('desc');
      } else if (sortDirection === 'desc') {
        setSortDirection(null);
        setSortColumn('');
      } else {
        setSortDirection('asc');
      }
    } else {
      setSortColumn(column);
      setSortDirection('asc');
    }
  };

  // Sort indicator component
  const SortIndicator = ({ column }: { column: string }) => {
    if (sortColumn !== column) return <span className="ms-1 text-muted">↕</span>;
    if (sortDirection === 'asc') return <span className="ms-1">↑</span>;
    if (sortDirection === 'desc') return <span className="ms-1">↓</span>;
    return <span className="ms-1 text-muted">↕</span>;
  };

  // State for customer leisure form
  const [showCustomerLeisureModal, setShowCustomerLeisureModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteImpactData, setDeleteImpactData] = useState<any>(null);
  const [isAnalyzingDelete, setIsAnalyzingDelete] = useState(false);
  const [currentCustomerLeisure, setCurrentCustomerLeisure] = useState<CustomerLeisure | null>(null);
  const [customerLeisureForm, setCustomerLeisureForm] = useState({
    type: 'sale' as 'receivable' | 'sale',
    customerId: '',
    amount: '',
    paymentMethod: 'UPI' as 'UPI' | 'Cash',
    date: new Date().toISOString().split('T')[0],
    time: new Date().toTimeString().slice(0, 5),
    notes: ''
  });

  // Handle customer leisure form
  const handleCustomerLeisureFormChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setCustomerLeisureForm({
      ...customerLeisureForm,
      [name]: value
    });
  };

  const handleCustomerLeisureSubmit = () => {
    const amount = parseFloat(customerLeisureForm.amount) || 0;

    if (currentCustomerLeisure) {
      // For editing, update the record
      updateCustomerLeisure({
        ...currentCustomerLeisure,
        type: customerLeisureForm.type,
        amount: amount,
        paymentMethod: customerLeisureForm.type === 'sale' ? customerLeisureForm.paymentMethod : undefined,
        date: customerLeisureForm.date,
        time: customerLeisureForm.time,
        notes: customerLeisureForm.notes
      });
    } else {
      // For adding new records
      addCustomerLeisure({
        customerId: selectedCustomerId,
        type: customerLeisureForm.type,
        amount: amount,
        paymentMethod: customerLeisureForm.type === 'sale' ? customerLeisureForm.paymentMethod : undefined,
        date: customerLeisureForm.date,
        time: customerLeisureForm.time,
        notes: customerLeisureForm.notes
      });
    }
    resetCustomerLeisureForm();
    setShowCustomerLeisureModal(false);
  };

  const resetCustomerLeisureForm = () => {
    setCustomerLeisureForm({
      type: 'sale',
      customerId: '',
      amount: '',
      paymentMethod: 'UPI',
      date: new Date().toISOString().split('T')[0],
      time: new Date().toTimeString().slice(0, 5),
      notes: ''
    });
    setCurrentCustomerLeisure(null);
  };



  // Handle customer leisure deletion
  const handleDeleteCustomerLeisure = async (leisure: CustomerLeisure) => {
    setCurrentCustomerLeisure(leisure);
    setIsAnalyzingDelete(true);
    setShowDeleteModal(true);

    try {
      // Call the backend analysis function
      const impactData = await window.electronAPI?.invoke('db:analyzeCustomerLeisureDeletion', leisure.id);
      setDeleteImpactData(impactData);
    } catch (error) {
      console.error('Failed to analyze deletion impact:', error);
      // Show modal with error state
      setDeleteImpactData(null);
    } finally {
      setIsAnalyzingDelete(false);
    }
  };

  const confirmDeleteCustomerLeisure = async () => {
    if (!currentCustomerLeisure) return;

    try {
      await deleteCustomerLeisure(currentCustomerLeisure.id);
      setShowDeleteModal(false);
      setCurrentCustomerLeisure(null);
      setDeleteImpactData(null);
    } catch (error) {
      console.error('Failed to delete customer leisure record:', error);
      alert('Failed to delete customer leisure record. Please try again.');
    }
  };

  const handleDeleteModalClose = () => {
    setShowDeleteModal(false);
    setCurrentCustomerLeisure(null);
    setDeleteImpactData(null);
    setIsAnalyzingDelete(false);
  };

  // Filter customer leisures for selected customer
  const customerLeisuresFiltered = selectedCustomerId
    ? customerLeisures.filter(leisure => leisure.customerId === selectedCustomerId)
    : [];

  const receivableCustomerLeisures = customerLeisuresFiltered.filter(leisure => leisure.type === 'receivable');
  const saleCustomerLeisures = customerLeisuresFiltered.filter(leisure => leisure.type === 'sale');

  // Get totals from selected customer (calculated in database)
  const selectedCustomer = customers.find(c => c.id === selectedCustomerId);
  const totalPending = selectedCustomer?.totalPending || 0;

  const handleExcelDownload = () => {
    try {
      // Format customer leisure records data for Excel export (only for selected customer)
      const formattedCustomerLeisureRecords: LeisureData[] = customerLeisuresFiltered.map(leisure => ({
        id: leisure.id,
        entityId: leisure.customerId,
        entityName: leisure.customerName,
        entityType: 'customer' as const,
        pendingAmount: leisure.type === 'receivable' ? leisure.amount : 0,
        paidAmount: leisure.type === 'sale' ? leisure.amount : 0,
        date: leisure.date,
        time: leisure.time,
        notes: leisure.notes
      }));

      const customerName = selectedCustomer?.name || 'Unknown';
      const filename = `Customer_Leisure_Records_${customerName}_${getCurrentDateString()}.xlsx`;
      exportLeisureRecordsToExcel(formattedCustomerLeisureRecords, filename);
    } catch (error) {
      console.error('Error generating Excel file:', error);
      alert(t('common.error'));
    }
  };

  // Sort function helper
  const sortLeisures = (leisures: any[]) => {
    return [...leisures].sort((a, b) => {
      let comparison = 0;
      
      switch (sortColumn) {
        case 'customer':
          comparison = (a.customerName || '').localeCompare(b.customerName || '');
          break;
        case 'notes':
          comparison = (a.notes || '').localeCompare(b.notes || '');
          break;
        case 'amount':
          comparison = a.amount - b.amount;
          break;
        case 'date':
          comparison = new Date(`${a.date} ${a.time}`).getTime() - new Date(`${b.date} ${b.time}`).getTime();
          break;
        case 'paymentMethod':
          comparison = (a.paymentMethod || '').localeCompare(b.paymentMethod || '');
          break;
        default:
          comparison = new Date(`${a.date} ${a.time}`).getTime() - new Date(`${b.date} ${b.time}`).getTime();
      }
      
      return sortDirection === 'asc' ? comparison : -comparison;
    });
  };

  // Sort and paginate data using useMemo for performance
  const sortedReceivableLeisures = useMemo(() => {
    const filtered = receivableCustomerLeisures
      .filter(leisure => {
        // Search filter - search in customer name, phone, date, and notes
        if (searchQuery.trim()) {
          const query = searchQuery.toLowerCase();
          const customer = customers.find(c => c.id === leisure.customerId);
          const customerName = customer?.name?.toLowerCase() || '';
          const customerPhone = customer?.contact?.toLowerCase() || '';
          const notesMatch = leisure.notes?.toLowerCase().includes(query);
          const dateMatch = leisure.date?.includes(query);
          const nameMatch = customerName.includes(query);
          const phoneMatch = customerPhone.includes(query);
          return notesMatch || dateMatch || nameMatch || phoneMatch;
        }

        return true;
      });
    return sortLeisures(filtered);
  }, [receivableCustomerLeisures, searchQuery, customers, sortColumn, sortDirection]);

  const sortedSaleLeisures = useMemo(() => {
    const filtered = saleCustomerLeisures
      .filter(leisure => {
        // Search filter - search in customer name, phone, date, and notes
        if (searchQuery.trim()) {
          const query = searchQuery.toLowerCase();
          const customer = customers.find(c => c.id === leisure.customerId);
          const customerName = customer?.name?.toLowerCase() || '';
          const customerPhone = customer?.contact?.toLowerCase() || '';
          const notesMatch = leisure.notes?.toLowerCase().includes(query);
          const dateMatch = leisure.date?.includes(query);
          const nameMatch = customerName.includes(query);
          const phoneMatch = customerPhone.includes(query);
          return notesMatch || dateMatch || nameMatch || phoneMatch;
        }

        return true;
      });
    return sortLeisures(filtered);
  }, [saleCustomerLeisures, searchQuery, customers, sortColumn, sortDirection]);

  // Paginated data
  const paginatedReceivableLeisures = useMemo(() => {
    const startIndex = (currentPageReceivable - 1) * itemsPerPage;
    return sortedReceivableLeisures.slice(startIndex, startIndex + itemsPerPage);
  }, [sortedReceivableLeisures, currentPageReceivable, itemsPerPage]);

  const paginatedSaleLeisures = useMemo(() => {
    const startIndex = (currentPageSale - 1) * itemsPerPage;
    return sortedSaleLeisures.slice(startIndex, startIndex + itemsPerPage);
  }, [sortedSaleLeisures, currentPageSale, itemsPerPage]);

  return (
    <Container fluid className="py-4">
      <Row className="mb-4">
        <Col>
          <div className="page-header">
            <h2>{t('customerLeisures.title')}</h2>
            <p>{t('customerLeisures.subtitle')}</p>

          </div>
        </Col>
      </Row>

      <Row className="mb-4">
        <Col md={12}>
          <Card className="shadow-sm border-0">
            <Card.Body className="py-4">
              <Form.Group>
                <Form.Label className="fs-5 fw-bold mb-3">{t('customerLeisures.selectCustomer')}</Form.Label>
                <Form.Select
                  size="lg"
                  className="form-select-lg"
                  value={selectedCustomerId}
                  onChange={(e) => setSelectedCustomerId(e.target.value)}
                  style={{ fontSize: '1.1rem', padding: '0.75rem 1rem' }}
                >
                  <option value="">{t('customerLeisures.selectCustomer')}</option>
                  {customers.map(customer => (
                    <option key={customer.id} value={customer.id}>
                      {`${customer.name} (${customer.contact})`}
                    </option>
                  ))}
                </Form.Select>
              </Form.Group>
            </Card.Body>
          </Card>
        </Col>
      </Row>

      {selectedCustomerId && (
        <Row className="mb-4">
          <Col md={12}>
            <Card className="shadow-sm border-0 border-top border-primary border-4">
              <Card.Body className="text-center py-4">
                <h5 className="mb-3">
                  {t('customerLeisures.totalPendingBy')} {selectedCustomer?.name}: {' '}
                  <Badge bg={totalPending > 0 ? "danger" : "success"} className="fs-4 p-3 ms-2">
                    ₹{totalPending.toFixed(2)}
                  </Badge>
                </h5>
                <div className="d-flex gap-3 justify-content-center">
                  <Button
                    variant="primary"
                    size="lg"
                    onClick={() => { resetCustomerLeisureForm(); setShowCustomerLeisureModal(true); }}
                    className="px-4 py-2"
                  >
                    {t('customerLeisures.addPaidAmount')}
                  </Button>
                  <Button
                    variant="success"
                    size="lg"
                    onClick={handleExcelDownload}
                    disabled={customerLeisuresFiltered.length === 0}
                    className="px-4 py-2"
                  >
                    {t('customerLeisures.downloadExcel')}
                  </Button>
                </div>
              </Card.Body>
            </Card>
          </Col>
        </Row>
      )}

      {selectedCustomerId && (
        <>
          {/* Search Bar */}
          <Row className="mb-3">
            <Col md={6}>
              <SearchBar
                placeholder={t('customerLeisures.searchPlaceholder', 'Search by name, phone, date, or notes...')}
                onSearch={setSearchQuery}
              />
            </Col>
          </Row>

          {/* Amounts to be Paid Table */}
          <Row className="mb-4">
            <Col>
              <Card className="shadow-sm border-0">
                <Card.Header className="bg-white text-dark py-3">
                  <h5 className="mb-0" style={{ color: 'var(--primary-dark)' }}>{t('customerLeisures.amountsToBePaid')}</h5>
                </Card.Header>
                <Card.Body>
                  <Table striped bordered hover responsive>
                    <thead>
                      <tr>
                        <th style={{ cursor: 'pointer', userSelect: 'none' }} onClick={() => handleSort('customer')}>
                          {t('customerLeisures.customer')}<SortIndicator column="customer" />
                        </th>
                        <th style={{ cursor: 'pointer', userSelect: 'none' }} onClick={() => handleSort('notes')}>
                          {t('customerLeisures.notes')}<SortIndicator column="notes" />
                        </th>
                        <th style={{ cursor: 'pointer', userSelect: 'none' }} onClick={() => handleSort('amount')}>
                          {t('customerLeisures.amount')}<SortIndicator column="amount" />
                        </th>
                        <th style={{ cursor: 'pointer', userSelect: 'none' }} onClick={() => handleSort('date')}>
                          {t('common.dateTime')}<SortIndicator column="date" />
                        </th>
                        <th>{t('common.actions')}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {paginatedReceivableLeisures.map(leisure => (
                        <tr key={leisure.id}>
                          <td>{leisure.customerName}</td>
                          <td>{leisure.notes}</td>
                          <td className="text-danger">₹{leisure.amount.toFixed(2)}</td>
                          <td>{leisure.date} {leisure.time}</td>
                          <td>
                            <Button
                              variant="outline-danger"
                              size="sm"
                              onClick={() => handleDeleteCustomerLeisure(leisure)}
                            >
                              {t('common.delete')}
                            </Button>
                          </td>
                        </tr>
                      ))}
                      {sortedReceivableLeisures.length === 0 && (
                        <tr>
                          <td colSpan={5} className="text-center">{t('customerLeisures.noAmountsToBePaid')}</td>
                        </tr>
                      )}
                    </tbody>
                  </Table>
                  {sortedReceivableLeisures.length > itemsPerPage && (
                    <div className="d-flex justify-content-center mt-3">
                      <CustomPagination
                        currentPage={currentPageReceivable}
                        totalPages={Math.ceil(sortedReceivableLeisures.length / itemsPerPage)}
                        onPageChange={setCurrentPageReceivable}
                      />
                    </div>
                  )}
                </Card.Body>
              </Card>
            </Col>
          </Row>

          {/* Paid Amounts Table */}
          <Row className="mb-4">
            <Col>
              <Card className="shadow-sm border-0">
                <Card.Header className="bg-white text-dark py-3">
                  <h5 className="mb-0" style={{ color: 'var(--primary-dark)' }}>{t('customerLeisures.paidAmounts')}</h5>
                </Card.Header>
                <Card.Body>
                  <Table striped bordered hover responsive>
                    <thead>
                      <tr>
                        <th style={{ cursor: 'pointer', userSelect: 'none' }} onClick={() => handleSort('customer')}>
                          {t('customerLeisures.customer')}<SortIndicator column="customer" />
                        </th>
                        <th style={{ cursor: 'pointer', userSelect: 'none' }} onClick={() => handleSort('amount')}>
                          {t('customerLeisures.amount')}<SortIndicator column="amount" />
                        </th>
                        <th style={{ cursor: 'pointer', userSelect: 'none' }} onClick={() => handleSort('paymentMethod')}>
                          {t('customerLeisures.paymentMethod')}<SortIndicator column="paymentMethod" />
                        </th>
                        <th style={{ cursor: 'pointer', userSelect: 'none' }} onClick={() => handleSort('date')}>
                          {t('common.dateTime')}<SortIndicator column="date" />
                        </th>
                        <th>{t('common.actions')}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {paginatedSaleLeisures.map(leisure => (
                        <tr key={leisure.id}>
                          <td>{leisure.customerName}</td>
                          <td className="text-success">₹{leisure.amount.toFixed(2)}</td>
                          <td>{leisure.paymentMethod}</td>
                          <td>{leisure.date} {leisure.time}</td>
                          <td>
                            <Button
                              variant="outline-danger"
                              size="sm"
                              onClick={() => handleDeleteCustomerLeisure(leisure)}
                            >
                              {t('common.delete')}
                            </Button>
                          </td>
                        </tr>
                      ))}
                      {sortedSaleLeisures.length === 0 && (
                        <tr>
                          <td colSpan={5} className="text-center">{t('customerLeisures.noPaidAmounts')}</td>
                        </tr>
                      )}
                    </tbody>
                  </Table>
                  {sortedSaleLeisures.length > itemsPerPage && (
                    <div className="d-flex justify-content-center mt-3">
                      <CustomPagination
                        currentPage={currentPageSale}
                        totalPages={Math.ceil(sortedSaleLeisures.length / itemsPerPage)}
                        onPageChange={setCurrentPageSale}
                      />
                    </div>
                  )}
                </Card.Body>
              </Card>
            </Col>
          </Row>
        </>
      )}

      {!selectedCustomerId && (
        <Row>
          <Col>
            <Card className="shadow-sm border-0 text-center py-5">
              <Card.Body>
                <h4>{t('customerLeisures.selectCustomerMessage')}</h4>
              </Card.Body>
            </Card>
          </Col>
        </Row>
      )}

      {/* Customer Leisure Form Modal */}
      <Modal show={showCustomerLeisureModal} onHide={() => { resetCustomerLeisureForm(); setShowCustomerLeisureModal(false); }}>
        <Modal.Header closeButton>
          <Modal.Title>{currentCustomerLeisure ? t('customerLeisures.editRecord') : t('customerLeisures.addPaidAmount')}</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Form>
            {!currentCustomerLeisure && (
              <Form.Group className="mb-3">
                <Form.Label>{t('customerLeisures.paymentMethod')}</Form.Label>
                <Form.Select
                  name="paymentMethod"
                  value={customerLeisureForm.paymentMethod}
                  onChange={handleCustomerLeisureFormChange}
                >
                  <option value="UPI">{t('customerLeisures.upi')}</option>
                  <option value="Cash">{t('customerLeisures.cash')}</option>
                </Form.Select>
              </Form.Group>
            )}

            {currentCustomerLeisure && customerLeisureForm.type === 'sale' && (
              <Form.Group className="mb-3">
                <Form.Label>{t('customerLeisures.paymentMethod')}</Form.Label>
                <Form.Select
                  name="paymentMethod"
                  value={customerLeisureForm.paymentMethod}
                  onChange={handleCustomerLeisureFormChange}
                >
                  <option value="UPI">{t('customerLeisures.upi')}</option>
                  <option value="Cash">{t('customerLeisures.cash')}</option>
                </Form.Select>
              </Form.Group>
            )}

            <Form.Group className="mb-3">
              <Form.Label>{t('customerLeisures.amount')}</Form.Label>
              <Form.Control
                type="number"
                name="amount"
                value={customerLeisureForm.amount}
                onChange={handleCustomerLeisureFormChange}
                min="0"
                step="0.01"
                required
              />
            </Form.Group>

            <Row className="mb-3">
              <Col md={6}>
                <Form.Group>
                  <Form.Label>{t('common.date')}</Form.Label>
                  <Form.Control
                    type="date"
                    name="date"
                    value={customerLeisureForm.date}
                    onChange={handleCustomerLeisureFormChange}
                    required
                  />
                </Form.Group>
              </Col>
              <Col md={6}>
                <Form.Group>
                  <Form.Label>{t('common.time')}</Form.Label>
                  <Form.Control
                    type="time"
                    name="time"
                    value={customerLeisureForm.time}
                    onChange={handleCustomerLeisureFormChange}
                    required
                  />
                </Form.Group>
              </Col>
            </Row>

            <Form.Group className="mb-3">
              <Form.Label>{t('customerLeisures.notes')}</Form.Label>
              <Form.Control
                as="textarea"
                rows={2}
                name="notes"
                value={customerLeisureForm.notes}
                onChange={handleCustomerLeisureFormChange}
                placeholder={t('customerLeisures.notesPlaceholder')}
              />
            </Form.Group>
          </Form>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => { resetCustomerLeisureForm(); setShowCustomerLeisureModal(false); }}>
            {t('common.cancel')}
          </Button>
          <Button
            variant="primary"
            onClick={handleCustomerLeisureSubmit}
            disabled={!customerLeisureForm.amount || parseFloat(customerLeisureForm.amount) <= 0}
          >
            {currentCustomerLeisure ? t('common.update') : t('common.add')}
          </Button>
        </Modal.Footer>
      </Modal>

      {/* Deletion Warning Modal */}
      <DeletionWarningModal
        show={showDeleteModal}
        onHide={handleDeleteModalClose}
        onConfirm={confirmDeleteCustomerLeisure}
        entityType="customerLeisure"
        entityName={`₹${currentCustomerLeisure?.amount.toFixed(2)} (${currentCustomerLeisure?.type === 'sale' ? 'Sale' : 'Receivable'})`}
        impactData={deleteImpactData}
        isLoading={isAnalyzingDelete}
      />
    </Container>
  );
};

export default CustomerLeisures;
