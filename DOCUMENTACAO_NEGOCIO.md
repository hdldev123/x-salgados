# X Salgados — Documentação de Negócio

> **Sistema de Gestão de Pedidos para Lanchonete**
> **Versão:** 1.0 | **Data:** Março de 2026
> **Documento destinado à apresentação para banca avaliadora**

---

## 1. Resumo Executivo

O **X Salgados** é um sistema web completo para gestão operacional de uma lanchonete, desenvolvido para substituir processos manuais (cadernos, planilhas, WhatsApp) por um fluxo digital centralizado, seguro e acessível de qualquer dispositivo com navegador.

O sistema cobre o **ciclo operacional completo**: cadastro de clientes e produtos, criação e acompanhamento de pedidos, organização de rotas de entrega e painel gerencial com indicadores de desempenho (KPIs).

---

## 2. Problema Identificado

Lanchonetes de pequeno e médio porte enfrentam desafios recorrentes na gestão diária:

| Problema | Consequência |
|---|---|
| Pedidos anotados em papel ou caderno | Perda de informações, erros de leitura, dificuldade de rastrear histórico |
| Controle financeiro em planilhas | Dados desatualizados, cálculos manuais propensos a erro |
| Comunicação com entregadores por WhatsApp | Falta de organização, pedidos esquecidos, rotas ineficientes |
| Preços registrados manualmente | Inconsistências entre pedido e cardápio, perda de receita |
| Sem visibilidade gerencial | Decisões baseadas em "achismo", sem dados concretos |
| Acesso indiscriminado a funcionalidades | Qualquer funcionário pode alterar qualquer coisa |

---

## 3. Solução Proposta

Um sistema web com dois módulos integrados:

### 3.1 Backend — API REST

Servidor responsável por toda a lógica de negócio, segurança e acesso ao banco de dados. Processa requisições do frontend, valida dados, aplica regras de negócio e retorna respostas padronizadas.

### 3.2 Frontend — Aplicação Web (SPA)

Interface visual acessível via navegador, projetada para ser intuitiva e eficiente. Cada tipo de funcionário vê apenas as telas e funcionalidades relevantes ao seu papel.

---

## 4. Perfis de Usuário

O sistema implementa **controle de acesso baseado em papéis (RBAC)** com três perfis:

### Administrador
- **Quem usa:** Dono(a) da lanchonete ou gestor(a)
- **O que faz:**
  - Visualiza o Dashboard com KPIs e gráficos
  - Gerencia todo o catálogo de produtos (criar, editar, ativar/desativar)
  - Gerencia clientes (cadastro completo)
  - Cria e acompanha pedidos
  - Gerencia usuários do sistema (criar contas, definir perfis, alterar senhas)
  - Acessa rotas de entrega

### Atendente
- **Quem usa:** Funcionário(a) que recebe pedidos (balcão, telefone)
- **O que faz:**
  - Cria e acompanha pedidos
  - Cadastra e edita clientes
  - Consulta o cardápio de produtos (sem poder alterar preços)
  - Atualiza o status dos pedidos conforme o andamento (Pendente → Em Produção → Pronto → etc.)

### Entregador
- **Quem usa:** Funcionário(a) responsável pelas entregas
- **O que faz:**
  - Visualiza as rotas de entrega do dia
  - Marca pedidos como "A caminho" ao iniciar a rota
  - Confirma a entrega ao finalizar cada pedido

---

## 5. Funcionalidades do Sistema

### 5.1 Autenticação e Segurança

| Funcionalidade | Descrição |
|---|---|
| Login com email e senha | Tela de entrada com validação de credenciais |
| Senhas criptografadas | Senhas armazenadas com algoritmo bcrypt (irreversível) |
| Token de sessão (JWT) | Após login, o sistema gera um token temporário que identifica o usuário |
| Logout automático | Se o token expirar, o usuário é redirecionado para o login |
| Controle de acesso | Cada perfil só acessa as telas e operações permitidas |

