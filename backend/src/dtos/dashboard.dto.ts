// ─── KPIs ────────────────────────────────────────────────────────────
export interface DashboardKpisDto {
  receitaTotal: number;
  totalPedidos: number;
  totalClientes: number;
  pedidosPendentes: number;
  pedidosHoje: number;
  receitaHoje: number;
  totalPedidosConcluidos: number;
  totalPedidosCancelados: number;
  receitaCancelada: number;
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

// ─── Produto Mais Vendido ────────────────────────────────────────────
export interface ProdutoMaisVendidoDto {
  nome: string;
  quantidadeVendida: number;
}

// ─── Dashboard Completo ──────────────────────────────────────────────
export interface DashboardCompletoDto {
  kpis: DashboardKpisDto;
  pedidosPorMes: PedidosPorMesDto[];
  distribuicaoStatus: DistribuicaoStatusDto[];
  produtosMaisVendidos: ProdutoMaisVendidoDto[];
}
