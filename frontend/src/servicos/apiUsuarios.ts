import api from './api';
import { mapUsuarioDoBackend, mapPerfilParaBackend } from '../utils/mapeamentos';

/**
 * Busca usuários paginados.
 * GET /api/usuarios?pagina=&tamanhoPagina=
 * @param {{ pagina?: number, tamanhoPagina?: number }} params
 * @returns {Promise<{ dados: import('../types/index').Usuario[], totalItens: number }>}
 */
export const buscarUsuarios = async (params = {}) => {
  const query = {};
  if (params.pagina) query.pagina = params.pagina;
  if (params.tamanhoPagina) query.tamanhoPagina = params.tamanhoPagina;

  const response = await api.get('/api/usuarios', { params: query });
  const { dados, total, pagina, tamanhoPagina, totalPaginas } = response.data;

  return {
    dados: dados.map(mapUsuarioDoBackend),
    totalItens: total,
    pagina,
    tamanhoPagina,
    totalPaginas,
  };
};

/**
 * Busca um usuário por ID.
 * GET /api/usuarios/:id
 * @param {number} id
 * @returns {Promise<import('../types/index').Usuario>}
 */
export const buscarUsuarioPorId = async (id) => {
  const response = await api.get(`/api/usuarios/${id}`);
  return mapUsuarioDoBackend(response.data);
};

/**
 * Cria um novo usuário.
 * POST /api/usuarios
 * @param {{ nome: string, email: string, senha: string, perfil: number|string }} dados
 * @returns {Promise<import('../types/index').Usuario>}
 */
export const criarUsuario = async (dados) => {
  const payload = {
    ...dados,
    perfil: typeof dados.perfil === 'string'
      ? mapPerfilParaBackend(dados.perfil)
      : dados.perfil,
  };
  const response = await api.post('/api/usuarios', payload);
  return mapUsuarioDoBackend(response.data);
};

/**
 * Atualiza um usuário existente.
 * PUT /api/usuarios/:id
 * @param {number} id
 * @param {{ nome?: string, email?: string, perfil?: number|string, ativo?: boolean }} dados
 * @returns {Promise<import('../types/index').Usuario>}
 */
export const atualizarUsuario = async (id, dados) => {
  const payload = { ...dados };
  if (payload.perfil && typeof payload.perfil === 'string') {
    payload.perfil = mapPerfilParaBackend(payload.perfil);
  }
  const response = await api.put(`/api/usuarios/${id}`, payload);
  return mapUsuarioDoBackend(response.data);
};

/**
 * Exclui um usuário.
 * DELETE /api/usuarios/:id
 * @param {number} id
 * @returns {Promise<void>}
 */
export const deletarUsuario = async (id) => {
  await api.delete(`/api/usuarios/${id}`);
  return { mensagem: 'Usuário excluído com sucesso' };
};

/**
 * Altera a senha de um usuário.
 * PATCH /api/usuarios/:id/senha
 * @param {number} id
 * @param {{ senhaAtual: string, novaSenha: string }} dados
 * @returns {Promise<void>}
 */
export const alterarSenha = async (id, dados) => {
  await api.patch(`/api/usuarios/${id}/senha`, dados);
  return { mensagem: 'Senha alterada com sucesso' };
};
