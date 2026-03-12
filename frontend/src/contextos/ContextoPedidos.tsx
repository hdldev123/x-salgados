import React, { createContext, useContext, useReducer, useCallback, ReactNode } from 'react';
import { buscarPedidos, atualizarStatusPedido, buscarPedidosPorStatus, BuscarPedidosParams } from '../servicos/apiPedidos';
import { Pedido } from '../types';

type Notificacao = {
  tipo: 'sucesso' | 'erro';
  mensagem: string;
} | null;

interface PedidosState {
  pedidos: Pedido[];
  carregando: boolean;
  erro: string | null;
  atualizandoStatus: number | null;
  notificacao: Notificacao;
}

type PedidosAction =
  | { type: 'CARREGAR_PEDIDOS_INICIO' }
  | { type: 'CARREGAR_PEDIDOS_SUCESSO'; payload: Pedido[] }
  | { type: 'CARREGAR_PEDIDOS_ERRO'; payload: string }
  | { type: 'ATUALIZAR_STATUS_INICIO'; payload: number }
  | { type: 'ATUALIZAR_STATUS_SUCESSO'; payload: { pedidoId: number; novoStatus: string | number } }
  | { type: 'ATUALIZAR_STATUS_ERRO'; payload: string }
  | { type: 'LIMPAR_NOTIFICACAO' };

const estadoInicial: PedidosState = {
  pedidos: [],
  carregando: false,
  erro: null,
  atualizandoStatus: null,
  notificacao: null
};

function pedidosReducer(estado: PedidosState, acao: PedidosAction): PedidosState {
  switch (acao.type) {
    case 'CARREGAR_PEDIDOS_INICIO':
      return { ...estado, carregando: true, erro: null };
    case 'CARREGAR_PEDIDOS_SUCESSO':
      return { ...estado, carregando: false, pedidos: acao.payload, erro: null };
    case 'CARREGAR_PEDIDOS_ERRO':
      return { ...estado, carregando: false, erro: acao.payload };
    case 'ATUALIZAR_STATUS_INICIO':
      return { ...estado, atualizandoStatus: acao.payload };
    case 'ATUALIZAR_STATUS_SUCESSO':
      return {
        ...estado,
        atualizandoStatus: null,
        pedidos: estado.pedidos.map(pedido =>
          pedido.id === acao.payload.pedidoId
            ? { ...pedido, status: acao.payload.novoStatus }
            : pedido
        ),
        notificacao: { tipo: 'sucesso', mensagem: 'Status do pedido atualizado com sucesso' }
      };
    case 'ATUALIZAR_STATUS_ERRO':
      return {
        ...estado,
        atualizandoStatus: null,
        erro: acao.payload,
        notificacao: { tipo: 'erro', mensagem: acao.payload }
      };
    case 'LIMPAR_NOTIFICACAO':
      return { ...estado, notificacao: null };
    default:
      return estado;
  }
}

export interface PedidosContextProps extends PedidosState {
  pedidosPendentes: Pedido[];
  pedidosEmProducao: Pedido[];
  pedidosProntos: Pedido[];
  pedidosEmEntrega: Pedido[];
  pedidosEntregues: Pedido[];
  totalPedidos: number;
  totalValor: number;
  carregarPedidos: (parametros?: BuscarPedidosParams) => Promise<void>;
  alterarStatusPedido: (pedidoId: number, novoStatus: string | number) => Promise<void>;
  buscarPorStatus: (status: string) => Promise<Pedido[]>;
  limparNotificacao: () => void;
}

const ContextoPedidos = createContext<PedidosContextProps | undefined>(undefined);

export function ProviderPedidos({ children }: { children: ReactNode }) {
  const [estado, dispatch] = useReducer(pedidosReducer, estadoInicial);

  const carregarPedidos = useCallback(async (parametros: BuscarPedidosParams = {}) => {
    dispatch({ type: 'CARREGAR_PEDIDOS_INICIO' });

    try {
      const resposta = await buscarPedidos(parametros);
      dispatch({ type: 'CARREGAR_PEDIDOS_SUCESSO', payload: resposta.dados || [] });
    } catch (erro: any) {
      dispatch({ type: 'CARREGAR_PEDIDOS_ERRO', payload: erro.message });
    }
  }, []);

  const alterarStatusPedido = useCallback(async (pedidoId: number, novoStatus: string | number) => {
    dispatch({ type: 'ATUALIZAR_STATUS_INICIO', payload: pedidoId });

    try {
      await atualizarStatusPedido(pedidoId, novoStatus);
      dispatch({ type: 'ATUALIZAR_STATUS_SUCESSO', payload: { pedidoId, novoStatus } });

      setTimeout(() => {
        dispatch({ type: 'LIMPAR_NOTIFICACAO' });
      }, 3000);
    } catch (erro: any) {
      dispatch({ type: 'ATUALIZAR_STATUS_ERRO', payload: erro.message });

      setTimeout(() => {
        dispatch({ type: 'LIMPAR_NOTIFICACAO' });
      }, 5000);
    }
  }, []);

  const buscarPorStatus = useCallback(async (status: string): Promise<Pedido[]> => {
    try {
      const resposta = await buscarPedidosPorStatus(status);
      return resposta.dados || [];
    } catch (erro) {
      return [];
    }
  }, []);

  const limparNotificacao = useCallback(() => {
    dispatch({ type: 'LIMPAR_NOTIFICACAO' });
  }, []);

  const seletores = {
    pedidosPendentes: estado.pedidos.filter(p => p.status === 'PENDENTE'),
    pedidosEmProducao: estado.pedidos.filter(p => p.status === 'EM_PREPARO'),
    pedidosProntos: estado.pedidos.filter(p => p.status === 'PRONTO'),
    pedidosEmEntrega: estado.pedidos.filter(p => p.status === 'A_CAMINHO'),
    pedidosEntregues: estado.pedidos.filter(p => p.status === 'ENTREGUE'),
    totalPedidos: estado.pedidos.length,
    totalValor: estado.pedidos.reduce((total, pedido) => total + pedido.total, 0)
  };

  const valor: PedidosContextProps = {
    ...estado,
    ...seletores,
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

export function usePedidos(): PedidosContextProps {
  const contexto = useContext(ContextoPedidos);
  if (!contexto) {
    throw new Error('usePedidos deve ser usado dentro de um ProviderPedidos');
  }
  return contexto;
}

export default ContextoPedidos;