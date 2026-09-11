/**
 * canvasStoryGenerator.js
 * Generates a 1080x1920 (9:16) image card rendered on HTML5 Canvas for sharing to Instagram Stories / WhatsApp
 */
export const generateStoryImage = async (wrappedData) => {
  if (typeof document === 'undefined') return null;

  const canvas = document.createElement('canvas');
  canvas.width = 1080;
  canvas.height = 1920;
  const ctx = canvas.getContext('2d');

  // Background Gradient
  const grad = ctx.createLinearGradient(0, 0, 1080, 1920);
  grad.addColorStop(0, '#0f172a'); // slate-900
  grad.addColorStop(0.5, '#064e3b'); // emerald-900
  grad.addColorStop(1, '#022c22'); // mint-950
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 1080, 1920);

  // Decorative Circles
  ctx.fillStyle = 'rgba(16, 185, 129, 0.12)';
  ctx.beginPath();
  ctx.arc(950, 200, 350, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = 'rgba(52, 211, 153, 0.08)';
  ctx.beginPath();
  ctx.arc(100, 1700, 400, 0, Math.PI * 2);
  ctx.fill();

  // Branding
  ctx.fillStyle = '#10B981';
  ctx.font = 'bold 46px sans-serif';
  ctx.fillText('💎 paymatrix wrapped', 90, 150);

  // Group Name
  ctx.fillStyle = '#FFFFFF';
  ctx.font = '900 80px sans-serif';
  ctx.fillText(wrappedData.groupTitle, 90, 280);

  // Helper function to render cards
  const drawCard = (x, y, w, h, tag, val, sub) => {
    ctx.fillStyle = 'rgba(255, 255, 255, 0.06)';
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.12)';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.roundRect(x, y, w, h, 36);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = '#34D399';
    ctx.font = 'bold 30px sans-serif';
    ctx.fillText(tag, x + 50, y + 75);

    ctx.fillStyle = '#FFFFFF';
    ctx.font = '900 64px sans-serif';
    ctx.fillText(val, x + 50, y + 165);

    ctx.fillStyle = '#CBD5E1';
    ctx.font = '400 32px sans-serif';
    ctx.fillText(sub, x + 50, y + 230);
  };

  // Card 1: Total Spent
  drawCard(
    90, 380, 900, 280,
    'TOTAL GROUP SPEND',
    `${wrappedData.currencySymbol}${wrappedData.totalSpent.toLocaleString()}`,
    `${wrappedData.expenseCount} shared bills logged together`
  );

  // Card 2: MVP Upfront Hero
  drawCard(
    90, 700, 900, 280,
    'UPFRONT HERO (MVP)',
    wrappedData.topPayerName,
    `Covered ${wrappedData.topPayerPercentage}% (${wrappedData.currencySymbol}${wrappedData.topPayerAmount.toLocaleString()}) of initial expenses!`
  );

  // Card 3: Debt Simplification Savings
  drawCard(
    90, 1020, 900, 280,
    'PAYMATRIX DEBT SIMPLIFIER',
    `${wrappedData.transactionsSaved} Payments Saved`,
    'Eliminated debt loops into minimal settlements'
  );

  // Footer
  ctx.fillStyle = '#94A3B8';
  ctx.font = '500 36px sans-serif';
  ctx.fillText('Split & settled with zero drama at paymatrix.app', 90, 1780);

  return new Promise((resolve) => {
    canvas.toBlob((blob) => resolve(blob), 'image/png');
  });
};

export default generateStoryImage;