### 5.2 Dashboard Gerencial

Tela exclusiva do Administrador com visão consolidada do negócio:

| Indicador | O que mostra |
|---|---|
| Pedidos Hoje | Quantidade de pedidos criados no dia atual |
| Receita Hoje | Valor dos pedidos entregues no dia |
| Total de Clientes | Quantidade total de clientes cadastrados |
| Pedidos Pendentes | Pedidos que ainda não foram entregues (em qualquer etapa) |
| Receita Total | Soma de todos os pedidos já entregues |
| Gráfico de Vendas | Evolução mensal de pedidos e receita nos últimos 6 meses |
| Distribuição de Status | Percentual de pedidos em cada status |

### 5.3 Gestão de Produtos

| Operação | Descrição |
|---|---|
| Cadastrar produto | Nome, categoria, descrição, preço, status ativo/inativo |
| Editar produto | Atualizar qualquer informação, inclusive desativar |
| Excluir produto | Remover do catálogo (bloqueado se vinculado a pedidos) |
| Categorias automáticas | As categorias são extraídas dos próprios produtos — não há cadastro separado |
| Filtrar por categoria | Visualizar produtos agrupados por tipo |
| Produtos inativos | Produtos desativados não podem ser adicionados a novos pedidos, mas permanecem no histórico |

### 5.4 Gestão de Clientes

| Operação | Descrição |
|---|---|
| Cadastrar cliente | Nome (obrigatório), telefone (obrigatório), email, endereço, cidade, CEP |
| Editar cliente | Atualizar qualquer informação |
| Excluir cliente | Só é possível se o cliente não tiver pedidos vinculados |
| Buscar cliente | Pesquisa por nome, telefone ou email |
| Total de pedidos | Cada cliente mostra quantos pedidos já fez |

### 5.5 Gestão de Pedidos

#### Criação de Pedido
1. Selecionar um cliente cadastrado
2. Adicionar produtos ao pedido (indicando quantidade)
3. Opcionalmente definir data de entrega e observações
4. O sistema **calcula o valor total automaticamente** usando os preços do banco de dados
5. O preço de cada produto é **congelado** no momento da venda (snapshot) — se o preço mudar depois, o pedido antigo mantém o valor original

#### Ciclo de Vida do Pedido

```
  ┌──────────┐    ┌──────────────┐    ┌─────────┐    ┌────────────┐    ┌──────────┐
  │ Pendente │ ──→│ Em Produção  │ ──→│  Pronto │ ──→│ Em Entrega │ ──→│ Entregue │
  └──────────┘    └──────────────┘    └─────────┘    └────────────┘    └──────────┘
       │                │                  │                │
       └────────────────┴──────────────────┴────────────────┘
                                │
                           ┌────▼─────┐
                           │Cancelado │
                           └──────────┘
```

| Status | Significado |
|---|---|
| **Pendente** | Pedido recebido, aguardando início da produção |
| **Em Produção** | Cozinha está preparando o pedido |
| **Pronto** | Pedido finalizado, aguardando retirada ou entrega |
| **Em Entrega** | Entregador saiu com o pedido |
| **Entregue** | Cliente recebeu o pedido (registra data/hora automaticamente) |
| **Cancelado** | Pedido foi cancelado (pode ocorrer em qualquer etapa) |

#### Visualizações do Pedido
- **Tabela:** Lista tradicional com todos os pedidos, filtros por status e período
- **Kanban:** Quadro visual com 3 colunas (Pendente, Em Produção, Pronto). Permite alterar status arrastando ou via dropdown

### 5.6 Rotas de Entrega

Tela dedicada ao perfil **Entregador** para organizar as entregas do dia:

| Funcionalidade | Descrição |
|---|---|
| Agrupamento automático | Pedidos prontos são organizados em rotas de até 10 pedidos |
| Informações da rota | CEPs, quantidade de pedidos, valor total |
| Iniciar rota | Marca todos os pedidos como "Em Entrega" com um clique |
| Confirmar entrega | Marca cada pedido individualmente como "Entregue" |
| Recarregamento automático | A tela atualiza após cada ação |

