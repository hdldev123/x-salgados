import React, { useState, useEffect, useRef } from 'react';
import { buscarDashboardCompleto, DashboardCompletoResponse, buscarInsightIA, enviarMensagemIA, MensagemChat } from '../../servicos/apiDashboard';
import Spinner from '../../componentes/Spinner/Spinner';

import {
  BarChart, Bar,
  PieChart, Pie, Cell,
  LineChart, Line,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from 'recharts';

// ─── Helpers ────────────────────────────────────────────────────────
const formatarMoeda = (valor: number | undefined) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(valor || 0);

const CORES_PIE = ['#16a34a', '#dc2626']; // sucesso, erro

// ─── Card Consultor IA (Insight + Chat) ─────────────────────────────
interface CardConsultorIAProps {
  insight: string | null;
  carregandoInsight: boolean;
}

function CardConsultorIA({ insight, carregandoInsight }: CardConsultorIAProps) {
  const [chatAberto, setChatAberto] = useState(false);
  const [historico, setHistorico] = useState<MensagemChat[]>([]);
  const [mensagem, setMensagem] = useState('');
  const [enviando, setEnviando] = useState(false);
  const fimChatRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (chatAberto) {
      fimChatRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [historico, chatAberto]);

  const enviar = async () => {
    const texto = mensagem.trim();
    if (!texto || enviando) return;

    const novaMensagem: MensagemChat = { role: 'user', content: texto };
    const novoHistorico = [...historico, novaMensagem];
    setHistorico(novoHistorico);
    setMensagem('');
    setEnviando(true);

    try {
      const res = await enviarMensagemIA(texto, historico);
      setHistorico([...novoHistorico, { role: 'assistant', content: res.resposta }]);
    } catch {
      setHistorico([...novoHistorico, { role: 'assistant', content: '🤖 Erro ao processar. Tente novamente.' }]);
    } finally {
      setEnviando(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      enviar();
    }
  };

  return (
    <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-slate-800 to-black shadow-xl shadow-black/20">
      {/* Decoração de fundo premium */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden rounded-2xl">
        <div className="absolute -right-12 -top-12 h-56 w-56 rounded-full bg-cyan-500/8 blur-3xl" />
        <div className="absolute -bottom-12 -left-12 h-56 w-56 rounded-full bg-purple-500/6 blur-3xl" />
        <div className="absolute right-1/3 top-1/2 h-32 w-32 rounded-full bg-blue-500/5 blur-2xl" />
      </div>
      {/* Borda sutil gradiente no topo */}
      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-cyan-400/30 to-transparent" />

      {/* ─── Topo: Dica do Dia ─── */}
      <div className="relative z-10 flex flex-col gap-3 p-4 sm:flex-row sm:items-start sm:gap-4 sm:p-6">
        <div className="flex items-center gap-3 sm:block">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-cyan-500/20 to-purple-500/20 text-xl ring-1 ring-white/10 sm:h-12 sm:w-12 sm:text-2xl">
            🤖
          </div>
        </div>
        <div className="min-w-0 flex-1">
          <div className="mb-1 flex items-center gap-2">
            <h3 className="text-sm font-bold uppercase tracking-wider text-slate-300">Consultor Virtual</h3>
            <span className="inline-flex items-center rounded-full bg-cyan-500/15 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-cyan-400 ring-1 ring-cyan-500/20">
              Grok IA
            </span>
          </div>
          {carregandoInsight ? (
            <div className="space-y-2.5 pt-1">
              <div className="h-4 w-full animate-pulse rounded-lg bg-white/5" />
              <div className="h-4 w-3/4 animate-pulse rounded-lg bg-white/5" />
            </div>
          ) : (
            <p className="text-[15px] leading-relaxed text-slate-100">{insight}</p>
          )}
        </div>

        {/* Botão abrir/fechar chat */}
        <button
          onClick={() => setChatAberto((v) => !v)}
          className="w-full shrink-0 flex items-center justify-center gap-1.5 rounded-xl bg-gradient-to-r from-cyan-600 to-blue-600 px-3 py-2 text-sm font-semibold text-white shadow-lg shadow-cyan-500/20 transition hover:from-cyan-500 hover:to-blue-500 active:scale-95 sm:w-auto"
        >
          {chatAberto ? '✕ Fechar' : '💬 Perguntar'}
        </button>
      </div>

      {/* ─── Chat ─── */}
      {chatAberto && (
        <div className="relative z-10 flex h-80 flex-col border-t border-white/10">
          {/* Histórico — ocupa o espaço restante e scrolla */}
          <div className="flex flex-1 flex-col gap-3 overflow-y-auto p-4">
            {historico.length === 0 && (
              <p className="text-center text-sm text-slate-400">Pergunte qualquer coisa sobre a sua loja 👇</p>
            )}
            {historico.map((msg, i) => (
              <div
                key={i}
                className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-[80%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed ${
                    msg.role === 'user'
                      ? 'rounded-br-sm bg-gradient-to-r from-cyan-600 to-blue-600 text-white font-medium'
                      : 'rounded-bl-sm bg-white/10 text-slate-100'
                  }`}
                >
                  {msg.content}
                </div>
              </div>
            ))}
            {enviando && (
              <div className="flex justify-start">
                <div className="rounded-2xl rounded-bl-sm bg-white/10 px-4 py-3">
                  <div className="flex gap-1">
                    <span className="h-2 w-2 animate-bounce rounded-full bg-slate-400" style={{ animationDelay: '0ms' }} />
                    <span className="h-2 w-2 animate-bounce rounded-full bg-slate-400" style={{ animationDelay: '150ms' }} />
                    <span className="h-2 w-2 animate-bounce rounded-full bg-slate-400" style={{ animationDelay: '300ms' }} />
                  </div>
                </div>
              </div>
            )}
            <div ref={fimChatRef} />
          </div>

          {/* Input */}
          <div className="flex gap-2 border-t border-white/10 p-3">
            <input
              type="text"
              value={mensagem}
              onChange={(e) => setMensagem(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Ex: Por que os cancelamentos estão altos?"
              disabled={enviando}
              className="flex-1 rounded-xl bg-white/10 px-4 py-2.5 text-sm text-slate-100 placeholder-slate-500 outline-none focus:ring-2 focus:ring-cyan-500/50 disabled:opacity-50"
            />
            <button
              onClick={enviar}
              disabled={enviando || !mensagem.trim()}
              className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-r from-cyan-600 to-blue-600 text-white shadow-lg shadow-cyan-500/20 transition hover:from-cyan-500 hover:to-blue-500 active:scale-95 disabled:opacity-40"
            >
              ➤
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Componente KPI Card ─────────────────────────────────────────────
interface KpiCardProps {
  titulo: string;
  valor: string | number;
  subtitulo?: string;
  corIcone: string;
  icone: React.ReactNode;
}

function KpiCard({ titulo, valor, subtitulo, corIcone, icone }: KpiCardProps) {
  return (
    <div className="group relative overflow-hidden rounded-2xl border border-grafite-200 bg-white p-6 shadow-soft transition-all duration-300 hover:-translate-y-1 hover:shadow-lg">
      {/* Faixa de cor no topo */}
      <div className={`absolute inset-x-0 top-0 h-1 ${corIcone}`} />

      <div className="flex items-start justify-between">
        <div>
          <h3 className="mb-1 text-xs font-semibold uppercase tracking-wider text-grafite-400">
            {titulo}
          </h3>
          <p className="text-3xl font-bold text-grafite-800">{valor}</p>
          {subtitulo && (
            <p className="mt-1 text-sm text-grafite-400">{subtitulo}</p>
          )}
        </div>
        <div className={`flex h-12 w-12 items-center justify-center rounded-xl ${corIcone} bg-opacity-10 text-xl`}>
          {icone}
        </div>
      </div>
    </div>
  );
}

// ─── Tooltip customizado ─────────────────────────────────────────────
const tooltipStyle = {
  borderRadius: '12px',
  border: '1px solid #e5e7eb',
  boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
  fontSize: '13px',
};

// ─── Dashboard ───────────────────────────────────────────────────────
function Dashboard() {
  const [dados, setDados] = useState<DashboardCompletoResponse | null>(null);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState<string | null>(null);

  // Estado separado para o insight de IA (não bloqueia o dashboard)
  const [insight, setInsight] = useState<string | null>(null);
  const [carregandoInsight, setCarregandoInsight] = useState(true);

  useEffect(() => {
    const carregar = async () => {
      try {
        setCarregando(true);
        const resultado = await buscarDashboardCompleto();
        setDados(resultado);
      } catch (err: any) {
        setErro(err.mensagem || err.message || 'Erro ao carregar dados do dashboard');
      } finally {
        setCarregando(false);
      }
    };
    carregar();
  }, []);

  // useEffect separado para carregar o insight de IA de forma independente
  useEffect(() => {
    const carregarInsight = async () => {
      try {
        setCarregandoInsight(true);
        const resultado = await buscarInsightIA();
        setInsight(resultado.insight);
      } catch {
        setInsight('💡 Dica do dia: Continue focando na qualidade e no atendimento para fidelizar seus clientes!');
      } finally {
        setCarregandoInsight(false);
      }
    };
    carregarInsight();
  }, []);

  // ─── Loading ──────────────────────────────────────────────────────
  if (carregando) {
    return (
      <div>
        <h1 className="mb-6 text-3xl font-bold text-grafite-800">Relatório de Vendas</h1>
        <Spinner />
      </div>
    );
  }

  // ─── Error ────────────────────────────────────────────────────────
  if (erro) {
    return (
      <div>
        <h1 className="mb-6 text-3xl font-bold text-grafite-800">Relatório de Vendas</h1>
        <div className="rounded-xl border border-erro/20 bg-erro/10 px-4 py-3 text-sm font-medium text-erro">
          {erro}
        </div>
      </div>
    );
  }

  const kpis = dados!.kpis;

  // ─── Dados para o PieChart ────────────────────────────────────────
  const dadosPie = [
    { name: 'Concluídos', value: kpis.totalPedidosConcluidos },
    { name: 'Cancelados', value: kpis.totalPedidosCancelados },
  ];
  const totalPiePedidos = kpis.totalPedidosConcluidos + kpis.totalPedidosCancelados;

  // ─── Dados para o LineChart ───────────────────────────────────────
  const vendasData = (dados!.pedidosPorMes ?? []).map((item) => ({
    name: `${item.mesNome}/${item.ano}`,
    Receita: item.receitaTotal,
    Pedidos: item.totalPedidos,
  }));

  // ─── Dados para o BarChart (Top Produtos) ─────────────────────────
  const produtosData = (dados!.produtosMaisVendidos ?? []).map((p) => ({
    nome: p.nome,
    quantidade: p.quantidadeVendida,
  }));

  return (
    <div className="animate-fade-in space-y-6 sm:space-y-8">
      {/* ═══ Título ═══ */}
      <div>
        <h1 className="text-2xl font-bold text-grafite-800 sm:text-3xl">Relatório de Vendas</h1>
        <p className="mt-1 text-sm text-grafite-400">Visão geral do desempenho do negócio</p>
      </div>

      {/* ═══ Card Insight IA ═══ */}
      <CardConsultorIA insight={insight} carregandoInsight={carregandoInsight} />

      {/* ═══ KPI Cards ═══ */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 sm:gap-5 xl:grid-cols-3">
        <KpiCard
          titulo="Receita Total"
          valor={formatarMoeda(kpis.receitaTotal)}
          subtitulo={`Hoje: ${formatarMoeda(kpis.receitaHoje)}`}
          corIcone="bg-sucesso text-sucesso"
          icone={<span>💰</span>}
        />
        <KpiCard
          titulo="Pedidos Concluídos"
          valor={kpis.totalPedidosConcluidos}
          subtitulo={`De ${kpis.totalPedidos} pedidos totais`}
          corIcone="bg-primary-500 text-primary-600"
          icone={<span>✅</span>}
        />
        <KpiCard
          titulo="Pedidos Cancelados"
          valor={kpis.totalPedidosCancelados}
          subtitulo={`Perda: ${formatarMoeda(kpis.receitaCancelada)}`}
          corIcone="bg-erro text-erro"
          icone={<span>❌</span>}
        />
      </div>

      {/* ═══ Gráficos: BarChart + PieChart ═══ */}
      <div className="grid grid-cols-1 gap-4 sm:gap-6 lg:grid-cols-2">
        {/* ─── BarChart: Top 5 Produtos ─── */}
        <div className="rounded-2xl border border-grafite-200 bg-white p-4 shadow-soft sm:p-6">
          <h3 className="mb-4 text-lg font-semibold text-grafite-800">
            🏆 Ranking – Produtos Mais Vendidos
          </h3>
          {produtosData.length > 0 ? (
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={produtosData} layout="vertical" margin={{ left: 20, right: 20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" horizontal={false} />
                <XAxis type="number" stroke="#6b7280" fontSize={12} />
                <YAxis
                  dataKey="nome"
                  type="category"
                  width={120}
                  stroke="#6b7280"
                  fontSize={12}
                  tick={{ fill: '#374151' }}
                />
                <Tooltip
                  contentStyle={tooltipStyle}
                  formatter={(value: number) => [`${value} un.`, 'Quantidade']}
                />
                <Bar
                  dataKey="quantidade"
                  fill="#d97706"
                  radius={[0, 6, 6, 0]}
                  barSize={24}
                  name="Quantidade"
                />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <p className="py-8 text-center text-grafite-400">Sem dados de produtos vendidos.</p>
          )}
        </div>

        {/* ─── PieChart: Sucesso vs Cancelados ─── */}
        <div className="rounded-2xl border border-grafite-200 bg-white p-4 shadow-soft sm:p-6">
          <h3 className="mb-4 text-lg font-semibold text-grafite-800">
            📊 Proporção: Concluídos vs Cancelados
          </h3>
          {totalPiePedidos > 0 ? (
            <ResponsiveContainer width="100%" height={280}>
              <PieChart>
                <Pie
                  data={dadosPie}
                  cx="50%"
                  cy="50%"
                  innerRadius={65}
                  outerRadius={100}
                  paddingAngle={4}
                  dataKey="value"
                  nameKey="name"
                  label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                  labelLine={false}
                >
                  {dadosPie.map((_entry, idx) => (
                    <Cell key={idx} fill={CORES_PIE[idx % CORES_PIE.length]} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={tooltipStyle}
                  formatter={(value: number, name: string) => [`${value} pedidos`, name]}
                />
                <Legend
                  verticalAlign="bottom"
                  iconType="circle"
                  wrapperStyle={{ fontSize: '13px', paddingTop: '12px' }}
                />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <p className="py-8 text-center text-grafite-400">Sem dados de pedidos para comparar.</p>
          )}
        </div>
      </div>

      {/* ═══ LineChart: Vendas nos Últimos 6 Meses ═══ */}
      <div className="rounded-2xl border border-grafite-200 bg-white p-4 shadow-soft sm:p-8">
        <h3 className="mb-6 text-xl font-semibold text-grafite-800">📈 Vendas nos Últimos 6 Meses</h3>
        {vendasData.length > 0 ? (
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={vendasData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis dataKey="name" stroke="#6b7280" fontSize={12} />
              <YAxis stroke="#6b7280" fontSize={12} />
              <Tooltip
                formatter={(value: number) => formatarMoeda(value)}
                contentStyle={tooltipStyle}
              />
              <Legend />
              <Line
                type="monotone"
                dataKey="Receita"
                stroke="#d97706"
                strokeWidth={3}
                activeDot={{ r: 8, fill: '#d97706' }}
              />
            </LineChart>
          </ResponsiveContainer>
        ) : (
          <p className="py-8 text-center text-grafite-400">
            Sem dados de vendas para exibir.
          </p>
        )}
      </div>
    </div>
  );
}

export default Dashboard;
