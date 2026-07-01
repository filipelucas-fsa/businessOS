/**
 * BusinessOS v1.3 — FakeLocalStorageProvider
 *
 * Implements StorageProvider using browser localStorage.
 * 100% offline, zero dependencies. Ships as the default provider.
 *
 * Multitenancy: All records are scoped by companyId stored in session.
 * When migrating to API, the server enforces tenant isolation instead.
 *
 * API SLOT: STORAGE BACKEND
 * FUTURE: Swap this with APIProvider (fetch + JWT bearer token)
 *
 * Usage:
 *   import StorageService from '../../core/storage.js';
 *   // StorageService wraps this provider transparently
 */

import UUID from '../../core/uuid.js';
import { StorageProvider } from './StorageProvider.js';

class FakeLocalStorageProvider extends StorageProvider {
  constructor() {
    super();
    this.PREFIX = 'bos_';
    this.SCHEMA = {
      users:       [],
      products:    [],
      customers:   [],
      sales:       [],
      expenses:    [],
      activities:  [],
      logs:        [],
      session:     null,
      appstate:    null,
      settings:    null,
      onboarding:  {},
      permissions: null,
      modules:     ['products', 'customers', 'sales', 'purchases', 'finance', 'insights', 'reports', 'settings'],
      suppliers:   [],
      purchases:   [],
      companies:   [],
    };
  }

  // ── Internal helpers ──────────────────────────────────
  _key(name) { return `${this.PREFIX}${name}`; }

  _getRaw(name, fallback = undefined) {
    try {
      const raw = localStorage.getItem(this._key(name));
      if (raw === null) {
        if (fallback !== undefined) return fallback;
        return this.SCHEMA[name] !== undefined
          ? JSON.parse(JSON.stringify(this.SCHEMA[name]))
          : null;
      }
      return JSON.parse(raw);
    } catch {
      return fallback !== undefined ? fallback : (this.SCHEMA[name] ?? null);
    }
  }

  _setRaw(name, value) {
    localStorage.setItem(this._key(name), JSON.stringify(value));
  }

  _removeRaw(name) {
    localStorage.removeItem(this._key(name));
  }

  _stamp(entity, isNew) {
    const now = Date.now();
    if (isNew) {
      entity.id        = entity.id        || UUID.v4();
      entity.createdAt = entity.createdAt || now;
      entity.updatedAt = now;
      entity.deletedAt = null;
      entity.deleted   = false;
    } else {
      entity.updatedAt = now;
    }
    return entity;
  }

  _live(list) { return (list || []).filter(r => !r?.deleted); }

  _upsert(bucket, record, isNew) {
    const items = this._getRaw(bucket, []);
    this._stamp(record, isNew);
    const idx = items.findIndex(r => r.id === record.id);
    if (idx >= 0) items[idx] = record; else items.push(record);
    this._setRaw(bucket, items);
    return record;
  }

  _softDelete(bucket, id) {
    const items = this._getRaw(bucket, []);
    const idx = items.findIndex(r => r.id === id);
    if (idx < 0) return false;
    items[idx].deleted   = true;
    items[idx].deletedAt = Date.now();
    items[idx].updatedAt = Date.now();
    this._setRaw(bucket, items);
    return true;
  }

  _findById(bucket, id) {
    return this._live(this._getRaw(bucket, [])).find(r => r.id === id) || null;
  }

  // ── V1.3: Tenant-scoped bucket key ───────────────────
  // When a real API exists, the server handles tenant isolation.
  // For now, we prefix local keys with companyId so multiple
  // demo companies can coexist in localStorage.
  _tenantKey(bucket) {
    try {
      const session = this._getRaw('session', null);
      const companyId = session?.companyId || 'default';
      return `${companyId}_${bucket}`;
    } catch {
      return bucket;
    }
  }

  // Tenant-scoped equivalents of _upsert, _softDelete, _findById
  _tGet(bucket, fallback = []) {
    return this._getRaw(this._tenantKey(bucket), fallback);
  }
  _tSet(bucket, value) {
    this._setRaw(this._tenantKey(bucket), value);
  }
  _tUpsert(bucket, record, isNew) {
    const items = this._tGet(bucket, []);
    this._stamp(record, isNew);
    const idx = items.findIndex(r => r.id === record.id);
    if (idx >= 0) items[idx] = record; else items.push(record);
    this._tSet(bucket, items);
    return record;
  }
  _tSoftDelete(bucket, id) {
    const items = this._tGet(bucket, []);
    const idx = items.findIndex(r => r.id === id);
    if (idx < 0) return false;
    items[idx].deleted   = true;
    items[idx].deletedAt = Date.now();
    items[idx].updatedAt = Date.now();
    this._tSet(bucket, items);
    return true;
  }
  _tFindById(bucket, id) {
    return this._live(this._tGet(bucket, [])).find(r => r.id === id) || null;
  }
  _tLive(bucket) {
    return this._live(this._tGet(bucket, []));
  }

