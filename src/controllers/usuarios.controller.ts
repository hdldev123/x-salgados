import { Request, Response, NextFunction } from 'express';
import * as usuarioService from '../services/usuario.service';

/**
 * GET /api/usuarios
 */
export async function obterTodos(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const paginacao = req.query as any;
    const resultado = await usuarioService.obterTodosAsync(paginacao);
    res.json(resultado);
  } catch (error) {
    next(error);
  }
}

/**
 * GET /api/usuarios/:id
 */
export async function obterPorId(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const id = parseInt(req.params.id as string);
    const usuario = await usuarioService.obterPorIdAsync(id);

    if (!usuario) {
      res.status(404).json({ sucesso: false, mensagem: 'Usuário não encontrado.' });
      return;
    }

    res.json(usuario);
  } catch (error) {
    next(error);
  }
}

/**
 * POST /api/usuarios
 */
export async function criar(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const usuario = await usuarioService.criarAsync(req.body);
    res.status(201).json(usuario);
  } catch (error) {
    next(error);
  }
}

/**
 * PUT /api/usuarios/:id
 */
export async function atualizar(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const id = parseInt(req.params.id as string);
    const usuario = await usuarioService.atualizarAsync(id, req.body);

    if (!usuario) {
      res.status(404).json({ sucesso: false, mensagem: 'Usuário não encontrado.' });
      return;
    }

    res.json(usuario);
  } catch (error) {
    next(error);
  }
}

/**
 * DELETE /api/usuarios/:id
 */
export async function excluir(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const id = parseInt(req.params.id as string);
    const usuarioLogadoId = req.usuario?.id || 0;

    const resultado = await usuarioService.excluirAsync(id, usuarioLogadoId);

    if (!resultado) {
      res.status(404).json({ sucesso: false, mensagem: 'Usuário não encontrado.' });
      return;
    }

    res.status(204).send();
  } catch (error) {
    next(error);
  }
}

/**
 * PATCH /api/usuarios/:id/senha
 */
export async function alterarSenha(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const id = parseInt(req.params.id as string);
    const resultado = await usuarioService.alterarSenhaAsync(id, req.body);

    if (!resultado) {
      res.status(404).json({ sucesso: false, mensagem: 'Usuário não encontrado.' });
      return;
    }

    res.json({ sucesso: true, mensagem: 'Senha alterada com sucesso.' });
  } catch (error) {
    next(error);
  }
}
