import { z } from 'zod';

// ─── Criar Cliente ────────────────────────────────────────────────────
export const CriarClienteSchema = z.object({
  nome: z
    .string({ required_error: 'Nome é obrigatório' })
    .min(1, 'Nome é obrigatório')
    .max(100, 'Nome deve ter no máximo 100 caracteres'),
  telefone: z
    .string({ required_error: 'Telefone é obrigatório' })
    .min(1, 'Telefone é obrigatório')
    .max(20, 'Telefone deve ter no máximo 20 caracteres'),
  email: z
    .string()
    .email('Email inválido')
    .max(150, 'Email deve ter no máximo 150 caracteres')
    .nullish(),
  endereco: z
    .string()
    .max(255, 'Endereço deve ter no máximo 255 caracteres')
    .nullish(),
  cidade: z
    .string()
    .max(100, 'Cidade deve ter no máximo 100 caracteres')
    .nullish(),
  cep: z
    .string()
    .max(10, 'CEP deve ter no máximo 10 caracteres')
    .nullish(),
});
export type CriarClienteDto = z.infer<typeof CriarClienteSchema>;

// ─── Atualizar Cliente (mesmo schema) ────────────────────────────────
export const AtualizarClienteSchema = CriarClienteSchema;
export type AtualizarClienteDto = z.infer<typeof AtualizarClienteSchema>;

// ─── Response DTO ────────────────────────────────────────────────────
export interface ClienteDto {
  id: number;
  nome: string;
  telefone: string;
  email: string | null;
  endereco: string | null;
  cidade: string | null;
  cep: string | null;
  dataCriacao: Date;
  totalPedidos: number;
}
