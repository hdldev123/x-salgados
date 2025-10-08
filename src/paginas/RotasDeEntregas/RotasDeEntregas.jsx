import React, { useState, useEffect, useCallback } from 'react';
import { buscarPedidosPorStatus, atualizarStatusPedido } from '../../servicos/apiPedidos';
import { usePedidos } from '../../contextos/ContextoPedidos';
import Spinner from '../../componentes/Spinner/Spinner';
import './RotasDeEntregas.css';

// Constante para máximo de pedidos por rota
const MAX_PEDIDOS_POR_ROTA = 10;

// Função para criar rotas automáticas (máximo 10 pedidos por rota)
const criarRotasAutomaticas = (pedidos) => {
  const rotas = [];
  
  for (let i = 0; i < pedidos.length; i += MAX_PEDIDOS_POR_ROTA) {
    const pedidosRota = pedidos.slice(i, i + MAX_PEDIDOS_POR_ROTA);
    const numeroRota = Math.floor(i / MAX_PEDIDOS_POR_ROTA) + 1;
    
    // Calcular valor total da rota
    const valorTotal = pedidosRota.reduce((total, pedido) => total + pedido.total, 0);
    
    // Extrair CEPs únicos para otimização
    const cepsUnicos = [...new Set(pedidosRota.map(pedido => 
      pedido.cliente?.endereco?.split(',').pop()?.trim() || 'N/A'
    ))];
    
    rotas.push({
      id: numeroRota,
      numero: numeroRota,
      pedidos: pedidosRota,
      valorTotal,
      cepsUnicos,
      status: 'AGUARDANDO', // AGUARDANDO, EM_ENTREGA, CONCLUIDA
      dataInicio: null,
      dataConclusao: null
    });
  }
  
  return rotas;
};

