# Phase 2: Trip Financial Wrapped Engine

> **Feature:** Spotify Wrapped-style social recap for group trips, housemates, and events  
> **Output:** High-resolution 1080x1920px (9:16) image generated on-device via HTML5 Canvas  
> **Sharing:** 1-tap direct share to Instagram Stories, WhatsApp, and LinkedIn via Web Share API & Android Send Intent

---

## 1. Metrics & Story Calculation Engine

The generator computes aggregate group metrics without querying new Firestore data:

```javascript
// frontend/src/utils/wrappedEngine.js
export const calculateGroupWrapped = (group, expenses, settlements, members) => {
  const totalSpent = expenses.reduce((sum, e) => sum + (e.amount || 0), 0);
  const expenseCount = expenses.length;

  // 1. Upfront Hero (Who paid the most money upfront)
  const paidByMap = {};
  expenses.forEach((e) => {
    paidByMap[e.paidBy] = (paidByMap[e.paidBy] || 0) + e.amount;
  });
  const topPayerId = Object.keys(paidByMap).sort((a, b) => paidByMap[b] - paidByMap[a])[0];
  const topPayer = members.find((m) => m.id === topPayerId) || { name: 'Unknown' };

  // 2. Debt Simplification Savings
  // Raw pairings vs actual settled payments
  const rawPairingsCount = Math.max(1, (members.length * (members.length - 1)) / 2);
  const simplifiedTransactionsCount = settlements.length || Math.max(1, members.length - 1);
  const transactionsSaved = Math.max(0, rawPairingsCount - simplifiedTransactionsCount);

  // 3. Category Breakdown
  const categoryMap = {};
  expenses.forEach((e) => {
    const cat = e.category || 'Other';
    categoryMap[cat] = (categoryMap[cat] || 0) + e.amount;
  });
  const topCategory = Object.keys(categoryMap).sort((a, b) => categoryMap[b] - categoryMap[a])[0] || 'General';

  return {
    groupTitle: group.name || 'Our Group Trip',
    currencySymbol: group.currencySymbol || '€',
    totalSpent,
    expenseCount,
    topPayerName: topPayer.name,
    topPayerAmount: paidByMap[topPayerId] || 0,
    topPayerPercentage: totalSpent > 0 ? Math.round(((paidByMap[topPayerId] || 0) / totalSpent) * 100) : 0,
    transactionsSaved,
    topCategory,
  };
};
```

---

## 2. Canvas Story Exporter (1080x1920)

```javascript
// frontend/src/utils/canvasStoryGenerator.js
export const generateStoryImage = async (wrappedData) => {
  const canvas = document.createElement('canvas');
  canvas.width = 1080;
  canvas.height = 1920;
  const ctx = canvas.getContext('2d');

  // 1. Dark Neon Background Gradient
  const grad = ctx.createLinearGradient(0, 0, 1080, 1920);
  grad.addColorStop(0, '#0F172A'); // Slate 900
  grad.addColorStop(0.5, '#064E3B'); // Emerald 900
  grad.addColorStop(1, '#022C22'); // Dark Mint
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 1080, 1920);

  // 2. Geometric Accent Orbs
  ctx.fillStyle = 'rgba(16, 185, 129, 0.15)';
  ctx.beginPath();
  ctx.arc(900, 200, 350, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = 'rgba(52, 211, 153, 0.1)';
  ctx.beginPath();
  ctx.arc(100, 1600, 450, 0, Math.PI * 2);
  ctx.fill();

  // 3. Header Branding
  ctx.fillStyle = '#10B981';
  ctx.font = 'bold 44px sans-serif';
  ctx.fillText('💎 paymatrix wrapped', 90, 140);

  // 4. Trip Title
  ctx.fillStyle = '#FFFFFF';
  ctx.font = '900 82px sans-serif';
  ctx.fillText(wrappedData.groupTitle, 90, 260);

  // 5. Stat Card 1: Total Spent
  drawMetricCard(ctx, 90, 360, 900, 280, 'TOTAL SPENT TOGETHER', `${wrappedData.currencySymbol}${wrappedData.totalSpent.toLocaleString()}`, `${wrappedData.expenseCount} shared expenses logged`);

  // 6. Stat Card 2: MVP Upfront Hero
  drawMetricCard(ctx, 90, 680, 900, 280, 'THE UPFRONT HERO (MVP)', wrappedData.topPayerName, `Covered ${wrappedData.topPayerPercentage}% (${wrappedData.currencySymbol}${wrappedData.topPayerAmount.toLocaleString()}) of upfront bills!`);

  // 7. Stat Card 3: Debt Simplification Miracle
  drawMetricCard(ctx, 90, 1000, 900, 280, 'PAYMATRIX DEBT SIMPLIFIER', `${wrappedData.transactionsSaved} Transfers Saved`, 'Collapsed chaotic IOUs into minimum payments');

  // 8. Footer Watermark & Mascot Invitation
  ctx.fillStyle = '#94A3B8';
  ctx.font = '500 36px sans-serif';
  ctx.fillText('Settled with zero drama at paymatrix.app', 90, 1780);

  return new Promise((resolve) => {
    canvas.toBlob((blob) => resolve(blob), 'image/png');
  });
};

function drawMetricCard(ctx, x, y, w, h, label, mainValue, subtext) {
  // Glassmorphism Card
  ctx.fillStyle = 'rgba(255, 255, 255, 0.07)';
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.15)';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, 36);
  ctx.fill();
  ctx.stroke();

  // Label
  ctx.fillStyle = '#34D399';
  ctx.font = 'bold 30px sans-serif';
  ctx.fillText(label, x + 50, y + 75);

  // Main Metric
  ctx.fillStyle = '#FFFFFF';
  ctx.font = '900 68px sans-serif';
  ctx.fillText(mainValue, x + 50, y + 170);

  // Subtext
  ctx.fillStyle = '#CBD5E1';
  ctx.font = '400 32px sans-serif';
  ctx.fillText(subtext, x + 50, y + 230);
}
```
