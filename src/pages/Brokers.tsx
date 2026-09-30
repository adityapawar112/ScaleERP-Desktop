import React, { useState, useMemo, useCallback } from 'react';
import { Container, Row, Col, Card, Table, Button, Form, Modal, Toast, ToastContainer } from 'react-bootstrap';
import CustomPagination from '../components/CustomPagination';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { useAppContext, Broker } from '../context/AppContext';
import DeletionWarningModal from '../components/DeletionWarningModal';
import SearchBar from '../components/SearchBar';

const Brokers: React.FC = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { brokers, leisures, addBroker, updateBroker, deleteBroker } = useAppContext();

  // State for broker form
  const [showBrokerModal, setShowBrokerModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteImpactData, setDeleteImpactData] = useState<any>(null);
  const [isAnalyzingDelete, setIsAnalyzingDelete] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [currentBroker, setCurrentBroker] = useState<Broker | null>(null);
  const [brokerForm, setBrokerForm] = useState({
    name: '',
    contact: '',
    address: ''
  });

  // Toast state
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const [toastType, setToastType] = useState<'success' | 'error'>('success');

  // State for duplicate warning modal
  const [showDuplicateModal, setShowDuplicateModal] = useState(false);

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  // Search state
  const [searchQuery, setSearchQuery] = useState('');

  // Reset pagination when search query changes
  React.useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery]);

  // Handle broker form
  const handleBrokerFormChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setBrokerForm({
      ...brokerForm,
      [name]: value
    });
  };

  const handleBrokerSubmit = () => {
    if (currentBroker) {
      // Allow editing existing broker
      updateBroker({
        ...currentBroker,
        name: brokerForm.name,
        contact: brokerForm.contact,
        address: brokerForm.address
      });
      resetBrokerForm();
      setShowBrokerModal(false);
    } else {
      // Check for duplicates when adding new broker
      const normalizedName = brokerForm.name.trim().toLowerCase();
      const normalizedContact = brokerForm.contact.trim();

      const existingBroker = brokers.find(broker =>
        broker.name.trim().toLowerCase() === normalizedName &&
        broker.contact.trim() === normalizedContact
      );

      if (existingBroker) {
        // Show duplicate warning modal and block creation
        setShowDuplicateModal(true);
        return;
      }

      // No duplicate found, proceed with creation
      addBroker(brokerForm);
      resetBrokerForm();
      setShowBrokerModal(false);
    }
  };

  const resetBrokerForm = () => {
    setBrokerForm({
      name: '',
      contact: '',
      address: ''
    });
    setCurrentBroker(null);
  };

  // Open edit broker modal
  const openEditBrokerModal = (broker: Broker) => {
    setCurrentBroker(broker);
    setBrokerForm({
      name: broker.name,
      contact: broker.contact,
      address: broker.address
    });
    setShowBrokerModal(true);
  };

  // Handle broker deletion
  const handleDeleteBroker = async (broker: Broker) => {
    setCurrentBroker(broker);
    setIsAnalyzingDelete(true);
    setShowDeleteModal(true);

    try {
      // Call the backend analysis function
      const impactData = await window.electronAPI?.invoke('db:analyzeBrokerDeletion', broker.id);
      setDeleteImpactData(impactData);
    } catch (error) {
      console.error('Failed to analyze deletion impact:', error);
      // Show modal with error state
      setDeleteImpactData(null);
    } finally {
      setIsAnalyzingDelete(false);
    }
  };

  const confirmDeleteBroker = async () => {
    if (!currentBroker) return;

    setIsDeleting(true);
    const startTime = Date.now();
    const brokerName = currentBroker.name; // Store name before deletion

    try {
      await deleteBroker(currentBroker.id);

      // Ensure minimum 2-second loading state
      const elapsedTime = Date.now() - startTime;
      const remainingTime = Math.max(0, 2000 - elapsedTime);

      await new Promise(resolve => setTimeout(resolve, remainingTime));

      // Close modal and reset state
      setShowDeleteModal(false);
      setCurrentBroker(null);
      setDeleteImpactData(null);

      // Show success toast for 1 second, then reload with buffer
      setToastMessage(`Broker "${brokerName}" and all related transactions have been successfully deleted.`);
      setToastType('success');
      setShowToast(true);

      setTimeout(async () => {
        if (!window.electronAPI) {
          throw new Error('Electron API not available');
        }
        await window.electronAPI.reloadWindow();
      }, 1500); // 1s toast + 500ms buffer

    } catch (error) {
      console.error('Failed to delete broker:', error);
      setToastMessage('Failed to delete broker. Please try again.');
      setToastType('error');
      setShowToast(true);
    } finally {
      setIsDeleting(false);
    }
  };

  const handleDeleteModalClose = () => {
    setShowDeleteModal(false);
    setCurrentBroker(null);
    setDeleteImpactData(null);
    setIsAnalyzingDelete(false);
  };

  // Navigate to broker leisures page with selected broker
  const navigateToLeisures = (broker: Broker) => {
    navigate('/broker-leisures', { state: { selectedBrokerId: broker.id } });
  };

  // Get broker's leisure records
  const getBrokerLeisures = useCallback((brokerId: string) => {
    return leisures.filter(leisure => leisure.brokerId === brokerId);
  }, [leisures]);



  // Filter and sort brokers using useMemo for performance
  const sortedBrokers = useMemo(() => {
    // First filter brokers based on search query
    const filteredBrokers = searchQuery.trim()
      ? brokers.filter(broker =>
          broker.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          broker.contact.toLowerCase().includes(searchQuery.toLowerCase()) ||
          broker.address.toLowerCase().includes(searchQuery.toLowerCase())
        )
      : brokers;

    // Then sort by latest activity - brokers with more recent leisure records first
    return filteredBrokers.sort((a, b) => {
      const aLatest = getBrokerLeisures(a.id).sort((x, y) =>
        new Date(`${y.date} ${y.time}`).getTime() - new Date(`${x.date} ${x.time}`).getTime()
      )[0];
      const bLatest = getBrokerLeisures(b.id).sort((x, y) =>
        new Date(`${y.date} ${y.time}`).getTime() - new Date(`${x.date} ${x.time}`).getTime()
      )[0];

      if (aLatest && bLatest) {
        return new Date(`${bLatest.date} ${bLatest.time}`).getTime() - new Date(`${aLatest.date} ${aLatest.time}`).getTime();
      } else if (aLatest) {
        return -1;
      } else if (bLatest) {
        return 1;
      }
      return 0;
    });
  }, [brokers, searchQuery, getBrokerLeisures]);

  const paginatedBrokers = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return sortedBrokers.slice(startIndex, startIndex + itemsPerPage);
  }, [sortedBrokers, currentPage, itemsPerPage]);



  return (
    <Container fluid className="py-4">
      <Row className="mb-4">
        <Col>
          <div className="page-header">
            <h2>{t('brokers.title')}</h2>
            <p>{t('brokers.subtitle')}</p>
          </div>
          <Button variant="primary" onClick={() => setShowBrokerModal(true)}>
            {t('brokers.addNewBroker')}
          </Button>
        </Col>
      </Row>

      <Row>
        <Col>
          <Card className="shadow-sm border-0">
            <Card.Header className="bg-white text-dark py-3">
              <h5 className="mb-0" style={{ color: 'var(--primary-dark)' }}>{t('brokers.brokerList')}</h5>
            </Card.Header>
            <Card.Body>
              <SearchBar
                placeholder={t('brokers.searchPlaceholder', 'Search brokers by name, contact, or address...')}
                onSearch={setSearchQuery}
              />
              <Table striped bordered hover responsive>
                <thead>
                  <tr>
                    <th>{t('brokers.name')}</th>
                    <th>{t('brokers.contact')}</th>
                    <th>{t('brokers.address')}</th>
                    <th>{t('brokers.totalPending')}</th>
                    <th>{t('brokers.totalPaid')}</th>
                    <th>{t('brokers.actions')}</th>
                  </tr>
                </thead>
                <tbody>
                  {paginatedBrokers.map(broker => {
                    return (
                      <tr key={broker.id}>
                        <td>
                          <Button
                            variant="link"
                            className="p-0 text-decoration-none"
                            onClick={() => navigateToLeisures(broker)}
                          >
                            {broker.name}
                          </Button>
                        </td>
                        <td>{broker.contact}</td>
                        <td>{broker.address}</td>
                        <td className="text-danger">
                          ₹{broker.totalPending.toFixed(2)}
                        </td>
                        <td className="text-success">
                          ₹{broker.totalPaid.toFixed(2)}
                        </td>
                        <td>
                          <Button
                            variant="outline-primary"
                            size="sm"
                            className="me-2"
                            onClick={() => openEditBrokerModal(broker)}
                          >
                            {t('brokers.edit')}
                          </Button>
                          <Button
                            variant="outline-danger"
                            size="sm"
                            onClick={() => handleDeleteBroker(broker)}
                          >
                            {t('brokers.delete')}
                          </Button>
                        </td>
                      </tr>
                    );
                  })}
                  {sortedBrokers.length === 0 && (
                    <tr>
                      <td colSpan={6} className="text-center">{t('brokers.noBrokersFound')}</td>
                    </tr>
                  )}
                </tbody>
              </Table>
              {sortedBrokers.length > itemsPerPage && (
                <div className="d-flex justify-content-center mt-3">
                  <CustomPagination
                    currentPage={currentPage}
                    totalPages={Math.ceil(sortedBrokers.length / itemsPerPage)}
                    onPageChange={setCurrentPage}
                  />
                </div>
              )}
            </Card.Body>
          </Card>
        </Col>
      </Row>

      {/* Broker Form Modal */}
      <Modal show={showBrokerModal} onHide={() => { resetBrokerForm(); setShowBrokerModal(false); }}>
        <Modal.Header closeButton>
          <Modal.Title>{currentBroker ? t('brokers.editBroker') : t('brokers.addNewBrokerTitle')}</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Form>
            <Form.Group className="mb-3">
              <Form.Label>{t('brokers.brokerName')}</Form.Label>
              <Form.Control
                type="text"
                name="name"
                value={brokerForm.name}
                onChange={handleBrokerFormChange}
                required
              />
            </Form.Group>
            <Form.Group className="mb-3">
              <Form.Label>{t('brokers.contact')}</Form.Label>
              <Form.Control
                type="text"
                name="contact"
                value={brokerForm.contact}
                onChange={handleBrokerFormChange}
                required
              />
            </Form.Group>
            <Form.Group className="mb-3">
              <Form.Label>{t('brokers.address')}</Form.Label>
              <Form.Control
                as="textarea"
                rows={3}
                name="address"
                value={brokerForm.address}
                onChange={handleBrokerFormChange}
              />
            </Form.Group>
            {currentBroker && (
              <div className="row">
                <div className="col-md-6">
                  <Form.Group className="mb-3">
                    <Form.Label>{t('brokers.totalPendingLabel')}</Form.Label>
                    <Form.Control
                      type="text"
                      value={`₹${currentBroker.totalPending.toFixed(2)}`}
                      readOnly
                      className="text-danger"
                    />
                  </Form.Group>
                </div>
                <div className="col-md-6">
                  <Form.Group className="mb-3">
                    <Form.Label>{t('brokers.totalPaidLabel')}</Form.Label>
                    <Form.Control
                      type="text"
                      value={`₹${currentBroker.totalPaid.toFixed(2)}`}
                      readOnly
                      className="text-success"
                    />
                  </Form.Group>
                </div>
              </div>
            )}
          </Form>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => { resetBrokerForm(); setShowBrokerModal(false); }}>
            {t('brokers.cancel')}
          </Button>
          <Button
            variant="primary"
            onClick={handleBrokerSubmit}
            disabled={!brokerForm.name || !brokerForm.contact}
          >
            {currentBroker ? t('brokers.updateBroker') : t('brokers.addBroker')}
          </Button>
        </Modal.Footer>
      </Modal>

      {/* Deletion Warning Modal */}
      <DeletionWarningModal
        show={showDeleteModal}
        onHide={handleDeleteModalClose}
        onConfirm={confirmDeleteBroker}
        entityType="broker"
        entityName={currentBroker?.name || ''}
        impactData={deleteImpactData}
        isLoading={isAnalyzingDelete}
        isDeleting={isDeleting}
      />

      {/* Duplicate Warning Modal */}
      <Modal show={showDuplicateModal} onHide={() => setShowDuplicateModal(false)} centered>
        <Modal.Header closeButton>
          <Modal.Title className="text-warning">
            {t('common.duplicateTitle', { type: t('leisures.broker', 'Broker') })}
          </Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <p className="mb-0">
            {t('common.duplicateMessage', { type: t('leisures.broker', 'broker') })}
          </p>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="primary" onClick={() => setShowDuplicateModal(false)}>
            {t('common.close', 'OK')}
          </Button>
        </Modal.Footer>
      </Modal>

      {/* Success/Error Toast */}
      <ToastContainer
        position="bottom-end"
        className="p-3"
        style={{
          zIndex: 9999,
          position: 'fixed',
          bottom: '20px',
          right: '20px'
        }}
      >
        <Toast
          show={showToast}
          onClose={() => setShowToast(false)}
          delay={toastType === 'success' ? 1000 : undefined}
          autohide={toastType === 'success'}
          bg={toastType === 'success' ? 'success' : 'danger'}
        >
          <Toast.Header>
            <strong className={`me-auto ${toastType === 'success' ? 'text-success' : 'text-danger'}`}>
              {toastType === 'success' ? 'Success' : 'Error'}
            </strong>
          </Toast.Header>
          <Toast.Body className={toastType === 'success' ? 'text-white' : 'text-white'}>
            <strong>{toastType === 'success' ? t('settings.settingsSaved') : 'Failed to delete broker:'}</strong> {toastMessage}
          </Toast.Body>
        </Toast>
      </ToastContainer>
    </Container>
  );
};

export default Brokers;
