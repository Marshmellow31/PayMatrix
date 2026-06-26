/**
 * Structured logger for PayMatrix frontend.
 *
 * In production (`import.meta.env.PROD === true`) only warn/error levels are
 * emitted; debug/info are silenced so no PII leaks into the browser console
 * of a live user. In development all levels are printed with a module prefix.
 *
 * Usage:
 *   import logger from '../utils/logger';
 *   const log = logger('groupService');
 *   log.info('resolveMemberProfiles', { memberCount: ids.length });
 *   log.error('getGroups', err);
 */

const IS_PROD = import.meta.env.PROD === true;

const LEVELS = {
  debug: 0,
  info:  1,
  warn:  2,
  error: 3,
};

const MIN_LEVEL = IS_PROD ? LEVELS.warn : LEVELS.debug;

const formatTag = (module, fn) => `[${module}${fn ? `::${fn}` : ''}]`;

const emit = (consoleFn, level, module, fn, ...args) => {
  if (LEVELS[level] < MIN_LEVEL) return;
  consoleFn(formatTag(module, fn), ...args);
};

/**
 * Creates a scoped logger for a given module name.
 * @param {string} module - e.g. 'groupService', 'AdminRoute'
 */
const logger = (module) => ({
  debug: (fn, ...args) => emit(console.info,  'debug', module, fn, ...args),
  info:  (fn, ...args) => emit(console.info,  'info',  module, fn, ...args),
  warn:  (fn, ...args) => emit(console.warn,  'warn',  module, fn, ...args),
  error: (fn, ...args) => emit(console.error, 'error', module, fn, ...args),
});

export default logger;
