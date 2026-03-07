import { Request, Response, NextFunction } from 'express';
import * as pedidoService from '../services/pedido.service';
import { notificarClienteStatusPedido } from '../services/whatsapp.service';

/**
 * GET /api/pedidos
 * Equivale a PedidosController.ObterTodos() do C#.
 */
export async function obterTodos(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const paginacao = req.query as any;
    const status = req.query.status ? parseInt(req.query.status as string) : undefined;
    const dataInicio = req.query.dataInicio as string | undefined;
    const dataFim = req.query.dataFim as string | undefined;

    const resultado = await pedidoService.obterTodosAsync(paginacao, status, dataInicio, dataFim);
    res.json(resultado);
  } catch (error) {
    next(error);
  }
}

/**
 * GET /api/pedidos/:id
 * Equivale a PedidosController.ObterPorId() do C#.
 */
export async function obterPorId(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const id = parseInt(req.params.id as string);
    const pedido = await pedidoService.obterPorIdAsync(id);

    if (!pedido) {
      res.status(404).json({ sucesso: false, mensagem: 'Pedido não encontrado.' });
      return;
    }

    res.json(pedido);
  } catch (error) {
    next(error);
  }
}

/**
 * POST /api/pedidos
 * Equivale a PedidosController.Criar() do C#.
 * REGRA CRÍTICA: valor total calculado pelo backend usando preços do banco.
 */
export async function criar(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { pedido, erros } = await pedidoService.criarAsync(req.body);

    if (erros && erros.length > 0) {
      res.status(400).json({ sucesso: false, mensagem: 'Erro ao criar pedido.', erros });
      return;
    }

    res.status(201).json(pedido);
  } catch (error) {
    next(error);
  }
}

/**
 * PATCH /api/pedidos/:id/status
 * Equivale a PedidosController.AtualizarStatus() do C#.
 */
export async function atualizarStatus(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const id = parseInt(req.params.id as string);
    const pedido = await pedidoService.atualizarStatusAsync(id, req.body);

    if (!pedido) {
      res.status(404).json({ sucesso: false, mensagem: 'Pedido não encontrado.' });
      return;
    }

    // Notificar cliente via WhatsApp de forma assíncrona (fire-and-forget)
    notificarClienteStatusPedido(pedido).catch((err) =>
      console.error('[WhatsApp] Erro ao notificar cliente após mudança de status:', err.message),
    );

    res.json(pedido);
  } catch (error) {
    next(error);
  }
}
