import api from './api';

/**
 * Busca os KPIs do dashboard.
 * GET /api/dashboard/kpis
 * @returns {Promise<import('../types/index').DashboardKPIs>}
 */
export const buscarKpis = async () => {
  const response = await api.get('/api/dashboard/kpis');
  return response.data;
};

/**
 * Busca dados de pedidos agrupados por mês.
 * GET /api/dashboard/pedidos-por-mes?meses=
 * @param {number} [meses=6] - Quantidade de meses retroativos
 * @returns {Promise<import('../types/index').PedidosPorMes[]>}
 */
export const buscarPedidosPorMes = async (meses = 6) => {
  const response = await api.get('/api/dashboard/pedidos-por-mes', {
    params: { meses },
  });
  return response.data;
};

/**
 * Busca a distribuição de status dos pedidos.
 * GET /api/dashboard/distribuicao-status
 * @returns {Promise<import('../types/index').DistribuicaoStatus[]>}
 */
export const buscarDistribuicaoStatus = async () => {
  const response = await api.get('/api/dashboard/distribuicao-status');
  return response.data;
};

/**
 * Busca todos os dados do dashboard de uma vez.
 * GET /api/dashboard/completo
 * @returns {Promise<{ kpis: DashboardKPIs, pedidosPorMes: PedidosPorMes[], distribuicaoStatus: DistribuicaoStatus[] }>}
 */
export const buscarDashboardCompleto = async () => {
  const response = await api.get('/api/dashboard/completo');
  return response.data;
};
