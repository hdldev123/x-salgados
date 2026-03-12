import React, { useState, useEffect, useCallback } from 'react';
import { buscarPedidos } from '../../servicos/apiPedidos';
import Tabela, { ColunaTabela } from '../../componentes/Tabela/Tabela';
import Spinner from '../../componentes/Spinner/Spinner';
import { Pedido } from '../../types';

function ListagemPedidosCancelados() {
  const [pedidos, setPedidos] = useState<Pedido[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState<string | null>(null);

  const carregarPedidosCancelados = useCallback(async () => {
    try {
      setCarregando(true);
      setErro(null);
      const resultado = await buscarPedidos({ status: 6, tamanhoPagina: 200 });
      setPedidos(resultado.dados || []);
    } catch (err: any) {
      if (err.mensagem) {
        setErro(err.mensagem);
      } else {
        setErro('Erro ao carregar pedidos cancelados.');
      }
    } finally {
      setCarregando(false);
    }
  }, []);

  useEffect(() => {
    carregarPedidosCancelados();
  }, [carregarPedidosCancelados]);

  // Calcula o valor total perdido
  const valorTotalPerdido = pedidos.reduce((acc, p) => acc + (p.total || 0), 0);

  const colunas: ColunaTabela<Pedido>[] = [
    { cabecalho: 'ID', chave: 'id' },
    {
      cabecalho: 'Cliente',
      render: (pedido) => pedido.cliente?.nome || `Cliente ${pedido.clienteId}`,
    },
    {
      cabecalho: 'Data do Pedido',
      render: (pedido) =>
        new Date(pedido.dataPedido).toLocaleDateString('pt-BR', {
          day: '2-digit',
          month: '2-digit',
          year: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
        }),
    },
    {
      cabecalho: 'Status',
      render: () => (
        <span className="inline-flex items-center gap-1.5 rounded-full bg-erro/10 px-3 py-1 text-xs font-semibold text-erro ring-1 ring-inset ring-erro/20">
          <span className="h-1.5 w-1.5 rounded-full bg-erro" />
          Cancelado
        </span>
      ),
    },
    {
      cabecalho: 'Valor Perdido',
      render: (pedido) => (
        <span className="font-semibold text-erro">
          R$ {(pedido.total || 0).toFixed(2)}
        </span>
      ),
    },
    {
      cabecalho: 'Observações',
      render: (pedido) => (
        <span className="max-w-[200px] truncate text-grafite-400" title={pedido.observacoes || '—'}>
          {pedido.observacoes || '—'}
        </span>
      ),
    },
  ];

  return (
    <div className="animate-fade-in">
      {/* Cabeçalho */}
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-grafite-800">Pedidos Cancelados</h1>
          <p className="mt-1 text-sm text-grafite-400">
            Histórico de pedidos cancelados e prejuízos associados
          </p>
        </div>

        <button
          onClick={carregarPedidosCancelados}
          className="flex items-center gap-2 self-start rounded-xl bg-grafite-100 px-4 py-2.5 text-sm font-medium text-grafite-600 transition-all duration-200 hover:bg-grafite-200 hover:text-grafite-800"
        >
          🔄 Atualizar
        </button>
      </div>

      {/* Cards de resumo */}
      <div className="mb-6 grid grid-cols-1 gap-3 sm:grid-cols-3">
        <div className="rounded-2xl border border-erro/20 bg-erro/5 p-4 text-center shadow-soft transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg">
          <span className="block text-2xl font-bold text-erro">{pedidos.length}</span>
          <span className="mt-1 block text-xs uppercase tracking-wider text-grafite-400">
            Total Cancelados
          </span>
        </div>

        <div className="rounded-2xl border border-erro/20 bg-erro/5 p-4 text-center shadow-soft transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg">
          <span className="block text-2xl font-bold text-erro">
            R$ {valorTotalPerdido.toFixed(2)}
          </span>
          <span className="mt-1 block text-xs uppercase tracking-wider text-grafite-400">
            Valor Total Perdido
          </span>
        </div>

        <div className="rounded-2xl border border-erro/20 bg-erro/5 p-4 text-center shadow-soft transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg">
          <span className="block text-2xl font-bold text-erro">
            R$ {pedidos.length > 0 ? (valorTotalPerdido / pedidos.length).toFixed(2) : '0.00'}
          </span>
          <span className="mt-1 block text-xs uppercase tracking-wider text-grafite-400">
            Ticket Médio Perdido
          </span>
        </div>
      </div>

      {/* Conteúdo principal */}
      {carregando && <Spinner />}
      {erro && (
        <div className="rounded-xl border border-erro/20 bg-erro/10 px-4 py-3 text-sm font-medium text-erro">
          {erro}
        </div>
      )}

      {!carregando && !erro && <Tabela<Pedido> colunas={colunas} dados={pedidos} />}
    </div>
  );
}

export default ListagemPedidosCancelados;
