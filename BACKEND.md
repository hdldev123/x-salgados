Documentação para Implementação do Backend - X Salgados
Este documento serve como guia para a equipe de backend desenvolver a API real do sistema de automação de pedidos, com base no frontend e no contrato de API já estabelecidos.

1. Tecnologias Recomendadas
Linguagem: Node.js (com TypeScript para tipagem forte)

Framework: Express.js ou NestJS (NestJS é recomendado por sua arquitetura modular e suporte a TypeScript)

Banco de Dados: PostgreSQL (robusto para dados relacionais) ou MongoDB (flexível para dados de documentos)

ORM / ODM: Prisma ou TypeORM para PostgreSQL; Mongoose para MongoDB.

Autenticação: JWT (JSON Web Tokens) para proteger as rotas.

Validação: Zod ou Joi para validar os dados de entrada das requisições.

2. Estrutura do Banco de Dados (Exemplo com PostgreSQL)
Tabela usuarios

id (SERIAL, PRIMARY KEY)

nome (VARCHAR, NOT NULL)

email (VARCHAR, UNIQUE, NOT NULL)

senha_hash (VARCHAR, NOT NULL)

role (ENUM('ADMINISTRADOR', 'ATENDENTE', 'ENTREGADOR'), NOT NULL)

data_criacao (TIMESTAMP, DEFAULT NOW())

Tabela clientes

id (SERIAL, PRIMARY KEY)

nome (VARCHAR, NOT NULL)

email (VARCHAR, UNIQUE)

telefone (VARCHAR)

endereco (TEXT)

data_criacao (TIMESTAMP, DEFAULT NOW())

Tabela produtos

id (SERIAL, PRIMARY KEY)

nome (VARCHAR, NOT NULL)

descricao (TEXT)

preco (DECIMAL(10, 2), NOT NULL)

estoque (INTEGER, DEFAULT 0)

data_criacao (TIMESTAMP, DEFAULT NOW())

Tabela pedidos

id (SERIAL, PRIMARY KEY)

cliente_id (INTEGER, FOREIGN KEY REFERENCES clientes(id))

usuario_id (INTEGER, FOREIGN KEY REFERENCES usuarios(id))

data_pedido (TIMESTAMP, DEFAULT NOW())

data_entrega_prevista (TIMESTAMP)

endereco_entrega (TEXT, NOT NULL)

status (ENUM('PENDENTE', 'EM_PREPARO', 'A_CAMINHO', 'ENTREGUE', 'CANCELADO'), NOT NULL)

total (DECIMAL(10, 2), NOT NULL)

Tabela pedido_itens

id (SERIAL, PRIMARY KEY)

pedido_id (INTEGER, FOREIGN KEY REFERENCES pedidos(id))

produto_id (INTEGER, FOREIGN KEY REFERENCES produtos(id))

quantidade (INTEGER, NOT NULL)

preco_unitario (DECIMAL(10, 2), NOT NULL) -- Preço no momento da compra

3. Detalhamento dos Endpoints
A implementação deve seguir estritamente o CONTRATO_API.md.

Lógica de Negócio Adicional
Autenticação (/auth/login):

Ao receber email e senha, buscar o usuário pelo email.

Comparar a senha fornecida com o senha_hash armazenado usando bcrypt.

Se a senha for válida, gerar um JWT contendo userId, nome e role. O token deve ter um tempo de expiração (ex: 8 horas).

Autorização (Middleware):

Criar um middleware para verificar o token JWT em todas as rotas protegidas.

O middleware deve decodificar o token, extrair os dados do usuário e anexá-los ao objeto request (ex: req.usuario).

Criar um segundo middleware de role para rotas específicas (ex: verificarRole('ADMINISTRADOR')), que verifica se req.usuario.role tem a permissão necessária.

CRUD (Clientes, Produtos, Usuários):

Implementar operações padrão de CREATE, READ, UPDATE, DELETE.

Paginação e Filtros: A lógica de listagem (GET /api/...) deve implementar paginação (LIMIT/OFFSET ou skip/take), busca textual (ILIKE no PostgreSQL) e ordenação dinâmica com base nos query params.

Pedidos:

Criação (POST /api/pedidos): Esta é uma transação. Ao criar um pedido, o sistema deve:

Criar o registro na tabela pedidos.

Para cada item no pedido, criar um registro em pedido_itens.

Atualizar o estoque na tabela produtos para cada item vendido.

Se qualquer um desses passos falhar, a transação inteira deve ser revertida (rollback).

Atualização de Status (PUT /api/pedidos/:id/status): Criar um endpoint específico para mudar o status de um pedido, registrando quem e quando a alteração foi feita (log).

Dashboard:

Os endpoints do dashboard (GET /api/dashboard/...) devem realizar consultas agregadas no banco de dados para calcular os KPIs em tempo real.

pedidosHoje: COUNT de pedidos com data_pedido no dia atual.

faturamentoMes: SUM do total de pedidos ENTREGUE no mês atual.

Evite consultas N+1. Use JOINs eficientes para buscar dados relacionados.

4. Segurança
Hashing de Senhas: Use bcrypt para armazenar senhas de forma segura. Nunca armazene senhas em texto plano.

Variáveis de Ambiente: Armazene informações sensíveis (chaves secretas do JWT, credenciais do banco de dados) em um arquivo .env e não o versione no Git.

Proteção contra SQL Injection: Use um ORM (como Prisma ou TypeORM) que parametriza as consultas para prevenir ataques de SQL Injection.

CORS: Configure o CORS para permitir requisições apenas do domínio do frontend.