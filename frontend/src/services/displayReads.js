import { getDocs, getDocsFromCache } from 'firebase/firestore';
import { instrumentation } from './instrumentation.js';

// Display only: never use a cached response to authorize a financial mutation.
export async function getDisplayDocs(query, { cachedOnly = false } = {}) {
  const startTime = typeof performance !== 'undefined' ? performance.now() : Date.now();
  const signature = query?._query?.path?.canonicalString?.() || 'displayDocs';

  const track = (snap, fromCache) => {
    const elapsed = Math.round(
      (typeof performance !== 'undefined' ? performance.now() : Date.now()) - startTime
    );
    const count = snap?.docs?.length ?? 1;
    instrumentation.recordRead({
      count,
      fromCache: Boolean(fromCache ?? snap?.metadata?.fromCache),
      latencyMs: elapsed,
      signature,
    });
  };

  if (cachedOnly) {
    const cached = await getDocsFromCache(query);
    track(cached, true);
    return cached;
  }
  const request = getDocs(query);
  let timer;
  try {
    const response = await Promise.race([
      request,
      new Promise((resolve) => {
        timer = setTimeout(() => resolve(null), 1500);
      }),
    ]);
    if (response) {
      track(response, response.metadata?.fromCache);
      return response;
    }
    const cached = await getDocsFromCache(query);
    // An empty local query may mean it has never been downloaded. Do not turn
    // missing financial history into a successful zero balance.
    if (cached.empty) {
      const fresh = await request;
      track(fresh, fresh.metadata?.fromCache);
      return fresh;
    }
    track(cached, true);
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
