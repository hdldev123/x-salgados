import { supabase } from '../config/database';
import { StatusPedidoLabel } from '../models/enums';
import {
  DashboardKpisDto,
  PedidosPorMesDto,
  DistribuicaoStatusDto,
  DashboardCompletoDto,
} from '../dtos/dashboard.dto';

// Nomes dos meses em pt-BR para formatação do gráfico
const NOMES_MESES = ['', 'Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];

// ─── KPIs ────────────────────────────────────────────────────────────
// DBA-003: antes buscava TODOS os pedidos + clientes em memória e calculava em JS.
// Agora usa a RPC `get_dashboard_kpis` que faz COUNT/SUM diretamente no Postgres.
export async function obterKpisAsync(): Promise<DashboardKpisDto> {
  const [kpisResult, clientesResult] = await Promise.all([
    supabase.rpc('get_dashboard_kpis').single(),
    supabase.from('clientes').select('id', { count: 'exact', head: true }),
  ]);

  if (kpisResult.error) throw new Error(kpisResult.error.message);

  const k = kpisResult.data as {
    receita_total: string;
    total_pedidos: string;
    pedidos_pendentes: string;
    pedidos_hoje: string;
    receita_hoje: string;
  };

  return {
    receitaTotal: Number(k.receita_total),
    totalPedidos: Number(k.total_pedidos),
    totalClientes: clientesResult.count ?? 0,
    pedidosPendentes: Number(k.pedidos_pendentes),
    pedidosHoje: Number(k.pedidos_hoje),
    receitaHoje: Number(k.receita_hoje),
  };
}

// ─── Pedidos por Mês ─────────────────────────────────────────────────
// DBA-003: antes trazia todos os pedidos do período e agrupava em JS com Map.
// Agora usa a RPC `get_pedidos_por_mes` — GROUP BY no Postgres, só o resultado chega ao Node.
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
// DBA-003: antes buscava todos os status e contava em JS.
// Agora usa a RPC `get_distribuicao_status_pedidos` — GROUP BY no Postgres.
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

// ─── Dashboard Completo ──────────────────────────────────────────────
export async function obterDashboardCompletoAsync(): Promise<DashboardCompletoDto> {
  const [kpis, pedidosPorMes, distribuicaoStatus] = await Promise.all([
    obterKpisAsync(),
    obterPedidosPorMesAsync(),
    obterDistribuicaoStatusAsync(),
  ]);

  return { kpis, pedidosPorMes, distribuicaoStatus };
}
