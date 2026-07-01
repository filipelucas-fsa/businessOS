/**
 * BusinessOS — SettingsModule (V1.1)
 *
 * Screen + view-model for the Settings module. Reads from SettingsService
 * and persists changes through it. Also exposes Backup / Export / Import
 * flows so users can move their data freely.
 */

import SettingsService from '../services/settingsService.js';
import ImportService from '../services/importService.js';
import ExportService from '../services/export.js';
import StorageService from '../core/storage.js';
import NotificationService from '../core/notifications.js';
import OnboardingService from '../services/onboardingService.js';
import Logger from '../services/logger.js';

const SettingsModule = (() => {

  function render(host) {
    OnboardingService.showFor('settings');
    const s = SettingsService.get();

    host.innerHTML = `
      <div class="page-header">
        <div class="page-header-left">
          <h2>Configurações</h2>
          <p>Empresa, aparência, idioma, moeda e backups</p>
        </div>
      </div>

      <div class="settings-grid">
        <section class="settings-card">
          <h3>Empresa</h3>
          <label>Nome da empresa
            <input class="input" id="setCompanyName" value="${s.companyName || ''}"/>
          </label>
          <label>Logo (URL)
            <input class="input" id="setCompanyLogo" value="${s.companyLogo || ''}" placeholder="https://..."/>
          </label>
          <label>Custos Fixos Mensais (ex: aluguel, internet)
            <input class="input" id="setFixedCosts" type="number" step="0.01" min="0" value="${s.fixedCosts || 0}"/>
          </label>
        </section>

        <section class="settings-card">
          <h3>Aparência & Idioma</h3>
          <label>Tema
            <select class="input" id="setTheme">
              <option value="light"${s.theme==='light'?' selected':''}>Claro</option>
              <option value="dark"${s.theme==='dark'?' selected':''}>Escuro</option>
            </select>
          </label>
          <label>Idioma
            <select class="input" id="setLanguage">
              <option value="pt-BR"${s.language==='pt-BR'?' selected':''}>Português (Brasil)</option>
              <option value="en-US"${s.language==='en-US'?' selected':''}>English (US)</option>
              <option value="es-ES"${s.language==='es-ES'?' selected':''}>Español</option>
            </select>
          </label>
          <label>Moeda
            <select class="input" id="setCurrency">
              <option value="BRL"${s.currency==='BRL'?' selected':''}>BRL — Real</option>
              <option value="USD"${s.currency==='USD'?' selected':''}>USD — Dólar</option>
              <option value="EUR"${s.currency==='EUR'?' selected':''}>EUR — Euro</option>
            </select>
          </label>
        </section>

        <section class="settings-card">
          <h3>Backup</h3>
          <p class="settings-muted">Exporte um JSON contendo todos os dados ou restaure de um arquivo anterior.</p>
          <div class="settings-actions">
            <button class="btn btn-secondary btn-sm" id="btnBackupExport">Exportar backup</button>
            <label class="btn btn-secondary btn-sm">
              Restaurar backup
              <input type="file" id="fileBackup" accept="application/json" hidden/>
            </label>
          </div>
          ${s.backup?.lastBackupAt
            ? `<small class="settings-muted">Último backup: ${new Date(s.backup.lastBackupAt).toLocaleString('pt-BR')}</small>`
            : ''}
        </section>

        <section class="settings-card">
          <h3>Importação CSV</h3>
          <p class="settings-muted">Importe produtos e clientes a partir de planilhas CSV.</p>
          <div class="settings-actions">
            <label class="btn btn-secondary btn-sm">
              Importar produtos
              <input type="file" id="fileProducts" accept=".csv,text/csv" hidden/>
            </label>
            <label class="btn btn-secondary btn-sm">
              Importar clientes
              <input type="file" id="fileCustomers" accept=".csv,text/csv" hidden/>
            </label>
          </div>
        </section>

        <section class="settings-card">
          <h3>Exportação</h3>
          <div class="settings-actions">
            <button class="btn btn-secondary btn-sm" id="btnExpProducts">Produtos (CSV)</button>
            <button class="btn btn-secondary btn-sm" id="btnExpCustomers">Clientes (CSV)</button>
            <button class="btn btn-secondary btn-sm" id="btnExpSales">Vendas (CSV)</button>
          </div>
        </section>

        <section class="settings-card">
          <h3>Preferências</h3>
          <label class="settings-check"><input type="checkbox" id="prefLow" ${s.notifications?.lowStock?'checked':''}/> Avisar estoque baixo</label>
          <label class="settings-check"><input type="checkbox" id="prefSale" ${s.notifications?.newSale?'checked':''}/> Notificar novas vendas</label>
          <label class="settings-check"><input type="checkbox" id="prefRep" ${s.notifications?.reports?'checked':''}/> Notificar relatórios concluídos</label>
          <button class="btn btn-secondary btn-sm" id="btnResetOnboarding">Resetar tour de boas-vindas</button>
        </section>

        <section class="settings-card">
          <h3>Sobre</h3>
          <p class="settings-muted">BusinessOS V1.1 — fundação para SaaS profissional.</p>
          <p class="settings-muted">Soft delete, UUID, auditoria, AppState global, integrações preparadas.</p>
        </section>
      </div>

      <div class="settings-footer">
        <button class="btn btn-primary" id="btnSaveSettings">Salvar configurações</button>
      </div>
    `;

    // Wire handlers
    host.querySelector('#btnSaveSettings').addEventListener('click', () => {
      const theme = host.querySelector('#setTheme').value;
      SettingsService.save({
        companyName: host.querySelector('#setCompanyName').value.trim(),
        companyLogo: host.querySelector('#setCompanyLogo').value.trim() || null,
        fixedCosts: parseFloat(host.querySelector('#setFixedCosts').value) || 0,
        theme: theme,
        language: host.querySelector('#setLanguage').value,
        currency: host.querySelector('#setCurrency').value,
        notifications: {
          lowStock: host.querySelector('#prefLow').checked,
          newSale: host.querySelector('#prefSale').checked,
          reports: host.querySelector('#prefRep').checked,
        },
      });
      document.documentElement.setAttribute('data-theme', theme);
      NotificationService.success('Configurações salvas.');
    });

    host.querySelector('#btnBackupExport').addEventListener('click', () => {
      SettingsService.exportBackup();
      NotificationService.update('Backup exportado.');
    });

    host.querySelector('#fileBackup').addEventListener('change', async (e) => {
      const f = e.target.files?.[0]; if (!f) return;
      try {
        const text = await f.text();
        SettingsService.importBackup(JSON.parse(text));
        NotificationService.success('Backup restaurado. Recarregando...');
        setTimeout(() => location.reload(), 800);
      } catch (err) {
        NotificationService.error('Backup inválido: ' + err.message);
      }
    });

    host.querySelector('#fileProducts').addEventListener('change', async (e) => {
      const f = e.target.files?.[0]; if (!f) return;
      const r = await ImportService.importProducts(f);
      r.ok
        ? NotificationService.success(`Importados: ${r.imported} • Ignorados: ${r.skipped}`)
        : NotificationService.error(r.errors.join(' • '));
    });

    host.querySelector('#fileCustomers').addEventListener('change', async (e) => {
      const f = e.target.files?.[0]; if (!f) return;
      const r = await ImportService.importCustomers(f);
      r.ok
        ? NotificationService.success(`Importados: ${r.imported} • Ignorados: ${r.skipped}`)
        : NotificationService.error(r.errors.join(' • '));
    });

    host.querySelector('#btnExpProducts').addEventListener('click', () => {
      ExportService.exportProducts(StorageService.getProducts());
      Logger.settings('export', 'Produtos exportados');
    });
    host.querySelector('#btnExpCustomers').addEventListener('click', () => {
      ExportService.exportCustomers(StorageService.getCustomers());
      Logger.settings('export', 'Clientes exportados');
    });
    host.querySelector('#btnExpSales').addEventListener('click', () => {
      ExportService.exportSales(StorageService.getSales());
      Logger.settings('export', 'Vendas exportadas');
    });
    host.querySelector('#btnResetOnboarding').addEventListener('click', () => {
      OnboardingService.resetAll();
      NotificationService.info('Tour de boas-vindas reativado.');
    });
  }

  return { render };
})();

export default SettingsModule;
