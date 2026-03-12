import React, { useContext } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { ContextoAutenticacao } from '../contextos/ContextoAutenticacao';
import Spinner from '../componentes/Spinner/Spinner';
import { RoleUsuario } from '../types';

interface RotaProtegidaProps {
  children: React.ReactNode;
  papeisPermitidos?: RoleUsuario[];
}

function RotaProtegida({ children, papeisPermitidos }: RotaProtegidaProps) {
  const contexto = useContext(ContextoAutenticacao);
  const location = useLocation();

  if (!contexto) return null;
  const { usuario, carregando } = contexto;

  if (carregando) {
    return <Spinner />;
  }

  if (!usuario) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (papeisPermitidos && !papeisPermitidos.includes(usuario.role)) {
    if (usuario.role === 'ENTREGADOR') {
      return <Navigate to="/entregas" replace />;
    }
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
}

export default RotaProtegida;
