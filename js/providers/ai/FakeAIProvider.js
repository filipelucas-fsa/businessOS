/**
 * BusinessOS v1.3 — FakeAIProvider
 *
 * Simulates an AI assistant using only internal business data.
 * Zero external API calls. Responses are rule-based analyses
 * formatted to look like natural language.
 *
 * API SLOT: AI PROVIDER
 * FUTURE: Replace with ClaudeProvider, GeminiProvider, or OpenAIProvider
 *
 * Supported queries:
 *   - "Qual produto mais vendeu?"
 *   - "Resumo financeiro"
 *   - "Alertas de estoque"
 *   - "Melhores clientes"
 *   - "Análise de vendas"
 *   - "Fluxo de caixa"
 *   Any other → generic analysis
 */

export class FakeAIProvider {
  constructor(storageProvider) {
    this.storage = storageProvider;
    this.model   = 'BusinessOS FakeAI v1.3';
  }

  async analyze(query) {
    const q = query.toLowerCase();

    // Strategic business audit — loads all data for deep analysis
    if (q.includes('estratégic') || q.includes('auditoria') || q.includes('consultoria') ||
        q.includes('melhoria') || q.includes('otimizar') || q.includes('crescimento') ||
        q.includes('oportunidade') || (q.includes('aumentar') && q.includes('lucro')) ||
        q.includes('como melhorar') || q.includes('diagnóstico')) {
      return this._businessAudit();
    }

    if (q.includes('produto') && (q.includes('vendeu') || q.includes('mais vendido') || q.includes('top'))) {
      return this._topProducts();
    }
    if (q.includes('financeiro') || q.includes('fatura') || q.includes('receita') || q.includes('lucro')) {
      return this._financialSummary();
    }
    if (q.includes('estoque') || q.includes('ruptura') || q.includes('crítico') || q.includes('alerta')) {
      return this._stockAlerts();
    }
    if (q.includes('cliente') || q.includes('crm')) {
      return this._customerAnalysis();
    }
    if (q.includes('venda') || q.includes('receita') || q.includes('faturamento')) {
      return this._salesAnalysis();
    }
    if (q.includes('fluxo') || q.includes('caixa') || q.includes('despesa')) {
      return this._cashFlow();
    }
    if (q.includes('resumo') || q.includes('geral') || q.includes('relatório')) {
      return this._generalSummary();
    }

    // Fallback instant — no data loaded
    return {
      text: 'Posso ajudar com:\n\n📦 **Produtos** — "Top produtos", "Estoque baixo"\n💰 **Financeiro** — "Resumo financeiro", "Fluxo de caixa"\n👥 **Clientes** — "Análise de clientes"\n📊 **Vendas** — "Análise de vendas"\n📈 **Estratégia** — "Análise estratégica", "Como aumentar o lucro?"\n\nFaça uma pergunta!',
      source: 'ajuda',
    };
  }

  async _topProducts() {
    const sales    = await this.storage.getSales();
    const products = await this.storage.getProducts();

    // Aggregate sales by product
    const totals = {};
    for (const s of sales) {
      if (!totals[s.productId]) {
        totals[s.productId] = { name: s.productName, qty: 0, revenue: 0 };
      }
      totals[s.productId].qty     += s.quantity;
      totals[s.productId].revenue += s.total;
    }

    const ranked = Object.values(totals).sort((a, b) => b.revenue - a.revenue).slice(0, 5);

    if (ranked.length === 0) {
      return { text: 'Ainda não há vendas registradas para análise.', source: 'vendas' };
    }

    const fmt = n => n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
    const lines = ranked.map((p, i) => `${i + 1}. **${p.name}** — ${p.qty} unid. / ${fmt(p.revenue)}`);

    return {
      text: `**Top ${ranked.length} produtos por receita:**\n\n${lines.join('\n')}\n\n🏆 Campeão de vendas: **${ranked[0].name}** com ${fmt(ranked[0].revenue)} em receita.`,
      source: 'vendas',
      data: ranked,
    };
  }

