/**
 * BusinessOS — DashboardService
 *
 * The ONLY authoritative source for Dashboard data. Screens MUST NOT
 * compute these values themselves — they consume this API.
 *
 * Returns aggregated snapshots; pure read layer. Mutations live in their
 * respective modules (Products, Sales, Finance, Customers).
 */

import StorageService from '../core/storage.js';
import ProductsModule from '../modules/products.js';
import SalesModule from '../modules/sales.js';
import CustomersModule from '../modules/customers.js';
import FinanceModule from '../modules/finance.js';
import Logger from './logger.js';

const DashboardService = (() => {

  function _growth(current, previous) {
    if (!previous) return current > 0 ? 100 : 0;
    return ((current - previous) / previous) * 100;
  }

  function getMetrics() {
    const sales = SalesModule.getAll();
    const todaySales = SalesModule.getTodaySales();
    const products = ProductsModule.getAll();
    const customers = CustomersModule.getAll();
    const lowStock = ProductsModule.getLowStock();
    const revenue = FinanceModule.getTotalRevenue();
    const expenses = FinanceModule.getTotalExpenses();
    const profit = FinanceModule.getProfit();

    // Compare last 7d vs previous 7d for growth
    const now = Date.now();
    const last7  = sales.filter(s => s.createdAt >= now - 7 * 86400000);
    const prev7  = sales.filter(s => s.createdAt >= now - 14 * 86400000 && s.createdAt < now - 7 * 86400000);
    const rev7   = last7.reduce((a,s) => a + s.total, 0);
    const revPrev= prev7.reduce((a,s) => a + s.total, 0);

    return {
      revenue,
      expenses,
      profit,
      salesCount: sales.length,
      todaySalesCount: todaySales.length,
      todayRevenue: todaySales.reduce((a,s) => a + s.total, 0),
      productsCount: products.length,
      customersCount: customers.length,
      lowStockCount: lowStock.length,
      growth: {
        revenue7d: _growth(rev7, revPrev),
        sales7d:   _growth(last7.length, prev7.length),
      },
    };
  }

  function getRecentMovements(limit = 10) {
    // Merge sales, products, customers, expenses, logs into a unified feed
    const events = [];
    SalesModule.getAll().slice(-limit * 2).forEach(s => events.push({
      ts: s.createdAt, type: 'sale',
      title: `Venda — ${s.productName}`,
      detail: `R$ ${s.total.toFixed(2)} • ${s.customerName}`,
    }));
    StorageService.getActivities().slice(0, limit * 2).forEach(a => events.push({
      ts: a.ts, type: a.type || 'activity',
      title: a.action, detail: a.detail,
    }));
    Logger.list({ limit: limit * 2 }).forEach(l => events.push({
      ts: l.ts, type: l.module,
      title: `${l.module} — ${l.action}`,
      detail: l.description,
    }));
    return events
      .sort((a, b) => b.ts - a.ts)
      .filter((e, i, arr) => arr.findIndex(x => x.ts === e.ts && x.title === e.title) === i)
      .slice(0, limit);
  }

  function getTopProducts(limit = 5) { return SalesModule.getTopProducts(limit); }
  function getTopCustomers(limit = 5) { return CustomersModule.getTopCustomers(limit); }
  function getLowStock() { return ProductsModule.getLowStock(); }
  function getWeeklySales() { return SalesModule.getWeeklySales(); }

  function getSnapshot() {
    return {
      metrics: getMetrics(),
      movements: getRecentMovements(12),
      topProducts: getTopProducts(5),
      topCustomers: getTopCustomers(5),
      lowStock: getLowStock(),
      weeklySales: getWeeklySales(),
      generatedAt: Date.now(),
    };
  }

  return {
    getMetrics, getRecentMovements, getTopProducts, getTopCustomers,
    getLowStock, getWeeklySales, getSnapshot,
  };
})();

export default DashboardService;
