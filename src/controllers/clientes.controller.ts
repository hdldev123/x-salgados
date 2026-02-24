import { Request, Response, NextFunction } from 'express';
import * as clienteService from '../services/cliente.service';

/**
 * GET /api/clientes
 */
export async function obterTodos(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const paginacao = req.query as any;
    const busca = req.query.busca as string | undefined;
    const resultado = await clienteService.obterTodosAsync(paginacao, busca);
    res.json(resultado);
  } catch (error) {
    next(error);
  }
}

/**
 * GET /api/clientes/:id
 */
export async function obterPorId(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const id = parseInt(req.params.id as string);
    const cliente = await clienteService.obterPorIdAsync(id);

    if (!cliente) {
      res.status(404).json({ sucesso: false, mensagem: 'Cliente não encontrado.' });
      return;
    }

    res.json(cliente);
  } catch (error) {
    next(error);
  }
}

/**
 * POST /api/clientes
 */
export async function criar(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const cliente = await clienteService.criarAsync(req.body);
    res.status(201).json(cliente);
  } catch (error) {
    next(error);
  }
}

/**
 * PUT /api/clientes/:id
 */
export async function atualizar(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const id = parseInt(req.params.id as string);
    const cliente = await clienteService.atualizarAsync(id, req.body);

    if (!cliente) {
      res.status(404).json({ sucesso: false, mensagem: 'Cliente não encontrado.' });
      return;
    }

    res.json(cliente);
  } catch (error) {
    next(error);
  }
}

/**
 * DELETE /api/clientes/:id
 */
export async function excluir(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const id = parseInt(req.params.id as string);
    const { sucesso, mensagemErro } = await clienteService.excluirAsync(id);

    if (!sucesso) {
      if (mensagemErro?.includes('pedidos vinculados')) {
        res.status(409).json({ sucesso: false, mensagem: mensagemErro });
        return;
      }
      res.status(404).json({ sucesso: false, mensagem: mensagemErro });
      return;
    }

    res.status(204).send();
  } catch (error) {
    next(error);
  }
}
