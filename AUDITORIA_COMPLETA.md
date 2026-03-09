# 🔍 AUDITORIA COMPLETA — X Salgados
**Data:** 07/03/2026  
**Versão analisada:** `0.0.0` (backend) / frontend sem versionamento  
**Stack:** Node.js + TypeScript + Express + Supabase + React + Vite  

> Esta auditoria foi conduzida por um time multidisciplinar simulando as perspectivas de **Segurança, Infraestrutura, DBA, QA, PO, PM e Desenvolvedores Seniores**. Cada seção contém a severidade do problema, a localização exata no código e a correção recomendada.

---

## Índice
1. [🔴 Time de Segurança (SEC)](#%EF%B8%8F-time-de-segurança-sec)
2. [🟠 Time de Infraestrutura (INFRA)](#-time-de-infraestrutura-infra)
3. [🟡 Time de DBA (DBA)](#-time-de-dba-dba)
4. [🟢 Time de QA (QA)](#-time-de-qa-qa)
5. [🔵 Time de PO (PO)](#-time-de-po-po)
6. [🟣 Time de PM (PM)](#-time-de-pm-pm)
7. [⚫ Time de Desenvolvedores Seniores (DEV)](#-time-de-desenvolvedores-seniores-dev)
8. [📊 Resumo Executivo](#-resumo-executivo)

---

## 🔴 Time de Segurança (SEC)

### SEC-001 — CRÍTICO | ✅ [FEITO] Credenciais Reais Expostas no Repositório

**Arquivo:** `backend/.env`  
**Linha:** 1, 2, 3


**Problema:** O arquivo `.env` com credenciais reais de produção (`SUPABASE_URL`, `SUPABASE_KEY`, `JWT_KEY`) está comprometido no repositório Git. Qualquer pessoa com acesso ao repositório pode acessar o banco de dados diretamente e impersonar qualquer usuário da aplicação.

**Como corrigir:**
1. **Imediatamente:** Rotacionar todas as chaves no painel do Supabase e gerar um novo `JWT_KEY`.
2. Adicionar `.env` ao `.gitignore` (verifique se já está — e confirme com `git rm --cached backend/.env`).
3. Usar secrets do ambiente de CI/CD (GitHub Secrets, etc.).
4. Criar um arquivo `backend/.env.example` com placeholders (sem valores reais):

---

### SEC-002 — CRÍTICO | ✅ [FEITO] JWT Secret é um Token JWT (não uma chave segura)

**Arquivo:** `backend/.env`, linha 3  
**Arquivo:** `backend/src/services/auth.service.ts`, linha 74

**Problema:** O valor de `JWT_KEY` é um JWT decodificado (`eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIx...`), que é exatamente o que **NÃO** deve ser usado. O segredo JWT deve ser uma string opaca, longa e aleatória. Usar um JWT como secret expõe a chave de assinatura se o payload for decodificado (Base64 não é criptografia).

**Como corrigir:**  
Gerar um segredo forte:
```bash
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
```
Resultado: uma string hexadecimal de 128 caracteres. Usar esse valor no `.env`.

---

### SEC-003 — ALTO | ✅ [FEITO] Endpoint de Login sem Rate Limiting

**Arquivo:** `backend/src/routes/index.ts`, linha 28

```typescript
router.post('/api/auth/login', validate(LoginSchema), authController.login);
```

**Problema:** Não há nenhum middleware de rate limiting, account lockout, ou proteção contra brute-force no endpoint de login. Um atacante pode fazer infinitas tentativas de senha sem restrição.

**Como corrigir:**
```bash
npm install express-rate-limit
```
```typescript
import rateLimit from 'express-rate-limit';

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 10, // máximo 10 tentativas por IP
  standardHeaders: true,
  legacyHeaders: false,
  message: { sucesso: false, mensagem: 'Muitas tentativas de login. Tente novamente em 15 minutos.' },
});

router.post('/api/auth/login', loginLimiter, validate(LoginSchema), authController.login);
```

---

### SEC-004 — ALTO | ✅ [FEITO] Webhook WhatsApp Sem Autenticação

**Arquivo:** `backend/src/routes/index.ts`, linha 257

```typescript
// WHATSAPP WEBHOOK — Público (protegido por token de webhook)
router.post('/api/whatsapp/webhook', whatsappController.receberWebhook);
```

**Problema:** O comentário diz "protegido por token de webhook", mas na prática **não há verificação de token** implementada. Qualquer pessoa pode enviar payloads ao endpoint e simular mensagens WhatsApp, potencialmente criando clientes ou pedidos falsos.

**Como corrigir:**
```typescript
// Middleware de validação do token de webhook
function validarTokenWebhook(req: Request, res: Response, next: NextFunction): void {
  const token = req.headers['x-webhook-token'] || req.query.token;
  const tokenEsperado = process.env.WHATSAPP_WEBHOOK_SECRET;

  if (!tokenEsperado || token !== tokenEsperado) {
    res.status(401).json({ sucesso: false, mensagem: 'Token de webhook inválido.' });
    return;
  }
  next();
}

router.post('/api/whatsapp/webhook', validarTokenWebhook, whatsappController.receberWebhook);
```

---

### SEC-005 — ALTO | ✅ [FEITO] Número de Telefone do Admin Hardcoded no Código

**Arquivo:** `backend/src/services/whatsapp.service.ts`, linha 16

```typescript
const ADMIN_JID = '5532999269379@s.whatsapp.net';
```

**Problema:** O número de celular pessoal do administrador está hardcoded no código-fonte. Isso expõe dados pessoais (LGPD), não permite alterar o número sem redeploy, e compila o dado sensível no histórico do Git.

**Como corrigir:**
```typescript
const ADMIN_JID = process.env.WHATSAPP_ADMIN_JID;
// Validar na inicialização:
if (!ADMIN_JID) {
  console.error('[WhatsApp] WHATSAPP_ADMIN_JID não configurado no .env');
}
```

---

### SEC-006 — MÉDIO | ❌ [PENDENTE] Token JWT Armazenado no `localStorage`

**Arquivo:** `frontend/src/servicos/api.js`, linha 20

```javascript
const token = localStorage.getItem('token');
```

**Problema:** O `localStorage` é acessível por qualquer script JavaScript na página (vulnerável a XSS). O padrão mais seguro é o uso de cookies `HttpOnly; Secure; SameSite=Strict`, que não são acessíveis via JS.

**Como corrigir (abordagem pragmática):**  
Migrar para cookies `HttpOnly` requer mudanças no backend (endpoint de logout, CSRF protection). Como melhoria imediata:

1. Garantir que todo conteúdo dinâmico seja sanitizado (React já faz isso por padrão).
2. Adicionar `Content-Security-Policy` (CSP) no servidor para mitigar XSS.
3. Planejar migração para cookies `HttpOnly` em sprint futuro.

---

### SEC-007 — MÉDIO | ✅ [FEITO] Headers de Segurança HTTP Ausentes

**Arquivo:** `backend/src/server.ts`

**Problema:** A aplicação não usa `helmet.js` para adicionar headers de segurança HTTP (`X-Content-Type-Options`, `Strict-Transport-Security`, `X-Frame-Options`, `Content-Security-Policy`, etc.).

**Como corrigir:**
```bash
npm install helmet
```
```typescript
import helmet from 'helmet';
app.use(helmet());
```

---

### SEC-008 — BAIXO | ❌ [PENDENTE] `console.log` Pode Vazar Dados Sensíveis em Produção

**Arquivo:** `backend/src/services/whatsapp.service.ts`, linha 657

```typescript
console.log(`[WhatsApp] Mensagem recebida de ${nomeContato} (${remoteJid}): "${texto}"`);
```

**Problema:** Conteúdo de mensagens de clientes (potencialmente com dados pessoais) é logado no console sem controle de nível. Em produção deve-se usar um logger estruturado com níveis e redação de dados pessoais.

**Como corrigir:** Usar o `pino` já instalado como logger estruturado e aplicar redação de campos sensíveis:
```typescript
import pino from 'pino';
const logger = pino({ 
  level: process.env.LOG_LEVEL || 'info',
  redact: ['texto', 'nome', 'telefone']
});
```

---

## 🟠 Time de Infraestrutura (INFRA)

### INFRA-001 — ALTO | ❌ [PENDENTE] Ausência de Dockerfile e Orquestração

**Problema:** Não existe `Dockerfile`, `docker-compose.yml` ou qualquer configuração de containerização. O deploy em produção é manual e não reproduzível. Não há separação de ambientes (dev/staging/prod).

**Como corrigir:**

**`backend/Dockerfile`:**
```dockerfile
FROM node:22-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY dist/ ./dist/
EXPOSE 3000
CMD ["node", "dist/server.js"]
```

**`docker-compose.yml` (raiz do projeto):**
```yaml
version: '3.9'
services:
  backend:
    build: ./backend
    ports: ['3000:3000']
    env_file: ./backend/.env
    restart: unless-stopped
  frontend:
    build: ./frontend
    ports: ['5173:80']
    restart: unless-stopped
```

---

### INFRA-002 — ALTO | ❌ [PENDENTE] Nenhum Script de Build ou Deploy

**Arquivo:** `backend/package.json`, scripts

```json
"scripts": {
  "start": "node dist/server.js",
  "build": "tsc",
  "dev": "tsx watch src/server.ts"
}
```

**Problema:** Não existe script de `start:prod`, `prebuild` (linting), ou `postbuild` (copiar arquivos estáticos). O comando `start` assume que `dist/` já existe, mas não há garantia disso em CI/CD.

**Como corrigir:**
```json
"scripts": {
  "dev": "tsx watch src/server.ts",
  "build": "tsc",
  "start": "node dist/server.js",
  "lint": "eslint src --ext .ts",
  "ci": "npm run lint && npm run build && npm run start"
}
```

---

### INFRA-003 — MÉDIO | ❌ [PENDENTE] Arquivo `auth_whatsapp/` com Sessão WhatsApp não Ignorado no Git

**Arquivo:** `backend/.gitignore`

**Problema:** A pasta `auth_whatsapp/` armazena as credenciais de sessão do WhatsApp (chaves de criptografia Signal Protocol). Se essa pasta for commitada ao repositório, qualquer pessoa pode sequestrar a sessão WhatsApp da empresa.

**Como corrigir:**  
Verificar e garantir que `.gitignore` contenha:
```
auth_whatsapp/
dist/
node_modules/
.env
```
Executar: `git rm -r --cached backend/auth_whatsapp/` para remover do tracking caso já esteja rastreado.

---

### INFRA-004 — MÉDIO | ❌ [PENDENTE] Reconexão Baileys Sem Backoff Exponencial

**Arquivo:** `backend/src/services/baileys.service.ts`, linhas 110-111

```typescript
console.log('[Baileys] ⚠️  Reconectando em 3 segundos...');
setTimeout(() => iniciarBaileys(), 3000);
```

**Problema:** Reconexão com intervalo fixo de 3 segundos. Se o WhatsApp estiver com problemas, isso causa loop de reconexões que pode resultar em ban do número.

**Como corrigir:**
```typescript
let retryCount = 0;

function agendarReconexao() {
  const delay = Math.min(3000 * Math.pow(2, retryCount), 60000); // máx 60s
  retryCount++;
  console.log(`[Baileys] Reconectando em ${delay / 1000}s (tentativa ${retryCount})...`);
  setTimeout(() => iniciarBaileys(), delay);
}
```

---

### INFRA-005 — BAIXO | ❌ [PENDENTE] Swagger Disponível Apenas em Desenvolvimento mas Carregado de Modo Inseguro

**Arquivo:** `backend/src/server.ts`, linhas 58-74

```typescript
const swaggerUi = require('swagger-ui-express');
const { swaggerDocument } = require('./config/swagger');
```

**Problema:** Uso de `require()` dentro de um `app.listen()` callback, após o servidor subir. Além de ser anti-padrão (blocking I/O dentro de async context), o Swagger é adicionado ao app após já estar rodando (race condition teórica).

**Como corrigir:** Mover o setup do Swagger para antes do `app.listen()`, mantendo a condicional de ambiente:
```typescript
// Antes do app.listen()
if (process.env.NODE_ENV !== 'production') {
  import('./config/swagger').then(({ swaggerDocument }) => {
    import('swagger-ui-express').then((swaggerUi) => {
      app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerDocument));
    });
  });
}
```

---

## 🟡 Time de DBA (DBA)

### DBA-001 — CRÍTICO | ❌ [PENDENTE] Ausência de Transações Atômicas nas Operações Compostas

**Arquivo:** `backend/src/services/pedido.service.ts`, linhas 164-193

```typescript
// Inserir pedido
const { data: pedidoCriado, error: pedidoError } = await supabase
  .from('pedidos').insert({...}).select().single();

// Inserir itens (operação separada — não é atômica!)
const { error: itensError } = await supabase
  .from('itens_pedido').insert(itensComPedidoId);

if (itensError) {
  // Rollback manual — frágil e sujeito a falha
  await supabase.from('pedidos').delete().eq('id', pedidoCriado.id);
  throw new Error(itensError.message);
}
```

**Problema:** A criação do pedido e de seus itens são duas operações de banco separadas. O rollback manual pode falhar (ex: timeout de rede), deixando pedidos fantasmas sem itens no banco.

**Como corrigir:** Usar uma Database Function (RPC) no Supabase para envolver tudo em uma transação:

```sql
-- Criar no Supabase (SQL Editor)
CREATE OR REPLACE FUNCTION criar_pedido_com_itens(
  p_cliente_id INT,
  p_data_entrega TIMESTAMPTZ,
  p_valor_total NUMERIC,
  p_status INT,
  p_observacoes TEXT,
  p_itens JSONB
) RETURNS pedidos AS $$
DECLARE
  v_pedido pedidos;
BEGIN
  INSERT INTO pedidos (cliente_id, data_entrega, valor_total, status, observacoes)
  VALUES (p_cliente_id, p_data_entrega, p_valor_total, p_status, p_observacoes)
  RETURNING * INTO v_pedido;

  INSERT INTO itens_pedido (pedido_id, produto_id, quantidade, preco_unitario_snapshot)
  SELECT v_pedido.id, (item->>'produto_id')::INT, (item->>'quantidade')::INT, (item->>'preco')::NUMERIC
  FROM jsonb_array_elements(p_itens) AS item;

  RETURN v_pedido;
END;
$$ LANGUAGE plpgsql;
```

```typescript
// No service:
const { data, error } = await supabase.rpc('criar_pedido_com_itens', {
  p_cliente_id: dto.clienteId,
  p_valor_total: valorTotal,
  p_status: StatusPedido.Pendente,
  p_observacoes: dto.observacoes ?? null,
  p_itens: JSON.stringify(itensParaInserir),
});
```

---

### DBA-002 — ALTO | ✅ [FEITO] Busca de Clientes Traz Todos os Registros da Tabela

**Arquivo:** `backend/src/services/whatsapp.service.ts`, linhas 243-245

```typescript
const { data: clientes, error } = await supabase
  .from('clientes')
  .select('*'); // ← SEM FILTRO! Traz TODOS os clientes
```

**Problema:** A função `buscarClientePorTelefone()` carrega todos os clientes da tabela em memória e filtra em JavaScript. Isso é extremamente ineficiente e não escala. Com 10.000 clientes, cada mensagem WhatsApp recebida faz um full table scan.

**Como corrigir:**
```typescript
async function buscarClientePorTelefone(
  telefoneLimpo: string,
  whatsappLid?: string | null
): Promise<any | null> {
  // Buscar diretamente no banco com filtro
  const { data, error } = await supabase
    .from('clientes')
    .select('*')
    .or(
      `telefone.eq.${telefoneLimpo},telefone.eq.55${telefoneLimpo}` +
      (whatsappLid ? `,whatsapp_lid.eq.${whatsappLid}` : '')
    )
    .limit(1)
    .maybeSingle();

  if (error) { console.error('[WhatsApp] Erro ao buscar cliente:', error.message); return null; }
  return data;
}
```

E criar índice no banco:
```sql
CREATE INDEX idx_clientes_telefone ON clientes(telefone);
CREATE INDEX idx_clientes_whatsapp_jid ON clientes(whatsapp_jid);
CREATE INDEX idx_clientes_whatsapp_lid ON clientes(whatsapp_lid);
```

---

### DBA-003 — ALTO | ❌ [PENDENTE] Dashboard Traz Todos os Pedidos em Memória para Agrupamento

**Arquivo:** `backend/src/services/dashboard.service.ts`, linhas 69-93

```typescript
// Traz TODOS os pedidos do período para agrupar em JavaScript
const { data: pedidos, error } = await supabase
  .from('pedidos')
  .select('data_criacao, status, valor_total')
  .gte('data_criacao', dataInicio.toISOString());

// Agrupamento feito no app (não no banco):
const grupoMap = new Map<string, {...}>();
for (const p of pedidos || []) { ... }
```

**Problema:** Com crescimento do negócio, trazer milhares de pedidos para agrupar no Node.js é ineficiente. O banco de dados é otimizado para agregações via SQL.

**Como corrigir:**
```sql
-- View ou RPC no Supabase:
CREATE OR REPLACE FUNCTION pedidos_por_mes(meses INT DEFAULT 6)
RETURNS TABLE(ano INT, mes INT, total_pedidos BIGINT, receita_total NUMERIC) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    EXTRACT(YEAR FROM data_criacao)::INT AS ano,
    EXTRACT(MONTH FROM data_criacao)::INT AS mes,
    COUNT(*)::BIGINT AS total_pedidos,
    SUM(CASE WHEN status = 5 THEN valor_total ELSE 0 END) AS receita_total
  FROM pedidos
  WHERE data_criacao >= (NOW() - (meses || ' months')::INTERVAL)
  GROUP BY 1, 2
  ORDER BY 1, 2;
END;
$$ LANGUAGE plpgsql;
```

---

### DBA-004 — MÉDIO | ❌ [PENDENTE] Sem Índices nas Colunas de Filtro Mais Usadas

**Arquivo:** `backend/src/services/pedido.service.ts` — filtros por `status`, `cliente_id`, `data_criacao`

**Problema:** As queries mais comuns da aplicação filtram por `status`, `cliente_id` e `data_criacao` sem índices garantidos. O Supabase cria índice apenas na Primary Key por padrão.

**Como corrigir:**
```sql
CREATE INDEX idx_pedidos_status ON pedidos(status);
CREATE INDEX idx_pedidos_cliente_id ON pedidos(cliente_id);
CREATE INDEX idx_pedidos_data_criacao ON pedidos(data_criacao DESC);
CREATE INDEX idx_pedidos_status_data ON pedidos(status, data_criacao DESC);
CREATE INDEX idx_itens_pedido_pedido_id ON itens_pedido(pedido_id);
CREATE INDEX idx_itens_pedido_produto_id ON itens_pedido(produto_id);
```

---

### DBA-005 — MÉDIO | ✅ [FEITO] Campo `select('*')` em Múltiplos Lugares sem Necessidade

**Problemas em:** `pedido.service.ts` L95, `whatsapp.service.ts` L243, `baileys.service.ts` internamente

**Problema:** `select('*')` traz todas as colunas, incluindo dados desnecessários (ex: `senha_hash`, campos de auditoria). Aumenta consumo de banda e pode expor dados sensíveis acidentalmente em logs.

**Como corrigir:** Sempre especificar colunas explicitamente:
```typescript
// Antes:
.select('*')
// Depois:
.select('id, nome, telefone, email, endereco, whatsapp_jid, whatsapp_lid')
```

---

### DBA-006 — BAIXO | ❌ [PENDENTE] Ausência de Soft Delete e Auditoria

**Arquivo:** `backend/src/services/usuario.service.ts`, linha 114-119

```typescript
const { data, error } = await supabase
  .from('usuarios')
  .delete()  // Hard delete — sem rastreabilidade
  .eq('id', id)
```

**Problema:** Deleção física de registros impossibilita auditoria, recuperação de dados e viola boas práticas para LGPD (direito ao esquecimento deve ser registrado, não apagado silenciosamente).

**Como corrigir:** Implementar soft delete com campo `deleted_at`:
```sql
ALTER TABLE usuarios ADD COLUMN deleted_at TIMESTAMPTZ DEFAULT NULL;
```
```typescript
// Service:
await supabase.from('usuarios').update({ deleted_at: new Date().toISOString(), ativo: false }).eq('id', id);
// Adicionar filtro em todas as queries:
.is('deleted_at', null)
```

---

## 🟢 Time de QA (QA)

### QA-001 — CRÍTICO | ❌ [PENDENTE] Ausência Total de Testes Automatizados

**Problema:** Não existe nenhum arquivo de teste (unitário, integração ou E2E) em todo o projeto. O campo `scripts` em `package.json` não contém nenhum comando `test`.

**Como corrigir:**

**1. Instalar framework de testes:**
```bash
npm install -D vitest @vitest/coverage-v8 supertest @types/supertest
```

**2. Testes unitários — `auth.service.test.ts`:**
```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as authService from '../src/services/auth.service';

vi.mock('../src/config/database', () => ({
  supabase: { from: vi.fn() }
}));

describe('auth.service', () => {
  it('deve retornar null para usuário inativo', async () => {
    const result = await authService.loginAsync({ email: 'any@test.com', senha: 'wrong' });
    expect(result).toBeNull();
  });
  
  it('deve gerar hash bcrypt corretamente', async () => {
    const hash = await authService.hashSenha('Senha@123');
    const valido = await authService.verificarSenha('Senha@123', hash);
    expect(valido).toBe(true);
  });
});
```

**3. Testes de integração — `routes.test.ts`:**
```typescript
import request from 'supertest';
import app from '../src/server';

describe('POST /api/auth/login', () => {
  it('deve retornar 400 para body inválido', async () => {
    const res = await request(app).post('/api/auth/login').send({});
    expect(res.status).toBe(400);
    expect(res.body.sucesso).toBe(false);
  });

  it('deve retornar 401 para credenciais erradas', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'nao@existe.com', senha: 'errado' });
    expect(res.status).toBe(401);
  });
});
```

---

### QA-002 — ALTO | ❌ [PENDENTE] Sem Validação no Frontend das Respostas da API

**Arquivo:** `frontend/src/servicos/apiPedidos.js`, linhas 28-36

```javascript
const { dados, total, pagina, tamanhoPagina, totalPaginas } = response.data;
return { dados: dados.map(mapPedidoDoBackend), totalItens: total, ... };
```

**Problema:** Se o backend retornar uma estrutura inesperada (`dados` sendo `undefined`), a chamada `.map()` lança exceção não tratada que quebra a tela inteira.

**Como corrigir:**
```javascript
const { dados = [], total = 0, pagina = 1, tamanhoPagina = 20, totalPaginas = 0 } = response.data;
return {
  dados: (dados || []).map(mapPedidoDoBackend),
  totalItens: total || 0,
  pagina,
  tamanhoPagina,
  totalPaginas,
};
```

---

### QA-003 — ALTO | ❌ [PENDENTE] Tipo `any` Excessivo no Backend Impede Detectar Bugs em Tempo de Compilação

**Problemas em:** `pedido.service.ts` (multiple mapper functions), `whatsapp.service.ts`, `baileys.service.ts`

```typescript
function mapToDto(pedido: any): PedidoDto { // `any` anula o TypeScript
function gerarToken(usuario: any): string {  // mesmo problema
```

**Problema:** O uso de `any` impede que o TypeScript detecte erros de propriedades inexistentes ou tipos incorretos durante o build, permitindo bugs em runtime que poderiam ser pegos em compilação.

**Como corrigir:**
```typescript
// Definir interfaces para os dados do banco:
interface PedidoBanco {
  id: number;
  cliente_id: number;
  data_criacao: string;
  data_entrega: string | null;
  valor_total: string | number;
  status: StatusPedido;
  observacoes: string | null;
  clientes?: { nome: string; telefone: string | null; endereco: string | null };
  itens_pedido?: ItemPedidoBanco[];
}

function mapToDto(pedido: PedidoBanco): PedidoDto { ... }
```

---

### QA-004 — MÉDIO | ❌ [PENDENTE] Erros de Banco de Dados Silenciados

**Arquivo:** `backend/src/services/usuario.service.ts`, linha 104

```typescript
if (error) return null; // Erro silenciado — impossível debugar
return mapToDto(data);
```

**Problema:** Erros de atualização são silenciados e retornam `null` sem log. O controller trata `null` como "não encontrado" (404), quando na prática pode ser erro de banco (ex: violação de unique constraint de email).

**Como corrigir:**
```typescript
if (error) {
  // Distinguir "not found" de erro real
  if (error.code === 'PGRST116') return null; // PostgREST: not found
  throw new Error(`Erro ao atualizar usuário: ${error.message}`);
}
```

---

### QA-005 — MÉDIO | ❌ [PENDENTE] Status `AGUARDANDO_PEDIDO` Causa Double-Query ao Estado

**Arquivo:** `backend/src/services/whatsapp.service.ts`, linhas 696 e 751

```typescript
const estadoAtual = await obterEstado(telefoneLimpo); // query 1
// ...
const estadoPedido = await obterEstado(telefoneLimpo); // query 2 — mesma query!
```

**Problema:** O estado conversacional é consultado duas vezes no mesmo fluxo de processamento de mensagem. Além do custo extra de I/O, há risk de race condition se o estado mudar entre as duas chamadas.

**Como corrigir:**
```typescript
// Reutilizar o estado já carregado:
const estadoAtual = await obterEstado(telefoneLimpo);
// ... lógica ...
// Mais adiante, usar estadoAtual em vez de chamar obterEstado() novamente
if (estadoAtual?.etapa === EtapaConversa.AGUARDANDO_PEDIDO) { ... }
```

---

### QA-006 — BAIXO | ❌ [PENDENTE] `console.log` no `apiLogout` do Frontend

**Arquivo:** `frontend/src/servicos/apiAutenticacao.js`, linha 27

```javascript
export const apiLogout = () => {
  console.log('Logout realizado, token removido.'); // Debug em produção
  return Promise.resolve();
};
```

**Problema:** Log de debug esquecido no código de produção. Além de poluir o console do usuário, revela detalhes da implementação.

**Como corrigir:**
```javascript
export const apiLogout = () => Promise.resolve();
```

---

## 🔵 Time de PO (PO) VER E CORRIGIR ISSO DEPOIS !!!!!!!!!!!!!!!!!!

### PO-001 — ALTO | ❌ [PENDENTE] Bot WhatsApp Cria Pedido "Placeholder" sem Interpretar Quantidade

**Arquivo:** `backend/src/services/whatsapp.service.ts`, linhas 463-515  

**Problema:**  
O bot recebe mensagens como "50 coxinhas e 30 risoles" mas **não interpreta as quantidades nem os produtos**. Cria um pedido placeholder com o primeiro produto ativo disponível (quantidade = 1) e salva o texto nas observações para resolução manual. Isso gera uma experiência ruim para o cliente (que pensa que o pedido foi entendido) e retrabalho para o atendente.

**Impacto no negócio:** Pedidos incorretos, insatisfação do cliente, processos manuais que eliminam o valor da automação.

**Recomendação de produto:**  
- Implementar parsing simples de quantidades e produtos com dicionário de sinônimos (ex: "coxinha" → produto ID 1).
- Ou enviar cardápio numerado e pedir que o cliente selecione por número.
- Ou integrar com LLM (ex: GPT-3.5) para interpretação de linguagem natural.
- Comunicar claramente ao cliente que o pedido será confirmado manualmente se não for interpretado.

---

### PO-002 — ALTO | ❌ [PENDENTE] Ausência de Fluxo de Cancelamento de Pedido

**Arquivo:** `backend/src/routes/index.ts` — ausência de rota de cancelamento

**Problema:** Não existe nenhuma rota ou fluxo para cancelamento de pedido (nem pelo cliente via WhatsApp, nem pelo atendente no painel). O status `Cancelado (6)` existe nos enums mas não é acessível via UI ou bot.

**Recomendação:**  
- Adicionar ação "Cancelar" no painel administrativo para pedidos com status Pendente/EmProducao.
- Notificar cliente via WhatsApp quando pedido for cancelado.
- No bot, permitir que cliente cancele pedido antes de entrar em produção.

---

### PO-003 — MÉDIO | ❌ [PENDENTE] Limite de 900 Itens para Liberar Lote não é Configurável

**Arquivo:** `backend/src/services/pedido.service.ts`, comentário linha 234

```typescript
// A lógica de "lote" define que o motoboy só pode sair quando >= 900 itens.
```

**Problema:** A regra de negócio de 900 itens por lote está documentada em comentário mas o valor não é configurável via banco de dados ou variável de ambiente. Qualquer mudança exige alteração de código.

**Recomendação:**
- Criar tabela `configuracoes` com chave-valor para parâmetros do negócio.
- Ou adicionar `LOTE_MINIMO_ITENS=900` nas variáveis de ambiente.

---

### PO-004 — MÉDIO | ❌ [PENDENTE] Sem Feedback de Progresso no Onboarding WhatsApp

**Arquivo:** `backend/src/services/whatsapp.service.ts`, linhas 541-625

**Problema:** O fluxo de onboarding não informa ao cliente em qual etapa ele está nem quantas etapas faltam. Se o cliente abandonar e retornar, não há timeout do estado conversacional — ele ficará preso no onboarding indefinidamente.

**Recomendação:**
- Adicionar mensagem de progresso: "Etapa 1 de 2: Seu nome".
- Implementar TTL no estado conversacional (ex: estado expira em 30 minutos sem resposta).

---

## 🟣 Time de PM (PM)

### PM-001 — ALTO | ❌ [PENDENTE] Versionamento da API Ausente

**Arquivo:** `backend/src/routes/index.ts`

**Problema:** Todas as rotas seguem o padrão `/api/entidade`, sem versão de API (ex: `/api/v1/entidade`). Sem versionamento, qualquer mudança breaking na API quebrará todos os clientes (frontend e bot WhatsApp) sem possibilidade de migração gradual.

**Recomendação:**  
```typescript
// Adicionar prefixo de versão:
app.use('/api/v1', routes); // no server.ts
// Todas as rotas são automaticamente prefixadas com /api/v1/
```

---

### PM-002 — MÉDIO | ❌ [PENDENTE] Nenhum Monitoramento ou Observabilidade Implementado

**Problema:** A aplicação não tem métricas, tracing ou alertas. Falhas em produção são descobertas pelos usuários, não pelo time de tecnologia. Não há dashboards de health, SLA ou error rate.

**Recomendação:**
- Implementar endpoint `/health` com status de banco e WhatsApp.
- Integrar com serviço de monitoramento (ex: BetterStack, Datadog, Sentry gratuito).
- Configurar alertas de erro no Supabase.

```typescript
app.get('/health', async (req, res) => {
  const dbOk = await testarConexao();
  const waOk = getSocket() !== null;
  
  res.status(dbOk ? 200 : 503).json({
    status: dbOk ? 'healthy' : 'degraded',
    database: dbOk ? 'connected' : 'disconnected',
    whatsapp: waOk ? 'connected' : 'disconnected',
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
  });
});
```

---

### PM-003 — MÉDIO | ❌ [PENDENTE] Ausência de CHANGELOG e Processo de Release

**Problema:** Não existe `CHANGELOG.md`, nenhuma tag de versão no Git, nenhum processo documentado de release. Impossível responder "qual versão está em produção?" ou "o que mudou desde a última semana?".

**Recomendação:**
- Adotar Conventional Commits (`feat:`, `fix:`, `chore:`).
- Usar `standard-version` ou `release-please` para gerar CHANGELOG automaticamente.
- Criar tags semânticas (`git tag v1.0.0`) a cada release.

---

### PM-004 — BAIXO | ❌ [PENDENTE] Documentação Técnica Desatualizada

**Arquivo:** `backend/MIGRACAO_NODEJS.md` (30KB)

**Problema:** Existe um arquivo extenso de migração de .NET para Node.js que provavelmente descreve o estado ANTERIOR da aplicação, não o atual. Esse documento cria confusão sobre a arquitetura real.

**Recomendação:**
- Arquivar `MIGRACAO_NODEJS.md` em pasta `docs/historico/`.
- Criar `docs/ARQUITETURA.md` descrevendo o estado atual.
- Manter `README.md` como ponto de entrada único e atualizado.

---

## ⚫ Time de Desenvolvedores Seniores (DEV)

### DEV-001 — ALTO | ❌ [PENDENTE] Dependência Circular Entre Services (require() Lazy)

**Arquivo:** `backend/src/services/whatsapp.service.ts`, linhas 148-152

```typescript
const { getSocket, resolverJidParaEnvio } = require('./baileys.service') as {
  getSocket: () => WASocket | null;
  resolverJidParaEnvio: (jid: string) => string;
};
```

**Problema:** `whatsapp.service` importa `baileys.service` via `require()` dinâmico para evitar dependência circular (`baileys.service` importa `whatsapp.service`). Essa solução é um code smell que esconde um problema de arquitetura: os dois serviços estão acoplados bidirecionalmente.

**Como corrigir (refactoring recomendado):**

Extrair as funções compartilhadas para um módulo sem dependências:

```
services/
  jid-resolver.service.ts  ← novo: getSocket + resolverJidParaEnvio
  baileys.service.ts        ← importa: jid-resolver.service
  whatsapp.service.ts       ← importa: jid-resolver.service (não mais baileys)
```

---

### DEV-002 — ALTO | ✅ [FEITO] Frontend em JavaScript Puro sem TypeScript

**Arquivos:** `frontend/src/servicos/*.js`, `frontend/src/paginas/**/*.jsx`

**Problema:** O backend usa TypeScript para segurança de tipos; o frontend usa JavaScript puro (`.js/.jsx`). Isso cria inconsistência, perda de tipos nas chamadas de API, e dificulta refactoring seguro.

**Como corrigir:**
```bash
npm install -D typescript @types/react @types/react-dom
npx tsc --init  # no diretório frontend
```
Renomear arquivos `.js` → `.ts` e `.jsx` → `.tsx` incrementalmente.
Adicionar ao `vite.config.js`:
```javascript
export default { resolve: { extensions: ['.tsx', '.ts', '.jsx', '.js'] } }
```

---

### DEV-003 — ALTO | ✅ [FEITO] Falta de Paginação no WhatsApp Service

**Arquivo:** `backend/src/services/whatsapp.service.ts`, linha 244

```typescript
const { data: clientes, error } = await supabase.from('clientes').select('*');
```

**Já mencionado em DBA-002**, mas do ponto de vista do desenvolvedor: a função `buscarClientePorTelefone` não tem limite (`limit()`) na query. O Supabase tem um limite padrão de 1000 registros por query. Com mais de 1000 clientes, clientes acima do limite simplesmente não serão encontrados, causando re-cadastros duplicados silenciosamente.

---

### DEV-004 — MÉDIO | ✅ [FEITO] `any` como `req as any` Contorna Type Safety do Express

**Arquivo:** `backend/src/middlewares/validate.middleware.ts`, linha 16

```typescript
(req as any)[source] = parsed;
```

**Problema:** O cast `as any` é necessário porque o TypeScript não permite sobrescrever `req.body`/`req.query` diretamente. Há uma forma tipada de fazer isso.

**Como corrigir:**
```typescript
// Usar Object.assign para evitar o cast:
Object.assign(req, { [source]: parsed });
```

---

### DEV-005 — MÉDIO | ❌ [PENDENTE] Ausência de Variável de Ambiente no Frontend

**Arquivo:** `frontend/src/servicos/api.js`, linha 5

```javascript
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000';
```

**Arquivo:** `frontend/.env.example`

```
VITE_API_BASE_URL=http://localhost:3000
```

**Problema:** O `.env.example` existe mas só tem uma variável. O fallback hardcoded para `localhost:3000` garante que o frontend suba sem configuração, mas em produção silenciosamente apontará para o servidor errado se a variável não for configurada.

**Como corrigir:**
```javascript
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;
if (!API_BASE_URL) {
  console.error('VITE_API_BASE_URL não configurado! Configure o .env do frontend.');
}
```

---

### DEV-006 — MÉDIO | ✅ [FEITO] Mapa LID↔Telefone em Memória Não Persiste Entre Restarts

**Arquivo:** `backend/src/services/baileys.service.ts`, linhas 34-35

```typescript
const lidParaPhone = new Map<string, string>();
const phoneParaLid = new Map<string, string>();
```

**Problema:** O mapeamento LID↔Telefone é mantido apenas em memória. A cada restart do servidor (deploy, crash), o mapa é perdido. O WhatsApp precisa re-sincronizar os contatos para popular o mapa novamente, causando falhas temporárias de envio de mensagens.

**Como corrigir:**  
Persistir o mapa no banco de dados (já que `whatsapp_jid` e `whatsapp_lid` existem na tabela `clientes`). A sincronização atual já faz isso parcialmente em `salvarJidCliente()`, mas o mapa em memória deveria ser aquecido na inicialização consultando o banco:

```typescript
async function aquecerMapaLid(): Promise<void> {
  const { data } = await supabase
    .from('clientes')
    .select('whatsapp_jid, whatsapp_lid')
    .not('whatsapp_lid', 'is', null)
    .not('whatsapp_jid', 'is', null);

  for (const c of data || []) {
    lidParaPhone.set(c.whatsapp_lid, c.whatsapp_jid);
    phoneParaLid.set(c.whatsapp_jid, c.whatsapp_lid);
  }
  console.log(`[Baileys] Mapa LID↔Telefone aquecido com ${lidParaPhone.size} entradas.`);
}
// Chamar após conexão: sock.ev.on('connection.update', ...)
```

---

### DEV-007 — MÉDIO | ✅ [FEITO] Rota de Deletar Cliente Permite Exclusão com Verificação Insuficiente

**Arquivo:** `backend/src/services/cliente.service.ts`, linhas 126-137

```typescript
const { count } = await supabase
  .from('pedidos')
  .select('id', { count: 'exact', head: true })
  .eq('cliente_id', id);

if (count && count > 0) { return { sucesso: false, mensagemErro: '...' }; }
```

**Problema:** A verificação verifica existência de pedidos mas não trata o cenário em que `count` é `null` (erro de query). Se houver falha na query de contagem, `count` será `null`, a condição `if (count && count > 0)` será `false`, e o cliente será deletado mesmo podendo ter pedidos.

**Como corrigir:**
```typescript
const { count, error: countError } = await supabase
  .from('pedidos').select('id', { count: 'exact', head: true }).eq('cliente_id', id);

if (countError) throw new Error(`Erro ao verificar pedidos: ${countError.message}`);
if (count !== null && count > 0) {
  return { sucesso: false, mensagemErro: 'Cliente com pedidos não pode ser excluído.' };
}
```

---

### DEV-008 — BAIXO | ❌ [PENDENTE] Senha com Validação Fraca no DTO

**Arquivo:** `backend/src/dtos/usuario.dto.ts` (a verificar)

**Problema:** A validação Zod provavelmente aceita senhas muito simples (ex: "123"). Usuários administradores devem ter senhas fortes.

**Como corrigir:**
```typescript
import { z } from 'zod';

const SenhaSchema = z.string()
  .min(8, 'Senha deve ter pelo menos 8 caracteres')
  .regex(/[A-Z]/, 'Senha deve ter pelo menos uma letra maiúscula')
  .regex(/[0-9]/, 'Senha deve ter pelo menos um número')
  .regex(/[^A-Za-z0-9]/, 'Senha deve ter pelo menos um caractere especial');
```

---

### DEV-009 — BAIXO | ✅ [FEITO] Código de Produção com Comentários de Migração

**Múltiplos arquivos:**  
`auth.service.ts` linha 11: `// Equivale a AuthService.LoginAsync() do C#`  
`server.ts` linha 17: `// CORS — equivale ao AddCors / UseCors("AllowFrontend") do .NET`  
`auth.middleware.ts` linha 59: `// Equivale ao [Authorize(Roles = "Administrador")] do ASP.NET`

**Problema:** Comentários de referência à migração do .NET são úteis durante a migração mas poluem o código final. Não há valor em produção e confundem novos desenvolvedores que não conhecem o contexto.

**Como corrigir:**  
Remover comentários de referência ao .NET após validação da migração. Manter comentários de contexto de negócio.

---

## 📊 Resumo Executivo

### Matriz de Severidade

| ID | Área | Severidade | Título |
|---|---|---|---|
| ✅ SEC-001 | Segurança | 🔴 CRÍTICO | Credenciais reais no repositório |
| ✅ SEC-002 | Segurança | 🔴 CRÍTICO | JWT Key inseguro |
| ❌ DBA-001 | DBA | 🔴 CRÍTICO | Ausência de transações atômicas |
| ❌ QA-001 | QA | 🔴 CRÍTICO | Zero testes automatizados |
| ✅ SEC-003 | Segurança | 🔴 ALTO | Sem rate limiting no login |
| ✅ SEC-004 | Segurança | 🔴 ALTO | Webhook sem autenticação |
| ✅ SEC-005 | Segurança | 🟠 ALTO | Telefone admin hardcoded |
| ✅ DBA-002 | DBA | 🟠 ALTO | Full table scan em clientes (WhatsApp) |
| ❌ DBA-003 | DBA | 🟠 ALTO | Dashboard processa dados em memória |
| ❌ DEV-001 | Dev | 🟠 ALTO | Dependência circular entre services |
| ❌ PO-001 | PO | 🟠 ALTO | Bot não interpreta pedidos |
| ❌ PO-002 | PO | 🟠 ALTO | Sem fluxo de cancelamento |
| ❌ PM-001 | PM | 🟠 ALTO | API sem versionamento |
| ❌ INFRA-001 | Infra | 🟠 ALTO | Sem Docker/containerização |
| ❌ SEC-006 | Segurança | 🟡 MÉDIO | Token em localStorage |
| ✅ SEC-007 | Segurança | 🟡 MÉDIO | Sem headers HTTP de segurança |
| ❌ DBA-004 | DBA | 🟡 MÉDIO | Sem índices nas colunas de filtro |
| ✅ DEV-002 | Dev | 🟡 MÉDIO | Frontend sem TypeScript |
| ✅ DEV-006 | Dev | 🟡 MÉDIO | Mapa LID em memória perde dados no restart |
| ❌ QA-002 | QA | 🟡 MÉDIO | Sem validação de resposta da API no frontend |
| ❌ QA-003 | QA | 🟡 MÉDIO | Uso excessivo de `any` |
| ❌ PM-002 | PM | 🟡 MÉDIO | Sem monitoramento/observabilidade |
| ❌ SEC-008 | Segurança | 🟢 BAIXO | Logs com dados pessoais |
| ✅ DEV-009 | Dev | 🟢 BAIXO | Comentários de migração no código |

---

### Prioridade de Execução

**Sprint 0 — Segurança Crítica (Esta Semana):**
1. ✅ Rotacionar TODAS as credenciais (Supabase + JWT)
2. ✅ Remover `.env` do Git / configurar secrets
3. ✅ Adicionar rate limiting no `/api/auth/login`
4. ✅ Proteger webhook WhatsApp com token
5. ✅ Mover `ADMIN_JID` para variável de ambiente
6. ✅ Adicionar `helmet.js` ao servidor

**Sprint 1 — Qualidade e Estabilidade (2-3 semanas):**
1. Implementar transações atômicas no Supabase (RPC)
2. Corrigir full table scan em `buscarClientePorTelefone`
3. Criar índices no banco de dados
4. Escrever testes mínimos (auth, pedidos, clientes)
5. Adicionar endpoint `/health`

**Sprint 2 — Melhorias de Produto (4-6 semanas):**
1. Implementar interpretação básica de pedidos no bot
2. Adicionar fluxo de cancelamento
3. Migrar frontend para TypeScript
4. Implementar soft delete com auditoria
5. Adicionar versionamento da API (`/api/v1`)
6. Containerizar com Docker

---

*Documento gerado em 07/03/2026. Deve ser revisado após cada sprint de correções.*
