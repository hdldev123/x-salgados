/**
 * Definições de tipos e interfaces para o frontend X Salgados.
 *
 * Este arquivo serve como referência de tipos para JSDoc.
 * Documenta os contratos entre frontend e backend.
 */

// ─── ENUMS / CONSTANTES ────────────────────────────────────────────────────────

/**
 * Status de pedido usados no frontend (UPPER_SNAKE_CASE).
 * @readonly
 * @enum {string}
 */
export const STATUS_PEDIDO = {
  PENDENTE: 'PENDENTE',
  EM_PREPARO: 'EM_PREPARO',
  PRONTO: 'PRONTO',
  A_CAMINHO: 'A_CAMINHO',
  ENTREGUE: 'ENTREGUE',
  CANCELADO: 'CANCELADO',
};

/**
 * Roles de usuário usados no frontend (UPPER_SNAKE_CASE).
 * @readonly
 * @enum {string}
 */
export const ROLES_USUARIO = {
  ADMINISTRADOR: 'ADMINISTRADOR',
  ATENDENTE: 'ATENDENTE',
  ENTREGADOR: 'ENTREGADOR',
};

// ─── INTERFACES / TYPEDEF ──────────────────────────────────────────────────────

/**
 * @typedef {Object} Usuario
 * @property {number} id
 * @property {string} nome
 * @property {string} email
 * @property {string} role - ADMINISTRADOR | ATENDENTE | ENTREGADOR
 * @property {boolean} [ativo]
 * @property {string} [dataCriacao]
 */

/**
 * @typedef {Object} LoginResponse
 * @property {string} token - JWT Bearer token
 * @property {Usuario} usuario - Dados do usuário autenticado
 * @property {string} expiracao - Data de expiração do token (ISO string)
 */

/**
 * @typedef {Object} Cliente
 * @property {number} id
 * @property {string} nome
 * @property {string} telefone
 * @property {string} [email]
 * @property {string} [endereco]
 * @property {string} [cidade]
 * @property {string} [cep]
 * @property {string} [dataCriacao]
 * @property {number} [totalPedidos]
 */

/**
 * @typedef {Object} Produto
 * @property {number} id
 * @property {string} nome
 * @property {string} [categoria]
 * @property {string} [descricao]
 * @property {number} preco
 * @property {boolean} [ativo]
 * @property {string} [dataCriacao]
 */

/**
 * @typedef {Object} ItemPedido
 * @property {number} id
 * @property {number} produtoId
 * @property {string} [produtoNome]
 * @property {number} quantidade
 * @property {number} precoUnitario
 * @property {number} [subtotal]
 */

/**
 * @typedef {Object} Pedido
 * @property {number} id
 * @property {number} clienteId
 * @property {{ nome: string }} [cliente] - Objeto simplificado com nome do cliente
 * @property {string} dataPedido - Data de criação (ISO string)
 * @property {string} [dataEntrega] - Data de entrega (ISO string ou null)
 * @property {number} total - Valor total do pedido
 * @property {string} status - PENDENTE | EM_PREPARO | PRONTO | A_CAMINHO | ENTREGUE | CANCELADO
 * @property {string} [observacoes]
 * @property {ItemPedido[]} [itens]
 */

/**
 * @typedef {Object} ResultadoPaginado
 * @property {Array} dados - Array de itens da página
 * @property {number} total - Total de registros
 * @property {number} [totalItens] - Alias para total (compatibilidade)
 * @property {number} [pagina] - Página atual
 * @property {number} [tamanhoPagina] - Itens por página
 * @property {number} [totalPaginas] - Total de páginas
 */

/**
 * @typedef {Object} DashboardKPIs
 * @property {number} pedidosHoje
 * @property {number} pedidosSemana
 * @property {number} pedidosMes
 * @property {number} receitaHoje
 * @property {number} receitaSemana
 * @property {number} receitaMes
 * @property {number} totalClientes
 * @property {number} totalProdutosAtivos
 */

/**
 * @typedef {Object} PedidosPorMes
 * @property {number} ano
 * @property {number} mes
 * @property {number} quantidade
 * @property {number} receita
 */

/**
 * @typedef {Object} DistribuicaoStatus
 * @property {string} status
 * @property {number} quantidade
 * @property {number} percentual
 */

/**
 * @typedef {Object} ApiError
 * @property {boolean} sucesso - Sempre false
 * @property {string} mensagem - Descrição do erro
 * @property {string[]} erros - Lista de detalhes do erro
 * @property {number} status - HTTP status code
 */
