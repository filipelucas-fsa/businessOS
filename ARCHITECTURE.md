# BusinessOS v1.3 — Architecture

> Versão: **v1.3.0** | SaaS Architecture com Provider Layer e Multiempresa

---

## Princípios

1. **Event-Driven** — todo estado muda via `EventBus`. A UI reage a eventos.
2. **Provider Pattern** — storage, auth, IA e pagamento são abstrações swappáveis.
3. **Fake-First** — tudo funciona offline com implementações fake. APIs entram depois.
4. **Multiempresa** — dados isolados por `companyId` desde o registro.
5. **API Slots** — marcadores explícitos no código indicam onde plugar serviços reais.

---

## Fluxo de camadas

```
Frontend (dashboard.html / login.html)
         │
         ▼
   Services Layer (AuthService, AIService, PaymentService, ExportService…)
         │
         ▼
   Provider Layer — ABSTRAÇÃO (contratos definidos em StorageProvider.js)
         │
         ├─ FakeLocalStorageProvider  ← ATUAL (localStorage + tenant scope)
         ├─ APIProvider               ← FUTURO (fetch + JWT bearer)
         │
         ├─ FakeAuthProvider          ← ATUAL (hash local + company creation)
         ├─ JWTAuthProvider           ← FUTURO (bcrypt + JWT + refresh)
         │
         ├─ FakeAIProvider            ← ATUAL (análise de dados internos)
         ├─ ClaudeProvider            ← FUTURO (Anthropic API)
         ├─ GeminiProvider            ← FUTURO (Google AI)
         │
         ├─ FakePaymentProvider       ← ATUAL (planos simulados)
         ├─ StripeProvider            ← FUTURO (internacional)
         └─ MercadoPagoProvider       ← FUTURO (Brasil / LATAM)
```

---

## Hierarquia de importação (sem circular)

```
uuid.js
  └─ providers/storage/FakeLocalStorageProvider.js
       └─ core/storage.js (StorageService — inicia o provider)
            └─ core/DataCore.js
            └─ core/eventBus.js
            └─ core/notifications.js
            └─ core/appState.js
                 └─ services/logger.js
                      └─ providers/auth/FakeAuthProvider.js
                           └─ services/auth.js
                      └─ providers/ai/FakeAIProvider.js
                           └─ services/ai.js
                      └─ providers/payment/FakePaymentProvider.js
                           └─ services/payment.js
                      └─ modules/products.js
                      └─ modules/customers.js
                      └─ modules/sales.js
                      └─ modules/finance.js
                      └─ modules/purchases.js
                           └─ services/export.js
                           └─ services/statisticsService.js
                           └─ services/dashboardService.js
                                └─ dashboard.html (importa tudo)
```

---

## Multiempresa (Tenant System)

### Fluxo de registro

```
AuthService.register({ name, email, password, company })
  │
  ├─ FakeAuthProvider.register()
  │    ├─ gera companyId único
  │    ├─ cria Company { id, name, plan: 'free' }
  │    ├─ cria User { id, companyId, email, passwordHash }
  │    └─ retorna { ok, user, company }
  │
  └─ StorageService.seedDemoData()
       └─ FakeLocalStorageProvider.seedDemoData(companyId)
            └─ todos os dados criados com companyId + tenant prefix
```

### Isolamento de dados

```javascript
// FakeLocalStorageProvider._tenantKey()
// Prefixa cada bucket com companyId da sessão atual

_tenantKey('products')
// → 'company_1750000000_abc123_products'

// Empresa A e Empresa B têm chaves completamente separadas no localStorage
```

### Schema completo (v1.3)

```json
{
  "bos_users":      [{ "id", "name", "email", "companyId", "company", "role", "passwordHash", "createdAt" }],
  "bos_session":    { "id", "name", "email", "company", "companyId", "role" },
  "bos_companies":  [{ "id", "name", "plan", "createdAt" }],

  "<companyId>_products":    [{ "id", "companyId", "name", "category", "price", "quantity", "minStock", "deleted", "createdAt", "updatedAt" }],
  "<companyId>_customers":   [{ "id", "companyId", "name", "phone", "email", "purchases", "totalSpent", "lastPurchase", "createdAt" }],
  "<companyId>_sales":       [{ "id", "companyId", "productId", "productName", "quantity", "unitPrice", "total", "customerId", "payment", "createdAt" }],
  "<companyId>_expenses":    [{ "id", "companyId", "description", "amount", "category", "createdAt" }],
  "<companyId>_suppliers":   [{ "id", "companyId", "name", "contact", "phone", "email", "cnpj", "category", "totalSpent", "purchases", "createdAt" }],
  "<companyId>_purchases":   [{ "id", "companyId", "supplierId", "supplierName", "productId", "productName", "quantity", "unitCost", "totalCost", "createdAt" }],
  "<companyId>_activities":  [{ "id", "type", "action", "detail", "impact", "user", "module", "ts" }],
  "<companyId>_modules":     ["products", "customers", "sales", ...],
  "<companyId>_settings":    { ... }
}
```

