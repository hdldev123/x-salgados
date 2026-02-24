import { AppDataSource } from '../config/database';
import { Pedido } from '../models/Pedido';
import { Cliente } from '../models/Cliente';
import { StatusPedido, StatusPedidoLabel } from '../models/enums';
import {
  DashboardKpisDto,
  PedidosPorMesDto,
  DistribuicaoStatusDto,
  DashboardCompletoDto,
} from '../dtos/dashboard.dto';

const pedidoRepo = () => AppDataSource.getRepository(Pedido);
const clienteRepo = () => AppDataSource.getRepository(Cliente);

// ─── KPIs ────────────────────────────────────────────────────────────
export async function obterKpisAsync(): Promise<DashboardKpisDto> {
  const hoje = new Date();
  hoje.setUTCHours(0, 0, 0, 0);
  const amanha = new Date(hoje);
  amanha.setUTCDate(amanha.getUTCDate() + 1);

  // Executar consultas em paralelo para performance
  const [receitaTotalResult, totalPedidos, totalClientes, pedidosPendentes, pedidosHoje, receitaHojeResult] =
    await Promise.all([
      // Receita total (apenas pedidos entregues)
      pedidoRepo()
        .createQueryBuilder('p')
        .select('COALESCE(SUM(p.valor_total), 0)', 'total')
        .where('p.status = :status', { status: StatusPedido.Entregue })
        .getRawOne(),

      // Total de pedidos
      pedidoRepo().count(),

      // Total de clientes
      clienteRepo().count(),

      // Pedidos pendentes (Pendente + EmProducao + Pronto)
      pedidoRepo()
        .createQueryBuilder('p')
        .where('p.status IN (:...statuses)', {
          statuses: [StatusPedido.Pendente, StatusPedido.EmProducao, StatusPedido.Pronto],
        })
        .getCount(),

      // Pedidos criados hoje
      pedidoRepo()
        .createQueryBuilder('p')
        .where('p.data_criacao >= :hoje AND p.data_criacao < :amanha', { hoje, amanha })
        .getCount(),

      // Receita hoje (entregues criados hoje)
      pedidoRepo()
        .createQueryBuilder('p')
        .select('COALESCE(SUM(p.valor_total), 0)', 'total')
        .where('p.data_criacao >= :hoje AND p.data_criacao < :amanha', { hoje, amanha })
        .andWhere('p.status = :status', { status: StatusPedido.Entregue })
        .getRawOne(),
    ]);

  return {
    receitaTotal: parseFloat(receitaTotalResult?.total || '0'),
    totalPedidos,
    totalClientes,
    pedidosPendentes,
    pedidosHoje,
    receitaHoje: parseFloat(receitaHojeResult?.total || '0'),
  };
}

// ─── Pedidos por Mês ─────────────────────────────────────────────────
export async function obterPedidosPorMesAsync(meses: number = 6): Promise<PedidosPorMesDto[]> {
  const dataInicio = new Date();
  dataInicio.setUTCMonth(dataInicio.getUTCMonth() - meses + 1);
  dataInicio.setUTCDate(1);
  dataInicio.setUTCHours(0, 0, 0, 0);

  const nomesMeses = ['', 'Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];

  const dados = await pedidoRepo()
    .createQueryBuilder('p')
    .select('EXTRACT(YEAR FROM p.data_criacao)::int', 'ano')
    .addSelect('EXTRACT(MONTH FROM p.data_criacao)::int', 'mes')
    .addSelect('COUNT(*)::int', 'totalPedidos')
    .addSelect(
      `COALESCE(SUM(CASE WHEN p.status = ${StatusPedido.Entregue} THEN p.valor_total ELSE 0 END), 0)`,
      'receitaTotal',
    )
    .where('p.data_criacao >= :dataInicio', { dataInicio })
    .groupBy('ano')
    .addGroupBy('mes')
    .orderBy('ano', 'ASC')
    .addOrderBy('mes', 'ASC')
    .getRawMany();

  return dados.map((d) => ({
    ano: d.ano,
    mes: d.mes,
    mesNome: nomesMeses[d.mes] || '',
    totalPedidos: parseInt(d.totalPedidos),
    receitaTotal: parseFloat(d.receitaTotal),
  }));
}

// ─── Distribuição de Status ──────────────────────────────────────────
export async function obterDistribuicaoStatusAsync(): Promise<DistribuicaoStatusDto[]> {
  const total = await pedidoRepo().count();
  if (total === 0) return [];

  const distribuicao = await pedidoRepo()
    .createQueryBuilder('p')
    .select('p.status', 'status')
    .addSelect('COUNT(*)::int', 'quantidade')
    .groupBy('p.status')
    .getRawMany();

  return distribuicao.map((d) => ({
    status: StatusPedidoLabel[d.status as StatusPedido] || d.status.toString(),
    quantidade: parseInt(d.quantidade),
    percentual: Math.round((parseInt(d.quantidade) / total) * 10000) / 100,
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
