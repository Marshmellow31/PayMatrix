import { describe, it, expect } from 'vitest';
import {
  validateRecurringTemplate,
  calculateNextOccurrence,
  generateOccurrenceId,
  getPendingOccurrences,
  formatDateIso,
} from './recurringTransactions.js';

describe('recurringTransactions module', () => {
  describe('validateRecurringTemplate', () => {
    it('accepts a valid recurring template', () => {
      const template = {
        title: 'Netflix Subscription',
        amountPaise: 49900,
        frequency: 'monthly',
        startDate: '2026-01-15',
        currency: 'INR',
      };
      const result = validateRecurringTemplate(template);
      expect(result.valid).toBe(true);
    });

    it('rejects invalid or non-object templates', () => {
      expect(validateRecurringTemplate(null).valid).toBe(false);
      expect(validateRecurringTemplate('invalid').valid).toBe(false);
    });

    it('rejects missing or empty title', () => {
      expect(
        validateRecurringTemplate({
          title: '   ',
          amountPaise: 1000,
          frequency: 'monthly',
          startDate: '2026-01-01',
        }).valid
      ).toBe(false);
    });

    it('rejects non-integer, zero, or negative amountPaise', () => {
      expect(
        validateRecurringTemplate({
          title: 'Rent',
          amountPaise: 0,
          frequency: 'monthly',
          startDate: '2026-01-01',
        }).valid
      ).toBe(false);

      expect(
        validateRecurringTemplate({
          title: 'Rent',
          amountPaise: -500,
          frequency: 'monthly',
          startDate: '2026-01-01',
        }).valid
      ).toBe(false);

      expect(
        validateRecurringTemplate({
          title: 'Rent',
          amountPaise: 150.75,
          frequency: 'monthly',
          startDate: '2026-01-01',
        }).valid
      ).toBe(false);
    });

    it('rejects unsupported frequency', () => {
      expect(
        validateRecurringTemplate({
          title: 'Gym',
          amountPaise: 200000,
          frequency: 'every_two_weeks',
          startDate: '2026-01-01',
        }).valid
      ).toBe(false);
    });

    it('rejects invalid dates or endDate earlier than startDate', () => {
      expect(
        validateRecurringTemplate({
          title: 'Gym',
          amountPaise: 200000,
          frequency: 'monthly',
          startDate: 'not-a-date',
        }).valid
      ).toBe(false);

      expect(
        validateRecurringTemplate({
          title: 'Gym',
          amountPaise: 200000,
          frequency: 'monthly',
          startDate: '2026-05-01',
          endDate: '2026-04-01',
        }).valid
      ).toBe(false);
    });
  });

  describe('calculateNextOccurrence', () => {
    it('correctly calculates daily interval', () => {
      const template = { frequency: 'daily', startDate: '2026-03-01' };
      const next = calculateNextOccurrence(template, '2026-03-01');
      expect(formatDateIso(next)).toBe('2026-03-02');
    });

    it('correctly calculates weekly interval', () => {
      const template = { frequency: 'weekly', startDate: '2026-03-01' };
      const next = calculateNextOccurrence(template, '2026-03-01');
      expect(formatDateIso(next)).toBe('2026-03-08');
    });

    it('correctly calculates biweekly interval', () => {
      const template = { frequency: 'biweekly', startDate: '2026-03-01' };
      const next = calculateNextOccurrence(template, '2026-03-01');
      expect(formatDateIso(next)).toBe('2026-03-15');
    });

    it('correctly calculates regular monthly interval', () => {
      const template = { frequency: 'monthly', startDate: '2026-01-15' };
      const next = calculateNextOccurrence(template, '2026-01-15');
      expect(formatDateIso(next)).toBe('2026-02-15');
    });

    it('clamps month-end dates accurately across non-leap year months', () => {
      const template = { frequency: 'monthly', startDate: '2025-01-31' };

      const feb = calculateNextOccurrence(template, '2025-01-31');
      expect(formatDateIso(feb)).toBe('2025-02-28');

      const mar = calculateNextOccurrence(template, feb);
      expect(formatDateIso(mar)).toBe('2025-03-31');

      const apr = calculateNextOccurrence(template, mar);
      expect(formatDateIso(apr)).toBe('2025-04-30');

      const may = calculateNextOccurrence(template, apr);
      expect(formatDateIso(may)).toBe('2025-05-31');
    });

    it('handles leap year month-end clamping (Feb 29)', () => {
      const template = { frequency: 'monthly', startDate: '2024-01-31' };
      const feb = calculateNextOccurrence(template, '2024-01-31');
      expect(formatDateIso(feb)).toBe('2024-02-29');

      const mar = calculateNextOccurrence(template, feb);
      expect(formatDateIso(mar)).toBe('2024-03-31');
    });

    it('handles yearly interval and leap year anchor day clamping', () => {
      const template = { frequency: 'yearly', startDate: '2024-02-29' };
      const nextYear = calculateNextOccurrence(template, '2024-02-29');
      // 2025 is not a leap year, so Feb 29 clamps to Feb 28
      expect(formatDateIso(nextYear)).toBe('2025-02-28');
    });

    it('returns null when next occurrence exceeds endDate', () => {
      const template = {
        frequency: 'monthly',
        startDate: '2026-01-01',
        endDate: '2026-03-01',
      };
      const feb = calculateNextOccurrence(template, '2026-01-01');
      expect(formatDateIso(feb)).toBe('2026-02-01');

      const mar = calculateNextOccurrence(template, feb);
      expect(formatDateIso(mar)).toBe('2026-03-01');

      const apr = calculateNextOccurrence(template, mar);
      expect(apr).toBeNull();
    });
  });

  describe('generateOccurrenceId', () => {
    it('creates a deterministic ID based on templateId and ISO date', () => {
      const id = generateOccurrenceId('tmpl_123', new Date('2026-05-15T00:00:00Z'));
      expect(id).toBe('rec_tmpl_123_2026-05-15');
    });
  });

  describe('getPendingOccurrences', () => {
    it('generates all occurrences up to cutoff date', () => {
      const template = {
        id: 'tmpl_rent',
        title: 'House Rent',
        amountPaise: 2500000,
        frequency: 'monthly',
        startDate: '2026-01-01',
      };

      const occurrences = getPendingOccurrences(template, '2026-03-15');
      expect(occurrences).toHaveLength(3);
      expect(occurrences.map((o) => o.date)).toEqual(['2026-01-01', '2026-02-01', '2026-03-01']);
      expect(occurrences[0].occurrenceId).toBe('rec_tmpl_rent_2026-01-01');
      expect(occurrences[0].amountPaise).toBe(2500000);
    });

    it('is idempotent and skips occurrences already present in existingOccurrenceIds', () => {
      const template = {
        id: 'tmpl_sub',
        title: 'Cloud Storage',
        amountPaise: 19900,
        frequency: 'monthly',
        startDate: '2026-01-01',
      };

      const existing = new Set(['rec_tmpl_sub_2026-01-01', 'rec_tmpl_sub_2026-02-01']);
      const pending = getPendingOccurrences(template, '2026-04-01', existing);

      expect(pending).toHaveLength(2);
      expect(pending.map((p) => p.date)).toEqual(['2026-03-01', '2026-04-01']);
    });

    it('stops generating occurrences beyond template endDate', () => {
      const template = {
        id: 'tmpl_term',
        title: 'Gym 3-Month Plan',
        amountPaise: 300000,
        frequency: 'monthly',
        startDate: '2026-01-01',
        endDate: '2026-02-15',
      };

      const pending = getPendingOccurrences(template, '2026-06-01');
      expect(pending.map((p) => p.date)).toEqual(['2026-01-01', '2026-02-01']);
    });
  });
});
