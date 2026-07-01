/**
 * BusinessOS v1.3 — StorageProvider (Abstract Interface)
 *
 * Defines the contract that all storage implementations must fulfill.
 * The FakeLocalStorageProvider implements this interface today.
 * A future APIProvider will swap it out without touching modules.
 *
 * API SLOT: STORAGE BACKEND
 * FUTURE: Replace FakeLocalStorageProvider with APIProvider (REST/GraphQL)
 */

export class StorageProvider {
  // ── Users ──────────────────────────────────────────────
  async getUsers()                { throw new Error('Not implemented'); }
  async saveUser(user)            { throw new Error('Not implemented'); }
  async findUserByEmail(email)    { throw new Error('Not implemented'); }

  // ── Session ────────────────────────────────────────────
  async getSession()              { throw new Error('Not implemented'); }
  async setSession(user)          { throw new Error('Not implemented'); }
  async clearSession()            { throw new Error('Not implemented'); }

  // ── Company / Tenant ───────────────────────────────────
  async getCompany(companyId)     { throw new Error('Not implemented'); }
  async saveCompany(company)      { throw new Error('Not implemented'); }

  // ── Modules ────────────────────────────────────────────
  async getActiveModules()        { throw new Error('Not implemented'); }
  async setActiveModules(list)    { throw new Error('Not implemented'); }

  // ── Settings ───────────────────────────────────────────
  async getSettings()             { throw new Error('Not implemented'); }
  async saveSettings(s)           { throw new Error('Not implemented'); }

  // ── Products ───────────────────────────────────────────
  async getProducts()             { throw new Error('Not implemented'); }
  async saveProduct(p)            { throw new Error('Not implemented'); }
  async deleteProduct(id)         { throw new Error('Not implemented'); }
  async getProductById(id)        { throw new Error('Not implemented'); }

  // ── Customers ──────────────────────────────────────────
  async getCustomers()            { throw new Error('Not implemented'); }
  async saveCustomer(c)           { throw new Error('Not implemented'); }
  async deleteCustomer(id)        { throw new Error('Not implemented'); }
  async getCustomerById(id)       { throw new Error('Not implemented'); }

  // ── Sales ──────────────────────────────────────────────
  async getSales()                { throw new Error('Not implemented'); }
  async saveSale(s)               { throw new Error('Not implemented'); }
  async deleteSale(id)            { throw new Error('Not implemented'); }

  // ── Expenses ───────────────────────────────────────────
  async getExpenses()             { throw new Error('Not implemented'); }
  async saveExpense(e)            { throw new Error('Not implemented'); }
  async deleteExpense(id)         { throw new Error('Not implemented'); }

  // ── Suppliers ──────────────────────────────────────────
  async getSuppliers()            { throw new Error('Not implemented'); }
  async saveSupplier(s)           { throw new Error('Not implemented'); }
  async deleteSupplier(id)        { throw new Error('Not implemented'); }
  async getSupplierById(id)       { throw new Error('Not implemented'); }

  // ── Purchases ──────────────────────────────────────────
  async getPurchases()            { throw new Error('Not implemented'); }
  async savePurchase(p)           { throw new Error('Not implemented'); }

  // ── Activities ─────────────────────────────────────────
  async getActivities()           { throw new Error('Not implemented'); }
  async logActivity(entry)        { throw new Error('Not implemented'); }

  // ── Raw access (for AppState, Logger, Settings) ────────
  async getRaw(key, fallback)     { throw new Error('Not implemented'); }
  async setRaw(key, value)        { throw new Error('Not implemented'); }
  async removeRaw(key)            { throw new Error('Not implemented'); }
}
