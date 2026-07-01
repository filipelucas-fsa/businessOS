/**
 * BusinessOS — NotificationService (v1.1)
 *
 * Global toast & inline-tip system. The toast container is created lazily
 * once on first use. New in V1.1:
 *
 *   - `update` and `lowStock` and `report` shorthand types
 *   - `tip(...)` — onboarding bubble with a "Nunca mostrar novamente" CTA
 *   - sticky behaviour for important notifications
 */

const NotificationService = (() => {
  let container = null;
  const MAX_VISIBLE = 2;

  function _ensureContainer() {
    if (container) return;
    container = document.createElement('div');
    container.id = 'bos-notifications';
    container.setAttribute('aria-live', 'polite');
    document.body.appendChild(container);
  }

  function _enforceLimit() {
    if (!container) return;
    const toasts = Array.from(container.children);
    while (toasts.length > MAX_VISIBLE) {
      const oldest = toasts.shift();
      dismiss(oldest);
    }
  }

  const ICONS = {
    success:  `<svg width="16" height="16" viewBox="0 0 16 16" fill="none"><circle cx="8" cy="8" r="7" stroke="#22c55e" stroke-width="1.5"/><path d="M5 8l2 2 4-4" stroke="#22c55e" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>`,
    error:    `<svg width="16" height="16" viewBox="0 0 16 16" fill="none"><circle cx="8" cy="8" r="7" stroke="#ef4444" stroke-width="1.5"/><path d="M8 5v4M8 10.5v.5" stroke="#ef4444" stroke-width="1.5" stroke-linecap="round"/></svg>`,
    warning:  `<svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M8 2L14.5 13H1.5L8 2Z" stroke="#f59e0b" stroke-width="1.5" stroke-linejoin="round"/><path d="M8 7v3M8 11.5v.5" stroke="#f59e0b" stroke-width="1.5" stroke-linecap="round"/></svg>`,
    info:     `<svg width="16" height="16" viewBox="0 0 16 16" fill="none"><circle cx="8" cy="8" r="7" stroke="#3b82f6" stroke-width="1.5"/><path d="M8 7v4M8 5.5V5" stroke="#3b82f6" stroke-width="1.5" stroke-linecap="round"/></svg>`,
    update:   `<svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M2 8a6 6 0 0110-4.5L13 5M14 8a6 6 0 01-10 4.5L3 11" stroke="#8b5cf6" stroke-width="1.5" stroke-linecap="round"/></svg>`,
    lowstock: `<svg width="16" height="16" viewBox="0 0 16 16" fill="none"><rect x="2" y="3" width="12" height="10" rx="1" stroke="#f59e0b" stroke-width="1.5"/><path d="M5 7h6M5 10h4" stroke="#f59e0b" stroke-width="1.5" stroke-linecap="round"/></svg>`,
    report:   `<svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M3 13V8M7 13V4M11 13V9M15 13V6" stroke="#06b6d4" stroke-width="1.5" stroke-linecap="round"/></svg>`,
    tip:      `<svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M8 1a5 5 0 00-3 9v2h6v-2a5 5 0 00-3-9zM6 14h4" stroke="#3b82f6" stroke-width="1.5" stroke-linecap="round"/></svg>`,
  };

  function show(message, type = 'info', duration = 4000) {
    _ensureContainer();
    const toast = document.createElement('div');
    toast.className = `bos-toast bos-toast--${type}`;
    toast.innerHTML = `
      <span class="bos-toast__icon">${ICONS[type] || ICONS.info}</span>
      <span class="bos-toast__msg">${message}</span>
      <button class="bos-toast__close" aria-label="Fechar">
        <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M1 1l10 10M11 1L1 11" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg>
      </button>
    `;
    toast.querySelector('.bos-toast__close').addEventListener('click', () => dismiss(toast));
    container.appendChild(toast);
    _enforceLimit();
    requestAnimationFrame(() => toast.classList.add('bos-toast--visible'));
    if (duration > 0) {
      const timer = setTimeout(() => dismiss(toast), duration);
      let leaveTimer;
      toast.addEventListener('mouseenter', () => { clearTimeout(timer); clearTimeout(leaveTimer); });
      toast.addEventListener('mouseleave', () => { leaveTimer = setTimeout(() => dismiss(toast), 1500); });
    }
    return toast;
  }

  function tip({ title, body, onDismiss }) {
    _ensureContainer();
    const toast = document.createElement('div');
    toast.className = 'bos-toast bos-toast--tip bos-toast--rich';
    toast.innerHTML = `
      <div class="bos-toast__rich-icon">${ICONS.tip}</div>
      <div class="bos-toast__rich-body">
        <div class="bos-toast__rich-title">${title}</div>
        <div class="bos-toast__rich-text">${body}</div>
        <div class="bos-toast__rich-actions">
          <button class="bos-toast__rich-btn" data-act="ok">Entendi</button>
        </div>
      </div>
      <button class="bos-toast__close" aria-label="Fechar">
        <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M1 1l10 10M11 1L1 11" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg>
      </button>
    `;
    container.appendChild(toast);
    _enforceLimit();
    requestAnimationFrame(() => toast.classList.add('bos-toast--visible'));
    const close = (persistDismiss) => {
      if (persistDismiss && typeof onDismiss === 'function') onDismiss();
      dismiss(toast);
    };
    toast.querySelector('[data-act="ok"]').addEventListener('click', () => close(true));
    toast.querySelector('.bos-toast__close').addEventListener('click', () => close(false));
    return toast;
  }

  function dismiss(toast) {
    toast.classList.remove('bos-toast--visible');
    toast.addEventListener('transitionend', () => toast.remove(), { once: true });
  }

  const success  = (m, d) => show(m, 'success', d);
  const error    = (m, d) => show(m, 'error', d);
  const warning  = (m, d) => show(m, 'warning', d);
  const info     = (m, d) => show(m, 'info', d);
  const update   = (m, d) => show(m, 'update', d);
  const lowStock = (m, d) => show(m, 'lowstock', d);
  const report   = (m, d) => show(m, 'report', d);

  return { show, tip, success, error, warning, info, update, lowStock, report };
})();

export default NotificationService;
