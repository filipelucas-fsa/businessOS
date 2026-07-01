/**
 * BusinessOS — StatisticsService
 *
 * Statistical aggregations across sales, finance, and customers. Pure
 * read layer; never mutates state. All numbers come from here so the UI
 * never duplicates math.
 */

import SalesModule from '../modules/sales.js';
import CustomersModule from '../modules/customers.js';
import FinanceModule from '../modules/finance.js';
import ProductsModule from '../modules/products.js';

const StatisticsService = (() => {

  function _sum(arr, key = 'total') {
    return arr.reduce((a, x) => a + (x[key] || 0), 0);
  }

  function _byPeriod(days) {
    const since = Date.now() - days * 86400000;
    return SalesModule.getAll().filter(s => s.createdAt >= since);
  }

  // ── Revenue across windows ─────────────────────────────
  function revenueDaily()   { return _sum(_byPeriod(1)); }
  function revenueWeekly()  { return _sum(_byPeriod(7)); }
  function revenueMonthly() { return _sum(_byPeriod(30)); }
  function revenueYearly()  { return _sum(_byPeriod(365)); }

  // ── Ticket / averages ──────────────────────────────────
  function averageTicket() {
    const sales = SalesModule.getAll();
    if (!sales.length) return 0;
    return _sum(sales) / sales.length;
  }

  function averageSalesPerDay(days = 30) {
    return _byPeriod(days).length / days;
  }

  // ── Profit ─────────────────────────────────────────────
  function profit()        { return FinanceModule.getProfit(); }
  function profitMargin()  {
    const r = FinanceModule.getTotalRevenue();
    return r > 0 ? (FinanceModule.getProfit() / r) * 100 : 0;
  }

  // ── Top items ──────────────────────────────────────────
  function topProducts(limit = 5)  { return SalesModule.getTopProducts(limit); }
  function topCustomers(limit = 5) { return CustomersModule.getTopCustomers(limit); }

  // ── Cash flow timeline (last N days) ───────────────────
  function cashFlow(days = 30) {
    const result = [];
    const today = new Date(); today.setHours(0, 0, 0, 0);
    for (let i = days - 1; i >= 0; i--) {
      const start = new Date(today); start.setDate(start.getDate() - i);
      const end = new Date(start); end.setDate(end.getDate() + 1);
      const dayRev = SalesModule.getAll()
        .filter(s => s.createdAt >= start.getTime() && s.createdAt < end.getTime())
        .reduce((a, s) => a + s.total, 0);
      const dayExp = FinanceModule.getExpenses ?
        FinanceModule.getExpenses().filter(e => e.createdAt >= start.getTime() && e.createdAt < end.getTime())
                                   .reduce((a, e) => a + (e.amount || 0), 0) : 0;
      result.push({
        date: start.toISOString().slice(0, 10),
        income: dayRev,
        outcome: dayExp,
        net: dayRev - dayExp,
      });
    }
    return result;
  }

  function inventoryValue() {
    return ProductsModule.getAll().reduce((a, p) => a + (p.price * p.quantity), 0);
  }

  function getSummary() {
    return {
      revenue: {
        daily:   revenueDaily(),
        weekly:  revenueWeekly(),
        monthly: revenueMonthly(),
        yearly:  revenueYearly(),
      },
      profit:         profit(),
      profitMargin:   profitMargin(),
      averageTicket:  averageTicket(),
      salesPerDay:    averageSalesPerDay(),
      inventoryValue: inventoryValue(),
      topProducts:    topProducts(),
      topCustomers:   topCustomers(),
      cashFlow:       cashFlow(30),
    };
  }

  return {
    revenueDaily, revenueWeekly, revenueMonthly, revenueYearly,
    averageTicket, averageSalesPerDay, profit, profitMargin,
    topProducts, topCustomers, cashFlow, inventoryValue, getSummary,
  };
})();

export default StatisticsService;