### 5.7 Gestão de Usuários

| Operação | Descrição |
|---|---|
| Listar usuários | Nome, email e perfil de cada funcionário |
| Criar usuário | Definir nome, email, senha e perfil (Admin/Atendente/Entregador) |
| Alterar senha | Exige a senha atual como confirmação |
| Excluir usuário | O administrador não pode excluir a si mesmo |

---

## 6. Arquitetura Técnica

### 6.1 Visão Geral

```
┌─────────────────────────────────────────────────────────┐
│                   NAVEGADOR (Frontend)                   │
│              React · Vite · localhost:5173                │
└─────────────────────┬───────────────────────────────────┘
                      │ HTTP + JWT Bearer Token
┌─────────────────────▼───────────────────────────────────┐
│               SERVIDOR API (Backend)                     │
│         Node.js · Express · TypeScript · JWT             │
│              localhost:3000                               │
├─────────────────────────────────────────────────────────┤
│  Middlewares: CORS → Auth → Validação → Rotas → Erros   │
│  Camadas:    Controllers → Services → Supabase Client   │
└─────────────────────┬───────────────────────────────────┘
                      │ PostgREST API (HTTPS)
┌─────────────────────▼───────────────────────────────────┐
│              BANCO DE DADOS (PostgreSQL)                  │
│                     Supabase Cloud                        │
│  Tabelas: usuarios, clientes, produtos, pedidos,         │
│           itens_pedido                                    │
└─────────────────────────────────────────────────────────┘
```

### 6.2 Tecnologias Utilizadas

| Camada | Tecnologia | Justificativa |
|---|---|---|
| **Frontend** | React 18 | Biblioteca mais popular para SPAs, grande ecossistema, documentação abundante |
| **Frontend** | Vite 5 | Build tool moderna, hot reload instantâneo, mais rápido que Webpack |
| **Frontend** | React Router 6 | Roteamento SPA padrão da comunidade React |
| **Frontend** | Recharts | Gráficos declarativos integrados ao React |
| **Frontend** | Axios | HTTP client com interceptors para JWT e tratamento de erros |
| **Frontend** | CSS puro | Simplicidade, sem curva de aprendizado extra |
| **Backend** | Node.js + TypeScript | Tipagem estática reduz bugs, ecossistema npm maduro |
| **Backend** | Express 4 | Framework HTTP minimalista e flexível, padrão da indústria |
| **Backend** | Zod | Validação de dados com inferência de tipos automática |
| **Backend** | bcrypt | Algoritmo de hashing de senhas com salt automático e fator de trabalho ajustável |
| **Backend** | JWT | Tokens stateless para autenticação sem armazenar sessão no servidor |
| **Backend** | Swagger/OpenAPI | Documentação interativa da API gerada automaticamente |
| **Banco** | PostgreSQL (Supabase) | Banco relacional robusto, hospedado na nuvem com backups automáticos |

### 6.3 Modelo de Dados

O banco possui **5 tabelas** com relacionamentos claros:

```
┌───────────────┐          ┌───────────────┐          ┌───────────────┐
│   USUÁRIOS    │          │   CLIENTES    │          │   PRODUTOS    │
├───────────────┤          ├───────────────┤          ├───────────────┤
│ id            │          │ id            │          │ id            │
│ nome          │          │ nome          │          │ nome          │
│ email (único) │          │ telefone      │          │ categoria     │
│ senha (hash)  │          │ email         │          │ descrição     │
│ perfil        │          │ endereço      │          │ preço         │
│ ativo         │          │ cidade        │          │ ativo         │
│ data criação  │          │ cep           │          │ data criação  │
└───────────────┘          │ data criação  │          └───────┬───────┘
                           └───────┬───────┘                  │
                                   │ 1:N                      │ 1:N
                           ┌───────▼───────┐          ┌───────▼───────┐
                           │    PEDIDOS    │   1:N    │ ITENS PEDIDO  │
                           ├───────────────┤ ────────→├───────────────┤
                           │ id            │          │ id            │
                           │ cliente_id    │          │ pedido_id     │
                           │ data criação  │          │ produto_id    │
                           │ data entrega  │          │ quantidade    │
                           │ valor total   │          │ preço snapshot│
                           │ status        │          └───────────────┘
                           │ observações   │
                           └───────────────┘
```

