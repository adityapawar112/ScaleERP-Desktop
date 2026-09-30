import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { ReportData } from '../types/reports';
import { BusinessSettings } from '../context/AppContext';
import { getCurrentDateString } from './excelExport';

/**
 * Generates and downloads a clean, professional PDF report directly from data.
 * Formatted to exactly match the printer-friendly layout without header overflow.
 * Optimized for large datasets (5000+ entries) using virtual canvas rendering.
 */
export const exportReportToPdf = async (
  report: ReportData,
  businessSettings: BusinessSettings,
  filename?: string
): Promise<void> => {
  try {
    const fileName = filename || `${report.title.replace(/\s+/g, '_')}_${getCurrentDateString()}.pdf`;
    
    // Choose orientation based on column count
    const orientation = report.headers.length > 6 ? 'landscape' : 'portrait';
    const doc = new jsPDF({ orientation, unit: 'mm', format: 'a4' });
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();

    // 1. Business Info (Left Side - Stacked to prevent overflow)
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(20);
    doc.setTextColor(190, 109, 68); // #be6d44
    doc.text(businessSettings.businessName || 'Business Name', 14, 20);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(102, 102, 102); // #666
    doc.text(businessSettings.address || '', 14, 26);
    doc.text(`Proprietor: ${businessSettings.proprietorName || 'N/A'}`, 14, 31);
    doc.text(`Contact: ${businessSettings.phoneNumbers?.length ? businessSettings.phoneNumbers.join(', ') : 'N/A'}`, 14, 36);

    // 2. Report Info (Right Side)
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(14);
    doc.setTextColor(51, 51, 51); // #333
    doc.text(report.title, pageWidth - 14, 20, { align: 'right' });

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(119, 119, 119); // #777
    doc.text(`Generated At: ${report.generatedAt}`, pageWidth - 14, 26, { align: 'right' });

    // 3. Divider Line
    doc.setDrawColor(190, 109, 68); // #be6d44
    doc.setLineWidth(0.7);
    doc.line(14, 41, pageWidth - 14, 41);

    // 4. Date Range Block
    let startY = 49;
    if (report.dateRange) {
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(10);
      doc.setTextColor(51, 51, 51); // #333
      doc.text(`Period: ${report.dateRange.from} to ${report.dateRange.to}`, 14, startY);
      doc.setFont('helvetica', 'normal');
      startY += 8;
    } else {
      startY = 49;
    }

    // Prepare Footer / Totals Rows
    const footRows: string[][] = [];
    if (report.totals && report.totals.length > 0) {
      report.totals.forEach(t => {
        const row = new Array(report.headers.length).fill('');
        if (report.headers.length > 1) {
          row[report.headers.length - 2] = t.label;
          row[report.headers.length - 1] = String(t.value);
        } else {
          row[0] = `${t.label}: ${t.value}`;
        }
        footRows.push(row);
      });
    }

    // 5. Generate Table (Matching Print layout styling)
    autoTable(doc, {
      startY,
      head: [report.headers],
      body: report.rows.map(row => row.map(cell => (cell !== null && cell !== undefined ? String(cell) : ''))),
      foot: footRows.length > 0 ? footRows : undefined,
      showFoot: 'lastPage',
      styles: {
        fontSize: 9,
        cellPadding: 3,
        overflow: 'linebreak',
        lineWidth: 0.2,
        lineColor: [222, 226, 230], // #dee2e6
        textColor: [51, 51, 51],    // #333
        font: 'helvetica'
      },
      headStyles: {
        fillColor: [248, 249, 250], // #f8f9fa
        textColor: [51, 51, 51],    // #333
        fontStyle: 'bold',
        lineWidth: 0.2,
        lineColor: [222, 226, 230]
      },
      footStyles: {
        fillColor: [252, 248, 227], // #fcf8e3 (Soft warm yellow for totals)
        textColor: [51, 51, 51],
        fontStyle: 'bold',
        lineWidth: 0.2,
        lineColor: [222, 226, 230]
      },
      alternateRowStyles: {
        fillColor: [250, 250, 250]  // #fafafa
      },
      margin: { top: 15, right: 14, bottom: 25, left: 14 },
      didDrawPage: (data) => {
        // Page Footer
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(8);
        doc.setTextColor(153, 153, 153); // #999
        const footerText = `© ${new Date().getFullYear()} ${businessSettings.businessName} | ScaleERP Inventory Management`;
        doc.text(footerText, 14, pageHeight - 12);
        doc.text(`Page ${data.pageNumber}`, pageWidth - 14, pageHeight - 12, { align: 'right' });
      }
    });

    // 6. Summary Block (if present)
    const finalY = (doc as any).lastAutoTable?.finalY || startY + 10;
    if (report.summary) {
      const summaryY = finalY + 10;
      if (summaryY + 15 < pageHeight - 25) {
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(10);
        doc.setTextColor(51, 51, 51);
        doc.text('Summary', 14, summaryY);
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(9);
        doc.setTextColor(102, 102, 102);
        const splitSummary = doc.splitTextToSize(report.summary, pageWidth - 28);
        doc.text(splitSummary, 14, summaryY + 6);
      }
    }

    // 7. Download PDF File
    const blob = doc.output('blob');
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = fileName;
    link.style.display = 'none';

    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    // Clean up object URL
    setTimeout(() => {
      window.URL.revokeObjectURL(url);
    }, 1000);
  } catch (error) {
    console.error('Error generating PDF report:', error);
    throw new Error('Failed to generate PDF report');
  }
};
