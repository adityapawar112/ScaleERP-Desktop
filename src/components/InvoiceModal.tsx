import React, { useState, useEffect } from 'react';
import { Modal, Button, Spinner, ButtonGroup, Form, Badge } from 'react-bootstrap';
import { useTranslation } from 'react-i18next';
import { 
  useAppContext, 
  CustomerTransaction, 
  BrokerTransaction,
} from '../context/AppContext';
import { TemplateRegistry } from './invoice-templates/TemplateRegistry';

interface InvoiceModalProps {
  show: boolean;
  onHide: () => void;
  transaction: CustomerTransaction | BrokerTransaction | null;
  type: 'customer' | 'broker';
}

const InvoiceModal: React.FC<InvoiceModalProps> = ({
  show,
  onHide,
  transaction,
  type
}) => {
  const { t } = useTranslation();
  const { customers, brokers, businessSettings } = useAppContext();
  const [pdfMode, setPdfMode] = useState<'print' | 'pdf'>('print');
  const [isGenerating, setIsGenerating] = useState(false);

  // Runtime Overrides
  const [tempOverride, setTempOverride] = useState<string | null>(null);
  const [copiesOverride, setCopiesOverride] = useState<number | null>(null);
  const [layoutOverride, setLayoutOverride] = useState<'single' | 'dual_compact' | 'thermal' | null>(null);

  // Reset overrides when modal opens for a new transaction
  useEffect(() => {
    if (show) {
      setTempOverride(null);
      setCopiesOverride(null);
      setLayoutOverride(null);
    }
  }, [show, transaction]);

  if (!transaction) return null;

  const party = type === 'customer' 
    ? customers.find(c => c.id === (transaction as CustomerTransaction).customerId)
    : brokers.find(b => b.id === (transaction as BrokerTransaction).brokerId);

  // Effective Settings & Fallback
  const isDigitalExport = pdfMode === 'pdf';
  const currentTemplate = tempOverride || businessSettings.defaultInvoiceTemplate || 'standard_a4';
  
  // Digital Fallback: If exporting PDF/WhatsApp and template is thermal_80mm, force standard_a4
  const effectiveTemplate = isDigitalExport && currentTemplate === 'thermal_80mm'
    ? 'standard_a4'
    : currentTemplate;

  // Digital Fallback: PDF/WhatsApp export only needs 1 copy
  const effectiveCopies = isDigitalExport
    ? 1
    : (copiesOverride !== null ? copiesOverride : (businessSettings.printCopies || 1));

  const effectiveLayoutMode: 'single' | 'dual_compact' | 'thermal' = layoutOverride !== null 
    ? layoutOverride 
    : (businessSettings.printLayoutMode || 'single');

  const effectiveSettings = {
    ...businessSettings,
    printCopies: effectiveCopies,
    printLayoutMode: effectiveLayoutMode,
    defaultInvoiceTemplate: effectiveTemplate,
  };

  const handleWhatsApp = async () => {
    if (!window.electronAPI) return;
    
    try {
      setIsGenerating(true);
      setPdfMode('pdf');
      
      // Wait for re-render in PDF mode
      await new Promise(resolve => setTimeout(resolve, 800));
      
      const date = new Date(transaction.date);
      const monthName = date.toLocaleString('default', { month: 'long' });
      const dateStr = date.toLocaleDateString('en-GB').replace(/\//g, '-');
      const partyName = party?.name || 'Unknown';
      
      const fileName = `${partyName}_${dateStr}.pdf`;
      const subFolder = monthName;

      // 1. Generate PDF
      const response = await window.electronAPI.export.printToPDF(fileName, subFolder);
      
      if (response && response.success) {
        // 2. Copy to Clipboard
        await window.electronAPI.system.copyFileToClipboard(response.path);
        
        // 3. Open WhatsApp
        const phone = party?.contact || '';
        const cleanPhone = phone.replace(/\D/g, '');
        const finalPhone = cleanPhone.length === 10 ? `91${cleanPhone}` : cleanPhone;
        
        const template = businessSettings.invoiceWhatsappTemplate || 'Tax Invoice for {partyName} dated {dateStr}';
        let rawMessage = template;
        rawMessage = rawMessage.replace(/{partyName}/g, partyName);
        rawMessage = rawMessage.replace(/{customerName}/g, partyName);
        rawMessage = rawMessage.replace(/{businessName}/g, businessSettings.businessName || 'Our Business');
        rawMessage = rawMessage.replace(/{dateStr}/g, dateStr);
        rawMessage = rawMessage.replace(/{date}/g, dateStr);
        rawMessage = rawMessage.replace(/{invoiceNumber}/g, transaction.invoiceNumber || 'N/A');
        rawMessage = rawMessage.replace(/{totalAmount}/g, transaction.totalAmount.toFixed(2));
        
        const message = encodeURIComponent(rawMessage);
        const appUrl = `whatsapp://send?phone=${finalPhone}&text=${message}`;
        const webUrl = `https://wa.me/${finalPhone}?text=${message}`;
        
        try {
          await window.electronAPI.openExternal(appUrl);
        } catch (err) {
          console.warn('WhatsApp Desktop app not found or failed to open directly, falling back to browser (wa.me)...', err);
          await window.electronAPI.openExternal(webUrl);
        }
      }
    } catch (error) {
      console.error('WhatsApp automation failed:', error);
      alert(t('invoice.whatsappError', 'Failed to automate WhatsApp sharing. Please try manual download.'));
    } finally {
      setPdfMode('print');
      setIsGenerating(false);
    }
  };

  const handleDownloadPDF = async () => {
    if (!window.electronAPI) return;
    
    try {
      setIsGenerating(true);
      setPdfMode('pdf');
      
      // Wait for re-render in PDF mode
      await new Promise(resolve => setTimeout(resolve, 800));

      const date = new Date(transaction.date);
      const dateStr = date.toLocaleDateString('en-GB').replace(/\//g, '-');
      const partyName = party?.name || 'Unknown';
      const fileName = `${partyName}_${dateStr}.pdf`;
      
      const response = await window.electronAPI.export.printToPDF(fileName, 'Downloads');
      if (response && response.success) {
        alert(t('invoice.pdfSaved', { path: response.path, defaultValue: `PDF saved to: ${response.path}` }));
      }
    } catch (error) {
      console.error('PDF generation failed:', error);
      alert(t('invoice.pdfError', 'Failed to generate PDF.'));
    } finally {
      setPdfMode('print');
      setIsGenerating(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <Modal show={show} onHide={onHide} size="xl" centered>
      <Modal.Header closeButton className="bg-light border-bottom">
        <Modal.Title className="fw-bold d-flex align-items-center gap-2">
          <i className="bi bi-file-earmark-text text-primary"></i>
          {type === 'customer' 
            ? t('customerTransactions.customerInvoicePreview', 'Customer Invoice Preview') 
            : t('brokerTransactions.supplierInvoicePreview', 'Supplier Invoice Preview')}
        </Modal.Title>
      </Modal.Header>

      <Modal.Body style={{ 
        maxHeight: pdfMode === 'pdf' ? 'none' : '75vh', 
        overflowY: pdfMode === 'pdf' ? 'visible' : 'auto', 
        backgroundColor: '#525659',
        padding: pdfMode === 'pdf' ? 0 : '20px'
      }}>
        {/* Runtime Controls Bar (Hidden on PDF export and physical printing) */}
        {pdfMode !== 'pdf' && (
          <div className="quick-controls-bar d-print-none bg-white p-3 mb-4 rounded-3 shadow-sm border d-flex flex-wrap align-items-center justify-content-between gap-3">
            {/* Template Selection */}
            <div className="d-flex align-items-center gap-2">
              <span className="fw-bold text-secondary fs-7"><i className="bi bi-layout-text-window me-1"></i> {t('invoice.layout', 'Layout:')}</span>
              <ButtonGroup size="sm" className="shadow-sm">
                <Button 
                  variant={currentTemplate === 'standard_a4' ? 'primary' : 'outline-secondary'}
                  onClick={() => setTempOverride('standard_a4')}
                  className="fw-semibold"
                >
                  {t('invoice.standardA4', 'Standard A4')}
                </Button>
                <Button 
                  variant={currentTemplate === 'modern_clean' ? 'primary' : 'outline-secondary'}
                  onClick={() => setTempOverride('modern_clean')}
                  className="fw-semibold"
                >
                  {t('invoice.modernClean', 'Modern Clean')}
                </Button>
                <Button 
                  variant={currentTemplate === 'compact_a5' ? 'primary' : 'outline-secondary'}
                  onClick={() => setTempOverride('compact_a5')}
                  className="fw-semibold"
                >
                  {t('invoice.compactA5', 'Compact A5')}
                </Button>
                <Button 
                  variant={currentTemplate === 'thermal_80mm' ? 'primary' : 'outline-secondary'}
                  onClick={() => setTempOverride('thermal_80mm')}
                  className="fw-semibold"
                >
                  {t('invoice.thermalPos', 'Thermal POS')}
                </Button>
              </ButtonGroup>
            </div>

            {/* Copies Selection */}
            {currentTemplate !== 'thermal_80mm' && (
              <div className="d-flex align-items-center gap-3">
                <div className="d-flex align-items-center gap-2">
                  <span className="fw-bold text-secondary fs-7"><i className="bi bi-files me-1"></i> {t('invoice.copies', 'Copies:')}</span>
                  <ButtonGroup size="sm" className="shadow-sm">
                    <Button 
                      variant={effectiveCopies === 1 ? 'primary' : 'outline-secondary'}
                      onClick={() => setCopiesOverride(1)}
                      className="fw-semibold px-3"
                    >
                      {t('invoice.oneCopy', '1 Copy')}
                    </Button>
                    <Button 
                      variant={effectiveCopies === 2 ? 'primary' : 'outline-secondary'}
                      onClick={() => setCopiesOverride(2)}
                      className="fw-semibold px-3"
                    >
                      {t('invoice.twoCopies', '2 Copies')}
                    </Button>
                  </ButtonGroup>
                </div>

                {/* Layout Mode (Enabled when Copies == 2) */}
                {effectiveCopies === 2 && (
                  <div className="d-flex align-items-center gap-2 border-start ps-3">
                    <span className="fw-bold text-secondary fs-7"><i className="bi bi-stack me-1"></i> {t('invoice.mode', 'Mode:')}</span>
                    <Form.Select 
                      size="sm"
                      value={effectiveLayoutMode} 
                      onChange={(e) => setLayoutOverride(e.target.value as any)}
                      className="shadow-sm border-secondary-subtle fw-semibold"
                      style={{ width: 'auto' }}
                    >
                      <option value="single">{t('invoice.separatePages', 'Separate Pages')}</option>
                      <option value="dual_compact">{t('invoice.singlePageStack', 'Single Page Stack')}</option>
                    </Form.Select>
                  </div>
                )}
              </div>
            )}

            {currentTemplate === 'thermal_80mm' && (
              <Badge bg="warning" text="dark" className="px-3 py-2 fw-bold">
                <i className="bi bi-info-circle-fill me-1"></i> {t('invoice.digitalFallbackNotice', 'Digital PDF exports fallback to Standard A4.')}
              </Badge>
            )}
          </div>
        )}

        {/* Invoice Container */}
        <div className={pdfMode === 'pdf' ? 'pdf-centered-container' : 'invoice-view-container'}>
          <TemplateRegistry
            transaction={transaction}
            type={type}
            party={party as any}
            businessSettings={effectiveSettings}
            pdfMode={pdfMode}
            previewTemplate={effectiveTemplate}
          />
        </div>
      </Modal.Body>

      <Modal.Footer className="bg-light border-top">
        <Button variant="secondary" onClick={onHide} disabled={isGenerating} className="fw-semibold px-4">
          {t('customerTransactions.close', 'Close')}
        </Button>
        <Button 
          variant="success" 
          onClick={handleWhatsApp} 
          disabled={isGenerating}
          className="d-flex align-items-center fw-bold shadow px-4"
        >
          {isGenerating ? (
            <>
              <Spinner animation="border" size="sm" className="me-2" />
              {t('common.processing', 'Processing...')}
            </>
          ) : (
            <>
              <i className="bi bi-whatsapp me-2 fs-5"></i>
              {t('customerTransactions.shareOnWhatsApp', 'Share on WhatsApp')}
            </>
          )}
        </Button>
        <Button 
          variant="primary" 
          onClick={handleDownloadPDF} 
          disabled={isGenerating}
          className="fw-bold shadow px-4 d-flex align-items-center gap-2"
        >
          <i className="bi bi-file-earmark-pdf fs-5"></i>
          {t('customerTransactions.downloadPDF', 'Download PDF')}
        </Button>
        <Button 
          variant="outline-primary" 
          onClick={handlePrint} 
          disabled={isGenerating}
          className="fw-bold px-4 d-flex align-items-center gap-2"
        >
          <i className="bi bi-printer fs-5"></i>
          {t('common.print', 'Print')}
        </Button>
      </Modal.Footer>

      <style>{`
        .pdf-centered-container {
          display: flex;
          justify-content: center;
          align-items: flex-start;
          padding: 40px 0;
          background-color: #525659;
          min-height: 100%;
        }
        @media print {
          @page {
            size: A4;
            margin: 0mm !important;
          }
          
          body, html {
            margin: 0 !important;
            padding: 0 !important;
            background-color: white !important;
            width: 100% !important;
          }

          /* Hide non-print elements */
          #root, 
          .modal-header, 
          .modal-footer, 
          .modal-backdrop,
          .sidebar,
          .navbar,
          .quick-controls-bar {
            display: none !important;
          }
          
          /* Reset modal styles for printing */
          .modal {
            display: block !important;
            position: absolute !important;
            left: 0 !important;
            top: 0 !important;
            width: 100% !important;
            height: auto !important;
            padding: 0 !important;
            margin: 0 !important;
            overflow: visible !important;
          }
          
          .modal-dialog {
            max-width: none !important;
            width: 100% !important;
            margin: 0 !important;
            padding: 0 !important;
          }
          
          .modal-content {
            border: none !important;
            box-shadow: none !important;
            background-color: white !important;
            width: 100% !important;
          }
          
          .modal-body {
            padding: 0 !important;
            overflow: visible !important;
            background-color: white !important;
            width: 100% !important;
          }
          
          .pdf-centered-container,
          .invoice-view-container,
          .template-registry-root,
          .invoice-page-wrapper {
            display: block !important;
            background-color: white !important;
            padding: 0 !important;
            margin: 0 !important;
            width: 100% !important;
            max-width: 100% !important;
            min-height: auto !important;
          }

          .invoice-template-container {
            width: 100% !important;
            max-width: 100% !important;
            border: none !important;
            box-shadow: none !important;
            margin: 0 !important;
          }
          
          tr {
            page-break-inside: avoid !important;
          }
        }
      `}</style>
    </Modal>
  );
};

export default InvoiceModal;
