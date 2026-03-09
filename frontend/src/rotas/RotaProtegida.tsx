import React, { useContext } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { ContextoAutenticacao } from '../contextos/ContextoAutenticacao';
import Spinner from '../componentes/Spinner/Spinner';

/**
 * Componente de Ordem Superior (HOC) para proteger rotas.
 * Verifica se o usuário está autenticado e se possui a role necessária.
 * * @param {object} props
 * @param {React.ReactNode} props.children O componente filho a ser renderizado se a autorização for bem-sucedida.
 * @param {string[]} [props.papeisPermitidos] Lista de papéis (roles) que podem acessar a rota.
 */
function RotaProtegida({ children, papeisPermitidos }) {
  const { usuario, carregando } = useContext(ContextoAutenticacao);
  const location = useLocation();

  // Enquanto o estado de autenticação está sendo verificado, exibe um spinner.
  // Isso previne um flash da tela de login para um usuário já logado.
  if (carregando) {
    return <Spinner />;
  }

  // Se não há usuário logado, redireciona para a página de login.
  // 'state={{ from: location }}' guarda a página original que o usuário tentou acessar,
  // permitindo o redirecionamento de volta após o login.
  if (!usuario) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // Se a rota exige papéis específicos e o usuário não tem um deles,
  // redireciona para uma página de "não autorizado" ou para a home.
  // Neste caso, estamos redirecionando para a home para simplificar.
  if (papeisPermitidos && !papeisPermitidos.includes(usuario.role)) {
    // Poderia ser uma página específica de "Acesso Negado".
    // Para o entregador, se tentar acessar outra página, vai para a sua página principal.
    if (usuario.role === 'ENTREGADOR') {
        return <Navigate to="/entregas" replace />;
    }
    return <Navigate to="/" replace />;
  }

  // Se o usuário está logado e (se necessário) tem o papel correto, renderiza o componente filho.
  return children;
}

export default RotaProtegida;
