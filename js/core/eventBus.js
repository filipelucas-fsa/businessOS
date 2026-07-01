/**
 * BusinessOS v1.3 — EventBus
 *
 * Central event system. All state changes flow through here.
 * V1.3 additions: AI_RESPONSE, PLAN_UPGRADED, TENANT_CHANGED
 *
 * API SLOT: REAL-TIME EVENTS
 * FUTURE: Replace publish/subscribe with WebSocket or SSE:
 *   ws.onmessage = ({ data }) => {
 *     const { event, payload } = JSON.parse(data);
 *     EventBus.publish(event, payload);
 *   };
 */

const EventBus = (() => {
  const listeners = {};

  const EVENTS = {
    // ── V1.1 (preserved) ──────────────────────────────────
    PRODUCT_CREATED:  'PRODUCT_CREATED',
    PRODUCT_UPDATED:  'PRODUCT_UPDATED',
    PRODUCT_DELETED:  'PRODUCT_DELETED',
    STOCK_INCREASED:  'STOCK_INCREASED',
    STOCK_DECREASED:  'STOCK_DECREASED',
    SALE_CREATED:     'SALE_CREATED',
    CUSTOMER_CREATED: 'CUSTOMER_CREATED',
    CUSTOMER_UPDATED: 'CUSTOMER_UPDATED',
    EXPENSE_CREATED:  'EXPENSE_CREATED',
    REPORT_GENERATED: 'REPORT_GENERATED',
    DASHBOARD_REFRESH:'DASHBOARD_REFRESH',
    NOTIFICATION:     'NOTIFICATION',
    MODULE_CHANGED:   'MODULE_CHANGED',
    // ── V1.2 ──────────────────────────────────────────────
    PURCHASE_CREATED: 'PURCHASE_CREATED',
    SUPPLIER_CREATED: 'SUPPLIER_CREATED',
    SUPPLIER_UPDATED: 'SUPPLIER_UPDATED',
    SUPPLIER_DELETED: 'SUPPLIER_DELETED',
    INSIGHTS_UPDATED: 'INSIGHTS_UPDATED',
    // ── V1.3 (new) ────────────────────────────────────────
    AI_RESPONSE:      'AI_RESPONSE',      // AI assistant answered
    TENANT_CHANGED:   'TENANT_CHANGED',   // Multi-company: active company switched
    IMPORT_COMPLETE:  'IMPORT_COMPLETE',  // Bulk import finished
  };

  function subscribe(event, callback) {
    if (!listeners[event]) listeners[event] = [];
    listeners[event].push(callback);
    return () => { listeners[event] = listeners[event].filter(cb => cb !== callback); };
  }

  function publish(event, payload = {}) {
    if (!listeners[event]) return;
    const enriched = { ...payload, _event: event, _ts: Date.now() };
    listeners[event].forEach(cb => {
      try { cb(enriched); } catch (e) { console.error(`EventBus error [${event}]:`, e); }
    });
  }

  return { subscribe, publish, EVENTS };
})();

export default EventBus;
