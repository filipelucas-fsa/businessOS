# BusinessOS v1.3 — AGENTS.md

> Guia para agentes de IA que trabalham no código do BusinessOS.

---

## Contexto do projeto

**BusinessOS** é um ERP SaaS modular para pequenas e médias empresas.
**Versão atual:** v1.3.0 (SaaS Architecture com Provider Layer)
**Stack:** HTML5 · CSS3 · JavaScript ES6+ (módulos nativos) · localStorage
**Deploy:** Vercel (estático, sem backend obrigatório)

---

## Regras obrigatórias

### 1. Nunca recriar — sempre evoluir
- Leia TODOS os arquivos relevantes antes de qualquer modificação
- Identifique o que já existe antes de criar algo novo
- Prefira `str_replace` cirúrgico a reescritas completas

### 2. Arquitetura event-driven (mantida de v1.2.2)
```
Ação do usuário
  → Módulo (products.js, etc.)
    → StorageService.save*()
    → EventBus.publish(EVENTS.X, payload)
      → Dashboard/View reage via _sub()
```

### 3. Provider Pattern (novo em v1.3)
Nunca use `localStorage` diretamente. Sempre passe pelo StorageService:
```javascript
// ✅ correto
StorageService.saveProduct(product);

// ❌ proibido
localStorage.setItem('bos_products', JSON.stringify(products));
```

### 4. Tenant isolation
Todos os dados de entidade devem incluir `companyId`:
```javascript
// ✅ correto
const product = {
  id: StorageService.generateId(),
  companyId: StorageService.getSession()?.companyId || 'default',
  name: data.name,
  // ...
};

// ❌ faltando companyId — dados vão para o tenant errado
const product = { id: ..., name: data.name };
```

### 5. AuthService agora é async
Em v1.3, `login()` e `register()` retornam Promise:
```javascript
// ✅ correto (v1.3)
const result = await AuthService.login(email, password);
if (result.ok) { ... }

// ❌ v1.2.2 (não funciona mais corretamente)
const result = AuthService.login(email, password);
```

### 6. API Slots — marcar sempre
Ao criar código que terá implementação futura real, marque:
```javascript
// API SLOT: AI PROVIDER
// FUTURE: Gemini / Claude / OpenAI
```

### 7. Hierarquia de importação (sem circular)
```
providers/storage/FakeLocalStorageProvider.js
  └─ core/storage.js
       └─ providers/auth/FakeAuthProvider.js
       └─ core/DataCore.js
       └─ modules/*.js
            └─ services/*.js
                 └─ dashboard.html
```

**Regra:** `modules/` nunca importa de `services/`. `providers/` nunca importa de `modules/`.

### 8. Soft delete — nunca delete físico
```javascript
// ✅ correto
StorageService.deleteProduct(id); // marca deleted: true

// ❌ proibido
products.splice(index, 1);
```

### 9. showConfirm() para ações destrutivas
```javascript
showConfirm(
  'Remover produto?',
  () => { ProductsModule.remove(id); },
  { title: 'Remover', confirmLabel: 'Remover', danger: true }
);
```

### 10. Adicionar novos providers corretamente

Para adicionar um novo AI provider (ex: GeminiProvider):

1. Criar `js/providers/ai/GeminiProvider.js` implementando o método `analyze(query)`
2. Em `js/services/ai.js`, substituir a linha do provider:
   ```javascript
   import GeminiProvider from '../providers/ai/GeminiProvider.js';
   let _provider = new GeminiProvider({ apiKey: '...' });
   ```
3. Documentar o API Slot

---

## Estrutura dos providers

### StorageProvider (interface abstrata)
```javascript
// Todos os métodos retornam promises ou valores síncronos
class StorageProvider {
  async getProducts()    { throw new Error('Not implemented'); }
  async saveProduct(p)   { throw new Error('Not implemented'); }
  // ...
}
```

### FakeLocalStorageProvider
- Implementa StorageProvider com localStorage
- Usa `_tenantKey(bucket)` para isolar dados por empresa
- Todos os métodos são síncronos (FakeLocalStorage não precisa de await)
- `seedDemoData(companyId)` cria dados demo para o tenant informado

### FakeAIProvider
- Analisa dados internos via `StorageService.getProvider()`
- Responde em português do Brasil
- Simula latência de rede (`_delay()`)
- Suporta: top produtos, financeiro, estoque, clientes, vendas, fluxo de caixa

### FakePaymentProvider
- 3 planos: `free`, `pro`, `business`
- `createCheckout()` atualiza o plano localmente (simula webhook do Stripe)
- `getBillingHistory()` retorna histórico fake

---

## Padrão de renderer de módulo (inalterado de v1.2.2)

```javascript
function renderMeuModulo() {
  let items = MeuModulo.getAll();

  document.getElementById('pageContent').innerHTML = `...`;

  const render = () => {
    document.getElementById('itemsTableBody').innerHTML = items.map(i => `...`).join('');
  };
  render();

  window._editItem = id => { /* ... */ };
  window._delItem  = id => {
    showConfirm(`Remover?`, () => {
      MeuModulo.remove(id);
      items = MeuModulo.getAll();
      render();
    }, { danger: true });
  };

  _sub(EVENTS.ITEM_CREATED, () => { items = MeuModulo.getAll(); render(); });
  _sub(EVENTS.ITEM_UPDATED, () => { items = MeuModulo.getAll(); render(); });
  _sub(EVENTS.ITEM_DELETED, () => { items = MeuModulo.getAll(); render(); });
}
```

---

## Eventos disponíveis (EventBus.EVENTS v1.3)

| Evento | Publicado por | Novidade |
|--------|--------------|----------|
| `PRODUCT_CREATED/UPDATED/DELETED` | ProductsModule | v1.1 |
| `STOCK_INCREASED/DECREASED` | ProductsModule, PurchasesModule | v1.1 |
| `SALE_CREATED` | SalesModule | v1.1 |
| `CUSTOMER_CREATED/UPDATED` | CustomersModule | v1.1 |
| `EXPENSE_CREATED` | FinanceModule | v1.1 |
| `PURCHASE_CREATED` | PurchasesModule | v1.2 |
| `SUPPLIER_CREATED/UPDATED/DELETED` | PurchasesModule | v1.2 |
| `INSIGHTS_UPDATED` | InsightsEngine | v1.2 |
| `AI_RESPONSE` | AIService | **v1.3** |
| `PLAN_UPGRADED` | PaymentService | **v1.3** |
| `TENANT_CHANGED` | AuthService | **v1.3** |
| `IMPORT_COMPLETE` | ImportService | **v1.3** |

---

## Preparação v1.4 (Backend real)

1. Criar `js/providers/storage/APIProvider.js` (já existe como stub)
2. Em `js/core/storage.js`: trocar `FakeLocalStorageProvider` por `APIProvider`
3. Criar `js/providers/auth/JWTAuthProvider.js`
4. Em `js/services/auth.js`: trocar provider
5. Módulos (`products.js`, etc.) **não mudam** — eles chamam StorageService que muda internamente
