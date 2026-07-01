/**
 * BusinessOS — CustomersModule (v1.2.2)
 *
 * Gestão completa de clientes: CRUD, histórico, métricas de CRM.
 * Todas as extensões v1.2 integradas ao IIFE principal.
 *
 * Migração para backend: substituir StorageService por chamadas HTTP.
 */

import StorageService from '../core/storage.js';
import EventBus from '../core/eventBus.js';
import NotificationService from '../core/notifications.js';

const CustomersModule = (() => {
  const { EVENTS } = EventBus;

  // ── Helpers internos ──────────────────────────────────────

  function _currentUser() {
    try { return StorageService.getSession()?.name || 'sistema'; }
    catch { return 'sistema'; }
  }

  function _enrichCustomer(c) {
    const avgTicket = c.purchases > 0 ? c.totalSpent / c.purchases : 0;
    const monthsActive = c.createdAt
      ? Math.max(1, (Date.now() - c.createdAt) / (30 * 86400000))
      : 1;
    const frequencyPerMonth = (c.purchases && c.createdAt)
      ? c.purchases / monthsActive
      : 0;
    const daysSinceLastPurchase = c.lastPurchase
      ? Math.floor((Date.now() - c.lastPurchase) / 86400000)
      : null;
    const status = !c.lastPurchase
      ? 'novo'
      : daysSinceLastPurchase < 30 ? 'ativo'
      : daysSinceLastPurchase < 90 ? 'inativo'
      : 'perdido';

    return { ...c, avgTicket, frequencyPerMonth, daysSinceLastPurchase, status };
  }

  // ── CRUD ──────────────────────────────────────────────────

  function create(data) {
    if (!data.name?.trim()) {
      NotificationService.error('Nome do cliente é obrigatório.');
      return null;
    }
    const customer = {
      id:         StorageService.generateId(),
      companyId:  StorageService.getSession()?.companyId || 'default',
      name:       data.name.trim(),
      phone:      data.phone?.trim()  || '',
      email:      data.email?.trim()  || '',
      purchases:  0,
      totalSpent: 0,
      createdAt:  Date.now(),
    };
    StorageService.saveCustomer(customer);
    StorageService.logActivity({
      type:   'customer',
      action: 'Cliente cadastrado',
      detail: customer.name,
      user:   _currentUser(),
      module: 'customers',
    });
    EventBus.publish(EVENTS.CUSTOMER_CREATED, { customer });
    EventBus.publish(EVENTS.DASHBOARD_REFRESH, {});
    NotificationService.success(`Cliente "${customer.name}" cadastrado.`);
    return customer;
  }

  function update(id, data) {
    const c = StorageService.getCustomerById(id);
    if (!c) {
      NotificationService.error('Cliente não encontrado.');
      return null;
    }
    const updated = { ...c, ...data, id, updatedAt: Date.now() };
    StorageService.saveCustomer(updated);
    StorageService.logActivity({
      type:   'customer',
      action: 'Cliente atualizado',
      detail: updated.name,
      user:   _currentUser(),
      module: 'customers',
    });
    EventBus.publish(EVENTS.CUSTOMER_UPDATED, { customer: updated });
    NotificationService.info(`Cliente "${updated.name}" atualizado.`);
    return updated;
  }

  function recordPurchase(id, amount) {
    const c = StorageService.getCustomerById(id);
    if (!c) return null;
    const updated = {
      ...c,
      purchases:    c.purchases + 1,
      totalSpent:   c.totalSpent + amount,
      lastPurchase: Date.now(),
    };
    StorageService.saveCustomer(updated);
    return updated;
  }

  // ── Leitura ───────────────────────────────────────────────

  function getAll()               { return StorageService.getCustomers(); }
  function getById(id)            { return StorageService.getCustomerById(id); }
  function getEnrichedCustomers() { return getAll().map(_enrichCustomer); }
  function getEnrichedById(id)    { const c = getById(id); return c ? _enrichCustomer(c) : null; }

  function getTopCustomers(limit = 5) {
    return [...getAll()]
      .sort((a, b) => b.totalSpent - a.totalSpent)
      .slice(0, limit);
  }

  function getAverageTicket(customerId) {
    const c = getById(customerId);
    if (!c || c.purchases === 0) return 0;
    return c.totalSpent / c.purchases;
  }

  function getPurchaseFrequency(customerId) {
    const c = getById(customerId);
    if (!c || !c.createdAt || c.purchases === 0) return 0;
    const months = Math.max(1, (Date.now() - c.createdAt) / (30 * 86400000));
    return c.purchases / months;
  }

  function getPurchaseHistory(customerId) {
    return StorageService.getSales()
      .filter(s => s.customerId === customerId)
      .sort((a, b) => b.createdAt - a.createdAt);
  }

  return {
    create, update, recordPurchase,
    getAll, getById,
    getEnrichedCustomers, getEnrichedById,
    getTopCustomers, getAverageTicket,
    getPurchaseFrequency, getPurchaseHistory,
  };
})();

export default CustomersModule;
