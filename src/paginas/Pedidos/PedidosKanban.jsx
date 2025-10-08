import React, { useState, useEffect, useCallback } from 'react';
import './PedidosKanban.css';

const STATUS_CONFIG = {
  PENDENTE: {
    label: 'Pendente',
    cor: '#ffc107',
    ordem: 1,
    descricao: 'Pedidos aguardando produção'
  },
  EM_PRODUCAO: {
    label: 'Em Produção',
    cor: '#4CAF50',
    ordem: 2,
    descricao: 'Pedidos sendo preparados'
  },
  PRONTO: {
    label: 'Pronto',
    cor: '#28A745',
    ordem: 3,
    descricao: 'Pedidos prontos para entrega'
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

    // Agrupar pedidos por status (considerando também os status atuais do mock)
    pedidosAtualizados.forEach(pedido => {
      let statusMapeado = pedido.status;
      
      // Mapear os status existentes no mock para os do Kanban
      switch (pedido.status) {
        case 'EM_PREPARO':
          statusMapeado = 'EM_PRODUCAO';
          break;
        case 'A_CAMINHO':
        case 'ENTREGUE':
        case 'CANCELADO':
          // Estes status não aparecem no Kanban (já saíram do fluxo de produção)
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
      console.error('Erro ao atualizar status:', error);
      // Reverter mudança local em caso de erro
      setPedidosAtualizados(pedidos);
    } finally {
      setPedidoAtualizando(null);
    }
  }, [onStatusChange, pedidos]);

  const StatusDropdown = ({ pedido }) => (
    <div className="status-dropdown">
      <select
        className="status-select"
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
      </select>
    </div>
  );

  const PedidoCard = ({ pedido }) => (
    <div className={`pedido-card ${pedidoAtualizando === pedido.id ? 'updating' : ''}`}>
      <div className="pedido-card-header">
        <span className="pedido-id">#{pedido.id}</span>
        <span className="pedido-total">{formatarMoeda(pedido.total)}</span>
      </div>
      
      <div className="pedido-cliente">
        {obterNomeCliente(pedido.clienteId)}
      </div>
      
      <div className="pedido-data">
        {new Date(pedido.dataPedido).toLocaleDateString('pt-BR')}
      </div>
      
      <div className="pedido-card-footer">
        <StatusDropdown pedido={pedido} />
        {pedidoAtualizando === pedido.id && (
          <div className="updating-indicator">
            <div className="spinner-mini"></div>
            <span>Atualizando...</span>
          </div>
        )}
      </div>
    </div>
  );

  const pedidosAgrupados = agruparPedidosPorStatus();

  return (
    <div className="kanban-board">
      <div className="kanban-header">
        <h2 className="kanban-title">Fluxo de Produção</h2>
        <p className="kanban-subtitle">Gerencie o status dos pedidos através do fluxo de produção</p>
      </div>

      <div className="kanban-container">
        {Object.entries(STATUS_CONFIG)
          .sort(([,a], [,b]) => a.ordem - b.ordem)
          .map(([status, config]) => (
            <div key={status} className="kanban-coluna">
              <div className="kanban-coluna-header" style={{ borderTopColor: config.cor }}>
                <div className="header-info">
                  <h3 className="coluna-titulo">{config.label}</h3>
                  <p className="coluna-descricao">{config.descricao}</p>
                </div>
                <span className="pedidos-contador" style={{ backgroundColor: config.cor }}>
                  {pedidosAgrupados[status]?.length || 0}
                </span>
              </div>
              
              <div className="kanban-lista">
                {pedidosAgrupados[status]?.length > 0 ? (
                  pedidosAgrupados[status].map(pedido => (
                    <PedidoCard key={pedido.id} pedido={pedido} />
                  ))
                ) : (
                  <div className="coluna-vazia">
                    <div className="vazia-icon">📦</div>
                    <p>Nenhum pedido</p>
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