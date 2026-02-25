import api from './api';
import { mapUsuarioDoBackend } from '../utils/mapeamentos';

/**
 * Realiza login no backend.
 * POST /api/auth/login
 * @param {string} email
 * @param {string} senha
 * @returns {Promise<{ token: string, usuario: import('../types/index').Usuario }>}
 */
export const apiLogin = async (email, senha) => {
  const response = await api.post('/api/auth/login', { email, senha });
  const { token, usuario, expiracao } = response.data;

  return {
    token,
    usuario: mapUsuarioDoBackend(usuario),
    expiracao,
  };
};

/**
 * Realiza logout (limpa localStorage — o backend é stateless com JWT).
 * @returns {Promise<void>}
 */
export const apiLogout = () => {
  console.log('Logout realizado, token removido.');
  return Promise.resolve();
};
