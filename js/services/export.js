/**
 * BusinessOS — ExportService (V1.1)
 *
 * CSV export utility. The .xlsx path is stubbed until SheetJS / ExcelJS
 * is added — `exportXLSX` is wired through `generic()` so callers don't
 * need to change when the dependency lands.
 */

const ExportService = (() => {
  function _toCSV(headers, rows) {
    const escape = v => `"${String(v ?? '').replace(/"/g, '""')}"`;
    const lines = [headers.map(escape).join(',')];
    rows.forEach(row => lines.push(row.map(escape).join(',')));
    return lines.join('\n');
  }

  function _download(content, filename, type = 'text/csv;charset=utf-8;') {
    const blob = new Blob(['\uFEFF' + content], { type });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = filename; a.click();
    URL.revokeObjectURL(url);
  }

  function generic({ filename, headers, rows, format = 'csv' }) {
    if (format === 'csv') {
      _download(_toCSV(headers, rows), `${filename}.csv`);
    } else if (format === 'xlsx') {
      // TODO V1.2: replace with SheetJS / ExcelJS output. Fallback = CSV.
      _download(_toCSV(headers, rows), `${filename}.csv`);
    } else if (format === 'json') {
      _download(JSON.stringify(rows, null, 2), `${filename}.json`, 'application/json');
    }
  }

  function exportProducts(products, format = 'csv') {
    const headers = ['Nome','Categoria','Preço','Estoque','Estoque Mínimo','Criado em'];
    const rows = products.map(p => [
      p.name, p.category, (p.price || 0).toFixed(2), p.quantity, p.minStock,
      new Date(p.createdAt).toLocaleDateString('pt-BR'),
    ]);
    generic({ filename: `produtos_${Date.now()}`, headers, rows, format });
  }

  function exportCustomers(customers, format = 'csv') {
    const headers = ['Nome','Telefone','Email','Compras','Total Gasto','Cadastrado em'];
    const rows = customers.map(c => [
      c.name, c.phone, c.email, c.purchases, (c.totalSpent || 0).toFixed(2),
      new Date(c.createdAt).toLocaleDateString('pt-BR'),
    ]);
    generic({ filename: `clientes_${Date.now()}`, headers, rows, format });
  }

  function exportSales(sales, format = 'csv') {
    const headers = ['Data','Produto','Quantidade','Valor Unit.','Total','Cliente','Pagamento'];
    const rows = sales.map(s => [
      new Date(s.createdAt).toLocaleDateString('pt-BR'),
      s.productName, s.quantity, (s.unitPrice || 0).toFixed(2), (s.total || 0).toFixed(2),
      s.customerName, s.payment,
    ]);
    generic({ filename: `vendas_${Date.now()}`, headers, rows, format });
  }

  function exportFinance(expenses, sales, format = 'csv') {
    const headers = ['Data','Tipo','Descrição','Categoria','Valor'];
    const rows = [
      ...sales.map(s => [new Date(s.createdAt).toLocaleDateString('pt-BR'), 'Receita', s.productName, 'Venda', (s.total||0).toFixed(2)]),
      ...expenses.map(e => [new Date(e.createdAt).toLocaleDateString('pt-BR'), 'Despesa', e.description, e.category, (-(e.amount||0)).toFixed(2)]),
    ].sort((a, b) => a[0].localeCompare(b[0]));
    generic({ filename: `financeiro_${Date.now()}`, headers, rows, format });
  }

  // ── V1.2: Novos exportadores ──────────────────────────────

  function exportSuppliers(suppliers, format = 'csv') {
    const headers = ['Nome','Contato','Telefone','Email','CNPJ','Categoria','Compras','Total Gasto'];
    const rows = suppliers.map(s => [
      s.name, s.contact, s.phone, s.email, s.cnpj, s.category,
      s.purchases, (s.totalSpent || 0).toFixed(2),
    ]);
    generic({ filename: `fornecedores_${Date.now()}`, headers, rows, format });
  }

  function exportPurchases(purchases, format = 'csv') {
    const headers = ['Data','Fornecedor','Produto','Quantidade','Custo Unit.','Total','Categoria'];
    const rows = purchases.map(p => [
      new Date(p.createdAt).toLocaleDateString('pt-BR'),
      p.supplierName, p.productName, p.quantity,
      (p.unitCost || 0).toFixed(2), (p.totalCost || 0).toFixed(2), p.category,
    ]);
    generic({ filename: `compras_${Date.now()}`, headers, rows, format });
  }

  function exportCashFlow(cashFlowData, format = 'csv') {
    const headers = ['Data','Receita','Despesa','Líquido','Saldo Acumulado'];
    const rows = cashFlowData.map(d => [
      d.date,
      d.income.toFixed(2), d.outcome.toFixed(2),
      d.net.toFixed(2), d.balance.toFixed(2),
    ]);
    generic({ filename: `fluxo_caixa_${Date.now()}`, headers, rows, format });
  }

  return { exportProducts, exportCustomers, exportSales, exportFinance,
           exportSuppliers, exportPurchases, exportCashFlow, generic };
})();

export default ExportService;