---

## Provider Pattern

### Como trocar o Storage

```javascript
// js/core/storage.js — linha de bootstrap
import FakeLocalStorageProvider from '../providers/storage/FakeLocalStorageProvider.js';
import APIProvider from '../providers/storage/APIProvider.js';

// Troca de uma linha — todos os módulos continuam funcionando:
let _provider = new APIProvider('https://api.businessos.app/v1', () => AuthService.getToken());
// ou
let _provider = new FakeLocalStorageProvider(); // padrão atual
```

### Como trocar o AI Provider

```javascript
// js/services/ai.js
import ClaudeProvider from '../providers/ai/ClaudeProvider.js';

// API SLOT: AI PROVIDER
const _provider = new ClaudeProvider({
  apiKey: process.env.ANTHROPIC_API_KEY,
  model: 'claude-opus-4-6',
});
```

### Como trocar o Payment Provider

```javascript
// js/services/payment.js
import StripeProvider from '../providers/payment/StripeProvider.js';

// API SLOT: PAYMENT PROVIDER
const _provider = new StripeProvider({
  publishableKey: process.env.STRIPE_PK,
});
```

---

## EventBus (v1.3)

```javascript
EventBus.publish(EventBus.EVENTS.SALE_CREATED, { sale });
```

Eventos v1.3 (novos):
- `AI_RESPONSE` — assistente IA respondeu
- `PLAN_UPGRADED` — plano de assinatura alterado
- `TENANT_CHANGED` — empresa ativa trocada (multi-company futuro)
- `IMPORT_COMPLETE` — importação em lote finalizada

---

## InsightsEngine (v1.2 — preservado)

13 análises automáticas, zero IA, apenas cálculos.
Preparado para `analyzeWithAI(insight)` via AIService na v1.4.

---

## Migração para backend real

### Passo 1 — Ativar APIProvider

```javascript
// storage.js: trocar FakeLocalStorageProvider → APIProvider
import APIProvider from '../providers/storage/APIProvider.js';
let _provider = new APIProvider('https://api.businessos.app/v1', getToken);
```

### Passo 2 — Ativar JWTAuthProvider

```javascript
// auth.js: trocar FakeAuthProvider → JWTAuthProvider
// JWTAuthProvider usa bcrypt no servidor + JWT + refresh tokens
```

### Passo 3 — Backend Node.js

```
POST /auth/register   → cria user + company, retorna JWT
POST /auth/login      → valida, retorna JWT
GET  /products        → tenant filtrado por middleware
POST /products        → cria com companyId do JWT
...
```

### Stack recomendada

```
Node.js 20 + Express 5
PostgreSQL 16 + Prisma 5
JWT (jsonwebtoken) + bcrypt
Redis (cache + WebSockets)
Stripe (pagamentos)
Anthropic API (IA)
```

---

## Estrutura de arquivos (v1.3)

```
businessos/
├── index.html
├── login.html
├── dashboard.html
├── css/
│   └── style.css
└── js/
    ├── providers/          ← NOVO em v1.3
    │   ├── storage/
    │   │   ├── StorageProvider.js          (interface abstrata)
    │   │   ├── FakeLocalStorageProvider.js (implementação atual)
    │   │   └── APIProvider.js              (stub REST futuro)
    │   ├── auth/
    │   │   └── FakeAuthProvider.js
    │   ├── ai/
    │   │   └── FakeAIProvider.js
    │   └── payment/
    │       └── FakePaymentProvider.js
    ├── core/
    │   ├── uuid.js
    │   ├── storage.js          (facade sobre provider — compat v1.2.2)
    │   ├── eventBus.js         (+ eventos v1.3)
    │   ├── notifications.js
    │   ├── appState.js
    │   ├── DataCore.js         (tenant-aware em v1.3)
    │   └── InsightsEngine.js
    ├── modules/            (inalterados de v1.2.2)
    │   ├── products.js
    │   ├── customers.js
    │   ├── sales.js
    │   ├── finance.js
    │   ├── purchases.js
    │   └── settings.js
    ├── services/
    │   ├── auth.js             (async em v1.3)
    │   ├── ai.js               ← NOVO em v1.3
    │   ├── payment.js          ← NOVO em v1.3
    │   ├── export.js
    │   ├── logger.js
    │   ├── dashboardService.js
    │   ├── statisticsService.js
    │   └── ...
    └── components/
        └── timeline.js
```
