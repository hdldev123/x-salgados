# Rangô — Documentação Técnica

> **Versão:** 2.0 · **Última atualização:** Março de 2026
> **Stack:** Node.js · TypeScript (strict) · Express · Supabase · Baileys · Grok (xAI) · React · Vite · Tailwind CSS v4
> **Propósito:** Referência técnica completa para desenvolvedores, auditores e agentes de IA

---

## 📋 Sumário

- [1. Stack Tecnológica](#1-stack-tecnológica)
- [2. Decisões Arquiteturais Recentes](#2-decisões-arquiteturais-recentes)
- [3. Esquema de Base de Dados](#3-esquema-de-base-de-dados)
- [4. API REST — Endpoints](#4-api-rest--endpoints)
- [5. Motor WhatsApp (Baileys)](#5-motor-whatsapp-baileys)
- [6. Inteligência Artificial (Grok / xAI)](#6-inteligência-artificial-grok--xai)
- [7. Frontend — Arquitetura de Componentes](#7-frontend--arquitetura-de-componentes)
- [8. Segurança](#8-segurança)
- [9. Pipeline de Build e Deploy](#9-pipeline-de-build-e-deploy)

---

## 1. Stack Tecnológica

### Backend

| Componente       | Tecnologia                | Versão   | Propósito                                    |
|------------------|---------------------------|----------|----------------------------------------------|
| Runtime          | Node.js                   | 18+      | Servidor de aplicação                        |
| Framework        | Express                   | 4.21     | HTTP routing e middlewares                   |
| Linguagem        | TypeScript (strict)       | 5.x      | Type safety em toda a codebase               |
| Build            | **tsup** (esbuild)        | latest   | Bundle CJS ultrarrápido para produção        |
| Database         | Supabase (PostgreSQL)     | -        | PostgREST + RPCs atômicas                    |
| Auth             | JWT + bcrypt              | -        | Autenticação stateless                       |
| Validação        | Zod                       | 3.24     | Schema validation runtime em DTOs            |
| WhatsApp         | @whiskeysockets/baileys   | 7.0-rc.9 | WebSocket nativo para WhatsApp Web           |
| IA               | OpenAI SDK                | 6.27     | Client unificado para Grok/Groq/Gemini/OpenAI |
| Docs             | swagger-ui-express        | 5.0      | OpenAPI auto-generada                        |
| Segurança        | Helmet + CORS             | -        | CSP headers + rate limiting                  |
| Testes           | Vitest                    | -        | Testes unitários e de integração             |

### Frontend

| Componente       | Tecnologia                | Versão   | Propósito                                    |
|------------------|---------------------------|----------|----------------------------------------------|
| Framework        | React                     | 18.2     | UI declarativa com hooks                     |
| Bundler          | Vite                      | 5.2      | Dev server com HMR + build otimizado         |
| Estilos          | Tailwind CSS              | 4.2      | Utility-first CSS com design system custom   |
| Gráficos         | Recharts                  | 2.12     | Charts responsivos no Dashboard              |
| HTTP             | Axios                     | 1.13     | Cliente HTTP com interceptors                |
| Routing          | React Router DOM          | 6.22     | SPA routing com guards                       |
| Hosting          | Vercel                    | -        | CDN global com SPA rewrite                   |

---

## 2. Decisões Arquiteturais Recentes

### 2.1 Migração de `tsc` para `tsup` no Build de Produção

**Problema:** O Render.com (free tier) aloca ~512 MB de RAM. O compilador ``tsc`` carrega todo o programa TypeScript em memória para fazer type-checking, causando falhas de ``ENOMEM`` (Out of Memory) durante deploys com codebase crescente.

**Solução:** Migração para **tsup**, um bundler baseado em **esbuild** (escrito em Go), que:
- **Transpila sem type-check** — o esbuild faz apenas transpilação (stripping de tipos), sem análise semântica
- **Consome ~50 MB de RAM** vs. ~400 MB do tsc
- **Build em <2 segundos** vs. ~30 segundos do tsc
- Gera **bundles CJS monolíticos** por entry point, eliminando a necessidade de copiar ``node_modules`` internos

**Configuração atual:**

```bash
tsup src/server.ts src/seed.ts --format cjs --clean
```

Dois entry points são gerados: ``dist/server.js`` (servidor principal) e ``dist/seed.js`` (script de seeding). O type-checking continua sendo feito em desenvolvimento via IDE (tsserver) e CI.

### 2.2 Custom Supabase Auth State para Baileys

**Problema:** O Baileys armazena por padrão as chaves criptográficas do protocolo Signal em ficheiros JSON no disco local (``auth_whatsapp/``). No Render.com, o filesystem é **efêmero** — ao reiniciar o serviço (deploy, spin-down), todos os ficheiros são destruídos, forçando o bot a re-escanear o QR Code manualmente.

**Solução:** Implementação de um adaptador custom ``useSupabaseAuthState`` que persiste todas as chaves Signal no PostgreSQL via Supabase:

```
┌───────────────────────────────────────────────┐
│                  Baileys                       │
│  makeWASocket({ auth: state })                │
│        ↕ get/set keys                         │
│  ┌─────────────────────────────────────────┐  │
│  │   useSupabaseAuthState('rango-prod')    │  │
│  │                                          │  │
│  │   readData()  → SELECT FROM             │  │
│  │                  whatsapp_auth_state     │  │
│  │   writeData() → UPSERT INTO             │  │
│  │                  whatsapp_auth_state     │  │
│  │                                          │  │
│  │   BufferJSON.replacer/reviver para       │  │
│  │   serialização de Uint8Array ↔ JSON      │  │
│  └─────────────────────────────────────────┘  │
└───────────────────────────────────────────────┘
```

**Tabela:**

```sql
CREATE TABLE whatsapp_auth_state (
    session_id  VARCHAR(100),
    key_id      VARCHAR(200),
    data        JSONB,
    PRIMARY KEY (session_id, key_id)
);
```

**Fluxo de inicialização:**
1. Baileys chama ``useSupabaseAuthState('rango-prod')``
2. O adaptador tenta carregar ``creds`` existentes da tabela
3. Se não existirem, gera novas credenciais (``initAuthCreds()``)
4. Retorna ``{ state, saveCreds }`` para o Baileys usar
5. A cada atualização de creds, ``saveCreds`` faz UPSERT no PostgreSQL
6. Chaves de pré-chave, sessão, identidade e app-state são lidas/escritas sob demanda

**Resultado:** O bot sobrevive a qualquer reinicialização do Render sem necessidade de escanear QR Code novamente.

### 2.3 Segurança de Chaves de API

As chaves de serviços externos seguem o padrão de segurança:

| Chave | Armazenamento | Acesso |
|-------|--------------|--------|
| ``SUPABASE_KEY`` | Variável de ambiente (Render) | Apenas backend, nunca exposta ao cliente |
| ``JWT_KEY`` | Variável de ambiente (256-bit hex) | Assinatura/verificação de tokens |
| ``GROK_API_KEY`` | Variável de ambiente | Backend → xAI API (server-side only) |
| ``GROQ_API_KEY`` | Variável de ambiente | Fallback IA |
| ``GEMINI_API_KEY`` | Variável de ambiente | Fallback IA |

**Princípios:**
- Nenhuma chave é hardcoded no código-fonte
- Nenhuma chave é exposta ao frontend — todas as chamadas de IA passam pelo backend
- O frontend só possui a URL pública da API backend
- CORS restringe origens permitidas via ``CORS_ORIGINS``
- Helmet configura CSP headers para prevenir XSS e injection

### 2.4 Configuração `vercel.json` para SPA

**Problema:** Em SPAs com React Router, ao navegar para ``/pedidos/123`` e recarregar a página, o Vercel retorna 404 porque não existe um ficheiro estático nesse caminho.

**Solução:**

```json
{
  "rewrites": [
    {
      "source": "/(.*)",
      "destination": "/index.html"
    }
  ]
}
```

Todas as rotas são redirecionadas para ``index.html``, onde o React Router assume o roteamento no lado do cliente. Assets estáticos (JS, CSS, imagens) continuam a ser servidos normalmente porque o Vercel dá prioridade a ficheiros existentes antes de aplicar rewrites.

---

## 3. Esquema de Base de Dados

### 3.1 Diagrama Relacional

```
┌──────────────┐       ┌──────────────┐       ┌──────────────┐
│   usuarios   │       │   clientes   │       │   produtos   │
├──────────────┤       ├──────────────┤       ├──────────────┤
│ id (PK)      │       │ id (PK)      │       │ id (PK)      │
│ nome         │       │ nome         │       │ nome         │
│ email (UQ)   │       │ telefone     │       │ categoria    │
│ senha_hash   │       │ email        │       │ descricao    │
│ perfil (1-3) │       │ endereco     │       │ preco        │
│ ativo        │       │ cidade, cep  │       │ ativo        │
│ data_criacao │       │ whatsapp_jid │       │ data_criacao │
│ deleted_at   │       │ whatsapp_lid │       └──────────────┘
└──────────────┘       │ data_criacao │              │
                       └──────┬───────┘              │
                              │ 1:N                  │
                              ▼                      │
                       ┌──────────────┐              │
                       │   pedidos    │              │
                       ├──────────────┤              │
                       │ id (PK)      │              │
                       │ cliente_id(FK)│              │
                       │ data_criacao │              │
                       │ data_entrega │              │
                       │ valor_total  │              │
                       │ status (1-6) │              │
                       │ observacoes  │              │
                       └──────┬───────┘              │
                              │ 1:N                  │
                              ▼                      │
                       ┌───────────────┐             │
                       │ itens_pedido  │             │
                       ├───────────────┤             │
                       │ id (PK)       │             │
                       │ pedido_id (FK)│─────────────┘
                       │ produto_id(FK)│
                       │ quantidade    │
                       │ preco_unitario│
                       │ _snapshot     │
                       └───────────────┘
```

### 3.2 Tabelas do Módulo WhatsApp

```sql
-- Sessões de conversa (máquina de estados do bot)
CREATE TABLE sessoes_whatsapp (
    telefone     VARCHAR(20) PRIMARY KEY,
    etapa        VARCHAR(50),          -- Estado atual (MENU_QUANTIDADE, etc.)
    dados        JSONB,                -- Carrinho, nome, endereço, etc.
    atualizado_em TIMESTAMP DEFAULT NOW()
);

-- Histórico de mensagens (auditoria)
CREATE TABLE whatsapp_mensagens (
    id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    cliente_id    INTEGER REFERENCES clientes(id),
    remote_jid    VARCHAR(100),
    texto         TEXT,
    direcao       VARCHAR(10),          -- 'INBOUND' | 'OUTBOUND'
    data_registro TIMESTAMP DEFAULT NOW()
);

-- Chaves Signal do Baileys (auth state)
CREATE TABLE whatsapp_auth_state (
    session_id  VARCHAR(100),
    key_id      VARCHAR(200),
    data        JSONB,
    PRIMARY KEY (session_id, key_id)
);
```

### 3.3 Enums de Status

```typescript
enum StatusPedido {
  Pendente    = 1,  // Pedido recebido, aguardando produção
  EmProducao  = 2,  // Em processo de fabricação
  Pronto      = 3,  // Fabricado, aguardando expedição
  EmEntrega   = 4,  // Saiu para entrega
  Entregue    = 5,  // Entregue ao cliente
  Cancelado   = 6,  // Cancelado (pelo bot ou admin)
}

enum PerfilUsuario {
  Admin       = 1,  // Acesso total
  Atendente   = 2,  // Gestão de pedidos e clientes
  Entregador  = 3,  // Visualização de lotes e entregas
}
```

### 3.4 RPC Atômica — Criação de Pedido

```sql
CREATE OR REPLACE FUNCTION criar_pedido_atomico(
    p_cliente_id INTEGER,
    p_itens      item_pedido_input[]     -- ARRAY de {produto_id, quantidade, preco_unitario}
) RETURNS INTEGER
LANGUAGE plpgsql AS $$
DECLARE
    v_pedido_id INTEGER;
    v_total     DECIMAL(10,2) := 0;
    v_item      item_pedido_input;
BEGIN
    -- Calcula valor total
    FOREACH v_item IN ARRAY p_itens LOOP
        v_total := v_total + (v_item.quantidade * v_item.preco_unitario);
    END LOOP;

    -- Cria pedido
    INSERT INTO pedidos (cliente_id, valor_total, status, data_criacao)
    VALUES (p_cliente_id, v_total, 1, NOW())
    RETURNING id INTO v_pedido_id;

    -- Cria itens (tudo na mesma transação)
    FOREACH v_item IN ARRAY p_itens LOOP
        INSERT INTO itens_pedido (pedido_id, produto_id, quantidade, preco_unitario_snapshot)
        VALUES (v_pedido_id, v_item.produto_id, v_item.quantidade, v_item.preco_unitario);
    END LOOP;

    -- Se qualquer INSERT falhar, PostgreSQL faz rollback de TUDO
    RETURN v_pedido_id;
END;
$$;
```

---

## 4. API REST — Endpoints

> Base URL: ``/api``
> Autenticação: Bearer Token JWT (exceto ``POST /api/auth/login``)

### 4.1 Autenticação

| Método | Rota              | Descrição                     | Rate Limit        |
|--------|-------------------|-------------------------------|--------------------|
| POST   | ``/auth/login``   | Login com email + senha       | 10 req / 15 min    |

### 4.2 Clientes (Admin + Atendente)

| Método | Rota                | Descrição                      |
|--------|---------------------|--------------------------------|
| GET    | ``/clientes``       | Listar clientes (paginado)     |
| POST   | ``/clientes``       | Criar novo cliente             |
| GET    | ``/clientes/:id``   | Obter cliente por ID           |
| PUT    | ``/clientes/:id``   | Atualizar dados do cliente     |
| DELETE | ``/clientes/:id``   | Remover cliente                |

### 4.3 Produtos

| Método | Rota                       | Acesso          | Descrição                    |
|--------|----------------------------|-----------------|------------------------------|
| GET    | ``/produtos``              | Autenticado     | Listar todos os produtos     |
| GET    | ``/produtos/categorias``   | Autenticado     | Listar categorias distintas  |
| GET    | ``/produtos/:id``          | Autenticado     | Obter produto por ID         |
| POST   | ``/produtos``              | Admin           | Criar novo produto           |
| PUT    | ``/produtos/:id``          | Admin           | Atualizar produto            |
| DELETE | ``/produtos/:id``          | Admin           | Remover produto              |

> **Hook de Sincronização `estoque ↔ ativo`**: O serviço `produto.service.ts` contém a função `sincronizarAtivo()` que é chamada automaticamente em toda criação e atualização de produto. A regra é: **`ativo = estoque >= 100`** (pedido mínimo = 100 unidades). Quando um pedido é criado (via `pedido.service.ts`), o estoque é decrementado atomicamente pela RPC `decrementar_estoque` e, se o saldo resultante ficar abaixo de 100, o produto é desativado automaticamente. Isso garante que o menu do WhatsApp (que filtra `ativo = true AND estoque > 0`) nunca exiba produtos que não possam atender o pedido mínimo.

### 4.4 Pedidos (Admin + Atendente)

| Método | Rota                      | Acesso               | Descrição                      |
|--------|---------------------------|-----------------------|--------------------------------|
| GET    | ``/pedidos``              | Admin + Atendente     | Listar pedidos (paginado, filtros) |
| POST   | ``/pedidos``              | Admin + Atendente     | Criar pedido manual            |
| GET    | ``/pedidos/:id``          | Admin + Atendente     | Obter pedido detalhado         |
| PATCH  | ``/pedidos/:id/status``   | Admin + Atend. + Entreg. | Atualizar status            |

### 4.5 Usuários (Admin)

| Método | Rota                       | Descrição                     |
|--------|----------------------------|-------------------------------|
| GET    | ``/usuarios``              | Listar usuários               |
| POST   | ``/usuarios``              | Criar usuário                 |
| GET    | ``/usuarios/:id``          | Obter usuário                 |
| PUT    | ``/usuarios/:id``          | Atualizar usuário             |
| DELETE | ``/usuarios/:id``          | Soft delete (``deleted_at``)  |
| PATCH  | ``/usuarios/:id/senha``    | Alterar senha                 |

### 4.6 Entregas (Admin + Entregador)

| Método | Rota                       | Descrição                                    |
|--------|----------------------------|----------------------------------------------|
| GET    | ``/entregas/lote``         | Obter lote pendente (pedidos Pronto)         |
| POST   | ``/entregas/liberar-lote`` | Liberar lote para entrega (Pronto → EmEntrega) |
| GET    | ``/entregas/em-transito``  | Obter pedidos em trânsito                    |

### 4.7 Dashboard (Admin)

| Método | Rota                               | Descrição                                 |
|--------|-------------------------------------|-------------------------------------------|
| GET    | ``/dashboard/kpis``                 | KPIs gerais (receita, pedidos, etc.)      |
| GET    | ``/dashboard/pedidos-por-mes``      | Pedidos agrupados por mês (6 meses)       |
| GET    | ``/dashboard/distribuicao-status``  | Distribuição de status atual              |
| GET    | ``/dashboard/completo``             | Dados completos do dashboard              |
| GET    | ``/dashboard/insight``              | Insight de IA (Grok/fallbacks)            |
| POST   | ``/dashboard/chat``                 | Chat interativo com IA                    |

### 4.8 WhatsApp

| Método | Rota                     | Auth        | Descrição                   |
|--------|--------------------------|-------------|-----------------------------|
| POST   | ``/whatsapp/webhook``    | Webhook key | Receber mensagens do bot    |

---

## 5. Motor WhatsApp (Baileys)

### 5.1 Inicialização da Conexão

O Baileys é inicializado em ``baileys.service.ts`` durante o boot do servidor:

1. Busca a versão mais recente do protocolo (``fetchLatestBaileysVersion()``)
2. Carrega o auth state do Supabase (``useSupabaseAuthState('rango-prod')``)
3. Cria o socket com configurações otimizadas:
   - ``printQRInTerminal: true`` — QR Code para emparelhar o telefone
   - ``auth: state`` — Signal keys do Supabase
   - ``browser: ['Rangô Bot', 'Chrome', '']`` — User-agent do dispositivo
4. Regista event listeners para ``connection.update``, ``creds.update``, ``messages.upsert`` e ``contacts.upsert``

### 5.2 Resolução de LID (Linked Identity)

O WhatsApp implementou um sistema de privacidade onde ``remoteJid`` pode chegar como ``@lid`` (Linked Identity) em vez de ``@s.whatsapp.net``. O módulo ``jid-resolver.service.ts`` resolve este mapeamento:

1. **Warmup:** Na inicialização, carrega todos os mapeamentos LID ↔ Telefone do PostgreSQL (paginação de 1000 em 1000 por limitação do PostgREST)
2. **Cache in-memory:** Mantém um ``Map<lid, phoneJid>`` e ``Map<phoneJid, lid>`` em memória
3. **Atualização em tempo real:** O evento ``contacts.upsert`` do Baileys popula novos mapeamentos
4. **Fallback:** Mensagens de ``@lid`` desconhecidos são processadas via lookup no banco

### 5.3 Máquina de Estados do Bot

O fluxo conversacional é gerido por uma máquina de estados persistida na tabela ``sessoes_whatsapp``:

```
┌─────────────┐     ┌──────────────────┐     ┌────────────────────┐
│   INICIAL   │────►│ AGUARDANDO_NOME  │────►│ AGUARDANDO_ENDERECO│
│ (1ª msg)    │     │ "Qual seu nome?" │     │ "Qual o endereço?" │
└─────────────┘     └──────────────────┘     └────────┬───────────┘
                                                       │
                    ┌──────────────────────────────────┘
                    ▼
             ┌──────────────────┐
             │ MENU_QUANTIDADE  │◄──────────────────────────┐
             │ [100/300/500/1000]│                           │
             └────────┬─────────┘                           │
                      │ seleciona qty                        │
                      ▼                                      │
             ┌──────────────────┐                           │
             │  MENU_PRODUTO    │                  ("Sim, quero")
             │ Lista de produtos│                           │
             └────────┬─────────┘                           │
                      │ seleciona produto                   │
                      ▼                                      │
             ┌───────────────────────────┐                  │
             │ MENU_CONTINUAR_COMPRANDO  │──────────────────┘
             │ "Deseja mais algo?"       │
             │ [1] Sim  [2] Não          │
             └────────┬─────────────────┘
                      │ [2] Não
                      ▼
             ┌──────────────────┐
             │  CRIAR PEDIDO    │
             │ (RPC atômica)    │
             └──────────────────┘
```

**Clientes recorrentes** (já registados + com pedido ativo) entram diretamente no estado ``MENU_PEDIDO_ATIVO``:

```
┌─────────────────────┐
│  MENU_PEDIDO_ATIVO  │
│                     │
│ [1] Ver Status      │ → Mostra status atual do pedido
│ [2] Cancelar        │ → Só se status = Pendente
│ [3] Editar (email)  │ → Redireciona para suporte
│ [4] Novo Pedido     │ → Vai para MENU_QUANTIDADE
└─────────────────────┘
```

### 5.4 Estrutura do Carrinho

```typescript
interface ItemCarrinho {
    produtoId: number;
    quantidade: number;         // 100, 300, 500 ou 1000
    nomeProduto: string;
    precoUnitario: number;
}

interface DadosOnboarding {
    nome?: string;
    endereco?: string;
    pedidoAtivoId?: number;
    quantidadeEscolhida?: number;
    carrinho?: ItemCarrinho[];   // Acumulado a cada loop
}
```

---

## 6. Inteligência Artificial (Grok / xAI)

### 6.1 Arquitetura de Fallback

O módulo ``ai.service.ts`` implementa uma cadeia de provedores com degradação graciosa:

```
┌───────────┐   falha   ┌──────────┐   falha   ┌──────────┐   falha   ┌──────────┐   falha   ┌──────────────┐
│  Grok 2   │─────────►│   Groq   │─────────►│  Gemini  │─────────►│  OpenAI  │─────────►│ Msg. Padrão  │
│  (xAI)    │           │  (free)  │           │ (Google) │           │          │           │ (hardcoded)  │
└───────────┘           └──────────┘           └──────────┘           └──────────┘           └──────────────┘
```

### 6.2 Configuração do Grok

```typescript
// Client via OpenAI SDK com base URL personalizada
function criarClienteGrok(apiKey: string): OpenAI {
    return new OpenAI({
        apiKey,
        baseURL: 'https://api.x.ai/v1'
    });
}

// Chamada com prompt de consultor
const completion = await client.chat.completions.create({
    model: 'grok-2-latest',
    max_tokens: 200,
    temperature: 0.7,
    messages: [
        { role: 'system', content: PROMPT_SISTEMA },
        { role: 'user', content: `Métricas:\n${resumoVendas}` }
    ]
});
```

### 6.3 Métricas Enviadas ao Modelo

| Métrica                 | Fonte                      |
|-------------------------|----------------------------|
| ``receitaHoje``         | SUM pedidos do dia         |
| ``receitaTotal``        | SUM todos os pedidos       |
| ``pedidosHoje``         | COUNT pedidos do dia       |
| ``totalPedidos``        | COUNT total                |
| ``totalPedidosConcluidos``| COUNT status = Entregue  |
| ``totalPedidosCancelados``| COUNT status = Cancelado |
| ``receitaCancelada``    | SUM pedidos cancelados     |
| ``produtosMaisVendidos``| TOP 5 por quantidade       |

### 6.4 Chat Interativo

O endpoint ``POST /api/dashboard/chat`` mantém as **últimas 10 mensagens** de contexto, permitindo perguntas de follow-up:

```json
{
    "mensagem": "Qual produto devo promover amanhã?",
    "historico": [
        { "role": "user", "content": "..." },
        { "role": "assistant", "content": "..." }
    ]
}
```

---

## 7. Frontend — Arquitetura de Componentes

### 7.1 Design System (Tailwind v4)

```css
@theme {
    --color-primary-500: #d97706;    /* Burnt Orange — estimula apetite */
    --color-primary-600: #b45309;
    --color-grafite-900: #111827;    /* Deep Graphite — base escura */
    --color-grafite-800: #1f2937;
    --color-sucesso: #16a34a;
    --color-erro: #dc2626;
    --color-aviso: #eab308;
}
```

**Tipografia:** Inter (Google Fonts) em grades de 400 (body), 500 (labels), 600 (headings), 700 (emphasis).

### 7.2 Padrão Mobile-First

| Breakpoint  | Uso                                           |
|-------------|-----------------------------------------------|
| Default     | Layout mobile (stacked, full-width)           |
| ``sm:``     | Tablet (2 colunas, cards lado a lado)         |
| ``lg:``     | Desktop (sidebar fixa, grid 4-col)            |

**BarraLateral:**
- Mobile: ``hidden`` por padrão, drawer com ``fixed z-50`` que desliza da esquerda ao clicar no botão hambúrguer
- Desktop: ``lg:flex`` — sidebar fixa com navegação sempre visível
- Backdrop: ``bg-black/40 backdrop-blur-sm`` ao abrir em mobile

### 7.3 Componentes Principais

| Componente            | Localização                      | Responsabilidade                           |
|-----------------------|----------------------------------|--------------------------------------------|
| ``BarraLateral``      | ``componentes/BarraLateral/``    | Navegação responsiva com RBAC              |
| ``Dashboard``         | ``paginas/Dashboard/``           | KPIs, gráficos, card IA                    |
| ``Pedidos``           | ``paginas/Pedidos/``             | Listagem e gestão de pedidos               |
| ``RotasDeEntregas``   | ``paginas/RotasDeEntregas/``     | Bin Packing de lotes, entregas em trânsito |
| ``Clientes``          | ``paginas/Clientes/``            | CRUD de clientes                           |
| ``Produtos``          | ``paginas/Produtos/``            | CRUD de produtos (Admin)                   |

### 7.4 Contextos React

- **``ContextoAutenticacao``** — JWT token, dados do utilizador, login/logout
- **``ContextoPedidos``** — Cache de pedidos com invalidação automática

---

## 8. Segurança

### 8.1 Camadas de Proteção

| Camada              | Mecanismo                                              |
|---------------------|--------------------------------------------------------|
| **Transport**       | HTTPS via Vercel/Render (TLS 1.3)                      |
| **Headers**         | Helmet (CSP, X-Frame-Options, X-Content-Type-Options)  |
| **CORS**            | Whitelist de origens via ``CORS_ORIGINS``               |
| **Auth**            | JWT com expiração + bcrypt (salt rounds: 10)            |
| **Authorization**   | RBAC middleware por perfil (Admin/Atendente/Entregador) |
| **Rate Limiting**   | 10 tentativas de login por IP / 15 minutos             |
| **Validation**      | Zod schemas em TODOS os payloads de entrada             |
| **SQL Injection**   | PostgREST parametrizado (Supabase SDK)                  |

### 8.2 Fluxo de Autenticação

```
POST /api/auth/login
    ├─ Zod valida {email, senha}
    ├─ Busca utilizador no Supabase
    ├─ bcrypt.compare(senha, senha_hash)
    ├─ Gera JWT {id, email, perfil, iat, exp}
    └─ Retorna {token, usuario}

Requisições subsequentes:
    ├─ Header: Authorization: Bearer <token>
    ├─ Middleware extrai e verifica JWT
    ├─ Middleware verifica perfil vs. rota
    └─ Controller recebe req.usuario
```

---

## 9. Pipeline de Build e Deploy

### 9.1 Backend (Render.com)

```
1. git push → Render detecta alteração
2. npm install
3. npm run build → tsup src/server.ts src/seed.ts --format cjs --clean
4. npm start → node dist/server.js
5. server.ts inicia Express na PORT
6. Paralelo: conecta Supabase + inicializa Baileys
7. Baileys carrega auth state do PostgreSQL
8. Bot online ✅
```

### 9.2 Frontend (Vercel)

```
1. git push → Vercel detecta alteração
2. npm install
3. npm run build → vite build
4. Deploy para CDN global
5. vercel.json aplica rewrite /(.*) → /index.html
6. SPA online ✅
```

---

> **Rangô** — Documentação Técnica v2.0 · Março 2026
