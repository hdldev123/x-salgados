import { supabase } from '../config/database';
import { StatusPedidoLabel } from '../models/enums';
import {
  DashboardKpisDto,
  PedidosPorMesDto,
  DistribuicaoStatusDto,
  ProdutoMaisVendidoDto,
  DashboardCompletoDto,
} from '../dtos/dashboard.dto';

// Nomes dos meses em pt-BR para formatação do gráfico
const NOMES_MESES = ['', 'Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];

// ─── KPIs (v2 — inclui cancelados e concluídos) ─────────────────────
export async function obterKpisAsync(): Promise<DashboardKpisDto> {
  const [kpisResult, clientesResult] = await Promise.all([
    supabase.rpc('get_dashboard_kpis_v2').single(),
    supabase.from('clientes').select('id', { count: 'exact', head: true }),
  ]);

  if (kpisResult.error) throw new Error(kpisResult.error.message);

  const k = kpisResult.data as {
    receita_total: string;
    total_pedidos: string;
    pedidos_pendentes: string;
    pedidos_hoje: string;
    receita_hoje: string;
    total_concluidos: string;
    total_cancelados: string;
    receita_cancelada: string;
  };

  return {
    receitaTotal: Number(k.receita_total),
    totalPedidos: Number(k.total_pedidos),
    totalClientes: clientesResult.count ?? 0,
    pedidosPendentes: Number(k.pedidos_pendentes),
    pedidosHoje: Number(k.pedidos_hoje),
    receitaHoje: Number(k.receita_hoje),
    totalPedidosConcluidos: Number(k.total_concluidos),
    totalPedidosCancelados: Number(k.total_cancelados),
    receitaCancelada: Number(k.receita_cancelada),
  };
}

// ─── Pedidos por Mês ─────────────────────────────────────────────────
export async function obterPedidosPorMesAsync(meses: number = 6): Promise<PedidosPorMesDto[]> {
  const { data, error } = await supabase.rpc('get_pedidos_por_mes', { qtd_meses: meses });

  if (error) throw new Error(error.message);

  return (data ?? []).map((row: any) => ({
    ano: Number(row.ano),
    mes: Number(row.mes),
    mesNome: NOMES_MESES[Number(row.mes)] ?? '',
    totalPedidos: Number(row.total_pedidos),
    receitaTotal: Number(row.receita_total),
  }));
}

// ─── Distribuição de Status ──────────────────────────────────────────
export async function obterDistribuicaoStatusAsync(): Promise<DistribuicaoStatusDto[]> {
  const { data, error } = await supabase.rpc('get_distribuicao_status_pedidos');

  if (error) throw new Error(error.message);
  if (!data || data.length === 0) return [];

  return data.map((row: any) => ({
    status: StatusPedidoLabel[Number(row.status) as keyof typeof StatusPedidoLabel] ?? row.status.toString(),
    quantidade: Number(row.quantidade),
    percentual: Number(row.percentual),
  }));
}

// ─── Produtos Mais Vendidos ──────────────────────────────────────────
export async function obterProdutosMaisVendidosAsync(limite: number = 5): Promise<ProdutoMaisVendidoDto[]> {
  const { data, error } = await supabase.rpc('get_produtos_mais_vendidos', { limite });

  if (error) throw new Error(error.message);

  return (data ?? []).map((row: any) => ({
    nome: row.nome,
    quantidadeVendida: Number(row.quantidade_vendida),
  }));
}

// ─── Dashboard Completo ──────────────────────────────────────────────
export async function obterDashboardCompletoAsync(): Promise<DashboardCompletoDto> {
  const [kpis, pedidosPorMes, distribuicaoStatus, produtosMaisVendidos] = await Promise.all([
    obterKpisAsync(),
    obterPedidosPorMesAsync(),
    obterDistribuicaoStatusAsync(),
    obterProdutosMaisVendidosAsync(),
  ]);

  return { kpis, pedidosPorMes, distribuicaoStatus, produtosMaisVendidos };
}
