import React from 'react';
import { FaSpinner } from 'react-icons/fa';
import './Spinner.css';

/**
 * Componente de Spinner para indicar estados de carregamento.
 * Exibe um ícone giratório no centro de seu contêiner.
 */
function Spinner() {
  return (
    <div className="spinner-container">
      <FaSpinner className="spinner-icone" />
    </div>
  );
}

export default Spinner;
