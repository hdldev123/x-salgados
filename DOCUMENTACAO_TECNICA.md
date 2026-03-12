# X Salgados — Documentação Técnica de Referência para Agente IA

> **Última atualização:** 02/03/2026
> **Stack atual:** Node.js · TypeScript · Express · Supabase (PostgREST) · Zod · JWT · React · Vite
> **Propósito:** Documento de consulta rápida para agentes de IA auxiliarem no desenvolvimento, debugging e evolução do projeto.

---

## 1. MAPA DO PROJETO

```
xsalgados/
├── DOCUMENTACAO_TECNICA.md      ← ESTE ARQUIVO (referência técnica para IA)
├── DOCUMENTACAO_NEGOCIO.md      ← Documento de negócio (apresentação para banca)
├── README.md                    ← Instruções de setup
│
├── backend/                     ← API REST (Node.js + TypeScript + Express)
│   ├── package.json             ← Dependências e scripts npm
│   ├── tsconfig.json            ← Config TypeScript (ES2020, commonjs, strict)
│   ├── create_tables.sql        ← DDL do banco PostgreSQL
│   └── src/
│       ├── server.ts            ← Entry point Express (porta 3000)
│       ├── seed.ts              ← Script de seed (cria admin com bcrypt)
│       ├── config/
│       │   ├── database.ts      ← Cliente Supabase (PostgREST)
│       │   └── swagger.ts       ← Spec OpenAPI gerada via zod-to-json-schema
│       ├── models/              ← Interfaces TypeScript (= colunas do banco, snake_case)
│       │   ├── enums.ts         ← PerfilUsuario (1-3), StatusPedido (1-6) + labels
│       │   ├── Usuario.ts       ← { id, nome, email, senha_hash, perfil, data_criacao, ativo }
│       │   ├── Cliente.ts       ← { id, nome, telefone, email?, endereco?, cidade?, cep?, data_criacao }
│       │   ├── Produto.ts       ← { id, nome, categoria, descricao?, preco, ativo, data_criacao }
│       │   ├── Pedido.ts        ← { id, cliente_id, data_criacao, data_entrega?, valor_total, status, observacoes? }
│       │   └── ItemPedido.ts    ← { id, pedido_id, produto_id, quantidade, preco_unitario_snapshot }
│       ├── dtos/                ← Schemas Zod (input) + interfaces TypeScript (output)
│       │   ├── auth.dto.ts      ← LoginSchema → LoginResponseDto
│       │   ├── common.dto.ts    ← PaginacaoSchema, ResultadoPaginadoDto<T>, ApiResponse<T>
│       │   ├── cliente.dto.ts   ← CriarClienteSchema, ClienteDto
│       │   ├── produto.dto.ts   ← CriarProdutoSchema, ProdutoDto
│       │   ├── pedido.dto.ts    ← CriarPedidoSchema, AtualizarStatusSchema, PedidoDto, PedidoResumoDto
│       │   ├── usuario.dto.ts   ← CriarUsuarioSchema, AtualizarUsuarioSchema, AlterarSenhaSchema, UsuarioDto
│       │   └── dashboard.dto.ts ← DashboardKpisDto, PedidosPorMesDto, DistribuicaoStatusDto
│       ├── middlewares/
│       │   ├── auth.middleware.ts    ← authenticate() + authorize(...perfis) → RBAC
│       │   ├── validate.middleware.ts ← validate(zodSchema, source) → req.body/query/params
│       │   └── error.middleware.ts   ← errorHandler + classes de erro tipadas (NotFoundError, etc.)
│       ├── services/            ← Toda a lógica de negócio
│       │   ├── auth.service.ts      ← Login (bcrypt + JWT)
│       │   ├── cliente.service.ts   ← CRUD + busca + proteção referencial
│       │   ├── produto.service.ts   ← CRUD + categorias + filtros
│       │   ├── pedido.service.ts    ← CRUD + cálculo de valor + snapshot de preço + rotas de entrega
│       │   ├── usuario.service.ts   ← CRUD + email único + auto-exclusão + alteração de senha
│       │   └── dashboard.service.ts ← KPIs + pedidos-por-mês + distribuição de status
│       ├── controllers/         ← Handlers HTTP (thin — delegam para services)
│       │   ├── auth.controller.ts
│       │   ├── clientes.controller.ts
│       │   ├── produtos.controller.ts
│       │   ├── pedidos.controller.ts
│       │   ├── usuarios.controller.ts
│       │   ├── entregas.controller.ts
│       │   └── dashboard.controller.ts
│       └── routes/
│           └── index.ts         ← Todas as rotas com middlewares encadeados
│
└── frontend/                    ← SPA React (JavaScript puro, sem TypeScript)
    ├── package.json             ← React 18, Vite 5, Axios, Recharts, React Router 6
    ├── vite.config.js           ← Dev server porta 5173 + plugin Tailwind CSS v4
    └── src/
        ├── main.jsx             ← BrowserRouter + App
        ├── App.jsx              ← ProvedorAutenticacao > ProviderPedidos > RotasApp
        ├── componentes/         ← Componentes reutilizáveis (Tailwind utility classes)
        │   ├── BarraLateral/    ← Menu lateral com filtro por role
        │   ├── Layout/          ← BarraLateral + Outlet
        │   ├── Modal/           ← Portal React com backdrop + glassmorphism
        │   ├── Spinner/         ← Indicador de carregamento animado
        │   └── Tabela/          ← Tabela genérica (colunas + dados)
        ├── contextos/
        │   ├── ContextoAutenticacao.jsx ← Login/logout, token em localStorage
        │   └── ContextoPedidos.jsx      ← useReducer para pedidos + selectors por status
        ├── paginas/
        │   ├── Login/           ← Formulário de login
        │   ├── Dashboard/       ← KPIs + gráfico de vendas (Recharts LineChart)
        │   ├── Pedidos/         ← Listagem tabela/Kanban + atualização de status
        │   ├── Clientes/        ← CRUD completo com modal de formulário
        │   ├── Produtos/        ← CRUD completo com modal de formulário
        │   ├── Usuarios/        ← Listagem somente leitura (sem CRUD no frontend)
        │   ├── RotasDeEntregas/ ← Lote de entrega (capacidade 900–1000 itens)
        │   └── NaoEncontrado/   ← Página 404
        ├── rotas/
        │   ├── index.jsx        ← Definição de rotas com roles permitidas
        │   └── RotaProtegida.jsx ← Guard de autenticação + autorização
        ├── servicos/            ← Chamadas HTTP via Axios
        │   ├── api.js           ← Instância Axios (base, interceptors, auto-logout 401)
        │   ├── apiAutenticacao.js
        │   ├── apiPedidos.js
        │   ├── apiClientes.js
        │   ├── apiProdutos.js
        │   ├── apiUsuarios.js
        │   ├── apiDashboard.js
        │   └── apiEntregas.js
        ├── utils/
        │   └── mapeamentos.js   ← Conversores backend ↔ frontend (status, perfis, objetos)
        └── types/
            └── index.js         ← Typedefs JSDoc (sem runtime)
```

