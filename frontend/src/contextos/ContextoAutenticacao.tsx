import React, { createContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiLogin, apiLogout } from '../servicos/apiAutenticacao';
import { Usuario } from '../types';

export interface AutenticacaoContextProps {
  usuario: Usuario | null;
  token: string | null;
  carregando: boolean;
  login: (email: string, senha: string) => Promise<void>;
  logout: () => void;
}

export const ContextoAutenticacao = createContext<AutenticacaoContextProps | undefined>(undefined);

export function ProvedorAutenticacao({ children }: { children: ReactNode }) {
  const [usuario, setUsuario] = useState<Usuario | null>(null);
  const [token, setToken] = useState<string | null>(localStorage.getItem('token'));
  const [carregando, setCarregando] = useState<boolean>(true);
  const navigate = useNavigate();

  useEffect(() => {
    const tokenArmazenado = localStorage.getItem('token');
    const usuarioArmazenado = localStorage.getItem('usuario');

    if (tokenArmazenado && usuarioArmazenado) {
      setToken(tokenArmazenado);
      setUsuario(JSON.parse(usuarioArmazenado) as Usuario);
    }
    setCarregando(false);
  }, []);

  const login = useCallback(async (email: string, senha: string) => {
    try {
      const resposta = await apiLogin(email, senha);
      const { token: novoToken, usuario: dadosUsuario } = resposta;

      localStorage.setItem('token', novoToken);
      localStorage.setItem('usuario', JSON.stringify(dadosUsuario));
      setToken(novoToken);
      setUsuario(dadosUsuario);

      switch (dadosUsuario.role) {
        case 'ADMINISTRADOR':
          navigate('/');
          break;
        case 'ATENDENTE':
          navigate('/pedidos');
          break;
        case 'ENTREGADOR':
          navigate('/entregas');
          break;
        default:
          navigate('/pedidos');
      }

    } catch (erro) {
      throw erro;
    }
  }, [navigate]);

  const logout = useCallback(() => {
    apiLogout();
    localStorage.removeItem('token');
    localStorage.removeItem('usuario');
    setToken(null);
    setUsuario(null);
    navigate('/login');
  }, [navigate]);

  const valor: AutenticacaoContextProps = {
    usuario,
    token,
    carregando,
    login,
    logout,
  };

  return (
    <ContextoAutenticacao.Provider value={valor}>
      {children}
    </ContextoAutenticacao.Provider>
  );
}
