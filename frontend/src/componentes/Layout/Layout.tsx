import React from 'react';
import { Outlet } from 'react-router-dom';
import BarraLateral from '../BarraLateral/BarraLateral';

/**
 * Componente de Layout Principal.
 * Estrutura a aplicação com uma barra de navegação lateral fixa
 * e uma área de conteúdo principal onde as páginas são renderizadas.
 */
function Layout() {
  return (
    <div className="flex min-h-screen bg-grafite-50">
      <BarraLateral />
      <main className="flex-1 overflow-y-auto p-6 lg:p-8">
        <div className="mx-auto w-full max-w-7xl">
          {/* O componente Outlet do React Router renderiza a rota filha correspondente */}
          <Outlet />
        </div>
      </main>
    </div>
  );
}

export default Layout;
