import { ReportData } from '../types/reports';
import { BusinessSettings } from '../context/AppContext';

/**
 * Utility to print reports in a clean, printer-friendly format using a hidden iframe.
 * Handles many columns and rows without formatting errors.
 */
export const printReport = (report: ReportData, businessSettings: BusinessSettings): void => {
  // Create a clean HTML document for the report
  const htmlContent = `
    <!DOCTYPE html>
    <html>
    <head>
      <title>${report.title}</title>
      <style>
        @page {
          size: auto;
          margin: 10mm;
        }
        body {
          font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
          font-size: 10pt;
          line-height: 1.4;
          color: #333;
          margin: 0;
          padding: 0;
        }
        .header {
          border-bottom: 2px solid #be6d44;
          margin-bottom: 20px;
          padding-bottom: 10px;
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
        }
        .business-info h1 {
          margin: 0;
          color: #be6d44;
          font-size: 20pt;
        }
        .business-info p {
          margin: 2px 0;
          font-size: 9pt;
          color: #666;
        }
        .report-info {
          text-align: right;
        }
        .report-info h2 {
          margin: 0;
          font-size: 14pt;
        }
        .report-info p {
          margin: 2px 0;
          font-size: 8pt;
          color: #777;
        }
        .date-range {
          font-weight: bold;
          margin-bottom: 15px;
          font-size: 10pt;
        }
        table {
          width: 100%;
          border-collapse: collapse;
          margin-bottom: 20px;
          table-layout: auto;
        }
        th {
          background-color: #f8f9fa;
          color: #333;
          font-weight: bold;
          text-align: left;
          padding: 8px;
          border: 1px solid #dee2e6;
          white-space: nowrap;
        }
        td {
          padding: 6px 8px;
          border: 1px solid #dee2e6;
          vertical-align: top;
          word-wrap: break-word;
          max-width: 200px;
        }
        tr:nth-child(even) {
          background-color: #fafafa;
        }
        .total-row {
          background-color: #fcf8e3 !important;
          font-weight: bold;
        }
        .text-right {
          text-align: right;
        }
        .summary-box {
          background-color: #f8f9fa;
          padding: 15px;
          border-radius: 5px;
          border-left: 4px solid #be6d44;
          margin-top: 20px;
          page-break-inside: avoid;
        }
        .footer {
          margin-top: 30px;
          text-align: center;
          font-size: 8pt;
          color: #999;
          border-top: 1px solid #eee;
          padding-top: 10px;
        }
        /* Handle landscape if there are many columns */
        @media print {
          ${report.headers.length > 7 ? '@page { size: landscape; }' : ''}
          .no-print {
            display: none;
          }
          table {
            page-break-inside: auto;
          }
          tr {
            page-break-inside: avoid;
            page-break-after: auto;
          }
          thead {
            display: table-header-group;
          }
          tfoot {
            display: table-footer-group;
          }
        }
      </style>
    </head>
    <body>
      <div class="header">
        <div class="business-info">
          <h1>${businessSettings.businessName}</h1>
          <p>${businessSettings.address}</p>
          <p>Proprietor: ${businessSettings.proprietorName}</p>
          <p>Contact: ${businessSettings.phoneNumbers.join(', ')}</p>
        </div>
        <div class="report-info">
          <h2>${report.title}</h2>
          <p>Generated At: ${report.generatedAt}</p>
        </div>
      </div>

      ${report.dateRange ? `
        <div class="date-range">
          Period: ${report.dateRange.from} to ${report.dateRange.to}
        </div>
      ` : ''}

      <table>
        <thead>
          <tr>
            ${report.headers.map(h => `<th>${h}</th>`).join('')}
          </tr>
        </thead>
        <tbody>
          ${report.rows.map(row => `
            <tr>
              ${row.map(cell => `<td>${cell}</td>`).join('')}
            </tr>
          `).join('')}
        </tbody>
        ${report.totals && report.totals.length > 0 ? `
          <tfoot>
            ${report.totals.map(total => `
              <tr class="total-row">
                <td colspan="${report.headers.length - 1}" class="text-right">${total.label}</td>
                <td>${total.value}</td>
              </tr>
            `).join('')}
          </tfoot>
        ` : ''}
      </table>

      ${report.summary ? `
        <div class="summary-box">
          <strong>Summary</strong>
          <p>${report.summary}</p>
        </div>
      ` : ''}

      <div class="footer">
        © ${new Date().getFullYear()} ${businessSettings.businessName} | ScaleERP Inventory Management
      </div>
    </body>
    </html>
  `;

  // Create iframe and print
  const iframe = document.createElement('iframe');
  iframe.style.position = 'fixed';
  iframe.style.right = '0';
  iframe.style.bottom = '0';
  iframe.style.width = '0';
  iframe.style.height = '0';
  iframe.style.border = '0';
  document.body.appendChild(iframe);

  const doc = iframe.contentWindow?.document;
  if (doc) {
    doc.open();
    doc.write(htmlContent);
    doc.close();

    // Calculate a dynamic timeout based on row count to ensure large DOM tables are fully rendered
    const renderTimeout = Math.max(500, Math.min(5000, report.rows.length * 1.5));

    // Trigger print
    iframe.contentWindow?.focus();
    setTimeout(() => {
      iframe.contentWindow?.print();
      // Remove iframe after print dialog is closed (or at least triggered)
      setTimeout(() => {
        if (document.body.contains(iframe)) {
          document.body.removeChild(iframe);
        }
      }, 1000);
    }, renderTimeout);
  }
};
