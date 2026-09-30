import React, { useState, useEffect, useMemo } from 'react';
import { Container, Row, Col, Card, Table, Button, Form, Modal, Badge } from 'react-bootstrap';
import CustomPagination from '../components/CustomPagination';
import { useTranslation } from 'react-i18next';
import { useLocation } from 'react-router-dom';
import { useAppContext, Leisure } from '../context/AppContext';
import DeletionWarningModal from '../components/DeletionWarningModal';
import SearchBar from '../components/SearchBar';
import { exportLeisureRecordsToExcel, LeisureData, getCurrentDateString } from '../utils/excelExport';

const BrokerLeisures: React.FC = () => {
  const { t } = useTranslation();
  const location = useLocation();
  const { leisures, brokers, addLeisure, updateLeisure, deleteLeisure } = useAppContext();

  // State for selected broker
  const [selectedBrokerId, setSelectedBrokerId] = useState<string>('');

  // Search state
  const [searchQuery, setSearchQuery] = useState('');

  // Pagination state
  const [currentPagePurchase, setCurrentPagePurchase] = useState(1);
  const [currentPagePayable, setCurrentPagePayable] = useState(1);
  const itemsPerPage = 10;

  // Handle navigation from brokers page
  useEffect(() => {
    if (location.state && location.state.selectedBrokerId) {
      setSelectedBrokerId(location.state.selectedBrokerId);
    }
  }, [location.state]);

  // Sort state
  const [sortColumn, setSortColumn] = useState<string>('date');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc' | null>('desc');

  // Reset pagination when broker or search changes
  useEffect(() => {
    setCurrentPagePurchase(1);
    setCurrentPagePayable(1);
  }, [selectedBrokerId, searchQuery]);

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

  // State for leisure form
  const [showLeisureModal, setShowLeisureModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteImpactData, setDeleteImpactData] = useState<any>(null);
  const [isAnalyzingDelete, setIsAnalyzingDelete] = useState(false);
  const [currentLeisure, setCurrentLeisure] = useState<Leisure | null>(null);
  const [leisureForm, setLeisureForm] = useState({
    type: 'payable' as 'purchase' | 'payable',
    brokerId: '',
    amount: '',
    paymentMethod: 'UPI' as 'UPI' | 'Cash',
    date: new Date().toISOString().split('T')[0],
    time: new Date().toTimeString().slice(0, 5),
    notes: ''
  });

  // Handle leisure form
  const handleLeisureFormChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setLeisureForm({
      ...leisureForm,
      [name]: value
    });
  };

  const handleLeisureSubmit = () => {
    const amount = parseFloat(leisureForm.amount) || 0;

    if (currentLeisure) {
      // For editing, update the record
      updateLeisure({
        ...currentLeisure,
        type: leisureForm.type,
        amount: amount,
        paymentMethod: leisureForm.type === 'payable' ? leisureForm.paymentMethod : undefined,
        date: leisureForm.date,
        time: leisureForm.time,
        notes: leisureForm.notes
      });
    } else {
      // For adding new records
      addLeisure({
        brokerId: selectedBrokerId,
        type: leisureForm.type,
        amount: amount,
        paymentMethod: leisureForm.type === 'payable' ? leisureForm.paymentMethod : undefined,
        date: leisureForm.date,
        time: leisureForm.time,
        notes: leisureForm.notes
      });
    }
    resetLeisureForm();
    setShowLeisureModal(false);
  };

  const resetLeisureForm = () => {
    setLeisureForm({
      type: 'payable',
      brokerId: '',
      amount: '',
      paymentMethod: 'UPI',
      date: new Date().toISOString().split('T')[0],
      time: new Date().toTimeString().slice(0, 5),
      notes: ''
    });
    setCurrentLeisure(null);
  };



  // Handle leisure deletion
  const handleDeleteLeisure = async (leisure: Leisure) => {
    setCurrentLeisure(leisure);
    setIsAnalyzingDelete(true);
    setShowDeleteModal(true);

    try {
      // Call the backend analysis function
      const impactData = await window.electronAPI?.invoke('db:analyzeBrokerLeisureDeletion', leisure.id);
      setDeleteImpactData(impactData);
    } catch (error) {
      console.error('Failed to analyze deletion impact:', error);
      // Show modal with error state
      setDeleteImpactData(null);
    } finally {
      setIsAnalyzingDelete(false);
    }
  };

  const confirmDeleteLeisure = async () => {
    if (!currentLeisure) return;

    try {
      await deleteLeisure(currentLeisure.id);
      setShowDeleteModal(false);
      setCurrentLeisure(null);
      setDeleteImpactData(null);
    } catch (error) {
      console.error('Failed to delete leisure record:', error);
      alert('Failed to delete leisure record. Please try again.');
    }
  };

  const handleDeleteModalClose = () => {
    setShowDeleteModal(false);
    setCurrentLeisure(null);
    setDeleteImpactData(null);
    setIsAnalyzingDelete(false);
  };

  // Filter leisures for selected broker
  const brokerLeisures = useMemo(() => {
    return selectedBrokerId
      ? leisures.filter(leisure => leisure.brokerId === selectedBrokerId)
      : [];
  }, [selectedBrokerId, leisures]);

  // Sort function helper
  const sortLeisures = (leisures: any[]) => {
    return [...leisures].sort((a, b) => {
      let comparison = 0;
      
      switch (sortColumn) {
        case 'broker':
          comparison = (a.brokerName || '').localeCompare(b.brokerName || '');
          break;
        case 'notes':
          comparison = (a.notes || '').localeCompare(b.notes || '');
          break;
        case 'amount':
          comparison = a.amount - b.amount;
          break;
        case 'brokerage':
          comparison = (a.brokerage || 0) - (b.brokerage || 0);
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
  const sortedPurchaseLeisures = useMemo(() => {
    const filtered = brokerLeisures
      .filter(leisure => {
        // Type filter
        if (leisure.type !== 'purchase') return false;

        // Search filter - search in broker name, phone, date, and notes
        if (searchQuery.trim()) {
          const query = searchQuery.toLowerCase();
          const broker = brokers.find(b => b.id === leisure.brokerId);
          const brokerName = broker?.name?.toLowerCase() || '';
          const brokerPhone = broker?.contact?.toLowerCase() || '';
          const notesMatch = leisure.notes?.toLowerCase().includes(query);
          const dateMatch = leisure.date?.includes(query);
          const nameMatch = brokerName.includes(query);
          const phoneMatch = brokerPhone.includes(query);
          return notesMatch || dateMatch || nameMatch || phoneMatch;
        }

        return true;
      });
    return sortLeisures(filtered);
  }, [brokerLeisures, searchQuery, brokers, sortColumn, sortDirection]);

  const sortedPayableLeisures = useMemo(() => {
    const filtered = brokerLeisures
      .filter(leisure => {
        // Type filter
        if (leisure.type !== 'payable') return false;

        // Search filter - search in broker name, phone, date, and notes
        if (searchQuery.trim()) {
          const query = searchQuery.toLowerCase();
          const broker = brokers.find(b => b.id === leisure.brokerId);
          const brokerName = broker?.name?.toLowerCase() || '';
          const brokerPhone = broker?.contact?.toLowerCase() || '';
          const notesMatch = leisure.notes?.toLowerCase().includes(query);
          const dateMatch = leisure.date?.includes(query);
          const nameMatch = brokerName.includes(query);
          const phoneMatch = brokerPhone.includes(query);
          return notesMatch || dateMatch || nameMatch || phoneMatch;
        }

        return true;
      });
    return sortLeisures(filtered);
  }, [brokerLeisures, searchQuery, brokers, sortColumn, sortDirection]);

  // Paginated data
  const paginatedPurchaseLeisures = useMemo(() => {
    const startIndex = (currentPagePurchase - 1) * itemsPerPage;
    return sortedPurchaseLeisures.slice(startIndex, startIndex + itemsPerPage);
  }, [sortedPurchaseLeisures, currentPagePurchase, itemsPerPage]);

  const paginatedPayableLeisures = useMemo(() => {
    const startIndex = (currentPagePayable - 1) * itemsPerPage;
    return sortedPayableLeisures.slice(startIndex, startIndex + itemsPerPage);
  }, [sortedPayableLeisures, currentPagePayable, itemsPerPage]);

  // Get totals from selected broker (calculated in database)
  const selectedBroker = brokers.find(b => b.id === selectedBrokerId);
  const totalPending = selectedBroker?.totalPending || 0;
  const totalBrokerageGiven = useMemo(() => {
    if (!selectedBrokerId) return 0;
    return brokerLeisures
      .filter(l => l.type === 'purchase')
      .reduce((sum, l) => sum + (l.brokerage || 0), 0);
  }, [brokerLeisures, selectedBrokerId]);

  const handleExcelDownload = () => {
    try {
      // Format leisure records data for Excel export (only for selected broker)
      const formattedLeisureRecords: LeisureData[] = brokerLeisures.map(leisure => ({
        id: leisure.id,
        entityId: leisure.brokerId,
        entityName: leisure.brokerName,
        entityType: 'broker' as const,
        pendingAmount: leisure.type === 'purchase' ? leisure.amount : 0,
        paidAmount: leisure.type === 'payable' ? leisure.amount : 0,
        brokerage: leisure.type === 'purchase' ? (leisure.brokerage || 0) : 0,
        date: leisure.date,
        time: leisure.time,
        notes: leisure.notes
      }));

      const brokerName = selectedBroker?.name || 'Unknown';
      const filename = `Broker_Leisure_Records_${brokerName}_${getCurrentDateString()}.xlsx`;
      exportLeisureRecordsToExcel(formattedLeisureRecords, filename);
    } catch (error) {
      console.error('Error generating Excel file:', error);
      alert('Error generating Excel file. Please try again.');
    }
  };


  return (
    <Container fluid className="py-4">
      <Row className="mb-4">
        <Col>
          <div className="page-header">
            <h2>{t('brokerLeisures.title')}</h2>
            <p>{t('brokerLeisures.subtitle')}</p>
          </div>
        </Col>
      </Row>

      <Row className="mb-4">
        <Col md={12}>
          <Card className="shadow-sm border-0">
            <Card.Body className="py-4">
              <Form.Group>
                <Form.Label className="fs-5 fw-bold mb-3">{t('brokerLeisures.selectBroker')}</Form.Label>
                <Form.Select
                  size="lg"
                  className="form-select-lg"
                  value={selectedBrokerId}
                  onChange={(e) => setSelectedBrokerId(e.target.value)}
                  style={{ fontSize: '1.1rem', padding: '0.75rem 1rem' }}
                >
                  <option value="">{t('brokerLeisures.selectBrokerOption')}</option>
                  {brokers.map(broker => (
                    <option key={broker.id} value={broker.id}>
                      {`${broker.name} (${broker.contact})`}
                    </option>
                  ))}
                </Form.Select>
              </Form.Group>
            </Card.Body>
          </Card>
        </Col>
      </Row>

      {selectedBrokerId && (
        <Row className="mb-4">
          <Col md={12}>
            <Card className="shadow-sm border-0 border-top border-primary border-4">
              <Card.Body className="text-center py-4">
                <h5 className="mb-3">
                  {t('brokerLeisures.totalPendingBy')} {selectedBroker?.name}: {' '}
                  <Badge bg={totalPending > 0 ? "danger" : "success"} className="fs-4 p-3 ms-2 mb-2">
                    ₹{totalPending.toFixed(2)}
                  </Badge>
                </h5>
                <h5 className="mb-4">
                  {t('brokerLeisures.totalBrokerageGiven', 'Total Brokerage Given')}: {' '}
                  <Badge bg="info" className="fs-5 p-2 ms-2 mb-2">
                    ₹{totalBrokerageGiven.toFixed(2)}
                  </Badge>
                </h5>
                <div className="d-flex gap-3 justify-content-center">
                  <Button
                    variant="primary"
                    size="lg"
                    onClick={() => { resetLeisureForm(); setShowLeisureModal(true); }}
                    className="px-4 py-2"
                  >
                    {t('brokerLeisures.addPaidAmount')}
                  </Button>
                  <Button
                    variant="success"
                    size="lg"
                    onClick={handleExcelDownload}
                    disabled={brokerLeisures.length === 0}
                    className="px-4 py-2"
                  >
                    {t('brokerLeisures.downloadExcel')}
                  </Button>
                </div>
              </Card.Body>
            </Card>
          </Col>
        </Row>
      )}

      {selectedBrokerId && (
        <>
          {/* Search Bar */}
          <Row className="mb-3">
            <Col md={6}>
              <SearchBar
                placeholder={t('brokerLeisures.searchPlaceholder', 'Search by name, phone, date, or notes...')}
                onSearch={setSearchQuery}
              />
            </Col>
          </Row>

          {/* Amounts to be Paid Table */}
          <Row className="mb-4">
            <Col>
              <Card className="shadow-sm border-0">
                <Card.Header className="bg-white text-dark py-3">
                  <h5 className="mb-0" style={{ color: 'var(--primary-dark)' }}>{t('brokerLeisures.amountsToBePaid')}</h5>
                </Card.Header>
                <Card.Body>
                  <Table striped bordered hover responsive>
                    <thead>
                      <tr>
                        <th style={{ cursor: 'pointer', userSelect: 'none' }} onClick={() => handleSort('broker')}>
                          {t('brokerLeisures.broker')}<SortIndicator column="broker" />
                        </th>
                        <th style={{ cursor: 'pointer', userSelect: 'none' }} onClick={() => handleSort('notes')}>
                          {t('brokerLeisures.notes')}<SortIndicator column="notes" />
                        </th>
                        <th style={{ cursor: 'pointer', userSelect: 'none' }} onClick={() => handleSort('amount')}>
                          {t('brokerLeisures.totalAmount')}<SortIndicator column="amount" />
                        </th>
                        <th style={{ cursor: 'pointer', userSelect: 'none' }} onClick={() => handleSort('brokerage')}>
                          {t('totalBrokerage', 'Total Brokerage')}<SortIndicator column="brokerage" />
                        </th>
                        <th style={{ cursor: 'pointer', userSelect: 'none' }} onClick={() => handleSort('date')}>
                          {t('brokerLeisures.dateTime')}<SortIndicator column="date" />
                        </th>
                        <th>{t('brokerLeisures.actions')}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {paginatedPurchaseLeisures.map(leisure => (
                        <tr key={leisure.id}>
                          <td>{leisure.brokerName}</td>
                          <td>{leisure.notes}</td>
                          <td className="text-danger">₹{leisure.amount.toFixed(2)}</td>
                          <td className="text-info">₹{(leisure.brokerage || 0).toFixed(2)}</td>
                          <td>{leisure.date} {leisure.time}</td>
                          <td>
                            <Button
                              variant="outline-danger"
                              size="sm"
                              onClick={() => handleDeleteLeisure(leisure)}
                            >
                              {t('brokerLeisures.delete')}
                            </Button>
                          </td>
                        </tr>
                      ))}
                      {sortedPurchaseLeisures.length === 0 && (
                        <tr>
                          <td colSpan={6} className="text-center">{t('brokerLeisures.noAmountsToBePaid')}</td>
                        </tr>
                      )}
                    </tbody>
                  </Table>
                  {sortedPurchaseLeisures.length > itemsPerPage && (
                    <div className="d-flex justify-content-center mt-3">
                      <CustomPagination
                        currentPage={currentPagePurchase}
                        totalPages={Math.ceil(sortedPurchaseLeisures.length / itemsPerPage)}
                        onPageChange={setCurrentPagePurchase}
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
                  <h5 className="mb-0" style={{ color: 'var(--primary-dark)' }}>{t('brokerLeisures.paidAmounts')}</h5>
                </Card.Header>
                <Card.Body>
                  <Table striped bordered hover responsive>
                    <thead>
                      <tr>
                        <th style={{ cursor: 'pointer', userSelect: 'none' }} onClick={() => handleSort('broker')}>
                          {t('brokerLeisures.broker')}<SortIndicator column="broker" />
                        </th>
                        <th style={{ cursor: 'pointer', userSelect: 'none' }} onClick={() => handleSort('amount')}>
                          {t('brokerLeisures.amount')}<SortIndicator column="amount" />
                        </th>
                        <th style={{ cursor: 'pointer', userSelect: 'none' }} onClick={() => handleSort('paymentMethod')}>
                          {t('brokerLeisures.paymentMethod')}<SortIndicator column="paymentMethod" />
                        </th>
                        <th style={{ cursor: 'pointer', userSelect: 'none' }} onClick={() => handleSort('date')}>
                          {t('brokerLeisures.dateTime')}<SortIndicator column="date" />
                        </th>
                        <th>{t('brokerLeisures.actions')}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {paginatedPayableLeisures.map(leisure => (
                        <tr key={leisure.id}>
                          <td>{leisure.brokerName}</td>
                          <td className="text-success">₹{leisure.amount.toFixed(2)}</td>
                          <td>{leisure.paymentMethod}</td>
                          <td>{leisure.date} {leisure.time}</td>
                          <td>
                            <Button
                              variant="outline-danger"
                              size="sm"
                              onClick={() => handleDeleteLeisure(leisure)}
                            >
                              {t('brokerLeisures.delete')}
                            </Button>
                          </td>
                        </tr>
                      ))}
                      {sortedPayableLeisures.length === 0 && (
                        <tr>
                          <td colSpan={5} className="text-center">{t('brokerLeisures.noPaidAmounts')}</td>
                        </tr>
                      )}
                    </tbody>
                  </Table>
                  {sortedPayableLeisures.length > itemsPerPage && (
                    <div className="d-flex justify-content-center mt-3">
                      <CustomPagination
                        currentPage={currentPagePayable}
                        totalPages={Math.ceil(sortedPayableLeisures.length / itemsPerPage)}
                        onPageChange={setCurrentPagePayable}
                      />
                    </div>
                  )}
                </Card.Body>
              </Card>
            </Col>
          </Row>
        </>
      )}

      {!selectedBrokerId && (
        <Row>
          <Col>
            <Card className="shadow-sm border-0 text-center py-5">
              <Card.Body>
                <h4>{t('brokerLeisures.selectBrokerMessage')}</h4>
              </Card.Body>
            </Card>
          </Col>
        </Row>
      )}

      {/* Leisure Form Modal */}
      <Modal show={showLeisureModal} onHide={() => { resetLeisureForm(); setShowLeisureModal(false); }}>
        <Modal.Header closeButton>
          <Modal.Title>{currentLeisure ? t('brokerLeisures.editBrokerLeisureRecord') : t('brokerLeisures.addPaidAmountTitle')}</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Form>
            {!currentLeisure && (
              <Form.Group className="mb-3">
                <Form.Label>{t('brokerLeisures.paymentMethodLabel')}</Form.Label>
                <Form.Select
                  name="paymentMethod"
                  value={leisureForm.paymentMethod}
                  onChange={handleLeisureFormChange}
                >
                  <option value="UPI">{t('brokerLeisures.upi')}</option>
                  <option value="Cash">{t('brokerLeisures.cash')}</option>
                </Form.Select>
              </Form.Group>
            )}

            {currentLeisure && leisureForm.type === 'payable' && (
              <Form.Group className="mb-3">
                <Form.Label>{t('brokerLeisures.paymentMethodLabel')}</Form.Label>
                <Form.Select
                  name="paymentMethod"
                  value={leisureForm.paymentMethod}
                  onChange={handleLeisureFormChange}
                >
                  <option value="UPI">{t('brokerLeisures.upi')}</option>
                  <option value="Cash">{t('brokerLeisures.cash')}</option>
                </Form.Select>
              </Form.Group>
            )}

            <Form.Group className="mb-3">
              <Form.Label>{t('brokerLeisures.amountLabel')}</Form.Label>
              <Form.Control
                type="number"
                name="amount"
                value={leisureForm.amount}
                onChange={handleLeisureFormChange}
                min="0"
                step="0.01"
                required
              />
            </Form.Group>

            <Row className="mb-3">
              <Col md={6}>
                <Form.Group>
                  <Form.Label>{t('brokerLeisures.date')}</Form.Label>
                  <Form.Control
                    type="date"
                    name="date"
                    value={leisureForm.date}
                    onChange={handleLeisureFormChange}
                    required
                  />
                </Form.Group>
              </Col>
              <Col md={6}>
                <Form.Group>
                  <Form.Label>{t('brokerLeisures.time')}</Form.Label>
                  <Form.Control
                    type="time"
                    name="time"
                    value={leisureForm.time}
                    onChange={handleLeisureFormChange}
                    required
                  />
                </Form.Group>
              </Col>
            </Row>

            <Form.Group className="mb-3">
              <Form.Label>{t('brokerLeisures.notesLabel')}</Form.Label>
              <Form.Control
                as="textarea"
                rows={2}
                name="notes"
                value={leisureForm.notes}
                onChange={handleLeisureFormChange}
                placeholder={t('brokerLeisures.notesPlaceholder')}
              />
            </Form.Group>
          </Form>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => { resetLeisureForm(); setShowLeisureModal(false); }}>
            {t('brokerLeisures.cancel')}
          </Button>
          <Button
            variant="primary"
            onClick={handleLeisureSubmit}
            disabled={!leisureForm.amount || parseFloat(leisureForm.amount) <= 0}
          >
            {currentLeisure ? t('brokerLeisures.update') : t('brokerLeisures.add')}
          </Button>
        </Modal.Footer>
      </Modal>

      {/* Deletion Warning Modal */}
      <DeletionWarningModal
        show={showDeleteModal}
        onHide={handleDeleteModalClose}
        onConfirm={confirmDeleteLeisure}
        entityType="brokerLeisure"
        entityName={`₹${currentLeisure?.amount.toFixed(2)} (${currentLeisure?.type === 'payable' ? 'Payable' : 'Purchase'})`}
        impactData={deleteImpactData}
        isLoading={isAnalyzingDelete}
      />
    </Container>
  );
};

export default BrokerLeisures;
