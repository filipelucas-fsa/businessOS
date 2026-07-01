/**
 * BusinessOS — FinanceModule (v1.2.2)
 *
 * Receitas, despesas, lucro bruto/líquido, fluxo de caixa e relatórios mensais.
 * Todas as extensões v1.2 integradas ao IIFE principal.
 *
 * Migração para backend: substituir StorageService por chamadas HTTP.
 */

import StorageService from '../core/storage.js';
import EventBus from '../core/eventBus.js';
import NotificationService from '../core/notifications.js';

const FinanceModule = (() => {
  const { EVENTS } = EventBus;

  const MONTH_LABELS = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez'];

  function _currentUser() {
    try { return StorageService.getSession()?.name || 'sistema'; }
    catch { return 'sistema'; }
  }

  // ── Despesas ──────────────────────────────────────────────

  function addExpense(data) {
    if (!data.description?.trim() || !data.amount) {
      NotificationService.error('Preencha descrição e valor da despesa.');
      return null;
    }
    const amount = parseFloat(data.amount);
    if (isNaN(amount) || amount <= 0) {
      NotificationService.error('Valor da despesa deve ser maior que zero.');
      return null;
    }
    const expense = {
      id:          StorageService.generateId(),
      companyId:   StorageService.getSession()?.companyId || 'default',
      description: data.description.trim(),
      amount,
      category:    data.category || 'Geral',
      createdAt:   Date.now(),
    };
    StorageService.saveExpense(expense);
    StorageService.logActivity({
      type:   'expense',
      action: 'Despesa registrada',
      detail: `${expense.description} — R$ ${expense.amount.toFixed(2)}`,
      impact: `Categoria: ${expense.category}`,
      user:   _currentUser(),
      module: 'finance',
    });
    EventBus.publish(EVENTS.EXPENSE_CREATED, { expense });
    EventBus.publish(EVENTS.DASHBOARD_REFRESH, {});
    NotificationService.success(`Despesa registrada: R$ ${expense.amount.toFixed(2)}`);
    return expense;
  }

  // ── Métricas de receita / lucro ───────────────────────────

  function getTotalRevenue() {
    return StorageService.getSales().reduce((s, sale) => s + sale.total, 0);
  }

  function getTotalExpenses() {
    return StorageService.getExpenses().reduce((s, e) => s + e.amount, 0);
  }

  function getProfit()      { return getTotalRevenue() - getTotalExpenses(); }

  function getGrossProfit() {
    const revenue = getTotalRevenue();
    const cogs = StorageService.getExpenses()
      .filter(e => e.category === 'Estoque')
      .reduce((a, e) => a + e.amount, 0);
    return revenue - cogs;
  }

  function getNetProfit()   { return getProfit(); }

  function getProfitMargin() {
    const rev = getTotalRevenue();
    return rev > 0 ? (getProfit() / rev) * 100 : 0;
  }

  // ── Relatórios ────────────────────────────────────────────

  function getAll() {
    const sales = StorageService.getSales().map(s => ({
      ...s,
      type:        'receita',
      description: `Venda: ${s.productName}`,
      amount:      s.total,
    }));
    const expenses = StorageService.getExpenses().map(e => ({
      ...e,
      type: 'despesa',
    }));
    return [...sales, ...expenses].sort((a, b) => b.createdAt - a.createdAt);
  }

  /** @deprecated Use getMonthlyReport() */
  function getMonthlySummary() {
    return getMonthlyReport();
  }

  function getMonthlyReport() {
    const result = MONTH_LABELS.map(label => ({ label, revenue: 0, expenses: 0, profit: 0 }));
    StorageService.getSales().forEach(s => {
      result[new Date(s.createdAt).getMonth()].revenue += s.total;
    });
    StorageService.getExpenses().forEach(e => {
      result[new Date(e.createdAt).getMonth()].expenses += e.amount;
    });
    result.forEach(r => { r.profit = r.revenue - r.expenses; });
    return result;
  }

  function getExpensesByCategory() {
    const map = {};
    StorageService.getExpenses().forEach(e => {
      map[e.category] = (map[e.category] || 0) + e.amount;
    });
    return Object.entries(map)
      .map(([category, total]) => ({ category, total }))
      .sort((a, b) => b.total - a.total);
  }

  function getCashFlow(days = 30) {
    const today = new Date(); today.setHours(0, 0, 0, 0);
    const sales    = StorageService.getSales();
    const expenses = StorageService.getExpenses();
    let runningBalance = 0;
    const result = [];

    for (let i = days - 1; i >= 0; i--) {
      const start = new Date(today); start.setDate(start.getDate() - i);
      const end   = new Date(start); end.setDate(end.getDate() + 1);
      const s = start.getTime(), e = end.getTime();

      const income  = sales.filter(x => x.createdAt >= s && x.createdAt < e).reduce((a, x) => a + x.total, 0);
      const outcome = expenses.filter(x => x.createdAt >= s && x.createdAt < e).reduce((a, x) => a + x.amount, 0);
      const net     = income - outcome;
      runningBalance += net;

      result.push({
        date:    start.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' }),
        income, outcome, net,
        balance: runningBalance,
      });
    }
    return result;
  }

  /** Convenience: raw expenses array (used by some renderers) */
  function getExpenses() { return StorageService.getExpenses(); }

  return {
    addExpense,
    getTotalRevenue, getTotalExpenses,
    getProfit, getGrossProfit, getNetProfit, getProfitMargin,
    getAll, getMonthlySummary, getMonthlyReport,
    getExpensesByCategory, getCashFlow, getExpenses,
  };
})();

export default FinanceModule;