---

## 2. STACK TECNOLÓGICA

### Backend

| Tecnologia | Versão | Finalidade |
|---|---|---|
| Node.js | 18+ | Runtime |
| TypeScript | 5.7.3 | Tipagem estática |
| Express | 4.21.2 | Framework HTTP |
| @supabase/supabase-js | 2.98.0 | Acesso ao banco via PostgREST API |
| Zod | 3.24.2 | Validação de input + inferência de tipos |
| bcrypt | 5.1.1 | Hash de senhas (12 rounds) |
| jsonwebtoken | 9.0.2 | Geração e verificação de JWT (HMAC-SHA256) |
| swagger-ui-express | 5.0.1 | Documentação OpenAPI interativa |
| zod-to-json-schema | 3.25.1 | Geração automática de JSON Schema a partir do Zod |
| tsx | 4.21.0 | Execução direta de TypeScript em dev |
| dotenv | 16.4.7 | Variáveis de ambiente |

### Frontend

| Tecnologia | Versão | Finalidade |
|---|---|---|
| React | 18.2.0 | UI framework |
| Vite | 5.2.0 | Build tool + dev server |
| React Router DOM | 6.22.3 | Roteamento SPA |
| Axios | 1.13.5 | HTTP client |
| Recharts | 2.12.3 | Gráficos (Dashboard) |
| React Icons | 5.0.1 | Ícones (Feather Icons + FontAwesome) |
| Tailwind CSS | 4.2.1 | Framework CSS utilitário (Design System via @theme em index.css) |
| @tailwindcss/vite | 4.2.1 | Plugin Vite para Tailwind v4 (substitui PostCSS) |

### Infraestrutura

| Componente | Tecnologia |
|---|---|
| Banco de dados | PostgreSQL hospedado no Supabase |
| Acesso ao banco | PostgREST API via @supabase/supabase-js (service_role key) |
| Autenticação | JWT customizado (não usa Supabase Auth) |

---

## 3. BANCO DE DADOS

### 3.1 Modelo Relacional

