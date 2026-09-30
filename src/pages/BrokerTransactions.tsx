import React, { useState, useMemo } from 'react';
import { Container, Row, Col, Card, Button, Form, Modal, Table } from 'react-bootstrap';
import CustomPagination from '../components/CustomPagination';
import { useTranslation } from 'react-i18next';
import { useAppContext, BrokerTransaction, Broker } from '../context/AppContext';
import InvoiceModal from '../components/InvoiceModal';
import DeletionWarningModal from '../components/DeletionWarningModal';
import SearchBar from '../components/SearchBar';
import SearchableSelect from '../components/SearchableSelect';
import { exportBrokerTransactionsToExcel, BrokerTransactionData } from '../utils/excelExport';

// Add custom styles for wide modal
const modalStyles = `
  .modal-wide .modal-dialog {
    max-width: 95vw !important;
    width: 95vw !important;
    margin: 0 auto;
  }
  .modal-wide .modal-content {
    border-radius: 0.5rem;
  }
  /* Hide number input spinners */
  .modal-wide input[type="number"]::-webkit-outer-spin-button,
  .modal-wide input[type="number"]::-webkit-inner-spin-button {
    -webkit-appearance: none;
    margin: 0;
  }
  .modal-wide input[type="number"] {
    -moz-appearance: textfield;
  }
`;

// Inject modal styles
if (typeof document !== 'undefined') {
  const modalStyleSheet = document.createElement("style");
  modalStyleSheet.type = "text/css";
  modalStyleSheet.innerText = modalStyles;
  document.head.appendChild(modalStyleSheet);
}

interface ProductEntry {
  id: string;
  productId: string;
  manufacturerId: string;
  units: number;
  unitType: 'tonnes' | 'units';
  rate: number;
  brokeragePerUnit: number;
  brokerage: number;
  total: number;
}

interface TransactionForm {
  brokerId: string;
  date: string;
  time: string;
  products: ProductEntry[];
  previousBalance: number;
  paymentMethod: 'UPI' | 'cash';
}

