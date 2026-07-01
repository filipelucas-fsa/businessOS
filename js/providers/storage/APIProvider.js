/**
 * BusinessOS v1.3 — APIProvider (STUB)
 *
 * Future implementation of StorageProvider using a real REST API.
 * This file documents the migration path from localStorage → backend.
 *
 * API SLOT: STORAGE BACKEND
 * FUTURE: Activate by setting STORAGE_PROVIDER=api in config.js
 *
 * Backend stack (when ready):
 *   Node.js 20 + Express 5
 *   PostgreSQL 16 + Prisma 5
 *   JWT authentication
 *   Redis (cache + real-time via WebSockets)
 */

import { StorageProvider } from './StorageProvider.js';

class APIProvider extends StorageProvider {
  constructor(baseURL, getToken) {
    super();
    this.baseURL  = baseURL;    // e.g. 'https://api.businessos.app/v1'
    this.getToken = getToken;   // fn() → string (JWT from AuthService)
  }

  async _request(method, path, body = null) {
    const res = await fetch(`${this.baseURL}${path}`, {
      method,
      headers: {
        'Content-Type': 'application/json',
        // API SLOT: AUTH — replace with real JWT
        'Authorization': `Bearer ${this.getToken()}`,
      },
      body: body ? JSON.stringify(body) : undefined,
    });
    if (!res.ok) throw new Error(`API ${method} ${path} → ${res.status}`);
    return res.json();
  }

  // ── Users ──────────────────────────────────────────────
  async getUsers()                  { return this._request('GET',  '/users'); }
  async saveUser(user)              { return this._request(user.id ? 'PUT' : 'POST', `/users/${user.id || ''}`, user); }
  async findUserByEmail(email)      { return this._request('GET',  `/users?email=${encodeURIComponent(email)}`).then(r => r[0] || null); }

  // ── Session ────────────────────────────────────────────
  // With JWT, session is implicit in the token — no server call needed.
  async getSession()                { return JSON.parse(localStorage.getItem('bos_session') || 'null'); }
  async setSession(user)            { localStorage.setItem('bos_session', JSON.stringify(user)); }
  async clearSession()              { localStorage.removeItem('bos_session'); }

  // ── Company / Tenant ───────────────────────────────────
  async getCompany(id)              { return this._request('GET',  `/companies/${id}`); }
  async saveCompany(company)        { return this._request(company.id ? 'PUT' : 'POST', `/companies/${company.id || ''}`, company); }

  // ── Modules ────────────────────────────────────────────
  async getActiveModules()          { return this._request('GET',  '/settings/modules'); }
  async setActiveModules(list)      { return this._request('PUT',  '/settings/modules', { modules: list }); }

  // ── Settings ───────────────────────────────────────────
  async getSettings()               { return this._request('GET',  '/settings'); }
  async saveSettings(s)             { return this._request('PUT',  '/settings', s); }

  // ── Products ───────────────────────────────────────────
  async getProducts()               { return this._request('GET',  '/products'); }
  async saveProduct(p)              { return this._request(p.id ? 'PUT' : 'POST', `/products/${p.id || ''}`, p); }
  async deleteProduct(id)           { return this._request('DELETE',`/products/${id}`); }
  async getProductById(id)          { return this._request('GET',  `/products/${id}`); }

  // ── Customers ──────────────────────────────────────────
  async getCustomers()              { return this._request('GET',  '/customers'); }
  async saveCustomer(c)             { return this._request(c.id ? 'PUT' : 'POST', `/customers/${c.id || ''}`, c); }
  async deleteCustomer(id)          { return this._request('DELETE',`/customers/${id}`); }
  async getCustomerById(id)         { return this._request('GET',  `/customers/${id}`); }

  // ── Sales ──────────────────────────────────────────────
  async getSales()                  { return this._request('GET',  '/sales'); }
  async saveSale(s)                 { return this._request('POST', '/sales', s); }
  async deleteSale(id)              { return this._request('DELETE',`/sales/${id}`); }

  // ── Expenses ───────────────────────────────────────────
  async getExpenses()               { return this._request('GET',  '/expenses'); }
  async saveExpense(e)              { return this._request('POST', '/expenses', e); }
  async deleteExpense(id)           { return this._request('DELETE',`/expenses/${id}`); }

  // ── Suppliers ──────────────────────────────────────────
  async getSuppliers()              { return this._request('GET',  '/suppliers'); }
  async saveSupplier(s)             { return this._request(s.id ? 'PUT' : 'POST', `/suppliers/${s.id || ''}`, s); }
  async deleteSupplier(id)          { return this._request('DELETE',`/suppliers/${id}`); }
  async getSupplierById(id)         { return this._request('GET',  `/suppliers/${id}`); }

  // ── Purchases ──────────────────────────────────────────
  async getPurchases()              { return this._request('GET',  '/purchases'); }
  async savePurchase(p)             { return this._request('POST', '/purchases', p); }

  // ── Activities ─────────────────────────────────────────
  async getActivities()             { return this._request('GET',  '/activities'); }
  async logActivity(entry)          { return this._request('POST', '/activities', entry); }

  // ── Raw access ─────────────────────────────────────────
  // Not needed with real API — kept for interface compatibility.
  async getRaw(key, fallback)       { return fallback; }
  async setRaw(key, value)          { /* no-op */ }
  async removeRaw(key)              { /* no-op */ }
}

export default APIProvider;
