/**
 * BusinessOS — InsightsEngine (v1.2)
 *
 * Gera análises automáticas do negócio usando apenas regras e cálculos.
 * SEM IA. Preparado para receber IA na v1.3 via método `analyzeWithAI()`.
 *
 * Cada insight tem:
 *   {
 *     id:       string  (slug único)
 *     type:     'success' | 'warning' | 'danger' | 'info'
 *     category: 'estoque' | 'vendas' | 'financeiro' | 'clientes'
 *     title:    string
 *     body:     string
 *     value:    number | null  (valor principal para renderização)
 *     unit:     string | null  ('R$', '%', 'un.', 'dias', ...)
 *     priority: 1-10 (10 = mais urgente)
 *     data:     object  (payload raw para drill-down futuro)
 *   }
 */

import DataCore from './DataCore.js';

const InsightsEngine = (() => {

  // ── Helpers internos ─────────────────────────────────────
  function _fmt(n) {
    return Number(n || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }

  function _byPeriod(sales, days) {
    const since = Date.now() - days * 86400000;
    return sales.filter(s => s.createdAt >= since);
  }

  function _monthLabel(offset = 0) {
    const d = new Date();
    d.setMonth(d.getMonth() - offset);
    return d.getMonth();
  }

  function _salesInMonth(sales, monthIndex) {
    return sales.filter(s => new Date(s.createdAt).getMonth() === monthIndex);
  }

  function _growth(current, previous) {
    if (!previous) return current > 0 ? 100 : 0;
    return ((current - previous) / previous) * 100;
  }

  // ── Análises de Estoque ──────────────────────────────────

  function _insightStockCritical(products) {
    const critical = products.filter(p => p.quantity === 0);
    if (critical.length === 0) return null;
    return {
      id: 'stock_zero',
      type: 'danger',
      category: 'estoque',
      title: `${critical.length} produto${critical.length > 1 ? 's' : ''} zerado${critical.length > 1 ? 's' : ''}`,
      body: `${critical.slice(0, 3).map(p => p.name).join(', ')}${critical.length > 3 ? ` e mais ${critical.length - 3}` : ''} estão sem estoque. Compra urgente necessária.`,
      value: critical.length,
      unit: 'produtos',
      priority: 10,
      data: { products: critical },
    };
  }

  function _insightStockLow(products) {
    const low = products.filter(p => p.quantity > 0 && p.quantity <= p.minStock);
    if (low.length === 0) return null;
    return {
      id: 'stock_low',
      type: 'warning',
      category: 'estoque',
      title: `${low.length} produto${low.length > 1 ? 's' : ''} com estoque baixo`,
      body: `${low.slice(0, 3).map(p => `${p.name} (${p.quantity} un.)`).join(', ')} estão abaixo do mínimo.`,
      value: low.length,
      unit: 'alertas',
      priority: 8,
      data: { products: low },
    };
  }

  function _insightStockRupture(products, sales) {
    // Calcula previsão de ruptura: estoque_atual / giro_diário_médio
    const results = [];
    products.forEach(p => {
      const productSales = _byPeriod(sales, 30).filter(s => s.productId === p.id);
      const dailyRate = productSales.reduce((a, s) => a + s.quantity, 0) / 30;
      if (dailyRate > 0 && p.quantity > 0) {
        const daysToRupture = Math.floor(p.quantity / dailyRate);
        if (daysToRupture <= 14) {
          results.push({ name: p.name, days: daysToRupture, qty: p.quantity });
        }
      }
    });
    if (results.length === 0) return null;
    results.sort((a, b) => a.days - b.days);
    const worst = results[0];
    return {
      id: 'stock_rupture',
      type: 'warning',
      category: 'estoque',
      title: `Ruptura prevista em ${worst.days} dia${worst.days !== 1 ? 's' : ''}`,
      body: `"${worst.name}" com ritmo atual fica sem estoque em ${worst.days} dias. ${results.length > 1 ? `Mais ${results.length - 1} produto(s) em risco.` : ''}`,
      value: worst.days,
      unit: 'dias',
      priority: 7,
      data: { items: results },
    };
  }

  function _insightInventoryValue(products) {
    const value = products.reduce((a, p) => a + (p.price * p.quantity), 0);
    return {
      id: 'inventory_value',
      type: 'info',
      category: 'estoque',
      title: 'Valor total em estoque',
      body: `Seu estoque atual representa R$ ${_fmt(value)} imobilizado em ${products.length} produto(s).`,
      value,
      unit: 'R$',
      priority: 2,
      data: { value, products: products.length },
    };
  }

  function _insightStockTurnover(products, sales) {
    // Giro = (qtd vendida 30d) / estoque_médio
    const items = [];
    products.forEach(p => {
      const sold = _byPeriod(sales, 30).filter(s => s.productId === p.id).reduce((a, s) => a + s.quantity, 0);
      if (sold === 0 && p.quantity > 0) items.push(p);
    });
    if (items.length === 0) return null;
    return {
      id: 'stock_idle',
      type: 'info',
      category: 'estoque',
      title: `${items.length} produto${items.length > 1 ? 's' : ''} sem venda em 30 dias`,
      body: `${items.slice(0, 3).map(p => p.name).join(', ')} não tiveram movimentação. Considere promoção ou descontinuação.`,
      value: items.length,
      unit: 'parados',
      priority: 4,
      data: { products: items },
    };
  }

  // ── Análises de Vendas ───────────────────────────────────

  function _insightSalesGrowth(sales) {
    const thisMonth  = _salesInMonth(sales, _monthLabel(0));
    const lastMonth  = _salesInMonth(sales, _monthLabel(1));
    const thisRev    = thisMonth.reduce((a, s) => a + s.total, 0);
    const lastRev    = lastMonth.reduce((a, s) => a + s.total, 0);
    const growth     = _growth(thisRev, lastRev);
    if (lastRev === 0 && thisRev === 0) return null;
    return {
      id: 'sales_growth',
      type: growth >= 0 ? 'success' : 'warning',
      category: 'vendas',
      title: growth >= 0 ? `Faturamento cresceu ${growth.toFixed(1)}%` : `Faturamento caiu ${Math.abs(growth).toFixed(1)}%`,
      body: `Este mês: R$ ${_fmt(thisRev)}. Mês anterior: R$ ${_fmt(lastRev)}.`,
      value: growth,
      unit: '%',
      priority: growth < -10 ? 7 : 3,
      data: { thisRev, lastRev, growth },
    };
  }

  function _insightTopProduct(sales) {
    const map = {};
    sales.forEach(s => {
      if (!map[s.productId]) map[s.productId] = { name: s.productName, total: 0, qty: 0 };
      map[s.productId].total += s.total;
      map[s.productId].qty   += s.quantity;
    });
    const sorted = Object.values(map).sort((a, b) => b.total - a.total);
    if (sorted.length === 0) return null;
    const top = sorted[0];
    const share = sorted.length > 1
      ? (top.total / sorted.reduce((a, x) => a + x.total, 0) * 100).toFixed(1)
      : 100;
    return {
      id: 'top_product',
      type: 'success',
      category: 'vendas',
      title: `"${top.name}" é seu campeão de vendas`,
      body: `Representa ${share}% da receita total com R$ ${_fmt(top.total)} em ${top.qty} unidades vendidas.`,
      value: top.total,
      unit: 'R$',
      priority: 3,
      data: { product: top, share },
    };
  }

  function _insightAverageTicket(sales) {
    if (sales.length === 0) return null;
    const avg = sales.reduce((a, s) => a + s.total, 0) / sales.length;
    const last7 = _byPeriod(sales, 7);
    const avg7   = last7.length ? last7.reduce((a, s) => a + s.total, 0) / last7.length : 0;
    const delta  = _growth(avg7, avg);
    return {
      id: 'avg_ticket',
      type: 'info',
      category: 'vendas',
      title: `Ticket médio: R$ ${_fmt(avg)}`,
      body: `Nos últimos 7 dias o ticket foi R$ ${_fmt(avg7)} (${delta >= 0 ? '+' : ''}${delta.toFixed(1)}% vs média geral).`,
      value: avg,
      unit: 'R$',
      priority: 2,
      data: { avg, avg7, delta },
    };
  }

  function _insightNoSalesToday(sales) {
    const today = new Date(); today.setHours(0, 0, 0, 0);
    const todaySales = sales.filter(s => s.createdAt >= today.getTime());
    if (todaySales.length > 0) return null;
    return {
      id: 'no_sales_today',
      type: 'info',
      category: 'vendas',
      title: 'Nenhuma venda hoje',
      body: 'Ainda não há vendas registradas hoje. Registre uma nova venda para começar.',
      value: 0,
      unit: 'vendas',
      priority: 5,
      data: {},
    };
  }

  // ── Análises Financeiras ─────────────────────────────────

  function _insightProfitMargin(sales, expenses) {
    const revenue = sales.reduce((a, s) => a + s.total, 0);
    const totalExp = expenses.reduce((a, e) => a + e.amount, 0);
    const profit   = revenue - totalExp;
    const margin   = revenue > 0 ? (profit / revenue) * 100 : 0;
    if (revenue === 0) return null;
    return {
      id: 'profit_margin',
      type: margin > 20 ? 'success' : margin > 0 ? 'info' : 'danger',
      category: 'financeiro',
      title: `Margem de lucro: ${margin.toFixed(1)}%`,
      body: `Receita R$ ${_fmt(revenue)} − Despesas R$ ${_fmt(totalExp)} = Lucro R$ ${_fmt(profit)}.`,
      value: margin,
      unit: '%',
      priority: margin < 0 ? 9 : 3,
      data: { revenue, totalExp, profit, margin },
    };
  }

  function _insightExpenseConcentration(expenses) {
    if (expenses.length === 0) return null;
    const map = {};
    expenses.forEach(e => {
      map[e.category] = (map[e.category] || 0) + e.amount;
    });
    const sorted = Object.entries(map).sort((a, b) => b[1] - a[1]);
    if (sorted.length === 0) return null;
    const [topCat, topVal] = sorted[0];
    const total = Object.values(map).reduce((a, v) => a + v, 0);
    const pct   = total > 0 ? (topVal / total * 100).toFixed(1) : 0;
    return {
      id: 'expense_concentration',
      type: pct > 60 ? 'warning' : 'info',
      category: 'financeiro',
      title: `"${topCat}" representa ${pct}% das despesas`,
      body: `R$ ${_fmt(topVal)} de um total de R$ ${_fmt(total)} em despesas.`,
      value: parseFloat(pct),
      unit: '%',
      priority: pct > 60 ? 5 : 2,
      data: { categories: sorted, total },
    };
  }

  // ── Análises de Clientes ─────────────────────────────────

  function _insightTopCustomer(customers, sales) {
    const withPurchase = customers.filter(c => c.totalSpent > 0);
    if (withPurchase.length === 0) return null;
    const top = withPurchase.sort((a, b) => b.totalSpent - a.totalSpent)[0];
    const avg = top.purchases > 0 ? top.totalSpent / top.purchases : 0;
    return {
      id: 'top_customer',
      type: 'success',
      category: 'clientes',
      title: `"${top.name}" é seu melhor cliente`,
      body: `Total gasto: R$ ${_fmt(top.totalSpent)} em ${top.purchases} compra${top.purchases !== 1 ? 's' : ''}. Ticket médio: R$ ${_fmt(avg)}.`,
      value: top.totalSpent,
      unit: 'R$',
      priority: 2,
      data: { customer: top, avgTicket: avg },
    };
  }

  function _insightInactiveCustomers(customers, sales) {
    const cutoff = Date.now() - 30 * 86400000;
    const inactive = customers.filter(c => {
      if (!c.lastPurchase) return false;
      return c.lastPurchase < cutoff;
    });
    if (inactive.length === 0) return null;
    return {
      id: 'inactive_customers',
      type: 'info',
      category: 'clientes',
      title: `${inactive.length} cliente${inactive.length > 1 ? 's' : ''} sem compra há 30+ dias`,
      body: `${inactive.slice(0, 2).map(c => c.name).join(', ')} podem precisar de atenção. Considere contato de reativação.`,
      value: inactive.length,
      unit: 'clientes',
      priority: 4,
      data: { customers: inactive },
    };
  }

  // ── Gerador principal ────────────────────────────────────

  function generate() {
    const products  = DataCore.getProducts();
    const sales     = DataCore.getSales();
    const expenses  = DataCore.getExpenses();
    const customers = DataCore.getCustomers();

    const raw = [
      _insightStockCritical(products),
      _insightStockLow(products),
      _insightStockRupture(products, sales),
      _insightInventoryValue(products),
      _insightStockTurnover(products, sales),
      _insightSalesGrowth(sales),
      _insightTopProduct(sales),
      _insightAverageTicket(sales),
      _insightNoSalesToday(sales),
      _insightProfitMargin(sales, expenses),
      _insightExpenseConcentration(expenses),
      _insightTopCustomer(customers, sales),
      _insightInactiveCustomers(customers, sales),
    ].filter(Boolean);

    // Ordena por prioridade decrescente
    return raw.sort((a, b) => b.priority - a.priority);
  }

  // Retorna apenas os N mais prioritários
  function getTopInsights(n = 6) {
    return generate().slice(0, n);
  }

  // Retorna por categoria
  function getByCategory(category) {
    return generate().filter(i => i.category === category);
  }

  // Retorna apenas os do tipo 'danger'
  function getAlerts() {
    return generate().filter(i => i.type === 'danger' || i.type === 'warning');
  }

  return { generate, getTopInsights, getByCategory, getAlerts };
})();

export default InsightsEngine;