  // ── Users (global, not tenant-scoped) ────────────────
  async getUsers()                 { return this._live(this._getRaw('users', [])); }
  async saveUser(user)             {
    const isNew = !user.id || !this._getRaw('users', []).some(u => u.id === user.id);
    return this._upsert('users', user, isNew);
  }
  async findUserByEmail(email)     { return (await this.getUsers()).find(u => u.email === email) || null; }

  // ── Session (global) ─────────────────────────────────
  async getSession()               { return this._getRaw('session', null); }
  async setSession(user)           { this._setRaw('session', user); }
  async clearSession()             { this._removeRaw('session'); }

  // ── Company / Tenant ──────────────────────────────────
  async getCompany(companyId) {
    const companies = this._getRaw('companies', []);
    return companies.find(c => c.id === companyId) || null;
  }
  async saveCompany(company) {
    const companies = this._getRaw('companies', []);
    const idx = companies.findIndex(c => c.id === company.id);
    if (idx >= 0) companies[idx] = company; else companies.push(company);
    this._setRaw('companies', companies);
    return company;
  }

  // ── Modules (tenant-scoped) ──────────────────────────
  async getActiveModules() {
    const mods = this._tGet('modules', null);
    if (mods && Array.isArray(mods)) return mods;
    return this.SCHEMA.modules.slice();
  }
  async setActiveModules(m)        { this._tSet('modules', m); }

  // ── Settings (tenant-scoped) ─────────────────────────
  async getSettings()              { return this._tGet('settings', {}); }
  async saveSettings(s)            { this._tSet('settings', s); return s; }

  // ── Products (tenant-scoped) ─────────────────────────
  async getProducts()              { return this._tLive('products'); }
  async getAllProductsRaw()        { return this._tGet('products', []); }
  async saveProduct(p) {
    const isNew = !p.id || !this._tGet('products', []).some(x => x.id === p.id);
    return this._tUpsert('products', p, isNew);
  }
  async deleteProduct(id)          { return this._tSoftDelete('products', id); }
  async getProductById(id)         { return this._tFindById('products', id); }

  // ── Customers (tenant-scoped) ────────────────────────
  async getCustomers()             { return this._tLive('customers'); }
  async saveCustomer(c) {
    const isNew = !c.id || !this._tGet('customers', []).some(x => x.id === c.id);
    return this._tUpsert('customers', c, isNew);
  }
  async deleteCustomer(id)         { return this._tSoftDelete('customers', id); }
  async getCustomerById(id)        { return this._tFindById('customers', id); }

  // ── Sales (tenant-scoped) ─────────────────────────────
  async getSales()                 { return this._tLive('sales'); }
  async saveSale(s)                { return this._tUpsert('sales', s, true); }
  async deleteSale(id)             { return this._tSoftDelete('sales', id); }

  // ── Expenses (tenant-scoped) ─────────────────────────
  async getExpenses()              { return this._tLive('expenses'); }
  async saveExpense(e)             { return this._tUpsert('expenses', e, true); }
  async deleteExpense(id)          { return this._tSoftDelete('expenses', id); }

  // ── Suppliers (tenant-scoped) ────────────────────────
  async getSuppliers()             { return this._tLive('suppliers'); }
  async saveSupplier(s) {
    const isNew = !s.id || !this._tGet('suppliers', []).some(x => x.id === s.id);
    return this._tUpsert('suppliers', s, isNew);
  }
  async deleteSupplier(id)         { return this._tSoftDelete('suppliers', id); }
  async getSupplierById(id)        { return this._tFindById('suppliers', id); }

  // ── Purchases (tenant-scoped) ────────────────────────
  async getPurchases()             { return this._tLive('purchases'); }
  async savePurchase(p)            { return this._tUpsert('purchases', p, true); }

  // ── Activities (tenant-scoped) ───────────────────────
  async getActivities() {
    return this._tGet('activities', []);
  }
  async logActivity(entry) {
    const items = this._tGet('activities', []);
    items.unshift({
      type:   'activity',
      impact: null,
      user:   null,
      module: null,
      ...entry,
      id: UUID.v4(),
      ts: Date.now(),
    });
    this._tSet('activities', items.slice(0, 200));
  }

  // ── Raw access (for AppState, Logger, Settings) ──────
  async getRaw(key, fallback)      { return this._getRaw(key, fallback); }
  async setRaw(key, value)         { this._setRaw(key, value); }
  async removeRaw(key)             { this._removeRaw(key); }

  // ── Expose stamp for DataCore ────────────────────────
  stamp(entity, isNew)             { return this._stamp(entity, isNew); }
  generateId()                     { return UUID.v4(); }

