import React from 'react';
import { Outlet } from 'react-router-dom';
import BarraLateral from '../BarraLateral/BarraLateral';
import './Layout.css';

/**
 * Componente de Layout Principal.
 * Estrutura a aplicação com uma barra de navegação lateral fixa
 * e uma área de conteúdo principal onde as páginas são renderizadas.
 */
function Layout() {
  return (
    <div className="layout-container">
      <BarraLateral />
      <main className="conteudo-principal">
        <div className="conteudo-wrapper">
          {/* O componente Outlet do React Router renderiza a rota filha correspondente */}
          <Outlet />
        </div>
      </main>
    </div>
  );
}

export default Layout;
