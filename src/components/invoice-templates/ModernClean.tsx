import React from 'react';
import { useTranslation } from 'react-i18next';
import { useAppContext } from '../../context/AppContext';
import { getNormalizedInvoiceData, TemplateProps } from './templateUtils';
import { AssetImage } from './AssetImage';

export const ModernClean: React.FC<TemplateProps> = ({
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
      fontFamily: 'Inter, Outfit, sans-serif',
      width: pdfMode === 'pdf' || pdfMode === 'print' ? '100%' : '210mm',
      minHeight: '260mm',
      height: 'auto',
      overflow: 'visible',
      padding: '10mm',
      backgroundColor: '#ffffff',
      color: '#334155',
      border: pdfMode === 'pdf' || pdfMode === 'print' ? 'none' : '1px solid #cbd5e1',
      boxShadow: pdfMode === 'pdf' || pdfMode === 'print' ? 'none' : '0 10px 30px -5px rgba(0, 0, 0, 0.08)',
      margin: pdfMode === 'pdf' || pdfMode === 'print' ? '0' : '0 auto',
      position: 'relative',
      boxSizing: 'border-box',
      display: 'flex',
      flexDirection: 'column',
      justifyContent: 'space-between'
    }}>
      <div>
        <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '20px' }}>
          <thead>
            <tr style={{ background: 'white' }}>
              <th colSpan={summary.isBroker ? 7 : 5} style={{ padding: 0, border: 'none', fontWeight: 'normal', textAlign: 'left', background: 'white' }}>
                {/* Header Banner */}
                {businessSettings.headerBannerPath && (
                  <div style={{ marginBottom: '15px', width: '100%', maxHeight: '80px', overflow: 'hidden', borderRadius: '8px' }}>
                    <AssetImage assetPath={businessSettings.headerBannerPath} style={{ width: '100%', height: 'auto', objectFit: 'cover' }} />
                  </div>
                )}

                {/* Top Bar with Accent Pill & Type */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
                  <div style={{ 
                    backgroundColor: `${accentColor}15`, 
                    color: accentColor, 
                    padding: '6px 16px', 
                    borderRadius: '50px', 
                    fontWeight: '700', 
                    fontSize: '12px',
                    letterSpacing: '1px',
                    textTransform: 'uppercase'
                  }}>
                    {copyLabel}
                  </div>
                  <div style={{ fontSize: '22px', fontWeight: '800', color: '#0f172a', letterSpacing: '0.5px' }}>
                    {summary.invoiceTypeTitle}
                  </div>
                </div>

                {/* Business Details Header Box */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#f8fafc', padding: '16px', borderRadius: '12px', marginBottom: '20px', border: '1px solid #e2e8f0' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                    {businessSettings.logoPath && (
                      <div style={{ padding: '6px', backgroundColor: '#ffffff', borderRadius: '10px', boxShadow: '0 2px 4px rgba(0,0,0,0.05)' }}>
                        <AssetImage assetPath={businessSettings.logoPath} style={{ width: '60px', height: '60px', objectFit: 'contain' }} />
                      </div>
                    )}
                    <div>
                      <h1 style={{ margin: '0 0 4px 0', fontSize: '24px', fontWeight: '800', color: '#0f172a', letterSpacing: '-0.5px' }}>
                        {businessSettings.businessName || 'Business Name'}
                      </h1>
                      <div style={{ fontSize: '13px', color: '#64748b', lineHeight: '1.4' }}>
                        {businessSettings.address}
                      </div>
                      <div style={{ fontSize: '12px', color: '#475569', marginTop: '4px', fontWeight: '500' }}>
                        <span>{t('invoice.proprietor', 'Proprietor')}: {businessSettings.proprietorName}</span>
                        <span style={{ margin: '0 8px', color: '#cbd5e1' }}>|</span>
                        <span>{t('invoice.phone', 'Phone')}: {businessSettings.phoneNumbers?.join(' / ')}</span>
                      </div>
                    </div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: '12px', color: '#64748b', textTransform: 'uppercase', fontWeight: '600' }}>{t('invoice.invoiceNo', 'Invoice No')}</div>
                    <div style={{ fontSize: '18px', fontWeight: '800', color: accentColor, marginBottom: '4px' }}>{summary.invoiceNumber}</div>
                    <div style={{ fontSize: '12px', color: '#64748b', fontWeight: '500' }}>{summary.dateTimeStr}</div>
                  </div>
                </div>

                {/* Customer / Broker Card */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', padding: '14px 16px', backgroundColor: '#ffffff', borderRadius: '12px', border: '1px solid #e2e8f0', marginBottom: '20px' }}>
                  <div>
                    <div style={{ fontSize: '11px', color: '#94a3b8', fontWeight: '700', textTransform: 'uppercase', marginBottom: '4px', letterSpacing: '0.5px' }}>
                      {t('invoice.billedTo', 'BILLED TO')} ({summary.partyTitle})
                    </div>
                    <div style={{ fontSize: '16px', fontWeight: '700', color: '#0f172a', marginBottom: '2px' }}>{summary.partyName}</div>
                    <div style={{ fontSize: '13px', color: '#475569', marginBottom: '2px' }}>{summary.partyAddress || t('invoice.nA', 'N/A')}</div>
                    <div style={{ fontSize: '13px', color: '#64748b' }}>{t('customers.contactNumber', 'Contact Number')}: {summary.partyContact || t('invoice.nA', 'N/A')}</div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: '11px', color: '#94a3b8', fontWeight: '700', textTransform: 'uppercase', marginBottom: '4px', letterSpacing: '0.5px' }}>
                      {t('customerTransactions.paymentMode', 'PAYMENT METHOD')}
                    </div>
                    <div style={{ display: 'inline-block', backgroundColor: '#f1f5f9', padding: '6px 14px', borderRadius: '6px', fontWeight: '700', color: '#0f172a', fontSize: '13px' }}>
                      {summary.paymentMethod}
                    </div>
                  </div>
                </div>
              </th>
            </tr>

            <tr style={{ borderBottom: '2px solid #cbd5e1', color: '#64748b', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              <th style={{ padding: '10px 8px', width: '40px', textAlign: 'center', fontWeight: '700' }}>#</th>
              <th style={{ padding: '10px 8px', textAlign: 'left', fontWeight: '700' }}>{t('invoice.description', 'DESCRIPTION')}</th>
              <th style={{ padding: '10px 8px', textAlign: 'center', width: '90px', fontWeight: '700' }}>{t('invoice.qty', 'QTY')}</th>
              <th style={{ padding: '10px 8px', textAlign: 'right', width: '100px', fontWeight: '700' }}>{t('invoice.rate', 'RATE')}</th>
              {summary.isBroker && (
                <>
                  <th style={{ padding: '10px 8px', textAlign: 'right', width: '90px', fontWeight: '700' }}>{t('invoice.brokeragePerUnit', 'BROK./UNIT')}</th>
                  <th style={{ padding: '10px 8px', textAlign: 'right', width: '90px', fontWeight: '700' }}>{t('invoice.brokerage', 'BROKERAGE')}</th>
                </>
              )}
              <th style={{ padding: '10px 8px', textAlign: 'right', width: '120px', fontWeight: '700' }}>{t('invoice.amount', 'AMOUNT')}</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item) => (
              <tr key={item.srNo} style={{ borderBottom: '1px solid #f1f5f9', transition: 'background-color 0.15s ease' }}>
                <td style={{ padding: '10px 8px', textAlign: 'center', color: '#94a3b8', fontSize: '13px' }}>{item.srNo}</td>
                <td style={{ padding: '10px 8px' }}>
                  <div style={{ fontWeight: '600', color: '#0f172a', fontSize: '13px' }}>{item.displayName}</div>
                </td>
                <td style={{ padding: '10px 8px', textAlign: 'center', color: '#475569', fontSize: '13px', fontWeight: '500' }}>
                  {item.quantityOrUnits} {item.unitType}
                </td>
                <td style={{ padding: '10px 8px', textAlign: 'right', color: '#475569', fontSize: '13px' }}>
                  {formatCurrency(item.rateOrPrice)}
                </td>
                {summary.isBroker && (
                  <>
                    <td style={{ padding: '10px 8px', textAlign: 'right', color: '#64748b', fontSize: '13px' }}>
                      {formatCurrency(item.brokeragePerUnit)}
                    </td>
                    <td style={{ padding: '10px 8px', textAlign: 'right', color: '#64748b', fontSize: '13px' }}>
                      {formatCurrency(item.brokerage)}
                    </td>
                  </>
                )}
                <td style={{ padding: '10px 8px', textAlign: 'right', fontWeight: '700', color: '#0f172a', fontSize: '14px' }}>
                  {formatCurrency(item.total)}
                </td>
              </tr>
            ))}
            {/* Subtle Filler Rows */}
            {[...Array(Math.max(0, 3 - items.length))].map((_, i) => (
              <tr key={`filler-${i}`} style={{ height: '24px', borderBottom: '1px solid #f8fafc' }}>
                <td></td><td></td><td></td><td></td>
                {summary.isBroker && (<><td></td><td></td></>)}
                <td></td>
              </tr>
            ))}
            <tr style={{ pageBreakInside: 'avoid' }}>
              <td colSpan={summary.isBroker ? 7 : 5} style={{ border: 'none', padding: '20px 0 0 0' }}>
                {/* Summary Container */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '20px', pageBreakInside: 'avoid' }}>
                  <div style={{ flex: 1, padding: '16px', backgroundColor: '#f8fafc', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
                    <div style={{ fontSize: '11px', fontWeight: '700', color: '#94a3b8', textTransform: 'uppercase', marginBottom: '8px', letterSpacing: '0.5px' }}>
                      {t('invoice.terms', 'TERMS & CONDITIONS')}
                    </div>
                    <ul style={{ paddingLeft: '16px', margin: '0', color: '#64748b', fontSize: '12px', lineHeight: '1.5' }}>
                      <li>{t('invoice.term1', 'Goods once sold will not be taken back or exchanged.')}</li>
                      <li>{t('invoice.term2', 'Subject to Local Jurisdiction only.')}</li>
                      <li>{t('invoice.term3', 'This is a computer generated invoice and does not require a physical signature.')}</li>
                    </ul>
                  </div>
                  <div style={{ width: '380px', backgroundColor: '#ffffff', borderRadius: '12px', border: '1px solid #e2e8f0', padding: '16px', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.03)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px', fontSize: '13px', color: '#64748b' }}>
                      <span>{summary.isBroker ? t('invoice.productsTotal', 'Products Total:') : t('invoice.subtotal', 'Subtotal:')}</span>
                      <span style={{ fontWeight: '600', color: '#0f172a' }}>{formatCurrency(summary.subtotal)}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px', fontSize: '13px', color: '#64748b' }}>
                      <span>{summary.labourOrBrokerageLabel}</span>
                      <span style={{ fontWeight: '600', color: '#0f172a' }}>{formatCurrency(summary.labourOrBrokerageAmount)}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px', fontSize: '14px', fontWeight: '700', color: '#0f172a', borderBottom: '1px solid #f1f5f9', paddingBottom: '10px' }}>
                      <span>{t('invoice.currentTotal', 'Current Total:')}</span>
                      <span>{formatCurrency(summary.currentTotal)}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px', fontSize: '13px', color: '#64748b' }}>
                      <span>{t('invoice.previousBalance', 'Previous Balance:')}</span>
                      <span style={{ fontWeight: '600', color: '#0f172a' }}>{formatCurrency(summary.previousBalance)}</span>
                    </div>
                    <div style={{ 
                      display: 'flex', 
                      justifyContent: 'space-between', 
                      alignItems: 'center',
                      padding: '12px 16px', 
                      backgroundColor: `${accentColor}10`,
                      borderRadius: '8px',
                      border: `1px solid ${accentColor}30`,
                      color: accentColor
                    }}>
                      <span style={{ fontWeight: '800', fontSize: '14px', letterSpacing: '0.5px' }}>
                        {summary.isBroker ? t('invoice.netOutstanding', 'NET OUTSTANDING:') : t('invoice.netPayable', 'NET PAYABLE:')}
                      </span>
                      <span style={{ fontWeight: '900', fontSize: '20px' }}>{formatCurrency(summary.netAmount)}</span>
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
                    borderRadius: '8px', 
                    textAlign: 'center', 
                    border: `1px dashed ${accentColor}`,
                    letterSpacing: '0.5px',
                    pageBreakInside: 'avoid'
                  }}>
                    {businessSettings.customFooterText}
                  </div>
                )}

                {/* Footer Signatures & QR */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginTop: '25px', pageBreakInside: 'avoid' }}>
                  <div style={{ width: '200px', textAlign: 'center' }}>
                    <div style={{ borderBottom: '2px dashed #cbd5e1', height: '35px', marginBottom: '10px' }}></div>
                    <div style={{ fontSize: '11px', fontWeight: '700', color: '#64748b', letterSpacing: '0.5px' }}>
                      {summary.isBroker ? t('invoice.supplierSignature', 'SUPPLIER SIGNATURE') : t('invoice.customerSignature', 'CUSTOMER SIGNATURE')}
                    </div>
                  </div>

                  {businessSettings.qrCodePath && (
                    <div style={{ textAlign: 'center', padding: '8px', backgroundColor: '#f8fafc', borderRadius: '10px', border: '1px solid #e2e8f0' }}>
                      <AssetImage assetPath={businessSettings.qrCodePath} style={{ width: '65px', height: '65px', objectFit: 'contain' }} />
                      <div style={{ fontSize: '10px', fontWeight: '700', color: '#64748b', marginTop: '4px', letterSpacing: '0.5px' }}>{t('invoice.scanToVerify', 'SCAN TO VERIFY')}</div>
                    </div>
                  )}

                  <div style={{ width: '240px', textAlign: 'center' }}>
                    <div style={{ fontSize: '12px', fontWeight: '700', color: '#0f172a', marginBottom: '30px' }}>{t('common.for', 'For')} {businessSettings.businessName}</div>
                    <div style={{ borderBottom: '2px solid #94a3b8', marginBottom: '10px' }}></div>
                    <div style={{ fontSize: '11px', fontWeight: '700', color: '#64748b', letterSpacing: '0.5px' }}>{t('invoice.authorizedSignatory', 'AUTHORIZED SIGNATORY')}</div>
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
        borderTop: '1px solid #f1f5f9', 
        width: '100%', 
        textAlign: 'center', 
        fontSize: '10px', 
        color: '#94a3b8',
        pageBreakInside: 'avoid' 
      }}>
        {t('invoice.generatedOn', 'Generated on')} {new Date().toLocaleString()} | {t('invoice.poweredBy', 'Powered by ScaleERP')}
      </div>
    </div>
  );
};
