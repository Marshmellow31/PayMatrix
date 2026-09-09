import { describe, it, expect } from 'vitest';
import { notificationDestination } from './notificationDestination.js';

describe('notification destinations', () => {
  it('opens friends for requests and acceptance even with a legacy dashboard URL', () => {
    for (const type of ['friend_request', 'friend_accepted']) {
      expect(notificationDestination({ type, url: '/dashboard' })).toBe('/friends');
    }
  });
  it('opens the related group and encodes identifiers', () => {
    expect(notificationDestination({ groupId: 'trip 1' })).toBe('/groups/trip%201');
    expect(notificationDestination({ url: '/groups/trip1' })).toBe('/groups/trip1');
  });
  it('rejects external, script and unknown destinations', () => {
    for (const url of [
      'https://example.com/friends',
      '//evil.test/groups/a',
      'javascript:alert(1)',
      '/admin',
    ]) {
      expect(notificationDestination({ url })).toBe('/dashboard');
    }
  });
});