  async _financialSummary() {
    const sales    = await this.storage.getSales();
    const expenses = await this.storage.getExpenses();

    const now   = Date.now();
    const month = 30 * 86400000;
    const recSales = sales.filter(s    => s.createdAt > now - month);
    const recExp   = expenses.filter(e => e.createdAt > now - month);

    const revenue = recSales.reduce((a, s) => a + (s.total || 0), 0);
    const costs   = recExp.reduce((a, e) => a + (e.amount || 0), 0);
    const profit  = revenue - costs;
    const margin  = revenue > 0 ? ((profit / revenue) * 100).toFixed(1) : 0;

    const fmt = n => n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

    const status = profit > 0 ? '✅ lucro' : profit === 0 ? '⚖️ equilíbrio' : '🔴 prejuízo';

    return {
      text: `**Resumo Financeiro — Últimos 30 dias:**\n\n📈 Receita: **${fmt(revenue)}**\n📉 Despesas: **${fmt(costs)}**\n💰 Resultado: **${fmt(profit)}** (${margin}% margem) — ${status}\n\n${profit < 0 ? '⚠️ Atenção: as despesas superam a receita este mês.' : profit < costs * 0.1 ? '💡 Dica: margem apertada — revise categorias de despesa.' : '🎯 Negócio saudável — continue monitorando!'}`,
      source: 'financeiro',
      data: { revenue, costs, profit, margin },
    };
  }

  async _stockAlerts() {
    const products = await this.storage.getProducts();

    const zero   = products.filter(p => p.quantity === 0);
    const low    = products.filter(p => p.quantity > 0 && p.quantity <= (p.minStock || 5));
    const total  = products.length;

    const lines = [];
    if (zero.length > 0)  lines.push(`🔴 **Sem estoque (${zero.length}):** ${zero.slice(0,3).map(p => p.name).join(', ')}${zero.length > 3 ? ` +${zero.length-3}` : ''}`);
    if (low.length > 0)   lines.push(`🟡 **Estoque baixo (${low.length}):** ${low.slice(0,3).map(p => `${p.name} (${p.quantity} un.)`).join(', ')}`);
    if (lines.length === 0) lines.push('✅ Todos os produtos com estoque dentro do esperado.');

    const immobilized = products.reduce((a, p) => a + p.price * p.quantity, 0);
    const fmt = n => n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

    return {
      text: `**Análise de Estoque — ${total} produtos cadastrados:**\n\n${lines.join('\n')}\n\n📦 Valor total imobilizado em estoque: **${fmt(immobilized)}**`,
      source: 'estoque',
      data: { zero, low, immobilized, total },
    };
  }

  async _customerAnalysis() {
    const customers = await this.storage.getCustomers();
    const now       = Date.now();

    const active   = customers.filter(c => c.lastPurchase && now - c.lastPurchase < 30 * 86400000);
    const inactive = customers.filter(c => c.lastPurchase && now - c.lastPurchase >= 30 * 86400000);
    const never    = customers.filter(c => !c.lastPurchase);
    const top      = [...customers].sort((a, b) => (b.totalSpent || 0) - (a.totalSpent || 0)).slice(0, 3);

    const fmt = n => n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

    return {
      text: `**Análise de Clientes — ${customers.length} cadastrados:**\n\n✅ Ativos (últimos 30 dias): **${active.length}**\n⚠️ Inativos (30+ dias): **${inactive.length}**\n🆕 Sem compra registrada: **${never.length}**\n\n🏆 **Top 3 por gasto total:**\n${top.map((c, i) => `${i+1}. ${c.name} — ${fmt(c.totalSpent || 0)} (${c.purchases || 0} compras)`).join('\n')}`,
      source: 'clientes',
      data: { active: active.length, inactive: inactive.length, never: never.length, top },
    };
  }

  async _salesAnalysis() {
    const sales = await this.storage.getSales();
    const now   = Date.now();

    const today   = sales.filter(s => s.createdAt > now - 86400000);
    const week    = sales.filter(s => s.createdAt > now - 7 * 86400000);
    const month   = sales.filter(s => s.createdAt > now - 30 * 86400000);

    const sum = arr => arr.reduce((a, s) => a + (s.total || 0), 0);
    const fmt = n => n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

    const methods = {};
    for (const s of month) {
      methods[s.payment] = (methods[s.payment] || 0) + s.total;
    }
    const topMethod = Object.entries(methods).sort((a, b) => b[1] - a[1])[0];

    return {
      text: `**Análise de Vendas:**\n\n📅 Hoje: **${fmt(sum(today))}** (${today.length} vendas)\n📅 Esta semana: **${fmt(sum(week))}** (${week.length} vendas)\n📅 Este mês: **${fmt(sum(month))}** (${month.length} vendas)\n\n💳 Método de pagamento preferido: **${topMethod ? topMethod[0] : 'N/A'}** (${topMethod ? fmt(topMethod[1]) : '—'})\n\n${month.length === 0 ? '⚠️ Nenhuma venda no mês — revise estratégias de vendas.' : month.length < 5 ? '💡 Poucas vendas no mês — considere promoções.' : '✅ Volume de vendas saudável!'}`,
      source: 'vendas',
      data: { today: today.length, week: week.length, month: month.length, methods },
    };
  }

