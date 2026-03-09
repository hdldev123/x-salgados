import React from 'react';
import { Link } from 'react-router-dom';

function NaoEncontrado() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-grafite-50 p-8 text-center">
      <h1 className="mb-2 text-6xl font-bold text-grafite-300">404</h1>
      <h2 className="mb-2 text-2xl font-semibold text-grafite-700">Página Não Encontrada</h2>
      <p className="mb-6 text-grafite-400">A página que você está procurando não existe.</p>
      <Link
        to="/"
        className="rounded-xl bg-primary-500 px-6 py-2.5 text-sm font-semibold text-white shadow-lg shadow-primary-500/25 transition-all duration-200 hover:-translate-y-0.5 hover:bg-primary-600 hover:shadow-xl"
      >
        Voltar para a Home
      </Link>
    </div>
  );
}

export default NaoEncontrado;
