import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { json2csv } from 'json-2-csv';

/**
 * Export group expenses to PDF
 */
export const exportToPDF = (group, expenses, balances, logs = []) => {
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
    `${b.user?.name || 'Unknown'} (${b.user?.email || 'N/A'})`,
    (b.balance || 0) >= 0 ? `+ INR ${(b.balance || 0).toLocaleString()}` : `- INR ${Math.abs(b.balance || 0).toLocaleString()}`
  ]);

  autoTable(doc, {
    startY: 55,
    head: [['Member (ID)', 'Net Balance']],
    body: balanceData,
    theme: 'grid',
    headStyles: { fillStyle: 'F', fillColor: [0, 0, 0], textColor: [255, 255, 255] },
    alternateRowStyles: { fillColor: [248, 248, 248] },
  });

  // Expenses Section
  let nextY = (doc.lastAutoTable?.finalY || 55) + 15;
  doc.setFontSize(14);
  doc.text('Detailed Transactions', 14, nextY);

  const expenseData = expenses.map((e) => [
    new Date(e.createdAt || e.date).toLocaleDateString(),
    e.title || 'Untitled Expense',
    e.category,
    e.paidByName || e.paidBy?.name || 'Member',
    `INR ${(e.amount || 0).toLocaleString()}`
  ]);

  autoTable(doc, {
    startY: nextY + 5,
    head: [['Date', 'Title', 'Category', 'Paid By', 'Amount']],
    body: expenseData,
    theme: 'striped',
    headStyles: { fillColor: [0, 0, 0], textColor: [255, 255, 255] },
  });

  // Logs Section (Activity Timeline)
  if (logs && logs.length > 0) {
    nextY = (doc.lastAutoTable?.finalY || nextY) + 15;
    
    // Check if we need a new page for logs
    if (nextY > 250) {
      doc.addPage();
      nextY = 20;
    }
    
    doc.setFontSize(14);
    doc.text('Activity Timeline', 14, nextY);

    const logData = logs.map((l) => [
      new Date(l.createdAt).toLocaleDateString(),
      new Date(l.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      l.message || 'Legacy action recorded'
    ]);

    autoTable(doc, {
      startY: nextY + 5,
      head: [['Date', 'Time', 'Activity Details']],
      body: logData,
      theme: 'plain',
      headStyles: { fillColor: [240, 240, 240], textColor: [0, 0, 0], fontStyle: 'bold' },
      columnStyles: {
        2: { columnWidth: 'auto' }
      }
    });
  }

  // Footer
  const pageCount = doc.internal.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.text(`Page ${i} of ${pageCount}`, doc.internal.pageSize.width / 2, doc.internal.pageSize.height - 10, { align: 'center' });
  }

  // Detect if we're on iOS Safari
  const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;

  if (isIOS) {
    // On iOS, window.location.href = url replaces the app with the PDF.
    // window.open(url, '_blank') is safer as it keeps the app alive in the background tab.
    const blob = doc.output('blob');
    const url = URL.createObjectURL(blob);
    window.open(url, '_blank');
  } else {
    doc.save(`${group.title.toLowerCase().replace(/\s+/g, '_')}_report.pdf`);
  }
};

/**
 * Export group expenses to CSV
 */
export const exportToCSV = (group, expenses) => {
  const data = expenses.map((e) => ({
    Date: new Date(e.createdAt || e.date).toLocaleDateString(),
    Title: e.title || 'Untitled',
    Category: e.category,
    'Paid By': e.paidByName || e.paidBy?.name || 'Member',
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

/**
 * Export full group data to JSON
 */
export const exportToJSON = (group, expenses, settlements) => {
  const data = {
    group: {
      id: group._id,
      title: group.title,
      category: group.category,
      admin: group.admin,
      createdAt: group.createdAt,
      status: group.status,
    },
    expenses: expenses.map(e => ({
      title: e.title,
      amount: e.amount,
      paidBy: e.paidByName || e.paidBy,
      date: e.createdAt,
      category: e.category,
      participants: e.participants
    })),
    settlements: settlements.map(s => ({
      from: s.payer,
      to: s.payee || s.recipient || s.to,
      amount: s.amount,
      date: s.createdAt,
      notes: s.notes
    })),
    exportedAt: new Date().toISOString()
  };

  try {
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `${group.title.toLowerCase().replace(/\s+/g, '_')}_full_export.json`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  } catch (err) {
    console.error('Error generating JSON:', err);
  }
};