```
usuarios (id PK, nome, email UQ, senha_hash, perfil INT, data_criacao, ativo BOOL)
    │
    │ (sem FK direta — auth é via JWT)
    │
clientes (id PK, nome, telefone, email?, endereco?, cidade?, cep?, data_criacao)
    │ 1:N
    ▼
pedidos (id PK, cliente_id FK→clientes ON DELETE RESTRICT, data_criacao, data_entrega?,
         valor_total DECIMAL(10,2), status INT, observacoes?)
    │ 1:N
    ▼
itens_pedido (id PK, pedido_id FK→pedidos ON DELETE CASCADE,
              produto_id FK→produtos ON DELETE RESTRICT,
              quantidade INT, preco_unitario_snapshot DECIMAL(10,2))
    ▲
    │ 1:N
produtos (id PK, nome, categoria, descricao?, preco DECIMAL(10,2), ativo BOOL, data_criacao)
```

### 3.2 Enums (numéricos no banco)

**PerfilUsuario:**
| Valor | Label |
|---|---|
| 1 | Administrador |
| 2 | Atendente |
| 3 | Entregador |

**StatusPedido:**
| Valor | Label |
|---|---|
| 1 | Pendente |
| 2 | Em Produção |
| 3 | Pronto |
| 4 | Em Entrega |
| 5 | Entregue |
| 6 | Cancelado |

### 3.3 Índices

```sql
idx_pedidos_cliente_id     ON pedidos(cliente_id)
idx_pedidos_status         ON pedidos(status)
idx_pedidos_data_criacao   ON pedidos(data_criacao)
idx_pedidos_data_entrega   ON pedidos(data_entrega)
idx_itens_pedido_pedido_id ON itens_pedido(pedido_id)
idx_itens_pedido_produto_id ON itens_pedido(produto_id)
idx_produtos_categoria     ON produtos(categoria)
idx_usuarios_email         ON usuarios(email)
```

### 3.4 Restrições de Integridade

| FK | ON DELETE |
|---|---|
| pedidos.cliente_id → clientes.id | RESTRICT (não pode excluir cliente com pedidos) |
| itens_pedido.pedido_id → pedidos.id | CASCADE (exclui itens junto com pedido) |
| itens_pedido.produto_id → produtos.id | RESTRICT (não pode excluir produto vinculado) |

---

## 4. API — ENDPOINTS COMPLETOS

**Base URL:** `http://localhost:3000`
**Formato:** JSON
**Auth:** `Authorization: Bearer <JWT>`
**Resposta padrão:** `{ sucesso: boolean, mensagem?: string, dados?: T, erros?: string[] }`

### 4.1 Autenticação

| Método | Rota | Acesso | Body | Response |
|---|---|---|---|---|
| POST | `/api/auth/login` | Público | `{ email, senha }` | `{ token, expiracao, usuario: { id, nome, email, perfil } }` |

### 4.2 Clientes

| Método | Rota | Acesso | Body/Query | Response |
|---|---|---|---|---|
| GET | `/api/clientes` | Admin, Atendente | Query: `pagina, tamanhoPagina, busca` | `ResultadoPaginado<ClienteDto>` |
| GET | `/api/clientes/:id` | Admin, Atendente | — | `ClienteDto` |
| POST | `/api/clientes` | Admin, Atendente | `{ nome, telefone, email?, endereco?, cidade?, cep? }` | `ClienteDto` (201) |
| PUT | `/api/clientes/:id` | Admin, Atendente | `{ nome, telefone, email?, endereco?, cidade?, cep? }` | `ClienteDto` |
| DELETE | `/api/clientes/:id` | Admin, Atendente | — | 204 ou 409 (se tiver pedidos) |

### 4.3 Produtos

| Método | Rota | Acesso | Body/Query | Response |
|---|---|---|---|---|
| GET | `/api/produtos` | Autenticado | Query: `pagina, tamanhoPagina, categoria, apenasAtivos` | `ResultadoPaginado<ProdutoDto>` |
| GET | `/api/produtos/categorias` | Autenticado | — | `string[]` |
| GET | `/api/produtos/:id` | Autenticado | — | `ProdutoDto` |
| POST | `/api/produtos` | Admin | `{ nome, categoria, descricao?, preco, ativo? }` | `ProdutoDto` (201) |
| PUT | `/api/produtos/:id` | Admin | `{ nome, categoria, descricao?, preco, ativo? }` | `ProdutoDto` |
| DELETE | `/api/produtos/:id` | Admin | — | 204 |

### 4.4 Pedidos

| Método | Rota | Acesso | Body/Query | Response |
|---|---|---|---|---|
| GET | `/api/pedidos` | Admin, Atendente | Query: `pagina, tamanhoPagina, status, dataInicio, dataFim` | `ResultadoPaginado<PedidoResumoDto>` |
| GET | `/api/pedidos/:id` | Admin, Atendente | — | `PedidoDto` (com itens + cliente) |
| POST | `/api/pedidos` | Admin, Atendente | `{ clienteId, dataEntrega?, observacoes?, itens: [{ produtoId, quantidade }] }` | `PedidoDto` (201) |
| PATCH | `/api/pedidos/:id/status` | Admin, Atendente | `{ status: number }` | `PedidoDto` |

