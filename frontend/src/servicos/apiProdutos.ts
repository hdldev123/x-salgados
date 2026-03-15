import api from './api';
import { mapProdutoDoBackend } from '../utils/mapeamentos';
import { Produto, ResultadoPaginado } from '../types';

export interface BuscarProdutosParams {
  pagina?: number;
  tamanhoPagina?: number;
  categoria?: string;
  apenasAtivos?: boolean;
  busca?: string;
}

export const buscarProdutos = async (params: BuscarProdutosParams = {}): Promise<ResultadoPaginado<Produto>> => {
  const query: Record<string, any> = {};
  if (params.pagina) query.pagina = params.pagina;
  if (params.tamanhoPagina) query.tamanhoPagina = params.tamanhoPagina;
  if (params.categoria) query.categoria = params.categoria;
  if (params.apenasAtivos !== undefined) query.apenasAtivos = params.apenasAtivos;
  if (params.busca) query.busca = params.busca;

  const response = await api.get('/api/produtos', { params: query });
  const { dados, total, pagina, tamanhoPagina, totalPaginas } = response.data;

  return {
    dados: dados.map(mapProdutoDoBackend),
    total,
    totalItens: total,
    pagina,
    tamanhoPagina,
    totalPaginas,
  };
};

export const buscarCategorias = async (): Promise<string[]> => {
  const response = await api.get('/api/produtos/categorias');
  return response.data;
};

export const buscarProdutoPorId = async (id: number): Promise<Produto> => {
  const response = await api.get(`/api/produtos/${id}`);
  return mapProdutoDoBackend(response.data);
};

export interface CriarProdutoDto {
  nome: string;
  categoria: string;
  descricao?: string;
  preco: number;
  ativo?: boolean;
  estoque?: number;
}

export const criarProduto = async (dados: CriarProdutoDto): Promise<Produto> => {
  const response = await api.post('/api/produtos', dados);
  return mapProdutoDoBackend(response.data);
};

export interface AtualizarProdutoDto {
  nome?: string;
  categoria?: string;
  descricao?: string;
  preco?: number;
  ativo?: boolean;
  estoque?: number;
}

export const atualizarProduto = async (id: number, dados: AtualizarProdutoDto): Promise<Produto> => {
  const response = await api.put(`/api/produtos/${id}`, dados);
  return mapProdutoDoBackend(response.data);
};

export const deletarProduto = async (id: number): Promise<{ mensagem: string }> => {
  await api.delete(`/api/produtos/${id}`);
  return { mensagem: 'Produto excluído com sucesso' };
};
