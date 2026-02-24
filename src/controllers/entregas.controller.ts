import { Request, Response, NextFunction } from 'express';
import * as pedidoService from '../services/pedido.service';

/**
 * GET /api/entregas/rotas
 * Equivale a EntregasController.ObterRotasHoje() do C#.
 */
export async function obterRotasHoje(_req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const rotas = await pedidoService.obterRotasHojeAsync();
    res.json(rotas);
  } catch (error) {
    next(error);
  }
}
