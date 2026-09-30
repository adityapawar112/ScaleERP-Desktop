import React from 'react';
import { useTranslation } from 'react-i18next';
import { useAppContext } from '../../context/AppContext';
import { getNormalizedInvoiceData, TemplateProps } from './templateUtils';
import { AssetImage } from './AssetImage';

export const Thermal80mm: React.FC<TemplateProps> = ({
  transaction,
  type,
  party,
  businessSettings,
  pdfMode = 'print',
  copyLabelOverride,
}) => {
  const { t } = useTranslation();
  const { products } = useAppContext();
  const formatCurrency = (amount: number) => `₹${amount.toFixed(2)}`;

  const { items, summary } = getNormalizedInvoiceData(transaction, type, party, products, t);
  const copyLabel = copyLabelOverride || summary.defaultCopyLabel;

  return (
    <div className="invoice-template-container thermal-receipt" style={{
      fontFamily: `'Roboto Mono', monospace, Arial, sans-serif`,
      width: '80mm',
      padding: '5mm',
      backgroundColor: 'white',
      color: 'black',
      margin: pdfMode === 'pdf' ? '0' : '0 auto',
      boxSizing: 'border-box',
      fontSize: '11px',
      lineHeight: '1.4'
    }}>
      {/* Centered Header */}
      <div style={{ textAlign: 'center', marginBottom: '10px' }}>
        {businessSettings.logoPath && (
          <div style={{ marginBottom: '6px' }}>
            <AssetImage assetPath={businessSettings.logoPath} style={{ width: '45px', height: '45px', objectFit: 'contain', margin: '0 auto' }} />
          </div>
        )}
        <h1 style={{ margin: '0', fontSize: '16px', fontWeight: '900', textTransform: 'uppercase' }}>
          {businessSettings.businessName || 'Business Name'}
        </h1>
        <div style={{ fontSize: '10px', marginTop: '2px' }}>
          {businessSettings.address}<br />
          {t('invoice.phoneShort', 'Ph:')} {businessSettings.phoneNumbers?.join(', ')}
        </div>
        <div style={{ marginTop: '6px', fontSize: '11px', fontWeight: 'bold', borderTop: '1px dashed #000', borderBottom: '1px dashed #000', padding: '3px 0' }}>
          {summary.invoiceTypeTitle} - {copyLabel}
        </div>
      </div>

      {/* Meta */}
      <div style={{ fontSize: '10px', marginBottom: '10px', borderBottom: '1px dashed #000', paddingBottom: '6px' }}>
        <div><strong>{t('invoice.invNoShort', 'Inv#:')}</strong> {summary.invoiceNumber}</div>
        <div><strong>{t('invoice.dateShort', 'Date:')}</strong> {summary.dateTimeStr}</div>
        <div><strong>{t('invoice.partyShort', 'Party:')}</strong> {summary.partyName} ({summary.partyContact || t('invoice.nA', 'N/A')})</div>
        <div><strong>{t('invoice.payModeShort', 'Pay Mode:')}</strong> {summary.paymentMethod}</div>
      </div>

      {/* Item List */}
      <div style={{ borderBottom: '1px dashed #000', paddingBottom: '8px', marginBottom: '8px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 'bold', fontSize: '10px', borderBottom: '1px solid #000', paddingBottom: '3px', marginBottom: '5px' }}>
          <span>{t('invoice.itemDetails', 'Item / Details')}</span>
          <span>{t('invoice.amount', 'Amount')}</span>
        </div>
        {items.map(item => (
          <div key={item.srNo} style={{ marginBottom: '6px', fontSize: '11px' }}>
            <div style={{ fontWeight: 'bold' }}>{item.srNo}. {item.displayName}</div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '10px', color: '#333' }}>
              <span>{item.quantityOrUnits} {item.unitType} @ {formatCurrency(item.rateOrPrice)}</span>
              <span style={{ fontWeight: 'bold' }}>{formatCurrency(item.total)}</span>
            </div>
            {summary.isBroker && item.brokerage > 0 && (
              <div style={{ fontSize: '9px', color: '#555' }}>
                {t('invoice.brokShort', 'Brok:')} {formatCurrency(item.brokeragePerUnit)}/unit = {formatCurrency(item.brokerage)}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Totals */}
      <div style={{ fontSize: '11px', marginBottom: '12px', borderBottom: '1px dashed #000', paddingBottom: '8px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', padding: '1px 0' }}>
          <span>{t('invoice.subtotal', 'Subtotal:')}</span>
          <span>{formatCurrency(summary.subtotal)}</span>
        </div>
        {summary.labourOrBrokerageAmount > 0 && (
          <div style={{ display: 'flex', justifyContent: 'space-between', padding: '1px 0' }}>
            <span>{summary.labourOrBrokerageLabel}</span>
            <span>{formatCurrency(summary.labourOrBrokerageAmount)}</span>
          </div>
        )}
        <div style={{ display: 'flex', justifyContent: 'space-between', padding: '1px 0', fontWeight: 'bold' }}>
          <span>{t('invoice.currentTotal', 'Current Total:')}</span>
          <span>{formatCurrency(summary.currentTotal)}</span>
        </div>
        {summary.previousBalance !== 0 && (
          <div style={{ display: 'flex', justifyContent: 'space-between', padding: '1px 0' }}>
            <span>{t('invoice.prevBalanceShort', 'Prev Balance:')}</span>
            <span>{formatCurrency(summary.previousBalance)}</span>
          </div>
        )}
        <div style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0', marginTop: '4px', fontWeight: '900', fontSize: '13px', borderTop: '1px solid #000' }}>
          <span>{summary.isBroker ? t('invoice.netOutstanding', 'NET OUTSTANDING:') : t('invoice.netPayable', 'NET PAYABLE:')}</span>
          <span>{formatCurrency(summary.netAmount)}</span>
        </div>
      </div>

      {/* QR Code */}
      {businessSettings.qrCodePath && (
        <div style={{ textAlign: 'center', marginBottom: '12px' }}>
          <AssetImage assetPath={businessSettings.qrCodePath} style={{ width: '60px', height: '60px', objectFit: 'contain', margin: '0 auto' }} />
          <div style={{ fontSize: '9px', marginTop: '2px' }}>{t('invoice.scanToPayOrVerify', 'SCAN TO PAY / VERIFY')}</div>
        </div>
      )}

      {/* Footer */}
      <div style={{ textAlign: 'center', fontSize: '9px', color: '#333' }}>
        {businessSettings.customFooterText && (
          <div style={{ fontWeight: 'bold', marginBottom: '8px', padding: '4px', border: '1px dashed #000', borderRadius: '4px' }}>
            {businessSettings.customFooterText}
          </div>
        )}
        <div>{t('invoice.thankYouVisitAgain', 'Thank You! Visit Again.')}</div>
        <div style={{ marginTop: '6px', fontSize: '8px', color: '#666' }}>{t('invoice.poweredBy', 'Powered by ScaleERP')}</div>
      </div>
    </div>
  );
};
