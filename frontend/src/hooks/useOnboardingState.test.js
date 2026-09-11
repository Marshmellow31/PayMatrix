import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { hasSeenOnboarding, markOnboardingSeen } from './useOnboardingState.js';

describe('useOnboardingState', () => {
  let store = {};
  const mockStorage = {
    getItem: vi.fn((key) => store[key] ?? null),
    setItem: vi.fn((key, value) => {
      store[key] = String(value);
    }),
    clear: vi.fn(() => {
      store = {};
    }),
  };

  beforeEach(() => {
    store = {};
    vi.stubGlobal('localStorage', mockStorage);
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('reports false when onboarding has never been seen', () => {
    expect(hasSeenOnboarding()).toBe(false);
  });

  it('reports true after markOnboardingSeen is called', () => {
    markOnboardingSeen();
    expect(hasSeenOnboarding()).toBe(true);
    expect(mockStorage.setItem).toHaveBeenCalledWith('paymatrix_onboarding_seen_v1', 'true');
  });

  it('safely catches storage exceptions without crashing', () => {
    mockStorage.getItem.mockImplementationOnce(() => {
      throw new Error('Quota or privacy error');
    });
    expect(hasSeenOnboarding()).toBe(false);

    mockStorage.setItem.mockImplementationOnce(() => {
      throw new Error('Quota or privacy error');
    });
    expect(() => markOnboardingSeen()).not.toThrow();
  });
});
