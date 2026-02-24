import { Request, Response, NextFunction } from 'express';
import * as authService from '../services/auth.service';

/**
 * POST /api/auth/login
 * Equivale a AuthController.Login() do C#.
 */
export async function login(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const result = await authService.loginAsync(req.body);

    if (!result) {
      res.status(401).json({ sucesso: false, mensagem: 'Email ou senha inválidos.' });
      return;
    }

    res.json(result);
  } catch (error) {
    next(error);
  }
}
