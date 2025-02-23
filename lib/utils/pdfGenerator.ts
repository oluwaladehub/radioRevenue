import { jsPDF } from 'jspdf';
import type { Database } from '@/lib/database.types';

type InvoiceItem = Database['public']['Tables']['invoice_items']['Row'] & {
  job: Database['public']['Tables']['jobs']['Row'];
};

type Invoice = {
  id: string;
  created_at: string;
  due_date: string;
  status: string;
  client: Database['public']['Tables']['clients']['Row'];
  invoice_items: InvoiceItem[];
}

const formatDate = (date: string) => {
  return new Date(date).toLocaleDateString('en-NG', {
    day: '2-digit',
    month: 'short',
    year: 'numeric'
  });
};

const formatCurrency = (amount: number) => {
  // Format with commas but use NGN instead of the currency symbol
  return `NGN ${amount.toLocaleString('en-NG', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  })}`;
};

const generateInvoiceNumber = (id: string) => {
  // Take last 6 characters of the ID and pad with zeros if needed
  const lastSix = id.slice(-6).padStart(6, '0');
  return `INV${lastSix}`;
};

export async function downloadInvoicePDF(invoice: Invoice): Promise<void> {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.width;
  const margin = 20;
  const contentWidth = pageWidth - (margin * 2);
  
  // Set default font
  doc.setFont('helvetica');
  
  // Company Info Section (Top Left)
  doc.setFontSize(24);
  doc.setFont('helvetica', 'bold');
  doc.text('Your Company', margin, 25);
  
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text([
    'Lagos, Nigeria',
    'contact@yourcompany.com',
    '+234 123 456 7890'
  ], margin, 35);
  
  // Invoice Details (Top Right)
  const invoiceNumber = generateInvoiceNumber(invoice.id);
  const rightAlign = pageWidth - margin;
  
  doc.setFontSize(20);
  doc.setFont('helvetica', 'bold');
  doc.text('INVOICE', rightAlign, 25, { align: 'right' });
  
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text([
    `Invoice No: ${invoiceNumber}`,
    `Date: ${formatDate(invoice.created_at)}`,
    `Due Date: ${formatDate(invoice.due_date)}`,
    `Status: ${invoice.status.toUpperCase()}`
  ], rightAlign, 35, { align: 'right' });
  
  // Divider
  doc.setDrawColor(220, 220, 220);
  doc.line(margin, 55, pageWidth - margin, 55);
  
  // Bill To Section
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.text('BILL TO', margin, 70);
  
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.text([
    invoice.client.name,
    invoice.client.address || '',
    invoice.client.email || ''
  ], margin, 80);
  
  // Table Header
  const tableTop = 105;
  doc.setFillColor(247, 248, 250);
  doc.rect(margin, tableTop - 5, contentWidth, 10, 'F');
  
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.text('Description', margin + 5, tableTop);
  doc.text('Amount', rightAlign - 5, tableTop, { align: 'right' });
  
  // Table Content
  let yPosition = tableTop + 10;
  doc.setFont('helvetica', 'normal');
  
  let total = 0;
  invoice.invoice_items.forEach((item, index) => {
    // Subtle alternating background
    if (index % 2 === 0) {
      doc.setFillColor(252, 252, 252);
      doc.rect(margin, yPosition - 5, contentWidth, 10, 'F');
    }
    
    doc.text(item.job.title, margin + 5, yPosition);
    const amount = item.amount || 0;
    doc.text(formatCurrency(amount), rightAlign - 5, yPosition, { align: 'right' });
    total += amount;
    yPosition += 10;
  });
  
  // Total Section
  const totalSection = yPosition + 10;
  doc.setDrawColor(220, 220, 220);
  doc.line(margin, yPosition + 5, pageWidth - margin, yPosition + 5);
  
  doc.setFont('helvetica', 'bold');
  doc.text('Total', pageWidth - margin - 80, totalSection);
  doc.text(formatCurrency(total), rightAlign - 5, totalSection, { align: 'right' });
  
  // Payment Terms
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  const termsY = totalSection + 30;
  doc.text('Payment Terms', margin, termsY);
  doc.setFont('helvetica', 'normal');
  doc.text('Please make payment within 14 days of invoice date.', margin, termsY + 7);
  
  // Footer
  const footerY = doc.internal.pageSize.height - 20;
  doc.setFontSize(8);
  doc.setTextColor(128, 128, 128);
  doc.text('Thank you for your business!', pageWidth / 2, footerY, { align: 'center' });
  
  // Save the PDF
  doc.save(`${invoiceNumber}.pdf`);
}
