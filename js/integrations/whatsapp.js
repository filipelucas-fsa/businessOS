/**
 * BusinessOS — Integration: WhatsApp notifications
 *
 * STATUS: stub (V1.1). Architecture is in place; no network calls yet.
 *
 * Purpose:
 *   Send order confirmations, low-stock alerts, receipts via WhatsApp Cloud API or Twilio. Token + sender phone come from SettingsService.
 *
 * Contract (target):
 *   - configure({ apiKey, baseUrl, ... }) -> persisted in SettingsService.integrations.whatsapp
 *   - isConfigured() -> boolean
 *   - call(endpoint, options) -> Promise<any>
 *
 * Future work:
 *   - Wire credentials through SettingsService (encrypted on backend).
 *   - Add retry/backoff + structured error reporting through NotificationService.
 *   - Emit EventBus events so other modules can react (e.g. ORDER_INGESTED).
 */

const whatsapp = (() => {
  function configure(/* config */) { /* TODO */ }
  function isConfigured()           { return false; }
  async function call(/* endpoint, options */) {
    throw new Error('WhatsApp notifications integration not implemented yet.');
  }
  return { configure, isConfigured, call };
})();

export default whatsapp;
