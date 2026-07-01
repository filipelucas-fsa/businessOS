/**
 * BusinessOS — Logger / Audit Trail
 *
 * Append-only audit log. Every significant action (login, logout, CRUD,
 * sale, configuration change) flows through here. Designed so the same
 * API works once the backend exists — `record()` will simply POST instead
 * of writing to localStorage.
 *
 * Entry shape:
 *   {
 *     id:         uuid,
 *     ts:         epoch ms,
 *     date:       'YYYY-MM-DD',
 *     time:       'HH:mm:ss',
 *     userId:     uuid | null,
 *     userName:   string,
 *     module:     'auth' | 'products' | 'sales' | ...,
 *     action:     'login' | 'create' | 'update' | 'delete' | ...,
 *     description:string,
 *     meta:       object   // free-form payload
 *   }
 */

import StorageService from '../core/storage.js';
import UUID from '../core/uuid.js';
import EventBus from '../core/eventBus.js';
import AppState from '../core/appState.js';

const Logger = (() => {
  const MAX_ENTRIES = 1000;

  function _now() {
    const d = new Date();
    const pad = n => String(n).padStart(2, '0');
    return {
      ts: d.getTime(),
      date: `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`,
      time: `${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`,
    };
  }

  function record(module, action, description, meta = {}) {
    const user = AppState.get('user');
    const { ts, date, time } = _now();
    const entry = {
      id: UUID.v4(),
      ts, date, time,
      userId: user?.id || null,
      userName: user?.name || 'sistema',
      module, action, description, meta,
    };
    const all = StorageService._getRaw('logs', []);
    all.unshift(entry);
    StorageService._setRaw('logs', all.slice(0, MAX_ENTRIES));
    EventBus.publish('LOG_RECORDED', { entry });
    return entry;
  }

  function list({ module, action, since, limit = 100 } = {}) {
    let all = StorageService._getRaw('logs', []);
    if (module) all = all.filter(e => e.module === module);
    if (action) all = all.filter(e => e.action === action);
    if (since)  all = all.filter(e => e.ts >= since);
    return all.slice(0, limit);
  }

  function clear() {
    StorageService._setRaw('logs', []);
    EventBus.publish('LOG_CLEARED', {});
  }

  // Convenience helpers
  const auth     = (action, desc, meta) => record('auth', action, desc, meta);
  const products = (action, desc, meta) => record('products', action, desc, meta);
  const customers= (action, desc, meta) => record('customers', action, desc, meta);
  const sales    = (action, desc, meta) => record('sales', action, desc, meta);
  const finance  = (action, desc, meta) => record('finance', action, desc, meta);
  const settings = (action, desc, meta) => record('settings', action, desc, meta);

  return { record, list, clear, auth, products, customers, sales, finance, settings };
})();

export default Logger;
