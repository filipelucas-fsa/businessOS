/**
 * BusinessOS — Integration: Excel (.xlsx) reader/writer
 *
 * STATUS: stub (V1.1). Architecture is in place; no network calls yet.
 *
 * Purpose:
 *   Add SheetJS or ExcelJS. Export the same shape as ExportService.generic({format:'xlsx'}); the dispatch already routes here when implemented.
 *
 * Contract (target):
 *   - configure({ apiKey, baseUrl, ... }) -> persisted in SettingsService.integrations.excel
 *   - isConfigured() -> boolean
 *   - call(endpoint, options) -> Promise<any>
 *
 * Future work:
 *   - Wire credentials through SettingsService (encrypted on backend).
 *   - Add retry/backoff + structured error reporting through NotificationService.
 *   - Emit EventBus events so other modules can react (e.g. ORDER_INGESTED).
 */

const excel = (() => {
  function configure(/* config */) { /* TODO */ }
  function isConfigured()           { return false; }
  async function call(/* endpoint, options */) {
    throw new Error('Excel (.xlsx) reader/writer integration not implemented yet.');
  }
  return { configure, isConfigured, call };
})();

export default excel;
