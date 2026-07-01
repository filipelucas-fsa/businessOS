/**
 * BusinessOS — Integration: AI assistant
 *
 * STATUS: stub (V1.1). Architecture is in place; no network calls yet.
 *
 * Purpose:
 *   Wire Lovable AI Gateway (Gemini/Claude). Use cases: insight summaries on dashboard, smart categorization of expenses, restock predictions, chat with sales data.
 *
 * Contract (target):
 *   - configure({ apiKey, baseUrl, ... }) -> persisted in SettingsService.integrations.ai
 *   - isConfigured() -> boolean
 *   - call(endpoint, options) -> Promise<any>
 *
 * Future work:
 *   - Wire credentials through SettingsService (encrypted on backend).
 *   - Add retry/backoff + structured error reporting through NotificationService.
 *   - Emit EventBus events so other modules can react (e.g. ORDER_INGESTED).
 */

const ai = (() => {
  function configure(/* config */) { /* TODO */ }
  function isConfigured()           { return false; }
  async function call(/* endpoint, options */) {
    throw new Error('AI assistant integration not implemented yet.');
  }
  return { configure, isConfigured, call };
})();

export default ai;
