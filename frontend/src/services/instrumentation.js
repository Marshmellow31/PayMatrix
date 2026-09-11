/**
 * Local-only Firebase usage instrumentation for PayMatrix web.
 *
 * Scoped by authenticated UID. Stored in localStorage.
 * Privacy invariant: Never uploads instrumentation, and exported data
 * never contains document contents, amounts, email addresses, or user identifiers.
 */

const STORAGE_PREFIX = 'paymatrix_firebase_instrumentation_';

function sanitizeSignature(sig) {
  if (!sig || typeof sig !== 'string') return 'unknown_query';
  // Strip email addresses
  let sanitized = sig.replace(
    /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g,
    '<redacted_email>'
  );
  // Strip UUIDs / Firebase UIDs (typically 20-36 chars alphanumeric)
  sanitized = sanitized.replace(/\b[A-Za-z0-9_-]{20,36}\b/g, '<id>');
  // Strip amounts / numbers in filters (e.g., amount: 500, amountPaise: 50000)
  sanitized = sanitized.replace(
    /(amount|amountPaise|balance|price)\s*[:=]\s*\d+(\.\d+)?/gi,
    '$1:<num>'
  );
  return sanitized;
}

class FirebaseInstrumentationService {
  constructor() {
    this.currentUid = 'anonymous';
    this.memoryStore = new Map();
    this.counters = this.defaultCounters();
    this.activeListeners = 0;
    this.activeListenerSignatures = new Map(); // signature -> count
    this.duplicateListenerSignatures = 0;
    this.loadCounters();
  }

  defaultCounters() {
    return {
      documentReads: 0,
      documentWrites: 0,
      cacheReads: 0,
      serverReads: 0,
      queryCount: 0,
      totalQueryLatencyMs: 0,
      averageQueryLatencyMs: 0,
      lastQueryLatencyMs: 0,
      returnedDocuments: 0,
      activeListeners: 0,
      duplicateListenerSignatures: 0,
      querySignatures: {},
    };
  }

  getStorageKey(uid = this.currentUid) {
    return `${STORAGE_PREFIX}${uid || 'anonymous'}`;
  }

