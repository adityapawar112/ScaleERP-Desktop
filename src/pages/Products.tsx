import React, { useState } from 'react';
import { Container, Row, Col, Card, Modal, Button, Form, Toast, ToastContainer } from 'react-bootstrap';
import { useTranslation } from 'react-i18next';
import { FiEdit2, FiArchive, FiRotateCcw, FiPlus } from 'react-icons/fi';
import { useAppContext, Product } from '../context/AppContext';

const Products: React.FC = () => {
  const { t } = useTranslation();
  const {
    products,
    brokers,
    addProduct,
    updateProduct,
    archiveProduct,
    unarchiveProduct,
    archiveManufacturer,
    unarchiveManufacturer,
    addManufacturer,
    updateManufacturerName,
  } = useAppContext();

  // View state
  const [showArchived, setShowArchived] = useState(false);

  // Transaction history modal state
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [selectedManufacturerId, setSelectedManufacturerId] = useState<string | undefined>(undefined);

  // Add product modal state
  const [showAddProductModal, setShowAddProductModal] = useState(false);
  const [newProductName, setNewProductName] = useState('');

  // Add manufacturer modal state
  const [showAddManufacturerModal, setShowAddManufacturerModal] = useState(false);
  const [addManufacturerProductId, setAddManufacturerProductId] = useState<string>('');
  const [newManufacturerName, setNewManufacturerName] = useState('');

  // Edit product state (inline)
  const [editingProductId, setEditingProductId] = useState<string | null>(null);
  const [editingProductName, setEditingProductName] = useState('');

  // Edit manufacturer state (inline)
  const [editingManufacturerId, setEditingManufacturerId] = useState<string | null>(null);
  const [editingManufacturerName, setEditingManufacturerName] = useState('');

  // Archive/Restore confirmation modal
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [confirmAction, setConfirmAction] = useState<{
    type: 'archiveProduct' | 'archiveManufacturer' | 'restoreProduct' | 'restoreManufacturer';
    id: string;
    name: string;
    isLastManufacturer?: boolean;
  } | null>(null);

  // Toast state
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const [toastType, setToastType] = useState<'success' | 'error'>('success');

  // Search state
  const [searchQuery, setSearchQuery] = useState('');

  // ===== Filtered Data =====
  const activeProducts = products.filter(p => !p.isArchived);
  const archivedProducts = products.filter(p => p.isArchived);

  // Products to show in archived view (products that are archived OR have archived manufacturers)
  const productsWithArchivedManufacturers = products.filter(p =>
    !p.isArchived && p.manufacturerStocks.some(m => m.isArchived)
  );
  const archivedViewProducts = [...archivedProducts, ...productsWithArchivedManufacturers];

  // Filter products by search query (searches product name and manufacturer names)
  const filteredProducts = searchQuery.trim()
    ? (showArchived ? archivedViewProducts : activeProducts).filter(product => {
        const query = searchQuery.toLowerCase();
        // Search in product name
        if (product.name.toLowerCase().includes(query)) return true;
        // Search in manufacturer names
        return product.manufacturerStocks.some(m =>
          m.manufacturerName.toLowerCase().includes(query)
        );
      })
    : (showArchived ? archivedViewProducts : activeProducts);

  const displayProducts = filteredProducts;

  // ===== Handlers =====

  // Add Product
  const handleAddProduct = async () => {
    if (!newProductName.trim()) return;
    try {
      await addProduct({
        name: newProductName,
        description: '',
        price: 0,
        stockQuantity: 0,
        manufacturerStocks: [],
      });
      setNewProductName('');
      setShowAddProductModal(false);
      setToastMessage('Product added successfully');
      setToastType('success');
      setShowToast(true);
    } catch {
      setToastMessage('Failed to add product');
      setToastType('error');
      setShowToast(true);
    }
  };

  // Edit Product Name (inline)
  const handleStartEditProduct = (product: Product) => {
    setEditingProductId(product.id);
    setEditingProductName(product.name);
  };

  const handleSaveProductName = async () => {
    if (!editingProductId || !editingProductName.trim()) return;
    try {
      const product = products.find(p => p.id === editingProductId);
      if (!product) return;
      await updateProduct({ ...product, name: editingProductName });
      setEditingProductId(null);
      setEditingProductName('');
      setToastMessage('Product name updated');
      setToastType('success');
      setShowToast(true);
    } catch {
      setToastMessage('Failed to update product name');
      setToastType('error');
      setShowToast(true);
    }
  };

  const handleCancelEditProduct = () => {
    setEditingProductId(null);
    setEditingProductName('');
  };

  // Archive Product
  const handleArchiveProduct = (product: Product) => {
    setConfirmAction({
      type: 'archiveProduct',
      id: product.id,
      name: product.name,
    });
    setShowConfirmModal(true);
  };

  // Restore Product
  const handleRestoreProduct = (product: Product) => {
    setConfirmAction({
      type: 'restoreProduct',
      id: product.id,
      name: product.name,
    });
    setShowConfirmModal(true);
  };

  // Add Manufacturer
  const handleOpenAddManufacturer = (productId: string) => {
    setAddManufacturerProductId(productId);
    setNewManufacturerName('');
    setShowAddManufacturerModal(true);
  };

  const handleAddManufacturerSubmit = async () => {
    if (!newManufacturerName.trim() || !addManufacturerProductId) return;
    try {
      await addManufacturer(addManufacturerProductId, newManufacturerName);
      setNewManufacturerName('');
      setShowAddManufacturerModal(false);
      setToastMessage('Manufacturer added successfully');
      setToastType('success');
      setShowToast(true);
    } catch {
      setToastMessage('Failed to add manufacturer');
      setToastType('error');
      setShowToast(true);
    }
  };

  // Edit Manufacturer Name (inline)
  const handleStartEditManufacturer = (id: string, currentName: string) => {
    setEditingManufacturerId(id);
    setEditingManufacturerName(currentName);
  };

  const handleSaveManufacturerName = async () => {
    if (!editingManufacturerId || !editingManufacturerName.trim()) return;
    try {
      await updateManufacturerName(editingManufacturerId, editingManufacturerName);
      setEditingManufacturerId(null);
      setEditingManufacturerName('');
      setToastMessage('Manufacturer name updated');
      setToastType('success');
      setShowToast(true);
    } catch {
      setToastMessage('Failed to update manufacturer name');
      setToastType('error');
      setShowToast(true);
    }
  };

  const handleCancelEditManufacturer = () => {
    setEditingManufacturerId(null);
    setEditingManufacturerName('');
  };

  // Archive Manufacturer
  const handleArchiveManufacturer = (id: string, manufacturerName: string, product: Product) => {
    const activeManufacturers = product.manufacturerStocks.filter(m => !m.isArchived);
    const isLastManufacturer = activeManufacturers.length === 1 && activeManufacturers[0].id === id;

    setConfirmAction({
      type: 'archiveManufacturer',
      id: id,
      name: manufacturerName,
      isLastManufacturer,
    });
    setShowConfirmModal(true);
  };

  // Restore Manufacturer
  const handleRestoreManufacturer = (id: string, manufacturerName: string, product: Product) => {
    if (product.isArchived) {
      setToastMessage(t('inventory.cannotRestoreManufacturer'));
      setToastType('error');
      setShowToast(true);
      return;
    }
    setConfirmAction({
      type: 'restoreManufacturer',
      id: id,
      name: manufacturerName,
    });
    setShowConfirmModal(true);
  };

  // Confirm action
  const handleConfirmAction = async () => {
    if (!confirmAction) return;
    try {
      switch (confirmAction.type) {
        case 'archiveProduct':
          await archiveProduct(confirmAction.id);
          setToastMessage('Product archived successfully');
          break;
        case 'restoreProduct':
          await unarchiveProduct(confirmAction.id);
          setToastMessage('Product restored successfully');
          break;
        case 'archiveManufacturer':
          await archiveManufacturer(confirmAction.id);
          if (confirmAction.isLastManufacturer) {
            setToastMessage('Manufacturer archived. Product was also archived (last manufacturer).');
          } else {
            setToastMessage('Manufacturer archived successfully');
          }
          break;
        case 'restoreManufacturer':
          await unarchiveManufacturer(confirmAction.id);
          setToastMessage('Manufacturer restored successfully');
          break;
      }
      setToastType('success');
      setShowToast(true);
    } catch {
      setToastMessage('Action failed');
      setToastType('error');
      setShowToast(true);
    }
    setShowConfirmModal(false);
    setConfirmAction(null);
  };

  // Transaction history
  const openHistoryModal = (product: Product, manufacturerId?: string) => {
    setSelectedProduct(product);
    setSelectedManufacturerId(manufacturerId);
    setShowHistoryModal(true);
  };

  const getTransactionHistory = (product: Product, manufacturerId?: string) => {
    let history = [...product.stockHistory];
    if (manufacturerId) {
      history = history.filter(h => h.manufacturerId === manufacturerId);
    }
    return history;
  };

  const formatHistoryEntry = (entry: any) => {
    const dateTime = entry.time ? `${entry.date} ${entry.time}` : entry.date;
    if (entry.type === 'in') {
      if (entry.brokerId) {
        const broker = brokers.find(b => b.id === entry.brokerId);
        const brokerName = broker ? broker.name : t('products.unknownBroker');
        return `${entry.quantity} ${t('products.unitsAdded')} ${t('products.fromTransaction')} ${brokerName} (${dateTime})`;
      }
      return `${entry.quantity} ${t('products.unitsAdded')} (${dateTime}) - ${entry.notes}`;
    } else {
      return `${entry.quantity} ${t('products.unitsRemoved')} - ${entry.notes} (${dateTime})`;
    }
  };

  return (
    <Container fluid className="py-4">
      <Row className="mb-4">
        <Col>
          <div className="page-header">
            <h2>{t('products.title')}</h2>
            <p>{t('products.subtitle')}</p>
          </div>
        </Col>
      </Row>

      <Row>
        <Col>
          <div className="mb-4 d-flex justify-content-between align-items-center">
            <h4>{showArchived ? t('inventory.archivedProducts') : t('products.productList')}</h4>
            <Button
              variant={showArchived ? 'secondary' : 'outline-secondary'}
              size="sm"
              onClick={() => setShowArchived(!showArchived)}
            >
              {showArchived ? t('inventory.activeProducts') : t('inventory.viewArchived')}
            </Button>
          </div>

          {/* Search Bar */}
          <Form.Group className="mb-4">
            <Form.Control
              type="text"
              placeholder={t('products.searchPlaceholder', 'Search products or manufacturers...')}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </Form.Group>

          {/* Add Product Box (only in active view) */}
          {!showArchived && (
            <Card
              className="mb-4"
              style={{
                border: '2px dashed #ccc',
                cursor: 'pointer',
                backgroundColor: '#fafafa',
              }}
              onClick={() => setShowAddProductModal(true)}
            >
              <Card.Body className="text-center py-3">
                <FiPlus size={20} className="me-2" />
                {t('inventory.addProduct')}
              </Card.Body>
            </Card>
          )}

          {/* Product List */}
          {displayProducts.length === 0 ? (
            <Card className="shadow-sm border-0">
              <Card.Body className="text-center">
                {showArchived ? t('inventory.archivedProducts') + ' - ' + t('products.noProductsFound') : t('products.noProductsFound')}
              </Card.Body>
            </Card>
          ) : (
            displayProducts.map(product => {
              const isProductArchived = product.isArchived;

              // In archived view, show archived manufacturers + manufacturers of archived products
              const displayManufacturers = showArchived
                ? product.manufacturerStocks.filter(m => m.isArchived || isProductArchived)
                : product.manufacturerStocks.filter(m => !m.isArchived);

              return (
                <Card key={product.id} className="mb-4 shadow-sm border-0" style={isProductArchived ? { opacity: 0.7 } : {}}>
                  {/* Product Header */}
                  <Card.Header className="d-flex justify-content-between align-items-center">
                    <div className="d-flex align-items-center">
                      {editingProductId === product.id ? (
                        <div className="d-flex align-items-center">
                          <Form.Control
                            type="text"
                            size="sm"
                            value={editingProductName}
                            onChange={(e) => setEditingProductName(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') handleSaveProductName();
                              if (e.key === 'Escape') handleCancelEditProduct();
                            }}
                            autoFocus
                            style={{ width: '200px', marginRight: '8px' }}
                          />
                          <Button 
                            variant="link" 
                            size="sm" 
                            className="me-1 p-0 text-white"
                            style={{ fontSize: '1.2rem', lineHeight: 1 }}
                            onClick={handleSaveProductName}
                            onMouseEnter={(e) => e.currentTarget.style.color = '#28a745'}
                            onMouseLeave={(e) => e.currentTarget.style.color = 'white'}
                          >
                            ✓
                          </Button>
                          <Button 
                            variant="link" 
                            size="sm" 
                            className="p-0 text-white"
                            style={{ fontSize: '1.2rem', lineHeight: 1 }}
                            onClick={handleCancelEditProduct}
                            onMouseEnter={(e) => e.currentTarget.style.color = '#dc3545'}
                            onMouseLeave={(e) => e.currentTarget.style.color = 'white'}
                          >
                            ✕
                          </Button>
                        </div>
                      ) : (
                        <h5 className="mb-0 text-white fw-bold">{product.name}</h5>
                      )}
                    </div>
                    <div className="d-flex align-items-center">
                      <div className="text-end me-3">
                        <small className="text-white">{t('products.totalStockLabel')}</small>
                        <div className="h5 mb-0 fw-bold text-white">{product.stockQuantity} {t('products.units')}</div>
                      </div>
                      {showArchived ? (
                        <Button
                          variant="link"
                          size="sm"
                          className="p-0 text-white"
                          onClick={() => handleRestoreProduct(product)}
                          title={t('inventory.restoreProduct')}
                        >
                          <FiRotateCcw size={18} />
                        </Button>
                      ) : (
                        <>
                          <Button
                            variant="link"
                            size="sm"
                            className="p-0 me-2 text-white"
                            onClick={() => handleStartEditProduct(product)}
                            title={t('inventory.editProduct')}
                          >
                            <FiEdit2 size={18} />
                          </Button>
                          <Button
                            variant="link"
                            size="sm"
                            className="p-0 text-white"
                            onClick={() => handleArchiveProduct(product)}
                            title={t('inventory.archiveProduct')}
                          >
                            <FiArchive size={18} />
                          </Button>
                        </>
                      )}
                    </div>
                  </Card.Header>

                  {/* Manufacturers */}
                  <Card.Body>
                    <Row>
                      {displayManufacturers.map((manufacturerStock) => (
                        <Col md={6} lg={4} key={manufacturerStock.manufacturerId} className="mb-3">
                          <Card
                            className="h-100 shadow-sm border-0 hover-lift"
                            style={manufacturerStock.isArchived ? { opacity: 0.6, cursor: 'default' } : { cursor: 'pointer' }}
                            onClick={() => {
                              if (!manufacturerStock.isArchived && !showArchived) {
                                openHistoryModal(product, manufacturerStock.manufacturerId);
                              }
                            }}
                          >
                            <Card.Body className="text-center">
                              {editingManufacturerId === manufacturerStock.id ? (
                                <div className="d-flex align-items-center justify-content-center mb-2">
                                  <Form.Control
                                    type="text"
                                    size="sm"
                                    value={editingManufacturerName}
                                    onChange={(e) => setEditingManufacturerName(e.target.value)}
                                    onKeyDown={(e) => {
                                      if (e.key === 'Enter') handleSaveManufacturerName();
                                      if (e.key === 'Escape') handleCancelEditManufacturer();
                                    }}
                                    autoFocus
                                    style={{ width: '120px', marginRight: '8px' }}
                                    onClick={(e) => e.stopPropagation()}
                                  />
                                  <Button 
                                    variant="link" 
                                    size="sm" 
                                    className="me-1 p-0 text-dark"
                                    style={{ fontSize: '1.2rem', lineHeight: 1 }}
                                    onClick={(e) => { e.stopPropagation(); handleSaveManufacturerName(); }}
                                    onMouseEnter={(e) => e.currentTarget.style.color = '#28a745'}
                                    onMouseLeave={(e) => e.currentTarget.style.color = '#212529'}
                                  >
                                    ✓
                                  </Button>
                                  <Button 
                                    variant="link" 
                                    size="sm" 
                                    className="p-0 text-dark"
                                    style={{ fontSize: '1.2rem', lineHeight: 1 }}
                                    onClick={(e) => { e.stopPropagation(); handleCancelEditManufacturer(); }}
                                    onMouseEnter={(e) => e.currentTarget.style.color = '#dc3545'}
                                    onMouseLeave={(e) => e.currentTarget.style.color = '#212529'}
                                  >
                                    ✕
                                  </Button>
                                </div>
                              ) : (
                                <>
                                  <h6 className="card-title text-dark fw-bold">{manufacturerStock.manufacturerName}</h6>
                                  <div className="h4 fw-bold text-dark mb-0">{manufacturerStock.quantity}</div>
                                  <small className="text-dark">{t('products.units')}</small>
                                </>
                              )}

                              {/* Edit/Archive/Restore icons for manufacturer */}
                              <div className="mt-2 d-flex justify-content-center gap-2">
                                {showArchived || manufacturerStock.isArchived ? (
                                  <Button
                                    variant="outline-success"
                                    size="sm"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleRestoreManufacturer(manufacturerStock.id, manufacturerStock.manufacturerName, product);
                                    }}
                                    title={t('inventory.restoreManufacturer')}
                                  >
                                    <FiRotateCcw size={14} />
                                  </Button>
                                ) : (
                                  <>
                                    <Button
                                      variant="outline-primary"
                                      size="sm"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        handleStartEditManufacturer(manufacturerStock.id, manufacturerStock.manufacturerName);
                                      }}
                                      title={t('inventory.editManufacturer')}
                                    >
                                      <FiEdit2 size={14} />
                                    </Button>
                                    <Button
                                      variant="outline-warning"
                                      size="sm"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        handleArchiveManufacturer(manufacturerStock.id, manufacturerStock.manufacturerName, product);
                                      }}
                                      title={t('inventory.archiveManufacturer')}
                                    >
                                      <FiArchive size={14} />
                                    </Button>
                                  </>
                                )}
                              </div>
                            </Card.Body>
                          </Card>
                        </Col>
                      ))}

                      {/* Add Manufacturer Box (only in active view) */}
                      {!showArchived && !isProductArchived && (
                        <Col md={6} lg={4} className="mb-3">
                          <Card
                            className="h-100"
                            style={{
                              border: '2px dashed #ccc',
                              cursor: 'pointer',
                              backgroundColor: '#fafafa',
                              minHeight: '120px',
                            }}
                            onClick={() => handleOpenAddManufacturer(product.id)}
                          >
                            <Card.Body className="text-center d-flex flex-column justify-content-center">
                              <FiPlus size={16} className="me-1" />
                              <small>{t('inventory.addManufacturer')}</small>
                            </Card.Body>
                          </Card>
                        </Col>
                      )}
                    </Row>
                  </Card.Body>
                </Card>
              );
            })
          )}
        </Col>
      </Row>

      {/* Add Product Modal */}
      <Modal show={showAddProductModal} onHide={() => setShowAddProductModal(false)}>
        <Modal.Header closeButton>
          <Modal.Title>{t('inventory.addProduct')}</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Form>
            <Form.Group className="mb-3">
              <Form.Label>{t('inventory.productNameLabel')}</Form.Label>
              <Form.Control
                type="text"
                value={newProductName}
                onChange={(e) => setNewProductName(e.target.value)}
                placeholder={t('inventory.productNamePlaceholder')}
                onKeyDown={(e) => { if (e.key === 'Enter') handleAddProduct(); }}
              />
            </Form.Group>
          </Form>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowAddProductModal(false)}>
            {t('common.cancel')}
          </Button>
          <Button variant="primary" onClick={handleAddProduct}>
            {t('common.save')}
          </Button>
        </Modal.Footer>
      </Modal>

      {/* Add Manufacturer Modal */}
      <Modal show={showAddManufacturerModal} onHide={() => setShowAddManufacturerModal(false)}>
        <Modal.Header closeButton>
          <Modal.Title>{t('inventory.addManufacturer')}</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Form>
            <Form.Group className="mb-3">
              <Form.Label>{t('inventory.manufacturerNameLabel')}</Form.Label>
              <Form.Control
                type="text"
                value={newManufacturerName}
                onChange={(e) => setNewManufacturerName(e.target.value)}
                placeholder={t('inventory.manufacturerNamePlaceholder')}
                onKeyDown={(e) => { if (e.key === 'Enter') handleAddManufacturerSubmit(); }}
              />
            </Form.Group>
          </Form>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowAddManufacturerModal(false)}>
            {t('common.cancel')}
          </Button>
          <Button variant="primary" onClick={handleAddManufacturerSubmit}>
            {t('common.save')}
          </Button>
        </Modal.Footer>
      </Modal>

      {/* Confirm Archive/Restore Modal */}
      <Modal show={showConfirmModal} onHide={() => setShowConfirmModal(false)}>
        <Modal.Header closeButton>
          <Modal.Title>
            {confirmAction?.type.includes('archive') ? t('inventory.confirmArchiveTitle') : t('inventory.confirmRestoreTitle')}
          </Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <p>
            {confirmAction?.type === 'archiveProduct' && t('inventory.confirmArchiveProduct')}
            {confirmAction?.type === 'restoreProduct' && t('inventory.confirmRestoreProduct')}
            {confirmAction?.type === 'archiveManufacturer' && (
              <>
                {t('inventory.confirmArchiveManufacturer')}
                {confirmAction.isLastManufacturer && (
                  <div className="alert alert-warning mt-2 mb-0">
                    {t('inventory.lastManufacturerWarning')}
                  </div>
                )}
              </>
            )}
            {confirmAction?.type === 'restoreManufacturer' && t('inventory.confirmRestoreManufacturer')}
          </p>
          <p><strong>{confirmAction?.name}</strong></p>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowConfirmModal(false)}>
            {t('common.cancel')}
          </Button>
          <Button
            variant={confirmAction?.type.includes('archive') ? 'warning' : 'success'}
            onClick={handleConfirmAction}
          >
            {confirmAction?.type.includes('archive') ? t('inventory.archiveProduct') : t('inventory.restoreProduct')}
          </Button>
        </Modal.Footer>
      </Modal>

      {/* Transaction History Modal */}
      <Modal show={showHistoryModal} onHide={() => setShowHistoryModal(false)} size="lg">
        <Modal.Header closeButton>
          <Modal.Title>
            {t('products.transactionHistory')} - {selectedProduct ? selectedProduct.name : ''}
            {selectedManufacturerId && (
              <div className="mt-2">
                <small className="text-muted">
                  {selectedProduct?.manufacturerStocks.find(ms => ms.manufacturerId === selectedManufacturerId)?.manufacturerName}
                </small>
              </div>
            )}
          </Modal.Title>
        </Modal.Header>
        <Modal.Body style={{ maxHeight: '60vh', overflowY: 'auto' }}>
          {selectedProduct && (
            <div>
              <div className="mb-3">
                <strong>{t('products.currentStock')}:</strong>{' '}
                {selectedManufacturerId
                  ? `${selectedProduct.manufacturerStocks.find(ms => ms.manufacturerId === selectedManufacturerId)?.quantity || 0} ${t('products.units')}`
                  : `${selectedProduct.stockQuantity} ${t('products.units')}`
                }
              </div>
              <div className="mb-3">
                <strong>{t('products.transactionHistoryTitle')}:</strong>
              </div>
              {getTransactionHistory(selectedProduct, selectedManufacturerId).length > 0 ? (
                <div className="list-group">
                  {getTransactionHistory(selectedProduct, selectedManufacturerId).map((entry, index) => (
                    <div key={entry.id || index} className="list-group-item">
                      <div className={`text-${entry.type === 'in' ? 'success' : 'danger'}`}>
                        <strong>{entry.type === 'in' ? '+' : '-'}{entry.quantity} {t('products.units')}</strong>
                      </div>
                      <div className="text-muted small">
                        {formatHistoryEntry(entry)}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center text-muted">
                  {t('products.noTransactionHistory')}
                </div>
              )}
            </div>
          )}
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowHistoryModal(false)}>
            {t('products.close')}
          </Button>
        </Modal.Footer>
      </Modal>

      {/* Toast Notifications */}
      <ToastContainer
        position="bottom-end"
        className="p-3"
        style={{ zIndex: 9999, position: 'fixed', bottom: '20px', right: '20px' }}
      >
        <Toast
          show={showToast}
          onClose={() => setShowToast(false)}
          delay={3000}
          autohide
          bg={toastType === 'success' ? 'success' : 'danger'}
        >
          <Toast.Header>
            <strong className="me-auto">{toastType === 'success' ? t('common.success') : t('common.error')}</strong>
          </Toast.Header>
          <Toast.Body className="text-white">{toastMessage}</Toast.Body>
        </Toast>
      </ToastContainer>
    </Container>
  );
};

export default Products;