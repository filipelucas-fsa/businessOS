/**
 * BusinessOS — Integration: REST API client
 *
 * STATUS: stub (V1.1). Architecture is in place; no network calls yet.
 *
 * Purpose:
 *   Wrap fetch with auth header + base URL + retry/backoff. Used to migrate StorageService from LocalStorage to a PostgreSQL/Prisma backend without touching modules.
 *
 * Contract (target):
 *   - configure({ apiKey, baseUrl, ... }) -> persisted in SettingsService.integrations.api
 *   - isConfigured() -> boolean
 *   - call(endpoint, options) -> Promise<any>
 *
 * Future work:
 *   - Wire credentials through SettingsService (encrypted on backend).
 *   - Add retry/backoff + structured error reporting through NotificationService.
 *   - Emit EventBus events so other modules can react (e.g. ORDER_INGESTED).
 */

const api = (() => {
  function configure(/* config */) { /* TODO */ }
  function isConfigured()           { return false; }
  async function call(/* endpoint, options */) {
    throw new Error('REST API client integration not implemented yet.');
  }
  return { configure, isConfigured, call };
})();

export default api;
