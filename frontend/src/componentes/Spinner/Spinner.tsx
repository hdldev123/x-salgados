import React from 'react';
import { FaSpinner } from 'react-icons/fa';

/**
 * Componente de Spinner para indicar estados de carregamento.
 * Exibe um ícone giratório no centro de seu contêiner.
 */
function Spinner() {
  return (
    <div className="flex h-full min-h-[200px] w-full items-center justify-center p-8">
      <FaSpinner className="animate-spin-slow text-4xl text-primary-500 opacity-80" />
    </div>
  );
}

export default Spinner;
