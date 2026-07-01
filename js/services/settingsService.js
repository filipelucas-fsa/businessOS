/**
 * BusinessOS — SettingsService
 *
 * Application-wide settings (company, theme, language, currency, backup,
 * preferences). Persisted as a single `settings` object so it can be
 * exported/imported atomically.
 */

import StorageService from '../core/storage.js';
import AppState from '../core/appState.js';
import EventBus from '../core/eventBus.js';
import Logger from './logger.js';

const SettingsService = (() => {
  const DEFAULTS = {
    companyName: 'Minha Empresa',
    companyLogo: null,
    theme: 'light',
    language: 'pt-BR',
    currency: 'BRL',
    dateFormat: 'DD/MM/YYYY',
    fixedCosts: 0,
    notifications: {
      lowStock: true,
      newSale: true,
      reports: true,
    },
    backup: {
      autoBackup: false,
      lastBackupAt: null,
    },
  };

  function get() {
    return { ...DEFAULTS, ...(StorageService.getSettings() || {}) };
  }

  function save(patch) {
    const next = { ...get(), ...patch };
    StorageService.saveSettings(next);
    AppState.set({
      settings: next,
      theme: next.theme,
      language: next.language,
      company: { ...(AppState.get('company') || {}), name: next.companyName, logo: next.companyLogo, currency: next.currency },
    });
    EventBus.publish('SETTINGS_CHANGED', { settings: next });
    Logger.settings('update', 'Configurações atualizadas', { keys: Object.keys(patch) });
    return next;
  }

  // ── Backup / restore ──────────────────────────────────
  function exportBackup() {
    const dump = {
      version: '1.1',
      generatedAt: new Date().toISOString(),
      data: {
        users: StorageService._getRaw('users', []),
        products: StorageService.getProducts(),
        customers: StorageService.getCustomers(),
        sales: StorageService.getSales(),
        expenses: StorageService.getExpenses(),
        activities: StorageService._getRaw('activities', []),
        logs: StorageService._getRaw('logs', []),
        settings: get(),
        modules: StorageService.getActiveModules(),
      },
    };
    const blob = new Blob([JSON.stringify(dump, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `businessos-backup-${Date.now()}.json`; a.click();
    URL.revokeObjectURL(url);
    save({ backup: { ...get().backup, lastBackupAt: Date.now() } });
    Logger.settings('backup', 'Backup exportado');
  }

  function _setRawTenant(bucket, data) {
    const provider = StorageService.getProvider();
    const key = provider._tenantKey ? provider._tenantKey(bucket) : bucket;
    provider._setRaw ? provider._setRaw(key, data) : StorageService._setRaw(key, data);
  }

  function importBackup(json) {
    if (!json?.data) throw new Error('Backup inválido');
    const d = json.data;
    const companyId = StorageService.getSession()?.companyId || 'default';
    if (d.users)      StorageService._setRaw('users', d.users);
    if (d.products)   d.products.forEach(p => StorageService.saveProduct({ ...p, companyId }));
    if (d.customers)  d.customers.forEach(c => StorageService.saveCustomer({ ...c, companyId }));
    if (d.sales)      d.sales.forEach(s => StorageService.saveSale({ ...s, companyId }));
    if (d.expenses)   d.expenses.forEach(e => StorageService.saveExpense({ ...e, companyId }));
    if (d.activities) StorageService._setRaw('activities', d.activities);
    if (d.logs)       StorageService._setRaw('logs', d.logs);
    if (d.settings)   StorageService.saveSettings(d.settings);
    if (d.modules)    StorageService.setActiveModules(d.modules);
    EventBus.publish('SETTINGS_RESTORED', {});
    Logger.settings('restore', 'Backup restaurado');
  }

  return { get, save, exportBackup, importBackup };
})();

export default SettingsService;