**Regras de integridade:**
- Um cliente pode ter vários pedidos, mas não pode ser excluído se tiver pedidos
- Um pedido tem pelo menos um item; excluir o pedido remove automaticamente seus itens
- Um produto pode estar em vários itens, mas não pode ser excluído se estiver vinculado

---

## 7. Segurança do Sistema

### 7.1 Medidas Implementadas

| Medida | Como funciona |
|---|---|
| **Senhas criptografadas** | Senhas são transformadas com bcrypt (12 rounds de salt). Mesmo que o banco seja comprometido, as senhas não podem ser recuperadas |
| **Autenticação por token (JWT)** | Após login, o servidor gera um token assinado digitalmente (HMAC-SHA256). Este token identifica o usuário sem necessidade de manter sessão no servidor |
| **Controle de acesso por perfil** | Cada endpoint da API verifica se o perfil do usuário (Admin/Atendente/Entregador) tem permissão para executar aquela operação |
| **Validação de dados** | Toda entrada do usuário é validada antes de ser processada — tipos, tamanhos, formatos e obrigatoriedade |
| **Preço calculado pelo servidor** | O valor total do pedido é **sempre calculado pelo backend** com base nos preços do banco de dados, nunca aceita valor vindo do navegador |
| **Snapshot de preço** | O preço de cada produto é congelado no momento da venda, garantindo integridade do histórico financeiro |
| **CORS configurado** | Apenas origens autorizadas podem acessar a API |
| **Proteção contra auto-exclusão** | O administrador não pode excluir sua própria conta |
| **Tratamento de erros** | Em produção, erros internos não expõem detalhes técnicos ao usuário |

### 7.2 Fluxo de Autenticação

```
1. Usuário digita email e senha no formulário de login
2. Frontend envia credenciais para a API (POST /api/auth/login)
3. Backend busca o usuário no banco pelo email
4. Backend compara a senha informada com o hash armazenado (bcrypt)
5. Se válido, gera um token JWT com dados do usuário (id, nome, email, perfil)
6. Frontend armazena o token e o envia em toda requisição subsequente
7. Cada requisição é verificada: token válido? Não expirou? Perfil autorizado?
8. Se inválido → resposta 401 (não autenticado) e redirecionamento para login
```

---

## 8. Fluxo Operacional

### 8.1 Cenário: Dia típico de uma lanchonete

```
MANHÃ — Administrador abre o Dashboard
  │
  ├── Verifica KPIs: pedidos do dia anterior, receita, pedidos pendentes
  ├── Consulta gráfico de vendas dos últimos 6 meses
  └── Se necessário, atualiza cardápio (preços, produtos novos, desativar itens)

DURANTE O DIA — Atendente recebe pedidos
  │
  ├── Cliente liga pedindo salgados para entrega
  ├── Atendente busca ou cadastra o cliente
  ├── Cria o pedido: seleciona produtos, define quantidade
  ├── Sistema calcula valor total automaticamente
  ├── Pedido entra como "Pendente" no Kanban
  ├── Cozinha inicia → Atendente muda para "Em Produção"
  └── Cozinha finaliza → Atendente muda para "Pronto"

ENTREGAS — Entregador organiza a rota
  │
  ├── Acessa tela de Rotas de Entrega
  ├── Vê pedidos prontos agrupados automaticamente
  ├── Clica "Iniciar Rota" → todos ficam "Em Entrega"
  ├── Chega em cada cliente → marca "Entregue" individualmente
  └── Data/hora da entrega é registrada automaticamente

FIM DO DIA — Administrador consulta resultados
  │
  ├── Dashboard mostra receita do dia
  ├── Verifica se há pedidos pendentes
  └── Dados ficam armazenados para análise futura
```

