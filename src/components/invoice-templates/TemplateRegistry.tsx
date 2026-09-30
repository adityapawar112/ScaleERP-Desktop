import React from 'react';
import { useTranslation } from 'react-i18next';
import { useAppContext, CustomerTransaction, BrokerTransaction, Customer, Broker, BusinessSettings } from '../../context/AppContext';
import { getNormalizedInvoiceData } from './templateUtils';
import { StandardA4 } from './StandardA4';
import { ModernClean } from './ModernClean';
import { CompactA5 } from './CompactA5';
import { Thermal80mm } from './Thermal80mm';

interface TemplateRegistryProps {
  transaction: CustomerTransaction | BrokerTransaction;
  type: 'customer' | 'broker';
  party: Customer | Broker | undefined;
  businessSettings: BusinessSettings;
  pdfMode?: 'print' | 'pdf';
  previewTemplate?: string;
}

export const TemplateRegistry: React.FC<TemplateRegistryProps> = ({
  transaction,
  type,
  party,
  businessSettings,
  pdfMode = 'print',
  previewTemplate,
}) => {
  const { t } = useTranslation();
  const { products } = useAppContext();
  const selectedTemplate = previewTemplate || businessSettings.defaultInvoiceTemplate || 'standard_a4';
  const printCopies = businessSettings.printCopies || 1;
  const layoutMode = businessSettings.printLayoutMode || 'single';

  const copy1Label = type === 'broker' ? t('invoice.supplierCopy', 'SUPPLIER COPY') : t('invoice.customerCopy', 'CUSTOMER COPY');
  const copy2Label = type === 'broker' ? t('invoice.officeCopy', 'OFFICE COPY') : t('invoice.sellerCopy', 'SELLER COPY');

  const normalizedData = getNormalizedInvoiceData(transaction, type, party, products, t);
  const itemsCount = normalizedData.items.length;

  const renderSingleInstance = (labelOverride?: string) => {
    const props = {
      transaction,
      type,
      party,
      businessSettings,
      pdfMode,
      copyLabelOverride: labelOverride,
    };

    switch (selectedTemplate) {
      case 'modern_clean':
        return <ModernClean {...props} />;
      case 'compact_a5':
        return <CompactA5 {...props} />;
      case 'thermal_80mm':
        return <Thermal80mm {...props} />;
      case 'standard_a4':
      default:
        return <StandardA4 {...props} />;
    }
  };

  // If only 1 copy or thermal printing, render standard single instance
  if (printCopies <= 1 || selectedTemplate === 'thermal_80mm') {
    return <div className="template-registry-root" style={{ width: pdfMode === 'pdf' || pdfMode === 'print' ? '100%' : '210mm', margin: pdfMode === 'pdf' || pdfMode === 'print' ? '0' : '0 auto' }}>{renderSingleInstance()}</div>;
  }

  // Multi-copy: Dual Compact Mode (Stack two CompactA5 on a single A4 page)
  // Note: Stacking two copies on a single A4 page is only physically possible for short invoices (<= 4 items).
  // If the invoice has > 4 items, smartly switch to separate pages (multi-page) so neither copy is cut off!
  if (layoutMode === 'dual_compact' && itemsCount <= 4) {
    return (
      <div className="template-registry-root dual-compact-container" style={{ width: pdfMode === 'pdf' || pdfMode === 'print' ? '100%' : '210mm', boxSizing: 'border-box', margin: pdfMode === 'pdf' || pdfMode === 'print' ? '0' : '0 auto', backgroundColor: 'white' }}>
        <div style={{ padding: '2mm 8mm', boxSizing: 'border-box', width: '100%' }}>
          {/* Copy 1 */}
          <div style={{ marginBottom: '10px' }}>
            <div style={{ fontSize: '10px', color: '#6b7280', fontWeight: 'bold', textAlign: 'center', marginBottom: '4px' }}>
              --- {copy1Label} ---
            </div>
            {/* Override to CompactA5 for dual stacking to fit nicely on single A4 sheet */}
            <CompactA5
              transaction={transaction}
              type={type}
              party={party}
              businessSettings={businessSettings}
              pdfMode={pdfMode}
              copyLabelOverride={copy1Label}
            />
          </div>

          {/* Scissor Cut Line */}
          <div style={{ 
            borderBottom: '1px dashed #9ca3af', 
            margin: '12px 0', 
            position: 'relative',
            textAlign: 'center'
          }}>
            <span style={{ 
              backgroundColor: 'white', 
              padding: '0 10px', 
              color: '#6b7280', 
              fontSize: '12px',
              position: 'relative',
              top: '-9px'
            }}>
              ✂ {t('invoice.cutHere', 'Cut Here')} ✂
            </span>
          </div>

          {/* Copy 2 */}
          <div>
            <div style={{ fontSize: '10px', color: '#6b7280', fontWeight: 'bold', textAlign: 'center', marginBottom: '4px' }}>
              --- {copy2Label} ---
            </div>
            <CompactA5
              transaction={transaction}
              type={type}
              party={party}
              businessSettings={businessSettings}
              pdfMode={pdfMode}
              copyLabelOverride={copy2Label}
            />
          </div>
        </div>
      </div>
    );
  }

  // Multi-copy: Single Mode (Separate full pages)
  return (
    <div className="template-registry-root multi-page-container" style={{ width: pdfMode === 'pdf' || pdfMode === 'print' ? '100%' : '210mm', margin: pdfMode === 'pdf' || pdfMode === 'print' ? '0' : '0 auto' }}>
      <div className="invoice-page-wrapper" style={{ pageBreakAfter: 'always', width: '100%', marginBottom: pdfMode === 'pdf' || pdfMode === 'print' ? '0' : '30px' }}>
        {renderSingleInstance(copy1Label)}
      </div>
      <div className="invoice-page-wrapper" style={{ width: '100%' }}>
        {renderSingleInstance(copy2Label)}
      </div>
    </div>
  );
};
