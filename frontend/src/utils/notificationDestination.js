const TRUSTED_ORIGINS = new Set(['https://paymatrixapp.online', 'https://pay-matrix.vercel.app']);

export function notificationDestination({ type, groupId, url } = {}) {
  if (type === 'friend_request' || type === 'friend_accepted') return '/friends';
  if (groupId) return `/groups/${encodeURIComponent(groupId)}`;
  try {
    const parsed = new URL(url || '/dashboard', 'https://paymatrixapp.online');
    if (!TRUSTED_ORIGINS.has(parsed.origin)) return '/dashboard';
    if (/^\/(friends|groups|dashboard|activity)(\/[^/]+)?$/.test(parsed.pathname)) {
      return parsed.pathname + parsed.search;
    }
  } catch {
    /* Unknown notifications open the dashboard. */
  }
  return '/dashboard';
}
