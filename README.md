<p align="center">
  <img src="https://img.shields.io/badge/React-18.2-61DAFB?logo=react&logoColor=white&style=for-the-badge" />
  <img src="https://img.shields.io/badge/Node.js-Express-339933?logo=node.js&logoColor=white&style=for-the-badge" />
  <img src="https://img.shields.io/badge/Supabase-PostgreSQL-3ECF8E?logo=supabase&logoColor=white&style=for-the-badge" />
  <img src="https://img.shields.io/badge/Tailwind_CSS-v4-06B6D4?logo=tailwindcss&logoColor=white&style=for-the-badge" />
  <img src="https://img.shields.io/badge/xAI-Grok_2-000000?logo=x&logoColor=white&style=for-the-badge" />
  <img src="https://img.shields.io/badge/TypeScript-Strict-3178C6?logo=typescript&logoColor=white&style=for-the-badge" />
  <img src="https://img.shields.io/badge/WhatsApp-Bot_Nativo-25D366?logo=whatsapp&logoColor=white&style=for-the-badge" />
</p>

<h1 align="center">🍽️ Rangô</h1>

<p align="center">
  <strong>SaaS completo de gestão para fábrica de salgados — com Bot de WhatsApp nativo, IA de negócios e logística inteligente.</strong>
</p>

<p align="center">
  <em>Da conversa no WhatsApp até a entrega na porta do cliente, tudo num único sistema.</em>
</p>

---

## 📋 Sumário

