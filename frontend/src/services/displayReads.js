import { getDocs, getDocsFromCache } from 'firebase/firestore';

// Display only: never use a cached response to authorize a financial mutation.
export async function getDisplayDocs(query, { cachedOnly = false } = {}) {
  if (cachedOnly) return getDocsFromCache(query);
  const request = getDocs(query);
  let timer;
  try {
    const response = await Promise.race([
      request,
      new Promise((resolve) => {
        timer = setTimeout(() => resolve(null), 1500);
      }),
    ]);
    if (response) return response;
    const cached = await getDocsFromCache(query);
    // An empty local query may mean it has never been downloaded. Do not turn
    // missing financial history into a successful zero balance.
    if (cached.empty) return await request;
    request
      .then((fresh) => {
        if (!fresh.metadata?.fromCache && typeof window !== 'undefined') {
          window.dispatchEvent(new Event('paymatrix:display-refreshed'));
        }
      })
      .catch(() => {});
    return cached;
  } finally {
    clearTimeout(timer);
  }
}
