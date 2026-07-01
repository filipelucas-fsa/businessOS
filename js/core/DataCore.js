/**
 * BusinessOS v1.3 — DataCore
 *
 * Camada de dados para entidades: suppliers e purchases.
 * V1.3: agora usa bucket com escopo de tenant via FakeLocalStorageProvider._tenantKey()
 *
 * Migração para backend: substituir calls por fetch() no APIProvider.
 */

import StorageService from './storage.js';

const DataCore = (() => {
  const p = () => StorageService.getProvider();

  function _read(bucket)        { return p()._tGet ? p()._tGet(bucket, []) : StorageService._getRaw(bucket, []); }
  function _write(bucket, data) { p()._tSet ? p()._tSet(bucket, data)      : StorageService._setRaw(bucket, data); }
  function _live(list)          { return (list || []).filter(r => !r?.deleted); }

  function _upsert(bucket, record) {
    const items = _read(bucket);
    const isNew = !items.some(r => r.id === record.id);
    StorageService._stamp(record, isNew);
    const idx = items.findIndex(r => r.id === record.id);
    if (idx >= 0) items[idx] = record; else items.push(record);
    _write(bucket, items);
    return record;
  }

  function _softDelete(bucket, id) {
    const items = _read(bucket);
    const idx = items.findIndex(r => r.id === id);
    if (idx < 0) return false;
    items[idx].deleted   = true;
    items[idx].deletedAt = Date.now();
    items[idx].updatedAt = Date.now();
    _write(bucket, items);
    return true;
  }

  // ── Suppliers ─────────────────────────────────────────────
  function getSuppliers()      { return _live(_read('suppliers')); }
  function getSupplierById(id) { return getSuppliers().find(s => s.id === id) || null; }

  function saveSupplier(data) {
    const session = StorageService.getSession();
    const supplier = {
      id:           data.id || StorageService.generateId(),
      companyId:    session?.companyId || 'default',
      name:         (data.name     || '').trim(),
      contact:      (data.contact  || '').trim(),
      phone:        (data.phone    || '').trim(),
      email:        (data.email    || '').trim(),
      cnpj:         (data.cnpj    || '').trim(),
      category:     (data.category || 'Geral').trim(),
      notes:        (data.notes   || '').trim(),
      totalSpent:   data.totalSpent  || 0,
      purchases:    data.purchases   || 0,
      lastPurchase: data.lastPurchase || null,
    };
    return _upsert('suppliers', supplier);
  }

  function deleteSupplier(id) { return _softDelete('suppliers', id); }

  // ── Purchases ─────────────────────────────────────────────
  function getPurchases()      { return _live(_read('purchases')); }
  function getPurchaseById(id) { return getPurchases().find(p => p.id === id) || null; }

  function savePurchase(data) {
    const session = StorageService.getSession();
    const purchase = {
      id:           StorageService.generateId(),
      companyId:    session?.companyId || 'default',
      supplierId:   data.supplierId   || null,
      supplierName: data.supplierName || 'Fornecedor Avulso',
      productId:    data.productId,
      productName:  data.productName,
      quantity:     parseInt(data.quantity,  10) || 0,
      unitCost:     parseFloat(data.unitCost)    || 0,
      totalCost:    parseFloat(data.totalCost)   || 0,
      category:     data.category || 'Estoque',
      notes:        data.notes    || '',
      createdAt:    Date.now(),
    };
    return _upsert('purchases', purchase);
  }

  // ── Pass-through ──────────────────────────────────────────
  const getProducts     = ()  => StorageService.getProducts();
  const getProductById  = id  => StorageService.getProductById(id);
  const saveProduct     = p   => StorageService.saveProduct(p);
  const getCustomers    = ()  => StorageService.getCustomers();
  const getCustomerById = id  => StorageService.getCustomerById(id);
  const saveCustomer    = c   => StorageService.saveCustomer(c);
  const getSales        = ()  => StorageService.getSales();
  const saveSale        = s   => StorageService.saveSale(s);
  const getExpenses     = ()  => StorageService.getExpenses();
  const saveExpense     = e   => StorageService.saveExpense(e);
  const getActivities   = ()  => StorageService.getActivities();
  const logActivity     = e   => StorageService.logActivity(e);
  const generateId      = ()  => StorageService.generateId();

  // ── Seed demo v1.2 ────────────────────────────────────────
  function seedV12DemoData() {
    if (getSuppliers().length > 0) return;
    const products = getProducts();
    if (products.length === 0) return;

    const s1 = saveSupplier({ name: 'Bosch do Brasil',      contact: 'Pedro Alves', phone: '(11) 3344-5566', email: 'vendas@bosch-br.com',   cnpj: '06.629.107/0001-05', category: 'Filtros/Motor' });
    const s2 = saveSupplier({ name: 'Monroe Distribuidora', contact: 'Carla Souza', phone: '(21) 2233-4455', email: 'carla@monroe.com.br',    cnpj: '33.041.260/0001-90', category: 'Suspensão'    });

    if (products[0]) {
      const pur = savePurchase({ supplierId: s1.id, supplierName: s1.name, productId: products[0].id, productName: products[0].name, quantity: 50, unitCost: 28.00, totalCost: 1400, category: 'Estoque' });
      saveSupplier({ ...s1, totalSpent: 1400, purchases: 1, lastPurchase: pur.createdAt });
    }
    if (products[4]) {
      const pur = savePurchase({ supplierId: s2.id, supplierName: s2.name, productId: products[4].id, productName: products[4].name, quantity: 10, unitCost: 240.00, totalCost: 2400, category: 'Estoque' });
      saveSupplier({ ...s2, totalSpent: 2400, purchases: 1, lastPurchase: pur.createdAt });
    }
  }

  return {
    getSuppliers, getSupplierById, saveSupplier, deleteSupplier,
    getPurchases, getPurchaseById, savePurchase,
    getProducts, getProductById, saveProduct,
    getCustomers, getCustomerById, saveCustomer,
    getSales, saveSale,
    getExpenses, saveExpense,
    getActivities, logActivity,
    generateId,
    seedV12DemoData,
  };
})();

export default DataCore;
