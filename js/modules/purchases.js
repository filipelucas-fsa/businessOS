/**
 * BusinessOS — PurchasesModule (v1.2.2)
 *
 * Ciclo completo de compras de reposição:
 *   1. CRUD de fornecedores
 *   2. Registrar compra → aumenta estoque automaticamente
 *   3. Gera despesa financeira na categoria "Estoque"
 *   4. Atualiza stats do fornecedor
 *   5. Publica eventos via EventBus centralizado
 *
 * Migração para backend: substituir DataCore/StorageService por chamadas HTTP.
 */

import DataCore from '../core/DataCore.js';
import StorageService from '../core/storage.js';
import EventBus from '../core/eventBus.js';
import NotificationService from '../core/notifications.js';
import ProductsModule from './products.js';
import Logger from '../services/logger.js';

const PurchasesModule = (() => {
  // Usa os eventos centralizados do EventBus — sem duplicação local.
  const { EVENTS } = EventBus;

  function _currentUser() {
    try { return StorageService.getSession()?.name || 'sistema'; }
    catch { return 'sistema'; }
  }

  // ── Fornecedores ──────────────────────────────────────────

  function createSupplier(data) {
    if (!data.name?.trim()) {
      NotificationService.error('Nome do fornecedor é obrigatório.');
      return null;
    }
    const supplier = DataCore.saveSupplier(data);
    StorageService.logActivity({
      type:   'supplier',
      action: 'Fornecedor cadastrado',
      detail: supplier.name,
      impact: 'Novo fornecedor disponível para compras',
      user:   _currentUser(),
      module: 'purchases',
    });
    Logger.record('purchases', 'create', `Fornecedor "${supplier.name}" cadastrado`, { supplier });
    EventBus.publish(EVENTS.SUPPLIER_CREATED, { supplier });
    EventBus.publish(EVENTS.DASHBOARD_REFRESH, {});
    NotificationService.success(`Fornecedor "${supplier.name}" cadastrado.`);
    return supplier;
  }

  function updateSupplier(id, data) {
    const existing = DataCore.getSupplierById(id);
    if (!existing) {
      NotificationService.error('Fornecedor não encontrado.');
      return null;
    }
    const updated = DataCore.saveSupplier({ ...existing, ...data, id });
    StorageService.logActivity({
      type:   'supplier',
      action: 'Fornecedor atualizado',
      detail: updated.name,
      user:   _currentUser(),
      module: 'purchases',
    });
    Logger.record('purchases', 'update', `Fornecedor "${updated.name}" atualizado`, { updated });
    EventBus.publish(EVENTS.SUPPLIER_UPDATED, { supplier: updated });
    NotificationService.info(`Fornecedor "${updated.name}" atualizado.`);
    return updated;
  }

  function deleteSupplier(id) {
    const supplier = DataCore.getSupplierById(id);
    if (!supplier) {
      NotificationService.error('Fornecedor não encontrado.');
      return;
    }
    DataCore.deleteSupplier(id);
    StorageService.logActivity({
      type:   'supplier',
      action: 'Fornecedor removido',
      detail: supplier.name,
      user:   _currentUser(),
      module: 'purchases',
    });
    Logger.record('purchases', 'delete', `Fornecedor "${supplier.name}" removido`, { id });
    EventBus.publish(EVENTS.SUPPLIER_DELETED, { id });
    EventBus.publish(EVENTS.DASHBOARD_REFRESH, {});
    NotificationService.warning(`Fornecedor "${supplier.name}" removido.`);
  }

  function getAllSuppliers()        { return DataCore.getSuppliers(); }
  function getSupplierById(id)      { return DataCore.getSupplierById(id); }

  // ── Compras de Reposição ──────────────────────────────────

  function createPurchase(data) {
    const product = StorageService.getProductById(data.productId);
    if (!product) {
      NotificationService.error('Produto não encontrado.');
      return null;
    }

    const qty      = parseInt(data.quantity, 10);
    const unitCost = parseFloat(data.unitCost);

    if (!qty || qty <= 0)       { NotificationService.error('Quantidade inválida.');       return null; }
    if (!unitCost || unitCost <= 0) { NotificationService.error('Custo unitário inválido.'); return null; }

    const totalCost = qty * unitCost;

    // 1. Salva registro de compra
    const purchase = DataCore.savePurchase({
      ...data,
      productName:  product.name,
      quantity:     qty,
      unitCost,
      totalCost,
    });

    // 2. Aumenta estoque via ProductsModule (publishes STOCK_INCREASED + checks low stock)
    const prevQty    = product.quantity;
    const stockResult = ProductsModule.increaseStock(product.id, qty);
    const updatedQty = stockResult ? stockResult.quantity : prevQty + qty;

    // 3. Gera despesa financeira automaticamente
    StorageService.saveExpense({
      id:          StorageService.generateId(),
      companyId:   StorageService.getSession()?.companyId || 'default',
      description: `Compra: ${product.name} (${qty} un.) — ${purchase.supplierName}`,
      amount:      totalCost,
      category:    'Estoque',
      purchaseId:  purchase.id,
      supplierId:  purchase.supplierId || null,
      createdAt:   Date.now(),
    });
    EventBus.publish(EVENTS.EXPENSE_CREATED, {});

    // 4. Atualiza stats do fornecedor
    if (purchase.supplierId) {
      const supplier = DataCore.getSupplierById(purchase.supplierId);
      if (supplier) {
        DataCore.saveSupplier({
          ...supplier,
          totalSpent:   (supplier.totalSpent  || 0) + totalCost,
          purchases:    (supplier.purchases   || 0) + 1,
          lastPurchase: Date.now(),
        });
      }
    }

    // 5. Timeline enriquecida
    StorageService.logActivity({
      type:   'purchase',
      action: 'Compra registrada',
      detail: `${product.name} × ${qty} un. — R$ ${totalCost.toFixed(2)} (${purchase.supplierName})`,
      impact: `Estoque: ${prevQty} → ${updatedQty} un.`,
      user:   _currentUser(),
      module: 'purchases',
    });

    Logger.record('purchases', 'create',
      `Compra ${product.name} × ${qty} un. — R$ ${totalCost.toFixed(2)}`,
      { purchase, productId: product.id, prevQty, updatedQty }
    );

    EventBus.publish(EVENTS.PURCHASE_CREATED, { purchase });
    EventBus.publish(EVENTS.DASHBOARD_REFRESH, {});

    NotificationService.success(
      `Compra registrada! +${qty} un. de "${product.name}". Estoque: ${updatedQty}`
    );
    return { purchase, updatedQty };
  }

  function getAllPurchases()            { return DataCore.getPurchases(); }
  function getPurchasesBySupplier(id)   { return DataCore.getPurchases().filter(p => p.supplierId === id); }
  function getTotalInvested()           { return DataCore.getPurchases().reduce((a, p) => a + p.totalCost, 0); }

  return {
    // Suppliers
    createSupplier, updateSupplier, deleteSupplier,
    getAllSuppliers, getSupplierById,
    // Purchases
    createPurchase, getAllPurchases,
    getPurchasesBySupplier, getTotalInvested,
  };
})();

export default PurchasesModule;
