import React, { useState, useEffect, useCallback } from 'react';
import { buscarLoteEntrega, liberarLote, buscarPedidosEmTransito } from '../../servicos/apiEntregas';
import { atualizarStatusPedido } from '../../servicos/apiPedidos';
import Spinner from '../../componentes/Spinner/Spinner';
import { Pedido } from '../../types';

// ─── Constantes do Lote ──────────────────────────────────────────────
const CAPACIDADE_MAXIMA = 1000;
const VOLUME_MINIMO = 900;

function RotasDeEntrega() {
  // Estado — Lote Pendente (pedidos Pronto)
  const [pedidosProntos, setPedidosProntos] = useState<Pedido[]>([]);
  const [totalItens, setTotalItens] = useState<number>(0);
  const [carregando, setCarregando] = useState<boolean>(true);
  const [erro, setErro] = useState<string | null>(null);
  const [loteIniciando, setLoteIniciando] = useState<boolean>(false);
  const [loteIniciado, setLoteIniciado] = useState<boolean>(false);

  // Estado — Lote Em Andamento (pedidos Em Entrega)
  const [pedidosEmTransito, setPedidosEmTransito] = useState<Pedido[]>([]);
  const [carregandoTransito, setCarregandoTransito] = useState<boolean>(true);
  const [valorTotalTransito, setValorTotalTransito] = useState<number>(0);

  // ─── Carregar dados do lote pendente ───────────────────────────────
  const carregarLote = useCallback(async () => {
    setCarregando(true);
    setErro(null);

    try {
      const resposta = await buscarLoteEntrega();
      setPedidosProntos(resposta.pedidosProntos || []);
      setTotalItens(resposta.totalItensAcumulados || 0);
    } catch (err: any) {
      setErro('Não foi possível carregar o lote de entrega.');
    } finally {
      setCarregando(false);
    }
  }, []);

  // ─── Carregar pedidos em trânsito ──────────────────────────────────
  const carregarEmTransito = useCallback(async () => {
    setCarregandoTransito(true);
    try {
      const resposta = await buscarPedidosEmTransito();
      setPedidosEmTransito(resposta.pedidosEmTransito || []);
      setValorTotalTransito(resposta.valorTotal || 0);
    } catch (err: any) {
      console.error('Erro ao carregar pedidos em trânsito:', err);
    } finally {
      setCarregandoTransito(false);
    }
  }, []);

  useEffect(() => {
    carregarLote();
    carregarEmTransito();
  }, [carregarLote, carregarEmTransito]);

  // ─── Liberar lote (POST /api/entregas/liberar-lote) ────────────────
  const handleLiberarLote = useCallback(async () => {
    setLoteIniciando(true);
    setErro(null);

    try {
      await liberarLote();
      setLoteIniciado(true);

      // Recarregar ambas as seções após 1.5s
      setTimeout(() => {
        setLoteIniciado(false);
        carregarLote();
        carregarEmTransito();
      }, 1500);
    } catch (err: any) {
      setErro(`Erro ao liberar o lote: ${err.message || String(err)}`);
    } finally {
      setLoteIniciando(false);
    }
  }, [carregarLote, carregarEmTransito]);

  // ─── Marcar pedido individual como entregue ────────────────────────
  const marcarEntregue = useCallback(async (pedido: Pedido) => {
    try {
      await atualizarStatusPedido(pedido.id, 'ENTREGUE');
      // Remover da lista local
      setPedidosEmTransito((prev) => prev.filter((p) => p.id !== pedido.id));
      setValorTotalTransito((prev) => prev - (pedido.total || 0));
    } catch (err: any) {
      setErro(`Erro ao marcar pedido como entregue: ${err.message || String(err)}`);
    }
  }, []);

  // ─── Helpers ───────────────────────────────────────────────────────
  const formatarMoeda = (valor: number) =>
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(valor || 0);

  const porcentagem = Math.min((totalItens / CAPACIDADE_MAXIMA) * 100, 100);
  const loteDisponivel = totalItens >= VOLUME_MINIMO;

  const corBarra = loteDisponivel
    ? 'bg-sucesso'
    : porcentagem > 50
      ? 'bg-aviso'
      : 'bg-primary-500';

  const valorTotalLote = pedidosProntos.reduce((acc, p) => acc + (p.total || 0), 0);

  // ─── Render ────────────────────────────────────────────────────────
  return (
    <div className="animate-fade-in">
      {/* Cabeçalho */}
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-grafite-800">Lote de Entrega</h1>
          <p className="mt-1 text-sm text-grafite-400">
            Pedidos prontos acumulados — capacidade do lote: {VOLUME_MINIMO} a {CAPACIDADE_MAXIMA} unidades
          </p>
        </div>

        <button
          className="inline-flex items-center gap-2 rounded-xl border border-grafite-300 px-5 py-2.5 text-sm font-medium text-grafite-600 transition-colors hover:bg-grafite-50 disabled:opacity-50"
          onClick={() => { carregarLote(); carregarEmTransito(); }}
          disabled={carregando || carregandoTransito}
        >
          🔄 Atualizar
        </button>
      </div>

      {carregando && <Spinner />}
      {erro && (
        <div className="mb-4 rounded-xl border border-erro/20 bg-erro/10 px-4 py-3 text-sm font-medium text-erro">
          {erro}
        </div>
      )}

      {/* Notificação de lote liberado */}
      {loteIniciado && (
        <div className="mb-4 animate-slide-up rounded-xl border border-sucesso/20 bg-sucesso/10 px-4 py-3 text-sm font-semibold text-sucesso">
          ✅ Lote liberado com sucesso! Todos os pedidos foram enviados para entrega.
        </div>
      )}

      {!carregando && (
        <>
          {/* ═══════════════════════════════════════════════════════════ */}
          {/* SEÇÃO 1 — LOTE PENDENTE (pedidos Pronto)                  */}
          {/* ═══════════════════════════════════════════════════════════ */}
          <div className="mb-8 overflow-hidden rounded-2xl border border-grafite-100 bg-white shadow-soft">
            {/* Barra superior decorativa */}
            <div className={`h-1.5 ${loteDisponivel ? 'bg-sucesso' : 'bg-grafite-200'}`} />

            <div className="p-6 sm:p-8">
              {/* Título + badge */}
              <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-center gap-3">
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary-50 text-2xl">
                    📦
                  </div>
                  <div>
                    <h2 className="text-xl font-bold text-grafite-800">Lote Pendente</h2>
                    <p className="text-sm text-grafite-400">
                      {pedidosProntos.length} pedido{pedidosProntos.length !== 1 ? 's' : ''} pronto{pedidosProntos.length !== 1 ? 's' : ''} para sair
                    </p>
                  </div>
                </div>

                <span className={`inline-flex items-center rounded-full px-4 py-1.5 text-xs font-bold uppercase tracking-wider ${loteDisponivel
                  ? 'bg-sucesso/10 text-sucesso'
                  : 'bg-aviso/10 text-aviso'
                  }`}>
                  {loteDisponivel ? '✅ Lote pronto' : '⏳ Acumulando...'}
                </span>
              </div>

              {pedidosProntos.length === 0 ? (
                /* ─── Estado vazio ─── */
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <div className="mb-4 text-5xl opacity-50">📭</div>
                  <h3 className="text-lg font-semibold text-grafite-600">Nenhum item acumulado para o próximo lote</h3>
                  <p className="mt-1 text-sm text-grafite-400">
                    Quando pedidos forem concluídos pela produção, eles aparecerão aqui automaticamente.
                  </p>
                </div>
              ) : (
                <>
                  {/* Estatísticas em grid */}
                  <div className="mb-6 grid grid-cols-2 gap-4 sm:grid-cols-4">
                    <div className="rounded-xl bg-grafite-50 p-4 text-center">
                      <span className="block text-2xl font-bold text-primary-500">{totalItens}</span>
                      <span className="text-xs font-medium uppercase tracking-wider text-grafite-400">Itens Acumulados</span>
                    </div>
                    <div className="rounded-xl bg-grafite-50 p-4 text-center">
                      <span className="block text-2xl font-bold text-primary-500">{VOLUME_MINIMO}</span>
                      <span className="text-xs font-medium uppercase tracking-wider text-grafite-400">Volume Mínimo</span>
                    </div>
                    <div className="rounded-xl bg-grafite-50 p-4 text-center">
                      <span className="block text-2xl font-bold text-primary-500">{pedidosProntos.length}</span>
                      <span className="text-xs font-medium uppercase tracking-wider text-grafite-400">Pedidos</span>
                    </div>
                    <div className="rounded-xl bg-grafite-50 p-4 text-center">
                      <span className="block text-2xl font-bold text-primary-500">{formatarMoeda(valorTotalLote)}</span>
                      <span className="text-xs font-medium uppercase tracking-wider text-grafite-400">Valor Total</span>
                    </div>
                  </div>

                  {/* ─── Barra de Progresso ─── */}
                  <div className="mb-2">
                    <div className="mb-1.5 flex items-center justify-between text-xs font-medium text-grafite-500">
                      <span>Progresso do lote</span>
                      <span className="font-bold">{totalItens} / {CAPACIDADE_MAXIMA} itens</span>
                    </div>
                    <div className="relative h-5 w-full overflow-hidden rounded-full bg-grafite-100">
                      <div
                        className={`h-full rounded-full transition-all duration-700 ease-out ${corBarra} ${loteDisponivel ? 'animate-pulse' : ''}`}
                        style={{ width: `${porcentagem}%` }}
                      />
                      {/* Marcador de 900 */}
                      <div
                        className="absolute top-0 h-full w-0.5 bg-grafite-400/50"
                        style={{ left: `${(VOLUME_MINIMO / CAPACIDADE_MAXIMA) * 100}%` }}
                      />
                    </div>
                    <div className="mt-1 flex justify-between text-[10px] font-medium text-grafite-300">
                      <span>0</span>
                      <span style={{ marginLeft: `${(VOLUME_MINIMO / CAPACIDADE_MAXIMA) * 100 - 5}%` }}>
                        {VOLUME_MINIMO} min
                      </span>
                      <span>{CAPACIDADE_MAXIMA}</span>
                    </div>
                  </div>

                  {/* ─── Botão Liberar Lote ─── */}
                  <div className="mt-6 flex justify-center">
                    <div className="relative">
                      {loteDisponivel && !loteIniciando && (
                        <div className="absolute -inset-1 animate-pulse rounded-2xl bg-sucesso/20 blur-md" />
                      )}
                      <button
                        className={`relative inline-flex items-center gap-3 rounded-2xl px-8 py-4 text-base font-bold transition-all duration-300 ${loteDisponivel
                          ? 'bg-sucesso text-white shadow-lg shadow-sucesso/30 hover:-translate-y-1 hover:shadow-xl hover:shadow-sucesso/40 active:translate-y-0'
                          : 'cursor-not-allowed bg-grafite-200 text-grafite-400'
                          }`}
                        onClick={handleLiberarLote}
                        disabled={!loteDisponivel || loteIniciando}
                        title={
                          loteDisponivel
                            ? 'Clique para liberar todos os pedidos para entrega'
                            : `Aguardando volume mínimo (${VOLUME_MINIMO} itens) — faltam ${VOLUME_MINIMO - totalItens} itens`
                        }
                      >
                        {loteIniciando ? (
                          <>
                            <span className="inline-block h-5 w-5 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                            Liberando Lote...
                          </>
                        ) : (
                          <>🚚 Liberar Lote para Entrega</>
                        )}
                      </button>
                    </div>
                  </div>

                  {!loteDisponivel && totalItens > 0 && (
                    <p className="mt-3 text-center text-xs font-medium text-aviso">
                      Faltam {VOLUME_MINIMO - totalItens} itens para atingir o volume mínimo de {VOLUME_MINIMO} unidades.
                    </p>
                  )}

                  {/* ─── Lista de pedidos prontos ─── */}
                  <div className="mt-6 rounded-xl border border-grafite-100">
                    <div className="border-b border-grafite-100 px-5 py-3">
                      <h3 className="text-sm font-bold text-grafite-700">
                        Pedidos no Lote ({pedidosProntos.length})
                      </h3>
                    </div>
                    <div className="divide-y divide-grafite-100">
                      {pedidosProntos.map((pedido) => {
                        const qtdItens = (pedido.itens || []).reduce(
                          (sum, item) => sum + (item.quantidade || 0), 0
                        );
                        return (
                          <div
                            key={pedido.id}
                            className="flex flex-col gap-2 px-5 py-3 transition-colors hover:bg-grafite-50/50 sm:flex-row sm:items-center sm:justify-between"
                          >
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center gap-2">
                                <span className="text-xs font-semibold text-grafite-400">#{pedido.id}</span>
                                <h4 className="font-semibold text-grafite-800">
                                  {pedido.cliente?.nome || `Cliente ${pedido.clienteId}`}
                                </h4>
                                <span className="rounded-lg bg-primary-50 px-2 py-0.5 text-xs font-bold text-primary-600">
                                  {qtdItens} un.
                                </span>
                              </div>
                              <p className="mt-0.5 truncate text-xs text-grafite-400">
                                📍 {pedido.cliente?.endereco || 'Endereço não disponível'}
                              </p>
                            </div>
                            <span className="text-sm font-semibold text-primary-500">
                              {formatarMoeda(pedido.total)}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>

          {/* ═══════════════════════════════════════════════════════════ */}
          {/* SEÇÃO 2 — LOTES EM ANDAMENTO (pedidos Em Entrega / Em Trânsito) */}
          {/* ═══════════════════════════════════════════════════════════ */}
          <div className="overflow-hidden rounded-2xl border border-grafite-100 bg-white shadow-soft">
            <div className="h-1.5 bg-info" />

            <div className="p-6 sm:p-8">
              <div className="mb-6 flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-info/10 text-2xl">
                  🚚
                </div>
                <div>
                  <h2 className="text-xl font-bold text-grafite-800">Lote em Transporte</h2>
                  <p className="text-sm text-grafite-400">
                    {pedidosEmTransito.length} pedido{pedidosEmTransito.length !== 1 ? 's' : ''} a caminho
                    {pedidosEmTransito.length > 0 && ` — ${formatarMoeda(valorTotalTransito)}`}
                  </p>
                </div>
              </div>

              {carregandoTransito ? (
                <Spinner />
              ) : pedidosEmTransito.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <div className="mb-4 text-5xl opacity-50">✅</div>
                  <h3 className="text-lg font-semibold text-grafite-600">Nenhuma entrega em andamento</h3>
                  <p className="mt-1 text-sm text-grafite-400">
                    Quando um lote for liberado, os pedidos aparecerão aqui para acompanhamento.
                  </p>
                </div>
              ) : (
                <div className="divide-y divide-grafite-100 rounded-xl border border-grafite-100">
                  {pedidosEmTransito.map((pedido) => {
                    const qtdItens = (pedido.itens || []).reduce(
                      (sum, item) => sum + (item.quantidade || 0), 0
                    );
                    return (
                      <div
                        key={pedido.id}
                        className="flex flex-col gap-3 p-5 transition-colors hover:bg-grafite-50/50 sm:flex-row sm:items-center sm:justify-between"
                      >
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-semibold text-grafite-400">#{pedido.id}</span>
                            <h4 className="font-semibold text-grafite-800">
                              {pedido.cliente?.nome || `Cliente ${pedido.clienteId}`}
                            </h4>
                            <span className="rounded-lg bg-info/10 px-2 py-0.5 text-xs font-bold text-info">
                              {qtdItens} un.
                            </span>
                            <span className="rounded-lg bg-aviso/10 px-2 py-0.5 text-xs font-bold text-aviso">
                              Em Trânsito
                            </span>
                          </div>
                          <p className="mt-0.5 truncate text-sm text-grafite-400">
                            📍 {pedido.cliente?.endereco || 'Endereço não disponível'}
                          </p>
                          <p className="text-sm text-grafite-400">
                            📞 {pedido.cliente?.telefone || 'Telefone não disponível'}
                          </p>
                          <span className="mt-1 inline-block text-sm font-semibold text-primary-500">
                            {formatarMoeda(pedido.total)}
                          </span>
                        </div>

                        <button
                          className="rounded-xl bg-sucesso px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition-all hover:bg-green-600 hover:shadow-md active:scale-95"
                          onClick={() => marcarEntregue(pedido)}
                        >
                          ✓ Marcar como Entregue
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

export default RotasDeEntrega;