### 8.2 Diagrama de Interação entre Perfis

```
┌─────────────────┐        ┌─────────────────┐        ┌─────────────────┐
│  ADMINISTRADOR  │        │   ATENDENTE     │        │  ENTREGADOR     │
├─────────────────┤        ├─────────────────┤        ├─────────────────┤
│ • Dashboard     │        │ • Cria pedidos  │        │ • Vê rotas      │
│ • Gerencia      │        │ • Cadastra      │        │ • Inicia rota   │
│   produtos      │        │   clientes      │        │ • Confirma      │
│ • Gerencia      │        │ • Atualiza      │        │   entregas      │
│   usuários      │        │   status        │        │                 │
│ • Vê tudo       │        │                 │        │                 │
└────────┬────────┘        └────────┬────────┘        └────────┬────────┘
         │                          │                          │
         └──────────────────────────┴──────────────────────────┘
                                    │
                            ┌───────▼───────┐
                            │   SISTEMA     │
                            │  (Banco de    │
                            │   Dados)      │
                            └───────────────┘
```

---

## 9. Decisões Técnicas e Justificativas

### 9.1 Por que Node.js/TypeScript em vez de outra linguagem?

| Critério | Justificativa |
|---|---|
| **Produtividade** | JavaScript/TypeScript é a linguagem mais usada na web; manter frontend e backend na mesma linguagem reduz a troca de contexto |
| **Ecossistema** | npm é o maior repositório de pacotes open-source do mundo |
| **Tipagem** | TypeScript adiciona segurança de tipos em tempo de compilação sem sacrificar a flexibilidade do JavaScript |
| **Performance** | Node.js com Express é suficiente para sistemas de pequeno/médio porte com dezenas de usuários simultâneos |

### 9.2 Por que Supabase em vez de banco local?

| Critério | Justificativa |
|---|---|
| **Hospedagem gratuita** | Plano free do Supabase inclui PostgreSQL gerenciado na nuvem |
| **Sem infraestrutura** | Não precisa configurar servidor de banco de dados |
| **Backups automáticos** | Dados protegidos sem configuração adicional |
| **API PostgREST** | Acesso ao banco via API HTTP, reduzindo complexidade de drivers |

### 9.3 Por que Zod em vez de validação manual?

| Critério | Justificativa |
|---|---|
| **Type-safe** | Schemas Zod geram automaticamente os tipos TypeScript |
| **Mensagens em português** | Mensagens de erro customizáveis por campo |
| **Composição** | Schemas podem ser combinados e reutilizados |
| **Swagger automático** | zod-to-json-schema gera documentação OpenAPI a partir dos schemas |

### 9.4 Por que CSS puro no frontend?

| Critério | Justificativa |
|---|---|
| **Pedagogia** | Projeto didático voltado para desenvolvedores juniores aprenderem fundamentos |
| **Simplicidade** | Sem curva de aprendizado de frameworks CSS (Tailwind, Styled Components) |
| **Manutenção** | Arquivos CSS por componente mantêm o escopo visual organizado |

### 9.5 Por que JWT customizado em vez de Supabase Auth?

| Critério | Justificativa |
|---|---|
| **Controle total** | Permite definir claims, expiração e lógica de perfis sob medida |
| **Independência** | Não acopla a autenticação a um serviço específico |
| **Educacional** | Demonstra implementação real de autenticação JWT |

---

## 10. Regras de Negócio Principais

### 10.1 Integridade Financeira

