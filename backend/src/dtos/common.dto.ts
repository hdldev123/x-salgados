import { z } from 'zod';

// ─── Paginação ────────────────────────────────────────────────────────
export const PaginacaoSchema = z.object({
  pagina: z.coerce.number().int().min(1).default(1),
  tamanhoPagina: z.coerce.number().int().min(1).max(200).default(10),
}).passthrough(); // Preserva query params extras (busca, status, categoria, etc.)
export type PaginacaoDto = z.infer<typeof PaginacaoSchema>;

// ─── Resultado Paginado (tipo genérico, não precisa de Zod) ──────────
export interface ResultadoPaginadoDto<T> {
  dados: T[];
  pagina: number;
  tamanhoPagina: number;
  total: number;
  totalPaginas: number;
  temProxima: boolean;
  temAnterior: boolean;
}

export function criarResultadoPaginado<T>(
  dados: T[],
  pagina: number,
  tamanhoPagina: number,
  total: number,
): ResultadoPaginadoDto<T> {
  const totalPaginas = Math.ceil(total / tamanhoPagina);
  return {
    dados,
    pagina,
    tamanhoPagina,
    total,
    totalPaginas,
    temProxima: pagina < totalPaginas,
    temAnterior: pagina > 1,
  };
}

// ─── API Response padronizado ────────────────────────────────────────
export interface ApiResponse<T> {
  sucesso: boolean;
  mensagem?: string;
  dados?: T;
  erros?: string[];
}

export function apiOk<T>(dados: T, mensagem?: string): ApiResponse<T> {
  return { sucesso: true, dados, mensagem };
}

export function apiErro<T = unknown>(mensagem: string, erros?: string[]): ApiResponse<T> {
  return { sucesso: false, mensagem, erros };
}
