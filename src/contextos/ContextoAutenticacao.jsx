import React, { createContext, useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiLogin, apiLogout } from '../servicos/apiAutenticacao';

// Cria o Contexto de Autenticação para ser usado em toda a aplicação.
export const ContextoAutenticacao = createContext();

/**
 * Provedor do Contexto de Autenticação.
 * Este componente envolve a aplicação e gerencia o estado de autenticação,
 * como os dados do usuário e o token.
 */
export function ProvedorAutenticacao({ children }) {
  const [usuario, setUsuario] = useState(null);
  const [token, setToken] = useState(localStorage.getItem('token'));
  const [carregando, setCarregando] = useState(true); // Usado para verificar o token inicial
  const navigate = useNavigate();

  // useEffect para verificar o token no localStorage na inicialização da aplicação.
  // Isso mantém o usuário logado mesmo que ele atualize a página.
  useEffect(() => {
    const tokenArmazenado = localStorage.getItem('token');
    const usuarioArmazenado = localStorage.getItem('usuario');
    
    if (tokenArmazenado && usuarioArmazenado) {
      setToken(tokenArmazenado);
      setUsuario(JSON.parse(usuarioArmazenado));
    }
    setCarregando(false);
  }, []);

  // Função de login
  const login = useCallback(async (email, senha) => {
    try {
      const resposta = await apiLogin(email, senha);
      const { token: novoToken, usuario: dadosUsuario } = resposta;

      localStorage.setItem('token', novoToken);
      localStorage.setItem('usuario', JSON.stringify(dadosUsuario));
      setToken(novoToken);
      setUsuario(dadosUsuario);
      
      // Redireciona o usuário com base na sua função (role)
      // O mapeamento de perfil→role já foi feito no apiAutenticacao.js
      switch (dadosUsuario.role) {
        case 'ADMINISTRADOR':
        case 'ATENDENTE':
          navigate('/');
          break;
        case 'ENTREGADOR':
          navigate('/entregas');
          break;
        default:
          navigate('/');
      }

    } catch (erro) {
      console.error("Falha no login:", erro);
      // Propaga o erro com a mensagem do backend (tratada pelo interceptor)
      throw erro;
    }
  }, [navigate]);

  // Função de logout
  const logout = useCallback(() => {
    apiLogout(); // Simula a invalidação do token no backend
    localStorage.removeItem('token');
    localStorage.removeItem('usuario');
    setToken(null);
    setUsuario(null);
    navigate('/login');
  }, [navigate]);

  // O valor fornecido pelo contexto inclui o estado do usuário e as funções de login/logout.
  const valor = {
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
