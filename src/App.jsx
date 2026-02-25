import React from 'react';
import { ProvedorAutenticacao } from './contextos/ContextoAutenticacao';
import { ProviderPedidos } from './contextos/ContextoPedidos';
import RotasApp from './rotas';

function App() {
  return (
    <ProvedorAutenticacao>
      <ProviderPedidos>
        <RotasApp />
      </ProviderPedidos>
    </ProvedorAutenticacao>
  );
}

export default App;
