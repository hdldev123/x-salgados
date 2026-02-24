import { Request, Response, NextFunction } from 'express';
import * as dashboardService from '../services/dashboard.service';

/**
 * GET /api/dashboard/kpis
 */
export async function obterKpis(_req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const kpis = await dashboardService.obterKpisAsync();
    res.json(kpis);
  } catch (error) {
    next(error);
  }
}

/**
 * GET /api/dashboard/pedidos-por-mes
 */
export async function obterPedidosPorMes(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const meses = req.query.meses ? parseInt(req.query.meses as string) : 6;
    const dados = await dashboardService.obterPedidosPorMesAsync(meses);
    res.json(dados);
  } catch (error) {
    next(error);
  }
}

/**
 * GET /api/dashboard/distribuicao-status
 */
export async function obterDistribuicaoStatus(_req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const dados = await dashboardService.obterDistribuicaoStatusAsync();
    res.json(dados);
  } catch (error) {
    next(error);
  }
}

/**
 * GET /api/dashboard/completo
 */
export async function obterDashboardCompleto(_req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const dashboard = await dashboardService.obterDashboardCompletoAsync();
    res.json(dashboard);
  } catch (error) {
    next(error);
  }
}
