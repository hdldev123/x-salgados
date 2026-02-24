import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { PerfilUsuario, PerfilUsuarioLabel } from '../models/enums';

// Estende o Request do Express com dados do usuário autenticado
declare global {
  namespace Express {
    interface Request {
      usuario?: {
        id: number;
        nome: string;
        email: string;
        perfil: string;
      };
    }
  }
}

/**
 * Middleware de autenticação JWT.
 * Decodifica o token Bearer e injeta os dados do usuário em `req.usuario`.
 */
export function authenticate(req: Request, res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    res.status(401).json({ sucesso: false, mensagem: 'Token não fornecido.' });
    return;
  }

  const token = authHeader.split(' ')[1];
  const jwtKey = process.env.JWT_KEY;

  if (!jwtKey) {
    res.status(500).json({ sucesso: false, mensagem: 'Chave JWT não configurada no servidor.' });
    return;
  }

  try {
    const decoded = jwt.verify(token, jwtKey, {
      issuer: process.env.JWT_ISSUER || 'XSalgadosApi',
      audience: process.env.JWT_AUDIENCE || 'XSalgadosApp',
    }) as {
      id: number;
      nome: string;
      email: string;
      perfil: string;
    };

    req.usuario = decoded;
    next();
  } catch (error) {
    res.status(401).json({ sucesso: false, mensagem: 'Token inválido ou expirado.' });
  }
}

/**
 * Middleware de autorização por perfil (RBAC).
 * Equivale ao `[Authorize(Roles = "Administrador,Atendente")]` do ASP.NET.
 *
 * Uso: `authorize('Administrador', 'Atendente')`
 */
export function authorize(...perfisPermitidos: string[]) {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.usuario) {
      res.status(401).json({ sucesso: false, mensagem: 'Não autenticado.' });
      return;
    }

    if (perfisPermitidos.length > 0 && !perfisPermitidos.includes(req.usuario.perfil)) {
      res.status(403).json({ sucesso: false, mensagem: 'Acesso negado. Permissão insuficiente.' });
      return;
    }

    next();
  };
}
