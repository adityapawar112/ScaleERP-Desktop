// src/components/ReportViewer.tsx
import React from 'react';
import { Table, Button } from 'react-bootstrap';
import { useTranslation } from 'react-i18next';
import { MdFileDownload, MdPrint, MdPictureAsPdf } from 'react-icons/md';
import { ReportData } from '../types/reports';

interface ReportViewerProps {
  report: ReportData;
  onExportExcel: () => void;
  onExportPdf: () => void;
  onPrint: () => void;
  isExporting?: boolean;
}

const ReportViewer: React.FC<ReportViewerProps> = ({ 
  report, 
  onExportExcel, 
  onExportPdf,
  onPrint,
  isExporting = false
}) => {
  const { t } = useTranslation();

  return (
    <div className="report-viewer-container">
      <div className="d-flex justify-content-between align-items-center mb-4 pb-3 border-bottom">
        <div>
          <h2 className="mb-1">{report.title}</h2>
          {report.dateRange && (
            <p className="text-muted mb-0">
              {t('reports.period', 'Period:')} <strong>{report.dateRange.from}</strong> {t('common.to', 'to')} <strong>{report.dateRange.to}</strong>
            </p>
          )}
          <p className="text-muted small mb-0">{t('reports.generatedAt', 'Generated at:')} {report.generatedAt}</p>
        </div>
        <div className="d-flex gap-2 align-items-center">
          {isExporting && (
            <div className="text-muted small me-2 d-flex align-items-center">
              <div className="spinner-border spinner-border-sm text-primary me-2" role="status" />
              <span>{t('common.exporting', 'Exporting...')}</span>
            </div>
          )}
          <Button variant="outline-primary" onClick={onExportExcel} disabled={isExporting}>
            <MdFileDownload className="me-2" /> {t('reports.exportExcel', 'Export Excel')}
          </Button>
          <Button variant="outline-danger" onClick={onExportPdf} disabled={isExporting}>
            <MdPictureAsPdf className="me-2" /> {t('reports.downloadPdf', 'Download PDF')}
          </Button>
          <Button variant="outline-secondary" onClick={onPrint} disabled={isExporting}>
            <MdPrint className="me-2" /> {t('common.print', 'Print')}
          </Button>
        </div>
      </div>

      <div className="report-table-wrapper" style={{ maxHeight: '600px', overflowY: 'auto' }}>
        <Table striped bordered hover responsive className="mb-0">
          <thead style={{ position: 'sticky', top: 0, backgroundColor: 'white', zIndex: 1 }}>
            <tr>
              {report.headers.map((header, index) => (
                <th key={index}>{header}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {report.rows.length > 0 ? (
              report.rows.map((row, rowIndex) => (
                <tr key={rowIndex}>
                  {row.map((cell, cellIndex) => (
                    <td key={cellIndex}>{cell}</td>
                  ))}
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={report.headers.length} className="text-center py-4 text-muted">
                  {t('reports.noData', 'No data available for the selected criteria.')}
                </td>
              </tr>
            )}
          </tbody>
          {report.totals && report.totals.length > 0 && (
            <tfoot className="table-light">
              {report.totals.map((total, index) => (
                <tr key={index}>
                  <td colSpan={report.headers.length - 2} className="text-end fw-bold">
                    {total.label}
                  </td>
                  <td colSpan={2} className="text-end fw-bold text-primary">
                    {total.value}
                  </td>
                </tr>
              ))}
            </tfoot>
          )}
        </Table>
      </div>

      {report.summary && (
        <div className="mt-4 p-3 bg-light rounded">
          <h5 className="mb-2">{t('common.summary', 'Summary')}</h5>
          <p className="mb-0 text-muted">{report.summary}</p>
        </div>
      )}
    </div>
  );
};

export default ReportViewer;
