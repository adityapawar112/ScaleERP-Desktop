import React, { useState, useMemo, useCallback } from 'react';
import { Container, Row, Col, Card, Table, Button, Form, Modal, Toast, ToastContainer } from 'react-bootstrap';
import CustomPagination from '../components/CustomPagination';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { useAppContext, Customer } from '../context/AppContext';
import DeletionWarningModal from '../components/DeletionWarningModal';
import SearchBar from '../components/SearchBar';

const Customers: React.FC = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { customers, customerLeisures, addCustomer, updateCustomer, deleteCustomer } = useAppContext();

  // State for customer form
  const [showCustomerModal, setShowCustomerModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteImpactData, setDeleteImpactData] = useState<any>(null);
  const [isAnalyzingDelete, setIsAnalyzingDelete] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [currentCustomer, setCurrentCustomer] = useState<Customer | null>(null);
  const [customerForm, setCustomerForm] = useState({
    name: '',
    contact: '',
    address: ''
  });

  // State for customer details modal
  const [showCustomerDetailsModal, setShowCustomerDetailsModal] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);

  // State for duplicate warning modal
  const [showDuplicateModal, setShowDuplicateModal] = useState(false);
  const [duplicateEntityType, setDuplicateEntityType] = useState<'customer' | 'broker'>('customer');

  // Toast state
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const [toastType, setToastType] = useState<'success' | 'error'>('success');

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  // Search state
  const [searchQuery, setSearchQuery] = useState('');

  // Reset pagination when search query changes
  React.useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery]);

  // Handle customer form
  const handleCustomerFormChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setCustomerForm({
      ...customerForm,
      [name]: value
    });
  };

  const handleCustomerSubmit = () => {
    if (currentCustomer) {
      // Allow editing existing customer
      updateCustomer({
        ...currentCustomer,
        name: customerForm.name,
        contact: customerForm.contact,
        address: customerForm.address
      });
      resetCustomerForm();
      setShowCustomerModal(false);
    } else {
      // Check for duplicates when adding new customer
      const normalizedName = customerForm.name.trim().toLowerCase();
      const normalizedContact = customerForm.contact.trim();

      const existingCustomer = customers.find(customer =>
        customer.name.trim().toLowerCase() === normalizedName &&
        customer.contact.trim() === normalizedContact
      );

      if (existingCustomer) {
        // Show duplicate warning modal and block creation
        setDuplicateEntityType('customer');
        setShowDuplicateModal(true);
        return;
      }

      // No duplicate found, proceed with creation
      addCustomer(customerForm);
      resetCustomerForm();
      setShowCustomerModal(false);
    }
  };

  const resetCustomerForm = () => {
    setCustomerForm({
      name: '',
      contact: '',
      address: ''
    });
    setCurrentCustomer(null);
  };

  // Open edit customer modal
  const openEditCustomerModal = (customer: Customer) => {
    setCurrentCustomer(customer);
    setCustomerForm({
      name: customer.name,
      contact: customer.contact,
      address: customer.address
    });
    setShowCustomerModal(true);
  };

  // Handle customer deletion
  const handleDeleteCustomer = async (customer: Customer) => {
    setCurrentCustomer(customer);
    setIsAnalyzingDelete(true);
    setShowDeleteModal(true);

    try {
      // Call the backend analysis function
      const impactData = await window.electronAPI?.invoke('db:analyzeCustomerDeletion', customer.id);
      setDeleteImpactData(impactData);
    } catch (error) {
      console.error('Failed to analyze deletion impact:', error);
      // Show modal with error state
      setDeleteImpactData(null);
    } finally {
      setIsAnalyzingDelete(false);
    }
  };

  const confirmDeleteCustomer = async () => {
    if (!currentCustomer) return;

    setIsDeleting(true);
    const startTime = Date.now();
    const customerName = currentCustomer.name; // Store name before deletion

    try {
      await deleteCustomer(currentCustomer.id);

      // Ensure minimum 2-second loading state
      const elapsedTime = Date.now() - startTime;
      const remainingTime = Math.max(0, 2000 - elapsedTime);

      await new Promise(resolve => setTimeout(resolve, remainingTime));

      // Close modal and reset state
      setShowDeleteModal(false);
      setCurrentCustomer(null);
      setDeleteImpactData(null);

      // Show success toast for 1 second, then reload with buffer
      setToastMessage(`Customer "${customerName}" and all related transactions have been successfully deleted.`);
      setToastType('success');
      setShowToast(true);

      setTimeout(async () => {
        if (!window.electronAPI) {
          throw new Error('Electron API not available');
        }
        await window.electronAPI.reloadWindow();
      }, 1500); // 1s toast + 500ms buffer

    } catch (error) {
      console.error('Failed to delete customer:', error);
      setToastMessage('Failed to delete customer. Please try again.');
      setToastType('error');
      setShowToast(true);
    } finally {
      setIsDeleting(false);
    }
  };

  const handleDeleteModalClose = () => {
    setShowDeleteModal(false);
    setCurrentCustomer(null);
    setDeleteImpactData(null);
    setIsAnalyzingDelete(false);
  };

  // Navigate to customer leisures page with selected customer
  const navigateToCustomerLeisures = (customer: Customer) => {
    navigate('/customer-leisures', { state: { selectedCustomerId: customer.id } });
  };

  // Get customer's leisure records
  const getCustomerLeisures = useCallback((customerId: string) => {
    return customerLeisures.filter(leisure => leisure.customerId === customerId);
  }, [customerLeisures]);

  // Calculate customer totals based on customer leisure structure
  const calculateCustomerTotals = (customerId: string) => {
    const customerLeisures = getCustomerLeisures(customerId);
    const receivableTotal = customerLeisures
      .filter(leisure => leisure.type === 'receivable')
      .reduce((sum, leisure) => sum + leisure.amount, 0);
    const saleTotal = customerLeisures
      .filter(leisure => leisure.type === 'sale')
      .reduce((sum, leisure) => sum + leisure.amount, 0);

    return {
      totalPending: receivableTotal - saleTotal,
      totalPaid: saleTotal
    };
  };

  // Filter and sort customers using useMemo for performance
  const sortedCustomers = useMemo(() => {
    // First filter customers based on search query
    const filteredCustomers = searchQuery.trim()
      ? customers.filter(customer =>
          customer.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          customer.contact.toLowerCase().includes(searchQuery.toLowerCase()) ||
          customer.address.toLowerCase().includes(searchQuery.toLowerCase())
        )
      : customers;

    // Then sort by latest activity - customers with more recent leisure records first
    return filteredCustomers.sort((a, b) => {
      const aLatest = getCustomerLeisures(a.id).sort((x, y) =>
        new Date(`${y.date} ${y.time}`).getTime() - new Date(`${x.date} ${x.time}`).getTime()
      )[0];
      const bLatest = getCustomerLeisures(b.id).sort((x, y) =>
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
  }, [customers, searchQuery, getCustomerLeisures]);

  const paginatedCustomers = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return sortedCustomers.slice(startIndex, startIndex + itemsPerPage);
  }, [sortedCustomers, currentPage, itemsPerPage]);

  return (
    <Container fluid className="py-4">
      <Row className="mb-4">
        <Col>
          <div className="page-header">
            <h2>{t('customers.title')}</h2>
            <p>{t('customers.subtitle')}</p>
          </div>
          <Button variant="primary" onClick={() => setShowCustomerModal(true)}>
            {t('customers.addNewCustomer')}
          </Button>
        </Col>
      </Row>

      <Row>
        <Col>
          <Card className="shadow-sm border-0">
            <Card.Header className="bg-white text-dark py-3">
              <h5 className="mb-0" style={{ color: 'var(--primary-dark)' }}>{t('customers.customerList')}</h5>
            </Card.Header>
            <Card.Body>
              <SearchBar
                placeholder={t('customers.searchPlaceholder', 'Search customers by name, contact, or address...')}
                onSearch={setSearchQuery}
              />
              <Table striped bordered hover responsive>
                <thead>
                  <tr>
                    <th>{t('customers.name')}</th>
                    <th>{t('customers.contact')}</th>
                    <th>{t('customers.address')}</th>
                    <th>{t('customers.totalPending')}</th>
                    <th>{t('customers.totalPaid')}</th>
                    <th>{t('customers.actions')}</th>
                  </tr>
                </thead>
                <tbody>
                  {paginatedCustomers.map(customer => {
                    return (
                      <tr key={customer.id}>
                        <td>
                          <Button
                            variant="link"
                            className="p-0 text-decoration-none"
                            onClick={() => navigateToCustomerLeisures(customer)}
                          >
                            {customer.name}
                          </Button>
                        </td>
                        <td>{customer.contact}</td>
                        <td>{customer.address}</td>
                        <td className="text-danger">
                          ₹{customer.totalPending.toFixed(2)}
                        </td>
                        <td className="text-success">
                          ₹{customer.totalPaid.toFixed(2)}
                        </td>
                        <td>
                          <Button
                            variant="outline-primary"
                            size="sm"
                            className="me-2"
                            onClick={() => openEditCustomerModal(customer)}
                          >
                            {t('customers.edit')}
                          </Button>
                          <Button
                            variant="outline-danger"
                            size="sm"
                            onClick={() => handleDeleteCustomer(customer)}
                          >
                            {t('customers.delete')}
                          </Button>
                        </td>
                      </tr>
                    );
                  })}
                  {sortedCustomers.length === 0 && (
                    <tr>
                      <td colSpan={6} className="text-center">{t('customers.noCustomersFound')}</td>
                    </tr>
                  )}
                </tbody>
              </Table>
              {sortedCustomers.length > itemsPerPage && (
                <div className="d-flex justify-content-center mt-3">
                  <CustomPagination
                    currentPage={currentPage}
                    totalPages={Math.ceil(sortedCustomers.length / itemsPerPage)}
                    onPageChange={setCurrentPage}
                  />
                </div>
              )}
            </Card.Body>
          </Card>
        </Col>
      </Row>

      {/* Customer Form Modal */}
      <Modal show={showCustomerModal} onHide={() => { resetCustomerForm(); setShowCustomerModal(false); }}>
        <Modal.Header closeButton>
          <Modal.Title>{currentCustomer ? t('customers.editCustomer') : t('customers.addNewCustomerTitle')}</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Form>
            <Form.Group className="mb-3">
              <Form.Label>{t('customers.customerName')}</Form.Label>
              <Form.Control
                type="text"
                name="name"
                value={customerForm.name}
                onChange={handleCustomerFormChange}
                required
              />
            </Form.Group>
            <Form.Group className="mb-3">
              <Form.Label>{t('customers.contact')}</Form.Label>
              <Form.Control
                type="text"
                name="contact"
                value={customerForm.contact}
                onChange={handleCustomerFormChange}
                required
              />
            </Form.Group>
            <Form.Group className="mb-3">
              <Form.Label>{t('customers.address')}</Form.Label>
              <Form.Control
                as="textarea"
                rows={3}
                name="address"
                value={customerForm.address}
                onChange={handleCustomerFormChange}
              />
            </Form.Group>
            {currentCustomer && (
              <div className="row">
                <div className="col-md-6">
                  <Form.Group className="mb-3">
                    <Form.Label>{t('customers.totalPendingLabel')}</Form.Label>
                    <Form.Control
                      type="text"
                      value={`₹${currentCustomer.totalPending.toFixed(2)}`}
                      readOnly
                      className="text-danger"
                    />
                  </Form.Group>
                </div>
                <div className="col-md-6">
                  <Form.Group className="mb-3">
                    <Form.Label>{t('customers.totalPaidLabel')}</Form.Label>
                    <Form.Control
                      type="text"
                      value={`₹${currentCustomer.totalPaid.toFixed(2)}`}
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
          <Button variant="secondary" onClick={() => { resetCustomerForm(); setShowCustomerModal(false); }}>
            {t('customers.cancel')}
          </Button>
          <Button
            variant="primary"
            onClick={handleCustomerSubmit}
            disabled={!customerForm.name || !customerForm.contact}
          >
            {currentCustomer ? t('customers.updateCustomer') : t('customers.addCustomer')}
          </Button>
        </Modal.Footer>
      </Modal>

      {/* Customer Details Modal */}
      <Modal
        show={showCustomerDetailsModal}
        onHide={() => { setSelectedCustomer(null); setShowCustomerDetailsModal(false); }}
        size="lg"
      >
        <Modal.Header closeButton>
          <Modal.Title>
            {t('customers.leisureRecordsFor')} {selectedCustomer?.name}
          </Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {selectedCustomer && (
            <>
              <div className="mb-3">
                <h5>{t('customers.summary')}</h5>
                {(() => {
                  const totals = calculateCustomerTotals(selectedCustomer.id);
                  return (
                    <div className="row">
                      <div className="col-md-6">
                        <strong>{t('customers.totalPendingLabel')}: </strong>
                        <span className="text-danger">₹{totals.totalPending.toFixed(2)}</span>
                      </div>
                      <div className="col-md-6">
                        <strong>{t('customers.totalPaidLabel')}: </strong>
                        <span className="text-success">₹{totals.totalPaid.toFixed(2)}</span>
                      </div>
                    </div>
                  );
                })()}
              </div>

              <Table striped bordered hover responsive>
                <thead>
                  <tr>
                    <th>{t('customers.type')}</th>
                    <th>{t('customers.amount')}</th>
                    <th>{t('customers.paymentMethod')}</th>
                    <th>{t('common.dateTime')}</th>
                    <th>{t('common.notes')}</th>
                  </tr>
                </thead>
                <tbody>
                  {getCustomerLeisures(selectedCustomer.id).map(leisure => (
                    <tr key={leisure.id}>
                      <td>
                        <span className={`badge ${leisure.type === 'receivable' ? 'bg-danger' : 'bg-success'}`}>
                          {leisure.type === 'receivable' ? t('customers.receivable') : t('customers.sale')}
                        </span>
                      </td>
                      <td className={leisure.type === 'receivable' ? 'text-danger' : 'text-success'}>
                        ₹{leisure.amount.toFixed(2)}
                      </td>
                      <td>{leisure.paymentMethod || '-'}</td>
                      <td>{leisure.date} {leisure.time}</td>
                      <td>{leisure.notes}</td>
                    </tr>
                  ))}
                  {getCustomerLeisures(selectedCustomer.id).length === 0 && (
                    <tr>
                      <td colSpan={5} className="text-center">{t('customers.noLeisureRecords')}</td>
                    </tr>
                  )}
                </tbody>
              </Table>
            </>
          )}
        </Modal.Body>
        <Modal.Footer>
          <Button
            variant="secondary"
            onClick={() => { setSelectedCustomer(null); setShowCustomerDetailsModal(false); }}
          >
            {t('common.close')}
          </Button>
        </Modal.Footer>
      </Modal>

      {/* Deletion Warning Modal */}
      <DeletionWarningModal
        show={showDeleteModal}
        onHide={handleDeleteModalClose}
        onConfirm={confirmDeleteCustomer}
        entityType="customer"
        entityName={currentCustomer?.name || ''}
        impactData={deleteImpactData}
        isLoading={isAnalyzingDelete}
        isDeleting={isDeleting}
      />

      {/* Duplicate Warning Modal */}
      <Modal show={showDuplicateModal} onHide={() => setShowDuplicateModal(false)} centered>
        <Modal.Header closeButton>
          <Modal.Title className="text-warning">
            {t('common.duplicateTitle', { type: duplicateEntityType === 'customer' ? t('customerLeisures.customer', 'Customer') : t('leisures.broker', 'Broker') })}
          </Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <p className="mb-0">
            {t('common.duplicateMessage', { type: duplicateEntityType === 'customer' ? t('customerLeisures.customer', 'customer') : t('leisures.broker', 'broker') })}
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
            <strong>{toastType === 'success' ? t('settings.settingsSaved') : 'Failed to delete customer:'}</strong> {toastMessage}
          </Toast.Body>
        </Toast>
      </ToastContainer>
    </Container>
  );
};

export default Customers;
