/**
 * BusinessOS — OnboardingService
 *
 * Lightweight first-visit tour. The first time a user opens any module a
 * small notification explains what it does, how to use it, and which
 * resources matter. A "Nunca mostrar novamente" action persists the
 * dismissal so it never reappears.
 */

import StorageService from '../core/storage.js';
import NotificationService from '../core/notifications.js';

const OnboardingService = (() => {
  /** @type {Set<string>} Modules that already showed the tip this session. */
  const _sessionShown = new Set();

  const TIPS = {
    dashboard: {
      title: 'Bem-vindo ao Dashboard',
      body: 'Visão geral em tempo real: receita, lucro, estoque baixo, vendas recentes e timeline de eventos.',
    },
    products: {
      title: 'Módulo de Produtos',
      body: 'Cadastre, edite e controle estoque mínimo. Vendas reduzem estoque automaticamente.',
    },
    customers: {
      title: 'Módulo de Clientes',
      body: 'Mantenha sua base. Vincule clientes a vendas para acompanhar histórico de compras.',
    },
    sales: {
      title: 'Registrar Vendas',
      body: 'Cada venda atualiza estoque, financeiro e dashboard em cascata através do EventBus.',
    },
    finance: {
      title: 'Financeiro',
      body: 'Receitas vêm das vendas. Adicione despesas para calcular lucro automaticamente.',
    },
    reports: {
      title: 'Relatórios',
      body: 'Análises consolidadas e exportação CSV/Excel de vendas, produtos e clientes.',
    },
    settings: {
      title: 'Configurações',
      body: 'Personalize empresa, tema, idioma, moeda. Faça backup e gerencie importações.',
    },
  };

  function _flags() { return StorageService._getRaw('onboarding', {}); }
  function _saveFlags(f) { StorageService._setRaw('onboarding', f); }

  function shouldShow(moduleId) {
    return !_flags()[moduleId];
  }

  function markSeen(moduleId) {
    const f = _flags(); f[moduleId] = true; _saveFlags(f);
  }

  function resetAll() {
    _saveFlags({});
  }

  function showFor(moduleId) {
    const tip = TIPS[moduleId];
    if (!tip || _sessionShown.has(moduleId) || !shouldShow(moduleId)) return;
    _sessionShown.add(moduleId);
    NotificationService.tip({
      title: tip.title,
      body: tip.body,
      onDismiss: () => markSeen(moduleId),
    });
  }

  return { TIPS, shouldShow, markSeen, resetAll, showFor };
})();

export default OnboardingService;