### 4.5 Usuários

| Método | Rota | Acesso | Body/Query | Response |
|---|---|---|---|---|
| GET | `/api/usuarios` | Admin | Query: `pagina, tamanhoPagina` | `ResultadoPaginado<UsuarioDto>` |
| GET | `/api/usuarios/:id` | Admin | — | `UsuarioDto` |
| POST | `/api/usuarios` | Admin | `{ nome, email, senha, perfil: 1\|2\|3 }` | `UsuarioDto` (201) |
| PUT | `/api/usuarios/:id` | Admin | `{ nome, email, perfil, ativo }` | `UsuarioDto` |
| DELETE | `/api/usuarios/:id` | Admin | — | 204 (não pode excluir a si mesmo) |
| PATCH | `/api/usuarios/:id/senha` | Admin | `{ senhaAtual, novaSenha }` | `{ sucesso, mensagem }` |

### 4.6 Entregas

| Método | Rota | Acesso | Response |
|---|---|---|---|
| GET | `/api/entregas/lote` | Admin, Entregador | `LoteEntregaDto { pedidosProntos: PedidoDto[], totalItensAcumulados: number }` |

### 4.7 Dashboard

| Método | Rota | Acesso | Response |
|---|---|---|---|
| GET | `/api/dashboard/kpis` | Admin | `{ receitaTotal, totalPedidos, totalClientes, pedidosPendentes, pedidosHoje, receitaHoje }` |
| GET | `/api/dashboard/pedidos-por-mes` | Admin | `[{ ano, mes, mesNome, totalPedidos, receitaTotal }]` |
| GET | `/api/dashboard/distribuicao-status` | Admin | `[{ status, quantidade, percentual }]` |
| GET | `/api/dashboard/completo` | Admin | `{ kpis, pedidosPorMes, distribuicaoStatus }` |

---

## 5. SCHEMAS DE VALIDAÇÃO (ZOD)

Todos os schemas estão em `backend/src/dtos/`. O middleware `validate(schema, source)` aplica automaticamente.

### LoginSchema
```typescript
{ email: z.string().email(), senha: z.string().min(1) }
```

### PaginacaoSchema
```typescript
{ pagina: z.coerce.number().int().min(1).default(1),
  tamanhoPagina: z.coerce.number().int().min(1).max(100).default(10) }.passthrough()
```

### CriarClienteSchema
```typescript
{ nome: z.string().min(1).max(100),
  telefone: z.string().min(1).max(20),
  email: z.string().email().max(150).nullish(),
  endereco: z.string().max(255).nullish(),
  cidade: z.string().max(100).nullish(),
  cep: z.string().max(10).nullish() }
```

### CriarProdutoSchema
```typescript
{ nome: z.string().min(1).max(100),
  categoria: z.string().min(1).max(50),
  descricao: z.string().max(500).nullish(),
  preco: z.number().min(0.01).max(99999.99),
  ativo: z.boolean().default(true) }
```

### CriarPedidoSchema
```typescript
{ clienteId: z.number().int(),
  dataEntrega: z.coerce.date().nullish(),
  observacoes: z.string().max(500).nullish(),
  itens: z.array({ produtoId: z.number().int(),
                    quantidade: z.number().int().min(1).max(9999) }).min(1) }
```

### AtualizarStatusSchema
```typescript
{ status: z.nativeEnum(StatusPedido) }
```

### CriarUsuarioSchema
```typescript
{ nome: z.string().min(1).max(100),
  email: z.string().email().max(150),
  senha: z.string().min(6),
  perfil: z.nativeEnum(PerfilUsuario) }
```

### AtualizarUsuarioSchema
```typescript
{ nome: z.string().min(1).max(100),
  email: z.string().email().max(150),
  perfil: z.nativeEnum(PerfilUsuario),
  ativo: z.boolean().default(true) }
```

### AlterarSenhaSchema
```typescript
{ senhaAtual: z.string().min(1), novaSenha: z.string().min(6) }
```

---

## 6. REGRAS DE NEGÓCIO IMPLEMENTADAS

### 6.1 Pedidos

| Regra | Implementação | Arquivo |
|---|---|---|
| Valor total calculado pelo backend | Busca preços do banco, nunca aceita valor do cliente | pedido.service.ts → `criarAsync()` |
| Snapshot de preço | `preco_unitario_snapshot` salvo no momento da criação | pedido.service.ts → `criarAsync()` |
| Produtos inativos bloqueados | Verifica `ativo === true` antes de aceitar item | pedido.service.ts → `criarAsync()` |
| Data entrega automática | Quando status → Entregue, preenche `data_entrega = now()` | pedido.service.ts → `atualizarStatusAsync()` |
| Criação em 2 passos | Insert pedido → insert itens. Rollback manual do pedido se itens falharem | pedido.service.ts → `criarAsync()` |

