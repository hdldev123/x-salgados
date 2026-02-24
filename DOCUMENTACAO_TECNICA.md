# Documentação Técnica — X Salgados API Backend

> **Classificação:** Documento Técnico de Nível Empresarial  
> **Versão:** 1.0  
> **Data:** 24/02/2026  
> **Autor:** Engenharia de Software / AppSec  
> **Stack:** .NET 8 · Entity Framework Core · PostgreSQL (Supabase) · JWT · Swagger/OpenAPI

---

## Sumário

1. [Visão Geral](#1-visão-geral)
2. [Arquitetura e Fluxo](#2-arquitetura-e-fluxo)
3. [Dicionário de Dados/API](#3-dicionário-de-dadosapi)
4. [Análise de Segurança (Crítico)](#4-análise-de-segurança-crítico)
5. [Guia de Implementação](#5-guia-de-implementação)
6. [Casos de Teste](#6-casos-de-teste)

---

## 1. Visão Geral

### 1.1. Objetivo do Sistema

O **X Salgados** é um sistema de gestão de pedidos para uma lanchonete, projetado para substituir processos manuais por um fluxo digital centralizado. A aplicação cobre todo o ciclo de vida operacional: cadastro de clientes e produtos, criação e acompanhamento de pedidos, controle de entregas e dashboard gerencial com KPIs.

### 1.2. Problema que o Código Resolve

| Problema                                    | Solução Implementada                                                         |
| ------------------------------------------- | ---------------------------------------------------------------------------- |
| Controle manual de pedidos (papel/planilha)  | CRUD completo de pedidos com cálculo automático de valores                   |
| Falta de visibilidade sobre o negócio        | Dashboard com KPIs, gráficos de receita e distribuição de status             |
| Rotas de entrega desorganizadas              | Endpoint inteligente que filtra pedidos prontos com entrega para o dia       |
| Acesso indiscriminado a funcionalidades      | Sistema RBAC (Role-Based Access Control) com 3 perfis                       |
| Inconsistência de preços em pedidos antigos  | Snapshot de preço unitário no momento da venda (`preco_unitario_snapshot`)    |

### 1.3. Perfis de Usuário

| Perfil           | Código Enum | Permissões Resumidas                                                 |
| ---------------- | ----------- | -------------------------------------------------------------------- |
| **Administrador** | `1`         | Acesso total: Dashboard, Pedidos, Clientes, Produtos, Usuários, Entregas |
| **Atendente**     | `2`         | Pedidos e Clientes (CRUD), Produtos (somente leitura)                |
| **Entregador**    | `3`         | Somente Rotas de Entrega                                            |

### 1.4. Ciclo de Vida do Pedido

```
Pendente (1) → Em Produção (2) → Pronto (3) → Em Entrega (4) → Entregue (5)
                                                                      ↑
                                              Cancelado (6) ← (qualquer status)
```

---

## 2. Arquitetura e Fluxo

### 2.1. Padrão Arquitetural

A aplicação segue uma **arquitetura em camadas (Layered Architecture)** sobre o padrão ASP.NET Core MVC:

```
┌─────────────────────────────────────────────────────────┐
│                     CLIENTE (Frontend)                  │
│              React · Vite · localhost:5173               │
└─────────────────────┬───────────────────────────────────┘
                      │ HTTP/HTTPS + JWT Bearer
┌─────────────────────▼───────────────────────────────────┐
│                MIDDLEWARE PIPELINE                       │
│  ExceptionHandlingMiddleware → CORS → Auth → Routing    │
├─────────────────────────────────────────────────────────┤
│                  CONTROLLERS (API Layer)                 │
│  AuthController · ClientesController · PedidosController│
│  ProdutosController · UsuariosController                │
│  DashboardController · EntregasController               │
├─────────────────────────────────────────────────────────┤
│                  SERVICES (Business Logic)               │
│  AuthService · ClienteService · PedidoService           │
│  ProdutoService · UsuarioService · DashboardService     │
│  ↕ Interfaces (IoC/DI via Scoped)                       │
├─────────────────────────────────────────────────────────┤
│                  DATA ACCESS (EF Core)                   │
│  AppDbContext · DbInitializer                           │
│  Npgsql Provider → PostgreSQL (Supabase)                │
└─────────────────────────────────────────────────────────┘
```

### 2.2. Fluxo de uma Requisição Autenticada (Step-by-step)

1. **Cliente envia requisição** `POST /api/pedidos` com header `Authorization: Bearer <token>`.
2. **ExceptionHandlingMiddleware** envelopa todo o pipeline em um `try/catch` global.
3. **CORS Middleware** valida a origem contra a policy `AllowFrontend`.
4. **JWT Bearer Middleware** decodifica o token, valida assinatura (HMAC-SHA256), issuer, audience e lifetime.
5. **Authorization Middleware** verifica se a claim `Role` do token corresponde às roles exigidas pelo `[Authorize(Roles = "...")]` no controller.
6. **Model Binding** desserializa o corpo JSON em `CriarPedidoDto` e executa validação via Data Annotations (`[Required]`, `[Range]`, etc.).
7. **Controller** (`PedidosController.Criar`) invoca `IPedidoService.CriarAsync(dto)`.
8. **Service** (`PedidoService`):
   - Valida existência do cliente no banco.
   - Busca produtos por IDs e valida se existem e estão ativos.
   - **Calcula o valor total usando preços do banco** (nunca confia no valor do cliente).
   - Persiste `Pedido` + `ItemPedido` com snapshot de preço.
9. **EF Core** gera SQL parametrizado e executa contra o PostgreSQL via Npgsql.
10. **Response** retorna `201 Created` com o pedido completo mapeado via DTO.
11. Se **qualquer exceção** ocorrer, o `ExceptionHandlingMiddleware` captura, loga e retorna um `ApiResponse<object>` padronizado.

### 2.3. Injeção de Dependência

Todos os serviços são registrados como **Scoped** (um por requisição HTTP):

```csharp
builder.Services.AddScoped<IAuthService, AuthService>();
builder.Services.AddScoped<IUsuarioService, UsuarioService>();
builder.Services.AddScoped<IClienteService, ClienteService>();
builder.Services.AddScoped<IProdutoService, ProdutoService>();
builder.Services.AddScoped<IPedidoService, PedidoService>();
builder.Services.AddScoped<IDashboardService, DashboardService>();
```

### 2.4. Modelo Relacional (Entidades)

```
┌──────────────┐       ┌──────────────┐       ┌──────────────┐
│   usuarios   │       │   clientes   │       │   produtos   │
├──────────────┤       ├──────────────┤       ├──────────────┤
│ id (PK)      │       │ id (PK)      │       │ id (PK)      │
│ nome         │       │ nome         │       │ nome         │
│ email (UQ)   │       │ telefone     │       │ categoria    │
│ senha_hash   │       │ email        │       │ descricao    │
│ perfil       │       │ endereco     │       │ preco        │
│ data_criacao │       │ cidade       │       │ ativo        │
│ ativo        │       │ cep          │       │ data_criacao │
└──────────────┘       │ data_criacao │       └──────┬───────┘
                       └──────┬───────┘              │
                              │ 1:N                  │ 1:N
                       ┌──────▼───────┐       ┌──────▼───────┐
                       │   pedidos    │       │ itens_pedido │
                       ├──────────────┤       ├──────────────┤
                       │ id (PK)      │  1:N  │ id (PK)      │
                       │ cliente_id(FK)├──────►│ pedido_id(FK)│
                       │ data_criacao │       │ produto_id(FK)│
                       │ data_entrega │       │ quantidade   │
                       │ valor_total  │       │ preco_unit.. │
                       │ status       │       └──────────────┘
                       │ observacoes  │
                       └──────────────┘
```

**Restrições de Integridade:**
- `clientes → pedidos`: `ON DELETE RESTRICT` (não pode excluir cliente com pedidos)
- `pedidos → itens_pedido`: `ON DELETE CASCADE` (excluir pedido remove seus itens)
- `produtos → itens_pedido`: `ON DELETE RESTRICT` (não pode excluir produto vinculado)
- `usuarios.email`: Índice `UNIQUE`

---

## 3. Dicionário de Dados/API

### 3.1. Endpoints da API

#### 3.1.1. Autenticação (`AuthController`)

| Método | Rota               | Acesso      | Descrição               | Request Body    | Response          |
| ------ | ------------------ | ----------- | ----------------------- | --------------- | ----------------- |
| POST   | `/api/auth/login`  | `Público`   | Autenticação via JWT    | `LoginDto`      | `LoginResponseDto` |

**`LoginDto`**
| Campo   | Tipo     | Obrigatório | Validação           |
| ------- | -------- | ----------- | ------------------- |
| `email` | `string` | Sim         | `[EmailAddress]`    |
| `senha` | `string` | Sim         | `[Required]`        |

**`LoginResponseDto`**
| Campo      | Tipo               | Descrição                         |
| ---------- | ------------------ | --------------------------------- |
| `token`    | `string`           | JWT assinado (HMAC-SHA256)        |
| `expiracao`| `DateTime`         | Data/hora de expiração (UTC+8h)   |
| `usuario`  | `UsuarioLogadoDto` | Dados do usuário autenticado      |

---

#### 3.1.2. Usuários (`UsuariosController`)

| Método | Rota                         | Acesso | Descrição        | Body                | Response       |
| ------ | ---------------------------- | ------ | ---------------- | ------------------- | -------------- |
| GET    | `/api/usuarios`              | Admin  | Listar (paginado)| Query: `PaginacaoDto` | `ResultadoPaginadoDto<UsuarioDto>` |
| GET    | `/api/usuarios/{id}`         | Admin  | Buscar por ID    | —                   | `UsuarioDto`   |
| POST   | `/api/usuarios`              | Admin  | Criar            | `CriarUsuarioDto`   | `UsuarioDto`   |
| PUT    | `/api/usuarios/{id}`         | Admin  | Atualizar        | `AtualizarUsuarioDto`| `UsuarioDto`  |
| DELETE | `/api/usuarios/{id}`         | Admin  | Excluir          | —                   | `204 NoContent`|
| PATCH  | `/api/usuarios/{id}/senha`   | Admin  | Alterar senha    | `AlterarSenhaDto`   | `{ sucesso, mensagem }` |

**`CriarUsuarioDto`**
| Campo   | Tipo            | Obrigatório | Validação                    |
| ------- | --------------- | ----------- | ---------------------------- |
| `nome`  | `string`        | Sim         | MaxLength(100)               |
| `email` | `string`        | Sim         | EmailAddress, MaxLength(150) |
| `senha` | `string`        | Sim         | MinLength(6)                 |
| `perfil`| `PerfilUsuario` | Sim         | Enum (1, 2, 3)              |

**`AlterarSenhaDto`**
| Campo        | Tipo     | Obrigatório | Validação      |
| ------------ | -------- | ----------- | -------------- |
| `senhaAtual` | `string` | Sim         | `[Required]`   |
| `novaSenha`  | `string` | Sim         | MinLength(6)   |

**Regras de Negócio:**
- Usuário não pode excluir a si mesmo (verificação via `ClaimTypes.NameIdentifier`).
- Alteração de senha exige validação da senha atual.

---

#### 3.1.3. Clientes (`ClientesController`)

| Método | Rota                    | Acesso           | Descrição           | Body                  | Response      |
| ------ | ----------------------- | ---------------- | ------------------- | --------------------- | ------------- |
| GET    | `/api/clientes`         | Admin, Atendente | Listar (paginado)   | Query: `PaginacaoDto`, `busca` | `ResultadoPaginadoDto<ClienteDto>` |
| GET    | `/api/clientes/{id}`    | Admin, Atendente | Buscar por ID       | —                     | `ClienteDto`  |
| POST   | `/api/clientes`         | Admin, Atendente | Criar               | `CriarClienteDto`    | `ClienteDto`  |
| PUT    | `/api/clientes/{id}`    | Admin, Atendente | Atualizar           | `AtualizarClienteDto`| `ClienteDto`  |
| DELETE | `/api/clientes/{id}`    | Admin, Atendente | Excluir             | —                     | `204 NoContent` |

**`CriarClienteDto` / `AtualizarClienteDto`**
| Campo      | Tipo     | Obrigatório | Validação         |
| ---------- | -------- | ----------- | ----------------- |
| `nome`     | `string` | Sim         | MaxLength(100)    |
| `telefone` | `string` | Sim         | MaxLength(20)     |
| `email`    | `string?`| Não         | EmailAddress, MaxLength(150) |
| `endereco` | `string?`| Não         | MaxLength(255)    |
| `cidade`   | `string?`| Não         | MaxLength(100)    |
| `cep`      | `string?`| Não         | MaxLength(10)     |

**Regras de Negócio:**
- Exclusão retorna `409 Conflict` se o cliente possuir pedidos vinculados.
- Busca faz filtro case-insensitive por nome, telefone ou email.

---

#### 3.1.4. Produtos (`ProdutosController`)

| Método | Rota                        | Acesso       | Descrição              | Body               | Response      |
| ------ | --------------------------- | ------------ | ---------------------- | ------------------- | ------------- |
| GET    | `/api/produtos`             | Autenticado  | Listar (paginado)      | Query: `PaginacaoDto`, `categoria`, `apenasAtivos` | `ResultadoPaginadoDto<ProdutoDto>` |
| GET    | `/api/produtos/{id}`        | Autenticado  | Buscar por ID          | —                   | `ProdutoDto`  |
| GET    | `/api/produtos/categorias`  | Autenticado  | Listar categorias      | —                   | `List<string>`|
| POST   | `/api/produtos`             | Admin        | Criar                  | `CriarProdutoDto`   | `ProdutoDto`  |
| PUT    | `/api/produtos/{id}`        | Admin        | Atualizar              | `AtualizarProdutoDto`| `ProdutoDto` |
| DELETE | `/api/produtos/{id}`        | Admin        | Excluir                | —                   | `204 NoContent`|

**`CriarProdutoDto` / `AtualizarProdutoDto`**
| Campo       | Tipo      | Obrigatório | Validação                           |
| ----------- | --------- | ----------- | ----------------------------------- |
| `nome`      | `string`  | Sim         | MaxLength(100)                      |
| `categoria` | `string`  | Sim         | MaxLength(50)                       |
| `descricao` | `string?` | Não         | MaxLength(500)                      |
| `preco`     | `decimal`  | Sim         | Range(0.01, 99999.99)               |
| `ativo`     | `bool`     | Não         | Default: `true`                     |

---

#### 3.1.5. Pedidos (`PedidosController`)

| Método | Rota                          | Acesso           | Descrição              | Body                | Response      |
| ------ | ----------------------------- | ---------------- | ---------------------- | ------------------- | ------------- |
| GET    | `/api/pedidos`                | Admin, Atendente | Listar (paginado)      | Query: `PaginacaoDto`, `status`, `dataInicio`, `dataFim` | `ResultadoPaginadoDto<PedidoResumoDto>` |
| GET    | `/api/pedidos/{id}`           | Admin, Atendente | Buscar por ID          | —                   | `PedidoDto`   |
| POST   | `/api/pedidos`                | Admin, Atendente | Criar                  | `CriarPedidoDto`    | `PedidoDto`   |
| PATCH  | `/api/pedidos/{id}/status`    | Admin, Atendente | Atualizar status       | `AtualizarStatusDto`| `PedidoDto`   |

**`CriarPedidoDto`**
| Campo        | Tipo               | Obrigatório | Validação                  |
| ------------ | ------------------ | ----------- | -------------------------- |
| `clienteId`  | `int`              | Sim         | `[Required]`               |
| `dataEntrega`| `DateTime?`        | Não         | —                          |
| `observacoes`| `string?`          | Não         | MaxLength(500)             |
| `itens`      | `List<ItemPedidoDto>` | Sim      | MinLength(1)               |

**`ItemPedidoDto`**
| Campo       | Tipo  | Obrigatório | Validação               |
| ----------- | ----- | ----------- | ----------------------- |
| `produtoId` | `int` | Sim         | `[Required]`            |
| `quantidade`| `int` | Sim         | Range(1, 9999)          |

**Regras de Negócio Críticas:**
- O valor total do pedido é **calculado exclusivamente pelo backend** usando preços do banco de dados.
- O preço unitário é salvo como **snapshot** (`preco_unitario_snapshot`) para preservar o valor histórico.
- Produtos inativos **não podem** ser adicionados a pedidos.
- Quando o status muda para `Entregue`, a `data_entrega` é preenchida automaticamente com `DateTime.UtcNow`.

---

#### 3.1.6. Entregas (`EntregasController`)

| Método | Rota                 | Acesso              | Descrição              | Response            |
| ------ | -------------------- | ------------------- | ---------------------- | ------------------- |
| GET    | `/api/entregas/rotas`| Admin, Entregador   | Rotas de entrega do dia| `List<PedidoDto>`   |

**Lógica de Filtro:**
- Retorna somente pedidos com `Status = Pronto` ou `Status = EmEntrega`.
- A `DataEntrega` deve estar dentro do dia atual (UTC).
- Ordenado por `DataEntrega` ascendente.

---

#### 3.1.7. Dashboard (`DashboardController`)

| Método | Rota                                | Acesso | Response                  |
| ------ | ----------------------------------- | ------ | ------------------------- |
| GET    | `/api/dashboard/kpis`               | Admin  | `DashboardKpisDto`        |
| GET    | `/api/dashboard/pedidos-por-mes`    | Admin  | `List<PedidosPorMesDto>`  |
| GET    | `/api/dashboard/distribuicao-status`| Admin  | `List<DistribuicaoStatusDto>` |
| GET    | `/api/dashboard/completo`           | Admin  | `DashboardCompletoDto`    |

**`DashboardKpisDto`**
| Campo              | Tipo      | Descrição                                    |
| ------------------ | --------- | -------------------------------------------- |
| `receitaTotal`     | `decimal` | Soma dos pedidos com status `Entregue`       |
| `totalPedidos`     | `int`     | Total geral de pedidos                       |
| `totalClientes`    | `int`     | Total de clientes cadastrados                |
| `pedidosPendentes` | `int`     | Pendente + EmProducao + Pronto               |
| `pedidosHoje`      | `int`     | Pedidos criados no dia atual                 |
| `receitaHoje`      | `decimal` | Receita de pedidos entregues hoje            |

---

### 3.2. DTOs Comuns

#### `PaginacaoDto`
| Campo          | Tipo  | Default | Limites         |
| -------------- | ----- | ------- | --------------- |
| `pagina`       | `int` | `1`     | Mín: 1          |
| `tamanhoPagina`| `int` | `10`    | Mín: 1, Máx: 100 |

#### `ResultadoPaginadoDto<T>`
| Campo          | Tipo     | Descrição                            |
| -------------- | -------- | ------------------------------------ |
| `dados`        | `List<T>`| Itens da página atual                |
| `paginaAtual`  | `int`    | Página corrente                      |
| `tamanhoPagina`| `int`    | Tamanho da página                    |
| `totalItens`   | `int`    | Total de registros                   |
| `totalPaginas` | `int`    | Total de páginas                     |
| `temProxima`   | `bool`   | Se existe próxima página             |
| `temAnterior`  | `bool`   | Se existe página anterior            |

---

## 4. Análise de Segurança (Crítico)

### 4.1. Vulnerabilidades Identificadas

#### **CRÍTICO — Hashing de Senha com SHA256 (SEM SALT)**

**Arquivo:** `Backend/Services/AuthService.cs` (linhas 51-55)

```csharp
public string HashSenha(string senha)
{
    using var sha256 = SHA256.Create();
    var bytes = sha256.ComputeHash(Encoding.UTF8.GetBytes(senha));
    return Convert.ToBase64String(bytes);
}
```

**Risco:** SHA256 é um hash criptográfico de propósito geral, **não é uma função de hashing de senhas**. Problemas:
1. **Sem salt** — senhas iguais produzem o mesmo hash, vulnerável a ataques de rainbow table.
2. **Extremamente rápido** — GPUs modernas computam bilhões de SHA256/s, facilitando força bruta.
3. **Sem fator de trabalho ajustável** — não há mecanismo para aumentar o custo computacional.

**Impacto:** Se o banco de dados for comprometido, **todas as senhas podem ser recuperadas em minutos** usando tabelas pré-computadas ou ataques de dicionário.

**Correção Obrigatória:**
```csharp
using BCrypt.Net;

public string HashSenha(string senha)
{
    return BCrypt.Net.BCrypt.HashPassword(senha, workFactor: 12);
}

public bool VerificarSenha(string senha, string hash)
{
    return BCrypt.Net.BCrypt.Verify(senha, hash);
}
```

**Alternativa:** Usar `Argon2id` (via `Konscious.Security.Cryptography`) ou `PBKDF2` (nativo no .NET via `Rfc2898DeriveBytes`).

**Pacote NuGet:** `BCrypt.Net-Next`

---

#### **ALTO — Chave JWT Hardcoded como Fallback**

**Arquivo:** `Backend/Program.cs` (linha 22) e `Backend/Services/AuthService.cs` (linha 63)

```csharp
var jwtKey = builder.Configuration["Jwt:Key"] ?? "ChaveSecretaPadraoParaDesenvolvimento123456789";
```

**Risco:** Se `Jwt:Key` não for configurada no `appsettings.json` ou variável de ambiente, a aplicação usa uma chave hardcoded **previsível**. Um atacante que conheça o código-fonte pode forjar tokens JWT válidos.

**Correção:**
```csharp
var jwtKey = builder.Configuration["Jwt:Key"] 
    ?? throw new InvalidOperationException(
        "FATAL: A chave JWT não foi configurada. Defina 'Jwt:Key' no appsettings ou variável de ambiente.");
```

---

#### **ALTO — Token JWT com Vida Longa (8 horas)**

**Arquivo:** `Backend/Services/AuthService.cs` (linha 79)

```csharp
expires: DateTime.UtcNow.AddHours(8),
```

**Risco:** Se um token for interceptado (ex: via XSS no frontend), o atacante tem 8 horas de acesso. Não há mecanismo de **refresh token** nem de **revogação de tokens**.

**Correções Recomendadas:**
1. Reduzir o tempo de expiração para **15-30 minutos**.
2. Implementar **Refresh Tokens** armazenados no banco com rotação automática.
3. Implementar uma **blacklist de tokens** para revogação imediata (ex: logout, troca de senha).

---

#### **ALTO — Ausência de Rate Limiting no Endpoint de Login**

**Arquivo:** `Backend/Controllers/AuthController.cs`

**Risco:** O endpoint `POST /api/auth/login` não possui limitação de taxa de requisições. Isto permite:
- **Ataques de força bruta** contra senhas.
- **Enumeração de usuários** (timing attacks na resposta).

**Correção:**
```csharp
// Em Program.cs
builder.Services.AddRateLimiter(options =>
{
    options.AddFixedWindowLimiter("login", opt =>
    {
        opt.PermitLimit = 5;
        opt.Window = TimeSpan.FromMinutes(1);
        opt.QueueLimit = 0;
    });
});

// No controller
[HttpPost("login")]
[EnableRateLimiting("login")]
[AllowAnonymous]
public async Task<ActionResult<LoginResponseDto>> Login([FromBody] LoginDto dto)
```

---

#### **MÉDIO — RequireHttpsMetadata Desabilitado**

**Arquivo:** `Backend/Program.cs` (linha 31)

```csharp
options.RequireHttpsMetadata = false;
```

**Risco:** A validação de metadados HTTPS do provedor JWT está desativada. Em produção, isso pode permitir ataques MITM na cadeia de configuração JWT.

**Correção:**
```csharp
options.RequireHttpsMetadata = !builder.Environment.IsDevelopment();
```

---

#### **MÉDIO — Dados Sensíveis no appsettings.json**

**Arquivo:** `Backend/appsettings.json`

O arquivo `appsettings.json` contém placeholders que podem ser acidentalmente preenchidos com dados reais e commitados:
```json
"DefaultConnection": "Host=SEU_HOST.pooler.supabase.com;..."
"Key": "SUA_CHAVE_JWT_COM_NO_MINIMO_32_CARACTERES_AQUI"
```

**Correção:** Em produção, **todas** as configurações sensíveis devem ser injetadas via:
- Variáveis de ambiente
- Azure Key Vault / AWS Secrets Manager
- User Secrets (desenvolvimento)

---

#### **MÉDIO — Ausência de Validação de Transição de Status de Pedido**

**Arquivo:** `Backend/Services/PedidoService.cs` — método `AtualizarStatusAsync`

```csharp
public async Task<PedidoDto?> AtualizarStatusAsync(int id, AtualizarStatusDto dto)
{
    var pedido = await _context.Pedidos.FindAsync(id);
    if (pedido == null) return null;
    pedido.Status = dto.Status; // Aceita QUALQUER transição
    ...
}
```

**Risco:** Não há validação de máquina de estados. Um pedido `Entregue` pode voltar para `Pendente`, ou um pedido `Cancelado` pode ser reaberto. Isso viola a integridade do fluxo de negócio.

**Correção:**
```csharp
private static readonly Dictionary<StatusPedido, StatusPedido[]> TransicoesPermitidas = new()
{
    { StatusPedido.Pendente, new[] { StatusPedido.EmProducao, StatusPedido.Cancelado } },
    { StatusPedido.EmProducao, new[] { StatusPedido.Pronto, StatusPedido.Cancelado } },
    { StatusPedido.Pronto, new[] { StatusPedido.EmEntrega, StatusPedido.Cancelado } },
    { StatusPedido.EmEntrega, new[] { StatusPedido.Entregue, StatusPedido.Cancelado } },
    { StatusPedido.Entregue, Array.Empty<StatusPedido>() },
    { StatusPedido.Cancelado, Array.Empty<StatusPedido>() }
};

// Dentro de AtualizarStatusAsync:
if (!TransicoesPermitidas[pedido.Status].Contains(dto.Status))
    throw new InvalidOperationException(
        $"Transição de '{pedido.Status}' para '{dto.Status}' não é permitida.");
```

---

#### **MÉDIO — Exposição de Detalhes de Exceção em Produção**

**Arquivo:** `Backend/Middleware/ExceptionHandlingMiddleware.cs` (linhas 34-49)

```csharp
var response = new ApiResponse<object>
{
    Sucesso = false,
    Mensagem = exception.Message, // Expõe mensagem interna
    Erros = new List<string> { exception.Message }
};
```

**Risco:** Mensagens de exceção internas (ex: stack traces, nomes de tabelas SQL, detalhes de conexão) são expostas ao cliente, facilitando reconhecimento da infraestrutura.

**Correção:**
```csharp
var mensagemPublica = exception switch
{
    InvalidOperationException => exception.Message,
    KeyNotFoundException => exception.Message,
    UnauthorizedAccessException => "Acesso não autorizado.",
    _ => "Ocorreu um erro interno. Tente novamente mais tarde."
};
```

---

#### **BAIXO — Ausência de Validação de Email Único ao Criar Usuário**

**Arquivo:** `Backend/Services/UsuarioService.cs` — método `CriarAsync`

Ao criar um usuário com email duplicado, o erro será uma exceção do banco de dados (violação de constraint `UNIQUE`), que será tratada genericamente pelo middleware. Não há validação prévia no service.

**Correção:**
```csharp
var emailExiste = await _context.Usuarios.AnyAsync(u => u.Email == dto.Email);
if (emailExiste)
    throw new InvalidOperationException("Já existe um usuário cadastrado com este email.");
```

---

#### **BAIXO — Trust Server Certificate = true**

**Arquivo:** `Backend/appsettings.json`

```
Trust Server Certificate=true
```

**Risco:** Desabilita a validação do certificado SSL do servidor PostgreSQL, tornando a conexão vulnerável a ataques MITM.

**Correção:** Em produção, remover `Trust Server Certificate=true` e configurar o certificado CA raiz do Supabase.

---

### 4.2. Resumo de Risco

| # | Vulnerabilidade                              | Severidade | OWASP Top 10       | Status          |
|---|----------------------------------------------|------------|---------------------|-----------------|
| 1 | SHA256 sem salt para senhas                  | **CRÍTICO**| A02:2021 - Crypto   | ⛔ Não mitigado |
| 2 | Chave JWT hardcoded como fallback            | **ALTO**   | A02:2021 - Crypto   | ⛔ Não mitigado |
| 3 | Token JWT sem refresh (8h de vida)           | **ALTO**   | A07:2021 - Auth     | ⛔ Não mitigado |
| 4 | Ausência de rate limiting no login           | **ALTO**   | A07:2021 - Auth     | ⛔ Não mitigado |
| 5 | RequireHttpsMetadata = false                 | **MÉDIO**  | A05:2021 - Misconfig| ⚠️ Parcial     |
| 6 | Dados sensíveis em appsettings.json          | **MÉDIO**  | A05:2021 - Misconfig| ⚠️ Parcial     |
| 7 | Sem validação de transição de status         | **MÉDIO**  | A04:2021 - Design   | ⛔ Não mitigado |
| 8 | Exposição de exceções em produção            | **MÉDIO**  | A05:2021 - Misconfig| ⛔ Não mitigado |
| 9 | Sem validação de email único no service      | **BAIXO**  | A04:2021 - Design   | ⚠️ Mitigado DB |
| 10| Trust Server Certificate = true              | **BAIXO**  | A05:2021 - Misconfig| ⛔ Não mitigado |

### 4.3. Medidas de Segurança Já Implementadas

| Medida                                    | Implementação                                         |
|-------------------------------------------|-------------------------------------------------------|
| Autenticação JWT                          | HMAC-SHA256, validação de issuer/audience/lifetime     |
| Autorização RBAC                          | `[Authorize(Roles = "...")]` por endpoint              |
| CORS restritivo                           | Origens configuráveis via `appsettings.json`           |
| Validação de entrada (Data Annotations)   | `[Required]`, `[EmailAddress]`, `[Range]`, `[MaxLength]` |
| Tratamento global de exceções             | `ExceptionHandlingMiddleware` padronizado              |
| Preço calculado pelo backend              | Valor total nunca vem do cliente; usa dados do banco   |
| Snapshot de preço unitário                | Imutabilidade do preço histórico em `itens_pedido`     |
| Indexes de banco otimizados               | Índices em FK e campos frequentemente consultados      |
| Proteção contra auto-exclusão             | Usuário não pode deletar a si mesmo                    |
| Proteção referencial de clientes          | Retorna 409 Conflict em vez de erro de DB              |
| ClockSkew = TimeSpan.Zero                 | Sem tolerância de tempo no JWT (evita replay attacks)  |
| `AllowedHosts = "*"` apenas em dev        | Filtragem de hosts configurável                        |

---

## 5. Guia de Implementação

### 5.1. Pré-requisitos

| Ferramenta        | Versão Mínima | Finalidade                          |
|-------------------|--------------|--------------------------------------|
| .NET SDK          | 8.0          | Runtime e build                      |
| PostgreSQL        | 14+          | Banco de dados (ou Supabase)         |
| Node.js           | 18+          | Frontend (se aplicável)              |
| Git               | 2.x          | Controle de versão                   |

### 5.2. Variáveis de Ambiente / Configuração

Crie `appsettings.Development.json` (arquivo **não** versionado no Git):

```json
{
  "ConnectionStrings": {
    "DefaultConnection": "Host=<HOST>.pooler.supabase.com;Port=6543;Database=postgres;Username=postgres.<PROJECT_ID>;Password=<SENHA>;SSL Mode=Require;Trust Server Certificate=true"
  },
  "Jwt": {
    "Key": "<CHAVE_COM_MINIMO_32_CARACTERES>",
    "Issuer": "XSalgadosApi",
    "Audience": "XSalgadosApp"
  },
  "Cors": {
    "Origins": "http://localhost:3000,http://localhost:5173"
  }
}
```

| Variável                             | Descrição                                     | Obrigatória |
|--------------------------------------|-----------------------------------------------|-------------|
| `ConnectionStrings:DefaultConnection`| String de conexão PostgreSQL/Supabase          | Sim         |
| `Jwt:Key`                            | Chave simétrica para assinatura JWT (≥32 chars)| Sim        |
| `Jwt:Issuer`                         | Emissor do token JWT                           | Não (default: `XSalgadosApi`) |
| `Jwt:Audience`                       | Audiência do token JWT                         | Não (default: `XSalgadosApp`) |
| `Cors:Origins`                       | Origens permitidas (separadas por vírgula)     | Não (default: `localhost:3000,5173`) |

### 5.3. Passos para Execução

```bash
# 1. Clonar o repositório
git clone <url-do-repositorio>
cd x-salgados

# 2. Configurar o banco de dados
# Acesse o SQL Editor do Supabase e execute:
# Backend/Scripts/create_tables.sql

# 3. Configurar variáveis locais
cd Backend
# Crie o arquivo appsettings.Development.json com suas credenciais

# 4. Restaurar dependências
dotnet restore

# 5. Executar a API
dotnet run

# 6. Acessar Swagger
# Abra: http://localhost:5205/swagger
```

### 5.4. Dependências do Projeto (NuGet)

| Pacote                                            | Versão  | Finalidade                          |
|---------------------------------------------------|---------|--------------------------------------|
| `Microsoft.AspNetCore.Authentication.JwtBearer`    | 8.0.0   | Autenticação JWT                    |
| `Microsoft.EntityFrameworkCore`                    | 8.0.0   | ORM                                 |
| `Microsoft.EntityFrameworkCore.Design`             | 8.0.0   | Ferramentas de migração             |
| `Npgsql.EntityFrameworkCore.PostgreSQL`            | 8.0.0   | Provider PostgreSQL para EF Core    |
| `Swashbuckle.AspNetCore`                           | 6.6.2   | Swagger UI / OpenAPI                |

### 5.5. Credenciais Padrão (Somente Desenvolvimento)

| Email                        | Senha            | Perfil         |
|------------------------------|------------------|----------------|
| `admin@xsalgados.com`        | `admin123`       | Administrador  |
| `atendente@xsalgados.com`    | `atendente123`   | Atendente      |
| `entregador@xsalgados.com`   | `entregador123`  | Entregador     |

> ⚠️ **OBRIGATÓRIO:** Alterar todas as credenciais padrão antes de qualquer deploy em produção.

### 5.6. Estrutura de Diretórios

```
Backend/
├── Controllers/          # 7 controllers REST
├── Data/                 # AppDbContext + DbInitializer (seed)
├── DTOs/                 # Data Transfer Objects por domínio
│   ├── Auth/             #   LoginDto, LoginResponseDto
│   ├── Clientes/         #   CriarClienteDto, ClienteDto, etc.
│   ├── Common/           #   PaginacaoDto, ResultadoPaginadoDto, ApiResponse
│   ├── Dashboard/        #   KPIs, PedidosPorMes, DistribuicaoStatus
│   ├── Pedidos/          #   CriarPedidoDto, PedidoDto, PedidoResumoDto, etc.
│   ├── Produtos/         #   CriarProdutoDto, ProdutoDto, etc.
│   └── Usuarios/         #   CriarUsuarioDto, AlterarSenhaDto, etc.
├── Middleware/            # ExceptionHandlingMiddleware
├── Models/               # Entidades EF Core
│   └── Enums/            #   PerfilUsuario, StatusPedido
├── Properties/            # launchSettings.json
├── Scripts/              # create_tables.sql
├── Services/             # Lógica de negócio
│   └── Interfaces/       #   Contratos de serviço (IoC)
├── appsettings.json      # Configuração base (placeholders)
├── Backend.csproj        # Projeto .NET
└── Program.cs            # Entry point + pipeline configuration
```

---

## 6. Casos de Teste

### 6.1. Testes Unitários

#### Teste 1: Hash de senha deve gerar resultado consistente
```csharp
[Fact]
public void HashSenha_MesmaSenha_DeveGerarMesmoHash()
{
    // Arrange
    var authService = CriarAuthService();
    
    // Act
    var hash1 = authService.HashSenha("admin123");
    var hash2 = authService.HashSenha("admin123");
    
    // Assert
    Assert.Equal(hash1, hash2);
}
```
**Objetivo:** Validar determinismo do hash. **Nota:** Após migração para BCrypt, este teste deve verificar que hashes diferentes são gerados para a mesma senha (por causa do salt).

#### Teste 2: Criar pedido deve calcular valor total a partir do banco
```csharp
[Fact]
public async Task CriarPedido_DeveCalcularValorTotal_ComPrecosDoBanco()
{
    // Arrange
    var context = CriarContextoEmMemoria();
    context.Produtos.Add(new Produto { Id = 1, Nome = "X-Salada", Preco = 15.00m, Ativo = true, Categoria = "Lanches" });
    context.Clientes.Add(new Cliente { Id = 1, Nome = "João", Telefone = "11999999999" });
    await context.SaveChangesAsync();
    
    var service = new PedidoService(context);
    var dto = new CriarPedidoDto
    {
        ClienteId = 1,
        Itens = new List<ItemPedidoDto> 
        { 
            new() { ProdutoId = 1, Quantidade = 3 } 
        }
    };
    
    // Act
    var (pedido, erros) = await service.CriarAsync(dto);
    
    // Assert
    Assert.Null(erros);
    Assert.NotNull(pedido);
    Assert.Equal(45.00m, pedido.ValorTotal); // 15.00 × 3
}
```
**Objetivo:** Garantir que o preço nunca vem do cliente.

#### Teste 3: Excluir cliente com pedidos deve retornar erro
```csharp
[Fact]
public async Task ExcluirCliente_ComPedidos_DeveRetornarConflito()
{
    // Arrange
    var context = CriarContextoEmMemoria();
    var cliente = new Cliente { Id = 1, Nome = "Maria", Telefone = "11988888888" };
    context.Clientes.Add(cliente);
    context.Pedidos.Add(new Pedido { ClienteId = 1, ValorTotal = 10m, Status = StatusPedido.Pendente });
    await context.SaveChangesAsync();
    
    var service = new ClienteService(context);
    
    // Act
    var (sucesso, mensagem) = await service.ExcluirAsync(1);
    
    // Assert
    Assert.False(sucesso);
    Assert.Contains("pedidos vinculados", mensagem);
}
```
**Objetivo:** Validar regra de integridade referencial no nível do serviço.

#### Teste 4: Usuário não pode excluir a si mesmo
```csharp
[Fact]
public async Task ExcluirUsuario_ProprioUsuario_DeveLancarExcecao()
{
    // Arrange
    var context = CriarContextoEmMemoria();
    context.Usuarios.Add(new Usuario { Id = 1, Nome = "Admin", Email = "a@a.com", SenhaHash = "h", Perfil = PerfilUsuario.Administrador });
    await context.SaveChangesAsync();
    
    var service = new UsuarioService(context, CriarAuthService());
    
    // Act & Assert
    await Assert.ThrowsAsync<InvalidOperationException>(
        () => service.ExcluirAsync(1, usuarioLogadoId: 1));
}
```
**Objetivo:** Garantir proteção contra auto-exclusão.

#### Teste 5: Criar pedido com produto inativo deve retornar erro
```csharp
[Fact]
public async Task CriarPedido_ProdutoInativo_DeveRetornarErro()
{
    // Arrange
    var context = CriarContextoEmMemoria();
    context.Produtos.Add(new Produto { Id = 1, Nome = "X-Antigo", Preco = 10m, Ativo = false, Categoria = "Lanches" });
    context.Clientes.Add(new Cliente { Id = 1, Nome = "Pedro", Telefone = "11977777777" });
    await context.SaveChangesAsync();
    
    var service = new PedidoService(context);
    var dto = new CriarPedidoDto
    {
        ClienteId = 1,
        Itens = new List<ItemPedidoDto> { new() { ProdutoId = 1, Quantidade = 1 } }
    };
    
    // Act
    var (pedido, erros) = await service.CriarAsync(dto);
    
    // Assert
    Assert.Null(pedido);
    Assert.NotNull(erros);
    Assert.Contains(erros, e => e.Contains("inativos"));
}
```
**Objetivo:** Garantir que produtos desativados não entram em novos pedidos.

---

### 6.2. Testes de Integração

#### Teste 1: Fluxo completo de autenticação e autorização
```
1. POST /api/auth/login com credenciais válidas → Espera 200 + token JWT.
2. GET /api/dashboard/kpis com token de Administrador → Espera 200.
3. GET /api/dashboard/kpis com token de Atendente → Espera 403 Forbidden.
4. GET /api/dashboard/kpis sem token → Espera 401 Unauthorized.
```
**Objetivo:** Validar pipeline completo de AuthN + AuthZ.

#### Teste 2: CRUD completo de pedido com verificação de snapshot de preço
```
1. POST /api/produtos (criar produto com preço R$10).
2. POST /api/pedidos (criar pedido com 2 unidades do produto).
3. Verificar: valor_total = R$20, preco_unitario_snapshot = R$10.
4. PUT /api/produtos (alterar preço para R$15).
5. GET /api/pedidos/{id} → preco_unitario_snapshot ainda deve ser R$10.
```
**Objetivo:** Garantir imutabilidade do preço histórico.

#### Teste 3: Endpoint de rotas filtra corretamente por data e status
```
1. Criar pedido com status Pronto e data_entrega = hoje → deve aparecer.
2. Criar pedido com status Pronto e data_entrega = amanhã → não deve aparecer.
3. Criar pedido com status Pendente e data_entrega = hoje → não deve aparecer.
4. GET /api/entregas/rotas → verificar que só o pedido (1) é retornado.
```
**Objetivo:** Validar lógica de negócio do módulo de entregas.

#### Teste 4: Paginação com limites e defaults
```
1. Inserir 25 clientes no banco.
2. GET /api/clientes?pagina=1&tamanhoPagina=10 → 10 itens, totalPaginas=3.
3. GET /api/clientes?pagina=3&tamanhoPagina=10 → 5 itens.
4. GET /api/clientes?tamanhoPagina=200 → deve ser limitado a 100 (cap do DTO).
5. GET /api/clientes?pagina=-1 → deve normalizar para página 1.
```
**Objetivo:** Validar mecanismo de paginação e seus guardas.

#### Teste 5: Exception middleware retorna formato padronizado
```
1. Forçar uma exceção não tratada em um endpoint (ex: banco offline).
2. Verificar que a resposta é JSON no formato ApiResponse<object>.
3. Verificar que o status HTTP é 500.
4. Verificar que o Content-Type é application/json.
5. Verificar que a mensagem não expõe stack trace (após correção de segurança).
```
**Objetivo:** Garantir resiliência e formato consistente de erro.

---

## Apêndice A: Comandos Úteis

```bash
# Executar em modo watch (hot reload)
dotnet watch run

# Build para produção
dotnet publish -c Release -o ./publish

# Verificar erros de compilação
dotnet build

# Restaurar dependências
dotnet restore
```

## Apêndice B: Roadmap de Segurança Recomendado

| Prioridade | Ação                                                    | Esforço Estimado |
|------------|--------------------------------------------------------|------------------|
| P0         | Migrar de SHA256 para BCrypt/Argon2id                  | 2-4 horas        |
| P0         | Remover fallback de chave JWT hardcoded                | 30 minutos       |
| P1         | Implementar rate limiting no login                     | 1-2 horas        |
| P1         | Implementar refresh tokens                             | 4-8 horas        |
| P1         | Adicionar validação de transição de status de pedido   | 1-2 horas        |
| P2         | Sanitizar mensagens de exceção em produção             | 1 hora           |
| P2         | Validar email único no service antes de salvar         | 30 minutos       |
| P2         | Configurar RequireHttpsMetadata por ambiente           | 15 minutos       |
| P3         | Implementar audit log para operações sensíveis         | 4-8 horas        |
| P3         | Adicionar HSTS e security headers                      | 1 hora           |
| P3         | Implementar health checks para o banco de dados        | 1 hora           |

---

> **Nota Final:** Este documento deve ser revisado a cada sprint ou release, atualizando o status das vulnerabilidades à medida que as correções são implementadas. A seção de Análise de Segurança deve ser tratada como um backlog de segurança vivo.
