import api from './api';
import { mapClienteDoBackend } from '../utils/mapeamentos';

/**
 * Busca clientes paginados.
 * GET /api/clientes?pagina=&tamanhoPagina=&busca=
 * @param {{ pagina?: number, tamanhoPagina?: number, busca?: string }} params
 * @returns {Promise<{ dados: import('../types/index').Cliente[], totalItens: number }>}
 */
export const buscarClientes = async (params = {}) => {
  const query = {};
  if (params.pagina) query.pagina = params.pagina;
  if (params.tamanhoPagina) query.tamanhoPagina = params.tamanhoPagina;
  if (params.busca) query.busca = params.busca;

  const response = await api.get('/api/clientes', { params: query });
  const { dados, total, pagina, tamanhoPagina, totalPaginas } = response.data;

  return {
    dados: dados.map(mapClienteDoBackend),
    totalItens: total,
    pagina,
    tamanhoPagina,
    totalPaginas,
  };
};

/**
 * Busca um cliente por ID.
 * GET /api/clientes/:id
 * @param {number} id
 * @returns {Promise<import('../types/index').Cliente>}
 */
export const buscarClientePorId = async (id) => {
  const response = await api.get(`/api/clientes/${id}`);
  return mapClienteDoBackend(response.data);
};

/**
 * Cria um novo cliente.
 * POST /api/clientes
 * @param {{ nome: string, telefone: string, email?: string, endereco?: string, cidade?: string, cep?: string }} dados
 * @returns {Promise<import('../types/index').Cliente>}
 */
export const criarCliente = async (dados) => {
  const response = await api.post('/api/clientes', dados);
  return mapClienteDoBackend(response.data);
};

/**
 * Atualiza um cliente existente.
 * PUT /api/clientes/:id
 * @param {number} id
 * @param {{ nome?: string, telefone?: string, email?: string, endereco?: string, cidade?: string, cep?: string }} dados
 * @returns {Promise<import('../types/index').Cliente>}
 */
export const atualizarCliente = async (id, dados) => {
  const response = await api.put(`/api/clientes/${id}`, dados);
  return mapClienteDoBackend(response.data);
};

/**
 * Exclui um cliente.
 * DELETE /api/clientes/:id
 * @param {number} id
 * @returns {Promise<void>}
 */
export const deletarCliente = async (id) => {
  await api.delete(`/api/clientes/${id}`);
  return { mensagem: 'Cliente excluído com sucesso' };
};
