import React, { useState, useRef, useEffect } from 'react';
import { Container, Row, Col, Card, Button, Form, Toast, ToastContainer, Spinner, Badge, Modal } from 'react-bootstrap';
import { useTranslation } from 'react-i18next';
import { useBlocker } from 'react-router-dom';
import { useAppContext, BusinessSettings, CustomerTransaction } from '../context/AppContext';
import { optimizeImage } from '../utils/imageOptimizer';
import { TemplateRegistry } from '../components/invoice-templates/TemplateRegistry';
import { AssetImage } from '../components/invoice-templates/AssetImage';

// Mock Data for Live Preview
const mockCustomer = {
  id: 'cust-mock',
  name: 'Acme Agro Industries',
  contact: '9876543210',
  address: 'Plot 42, MIDC Industrial Area, Pune',
};

const mockTransaction: CustomerTransaction = {
  id: 'tx-mock',
  customerId: 'cust-mock',
  invoiceNumber: 'INV-2026-089',
  date: '2026-05-17',
  time: '14:30',
  paymentMethod: 'UPI',
  labourCharge: 250,
  previousBalance: 1200,
  totalAmount: 18200,
  products: [
    { productId: 'p1', manufacturerId: 'm1', quantity: 10, unitType: 'units', price: 1250, total: 12500, labour: 150 },
    { productId: 'p2', manufacturerId: 'm2', quantity: 5, unitType: 'units', price: 1140, total: 5700, labour: 100 },
  ],
};

const PRESET_ACCENT_COLORS = [
  { label: 'Royal Blue', hex: '#2563eb' },
  { label: 'Emerald', hex: '#10b981' },
  { label: 'Slate', hex: '#475569' },
  { label: 'Crimson', hex: '#dc2626' },
  { label: 'Amethyst', hex: '#8b5cf6' },
  { label: 'Amber', hex: '#d97706' },
];

