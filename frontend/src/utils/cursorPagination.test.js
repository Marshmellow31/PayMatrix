import { describe, it, expect } from 'vitest';
import {
  compareCursorRecords,
  deduplicateById,
  isAfterCursor,
  paginateItems,
  PAGE_SIZES,
} from './cursorPagination.js';

describe('CursorPagination (Web)', () => {
  it('correctly compares records by createdAt descending with ID tiebreaker', () => {
    const a = { _id: 'doc_1', createdAt: '2026-01-01T10:00:00Z' };
    const b = { _id: 'doc_2', createdAt: '2026-01-01T12:00:00Z' };
    const c = { _id: 'doc_3', createdAt: '2026-01-01T10:00:00Z' };

    // b is newer than a -> b comes first (compare returns positive if a > b)
    expect(compareCursorRecords(a, b)).toBeGreaterThan(0);
    expect(compareCursorRecords(b, a)).toBeLessThan(0);

    // a and c have identical timestamp -> doc_3 > doc_1 descending
    expect(compareCursorRecords(a, c)).toBeGreaterThan(0);
    expect(compareCursorRecords(c, a)).toBeLessThan(0);
  });

  it('handles legacy records missing createdAt without loss and orders them at the end', () => {
    const items = [
      { _id: 'normal_1', createdAt: '2026-01-01T10:00:00Z' },
      { _id: 'legacy_b', createdAt: null },
      { _id: 'legacy_a' }, // missing createdAt completely
      { _id: 'normal_2', createdAt: '2026-01-02T10:00:00Z' },
    ];

    const sorted = [...items].sort(compareCursorRecords);
    expect(sorted.map((i) => i._id)).toEqual(['normal_2', 'normal_1', 'legacy_b', 'legacy_a']);
  });

  it('deduplicates records by ID while preserving first occurrence order', () => {
    const items = [
      { _id: 'id_1', title: 'First' },
      { _id: 'id_2', title: 'Second' },
      { _id: 'id_1', title: 'Duplicate First' },
      { _id: 'id_3', title: 'Third' },
    ];

    const deduplicated = deduplicateById(items);
    expect(deduplicated.length).toBe(3);
    expect(deduplicated.map((i) => i.title)).toEqual(['First', 'Second', 'Third']);
  });

  it('isAfterCursor correctly determines continuation', () => {
    const cursor = { _id: 'doc_m', createdAt: 1000000 };

    // Older item -> after cursor
    expect(isAfterCursor({ _id: 'doc_z', createdAt: 999999 }, cursor)).toBe(true);

    // Newer item -> not after cursor
    expect(isAfterCursor({ _id: 'doc_a', createdAt: 1000001 }, cursor)).toBe(false);

    // Same timestamp, lower ID -> after cursor
    expect(isAfterCursor({ _id: 'doc_a', createdAt: 1000000 }, cursor)).toBe(true);

    // Same timestamp, higher ID -> not after cursor
    expect(isAfterCursor({ _id: 'doc_z', createdAt: 1000000 }, cursor)).toBe(false);
  });

  it('paginates expenses with 50 initially, then 25 per page', () => {
    const records = Array.from({ length: 80 }, (_, i) => ({
      _id: `exp_${String(i).padStart(3, '0')}`,
      createdAt: 1000000 + i * 1000,
    }));

    // Page 1: Initial 50
    const page1 = paginateItems(records, { limit: PAGE_SIZES.EXPENSES.initial });
    expect(page1.items.length).toBe(50);
    expect(page1.hasMore).toBe(true);
    expect(page1.total).toBe(80);
    expect(page1.items[0]._id).toBe('exp_079'); // Newest first

    // Page 2: Next 25
    const page2 = paginateItems(records, {
      cursor: page1.nextCursor,
      limit: PAGE_SIZES.EXPENSES.page,
    });
    expect(page2.items.length).toBe(25);
    expect(page2.hasMore).toBe(true);
    expect(page2.items[0]._id).toBe('exp_029');

    // Page 3: Next 25 (only 5 remaining)
    const page3 = paginateItems(records, {
      cursor: page2.nextCursor,
      limit: PAGE_SIZES.EXPENSES.page,
    });
    expect(page3.items.length).toBe(5);
    expect(page3.hasMore).toBe(false);
    expect(page3.items[4]._id).toBe('exp_000');
  });

  it('paginates settlements with 30 initially, then 25 per page', () => {
    const settlements = Array.from({ length: 45 }, (_, i) => ({
      _id: `stl_${String(i).padStart(2, '0')}`,
      createdAt: 2000000 + i * 1000,
    }));

    const page1 = paginateItems(settlements, { limit: PAGE_SIZES.SETTLEMENTS.initial });
    expect(page1.items.length).toBe(30);
    expect(page1.hasMore).toBe(true);

    const page2 = paginateItems(settlements, {
      cursor: page1.nextCursor,
      limit: PAGE_SIZES.SETTLEMENTS.page,
    });
    expect(page2.items.length).toBe(15);
    expect(page2.hasMore).toBe(false);
  });

  it('handles empty input and single-item pagination gracefully', () => {
    const emptyResult = paginateItems([]);
    expect(emptyResult.items).toEqual([]);
    expect(emptyResult.hasMore).toBe(false);
    expect(emptyResult.nextCursor).toBeNull();

    const singleResult = paginateItems([{ _id: 'only_1', createdAt: 500 }]);
    expect(singleResult.items.length).toBe(1);
    expect(singleResult.hasMore).toBe(false);
    expect(singleResult.nextCursor.id).toBe('only_1');
  });
});
