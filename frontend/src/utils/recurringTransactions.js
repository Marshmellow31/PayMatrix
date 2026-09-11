/**
 * Recurring Personal Transaction Utility
 *
 * Provides pure date calculation, month-end clamping, leap year handling,
 * deterministic occurrence ID generation, template validation, and idempotent
 * generation of pending transactions.
 */

export const RECURRING_FREQUENCIES = Object.freeze([
  'daily',
  'weekly',
  'biweekly',
  'monthly',
  'yearly',
]);

/**
 * Validates a recurring transaction template.
 * @param {Object} template
 * @returns {{ valid: boolean, error?: string }}
 */
export function validateRecurringTemplate(template) {
  if (!template || typeof template !== 'object') {
    return { valid: false, error: 'Template must be an object' };
  }

  if (!template.title || typeof template.title !== 'string' || !template.title.trim()) {
    return { valid: false, error: 'Title is required and must be non-empty' };
  }

  if (
    template.amountPaise === undefined ||
    template.amountPaise === null ||
    !Number.isInteger(template.amountPaise) ||
    template.amountPaise <= 0
  ) {
    return { valid: false, error: 'amountPaise must be a positive integer' };
  }

  if (!RECURRING_FREQUENCIES.includes(template.frequency)) {
    return {
      valid: false,
      error: `frequency must be one of: ${RECURRING_FREQUENCIES.join(', ')}`,
    };
  }

  if (!template.startDate) {
    return { valid: false, error: 'startDate is required' };
  }

  const start = new Date(template.startDate);
  if (Number.isNaN(start.getTime())) {
    return { valid: false, error: 'startDate must be a valid date' };
  }

  if (template.endDate) {
    const end = new Date(template.endDate);
    if (Number.isNaN(end.getTime())) {
      return { valid: false, error: 'endDate must be a valid date' };
    }
    if (end < start) {
      return { valid: false, error: 'endDate cannot be before startDate' };
    }
  }

  return { valid: true };
}

/**
 * Formats a Date object or timestamp as YYYY-MM-DD.
 * @param {Date|string|number} date
 * @returns {string}
 */
export function formatDateIso(date) {
  const d = new Date(date);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Generates a deterministic occurrence ID for idempotency.
 * @param {string} templateId
 * @param {Date|string|number} occurrenceDate
 * @returns {string}
 */
export function generateOccurrenceId(templateId, occurrenceDate) {
  const dateStr = formatDateIso(occurrenceDate);
  return `rec_${templateId}_${dateStr}`;
}

/**
 * Returns the number of days in a given month (0-indexed).
 * @param {number} year
 * @param {number} monthIndex - 0 for January, 11 for December
 * @returns {number}
 */
export function getDaysInMonth(year, monthIndex) {
  return new Date(year, monthIndex + 1, 0).getDate();
}

/**
 * Calculates the next occurrence date after fromDate according to the template frequency.
 * Handles month-end clamping (e.g. Jan 31 -> Feb 28/29 -> Mar 31) and leap years.
 * Returns null if next occurrence exceeds template.endDate.
 *
 * @param {Object} template
 * @param {Date|string|number} fromDate
 * @returns {Date|null}
 */
export function calculateNextOccurrence(template, fromDate) {
  const current = new Date(fromDate);
  if (Number.isNaN(current.getTime())) {
    throw new Error('Invalid fromDate provided');
  }

  const startDate = new Date(template.startDate || fromDate);
  const anchorDay = template.anchorDay || startDate.getDate();
  const anchorMonth =
    template.anchorMonth !== undefined ? template.anchorMonth : startDate.getMonth();

  let next = new Date(current.getTime());

  switch (template.frequency) {
    case 'daily': {
      next.setDate(next.getDate() + 1);
      break;
    }
    case 'weekly': {
      next.setDate(next.getDate() + 7);
      break;
    }
    case 'biweekly': {
      next.setDate(next.getDate() + 14);
      break;
    }
    case 'monthly': {
      const curYear = next.getFullYear();
      const curMonth = next.getMonth();
      const nextMonthIndex = curMonth + 1;
      const targetYear = curYear + Math.floor(nextMonthIndex / 12);
      const targetMonth = nextMonthIndex % 12;

      const daysInTargetMonth = getDaysInMonth(targetYear, targetMonth);
      const targetDay = Math.min(anchorDay, daysInTargetMonth);

      next = new Date(
        targetYear,
        targetMonth,
        targetDay,
        current.getHours(),
        current.getMinutes(),
        current.getSeconds(),
        current.getMilliseconds()
      );
      break;
    }
    case 'yearly': {
      const targetYear = next.getFullYear() + 1;
      const targetMonth = anchorMonth;
      const daysInTargetMonth = getDaysInMonth(targetYear, targetMonth);
      const targetDay = Math.min(anchorDay, daysInTargetMonth);

      next = new Date(
        targetYear,
        targetMonth,
        targetDay,
        current.getHours(),
        current.getMinutes(),
        current.getSeconds(),
        current.getMilliseconds()
      );
      break;
    }
    default:
      throw new Error(`Unsupported frequency: ${template.frequency}`);
  }

  if (template.endDate) {
    const end = new Date(template.endDate);
    if (formatDateIso(next) > formatDateIso(end)) {
      return null;
    }
  }

  return next;
}

/**
 * Computes all pending occurrences for a template up to asOfDate.
 * Idempotent: skips any occurrences whose ID is present in existingOccurrenceIds.
 *
 * @param {Object} template
 * @param {Date|string|number} asOfDate
 * @param {Set<string>|Array<string>} [existingOccurrenceIds=new Set()]
 * @param {number} [maxOccurrences=365] - Safety ceiling to prevent unbounded loops
 * @returns {Array<Object>}
 */
export function getPendingOccurrences(
  template,
  asOfDate,
  existingOccurrenceIds = new Set(),
  maxOccurrences = 365
) {
  const validation = validateRecurringTemplate(template);
  if (!validation.valid) {
    throw new Error(`Invalid recurring template: ${validation.error}`);
  }

  const existingSet =
    existingOccurrenceIds instanceof Set
      ? existingOccurrenceIds
      : new Set(existingOccurrenceIds || []);

  const templateId = template.id || template._id || 'template';
  const cutoffIso = formatDateIso(asOfDate);
  const pending = [];

  let cursor = new Date(template.startDate);
  let iterations = 0;

  while (cursor && formatDateIso(cursor) <= cutoffIso && iterations < maxOccurrences) {
    iterations += 1;
    const occId = generateOccurrenceId(templateId, cursor);

    if (!existingSet.has(occId)) {
      pending.push({
        occurrenceId: occId,
        templateId,
        title: template.title,
        amountPaise: template.amountPaise,
        currency: template.currency || 'INR',
        category: template.category || 'Other',
        date: formatDateIso(cursor),
        dueDate: cursor.toISOString(),
        paymentMethod: template.paymentMethod || 'manual',
        frequency: template.frequency,
      });
    }

    cursor = calculateNextOccurrence(template, cursor);
  }

  return pending;
}
