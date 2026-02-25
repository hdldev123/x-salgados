import api from './api';
import { mapPedidoDoBackend, mapStatusParaBackend } from '../utils/mapeamentos';

/**
 * Busca pedidos paginados com filtros opcionais.
 * GET /api/pedidos?pagina=&tamanhoPagina=&status=&dataInicio=&dataFim=
 * @param {{ pagina?: number, tamanhoPagina?: number, filtro?: string, status?: number, dataInicio?: string, dataFim?: string }} params
 * @returns {Promise<{ dados: import('../types/index').Pedido[], totalItens: number }>}
 */
export const buscarPedidos = async (params = {}) => {
  const query = {};
  if (params.pagina) query.pagina = params.pagina;
  if (params.tamanhoPagina) query.tamanhoPagina = params.tamanhoPagina;
  if (params.dataInicio) query.dataInicio = params.dataInicio;
  if (params.dataFim) query.dataFim = params.dataFim;

  // O frontend usa 'filtro' com string (ex: 'PENDENTE'), o backend usa 'status' numérico
  if (params.filtro) {
    query.status = mapStatusParaBackend(params.filtro);
  }
  if (params.status) {
    query.status = typeof params.status === 'number'
      ? params.status
      : mapStatusParaBackend(params.status);
  }

  const response = await api.get('/api/pedidos', { params: query });
  const { dados, total, pagina, tamanhoPagina, totalPaginas } = response.data;

  return {
    dados: dados.map(mapPedidoDoBackend),
    totalItens: total,
    pagina,
    tamanhoPagina,
    totalPaginas,
  };
};

/**
 * Busca um pedido por ID com detalhes (itens).
 * GET /api/pedidos/:id
 * @param {number} id
 * @returns {Promise<import('../types/index').Pedido>}
 */
export const buscarPedidoPorId = async (id) => {
  const response = await api.get(`/api/pedidos/${id}`);
  return mapPedidoDoBackend(response.data);
};

/**
 * Cria um novo pedido.
 * POST /api/pedidos
 * @param {{ clienteId: number, observacoes?: string, itens: Array<{ produtoId: number, quantidade: number }> }} dados
 * @returns {Promise<import('../types/index').Pedido>}
 */
export const criarPedido = async (dados) => {
  const response = await api.post('/api/pedidos', dados);
  return mapPedidoDoBackend(response.data);
};

/**
 * Atualiza o status de um pedido.
 * PATCH /api/pedidos/:id/status
 *
 * Aceita tanto o status do frontend (string, ex: "PENDENTE") quanto
 * o valor numérico do backend (ex: 1).
 *
 * @param {number} pedidoId
 * @param {string|number} novoStatus - String do frontend ou número do backend
 * @returns {Promise<{ sucesso: boolean, pedido: import('../types/index').Pedido, mensagem: string }>}
 */
export const atualizarStatusPedido = async (pedidoId, novoStatus) => {
  const statusNumerico = typeof novoStatus === 'number'
    ? novoStatus
    : mapStatusParaBackend(novoStatus);

  const response = await api.patch(`/api/pedidos/${pedidoId}/status`, {
    status: statusNumerico,
  });

  return {
    sucesso: true,
    pedido: mapPedidoDoBackend(response.data),
    mensagem: 'Status do pedido atualizado com sucesso',
  };
};

/**
 * Busca pedidos filtrados por um status específico.
 * Usa o endpoint de listagem com filtro de status.
 * @param {string} status - Status do frontend (ex: "PRONTO")
 * @returns {Promise<{ dados: import('../types/index').Pedido[], totalItens: number }>}
 */
export const buscarPedidosPorStatus = async (status) => {
  return buscarPedidos({ filtro: status, tamanhoPagina: 100 });
};
