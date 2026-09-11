import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { toSubunits, fromSubunits, formatSubunits, allocateSubunits } from './universalMoney.js';

describe('Universal Subunit Currency Engine', () => {
  test('converts 2-decimal USD correctly', () => {
    assert.equal(toSubunits('15.50', 'USD'), 1550);
    assert.equal(toSubunits(15.5, 'USD'), 1550);
    assert.equal(fromSubunits(1550, 'USD'), 15.5);
  });

  test('converts 0-decimal JPY correctly without fractional drift', () => {
    assert.equal(toSubunits('3500', 'JPY'), 3500);
    assert.equal(toSubunits(3500, 'JPY'), 3500);
    assert.equal(fromSubunits(3500, 'JPY'), 3500);
  });

  test('converts 3-decimal KWD correctly', () => {
    assert.equal(toSubunits('12.500', 'KWD'), 12500);
    assert.equal(toSubunits('12.5', 'KWD'), 12500);
    assert.equal(fromSubunits(12500, 'KWD'), 12.5);
  });

  test('allocates 100 USD cents among 3 people strictly preserving 100 sum', () => {
    const total = 100; // 1.00 USD
    const entries = [{ id: 'user1', weight: 1 }, { id: 'user2', weight: 1 }, { id: 'user3', weight: 1 }];
    const result = allocateSubunits(total, entries);

    assert.equal(result.length, 3);
    const sum = result.reduce((acc, r) => acc + r.subunits, 0);
    assert.equal(sum, 100);
    assert.equal(result[0].subunits, 34); // First gets remainder
    assert.equal(result[1].subunits, 33);
    assert.equal(result[2].subunits, 33);
  });

  test('allocates 1000 JPY yen among 3 people strictly preserving 1000 sum', () => {
    const total = 1000;
    const entries = [{ id: 'u1', weight: 1 }, { id: 'u2', weight: 1 }, { id: 'u3', weight: 1 }];
    const result = allocateSubunits(total, entries);

    const sum = result.reduce((acc, r) => acc + r.subunits, 0);
    assert.equal(sum, 1000);
    assert.equal(result[0].subunits, 334);
    assert.equal(result[1].subunits, 333);
    assert.equal(result[2].subunits, 333);
  });

  test('allocates 10000 KWD fils among 7 unequal weighted people', () => {
    const total = 10000;
    const entries = [
      { id: 'u1', weight: 1.5 },
      { id: 'u2', weight: 2.5 },
      { id: 'u3', weight: 3.0 },
      { id: 'u4', weight: 1.0 },
      { id: 'u5', weight: 2.0 },
    ];
    const result = allocateSubunits(total, entries);
    const sum = result.reduce((acc, r) => acc + r.subunits, 0);
    assert.equal(sum, 10000);
  });
});