const Settings: React.FC = () => {
  const { t } = useTranslation();
  const { businessSettings, updateBusinessSettings } = useAppContext();

  const [businessForm, setBusinessForm] = useState<BusinessSettings>(businessSettings);
  const [showSuccessAlert, setShowSuccessAlert] = useState(false);
  const [showErrorAlert, setShowErrorAlert] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [uploadingAsset, setUploadingAsset] = useState<{ [key: string]: boolean }>({});

  const [isDirty, setIsDirty] = useState(false);

  useEffect(() => {
    const isEqual = JSON.stringify(businessForm) === JSON.stringify(businessSettings);
    setIsDirty(!isEqual);
  }, [businessForm, businessSettings]);

  const blocker = useBlocker(({ currentLocation, nextLocation }) => {
    return isDirty && currentLocation.pathname !== nextLocation.pathname;
  });

  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (isDirty) {
        e.preventDefault();
        e.returnValue = '';
      }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [isDirty]);

  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const logoInputRef = useRef<HTMLInputElement>(null);
  const bannerInputRef = useRef<HTMLInputElement>(null);
  const qrInputRef = useRef<HTMLInputElement>(null);

  const insertPlaceholder = (tag: string) => {
    if (!textareaRef.current) return;
    const textarea = textareaRef.current;
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const text = businessForm.invoiceWhatsappTemplate || 'Tax Invoice for {partyName} dated {dateStr}';
    const before = text.substring(0, start);
    const after = text.substring(end);

    const newTemplate = before + tag + after;
    setBusinessForm(prev => ({ ...prev, invoiceWhatsappTemplate: newTemplate }));

    setTimeout(() => {
      textarea.focus();
      const newPos = start + tag.length;
      textarea.setSelectionRange(newPos, newPos);
    }, 0);
  };

  const handleBusinessChange = (field: keyof BusinessSettings, value: any) => {
    setBusinessForm(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handlePhoneChange = (index: number, value: string) => {
    const updatedPhones = [...businessForm.phoneNumbers];
    updatedPhones[index] = value;
    setBusinessForm(prev => ({ ...prev, phoneNumbers: updatedPhones }));
  };

  const addPhoneNumber = () => {
    setBusinessForm(prev => ({ ...prev, phoneNumbers: [...prev.phoneNumbers, ''] }));
  };

  const removePhoneNumber = (index: number) => {
    const updatedPhones = businessForm.phoneNumbers.filter((_, i) => i !== index);
    setBusinessForm(prev => ({ ...prev, phoneNumbers: updatedPhones }));
  };

  // Asset Upload Handlers
  const handleAssetUpload = async (file: File, fieldKey: keyof BusinessSettings, subFolder: string) => {
    if (!window.electronAPI || !window.electronAPI.system) return;

    setUploadingAsset(prev => ({ ...prev, [fieldKey]: true }));
    try {
      const optimized = await optimizeImage(file, { maxWidth: 1200, maxHeight: 1200, outputType: 'image/png' });
      const res = await window.electronAPI.system.saveAsset(optimized.base64DataUrl, file.name, subFolder);
      if (res && res.success && res.path) {
        setBusinessForm(prev => ({ ...prev, [fieldKey]: res.path }));
      }
    } catch (err) {
      console.error(`Failed to upload asset for ${fieldKey}:`, err);
      alert(t('settings.assetUploadError', 'Failed to upload image. Please verify file format.'));
    } finally {
      setUploadingAsset(prev => ({ ...prev, [fieldKey]: false }));
    }
  };

  const handleAssetDelete = async (fieldKey: keyof BusinessSettings, currentPath?: string | null) => {
    if (!window.electronAPI || !window.electronAPI.system || !currentPath) return;

    try {
      const res = await window.electronAPI.system.deleteAsset(currentPath);
      if (res && res.success) {
        setBusinessForm(prev => ({ ...prev, [fieldKey]: null }));
      }
    } catch (err) {
      console.error(`Failed to delete asset ${fieldKey}:`, err);
      setBusinessForm(prev => ({ ...prev, [fieldKey]: null }));
    }
  };

  const saveBusinessSettingsSubmit = async () => {
    setIsSaving(true);
    setShowErrorAlert(false);
    setShowSuccessAlert(false);

    try {
      await updateBusinessSettings(businessForm);
      setShowSuccessAlert(true);
    } catch (error) {
      console.error('Failed to save business settings:', error);
      setErrorMessage(error instanceof Error ? error.message : 'Failed to save business settings');
      setShowErrorAlert(true);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Container fluid className="py-4">
      <div className="page-header mb-4">
        <h2>{t('settings.title')}</h2>
        <p>{t('settings.subtitle')}</p>
      </div>

      <Row>
        {/* Top Section: Form Settings */}
        <Col lg={12}>
          {/* Card 1: Business Information */}
          <Card className="shadow-sm border-0 mb-4">
            <Card.Header className="bg-white text-dark py-3 border-bottom">
              <h5 className="mb-0 fw-bold" style={{ color: 'var(--primary-dark)' }}>
                <i className="bi bi-building me-2 text-primary"></i>
                {t('settings.businessInformation')}
              </h5>
            </Card.Header>
            <Card.Body className="p-4">
              <Form>
                <Row className="mb-3">
                  <Col md={6}>
                    <Form.Group>
                      <Form.Label className="fw-semibold">{t('settings.businessName')}</Form.Label>
                      <Form.Control
                        type="text"
                        value={businessForm.businessName}
                        onChange={(e) => handleBusinessChange('businessName', e.target.value)}
                        placeholder={t('settings.businessNamePlaceholder')}
                      />
                    </Form.Group>
                  </Col>
                  <Col md={6}>
                    <Form.Group>
                      <Form.Label className="fw-semibold">{t('settings.proprietorName')}</Form.Label>
                      <Form.Control
                        type="text"
                        value={businessForm.proprietorName}
                        onChange={(e) => handleBusinessChange('proprietorName', e.target.value)}
                        placeholder={t('settings.proprietorNamePlaceholder')}
                      />
                    </Form.Group>
                  </Col>
                </Row>

                <Form.Group className="mb-3">
                  <Form.Label className="fw-semibold">{t('settings.address')}</Form.Label>
                  <Form.Control
                    as="textarea"
                    rows={3}
                    value={businessForm.address}
                    onChange={(e) => handleBusinessChange('address', e.target.value)}
                    placeholder={t('settings.addressPlaceholder')}
                  />
                </Form.Group>

                <Form.Group className="mb-3">
                  <Form.Label className="fw-semibold">{t('settings.phoneNumbers')}</Form.Label>
                  {businessForm.phoneNumbers.map((phone, index) => (
                    <Row key={index} className="mb-2 align-items-center">
                      <Col md={9}>
                        <Form.Control
                          type="tel"
                          value={phone}
                          onChange={(e) => handlePhoneChange(index, e.target.value)}
                          placeholder={t('settings.phoneNumberPlaceholder')}
                        />
                      </Col>
                      <Col md={3}>
                        <Button
                          variant="outline-danger"
                          size="sm"
                          onClick={() => removePhoneNumber(index)}
                          disabled={businessForm.phoneNumbers.length === 1}
                          className="w-100"
                        >
                          <i className="bi bi-trash me-1"></i> {t('settings.remove')}
                        </Button>
                      </Col>
                    </Row>
                  ))}
                  <Button variant="outline-primary" size="sm" onClick={addPhoneNumber} className="mt-1">
                    <i className="bi bi-plus-lg me-1"></i> {t('settings.addPhoneNumber')}
                  </Button>
                </Form.Group>

                <Form.Group className="mb-2 pt-4 border-top">
                  <Form.Label className="d-flex align-items-center fw-bold text-dark mb-2">
                    <i className="bi bi-whatsapp text-success me-2 fs-5"></i>
                    {t('invoice.whatsappTemplateLabel', 'Invoice WhatsApp Message')}
                  </Form.Label>
                  <div className="mb-2 d-flex flex-wrap gap-2">
                    <Button variant="light" size="sm" className="border shadow-sm text-dark" onClick={() => insertPlaceholder('{partyName}')}>{t('settings.placeholders.addName', '+ Name')}</Button>
                    <Button variant="light" size="sm" className="border shadow-sm text-dark" onClick={() => insertPlaceholder('{businessName}')}>{t('settings.placeholders.addBusinessName', '+ Business Name')}</Button>
                    <Button variant="light" size="sm" className="border shadow-sm text-dark" onClick={() => insertPlaceholder('{date}')}>{t('settings.placeholders.addDate', '+ Date')}</Button>
                    <Button variant="light" size="sm" className="border shadow-sm text-dark" onClick={() => insertPlaceholder('{invoiceNumber}')}>{t('settings.placeholders.addInvoiceNumber', '+ Invoice Number')}</Button>
                    <Button variant="light" size="sm" className="border shadow-sm text-dark" onClick={() => insertPlaceholder('{totalAmount}')}>{t('settings.placeholders.addTotalAmount', '+ Total Amount')}</Button>
                  </div>
                  <Form.Control
                    as="textarea"
                    ref={textareaRef}
                    rows={3}
                    value={businessForm.invoiceWhatsappTemplate !== undefined ? businessForm.invoiceWhatsappTemplate : 'Tax Invoice for {partyName} dated {dateStr}'}
                    onChange={(e) => handleBusinessChange('invoiceWhatsappTemplate', e.target.value)}
                    placeholder={t('invoice.whatsappTemplatePlaceholder', 'Tax Invoice for {partyName} dated {dateStr}')}
                  />
                  <Form.Text className="text-muted">
                    {t('invoice.placeholdersHint', 'Available placeholders: {customerName}, {businessName}, {date}, {invoiceNumber}, {totalAmount}')}
                  </Form.Text>
                </Form.Group>
              </Form>
            </Card.Body>
          </Card>

          {/* Card 2: Brand Assets & Logos */}
          <Card className="shadow-sm border-0 mb-4 brand-assets-card">
            <Card.Header className="bg-white text-dark py-3 border-bottom">
              <h5 className="mb-0 fw-bold" style={{ color: 'var(--primary-dark)' }}>
                <i className="bi bi-images me-2 text-primary"></i>
                {t('settings.brandAssets', 'Brand Assets & Logos')}
              </h5>
            </Card.Header>
            <Card.Body className="p-4">
              <Row className="g-4">
                {/* Logo Uploader */}
                <Col md={4} className="text-center">
                  <Form.Label className="fw-bold d-block text-secondary mb-2">{t('settings.companyLogo', 'Company Logo')}</Form.Label>
                  <div className="asset-preview-box border rounded p-3 mb-3 d-flex align-items-center justify-content-center bg-light" style={{ height: '140px', position: 'relative' }}>
                    {uploadingAsset.logoPath ? (
                      <Spinner animation="border" variant="primary" />
                    ) : businessForm.logoPath ? (
                      <AssetImage assetPath={businessForm.logoPath} style={{ maxHeight: '110px', maxWidth: '100%' }} />
                    ) : (
                      <div className="text-muted fs-6"><i className="bi bi-cloud-upload fs-2 d-block"></i> {t('settings.uploadLogo', 'Upload Logo')}</div>
                    )}
                  </div>
                  <input type="file" ref={logoInputRef} className="d-none" accept="image/*" onChange={(e) => e.target.files?.[0] && handleAssetUpload(e.target.files[0], 'logoPath', 'branding')} />
                  <div className="d-flex gap-2 justify-content-center">
                    <Button variant="outline-primary" size="sm" onClick={() => logoInputRef.current?.click()}>
                      <i className="bi bi-upload me-1"></i> {t('common.upload', 'Upload')}
                    </Button>
                    {businessForm.logoPath && (
                      <Button variant="outline-danger" size="sm" onClick={() => handleAssetDelete('logoPath', businessForm.logoPath)}>
                        <i className="bi bi-trash"></i>
                      </Button>
                    )}
                  </div>
                </Col>

                {/* Header Banner Uploader */}
                <Col md={4} className="text-center">
                  <Form.Label className="fw-bold d-block text-secondary mb-2">{t('settings.headerBanner', 'Header Banner')}</Form.Label>
                  <div className="asset-preview-box border rounded p-3 mb-3 d-flex align-items-center justify-content-center bg-light" style={{ height: '140px', position: 'relative' }}>
                    {uploadingAsset.headerBannerPath ? (
                      <Spinner animation="border" variant="primary" />
                    ) : businessForm.headerBannerPath ? (
                      <AssetImage assetPath={businessForm.headerBannerPath} style={{ maxHeight: '110px', maxWidth: '100%' }} />
                    ) : (
                      <div className="text-muted fs-6"><i className="bi bi-card-image fs-2 d-block"></i> {t('settings.bannerImage', 'Banner Image')}</div>
                    )}
                  </div>
                  <input type="file" ref={bannerInputRef} className="d-none" accept="image/*" onChange={(e) => e.target.files?.[0] && handleAssetUpload(e.target.files[0], 'headerBannerPath', 'branding')} />
                  <div className="d-flex gap-2 justify-content-center">
                    <Button variant="outline-primary" size="sm" onClick={() => bannerInputRef.current?.click()}>
                      <i className="bi bi-upload me-1"></i> {t('common.upload', 'Upload')}
                    </Button>
                    {businessForm.headerBannerPath && (
                      <Button variant="outline-danger" size="sm" onClick={() => handleAssetDelete('headerBannerPath', businessForm.headerBannerPath)}>
                        <i className="bi bi-trash"></i>
                      </Button>
                    )}
                  </div>
                </Col>

                {/* QR Code Uploader */}
                <Col md={4} className="text-center">
                  <Form.Label className="fw-bold d-block text-secondary mb-2">{t('settings.paymentQr', 'Payment QR Code')}</Form.Label>
                  <div className="asset-preview-box border rounded p-3 mb-3 d-flex align-items-center justify-content-center bg-light" style={{ height: '140px', position: 'relative' }}>
                    {uploadingAsset.qrCodePath ? (
                      <Spinner animation="border" variant="primary" />
                    ) : businessForm.qrCodePath ? (
                      <AssetImage assetPath={businessForm.qrCodePath} style={{ maxHeight: '110px', maxWidth: '100%' }} />
                    ) : (
                      <div className="text-muted fs-6"><i className="bi bi-qr-code-scan fs-2 d-block"></i> {t('settings.scanQr', 'Scan QR')}</div>
                    )}
                  </div>
                  <input type="file" ref={qrInputRef} className="d-none" accept="image/*" onChange={(e) => e.target.files?.[0] && handleAssetUpload(e.target.files[0], 'qrCodePath', 'branding')} />
                  <div className="d-flex gap-2 justify-content-center">
                    <Button variant="outline-primary" size="sm" onClick={() => qrInputRef.current?.click()}>
                      <i className="bi bi-upload me-1"></i> {t('common.upload', 'Upload')}
                    </Button>
                    {businessForm.qrCodePath && (
                      <Button variant="outline-danger" size="sm" onClick={() => handleAssetDelete('qrCodePath', businessForm.qrCodePath)}>
                        <i className="bi bi-trash"></i>
                      </Button>
                    )}
                  </div>
                </Col>
              </Row>
            </Card.Body>
          </Card>

          {/* Card 3: Invoice Template & Layout */}
          <Card className="shadow-sm border-0 mb-4 invoice-layout-card">
            <Card.Header className="bg-white text-dark py-3 border-bottom">
              <h5 className="mb-0 fw-bold" style={{ color: 'var(--primary-dark)' }}>
                <i className="bi bi-palette me-2 text-primary"></i>
                {t('settings.invoiceTemplateLayout', 'Invoice Template & Styling')}
              </h5>
            </Card.Header>
            <Card.Body className="p-4">
              <Form>
                <Row className="mb-4 g-3">
                  {/* Template Selector */}
                  <Col md={6}>
                    <Form.Group>
                      <Form.Label className="fw-bold text-secondary">{t('settings.defaultInvoiceTemplate', 'Default Template Layout')}</Form.Label>
                      <Form.Select
                        value={businessForm.defaultInvoiceTemplate || 'standard_a4'}
                        onChange={(e) => handleBusinessChange('defaultInvoiceTemplate', e.target.value)}
                        className="shadow-sm border-secondary-subtle py-2 fw-semibold"
                      >
                        <option value="standard_a4">Standard A4 Corporate</option>
                        <option value="modern_clean">Modern Minimalist Clean</option>
                        <option value="compact_a5">Compact A5 Half-Page</option>
                        <option value="thermal_80mm">Thermal POS 80mm Roll</option>
                      </Form.Select>
                    </Form.Group>
                  </Col>

                  {/* Accent Color Picker */}
                  <Col md={6}>
                    <Form.Group>
                      <Form.Label className="fw-bold text-secondary">{t('settings.invoiceAccentColor', 'Invoice Accent Color')}</Form.Label>
                      <div className="d-flex align-items-center gap-3">
                        <Form.Control
                          type="color"
                          value={businessForm.invoiceAccentColor || '#2563eb'}
                          onChange={(e) => handleBusinessChange('invoiceAccentColor', e.target.value)}
                          title="Choose your color"
                          className="p-1 shadow-sm border"
                          style={{ width: '50px', height: '40px', cursor: 'pointer' }}
                        />
                        <div className="d-flex flex-wrap gap-1 align-items-center">
                          {PRESET_ACCENT_COLORS.map((color) => (
                            <Badge
                              key={color.hex}
                              bg=""
                              style={{ backgroundColor: color.hex, cursor: 'pointer', padding: '8px 10px', border: businessForm.invoiceAccentColor === color.hex ? '2px solid #000' : 'none' }}
                              onClick={() => handleBusinessChange('invoiceAccentColor', color.hex)}
                            >
                              {color.label}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    </Form.Group>
                  </Col>
                </Row>

                <Row className="mb-4 g-3 pt-2 border-top">
                  {/* Print Copies */}
                  <Col md={6}>
                    <Form.Group>
                      <Form.Label className="fw-bold text-secondary">{t('settings.printCopies', 'Print Copies')}</Form.Label>
                      <div className="d-flex gap-4 pt-1">
                        <Form.Check
                          type="radio"
                          id="copy-1"
                          label="1 Copy (Standard)"
                          checked={Number(businessForm.printCopies) === 1 || !businessForm.printCopies}
                          onChange={() => handleBusinessChange('printCopies', 1)}
                        />
                        <Form.Check
                          type="radio"
                          id="copy-2"
                          label="2 Copies (Customer + Office)"
                          checked={Number(businessForm.printCopies) === 2}
                          onChange={() => handleBusinessChange('printCopies', 2)}
                        />
                      </div>
                    </Form.Group>
                  </Col>

                  {/* Layout Mode */}
                  <Col md={6}>
                    <Form.Group>
                      <Form.Label className="fw-bold text-secondary">{t('settings.printLayoutMode', 'Multi-Copy Layout Mode')}</Form.Label>
                      <Form.Select
                        value={businessForm.printLayoutMode || 'single'}
                        onChange={(e) => handleBusinessChange('printLayoutMode', e.target.value)}
                        disabled={Number(businessForm.printCopies) !== 2}
                        className="shadow-sm border-secondary-subtle py-2"
                      >
                        <option value="single">Separate Full Pages (Page Break)</option>
                        <option value="dual_compact">Single A4 Sheet (Dual Stacked with Scissor Line)</option>
                      </Form.Select>
                      <Form.Text className="text-muted">Enabled when 2 copies are selected.</Form.Text>
                    </Form.Group>
                  </Col>
                </Row>

                <Form.Group className="mb-3 pt-2 border-top">
                  <Form.Label className="fw-bold text-secondary">{t('settings.customFooterText', 'Custom Footer Tagline')}</Form.Label>
                  <Form.Control
                    type="text"
                    value={businessForm.customFooterText || ''}
                    onChange={(e) => handleBusinessChange('customFooterText', e.target.value)}
                    placeholder="e.g. Thank you for your business! Visit again."
                  />
                  <Form.Text className="text-muted">Appears at the bottom of terms and conditions in printed invoices.</Form.Text>
                </Form.Group>

                <div className="d-flex justify-content-end mt-4 pt-3 border-top">
                  <Button
                    variant="success"
                    size="lg"
                    className="px-5 shadow"
                    onClick={saveBusinessSettingsSubmit}
                    disabled={isSaving}
                  >
                    {isSaving ? (
                      <>
                        <Spinner animation="border" size="sm" className="me-2" />
                        {t('common.saving', 'Saving...')}
                      </>
                    ) : (
                      <>
                        <i className="bi bi-check-circle-fill me-2"></i>
                        {t('settings.saveAllSettings', 'Save All Business Settings')}
                      </>
                    )}
                  </Button>
                </div>
              </Form>
            </Card.Body>
          </Card>
        </Col>
      </Row>

      {/* Bottom Section: Full Width Live Preview */}
      <Row className="mt-4">
        <Col lg={12}>
          <div className="full-width-preview-container mb-5">
            <Card className="shadow border-0 bg-light">
              <Card.Header className="bg-dark text-white py-3 d-flex justify-content-between align-items-center">
                <h5 className="mb-0 fw-bold d-flex align-items-center">
                  <i className="bi bi-eye-fill text-info me-2 fs-5"></i>
                  {t('settings.livePreview', 'Live Invoice Layout Preview (100% True Scale)')}
                </h5>
                <Badge bg="info" className="text-dark fw-bold px-3 py-2 fs-6 shadow-sm">{t('settings.liveTrueScale', 'Live True Scale')}</Badge>
              </Card.Header>
              <Card.Body className="p-5 d-flex justify-content-center align-items-center" style={{ backgroundColor: '#525659', minHeight: '500px', overflowX: 'auto' }}>
                <div className="preview-paper-wrapper shadow-lg" style={{ backgroundColor: 'white', transition: 'all 0.3s ease' }}>
                  <TemplateRegistry
                    transaction={mockTransaction}
                    type="customer"
                    party={mockCustomer as any}
                    businessSettings={businessForm}
                    previewTemplate={businessForm.defaultInvoiceTemplate || 'standard_a4'}
                  />
                </div>
              </Card.Body>
              <Card.Footer className="bg-white text-muted text-center py-3 fs-6">
                <i className="bi bi-info-circle-fill text-primary me-2"></i>
                {t('settings.previewInfo', 'Displaying unscaled 100% true physical layout. Perfect for print preview verification.')}
              </Card.Footer>
            </Card>
          </div>
        </Col>
      </Row>

      {/* Unsaved Changes Modal */}
      <Modal show={blocker.state === 'blocked'} onHide={() => blocker.state === 'blocked' && blocker.reset()} backdrop="static" centered>
        <Modal.Header closeButton className="bg-warning text-dark border-0">
          <Modal.Title className="fw-bold d-flex align-items-center">
            <i className="bi bi-exclamation-triangle-fill me-2 fs-4"></i>
            {t('settings.unsavedChangesTitle', 'Unsaved Changes')}
          </Modal.Title>
        </Modal.Header>
        <Modal.Body className="p-4 fs-5 text-dark fw-medium">
          {t('settings.unsavedChangesMessage', 'You have unsaved changes in your settings. Are you sure you want to leave without saving?')}
        </Modal.Body>
        <Modal.Footer className="border-0 bg-light p-3">
          <Button variant="secondary" className="px-4 fw-semibold shadow-sm" onClick={() => blocker.state === 'blocked' && blocker.reset()}>
            {t('common.stay', 'Stay')}
          </Button>
          <Button variant="danger" className="px-4 fw-semibold shadow-sm" onClick={() => blocker.state === 'blocked' && blocker.proceed()}>
            {t('common.leave', 'Leave')}
          </Button>
        </Modal.Footer>
      </Modal>

      {/* Toast Notifications */}
      <ToastContainer position="bottom-end" className="p-3" style={{ zIndex: 9999, position: 'fixed', bottom: '20px', right: '20px' }}>
        <Toast show={showSuccessAlert} onClose={() => setShowSuccessAlert(false)} delay={3000} autohide bg="success">
          <Toast.Header><strong className="me-auto text-white">{t('common.success', 'Success')}</strong></Toast.Header>
          <Toast.Body className="text-white fw-bold">{t('settings.settingsSaved', 'Settings saved successfully!')}</Toast.Body>
        </Toast>
        <Toast show={showErrorAlert} onClose={() => setShowErrorAlert(false)} bg="danger">
          <Toast.Header><strong className="me-auto text-white">{t('common.error', 'Error')}</strong></Toast.Header>
          <Toast.Body className="text-white fw-bold">{errorMessage}</Toast.Body>
        </Toast>
      </ToastContainer>
    </Container>
  );
};

export default Settings;