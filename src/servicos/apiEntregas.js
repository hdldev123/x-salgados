import api from './api';
import { mapPedidoDoBackend } from '../utils/mapeamentos';

/**
 * Busca as rotas de entrega do dia (pedidos com status Pronto ou Em Entrega).
 * GET /api/entregas/rotas
 * @returns {Promise<{ dados: import('../types/index').Pedido[], totalItens: number }>}
 */
export const buscarRotasDeEntrega = async () => {
  const response = await api.get('/api/entregas/rotas');
  const pedidos = Array.isArray(response.data)
    ? response.data.map(mapPedidoDoBackend)
    : [];

  return {
    dados: pedidos,
    totalItens: pedidos.length,
  };
};
