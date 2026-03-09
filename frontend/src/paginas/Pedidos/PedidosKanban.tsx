import React, { useState, useEffect, useCallback } from 'react';

const STATUS_CONFIG = {
  PENDENTE: {
    label: 'Pendente',
    cor: '#eab308',
    bgCor: 'bg-aviso',
    ordem: 1,
    descricao: 'Pedidos aguardando produção'
  },
  EM_PRODUCAO: {
    label: 'Em Produção',
    cor: '#d97706',
    bgCor: 'bg-primary-500',
    ordem: 2,
    descricao: 'Pedidos sendo preparados'
  },
  PRONTO: {
    label: 'Pronto',
    cor: '#16a34a',
    bgCor: 'bg-sucesso',
    ordem: 3,
    descricao: 'Pedidos prontos para entrega'
  },
  A_CAMINHO: {
    label: 'Em Trânsito',
    cor: '#0ea5e9',
    bgCor: 'bg-info',
    ordem: 4,
    descricao: 'Pedidos a caminho do cliente'
  },
  ENTREGUE: {
    label: 'Concluído',
    cor: '#059669',
    bgCor: 'bg-sucesso',
    ordem: 5,
    descricao: 'Pedidos entregues com sucesso'
  }
};

function PedidosKanban({ pedidos, onStatusChange, clientes = [] }) {
  const [pedidosAtualizados, setPedidosAtualizados] = useState(pedidos);
  const [pedidoAtualizando, setPedidoAtualizando] = useState(null);

  // Sincronizar com props quando pedidos mudam
  useEffect(() => {
    setPedidosAtualizados(pedidos);
  }, [pedidos]);

  const obterNomeCliente = useCallback((clienteId) => {
    const cliente = clientes.find(c => c.id === clienteId);
    return cliente ? cliente.nome : `Cliente ${clienteId}`;
  }, [clientes]);

  const formatarMoeda = useCallback((valor) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(valor);
  }, []);

  const agruparPedidosPorStatus = useCallback(() => {
    const grupos = {};

    // Inicializar todos os status
    Object.keys(STATUS_CONFIG).forEach(status => {
      grupos[status] = [];
    });

    // Agrupar pedidos por status
    pedidosAtualizados.forEach(pedido => {
      let statusMapeado = pedido.status;

      // Mapear os status do backend para as colunas do Kanban
      switch (pedido.status) {
        case 'EM_PREPARO':
          statusMapeado = 'EM_PRODUCAO';
          break;
        case 'A_CAMINHO':
          statusMapeado = 'A_CAMINHO';
          break;
        case 'ENTREGUE':
          statusMapeado = 'ENTREGUE';
          break;
        case 'CANCELADO':
          // Cancelados não aparecem no Kanban
          return;
        default:
          statusMapeado = pedido.status;
      }

      if (grupos[statusMapeado]) {
        grupos[statusMapeado].push(pedido);
      }
    });

    return grupos;
  }, [pedidosAtualizados]);

  const handleStatusChange = useCallback(async (pedidoId, novoStatus) => {
    setPedidoAtualizando(pedidoId);

    try {
      // Atualizar localmente primeiro para feedback imediato
      setPedidosAtualizados(prev =>
        prev.map(pedido =>
          pedido.id === pedidoId
            ? { ...pedido, status: novoStatus }
            : pedido
        )
      );

      // Chamar callback para atualizar no backend/estado pai
      if (onStatusChange) {
        await onStatusChange(pedidoId, novoStatus);
      }
    } catch (error) {
      // Reverter mudança local em caso de erro
      setPedidosAtualizados(pedidos);
    } finally {
      setPedidoAtualizando(null);
    }
  }, [onStatusChange, pedidos]);

  const StatusDropdown = ({ pedido }) => (
    <div className="relative">
      <select
        className="min-w-[100px] cursor-pointer rounded-lg border border-grafite-200 bg-grafite-50 px-2 py-1 text-xs font-semibold text-grafite-700 transition-all duration-200 hover:border-primary-500 focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 focus:outline-none disabled:cursor-not-allowed disabled:opacity-60"
        value={pedido.status === 'EM_PREPARO' ? 'EM_PRODUCAO' : pedido.status}
        onChange={(e) => {
          let novoStatus = e.target.value;
          // Mapear de volta para os status do sistema
          if (novoStatus === 'EM_PRODUCAO') {
            novoStatus = 'EM_PREPARO';
          }
          handleStatusChange(pedido.id, novoStatus);
        }}
        disabled={pedidoAtualizando === pedido.id}
        onClick={(e) => e.stopPropagation()}
      >
        <option value="PENDENTE">Pendente</option>
        <option value="EM_PRODUCAO">Em Produção</option>
        <option value="PRONTO">Pronto</option>
        <option value="A_CAMINHO">Em Trânsito</option>
        <option value="ENTREGUE">Concluído</option>
      </select>
    </div>
  );

  const PedidoCard = ({ pedido }) => (
    <div
      className={`rounded-2xl border border-grafite-200 bg-white p-4 shadow-soft transition-all duration-300 hover:-translate-y-1 hover:border-primary-400 hover:shadow-xl ${pedidoAtualizando === pedido.id ? 'pointer-events-none opacity-70' : 'cursor-pointer'
        }`}
    >
      <div className="mb-2 flex items-start justify-between">
        <span className="text-xs font-semibold uppercase tracking-wider text-grafite-400">
          #{pedido.id}
        </span>
        <span className="text-lg font-bold text-primary-500">
          {formatarMoeda(pedido.total)}
        </span>
      </div>

      <div className="mb-1 text-sm font-semibold text-grafite-800">
        {obterNomeCliente(pedido.clienteId)}
      </div>

      <div className="mb-3 text-xs text-grafite-400">
        {new Date(pedido.dataPedido).toLocaleDateString('pt-BR')}
      </div>

      <div className="flex items-center justify-between border-t border-grafite-100 pt-3">
        <StatusDropdown pedido={pedido} />
        {pedidoAtualizando === pedido.id && (
          <div className="flex items-center gap-1.5 text-xs font-medium text-primary-500">
            <div className="h-3 w-3 animate-spin rounded-full border-2 border-grafite-200 border-t-primary-500" />
            <span>Atualizando...</span>
          </div>
        )}
      </div>
    </div>
  );

  const pedidosAgrupados = agruparPedidosPorStatus();

  return (
    <div className="w-full">
      {/* Cabeçalho do Kanban */}
      <div className="mb-6 text-center">
        <h2 className="text-2xl font-bold text-grafite-800">Fluxo de Produção</h2>
        <p className="mt-1 text-sm text-grafite-400">
          Gerencie o status dos pedidos através do fluxo de produção
        </p>
      </div>

      {/* Grid de 5 colunas */}
      <div className="grid min-h-[70vh] grid-cols-1 gap-5 lg:grid-cols-5">
        {Object.entries(STATUS_CONFIG)
          .sort(([, a], [, b]) => a.ordem - b.ordem)
          .map(([status, config]) => (
            <div
              key={status}
              className="flex flex-col overflow-hidden rounded-2xl border border-grafite-200 bg-white shadow-soft"
            >
              {/* Cabeçalho da coluna */}
              <div
                className="sticky top-0 z-10 flex items-start justify-between border-b border-grafite-200 bg-gradient-to-br from-grafite-50 to-white px-5 py-4"
                style={{ borderTopWidth: '4px', borderTopColor: config.cor }}
              >
                <div>
                  <h3 className="text-base font-semibold text-grafite-800">{config.label}</h3>
                  <p className="mt-0.5 text-xs uppercase tracking-wider text-grafite-400">
                    {config.descricao}
                  </p>
                </div>
                <span
                  className="min-w-[28px] rounded-full px-2 py-0.5 text-center text-xs font-bold text-white"
                  style={{ backgroundColor: config.cor }}
                >
                  {pedidosAgrupados[status]?.length || 0}
                </span>
              </div>

              {/* Lista de pedidos */}
              <div className="flex flex-1 flex-col gap-3 overflow-y-auto p-4">
                {pedidosAgrupados[status]?.length > 0 ? (
                  pedidosAgrupados[status].map(pedido => (
                    <PedidoCard key={pedido.id} pedido={pedido} />
                  ))
                ) : (
                  <div className="mt-8 flex flex-col items-center justify-center text-center text-grafite-300">
                    <div className="mb-2 text-3xl opacity-50">📦</div>
                    <p className="text-sm">Nenhum pedido</p>
                  </div>
                )}
              </div>
            </div>
          ))}
      </div>
    </div>
  );
}

export default PedidosKanban;