### 6.2 Clientes

| Regra | Implementação |
|---|---|
| Exclusão protegida | Verifica se há pedidos vinculados antes de excluir (retorna 409) |
| Busca textual | ilike em nome, telefone e email |

### 6.3 Usuários

| Regra | Implementação |
|---|---|
| Email único | Validação explícita no service + constraint UNIQUE no banco |
| Auto-exclusão bloqueada | Compara id do request com id do JWT. Lança InvalidOperationError |
| Alteração de senha | Exige `senhaAtual` válida (bcrypt.compare) |

### 6.4 Entregas (Lote)

| Regra | Implementação |
|---|---|
| Lote pendente | Filtra pedidos com status Pronto(3), faz JOIN com `itens_pedido` e `clientes` |
| Total de itens | Soma `quantidade` de todos os `itens_pedido` dos pedidos prontos |
| Capacidade do lote | Mínimo 900 itens / Máximo 1000 itens para liberar entrega |
| Liberação | Frontend habilita botão apenas quando `totalItensAcumulados >= 900` |

### 6.5 Dashboard

| Regra | Implementação |
|---|---|
| Receita total | Soma valor_total apenas de pedidos com status Entregue(5) |
| Pedidos pendentes | Conta pedidos com status Pendente(1) + EmProducao(2) + Pronto(3) |
| Pedidos por mês | Agrupamento client-side dos últimos 6 meses |
| Distribuição de status | Contagem client-side de todos os pedidos |

---

## 7. AUTENTICAÇÃO E AUTORIZAÇÃO

### 7.1 Fluxo JWT

1. `POST /api/auth/login` → valida email + senha (bcrypt) → gera JWT
2. JWT payload: `{ id, nome, email, perfil }` (perfil é o label, ex: "Administrador")
3. JWT assinado com HMAC-SHA256 usando `JWT_KEY` do .env
4. Expiração configurável via `JWT_EXPIRES_HOURS` (default: 8h)
5. Issuer: `JWT_ISSUER` (default: `XSalgadosApi`)
6. Audience: `JWT_AUDIENCE` (default: `XSalgadosApp`)

### 7.2 Middleware Pipeline (por requisição)

```
Request → authenticate() → authorize(...perfis) → validate(schema) → controller → service → supabase
    ↓ (erro em qualquer etapa)
errorHandler() → { sucesso: false, mensagem, erros }
```

### 7.3 Matriz de Permissões (RBAC)

| Recurso | Administrador | Atendente | Entregador |
|---|---|---|---|
| Dashboard | ✅ | ❌ | ❌ |
| Pedidos (CRUD) | ✅ | ✅ | ❌ |
| Clientes (CRUD) | ✅ | ✅ | ❌ |
| Produtos (leitura) | ✅ | ✅ | ✅ |
| Produtos (escrita) | ✅ | ❌ | ❌ |
| Usuários (CRUD) | ✅ | ❌ | ❌ |
| Entregas (lote) | ✅ | ❌ | ✅ |

### 7.4 Classes de Erro

| Classe | HTTP Status | Uso |
|---|---|---|
| `InvalidOperationError` | 400 | Violação de regra de negócio |
| `NotFoundError` | 404 | Recurso não encontrado |
| `UnauthorizedError` | 401 | Falha de autenticação |
| `ConflictError` | 409 | Conflito (ex: email duplicado, cliente com pedidos) |
| `Error` genérico | 500 | Erro interno (mensagem ocultada em produção) |

---

## 8. FRONTEND — ARQUITETURA

### 8.1 Roteamento

| Path | Componente | Roles |
|---|---|---|
| `/login` | Login | Público |
| `/` | Dashboard | ADMINISTRADOR, ATENDENTE |
| `/pedidos` | ListagemPedidos | ADMINISTRADOR, ATENDENTE |
| `/clientes` | ListagemClientes | ADMINISTRADOR, ATENDENTE |
| `/produtos` | ListagemProdutos | ADMINISTRADOR, ATENDENTE |
| `/usuarios` | ListagemUsuarios | ADMINISTRADOR |
| `/entregas` | RotasDeEntrega | ENTREGADOR |
| `*` | NaoEncontrado | Público |

### 8.2 Contextos (Estado Global)

**ContextoAutenticacao:**
- State: `usuario`, `token`, `carregando`
- Funções: `login(email, senha)`, `logout()`
- Token persiste em localStorage
- Auto-redirect por role após login (Entregador → `/entregas`, demais → `/`)

