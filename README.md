# BusinessOS v1.3

**ERP SaaS modular para pequenas e médias empresas.**

> Versão atual: **v1.3.0** — SaaS Architecture com Provider Layer e Multiempresa

---

## Início rápido

```bash
# Servidor local (necessário para ES modules)
npx serve .
# ou
python3 -m http.server 8080
```

Acesse `http://localhost:8080/login.html`

**Conta demo pré-carregada:**
| Campo | Valor |
|-------|-------|
| E-mail | `demo@businessos.app` |
| Senha | `demo1234` |

---

## O que há de novo na v1.3

### Provider Architecture
Toda dependência externa (storage, auth, IA, pagamento) é injetada via provider swappável. Trocar de localStorage para uma API REST real é **uma linha de código**.

```javascript
// js/core/storage.js — troca o backend:
let _provider = new APIProvider('https://api.businessos.app/v1', getToken);
// ou (padrão atual):
let _provider = new FakeLocalStorageProvider();
```

### Multiempresa (Tenant System)
Cada conta criada gera uma empresa isolada. Dois usuários na mesma máquina têm dados completamente separados — sem risco de vazamento.

### Assistente IA (sem API externa)
O módulo "Assistente IA" analisa seus dados internos e responde em linguagem natural:
- *"Qual produto mais vendeu?"*
- *"Resumo financeiro do mês"*
- *"Alertas de estoque crítico"*

Quando você contratar Claude/Gemini/OpenAI, basta trocar o provider em `ai.js`.

### Planos & Faturamento
UI completa de billing com 3 planos (Gratuito / Pro / Business). Checkout simulado — conecte Stripe ou MercadoPago em `payment.js`.

---

## Módulos disponíveis

| Módulo | Funcionalidades |
|--------|----------------|
| 🏠 **Dashboard** | Métricas em tempo real, gráficos, insights automáticos |
| 📦 **Produtos** | CRUD, busca, exportação CSV, alertas de estoque mínimo |
| 👥 **Clientes** | CRM, ticket médio, frequência, status automático |
| 🛒 **Vendas** | Criação com cálculo em tempo real, múltiplos métodos de pagamento |
| 🏭 **Compras** | Fornecedores + reposição, estoque atualizado automaticamente |
| 💰 **Financeiro** | Receitas, despesas, lucro, fluxo de caixa |
| 💡 **Insights** | 13 análises automáticas sem IA — estoque, vendas, financeiro, clientes |
| 📊 **Relatórios** | Top produtos, melhores clientes, estoque crítico, exportação |
| 🤖 **Assistente IA** | *(novo v1.3)* Chat com análise dos dados internos |
| 💳 **Planos** | *(novo v1.3)* Gestão de assinatura e billing |
| ⚙️ **Configurações** | Dados da empresa, módulos ativos, preferências |

---

## Estrutura do projeto

```
businessos/
├── index.html
├── login.html
├── dashboard.html
├── css/
│   └── style.css
├── js/
│   ├── providers/          ← NOVO v1.3 (Provider Layer)
│   │   ├── storage/
│   │   │   ├── StorageProvider.js          (interface)
│   │   │   ├── FakeLocalStorageProvider.js (atual)
│   │   │   └── APIProvider.js              (futuro)
│   │   ├── auth/
│   │   │   └── FakeAuthProvider.js
│   │   ├── ai/
│   │   │   └── FakeAIProvider.js
│   │   └── payment/
│   │       └── FakePaymentProvider.js
│   ├── core/               ← infraestrutura
│   │   ├── uuid.js
│   │   ├── storage.js      (facade v1.3 — compat com v1.2.2)
│   │   ├── eventBus.js
│   │   ├── notifications.js
│   │   ├── appState.js
│   │   ├── DataCore.js
│   │   └── InsightsEngine.js
│   ├── modules/            ← lógica de negócio (inalterada de v1.2.2)
│   │   ├── products.js
│   │   ├── customers.js
│   │   ├── sales.js
│   │   ├── finance.js
│   │   ├── purchases.js
│   │   └── settings.js
│   ├── services/
│   │   ├── auth.js
│   │   ├── ai.js           ← NOVO v1.3
│   │   ├── payment.js      ← NOVO v1.3
│   │   ├── export.js
│   │   └── ...
│   └── components/
│       └── timeline.js
├── README.md
├── ARCHITECTURE.md
├── CHANGELOG.md
├── ROADMAP.md
└── AGENTS.md
```

---

## API Slots — onde plugar serviços reais

| Slot | Arquivo | Provider atual | Provider futuro |
|------|---------|---------------|-----------------|
| Storage | `js/core/storage.js` | FakeLocalStorage | APIProvider (REST) |
| Auth | `js/services/auth.js` | FakeAuthProvider | JWTAuthProvider |
| IA | `js/services/ai.js` | FakeAIProvider | ClaudeProvider / Gemini |
| Pagamento | `js/services/payment.js` | FakePaymentProvider | Stripe / MercadoPago |

---

## Deploy na Vercel

1. Suba o repositório no GitHub
2. Conecte na [Vercel](https://vercel.com) → "Add New Project"
3. Deploy automático — zero configuração necessária

O projeto é 100% estático (HTML + CSS + JS). **Sem backend obrigatório.**

---

## Tecnologias

| Tecnologia | Uso |
|-----------|-----|
| HTML5 + CSS3 | Estrutura e design system |
| JavaScript ES6+ (módulos nativos) | Toda a lógica |
| localStorage | Persistência (substituível por API REST) |
| Chart.js 4.4 | Gráficos e visualizações |
| Google Fonts (Inter) | Tipografia |

---

## Histórico de versões

| Versão | Destaque |
|--------|---------|
| **v1.3.0** | SaaS Architecture: Provider Layer, Multiempresa, Assistente IA, Billing |
| v1.2.2 | Hardening final — base estável |
| v1.2.0 | Módulo de Compras + Insights Engine |
| v1.1.0 | UUID, soft delete, Timeline, Logger |
| v1.0.0 | MVP inicial |
