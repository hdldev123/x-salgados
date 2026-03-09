import React, { useState, useEffect } from 'react';
import { buscarDashboardCompleto } from '../../servicos/apiDashboard';
import Spinner from '../../componentes/Spinner/Spinner';

import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

// Mapeamento de número do mês para nome abreviado
const MESES = ['', 'Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];

function Dashboard() {
  const [kpis, setKpis] = useState(null);
  const [vendasData, setVendasData] = useState([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState(null);

  useEffect(() => {
    const carregarDashboard = async () => {
      try {
        setCarregando(true);
        const dados = await buscarDashboardCompleto();

        setKpis(dados.kpis);

        // Transforma pedidosPorMes no formato esperado pelo Recharts
        if (dados.pedidosPorMes) {
          const vendas = dados.pedidosPorMes.map(item => ({
            name: `${MESES[item.mes]}/${item.ano}`,
            Vendas: item.receita,
            Pedidos: item.quantidade,
          }));
          setVendasData(vendas);
        }
      } catch (err) {
        setErro(err.mensagem || err.message || 'Erro ao carregar dados do dashboard');
      } finally {
        setCarregando(false);
      }
    };

    carregarDashboard();
  }, []);

  const formatarMoeda = (valor) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(valor || 0);
  };

  if (carregando) {
    return (
      <div>
        <h1 className="mb-6 text-3xl font-bold text-grafite-800">Dashboard</h1>
        <Spinner />
      </div>
    );
  }

  if (erro) {
    return (
      <div>
        <h1 className="mb-6 text-3xl font-bold text-grafite-800">Dashboard</h1>
        <div className="rounded-xl border border-erro/20 bg-erro/10 px-4 py-3 text-sm font-medium text-erro">{erro}</div>
      </div>
    );
  }

  return (
    <div className="animate-fade-in">
      <h1 className="mb-6 text-3xl font-bold text-grafite-800">Dashboard</h1>

      {/* KPI Cards */}
      <div className="mb-8 grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-4">
        {[
          { titulo: 'Pedidos Hoje', valor: kpis?.pedidosHoje ?? 0 },
          { titulo: 'Faturamento do Mês', valor: formatarMoeda(kpis?.receitaMes) },
          { titulo: 'Total de Clientes', valor: kpis?.totalClientes ?? 0 },
          { titulo: 'Produtos Ativos', valor: kpis?.totalProdutosAtivos ?? 0 },
        ].map((kpi, index) => (
          <div
            key={index}
            className="rounded-2xl border border-grafite-200 bg-white p-6 shadow-soft transition-all duration-300 hover:-translate-y-1 hover:shadow-lg"
          >
            <h3 className="mb-2 text-xs font-medium uppercase tracking-wider text-grafite-400">
              {kpi.titulo}
            </h3>
            <p className="text-3xl font-bold text-grafite-800">{kpi.valor}</p>
          </div>
        ))}
      </div>

      {/* Gráfico de Vendas */}
      <div className="rounded-2xl border border-grafite-200 bg-white p-8 shadow-soft">
        <h3 className="mb-6 text-xl font-semibold text-grafite-800">Vendas nos Últimos 6 Meses</h3>
        {vendasData.length > 0 ? (
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={vendasData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis dataKey="name" stroke="#6b7280" fontSize={12} />
              <YAxis stroke="#6b7280" fontSize={12} />
              <Tooltip
                formatter={(value) => formatarMoeda(value)}
                contentStyle={{
                  borderRadius: '12px',
                  border: '1px solid #e5e7eb',
                  boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
                }}
              />
              <Legend />
              <Line type="monotone" dataKey="Vendas" stroke="#d97706" strokeWidth={3} activeDot={{ r: 8, fill: '#d97706' }} />
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
