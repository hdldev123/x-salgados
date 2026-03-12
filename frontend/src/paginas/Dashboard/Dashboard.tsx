import React, { useState, useEffect } from 'react';
import { buscarDashboardCompleto, DashboardCompletoResponse } from '../../servicos/apiDashboard';
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
    <div className="animate-fade-in space-y-8">
      {/* ═══ Título ═══ */}
      <div>
        <h1 className="text-3xl font-bold text-grafite-800">Relatório de Vendas</h1>
        <p className="mt-1 text-sm text-grafite-400">Visão geral do desempenho do negócio</p>
      </div>

      {/* ═══ KPI Cards ═══ */}
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-3">
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
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* ─── BarChart: Top 5 Produtos ─── */}
        <div className="rounded-2xl border border-grafite-200 bg-white p-6 shadow-soft">
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
        <div className="rounded-2xl border border-grafite-200 bg-white p-6 shadow-soft">
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
      <div className="rounded-2xl border border-grafite-200 bg-white p-8 shadow-soft">
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