const BrokerTransactions: React.FC = () => {
  const { t } = useTranslation();
  const { brokers, products, addBrokerTransaction, updateBrokerTransaction, deleteBrokerTransaction, brokerTransactions, businessSettings, addLeisure } = useAppContext();

  const [showTransactionModal, setShowTransactionModal] = useState(false);
  const [showViewModal, setShowViewModal] = useState(false);
  const [showInvoiceModal, setShowInvoiceModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteImpactData, setDeleteImpactData] = useState<any>(null);
  const [isAnalyzingDelete, setIsAnalyzingDelete] = useState(false);
  const [currentTransaction, setCurrentTransaction] = useState<BrokerTransaction | null>(null);

  // Validation error state
  const [productValidationError, setProductValidationError] = useState('');

  // Leisure modal state
  const [showLeisureModal, setShowLeisureModal] = useState(false);
  const [leisureForm, setLeisureForm] = useState({
    amount: '',
    paymentMethod: 'UPI' as 'UPI' | 'Cash',
    date: new Date().toISOString().split('T')[0],
    time: new Date().toTimeString().slice(0, 5),
    notes: ''
  });

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  // Search and filter state
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedBrokerId, setSelectedBrokerId] = useState('');

  // Sort state
  const [sortColumn, setSortColumn] = useState<string>('date');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc' | null>('desc');

  // Reset pagination when search or filter changes
  React.useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, selectedBrokerId]);

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

  // Initialize form with empty products array
  const initializeForm = (): TransactionForm => {
    return {
      brokerId: '',
      date: new Date().toISOString().split('T')[0],
      time: new Date().toTimeString().slice(0, 5),
      products: [],
      previousBalance: 0,
      paymentMethod: 'cash' as 'UPI' | 'cash'
    };
  };

  const [transactionForm, setTransactionForm] = useState<TransactionForm>(initializeForm);

  const handleFormChange = (e: React.ChangeEvent<any>) => {
    const { name, value } = e.target;

    if (name === 'brokerId' && !currentTransaction) {
      // When adding a new transaction and broker is selected, get previous balance from AppContext
      const selectedBroker = brokers.find(b => b.id === value);
      setTransactionForm({
        ...transactionForm,
        brokerId: value,
        previousBalance: selectedBroker?.totalPending || 0
      });
    } else {
      setTransactionForm({
        ...transactionForm,
        [name]: name === 'previousBalance' ? parseFloat(value) || 0 : value
      });
    }
  };

  const handleLeisureFormChange = (e: React.ChangeEvent<any>) => {
    const { name, value } = e.target;
    setLeisureForm({
      ...leisureForm,
      [name]: value
    });
  };

  const handleProductEntryChange = (entryId: string, field: keyof ProductEntry, value: string | number) => {
    const updatedProducts = transactionForm.products.map(entry => {
      if (entry.id === entryId) {
        const updatedEntry = { ...entry, [field]: value };

        // Calculate total for this entry: units * rate
        if (field === 'units' || field === 'rate') {
          updatedEntry.total = updatedEntry.units * updatedEntry.rate;
        }
        if (field === 'units' || field === 'brokeragePerUnit') {
          updatedEntry.brokerage = parseFloat((updatedEntry.units * (updatedEntry.brokeragePerUnit || 0)).toFixed(2));
        }

        return updatedEntry;
      }
      return entry;
    });

    setTransactionForm({
      ...transactionForm,
      products: updatedProducts
    });
  };

  const addProductEntry = () => {
    const newEntry: ProductEntry = {
      id: Date.now().toString(),
      productId: '',
      manufacturerId: 'general',
      units: 0,
      unitType: 'units',
      rate: 0,
      brokeragePerUnit: 0,
      brokerage: 0,
      total: 0
    };

    setTransactionForm({
      ...transactionForm,
      products: [...transactionForm.products, newEntry]
    });
  };

  const removeProductEntry = (entryId: string) => {
    if (transactionForm.products.length > 1) {
      setTransactionForm({
        ...transactionForm,
        products: transactionForm.products.filter(entry => entry.id !== entryId)
      });
    }
  };

  const calculateTotalAmount = () => {
    const productsCost = transactionForm.products.reduce((sum, product) => sum + product.total, 0);
    const totalBrokerage = transactionForm.products.reduce((sum, product) => sum + (product.brokerage || 0), 0);
    return parseFloat((productsCost + totalBrokerage).toFixed(2));
  };

  const calculateTotalBrokerage = () => {
    return transactionForm.products.reduce((sum, product) => sum + (product.brokerage || 0), 0);
  };

  const handleSubmit = () => {
    // Clear previous validation error
    setProductValidationError('');

    // Check for products with selected product but 0 units
    const productsWithZeroUnits = transactionForm.products.filter(entry => entry.productId && entry.units <= 0);
    if (productsWithZeroUnits.length > 0) {
      setProductValidationError('Please enter a quantity greater than 0 for all selected products');
      return;
    }

    // Validate that at least one valid product exists
    const validProducts = transactionForm.products.filter(entry => entry.productId && entry.units > 0);

    if (validProducts.length === 0) {
      setProductValidationError('Please add at least one product to the transaction');
      return;
    }

    const totalAmount = calculateTotalAmount();
    const totalBrokerage = calculateTotalBrokerage();

    // Convert ProductEntry[] to the expected array format for BrokerTransaction
    const productsArray = validProducts
      .map(entry => ({
        productId: entry.productId,
        manufacturerId: entry.manufacturerId,
        units: entry.units,
        unitType: entry.unitType,
        rate: entry.rate,
        brokeragePerUnit: entry.brokeragePerUnit || 0,
        brokerage: entry.brokerage || 0,
        total: entry.total
      }));

    if (currentTransaction) {
      // Update existing transaction
      updateBrokerTransaction({
        ...currentTransaction,
        brokerId: transactionForm.brokerId,
        date: transactionForm.date,
        time: transactionForm.time,
        products: productsArray,
        previousBalance: transactionForm.previousBalance,
        totalAmount,
        totalBrokerage,
        paymentMethod: transactionForm.paymentMethod
      });
      resetForm();
      setShowTransactionModal(false);
    } else {
      // Add new transaction
      addBrokerTransaction({
        brokerId: transactionForm.brokerId,
        date: transactionForm.date,
        time: transactionForm.time,
        products: productsArray,
        previousBalance: transactionForm.previousBalance,
        totalAmount,
        totalBrokerage,
        paymentMethod: transactionForm.paymentMethod
      });

      // Store the transaction info for leisure modal
      setCurrentTransaction({
        id: Date.now().toString(),
        brokerId: transactionForm.brokerId,
        date: transactionForm.date,
        time: transactionForm.time,
        invoiceNumber: `INV-${new Date().getFullYear()}-${Date.now()}`,
        products: productsArray,
        previousBalance: transactionForm.previousBalance,
        totalAmount,
        totalBrokerage,
        paymentMethod: transactionForm.paymentMethod
      });

      // Pre-fill leisure form with total amount
      setLeisureForm({
        amount: totalAmount.toString(),
        paymentMethod: 'UPI',
        date: new Date().toISOString().split('T')[0],
        time: new Date().toTimeString().slice(0, 5),
        notes: ''
      });

      // Close transaction modal and show leisure modal
      setShowTransactionModal(false);
      setShowLeisureModal(true);
    }
  };





  const openAddModal = () => {
    setCurrentTransaction(null);
    const initialForm = initializeForm();
    setTransactionForm(initialForm);
    // Update date/time to today when opening modal
    setTransactionForm(prev => ({
      ...prev,
      date: new Date().toISOString().split('T')[0],
      time: new Date().toTimeString().slice(0, 5)
    }));
    setShowTransactionModal(true);
  };

  const resetForm = () => {
    setTransactionForm(initializeForm());
  };

  const openInvoiceModal = (transaction: BrokerTransaction) => {
    setCurrentTransaction(transaction);
    setShowInvoiceModal(true);
  };

  const openViewModal = (transaction: BrokerTransaction) => {
    setCurrentTransaction(transaction);
    setShowViewModal(true);
  };


  const handleExcelDownload = async () => {
    try {
      // Format broker transactions data for Excel export
      const formattedTransactions: BrokerTransactionData[] = brokerTransactions.map(transaction => ({
        id: transaction.id,
        brokerId: transaction.brokerId,
        brokerName: brokers.find(b => b.id === transaction.brokerId)?.name || 'Unknown',
        invoiceNumber: transaction.invoiceNumber,
        date: transaction.date,
        time: transaction.time,
        products: transaction.products,
        previousBalance: transaction.previousBalance,
        totalAmount: transaction.totalAmount,
        totalBrokerage: transaction.totalBrokerage || 0
      }));

      await exportBrokerTransactionsToExcel(formattedTransactions, products);
    } catch (error) {
      console.error('Error generating Excel file:', error);
      alert('Error generating Excel file. Please try again.');
    }
  };


  const handleDeleteTransaction = async (transaction: BrokerTransaction) => {
    setCurrentTransaction(transaction);
    setIsAnalyzingDelete(true);
    setShowDeleteModal(true);

    try {
      // Call the backend analysis function
      const impactData = await window.electronAPI?.invoke('db:analyzeBrokerTransactionDeletion', transaction.id);
      setDeleteImpactData(impactData);
    } catch (error) {
      console.error('Failed to analyze deletion impact:', error);
      // Show modal with error state
      setDeleteImpactData(null);
    } finally {
      setIsAnalyzingDelete(false);
    }
  };

  const confirmDeleteTransaction = async () => {
    if (!currentTransaction) return;

    try {
      await deleteBrokerTransaction(currentTransaction.id);
      setShowDeleteModal(false);
      setCurrentTransaction(null);
      setDeleteImpactData(null);
    } catch (error) {
      console.error('Failed to delete transaction:', error);
      alert('Failed to delete transaction. Please try again.');
    }
  };

  const handleDeleteModalClose = () => {
    setShowDeleteModal(false);
    setCurrentTransaction(null);
    setDeleteImpactData(null);
    setIsAnalyzingDelete(false);
  };

  const handleLeisureSubmit = () => {
    if (!currentTransaction) return;

    const amount = parseFloat(leisureForm.amount) || 0;

    addLeisure({
      brokerId: currentTransaction.brokerId,
      type: 'payable',
      amount,
      transactionId: currentTransaction.id,
      paymentMethod: leisureForm.paymentMethod,
      date: leisureForm.date,
      time: leisureForm.time,
      notes: leisureForm.notes
    });

    setShowLeisureModal(false);
    setCurrentTransaction(null);
    resetForm();
  };

  const handleSkipLeisure = () => {
    setShowLeisureModal(false);
    setCurrentTransaction(null);
    resetForm();
  };

  const shareLeisureOnWhatsApp = () => {
    setShowLeisureModal(false);
    setShowInvoiceModal(true);
  };

  // Filter and sort data using useMemo for performance
  const sortedTransactions = useMemo(() => {
    // First filter transactions based on search query and broker filter
    const filteredTransactions = brokerTransactions.filter(transaction => {
      // Broker filter
      if (selectedBrokerId && transaction.brokerId !== selectedBrokerId) {
        return false;
      }

      // Search filter - search in broker name, phone, date, and invoice number
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        const broker = brokers.find(b => b.id === transaction.brokerId);
        const brokerName = broker?.name?.toLowerCase() || '';
        const brokerPhone = broker?.contact?.toLowerCase() || '';
        const invoiceMatch = transaction.invoiceNumber?.toLowerCase().includes(query);
        const dateMatch = transaction.date?.includes(query);
        const nameMatch = brokerName.includes(query);
        const phoneMatch = brokerPhone.includes(query);
        return invoiceMatch || dateMatch || nameMatch || phoneMatch;
      }

      return true;
    });

    // Then sort by selected column
    return filteredTransactions.sort((a, b) => {
      let comparison = 0;
      
      switch (sortColumn) {
        case 'broker': {
          const brokerA = brokers.find(br => br.id === a.brokerId)?.name || '';
          const brokerB = brokers.find(br => br.id === b.brokerId)?.name || '';
          comparison = brokerA.localeCompare(brokerB);
          break;
        }
        case 'invoice':
          comparison = (a.invoiceNumber || '').localeCompare(b.invoiceNumber || '');
          break;
        case 'date':
          comparison = new Date(`${a.date} ${a.time}`).getTime() - new Date(`${b.date} ${b.time}`).getTime();
          break;
        case 'previousBalance':
          comparison = a.previousBalance - b.previousBalance;
          break;
        case 'totalAmount':
          comparison = a.totalAmount - b.totalAmount;
          break;
        case 'totalBrokerage':
          comparison = (a.totalBrokerage || 0) - (b.totalBrokerage || 0);
          break;
        default:
          comparison = new Date(`${a.date} ${a.time}`).getTime() - new Date(`${b.date} ${b.time}`).getTime();
      }
      
      return sortDirection === 'asc' ? comparison : -comparison;
    });
  }, [brokerTransactions, searchQuery, selectedBrokerId, sortColumn, sortDirection, brokers]);

  const paginatedTransactions = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return sortedTransactions.slice(startIndex, startIndex + itemsPerPage);
  }, [sortedTransactions, currentPage, itemsPerPage]);

  return (
    <Container fluid className="py-4">
      <Row className="mb-4">
        <Col>
          <div className="page-header">
            <h2>{t('brokerTransactions.title')}</h2>
            <p>{t('brokerTransactions.subtitle')}</p>

          </div>
          <Button variant="primary" onClick={openAddModal} className="me-2">
            {t('brokerTransactions.addNewTransaction')}
          </Button>
          <Button variant="success" onClick={handleExcelDownload} disabled={brokerTransactions.length === 0}>
            {t('brokerTransactions.downloadExcel')}
          </Button>
        </Col>
      </Row>

      <Row>
        <Col>
          <Card className="shadow-sm border-0">
            <Card.Header className="bg-white text-dark py-3">
              <h5 className="mb-0" style={{ color: 'var(--primary-dark)' }}>{t('brokerTransactions.transactionHistory')}</h5>
            </Card.Header>
            <Card.Body>
              <Row className="mb-3">
                <Col md={6}>
                  <SearchBar
                    placeholder={t('brokerTransactions.searchPlaceholder', 'Search by name, phone, date, or invoice...')}
                    onSearch={setSearchQuery}
                  />
                </Col>
                <Col md={6}>
                  <Form.Group>
                    <Form.Select
                      value={selectedBrokerId}
                      onChange={(e) => setSelectedBrokerId(e.target.value)}
                      style={{
                        height: '38px',
                        borderColor: '#ced4da',
                        boxShadow: 'none'
                      }}
                      onFocus={(e) => {
                        e.target.style.borderColor = '#86b7fe';
                        e.target.style.boxShadow = '0 0 0 0.25rem rgba(13, 110, 253, 0.25)';
                      }}
                      onBlur={(e) => {
                        e.target.style.borderColor = '#ced4da';
                        e.target.style.boxShadow = 'none';
                      }}
                    >
                      <option value="">{t('brokerTransactions.allBrokers', 'All Brokers')}</option>
                      {brokers.map(broker => (
                        <option key={broker.id} value={broker.id}>
                          {`${broker.name} (${broker.contact})`}
                        </option>
                      ))}
                    </Form.Select>
                  </Form.Group>
                </Col>
              </Row>
              <Table striped bordered hover responsive>
                <thead>
                  <tr>
                    <th style={{ cursor: 'pointer', userSelect: 'none' }} onClick={() => handleSort('broker')}>
                      {t('brokerTransactions.broker')}<SortIndicator column="broker" />
                    </th>
                    <th style={{ cursor: 'pointer', userSelect: 'none' }} onClick={() => handleSort('invoice')}>
                      {t('brokerTransactions.invoiceNo')}<SortIndicator column="invoice" />
                    </th>
                    <th style={{ cursor: 'pointer', userSelect: 'none' }} onClick={() => handleSort('date')}>
                      {t('brokerTransactions.dateTime')}<SortIndicator column="date" />
                    </th>
                    <th style={{ cursor: 'pointer', userSelect: 'none' }} onClick={() => handleSort('previousBalance')}>
                      {t('brokerTransactions.previousBalance')}<SortIndicator column="previousBalance" />
                    </th>
                    <th style={{ cursor: 'pointer', userSelect: 'none' }} onClick={() => handleSort('totalAmount')}>
                      {t('brokerTransactions.totalAmount')}<SortIndicator column="totalAmount" />
                    </th>
                    <th style={{ cursor: 'pointer', userSelect: 'none' }} onClick={() => handleSort('totalBrokerage')}>
                      {t('totalBrokerage', 'Total Brokerage')}<SortIndicator column="totalBrokerage" />
                    </th>
                    <th>{t('brokerTransactions.actions')}</th>
                  </tr>
                </thead>
                <tbody>
                  {paginatedTransactions.map(transaction => (
                    <tr key={transaction.id}>
                      <td>
                        {(() => {
                          const broker = brokers.find(b => b.id === transaction.brokerId);
                          return broker ? `${broker.name} (${broker.contact})` : t('brokerTransactions.unknown');
                        })()}
                      </td>
                      <td>{transaction.invoiceNumber || t('brokerTransactions.nA')}</td>
                      <td>{transaction.date} {transaction.time}</td>
                      <td>₹{transaction.previousBalance.toFixed(2)}</td>
                      <td>₹{transaction.totalAmount.toFixed(2)}</td>
                      <td>₹{(transaction.totalBrokerage || 0).toFixed(2)}</td>
                      <td>
                        <Button
                          variant="outline-info"
                          size="sm"
                          onClick={() => openViewModal(transaction)}
                          className="me-1"
                        >
                          {t('brokerTransactions.view')}
                        </Button>
                        <Button
                          variant="outline-success"
                          size="sm"
                          onClick={() => openInvoiceModal(transaction)}
                          className="me-1"
                        >
                          {t('brokerTransactions.invoice')}
                        </Button>
                        <Button
                          variant="outline-danger"
                          size="sm"
                          onClick={() => handleDeleteTransaction(transaction)}
                        >
                          {t('brokerTransactions.delete')}
                        </Button>
                      </td>
                    </tr>
                  ))}
                  {sortedTransactions.length === 0 && (
                    <tr>
                      <td colSpan={8} className="text-center">{t('brokerTransactions.noTransactionsFound')}</td>
                    </tr>
                  )}
                </tbody>
              </Table>
              {sortedTransactions.length > itemsPerPage && (
                <div className="d-flex justify-content-center mt-3">
                  <CustomPagination
                    currentPage={currentPage}
                    totalPages={Math.ceil(sortedTransactions.length / itemsPerPage)}
                    onPageChange={setCurrentPage}
                  />
                </div>
              )}
            </Card.Body>
          </Card>
        </Col>
      </Row>

      {/* Transaction Form Modal */}
      <Modal
        show={showTransactionModal}
        onHide={() => { resetForm(); setShowTransactionModal(false); }}
        size="xl"
        centered
        dialogClassName="modal-wide"
      >
        <Modal.Header closeButton>
          <Modal.Title>{currentTransaction ? t('brokerTransactions.editTransaction') : t('brokerTransactions.addNewTransactionTitle')}</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Form>
            {/* Broker and Previous Balance Row */}
            <Row className="mb-3">
              <Col md={6}>
                <SearchableSelect
                  label={t('brokerTransactions.broker')}
                  placeholder={t('brokerTransactions.selectBroker')}
                  value={transactionForm.brokerId}
                  onChange={(value) => handleFormChange({ target: { name: 'brokerId', value } } as any)}
                  options={brokers.map(broker => ({
                    value: broker.id,
                    label: `${broker.name} (${broker.contact})`
                  }))}
                  required
                />
              </Col>
              <Col md={6}>
                <Form.Group>
                  <Form.Label>{t('brokerTransactions.previousBalanceLabel')}</Form.Label>
                  <Form.Control
                    type="number"
                    value={transactionForm.previousBalance.toFixed(2)}
                    readOnly
                    className={transactionForm.previousBalance > 0 ? 'text-danger' : 'text-success'}
                  />
                </Form.Group>
              </Col>
            </Row>

            {/* Date and Time Row */}
            <Row className="mb-3">
              <Col md={6}>
                <Form.Group>
                  <Form.Label>{t('brokerTransactions.date')}</Form.Label>
                  <Form.Control
                    type="date"
                    name="date"
                    value={transactionForm.date}
                    onChange={handleFormChange}
                    required
                  />
                </Form.Group>
              </Col>
              <Col md={6}>
                <Form.Group>
                  <Form.Label>{t('brokerTransactions.time')}</Form.Label>
                  <Form.Control
                    type="time"
                    name="time"
                    value={transactionForm.time}
                    onChange={handleFormChange}
                    required
                  />
                </Form.Group>
              </Col>
            </Row>

            <div className="mb-3">
              <div className="d-flex justify-content-between align-items-center mb-3">
                <h5 className="mb-0">{t('brokerTransactions.products')}</h5>
                <Button variant="outline-primary" size="sm" onClick={addProductEntry}>
                  {t('brokerTransactions.addProduct')}
                </Button>
              </div>

              {productValidationError && (
                <div className="alert alert-danger py-2 mb-3">
                  {productValidationError}
                </div>
              )}

              {transactionForm.products.length === 0 && (
                <div className="text-center text-muted mb-3">
                  {t('brokerTransactions.addProductsMessage')}
                </div>
              )}

              {transactionForm.products.map((entry) => {
                const selectedProduct = products.find(p => p.id === entry.productId);
                return (
                  <Card key={entry.id} className="mb-3 position-relative">
                    {transactionForm.products.length > 1 && (
                      <Button
                        variant="link"
                        className="position-absolute top-0 end-0 m-2 p-0 text-danger"
                        style={{ fontSize: '1.2rem', lineHeight: 1, zIndex: 10 }}
                        onClick={() => removeProductEntry(entry.id)}
                        title="Remove product"
                      >
                        ×
                      </Button>
                    )}
                    <Card.Body className="py-3">
                      <Row className="align-items-end">
                        <Col md={2}>
                          <Form.Group>
                            <Form.Label>{t('brokerTransactions.product')}</Form.Label>
                            <Form.Select
                              size="sm"
                              value={entry.productId}
                              onChange={(e) => handleProductEntryChange(entry.id, 'productId', e.target.value)}
                            >
                              <option value="">{t('reports.config.selectProduct', 'Select Product')}</option>
                              {products.filter(product => !product.isArchived).map(product => (
                                <option key={product.id} value={product.id}>
                                  {product.name}
                                </option>
                              ))}
                            </Form.Select>
                          </Form.Group>
                        </Col>
                        <Col md={2}>
                          <Form.Group>
                            <Form.Label>{t('brokerTransactions.manufacturer')}</Form.Label>
                            <Form.Select
                              size="sm"
                              value={entry.manufacturerId}
                              onChange={(e) => handleProductEntryChange(entry.id, 'manufacturerId', e.target.value)}
                              disabled={!entry.productId}
                            >
                              {selectedProduct?.manufacturerStocks.filter(ms => !ms.isArchived).map(manufacturerStock => (
                                <option key={manufacturerStock.manufacturerId} value={manufacturerStock.manufacturerId}>
                                  {manufacturerStock.manufacturerName}
                                </option>
                              ))}
                            </Form.Select>
                          </Form.Group>
                        </Col>
                        <Col md={1}>
                          <Form.Group>
                            <Form.Label className="text-truncate d-block mb-1" style={{ fontSize: '0.85rem' }} title={t('brokerTransactions.unitType')}>{t('brokerTransactions.unitType')}</Form.Label>
                            <Form.Select
                              size="sm"
                              value={entry.unitType}
                              onChange={(e) => handleProductEntryChange(entry.id, 'unitType', e.target.value)}
                            >
                              <option value="units">{t('products.units', 'Units')}</option>
                              <option value="tonnes">{t('common.tonnes', 'Tonnes')}</option>
                            </Form.Select>
                          </Form.Group>
                        </Col>
                        <Col md={1}>
                          <Form.Group>
                            <Form.Label className="text-truncate d-block mb-1" style={{ fontSize: '0.85rem' }} title={t('brokerTransactions.units')}>{t('brokerTransactions.units')}</Form.Label>
                            <Form.Control
                              type="number"
                              placeholder="Units"
                              min="0"
                              step="0.01"
                              value={entry.units || ''}
                              onChange={(e) => handleProductEntryChange(entry.id, 'units', parseFloat(e.target.value) || 0)}
                              size="sm"
                            />
                          </Form.Group>
                        </Col>
                        <Col md={1}>
                          <Form.Group>
                            <Form.Label className="text-truncate d-block mb-1" style={{ fontSize: '0.85rem' }} title={t('brokerTransactions.rate')}>{t('brokerTransactions.rate')}</Form.Label>
                            <Form.Control
                              type="number"
                              placeholder="Rate"
                              min="0"
                              step="0.01"
                              value={entry.rate || ''}
                              onChange={(e) => handleProductEntryChange(entry.id, 'rate', parseFloat(e.target.value) || 0)}
                              size="sm"
                            />
                          </Form.Group>
                        </Col>
                        <Col md={1}>
                          <Form.Group>
                            <Form.Label className="text-truncate d-block mb-1" style={{ fontSize: '0.85rem' }} title={t('brokerTransactions.brokeragePerUnit', 'Brokerage/Unit')}>{t('brokerTransactions.brokeragePerUnit', 'Brokerage/Unit')}</Form.Label>
                            <Form.Control
                              type="number"
                              placeholder="0.00"
                              min="0"
                              step="0.01"
                              value={entry.brokeragePerUnit || ''}
                              onChange={(e) => handleProductEntryChange(entry.id, 'brokeragePerUnit', parseFloat(e.target.value) || 0)}
                              size="sm"
                            />
                          </Form.Group>
                        </Col>
                        <Col md={2}>
                          <Form.Group>
                            <Form.Label className="text-truncate d-block mb-1" style={{ fontSize: '0.85rem' }} title={t('brokerTransactions.brokerage', 'Brokerage')}>{t('brokerTransactions.brokerage', 'Brokerage')}</Form.Label>
                            <Form.Control
                              type="number"
                              value={(entry.brokerage || 0).toFixed(2)}
                              readOnly
                              size="sm"
                            />
                          </Form.Group>
                        </Col>
                        <Col md={2}>
                          <Form.Group>
                            <Form.Label className="text-truncate d-block mb-1" style={{ fontSize: '0.85rem' }} title={t('brokerTransactions.total')}>{t('brokerTransactions.total')}</Form.Label>
                            <Form.Control
                              type="number"
                              value={entry.total.toFixed(2)}
                              readOnly
                              size="sm"
                            />
                          </Form.Group>
                        </Col>
                      </Row>
                    </Card.Body>
                  </Card>
                );
              })}
            </div>

            {/* Payment Method and Total Amount Row */}
            {/* Payment Method, Total Brokerage, and Total Amount Row */}
            <Row className="mb-3">
              <Col md={4}>
                <Form.Group>
                  <Form.Label>{t('brokerTransactions.paymentMethod')}</Form.Label>
                  <Form.Select
                    name="paymentMethod"
                    value={transactionForm.paymentMethod}
                    onChange={handleFormChange}
                    required
                  >
                    <option value="cash">{t('brokerLeisures.cash', 'Cash')}</option>
                    <option value="UPI">{t('brokerLeisures.upi', 'UPI')}</option>
                  </Form.Select>
                </Form.Group>
              </Col>
              <Col md={4}>
                <Form.Group>
                  <Form.Label><strong>{t('brokerTransactions.totalBrokerage', 'Total Brokerage')}</strong></Form.Label>
                  <Form.Control
                    type="text"
                    value={`₹${calculateTotalBrokerage().toFixed(2)}`}
                    readOnly
                    className="bg-light text-primary font-weight-bold"
                  />
                </Form.Group>
              </Col>
              <Col md={4}>
                <Form.Group>
                  <Form.Label><strong>{t('brokerTransactions.totalLabel')}</strong></Form.Label>
                  <Form.Control
                    type="number"
                    value={calculateTotalAmount().toFixed(2)}
                    readOnly
                    style={{ fontWeight: 'bold' }}
                  />
                </Form.Group>
              </Col>
            </Row>


          </Form>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => { resetForm(); setShowTransactionModal(false); }}>
            {t('brokerTransactions.cancel')}
          </Button>
          <Button
            variant="primary"
            onClick={handleSubmit}
            disabled={!transactionForm.brokerId}
          >
            {currentTransaction ? t('brokerTransactions.updateTransaction') : t('brokerTransactions.addTransaction')}
          </Button>
        </Modal.Footer>
      </Modal>

      {/* Invoice Modal */}
      <InvoiceModal
        show={showInvoiceModal}
        onHide={() => setShowInvoiceModal(false)}
        transaction={currentTransaction}
        type="broker"
      />

      {/* View Transaction Modal */}
      <Modal show={showViewModal} onHide={() => setShowViewModal(false)} size="xl">
        <Modal.Header closeButton>
          <Modal.Title>{t('brokerTransactions.viewTransaction')}</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {currentTransaction && (
            <div className="transaction-details">
              {/* Header Section */}
              <div className="mb-4">
                <h5 className="mb-3">{t('brokerTransactions.transactionDetails', 'Transaction Details')}</h5>
                <Row>
                  <Col md={3}>
                    <div className="detail-item">
                      <strong>{t('brokerTransactions.transactionId', 'Transaction ID:')}</strong>
                      <div>{currentTransaction.id.slice(-8)}</div>
                    </div>
                  </Col>
                  <Col md={3}>
                    <div className="detail-item">
                      <strong>{t('brokerTransactions.invoiceNumber', 'Invoice Number:')}</strong>
                      <div>{currentTransaction.invoiceNumber || t('brokerTransactions.nA', 'N/A')}</div>
                    </div>
                  </Col>
                  <Col md={3}>
                    <div className="detail-item">
                      <strong>{t('brokerTransactions.date', 'Date:')}</strong>
                      <div>{currentTransaction.date}</div>
                    </div>
                  </Col>
                  <Col md={3}>
                    <div className="detail-item">
                      <strong>{t('brokerTransactions.time', 'Time:')}</strong>
                      <div>{currentTransaction.time}</div>
                    </div>
                  </Col>
                </Row>
              </div>

              {/* Broker Information */}
              <div className="mb-4">
                <h6 className="mb-3">{t('brokerTransactions.brokerInformation', 'Broker Information')}</h6>
                {(() => {
                  const broker = brokers.find(b => b.id === currentTransaction.brokerId);
                  return (
                    <Row>
                      <Col md={4}>
                        <div className="detail-item">
                          <strong>{t('brokerTransactions.name', 'Name:')}</strong>
                          <div>{broker?.name || t('brokerTransactions.unknown', 'Unknown')}</div>
                        </div>
                      </Col>
                      <Col md={4}>
                        <div className="detail-item">
                          <strong>{t('brokerTransactions.contact', 'Contact:')}</strong>
                          <div>{broker?.contact || t('brokerTransactions.nA', 'N/A')}</div>
                        </div>
                      </Col>
                      <Col md={4}>
                        <div className="detail-item">
                          <strong>{t('brokerTransactions.address', 'Address:')}</strong>
                          <div>{broker?.address || t('brokerTransactions.nA', 'N/A')}</div>
                        </div>
                      </Col>
                    </Row>
                  );
                })()}
              </div>

              {/* Products Table */}
              <div className="mb-4">
                <h6 className="mb-3">{t('brokerTransactions.products', 'Products')}</h6>
                <Table striped bordered hover>
                  <thead>
                    <tr>
                      <th>{t('brokerTransactions.product', 'Product')}</th>
                      <th>{t('brokerTransactions.manufacturer', 'Manufacturer')}</th>
                      <th>{t('brokerTransactions.unitType', 'Unit Type')}</th>
                      <th>{t('brokerTransactions.units', 'Units')}</th>
                      <th>{t('brokerTransactions.rate', 'Rate')}</th>
                      <th>{t('brokerTransactions.brokeragePerUnit', 'Brokerage/Unit')}</th>
                      <th>{t('brokerTransactions.brokerage', 'Brokerage')}</th>
                      <th>{t('brokerTransactions.total', 'Total')}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {currentTransaction.products.map((productData, index) => {
                      const product = products.find(p => p.id === productData.productId);
                      const manufacturerStock = product?.manufacturerStocks.find(ms => ms.manufacturerId === productData.manufacturerId);
                      return (
                        <tr key={`${productData.productId}-${index}`}>
                          <td>{product ? product.name : productData.productId}</td>
                          <td>{manufacturerStock ? manufacturerStock.manufacturerName : productData.manufacturerId}</td>
                          <td>{productData.unitType === 'units' ? t('products.units', 'units') : t('common.tonnes', 'tonnes')}</td>
                          <td>{productData.units}</td>
                          <td>₹{productData.rate.toFixed(2)}</td>
                          <td>₹{(productData.brokeragePerUnit || 0).toFixed(2)}</td>
                          <td>₹{(productData.brokerage || 0).toFixed(2)}</td>
                          <td>₹{productData.total.toFixed(2)}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </Table>
              </div>

              {/* Financial Summary */}
              <div className="mb-4">
                <h6 className="mb-3">{t('brokerTransactions.financialSummary', 'Financial Summary')}</h6>
                <Row>
                  <Col md={3}>
                    <div className="detail-item">
                      <strong>{t('brokerTransactions.previousBalanceColon', 'Previous Balance:')}</strong>
                      <div>₹{currentTransaction.previousBalance.toFixed(2)}</div>
                    </div>
                  </Col>
                  <Col md={3}>
                    <div className="detail-item">
                      <strong>{t('brokerTransactions.totalBrokerageColon', 'Total Brokerage:')}</strong>
                      <div>₹{(currentTransaction.totalBrokerage || 0).toFixed(2)}</div>
                    </div>
                  </Col>
                  <Col md={3}>
                    <div className="detail-item">
                      <strong>{t('brokerTransactions.totalAmountColon', 'Total Amount:')}</strong>
                      <div>₹{currentTransaction.totalAmount.toFixed(2)}</div>
                    </div>
                  </Col>
                  <Col md={3}>
                    <div className="detail-item">
                      <strong>{t('brokerTransactions.paymentMethodColon', 'Payment Method:')}</strong>
                      <div>{currentTransaction.paymentMethod?.toLowerCase() === 'cash' ? t('brokerLeisures.cash', 'Cash') : currentTransaction.paymentMethod?.toUpperCase() === 'UPI' ? t('brokerLeisures.upi', 'UPI') : currentTransaction.paymentMethod}</div>
                    </div>
                  </Col>
                </Row>

              </div>
            </div>
          )}
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowViewModal(false)}>
            {t('brokerTransactions.close')}
          </Button>
        </Modal.Footer>
      </Modal>

      {/* Deletion Warning Modal */}
      <DeletionWarningModal
        show={showDeleteModal}
        onHide={handleDeleteModalClose}
        onConfirm={confirmDeleteTransaction}
        entityType="brokerTransaction"
        entityName={currentTransaction?.invoiceNumber || `Transaction ${currentTransaction?.id.slice(-8)}`}
        impactData={deleteImpactData}
        isLoading={isAnalyzingDelete}
      />

      {/* Leisure Modal */}
      <Modal show={showLeisureModal} onHide={() => setShowLeisureModal(false)} centered>
        <Modal.Header closeButton>
          <Modal.Title>{t('brokerTransactions.addPaymentDetails', 'Add Payment Details')}</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Form>
            <Form.Group className="mb-3">
              <Form.Label>{t('brokerTransactions.paidAmount', 'Paid Amount')}</Form.Label>
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

            <Form.Group className="mb-3">
              <Form.Label>{t('brokerTransactions.paymentMethod', 'Payment Method')}</Form.Label>
              <Form.Select
                name="paymentMethod"
                value={leisureForm.paymentMethod}
                onChange={handleLeisureFormChange}
              >
                <option value="UPI">{t('brokerLeisures.upi', 'UPI')}</option>
                <option value="Cash">{t('brokerLeisures.cash', 'Cash')}</option>
              </Form.Select>
            </Form.Group>

            <Row className="mb-3">
              <Col md={6}>
                <Form.Group>
                  <Form.Label>{t('brokerTransactions.date', 'Date')}</Form.Label>
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
                  <Form.Label>{t('brokerTransactions.time', 'Time')}</Form.Label>
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
              <Form.Label>{t('brokerTransactions.notes', 'Notes')}</Form.Label>
              <Form.Control
                as="textarea"
                rows={2}
                name="notes"
                value={leisureForm.notes}
                onChange={handleLeisureFormChange}
                placeholder={t('common.optionalNotes', 'Optional notes...')}
              />
            </Form.Group>
          </Form>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="outline-secondary" onClick={handleSkipLeisure}>
            {t('brokerTransactions.skip', 'Skip')}
          </Button>
          <Button variant="success" onClick={shareLeisureOnWhatsApp}>
            {t('brokerTransactions.sendBillWhatsApp', 'Send Bill on WhatsApp')}
          </Button>
          <Button variant="primary" onClick={handleLeisureSubmit}>
            {t('brokerTransactions.savePayment', 'Save Payment')}
          </Button>
        </Modal.Footer>
      </Modal>
    </Container>
  );
};

export default BrokerTransactions;
