/**
 * BusinessOS — ImportService
 *
 * Counterpart of ExportService. Currently supports CSV; the .xlsx path is
 * stubbed and will be wired through SheetJS / ExcelJS in a future version.
 * Validates rows, returns a {ok, imported, skipped, errors} report so
 * callers can show actionable feedback.
 */

import StorageService from '../core/storage.js';
import UUID from '../core/uuid.js';
import Logger from './logger.js';

const ImportService = (() => {

  function _parseCSV(text) {
    // Minimal CSV parser supporting quoted fields and commas inside quotes.
    const rows = [];
    let row = [], field = '', inQuotes = false;
    for (let i = 0; i < text.length; i++) {
      const c = text[i], n = text[i + 1];
      if (inQuotes) {
        if (c === '"' && n === '"') { field += '"'; i++; }
        else if (c === '"') { inQuotes = false; }
        else field += c;
      } else {
        if (c === '"') inQuotes = true;
        else if (c === ',') { row.push(field); field = ''; }
        else if (c === '\n') { row.push(field); rows.push(row); row = []; field = ''; }
        else if (c === '\r') { /* ignore */ }
        else field += c;
      }
    }
    if (field.length || row.length) { row.push(field); rows.push(row); }
    return rows.filter(r => r.length && r.some(v => v !== ''));
  }

  function _readFile(file) {
    return new Promise((resolve, reject) => {
      const r = new FileReader();
      r.onload = () => resolve(r.result);
      r.onerror = () => reject(r.error);
      r.readAsText(file, 'utf-8');
    });
  }

  async function importProducts(file) {
    const text = await _readFile(file);
    const rows = _parseCSV(text);
    if (!rows.length) return { ok: false, imported: 0, skipped: 0, errors: ['Arquivo vazio'] };
    const [header, ...body] = rows;
    const idx = name => header.findIndex(h => h.trim().toLowerCase() === name);
    const iName = idx('nome'), iCat = idx('categoria'),
          iPrice = idx('preço') >= 0 ? idx('preço') : idx('preco'),
          iQty = idx('estoque'), iMin = idx('estoque mínimo') >= 0 ? idx('estoque mínimo') : idx('estoque minimo');
    if (iName < 0 || iPrice < 0) {
      return { ok: false, imported: 0, skipped: 0, errors: ['Cabeçalho obrigatório: Nome, Preço'] };
    }
    let imported = 0, skipped = 0; const errors = [];
    body.forEach((row, i) => {
      try {
        const name = (row[iName] || '').trim();
        if (!name) { skipped++; return; }
        StorageService.saveProduct({
          id: UUID.v4(),
          name,
          category: (row[iCat] || 'Geral').trim(),
          price: parseFloat((row[iPrice] || '0').replace(',', '.')) || 0,
          quantity: parseInt(row[iQty] || '0', 10) || 0,
          minStock: parseInt(row[iMin] || '5', 10) || 5,
        });
        imported++;
      } catch (e) {
        errors.push(`Linha ${i + 2}: ${e.message}`); skipped++;
      }
    });
    Logger.products('import', `${imported} produto(s) importado(s)`, { imported, skipped });
    return { ok: true, imported, skipped, errors };
  }

  async function importCustomers(file) {
    const text = await _readFile(file);
    const rows = _parseCSV(text);
    if (!rows.length) return { ok: false, imported: 0, skipped: 0, errors: ['Arquivo vazio'] };
    const [header, ...body] = rows;
    const idx = name => header.findIndex(h => h.trim().toLowerCase() === name);
    const iName = idx('nome'), iPhone = idx('telefone'), iEmail = idx('email');
    if (iName < 0) return { ok: false, imported: 0, skipped: 0, errors: ['Cabeçalho obrigatório: Nome'] };
    let imported = 0, skipped = 0; const errors = [];
    body.forEach((row, i) => {
      try {
        const name = (row[iName] || '').trim();
        if (!name) { skipped++; return; }
        StorageService.saveCustomer({
          id: UUID.v4(),
          name,
          phone: (row[iPhone] || '').trim(),
          email: (row[iEmail] || '').trim(),
          purchases: 0, totalSpent: 0,
        });
        imported++;
      } catch (e) {
        errors.push(`Linha ${i + 2}: ${e.message}`); skipped++;
      }
    });
    Logger.customers('import', `${imported} cliente(s) importado(s)`, { imported, skipped });
    return { ok: true, imported, skipped, errors };
  }

  // .xlsx hook — wire SheetJS here when the dependency lands.
  async function importExcel(/* file, entity */) {
    return { ok: false, imported: 0, skipped: 0, errors: ['Excel import será habilitado quando SheetJS for adicionado às dependências.'] };
  }

  return { importProducts, importCustomers, importExcel };
})();

export default ImportService;
