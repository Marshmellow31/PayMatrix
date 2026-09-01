import { describe, expect, it } from 'vitest';
import { buildAnalyticsSnapshot } from './analyticsEngine.js';

const now = new Date(2026, 7, 31, 12);
const expense = (overrides = {}) => ({
  _id: 'expense-1',
  title: 'Dinner',
  date: '2026-08-31',
  category: 'Food',
  groupId: 'group-1',
  groupName: 'Goa Weekend',
  amountPaise: 100000,
  splits: [
    { user: 'me', amountPaise: 40000 },
    { user: 'friend', amountPaise: 60000 },
  ],
  status: 'active',
  ...overrides,
});

describe('buildAnalyticsSnapshot', () => {
  it('uses the current user share rather than the full group expense', () => {
    const result = buildAnalyticsSnapshot({ expenses: [expense()], userId: 'me', days: 7, now });

    expect(result.period.totalPaise).toBe(40000);
    expect(result.categories[0].amountPaise).toBe(40000);
    expect(result.groups[0].amountPaise).toBe(40000);
  });

  it('compares equal calendar periods and fills days without spending', () => {
    const result = buildAnalyticsSnapshot({
      expenses: [
        expense({ date: '2026-08-31', splits: [{ user: 'me', amountPaise: 30000 }] }),
        expense({
          _id: 'previous',
          date: '2026-08-24',
          splits: [{ user: 'me', amountPaise: 20000 }],
        }),
      ],
      userId: 'me',
      days: 7,
      now,
    });

    expect(result.period.previousTotalPaise).toBe(20000);
    expect(result.period.deltaPaise).toBe(10000);
    expect(result.period.percentChange).toBe(50);
    expect(result.trend).toHaveLength(7);
    expect(result.trend.filter((point) => point.amountPaise === 0)).toHaveLength(6);
  });

  it('excludes deleted and archived expenses consistently', () => {
    const result = buildAnalyticsSnapshot({
      expenses: [expense({ status: 'deleted' }), expense({ _id: 'archived', status: 'archived' })],
      userId: 'me',
      days: 30,
      now,
    });

    expect(result.period.totalPaise).toBe(0);
    expect(result.categories).toEqual([]);
    expect(result.groups).toEqual([]);
  });

  it('keeps percentage undefined when the previous period is zero', () => {
    const result = buildAnalyticsSnapshot({ expenses: [expense()], userId: 'me', days: 30, now });

    expect(result.period.previousTotalPaise).toBe(0);
    expect(result.period.percentChange).toBeNull();
    expect(result.period.direction).toBe('up');
  });

  it('uses weekly buckets for a 90 day view', () => {
    const result = buildAnalyticsSnapshot({ expenses: [expense()], userId: 'me', days: 90, now });

    expect(result.trend).toHaveLength(13);
    expect(result.trend.reduce((sum, point) => sum + point.amountPaise, 0)).toBe(40000);
  });
});
