# BusinessOS — Changelog

---

## v1.3.0 — SaaS Architecture *(atual)*

> Transformação em produto SaaS real com Provider Architecture, Multiempresa e Assistente IA.

### Arquitetura nova: Provider Layer

| Camada | Antes (v1.2.2) | Depois (v1.3) |
|--------|---------------|---------------|
| Storage | `localStorage` direto | `FakeLocalStorageProvider` (swappable) |
| Auth | Funções inline em `auth.js` | `FakeAuthProvider` (swappable) |
| IA | Ausente | `FakeAIProvider` + `AIService` |
| Pagamento | Ausente | `FakePaymentProvider` + `PaymentService` |

### Multiempresa (Tenant System)

- ✅ Cada usuário registrado cria uma `Company` com `companyId` único
- ✅ Todos os dados (produtos, clientes, vendas, etc.) são isolados por `companyId`
- ✅ Registro (`AuthService.register`) cria empresa + usuário atomicamente
- ✅ `FakeLocalStorageProvider._tenantKey()` prefixa cada bucket com `companyId`
- ✅ `companyId` propagado para todas as entidades novas

### Novos arquivos v1.3

```
js/providers/
  storage/
    StorageProvider.js          ← interface abstrata
    FakeLocalStorageProvider.js ← implementação atual (localStorage + tenant scope)
    APIProvider.js              ← stub para backend REST futuro
  auth/
    FakeAuthProvider.js         ← auth local com criação de tenant
  ai/
    FakeAIProvider.js           ← IA local sem APIs externas
  payment/
    FakePaymentProvider.js      ← planos SaaS simulados

js/services/
  ai.js                         ← AIService (facade sobre AIProvider)
  payment.js                    ← PaymentService (facade sobre PaymentProvider)
```

### Novos módulos UI

- **Assistente IA** — chat com análise inteligente dos dados internos
  - Quick prompts pré-definidos
  - Análise de top produtos, financeiro, estoque, clientes, vendas, fluxo de caixa
  - Preparado para Claude / Gemini / OpenAI (troca de provider)
- **Planos & Faturamento** — UI completa de billing
  - 3 planos: Gratuito / Pro / Business
  - Histórico de pagamentos (demo)
  - Checkout simulado (troca por Stripe/MercadoPago)

### EventBus v1.3

Novos eventos:
- `AI_RESPONSE` — IA respondeu uma consulta
- `PLAN_UPGRADED` — usuário atualizou plano
- `TENANT_CHANGED` — empresa ativa alterada
- `IMPORT_COMPLETE` — importação em lote concluída

### API Slots documentados no código

Marcadores explícitos em todos os arquivos de provider:

```js
// API SLOT: AUTH
// FUTURE: JWT / OAuth

// API SLOT: STORAGE BACKEND
// FUTURE: APIProvider (REST + Prisma)

// API SLOT: AI PROVIDER
// FUTURE: Claude / Gemini / OpenAI

// API SLOT: PAYMENT PROVIDER
// FUTURE: Stripe / MercadoPago
```

### Migração de v1.2.2 → v1.3

- ✅ `StorageService` público 100% compatível com v1.2.2
- ✅ Todos os módulos (`products.js`, `sales.js`, etc.) sem alteração
- ✅ `DataCore` atualizado para usar tenant-scoped buckets
- ✅ `AuthService` agora async (login/register retornam Promise)
- ✅ `login.html` atualizado para await no login/register

### Correções incluídas (mantidas de v1.2.2)

Todas as 11 correções de v1.2.2 estão presentes.

---

## v1.2.2 — Hardening Final

> Base estável. Ver CHANGELOG histórico no repositório.

| # | Arquivo | Correção |
|---|---------|---------|
| 1 | Diretórios inválidos | Removidos |
| 2 | `sales.js` | `EXPENSE_CREATED` removido após venda |
| 3 | `customers.js` | Extensões v1.2 dentro do IIFE |
| 4 | `finance.js` | Import circular corrigido |
| 5 | `DataCore.js` | `_stamp()` duplicada removida |
| 6 | `storage.js` | SCHEMA atualizado |
| 7 | `dashboard.html` | Listener duplicado removido |
| 8–11 | Vários | Simplificações e enriquecimentos |

---

## v1.2.0 — ERP Completo

- Módulo de Compras + Fornecedores
- InsightsEngine (13 análises automáticas)
- DataCore, fluxo de caixa, CRM avançado

## v1.1.0

- UUID v4, soft delete, Logger, Timeline, AppState
- Stubs de integrações

## v1.0.0

- MVP: Dashboard, Produtos, Clientes, Vendas, Financeiro, Relatórios
