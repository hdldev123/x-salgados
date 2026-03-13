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

// ─── Insight de IA ──────────────────────────────────────────────────
export interface InsightIAResponse {
  insight: string;
}

export const buscarInsightIA = async (): Promise<InsightIAResponse> => {
  const response = await api.get('/api/dashboard/insight', { timeout: 30000 });
  return response.data;
};

// ─── Chat com IA ────────────────────────────────────────────────────
export interface MensagemChat {
  role: 'user' | 'assistant';
  content: string;
}

export interface ChatIAResponse {
  resposta: string;
}

export const enviarMensagemIA = async (
  mensagem: string,
  historico: MensagemChat[] = [],
): Promise<ChatIAResponse> => {
  const response = await api.post('/api/dashboard/chat', { mensagem, historico }, { timeout: 30000 });
  return response.data;
};
