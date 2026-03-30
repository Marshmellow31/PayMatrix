import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { json2csv } from 'json-2-csv';

/**
 * Export group expenses to PDF
 */
export const exportToPDF = (group, expenses, balances) => {
  const doc = new jsPDF();
  const timestamp = new Date().toLocaleString();

  // Header - Digital Obsidian Black/White
  doc.setFontSize(22);
  doc.setTextColor(0, 0, 0);
  doc.text('PAYMATRIX', 14, 22);
  
  doc.setFontSize(10);
  doc.setTextColor(100, 100, 100);
  doc.text(`Financial Report for ${group.title}`, 14, 30);
  doc.text(`Generated on ${timestamp}`, 14, 35);

  // Summary Section
  doc.setFontSize(14);
  doc.setTextColor(0, 0, 0);
  doc.text('Balance Summary', 14, 50);

  const balanceData = balances.map((b) => [
    b.user?.name || 'Unknown',
    (b.balance || 0) >= 0 ? `+ INR ${(b.balance || 0).toLocaleString()}` : `- INR ${Math.abs(b.balance || 0).toLocaleString()}`
  ]);

  autoTable(doc, {
    startY: 55,
    head: [['Member', 'Net Balance']],
    body: balanceData,
    theme: 'grid',
    headStyles: { fillStyle: 'F', fillColor: [0, 0, 0], textColor: [255, 255, 255] },
    alternateRowStyles: { fillColor: [248, 248, 248] },
  });

  // Expenses Section
  const nextY = (doc.lastAutoTable?.finalY || 55) + 15;
  doc.setFontSize(14);
  doc.text('Detailed Transactions', 14, nextY);

  const expenseData = expenses.map((e) => [
    new Date(e.date).toLocaleDateString(),
    e.title || 'Untitled Expense',
    e.category,
    e.paidBy?.name || 'Unknown',
    `INR ${e.amount.toLocaleString()}`
  ]);

  autoTable(doc, {
    startY: nextY + 5,
    head: [['Date', 'Title', 'Category', 'Paid By', 'Amount']],
    body: expenseData,
    theme: 'striped',
    headStyles: { fillColor: [0, 0, 0], textColor: [255, 255, 255] },
  });

  // Footer
  const pageCount = doc.internal.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.text(`Page ${i} of ${pageCount}`, doc.internal.pageSize.width / 2, doc.internal.pageSize.height - 10, { align: 'center' });
  }

  doc.save(`${group.title.toLowerCase().replace(/\s+/g, '_')}_report.pdf`);
};

/**
 * Export group expenses to CSV
 */
export const exportToCSV = (group, expenses) => {
  const data = expenses.map((e) => ({
    Date: new Date(e.date).toLocaleDateString(),
    Title: e.title || 'Untitled',
    Category: e.category,
    'Paid By': e.paidBy?.name || 'Unknown',
    Amount: e.amount,
    'Split Type': e.splitType,
  }));

  try {
    const csv = json2csv(data); // v5.x is synchronous by default
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    
    link.setAttribute('href', url);
    link.setAttribute('download', `${group.title.toLowerCase().replace(/\s+/g, '_')}_expenses.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  } catch (err) {
    console.error('Error generating CSV:', err);
  }
};
