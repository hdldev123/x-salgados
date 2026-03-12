import api from './api';
import { mapUsuarioDoBackend, mapPerfilParaBackend } from '../utils/mapeamentos';
import { Usuario, ResultadoPaginado } from '../types';

export interface BuscarUsuariosParams {
  pagina?: number;
  tamanhoPagina?: number;
}

export const buscarUsuarios = async (params: BuscarUsuariosParams = {}): Promise<ResultadoPaginado<Usuario>> => {
  const query: Record<string, any> = {};
  if (params.pagina) query.pagina = params.pagina;
  if (params.tamanhoPagina) query.tamanhoPagina = params.tamanhoPagina;

  const response = await api.get('/api/usuarios', { params: query });
  const { dados, total, pagina, tamanhoPagina, totalPaginas } = response.data;

  return {
    dados: dados.map(mapUsuarioDoBackend),
    total,
    totalItens: total,
    pagina,
    tamanhoPagina,
    totalPaginas,
  };
};

export const buscarUsuarioPorId = async (id: number): Promise<Usuario> => {
  const response = await api.get(`/api/usuarios/${id}`);
  return mapUsuarioDoBackend(response.data);
};

export interface CriarUsuarioDto {
  nome: string;
  email: string;
  senha?: string;
  perfil: number | string;
}

export const criarUsuario = async (dados: CriarUsuarioDto): Promise<Usuario> => {
  const payload = {
    ...dados,
    perfil: typeof dados.perfil === 'string'
      ? mapPerfilParaBackend(dados.perfil)
      : dados.perfil,
  };
  const response = await api.post('/api/usuarios', payload);
  return mapUsuarioDoBackend(response.data);
};

export interface AtualizarUsuarioDto {
  nome?: string;
  email?: string;
  perfil?: number | string;
  ativo?: boolean;
}

export const atualizarUsuario = async (id: number, dados: AtualizarUsuarioDto): Promise<Usuario> => {
  const payload: any = { ...dados };
  if (payload.perfil && typeof payload.perfil === 'string') {
    payload.perfil = mapPerfilParaBackend(payload.perfil);
  }
  const response = await api.put(`/api/usuarios/${id}`, payload);
  return mapUsuarioDoBackend(response.data);
};

export const deletarUsuario = async (id: number): Promise<{ mensagem: string }> => {
  await api.delete(`/api/usuarios/${id}`);
  return { mensagem: 'Usuário excluído com sucesso' };
};

export interface AlterarSenhaDto {
  senhaAtual: string;
  novaSenha: string;
}

export const alterarSenha = async (id: number, dados: AlterarSenhaDto): Promise<{ mensagem: string }> => {
  await api.patch(`/api/usuarios/${id}/senha`, dados);
  return { mensagem: 'Senha alterada com sucesso' };
};
