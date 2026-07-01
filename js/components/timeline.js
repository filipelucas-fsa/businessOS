/**
 * BusinessOS — Timeline Component
 *
 * Renders a live timeline of recent events (logs + activities + sales)
 * into a host element. Re-renders whenever the EventBus publishes a
 * relevant event. Pure presentational layer; pulls data from
 * DashboardService.getRecentMovements().
 *
 * Usage:
 *   const tl = Timeline.mount(document.getElementById('timeline'));
 *   // ... later, tl.destroy();
 */

import EventBus from '../core/eventBus.js';
import DashboardService from '../services/dashboardService.js';

const Timeline = (() => {
  const ICONS = {
    sale:     `<svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M1 1h1.5l1.5 6h6l1.5-4.5H3.5" stroke="currentColor" stroke-width="1.3" stroke-linecap="round" stroke-linejoin="round"/></svg>`,
    products: `<svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M1 3l5-2 5 2v6l-5 2-5-2V3z" stroke="currentColor" stroke-width="1.3"/></svg>`,
    customers:`<svg width="12" height="12" viewBox="0 0 12 12" fill="none"><circle cx="6" cy="4" r="2.5" stroke="currentColor" stroke-width="1.3"/><path d="M1 11c0-2 2-3.5 5-3.5s5 1.5 5 3.5" stroke="currentColor" stroke-width="1.3" stroke-linecap="round"/></svg>`,
    finance:  `<svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M6 1v10M8.5 3H5a2 2 0 000 4h2a2 2 0 010 4H3.5" stroke="currentColor" stroke-width="1.3" stroke-linecap="round"/></svg>`,
    auth:     `<svg width="12" height="12" viewBox="0 0 12 12" fill="none"><circle cx="6" cy="4" r="2.5" stroke="currentColor" stroke-width="1.3"/><path d="M1.5 11c0-2 2-3.5 4.5-3.5s4.5 1.5 4.5 3.5" stroke="currentColor" stroke-width="1.3" stroke-linecap="round"/></svg>`,
    settings: `<svg width="12" height="12" viewBox="0 0 12 12" fill="none"><circle cx="6" cy="6" r="1.5" stroke="currentColor" stroke-width="1.3"/><path d="M6 1v1.5M6 9.5V11M11 6H9.5M2.5 6H1M9.5 2.5L8.5 3.5M3.5 8.5L2.5 9.5M9.5 9.5L8.5 8.5M3.5 3.5L2.5 2.5" stroke="currentColor" stroke-width="1.3" stroke-linecap="round"/></svg>`,
    activity: `<svg width="12" height="12" viewBox="0 0 12 12" fill="none"><circle cx="6" cy="6" r="5" stroke="currentColor" stroke-width="1.3"/><path d="M6 3v3l2 2" stroke="currentColor" stroke-width="1.3" stroke-linecap="round"/></svg>`,
  };

  function _fmtTime(ts) {
    const d = new Date(ts);
    const today = new Date(); today.setHours(0, 0, 0, 0);
    const isToday = ts >= today.getTime();
    const pad = n => String(n).padStart(2, '0');
    const time = `${pad(d.getHours())}:${pad(d.getMinutes())}`;
    return isToday ? time : `${pad(d.getDate())}/${pad(d.getMonth() + 1)} ${time}`;
  }

  function mount(host, { limit = 10 } = {}) {
    if (!host) return { destroy() {} };

    function render() {
      const events = DashboardService.getRecentMovements(limit);
      if (!events.length) {
        host.innerHTML = `<div class="timeline-empty">Nenhum evento ainda. Crie um produto ou registre uma venda.</div>`;
        return;
      }
      host.innerHTML = `
        <ol class="timeline">
          ${events.map(e => `
            <li class="timeline-item timeline-item--${e.type}">
              <span class="timeline-dot">${ICONS[e.type] || ICONS.activity}</span>
              <div class="timeline-content">
                <div class="timeline-title">${e.title}</div>
                ${e.detail ? `<div class="timeline-detail">${e.detail}</div>` : ''}
              </div>
              <span class="timeline-time">${_fmtTime(e.ts)}</span>
            </li>`).join('')}
        </ol>
      `;
    }

    const events = [
      'PRODUCT_CREATED', 'PRODUCT_UPDATED', 'PRODUCT_DELETED',
      'SALE_CREATED', 'CUSTOMER_CREATED', 'CUSTOMER_UPDATED',
      'EXPENSE_CREATED', 'STOCK_DECREASED', 'STOCK_INCREASED',
      'LOG_RECORDED', 'DASHBOARD_REFRESH',
    ];
    const unsubs = events.map(ev => EventBus.subscribe(ev, render));
    render();

    return { render, destroy() { unsubs.forEach(u => u()); } };
  }

  return { mount };
})();

export default Timeline;
