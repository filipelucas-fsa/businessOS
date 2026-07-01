/**
 * BusinessOS v1.3 — StorageService
 *
 * Thin synchronous facade over a StorageProvider.
 * All existing modules (products.js, sales.js, etc.) call this service
 * exactly as before — they don't know or care about the provider underneath.
 *
 * v1.2.2 → v1.3 change: The provider layer is injected at startup.
 * The public API stays 100% backward-compatible with v1.2.2 callers.
 *
 * API SLOT: STORAGE BACKEND
 * FUTURE: import APIProvider and call setProvider(new APIProvider(...))
 */

import UUID from './uuid.js';
import FakeLocalStorageProvider from '../providers/storage/FakeLocalStorageProvider.js';

const StorageService = (() => {
  // ── Provider bootstrap ────────────────────────────────
  // API SLOT: STORAGE BACKEND
  // FUTURE: swap provider without touching any module
  let _provider = new FakeLocalStorageProvider();

  function setProvider(p) { _provider = p; }
  function getProvider()  { return _provider; }
  const p = () => _provider;

  // ── Raw access (for AppState, Logger, Settings, DataCore) ──
  function _getRaw(name, fallback)  { return p()._getRaw(name, fallback); }
  function _setRaw(name, value)     { p()._setRaw(name, value); }
  function _removeRaw(name)         { p()._removeRaw(name); }
  function _stamp(entity, isNew)    { return p()._stamp(entity, isNew); }
  function generateId()             { return p().generateId(); }

  // ── Users ─────────────────────────────────────────────
  function getUsers()               { return p()._live(p()._getRaw('users', [])); }
  function saveUser(user) {
    const isNew = !user.id || !p()._getRaw('users', []).some(u => u.id === user.id);
    return p()._upsert('users', user, isNew);
  }
  function findUserByEmail(email)   { return getUsers().find(u => u.email === email) || null; }

  // ── Session ───────────────────────────────────────────
  function getSession()             { return p()._getRaw('session', null); }
  function setSession(user)         { p()._setRaw('session', user); }
  function clearSession()           { p()._removeRaw('session'); }

  // ── Modules ───────────────────────────────────────────
  const DEFAULT_MODULES = ['products', 'customers', 'sales', 'purchases', 'finance', 'insights', 'reports', 'settings'];
  function getActiveModules() {
    const key  = p()._tenantKey('modules');
    const mods = p()._getRaw(key, null);
    return mods && Array.isArray(mods) ? mods : DEFAULT_MODULES.slice();
  }
  function setActiveModules(m)  { p()._setRaw(p()._tenantKey('modules'), m); }

  // ── Settings ──────────────────────────────────────────
  function getSettings()        { return p()._getRaw(p()._tenantKey('settings'), {}); }
  function saveSettings(s)      { p()._setRaw(p()._tenantKey('settings'), s); return s; }

  // ── Products ──────────────────────────────────────────
  function getProducts()            { return p()._tLive('products'); }
  function getAllProductsIncludingDeleted() { return p()._tGet('products', []); }
  function saveProduct(prod) {
    const isNew = !prod.id || !p()._tGet('products', []).some(x => x.id === prod.id);
    return p()._tUpsert('products', prod, isNew);
  }
  function deleteProduct(id)        { return p()._tSoftDelete('products', id); }
  function getProductById(id)       { return p()._tFindById('products', id); }

  // ── Customers ─────────────────────────────────────────
  function getCustomers()           { return p()._tLive('customers'); }
  function saveCustomer(c) {
    const isNew = !c.id || !p()._tGet('customers', []).some(x => x.id === c.id);
    return p()._tUpsert('customers', c, isNew);
  }
  function deleteCustomer(id)       { return p()._tSoftDelete('customers', id); }
  function getCustomerById(id)      { return p()._tFindById('customers', id); }

  // ── Sales ─────────────────────────────────────────────
  function getSales()               { return p()._tLive('sales'); }
  function saveSale(s)              { return p()._tUpsert('sales', s, true); }
  function deleteSale(id)           { return p()._tSoftDelete('sales', id); }

  // ── Expenses ──────────────────────────────────────────
  function getExpenses()            { return p()._tLive('expenses'); }
  function saveExpense(e)           { return p()._tUpsert('expenses', e, true); }
  function deleteExpense(id)        { return p()._tSoftDelete('expenses', id); }

  // ── Activities ────────────────────────────────────────
  function getActivities()  { return p()._tGet('activities', []); }
  function logActivity(entry) {
    const items = p()._tGet('activities', []);
    items.unshift({ type: 'activity', impact: null, user: null, module: null, ...entry, id: UUID.v4(), ts: Date.now() });
    p()._tSet('activities', items.slice(0, 200));
  }

  // ── Company / Tenant (global) ─────────────────────────
  function getCompany(companyId) {
    const companies = p()._getRaw('companies', []);
    return companies.find(c => c.id === companyId) || null;
  }
  function saveCompany(company) {
    const companies = p()._getRaw('companies', []);
    const idx = companies.findIndex(c => c.id === company.id);
    if (idx >= 0) companies[idx] = company; else companies.push(company);
    p()._setRaw('companies', companies);
    return company;
  }

  // ── Seed demo data ────────────────────────────────────
  function seedDemoData() {
    if (getProducts().length > 0) return;
    const session   = getSession();
    const companyId = session?.companyId || 'default';
    p().seedDemoData(companyId);
  }

  return {
    setProvider, getProvider,
    _getRaw, _setRaw, _removeRaw, _stamp,
    generateId,
    getUsers, saveUser, findUserByEmail,
    getSession, setSession, clearSession,
    getCompany, saveCompany,
    getActiveModules, setActiveModules,
    getSettings, saveSettings,
    getProducts, getAllProductsIncludingDeleted, saveProduct, deleteProduct, getProductById,
    getCustomers, saveCustomer, deleteCustomer, getCustomerById,
    getSales, saveSale, deleteSale,
    getExpenses, saveExpense, deleteExpense,
    getActivities, logActivity,
    seedDemoData,
  };
})();

export default StorageService;