**ContextoPedidos:**
- State: `pedidos[]`, `carregando`, `erro`, `atualizandoStatus`, `notificacao`
- Funções: `carregarPedidos(params)`, `alterarStatusPedido(id, status)`, `buscarPorStatus(status)`
- Selectors: `pedidosPendentes`, `pedidosEmProducao`, `pedidosProntos`, `pedidosEmEntrega`, etc.
- useReducer com 7 action types

### 8.3 Mapeamento Backend ↔ Frontend

O frontend usa constantes UPPER_SNAKE_CASE enquanto o backend retorna labels em português.

| Backend Label | Frontend Constant | Valor Numérico |
|---|---|---|
| Pendente | PENDENTE | 1 |
| Em Produção | EM_PREPARO | 2 |
| Pronto | PRONTO | 3 |
| Em Entrega | A_CAMINHO | 4 |
| Entregue | ENTREGUE | 5 |
| Cancelado | CANCELADO | 6 |

**Alias no Kanban:** `EM_PRODUCAO` é igual a `EM_PREPARO` (valor 2).

Funções de mapeamento centralizadas em `utils/mapeamentos.js`:
- `mapStatusDoBackend(label)` / `mapStatusParaBackend(constant)`
- `mapPerfilDoBackend(label)` / `mapPerfilParaBackend(constant)`
- `mapPedidoDoBackend(obj)`, `mapClienteDoBackend(obj)`, `mapProdutoDoBackend(obj)`, `mapUsuarioDoBackend(obj)`

### 8.4 Axios — Interceptors

- **Request:** Injeta `Authorization: Bearer <token>` de localStorage
- **Response 401:** Limpa localStorage, redireciona para `/login`
- **Response erro:** Wraps `{ mensagem, erros[], status }` consistente
- **Timeout:** 15 segundos
- **Base URL:** `http://localhost:3000` (hardcoded)

### 8.5 Páginas — Funcionalidades

| Página | Funcionalidade | API calls |
|---|---|---|
| Login | Form email/senha, redirect por role | `apiLogin()` |
| Dashboard | 4 KPIs + LineChart (6 meses) | `buscarDashboardCompleto()` |
| ListagemPedidos | Vista tabela/Kanban, atualizar status | `buscarPedidos()`, `atualizarStatusPedido()`, `buscarClientes()` |
| PedidosKanban | 3 colunas (Pendente, Em Produção, Pronto), cards com dropdown status | Optimistic updates via context |
| ListagemClientes | CRUD completo, modal form, confirm delete | `buscarClientes()`, `criarCliente()`, `atualizarCliente()`, `deletarCliente()` |
| ListagemProdutos | CRUD completo, modal form, confirm delete | `buscarProdutos()`, `criarProduto()`, `atualizarProduto()`, `deletarProduto()` |
| ListagemUsuarios | Somente leitura (sem CRUD) | `buscarUsuarios()` |
| RotasDeEntregas | Lote de entrega com barra de progresso (900–1000 itens), liberar lote, marcar entregue | `buscarLoteEntrega()`, `alterarStatusPedido()` |

---

## 9. VARIÁVEIS DE AMBIENTE

### Backend (.env)

| Variável | Obrigatória | Descrição | Default |
|---|---|---|---|
| `SUPABASE_URL` | ✅ | URL do projeto Supabase | — |
| `SUPABASE_KEY` | ✅ | Service role key do Supabase | — |
| `JWT_KEY` | ✅ | Chave secreta para assinar JWT (≥32 chars) | — |
| `JWT_ISSUER` | ❌ | Issuer do token JWT | `XSalgadosApi` |
| `JWT_AUDIENCE` | ❌ | Audience do token JWT | `XSalgadosApp` |
| `JWT_EXPIRES_HOURS` | ❌ | Horas de validade do JWT | `8` |
| `PORT` | ❌ | Porta do servidor Express | `3000` |
| `CORS_ORIGINS` | ❌ | Origens CORS separadas por vírgula | `http://localhost:3000,http://localhost:5173` |
| `NODE_ENV` | ❌ | Ambiente (development/production) | `development` |

### Frontend

| Variável | Valor |
|---|---|
| API_BASE_URL | Hardcoded em `servicos/api.js` como `http://localhost:3000` |

---

## 10. SCRIPTS NPM

### Backend

```bash
npm run dev      # tsx watch src/server.ts (hot reload)
npm run build    # tsc (compila para dist/)
npm start        # node dist/server.js (produção)
npm run seed     # tsx src/seed.ts (cria/atualiza admin)
```

### Frontend

```bash
npm run dev      # vite (dev server porta 5173)
npm run build    # vite build (produção)
npm run preview  # vite preview (preview do build)
```

---

## 11. CREDENCIAIS DE DESENVOLVIMENTO

