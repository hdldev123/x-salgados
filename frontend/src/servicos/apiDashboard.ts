import api from './api';
import { DashboardKPIs, PedidosPorMes, DistribuicaoStatus, ProdutoMaisVendido } from '../types';

export const buscarKpis = async (): Promise<DashboardKPIs> => {
  const response = await api.get('/api/dashboard/kpis');
  return response.data;
};

export const buscarPedidosPorMes = async (meses: number = 6): Promise<PedidosPorMes[]> => {
  const response = await api.get('/api/dashboard/pedidos-por-mes', {
    params: { meses },
  });
  return response.data;
};

export const buscarDistribuicaoStatus = async (): Promise<DistribuicaoStatus[]> => {
  const response = await api.get('/api/dashboard/distribuicao-status');
  return response.data;
};

export interface DashboardCompletoResponse {
  kpis: DashboardKPIs;
  pedidosPorMes: PedidosPorMes[];
  distribuicaoStatus: DistribuicaoStatus[];
  produtosMaisVendidos: ProdutoMaisVendido[];
}

export const buscarDashboardCompleto = async (): Promise<DashboardCompletoResponse> => {
  const response = await api.get('/api/dashboard/completo');
  return response.data;
};
