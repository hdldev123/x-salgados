/**
 * Utilitários de mapeamento entre o formato do Backend (Node.js/Express)
 * e o formato usado pelo Frontend (React).
 *
 * O backend usa:
 *   - StatusPedido: enum numérico (1-6) com labels em português
 *   - PerfilUsuario: enum numérico (1-3) com labels em português
 *
 * O frontend usa:
 *   - Status: strings UPPER_SNAKE_CASE (PENDENTE, EM_PREPARO, PRONTO, etc.)
 *   - Roles: strings UPPER_SNAKE_CASE (ADMINISTRADOR, ATENDENTE, ENTREGADOR)
 */

// ─── STATUS DE PEDIDO ──────────────────────────────────────────────────────────

/** Backend label → Frontend constant */
const STATUS_DO_BACKEND = {
  'Pendente': 'PENDENTE',
  'Em Produção': 'EM_PREPARO',
  'Pronto': 'PRONTO',
  'Em Entrega': 'A_CAMINHO',
  'Entregue': 'ENTREGUE',
  'Cancelado': 'CANCELADO',
};

/** Frontend constant → Backend enum value (numérico) */
const STATUS_PARA_BACKEND = {
  'PENDENTE': 1,
  'EM_PREPARO': 2,
  'EM_PRODUCAO': 2,  // alias usado pelo Kanban
  'PRONTO': 3,
  'A_CAMINHO': 4,
  'ENTREGUE': 5,
  'CANCELADO': 6,
};

/**
 * Converte o label de status vindo do backend para a constante do frontend.
 * @param {string} statusBackend - Ex: "Pendente", "Em Produção"
 * @returns {string} Ex: "PENDENTE", "EM_PREPARO"
 */
export function mapStatusDoBackend(statusBackend) {
  return STATUS_DO_BACKEND[statusBackend] || statusBackend;
}

/**
 * Converte a constante de status do frontend para o valor numérico do backend.
 * @param {string} statusFrontend - Ex: "PENDENTE", "EM_PREPARO"
 * @returns {number} Ex: 1, 2
 */
export function mapStatusParaBackend(statusFrontend) {
  return STATUS_PARA_BACKEND[statusFrontend] || 1;
}

// ─── PERFIL DE USUÁRIO ─────────────────────────────────────────────────────────

/** Backend label → Frontend constant */
const PERFIL_DO_BACKEND = {
  'Administrador': 'ADMINISTRADOR',
  'Atendente': 'ATENDENTE',
  'Entregador': 'ENTREGADOR',
};

/** Frontend constant → Backend enum value (numérico) */
const PERFIL_PARA_BACKEND = {
  'ADMINISTRADOR': 1,
  'ATENDENTE': 2,
  'ENTREGADOR': 3,
};

/**
 * Converte o perfil vindo do backend para a role do frontend.
 * @param {string} perfilBackend - Ex: "Administrador"
 * @returns {string} Ex: "ADMINISTRADOR"
 */
export function mapPerfilDoBackend(perfilBackend) {
  return PERFIL_DO_BACKEND[perfilBackend] || perfilBackend;
}

/**
 * Converte a role do frontend para o valor numérico do backend.
 * @param {string} roleFrontend - Ex: "ADMINISTRADOR"
 * @returns {number} Ex: 1
 */
export function mapPerfilParaBackend(roleFrontend) {
  return PERFIL_PARA_BACKEND[roleFrontend] || 1;
}

// ─── MAPEAMENTO DE OBJETOS ─────────────────────────────────────────────────────

/**
 * Mapeia um objeto de usuário do backend para o formato do frontend.
 * Backend: { id, nome, email, perfil, dataCriacao, ativo }
 * Frontend: { id, nome, email, role, dataCriacao, ativo }
 */
export function mapUsuarioDoBackend(usuario) {
  if (!usuario) return null;
  return {
    ...usuario,
    role: mapPerfilDoBackend(usuario.perfil),
  };
}

/**
 * Mapeia um pedido do backend (PedidoResumoDto) para o formato do frontend.
 * Backend: { id, clienteId, clienteNome, dataCriacao, dataEntrega, valorTotal, status, observacoes }
 * Frontend: { id, clienteId, dataPedido, total, status, cliente: { nome }, observacoes, dataEntrega }
 */
export function mapPedidoDoBackend(pedido) {
  if (!pedido) return null;
  return {
    id: pedido.id,
    clienteId: pedido.clienteId,
    cliente: { nome: pedido.clienteNome || 'Cliente' },
    dataPedido: pedido.dataCriacao,
    dataEntrega: pedido.dataEntrega,
    total: pedido.valorTotal,
    status: mapStatusDoBackend(pedido.status),
    observacoes: pedido.observacoes,
    // Preservar campos extras do backend caso sejam usados
    itens: pedido.itens?.map(mapItemPedidoDoBackend) || undefined,
  };
}

/**
 * Mapeia um item de pedido do backend para o formato do frontend.
 */
export function mapItemPedidoDoBackend(item) {
  if (!item) return null;
  return {
    id: item.id,
    produtoId: item.produtoId,
    produtoNome: item.produtoNome,
    quantidade: item.quantidade,
    precoUnitario: item.precoUnitarioSnapshot,
    subtotal: item.subtotal,
  };
}

/**
 * Mapeia um produto do backend para o formato do frontend.
 * Backend: { id, nome, categoria, descricao, preco, ativo, dataCriacao }
 * Frontend mock: { id, nome, descricao, preco, estoque }
 * Frontend adaptado: mantém todos os campos do backend + ativo como campo extra
 */
export function mapProdutoDoBackend(produto) {
  if (!produto) return null;
  return {
    id: produto.id,
    nome: produto.nome,
    categoria: produto.categoria || '',
    descricao: produto.descricao || '',
    preco: produto.preco,
    ativo: produto.ativo,
    dataCriacao: produto.dataCriacao,
  };
}

/**
 * Mapeia um cliente do backend para o formato do frontend.
 * Backend: { id, nome, telefone, email, endereco, cidade, cep, dataCriacao, totalPedidos }
 * Frontend mock: { id, nome, email, telefone, endereco }
 */
export function mapClienteDoBackend(cliente) {
  if (!cliente) return null;
  return {
    id: cliente.id,
    nome: cliente.nome,
    email: cliente.email || '',
    telefone: cliente.telefone || '',
    endereco: cliente.endereco || '',
    cidade: cliente.cidade || '',
    cep: cliente.cep || '',
    dataCriacao: cliente.dataCriacao,
    totalPedidos: cliente.totalPedidos || 0,
  };
}
