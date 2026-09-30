import React from 'react';
import { useTranslation } from 'react-i18next';
import { useAppContext } from '../../context/AppContext';
import { getNormalizedInvoiceData, TemplateProps } from './templateUtils';
import { AssetImage } from './AssetImage';

export const StandardA4: React.FC<TemplateProps> = ({
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
      width: pdfMode === 'pdf' || pdfMode === 'print' ? '100%' : '210mm',
      minHeight: '260mm',
      height: 'auto',
      overflow: 'visible',
      padding: '10mm',
      backgroundColor: 'white',
      color: '#1f2937',
      border: pdfMode === 'pdf' || pdfMode === 'print' ? 'none' : '1px solid #e5e7eb',
      boxShadow: pdfMode === 'pdf' || pdfMode === 'print' ? 'none' : '0 10px 25px -5px rgba(0, 0, 0, 0.1)',
      margin: pdfMode === 'pdf' || pdfMode === 'print' ? '0' : '0 auto',
      position: 'relative',
      boxSizing: 'border-box',
      display: 'flex',
      flexDirection: 'column',
      justifyContent: 'space-between'
    }}>
      <div>
        <table style={{
          width: '100%',
          borderCollapse: 'separate',
          borderSpacing: 0,
          border: 'none',
          fontSize: '12px',
          marginBottom: '20px'
        }}>
          <thead>
            <tr style={{ background: 'white' }}>
              <th colSpan={summary.isBroker ? 7 : 5} style={{ padding: 0, border: 'none', fontWeight: 'normal', textAlign: 'left', background: 'white' }}>
                {/* Optional Header Banner */}
                {businessSettings.headerBannerPath && (
                  <div style={{ marginBottom: '12px', width: '100%', maxHeight: '90px', overflow: 'hidden', borderRadius: '4px' }}>
                    <AssetImage assetPath={businessSettings.headerBannerPath} style={{ width: '100%', height: 'auto', objectFit: 'cover' }} />
                  </div>
                )}

                {/* Header Section */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '20px', borderBottom: `3px solid ${accentColor}`, paddingBottom: '12px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                    {businessSettings.logoPath && (
                      <AssetImage assetPath={businessSettings.logoPath} style={{ width: '75px', height: '75px', objectFit: 'contain' }} />
                    )}
                    <div>
                      <h1 style={{ margin: '0', fontSize: '26px', fontWeight: '800', textTransform: 'uppercase', color: '#111827', letterSpacing: '-0.5px' }}>
                        {businessSettings.businessName || 'Business Name'}
                      </h1>
                      <div style={{ fontSize: '12px', color: '#4b5563', marginTop: '4px', maxWidth: '400px', lineHeight: '1.4' }}>
                        {businessSettings.address}<br />
                        <strong>{t('invoice.proprietor', 'Proprietor')}:</strong> {businessSettings.proprietorName} | <strong>{t('invoice.phone', 'Phone')}:</strong> {businessSettings.phoneNumbers?.join(' / ')}
                      </div>
                    </div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ 
                      backgroundColor: accentColor,
                      color: '#fff',
                      padding: '4px 12px', 
                      fontSize: '11px', 
                      fontWeight: '700',
                      borderRadius: '4px',
                      display: 'inline-block',
                      marginBottom: '6px',
                      letterSpacing: '0.5px'
                    }}>
                      {copyLabel}
                    </div>
                    <h2 style={{ margin: '0', fontSize: '22px', fontWeight: '900', color: accentColor, letterSpacing: '0.5px' }}>
                      {summary.invoiceTypeTitle}
                    </h2>
                  </div>
                </div>

                {/* Info Grid */}
                <div style={{ 
                  display: 'grid', 
                  gridTemplateColumns: 'repeat(2, 1fr)', 
                  border: '1px solid #d1d5db',
                  borderRadius: '6px',
                  overflow: 'hidden',
                  fontSize: '12px',
                  marginBottom: '20px'
                }}>
                  <div style={{ borderRight: '1px solid #d1d5db', borderBottom: '1px solid #d1d5db', padding: '8px 12px', backgroundColor: '#f9fafb' }}>
                    <span style={{ color: '#6b7280', fontSize: '11px', display: 'block', textTransform: 'uppercase', fontWeight: '600' }}>
                      {t('invoice.invoiceNo', 'Invoice No')}
                    </span>
                    <span style={{ fontWeight: '700', fontSize: '14px', color: '#111827' }}>{summary.invoiceNumber}</span>
                  </div>
                  <div style={{ borderBottom: '1px solid #d1d5db', padding: '8px 12px', backgroundColor: '#f9fafb' }}>
                    <span style={{ color: '#6b7280', fontSize: '11px', display: 'block', textTransform: 'uppercase', fontWeight: '600' }}>
                      {t('invoice.dateTime', 'Date & Time')}
                    </span>
                    <span style={{ fontWeight: '700', fontSize: '14px', color: '#111827' }}>{summary.dateTimeStr}</span>
                  </div>

                  <div style={{ borderRight: '1px solid #d1d5db', borderBottom: '1px solid #d1d5db', padding: '8px 12px' }}>
                    <span style={{ color: '#6b7280', fontSize: '11px', display: 'block', textTransform: 'uppercase', fontWeight: '600' }}>
                      {summary.partyTitle}
                    </span>
                    <span style={{ fontWeight: '700', fontSize: '14px', color: '#111827' }}>{summary.partyName}</span>
                  </div>
                  <div style={{ borderBottom: '1px solid #d1d5db', padding: '8px 12px' }}>
                    <span style={{ color: '#6b7280', fontSize: '11px', display: 'block', textTransform: 'uppercase', fontWeight: '600' }}>
                      {t('customers.contactNumber', 'Contact Number')}
                    </span>
                    <span style={{ fontWeight: '700', fontSize: '14px', color: '#111827' }}>{summary.partyContact || t('invoice.nA', 'N/A')}</span>
                  </div>

                  <div style={{ borderBottom: '1px solid #d1d5db', padding: '8px 12px', gridColumn: 'span 2' }}>
                    <span style={{ color: '#6b7280', fontSize: '11px', display: 'block', textTransform: 'uppercase', fontWeight: '600' }}>
                      {t('invoice.address', 'Address')}
                    </span>
                    <span style={{ color: '#111827' }}>{summary.partyAddress || t('invoice.nA', 'N/A')}</span>
                  </div>

                  <div style={{ padding: '8px 12px', gridColumn: 'span 2', backgroundColor: '#f9fafb' }}>
                    <span style={{ color: '#6b7280', fontSize: '11px', display: 'inline-block', textTransform: 'uppercase', fontWeight: '600', marginRight: '8px' }}>
                      {t('customerTransactions.paymentMode', 'Payment Mode')}:
                    </span>
                    <span style={{ fontWeight: '700', color: accentColor }}>{summary.paymentMethod}</span>
                  </div>
                </div>
              </th>
            </tr>

            {/* Table Column Headers */}
            <tr style={{ backgroundColor: '#f3f4f6', color: '#374151' }}>
              <th style={{ padding: '8px 10px', borderTop: '1px solid #d1d5db', borderLeft: '1px solid #d1d5db', borderRight: '1px solid #d1d5db', borderBottom: '1px solid #d1d5db', width: '45px', textAlign: 'center', fontWeight: '700', borderTopLeftRadius: '6px' }}>#</th>
              <th style={{ padding: '8px 10px', borderTop: '1px solid #d1d5db', borderRight: '1px solid #d1d5db', borderBottom: '1px solid #d1d5db', textAlign: 'left', fontWeight: '700' }}>{t('invoice.description', 'DESCRIPTION')}</th>
              <th style={{ padding: '8px 10px', borderTop: '1px solid #d1d5db', borderRight: '1px solid #d1d5db', borderBottom: '1px solid #d1d5db', textAlign: 'center', width: '90px', fontWeight: '700' }}>{t('invoice.qty', 'QTY')}</th>
              <th style={{ padding: '8px 10px', borderTop: '1px solid #d1d5db', borderRight: '1px solid #d1d5db', borderBottom: '1px solid #d1d5db', textAlign: 'right', width: '100px', fontWeight: '700' }}>{t('invoice.rate', 'RATE')}</th>
              {summary.isBroker && (
                <>
                  <th style={{ padding: '8px 10px', borderTop: '1px solid #d1d5db', borderRight: '1px solid #d1d5db', borderBottom: '1px solid #d1d5db', textAlign: 'right', width: '90px', fontWeight: '700' }}>{t('invoice.brokeragePerUnit', 'BROK./UNIT')}</th>
                  <th style={{ padding: '8px 10px', borderTop: '1px solid #d1d5db', borderRight: '1px solid #d1d5db', borderBottom: '1px solid #d1d5db', textAlign: 'right', width: '90px', fontWeight: '700' }}>{t('invoice.brokerage', 'BROKERAGE')}</th>
                </>
              )}
              <th style={{ padding: '8px 10px', borderTop: '1px solid #d1d5db', borderRight: '1px solid #d1d5db', borderBottom: '1px solid #d1d5db', textAlign: 'right', width: '120px', fontWeight: '700', borderTopRightRadius: '6px' }}>{t('invoice.amount', 'AMOUNT')}</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item, idx) => {
              const isLast = idx === items.length - 1 && Math.max(0, 3 - items.length) === 0;
              return (
                <tr key={item.srNo} style={{ borderBottom: '1px solid #e5e7eb' }}>
                  <td style={{ padding: '8px 10px', borderLeft: '1px solid #d1d5db', borderRight: '1px solid #e5e7eb', borderBottom: '1px solid #e5e7eb', textAlign: 'center', color: '#6b7280', borderBottomLeftRadius: isLast ? '6px' : undefined }}>{item.srNo}</td>
                  <td style={{ padding: '8px 10px', borderRight: '1px solid #e5e7eb', borderBottom: '1px solid #e5e7eb' }}>
                    <div style={{ fontWeight: '600', color: '#111827' }}>{item.displayName}</div>
                  </td>
                  <td style={{ padding: '8px 10px', borderRight: '1px solid #e5e7eb', borderBottom: '1px solid #e5e7eb', textAlign: 'center', color: '#374151', fontWeight: '500' }}>
                    {item.quantityOrUnits} {item.unitType}
                  </td>
                  <td style={{ padding: '8px 10px', borderRight: '1px solid #e5e7eb', borderBottom: '1px solid #e5e7eb', textAlign: 'right', color: '#374151' }}>
                    {formatCurrency(item.rateOrPrice)}
                  </td>
                  {summary.isBroker && (
                    <>
                      <td style={{ padding: '8px 10px', borderRight: '1px solid #e5e7eb', borderBottom: '1px solid #e5e7eb', textAlign: 'right', color: '#6b7280' }}>
                        {formatCurrency(item.brokeragePerUnit)}
                      </td>
                      <td style={{ padding: '8px 10px', borderRight: '1px solid #e5e7eb', borderBottom: '1px solid #e5e7eb', textAlign: 'right', color: '#6b7280' }}>
                        {formatCurrency(item.brokerage)}
                      </td>
                    </>
                  )}
                  <td style={{ padding: '8px 10px', borderRight: '1px solid #d1d5db', borderBottom: '1px solid #e5e7eb', textAlign: 'right', fontWeight: '700', color: '#111827', borderBottomRightRadius: isLast ? '6px' : undefined }}>
                    {formatCurrency(item.total)}
                  </td>
                </tr>
              );
            })}
            {/* Premium filler rows */}
            {[...Array(Math.max(0, 3 - items.length))].map((_, i, arr) => {
              const isLast = i === arr.length - 1;
              return (
                <tr key={`filler-${i}`} style={{ height: '24px' }}>
                  <td style={{ borderLeft: '1px solid #d1d5db', borderRight: '1px solid #e5e7eb', borderBottom: '1px solid #e5e7eb', borderBottomLeftRadius: isLast ? '6px' : undefined }}></td>
                  <td style={{ borderRight: '1px solid #e5e7eb', borderBottom: '1px solid #e5e7eb' }}></td>
                  <td style={{ borderRight: '1px solid #e5e7eb', borderBottom: '1px solid #e5e7eb' }}></td>
                  <td style={{ borderRight: '1px solid #e5e7eb', borderBottom: '1px solid #e5e7eb' }}></td>
                  {summary.isBroker && (
                    <>
                      <td style={{ borderRight: '1px solid #e5e7eb', borderBottom: '1px solid #e5e7eb' }}></td>
                      <td style={{ borderRight: '1px solid #e5e7eb', borderBottom: '1px solid #e5e7eb' }}></td>
                    </>
                  )}
                  <td style={{ borderRight: '1px solid #d1d5db', borderBottom: '1px solid #e5e7eb', borderBottomRightRadius: isLast ? '6px' : undefined }}></td>
                </tr>
              );
            })}
            <tr style={{ pageBreakInside: 'avoid' }}>
              <td colSpan={summary.isBroker ? 7 : 5} style={{ border: 'none', padding: '20px 0 0 0' }}>
                {/* Summary Section */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '20px', pageBreakInside: 'avoid' }}>
                  <div style={{ width: '55%', border: '1px solid #e5e7eb', padding: '12px 15px', fontSize: '11px', borderRadius: '6px', backgroundColor: '#f9fafb' }}>
                    <strong style={{ color: '#111827', display: 'block', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                      {t('invoice.terms', 'TERMS & CONDITIONS')}
                    </strong>
                    <ul style={{ paddingLeft: '16px', margin: '0', color: '#4b5563', lineHeight: '1.5' }}>
                      <li>{t('invoice.term1', 'Goods once sold will not be taken back or exchanged.')}</li>
                      <li>{t('invoice.term2', 'Subject to Local Jurisdiction only.')}</li>
                      <li>{t('invoice.term3', 'This is a computer generated invoice and does not require a physical signature.')}</li>
                    </ul>
                  </div>
                  <div style={{ width: '45%', border: '1px solid #d1d5db', borderRadius: '6px', overflow: 'hidden', boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.05)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 15px', borderBottom: '1px solid #e5e7eb', fontSize: '13px', color: '#4b5563' }}>
                      <span>{summary.isBroker ? t('invoice.productsTotal', 'Products Total:') : t('invoice.subtotal', 'Subtotal:')}</span>
                      <span style={{ fontWeight: '600', color: '#111827' }}>{formatCurrency(summary.subtotal)}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 15px', borderBottom: '1px solid #e5e7eb', fontSize: '13px', color: '#4b5563' }}>
                      <span>{summary.labourOrBrokerageLabel}</span>
                      <span style={{ fontWeight: '600', color: '#111827' }}>{formatCurrency(summary.labourOrBrokerageAmount)}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 15px', borderBottom: '1px solid #e5e7eb', fontSize: '13px', fontWeight: '700', color: '#111827' }}>
                      <span>{t('invoice.currentTotal', 'Current Total:')}</span>
                      <span>{formatCurrency(summary.currentTotal)}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 15px', borderBottom: '1px solid #e5e7eb', fontSize: '13px', color: '#4b5563' }}>
                      <span>{t('invoice.previousBalance', 'Previous Balance:')}</span>
                      <span style={{ fontWeight: '600', color: '#111827' }}>{formatCurrency(summary.previousBalance)}</span>
                    </div>
                    <div style={{ 
                      display: 'flex', 
                      justifyContent: 'space-between', 
                      padding: '12px 15px', 
                      backgroundColor: accentColor,
                      color: '#fff',
                      fontWeight: '800',
                      fontSize: '17px',
                      letterSpacing: '0.5px'
                    }}>
                      <span>{summary.isBroker ? t('invoice.netOutstanding', 'NET OUTSTANDING:') : t('invoice.netPayable', 'NET PAYABLE:')}</span>
                      <span>{formatCurrency(summary.netAmount)}</span>
                    </div>
                  </div>
                </div>

                {/* Custom Prominent Tagline Banner */}
                {businessSettings.customFooterText && (
                  <div style={{ 
                    marginTop: '12px', 
                    padding: '8px 16px', 
                    backgroundColor: `${accentColor}12`, 
                    color: accentColor, 
                    fontWeight: '700', 
                    fontSize: '12px', 
                    borderRadius: '6px', 
                    textAlign: 'center', 
                    border: `1px dashed ${accentColor}`,
                    letterSpacing: '0.5px',
                    pageBreakInside: 'avoid'
                  }}>
                    {businessSettings.customFooterText}
                  </div>
                )}

                {/* Signatures & QR Code Section */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginTop: '25px', fontSize: '12px', pageBreakInside: 'avoid' }}>
                  <div style={{ textAlign: 'center', width: '220px' }}>
                    <div style={{ borderBottom: '1px solid #9ca3af', height: '35px' }}></div>
                    <div style={{ marginTop: '8px', fontWeight: '700', color: '#374151', letterSpacing: '0.5px' }}>
                      {summary.isBroker ? t('invoice.supplierSignature', 'SUPPLIER SIGNATURE') : t('invoice.customerSignature', 'CUSTOMER SIGNATURE')}
                    </div>
                  </div>

                  {businessSettings.qrCodePath && (
                    <div style={{ textAlign: 'center', border: '1px solid #e5e7eb', padding: '6px', borderRadius: '6px', backgroundColor: '#f9fafb' }}>
                      <AssetImage assetPath={businessSettings.qrCodePath} style={{ width: '70px', height: '70px', objectFit: 'contain' }} />
                      <div style={{ fontSize: '10px', color: '#6b7280', marginTop: '4px', fontWeight: '600' }}>{t('invoice.scanToPayOrVerify', 'SCAN TO PAY / VERIFY')}</div>
                    </div>
                  )}

                  <div style={{ textAlign: 'center', width: '280px' }}>
                    <div style={{ fontSize: '12px', fontWeight: '700', marginBottom: '25px', color: '#111827' }}>{t('common.for', 'For')} {businessSettings.businessName}</div>
                    <div style={{ borderBottom: '1px solid #9ca3af', height: '10px', margin: '0 30px' }}></div>
                    <div style={{ marginTop: '8px', fontWeight: '700', color: '#374151', letterSpacing: '0.5px' }}>{t('invoice.authorizedSignatory', 'AUTHORIZED SIGNATORY')}</div>
                  </div>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <div style={{ 
        marginTop: '20px', 
        paddingTop: '10px',
        borderTop: '1px solid #e5e7eb',
        width: '100%', 
        textAlign: 'center', 
        fontSize: '10px', 
        color: '#9ca3af',
        letterSpacing: '0.5px',
        pageBreakInside: 'avoid'
      }}>
        {t('invoice.generatedOn', 'Generated on')} {new Date().toLocaleString()} | {t('invoice.poweredBy', 'Powered by ScaleERP')}
      </div>
    </div>
  );
};
