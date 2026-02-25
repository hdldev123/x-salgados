import React, { useState, useEffect, useCallback } from 'react';
import { buscarClientes } from '../../servicos/apiClientes';
import PedidosKanban from './PedidosKanban';
import Tabela from '../../componentes/Tabela/Tabela';
import Spinner from '../../componentes/Spinner/Spinner';
import { usePedidos } from '../../contextos/ContextoPedidos';
import '../PaginasListagem.css';

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
        console.error('Erro ao carregar dados:', err);
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
          className="status-select-tabela"
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
    <div>
      {/* Notificação */}
      {notificacao && (
        <div className={`notificacao ${notificacao.tipo}`}>
          <span>{notificacao.mensagem}</span>
          <button 
            className="notificacao-fechar"
            onClick={limparNotificacao}
          >
            ×
          </button>
        </div>
      )}

      <div className="cabecalho-pagina">
        <div className="cabecalho-info">
          <h1 className="titulo-pagina">Gestão de Pedidos</h1>
          <p className="subtitulo">
            {visualizacao === 'kanban' 
              ? 'Gerencie o fluxo de produção através do quadro Kanban'
              : 'Visualização em tabela de todos os pedidos'
            }
          </p>
        </div>
        
        <div className="cabecalho-acoes">
          <div className="visualizacao-toggle">
            <button
              className={`toggle-botao ${visualizacao === 'kanban' ? 'ativo' : ''}`}
              onClick={() => setVisualizacao('kanban')}
            >
              📋 Kanban
            </button>
            <button
              className={`toggle-botao ${visualizacao === 'tabela' ? 'ativo' : ''}`}
              onClick={() => setVisualizacao('tabela')}
            >
              📊 Tabela
            </button>
          </div>
        </div>
      </div>

      {/* Indicadores rápidos */}
      <div className="indicadores-rapidos">
        <div className="indicador">
          <span className="indicador-numero">{pedidos.length}</span>
          <span className="indicador-label">Total de Pedidos</span>
        </div>
        <div className="indicador">
          <span className="indicador-numero">
            {pedidos.filter(p => p.status === 'PENDENTE').length}
          </span>
          <span className="indicador-label">Pendentes</span>
        </div>
        <div className="indicador">
          <span className="indicador-numero">
            {pedidos.filter(p => p.status === 'EM_PREPARO').length}
          </span>
          <span className="indicador-label">Em Produção</span>
        </div>
        <div className="indicador">
          <span className="indicador-numero">
            {pedidos.filter(p => p.status === 'PRONTO').length}
          </span>
          <span className="indicador-label">Prontos</span>
        </div>
      </div>

      {/* Conteúdo principal */}
      {carregando && <Spinner />}
      {erro && <div className="mensagem-erro">{erro}</div>}
      
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
