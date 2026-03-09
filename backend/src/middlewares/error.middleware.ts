import { Request, Response, NextFunction } from 'express';

/**
 * Middleware global de tratamento de exceções.
 * Converte todas as exceções em respostas JSON padronizadas (ApiResponse).

 */
export function errorHandler(
  err: Error,
  _req: Request,
  res: Response,
  _next: NextFunction,
): void {
  console.error(`[ERROR] ${err.message}`, err.stack);

  // Mapeia tipos de erro para HTTP status codes
  let statusCode = 500;
  let mensagem = err.message;

  if (err.name === 'InvalidOperationError' || err.message.startsWith('VALIDATION:')) {
    statusCode = 400;
    mensagem = err.message.replace('VALIDATION:', '').trim();
  } else if (err.name === 'NotFoundError') {
    statusCode = 404;
  } else if (err.name === 'UnauthorizedError') {
    statusCode = 401;
  } else if (err.name === 'ConflictError') {
    statusCode = 409;
  } else if (statusCode === 500) {
    // Nunca expor detalhes internos de banco/infraestrutura para o cliente
    mensagem = 'Ocorreu um erro interno no servidor. Tente novamente mais tarde.';
  }

  res.status(statusCode).json({
    sucesso: false,
    mensagem,
    erros: [mensagem],
  });
}

// ─── Classes de erro tipadas ─────────────────────────────────────────
export class InvalidOperationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'InvalidOperationError';
  }
}

export class NotFoundError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'NotFoundError';
  }
}

export class UnauthorizedError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'UnauthorizedError';
  }
}

export class ConflictError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ConflictError';
  }
}
