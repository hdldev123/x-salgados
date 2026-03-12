import React from 'react';
import { Routes, Route } from 'react-router-dom';
import Login from '../paginas/Login/Login';
import Layout from '../componentes/Layout/Layout';
import Dashboard from '../paginas/Dashboard/Dashboard';
import ListagemPedidos from '../paginas/Pedidos/ListagemPedidos';
import ListagemPedidosCancelados from '../paginas/Pedidos/ListagemPedidosCancelados';
import ListagemClientes from '../paginas/Clientes/ListagemClientes';
import ListagemProdutos from '../paginas/Produtos/ListagemProdutos';
import ListagemUsuarios from '../paginas/Usuarios/ListagemUsuarios';
import RotasDeEntrega from '../paginas/RotasDeEntregas/RotasDeEntregas';
import NaoEncontrado from '../paginas/NaoEncontrado/NaoEncontrado';
import RotaProtegida from './RotaProtegida';

/**
 * Componente central de roteamento da aplicação.
 * Define todas as rotas públicas e protegidas.
 */
function RotasApp() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />

      {/* Rotas Protegidas que utilizam o Layout Padrão */}
      <Route 
        path="/" 
        element={
          <RotaProtegida>
            <Layout />
          </RotaProtegida>
        }
      >
        <Route 
          index 
          element={
            <RotaProtegida papeisPermitidos={['ADMINISTRADOR', 'ATENDENTE']}>
              <Dashboard />
            </RotaProtegida>
          } 
        />
        <Route 
          path="pedidos" 
          element={
            <RotaProtegida papeisPermitidos={['ADMINISTRADOR', 'ATENDENTE']}>
              <ListagemPedidos />
            </RotaProtegida>
          } 
        />
        <Route 
          path="pedidos-cancelados" 
          element={
            <RotaProtegida papeisPermitidos={['ADMINISTRADOR', 'ATENDENTE']}>
              <ListagemPedidosCancelados />
            </RotaProtegida>
          } 
        />
        <Route 
          path="clientes" 
          element={
            <RotaProtegida papeisPermitidos={['ADMINISTRADOR', 'ATENDENTE']}>
              <ListagemClientes />
            </RotaProtegida>
          } 
        />
        <Route 
          path="produtos" 
          element={
            <RotaProtegida papeisPermitidos={['ADMINISTRADOR', 'ATENDENTE']}>
              <ListagemProdutos />
            </RotaProtegida>
          } 
        />
        <Route 
          path="usuarios" 
          element={
            <RotaProtegida papeisPermitidos={['ADMINISTRADOR']}>
              <ListagemUsuarios />
            </RotaProtegida>
          } 
        />
        <Route 
          path="entregas" 
          element={
            <RotaProtegida papeisPermitidos={['ENTREGADOR']}>
              <RotasDeEntrega />
            </RotaProtegida>
          } 
        />
      </Route>

      <Route path="*" element={<NaoEncontrado />} />
    </Routes>
  );
}

export default RotasApp;