  loadCounters() {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        const raw = window.localStorage.getItem(this.getStorageKey());
        if (raw) {
          const parsed = JSON.parse(raw);
          this.counters = {
            ...this.defaultCounters(),
            ...parsed,
            activeListeners: this.activeListeners,
            duplicateListenerSignatures: this.duplicateListenerSignatures,
          };
          return;
        }
      } else if (this.memoryStore.has(this.getStorageKey())) {
        const raw = this.memoryStore.get(this.getStorageKey());
        const parsed = JSON.parse(raw);
        this.counters = {
          ...this.defaultCounters(),
          ...parsed,
          activeListeners: this.activeListeners,
          duplicateListenerSignatures: this.duplicateListenerSignatures,
        };
        return;
      }
    } catch {
      // Fallback to default in-memory counters
    }
    this.counters = {
      ...this.defaultCounters(),
      activeListeners: this.activeListeners,
      duplicateListenerSignatures: this.duplicateListenerSignatures,
    };
  }

  saveCounters() {
    const payload = JSON.stringify({
      ...this.counters,
      activeListeners: this.activeListeners,
      duplicateListenerSignatures: this.duplicateListenerSignatures,
    });
    this.memoryStore.set(this.getStorageKey(), payload);
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        window.localStorage.setItem(this.getStorageKey(), payload);
      }
    } catch {
      // Local-only; ignore storage quota errors
    }
  }

  setInstrumentationUser(uid) {
    const nextUid = uid ? String(uid) : 'anonymous';
    if (this.currentUid === nextUid) return;

    // Save previous user counters
    this.saveCounters();

    // Reset active listener state on account switch
    this.activeListeners = 0;
    this.activeListenerSignatures.clear();
    this.duplicateListenerSignatures = 0;

    // Switch scope and load new counters
    this.currentUid = nextUid;
    this.loadCounters();
  }

  recordRead({ count = 1, fromCache = false, latencyMs = 0, signature = '' } = {}) {
    const docCount = Math.max(0, count);
    this.counters.documentReads += docCount;
    if (fromCache) {
      this.counters.cacheReads += docCount;
    } else {
      this.counters.serverReads += docCount;
    }
    this.counters.returnedDocuments += docCount;

    if (latencyMs > 0) {
      this.counters.queryCount += 1;
      this.counters.totalQueryLatencyMs += latencyMs;
      this.counters.lastQueryLatencyMs = latencyMs;
      this.counters.averageQueryLatencyMs = Math.round(
        this.counters.totalQueryLatencyMs / this.counters.queryCount
      );
    }

    if (signature) {
      const sanitized = sanitizeSignature(signature);
      this.counters.querySignatures[sanitized] =
        (this.counters.querySignatures[sanitized] || 0) + 1;
    }

    this.saveCounters();
  }

  recordWrite({ count = 1, type: _type = 'write', signature = '' } = {}) {
    const writeCount = Math.max(0, count);
    this.counters.documentWrites += writeCount;

    if (signature) {
      const sanitized = sanitizeSignature(signature);
      this.counters.querySignatures[`write:${sanitized}`] =
        (this.counters.querySignatures[`write:${sanitized}`] || 0) + writeCount;
    }

    this.saveCounters();
  }

  registerListener(rawSignature) {
    const sanitized = sanitizeSignature(rawSignature);
    const existing = this.activeListenerSignatures.get(sanitized) || 0;
    if (existing > 0) {
      this.duplicateListenerSignatures += 1;
      this.counters.duplicateListenerSignatures = this.duplicateListenerSignatures;
    }
    this.activeListenerSignatures.set(sanitized, existing + 1);
    this.activeListeners += 1;
    this.counters.activeListeners = this.activeListeners;
    this.saveCounters();

    let unregistered = false;
    return () => {
      if (unregistered) return;
      unregistered = true;
      this.activeListeners = Math.max(0, this.activeListeners - 1);
      this.counters.activeListeners = this.activeListeners;

      const current = this.activeListenerSignatures.get(sanitized) || 1;
      if (current <= 1) {
        this.activeListenerSignatures.delete(sanitized);
      } else {
        this.activeListenerSignatures.set(sanitized, current - 1);
      }
      this.saveCounters();
    };
  }

  getMetrics() {
    return {
      ...this.counters,
      activeListeners: this.activeListeners,
      duplicateListenerSignatures: this.duplicateListenerSignatures,
    };
  }

  resetMetrics() {
    this.counters = this.defaultCounters();
    this.counters.activeListeners = this.activeListeners;
    this.counters.duplicateListenerSignatures = this.duplicateListenerSignatures;
    this.saveCounters();
  }

  exportMetricsJson() {
    // Privacy guarantee: strictly scrub any user identifier, amount, email, doc content
    const exportData = {
      timestamp: new Date().toISOString(),
      documentReads: this.counters.documentReads,
      documentWrites: this.counters.documentWrites,
      cacheReads: this.counters.cacheReads,
      serverReads: this.counters.serverReads,
      queryCount: this.counters.queryCount,
      totalQueryLatencyMs: this.counters.totalQueryLatencyMs,
      averageQueryLatencyMs: this.counters.averageQueryLatencyMs,
      lastQueryLatencyMs: this.counters.lastQueryLatencyMs,
      returnedDocuments: this.counters.returnedDocuments,
      activeListeners: this.activeListeners,
      duplicateListenerSignatures: this.duplicateListenerSignatures,
      querySignatures: { ...this.counters.querySignatures },
    };

    return JSON.stringify(exportData, null, 2);
  }
}

export const instrumentation = new FirebaseInstrumentationService();
export { sanitizeSignature };
