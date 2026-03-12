import { Request, Response, NextFunction } from 'express';
import { ZodSchema, ZodError } from 'zod';

/**
 * Middleware de validação usando Zod.

 *
 * Uso: `validate(CriarPedidoSchema)` → valida req.body
 * Uso: `validate(PaginacaoSchema, 'query')` → valida req.query
 */
export function validate(schema: ZodSchema, source: 'body' | 'query' | 'params' = 'body') {
  return (req: Request, res: Response, next: NextFunction): void => {
    try {
      const parsed = schema.parse(req[source]);
      // Sobrescreve com os dados validados e transformados (coerções, defaults)
      Object.assign(req, { [source]: parsed });
      next();
    } catch (error) {
      if (error instanceof ZodError) {
        const erros = error.errors.map((e) => {
          const campo = e.path.join('.');
          return campo ? `${campo}: ${e.message}` : e.message;
        });

        res.status(400).json({
          sucesso: false,
          mensagem: 'Erro de validação.',
          erros,
        });
        return;
      }
      next(error);
    }
  };
}
