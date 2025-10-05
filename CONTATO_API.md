Contrato da API - Sistema de Gestão de Pedidos (X Salgados)
Este documento descreve a API RESTful para o sistema de gestão de pedidos. O frontend foi desenvolvido com base nestes endpoints simulados.

URL Base: /api

Autenticação
POST /api/auth/login
Autentica um usuário e retorna um token de acesso e os dados do usuário.

Request Body:

{
  "email": "usuario@exemplo.com",
  "senha": "sua_senha"
}

Success Response (200 OK):

{
  "token": "seu_token_jwt_aqui",
  "usuario": {
    "id": 1,
    "nome": "Admin Geral",
    "email": "admin@xsalgados.com",
    "role": "ADMINISTRADOR"
  }
}

Error Response (401 Unauthorized):

{
  "mensagem": "Credenciais inválidas"
}

Pedidos
GET /api/pedidos
Retorna uma lista paginada de pedidos. Suporta filtros e ordenação.

Query Params:

pagina (number, opcional): Número da página.

limite (number, opcional): Itens por página.

filtro (string, opcional): Texto para buscar no nome do cliente ou status.

ordenarPor (string, opcional): Campo para ordenação (ex: dataPedido).

ordem (string, opcional): asc ou desc.

Success Response (200 OK):

{
  "dados": [
    {
      "id": 1,
      "cliente": { "id": 1, "nome": "Padaria Pão Quente" },
      "dataPedido": "2025-10-26T10:00:00Z",
      "status": "ENTREGUE",
      "total": 150.50
    }
  ],
  "totalItens": 50,
  "totalPaginas": 5
}

Clientes
GET /api/clientes
Retorna uma lista paginada de clientes. Suporta filtros e ordenação.

(Query Params similares a /api/pedidos)

POST /api/clientes
Cria um novo cliente.

Request Body:

{
  "nome": "Novo Cliente",
  "email": "contato@novocliente.com",
  "telefone": "11987654321",
  "endereco": "Rua dos Clientes, 123"
}

PUT /api/clientes/:id
Atualiza um cliente existente.

DELETE /api/clientes/:id
Exclui um cliente.

Produtos
GET /api/produtos
Retorna uma lista paginada de produtos.

(Query Params similares a /api/pedidos)

POST /api/produtos
Cria um novo produto.

PUT /api/produtos/:id
Atualiza um produto.

DELETE /api/produtos/:id
Exclui um produto.

Usuários
GET /api/usuarios
Retorna uma lista paginada de usuários (Apenas para Administradores).

(Query Params similares a /api/pedidos)

POST /api/usuarios
Cria um novo usuário.

PUT /api/usuarios/:id
Atualiza um usuário.

DELETE /api/usuarios/:id
Exclui um usuário.

Dashboard
GET /api/dashboard/kpis
Retorna os principais indicadores de performance.

Success Response (200 OK):

{
  "pedidosHoje": 12,
  "faturamentoMes": 25430.80,
  "novosClientesSemana": 5,
  "produtosMaisVendidos": [
    { "nome": "Coxinha", "quantidade": 350 },
    { "nome": "Kibe", "quantidade": 280 }
  ]
}

GET /api/dashboard/vendas-por-periodo
Retorna dados para o gráfico de vendas.

Success Response (200 OK):

{
  "dados": [
    { "mes": "Janeiro", "totalVendas": 15000 },
    { "mes": "Fevereiro", "totalVendas": 18500 }
  ]
}