| Email | Senha | Perfil |
|---|---|---|
| admin@xsalgados.com | admin123 | Administrador |

> Criadas pelo script `npm run seed`. Para adicionar mais usuários, use a API ou o painel.

---

## 12. PROBLEMAS CONHECIDOS E MELHORIAS PENDENTES

### 🔴 Críticos

| # | Problema | Arquivo(s) | Impacto |
|---|---|---|---|
| 1 | **Sem transações atômicas na criação de pedidos** | pedido.service.ts | Se insert de itens falhar APÓS insert do pedido, rollback é manual (delete). Se delete falhar, resta pedido sem itens |
| 2 | **Sem validação de transição de status** | pedido.service.ts → `atualizarStatusAsync()` | Qualquer transição é aceita (ex: Entregue → Pendente). Falta máquina de estados |

### 🟡 Importantes

| # | Problema | Arquivo(s) | Impacto |
|---|---|---|---|
| 3 | **Sem rate limiting no login** | routes/index.ts | Vulnerável a brute force |
| 4 | **Arquivo .env.example inexistente** | raiz backend | Devs novos não sabem quais variáveis configurar |
| 5 | **Dashboard faz agregações client-side** | dashboard.service.ts | Carrega TODOS os pedidos em memória para agregar. Não escala |
| 6 | **Categorias carregam todos os produtos** | produto.service.ts → `obterCategoriasAsync()` | SELECT de todos os produtos para extrair categorias com `new Set()` |
| 7 | **Token JWT de 8h sem refresh token** | auth.service.ts | Se token interceptado, atacante tem 8h de acesso. Sem revogação |

### 🟢 Melhorias Desejáveis

| # | Melhoria | Descrição |
|---|---|---|
| 8 | **Sem formulário de criação de pedidos** | Endpoint POST existe no backend mas não há UI |
| 9 | **Sem CRUD de usuários no frontend** | Página é somente leitura (sem criar/editar/excluir) |
| 10 | **Sem paginação visual** | Backend suporta paginação mas frontend não implementa controles |
| 11 | **Campo "estoque" inconsistente** | FormularioProdutos.jsx tem campo `estoque` mas backend não tem |
| 12 | **API_BASE_URL hardcoded** | Deveria usar variável de ambiente do Vite (`import.meta.env`) |
| 13 | **Swagger só em dev** | Swagger UI desabilitado em produção |
| 14 | **Busca de produtos não funciona** | Frontend envia `busca` mas endpoint não implementa filtro textual |

---

## 13. PADRÕES DE CÓDIGO

### Backend

- **Convenção de nomes:** snake_case no banco e models, camelCase nos DTOs de response
- **Services:** Funções puras exportadas (sem classes) — `export async function nomeAsync(...)`
- **Controllers:** try/catch com delegation para services + formatação via `apiOk()`/`apiErro()`
- **Errors:** Classes tipadas (NotFoundError, InvalidOperationError, etc.) → HTTP status no errorHandler
- **Validação:** Zod schemas com `.passthrough()` em PaginacaoSchema para preservar query params
- **Mapper pattern:** Cada service tem `mapToDto()` privado (DB row → response DTO)

### Frontend

- **JavaScript puro** (sem TypeScript — decisão pedagógica para juniores)
- **CSS puro** (sem Tailwind/Styled Components — decisão pedagógica)
- **Componentes funcionais** com hooks (useState, useEffect, useReducer, useContext)
- **Contextos** para estado global (auth + pedidos)
- **Serviços** isolam toda comunicação HTTP
- **Mapeamentos** centralizados em `utils/mapeamentos.js`

---

## 14. COMO O SUPABASE É USADO

O projeto usa Supabase **apenas como banco PostgreSQL via PostgREST API**. Não usa:
- ❌ Supabase Auth (autenticação é JWT customizado)
- ❌ Supabase Storage
- ❌ Supabase Realtime
- ❌ Supabase Edge Functions
- ❌ Row Level Security (RLS desabilitado — usa service_role key)

### Padrões de Query Supabase Usados no Projeto

```typescript
// SELECT com paginação
supabase.from('tabela').select('*', { count: 'exact' })
  .order('campo', { ascending: false })
  .range(offset, offset + limit - 1)

// SELECT com JOIN (nested select PostgREST)
supabase.from('pedidos').select('*, clientes(*), itens_pedido(*, produtos(*))')

// INSERT retornando dados
supabase.from('tabela').insert({ ... }).select().single()

// UPDATE
supabase.from('tabela').update({ ... }).eq('id', id).select().single()

// DELETE
supabase.from('tabela').delete().eq('id', id).select('id').single()

// COUNT sem dados
supabase.from('tabela').select('id', { count: 'exact', head: true }).eq('campo', valor)

// Busca textual (ilike)
supabase.from('tabela').or(`nome.ilike.%termo%,email.ilike.%termo%`)
```

