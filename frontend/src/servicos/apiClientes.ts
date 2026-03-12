import api from './api';
import { mapClienteDoBackend } from '../utils/mapeamentos';
import { Cliente, ResultadoPaginado } from '../types';

export interface BuscarClientesParams {
  pagina?: number;
  tamanhoPagina?: number;
  busca?: string;
}

export const buscarClientes = async (params: BuscarClientesParams = {}): Promise<ResultadoPaginado<Cliente>> => {
  const query: Record<string, any> = {};
  if (params.pagina) query.pagina = params.pagina;
  if (params.tamanhoPagina) query.tamanhoPagina = params.tamanhoPagina;
  if (params.busca) query.busca = params.busca;

  const response = await api.get('/api/clientes', { params: query });
  const { dados, total, pagina, tamanhoPagina, totalPaginas } = response.data;

  return {
    dados: dados.map(mapClienteDoBackend),
    total,
    totalItens: total,
    pagina,
    tamanhoPagina,
    totalPaginas,
  };
};

export const buscarClientePorId = async (id: number): Promise<Cliente> => {
  const response = await api.get(`/api/clientes/${id}`);
  return mapClienteDoBackend(response.data);
};

export interface CriarClienteDto {
  nome: string;
  telefone: string;
  email?: string;
  endereco?: string;
  cidade?: string;
  cep?: string;
}

export const criarCliente = async (dados: CriarClienteDto): Promise<Cliente> => {
  const response = await api.post('/api/clientes', dados);
  return mapClienteDoBackend(response.data);
};

export interface AtualizarClienteDto {
  nome?: string;
  telefone?: string;
  email?: string;
  endereco?: string;
  cidade?: string;
  cep?: string;
}

export const atualizarCliente = async (id: number, dados: AtualizarClienteDto): Promise<Cliente> => {
  const response = await api.put(`/api/clientes/${id}`, dados);
  return mapClienteDoBackend(response.data);
};

export const deletarCliente = async (id: number): Promise<{ mensagem: string }> => {
  await api.delete(`/api/clientes/${id}`);
  return { mensagem: 'Cliente excluído com sucesso' };
};
