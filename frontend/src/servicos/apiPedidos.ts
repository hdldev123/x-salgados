import api from './api';
import { mapPedidoDoBackend, mapStatusParaBackend } from '../utils/mapeamentos';
import { Pedido, ResultadoPaginado } from '../types';

export interface BuscarPedidosParams {
  pagina?: number;
  tamanhoPagina?: number;
  filtro?: string;
  status?: number | string;
  dataInicio?: string;
  dataFim?: string;
}

export const buscarPedidos = async (params: BuscarPedidosParams = {}): Promise<ResultadoPaginado<Pedido>> => {
  const query: Record<string, any> = {};
  if (params.pagina) query.pagina = params.pagina;
  if (params.tamanhoPagina) query.tamanhoPagina = params.tamanhoPagina;
  if (params.dataInicio) query.dataInicio = params.dataInicio;
  if (params.dataFim) query.dataFim = params.dataFim;

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
    total,
    totalItens: total,
    pagina,
    tamanhoPagina,
    totalPaginas,
  };
};

export const buscarPedidoPorId = async (id: number): Promise<Pedido> => {
  const response = await api.get(`/api/pedidos/${id}`);
  return mapPedidoDoBackend(response.data);
};

export interface CriarPedidoDto {
  clienteId: number;
  observacoes?: string;
  itens: Array<{ produtoId: number; quantidade: number }>;
}

export const criarPedido = async (dados: CriarPedidoDto): Promise<Pedido> => {
  const response = await api.post('/api/pedidos', dados);
  return mapPedidoDoBackend(response.data);
};

export interface AtualizarStatusResponse {
  sucesso: boolean;
  pedido: Pedido;
  mensagem: string;
}

export const atualizarStatusPedido = async (pedidoId: number, novoStatus: string | number): Promise<AtualizarStatusResponse> => {
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

export const buscarPedidosPorStatus = async (status: string): Promise<ResultadoPaginado<Pedido>> => {
  return buscarPedidos({ filtro: status, tamanhoPagina: 100 });
};