---

## 15. CICLO DE VIDA DO PEDIDO

```
Pendente (1) ──→ Em Produção (2) ──→ Pronto (3) ──→ Em Entrega (4) ──→ Entregue (5)
    │                  │                  │                  │
    └──────────────────┴──────────────────┴──────────────────┘
                            │
                            ▼
                      Cancelado (6) ← (qualquer status exceto Entregue*)
```

> ⚠️ **A validação de transição de estados NÃO está implementada.** Atualmente, qualquer transição é aceita. Isso está na lista de melhorias pendentes (#2).

**Transições ideais (a implementar):**

| Estado Atual | Transições Permitidas |
|---|---|
| Pendente | → Em Produção, → Cancelado |
| Em Produção | → Pronto, → Cancelado |
| Pronto | → Em Entrega, → Cancelado |
| Em Entrega | → Entregue, → Cancelado |
| Entregue | (estado final) |
| Cancelado | (estado final) |

---

## 16. RESPONSE DTOs — FORMATO EXATO

### ClienteDto
```json
{ "id": 1, "nome": "João", "telefone": "11999999999", "email": "joao@email.com",
  "endereco": "Rua X, 123", "cidade": "São Paulo", "cep": "01234-567",
  "dataCriacao": "2026-01-15T10:30:00Z", "totalPedidos": 5 }
```

### ProdutoDto
```json
{ "id": 1, "nome": "X-Salada", "categoria": "Lanches", "descricao": "Pão, hambúrguer, alface",
  "preco": 15.50, "ativo": true, "dataCriacao": "2026-01-10T08:00:00Z" }
```

### PedidoDto (detalhado)
```json
{ "id": 1, "clienteId": 1, "clienteNome": "João", "clienteTelefone": "11999999999",
  "clienteEndereco": "Rua X, 123", "dataCriacao": "2026-02-20T14:00:00Z",
  "dataEntrega": "2026-02-21T12:00:00Z", "valorTotal": 46.50,
  "status": "Pendente", "statusEnum": 1, "observacoes": "Sem cebola",
  "itens": [
    { "id": 1, "produtoId": 1, "produtoNome": "X-Salada", "quantidade": 3,
      "precoUnitario": 15.50, "subtotal": 46.50 }
  ] }
```

### PedidoResumoDto (listagem)
```json
{ "id": 1, "clienteNome": "João", "dataCriacao": "2026-02-20T14:00:00Z",
  "dataEntrega": null, "valorTotal": 46.50, "status": "Pendente",
  "statusEnum": 1, "quantidadeItens": 3 }
```

### UsuarioDto
```json
{ "id": 1, "nome": "Admin", "email": "admin@xsalgados.com",
  "perfil": "Administrador", "dataCriacao": "2026-01-01T00:00:00Z", "ativo": true }
```

### ResultadoPaginadoDto
```json
{ "dados": [], "pagina": 1, "tamanhoPagina": 10, "total": 25,
  "totalPaginas": 3, "temProxima": true, "temAnterior": false }
```

### DashboardKpisDto
```json
{ "receitaTotal": 15230.50, "totalPedidos": 142, "totalClientes": 38,
  "pedidosPendentes": 12, "pedidosHoje": 5, "receitaHoje": 450.00 }
```

---

## 17. SEGURANÇA — ESTADO ATUAL

### ✅ Implementado

| Medida | Implementação |
|---|---|
| Hashing de senhas | bcrypt com 12 rounds (salt automático) |
| JWT sem fallback | Lança erro fatal se `JWT_KEY` não configurada |
| RBAC por endpoint | Middleware `authorize()` verifica perfil do JWT |
| CORS configurável | Origens via `CORS_ORIGINS` no .env |
| Validação de input | Zod com mensagens em português |
| Preço calculado server-side | Nunca aceita valor vindo do cliente |
| Snapshot de preço | Imutabilidade do preço histórico |
| Proteção contra auto-exclusão | Usuário não pode deletar a si mesmo |
| Proteção referencial | 409 ao tentar excluir cliente com pedidos |
| Validação de email único | Check explícito no service antes do insert |
| Ocultação de erros em produção | errorHandler oculta detalhes de 500 quando `NODE_ENV=production` |

### ⚠️ Pendências de Segurança

| Prioridade | Item |
|---|---|
| P0 | Rate limiting no login (brute force) |
| P1 | Refresh tokens + reduzir tempo de expiração JWT |
| P1 | Validação de transição de status (máquina de estados) |
| P2 | Audit log para operações sensíveis |
| P2 | Security headers (Helmet.js) |
| P3 | Health checks para monitoria |
