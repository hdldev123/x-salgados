import React, { useState, useCallback } from 'react';
import { Outlet } from 'react-router-dom';
import BarraLateral from '../BarraLateral/BarraLateral';
import { FiMenu } from 'react-icons/fi';

const Layout: React.FC = () => {
  const [menuAberto, setMenuAberto] = useState(false);

  const abrirMenu = useCallback(() => setMenuAberto(true), []);
  const fecharMenu = useCallback(() => setMenuAberto(false), []);

  return (
    <div className="flex min-h-screen bg-grafite-50">
      {/* ─── Top Bar Mobile ─── */}
      <header className="fixed inset-x-0 top-0 z-40 flex h-14 items-center justify-between border-b border-grafite-200 bg-white px-4 shadow-sm lg:hidden">
        <button
          onClick={abrirMenu}
          className="flex h-10 w-10 items-center justify-center rounded-xl text-grafite-600 transition-colors hover:bg-grafite-100"
          aria-label="Abrir menu"
        >
          <FiMenu className="text-xl" />
        </button>
        <img src="/logo.png" alt="Rangô" className="h-9 w-auto object-contain" />
        <div className="w-10" /> {/* Espaçador para centralizar logo */}
      </header>

      {/* ─── Sidebar (off-canvas mobile / fixa desktop) ─── */}
      <BarraLateral aberto={menuAberto} onFechar={fecharMenu} />

      {/* ─── Conteúdo principal ─── */}
      <main className="flex-1 overflow-y-auto pt-14 lg:pt-0 p-4 sm:p-6 lg:p-8">
        <div className="mx-auto w-full max-w-7xl">
          <Outlet />
        </div>
      </main>
    </div>
  );
};

export default Layout;