  async _cashFlow() {
    const sales    = await this.storage.getSales();
    const expenses = await this.storage.getExpenses();
    const now      = Date.now();

    // Build 14-day cash flow
    const days = Array.from({ length: 14 }, (_, i) => {
      const ts    = now - (13 - i) * 86400000;
      const start = new Date(ts).setHours(0, 0, 0, 0);
      const end   = new Date(ts).setHours(23, 59, 59, 999);
      const rev   = sales.filter(s => s.createdAt >= start && s.createdAt <= end).reduce((a, s) => a + s.total, 0);
      const exp   = expenses.filter(e => e.createdAt >= start && e.createdAt <= end).reduce((a, e) => a + e.amount, 0);
      return { date: new Date(ts).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' }), rev, exp, net: rev - exp };
    });

    const totalRev = days.reduce((a, d) => a + d.rev, 0);
    const totalExp = days.reduce((a, d) => a + d.exp, 0);
    const fmt = n => n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

    const positives = days.filter(d => d.net > 0).length;

    return {
      text: `**Fluxo de Caixa — Últimos 14 dias:**\n\n💚 Dias positivos: **${positives}/14**\n📈 Total de entradas: **${fmt(totalRev)}**\n📉 Total de saídas: **${fmt(totalExp)}**\n🏦 Saldo do período: **${fmt(totalRev - totalExp)}**\n\n${totalRev < totalExp ? '🔴 Período no vermelho — analise corte de despesas.' : '✅ Fluxo positivo — bom trabalho!'}`,
      source: 'financeiro',
      data: { days },
    };
  }

  async _generalSummary() {
    const [products, customers, sales, expenses] = await Promise.all([
      this.storage.getProducts(),
      this.storage.getCustomers(),
      this.storage.getSales(),
      this.storage.getExpenses(),
    ]);

    const now     = Date.now();
    const month   = 30 * 86400000;
    const revenue = sales.filter(s => s.createdAt > now - month).reduce((a, s) => a + s.total, 0);
    const costs   = expenses.filter(e => e.createdAt > now - month).reduce((a, e) => a + e.amount, 0);
    const lowStock= products.filter(p => p.quantity <= (p.minStock || 5)).length;
    const fmt     = n => n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

    return {
      text: `**Resumo Geral do BusinessOS:**\n\n📦 Produtos: **${products.length}** (${lowStock > 0 ? `⚠️ ${lowStock} com estoque baixo` : '✅ estoque ok'})\n👥 Clientes: **${customers.length}** cadastrados\n💰 Receita (30 dias): **${fmt(revenue)}**\n📉 Despesas (30 dias): **${fmt(costs)}**\n📊 Resultado: **${fmt(revenue - costs)}**\n\nPergunte-me sobre: produtos mais vendidos, alertas de estoque, resumo financeiro, análise de clientes, fluxo de caixa.`,
      source: 'geral',
      data: { products: products.length, customers: customers.length, revenue, costs },
    };
  }

  /**
   * Strategic business audit — cross-references all data to recommend improvements.
   * Loads all datasets because it needs the full picture.
   */
  async _businessAudit() {
    const [products, customers, sales, expenses] = await Promise.all([
      this.storage.getProducts(),
      this.storage.getCustomers(),
      this.storage.getSales(),
      this.storage.getExpenses(),
    ]);

    const now   = Date.now();
    const month = 30 * 86400000;
    const fmt   = n => n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

    // ── Product insights ──────────────────────────────
    const salesByProduct = {};
    for (const s of sales) {
      if (!salesByProduct[s.productId]) salesByProduct[s.productId] = { qty: 0, revenue: 0 };
      salesByProduct[s.productId].qty     += s.quantity;
      salesByProduct[s.productId].revenue += s.total;
    }

    const stagnant = products.filter(p => {
      const sold = salesByProduct[p.id]?.qty || 0;
      return sold === 0 && p.quantity > p.minStock;
    });
    const immobilized = products.reduce((a, p) => a + p.price * p.quantity, 0);
    const topProducts = Object.entries(salesByProduct)
      .map(([id, d]) => {
        const p = products.find(x => x.id === id);
        return p ? { ...d, name: p.name, margin: p.price - (p.costPrice || p.price * 0.6) } : null;
      })
      .filter(Boolean)
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 3);

    // ── Customer insights ─────────────────────────────
    const active   = customers.filter(c => c.lastPurchase && now - c.lastPurchase < month);
    const inactive = customers.filter(c => c.lastPurchase && now - c.lastPurchase >= month);
    const never    = customers.filter(c => !c.lastPurchase);
    const toReactivate = inactive.slice(0, 3);

    // ── Financial insights ────────────────────────────
    const revenue30 = sales.filter(s => s.createdAt > now - month).reduce((a, s) => a + s.total, 0);
    const costs30   = expenses.filter(e => e.createdAt > now - month).reduce((a, e) => a + e.amount, 0);
    const profit30  = revenue30 - costs30;
    const margin30  = revenue30 > 0 ? ((profit30 / revenue30) * 100).toFixed(1) : '0.0';

    const topExpenseCat = expenses
      .filter(e => e.createdAt > now - month)
      .reduce((acc, e) => {
        acc[e.category] = (acc[e.category] || 0) + e.amount;
        return acc;
      }, {});
    const topCat = Object.entries(topExpenseCat).sort((a, b) => b[1] - a[1])[0];

    // ── Payment method insights ───────────────────────
    const methods = {};
    for (const s of sales) {
      methods[s.payment] = (methods[s.payment] || 0) + s.total;
    }
    const topMethod = Object.entries(methods).sort((a, b) => b[1] - a[1])[0];

    // ── Build report ──────────────────────────────────
    const parts = ['📊 **Análise Estratégica — BusinessOS**\n'];

    // Stock turnover
    parts.push('**📦 Giro de Estoque**');
    if (stagnant.length > 0) {
      parts.push(`🔴 ${stagnant.length} produto(s) sem venda nos últimos 30 dias com estoque parado. Ex: ${stagnant.slice(0, 2).map(p => `"${p.name}" (${p.quantity} un.)`).join(', ')}`);
      parts.push(`💡 Sugestão: crie promoções relâmpago ou combos para liberar capital de ${fmt(immobilized)} imobilizado.\n`);
    } else {
      parts.push('✅ Todos os produtos com giro ativo.\n');
    }

    // Profit opportunities
    parts.push('**💰 Oportunidades de Lucro**');
    if (topProducts.length > 0) {
      parts.push(`🏆 Top produtos: ${topProducts.map((p, i) => `${i + 1}. ${p.name} (${fmt(p.revenue)})`).join(' | ')}`);
      parts.push(`💡 Sugestão: destaque esses produtos na vitrine e ofereça descontos progressivos por volume.\n`);
    }

    // Customer retention
    parts.push('**👥 Retenção de Clientes**');
    parts.push(`✅ Ativos (últimos 30d): ${active.length}`);
    parts.push(`⚠️ Inativos (30d+): ${inactive.length}${toReactivate.length > 0 ? ` — ex: ${toReactivate.map(c => c.name).join(', ')}` : ''}`);
    parts.push(`🆕 Sem compras: ${never.length}`);
    if (inactive.length > 0 || never.length > 0) {
      parts.push(`💡 Sugestão: campanha de reativação por e-mail/whatsapp com cupom de fidelidade.\n`);
    } else {
      parts.push('✅ Base de clientes engajada.\n');
    }

    // Expense control
    parts.push('**📉 Corte de Despesas**');
    parts.push(`📈 Receita (30d): **${fmt(revenue30)}**`);
    parts.push(`📉 Despesas (30d): **${fmt(costs30)}** (${margin30}% margem)`);
    if (topCat) {
      parts.push(`🔝 Maior categoria: **${topCat[0]}** (${fmt(topCat[1])})`);
    }
    if (profit30 <= 0) {
      parts.push('🔴 Prejuízo no período — urgente rever despesas fixas e precificação.');
    } else if (margin30 < 15) {
      parts.push(`💡 Margem apertada (${margin30}%) — renegocie fornecedores ou revise preços.`);
    } else {
      parts.push(`✅ Margem saudável (${margin30}%) — mantenha a estratégia.`);
    }
    if (topMethod) {
      parts.push(`💳 Método preferido dos clientes: **${topMethod[0]}** — considere oferecer desconto para ele.\n`);
    }

    // Final summary
    parts.push('---');
    parts.push('📌 **Resumo para ação:**');
    const actions = [];
    if (stagnant.length > 0) actions.push(`🔹 Queimar estoque parado de ${stagnant.length} produtos`);
    if (inactive.length > 0) actions.push(`🔹 Reativar ${inactive.length} clientes inativos`);
    if (profit30 <= 0) actions.push('🔹 Urgente: revisar custos e precificação');
    else if (margin30 < 15) actions.push('🔹 Melhorar margem negociando fornecedores');
    if (topProducts.length > 0) actions.push(`🔹 Focar em ${topProducts[0].name} (top produto)`);
    parts.push(actions.join('\n') || '✅ Tudo dentro do esperado. Continue monitorando!');

    return {
      text: parts.join('\n'),
      source: 'estratégico',
      data: { stagnant, topProducts, active: active.length, inactive: inactive.length, never: never.length, revenue30, costs30, profit30, margin30 },
    };
  }
}

export default FakeAIProvider;
