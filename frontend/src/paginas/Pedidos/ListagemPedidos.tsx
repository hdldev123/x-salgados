import React, { useState, useEffect, useCallback } from 'react';
import { buscarClientes } from '../../servicos/apiClientes';
import PedidosKanban from './PedidosKanban';
import Tabela from '../../componentes/Tabela/Tabela';
import Spinner from '../../componentes/Spinner/Spinner';
import { usePedidos } from '../../contextos/ContextoPedidos';

function ListagemPedidos() {
  const [visualizacao, setVisualizacao] = useState('kanban'); // 'kanban' ou 'tabela'
  const [clientes, setClientes] = useState([]);

  // Usar contexto de pedidos
  const {
    pedidos,
    carregando,
    erro,
    notificacao,
    carregarPedidos,
    alterarStatusPedido,
    limparNotificacao
  } = usePedidos();

  // Carregar dados iniciais
  useEffect(() => {
    const carregarDadosIniciais = async () => {
      try {
        // Carregar pedidos usando o contexto
        await carregarPedidos();

        // Carregar clientes
        const dadosClientes = await buscarClientes();
        setClientes(dadosClientes.dados);
      } catch (err) {
        // Ignora erro no console para não vazar objeto de request
      }
    };

    carregarDadosIniciais();
  }, [carregarPedidos]);

  // Função para alterar status do pedido
  const handleStatusChange = useCallback(async (pedidoId, novoStatus) => {
    await alterarStatusPedido(pedidoId, novoStatus);
  }, [alterarStatusPedido]);

  // Colunas para visualização em tabela
  const colunas = [
    { cabecalho: 'ID', chave: 'id' },
    { cabecalho: 'Cliente', render: (pedido) => pedido.cliente?.nome || `Cliente ${pedido.clienteId}` },
    { cabecalho: 'Data', render: (pedido) => new Date(pedido.dataPedido).toLocaleDateString('pt-BR') },
    {
      cabecalho: 'Status',
      render: (pedido) => (
        <select
          className="min-w-[110px] cursor-pointer rounded-lg border border-grafite-200 bg-grafite-50 px-2 py-1 text-xs font-medium text-grafite-700 transition-colors hover:border-primary-500 focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 focus:outline-none"
          value={pedido.status}
          onChange={(e) => handleStatusChange(pedido.id, e.target.value)}
        >
          <option value="PENDENTE">Pendente</option>
          <option value="EM_PREPARO">Em Produção</option>
          <option value="PRONTO">Pronto</option>
          <option value="A_CAMINHO">Em Entrega</option>
          <option value="ENTREGUE">Entregue</option>
          <option value="CANCELADO">Cancelado</option>
        </select>
      )
    },
    { cabecalho: 'Total', render: (pedido) => `R$ ${pedido.total.toFixed(2)}` },
  ];

  return (
    <div className="animate-fade-in">
      {/* Notificação flutuante */}
      {notificacao && (
        <div
          className={`fixed right-4 top-4 z-[1000] flex max-w-sm items-center gap-3 animate-slide-right rounded-xl px-5 py-3 shadow-lg ${notificacao.tipo === 'sucesso'
              ? 'border border-sucesso/20 bg-sucesso/10 text-sucesso'
              : 'border border-erro/20 bg-erro/10 text-erro'
            }`}
        >
          <span className="text-sm font-medium">{notificacao.mensagem}</span>
          <button
            className="ml-auto text-lg opacity-70 transition-opacity hover:opacity-100"
            onClick={limparNotificacao}
          >
            ×
          </button>
        </div>
      )}

      {/* Cabeçalho */}
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-grafite-800">Gestão de Pedidos</h1>
          <p className="mt-1 text-sm text-grafite-400">
            {visualizacao === 'kanban'
              ? 'Gerencie o fluxo de produção através do quadro Kanban'
              : 'Visualização em tabela de todos os pedidos'
            }
          </p>
        </div>

        {/* Toggle Kanban / Tabela */}
        <div className="flex gap-1 rounded-xl bg-grafite-100 p-1">
          <button
            className={`flex items-center gap-1.5 rounded-lg px-4 py-2 text-sm font-medium transition-all duration-200 ${visualizacao === 'kanban'
                ? 'bg-primary-500 text-white shadow-md shadow-primary-500/25'
                : 'text-grafite-500 hover:text-grafite-700'
              }`}
            onClick={() => setVisualizacao('kanban')}
          >
            📋 Kanban
          </button>
          <button
            className={`flex items-center gap-1.5 rounded-lg px-4 py-2 text-sm font-medium transition-all duration-200 ${visualizacao === 'tabela'
                ? 'bg-primary-500 text-white shadow-md shadow-primary-500/25'
                : 'text-grafite-500 hover:text-grafite-700'
              }`}
            onClick={() => setVisualizacao('tabela')}
          >
            📊 Tabela
          </button>
        </div>
      </div>

      {/* Indicadores rápidos */}
      <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[
          { numero: pedidos.length, label: 'Total de Pedidos' },
          { numero: pedidos.filter(p => p.status === 'PENDENTE').length, label: 'Pendentes' },
          { numero: pedidos.filter(p => p.status === 'EM_PREPARO').length, label: 'Em Produção' },
          { numero: pedidos.filter(p => p.status === 'PRONTO').length, label: 'Prontos' },
        ].map((item, i) => (
          <div
            key={i}
            className="rounded-2xl border border-grafite-200 bg-white p-4 text-center shadow-soft transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg"
          >
            <span className="block text-2xl font-bold text-primary-500">{item.numero}</span>
            <span className="mt-1 block text-xs uppercase tracking-wider text-grafite-400">
              {item.label}
            </span>
          </div>
        ))}
      </div>

      {/* Conteúdo principal */}
      {carregando && <Spinner />}
      {erro && (
        <div className="rounded-xl border border-erro/20 bg-erro/10 px-4 py-3 text-sm font-medium text-erro">
          {erro}
        </div>
      )}

      {!carregando && !erro && (
        <>
          {visualizacao === 'kanban' ? (
            <PedidosKanban
              pedidos={pedidos}
              clientes={clientes}
              onStatusChange={handleStatusChange}
            />
          ) : (
            <Tabela colunas={colunas} dados={pedidos} />
          )}
        </>
      )}
    </div>
  );
}

export default ListagemPedidos;
