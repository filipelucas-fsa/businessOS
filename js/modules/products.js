/**
 * BusinessOS — ProductsModule (v1.2.2)
 *
 * CRUD completo de produtos + controle de estoque.
 * Todas as extensões v1.2 integradas ao IIFE principal.
 *
 * Migração para backend: substituir StorageService por chamadas HTTP.
 */

import StorageService from '../core/storage.js';
import EventBus from '../core/eventBus.js';
import NotificationService from '../core/notifications.js';

const ProductsModule = (() => {
  const { EVENTS } = EventBus;

  function _currentUser() {
    try { return StorageService.getSession()?.name || 'sistema'; }
    catch { return 'sistema'; }
  }

  // ── CRUD ──────────────────────────────────────────────────

  function create(data) {
    if (!data.name?.trim()) {
      NotificationService.error('Nome do produto é obrigatório.');
      return null;
    }
    const price = parseFloat(data.price);
    if (!price || price <= 0) {
      NotificationService.error('Preço deve ser maior que zero.');
      return null;
    }
    const product = {
      id:       StorageService.generateId(),
      companyId: StorageService.getSession()?.companyId || 'default',
      name:     data.name.trim(),
      category: data.category?.trim() || 'Geral',
      price,
      quantity: Math.max(0, parseInt(data.quantity, 10) || 0),
      minStock: Math.max(0, parseInt(data.minStock, 10) || 5),
      createdAt: Date.now(),
    };
    StorageService.saveProduct(product);
    StorageService.logActivity({
      type:   'product',
      action: 'Produto criado',
      detail: product.name,
      impact: `Estoque inicial: ${product.quantity} un. | Preço: R$ ${product.price.toFixed(2)}`,
      user:   _currentUser(),
      module: 'products',
    });
    EventBus.publish(EVENTS.PRODUCT_CREATED, { product });
    EventBus.publish(EVENTS.DASHBOARD_REFRESH, {});
    _checkLowStock(product);
    NotificationService.success(`Produto "${product.name}" criado.`);
    return product;
  }

  function update(id, data) {
    const product = StorageService.getProductById(id);
    if (!product) {
      NotificationService.error('Produto não encontrado.');
      return null;
    }
    const price = data.price !== undefined ? parseFloat(data.price) : product.price;
    if (price <= 0) {
      NotificationService.error('Preço deve ser maior que zero.');
      return null;
    }
    const updated = {
      ...product,
      ...data,
      price,
      id,
      updatedAt: Date.now(),
    };
    StorageService.saveProduct(updated);
    StorageService.logActivity({
      type:   'product',
      action: 'Produto atualizado',
      detail: updated.name,
      user:   _currentUser(),
      module: 'products',
    });
    EventBus.publish(EVENTS.PRODUCT_UPDATED, { product: updated });
    EventBus.publish(EVENTS.DASHBOARD_REFRESH, {});
    _checkLowStock(updated);
    NotificationService.info(`Produto "${updated.name}" atualizado.`);
    return updated;
  }

  function remove(id) {
    const product = StorageService.getProductById(id);
    if (!product) {
      NotificationService.error('Produto não encontrado.');
      return false;
    }
    StorageService.deleteProduct(id);
    StorageService.logActivity({
      type:   'product',
      action: 'Produto removido',
      detail: product.name,
      impact: `${product.quantity} un. saíram do estoque. Valor: R$ ${(product.price * product.quantity).toFixed(2)}`,
      user:   _currentUser(),
      module: 'products',
    });
    EventBus.publish(EVENTS.PRODUCT_DELETED, { id, product });
    EventBus.publish(EVENTS.DASHBOARD_REFRESH, {});
    NotificationService.warning(`Produto "${product.name}" removido.`);
    return true;
  }

  // ── Estoque ───────────────────────────────────────────────

  function decreaseStock(id, qty) {
    const parsedQty = parseInt(qty, 10);
    const product = StorageService.getProductById(id);
    if (!product) return null;
    if (!parsedQty || parsedQty <= 0) return null;
    const updated = { ...product, quantity: Math.max(0, product.quantity - parsedQty) };
    StorageService.saveProduct(updated);
    EventBus.publish(EVENTS.STOCK_DECREASED, { product: updated, qty: parsedQty });
    _checkLowStock(updated);
    return updated;
  }

  function increaseStock(id, qty) {
    const parsedQty = parseInt(qty, 10);
    const product = StorageService.getProductById(id);
    if (!product) return null;
    if (!parsedQty || parsedQty <= 0) return null;
    const updated = { ...product, quantity: product.quantity + parsedQty };
    StorageService.saveProduct(updated);
    EventBus.publish(EVENTS.STOCK_INCREASED, { product: updated, qty: parsedQty });
    return updated;
  }

  function _checkLowStock(product) {
    if (product.quantity <= product.minStock) {
      NotificationService.warning(
        `Estoque baixo: "${product.name}" (${product.quantity} un.)`
      );
    }
  }

  // ── Leitura ───────────────────────────────────────────────

  function getAll()       { return StorageService.getProducts(); }
  function getById(id)    { return StorageService.getProductById(id); }

  function getLowStock() {
    return getAll().filter(p => p.quantity <= p.minStock);
  }

  function getInventoryValue() {
    return getAll().reduce((a, p) => a + (p.price * p.quantity), 0);
  }

  function getStockTurnover() {
    const sales = StorageService.getSales();
    const since = Date.now() - 30 * 86400000;
    return getAll().map(p => {
      const soldLast30 = sales
        .filter(s => s.productId === p.id && s.createdAt >= since)
        .reduce((a, s) => a + s.quantity, 0);
      const dailyRate       = soldLast30 / 30;
      const daysToRupture   = dailyRate > 0 && p.quantity > 0
        ? Math.floor(p.quantity / dailyRate)
        : null;
      const status = p.quantity === 0       ? 'zerado'
        : p.quantity <= p.minStock          ? 'baixo'
        : soldLast30 === 0                  ? 'parado'
        : 'ok';
      return { ...p, soldLast30, dailyRate, daysToRupture, turnoverRatio: p.quantity > 0 ? soldLast30 / p.quantity : 0, status };
    });
  }

  function getRuptureForecasts(withinDays = 14) {
    const sales = StorageService.getSales();
    const since = Date.now() - 30 * 86400000;
    return getAll()
      .map(p => {
        const sold      = sales.filter(s => s.productId === p.id && s.createdAt >= since).reduce((a, s) => a + s.quantity, 0);
        const dailyRate = sold / 30;
        if (dailyRate <= 0 || p.quantity <= 0) return null;
        const daysLeft  = Math.floor(p.quantity / dailyRate);
        return daysLeft <= withinDays ? { ...p, daysLeft, dailyRate: +dailyRate.toFixed(2) } : null;
      })
      .filter(Boolean)
      .sort((a, b) => a.daysLeft - b.daysLeft);
  }

  return {
    create, update, remove,
    decreaseStock, increaseStock,
    getAll, getById, getLowStock,
    getInventoryValue, getStockTurnover, getRuptureForecasts,
  };
})();

export default ProductsModule;
