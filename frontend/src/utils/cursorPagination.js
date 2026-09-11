/**
 * Deterministic cursor pagination for PayMatrix.
 *
 * Requirements:
 * - Expenses: newest 50 initially, then 25 per page.
 * - Settlements: newest 30 initially, then 25 per page.
 * - Audit logs: newest 50 initially, then 50 per page.
 * - Notifications: newest 30 initially, then 30 per page.
 * - Use createdAt descending with document ID as deterministic secondary cursor.
 * - Handle legacy records missing createdAt without losing or duplicating records.
 * - Explicit "Load earlier" (no automatic infinite scroll).
 */

export const PAGE_SIZES = Object.freeze({
  EXPENSES: { initial: 50, page: 25 },
  SETTLEMENTS: { initial: 30, page: 25 },
  LOGS: { initial: 50, page: 50 },
  NOTIFICATIONS: { initial: 30, page: 30 },
});

export function getCreatedAtMillis(item) {
  if (!item) return 0;
  const raw = item.createdAt ?? item.updatedAt ?? item.date;
  if (!raw) return 0;
  if (typeof raw === 'number') return Number.isFinite(raw) ? raw : 0;
  if (typeof raw.toMillis === 'function') return raw.toMillis();
  if (typeof raw.toDate === 'function') return raw.toDate().getTime();
  if (raw.seconds !== undefined) {
    return raw.seconds * 1000 + Math.floor((raw.nanoseconds || 0) / 1000000);
  }
  const parsed = new Date(raw).getTime();
  return Number.isFinite(parsed) ? parsed : 0;
}

export function getItemId(item) {
  if (!item) return '';
  return String(item._id ?? item.id ?? '');
}

/**
 * Deterministic comparison:
 * 1. Primary: createdAt descending (newest first; legacy/missing timestamps = 0 come last).
 * 2. Secondary: document ID descending (deterministic secondary cursor tiebreaker).
 */
export function compareCursorRecords(a, b) {
  const timeA = getCreatedAtMillis(a);
  const timeB = getCreatedAtMillis(b);
  if (timeA !== timeB) {
    return timeB - timeA;
  }
  const idA = getItemId(a);
  const idB = getItemId(b);
  return idB.localeCompare(idA);
}

/**
 * Deduplicate items by ID while preserving order.
 */
export function deduplicateById(items = []) {
  const seen = new Set();
  const result = [];
  for (const item of items) {
    const id = getItemId(item);
    if (!id || !seen.has(id)) {
      if (id) seen.add(id);
      result.push(item);
    }
  }
  return result;
}

/**
 * Check if candidate item is strictly after cursor item in descending order.
 */
export function isAfterCursor(candidate, cursor) {
  if (!cursor) return true;
  const cursorTime = typeof cursor === 'object' ? getCreatedAtMillis(cursor) : 0;
  const cursorId = typeof cursor === 'object' ? getItemId(cursor) : String(cursor);

  const candidateTime = getCreatedAtMillis(candidate);
  const candidateId = getItemId(candidate);

  if (candidateTime < cursorTime) return true;
  if (candidateTime > cursorTime) return false;
  return candidateId.localeCompare(cursorId) < 0;
}

/**
 * Paginate items in-memory or from local snapshot cache.
 * Preserves legacy records missing createdAt at the end of the chronological stream.
 */
export function paginateItems(allItems = [], { cursor = null, limit = 50 } = {}) {
  const deduplicated = deduplicateById(allItems);
  const sorted = [...deduplicated].sort(compareCursorRecords);

  let startIndex = 0;
  if (cursor) {
    const cursorId = typeof cursor === 'object' ? getItemId(cursor) : String(cursor);
    const cursorTime = typeof cursor === 'object' ? getCreatedAtMillis(cursor) : null;

    const matchIdx = sorted.findIndex((item) => {
      if (cursorTime !== null) {
        return getCreatedAtMillis(item) === cursorTime && getItemId(item) === cursorId;
      }
      return getItemId(item) === cursorId;
    });

    if (matchIdx !== -1) {
      startIndex = matchIdx + 1;
    } else {
      // If exact cursor not found, find first item strictly after cursor
      const nextIdx = sorted.findIndex((item) => isAfterCursor(item, cursor));
      startIndex = nextIdx !== -1 ? nextIdx : sorted.length;
    }
  }

  const pageItems = sorted.slice(startIndex, startIndex + limit);
  const nextItem = pageItems[pageItems.length - 1] || null;
  const nextCursor = nextItem
    ? { createdAt: getCreatedAtMillis(nextItem), id: getItemId(nextItem) }
    : null;
  const hasMore = startIndex + limit < sorted.length;

  return {
    items: pageItems,
    nextCursor,
    hasMore,
    total: sorted.length,
  };
}
