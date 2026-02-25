import React, { useState, useEffect } from 'react';
import './Dashboard.css';
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
        console.error('Erro ao carregar dashboard:', err);
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
        <h1 className="titulo-pagina">Dashboard</h1>
        <Spinner />
      </div>
    );
  }

  if (erro) {
    return (
      <div>
        <h1 className="titulo-pagina">Dashboard</h1>
        <div className="mensagem-erro">{erro}</div>
      </div>
    );
  }

  return (
    <div>
      <h1 className="titulo-pagina">Dashboard</h1>
      
      <div className="kpi-grid">
        <div className="kpi-card">
          <h3 className="kpi-titulo">Pedidos Hoje</h3>
          <p className="kpi-valor">{kpis?.pedidosHoje ?? 0}</p>
        </div>
        <div className="kpi-card">
          <h3 className="kpi-titulo">Faturamento do Mês</h3>
          <p className="kpi-valor">{formatarMoeda(kpis?.receitaMes)}</p>
        </div>
        <div className="kpi-card">
          <h3 className="kpi-titulo">Total de Clientes</h3>
          <p className="kpi-valor">{kpis?.totalClientes ?? 0}</p>
        </div>
        <div className="kpi-card">
          <h3 className="kpi-titulo">Produtos Ativos</h3>
          <p className="kpi-valor">{kpis?.totalProdutosAtivos ?? 0}</p>
        </div>
      </div>
      
      <div className="grafico-card">
        <h3 className='grafico-titulo'>Vendas nos Últimos 6 Meses</h3>
        {vendasData.length > 0 ? (
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={vendasData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis />
              <Tooltip formatter={(value) => formatarMoeda(value)} />
              <Legend />
              <Line type="monotone" dataKey="Vendas" stroke="#0d47a1" strokeWidth={2} activeDot={{ r: 8 }} />
            </LineChart>
          </ResponsiveContainer>
        ) : (
          <p style={{ textAlign: 'center', padding: '2rem', color: '#888' }}>
            Sem dados de vendas para exibir.
          </p>
        )}
      </div>

    </div>
  );
}

export default Dashboard;
