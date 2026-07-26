export const TRIAL_MEMBERS = [
  { id: 'you', name: 'You', initials: 'YO', avatar: '🦊', color: 'bg-orange-200 text-orange-950' },
  { id: 'maya', name: 'Maya', initials: 'MA', avatar: '🐨', color: 'bg-amber-300 text-amber-950' },
  { id: 'leo', name: 'Leo', initials: 'LE', avatar: '🐳', color: 'bg-sky-300 text-sky-950' },
];

export const TRIAL_FEATURES = [
  {
    eyebrow: '01 / Capture',
    title: 'Scan a receipt in seconds',
    body: 'AI reads the bill and prepares the split for you.',
    icon: 'scan',
  },
  {
    eyebrow: '02 / Understand',
    title: 'See who owes whom',
    body: 'Balances are simplified into the fewest possible payments.',
    icon: 'chart',
  },
  {
    eyebrow: '03 / Finish',
    title: 'Settle with confidence',
    body: 'Generate a ready-to-scan UPI QR with the amount filled in.',
    icon: 'qr',
  },
  {
    eyebrow: '04 / Stay synced',
    title: 'Everyone sees the same truth',
    body: 'Changes sync across devices, even when your connection drops.',
    icon: 'sync',
  },
];

export const TRIAL_GROUP = {
  name: 'Goa Weekend',
  subtitle: '3 members · shared in real time',
  total: 4860,
  originalBalances: { you: 0, maya: 0, leo: 0 },
  settledBalances: { you: 420, maya: -180, leo: -240 },
};
