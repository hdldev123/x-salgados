import { z } from 'zod';

// ─── Criar Produto ────────────────────────────────────────────────────
export const CriarProdutoSchema = z.object({
  nome: z
    .string({ required_error: 'Nome é obrigatório' })
    .min(1, 'Nome é obrigatório')
    .max(100, 'Nome deve ter no máximo 100 caracteres'),
  categoria: z
    .string({ required_error: 'Categoria é obrigatória' })
    .min(1, 'Categoria é obrigatória')
    .max(50, 'Categoria deve ter no máximo 50 caracteres'),
  descricao: z
    .string()
    .max(500, 'Descrição deve ter no máximo 500 caracteres')
    .nullish(),
  preco: z
    .number({ required_error: 'Preço é obrigatório' })
    .min(0.01, 'Preço deve ser entre 0.01 e 99999.99')
    .max(99999.99, 'Preço deve ser entre 0.01 e 99999.99'),
  ativo: z.boolean().default(true),
});
export type CriarProdutoDto = z.infer<typeof CriarProdutoSchema>;

// ─── Atualizar Produto (mesmo schema) ────────────────────────────────
export const AtualizarProdutoSchema = CriarProdutoSchema;
export type AtualizarProdutoDto = z.infer<typeof AtualizarProdutoSchema>;

// ─── Response DTO ────────────────────────────────────────────────────
export interface ProdutoDto {
  id: number;
  nome: string;
  categoria: string;
  descricao: string | null;
  preco: number;
  ativo: boolean;
  dataCriacao: Date;
}
