# BusinessOS — Roadmap

> Versão atual: **v1.3.0** (SaaS Architecture) | Stack: HTML/CSS/JS + localStorage

---

## ✅ v1.0.0 — MVP (concluído)
- Dashboard, Produtos, Clientes, Vendas, Financeiro, Relatórios
- EventBus, StorageService, AuthService, Chart.js

## ✅ v1.1.0 — Estrutura profissional (concluído)
- UUID v4, soft delete, Logger, Timeline, AppState
- Stubs de integrações externas

## ✅ v1.2.0 — ERP completo (concluído)
- Módulo de Compras + fornecedores
- InsightsEngine (13 análises automáticas)
- DataCore, fluxo de caixa, CRM avançado

## ✅ v1.2.2 — Hardening final (concluído)
- Auditoria técnica completa, 11 correções críticas
- Documentação completa (README, ARCHITECTURE, CHANGELOG, ROADMAP, AGENTS)

## ✅ v1.3.0 — SaaS Architecture (atual)
- ✅ Provider Layer (Storage, Auth, AI, Payment)
- ✅ Fake-First architecture (tudo funciona offline)
- ✅ Multiempresa (tenant system com companyId)
- ✅ FakeAIProvider — análise inteligente sem APIs externas
- ✅ FakePaymentProvider — planos SaaS simulados
- ✅ Módulo Assistente IA no dashboard
- ✅ Módulo Planos & Faturamento
- ✅ API Slots documentados em todo o código
- ✅ AuthService async
- ✅ EventBus v1.3 (4 novos eventos)

---

## 🔜 v1.4.0 — Backend Real

> **Objetivo:** conectar o frontend a um backend Node.js real.

### Backend (Node.js)
- [ ] Node.js 20 + Express 5 ou Hono
- [ ] PostgreSQL 16 + Prisma 5
- [ ] JWT authentication (bcrypt + refresh tokens)
- [ ] API REST — mirrors dos métodos do StorageService
- [ ] Middleware de tenant (extrai companyId do JWT)
- [ ] WebSockets para eventos em tempo real (substitui EventBus local)

### Frontend (atualização)
- [ ] Ativar `APIProvider` em `storage.js`
- [ ] Ativar `JWTAuthProvider` em `auth.js`
- [ ] Loading states para operações assíncronas
- [ ] Offline mode com queue de sincronização

### IA real
- [ ] Ativar `ClaudeProvider` em `ai.js` (Anthropic API)
- [ ] Contexto da conversa persistido
- [ ] Relatórios gerados em linguagem natural
- [ ] Sugestões de reposição de estoque

### Pagamentos reais
- [ ] Ativar `StripeProvider` ou `MercadoPagoProvider`
- [ ] Webhook `invoice.paid` → ativa módulos no servidor
- [ ] Portal de faturamento self-service

---

## 🔮 v1.5.0 — Integrações

- [ ] WhatsApp Business API — notificações automáticas
- [ ] N8N automações — workflows customizados
- [ ] Shopify / WooCommerce — sincronização de estoque
- [ ] MercadoLivre — gestão de pedidos
- [ ] NF-e / NFS-e — emissão de notas fiscais (BR)
- [ ] PIX automático — conciliação via Open Banking

## 🔮 v1.6.0 — Multi-empresa avançado

- [ ] Dashboard de empresas (superadmin)
- [ ] Troca rápida de empresa sem logout
- [ ] Usuários com múltiplas empresas
- [ ] Planos por empresa (Free / Pro / Business)
- [ ] White-label (domínio customizado)

## 🔮 v2.0.0 — Mobile nativo

- [ ] React Native / Expo
- [ ] PWA com push notifications
- [ ] Leitor de código de barras
- [ ] Câmera para cadastro de produtos
- [ ] Sincronização offline → online