  // ── Seed demo data ────────────────────────────────────
  async seedDemoData(companyId) {
    const products = await this.getProducts();
    if (products.length > 0) return;

    const mkProduct  = (over) => this._stamp({ companyId, ...over }, true);
    const mkCustomer = (over) => this._stamp({ companyId, purchases: 0, totalSpent: 0, ...over }, true);

    const demoProducts = [
      mkProduct({ name: 'Filtro de Óleo Bosch',          category: 'Filtros',    price: 45.90,  quantity: 87,  minStock: 20 }),
      mkProduct({ name: 'Pastilha de Freio Dianteira',   category: 'Freios',     price: 189.00, quantity: 12,  minStock: 15 }),
      mkProduct({ name: 'Vela de Ignição NGK',           category: 'Motor',      price: 28.50,  quantity: 144, minStock: 30 }),
      mkProduct({ name: 'Correia Dentada Gates',         category: 'Motor',      price: 210.00, quantity: 8,   minStock: 10 }),
      mkProduct({ name: 'Amortecedor Dianteiro Monroe',  category: 'Suspensão',  price: 380.00, quantity: 6,   minStock: 5  }),
      mkProduct({ name: 'Fluido de Freio DOT4',          category: 'Fluidos',    price: 22.00,  quantity: 60,  minStock: 20 }),
    ];

    const demoCustomers = [
      mkCustomer({ name: 'Carlos Mendes',  phone: '(11) 98234-5678', email: 'carlos@email.com'       }),
      mkCustomer({ name: 'Ana Paula Costa',phone: '(21) 99112-3344', email: 'ana@empresa.com.br'      }),
      mkCustomer({ name: 'Oficina do João',phone: '(31) 3322-4455',  email: 'joao@oficina.com'        }),
    ];

    for (const p of demoProducts) await this.saveProduct(p);
    for (const c of demoCustomers) await this.saveCustomer(c);

    const mkSale = (over) => this._stamp({ companyId, ...over }, true);
    const sales = [
      mkSale({ productId: demoProducts[0].id, productName: demoProducts[0].name, quantity: 5,  unitPrice: 45.90,  total: 229.50, customerId: demoCustomers[0].id, customerName: demoCustomers[0].name, payment: 'pix',      createdAt: Date.now() - 86400000 * 6 }),
      mkSale({ productId: demoProducts[2].id, productName: demoProducts[2].name, quantity: 10, unitPrice: 28.50,  total: 285.00, customerId: null,                customerName: 'Balcão',              payment: 'dinheiro',  createdAt: Date.now() - 86400000 * 5 }),
      mkSale({ productId: demoProducts[1].id, productName: demoProducts[1].name, quantity: 2,  unitPrice: 189.00, total: 378.00, customerId: demoCustomers[2].id, customerName: demoCustomers[2].name, payment: 'cartao',   createdAt: Date.now() - 86400000 * 4 }),
      mkSale({ productId: demoProducts[4].id, productName: demoProducts[4].name, quantity: 1,  unitPrice: 380.00, total: 380.00, customerId: demoCustomers[1].id, customerName: demoCustomers[1].name, payment: 'pix',      createdAt: Date.now() - 86400000 * 3 }),
      mkSale({ productId: demoProducts[3].id, productName: demoProducts[3].name, quantity: 3,  unitPrice: 210.00, total: 630.00, customerId: demoCustomers[0].id, customerName: demoCustomers[0].name, payment: 'cartao',   createdAt: Date.now() - 86400000 * 2 }),
      mkSale({ productId: demoProducts[5].id, productName: demoProducts[5].name, quantity: 8,  unitPrice: 22.00,  total: 176.00, customerId: null,                customerName: 'Balcão',              payment: 'dinheiro',  createdAt: Date.now() - 86400000     }),
      mkSale({ productId: demoProducts[0].id, productName: demoProducts[0].name, quantity: 3,  unitPrice: 45.90,  total: 137.70, customerId: demoCustomers[2].id, customerName: demoCustomers[2].name, payment: 'pix',      createdAt: Date.now() - 3600000      }),
    ];
    for (const s of sales) await this.saveSale(s);

    // Sync product stock to reflect demo sales
    const stockDeltas = {};
    for (const s of sales) {
      stockDeltas[s.productId] = (stockDeltas[s.productId] || 0) + s.quantity;
    }
    const allProducts = await this.getProducts();
    for (const p of allProducts) {
      if (stockDeltas[p.id]) {
        p.quantity = Math.max(0, p.quantity - stockDeltas[p.id]);
        await this.saveProduct(p);
      }
    }

    const mkExpense = (over) => this._stamp({ companyId, ...over }, true);
    const expenses = [
      mkExpense({ description: 'Aluguel',           amount: 3500.00, category: 'Fixo',       createdAt: Date.now() - 86400000 * 6 }),
      mkExpense({ description: 'Conta de Energia',  amount:  420.00, category: 'Utilidades', createdAt: Date.now() - 86400000 * 4 }),
      mkExpense({ description: 'Fornecedor Bosch',  amount: 1800.00, category: 'Estoque',    createdAt: Date.now() - 86400000 * 2 }),
    ];
    for (const e of expenses) await this.saveExpense(e);
  }
}

export default FakeLocalStorageProvider;
