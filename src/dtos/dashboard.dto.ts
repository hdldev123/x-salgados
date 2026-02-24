import { StatusPedido } from '../models/enums';

// ─── KPIs ────────────────────────────────────────────────────────────
export interface DashboardKpisDto {
  receitaTotal: number;
  totalPedidos: number;
  totalClientes: number;
  pedidosPendentes: number;
  pedidosHoje: number;
  receitaHoje: number;
}

// ─── Pedidos por Mês ─────────────────────────────────────────────────
export interface PedidosPorMesDto {
  ano: number;
  mes: number;
  mesNome: string;
  totalPedidos: number;
  receitaTotal: number;
}

// ─── Distribuição de Status ──────────────────────────────────────────
export interface DistribuicaoStatusDto {
  status: string;
  quantidade: number;
  percentual: number;
}

// ─── Dashboard Completo ──────────────────────────────────────────────
export interface DashboardCompletoDto {
  kpis: DashboardKpisDto;
  pedidosPorMes: PedidosPorMesDto[];
  distribuicaoStatus: DistribuicaoStatusDto[];
}