function RotasDeEntrega() {
  const [rotas, setRotas] = useState([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState(null);
  const [rotaAtualizando, setRotaAtualizando] = useState(null);

  // Usar contexto de pedidos para atualizações em tempo real
  const { alterarStatusPedido, notificacao } = usePedidos();

  const carregarRotasDeEntrega = useCallback(async () => {
    setCarregando(true);
    setErro(null);
    
    try {
      // Buscar pedidos com status 'PRONTO' (prontos para entrega)
      const resposta = await buscarPedidosPorStatus('PRONTO');
      
      if (resposta.dados && resposta.dados.length > 0) {
        const rotasCriadas = criarRotasAutomaticas(resposta.dados);
        setRotas(rotasCriadas);
      } else {
        setRotas([]);
      }
    } catch (err) {
      setErro("Não foi possível carregar as rotas de entrega.");
      console.error('Erro ao carregar rotas:', err);
    } finally {
      setCarregando(false);
    }
  }, []);

  useEffect(() => {
    carregarRotasDeEntrega();
  }, [carregarRotasDeEntrega]);

  // Função para iniciar rota (mudar status dos pedidos para EM_ENTREGA)
  const iniciarRota = useCallback(async (rota) => {
    setRotaAtualizando(rota.id);
    
    try {
      // Atualizar status de todos os pedidos da rota para A_CAMINHO
      const promessas = rota.pedidos.map(pedido => 
        alterarStatusPedido(pedido.id, 'A_CAMINHO')
      );
      
      await Promise.all(promessas);
      
      // Atualizar status da rota localmente
      setRotas(prevRotas => 
        prevRotas.map(r => 
          r.id === rota.id 
            ? { ...r, status: 'EM_ENTREGA', dataInicio: new Date() }
            : r
        )
      );
      
      // Recarregar rotas após mudança
      setTimeout(() => {
        carregarRotasDeEntrega();
      }, 1000);
      
    } catch (err) {
      setErro(`Erro ao iniciar rota ${rota.numero}: ${err.message}`);
    } finally {
      setRotaAtualizando(null);
    }
  }, [alterarStatusPedido, carregarRotasDeEntrega]);

  // Função para marcar pedido como entregue
  const marcarPedidoEntregue = useCallback(async (pedido, rotaId) => {
    try {
      await alterarStatusPedido(pedido.id, 'ENTREGUE');
      
      // Atualizar localmente removendo o pedido da rota
      setRotas(prevRotas => 
        prevRotas.map(rota => {
          if (rota.id === rotaId) {
            const pedidosAtualizados = rota.pedidos.filter(p => p.id !== pedido.id);
            return {
              ...rota,
              pedidos: pedidosAtualizados,
              status: pedidosAtualizados.length === 0 ? 'CONCLUIDA' : rota.status,
              dataConclusao: pedidosAtualizados.length === 0 ? new Date() : null
            };
          }
          return rota;
        })
      );
      
    } catch (err) {
      setErro(`Erro ao marcar pedido como entregue: ${err.message}`);
    }
  }, [alterarStatusPedido]);

  const formatarMoeda = (valor) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(valor);
  };

  const formatarHora = (data) => {
    return data ? new Date(data).toLocaleTimeString('pt-BR', { 
      hour: '2-digit', 
      minute: '2-digit' 
    }) : '';
  };

  return (
    <div>
      <div className="cabecalho-rotas">
        <div className="cabecalho-info">
          <h1 className="titulo-pagina">Rotas de Entrega</h1>
          <p className="subtitulo">
            Rotas criadas automaticamente com pedidos prontos para entrega
          </p>
        </div>
        
        <button 
          className="botao botao-secundario"
          onClick={carregarRotasDeEntrega}
          disabled={carregando}
        >
          🔄 Atualizar Rotas
        </button>
      </div>

      {/* Estatísticas rápidas */}
      <div className="estatisticas-rotas">
        <div className="estatistica">
          <span className="numero">{rotas.length}</span>
          <span className="label">Rotas Criadas</span>
        </div>
        <div className="estatistica">
          <span className="numero">
            {rotas.reduce((total, rota) => total + rota.pedidos.length, 0)}
          </span>
          <span className="label">Pedidos Prontos</span>
        </div>
        <div className="estatistica">
          <span className="numero">
            {formatarMoeda(rotas.reduce((total, rota) => total + rota.valorTotal, 0))}
          </span>
          <span className="label">Valor Total</span>
        </div>
      </div>

      {carregando && <Spinner />}
      {erro && <div className="mensagem-erro">{erro}</div>}
      
      {!carregando && rotas.length === 0 && (
        <div className="estado-vazio">
          <div className="vazia-icon">🚚</div>
          <h3>Nenhuma rota disponível</h3>
          <p>Não há pedidos prontos para entrega no momento.</p>
        </div>
      )}

      <div className="rotas-container">
        {rotas.map(rota => (
          <div key={rota.id} className={`rota-card ${rota.status.toLowerCase()}`}>
            <div className="rota-header">
              <div className="rota-info">
                <h2 className="rota-titulo">Rota de Entrega {rota.numero}</h2>
                <div className="rota-meta">
                  <span className="pedidos-count">{rota.pedidos.length} pedidos</span>
                  <span className="valor-rota">{formatarMoeda(rota.valorTotal)}</span>
                </div>
              </div>
              
              <div className="rota-status">
                <span className={`status-badge ${rota.status.toLowerCase()}`}>
                  {rota.status === 'AGUARDANDO' && '⏳ Aguardando'}
                  {rota.status === 'EM_ENTREGA' && '🚚 Em Entrega'}
                  {rota.status === 'CONCLUIDA' && '✅ Concluída'}
                </span>
              </div>
            </div>

            <div className="rota-ceps">
              <strong>CEPs da rota:</strong>
              <div className="ceps-lista">
                {rota.cepsUnicos.map((cep, index) => (
                  <span key={index} className="cep-badge">{cep}</span>
                ))}
              </div>
            </div>

            <div className="pedidos-rota">
              {rota.pedidos.map(pedido => (
                <div key={pedido.id} className="pedido-entrega">
                  <div className="pedido-info">
                    <h4 className="cliente-nome">{pedido.cliente?.nome || `Cliente ${pedido.clienteId}`}</h4>
                    <p className="cliente-endereco">{pedido.cliente?.endereco || 'Endereço não disponível'}</p>
                    <p className="cliente-telefone">📞 {pedido.cliente?.telefone || 'Telefone não disponível'}</p>
                    <span className="pedido-valor">{formatarMoeda(pedido.total)}</span>
                  </div>
                  
                  {rota.status === 'EM_ENTREGA' && (
                    <button
                      className="botao-entregar"
                      onClick={() => marcarPedidoEntregue(pedido, rota.id)}
                    >
                      ✓ Entregue
                    </button>
                  )}
                </div>
              ))}
            </div>

            <div className="rota-acoes">
              {rota.status === 'AGUARDANDO' && (
                <button
                  className="botao botao-primario"
                  onClick={() => iniciarRota(rota)}
                  disabled={rotaAtualizando === rota.id}
                >
                  {rotaAtualizando === rota.id ? '⏳ Iniciando...' : '🚚 Iniciar Rota'}
                </button>
              )}
              
              {rota.status === 'EM_ENTREGA' && rota.dataInicio && (
                <div className="info-entrega">
                  <span>Iniciada às {formatarHora(rota.dataInicio)}</span>
                </div>
              )}
              
              {rota.status === 'CONCLUIDA' && rota.dataConclusao && (
                <div className="info-entrega concluida">
                  <span>✅ Concluída às {formatarHora(rota.dataConclusao)}</span>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default RotasDeEntrega;
