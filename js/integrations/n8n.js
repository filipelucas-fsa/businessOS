/**
 * BusinessOS — Integration: n8n automation hooks
 *
 * STATUS: stub (V1.1). Architecture is in place; no network calls yet.
 *
 * Purpose:
 *   Outbound webhooks for SALE_CREATED / LOW_STOCK / NEW_CUSTOMER so n8n flows can trigger emails, accounting sync, marketing, etc.
 *
 * Contract (target):
 *   - configure({ apiKey, baseUrl, ... }) -> persisted in SettingsService.integrations.n8n
 *   - isConfigured() -> boolean
 *   - call(endpoint, options) -> Promise<any>
 *
 * Future work:
 *   - Wire credentials through SettingsService (encrypted on backend).
 *   - Add retry/backoff + structured error reporting through NotificationService.
 *   - Emit EventBus events so other modules can react (e.g. ORDER_INGESTED).
 */

const n8n = (() => {
  function configure(/* config */) { /* TODO */ }
  function isConfigured()           { return false; }
  async function call(/* endpoint, options */) {
    throw new Error('n8n automation hooks integration not implemented yet.');
  }
  return { configure, isConfigured, call };
})();

export default n8n;
