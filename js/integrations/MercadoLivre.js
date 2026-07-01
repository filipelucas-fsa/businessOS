/**
 * BusinessOS — Integration: Mercado Livre marketplace
 *
 * STATUS: stub (V1.1). Architecture is in place; no network calls yet.
 *
 * Purpose:
 *   OAuth flow + catalog publishing + order ingestion. Brazilian-marketplace-first integration.
 *
 * Contract (target):
 *   - configure({ apiKey, baseUrl, ... }) -> persisted in SettingsService.integrations.MercadoLivre
 *   - isConfigured() -> boolean
 *   - call(endpoint, options) -> Promise<any>
 *
 * Future work:
 *   - Wire credentials through SettingsService (encrypted on backend).
 *   - Add retry/backoff + structured error reporting through NotificationService.
 *   - Emit EventBus events so other modules can react (e.g. ORDER_INGESTED).
 */

const MercadoLivre = (() => {
  function configure(/* config */) { /* TODO */ }
  function isConfigured()           { return false; }
  async function call(/* endpoint, options */) {
    throw new Error('Mercado Livre marketplace integration not implemented yet.');
  }
  return { configure, isConfigured, call };
})();

export default MercadoLivre;
