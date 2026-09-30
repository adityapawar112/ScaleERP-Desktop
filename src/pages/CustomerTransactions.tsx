import React, { useState, useMemo } from 'react';
import { Container, Row, Col, Card, Button, Form, Modal, Table } from 'react-bootstrap';
import CustomPagination from '../components/CustomPagination';
import { useTranslation } from 'react-i18next';
import { useAppContext, CustomerTransaction } from '../context/AppContext';
import InvoiceModal from '../components/InvoiceModal';
import DeletionWarningModal from '../components/DeletionWarningModal';
import SearchBar from '../components/SearchBar';
import SearchableSelect from '../components/SearchableSelect';
import { exportCustomerTransactionsToExcel, CustomerTransactionData } from '../utils/excelExport';

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
  quantity: number;
  unitType: 'tonnes' | 'units';
  price: number;
  labour?: number;
  total: number;
}

interface TransactionForm {
  customerId: string;
  date: string;
  time: string;
  products: ProductEntry[];
  labourCharge: number;
  paymentMethod: 'UPI' | 'cash';
}

const CustomerTransactions: React.FC = () => {
  const { t } = useTranslation();
  const { products, customers, addCustomerTransaction, updateCustomerTransaction, deleteCustomerTransaction, customerTransactions, getDailySalesTotal, getMonthlySalesTotal, businessSettings, leisures, customerLeisures, addCustomerLeisure } = useAppContext();

  const [showTransactionModal, setShowTransactionModal] = useState(false);
  const [showViewModal, setShowViewModal] = useState(false);
  const [showInvoiceModal, setShowInvoiceModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteImpactData, setDeleteImpactData] = useState<any>(null);
  const [isAnalyzingDelete, setIsAnalyzingDelete] = useState(false);
  const [currentTransaction, setCurrentTransaction] = useState<CustomerTransaction | null>(null);

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
  const [selectedCustomerId, setSelectedCustomerId] = useState('');

  // Sort state
  const [sortColumn, setSortColumn] = useState<string>('date');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc' | null>('desc');

  // Reset pagination when search or filter changes
  React.useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, selectedCustomerId]);

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
      customerId: '',
      date: new Date().toISOString().split('T')[0],
      time: new Date().toTimeString().slice(0, 5),
      products: [],
      labourCharge: 0,
      paymentMethod: 'cash' as 'UPI' | 'cash'
    };
  };

  const [transactionForm, setTransactionForm] = useState<TransactionForm>(initializeForm);

  const handleFormChange = (e: React.ChangeEvent<any>) => {
    const { name, value } = e.target;
    setTransactionForm({
      ...transactionForm,
      [name]: name === 'labourCharge' ? parseFloat(value) || 0 : value
    });
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

        // Calculate total for this entry: price * quantity
        if (field === 'quantity' || field === 'price') {
          updatedEntry.total = updatedEntry.price * updatedEntry.quantity;
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
      quantity: 0,
      unitType: 'units',
      price: 0,
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
    const productsTotal = transactionForm.products.reduce((sum, entry) => sum + entry.total, 0);
    return productsTotal + (transactionForm.labourCharge || 0);
  };



  const handleSubmit = () => {
    // Clear previous validation error
    setProductValidationError('');

    // Check for products with selected product but 0 quantity
    const productsWithZeroQty = transactionForm.products.filter(entry => entry.productId && entry.quantity <= 0);
    if (productsWithZeroQty.length > 0) {
      setProductValidationError('Please enter a quantity greater than 0 for all selected products');
      return;
    }

    // Validate that at least one valid product exists
    const validProducts = transactionForm.products.filter(entry => entry.productId && entry.quantity > 0);

    if (validProducts.length === 0) {
      setProductValidationError('Please add at least one product to the transaction');
      return;
    }

    const totalAmount = calculateTotalAmount();
    const labourCharge = transactionForm.labourCharge || 0;

    // Filter out empty entries and convert to the expected format
    const productsArray = validProducts
      .map(entry => ({
        productId: entry.productId,
        manufacturerId: entry.manufacturerId,
        quantity: entry.quantity,
        unitType: entry.unitType,
        price: entry.price,
        labour: 0,
        total: entry.total
      }));

    // Get previous balance from AppContext
    const selectedCustomer = customers.find(c => c.id === transactionForm.customerId);
    const previousBalance = selectedCustomer?.totalPending || 0;

    if (currentTransaction) {
      // Update existing transaction
      updateCustomerTransaction({
        ...currentTransaction,
        customerId: transactionForm.customerId,
        date: transactionForm.date,
        time: transactionForm.time,
        products: productsArray,
        labourCharge,
        totalAmount,
        previousBalance,
        paymentMethod: transactionForm.paymentMethod
      });
      resetForm();
      setShowTransactionModal(false);
    } else {
      // Add new transaction
      addCustomerTransaction({
        customerId: transactionForm.customerId,
        date: transactionForm.date,
        time: transactionForm.time,
        products: productsArray,
        labourCharge,
        totalAmount,
        previousBalance,
        paymentMethod: transactionForm.paymentMethod
      });

      // Store the transaction info for leisure modal
      setCurrentTransaction({
        id: Date.now().toString(),
        customerId: transactionForm.customerId,
        date: transactionForm.date,
        time: transactionForm.time,
        invoiceNumber: `CUST-INV-${new Date().getFullYear()}-${Date.now()}`,
        products: productsArray,
        labourCharge,
        totalAmount,
        previousBalance,
        paymentMethod: transactionForm.paymentMethod
      });

      // Pre-fill leisure form with total amount and current date/time
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
    resetForm();
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

  const openInvoiceModal = (transaction: CustomerTransaction) => {
    setCurrentTransaction(transaction);
    setShowInvoiceModal(true);
  };

  const openViewModal = (transaction: CustomerTransaction) => {
    setCurrentTransaction(transaction);
    setShowViewModal(true);
  };

  const getTodaySales = () => {
    const today = new Date().toISOString().split('T')[0];
    return getDailySalesTotal(today);
  };

  const getCurrentMonthSales = () => {
    const now = new Date();
    return getMonthlySalesTotal(now.getFullYear(), now.getMonth());
  };

  const handleExcelDownload = async () => {
    try {
      // Format customer transactions data for Excel export
      const formattedTransactions: CustomerTransactionData[] = customerTransactions.map(transaction => ({
        id: transaction.id,
        invoiceNumber: transaction.invoiceNumber,
        customerName: customers.find(c => c.id === transaction.customerId)?.name || 'Unknown Customer',
        date: transaction.date,
        time: transaction.time,
        products: transaction.products,
        labourCharge: transaction.labourCharge || 0,
        totalAmount: transaction.totalAmount,
        paymentMethod: transaction.paymentMethod
      }));

      await exportCustomerTransactionsToExcel(formattedTransactions, products);
    } catch (error) {
      console.error('Error generating Excel file:', error);
      alert('Error generating Excel file. Please try again.');
    }
  };


  const handleDeleteTransaction = async (transaction: CustomerTransaction) => {
    setCurrentTransaction(transaction);
    setIsAnalyzingDelete(true);
    setShowDeleteModal(true);

    try {
      // Call the backend analysis function
      const impactData = await window.electronAPI?.invoke('db:analyzeCustomerTransactionDeletion', transaction.id);
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
      await deleteCustomerTransaction(currentTransaction.id);
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

    addCustomerLeisure({
      customerId: currentTransaction.customerId!,
      type: 'sale',
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

  const formatInvoiceForWhatsApp = (transaction: CustomerTransaction, customer: any): string => {
    const formatCurrency = (amount: number) => `₹${amount.toFixed(2)}`;

    // Format date as DD/MM/YYYY
    const formatDate = (dateString: string) => {
      const date = new Date(dateString);
      return `${date.getDate().toString().padStart(2, '0')}/${(date.getMonth() + 1).toString().padStart(2, '0')}/${date.getFullYear()}`;
    };

    let message = `*${businessSettings.businessName}*\n`;
    message += `${businessSettings.address}\n`;
    message += `${t('invoice.proprietor')}: ${businessSettings.proprietorName}\n`;
    message += `${t('invoice.phone')}: ${businessSettings.phoneNumbers.join(' / ')}\n\n`;

    message += `${t('invoice.invoiceNo')}: ${transaction.invoiceNumber || t('invoice.nA')}\n`;
    message += `${t('invoice.dateTime')}: ${formatDate(transaction.date)} ${transaction.time}\n\n`;

    message += `${t('invoice.customerDetails')}\n`;
    message += `${customer.name}\n`;
    message += `${customer.contact}\n`;
    message += `${customer.address}\n\n`;

    message += `${t('invoice.srNo')}|${t('invoice.description')}|${t('invoice.qty')}|${t('invoice.rate')}|Labour|${t('invoice.amount')}\n`;

    let srNo = 1;
    transaction.products.forEach((productData) => {
      if (productData.quantity > 0) {
        const product = products.find(p => p.id === productData.productId);
        const manufacturerStock = product?.manufacturerStocks.find(ms => ms.manufacturerId === productData.manufacturerId);
        const productName = product ? product.name : productData.productId;
        const manufacturerName = manufacturerStock ? manufacturerStock.manufacturerName : productData.manufacturerId;
        const displayName = `${productName} (${manufacturerName})`;
        const quantityWithUnit = `${productData.quantity} ${productData.unitType}`;
        message += `${srNo}|${displayName}|${quantityWithUnit}|${formatCurrency(productData.price)}|${formatCurrency(productData.labour)}|${formatCurrency(productData.total)}\n`;
        srNo++;
      }
    });

    message += `\n${t('invoice.total')}: ${formatCurrency(transaction.totalAmount)}\n`;
    if (transaction.previousBalance && transaction.previousBalance > 0) {
      message += `${t('invoice.previousBalance')}: ${formatCurrency(transaction.previousBalance)}\n`;
    }
    message += `${t('invoice.totalAmount')}: ${formatCurrency(transaction.totalAmount + (transaction.previousBalance || 0))}\n`;

    return message;
  };

  // Filter and sort transactions using useMemo for performance
  const sortedTransactions = useMemo(() => {
    // First filter transactions based on search query and customer filter
    const filteredTransactions = customerTransactions.filter(transaction => {
      // Customer filter
      if (selectedCustomerId && transaction.customerId !== selectedCustomerId) {
        return false;
      }

      // Search filter - search in customer name, phone, date, and invoice number
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        const customer = customers.find(c => c.id === transaction.customerId);
        const customerName = customer?.name?.toLowerCase() || '';
        const customerPhone = customer?.contact?.toLowerCase() || '';
        const invoiceMatch = transaction.invoiceNumber?.toLowerCase().includes(query);
        const dateMatch = transaction.date?.includes(query);
        const nameMatch = customerName.includes(query);
        const phoneMatch = customerPhone.includes(query);
        return invoiceMatch || dateMatch || nameMatch || phoneMatch;
      }

      return true;
    });

    // Then sort by selected column
    return filteredTransactions.sort((a, b) => {
      let comparison = 0;
      
      switch (sortColumn) {
        case 'customer': {
          const customerA = customers.find(c => c.id === a.customerId)?.name || '';
          const customerB = customers.find(c => c.id === b.customerId)?.name || '';
          comparison = customerA.localeCompare(customerB);
          break;
        }
        case 'invoice':
          comparison = (a.invoiceNumber || '').localeCompare(b.invoiceNumber || '');
          break;
        case 'date':
          comparison = new Date(`${a.date} ${a.time}`).getTime() - new Date(`${b.date} ${b.time}`).getTime();
          break;
        case 'previousBalance':
          comparison = (a.previousBalance || 0) - (b.previousBalance || 0);
          break;
        case 'labourCharge':
          comparison = (a.labourCharge || 0) - (b.labourCharge || 0);
          break;
        case 'totalAmount':
          comparison = a.totalAmount - b.totalAmount;
          break;
        default:
          comparison = new Date(`${a.date} ${a.time}`).getTime() - new Date(`${b.date} ${b.time}`).getTime();
      }
      
      return sortDirection === 'asc' ? comparison : -comparison;
    });
  }, [customerTransactions, searchQuery, selectedCustomerId, sortColumn, sortDirection]);

  const paginatedTransactions = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return sortedTransactions.slice(startIndex, startIndex + itemsPerPage);
  }, [sortedTransactions, currentPage, itemsPerPage]);

  return (
    <Container fluid className="py-4">
      <Row className="mb-4">
        <Col>
          <div className="page-header">
            <h2>{t('customerTransactions.title')}</h2>
            <p>{t('customerTransactions.subtitle')}</p>
          </div>
          <Button variant="primary" onClick={openAddModal} className="me-2">
            {t('customerTransactions.addNewSale')}
          </Button>
          <Button variant="success" onClick={handleExcelDownload} disabled={customerTransactions.length === 0}>
            {t('customerTransactions.downloadExcel')}
          </Button>
        </Col>
      </Row>

      {/* Sales Summary */}
      <Row className="mb-4">
        <Col md={6}>
          <Card className="shadow-sm border-0">
            <Card.Body>
              <Card.Title>{t('customerTransactions.todaySales')}</Card.Title>
              <h3 className="text-success">₹{getTodaySales().toFixed(2)}</h3>
            </Card.Body>
          </Card>
        </Col>
        <Col md={6}>
          <Card className="shadow-sm border-0">
            <Card.Body>
              <Card.Title>{t('customerTransactions.currentMonthSales')}</Card.Title>
              <h3 className="text-primary">₹{getCurrentMonthSales().toFixed(2)}</h3>
            </Card.Body>
          </Card>
        </Col>
      </Row>

      <Row>
        <Col>
          <Card className="shadow-sm border-0">
            <Card.Header className="bg-white text-dark py-3">
              <h5 className="mb-0" style={{ color: 'var(--primary-dark)' }}>{t('customerTransactions.salesHistory')}</h5>
            </Card.Header>
            <Card.Body>
              <Row className="mb-3">
                <Col md={6}>
                  <SearchBar
                    placeholder={t('customerTransactions.searchPlaceholder', 'Search by name, phone, date, or invoice...')}
                    onSearch={setSearchQuery}
                  />
                </Col>
                <Col md={6}>
                  <Form.Group>
                    <Form.Select
                      value={selectedCustomerId}
                      onChange={(e) => setSelectedCustomerId(e.target.value)}
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
                      <option value="">{t('customerTransactions.allCustomers', 'All Customers')}</option>
                      {customers.map(customer => (
                        <option key={customer.id} value={customer.id}>
                          {`${customer.name} (${customer.contact})`}
                        </option>
                      ))}
                    </Form.Select>
                  </Form.Group>
                </Col>
              </Row>
              <Table striped bordered hover responsive>
                <thead>
                  <tr>
                    <th style={{ cursor: 'pointer', userSelect: 'none' }} onClick={() => handleSort('customer')}>
                      {t('customerTransactions.customer')}<SortIndicator column="customer" />
                    </th>
                    <th style={{ cursor: 'pointer', userSelect: 'none' }} onClick={() => handleSort('invoice')}>
                      {t('customerTransactions.invoiceNo')}<SortIndicator column="invoice" />
                    </th>
                    <th style={{ cursor: 'pointer', userSelect: 'none' }} onClick={() => handleSort('date')}>
                      {t('customerTransactions.dateTime')}<SortIndicator column="date" />
                    </th>
                    <th style={{ cursor: 'pointer', userSelect: 'none' }} onClick={() => handleSort('previousBalance')}>
                      {t('customerTransactions.previousBalance')}<SortIndicator column="previousBalance" />
                    </th>
                    <th style={{ cursor: 'pointer', userSelect: 'none' }} onClick={() => handleSort('labourCharge')}>
                      {t('labourCharge', 'Labour Charge')}<SortIndicator column="labourCharge" />
                    </th>
                    <th style={{ cursor: 'pointer', userSelect: 'none' }} onClick={() => handleSort('totalAmount')}>
                      {t('customerTransactions.totalAmount')}<SortIndicator column="totalAmount" />
                    </th>
                    <th>{t('customerTransactions.actions')}</th>
                  </tr>
                </thead>
                <tbody>
                  {paginatedTransactions.map(transaction => (
                    <tr key={transaction.id}>
                      <td>
                        {(() => {
                          const customer = customers.find(c => c.id === transaction.customerId);
                          return customer ? `${customer.name} (${customer.contact})` : 'Unknown';
                        })()}
                      </td>
                      <td>
                        {transaction.invoiceNumber || 'N/A'}
                      </td>
                      <td>
                        {transaction.date} {transaction.time}
                      </td>
                      <td>₹{(transaction.previousBalance || 0).toFixed(2)}</td>
                      <td>₹{(transaction.labourCharge || 0).toFixed(2)}</td>
                      <td>₹{transaction.totalAmount.toFixed(2)}</td>
                      <td>
                        <Button
                          variant="outline-info"
                          size="sm"
                          onClick={() => openViewModal(transaction)}
                          className="me-1"
                        >
                          {t('customerTransactions.view')}
                        </Button>
                        <Button
                          variant="outline-success"
                          size="sm"
                          onClick={() => openInvoiceModal(transaction)}
                          className="me-1"
                        >
                          {t('customerTransactions.invoice')}
                        </Button>
                        <Button
                          variant="outline-danger"
                          size="sm"
                          onClick={() => handleDeleteTransaction(transaction)}
                        >
                          {t('customerTransactions.delete')}
                        </Button>
                      </td>
                    </tr>
                  ))}
                  {sortedTransactions.length === 0 && (
                    <tr>
                      <td colSpan={7} className="text-center">{t('customerTransactions.noSalesRecorded')}</td>
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
          <Modal.Title>{currentTransaction ? t('customerTransactions.editSale') : t('customerTransactions.addNewSaleTitle')}</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Form>
            <Row className="mb-3">
              <Col md={6}>
                <SearchableSelect
                  label={t('customerTransactions.customer')}
                  placeholder="Select Customer"
                  value={transactionForm.customerId}
                  onChange={(value) => handleFormChange({ target: { name: 'customerId', value } } as any)}
                  options={customers.map(customer => ({
                    value: customer.id,
                    label: `${customer.name} (${customer.contact})`
                  }))}
                  required
                />
              </Col>
              <Col md={6}>
                <Form.Group>
                  <Form.Label>{t('customerTransactions.previousBalance')}</Form.Label>
                  <Form.Control
                    type="number"
                    value={transactionForm.customerId ? (customers.find(c => c.id === transactionForm.customerId)?.totalPending || 0).toFixed(2) : '0.00'}
                    readOnly
                    className={transactionForm.customerId && (customers.find(c => c.id === transactionForm.customerId)?.totalPending || 0) > 0 ? 'text-danger' : 'text-success'}
                  />
                </Form.Group>
              </Col>
            </Row>

            <Row className="mb-3">
              <Col md={6}>
                <Form.Group>
                  <Form.Label>{t('customerTransactions.date')}</Form.Label>
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
                  <Form.Label>{t('customerTransactions.time')}</Form.Label>
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
                <h5 className="mb-0">{t('customerTransactions.products')}</h5>
                <Button variant="outline-primary" size="sm" onClick={addProductEntry}>
                  {t('customerTransactions.addProduct')}
                </Button>
              </div>

              {productValidationError && (
                <div className="alert alert-danger py-2 mb-3">
                  {productValidationError}
                </div>
              )}

              {transactionForm.products.length === 0 && (
                <div className="text-center text-muted mb-3">
                  {t('customerTransactions.addProductsMessage')}
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
                        <Col md={3}>
                          <Form.Group>
                            <Form.Label>{t('customerTransactions.product')}</Form.Label>
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
                        <Col md={3}>
                          <Form.Group>
                            <Form.Label>{t('customerTransactions.manufacturer')}</Form.Label>
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
                            <Form.Label>{t('customerTransactions.unitType')}</Form.Label>
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
                        <Col md={2}>
                          <Form.Group>
                            <Form.Label>{t('customerTransactions.price')}</Form.Label>
                            <Form.Control
                              type="number"
                              placeholder="Price"
                              min="0"
                              step="0.01"
                              value={entry.price || ''}
                              onChange={(e) => handleProductEntryChange(entry.id, 'price', parseFloat(e.target.value) || 0)}
                              size="sm"
                            />
                          </Form.Group>
                        </Col>
                        <Col md={1}>
                          <Form.Group>
                            <Form.Label>{t('customerTransactions.quantity')}</Form.Label>
                            <Form.Control
                              type="number"
                              placeholder="Quantity"
                              min="0"
                              value={entry.quantity || ''}
                              onChange={(e) => handleProductEntryChange(entry.id, 'quantity', parseInt(e.target.value) || 0)}
                              size="sm"
                            />
                          </Form.Group>
                        </Col>
                        <Col md={2}>
                          <Form.Group>
                            <Form.Label>{t('customerTransactions.total')}</Form.Label>
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

            <Row className="mb-3">
              <Col md={4}>
                <Form.Group>
                  <Form.Label>{t('customerTransactions.paymentMethodLabel')}</Form.Label>
                  <Form.Select
                    name="paymentMethod"
                    value={transactionForm.paymentMethod}
                    onChange={handleFormChange}
                    required
                  >
                    <option value="cash">{t('customerTransactions.cash')}</option>
                    <option value="UPI">{t('customerTransactions.upi')}</option>
                  </Form.Select>
                </Form.Group>
              </Col>
              <Col md={4}>
                <Form.Group>
                  <Form.Label><strong>{t('customerTransactions.labourCharge', 'Labour Charge')}</strong></Form.Label>
                  <Form.Control
                    type="number"
                    name="labourCharge"
                    placeholder="0.00"
                    min="0"
                    step="0.01"
                    value={transactionForm.labourCharge || ''}
                    onChange={handleFormChange}
                    style={{ fontWeight: 'bold' }}
                  />
                </Form.Group>
              </Col>
              <Col md={4}>
                <Form.Group>
                  <Form.Label><strong>{t('customerTransactions.totalAmountLabel')}</strong></Form.Label>
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
            {t('customerTransactions.cancel')}
          </Button>
          <Button
            variant="primary"
            onClick={handleSubmit}
            disabled={calculateTotalAmount() === 0}
          >
            {currentTransaction ? t('customerTransactions.updateSale') : t('customerTransactions.addSale')}
          </Button>
        </Modal.Footer>
      </Modal>

      {/* Invoice Modal */}
      <InvoiceModal
        show={showInvoiceModal}
        onHide={() => setShowInvoiceModal(false)}
        transaction={currentTransaction}
        type="customer"
      />

      {/* View Transaction Modal */}
      <Modal show={showViewModal} onHide={() => setShowViewModal(false)} size="xl">
        <Modal.Header closeButton>
          <Modal.Title>{t('customerTransactions.viewTransaction')}</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {currentTransaction && (
            <div className="transaction-details">
              {/* Header Section */}
              <div className="mb-4">
                <h5 className="mb-3">{t('customerTransactions.transactionDetails', 'Transaction Details')}</h5>
                <Row>
                  <Col md={3}>
                    <div className="detail-item">
                      <strong>{t('customerTransactions.transactionId', 'Transaction ID:')}</strong>
                      <div>{currentTransaction.id.slice(-8)}</div>
                    </div>
                  </Col>
                  <Col md={3}>
                    <div className="detail-item">
                      <strong>{t('customerTransactions.invoiceNumber', 'Invoice Number:')}</strong>
                      <div>{currentTransaction.invoiceNumber || t('brokerTransactions.nA', 'N/A')}</div>
                    </div>
                  </Col>
                  <Col md={3}>
                    <div className="detail-item">
                      <strong>{t('customerTransactions.date', 'Date:')}</strong>
                      <div>{currentTransaction.date}</div>
                    </div>
                  </Col>
                  <Col md={3}>
                    <div className="detail-item">
                      <strong>{t('customerTransactions.time', 'Time:')}</strong>
                      <div>{currentTransaction.time}</div>
                    </div>
                  </Col>
                </Row>
              </div>

              {/* Customer Information */}
              <div className="mb-4">
                <h6 className="mb-3">{t('customerTransactions.customerInformation', 'Customer Information')}</h6>
                {(() => {
                  const customer = customers.find(c => c.id === currentTransaction.customerId);
                  return (
                    <Row>
                      <Col md={4}>
                        <div className="detail-item">
                          <strong>{t('customerTransactions.name', 'Name:')}</strong>
                          <div>{customer?.name || t('common.unknown', 'Unknown')}</div>
                        </div>
                      </Col>
                      <Col md={4}>
                        <div className="detail-item">
                          <strong>{t('customerTransactions.contact', 'Contact:')}</strong>
                          <div>{customer?.contact || t('brokerTransactions.nA', 'N/A')}</div>
                        </div>
                      </Col>
                      <Col md={4}>
                        <div className="detail-item">
                          <strong>{t('customerTransactions.address', 'Address:')}</strong>
                          <div>{customer?.address || t('brokerTransactions.nA', 'N/A')}</div>
                        </div>
                      </Col>
                    </Row>
                  );
                })()}
              </div>

              {/* Products Table */}
              <div className="mb-4">
                <h6 className="mb-3">{t('customerTransactions.products', 'Products')}</h6>
                <Table striped bordered hover>
                  <thead>
                    <tr>
                      <th>{t('customerTransactions.product', 'Product')}</th>
                      <th>{t('customerTransactions.manufacturer', 'Manufacturer')}</th>
                      <th>{t('customerTransactions.unitType', 'Unit Type')}</th>
                      <th>{t('customerTransactions.quantity', 'Quantity')}</th>
                      <th>{t('customerTransactions.price', 'Price')}</th>
                      <th>{t('customerTransactions.total', 'Total')}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {currentTransaction.products.map((productData, index) => {
                      const product = products.find(p => p.id === productData.productId);
                      const manufacturerStock = product?.manufacturerStocks.find(ms => ms.manufacturerId === productData.manufacturerId);
                      return (
                        <tr key={`${productData.productId}-${productData.manufacturerId}-${index}`}>
                          <td>{product ? product.name : productData.productId}</td>
                          <td>{manufacturerStock ? manufacturerStock.manufacturerName : productData.manufacturerId}</td>
                          <td>{productData.unitType === 'units' ? t('products.units', 'units') : t('common.tonnes', 'tonnes')}</td>
                          <td>{productData.quantity}</td>
                          <td>₹{productData.price.toFixed(2)}</td>
                          <td>₹{productData.total.toFixed(2)}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </Table>
              </div>

              {/* Financial Summary */}
              <div className="mb-4">
                <h6 className="mb-3">{t('customerTransactions.financialSummary', 'Financial Summary')}</h6>
                <Row>
                  <Col md={3}>
                    <div className="detail-item">
                      <strong>{t('customerTransactions.previousBalanceColon', 'Previous Balance:')}</strong>
                      <div>₹{(currentTransaction.previousBalance || 0).toFixed(2)}</div>
                    </div>
                  </Col>
                  <Col md={3}>
                    <div className="detail-item">
                      <strong>{t('customerTransactions.labourChargeColon', 'Labour Charge:')}</strong>
                      <div>₹{(currentTransaction.labourCharge || 0).toFixed(2)}</div>
                    </div>
                  </Col>
                  <Col md={3}>
                    <div className="detail-item">
                      <strong>{t('customerTransactions.totalAmountColon', 'Total Amount:')}</strong>
                      <div>₹{currentTransaction.totalAmount.toFixed(2)}</div>
                    </div>
                  </Col>
                  <Col md={3}>
                    <div className="detail-item">
                      <strong>{t('customerTransactions.paymentMethodColon', 'Payment Method:')}</strong>
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
            {t('customerTransactions.close')}
          </Button>
        </Modal.Footer>
      </Modal>

      {/* Deletion Warning Modal */}
      <DeletionWarningModal
        show={showDeleteModal}
        onHide={handleDeleteModalClose}
        onConfirm={confirmDeleteTransaction}
        entityType="customerTransaction"
        entityName={currentTransaction?.invoiceNumber || `Transaction ${currentTransaction?.id.slice(-8)}`}
        impactData={deleteImpactData}
        isLoading={isAnalyzingDelete}
      />

      {/* Leisure Modal */}
      <Modal show={showLeisureModal} onHide={() => setShowLeisureModal(false)} centered>
        <Modal.Header closeButton>
          <Modal.Title>{t('customerTransactions.addPaymentDetails', 'Add Payment Details')}</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Form>
            <Form.Group className="mb-3">
              <Form.Label>{t('customerTransactions.paidAmount', 'Paid Amount')}</Form.Label>
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
              <Form.Label>{t('customerTransactions.paymentMethod', 'Payment Method')}</Form.Label>
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
                  <Form.Label>{t('customerTransactions.date', 'Date')}</Form.Label>
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
                  <Form.Label>{t('customerTransactions.time', 'Time')}</Form.Label>
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
              <Form.Label>{t('customerTransactions.notes', 'Notes')}</Form.Label>
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
            {t('customerTransactions.skip', 'Skip')}
          </Button>
          <Button variant="success" onClick={shareLeisureOnWhatsApp}>
            {t('customerTransactions.sendBillWhatsApp', 'Send Bill on WhatsApp')}
          </Button>
          <Button variant="primary" onClick={handleLeisureSubmit}>
            {t('customerTransactions.savePayment', 'Save Payment')}
          </Button>
        </Modal.Footer>
      </Modal>
    </Container>
  );
};

export default CustomerTransactions;
