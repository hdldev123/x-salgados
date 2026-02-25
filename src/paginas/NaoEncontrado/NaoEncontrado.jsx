import React from 'react';
import { Link } from 'react-router-dom';

function NaoEncontrado() {
  return (
    <div style={{ textAlign: 'center', padding: '50px' }}>
      <h1>404 - Página Não Encontrada</h1>
      <p>A página que você está procurando não existe.</p>
      <Link to="/" className="botao botao-primario">Voltar para a Home</Link>
    </div>
  );
}

export default NaoEncontrado;
