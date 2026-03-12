import api from './api';
import { mapUsuarioDoBackend } from '../utils/mapeamentos';
import { LoginResponse } from '../types';

export const apiLogin = async (email: string, senha: string): Promise<LoginResponse> => {
  const response = await api.post('/api/auth/login', { email, senha });
  const { token, usuario, expiracao } = response.data;

  return {
    token,
    usuario: mapUsuarioDoBackend(usuario),
    expiracao,
  };
};

export const apiLogout = (): Promise<void> => {
  return Promise.resolve();
};
