import React from 'react';
import { useTranslation } from 'react-i18next';
import { useAppContext } from '../../context/AppContext';
import { getNormalizedInvoiceData, TemplateProps } from './templateUtils';
import { AssetImage } from './AssetImage';

export const CompactA5: React.FC<TemplateProps> = ({
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
  const accentColor = businessSettings.invoiceAccentColor || '#2563eb';
  const copyLabel = copyLabelOverride || summary.defaultCopyLabel;

  return (
    <div className="invoice-template-container" style={{
      fontFamily: 'Inter, Arial, sans-serif',
      width: '100%',
      minHeight: '125mm',
      height: 'auto',
      overflow: 'visible',
      padding: '4mm 6mm',
      backgroundColor: 'white',
      color: '#1f2937',
      border: pdfMode === 'pdf' || pdfMode === 'print' ? 'none' : '1px solid #d1d5db',
      boxShadow: pdfMode === 'pdf' || pdfMode === 'print' ? 'none' : '0 4px 12px rgba(0,0,0,0.08)',
      margin: pdfMode === 'pdf' || pdfMode === 'print' ? '0' : '0 auto',
      position: 'relative',
      boxSizing: 'border-box',
      fontSize: '11px',
      display: 'flex',
      flexDirection: 'column',
      justifyContent: 'space-between'
    }}>
      <div>
        <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '8px' }}>
          <thead>
            <tr style={{ background: 'white' }}>
              <th colSpan={summary.isBroker ? 6 : 5} style={{ padding: 0, border: 'none', fontWeight: 'normal', textAlign: 'left', background: 'white' }}>
                {/* Header Banner */}
                {businessSettings.headerBannerPath && (
                  <div style={{ marginBottom: '6px', width: '100%', maxHeight: '40px', overflow: 'hidden', borderRadius: '4px' }}>
                    <AssetImage assetPath={businessSettings.headerBannerPath} style={{ width: '100%', height: 'auto', objectFit: 'cover' }} />
                  </div>
                )}

                {/* Header Bar */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: `2px solid ${accentColor}`, paddingBottom: '4px', marginBottom: '8px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    {businessSettings.logoPath && (
                      <AssetImage assetPath={businessSettings.logoPath} style={{ width: '36px', height: '36px', objectFit: 'contain' }} />
                    )}
                    <div>
                      <h1 style={{ margin: '0', fontSize: '17px', fontWeight: '800', color: '#111827', textTransform: 'uppercase', letterSpacing: '-0.5px' }}>
                        {businessSettings.businessName || 'Business Name'}
                      </h1>
                      <div style={{ fontSize: '10px', color: '#4b5563', marginTop: '1px', lineHeight: '1.2' }}>
                        {businessSettings.address}<br />
                        <strong>{t('invoice.phone', 'Phone')}:</strong> {businessSettings.phoneNumbers?.join(' / ')}
                      </div>
                    </div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ 
                      border: `1px solid ${accentColor}`, 
                      color: accentColor, 
                      padding: '2px 8px', 
                      fontSize: '9px', 
                      fontWeight: '700',
                      borderRadius: '2px',
                      display: 'inline-block',
                      marginBottom: '2px'
                    }}>
                      {copyLabel}
                    </div>
                    <h2 style={{ margin: '0', fontSize: '14px', fontWeight: '800', color: '#111827' }}>
                      {summary.invoiceTypeTitle}
                    </h2>
                  </div>
                </div>

                {/* Meta Grid */}
                <div style={{ display: 'flex', justifyContent: 'space-between', backgroundColor: '#f9fafb', border: '1px solid #e5e7eb', padding: '4px 8px', borderRadius: '4px', marginBottom: '8px', fontSize: '10px' }}>
                  <div>
                    <div><strong>{t('invoice.invoiceNo', 'Invoice No')}:</strong> {summary.invoiceNumber}</div>
                    <div><strong>{t('invoice.dateTime', 'Date')}:</strong> {summary.dateTimeStr}</div>
                  </div>
                  <div>
                    <div><strong>{summary.partyTitle}:</strong> {summary.partyName}</div>
                    <div><strong>{t('customers.contactNumber', 'Contact')}:</strong> {summary.partyContact || t('invoice.nA', 'N/A')}</div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div><strong>{t('customerTransactions.paymentMode', 'Mode')}:</strong> {summary.paymentMethod}</div>
                  </div>
                </div>
              </th>
            </tr>

            <tr style={{ backgroundColor: '#f3f4f6', borderTop: '1px solid #d1d5db', borderLeft: '1px solid #d1d5db', borderRight: '1px solid #d1d5db', borderBottom: '1px solid #d1d5db', color: '#374151', fontSize: '10px' }}>
              <th style={{ padding: '3px 6px', borderRight: '1px solid #e5e7eb', width: '25px', textAlign: 'center' }}>#</th>
              <th style={{ padding: '3px 6px', borderRight: '1px solid #e5e7eb', textAlign: 'left' }}>{t('invoice.description', 'DESCRIPTION')}</th>
              <th style={{ padding: '3px 6px', borderRight: '1px solid #e5e7eb', textAlign: 'center', width: '55px' }}>{t('invoice.qty', 'QTY')}</th>
              <th style={{ padding: '3px 6px', borderRight: '1px solid #e5e7eb', textAlign: 'right', width: '65px' }}>{t('invoice.rate', 'RATE')}</th>
              {summary.isBroker && (
                <th style={{ padding: '3px 6px', borderRight: '1px solid #e5e7eb', textAlign: 'right', width: '60px' }}>{t('invoice.brokerage', 'BROK.')}</th>
              )}
              <th style={{ padding: '3px 6px', textAlign: 'right', width: '75px' }}>{t('invoice.amount', 'AMOUNT')}</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item) => (
              <tr key={item.srNo} style={{ borderLeft: '1px solid #d1d5db', borderRight: '1px solid #d1d5db', borderBottom: '1px solid #d1d5db' }}>
                <td style={{ padding: '3px 6px', borderRight: '1px solid #e5e7eb', textAlign: 'center', color: '#6b7280', fontSize: '10px' }}>{item.srNo}</td>
                <td style={{ padding: '3px 6px', borderRight: '1px solid #e5e7eb', fontWeight: '600', color: '#111827', fontSize: '10px' }}>{item.displayName}</td>
                <td style={{ padding: '3px 6px', borderRight: '1px solid #e5e7eb', textAlign: 'center', fontSize: '10px' }}>{item.quantityOrUnits} {item.unitType}</td>
                <td style={{ padding: '3px 6px', borderRight: '1px solid #e5e7eb', textAlign: 'right', fontSize: '10px' }}>{formatCurrency(item.rateOrPrice)}</td>
                {summary.isBroker && (
                  <td style={{ padding: '3px 6px', borderRight: '1px solid #e5e7eb', textAlign: 'right', fontSize: '10px' }}>{formatCurrency(item.brokerage)}</td>
                )}
                <td style={{ padding: '3px 6px', textAlign: 'right', fontWeight: '700', color: '#111827', fontSize: '10px' }}>{formatCurrency(item.total)}</td>
              </tr>
            ))}
            {/* Minimal filler rows */}
            {[...Array(Math.max(0, 2 - items.length))].map((_, i) => (
              <tr key={`filler-${i}`} style={{ height: '18px', borderLeft: '1px solid #d1d5db', borderRight: '1px solid #d1d5db', borderBottom: '1px solid #d1d5db' }}>
                <td style={{ borderRight: '1px solid #e5e7eb' }}></td>
                <td style={{ borderRight: '1px solid #e5e7eb' }}></td>
                <td style={{ borderRight: '1px solid #e5e7eb' }}></td>
                <td style={{ borderRight: '1px solid #e5e7eb' }}></td>
                {summary.isBroker && (<td style={{ borderRight: '1px solid #e5e7eb' }}></td>)}
                <td></td>
              </tr>
            ))}
            <tr style={{ pageBreakInside: 'avoid' }}>
              <td colSpan={summary.isBroker ? 6 : 5} style={{ border: 'none', padding: '12px 0 0 0' }}>
                {/* Summary Box */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '15px', pageBreakInside: 'avoid' }}>
                  <div style={{ flex: 1, border: '1px solid #e5e7eb', padding: '4px 8px', borderRadius: '4px', fontSize: '9px', backgroundColor: '#f9fafb' }}>
                    <strong style={{ color: '#374151', display: 'block', marginBottom: '2px' }}>{t('invoice.terms', 'TERMS & CONDITIONS')}</strong>
                    <div style={{ color: '#6b7280', lineHeight: '1.3' }}>
                      {t('invoice.term1Short', 'Goods once sold will not be taken back.')}<br />
                      {t('invoice.term2Short', 'Subject to local jurisdiction.')}
                    </div>
                  </div>
                  <div style={{ width: '210px', border: '1px solid #d1d5db', borderRadius: '4px', overflow: 'hidden' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', padding: '2px 6px', borderBottom: '1px solid #e5e7eb', fontSize: '10px' }}>
                      <span>{t('invoice.subtotal', 'Subtotal:')}</span>
                      <strong>{formatCurrency(summary.subtotal)}</strong>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', padding: '2px 6px', borderBottom: '1px solid #e5e7eb', fontSize: '10px' }}>
                      <span>{summary.labourOrBrokerageLabel}</span>
                      <strong>{formatCurrency(summary.labourOrBrokerageAmount)}</strong>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', padding: '2px 6px', borderBottom: '1px solid #e5e7eb', fontSize: '10px' }}>
                      <span>{t('invoice.previousBalance', 'Previous:')}</span>
                      <strong>{formatCurrency(summary.previousBalance)}</strong>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 6px', backgroundColor: accentColor, color: '#fff', fontWeight: '800', fontSize: '12px' }}>
                      <span>{summary.isBroker ? t('invoice.netOutstanding', 'NET:') : t('invoice.netPayable', 'NET:')}</span>
                      <span>{formatCurrency(summary.netAmount)}</span>
                    </div>
                  </div>
                </div>

                {/* Custom Prominent Tagline Banner */}
                {businessSettings.customFooterText && (
                  <div style={{ 
                    marginTop: '6px', 
                    padding: '4px 12px', 
                    backgroundColor: `${accentColor}12`, 
                    color: accentColor, 
                    fontWeight: '700', 
                    fontSize: '10px', 
                    borderRadius: '4px', 
                    textAlign: 'center', 
                    border: `1px dashed ${accentColor}`,
                    letterSpacing: '0.5px',
                    pageBreakInside: 'avoid'
                  }}>
                    {businessSettings.customFooterText}
                  </div>
                )}

                {/* Signatures & QR */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginTop: '15px', pageBreakInside: 'avoid', fontSize: '9px' }}>
                  <div style={{ textAlign: 'center', width: '120px' }}>
                    <div style={{ borderBottom: '1px solid #9ca3af', height: '20px' }}></div>
                    <div style={{ marginTop: '4px', fontWeight: '700', color: '#4b5563' }}>{t('invoice.customerSign', 'CUSTOMER SIGN')}</div>
                  </div>
                  {businessSettings.qrCodePath && (
                    <div style={{ textAlign: 'center', padding: '4px', border: '1px solid #e5e7eb', borderRadius: '4px', backgroundColor: '#f9fafb' }}>
                      <AssetImage assetPath={businessSettings.qrCodePath} style={{ width: '40px', height: '40px', objectFit: 'contain' }} />
                      <div style={{ fontSize: '8px', color: '#6b7280', marginTop: '2px', fontWeight: '600' }}>{t('invoice.scanQr', 'SCAN QR')}</div>
                    </div>
                  )}
                  <div style={{ textAlign: 'center', width: '140px' }}>
                    <div style={{ fontWeight: '700', color: '#111827', marginBottom: '15px', fontSize: '10px' }}>{t('common.for', 'For')} {businessSettings.businessName}</div>
                    <div style={{ borderBottom: '1px solid #9ca3af', margin: '0 10px' }}></div>
                    <div style={{ marginTop: '4px', fontWeight: '700', color: '#4b5563' }}>{t('invoice.authorizedSign', 'AUTHORIZED SIGN')}</div>
                  </div>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <div style={{ 
        marginTop: '10px', 
        paddingTop: '6px', 
        borderTop: '1px solid #e5e7eb', 
        width: '100%', 
        textAlign: 'center', 
        fontSize: '9px', 
        color: '#9ca3af',
        pageBreakInside: 'avoid' 
      }}>
        {t('invoice.generatedOn', 'Generated on')} {new Date().toLocaleString()} | ScaleERP
      </div>
    </div>
  );
};
