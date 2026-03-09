import React, { createContext, useContext, useReducer, useCallback } from 'react';
import { buscarPedidos, atualizarStatusPedido, buscarPedidosPorStatus } from '../servicos/apiPedidos';

// Tipos de ações
const TIPOS_ACAO = {
  CARREGAR_PEDIDOS_INICIO: 'CARREGAR_PEDIDOS_INICIO',
  CARREGAR_PEDIDOS_SUCESSO: 'CARREGAR_PEDIDOS_SUCESSO',
  CARREGAR_PEDIDOS_ERRO: 'CARREGAR_PEDIDOS_ERRO',
  ATUALIZAR_STATUS_INICIO: 'ATUALIZAR_STATUS_INICIO',
  ATUALIZAR_STATUS_SUCESSO: 'ATUALIZAR_STATUS_SUCESSO',
  ATUALIZAR_STATUS_ERRO: 'ATUALIZAR_STATUS_ERRO',
  LIMPAR_NOTIFICACAO: 'LIMPAR_NOTIFICACAO'
};

// Estado inicial
const estadoInicial = {
  pedidos: [],
  carregando: false,
  erro: null,
  atualizandoStatus: null,
  notificacao: null
};

// Reducer para gerenciar o estado
function pedidosReducer(estado, acao) {
  switch (acao.type) {
    case TIPOS_ACAO.CARREGAR_PEDIDOS_INICIO:
      return {
        ...estado,
        carregando: true,
        erro: null
      };

    case TIPOS_ACAO.CARREGAR_PEDIDOS_SUCESSO:
      return {
        ...estado,
        carregando: false,
        pedidos: acao.payload,
        erro: null
      };

    case TIPOS_ACAO.CARREGAR_PEDIDOS_ERRO:
      return {
        ...estado,
        carregando: false,
        erro: acao.payload
      };

    case TIPOS_ACAO.ATUALIZAR_STATUS_INICIO:
      return {
        ...estado,
        atualizandoStatus: acao.payload
      };

    case TIPOS_ACAO.ATUALIZAR_STATUS_SUCESSO:
      return {
        ...estado,
        atualizandoStatus: null,
        pedidos: estado.pedidos.map(pedido =>
          pedido.id === acao.payload.pedidoId
            ? { ...pedido, status: acao.payload.novoStatus }
            : pedido
        ),
        notificacao: {
          tipo: 'sucesso',
          mensagem: 'Status do pedido atualizado com sucesso'
        }
      };

    case TIPOS_ACAO.ATUALIZAR_STATUS_ERRO:
      return {
        ...estado,
        atualizandoStatus: null,
        erro: acao.payload,
        notificacao: {
          tipo: 'erro',
          mensagem: acao.payload
        }
      };

    case TIPOS_ACAO.LIMPAR_NOTIFICACAO:
      return {
        ...estado,
        notificacao: null
      };

    default:
      return estado;
  }
}

// Contexto
const ContextoPedidos = createContext();

// Provider do contexto
export function ProviderPedidos({ children }) {
  const [estado, dispatch] = useReducer(pedidosReducer, estadoInicial);

  // Função para carregar pedidos
  const carregarPedidos = useCallback(async (parametros = {}) => {
    dispatch({ type: TIPOS_ACAO.CARREGAR_PEDIDOS_INICIO });

    try {
      const resposta = await buscarPedidos(parametros);
      dispatch({
        type: TIPOS_ACAO.CARREGAR_PEDIDOS_SUCESSO,
        payload: resposta.dados
      });
    } catch (erro) {
      dispatch({
        type: TIPOS_ACAO.CARREGAR_PEDIDOS_ERRO,
        payload: erro.message
      });
    }
  }, []);

  // Função para atualizar status
  const alterarStatusPedido = useCallback(async (pedidoId, novoStatus) => {
    dispatch({
      type: TIPOS_ACAO.ATUALIZAR_STATUS_INICIO,
      payload: pedidoId
    });

    try {
      await atualizarStatusPedido(pedidoId, novoStatus);
      dispatch({
        type: TIPOS_ACAO.ATUALIZAR_STATUS_SUCESSO,
        payload: { pedidoId, novoStatus }
      });

      // Limpar notificação após 3 segundos
      setTimeout(() => {
        dispatch({ type: TIPOS_ACAO.LIMPAR_NOTIFICACAO });
      }, 3000);

    } catch (erro) {
      dispatch({
        type: TIPOS_ACAO.ATUALIZAR_STATUS_ERRO,
        payload: erro.message
      });

      // Limpar notificação de erro após 5 segundos
      setTimeout(() => {
        dispatch({ type: TIPOS_ACAO.LIMPAR_NOTIFICACAO });
      }, 5000);
    }
  }, []);

  // Função para buscar pedidos por status
  const buscarPorStatus = useCallback(async (status) => {
    try {
      const resposta = await buscarPedidosPorStatus(status);
      return resposta.dados;
    } catch (erro) {
      // toast.error('Erro ao buscar pedidos por status.')
      return [];
    }
  }, []);

  // Função para limpar notificação manualmente
  const limparNotificacao = useCallback(() => {
    dispatch({ type: TIPOS_ACAO.LIMPAR_NOTIFICACAO });
  }, []);

  // Seletores úteis
  const seletores = {
    pedidosPendentes: estado.pedidos.filter(p => p.status === 'PENDENTE'),
    pedidosEmProducao: estado.pedidos.filter(p => p.status === 'EM_PREPARO'),
    pedidosProntos: estado.pedidos.filter(p => p.status === 'PRONTO'),
    pedidosEmEntrega: estado.pedidos.filter(p => p.status === 'A_CAMINHO'),
    pedidosEntregues: estado.pedidos.filter(p => p.status === 'ENTREGUE'),
    totalPedidos: estado.pedidos.length,
    totalValor: estado.pedidos.reduce((total, pedido) => total + pedido.total, 0)
  };

  const valor = {
    // Estado
    ...estado,

    // Seletores
    ...seletores,

    // Ações
    carregarPedidos,
    alterarStatusPedido,
    buscarPorStatus,
    limparNotificacao
  };

  return (
    <ContextoPedidos.Provider value={valor}>
      {children}
    </ContextoPedidos.Provider>
  );
}

// Hook personalizado para usar o contexto
export function usePedidos() {
  const contexto = useContext(ContextoPedidos);

  if (!contexto) {
    throw new Error('usePedidos deve ser usado dentro de um ProviderPedidos');
  }

  return contexto;
}

export default ContextoPedidos;