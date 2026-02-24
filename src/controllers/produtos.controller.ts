import { Request, Response, NextFunction } from 'express';
import * as produtoService from '../services/produto.service';

/**
 * GET /api/produtos
 */
export async function obterTodos(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const paginacao = req.query as any;
    const categoria = req.query.categoria as string | undefined;
    const apenasAtivosStr = req.query.apenasAtivos as string | undefined;

    let apenasAtivos: boolean | undefined;
    if (apenasAtivosStr === 'true') apenasAtivos = true;
    else if (apenasAtivosStr === 'false') apenasAtivos = false;

    const resultado = await produtoService.obterTodosAsync(paginacao, categoria, apenasAtivos);
    res.json(resultado);
  } catch (error) {
    next(error);
  }
}

/**
 * GET /api/produtos/:id
 */
export async function obterPorId(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const id = parseInt(req.params.id as string);
    const produto = await produtoService.obterPorIdAsync(id);

    if (!produto) {
      res.status(404).json({ sucesso: false, mensagem: 'Produto não encontrado.' });
      return;
    }

    res.json(produto);
  } catch (error) {
    next(error);
  }
}

/**
 * GET /api/produtos/categorias
 */
export async function obterCategorias(_req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const categorias = await produtoService.obterCategoriasAsync();
    res.json(categorias);
  } catch (error) {
    next(error);
  }
}

/**
 * POST /api/produtos
 */
export async function criar(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const produto = await produtoService.criarAsync(req.body);
    res.status(201).json(produto);
  } catch (error) {
    next(error);
  }
}

/**
 * PUT /api/produtos/:id
 */
export async function atualizar(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const id = parseInt(req.params.id as string);
    const produto = await produtoService.atualizarAsync(id, req.body);

    if (!produto) {
      res.status(404).json({ sucesso: false, mensagem: 'Produto não encontrado.' });
      return;
    }

    res.json(produto);
  } catch (error) {
    next(error);
  }
}

/**
 * DELETE /api/produtos/:id
 */
export async function excluir(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const id = parseInt(req.params.id as string);
    const resultado = await produtoService.excluirAsync(id);

    if (!resultado) {
      res.status(404).json({ sucesso: false, mensagem: 'Produto não encontrado.' });
      return;
    }

    res.status(204).send();
  } catch (error) {
    next(error);
  }
}
