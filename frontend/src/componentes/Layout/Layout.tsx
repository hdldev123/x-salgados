import React from 'react';
import { Outlet } from 'react-router-dom';
import BarraLateral from '../BarraLateral/BarraLateral';

const Layout: React.FC = () => {
  return (
    <div className="flex min-h-screen bg-grafite-50">
      <BarraLateral />
      <main className="flex-1 overflow-y-auto p-6 lg:p-8">
        <div className="mx-auto w-full max-w-7xl">
          <Outlet />
        </div>
      </main>
    </div>
  );
};

export default Layout;
