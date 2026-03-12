<div align="center">

# 🍽️ Rangô

### Sistema de Gestão de Pedidos & Entregas

[![Node.js](https://img.shields.io/badge/Node.js-18+-339933?logo=node.js&logoColor=white)](https://nodejs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.7-3178C6?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![React](https://img.shields.io/badge/React-18.2-61DAFB?logo=react&logoColor=black)](https://react.dev/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-4.2-06B6D4?logo=tailwindcss&logoColor=white)](https://tailwindcss.com/)
[![Supabase](https://img.shields.io/badge/Supabase-PostgreSQL-3ECF8E?logo=supabase&logoColor=white)](https://supabase.com/)
[![License](https://img.shields.io/badge/Licença-Privado-red)](#)

> Plataforma web fullstack para gestão operacional — do pedido à entrega, com relatórios inteligentes.

</div>

---

## 📋 Sobre o Projeto

O **Rangô** é uma aplicação web fullstack que substitui processos manuais (cadernos, planilhas, WhatsApp) por um fluxo digital centralizado. O sistema cobre o **ciclo operacional completo**:

- 👥 Cadastro e gerenciamento de clientes
- 📦 Catálogo de produtos com categorias e controle de preços
- 🧾 Criação e acompanhamento de pedidos com fluxo de status completo
- 🚚 Organização de rotas e lotes de entrega
- 📊 **Relatório de Vendas** com KPIs, ranking de produtos e gráficos interativos
- ❌ Rastreamento de pedidos cancelados e receita perdida

### Perfis de Acesso (RBAC)

| Perfil | Permissões |
|---|---|
| **Administrador** | Dashboard, Pedidos, Clientes, Produtos, Usuários, Entregas |
| **Atendente** | Pedidos, Clientes, Produtos (somente leitura de preços) |
| **Entregador** | Rotas de Entrega (visualizar, iniciar, confirmar) |

---

## 📊 Dashboard — Relatório de Vendas

O painel de gestão oferece uma visão completa do desempenho do negócio:

| Componente | Descrição |
|---|---|
| 💰 **Card Receita Total** | Soma dos pedidos entregues + receita do dia |
| ✅ **Card Pedidos Concluídos** | Contagem de entregas realizadas |
| ❌ **Card Pedidos Cancelados** | Contagem + valor de receita perdida |
| 🏆 **Ranking de Produtos** | BarChart horizontal com os Top 5 produtos mais vendidos |
| 📊 **Proporção Sucesso/Cancelados** | PieChart donut comparando pedidos concluídos vs cancelados |
| 📈 **Vendas Mensais** | LineChart com receita dos últimos 6 meses |

> Todas as métricas são calculadas diretamente no PostgreSQL via **RPCs otimizadas** (zero processamento em memória no Node.js).

---

## 🛠️ Stack Tecnológica

### Backend

| Tecnologia | Versão | Finalidade |
|---|---|---|
| Node.js | 18+ | Runtime |
| TypeScript | 5.7 | Tipagem estática |
| Express | 4.21 | Framework HTTP |
| Supabase | 2.98 | PostgreSQL via PostgREST |
| Zod | 3.24 | Validação de dados |
| JWT + bcrypt | — | Autenticação e segurança |
| Swagger UI | 5.0 | Documentação interativa da API |

### Frontend

| Tecnologia | Versão | Finalidade |
|---|---|---|
| React | 18.2 | UI framework |
| Vite | 5.2 | Build tool + dev server |
| Tailwind CSS | 4.2 | Design System + estilização |
| React Router DOM | 6.22 | Roteamento SPA |
| Axios | 1.13 | HTTP client |
| Recharts | 2.12 | Gráficos (Bar, Pie, Line) |
| React Icons | 5.0 | Ícones (Feather Icons) |

### Infraestrutura

| Componente | Tecnologia |
|---|---|
| Banco de dados | PostgreSQL (Supabase) |
| Autenticação | JWT customizado (HMAC-SHA256) |
| Hospedagem do banco | Supabase Cloud |

---

## 📁 Estrutura do Projeto

```
rangô/
├── backend/                    ← API REST (Node.js + TypeScript)
│   ├── src/
│   │   ├── server.ts           ← Entry point (porta 3000)
│   │   ├── config/             ← Database + Swagger
│   │   ├── controllers/        ← Handlers HTTP
│   │   ├── dtos/               ← Schemas Zod (validação)
│   │   ├── middlewares/        ← Auth, validação, erros
│   │   ├── models/             ← Interfaces TypeScript
│   │   ├── routes/             ← Definição de rotas
│   │   └── services/           ← Lógica de negócio
│   ├── create_tables.sql       ← DDL do banco
│   ├── migrate_dashboard_rpcs.sql     ← RPCs v1 (KPIs, vendas/mês, status)
│   └── migrate_dashboard_rpcs_v2.sql  ← RPCs v2 (cancelados + top produtos)
│
├── frontend/                   ← SPA React + Tailwind CSS v4
│   ├── src/
│   │   ├── componentes/        ← Layout, BarraLateral, Modal, Tabela, Spinner
│   │   ├── contextos/          ← AuthContext, PedidosContext
│   │   ├── paginas/            ← Login, Dashboard, Pedidos, Clientes, Produtos...
│   │   ├── rotas/              ← Rotas + guard de autenticação
│   │   ├── servicos/           ← Chamadas HTTP (Axios)
│   │   └── index.css           ← Design System (@theme Tailwind v4)
│   └── public/                 ← Assets estáticos (logo)
│
├── DOCUMENTACAO_TECNICA.md     ← Referência técnica completa
└── DOCUMENTACAO_NEGOCIO.md     ← Documento de negócio (banca)
```

---

## 🚀 Instalação e Execução

### Pré-requisitos

- [Node.js](https://nodejs.org/) v18+
- npm (incluído com o Node.js)
- Conta no [Supabase](https://supabase.com/) com o banco configurado

### 1. Clonar o repositório

```bash
git clone https://github.com/seu-usuario/rango.git
cd rango
```

### 2. Configurar variáveis de ambiente

Crie o arquivo `backend/.env` baseado no exemplo:

```env
SUPABASE_URL=https://seu-projeto.supabase.co
SUPABASE_KEY=sua_service_role_key
JWT_KEY=sua_chave_secreta_jwt
```

### 3. Configurar o banco de dados

Execute os scripts SQL no **Supabase SQL Editor** na seguinte ordem:

```
1. backend/create_tables.sql            ← Cria as tabelas
2. backend/migrate_dashboard_rpcs.sql   ← RPCs do Dashboard v1
3. backend/migrate_dashboard_rpcs_v2.sql ← RPCs do Dashboard v2 (cancelados + ranking)
```

### 4. Backend

```bash
cd backend
npm install
npm run seed    # Cria o usuário admin padrão
npm run dev     # Inicia em http://localhost:3000
```

> 📖 Documentação da API disponível em `http://localhost:3000/api-docs`

### 5. Frontend

```bash
cd frontend
npm install
npm run dev     # Inicia em http://localhost:5173
```

---

## 🎨 Design System

O frontend utiliza **Tailwind CSS v4** com um Design System customizado definido via `@theme`:

| Token | Cor | Uso |
|---|---|---|
| `primary-500` | `#d97706` 🟠 | Botões, links, destaques, gráficos |
| `grafite-800` | `#1f2937` ⚫ | Textos principais |
| `grafite-50` | `#f9fafb` ⚪ | Background da aplicação |
| `sucesso` | `#16a34a` 🟢 | Status positivos, receita |
| `erro` | `#dc2626` 🔴 | Erros, cancelamentos, ações destrutivas |

**Efeitos visuais:** `rounded-2xl` · `shadow-soft` · glassmorphism (`backdrop-blur`) · animações (`fade-in`, `slide-up`)

---

## 📄 Documentação

| Documento | Descrição |
|---|---|
| [DOCUMENTACAO_TECNICA.md](./DOCUMENTACAO_TECNICA.md) | Referência técnica completa (stack, banco, endpoints, DTOs) |
| [DOCUMENTACAO_NEGOCIO.md](./DOCUMENTACAO_NEGOCIO.md) | Documento de negócio para apresentação |
| `/api-docs` | Swagger UI interativo (com o backend rodando) |

---

## 👥 Credenciais Padrão

Após rodar o `npm run seed`, o sistema cria um usuário admin:

| Campo | Valor |
|---|---|
| Email | `admin@rango.com` |
| Senha | `admin123` |

> ⚠️ **Altere a senha padrão em ambiente de produção.**

---

<div align="center">

Feito com ☕ e muito rangô. 🍽️

</div>
