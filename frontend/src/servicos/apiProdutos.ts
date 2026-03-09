import api from './api';
import { mapProdutoDoBackend } from '../utils/mapeamentos';

/**
 * Busca produtos paginados com filtros opcionais.
 * GET /api/produtos?pagina=&tamanhoPagina=&categoria=&apenasAtivos=&busca=
 * @param {{ pagina?: number, tamanhoPagina?: number, categoria?: string, apenasAtivos?: boolean, busca?: string }} params
 * @returns {Promise<{ dados: import('../types/index').Produto[], totalItens: number }>}
 */
export const buscarProdutos = async (params = {}) => {
  const query = {};
  if (params.pagina) query.pagina = params.pagina;
  if (params.tamanhoPagina) query.tamanhoPagina = params.tamanhoPagina;
  if (params.categoria) query.categoria = params.categoria;
  if (params.apenasAtivos !== undefined) query.apenasAtivos = params.apenasAtivos;
  if (params.busca) query.busca = params.busca;

  const response = await api.get('/api/produtos', { params: query });
  const { dados, total, pagina, tamanhoPagina, totalPaginas } = response.data;

  return {
    dados: dados.map(mapProdutoDoBackend),
    totalItens: total,
    pagina,
    tamanhoPagina,
    totalPaginas,
  };
};

/**
 * Busca as categorias distintas de produtos.
 * GET /api/produtos/categorias
 * @returns {Promise<string[]>}
 */
export const buscarCategorias = async () => {
  const response = await api.get('/api/produtos/categorias');
  return response.data;
};

/**
 * Busca um produto por ID.
 * GET /api/produtos/:id
 * @param {number} id
 * @returns {Promise<import('../types/index').Produto>}
 */
export const buscarProdutoPorId = async (id) => {
  const response = await api.get(`/api/produtos/${id}`);
  return mapProdutoDoBackend(response.data);
};

/**
 * Cria um novo produto.
 * POST /api/produtos
 * @param {{ nome: string, categoria: string, descricao?: string, preco: number, ativo?: boolean }} dados
 * @returns {Promise<import('../types/index').Produto>}
 */
export const criarProduto = async (dados) => {
  const response = await api.post('/api/produtos', dados);
  return mapProdutoDoBackend(response.data);
};

/**
 * Atualiza um produto existente.
 * PUT /api/produtos/:id
 * @param {number} id
 * @param {{ nome?: string, categoria?: string, descricao?: string, preco?: number, ativo?: boolean }} dados
 * @returns {Promise<import('../types/index').Produto>}
 */
export const atualizarProduto = async (id, dados) => {
  const response = await api.put(`/api/produtos/${id}`, dados);
  return mapProdutoDoBackend(response.data);
};

/**
 * Exclui um produto.
 * DELETE /api/produtos/:id
 * @param {number} id
 * @returns {Promise<void>}
 */
export const deletarProduto = async (id) => {
  await api.delete(`/api/produtos/${id}`);
  return { mensagem: 'Produto excluído com sucesso' };
};