1. **O preço nunca vem do navegador:** O servidor sempre busca o preço atual do produto no banco de dados para calcular o valor total
2. **Preço congelado (snapshot):** No momento da criação do pedido, o preço de cada produto é salvo no item. Se o preço mudar depois, pedidos antigos mantêm o valor original
3. **Exemplo prático:** Se um X-Salada custa R$15,00 hoje mas amanhã sobe para R$18,00, todos os pedidos feitos hoje exibirão R$15,00 no histórico

### 10.2 Proteções de Exclusão

1. **Clientes com pedidos:** Não podem ser excluídos. O sistema retorna erro explicando o motivo
2. **Produtos vinculados:** Não podem ser excluídos se fazem parte de algum pedido
3. **Auto-exclusão:** O administrador não pode excluir sua própria conta

### 10.3 Ciclo de Status

1. O pedido nasce como **Pendente**
2. O status avança sequencialmente até **Entregue**
3. Qualquer pedido pode ser **Cancelado** a qualquer momento (exceto se já entregue)
4. Quando o pedido é marcado como **Entregue**, a data e hora são registradas automaticamente

---

## 11. Telas do Sistema

### 11.1 Login
- Formulário com email e senha
- Validação em tempo real
- Redirecionamento automático por perfil após autenticação

### 11.2 Dashboard (Administrador)
- 4 cards com KPIs do negócio
- Gráfico de linhas mostrando evolução de vendas nos últimos 6 meses
- Dados atualizados em tempo real ao carregar a página

### 11.3 Pedidos (Administrador / Atendente)
- **Vista Tabela:** Lista com colunas (ID, Cliente, Data, Status, Total), dropdown para alterar status
- **Vista Kanban:** 3 colunas visuais (Pendente → Em Produção → Pronto) com cards de pedido
- Indicadores rápidos: total de pedidos, pendentes, em produção, prontos

### 11.4 Clientes (Administrador / Atendente)
- Tabela com nome, email, telefone
- Botões de editar e excluir por linha
- Modal de formulário para criar e editar
- Confirmação antes de excluir

### 11.5 Produtos (Administrador)
- Tabela com nome, preço, descrição
- Modal de formulário para criar e editar
- Exclusão com confirmação

### 11.6 Usuários (Administrador)
- Lista de todos os funcionários cadastrados (nome, email, função)
- Tela somente leitura na interface atual

### 11.7 Rotas de Entrega (Entregador)
- Barra de estatísticas (total de rotas, total de pedidos, valor total)
- Cards de rota com: número, CEPs, lista de pedidos, valor
- Botões: "Iniciar Rota" e "Marcar Entregue"
- Status visual: Aguardando → Em Entrega → Concluída

---

## 12. Diferencias do Projeto

| Diferencial | Descrição |
|---|---|
| **Controle de acesso real (RBAC)** | Não é apenas cosmético — o backend valida permissões em cada requisição |
| **Preço snapshot** | Solução profissional usada em e-commerces reais para integridade financeira |
| **Kanban operacional** | Visualização moderna do fluxo de pedidos usada em empresas como iFood/Rappi |
| **Rotas de entrega inteligentes** | Agrupamento automático de pedidos por rota com controle de status |
| **API documentada automaticamente** | Swagger gerado a partir dos schemas de validação (single source of truth) |
| **Validação robusta** | Zod valida tipo, formato, tamanho e obrigatoriedade de cada campo |
| **Segurança por design** | bcrypt, JWT, CORS, proteção referencial, ocultação de erros internos |

---

## 13. Métricas do Projeto

| Métrica | Valor |
|---|---|
| Tabelas no banco | 5 (usuarios, clientes, produtos, pedidos, itens_pedido) |
| Endpoints da API | 21 |
| Perfis de acesso | 3 (Administrador, Atendente, Entregador) |
| Telas no frontend | 8 (Login, Dashboard, Pedidos, Clientes, Produtos, Usuários, Entregas, 404) |
| Componentes reutilizáveis | 5 (Tabela, Modal, Spinner, BarraLateral, Layout) |
| Dependências backend | 10 pacotes de produção |
| Dependências frontend | 6 pacotes de produção |
| Schemas de validação | 9 (Zod) |
| Classes de erro tipadas | 4 (InvalidOperation, NotFound, Unauthorized, Conflict) |

