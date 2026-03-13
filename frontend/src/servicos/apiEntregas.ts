import api from './api';
import { mapPedidoDoBackend } from '../utils/mapeamentos';
import { Pedido } from '../types';

export interface LoteEntregaResponse {
  pedidosProntos: Pedido[];
  totalItensAcumulados: number;
}

export const buscarLoteEntrega = async (): Promise<LoteEntregaResponse> => {
  const response = await api.get('/api/entregas/lote');
  const { pedidosProntos, totalLote } = response.data;

  return {
    pedidosProntos: Array.isArray(pedidosProntos)
      ? pedidosProntos.map(mapPedidoDoBackend).filter(Boolean) as Pedido[]
      : [],
    totalItensAcumulados: totalLote || 0,
  };
};

export interface LiberarLoteResponse {
  sucesso: boolean;
  mensagem: string;
  pedidosAfetados: number;
}

export const liberarLote = async (): Promise<LiberarLoteResponse> => {
  const response = await api.post('/api/entregas/liberar-lote');
  return response.data;
};

export interface EmTransitoResponse {
  pedidosEmTransito: Pedido[];
  totalPedidos: number;
  valorTotal: number;
}

export const buscarPedidosEmTransito = async (): Promise<EmTransitoResponse> => {
  const response = await api.get('/api/entregas/em-transito');
  const { pedidosEmTransito, totalPedidos, valorTotal } = response.data;

  return {
    pedidosEmTransito: Array.isArray(pedidosEmTransito)
      ? pedidosEmTransito.map(mapPedidoDoBackend).filter(Boolean) as Pedido[]
      : [],
    totalPedidos: totalPedidos || 0,
    valorTotal: valorTotal || 0,
  };
};
