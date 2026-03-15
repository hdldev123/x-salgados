# Rangô — Documentação de Negócio

> **Sistema de Gestão de Pedidos para Fábrica de Salgados**
> **Versão:** 2.0 · **Data:** Março de 2026
> **Escopo:** Regras de negócio, fluxos operacionais e lógica de expedição

---

## 📋 Sumário

- [1. Visão Geral do Negócio](#1-visão-geral-do-negócio)
- [2. Perfis de Utilizador](#2-perfis-de-utilizador)
- [3. Catálogo de Produtos](#3-catálogo-de-produtos)
- [4. Fluxo de Compra via WhatsApp](#4-fluxo-de-compra-via-whatsapp)
- [5. Ciclo de Vida do Pedido](#5-ciclo-de-vida-do-pedido)
- [6. Regra de Cancelamento](#6-regra-de-cancelamento)
- [7. Expedição e Entregas — Regra dos Lotes](#7-expedição-e-entregas--regra-dos-lotes)
- [8. Inteligência de Negócios (IA)](#8-inteligência-de-negócios-ia)
- [9. Dashboard Operacional](#9-dashboard-operacional)

---

## 1. Visão Geral do Negócio

O **Rangô** é o sistema central de operação de uma fábrica de salgados que atende clientes via encomenda. O modelo de negócio funciona com **vendas por unidade em lote** (mínimo 100 unidades por item) e entregas programadas.

**Cadeia de valor:**

```
  Cliente (WhatsApp)          Atendente (Dashboard)         Produção           Entregador
       │                            │                         │                    │
       │ 1. Faz pedido pelo bot     │                         │                    │
       │───────────────────────────►│ 2. Pedido aparece       │                    │
       │                            │    no painel            │                    │
       │                            │───────────────────────►│ 3. Fabrica          │
       │                            │                         │    salgados         │
       │                            │                         │───────────────────►│
       │                            │                         │ 4. Marca "Pronto"  │
       │                            │                         │                    │
       │                            │                         │    5. Sistema       │
       │                            │                         │    acumula lote     │
       │                            │                         │    (≥900 unids.)    │
       │                            │                         │                    │
       │                            │                         │                    │ 6. Libera lote
       │                            │                         │                    │    para entrega
       │◄───────────────────────────│─────────────────────────│────────────────────│
       │ 7. Recebe entrega          │                         │                    │ 7. Entrega
```

---

## 2. Perfis de Utilizador

O sistema possui **três perfis** com permissões distintas:

| Perfil        | Código | Acesso Dashboard                                              |
|---------------|:------:|---------------------------------------------------------------|
| **Admin**     | 1      | Acesso total: KPIs, IA, pedidos, clientes, produtos, usuários, entregas |
| **Atendente** | 2      | Gestão de pedidos, clientes, visualização de produtos         |
| **Entregador**| 3      | Painel de Rotas de Entregas (lotes + trânsito)                |

### Regras de Acesso

- **Admin** pode criar, editar e remover qualquer recurso
- **Atendente** pode criar/editar pedidos e clientes, mas não pode gerir produtos ou usuários
- **Entregador** só acessa a página de Rotas de Entregas — não vê dados financeiros nem clientes
- A **BarraLateral** (menu) filtra automaticamente as opções de acordo com o perfil logado

---

## 3. Catálogo de Produtos

### Regras do Catálogo

- Cada produto tem: **nome**, **categoria**, **descrição**, **preço unitário**, **estoque** e **status ativo/inativo**
- Apenas produtos com ``ativo = true`` são exibidos no bot do WhatsApp
- O preço unitário é **congelado no momento do pedido** (``preco_unitario_snapshot``), garantindo que alterações futuras de preço não afetem pedidos existentes
- Categorias são dinâmicas (texto livre), sem limite predefinido

### Regras de Venda e Estoque

| Regra | Descrição |
|-------|----------|
| **Pedido mínimo** | A unidade de venda mínima é **100 unidades** (1 cento) por item |
| **Auto-inativação** | Quando o estoque de um produto cai abaixo de 100 unidades, ele é **automaticamente inativado** (``ativo = false``) |
| **Efeito no Bot** | Produtos inativos desaparecem do menu do WhatsApp — o cliente nunca vê um produto que não pode ser atendido |
| **Reativação** | Ao repor o estoque para ≥ 100 unidades (via painel admin), o produto é **automaticamente reativado** |
| **Baixa automática** | A cada pedido finalizado, o estoque é decrementado atomicamente. Se o novo saldo ficar < 100, a inativação é imediata |

### Opções de Quantidade

O bot oferece quantidades padronizadas para cada item do pedido:

| Opção | Quantidade |
|:-----:|:----------:|
| 1     | 100 unid.  |
| 2     | 300 unid.  |
| 3     | 500 unid.  |
| 4     | 1.000 unid.|

O cliente seleciona a quantidade **antes** de escolher o produto. Este padrão agiliza o fluxo e padroniza os lotes de produção.

---

## 4. Fluxo de Compra via WhatsApp

### 4.1 Novo Cliente (Onboarding)

Quando um número desconhecido envia a primeira mensagem:

```
🤖 Bot: Olá! Bem-vindo ao Rangô! 🍽️
         Para começar, qual é o seu nome?

👤 Cliente: Maria da Silva

🤖 Bot: Prazer, Maria! Agora me informe seu endereço completo
         para entrega (rua, número, bairro):

👤 Cliente: Rua das Flores, 123 - Centro

🤖 Bot: ✅ Cadastro concluído!
         Vamos ao seu pedido...
```

O sistema automaticamente:
1. Cria um registo na tabela ``clientes`` com nome, endereço e JID do WhatsApp
2. Avança para o fluxo de compra (Menu de Quantidade)

### 4.2 Fluxo de Compra — Carrinho Multi-Itens

```
🤖 Bot: Escolha a quantidade desejada:
         [1] 100 unidades
         [2] 300 unidades
         [3] 500 unidades
         [4] 1.000 unidades

👤 Cliente: 2

🤖 Bot: Ótimo! 300 unidades. Agora escolha o produto:
         [1] Coxinha de Frango — R$ 0,80/unid.
         [2] Bolinha de Queijo — R$ 0,90/unid.
         [3] Kibe Frito — R$ 1,00/unid.
         [4] Risole de Camarão — R$ 1,20/unid.
         [5] Empada de Palmito — R$ 0,95/unid.

👤 Cliente: 1

🤖 Bot: ✅ Adicionado: 300x Coxinha de Frango (R$ 240,00)

         Deseja adicionar mais algum item?
         [1] Sim, quero mais
         [2] Não, finalizar pedido

👤 Cliente: 1

🤖 Bot: Escolha a quantidade desejada:
         [1] 100 unidades
         [2] 300 unidades
         [3] 500 unidades
         [4] 1.000 unidades

👤 Cliente: 1

🤖 Bot: Ótimo! 100 unidades. Agora escolha o produto:
         [1] Coxinha de Frango — R$ 0,80/unid.
         [2] Bolinha de Queijo — R$ 0,90/unid.
         ...

👤 Cliente: 2

🤖 Bot: ✅ Adicionado: 100x Bolinha de Queijo (R$ 90,00)

         Deseja adicionar mais algum item?
         [1] Sim, quero mais
         [2] Não, finalizar pedido

👤 Cliente: 2

🤖 Bot: 📋 Resumo do Pedido:
         • 300x Coxinha de Frango — R$ 240,00
         • 100x Bolinha de Queijo — R$ 90,00
         ────────────────────────
         💰 Total: R$ 330,00

         ✅ Pedido #47 criado com sucesso!
         Acompanhe o status enviando qualquer mensagem.
```

### 4.3 Cliente Recorrente (Com Pedido Ativo)

Quando um cliente já cadastrado envia mensagem e possui um pedido não-entregue:

```
🤖 Bot: Olá, Maria! Você tem o pedido #47 em andamento.
         O que deseja fazer?

         [1] 📦 Ver status do pedido
         [2] ❌ Cancelar pedido
         [3] ✏️ Editar pedido (via suporte)
         [4] 🛒 Fazer um novo pedido

👤 Cliente: 1

🤖 Bot: 📦 Pedido #47
         Status: Em Produção 🔄
         Itens:
         • 300x Coxinha de Frango
         • 100x Bolinha de Queijo
         Total: R$ 330,00
```

### 4.4 Regras do Bot

| Regra | Descrição |
|-------|-----------|
| **Onboarding único** | O cadastro só acontece uma vez por número de telefone |
| **Carrinho acumulativo** | O cliente pode adicionar quantos itens quiser ao carrinho antes de finalizar |
| **Preço congelado** | O ``preco_unitario_snapshot`` é capturado no momento da seleção do produto |
| **Criação atômica** | O pedido é criado via RPC PostgreSQL — ou cria tudo (pedido + itens) ou nada |
| **Produtos dinâmicos** | O menu de produtos é gerado em tempo real a partir dos produtos ativos no banco |

---

## 5. Ciclo de Vida do Pedido

### 5.1 Estados

```
┌──────────┐    ┌───────────┐    ┌─────────┐    ┌───────────┐    ┌──────────┐
│ Pendente │───►│Em Produção│───►│  Pronto  │───►│Em Entrega │───►│ Entregue │
│    (1)   │    │    (2)    │    │   (3)    │    │    (4)    │    │    (5)   │
└──────────┘    └───────────┘    └─────────┘    └───────────┘    └──────────┘
      │
      │ (cancelamento)
      ▼
┌──────────┐
│Cancelado │
│    (6)   │
└──────────┘
```

### 5.2 Transições Permitidas

| De            | Para          | Quem pode?                      | Como?                              |
|---------------|---------------|----------------------------------|------------------------------------|
| Pendente      | Em Produção   | Admin, Atendente                 | Dashboard (PATCH status)           |
| Em Produção   | Pronto        | Admin, Atendente                 | Dashboard (PATCH status)           |
| Pronto        | Em Entrega    | Admin, Entregador                | Liberação de lote (POST liberar)   |
| Em Entrega    | Entregue      | Admin, Entregador                | Marcação individual de entrega     |
| **Pendente**  | **Cancelado** | **Bot WhatsApp** ou Admin        | Bot (opção 2) ou Dashboard         |

### 5.3 Timestamp de Entrega

Quando um pedido transita para o status **Entregue** (5), o campo ``data_entrega`` é automaticamente preenchido com o timestamp atual. Este campo é ``NULL`` em todos os outros estados.

---

## 6. Regra de Cancelamento

### 6.1 Cancelamento via Bot (WhatsApp)

O cancelamento via bot é **restrito ao status Pendente (1)**. Esta é uma regra de negócio fundamental para evitar desperdício de produção.

**Fluxo de cancelamento válido:**

```
👤 Cliente: (escolhe opção 2 — Cancelar)

🤖 Bot: ✅ Pedido #47 cancelado com sucesso!
```

**Fluxo de cancelamento bloqueado:**

```
👤 Cliente: (escolhe opção 2 — Cancelar)

🤖 Bot: ⚠️ Seu pedido já começou a ser preparado e não pode
         ser cancelado por aqui. Por favor, entre em contato
         com suporte: rangosuporte@gmail.com
```

### 6.2 Matriz de Cancelamento

| Status Atual   | Cancelável pelo Bot? | Cancelável pelo Admin? | Motivo                                        |
|----------------|:-------------------:|:---------------------:|-----------------------------------------------|
| Pendente (1)   | ✅ Sim               | ✅ Sim                 | Produção ainda não iniciou                    |
| Em Produção (2)| ❌ Não               | ✅ Sim                 | Matéria-prima em uso — exige decisão humana   |
| Pronto (3)     | ❌ Não               | ✅ Sim                 | Produto fabricado — custo irrecuperável       |
| Em Entrega (4) | ❌ Não               | ✅ Sim                 | Produto em trânsito — logística em andamento  |
| Entregue (5)   | ❌ N/A               | ❌ N/A                 | Ciclo concluído                               |

### 6.3 Edição via Bot

O bot **não permite edição direta** de pedidos. Quando o cliente seleciona a opção de editar, é redirecionado para o suporte humano via e-mail:

```
🤖 Bot: Para editar seu pedido, envie um e-mail para:
         📧 rangosuporte@gmail.com
         Informe o número do pedido e as alterações desejadas.
```

### 6.4 Verificação de Propriedade

Antes de qualquer operação sobre o pedido (cancelar, ver status), o bot verifica se o ``cliente_id`` do pedido corresponde ao cliente associado ao número de telefone. Esta verificação de propriedade impede que um cliente manipule pedidos de terceiros.

---

## 7. Expedição e Entregas — Regra dos Lotes

### 7.1 Conceito de Lote

Um **lote de expedição** é um agrupamento de pedidos prontos para entrega, limitado pela capacidade física do veículo de transporte. A lógica é implementada no frontend (``RotasDeEntregas``) utilizando um **algoritmo de Bin Packing**.

### 7.2 Constantes de Configuração

| Parâmetro            | Valor         | Descrição                                              |
|----------------------|:-------------:|--------------------------------------------------------|
| ``CAPACIDADE_MAXIMA``| **1.000 unid.**| Número máximo de itens que cabem num veículo/lote     |
| ``VOLUME_MINIMO``    | **900 unid.** | Volume mínimo recomendado para liberar um lote         |

### 7.3 Algoritmo de Fracionamento (Bin Packing)

O algoritmo processa todos os pedidos com status **Pronto (3)** e os distribui em lotes respeitando o limite de capacidade:

```
Entrada: [Pedido A (300), Pedido B (500), Pedido C (400), Pedido D (200)]
                                                     Total geral: 1.400 unid.

Processamento:
  Lote 1: Pedido A (300) + Pedido B (500) = 800 unid.
           Tentar adicionar Pedido C (400) → 800 + 400 = 1.200 > 1.000 ❌
           → Fecha Lote 1 com 800 unidades

  Lote 2: Pedido C (400) + Pedido D (200) = 600 unid.
           Não há mais pedidos → Fecha Lote 2 com 600 unidades

Saída: [Lote 1: 800 unid. | Lote 2: 600 unid.]
```

**Pseudocódigo:**

```
PARA CADA pedido em pedidos_prontos:
    itens_pedido = SOMA(item.quantidade PARA item EM pedido.itens)

    SE lote_atual NÃO ESTÁ VAZIO
       E (itens_lote_atual + itens_pedido) > 1000:

        FECHAR lote_atual → adicionar à lista de lotes
        CRIAR novo lote_atual (vazio)

    ADICIONAR pedido ao lote_atual
    itens_lote_atual += itens_pedido

FECHAR último lote_atual → adicionar à lista de lotes
```

### 7.4 Interface Visual dos Lotes

Cada lote exibe:

| Elemento                | Descrição                                                |
|-------------------------|----------------------------------------------------------|
| **Número do lote**       | Identificador sequencial (Lote 1, Lote 2, ...)         |
| **Barra de progresso**   | Indicador visual de ocupação (0–1.000 unidades)         |
| **Contagem de itens**    | Total de unidades no lote (ex: "800 / 1.000")          |
| **Valor total**          | Soma dos valores dos pedidos do lote                    |
| **Lista de pedidos**     | Cada pedido com: ID, cliente, endereço, itens, valor    |
| **Botão "Liberar Lote"** | Transita todos os pedidos do lote para "Em Entrega"    |

### 7.5 Fluxo Operacional de Expedição

```
    ┌────────────────────────────────────────────┐
    │    PEDIDOS COM STATUS "PRONTO" (3)         │
    │    acumulam no Backend (Supabase)          │
    └─────────────────────┬──────────────────────┘
                          │
                          ▼
    ┌────────────────────────────────────────────┐
    │    FRONTEND: Algoritmo de Bin Packing       │
    │    Agrupa em lotes de até 1.000 unidades   │
    │                                             │
    │    Lote 1: ████████░░ 800/1000              │
    │    Lote 2: ██████░░░░ 600/1000              │
    └─────────────────────┬──────────────────────┘
                          │
                          ▼ (Entregador clica "Liberar Lote")
    ┌────────────────────────────────────────────┐
    │    POST /api/entregas/liberar-lote          │
    │    { pedidoIds: [12, 15, 18] }             │
    │                                             │
    │    Status: Pronto (3) → Em Entrega (4)     │
    └─────────────────────┬──────────────────────┘
                          │
                          ▼
    ┌────────────────────────────────────────────┐
    │    PAINEL "EM TRÂNSITO"                    │
    │    Exibe pedidos saídos para entrega        │
    │    Entregador marca individual: "Entregue" │
    │                                             │
    │    Status: Em Entrega (4) → Entregue (5)   │
    │    data_entrega = NOW()                     │
    └────────────────────────────────────────────┘
```

### 7.6 Regras de Negócio da Expedição

| Regra | Descrição |
|-------|-----------|
| **Capacidade máxima** | Um lote nunca ultrapassa 1.000 unidades |
| **Fracionamento automático** | Se os pedidos prontos somarem mais de 1.000 unidades, o sistema cria múltiplos lotes automaticamente |
| **Volume mínimo sugerido** | O sistema indica visualmente quando um lote tem menos de 900 unidades (lote "incompleto"), mas a liberação não é bloqueada |
| **Indivisibilidade de pedido** | Um pedido nunca é "cortado" entre dois lotes — ele vai inteiro no lote onde couber |
| **Ordem cronológica** | Pedidos mais antigos são alocados primeiro nos lotes |
| **Liberação atômica** | Ao liberar um lote, todos os pedidos transitam para "Em Entrega" numa única operação |
| **Entrega individual** | Após liberação, cada pedido pode ser marcado como "Entregue" individualmente |

---

## 8. Inteligência de Negócios (IA)

### 8.1 Consultor Virtual (Grok)

O Dashboard do Admin inclui um **card de Consultor de IA** alimentado pelo modelo **Grok 2** da xAI. O consultor:

- Recebe automaticamente as métricas de vendas do dia (receita, pedidos, produtos mais vendidos)
- Gera **1 dica curta** (máx. 2 frases) de negócio ou marketing
- Permite **follow-up via chat** com contexto das últimas 10 mensagens

**Exemplo de insight gerado:**

> 🔥 "Sua Coxinha de Frango responde por 45% das vendas, mas o Risole de Camarão tem a melhor margem. Experimente um combo promocional 'Coxinha + Risole' para aumentar o ticket médio!"

### 8.2 Hierarquia de Provedores

O sistema possui resiliência com fallback automático entre provedores de IA:

| Prioridade | Provedor | Modelo            | Custo      |
|:----------:|----------|-------------------|------------|
| 1          | xAI      | Grok 2 Latest     | Pago       |
| 2          | Groq     | (modelo default)  | Gratuito   |
| 3          | Google   | Gemini            | Pago       |
| 4          | OpenAI   | GPT               | Pago       |
| 5          | —        | Mensagem padrão   | Gratuito   |

Se nenhuma API key estiver configurada, o sistema exibe uma mensagem motivacional padrão sem gerar erro.

---

## 9. Dashboard Operacional

### 9.1 Componentes do Dashboard (Admin)

| Componente                    | Tipo                | Dados exibidos                                |
|-------------------------------|---------------------|-----------------------------------------------|
| **KPI — Receita do Dia**      | Card numérico       | Soma dos valores de pedidos criados hoje       |
| **KPI — Pedidos Concluídos**  | Card numérico       | Total de pedidos com status Entregue           |
| **KPI — Cancelamentos**       | Card numérico       | Total de pedidos cancelados + receita perdida  |
| **Top 5 Produtos**            | Gráfico de barras   | Produtos mais vendidos por quantidade          |
| **Status de Pedidos**         | Gráfico de rosca    | Proporção concluídos vs. cancelados            |
| **Receita Mensal**            | Gráfico de linha    | Evolução de receita nos últimos 6 meses        |
| **Consultor IA (Grok)**       | Card interativo     | Insight diário + chat com follow-up            |

### 9.2 Acesso por Perfil

| Funcionalidade               | Admin | Atendente | Entregador |
|------------------------------|:-----:|:---------:|:----------:|
| Dashboard com KPIs e gráficos| ✅     | ❌         | ❌          |
| Insight IA (Grok)            | ✅     | ❌         | ❌          |
| Gestão de Pedidos            | ✅     | ✅         | ❌          |
| Gestão de Clientes           | ✅     | ✅         | ❌          |
| Gestão de Produtos           | ✅     | ❌         | ❌          |
| Gestão de Usuários           | ✅     | ❌         | ❌          |
| Rotas de Entregas            | ✅     | ❌         | ✅          |
| Atualizar status → Entregue  | ✅     | ❌         | ✅          |

---

> **Rangô** — Documentação de Negócio v2.0 · Março 2026