- [Sobre o Projeto](#-sobre-o-projeto)
- [Features Principais](#-features-principais)
- [Arquitetura de Alto Nível](#-arquitetura-de-alto-nível)
- [Stack Tecnológica](#-stack-tecnológica)
- [Deploy e Ambiente](#-deploy-e-ambiente)
- [Variáveis de Ambiente](#-variáveis-de-ambiente)
- [Scripts de Desenvolvimento](#-scripts-de-desenvolvimento)
- [Estrutura do Repositório](#-estrutura-do-repositório)
- [Documentação Complementar](#-documentação-complementar)

---

## 🎯 Sobre o Projeto

O **Rangô** é uma plataforma integrada de gestão para fábricas de salgados que unifica vendas, produção, logística e inteligência de negócios em um único sistema. O diferencial está na automação completa do ciclo de vendas: o cliente faz o pedido diretamente pelo **WhatsApp** conversando com um bot inteligente, a equipe de produção gerencia os pedidos no dashboard web, e os entregadores recebem lotes otimizados para expedição — tudo sem intervenção manual.

O sistema opera com **três perfis de utilizador** (Admin, Atendente, Entregador), cada um com acesso personalizado ao dashboard.

---

## ✨ Features Principais

### 🤖 Bot de WhatsApp Multi-Itens (Baileys)
- Conversa natural com o cliente para recolha de pedidos
- **Carrinho de compras** com suporte a múltiplos produtos por pedido
- Onboarding automático de novos clientes (nome, endereço)
- Opções pré-definidas de quantidade: **100, 300, 500, 1.000** unidades
- Consulta de status de pedido ativo, cancelamento e suporte
- Resolução de **LID ↔ Telefone** para compatibilidade com WhatsApp Privacy Mode
- Persistência de sessão via **Custom Supabase Auth State** — sobrevive a reinicializações do servidor

### 🧠 Inteligência Artificial (Grok / xAI)
- **Insights de negócios diários** gerados pelo Grok 2 diretamente no Dashboard
- Chat interativo com contexto de métricas (receita, pedidos, produtos mais vendidos)
- **Hierarquia de fallback**: Grok → Groq → Gemini → OpenAI → mensagem padrão
- System prompt otimizado para dicas curtas e acionáveis de marketing/vendas

### 🚚 Logística Inteligente — Gestão de Lotes
- **Algoritmo de Bin Packing** que fraciona pedidos prontos em lotes de expedição
- Capacidade máxima por lote: **1.000 unidades** · Volume mínimo para liberação: **900 unidades**
- Barra de progresso visual por lote com indicador de ocupação
- Liberação em lote com transição atômica de status (``Pronto → Em Entrega``)
- Painel em tempo real de pedidos em trânsito com marcação individual de entrega

### 📊 Dashboard Gerencial
- KPIs em tempo real: receita do dia, pedidos concluídos, cancelamentos
- Gráfico de barras — Top 5 produtos mais vendidos
- Gráfico de rosca — Distribuição concluídos vs. cancelados
- Gráfico de linha — Receita mensal (últimos 6 meses)
- Card de Consultor IA com badge Grok integrado

### 🎨 UI/UX Mobile-First
- Design system baseado em **Tailwind CSS v4** com tema custom (Burnt Orange + Deep Graphite)
- **Menu hambúrguer** responsivo com drawer deslizante e backdrop com blur
- Sidebar fixa em desktop, drawer colapsável em mobile
- Tabelas com scroll horizontal em ecrãs pequenos
- Fonte Inter, tipografia otimizada para legibilidade

### 🔐 Segurança & Autenticação
- Autenticação JWT com hash bcrypt para senhas
- Controle de acesso baseado em perfis (RBAC)
- Rate limiting no login (10 tentativas / 15 min)
- Helmet + CSP headers no backend
- Validação runtime com **Zod** em todos os endpoints
- Documentação automática via **Swagger/OpenAPI**

---

## 🏗️ Arquitetura de Alto Nível

```
┌──────────────────────────────────────────────────┐
│              VERCEL (Frontend)                    │
│    React 18 · Vite · Tailwind v4                 │
│    SPA com vercel.json rewrite → index.html      │
└───────────────────────┬──────────────────────────┘
                        │ HTTPS (Axios)
                        ▼
┌──────────────────────────────────────────────────┐
│             RENDER.COM (Backend)                  │
│    Express · TypeScript (tsup build)             │
│  ┌─────────────┐  ┌───────────────────────┐      │
│  │  REST API   │  │  Baileys WhatsApp Bot │      │
│  │  (Zod+JWT)  │  │  (Supabase Auth State)│      │
│  └──────┬──────┘  └──────────┬────────────┘      │
│         │                    │                    │
│         ▼                    ▼                    │
│  ┌─────────────────────────────────────┐         │
│  │         Supabase (PostgreSQL)       │         │
│  │   Dados · RPC Atômicas · Auth Keys │         │
│  └─────────────────────────────────────┘         │
│         │                                         │
│         ▼                                         │
│  ┌─────────────────────────────────────┐         │
│  │          xAI / Grok API             │         │
│  │    Insights de Negócio via Chat     │         │
│  └─────────────────────────────────────┘         │
└──────────────────────────────────────────────────┘
```

---

## 🛠️ Stack Tecnológica

| Camada        | Tecnologia                                       |
|---------------|--------------------------------------------------|
| **Frontend**  | React 18, Vite 5, Tailwind CSS v4, Recharts      |
| **Backend**   | Node.js, Express 4, TypeScript (strict mode)      |
| **Build**     | ``tsup`` (backend) · Vite (frontend)              |
| **Database**  | Supabase (PostgreSQL) com RPCs atômicas           |
| **Auth**      | JWT + bcrypt + RBAC (3 perfis)                    |
| **Validação** | Zod (DTOs runtime) + Swagger/OpenAPI              |
| **WhatsApp**  | Baileys v7 + Custom Supabase Auth State           |
| **IA**        | Grok 2 (xAI) via OpenAI SDK + fallback chain     |
| **Segurança** | Helmet, CORS, Rate Limiting, CSP                  |
| **Testes**    | Vitest                                            |
| **Deploy**    | Vercel (frontend) + Render.com (backend)          |

---

## 🚀 Deploy e Ambiente

### Frontend — Vercel
O frontend é uma **Single Page Application** React servida pelo Vercel. O ficheiro ``vercel.json`` configura um rewrite universal que redireciona todas as rotas para ``index.html``, permitindo que o React Router gerencie o roteamento no lado do cliente:

```json
{
  "rewrites": [{ "source": "/(.*)", "destination": "/index.html" }]
}
```

### Backend — Render.com
O backend é compilado com **tsup** (bundler baseado em esbuild) que gera um bundle CJS otimizado e ultra-rápido — contornando limitações de RAM do Render no free tier onde o ``tsc`` convencional falhava por falta de memória:

```bash
tsup src/server.ts src/seed.ts --format cjs --clean
```

O servidor Express inicia imediatamente na porta configurada e inicializa em paralelo a conexão Supabase e o bot Baileys.

### Database — Supabase
O Supabase hospeda o PostgreSQL com:
- **7 tabelas principais**: ``usuarios``, ``clientes``, ``produtos``, ``pedidos``, ``itens_pedido``, ``sessoes_whatsapp``, ``whatsapp_mensagens``
- **Tabela de auth**: ``whatsapp_auth_state`` (Signal keys do Baileys)
- **RPCs atômicas**: ``criar_pedido_atomico`` para criação transacional de pedidos

---

## 🔑 Variáveis de Ambiente

### Backend (``backend/.env``)

| Variável                    | Descrição                                    | Obrigatória |
|-----------------------------|----------------------------------------------|:-----------:|
| ``SUPABASE_URL``            | URL do projeto Supabase                      | ✅          |
| ``SUPABASE_KEY``            | Service Role Key do Supabase                 | ✅          |
| ``JWT_KEY``                 | Chave secreta para assinatura JWT (256-bit)  | ✅          |
| ``PORT``                    | Porta do servidor (default: ``3000``)        | ❌          |
| ``CORS_ORIGINS``            | Origens permitidas (separadas por vírgula)   | ✅          |
| ``NODE_ENV``                | Ambiente (``development`` / ``production``)  | ✅          |
| ``WHATSAPP_ADMIN_JID``      | JID do administrador no WhatsApp             | ✅          |
| ``WHATSAPP_SESSION_ID``     | ID da sessão Baileys (default: ``rango-prod``) | ✅       |
| ``WHATSAPP_BAILEYS_ENABLED``| Ativar/desativar o bot (``true`` / ``false``)| ✅          |
| ``GROK_API_KEY``            | Chave da API xAI (Grok) — prioritária       | ❌          |
| ``GROQ_API_KEY``            | Chave da API Groq (fallback)                 | ✅          |
| ``GEMINI_API_KEY``          | Chave da API Gemini (fallback)               | ❌          |
| ``OPENAI_API_KEY``          | Chave da API OpenAI (último fallback)        | ❌          |

> **Nota:** Pelo menos uma chave de IA é recomendada para ativar os insights no Dashboard.

---

## 📜 Scripts de Desenvolvimento

### Backend

```bash
cd backend
npm run dev        # Dev server com hot-reload (ts-node-dev)
npm run build      # Build de produção com tsup
npm start          # Iniciar build de produção
npm run seed       # Popular base de dados com dados iniciais
npm test           # Executar testes com Vitest
```

### Frontend

```bash
cd frontend
npm run dev        # Dev server Vite (HMR)
npm run build      # Build de produção
npm run preview    # Preview do build local
```

---

## 📁 Estrutura do Repositório

```
x-salgados/
├── README.md                        # Este ficheiro
├── DOCUMENTACAO_TECNICA.md          # Arquitetura, decisões técnicas, API
├── DOCUMENTACAO_NEGOCIO.md          # Regras de negócio e fluxos
│
├── backend/
│   ├── src/
│   │   ├── server.ts                # Entry point Express
│   │   ├── seed.ts                  # Script de seeding
│   │   ├── config/                  # Supabase client, Swagger config
│   │   ├── controllers/             # Handlers HTTP
│   │   ├── services/                # Lógica de negócio
│   │   │   ├── ai.service.ts        # Integração Grok/xAI
│   │   │   ├── baileys.service.ts   # Conexão WhatsApp
│   │   │   ├── whatsapp.service.ts  # Fluxo conversacional do bot
│   │   │   ├── bot-state.service.ts # Máquina de estados do bot
│   │   │   ├── supabase-auth-state.service.ts  # Persistência Signal keys
│   │   │   ├── jid-resolver.service.ts         # Mapeamento LID ↔ Telefone
│   │   │   └── pedido.service.ts    # Pedidos + lógica de lotes
│   │   ├── dtos/                    # Schemas Zod (validação runtime)
│   │   ├── models/                  # Enums (StatusPedido, PerfilUsuario)
│   │   ├── middlewares/             # Auth JWT, Error handler
│   │   └── routes/                  # Definição de rotas Express
│   ├── sql/                         # Migrações SQL
│   ├── package.json
│   └── tsconfig.json
│
├── frontend/
│   ├── src/
│   │   ├── App.tsx                  # Root com providers de contexto
│   │   ├── index.css                # Design system Tailwind
│   │   ├── componentes/             # BarraLateral, Modal, Spinner, Tabela
│   │   ├── contextos/               # Auth + Pedidos (React Context)
│   │   ├── paginas/                 # Dashboard, Pedidos, Clientes, Entregas...
│   │   ├── rotas/                   # Configuração React Router
│   │   ├── servicos/                # Clientes HTTP (Axios)
│   │   └── types/                   # Interfaces TypeScript
│   ├── vercel.json                  # SPA rewrite config
│   ├── vite.config.js
│   └── package.json
```

---

## 📚 Documentação Complementar

| Documento | Conteúdo |
|-----------|----------|
| [DOCUMENTACAO_TECNICA.md](DOCUMENTACAO_TECNICA.md) | Arquitetura detalhada, decisões técnicas, esquema de BD, API endpoints |
| [DOCUMENTACAO_NEGOCIO.md](DOCUMENTACAO_NEGOCIO.md) | Regras de negócio, fluxo WhatsApp, expedição, cancelamentos |
| [INTEGRACAO_WHATSAPP.md](INTEGRACAO_WHATSAPP.md) | Guia completo da integração Baileys + Supabase Auth State |

---

<p align="center">
  <strong>Rangô</strong> — Feito com 🔥 e muito salgado.
</p>
