/**
 * BusinessOS — SalesModule (v1.2.2)
 *
 * Criação de vendas com cascata automática:
 *   1. Salva venda
 *   2. Reduz estoque (STOCK_DECREASED)
 *   3. Atualiza cliente se vinculado
 *   4. Registra na timeline
 *   5. Dispara SALE_CREATED + DASHBOARD_REFRESH
 *
 * Migração para backend: substituir StorageService por chamadas HTTP.
 */

import StorageService from '../core/storage.js';
import EventBus from '../core/eventBus.js';
import NotificationService from '../core/notifications.js';
import ProductsModule from './products.js';
import CustomersModule from './customers.js';

const SalesModule = (() => {
  const { EVENTS } = EventBus;

  function _currentUser() {
    try { return StorageService.getSession()?.name || 'sistema'; }
    catch { return 'sistema'; }
  }

  // ── Criar venda ───────────────────────────────────────────

  function create(data) {
    const product = StorageService.getProductById(data.productId);
    if (!product) {
      NotificationService.error('Produto não encontrado.');
      return null;
    }

    const qty = parseInt(data.quantity, 10);
    if (!qty || qty <= 0) {
      NotificationService.error('Quantidade inválida.');
      return null;
    }
    if (product.quantity < qty) {
      NotificationService.error(`Estoque insuficiente. Disponível: ${product.quantity} un.`);
      return null;
    }

    const total = product.price * qty;

    const sale = {
      id:           StorageService.generateId(),
      companyId:    StorageService.getSession()?.companyId || 'default',
      productId:    product.id,
      productName:  product.name,
      quantity:     qty,
      unitPrice:    product.price,
      total,
      customerId:   data.customerId   || null,
      customerName: data.customerName || 'Balcão',
      payment:      data.payment      || 'dinheiro',
      notes:        data.notes        || '',
      createdAt:    Date.now(),
    };

    // 1. Persiste a venda
    StorageService.saveSale(sale);

    // 2. Reduz estoque (publica STOCK_DECREASED internamente)
    ProductsModule.decreaseStock(product.id, qty);

    // 3. Atualiza cliente se vinculado
    if (sale.customerId) {
      CustomersModule.recordPurchase(sale.customerId, total);
    }

    // 4. Timeline enriquecida
    StorageService.logActivity({
      type:   'sale',
      action: 'Venda registrada',
      detail: `${sale.productName} × ${qty} — R$ ${total.toFixed(2)}`,
      impact: `Pagamento: ${sale.payment} | Cliente: ${sale.customerName}`,
      user:   _currentUser(),
      module: 'sales',
    });

    // 5. Eventos — apenas SALE_CREATED e DASHBOARD_REFRESH.
    //    Não publicamos EXPENSE_CREATED aqui: uma venda NÃO é uma despesa.
    EventBus.publish(EVENTS.SALE_CREATED, { sale });
    EventBus.publish(EVENTS.DASHBOARD_REFRESH, {});

    NotificationService.success(`Venda registrada! R$ ${total.toFixed(2)}`);
    return sale;
  }

  // ── Leitura ───────────────────────────────────────────────

  function getAll() { return StorageService.getSales(); }

  function getTodaySales() {
    const today = new Date(); today.setHours(0, 0, 0, 0);
    return getAll().filter(s => s.createdAt >= today.getTime());
  }

  function getByPeriod(days) {
    const since = Date.now() - days * 86400000;
    return getAll().filter(s => s.createdAt >= since);
  }

  function getTotalRevenue() {
    return getAll().reduce((sum, s) => sum + s.total, 0);
  }

  function getTopProducts(limit = 5) {
    const map = {};
    getAll().forEach(s => {
      if (!map[s.productId]) map[s.productId] = { name: s.productName, qty: 0, total: 0 };
      map[s.productId].qty   += s.quantity;
      map[s.productId].total += s.total;
    });
    return Object.values(map)
      .sort((a, b) => b.total - a.total)
      .slice(0, limit);
  }

  function getWeeklySales() {
    const dayLabels = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date();
      d.setDate(d.getDate() - (6 - i));
      d.setHours(0, 0, 0, 0);
      const next = new Date(d);
      next.setDate(next.getDate() + 1);
      const value = getAll()
        .filter(s => s.createdAt >= d.getTime() && s.createdAt < next.getTime())
        .reduce((sum, s) => sum + s.total, 0);
      return { label: dayLabels[d.getDay()], value };
    });
  }

  return {
    create,
    getAll, getTodaySales, getByPeriod,
    getTotalRevenue, getTopProducts, getWeeklySales,
  };
})();

export default SalesModule;
