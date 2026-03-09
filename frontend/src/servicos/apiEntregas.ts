import api from './api';
import { mapPedidoDoBackend } from '../utils/mapeamentos';

/**
 * Busca o lote atual de entrega (pedidos prontos + total de itens acumulados).
 * GET /api/entregas/lote
 * @returns {Promise<{ pedidosProntos: import('../types/index').Pedido[], totalItensAcumulados: number }>}
 */
export const buscarLoteEntrega = async () => {
  const response = await api.get('/api/entregas/lote');
  const { pedidosProntos, totalItensAcumulados } = response.data;

  return {
    pedidosProntos: Array.isArray(pedidosProntos)
      ? pedidosProntos.map(mapPedidoDoBackend)
      : [],
    totalItensAcumulados: totalItensAcumulados || 0,
  };
};

/**
 * Libera o lote atual — move TODOS os pedidos Pronto(3) → Em Entrega(4) de uma vez.
 * POST /api/entregas/liberar-lote
 * @returns {Promise<{ sucesso: boolean, mensagem: string, pedidosAfetados: number }>}
 */
export const liberarLote = async () => {
  const response = await api.post('/api/entregas/liberar-lote');
  return response.data;
};

/**
 * Busca todos os pedidos atualmente em trânsito (status 4).
 * GET /api/entregas/em-transito
 * @returns {Promise<{ pedidosEmTransito: import('../types/index').Pedido[], totalPedidos: number, valorTotal: number }>}
 */
export const buscarPedidosEmTransito = async () => {
  const response = await api.get('/api/entregas/em-transito');
  const { pedidosEmTransito, totalPedidos, valorTotal } = response.data;

  return {
    pedidosEmTransito: Array.isArray(pedidosEmTransito)
      ? pedidosEmTransito.map(mapPedidoDoBackend)
      : [],
    totalPedidos: totalPedidos || 0,
    valorTotal: valorTotal || 0,
  };
};