---

## 14. Possíveis Evoluções

| Evolução | Descrição |
|---|---|
| **Formulário de criação de pedidos** | Interface visual para montar pedidos com seleção de produtos e quantidades |
| **CRUD completo de usuários** | Criar, editar e excluir usuários pela interface (hoje é somente leitura) |
| **Paginação visual** | Controles de navegação entre páginas nos listagens |
| **Relatórios exportáveis** | Gerar PDF/Excel de relatórios financeiros e de pedidos |
| **Busca avançada de produtos** | Filtro por nome e descrição além de categoria |
| **Notificações em tempo real** | WebSocket para alertar novos pedidos e mudanças de status |
| **Deploy em produção** | Publicar em serviço de hospedagem (Vercel, Railway, Render) |
| **App mobile** | Versão mobile para entregadores com React Native |
| **Máquina de estados** | Validação de transições de status para impedir transições inválidas |

---

## 15. Como Executar o Projeto

### Pré-requisitos
- Node.js versão 18 ou superior
- Conta no Supabase (plano gratuito)
- Git

### Passo a passo

```bash
# 1. Clonar o repositório
git clone <url-do-repositorio>
cd xsalgados

# 2. Configurar o banco de dados
# 2.1 Crie um projeto no Supabase (supabase.com)
# 2.2 Acesse o SQL Editor e execute o arquivo: backend/create_tables.sql

# 3. Configurar variáveis de ambiente
cd backend
# Crie um arquivo .env com:
#   SUPABASE_URL=https://seu-projeto.supabase.co
#   SUPABASE_KEY=sua-service-role-key
#   JWT_KEY=uma-chave-secreta-com-pelo-menos-32-caracteres

# 4. Instalar dependências e popular o banco
npm install
npm run seed    # Cria o usuário admin (admin@xsalgados.com / admin123)

# 5. Iniciar o backend
npm run dev     # Servidor rodando em http://localhost:3000

# 6. Em outro terminal, iniciar o frontend
cd ../frontend
npm install
npm run dev     # Aplicação em http://localhost:5173

# 7. Acessar o sistema
# Abra http://localhost:5173 no navegador
# Login: admin@xsalgados.com | Senha: admin123
```

### Documentação da API
Com o backend rodando, acesse `http://localhost:3000/api-docs` para ver toda a documentação interativa da API (Swagger UI).

---

## 16. Glossário

| Termo | Significado |
|---|---|
| **API** | Interface de Programação de Aplicações — canal de comunicação entre frontend e backend |
| **SPA** | Single Page Application — aplicação web que roda em uma única página, sem recarregar |
| **JWT** | JSON Web Token — padrão aberto para transmitir informações de autenticação de forma segura |
| **RBAC** | Role-Based Access Control — controle de acesso baseado em papéis/perfis |
| **CRUD** | Create, Read, Update, Delete — as 4 operações básicas de dados |
| **bcrypt** | Algoritmo de hash de senhas com salt automático e fator de custo ajustável |
| **Kanban** | Metodologia visual de gestão de fluxo usando colunas de status |
| **Snapshot** | Cópia do valor no momento exato de uma operação, preservando o histórico |
| **PostgREST** | Serviço que transforma um banco PostgreSQL em uma API REST automaticamente |
| **Middleware** | Função intermediária que processa a requisição HTTP antes de chegar ao destino final |
| **KPI** | Key Performance Indicator — indicador-chave de desempenho |
| **CORS** | Cross-Origin Resource Sharing — mecanismo de segurança que controla quais origens podem acessar a API |
| **Deploy** | Processo de publicar a aplicação em um servidor acessível na internet |
